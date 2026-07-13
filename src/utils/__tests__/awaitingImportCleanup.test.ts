/**
 * Test for Fix 5: Clear awaiting_import on failure/cancel
 * Prevents stuck "Continue your setup" banner
 *
 * @jest-environment jsdom
 *
 * useWorkoutImport is a real React hook (useState/useRef/useCallback). These tests used to
 * call it directly in the test body, which throws "Cannot read properties of null (reading
 * 'useState')" on React 19 — there is no dispatcher outside a render. They now drive it
 * through renderHook, which needs a DOM, hence the jsdom environment above.
 *
 * Note importFromText (processWorkoutData) defers its real work into a setTimeout(..., 800),
 * so awaiting it is NOT enough — it resolves before validation has run. Assertions therefore
 * go through waitFor.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkoutImport } from '../../hooks/useWorkoutImport';
import { WorkoutStorage } from '../storage';

jest.mock('../storage');
const mockWorkoutStorage = WorkoutStorage as jest.Mocked<typeof WorkoutStorage>;

// Mock react-native components
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Animated: {
    Value: jest.fn(() => ({ setValue: jest.fn(), addListener: jest.fn() })),
    spring: jest.fn(() => ({ start: jest.fn() })),
    timing: jest.fn(() => ({ start: jest.fn((callback) => callback && callback()) })),
    parallel: jest.fn(() => ({ start: jest.fn((callback) => callback && callback()) })),
    sequence: jest.fn(() => ({ start: jest.fn() })),
  },
}));

jest.mock('expo-clipboard', () => ({
  getStringAsync: jest.fn(),
  setStringAsync: jest.fn(),
}));

// useWorkoutImport also pulls in expo-document-picker. Without this mock the REAL expo
// module loads, and it reaches for Platform.select — but the react-native mock above
// replaces the whole module with just { Alert, Animated }, so Platform is undefined and
// the suite dies on import with "Cannot read properties of undefined (reading 'select')".
// That presented as a suite failure but was only a missing mock.
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

describe('Awaiting Import Cleanup (Fix 5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkoutStorage.setAwaitingImport.mockResolvedValue();
  });

  it('1. CANCEL CLEARS FLAG: cancelConfirmation clears awaiting_import flag', async () => {
    const { result } = renderHook(() => useWorkoutImport({}));

    await act(async () => {
      result.current.cancelConfirmation();
    });

    expect(mockWorkoutStorage.setAwaitingImport).toHaveBeenCalledWith(false);
  });

  it('2. PARSE ERROR CLEARS FLAG: JSON parse failure clears awaiting_import flag', async () => {
    const { result } = renderHook(() => useWorkoutImport({}));

    await act(async () => {
      result.current.importFromText('invalid json {');
    });

    await waitFor(
      () => expect(mockWorkoutStorage.setAwaitingImport).toHaveBeenCalledWith(false),
      { timeout: 3000 }
    );
  });

  it('3. ERROR RESILIENCE: setAwaitingImport failure does not break cancel flow', async () => {
    // Mock setAwaitingImport to fail
    mockWorkoutStorage.setAwaitingImport.mockRejectedValueOnce(new Error('Storage error'));

    const { result } = renderHook(() => useWorkoutImport({}));

    // Should not reject even if setAwaitingImport fails — handleModalCancel swallows it.
    await expect(
      act(async () => {
        result.current.cancelConfirmation();
      })
    ).resolves.not.toThrow();

    expect(mockWorkoutStorage.setAwaitingImport).toHaveBeenCalledWith(false);
  });

  it('4. SUCCESS STILL CLEARS: successful import still clears flag as before', async () => {
    const validProgram = {
      id: 'test123',
      name: 'Test Program',
      days: 3,
      blocks: 1,
      created: '2024-01-01',
      duration: '4 weeks',
      description: 'Test program'
    };

    mockWorkoutStorage.loadRoutines.mockResolvedValue([]);
    mockWorkoutStorage.saveRoutines.mockResolvedValue();

    const { result } = renderHook(() => useWorkoutImport({}));

    await act(async () => {
      result.current.importFromText(JSON.stringify(validProgram));
    });
    await act(async () => {
      await result.current.confirmImport();
    });

    // Should clear flag on successful import too
    await waitFor(
      () => expect(mockWorkoutStorage.setAwaitingImport).toHaveBeenCalledWith(false),
      { timeout: 3000 }
    );
  });

  it('5. VALIDATION ERROR CLEARS FLAG: workout validation failure clears flag', async () => {
    const invalidProgram = {
      id: 'invalid',
      // Missing required fields like name, days, etc.
    };

    const { result } = renderHook(() => useWorkoutImport({}));

    await act(async () => {
      result.current.importFromText(JSON.stringify(invalidProgram));
    });

    // Parse succeeds but validation fails, should still clear flag
    await waitFor(
      () => expect(mockWorkoutStorage.setAwaitingImport).toHaveBeenCalledWith(false),
      { timeout: 3000 }
    );
  });
});