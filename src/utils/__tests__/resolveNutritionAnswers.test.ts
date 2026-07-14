/**
 * resolveNutritionAnswers() — the reader every post-questionnaire screen uses.
 *
 * finalizeNutrition() clears the draft on purpose (see nutritionDraftLifecycle),
 * so a reader that only looks at the draft sees {} for every user who has
 * actually completed the questionnaire. That is what left NutritionSummary
 * showing "No saved questionnaire" and the meal-plan prompt with none of the
 * user's answers in it. These cover the four states the reader has to handle.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveNutritionAnswers } from '../nutritionQuestionnaireStorage';
import { WorkoutStorage } from '../storage';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../storage');

const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const mockLoadNutritionResults = WorkoutStorage.loadNutritionResults as jest.MockedFunction<
  typeof WorkoutStorage.loadNutritionResults
>;
const mockLoadBudgetCookingResults = WorkoutStorage.loadBudgetCookingResults as jest.MockedFunction<
  typeof WorkoutStorage.loadBudgetCookingResults
>;

// What finalizeNutrition() writes today.
const results = (over: any = {}) =>
  ({
    formData: {
      goal: 'lose_weight',
      rate: '0.6',
      gender: 'male',
      age: '30',
      height: '180',
      weight: '80',
      activityLevel: 'moderate',
      jobType: 'desk_job',
      dietType: 'high_protein',
      targetRatePercentage: 0.75,
      ...over,
    },
    macroResults: { protein: 157, carbs: 210, fat: 70, calories: 2099, bmr: 1780, tdee: 2760 },
    completedAt: '2026-07-14T00:00:00.000Z',
  }) as any;

const budget = (over: any = {}) =>
  ({
    formData: {
      weeklyBudget: 'quality_first',
      country: 'Australia',
      countryCode: 'AU',
      city: '',
      groceryStore: 'Woolworths',
      planningStyle: 3,
      cookingEnjoyment: 3,
      timeInvestment: 30,
      varietySeeking: 3,
      skillConfidence: 3,
      mealsPerDay: 4,
      snackingStyle: 'planned',
      snackFrequency: '1',
      mealVariety: 'variety',
      eatingChallenges: [],
      allergies: ['Dairy'],
      avoidFoods: [],
      ...over,
    },
    completedAt: '2026-07-14T00:00:00.000Z',
  }) as any;

describe('resolveNutritionAnswers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when the user has no questionnaire at all', async () => {
    mockGetItem.mockResolvedValue(null);
    mockLoadNutritionResults.mockResolvedValue(null as any);

    expect(await resolveNutritionAnswers()).toBeNull();
  });

  it('returns the draft mid-questionnaire, before any results exist', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ goal: 'gain_weight', age: 22 }));
    mockLoadNutritionResults.mockResolvedValue(null as any);

    const a = await resolveNutritionAnswers();

    expect(a).toMatchObject({ goal: 'gain_weight', age: 22 });
  });

  it('rebuilds the answers from the finalized results once the draft is cleared', async () => {
    mockGetItem.mockResolvedValue(null); // finalizeNutrition() cleared it
    mockLoadNutritionResults.mockResolvedValue(results());
    mockLoadBudgetCookingResults.mockResolvedValue(budget());

    const a = await resolveNutritionAnswers();

    expect(a).toMatchObject({
      goal: 'lose_weight',
      targetRatePercentage: 0.75,
      age: 30,
      gender: 'male',
      height: 180,
      weight: 80,
      activityLevel: 'moderate',
      dietType: 'high_protein',
      mealsPerDay: 4,
      mealVariety: 'variety',
      groceryStore: 'Woolworths',
      country: 'Australia',
      allergies: ['Dairy'],
    });
  });

  it('overlays the draft on the results, so editing one row keeps the rest', async () => {
    // An edit row (N5bAllergies in editMode) writes its single field straight
    // back to the cleared draft. Everything else must still come from results.
    mockGetItem.mockResolvedValue(JSON.stringify({ allergies: ['Nuts'] }));
    mockLoadNutritionResults.mockResolvedValue(results());
    mockLoadBudgetCookingResults.mockResolvedValue(budget());

    const a = await resolveNutritionAnswers();

    expect(a!.allergies).toEqual(['Nuts']); // the edit wins
    expect(a!.dietType).toBe('high_protein'); // the rest survives
    expect(a!.mealsPerDay).toBe(4);
    expect(a!.goal).toBe('lose_weight');
  });

  it('recovers the rate from a record finalized before targetRatePercentage was persisted', async () => {
    // Users already on the live iOS build have results without these fields.
    // rate is kg/week = weight x pct / 100, so the pct is recoverable.
    mockGetItem.mockResolvedValue(null);
    mockLoadNutritionResults.mockResolvedValue(
      results({ targetRatePercentage: undefined, dietType: undefined, rate: '0.6' })
    );
    mockLoadBudgetCookingResults.mockResolvedValue(budget({ mealVariety: undefined }));

    const a = await resolveNutritionAnswers();

    expect(a!.targetRatePercentage).toBe(0.75); // 0.6kg / 80kg = 0.75%
    expect(a!.goal).toBe('lose_weight'); // still renders, no empty state
    expect(a!.dietType).toBeUndefined(); // genuinely unrecoverable; row shows "—"
  });
});
