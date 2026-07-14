// src/utils/nutritionQuestionnaireStorage.ts
//
// In-progress answer store for the nutrition questionnaire — the
// nutrition analogue of the workout `questionnaireStorage` wrapper.
//
// The workout side can use one key as both draft AND final because it
// has no compute step. Nutrition does (BMR/TDEE/macros are calculated
// from these answers), so we keep the raw answers in their own draft
// key here and only write the FINAL `nutrition_questionnaire_results`
// ({ formData, macroResults }) once the macros are computed at the end
// of the flow — exactly the way workout persists at the Refinements
// step rather than on every screen.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutStorage } from './storage';

const KEY = '@nutrition_questionnaire_answers';

export interface NutritionAnswers {
  // --- Macro inputs (N1–N5) ---
  goal?: 'lose_weight' | 'gain_weight' | 'maintain';
  targetRatePercentage?: number; // % of body weight per week
  targetRate?: number; // kg/week (computed once weight is known)
  age?: number | null;
  gender?: 'male' | 'female' | 'prefer_not_to_say';
  height?: number | null; // cm
  weight?: number | null; // kg (sourced from WeightTracker)
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'heavy' | 'extreme';
  dietType?: 'balanced' | 'high_protein' | 'low_carb' | 'keto' | 'custom';
  customMacros?: { protein: number; carbs: number; fat: number };

  // --- Budget & cooking inputs (N6–N10) ---
  mealsPerDay?: number;
  snackFrequency?: string;
  snackingStyle?: string;
  mealVariety?: 'convenience' | 'balanced' | 'variety';
  dessertFrequency?: '0' | 'once_per_week' | 'few_per_week' | 'most_nights' | 'every_night' | 'ai_decide';
  country?: string;
  city?: string;
  countryCode?: string;
  groceryStore?: string;
  weeklyBudget?: string;
  budgetMin?: number;
  budgetMax?: number;
  planDuration?: number;
  startDate?: string;
  skillConfidence?: number;
  timeInvestment?: number;
  cookingEquipment?: string[];

  // --- Refinements ---
  allergies?: string[];
  avoidFoods?: string[];
  eatingChallenges?: string[];

  [key: string]: any;
}

export async function loadNutritionAnswers(): Promise<NutritionAnswers> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const answers = raw ? JSON.parse(raw) : {};
    
    // Migration: Convert 14-day plans to 7-day plans
    if (answers.planDuration === 14) {
      answers.planDuration = 7;
      await saveNutritionAnswers(answers);
    }
    
    return answers;
  } catch (e) {
    console.error('loadNutritionAnswers failed', e);
    return {};
  }
}

export async function saveNutritionAnswers(
  answers: NutritionAnswers
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(answers));
  } catch (e) {
    console.error('saveNutritionAnswers failed', e);
  }
}

// Merge-update a single field. Used by editMode on each Q screen, the
// same way the workout screens call updateQuestionnaireField.
export async function updateNutritionField<K extends keyof NutritionAnswers>(
  field: K,
  value: NutritionAnswers[K]
): Promise<void> {
  const current = await loadNutritionAnswers();
  await saveNutritionAnswers({ ...current, [field]: value });
}

export async function clearNutritionAnswers(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    console.error('clearNutritionAnswers failed', e);
  }
}

/**
 * The answers as anything AFTER the questionnaire should read them.
 *
 * finalizeNutrition() deliberately clears the draft once it has written the
 * results, so a screen that reads the draft afterwards sees `{}` — which is why
 * the summary rendered "No saved questionnaire" for every user who had just
 * completed one. The finalized results are the source of truth from that point
 * on; this rebuilds a NutritionAnswers view of them.
 *
 * The draft is merged ON TOP, not instead of: an edit row (N1Goal etc. in
 * editMode) writes its one field straight back to the now-empty draft, so
 * post-finalize the draft holds edits-since-finalize and nothing else. Base +
 * overlay is what makes both the mid-questionnaire case (draft only) and the
 * edit-a-row case (results + one edited field) come out right. The summary
 * re-finalizes on Continue, which re-persists the merge and re-clears the
 * draft — so the two stores never diverge.
 *
 * Returns null when the user genuinely has no questionnaire, so callers can
 * still show their empty state.
 */
