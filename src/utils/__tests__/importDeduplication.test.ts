/**
 * Test for Fix 4: Import deduplication by fingerprint
 * Prevents duplicate library entries on re-import
 */

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

describe('Import Deduplication (Fix 4)', () => {
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
    const { importFromText } = useWorkoutImport({ 
      onImportComplete: mockOnImportComplete 
    });

    await importFromText(JSON.stringify(duplicateProgram));

    // Should find existing and call completion with existing data
    expect(mockOnImportComplete).toHaveBeenCalledWith(existingRoutine.data);
    
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
    const { importFromText } = useWorkoutImport({ 
      onImportComplete: mockOnImportComplete,
      isCurated: true,
      curatedSlug: 'beginnerFullBody'
    });

    const curatedProgram: WorkoutProgram = {
      id: 'new789',
      routine_name: 'Beginner Full Body',
      days_per_week: 3,
      blocks: [],
      description: 'Curated program'
    };

    await importFromText(JSON.stringify(curatedProgram));

    // Should find existing curated routine
    expect(mockOnImportComplete).toHaveBeenCalledWith(existingCuratedRoutine.data);
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
    const { importFromText } = useWorkoutImport({ 
      onImportComplete: mockOnImportComplete 
    });

    await importFromText(JSON.stringify(programWithoutFingerprint));

    // Should proceed with normal import since no fingerprint to dedupe
    expect(mockWorkoutStorage.saveRoutines).toHaveBeenCalled();
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

    const { importFromText } = useWorkoutImport({});

    await importFromText(JSON.stringify(uniqueProgram));

    // Should save since fingerprint is unique
    expect(mockWorkoutStorage.saveRoutines).toHaveBeenCalled();
    
    // Check that new routine was added to existing array
    const saveCall = mockWorkoutStorage.saveRoutines.mock.calls[0][0];
    expect(saveCall).toHaveLength(2); // existing + new
  });
});