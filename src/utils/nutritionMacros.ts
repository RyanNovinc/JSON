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
import { clearNutritionAnswers } from './nutritionQuestionnaireStorage';
import type { NutritionAnswers } from './nutritionQuestionnaireStorage';
import { derivePhase } from './goalsProfile';
import type { GoalsProfile, DerivedPhase, TrainingState } from './goalsProfile';

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
  // computeMacros does not need `goal` (BMR/TDEE do not depend on it), so a
  // missing goal used to sail straight through and get persisted as
  // `String(a.goal || '')` = ''. That empty string is falsy, so the summary's
  // `!answers.goal` gate then rendered "No saved questionnaire" for a user who
  // had just answered everything, with nothing logged anywhere. Refuse instead:
  // callers already handle null by showing "Missing details".
  if (!a?.goal) {
    console.error(
      '[finalizeNutrition] refusing to persist: no goal in answers. ' +
        'Keys present:',
      a ? Object.keys(a).join(', ') : String(a)
    );
    return null;
  }

  const macros = computeMacros(a);
  if (!macros) return null;

  const now = new Date().toISOString();
  const targetRate = computeTargetRate(a);

  const nutritionResults: import('./storage').NutritionQuestionnaireResults = {
    formData: {
      goal: String(a.goal || ''),
      // builder parseFloat()s this; maintain → null so it shows a sane default
      rate: a.goal === 'maintain' ? '0' : String(targetRate),
      gender: String(a.gender || ''),
      age: String(a.age || ''),
      height: String(a.height || ''),
      weight: String(a.weight || ''),
      heightUnit: 'cm', // default unit
      weightUnit: 'kg', // default unit
      activityLevel: String(a.activityLevel || ''),
      jobType: 'desk_job', // not collected in this flow; builder default
      // These three used to be dropped here. The draft is cleared below, so
      // whatever isn't written here is gone for good — and the summary needs
      // all three to render (Diet, Rate) and to recompute macros for a
      // 'custom' split. See resolveNutritionAnswers().
      dietType: a.dietType,
      targetRatePercentage: a.targetRatePercentage,
      customMacros: a.customMacros,
    },
    macroResults: {
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      bmr: macros.bmr,
      tdee: macros.tdee,
      weeklyWeightChange: targetRate,
    },
    completedAt: now,
  };

  const budgetCookingResults: import('./storage').BudgetCookingQuestionnaireResults = {
    formData: {
      weeklyBudget: String(a.weeklyBudget || ''),
      country: String(a.country || ''),
      countryCode: String(a.countryCode || ''),
      city: String(a.city || ''),
      groceryStore: String(a.groceryStore || ''),
      planningStyle: Number(a.planningStyle ?? 3), // batch/leftover preference; builder default is 3
      cookingEnjoyment: 3, // default value since not collected in this flow
      timeInvestment: a.timeInvestment ?? 60,
      varietySeeking: 3, // default value since not collected in this flow
      skillConfidence: a.skillConfidence ?? 3,
      mealsPerDay: a.mealsPerDay ?? 3,
      snackingStyle: String(a.snackingStyle || ''),
      snackFrequency: a.snackFrequency,
      dessertFrequency: a.dessertFrequency as '0' | 'few_per_week' | 'most_nights' | 'every_night' | 'ai_decide' | undefined,
      budgetMin: a.budgetMin,
      budgetMax: a.budgetMax,
      planDuration: a.planDuration,
      startDate: a.startDate,
      cookingEquipment: a.cookingEquipment ?? [],
      eatingChallenges: a.eatingChallenges ?? [],
      allergies: a.allergies ?? [],
      avoidFoods: a.avoidFoods ?? [],
      mealVariety: a.mealVariety,
    },
    completedAt: now,
  };

  await WorkoutStorage.saveNutritionResults(nutritionResults);
  await WorkoutStorage.saveBudgetCookingResults(budgetCookingResults);

  // Clear the nutrition draft to prevent draft/final divergence once results are saved.
  // Best-effort: a failure here must not break finalization (results are already saved).
  try { await clearNutritionAnswers(); } catch { /* intentionally swallowed */ }

  return macros;
}

// ---------------------------------------------------------------------------
// Phase-aware macro computation (Phase 2 — phase-aware nutrition)
// ---------------------------------------------------------------------------

