/**
 * Questionnaire Shape Migration Tests (Migration #2)
 * 
 * Tests the questionnaire data structure migration from old nested format
 * { formData: {...}, macroResults: {...} } to new flat format { goal, age, ... }
 */

import RobustStorage from '../robustStorage';
import { runMigrations, getMigrationStatus, resetMigrationState, SCHEMA_VERSION } from '../migrationFramework';

// Mock old-format questionnaire data
const createOldFormatNutritionData = () => ({
  formData: {
    goal: 'lose_weight',
    rate: '1',
    gender: 'female',
    age: '28',
    height: '165',
    weight: '70',
    heightUnit: 'cm',
    weightUnit: 'kg',
    activityLevel: 'moderate',
    jobType: 'desk_job'
  },
  macroResults: {
    protein: 140,
    carbs: 150,
    fat: 60,
    calories: 1680,
    bmr: 1420,
    tdee: 1960,
    weeklyWeightChange: -0.5
  },
  completedAt: '2026-01-01T12:00:00.000Z'
});

const createOldFormatBudgetCookingData = () => ({
  formData: {
    weeklyBudget: '100-150',
    country: 'United States',
    countryCode: 'US',
    city: 'San Francisco',
    groceryStore: 'Whole Foods',
    planningStyle: 7,
    cookingEnjoyment: 8,
    timeInvestment: 6,
    varietySeeking: 9,
    skillConfidence: 7,
    mealsPerDay: 3,
    snackingStyle: 'light_snacks',
    snackFrequency: 'sometimes',
    dessertFrequency: 'few_per_week',
    budgetMin: 100,
    budgetMax: 150,
    planDuration: 7,
    startDate: '2026-01-07',
    cookingEquipment: ['oven', 'stovetop', 'microwave'],
    eatingChallenges: ['time_constraints'],
    allergies: [],
    avoidFoods: ['shellfish']
  },
  completedAt: '2026-01-02T14:00:00.000Z'
});

