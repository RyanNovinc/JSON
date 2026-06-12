/**
 * Test for Fix 6: Extended migration coverage for workout questionnaire keys
 * Ensures all questionnaire keys with nested data are migrated
 */

import { runMigrations } from '../migrationFramework';
import RobustStorage from '../robustStorage';

jest.mock('../robustStorage');
const mockRobustStorage = RobustStorage as jest.Mocked<typeof RobustStorage>;

describe('Extended Migration Coverage (Fix 6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRobustStorage.setItem.mockResolvedValue(true);
  });

  it('1. WORKOUT KEYS INCLUDED: fitness_goals_questionnaire_results migrated from nested format', async () => {
    const oldNestedFormat = {
      formData: {
        primaryGoal: 'build_muscle',
        trainingExperience: 'beginner',
        totalTrainingDays: 3,
        selectedEquipment: ['dumbbells']
      },
      completedAt: '2024-01-01T00:00:00.000Z'
    };

    // Set up old nested data
    mockRobustStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'fitness_goals_questionnaire_results') {
        return JSON.stringify(oldNestedFormat);
      }
      return null;
    });

    await runMigrations();

    // Verify migration was attempted for workout questionnaire key
    const setCalls = mockRobustStorage.setItem.mock.calls.filter(
      call => call[0] === 'fitness_goals_questionnaire_results'
    );
    
    expect(setCalls.length).toBeGreaterThan(0);
    
    // Verify data was flattened
    const flattenedData = JSON.parse(setCalls[0][1]);
    expect(flattenedData.formData).toBeUndefined();
    expect(flattenedData.primaryGoal).toBe('build_muscle');
    expect(flattenedData.trainingExperience).toBe('beginner');
    expect(flattenedData.completedAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('2. EQUIPMENT KEYS INCLUDED: equipment_preferences_questionnaire_results migrated', async () => {
    const oldNestedEquipment = {
      formData: {
        selectedEquipment: ['barbell', 'bench'],
        gymAccess: true,
        homeSetup: false
      },
      completedAt: '2024-01-01T00:00:00.000Z'
    };

    mockRobustStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'equipment_preferences_questionnaire_results') {
        return JSON.stringify(oldNestedEquipment);
      }
      return null;
    });

    await runMigrations();

    // Verify equipment preferences were migrated
    const setCalls = mockRobustStorage.setItem.mock.calls.filter(
      call => call[0] === 'equipment_preferences_questionnaire_results'
    );
    
    expect(setCalls.length).toBeGreaterThan(0);
    
    const flattenedData = JSON.parse(setCalls[0][1]);
    expect(flattenedData.formData).toBeUndefined();
    expect(flattenedData.selectedEquipment).toEqual(['barbell', 'bench']);
    expect(flattenedData.gymAccess).toBe(true);
  });

  it('3. ALL DOMAINS COVERED: migration processes all 6 questionnaire domains', async () => {
    const expectedDomains = [
      'nutrition_questionnaire_results',
      'budget_cooking_questionnaire_results',
      'fridge_pantry_questionnaire_results',
      'sleep_optimization_results',
      'fitness_goals_questionnaire_results',
      'equipment_preferences_questionnaire_results'
    ];

    // Mock each domain with old nested format
    mockRobustStorage.getItem.mockImplementation(async (key: string) => {
      if (expectedDomains.includes(key)) {
        return JSON.stringify({
          formData: { someField: 'value' },
          completedAt: '2024-01-01T00:00:00.000Z'
        });
      }
      return null;
    });

    await runMigrations();

    // Verify all domains were processed
    for (const domain of expectedDomains) {
      const domainCalls = mockRobustStorage.getItem.mock.calls.filter(
        call => call[0] === domain
      );
      expect(domainCalls.length).toBeGreaterThan(0);
    }
  });

  it('4. FLAT FORMAT PRESERVED: already flat data is not corrupted', async () => {
    const alreadyFlatData = {
      primaryGoal: 'gain_strength',
      trainingExperience: 'intermediate',
      completedAt: '2024-01-01T00:00:00.000Z',
      // No formData property - already flat
    };

    mockRobustStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'fitness_goals_questionnaire_results') {
        return JSON.stringify(alreadyFlatData);
      }
      return null;
    });

    await runMigrations();

    // Should not attempt to migrate flat data
    const setCalls = mockRobustStorage.setItem.mock.calls.filter(
      call => call[0] === 'fitness_goals_questionnaire_results'
    );

    // Should be 0 or if called, data should be unchanged
    if (setCalls.length > 0) {
      const savedData = JSON.parse(setCalls[0][1]);
      expect(savedData.primaryGoal).toBe('gain_strength');
      expect(savedData.formData).toBeUndefined();
    }
  });

  it('5. NUTRITION DRAFT EXCLUDED: @nutrition_questionnaire_answers not in migration list', async () => {
    // The draft key should NOT be migrated since it uses AsyncStorage, not RobustStorage
    const draftKey = '@nutrition_questionnaire_answers';
    
    await runMigrations();

    // Verify draft key was not processed
    const draftCalls = mockRobustStorage.getItem.mock.calls.filter(
      call => call[0] === draftKey
    );
    
    expect(draftCalls).toHaveLength(0);
  });

  it('6. BACKUP RECOVERY: migration creates backups for workout questionnaire keys', async () => {
    const workoutData = {
      formData: {
        primaryGoal: 'body_recomposition',
        totalTrainingDays: 5
      },
      completedAt: '2024-01-01T00:00:00.000Z'
    };

    mockRobustStorage.getItem.mockResolvedValue(JSON.stringify(workoutData));

    await runMigrations();

    // Verify backup was created (backup keys start with 'backup_')
    const backupCalls = mockRobustStorage.setItem.mock.calls.filter(
      call => call[0].startsWith('backup_')
    );
    
    expect(backupCalls.length).toBeGreaterThan(0);
  });
});