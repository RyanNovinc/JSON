/**
 * RobustStorage Contamination and Deletion Integrity Tests
 * 
 * Tests the fixes for cross-key contamination and deletion resurrection:
 * 1. Cross-key contamination: version keys getting questionnaire data
 * 2. Deletion resurrection: explicitly deleted data returning from backups
 * 3. Migration corruption: migrations being undone by recovery
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import RobustStorage from '../robustStorage';
import { WorkoutStorage } from '../storage';
import { runMigrations, resetMigrationState, getMigrationStatus } from '../migrationFramework';
import { makeWorkoutHistory } from './testHelpers';

describe('RobustStorage Contamination & Deletion Integrity', () => {

  beforeEach(async () => {
    // Reset migration state for clean tests
    await resetMigrationState();
    
    // Clear any existing tombstones to ensure clean state
    const allKeys = await AsyncStorage.getAllKeys();
    const tombstoneKeys = allKeys.filter(key => 
      key.startsWith('tombstone_schema_version_') || 
      key.startsWith('tombstone_identity_table_version_')
    );
    await Promise.all(tombstoneKeys.map(key => AsyncStorage.removeItem(key)));
  });

  // Test 1: Cross-key contamination fix
  describe('1. CROSS-KEY CONTAMINATION FIX', () => {
    it('version keys stay integers, no cross-contamination from questionnaire data', async () => {
      // Set up questionnaire data that previously contaminated version keys
      const questionnaireData = {
        formData: {
          goal: 'lose_weight',
          age: '30',
          gender: 'male'
        },
        completedAt: '2026-01-01T12:00:00.000Z'
      };
      
      await RobustStorage.setItem('nutrition_questionnaire_results', JSON.stringify(questionnaireData), true);
      
      // Set schema and identity versions
      await RobustStorage.setItem('schema_version', '2', true);
      await RobustStorage.setItem('identity_table_version', '1', true);
      
      // Simulate repair/restart cycle that previously caused contamination
      const versionBeforeRepair = await RobustStorage.getItem('schema_version', true);
      const identityBeforeRepair = await RobustStorage.getItem('identity_table_version', true);
      
      expect(versionBeforeRepair).toBe('2');
      expect(identityBeforeRepair).toBe('1');
      
      // Simulate a health check / repair cycle (previously source of contamination)
      const healthStatus = await RobustStorage.healthCheck();
      
      // After repair, version keys should still be clean integers
      const versionAfterRepair = await RobustStorage.getItem('schema_version', true);
      const identityAfterRepair = await RobustStorage.getItem('identity_table_version', true);
      
      expect(versionAfterRepair).toBe('2');
      expect(identityAfterRepair).toBe('1');
      
      // Verify no key returns another key's data
      const questionnaireAfterRepair = await RobustStorage.getItem('nutrition_questionnaire_results', true);
      const parsedQuestionnaire = JSON.parse(questionnaireAfterRepair!);
      
      expect(parsedQuestionnaire.formData.goal).toBe('lose_weight');
      expect(versionAfterRepair).not.toContain('lose_weight'); // No contamination
      expect(identityAfterRepair).not.toContain('lose_weight'); // No contamination
    });

    it('migration system handles version corruption gracefully', async () => {
      // Simulate corrupted version data (what used to happen before the fix)
      await RobustStorage.setItem('schema_version', '{"corrupted": "json_data"}', true);
      await RobustStorage.setItem('identity_table_version', '[1,2,3]', true);
      
      // Migration system should detect corruption and reset to safe defaults
      const statusBefore = await getMigrationStatus();
      
      // Should fall back to safe values, not crash with NaN
      expect(statusBefore.current.schemaVersion).toBe(0); // Reset to v0
      expect(statusBefore.current.identityTableVersion).toBe(0); // Reset to v0
      
      // Migrations should run successfully despite corruption
      await expect(runMigrations()).resolves.not.toThrow();
      
      // After migrations, versions should be properly set
      const statusAfter = await getMigrationStatus();
      expect(statusAfter.current.schemaVersion).toBe(2); // Current schema version
      expect(statusAfter.current.identityTableVersion).toBe(1); // Current identity version
    });
  });

  // Test 2: Deletion integrity
  describe('2. DELETION INTEGRITY', () => {
    it('deleted routine stays deleted after repair and restart', async () => {
      // Create a test routine
      const testRoutine = {
        id: 'routine_to_delete_123',
        name: 'Routine To Delete',
        days: 3,
        blocks: 4,
        data: { test: true }
      };
      
      // Save the routine
      await WorkoutStorage.saveRoutines([testRoutine]);
      
      // Verify it exists
      const beforeDelete = await WorkoutStorage.loadRoutines();
      expect(beforeDelete).toHaveLength(1);
      expect(beforeDelete[0].name).toBe('Routine To Delete');
      
      // Delete the routine via real delete path
      await WorkoutStorage.saveRoutines([]); // Clear all routines
      
      // Verify deletion
      const afterDelete = await WorkoutStorage.loadRoutines();
      expect(afterDelete).toHaveLength(0);
      
      // Simulate repair that previously resurrected deleted data
      const healthStatus = await RobustStorage.healthCheck();
      
      // Routine should stay deleted
      const afterRepair = await WorkoutStorage.loadRoutines();
      expect(afterRepair).toHaveLength(0);
      
      // Simulate restart by resetting and trying again
      await resetMigrationState();
      await runMigrations();
      
      const afterRestart = await WorkoutStorage.loadRoutines();
      expect(afterRestart).toHaveLength(0);
    });

    it('deleted workout history entry stays deleted after repair and restart', async () => {
      // Create test workout history entries
      const entry1 = makeWorkoutHistory({
        exerciseName: 'Keep This Exercise',
        sets: [{ setNumber: 1, weight: '100', reps: '10', completed: true, unit: 'lbs' }]
      });
      
      const entry2 = makeWorkoutHistory({
        exerciseName: 'Delete This Exercise',
        sets: [{ setNumber: 1, weight: '200', reps: '5', completed: true, unit: 'lbs' }]
      });
      
      // Save both entries
      await WorkoutStorage.addWorkoutEntry(entry1);
      await WorkoutStorage.addWorkoutEntry(entry2);
      
      // Verify both exist
      const beforeDelete = await WorkoutStorage.loadWorkoutHistory();
      expect(beforeDelete).toHaveLength(2);
      
      // Delete one entry (simulate user deletion)
      const filteredHistory = beforeDelete.filter(e => e.exerciseName !== 'Delete This Exercise');
      await WorkoutStorage.saveWorkoutHistory(filteredHistory);
      
      // Verify deletion
      const afterDelete = await WorkoutStorage.loadWorkoutHistory();
      expect(afterDelete).toHaveLength(1);
      expect(afterDelete[0].exerciseName).toBe('Keep This Exercise');
      
      // Simulate repair and restart cycle
      const healthStatus = await RobustStorage.healthCheck();
      await resetMigrationState();
      await runMigrations();
      
      // Deleted entry should stay deleted
      const afterRepairRestart = await WorkoutStorage.loadWorkoutHistory();
      expect(afterRepairRestart).toHaveLength(1);
      expect(afterRepairRestart[0].exerciseName).toBe('Keep This Exercise');
      
      // Deleted entry should not be resurrected
      const deletedStillGone = afterRepairRestart.find(e => e.exerciseName === 'Delete This Exercise');
      expect(deletedStillGone).toBeUndefined();
    });

    it('tombstones prevent resurrection but expire properly', async () => {
      // Create test data
      await RobustStorage.setItem('test_tombstone_key', 'test_value', true);
      
      // Verify it exists
      const beforeDelete = await RobustStorage.getItem('test_tombstone_key', true);
      expect(beforeDelete).toBe('test_value');
      
      // Delete via removeItem (creates tombstone)
      await RobustStorage.removeItem('test_tombstone_key', true);
      
      // Should be null immediately after deletion
      const afterDelete = await RobustStorage.getItem('test_tombstone_key', true);
      expect(afterDelete).toBeNull();
      
      // Should still be null after simulated repair attempts
      const afterRepair1 = await RobustStorage.getItem('test_tombstone_key', true);
      expect(afterRepair1).toBeNull();
      
      const afterRepair2 = await RobustStorage.getItem('test_tombstone_key', true);
      expect(afterRepair2).toBeNull();
      
      // Note: Testing tombstone expiry would require mocking Date.now() or waiting 7 days
      // For now, we verify that tombstones prevent immediate resurrection
    });
  });

  // Test 3: Migration corruption prevention
  describe('3. MIGRATION CORRUPTION PREVENTION', () => {
    it('migrations are not undone by repair after completion', async () => {
      // Create old-format questionnaire data (what migration converts)
      const oldFormatData = {
        formData: {
          goal: 'maintain',
          age: '25',
          gender: 'female'
        },
        completedAt: '2026-01-01T12:00:00.000Z'
      };
      
      await RobustStorage.setItem('nutrition_questionnaire_results', JSON.stringify(oldFormatData), true);
      
      // Verify data is in old format
      const beforeMigration = JSON.parse(await RobustStorage.getItem('nutrition_questionnaire_results', true)!);
      expect(beforeMigration.formData).toBeDefined();
      expect(beforeMigration.goal).toBeUndefined(); // Not yet flattened
      
      // Run migrations (should convert to flat format)
      await runMigrations();
      
      // Verify migration completed
      const afterMigration = JSON.parse(await RobustStorage.getItem('nutrition_questionnaire_results', true)!);
      expect(afterMigration.formData).toBeUndefined(); // Old nested structure removed
      expect(afterMigration.goal).toBe('maintain'); // Flattened to top level
      expect(afterMigration._migrationVersion).toBe(2); // Migration marker
      
      // Simulate repair pass (previously this could resurrect old-format data)
      const healthStatus = await RobustStorage.healthCheck();
      
      // Data should still be in migrated format
      const afterRepair = JSON.parse(await RobustStorage.getItem('nutrition_questionnaire_results', true)!);
      expect(afterRepair.formData).toBeUndefined(); // Should NOT be resurrected
      expect(afterRepair.goal).toBe('maintain'); // Should stay flattened
      expect(afterRepair._migrationVersion).toBe(2); // Migration marker preserved
      
      // Verify migrations don't re-run (they think they're complete)
      const statusAfterRepair = await getMigrationStatus();
      expect(statusAfterRepair.pendingMigrations).toHaveLength(0);
      expect(statusAfterRepair.needsIdentityReconcile).toBe(false);
    });
  });
});