describe('Questionnaire Shape Migration (Migration #2)', () => {

  beforeEach(async () => {
    // Reset migration state for clean tests
    await resetMigrationState();
  });

  // Test 1: Old nested format → New flat format
  it('1. OLD→NEW FORMAT: migrates nested formData to flat structure', async () => {
    const oldNutritionData = createOldFormatNutritionData();
    const oldBudgetData = createOldFormatBudgetCookingData();
    
    // Set up old-format data
    await RobustStorage.setItem('nutrition_questionnaire_results', JSON.stringify(oldNutritionData), true);
    await RobustStorage.setItem('budget_cooking_questionnaire_results', JSON.stringify(oldBudgetData), true);
    
    // Verify old format is in place
    const preNutrition = await RobustStorage.getItem('nutrition_questionnaire_results', true);
    const preBudget = await RobustStorage.getItem('budget_cooking_questionnaire_results', true);
    
    expect(JSON.parse(preNutrition!).formData).toBeDefined();
    expect(JSON.parse(preBudget!).formData).toBeDefined();
    
    // Run migrations
    await runMigrations();
    
    // Verify data was migrated to flat format
    const postNutrition = JSON.parse(await RobustStorage.getItem('nutrition_questionnaire_results', true)!);
    const postBudget = JSON.parse(await RobustStorage.getItem('budget_cooking_questionnaire_results', true)!);
    
    // Should no longer have nested formData
    expect(postNutrition.formData).toBeUndefined();
    expect(postBudget.formData).toBeUndefined();
    
    // Should have flat structure with original formData fields at top level
    expect(postNutrition.goal).toBe('lose_weight');
    expect(postNutrition.age).toBe('28');
    expect(postNutrition.gender).toBe('female');
    expect(postNutrition.activityLevel).toBe('moderate');
    
    expect(postBudget.weeklyBudget).toBe('100-150');
    expect(postBudget.country).toBe('United States');
    expect(postBudget.skillConfidence).toBe(7);
    expect(postBudget.cookingEquipment).toEqual(['oven', 'stovetop', 'microwave']);
    
    // Should preserve macroResults and completedAt
    expect(postNutrition.macroResults).toEqual(oldNutritionData.macroResults);
    expect(postNutrition.completedAt).toBe(oldNutritionData.completedAt);
    expect(postBudget.completedAt).toBe(oldBudgetData.completedAt);
    
    // Should add migration markers
    expect(postNutrition._migratedAt).toBeDefined();
    expect(postNutrition._migrationVersion).toBe(2);
    expect(postBudget._migratedAt).toBeDefined();
    expect(postBudget._migrationVersion).toBe(2);
  });

  // Test 2: Already flat format should not be touched
  it('2. FLAT FORMAT SKIP: already flat format data is left unchanged', async () => {
    const flatFormatData = {
      goal: 'maintain',
      age: 25,
      height: 170,
      weight: 65,
      activityLevel: 'light',
      completedAt: '2026-01-03T10:00:00.000Z',
      existingField: 'should_be_preserved'
    };
    
    // Set up flat-format data
    await RobustStorage.setItem('nutrition_questionnaire_results', JSON.stringify(flatFormatData), true);
    
    // Run migrations
    await runMigrations();
    
    // Verify data is unchanged
    const postData = JSON.parse(await RobustStorage.getItem('nutrition_questionnaire_results', true)!);
    
    expect(postData.goal).toBe('maintain');
    expect(postData.age).toBe(25);
    expect(postData.existingField).toBe('should_be_preserved');
    expect(postData.completedAt).toBe(flatFormatData.completedAt);
    
    // Should NOT add migration markers since no migration was needed
    expect(postData._migratedAt).toBeUndefined();
    expect(postData._migrationVersion).toBeUndefined();
  });

  // Test 3: Empty/null data should be skipped
  it('3. EMPTY DATA SKIP: handles empty or missing questionnaire data', async () => {
    // Don't set any data - all domains should be empty
    
    // Run migrations
    await runMigrations();
    
    // Verify no errors and no data created
    const nutritionData = await RobustStorage.getItem('nutrition_questionnaire_results', true);
    const budgetData = await RobustStorage.getItem('budget_cooking_questionnaire_results', true);
    const fridgeData = await RobustStorage.getItem('fridge_pantry_questionnaire_results', true);
    const sleepData = await RobustStorage.getItem('sleep_optimization_results', true);
    
    expect(nutritionData).toBeNull();
    expect(budgetData).toBeNull();
    expect(fridgeData).toBeNull();
    expect(sleepData).toBeNull();
  });

  // Test 4: Invalid JSON should be skipped gracefully
  it('4. INVALID JSON SKIP: handles corrupted questionnaire data gracefully', async () => {
    // Set up invalid JSON data
    await RobustStorage.setItem('nutrition_questionnaire_results', '{"invalid": json}', true);
    await RobustStorage.setItem('budget_cooking_questionnaire_results', 'not even json', true);
    
    // Run migrations - should not throw
    await expect(runMigrations()).resolves.not.toThrow();
    
    // Verify corrupted data is left as-is
    const nutritionData = await RobustStorage.getItem('nutrition_questionnaire_results', true);
    const budgetData = await RobustStorage.getItem('budget_cooking_questionnaire_results', true);
    
    expect(nutritionData).toBe('{"invalid": json}');
    expect(budgetData).toBe('not even json');
  });

  // Test 5: All questionnaire domains are processed
  it('5. ALL DOMAINS: processes all questionnaire storage domains', async () => {
    const oldFormatTemplate = {
      formData: {
        testField: 'test_value',
        anotherField: 42
      },
      completedAt: '2026-01-01T12:00:00.000Z'
    };
    
    // Set up old-format data in all questionnaire domains
    const domains = [
      'nutrition_questionnaire_results',
      'budget_cooking_questionnaire_results',
      'fridge_pantry_questionnaire_results', 
      'sleep_optimization_results'
    ];
    
    for (const domain of domains) {
      await RobustStorage.setItem(domain, JSON.stringify({
        ...oldFormatTemplate,
        formData: { ...oldFormatTemplate.formData, domain: domain }
      }), true);
    }
    
    // Run migrations
    await runMigrations();
    
    // Verify all domains were migrated to flat format
    for (const domain of domains) {
      const data = JSON.parse(await RobustStorage.getItem(domain, true)!);
      
      expect(data.formData).toBeUndefined();
      expect(data.testField).toBe('test_value');
      expect(data.anotherField).toBe(42);
      expect(data.domain).toBe(domain);
      expect(data.completedAt).toBe(oldFormatTemplate.completedAt);
      expect(data._migrationVersion).toBe(2);
    }
  });

  // Test 6: Migration failure recovery
  it('6. FAILURE RECOVERY: migration failure restores from backup', async () => {
    const oldData = createOldFormatNutritionData();
    await RobustStorage.setItem('nutrition_questionnaire_results', JSON.stringify(oldData), true);
    
    // Mock RobustStorage.setItem to fail during migration
    const originalSetItem = RobustStorage.setItem;
    let setItemCallCount = 0;
    
    RobustStorage.setItem = jest.fn().mockImplementation(async (key, value, critical) => {
      setItemCallCount++;
      if (setItemCallCount >= 2 && key === 'nutrition_questionnaire_results') {
        // Fail on the migration save attempt (but not the backup creation)
        throw new Error('Simulated migration save failure');
      }
      return originalSetItem.call(RobustStorage, key, value, critical);
    });
    
    // Run migrations - should fail and restore
    await expect(runMigrations()).rejects.toThrow('Simulated migration save failure');
    
    // Restore original function
    RobustStorage.setItem = originalSetItem;
    
    // Verify data was restored to original state
    const restoredData = JSON.parse(await RobustStorage.getItem('nutrition_questionnaire_results', true)!);
    expect(restoredData).toEqual(oldData);
    expect(restoredData.formData).toBeDefined(); // Should still be in old format
  });

  // Test 7: Schema version tracking
  it('7. VERSION TRACKING: updates schema version after questionnaire migration', async () => {
    // Check initial schema version (should be less than current)
    const statusBefore = await getMigrationStatus();
    expect(statusBefore.current.schemaVersion).toBeLessThan(SCHEMA_VERSION);
    
    // Set up some old-format data to trigger migration
    const oldData = createOldFormatNutritionData();
    await RobustStorage.setItem('nutrition_questionnaire_results', JSON.stringify(oldData), true);
    
    // Run migrations
    await runMigrations();
    
    // Verify schema version was updated
    const statusAfter = await getMigrationStatus();
    expect(statusAfter.current.schemaVersion).toBe(SCHEMA_VERSION);
    expect(statusAfter.pendingMigrations).toHaveLength(0);
  });
});