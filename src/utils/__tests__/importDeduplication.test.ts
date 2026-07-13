/**
 * Test for Fix 4: Import deduplication by fingerprint
 * Prevents duplicate library entries on re-import
 *
 * @jest-environment jsdom
 *
 * ===========================================================================
 * SKIPPED — THIS SUITE HAS NEVER TESTED DEDUPLICATION. NOTHING HAS.
 * ===========================================================================
 *
 * It is skipped deliberately, so that it is honestly red-flagged rather than quietly
 * failing or quietly bent into passing. Do not "fix" it by tweaking the fixtures; the
 * fixtures are not the only problem. A real dedupe suite is commissioned as its own work.
 *
 * These tests never ran (jest.config.js was misconfigured from the day it was authored on
 * 2026-05-25 until 2026-07-13). When finally executed, all four fail — and they fail before
 * reaching a single line of deduplication logic. Two independent reasons:
 *
 * 1. THE FIXTURES ARE NOT VALID PROGRAMS.
 *    All four use `blocks: []`. Production rejects that outright in validateAndParseJSON:
 *
 *        if (!Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
 *          throw new Error('No training blocks found');      // useWorkoutImport.ts:1137
 *        }
 *
 *    Every test dies with "[VALIDATE] rejected: structural validation error - No training
 *    blocks found". The import never proceeds, so saveRoutines/onImportComplete are never
 *    called and every assertion fails on "Number of calls: 0".
 *
 * 2. EVEN WITH VALID FIXTURES, THESE TESTS WOULD NOT REACH THE DEDUPE CODE.
 *    The fingerprint dedupe lives in handleUnifiedMesocycleImport
 *    (useWorkoutImport.ts:393-449). That is reached only from restoreCompleteState, and
 *    only when the program carries `_metadata.exportType === 'unified_mesocycle_structure'`.
 *    None of these fixtures have `_metadata` at all.
 *
 *    It is also reached only via confirmImport (handleConfirmImport), which performs the
 *    save. These tests only ever call importFromText — which parses and raises the
 *    confirmation modal. It does not save, and it does not dedupe.
 *
 * So a genuine dedupe suite needs: valid multi-block programs, carrying a
 * `_metadata.exportType === 'unified_mesocycle_structure'` envelope, driven through
 * importFromText AND THEN confirmImport. That is a new test, not a repair of this one.
 *
 * ---------------------------------------------------------------------------
 * Harness notes, for whoever writes the real suite:
 *
 * - useWorkoutImport is a React hook. Calling it in a test body throws "Cannot read
 *   properties of null (reading 'useState')" on React 19 — there is no dispatcher outside a
 *   render. Drive it through renderHook (@testing-library/react), which needs a DOM, hence
 *   the @jest-environment jsdom above.
 * - importFromText (processWorkoutData) defers ALL of its real work into an unawaited
 *   setTimeout(..., 800). `await importFromText(...)` therefore resolves BEFORE validation
 *   has run. Await the resulting state (e.g. waitFor showConfirmation) before asserting or
 *   before calling confirmImport. See awaitingImportCleanup.test.ts for a worked example.
 * ---------------------------------------------------------------------------
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkoutImport } from '../../hooks/useWorkoutImport';
import { WorkoutStorage } from '../storage';
import { WorkoutProgram } from '../../types/workout';

// Mock WorkoutStorage
jest.mock('../storage');
const mockWorkoutStorage = WorkoutStorage as jest.Mocked<typeof WorkoutStorage>;

// Mock react-native components
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Animated: {
    Value: jest.fn(() => ({ setValue: jest.fn(), addListener: jest.fn() })),
    spring: jest.fn(() => ({ start: jest.fn() })),
    timing: jest.fn(() => ({ start: jest.fn() })),
    parallel: jest.fn(() => ({ start: jest.fn() })),
    sequence: jest.fn(() => ({ start: jest.fn() })),
  },
}));

jest.mock('expo-clipboard', () => ({
  getStringAsync: jest.fn(),
  setStringAsync: jest.fn(),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

// SKIPPED ON PURPOSE — see the header. These four tests do not reach the dedupe logic:
// their fixtures use `blocks: []` (rejected by validation), and the dedupe lives behind
// _metadata.exportType === 'unified_mesocycle_structure' via confirmImport, which this
// suite never calls. Deduplication is currently covered by NO test. Do not un-skip this
// without rewriting it — un-skipping as-is just restores four failures that prove nothing.
describe.skip('Import Deduplication (Fix 4) — NEVER TESTED DEDUPE; needs a real suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. FINGERPRINT DEDUPE: non-curated import with existing fingerprint returns existing routine', async () => {
    const existingRoutine = {
      id: 'existing123',
      name: 'Existing Program',
      days: 4,
      blocks: 2,
      fingerprint: 'generated:abc123',
      data: { blocks: [] }
    };

    const duplicateProgram: WorkoutProgram = {
      id: 'new456',
      routine_name: 'Same Program',
      days_per_week: 4,
      blocks: [],
      fingerprint: 'generated:abc123', // Same fingerprint
      description: 'Test program'
    };

    // Mock existing routines
    mockWorkoutStorage.loadRoutines.mockResolvedValue([existingRoutine]);

    const mockOnImportComplete = jest.fn();
    const { result } = renderHook(() =>
      useWorkoutImport({ onImportComplete: mockOnImportComplete })
    );

    await act(async () => {
      result.current.importFromText(JSON.stringify(duplicateProgram));
    });

    // Should find existing and call completion with existing data
    await waitFor(
      () => expect(mockOnImportComplete).toHaveBeenCalledWith(existingRoutine.data),
      { timeout: 3000 }
    );

    // Should NOT save a new routine
    expect(mockWorkoutStorage.saveRoutines).not.toHaveBeenCalled();
  });

  it('2. CURATED DEDUPE: curated import still works with curated: prefix', async () => {
    const existingCuratedRoutine = {
      id: 'curated123',
      name: 'Curated Program',
      days: 3,
      blocks: 1,
      fingerprint: 'curated:beginnerFullBody',
      data: { blocks: [] }
    };

    mockWorkoutStorage.loadRoutines.mockResolvedValue([existingCuratedRoutine]);

    const mockOnImportComplete = jest.fn();
    const { result } = renderHook(() =>
      useWorkoutImport({
        onImportComplete: mockOnImportComplete,
        isCurated: true,
        curatedSlug: 'beginnerFullBody',
      })
    );

    const curatedProgram: WorkoutProgram = {
      id: 'new789',
      routine_name: 'Beginner Full Body',
      days_per_week: 3,
      blocks: [],
      description: 'Curated program'
    };

    await act(async () => {
      result.current.importFromText(JSON.stringify(curatedProgram));
    });

    // Should find existing curated routine
    await waitFor(
      () => expect(mockOnImportComplete).toHaveBeenCalledWith(existingCuratedRoutine.data),
      { timeout: 3000 }
    );
    expect(mockWorkoutStorage.saveRoutines).not.toHaveBeenCalled();
  });

  it('3. NO FINGERPRINT: program without fingerprint is imported normally', async () => {
    const programWithoutFingerprint: WorkoutProgram = {
      id: 'nofingerprint',
      routine_name: 'Custom Program',
      days_per_week: 5,
      blocks: [],
      // No fingerprint property
      description: 'User created program'
    };

    mockWorkoutStorage.loadRoutines.mockResolvedValue([]);
    mockWorkoutStorage.saveRoutines.mockResolvedValue();

    const mockOnImportComplete = jest.fn();
    const { result } = renderHook(() =>
      useWorkoutImport({ onImportComplete: mockOnImportComplete })
    );

    await act(async () => {
      result.current.importFromText(JSON.stringify(programWithoutFingerprint));
    });

    // Should proceed with normal import since no fingerprint to dedupe
    await waitFor(
      () => expect(mockWorkoutStorage.saveRoutines).toHaveBeenCalled(),
      { timeout: 3000 }
    );
  });

  it('4. UNIQUE FINGERPRINT: program with unique fingerprint imports normally', async () => {
    const existingRoutines = [
      { id: 'other1', name: 'Other Program', fingerprint: 'generated:xyz789', days: 3, blocks: 1 }
    ];

    const uniqueProgram: WorkoutProgram = {
      id: 'unique123',
      routine_name: 'Unique Program',
      days_per_week: 4,
      blocks: [],
      fingerprint: 'generated:unique456', // Different from existing
      description: 'Unique program'
    };

    mockWorkoutStorage.loadRoutines.mockResolvedValue(existingRoutines);
    mockWorkoutStorage.saveRoutines.mockResolvedValue();

    const { result } = renderHook(() => useWorkoutImport({}));

    await act(async () => {
      result.current.importFromText(JSON.stringify(uniqueProgram));
    });

    // Should save since fingerprint is unique
    await waitFor(
      () => expect(mockWorkoutStorage.saveRoutines).toHaveBeenCalled(),
      { timeout: 3000 }
    );

    // Check that new routine was added to existing array
    const saveCall = mockWorkoutStorage.saveRoutines.mock.calls[0][0];
    expect(saveCall).toHaveLength(2); // existing + new
  });
});