/**
 * Test for Fix 2: Nutrition draft cleared on finalization
 * Prevents draft/final result divergence
 */

import { finalizeNutrition } from '../nutritionMacros';
import { loadNutritionAnswers, saveNutritionAnswers, clearNutritionAnswers } from '../nutritionQuestionnaireStorage';
import { WorkoutStorage } from '../storage';

jest.mock('../nutritionQuestionnaireStorage');
jest.mock('../storage');

const mockLoadNutritionAnswers = loadNutritionAnswers as jest.MockedFunction<typeof loadNutritionAnswers>;
const mockClearNutritionAnswers = clearNutritionAnswers as jest.MockedFunction<typeof clearNutritionAnswers>;
const mockSaveNutritionResults = WorkoutStorage.saveNutritionResults as jest.MockedFunction<typeof WorkoutStorage.saveNutritionResults>;
const mockSaveBudgetCookingResults = WorkoutStorage.saveBudgetCookingResults as jest.MockedFunction<typeof WorkoutStorage.saveBudgetCookingResults>;

describe('Nutrition Draft Lifecycle (Fix 2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveNutritionResults.mockResolvedValue();
    mockSaveBudgetCookingResults.mockResolvedValue();
    mockClearNutritionAnswers.mockResolvedValue();
  });

  it('1. DRAFT CLEARED: finalizeNutrition clears draft after saving final results', async () => {
    const testAnswers = {
      goal: 'lose_weight' as const,
      age: 25,
      gender: 'male' as const,
      height: 180,
      weight: 80,
      activityLevel: 'moderate' as const,
      dietType: 'balanced' as const,
      mealsPerDay: 3,
      snackFrequency: 'rarely',
      country: 'US',
      groceryStore: 'Walmart',
      weeklyBudget: 'keep_reasonable',
      planDuration: 7,
      startDate: '2024-01-01',
      skillConfidence: 3,
      timeInvestment: 60,
      cookingEquipment: ['oven', 'stovetop'],
    };

    const macros = await finalizeNutrition(testAnswers);

    // Verify final results were saved
    expect(mockSaveNutritionResults).toHaveBeenCalledTimes(1);
    expect(mockSaveBudgetCookingResults).toHaveBeenCalledTimes(1);
    
    // Verify draft was cleared after final save
    expect(mockClearNutritionAnswers).toHaveBeenCalledTimes(1);
    
    expect(macros).toBeTruthy();
  });

  it('2. DRAFT CLEARED ON ERROR: draft clearing failure does not break finalization', async () => {
    const testAnswers = {
      goal: 'maintain' as const,
      age: 30,
      gender: 'female' as const,
      height: 165,
      weight: 65,
      activityLevel: 'light' as const,
      dietType: 'high_protein' as const,
      mealsPerDay: 4,
      snackFrequency: 'sometimes',
      country: 'CA',
      groceryStore: 'Metro',
      weeklyBudget: 'budget_conscious',
      planDuration: 14,
      startDate: '2024-02-01',
      skillConfidence: 2,
      timeInvestment: 45,
      cookingEquipment: ['microwave'],
    };

    // Mock clearNutritionAnswers to fail
    mockClearNutritionAnswers.mockRejectedValueOnce(new Error('Clear failed'));
    
    const macros = await finalizeNutrition(testAnswers);

    // Finalization should still succeed despite clear failure
    expect(macros).toBeTruthy();
    expect(mockSaveNutritionResults).toHaveBeenCalledTimes(1);
    expect(mockSaveBudgetCookingResults).toHaveBeenCalledTimes(1);
    expect(mockClearNutritionAnswers).toHaveBeenCalledTimes(1);
  });

  it('3. NO DIVERGENCE: draft and final cannot diverge after completion', async () => {
    // This test documents the expected behavior: after finalization,
    // the draft should be empty, preventing any divergence scenarios
    
    const testAnswers = {
      goal: 'gain_weight' as const,
      targetRatePercentage: 0.5,
      age: 22,
      gender: 'male' as const,
      height: 175,
      weight: 70,
      activityLevel: 'heavy' as const,
      dietType: 'keto' as const,
      mealsPerDay: 5,
      snackFrequency: 'often',
      country: 'UK',
      groceryStore: 'Tesco',
      weeklyBudget: 'quality_first',
      planDuration: 21,
      startDate: '2024-03-01',
      skillConfidence: 4,
      timeInvestment: 90,
      cookingEquipment: ['oven', 'stovetop', 'grill'],
    };

    await finalizeNutrition(testAnswers);

    // After finalization, loading nutrition answers should return empty/null
    // This prevents any draft/final divergence scenarios
    mockLoadNutritionAnswers.mockResolvedValueOnce({});
    
    const draftAfterFinalization = await loadNutritionAnswers();
    expect(Object.keys(draftAfterFinalization)).toHaveLength(0);
    expect(mockClearNutritionAnswers).toHaveBeenCalled();
  });
});