export async function resolveNutritionAnswers(): Promise<NutritionAnswers | null> {
  const draft = await loadNutritionAnswers();
  const results = await WorkoutStorage.loadNutritionResults();

  if (!results?.formData) {
    return draft && Object.keys(draft).length > 0 ? draft : null;
  }

  const f = results.formData;
  const budget = (await WorkoutStorage.loadBudgetCookingResults())?.formData;

  const num = (v: any): number | undefined => {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return typeof n === 'number' && !Number.isNaN(n) ? n : undefined;
  };

  const weight = num(f.weight);

  // Records finalized before targetRatePercentage was persisted still carry
  // `rate` (kg/week = weight × pct / 100), so recover the pct from it.
  const rateKgPerWeek = num(f.rate);
  const targetRatePercentage =
    f.targetRatePercentage ??
    (rateKgPerWeek && weight
      ? Number(((rateKgPerWeek / weight) * 100).toFixed(2))
      : undefined);

  const fromResults: NutritionAnswers = {
    goal: f.goal as NutritionAnswers['goal'],
    targetRatePercentage,
    age: num(f.age) ?? null,
    gender: f.gender as NutritionAnswers['gender'],
    height: num(f.height) ?? null,
    weight: weight ?? null,
    activityLevel: f.activityLevel as NutritionAnswers['activityLevel'],
    dietType: f.dietType as NutritionAnswers['dietType'],
    customMacros: f.customMacros,

    mealsPerDay: budget?.mealsPerDay,
    snackFrequency: budget?.snackFrequency,
    snackingStyle: budget?.snackingStyle,
    mealVariety: budget?.mealVariety,
    dessertFrequency: budget?.dessertFrequency as NutritionAnswers['dessertFrequency'],
    country: budget?.country,
    city: budget?.city,
    countryCode: budget?.countryCode,
    groceryStore: budget?.groceryStore,
    weeklyBudget: budget?.weeklyBudget,
    budgetMin: budget?.budgetMin,
    budgetMax: budget?.budgetMax,
    planDuration: budget?.planDuration,
    startDate: budget?.startDate,
    skillConfidence: budget?.skillConfidence,
    timeInvestment: budget?.timeInvestment,
    cookingEquipment: budget?.cookingEquipment,
    allergies: budget?.allergies,
    avoidFoods: budget?.avoidFoods,
    eatingChallenges: budget?.eatingChallenges,
  };

  // Drop undefined keys so they don't shadow draft values in the spread.
  Object.keys(fromResults).forEach((k) => {
    if (fromResults[k] === undefined) delete fromResults[k];
  });

  return { ...fromResults, ...draft };
}

// Has the user finished the NEW nutrition questionnaire?
// Used by CreateChooser to decide resume-at-Summary vs. start-fresh at N1.
//
// This used to read the draft alone, to avoid honouring a stale `completedAt`
// left by the OLD nutrition questionnaire and routing those users to an empty
// Summary. But finalizeNutrition() clears the draft, so it answered `false` for
// every user who had actually just completed the thing — sending them back to
// N1 to redo it. It now resolves the same way the Summary does, and the
// staleness guard is the field check below: a partial legacy record can't
// satisfy it, so those users still start fresh.
export async function hasCompleteNutritionAnswers(): Promise<boolean> {
  const a = await resolveNutritionAnswers();
  if (!a || !a.goal) return false;

  const rateOk = a.goal === 'maintain' || a.targetRatePercentage != null;

  return !!(
    rateOk &&
    a.age != null &&
    a.gender &&
    a.height != null &&
    a.weight != null &&
    a.activityLevel &&
    a.dietType &&
    a.mealsPerDay != null &&
    a.snackFrequency != null &&
    a.country &&
    a.groceryStore &&
    a.weeklyBudget &&
    a.planDuration != null &&
    a.startDate &&
    a.skillConfidence != null &&
    a.timeInvestment != null &&
    (a.cookingEquipment?.length ?? 0) > 0
  );
}