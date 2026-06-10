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

// Has the user finished the NEW nutrition questionnaire (this draft)?
// Used by CreateChooser to decide resume-at-Summary vs. start-fresh at N1.
// Deliberately checks the draft store (not the finalized result keys),
// because those keys can hold stale `completedAt` from the OLD nutrition
// questionnaires — which would otherwise route to an empty Summary.
export async function hasCompleteNutritionAnswers(): Promise<boolean> {
  const a = await loadNutritionAnswers();
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