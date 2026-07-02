import { hasCompleteQuestionnaire, loadQuestionnaireAnswers } from './questionnaireStorage';
import {
  hasCompleteNutritionAnswers,
  loadNutritionAnswers,
  saveNutritionAnswers,
} from './nutritionQuestionnaireStorage';
import type { NutritionAnswers } from './nutritionQuestionnaireStorage';
import { hasGoalsProfile, loadGoalsProfile } from './goalsProfileStorage';
import { derivePhase } from './goalsProfile';
import type { DerivedPhase } from './goalsProfile';

// Synthetic N1 (goal) and N2 (rate) answers per phase.
// Persisted before navigating to N3 so hasCompleteNutritionAnswers() can
// reach `true` even though those screens were skipped.
const PHASE_SYNTH: Record<
  DerivedPhase,
  { goal: NutritionAnswers['goal']; targetRatePercentage?: number }
> = {
  cut:       { goal: 'lose_weight', targetRatePercentage: 0.5  },
  recomp:    { goal: 'maintain' },
  lean_bulk: { goal: 'gain_weight', targetRatePercentage: 0.25 },
  bulk:      { goal: 'gain_weight', targetRatePercentage: 0.5  },
  maintain:  { goal: 'maintain' },
};

// Shared with GoalsIntakeScreen's first-run skip path, so both places that
// bypass N1/N2 derive the same synthetic answers from a single mapping.
export function deriveSyntheticNutritionAnswers(
  phase: DerivedPhase
): { goal: NutritionAnswers['goal']; targetRatePercentage?: number } {
  return PHASE_SYNTH[phase];
}

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
      const merged = { ...saved, ...synth };
      await saveNutritionAnswers(merged);
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
