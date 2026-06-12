/**
 * Smoke test for persistence test harness
 * Verifies WorkoutHistory round-trips through WorkoutStorage correctly
 */

import { WorkoutStorage } from '../storage';
import { makeWorkoutHistory } from './testHelpers';

describe('Persistence Smoke Test', () => {
  it('should round-trip WorkoutHistory through WorkoutStorage', async () => {
    // Create test workout history entry
    const originalEntry = makeWorkoutHistory({
      exerciseName: 'Smoke Test Exercise',
      routineName: 'Smoke Test Routine',
      dayName: 'Test Day',
      date: '2026-01-15',
      sets: [
        {
          setNumber: 1,
          weight: '225',
          reps: '5',
          completed: true,
          unit: 'lbs'
        },
        {
          setNumber: 2,
          weight: '235',
          reps: '3',
          completed: true,
          unit: 'lbs'
        }
      ]
    });

    // Save the entry
    await WorkoutStorage.addWorkoutEntry(originalEntry);

    // Load all history and find our entry
    const allHistory = await WorkoutStorage.loadWorkoutHistory();
    const savedEntry = allHistory.find(entry => entry.id === originalEntry.id);

    // Verify the entry was saved correctly
    expect(savedEntry).toBeDefined();
    expect(savedEntry).toEqual(originalEntry);

    // Test exercise-specific history query
    const exerciseHistory = await WorkoutStorage.getExerciseHistory('Smoke Test Exercise');
    expect(exerciseHistory).toHaveLength(1);
    expect(exerciseHistory[0]).toEqual(originalEntry);
    
    console.log('✅ Smoke test passed - WorkoutHistory round-trip successful');
  });
});