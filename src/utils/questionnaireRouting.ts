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
      const synth = PHASE_SYNTH[phase];
      const merged = { ...saved, ...synth };
      await saveNutritionAnswers(merged);
      navigation.navigate('N3AboutYou', { answersSoFar: merged, ...extraParams });
      return;
    }
  }

  navigation.navigate('N1Goal', { answersSoFar: saved || {}, ...extraParams });
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
