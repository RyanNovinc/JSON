/**
 * Comprehensive test: Verify migration transform for workout questionnaire keys
 * Tests the actual shape conversion from old nested {formData} to new flat format
 */

import { runMigrations, resetMigrationState, getMigrationStatus } from '../migrationFramework';
import RobustStorage from '../robustStorage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

// Real RobustStorage behavior simulation
const mockStorage = new Map<string, string>();
const mockTombstones = new Set<string>();

const mockRobustStorage = {
  setItem: jest.fn(async (key: string, value: string, critical?: boolean) => {
    mockTombstones.delete(key); // Clear tombstone on write
    mockStorage.set(key, value);
    
    if (critical) {
      // Simulate critical storage - write to multiple locations
      mockStorage.set(`${key}_backup`, value);
      mockStorage.set(`${key}_emergency`, value);
    }
    return true;
  }),
  
  getItem: jest.fn(async (key: string, critical?: boolean) => {
    if (mockTombstones.has(key)) {
      return null; // Tombstoned keys return null
    }
    return mockStorage.get(key) || null;
  }),
  
  removeItem: jest.fn(async (key: string, critical?: boolean, useTombstone: boolean = true) => {
    if (critical) {
      // Purge all copies and conditionally create tombstone
      mockStorage.delete(key);
      mockStorage.delete(`${key}_backup`);
      mockStorage.delete(`${key}_emergency`);
      if (useTombstone) {
        mockTombstones.add(key);
      }
    } else {
      mockStorage.delete(key);
    }
    return true;
  })
};

// Replace the real RobustStorage with our mock
jest.doMock('../robustStorage', () => mockRobustStorage);

