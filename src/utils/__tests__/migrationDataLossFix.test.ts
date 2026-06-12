/**
 * CRITICAL TEST: Migration Data Loss Fix
 * Tests REAL old-shape data preservation across migration transforms
 */

import { runMigrations, resetMigrationState } from '../migrationFramework';
import RobustStorage from '../robustStorage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

// Real RobustStorage behavior simulation
const mockStorage = new Map<string, string>();
const mockTombstones = new Set<string>();

const mockRobustStorage = {
  setItem: jest.fn(async (key: string, value: string, critical?: boolean) => {
    mockTombstones.delete(key);
    mockStorage.set(key, value);
    if (critical) {
      mockStorage.set(`${key}_backup`, value);
      mockStorage.set(`${key}_emergency`, value);
    }
    return true;
  }),
  
  getItem: jest.fn(async (key: string, critical?: boolean) => {
    if (mockTombstones.has(key)) {
      return null;
    }
    return mockStorage.get(key) || null;
  }),
  
  removeItem: jest.fn(async (key: string, critical?: boolean, useTombstone: boolean = true) => {
    if (critical) {
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

jest.doMock('../robustStorage', () => mockRobustStorage);

describe('Migration Data Loss Fix', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockStorage.clear();
    mockTombstones.clear();
    
    (RobustStorage.setItem as jest.Mock) = mockRobustStorage.setItem;
    (RobustStorage.getItem as jest.Mock) = mockRobustStorage.getItem;
    (RobustStorage.removeItem as jest.Mock) = mockRobustStorage.removeItem;
    
    await resetMigrationState();
  });

  it('NUTRITION REAL OLD SHAPE: preserves all top-level fields', async () => {
    // REAL old-shape nutrition data (from nutritionMacros.ts:120-127)
    const realOldNutritionData = {
      formData: {
        goal: 'build_muscle',
        rate: '0.5', 
        gender: 'male',
        age: '30',
        height: '180',
        heightUnit: 'cm',
        weight: '80',
        weightUnit: 'kg',
        activityLevel: 'moderately_active',
        weeklyWeightChange: '0.5'
      },
      macroResults: {
        calories: 2800,
        protein: 140,
        carbs: 350,
        fat: 93
      },
      completedAt: '2024-01-15T10:30:00Z',
      // Extra fields that should be preserved
      userId: 'user_12345',
      sessionId: 'session_abc',
      appVersion: '1.2.3'
    };

    await mockRobustStorage.setItem('nutrition_questionnaire_results', JSON.stringify(realOldNutritionData), true);
    await runMigrations();
    
    const migratedDataStr = await mockRobustStorage.getItem('nutrition_questionnaire_results', true);
    const migratedData = JSON.parse(migratedDataStr!);
    
    // Verify formData fields moved to top level
    expect(migratedData.goal).toBe('build_muscle');
    expect(migratedData.rate).toBe('0.5');
    expect(migratedData.gender).toBe('male');
    expect(migratedData.height).toBe('180');
    expect(migratedData.activityLevel).toBe('moderately_active');
    
    // Verify special fields preserved
    expect(migratedData.macroResults).toEqual({
      calories: 2800, protein: 140, carbs: 350, fat: 93
    });
    expect(migratedData.completedAt).toBe('2024-01-15T10:30:00Z');
    
    // CRITICAL: Verify arbitrary top-level fields are preserved
    expect(migratedData.userId).toBe('user_12345');
    expect(migratedData.sessionId).toBe('session_abc');
    expect(migratedData.appVersion).toBe('1.2.3');
    
    // Verify formData wrapper removed
    expect(migratedData.formData).toBeUndefined();
    
    // Verify migration markers added
    expect(migratedData._migrationVersion).toBe(2);
    expect(migratedData._migratedAt).toBeTruthy();
  });

  it('BUDGET COOKING REAL OLD SHAPE: preserves all top-level fields', async () => {
    // REAL old-shape budget cooking data (from nutritionMacros.ts:130-156)
    const realOldBudgetData = {
      formData: {
        weeklyBudget: '100',
        country: 'United States',
        countryCode: 'US',
        city: 'San Francisco',
        groceryStore: 'Whole Foods',
        planningStyle: 3,
        cookingEnjoyment: 3,
        timeInvestment: 60,
        varietySeeking: 3,
        skillConfidence: 3,
        mealsPerDay: 3,
        snackingStyle: 'healthy_snacks',
        snackFrequency: 2,
        dessertFrequency: 'few_per_week',
        budgetMin: 80,
        budgetMax: 120,
        planDuration: 7,
        startDate: '2024-01-15',
        cookingEquipment: ['oven', 'stovetop', 'microwave'],
        eatingChallenges: ['time_constraints'],
        allergies: ['nuts'],
        avoidFoods: ['shellfish']
      },
      completedAt: '2024-01-15T10:30:00Z',
      // Extra fields that should be preserved
      regionalSettings: { timezone: 'PST', currency: 'USD' },
      userPreferences: { notifications: true },
      debugInfo: 'migration_test'
    };

    await mockRobustStorage.setItem('budget_cooking_questionnaire_results', JSON.stringify(realOldBudgetData), true);
    await runMigrations();
    
    const migratedDataStr = await mockRobustStorage.getItem('budget_cooking_questionnaire_results', true);
    const migratedData = JSON.parse(migratedDataStr!);
    
    // Verify formData fields moved to top level
    expect(migratedData.weeklyBudget).toBe('100');
    expect(migratedData.country).toBe('United States');
    expect(migratedData.planningStyle).toBe(3);
    expect(migratedData.cookingEquipment).toEqual(['oven', 'stovetop', 'microwave']);
    expect(migratedData.allergies).toEqual(['nuts']);
    
    // Verify completion timestamp preserved
    expect(migratedData.completedAt).toBe('2024-01-15T10:30:00Z');
    
    // CRITICAL: Verify complex nested fields are preserved
    expect(migratedData.regionalSettings).toEqual({ timezone: 'PST', currency: 'USD' });
    expect(migratedData.userPreferences).toEqual({ notifications: true });
    expect(migratedData.debugInfo).toBe('migration_test');
    
    // Verify formData wrapper removed
    expect(migratedData.formData).toBeUndefined();
    expect(migratedData._migrationVersion).toBe(2);
  });

  it('FITNESS GOALS HYBRID CASE: handles workout data with extra fields', async () => {
    // Hypothetical old-shape fitness goals data (if it was ever nested)
    const hybridFitnessData = {
      formData: {
        primaryGoal: 'build_muscle',
        totalTrainingDays: '4',
        gymTrainingDays: '3',
        otherTrainingDays: '1',
        priorityMuscleGroups: ['chest', 'back'],
        trainingExperience: 'intermediate'
      },
      completedAt: '2024-01-15T10:30:00Z',
      // Additional metadata that should be preserved
      deviceInfo: { platform: 'iOS', version: '17.2' },
      surveyVersion: 'v2.1',
      referralSource: 'friend_recommendation'
    };

    await mockRobustStorage.setItem('fitness_goals_questionnaire_results', JSON.stringify(hybridFitnessData), true);
    await runMigrations();
    
    const migratedDataStr = await mockRobustStorage.getItem('fitness_goals_questionnaire_results', true);
    const migratedData = JSON.parse(migratedDataStr!);
    
    // Verify core workout fields
    expect(migratedData.primaryGoal).toBe('build_muscle');
    expect(migratedData.totalTrainingDays).toBe('4');
    expect(migratedData.priorityMuscleGroups).toEqual(['chest', 'back']);
    
    // CRITICAL: Verify metadata preservation
    expect(migratedData.deviceInfo).toEqual({ platform: 'iOS', version: '17.2' });
    expect(migratedData.surveyVersion).toBe('v2.1');
    expect(migratedData.referralSource).toBe('friend_recommendation');
    expect(migratedData.completedAt).toBe('2024-01-15T10:30:00Z');
  });

  it('EDGE CASE: handles deeply nested extra data', async () => {
    const complexOldData = {
      formData: {
        simpleField: 'value1',
        arrayField: ['a', 'b', 'c']
      },
      completedAt: '2024-01-15T10:30:00Z',
      // Complex nested structures
      userMetadata: {
        profile: {
          settings: {
            notifications: true,
            theme: 'dark'
          },
          stats: [1, 2, 3, 4, 5]
        },
        history: ['event1', 'event2']
      },
      experimentalFlags: {
        featureA: true,
        featureB: false,
        nestedConfig: {
          timeout: 5000,
          retries: 3
        }
      }
    };

    await mockRobustStorage.setItem('nutrition_questionnaire_results', JSON.stringify(complexOldData), true);
    await runMigrations();
    
    const migratedDataStr = await mockRobustStorage.getItem('nutrition_questionnaire_results', true);
    const migratedData = JSON.parse(migratedDataStr!);
    
    // Verify formData flattened
    expect(migratedData.simpleField).toBe('value1');
    expect(migratedData.arrayField).toEqual(['a', 'b', 'c']);
    
    // Verify complex nested structures fully preserved
    expect(migratedData.userMetadata).toEqual({
      profile: {
        settings: { notifications: true, theme: 'dark' },
        stats: [1, 2, 3, 4, 5]
      },
      history: ['event1', 'event2']
    });
    expect(migratedData.experimentalFlags).toEqual({
      featureA: true,
      featureB: false,
      nestedConfig: { timeout: 5000, retries: 3 }
    });
    
    expect(migratedData.formData).toBeUndefined();
  });

  it('BEFORE/AFTER COMPARISON: complete field inventory', async () => {
    const originalData = {
      formData: {
        field1: 'value1',
        field2: 42,
        field3: ['array', 'data']
      },
      macroResults: { calories: 2000 },
      completedAt: '2024-01-15T10:30:00Z',
      customField1: 'preserve_me',
      customField2: { nested: 'object' },
      customField3: [1, 2, 3],
      metadata: {
        version: '1.0',
        flags: { experimental: true }
      }
    };

    const originalKeys = Object.keys(originalData).sort();
    console.log('BEFORE migration keys:', originalKeys);
    
    await mockRobustStorage.setItem('nutrition_questionnaire_results', JSON.stringify(originalData), true);
    await runMigrations();
    
    const migratedDataStr = await mockRobustStorage.getItem('nutrition_questionnaire_results', true);
    const migratedData = JSON.parse(migratedDataStr!);
    const migratedKeys = Object.keys(migratedData).sort();
    console.log('AFTER migration keys:', migratedKeys);
    
    // Count original fields (excluding formData wrapper, plus its contents, plus migration markers)
    const expectedKeyCount = originalKeys.length - 1 + // remove formData wrapper
                            Object.keys(originalData.formData).length + // add formData contents
                            2; // add _migratedAt, _migrationVersion
    
    expect(migratedKeys).toHaveLength(expectedKeyCount);
    
    // Verify all original top-level fields preserved (except formData)
    expect(migratedData.macroResults).toEqual(originalData.macroResults);
    expect(migratedData.completedAt).toBe(originalData.completedAt);
    expect(migratedData.customField1).toBe(originalData.customField1);
    expect(migratedData.customField2).toEqual(originalData.customField2);
    expect(migratedData.customField3).toEqual(originalData.customField3);
    expect(migratedData.metadata).toEqual(originalData.metadata);
    
    // Verify formData contents moved to top level
    expect(migratedData.field1).toBe('value1');
    expect(migratedData.field2).toBe(42);
    expect(migratedData.field3).toEqual(['array', 'data']);
    
    // Verify migration markers added
    expect(migratedData._migrationVersion).toBe(2);
    expect(migratedData._migratedAt).toBeTruthy();
    
    // CRITICAL: Verify no data loss
    expect(migratedData.formData).toBeUndefined();
    console.log('✅ NO DATA LOSS: All', originalKeys.length - 1, 'original fields + 3 formData fields + 2 migration markers = ', migratedKeys.length, 'final fields');
  });
});