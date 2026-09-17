import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// onboardingGate — "is this install really fresh?"
//
// The first-run gate (IntentForkModal) keys on '@onboarding/completedAt', with
// a fallback to the legacy 'onboarding_completed'. Neither being set is NOT
// proof of a fresh install: the legacy key was only written for a few months
// (Feb–Jun 2026) and never before that, the fork's key only exists for people
// who saw the fork, and Profile's "Show it" reset deletes both. Any of those
// cohorts, updating to a build whose intake sits behind the gate, was dropped
// into first-run onboarding on top of a full account. So before treating an
// install as fresh, the gate looks for real data and, if any exists, closes
// silently exactly as the legacy path does.
// ============================================================================

// Keys that only hold something once the person has actually USED the app.
// Only keys the user fills by doing something are listed. @goals_profile is
// deliberately NOT here: the Route intake writes it beat by beat, so it is set
// on a fresh install that was abandoned one question in, and that person
// should still get the intake back next launch. workout_history is written
// as [] by a boot migration, hence the non-empty check rather than presence.
export const USER_DATA_KEYS = [
  'workout_routines',
  'my_workout_routines',
  'meal_plans',
  'workout_history',
  'weight_tracking_history',
  'fitness_goals_questionnaire_results',
  'nutrition_questionnaire_results',
  'budget_cooking_questionnaire_results',
  'fridge_pantry_questionnaire_results',
  'equipment_preferences_questionnaire_results',
];

// A key whose value is an empty array/object/string carries no evidence:
// several of these are initialised empty by migrations or first reads.
const EMPTY_VALUE = /^\s*(\[\s*\]|\{\s*\}|null|"")?\s*$/;

export async function hasPriorUserData(): Promise<boolean> {
  const pairs = await AsyncStorage.multiGet(USER_DATA_KEYS);
  return pairs.some(([, value]) => value != null && !EMPTY_VALUE.test(value));
}
