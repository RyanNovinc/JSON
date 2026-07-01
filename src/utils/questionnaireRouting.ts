import { hasCompleteQuestionnaire, loadQuestionnaireAnswers } from './questionnaireStorage';
import { hasCompleteNutritionAnswers, loadNutritionAnswers } from './nutritionQuestionnaireStorage';
import { hasGoalsProfile } from './goalsProfileStorage';

// ── Continuation helpers ───────────────────────────────────────────────────
//
// Called by GoalsIntakeScreen after the profile is saved, and also used
// internally by startWorkoutFlow / startNutritionFlow when the profile
// already exists. Split out so the gate logic stays in one place.

export async function continueWorkoutFlow(
  navigation: any,
  extraParams: Record<string, any> = {}
): Promise<void> {
  if (await hasCompleteQuestionnaire()) {
    navigation.navigate('QuestionnaireSummary');
  } else {
    const saved = await loadQuestionnaireAnswers();
    navigation.navigate('Q1PrimaryGoal', { answersSoFar: saved || {}, ...extraParams });
  }
}

export async function continueNutritionFlow(
  navigation: any,
  extraParams: Record<string, any> = {}
): Promise<void> {
  if (await hasCompleteNutritionAnswers()) {
    navigation.navigate('NutritionSummary');
  } else {
    const saved = await loadNutritionAnswers();
    navigation.navigate('N1Goal', { answersSoFar: saved || {}, ...extraParams });
  }
}

// ── Public entry points ────────────────────────────────────────────────────
//
// These are the only callers that know about the GoalsIntake gate.
// All paths that start a planning flow (CreateChooserScreen, HomeScreen,
// NutritionHomeScreen, OnboardingContractScreen) go through one of these.

export async function startWorkoutFlow(
  navigation: any,
  extraParams: Record<string, any> = {}
): Promise<void> {
  if (!await hasGoalsProfile()) {
    navigation.navigate('GoalsIntake', { nextFlow: 'workout' });
    return;
  }
  await continueWorkoutFlow(navigation, extraParams);
}

export async function startNutritionFlow(
  navigation: any,
  extraParams: Record<string, any> = {}
): Promise<void> {
  if (!await hasGoalsProfile()) {
    navigation.navigate('GoalsIntake', { nextFlow: 'nutrition' });
    return;
  }
  await continueNutritionFlow(navigation, extraParams);
}
