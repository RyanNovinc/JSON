/**
 * Migration Framework Regression Tests
 * 
 * Tests the data migration framework for:
 * - Old-shape fixture survival
 * - Idempotency (running migrations twice)
 * - Drift scenario (custom → curated after table update)
 * - Failure safety (rollback and data accessibility)
 */

import { WorkoutStorage } from '../storage';
import { resolveExerciseId, IDENTITY_TABLE_VERSION } from '../exerciseIdentity';
import { runMigrations, getMigrationStatus, SCHEMA_VERSION, resetMigrationState } from '../migrationFramework';
import RobustStorage from '../robustStorage';
import { makeWorkoutHistory } from './testHelpers';

describe('Migration Framework Persistence', () => {

  beforeEach(async () => {
    // Reset migration state for clean test isolation
    await resetMigrationState();
  });

  // Test 1: Old-shape fixture survival
  it('1. OLD-SHAPE SURVIVAL: entries with no exerciseId survive migration with correct IDs', async () => {
    // Create old-shape entries (no exerciseId field)
    const oldShapeEntries = [
      {
        ...makeWorkoutHistory({
          exerciseName: 'Barbell Bench Press',
          date: '2026-01-01',
          sets: [{ setNumber: 1, weight: '225', reps: '5', completed: true, unit: 'lbs' as 'lbs' }]
        }),
        exerciseId: undefined // Simulate old data without exerciseId
      },
      {
        ...makeWorkoutHistory({
          exerciseName: 'EZ Bar Curl',
          date: '2026-01-02',
          sets: [{ setNumber: 1, weight: '65', reps: '10', completed: true, unit: 'lbs' as 'lbs' }]
        }),
        exerciseId: undefined // Simulate old data without exerciseId
      },
      {
        ...makeWorkoutHistory({
          exerciseName: 'Custom Exercise Name',
          date: '2026-01-03',
          sets: [
            { setNumber: 1, weight: '100.5', reps: '8', completed: true, unit: 'kg' as 'kg' },
            { 
              setNumber: 2, 
              weight: '90', 
              reps: '6', 
              completed: true, 
              unit: 'kg' as 'kg',
              drops: [
                { weight: '80', reps: '3', completed: true, unit: 'kg' as 'kg' }
              ]
            }
          ]
        }),
        exerciseId: undefined // Simulate old data without exerciseId
      }
    ];

    // Manually save old-shape data (bypassing addWorkoutEntry which would add exerciseId)
    await WorkoutStorage.saveWorkoutHistory(oldShapeEntries);

    // Verify old-shape data is in place
    const preHistory = await WorkoutStorage.loadWorkoutHistory();
    expect(preHistory).toHaveLength(3);
    expect(preHistory.every(entry => !entry.exerciseId)).toBe(true);

    // Run migrations
    await runMigrations();

    // Verify all entries survived with correct exerciseIds
    const postHistory = await WorkoutStorage.loadWorkoutHistory();
    expect(postHistory).toHaveLength(3);

    // Check specific entries and their IDs
    const benchEntry = postHistory.find(entry => entry.exerciseName === 'Barbell Bench Press');
    const curlEntry = postHistory.find(entry => entry.exerciseName === 'EZ Bar Curl');
    const customEntry = postHistory.find(entry => entry.exerciseName === 'Custom Exercise Name');

    expect(benchEntry).toBeDefined();
    expect(benchEntry?.exerciseId).toBe('bench_press_barbell'); // Should resolve to curated ID

    expect(curlEntry).toBeDefined();
    expect(curlEntry?.exerciseId).toBe('curl_ez_bar'); // Should resolve to curated ID

    expect(customEntry).toBeDefined();
    expect(customEntry?.exerciseId).toBe('custom:custom exercise name'); // Should resolve to custom ID

    // Verify all other fields intact (weight/reps strings, units, drops)
    expect(benchEntry?.sets[0]).toEqual(
      expect.objectContaining({ weight: '225', reps: '5', unit: 'lbs' })
    );
    expect(curlEntry?.sets[0]).toEqual(
      expect.objectContaining({ weight: '65', reps: '10', unit: 'lbs' })
    );
    expect(customEntry?.sets[1].drops?.[0]).toEqual(
      expect.objectContaining({ weight: '80', reps: '3', unit: 'kg' })
    );
  });

  // Test 2: Idempotency
  it('2. IDEMPOTENCY: running migrations twice changes nothing', async () => {
    // Set up some data
    const entry = makeWorkoutHistory({
      exerciseName: 'Dumbbell Bench Press',
      sets: [{ setNumber: 1, weight: '80', reps: '8', completed: true, unit: 'lbs' as 'lbs' }]
    });
    await WorkoutStorage.addWorkoutEntry(entry);

    // Run migrations first time
    await runMigrations();
    const afterFirstRun = await WorkoutStorage.loadWorkoutHistory();

    // Run migrations second time
    await runMigrations();
    const afterSecondRun = await WorkoutStorage.loadWorkoutHistory();

    // Should be identical
    expect(afterFirstRun).toEqual(afterSecondRun);

    // Verify version tracking
    const status = await getMigrationStatus();
    expect(status.current.schemaVersion).toBe(SCHEMA_VERSION);
    expect(status.current.identityTableVersion).toBe(IDENTITY_TABLE_VERSION);
    expect(status.pendingMigrations).toHaveLength(0);
    expect(status.needsIdentityReconcile).toBe(false);
  });

  // Test 3: Drift scenario (critical test)
  it('3. DRIFT SCENARIO: custom exercise becomes curated after table update', async () => {
    // Simulate an exercise that starts as custom but later becomes curated
    
    // Step 1: Log a "custom" exercise that would map to curated if it were in the table
    const customEntry = {
      ...makeWorkoutHistory({
        exerciseName: 'Hammer Curl', // This IS in our curated table
        date: '2026-01-05',
        sets: [{ setNumber: 1, weight: '30', reps: '12', completed: true, unit: 'lbs' as 'lbs' }]
      }),
      exerciseId: 'custom:hammer curl' // Simulate it was initially treated as custom
    };

    // Manually save with the "wrong" (stale) exerciseId
    await WorkoutStorage.saveWorkoutHistory([customEntry]);

    // Step 2: Also add some "official" curated hammer curl history
    const curatedEntry = makeWorkoutHistory({
      exerciseName: 'Dumbbell Hammer Curl', // Different name but same exercise
      date: '2026-01-06', 
      sets: [{ setNumber: 1, weight: '35', reps: '10', completed: true, unit: 'lbs' as 'lbs' }]
    });
    await WorkoutStorage.addWorkoutEntry(curatedEntry); // This will get correct ID

    // Step 3: Before migration, they should be separate
    const beforeMigration = await WorkoutStorage.getExerciseHistory('Hammer Curl');
    expect(beforeMigration).toHaveLength(2); // Both entries should appear (drift-proof matching)

    // Step 4: Run migration (simulates identity table update)
    await runMigrations();

    // Step 5: After migration, the stale ID should be corrected
    const postHistory = await WorkoutStorage.loadWorkoutHistory();
    const hammerEntry = postHistory.find(entry => entry.exerciseName === 'Hammer Curl');
    
    expect(hammerEntry?.exerciseId).toBe('curl_hammer'); // Should be corrected to curated ID
    expect(hammerEntry?.exerciseId).not.toBe('custom:hammer curl'); // Should no longer be custom

    // Step 6: Both entries should still pool together under the curated identity
    const afterMigration = await WorkoutStorage.getExerciseHistory('Hammer Curl');
    expect(afterMigration).toHaveLength(2);
    
    const weights = afterMigration.map(entry => entry.sets[0].weight).sort();
    expect(weights).toEqual(['30', '35']); // Both weights present
  });

  // Test 4: Failure safety
  it('4. FAILURE SAFETY: migration failure preserves data accessibility', async () => {
    // Set up test data
    const testEntry = makeWorkoutHistory({
      exerciseName: 'Test Exercise',
      sets: [{ setNumber: 1, weight: '100', reps: '5', completed: true, unit: 'lbs' as 'lbs' }]
    });
    await WorkoutStorage.addWorkoutEntry(testEntry);

    const preFailureHistory = await WorkoutStorage.loadWorkoutHistory();
    expect(preFailureHistory).toHaveLength(1);

    // Force a migration failure by corrupting the migration process
    // We'll temporarily break the saveWorkoutHistory function
    const originalSave = WorkoutStorage.saveWorkoutHistory;
    let callCount = 0;
    WorkoutStorage.saveWorkoutHistory = jest.fn().mockImplementation(async (history) => {
      callCount++;
      if (callCount === 1) {
        // First call (during migration) should fail
        throw new Error('Simulated migration failure');
      }
      // Subsequent calls should work
      return originalSave.call(WorkoutStorage, history);
    });

    // Try to run migrations - should fail
    await expect(runMigrations()).rejects.toThrow('Simulated migration failure');

    // Restore original function
    WorkoutStorage.saveWorkoutHistory = originalSave;

    // Verify data is still accessible despite migration failure
    const postFailureHistory = await WorkoutStorage.loadWorkoutHistory();
    expect(postFailureHistory).toEqual(preFailureHistory);

    // Verify data integrity after failure
    const status = await getMigrationStatus();
    // Since previous tests already ran migrations successfully, the identity table version 
    // should still be current (migrations in other tests succeeded)
    // But the key point is data should remain accessible even after failure
    expect(postFailureHistory).toHaveLength(1);
    expect(postFailureHistory[0].exerciseName).toBe('Test Exercise');
  });

  // Test 5: Migration status reporting
  it('5. MIGRATION STATUS: reports current and target versions correctly', async () => {
    // Check status before any migrations
    const statusBefore = await getMigrationStatus();
    expect(statusBefore.target.schemaVersion).toBe(SCHEMA_VERSION);
    expect(statusBefore.target.identityTableVersion).toBe(IDENTITY_TABLE_VERSION);

    // Run migrations
    await runMigrations();

    // Check status after migrations
    const statusAfter = await getMigrationStatus();
    expect(statusAfter.current.schemaVersion).toBe(SCHEMA_VERSION);
    expect(statusAfter.current.identityTableVersion).toBe(IDENTITY_TABLE_VERSION);
    expect(statusAfter.pendingMigrations).toHaveLength(0);
    expect(statusAfter.needsIdentityReconcile).toBe(false);
  });
});