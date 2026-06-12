/**
 * Exercise Identity Persistence Tests
 * 
 * Characterization tests that define target identity behavior for exercise history.
 * These capture current behavior and document intended fixes:
 * - PASS-EXPECTED: Should work today (lock the behavior)
 * - FAIL-EXPECTED: Documents bugs to be fixed by identity resolver
 */

import { WorkoutStorage } from '../storage';
import { ProgramStorage } from '../../data/programStorage';
import { makeWorkoutHistory, makeProgram, makeRoutine } from './testHelpers';

describe('Exercise Identity Persistence', () => {
  
  // Test 1: PASS-EXPECTED - Keystone test (this should already work)
  it('1. KEYSTONE (PASS): history survives routine+program deletion', async () => {
    // Setup: Create program, routine, and log sets for "Bench Press"
    const program = makeProgram({ name: 'Test Program' });
    const routine = makeRoutine({ 
      name: 'Test Routine',
      programId: program.id 
    });
    
    // Log workout history for "Bench Press"
    const benchHistory1 = makeWorkoutHistory({
      exerciseName: 'Bench Press',
      routineName: routine.name,
      date: '2026-01-10',
      sets: [
        { setNumber: 1, weight: '225', reps: '5', completed: true, unit: 'lbs' },
        { setNumber: 2, weight: '225', reps: '4', completed: true, unit: 'lbs' }
      ]
    });
    
    const benchHistory2 = makeWorkoutHistory({
      exerciseName: 'Bench Press',
      routineName: routine.name,
      date: '2026-01-12',
      sets: [
        { setNumber: 1, weight: '230', reps: '5', completed: true, unit: 'lbs' },
        { setNumber: 2, weight: '230', reps: '3', completed: true, unit: 'lbs' }
      ]
    });

    // Save program, routine, and history
    await ProgramStorage.addProgram(program);
    await WorkoutStorage.addRoutine(routine);
    await WorkoutStorage.addWorkoutEntry(benchHistory1);
    await WorkoutStorage.addWorkoutEntry(benchHistory2);

    // Verify initial state
    const initialHistory = await WorkoutStorage.getExerciseHistory('Bench Press');
    expect(initialHistory).toHaveLength(2);
    
    // DELETE: Remove routine and program
    await WorkoutStorage.removeRoutine(routine.id);
    await ProgramStorage.deleteProgram(program.id);
    
    // CREATE: New program and routine with same exercise
    const newProgram = makeProgram({ name: 'New Program' });
    const newRoutine = makeRoutine({ 
      name: 'New Routine',
      programId: newProgram.id 
    });
    
    await ProgramStorage.addProgram(newProgram);
    await WorkoutStorage.addRoutine(newRoutine);
    
    // ASSERT: History still intact
    const survivedHistory = await WorkoutStorage.getExerciseHistory('Bench Press');
    expect(survivedHistory).toHaveLength(2);
    expect(survivedHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({
        exerciseName: 'Bench Press',
        date: '2026-01-10',
        sets: expect.arrayContaining([
          expect.objectContaining({ weight: '225', reps: '5' })
        ])
      }),
      expect.objectContaining({
        exerciseName: 'Bench Press', 
        date: '2026-01-12',
        sets: expect.arrayContaining([
          expect.objectContaining({ weight: '230', reps: '5' })
        ])
      })
    ]));
  });

  // Test 2: PASS-EXPECTED - Delete isolation 
  it('2. DELETE ISOLATION (PASS): workout_history length unchanged by deletions', async () => {
    // Log some history
    const history1 = makeWorkoutHistory({ exerciseName: 'Squat' });
    const history2 = makeWorkoutHistory({ exerciseName: 'Deadlift' });
    
    await WorkoutStorage.addWorkoutEntry(history1);
    await WorkoutStorage.addWorkoutEntry(history2);
    
    const initialHistory = await WorkoutStorage.loadWorkoutHistory();
    const initialLength = initialHistory.length;
    
    // Create and delete program/routine
    const program = makeProgram();
    const routine = makeRoutine({ programId: program.id });
    
    await ProgramStorage.addProgram(program);
    await WorkoutStorage.addRoutine(routine);
    await WorkoutStorage.removeRoutine(routine.id);
    await ProgramStorage.deleteProgram(program.id);
    
    // Assert history length unchanged
    const finalHistory = await WorkoutStorage.loadWorkoutHistory();
    expect(finalHistory.length).toBe(initialLength);
  });

  // Test 3: PASS-EXPECTED - Orphan history
  it('3. ORPHAN HISTORY (PASS): exercise not in any routine still returns history', async () => {
    // Log history for an exercise
    const orphanHistory = makeWorkoutHistory({
      exerciseName: 'Orphan Exercise',
      date: '2026-01-15'
    });
    
    await WorkoutStorage.addWorkoutEntry(orphanHistory);
    
    // Don't create any routines containing this exercise
    
    // Assert we can still query its history
    const history = await WorkoutStorage.getExerciseHistory('Orphan Exercise');
    expect(history).toHaveLength(1);
    expect(history[0]).toEqual(expect.objectContaining({
      exerciseName: 'Orphan Exercise',
      date: '2026-01-15'
    }));
  });

  // Test 4: FAIL-EXPECTED - Cosmetic merge (documents the bug)
  it('4. COSMETIC MERGE (FAIL-EXPECTED): "Bench Press" should find "Barbell Bench Press" history', async () => {
    // Log under specific variation name
    const barbellHistory = makeWorkoutHistory({
      exerciseName: 'Barbell Bench Press',
      date: '2026-01-20',
      sets: [
        { setNumber: 1, weight: '185', reps: '8', completed: true, unit: 'lbs' }
      ]
    });
    
    await WorkoutStorage.addWorkoutEntry(barbellHistory);
    
    // Query with canonical/shorter name - should find the barbell history
    // but currently fails due to exact string matching
    const canonicalHistory = await WorkoutStorage.getExerciseHistory('Bench Press');
    
    // This assertion currently FAILS - it documents the bug to be fixed
    // When identity resolver is implemented, this should pass
    expect(canonicalHistory).toHaveLength(1);
    expect(canonicalHistory[0]).toEqual(expect.objectContaining({
      exerciseName: 'Barbell Bench Press',
      date: '2026-01-20'
    }));
  });

  // Test 5: PASS-EXPECTED - Equipment separation (lock this behavior)
  it('5. EQUIPMENT SEPARATE (PASS-EXPECTED): dumbbell and barbell bench should NOT pool', async () => {
    // Log sets for dumbbell variation
    const dumbbellHistory = makeWorkoutHistory({
      exerciseName: 'Dumbbell Bench Press',
      date: '2026-01-22',
      sets: [
        { setNumber: 1, weight: '80', reps: '10', completed: true, unit: 'lbs' }
      ]
    });
    
    await WorkoutStorage.addWorkoutEntry(dumbbellHistory);
    
    // Query for barbell variation - should NOT find dumbbell sets
    const barbellHistory = await WorkoutStorage.getExerciseHistory('Barbell Bench Press');
    
    // This should pass today and stay passing - equipment variants are separate
    expect(barbellHistory).toHaveLength(0);
    
    // Verify dumbbell history exists under its own name
    const dumbbellCheck = await WorkoutStorage.getExerciseHistory('Dumbbell Bench Press');
    expect(dumbbellCheck).toHaveLength(1);
  });

  // Test 6: FAIL-EXPECTED - Custom exercise reconciliation
  it('6. CUSTOM RECONCILE (FAIL-EXPECTED): case/spacing variations should match', async () => {
    // Log under one variant
    const originalHistory = makeWorkoutHistory({
      exerciseName: 'EZ Bar Curl',
      date: '2026-01-25',
      sets: [
        { setNumber: 1, weight: '45', reps: '12', completed: true, unit: 'lbs' }
      ]
    });
    
    await WorkoutStorage.addWorkoutEntry(originalHistory);
    
    // Query with different case/spacing - should find the same exercise
    // but currently fails due to exact string matching
    const lowerCaseHistory = await WorkoutStorage.getExerciseHistory('ez bar curl');
    
    // This assertion currently FAILS - documents the bug to be fixed
    expect(lowerCaseHistory).toHaveLength(1);
    expect(lowerCaseHistory[0]).toEqual(expect.objectContaining({
      exerciseName: 'EZ Bar Curl',
      date: '2026-01-25'
    }));
  });

  // Test 7: NEW - Free-text to curated pooling
  it('7. FREE-TEXT TO CURATED (NEW): free-typed "Bench Press" pools with curated', async () => {
    // First, log some "official" curated bench press history
    const curatedHistory = makeWorkoutHistory({
      exerciseName: 'Barbell Bench Press', // This will resolve to bench_press_barbell
      date: '2026-01-28',
      sets: [
        { setNumber: 1, weight: '185', reps: '5', completed: true, unit: 'lbs' }
      ]
    });
    
    await WorkoutStorage.addWorkoutEntry(curatedHistory);
    
    // Then, user manually types "Bench Press" (normalized to same ID)
    const freeTextHistory = makeWorkoutHistory({
      exerciseName: 'Bench Press', // This should also resolve to bench_press_barbell  
      date: '2026-01-29',
      sets: [
        { setNumber: 1, weight: '190', reps: '5', completed: true, unit: 'lbs' }
      ]
    });
    
    await WorkoutStorage.addWorkoutEntry(freeTextHistory);
    
    // Query with either name should return both entries
    const benchPressHistory = await WorkoutStorage.getExerciseHistory('Bench Press');
    const barbellBenchHistory = await WorkoutStorage.getExerciseHistory('Barbell Bench Press');
    
    // Both queries should return the same 2 entries
    expect(benchPressHistory).toHaveLength(2);
    expect(barbellBenchHistory).toHaveLength(2);
    expect(benchPressHistory).toEqual(barbellBenchHistory);
    
    // Verify both entries are present
    const weights = benchPressHistory.map(h => h.sets[0].weight).sort();
    expect(weights).toEqual(['185', '190']);
  });

  // Test 8: PASS-EXPECTED - Round-trip with edge cases
  it('8. ROUND-TRIP EDGES (PASS): handles "0" reps, decimals, empty unit, drop sets', async () => {
    const edgeCaseHistory = makeWorkoutHistory({
      exerciseName: 'Edge Case Exercise',
      date: '2026-01-30',
      sets: [
        // Edge case: zero reps
        { setNumber: 1, weight: '135.5', reps: '0', completed: false, unit: 'lbs' },
        // Edge case: decimal weight, empty unit
        { setNumber: 2, weight: '100.25', reps: '8', completed: true, unit: undefined },
        // Edge case: drop set
        { 
          setNumber: 3, 
          weight: '95', 
          reps: '6', 
          completed: true, 
          unit: 'lbs',
          drops: [
            { weight: '85', reps: '4', completed: true, unit: 'lbs' },
            { weight: '75', reps: '3', completed: true, unit: 'lbs' }
          ]
        }
      ]
    });
    
    await WorkoutStorage.addWorkoutEntry(edgeCaseHistory);
    
    // Load and verify all edge cases preserved
    const retrievedHistory = await WorkoutStorage.getExerciseHistory('Edge Case Exercise');
    expect(retrievedHistory).toHaveLength(1);
    
    const retrievedSets = retrievedHistory[0].sets;
    expect(retrievedSets).toHaveLength(3);
    
    // Verify zero reps preserved
    expect(retrievedSets[0]).toEqual(expect.objectContaining({
      weight: '135.5',
      reps: '0',
      completed: false,
      unit: 'lbs'
    }));
    
    // Verify decimal weight and undefined unit
    expect(retrievedSets[1]).toEqual(expect.objectContaining({
      weight: '100.25',
      reps: '8',
      completed: true
    }));
    
    // Verify drop set structure
    expect(retrievedSets[2]).toEqual(expect.objectContaining({
      weight: '95',
      reps: '6',
      drops: [
        { weight: '85', reps: '4', completed: true, unit: 'lbs' },
        { weight: '75', reps: '3', completed: true, unit: 'lbs' }
      ]
    }));
  });
});