// Daily calorie target derived from the research-based rates in the build plan.
// Used by computeMacrosPhaseAware; exported for unit tests.
export function phaseCaloricTarget(
  tdee: number,
  phase: DerivedPhase,
  weightKg: number,
  bodyFatPct?: number,
  trainingState?: TrainingState
): number {
  switch (phase) {
    case 'bulk': {
      // Surplus scales with adaptation rate: new gains fast, advanced gains slow.
      // "returning" groups with "consistent" — muscle-memory regain needs a modest
      // surplus, and elevated-BF returners are already routed to recomp.
      const surplusPct =
        trainingState === 'new'      ? 1.10
        : trainingState === 'advanced' ? 1.05
        : 1.07; // consistent + returning (and default when unknown)
      return Math.round(tdee * surplusPct);
    }
    case 'lean_bulk': {
      const surplusPct =
        trainingState === 'new'      ? 1.07
        : trainingState === 'advanced' ? 1.03
        : 1.05; // consistent + returning
      return Math.round(tdee * surplusPct);
    }
    case 'cut': {
      // Leaner-means-slower ceiling: scale max deficit to available fat mass.
      // Prevents aggressive deficits when little fat remains to lose.
      const maxWeeklyLossPct =
        bodyFatPct == null ? 0.5
        : bodyFatPct < 15  ? 0.35
        : bodyFatPct < 20  ? 0.5
        : 0.75;
      const maxWeeklyLossKg = (weightKg * maxWeeklyLossPct) / 100;
      const ceilingDeficit = Math.round((maxWeeklyLossKg * 7700) / 7);
      const deficit = Math.min(500, ceilingDeficit);
      return Math.round(tdee - deficit);
    }
    case 'recomp':
      // Small deficit (8% or 300 kcal, whichever is smaller) — maintenance-adjacent.
      return Math.round(tdee - Math.min(300, Math.round(tdee * 0.08)));
    case 'maintain':
    default:
      return tdee;
  }
}

// Research-based protein targets (g/kg), biased high on cut to protect muscle.
function phaseProteinPerKg(phase: DerivedPhase): number {
  switch (phase) {
    case 'cut':      return 2.2;
    case 'recomp':   return 2.0;
    case 'lean_bulk':
    case 'maintain': return 1.8;
    case 'bulk':     return 1.6;
  }
}

// Phase-aware macro computation. Uses GoalsProfile weight (authoritative) and
// derives calorie/protein targets from the derived phase. Falls back gracefully
// when questionnaire fields required for BMR are not yet collected.
export function computeMacrosPhaseAware(
  answers: NutritionAnswers,
  profile: GoalsProfile
): MacroResults | null {
  const { gender, age, height, activityLevel } = answers;
  const weight = profile.currentWeightKg;
  if (!gender || !age || !height || !activityLevel || !weight) return null;

  // Mifflin-St Jeor BMR (mirrors computeMacros — keep in lockstep)
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else if (gender === 'female') {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    const male   = 10 * weight + 6.25 * height - 5 * age + 5;
    const female = 10 * weight + 6.25 * height - 5 * age - 161;
    bmr = (male + female) / 2;
  }

  const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55));
  const phase = derivePhase(profile);
  const calories = phaseCaloricTarget(tdee, phase, weight, profile.currentBodyFatPct, profile.trainingState);

  // Protein: research-based floor; bumped above the split-derived amount if needed.
  const pFloor = Math.round(weight * phaseProteinPerKg(phase));
  const split =
    answers.dietType === 'custom' && answers.customMacros
      ? { p: answers.customMacros.protein, c: answers.customMacros.carbs, f: answers.customMacros.fat }
      : DIET_SPLITS[answers.dietType ?? 'balanced'] ?? DIET_SPLITS.balanced;

  const splitProtein = Math.round((calories * split.p) / 100 / 4);
  const protein = Math.max(splitProtein, pFloor);

  // Remaining calories split fat:carb at the user's chosen ratio.
  const proteinKcal = protein * 4;
  const remaining = Math.max(0, calories - proteinKcal);
  const fatRatio = split.f / (split.f + split.c);
  const fat = Math.round((remaining * fatRatio) / 9);
  const carbs = Math.round((calories - proteinKcal - fat * 9) / 4);

  return { bmr: Math.round(bmr), tdee, calories, protein, carbs, fat };
}