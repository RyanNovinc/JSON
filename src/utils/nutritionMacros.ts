// src/utils/nutritionMacros.ts
//
// Macro computation + finalize step for the nutrition questionnaire.
//
// This is a NEW, self-contained copy of the Mifflin-St Jeor / TDEE math
// used by the new questionnaire flow. It deliberately does NOT touch the
// existing copies in NutritionQuestionnaireScreen, NutritionStep4, or
// WeightTracker — those keep working untouched.
//
// `finalizeNutrition` is the bridge to the prompt builder: it computes
// the macros from the collected answers and writes the two storage keys
// `assembleMealPlanningPrompt` requires —
//   - nutrition_questionnaire_results  ({ formData, macroResults })
//   - budget_cooking_questionnaire_results  ({ formData })
// — in exactly the shapes the builder reads. The save* methods on
// WorkoutStorage also flip the matching NutritionCompletionStatus flags.

import { WorkoutStorage } from './storage';
import type { NutritionAnswers } from './nutritionQuestionnaireStorage';

export interface MacroResults {
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  heavy: 1.725,
  extreme: 1.9,
};

// protein / carbs / fat as % of calories
const DIET_SPLITS: Record<string, { p: number; c: number; f: number }> = {
  balanced: { p: 20, c: 50, f: 30 },
  high_protein: { p: 30, c: 40, f: 30 },
  low_carb: { p: 25, c: 25, f: 50 },
  keto: { p: 20, c: 5, f: 75 },
};

// kg of body mass change per week → daily calorie delta (~7700 kcal/kg).
function dailyDelta(targetRateKgPerWeek: number): number {
  return (targetRateKgPerWeek * 7700) / 7;
}

export function computeMacros(a: NutritionAnswers): MacroResults | null {
  const { gender, age, height, weight, activityLevel, goal } = a;
  if (!gender || !age || !height || !weight || !activityLevel) return null;

  // Mifflin-St Jeor BMR
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else if (gender === 'female') {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    const male = 10 * weight + 6.25 * height - 5 * age + 5;
    const female = 10 * weight + 6.25 * height - 5 * age - 161;
    bmr = (male + female) / 2;
  }

  const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55));

  const targetRate = (weight * (a.targetRatePercentage ?? 0)) / 100; // kg/week
  let calories = tdee;
  if (goal === 'lose_weight') calories = Math.round(tdee - dailyDelta(targetRate));
  else if (goal === 'gain_weight') calories = Math.round(tdee + dailyDelta(targetRate));

  const split =
    a.dietType === 'custom' && a.customMacros
      ? { p: a.customMacros.protein, c: a.customMacros.carbs, f: a.customMacros.fat }
      : DIET_SPLITS[a.dietType ?? 'balanced'] ?? DIET_SPLITS.balanced;

  const protein = Math.round((calories * split.p) / 100 / 4);
  const carbs = Math.round((calories * split.c) / 100 / 4);
  const fat = Math.round((calories - protein * 4 - carbs * 4) / 9);

  return { bmr: Math.round(bmr), tdee, calories, protein, carbs, fat };
}

// kg/week target derived from % bodyweight, rounded for display/storage.
export function computeTargetRate(a: NutritionAnswers): number {
  return Number(
    (((a.weight ?? 0) * (a.targetRatePercentage ?? 0)) / 100).toFixed(2)
  );
}

// Compute macros AND persist the two keys the prompt builder reads.
// Returns the macros (or null if required inputs are missing).
export async function finalizeNutrition(
  a: NutritionAnswers
): Promise<MacroResults | null> {
  const macros = computeMacros(a);
  if (!macros) return null;

  const now = new Date().toISOString();
  const targetRate = computeTargetRate(a);

  const nutritionResults = {
    formData: {
      goal: a.goal,
      // builder parseFloat()s this; maintain → null so it shows a sane default
      rate: a.goal === 'maintain' ? null : targetRate,
      gender: a.gender,
      age: a.age,
      height: a.height,
      weight: a.weight,
      activityLevel: a.activityLevel,
      dietType: a.dietType,
      jobType: 'desk_job', // not collected in this flow; builder default
    },
    macroResults: {
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      bmr: macros.bmr,
      tdee: macros.tdee,
    },
    completedAt: now,
  };

  const budgetCookingResults = {
    formData: {
      mealsPerDay: a.mealsPerDay,
      snackingStyle: a.snackingStyle,
      snackFrequency: a.snackFrequency,
      dessertFrequency: a.dessertFrequency,
      country: a.country,
      city: a.city,
      countryCode: a.countryCode,
      groceryStore: a.groceryStore,
      weeklyBudget: a.weeklyBudget,
      budgetMin: a.budgetMin,
      budgetMax: a.budgetMax,
      planDuration: a.planDuration,
      startDate: a.startDate,
      skillConfidence: a.skillConfidence,
      timeInvestment: a.timeInvestment,
      planningStyle: a.planningStyle ?? 3, // batch/leftover preference; builder default is 3
      cookingEquipment: a.cookingEquipment ?? [],
      allergies: a.allergies ?? [],
      avoidFoods: a.avoidFoods ?? [],
      eatingChallenges: a.eatingChallenges ?? [],
    },
    completedAt: now,
  };

  await WorkoutStorage.saveNutritionResults(nutritionResults);
  await WorkoutStorage.saveBudgetCookingResults(budgetCookingResults);

  return macros;
}