describe('Workout Migration Transform Verification', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockStorage.clear();
    mockTombstones.clear();
    
    // Mock RobustStorage methods
    (RobustStorage.setItem as jest.Mock) = mockRobustStorage.setItem;
    (RobustStorage.getItem as jest.Mock) = mockRobustStorage.getItem;
    (RobustStorage.removeItem as jest.Mock) = mockRobustStorage.removeItem;
    
    // Reset migration state for clean test environment
    await resetMigrationState();
  });

  it('1. FITNESS GOALS: old nested format transforms to flat format correctly', async () => {
    // Simulate old nested fitness goals data
    const oldFitnessGoalsData = {
      formData: {
        primaryGoal: 'build_muscle',
        customPrimaryGoal: '',
        totalTrainingDays: '4',
        gymTrainingDays: '3',
        otherTrainingDays: '1',
        priorityMuscleGroups: ['chest', 'back'],
        customMuscleGroup: '',
        auxiliaryMuscles: ['core'],
        movementLimitations: [],
        customLimitation: '',
        trainingStylePreference: 'powerlifting',
        customTrainingStyle: '',
        trainingExperience: 'intermediate',
        volumePreference: 'moderate',
        gender: 'male',
        programDuration: '12_weeks',
        customDuration: ''
      },
      completedAt: '2024-01-15T10:30:00Z',
      someOtherField: 'preserve_this'
    };

    // Store old format data
    await mockRobustStorage.setItem('fitness_goals_questionnaire_results', JSON.stringify(oldFitnessGoalsData), true);
    
    // Run migrations
    await runMigrations();
    
    // Verify transformed data
    const transformedDataStr = await mockRobustStorage.getItem('fitness_goals_questionnaire_results', true);
    expect(transformedDataStr).toBeTruthy();
    
    const transformedData = JSON.parse(transformedDataStr!);
    
    // Verify formData fields moved to top level
    expect(transformedData.primaryGoal).toBe('build_muscle');
    expect(transformedData.totalTrainingDays).toBe('4');
    expect(transformedData.priorityMuscleGroups).toEqual(['chest', 'back']);
    expect(transformedData.trainingExperience).toBe('intermediate');
    
    // Verify sibling fields outside formData survive the flatten.
    //
    // This assertion used to be `expect(transformedData.someOtherField).toBeUndefined()`,
    // i.e. it asserted that arbitrary user fields SHOULD be dropped. Production was since
    // fixed to preserve them (the `...rest` spread in migrateQuestionnaireShape), so the
    // migration no longer discards data — and the test had been demanding that it did.
    expect(transformedData.completedAt).toBe('2024-01-15T10:30:00Z');
    expect(transformedData.someOtherField).toBe('preserve_this');
    
    // Verify migration markers added
    expect(transformedData._migrationVersion).toBe(2);
    expect(transformedData._migratedAt).toBeTruthy();
    
    // Verify old formData wrapper removed
    expect(transformedData.formData).toBeUndefined();
  });

  it('2. EQUIPMENT PREFERENCES: old nested format transforms correctly', async () => {
    // Simulate old nested equipment preferences data
    const oldEquipmentData = {
      formData: {
        selectedEquipment: ['barbell', 'dumbbells', 'pull_up_bar'],
        specificEquipment: 'olympic_barbell',
        unavailableEquipment: 'leg_press',
        sessionStyle: 'focused_compound',
        likedExercises: 'squats, deadlifts, bench press',
        dislikedExercises: 'burpees, mountain climbers',
        includeDirectCore: true
      },
      completedAt: '2024-01-16T14:20:00Z'
    };

    await mockRobustStorage.setItem('equipment_preferences_questionnaire_results', JSON.stringify(oldEquipmentData), true);
    
    await runMigrations();
    
    const transformedDataStr = await mockRobustStorage.getItem('equipment_preferences_questionnaire_results', true);
    const transformedData = JSON.parse(transformedDataStr!);
    
    // Verify equipment-specific fields
    expect(transformedData.selectedEquipment).toEqual(['barbell', 'dumbbells', 'pull_up_bar']);
    expect(transformedData.specificEquipment).toBe('olympic_barbell');
    expect(transformedData.likedExercises).toBe('squats, deadlifts, bench press');
    expect(transformedData.includeDirectCore).toBe(true);
    
    // Verify preservation and migration markers
    expect(transformedData.completedAt).toBe('2024-01-16T14:20:00Z');
    expect(transformedData._migrationVersion).toBe(2);
    expect(transformedData.formData).toBeUndefined();
  });

  it('3. FLAT FORMAT DETECTION: already flat data skips migration', async () => {
    // Simulate already flat format data
    const flatData = {
      primaryGoal: 'build_muscle',
      totalTrainingDays: '4',
      completedAt: '2024-01-15T10:30:00Z'
    };

    await mockRobustStorage.setItem('fitness_goals_questionnaire_results', JSON.stringify(flatData), true);
    
    await runMigrations();
    
    const finalDataStr = await mockRobustStorage.getItem('fitness_goals_questionnaire_results', true);
    const finalData = JSON.parse(finalDataStr!);
    
    // Verify data unchanged (no migration markers added)
    expect(finalData).toEqual(flatData);
    expect(finalData._migrationVersion).toBeUndefined();
    expect(finalData._migratedAt).toBeUndefined();
  });

  it('4. COMPREHENSIVE DOMAINS: all workout questionnaire types handled', async () => {
    // Test all domains listed in the migration framework
    const testDomains = [
      'nutrition_questionnaire_results',
      'budget_cooking_questionnaire_results', 
      'fridge_pantry_questionnaire_results',
      'sleep_optimization_results',
      'fitness_goals_questionnaire_results',
      'equipment_preferences_questionnaire_results'
    ];

    // Seed old format data for all domains
    for (const domain of testDomains) {
      const oldFormatData = {
        formData: {
          testField: `test_value_for_${domain}`,
          anotherField: `another_${domain}`
        },
        completedAt: '2024-01-15T10:00:00Z'
      };
      await mockRobustStorage.setItem(domain, JSON.stringify(oldFormatData), true);
    }

    // Run migrations
    await runMigrations();

    // Verify all domains transformed
    for (const domain of testDomains) {
      const transformedDataStr = await mockRobustStorage.getItem(domain, true);
      expect(transformedDataStr).toBeTruthy();
      
      const transformedData = JSON.parse(transformedDataStr!);
      expect(transformedData.testField).toBe(`test_value_for_${domain}`);
      expect(transformedData.anotherField).toBe(`another_${domain}`);
      expect(transformedData.completedAt).toBe('2024-01-15T10:00:00Z');
      expect(transformedData._migrationVersion).toBe(2);
      expect(transformedData.formData).toBeUndefined();
    }

    // Verify migration status reports completion
    const status = await getMigrationStatus();
    expect(status.current.schemaVersion).toBe(2);
    expect(status.pendingMigrations).toHaveLength(0);
  });

  it('5. EDGE CASES: handles corrupted and empty data gracefully', async () => {
    // Test corrupted JSON data
    await mockRobustStorage.setItem('fitness_goals_questionnaire_results', 'invalid_json_data', true);
    
    await runMigrations();
    
    // Should not crash, migration should skip corrupted data
    const finalDataStr = await mockRobustStorage.getItem('fitness_goals_questionnaire_results', true);
    expect(finalDataStr).toBe('invalid_json_data'); // Unchanged due to parse error
    
    // Test empty/null data
    await mockRobustStorage.setItem('equipment_preferences_questionnaire_results', '', true);
    
    await resetMigrationState();
    await runMigrations();
    
    // Should not crash on empty data (empty string becomes null in storage)
    const emptyDataStr = await mockRobustStorage.getItem('equipment_preferences_questionnaire_results', true);
    expect(emptyDataStr).toBeNull();
  });
});