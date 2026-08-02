import { hasCompleteQuestionnaire, loadQuestionnaireAnswers } from './questionnaireStorage';
import {
  hasCompleteNutritionAnswers,
  loadNutritionAnswers,
  mergeNutritionAnswers,
} from './nutritionQuestionnaireStorage';
import { hasGoalsProfile, loadGoalsProfile } from './goalsProfileStorage';
import { derivePhase } from './goalsProfile';

// The phase -> synthetic N1/N2 mapping now lives in its own leaf module so
// nutritionQuestionnaireStorage can use it for goal recovery without an
// import cycle. Re-exported here so existing importers (GoalsIntakeScreen)
// keep working unchanged.
export {
  deriveSyntheticNutritionAnswers,
} from './syntheticNutritionAnswers';
export type { SyntheticNutritionAnswers } from './syntheticNutritionAnswers';

import { deriveSyntheticNutritionAnswers } from './syntheticNutritionAnswers';

// ── Continuation helpers ───────────────────────────────────────────────────
//
// Called by ConfirmStatsScreen once a returning user's stats are
// confirmed. Not used on the first-run path — GoalsIntakeScreen navigates
// straight into Q1PrimaryGoal/N1Goal itself, since a first-run user has by
// definition never completed these questions before.

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
    return;
  }

  const saved = await loadNutritionAnswers();

  // When GoalsProfile provides a direction and no N1 answer is saved yet, skip
  // N1 (goal) and N2 (rate) — the phase-aware macro path in assembleMealPlanPromptV2
  // derives both from the profile. We persist synthetic answers so that
  // hasCompleteNutritionAnswers() can reach `true` without the user seeing those screens.
  if (!saved?.goal) {
    const profile = await loadGoalsProfile();
    if (profile?.goalWeightKg) {
      const phase = derivePhase(profile);
      const synth = deriveSyntheticNutritionAnswers(phase);
      // mergeNutritionAnswers re-reads and writes the draft itself, and returns
      // the merged result. It also refuses to write a non-object, so a bad
      // synth can no longer disappear into saveNutritionAnswers' catch block.
      const merged = await mergeNutritionAnswers(synth);
      // N1 and N2 are being skipped — shift the step count down by 2 so
      // N3 onward still number continuously (see the flowStepOffset
      // convention: the same shift is applied uniformly to every
      // downstream screen's hardcoded currentStep/totalSteps literals).
      const baseOffset = (extraParams as any).flowStepOffset ?? 0;
      navigation.navigate('N3AboutYou', {
        answersSoFar: merged,
        ...extraParams,
        flowStepOffset: baseOffset - 2,
      });
      return;
    }
  }

  navigation.navigate('N1Goal', { answersSoFar: saved || {}, ...extraParams });
}

// ── Public entry points ────────────────────────────────────────────────────
//
// These are the only callers that know about the GoalsIntake / ConfirmStats
// split. All paths that start a planning flow (CreateChooserScreen,
// HomeScreen, NutritionHomeScreen, OnboardingContractScreen) go through
// one of these.
//
// No GoalsProfile yet (or one with an unset current weight — see
// hasGoalsProfile, which already treats currentWeightKg <= 0 as unset):
// first-run, straight into GoalsIntake, which flows directly into the
// plan-specific questions with no completeness check and no teleport.
//
// GoalsProfile already usable: returning user. One lightweight "still
// accurate?" stats confirmation, THEN the same complete-vs-fresh routing
// continueWorkoutFlow/continueNutritionFlow always had — now safe because
// hasCompleteQuestionnaire reads the workout draft key instead of the
// legacy/shared one.

export async function startWorkoutFlow(
  navigation: any,
  extraParams: Record<string, any> = {}
): Promise<void> {
  if (!await hasGoalsProfile()) {
    navigation.navigate('GoalsIntake', { nextFlow: 'workout' });
    return;
  }
  navigation.navigate('ConfirmStats', { nextFlow: 'workout', extraParams });
}

export async function startNutritionFlow(
  navigation: any,
  extraParams: Record<string, any> = {}
): Promise<void> {
  if (!await hasGoalsProfile()) {
    navigation.navigate('GoalsIntake', { nextFlow: 'nutrition' });
    return;
  }
  navigation.navigate('ConfirmStats', { nextFlow: 'nutrition', extraParams });
}