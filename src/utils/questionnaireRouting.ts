import { hasCompleteQuestionnaire, loadQuestionnaireAnswers } from './questionnaireStorage';
import {
  hasCompleteNutritionAnswers,
  loadNutritionAnswers,
  mergeNutritionAnswers,
  clearNutritionAnswers,
} from './nutritionQuestionnaireStorage';
import { hasGoalsProfile, loadGoalsProfile } from './goalsProfileStorage';
import { derivePhase } from './goalsProfile';
import { leanGainKgPerYear } from './roadmap';
import { resolveCutRatePct } from './lossRate';

// The phase -> synthetic N1/N2 mapping now lives in its own leaf module so
// nutritionQuestionnaireStorage can use it for goal recovery without an
// import cycle. Re-exported here so existing importers (GoalsIntakeScreen)
// keep working unchanged.
export {
  deriveSyntheticNutritionAnswers,
} from './syntheticNutritionAnswers';
export type { SyntheticNutritionAnswers } from './syntheticNutritionAnswers';

import { deriveSyntheticNutritionAnswers } from './syntheticNutritionAnswers';
import type { GoalsProfile } from './goalsProfile';

/**
 * The four fields N3 used to ask for, read off the profile instead.
 *
 * They moved to the shared intake because BOTH plans need them — the workout
 * side needs height and sex for the plausibility check and the body-fat band,
 * not just the meal side for BMR. Seeding them into the nutrition draft keeps
 * every existing reader working unchanged.
 */
/**
 * The synthetic goal and rate for this profile's phase.
 *
 * Extracted because BOTH entry points below need it and they were byte
 * identical — which is how the gain-rate fix would have landed in one and not
 * the other.
 *
 * The lean-gain rate is passed across so a synthetic BULK rate follows what
 * this lifter can actually build. Without it the fallback constant applies,
 * and a fixed percentage of bodyweight prescribes gain the body cannot put on
 * as muscle: 0.5%/wk on a 75 kg intermediate is 375 g a week against a
 * ~110 g/week lean ceiling, so most of it is fat the roadmap then schedules a
 * trim to remove.
 */
function syntheticSeedFor(profile: GoalsProfile) {
  const phase = derivePhase(profile);
  const rate = leanGainKgPerYear(profile);

  // THE CUT RATE IS RESOLVED HERE, EVERY TIME, and that is the whole point of
  // storing a preference rather than a number. Someone who chose 'faster' at
  // 25% body fat and is now cutting again at 14% has a much smaller fat store,
  // and Alpert's limit scales with fat mass — so the rate they picked may be
  // one their body can no longer supply. Resolving on entry gives them the
  // fastest rate STILL AVAILABLE instead of the one they chose once.
  return deriveSyntheticNutritionAnswers(phase, {
    leanGainKgPerWeek: rate ? (rate[0] + rate[1]) / 2 / 52 : undefined,
    currentWeightKg: profile.currentWeightKg,
    cutRatePct: resolveCutRatePct(profile, phase, profile.cutPace ?? 'steady') ?? undefined,
  });
}

function profileNutritionFields(profile: GoalsProfile): Record<string, any> {
  const out: Record<string, any> = {};
  if (profile.sex) out.gender = profile.sex;
  // age deliberately NOT seeded, same reason as activityLevel: it is asked as
  // its own step (N3Age) now, and seeding would silently skip the question for
  // anyone with an older profile.
  if (profile.heightCm != null) out.height = profile.heightCm;
  if (profile.currentWeightKg) out.weight = profile.currentWeightKg;
  // activityLevel deliberately NOT seeded. It is now asked as its own step
  // (N4Activity), and seeding it here would mean a user with an older profile
  // silently skipped the question — which is the duplication this move was
  // meant to remove, just inverted.
  return out;
}

// ── Continuation helpers ───────────────────────────────────────────────────
//
// Called by ConfirmStatsScreen once a returning user's stats are
// confirmed. Not used on the first-run path — GoalsIntakeScreen navigates
// straight into the plan questions itself, since a first-run user has by
// definition never completed these questions before.

export async function continueWorkoutFlow(
  navigation: any,
  extraParams: Record<string, any> = {}
): Promise<void> {
  if (await hasCompleteQuestionnaire()) {
    navigation.navigate('QuestionnaireSummary');
  } else {
    const saved = await loadQuestionnaireAnswers();
    // Q3 is the first workout question since Q1 (primary goal) left the flow.
    navigation.navigate('Q3DaysPerWeek', { answersSoFar: saved || {}, ...extraParams });
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

  // N1 (goal), N2 (rate), N3 (about you) and N4 (activity) all left the flow.
  // Everything they asked for now comes from GoalsProfile and the roadmap:
  //
  //   goal + rate  — properties of the derived PHASE. Asking once froze a
  //                  number that changes at every phase transition, and
  //                  produced the contradiction of a plan recommending a
  //                  recomp next to a question asking how fast to gain.
  //   sex/age/height/weight/activity — facts about the person, collected by
  //                  the shared intake and useful to both plans.
  //
  // There is no longer a branch here: the draft is seeded the same way for
  // everyone, so there is no "which path did this user take" state to reason
  // about. That branching was the source of a whole class of bugs in this
  // flow, including one where a user finished all eleven questions and was
  // then told "Missing details".
  const saved = await loadNutritionAnswers();
  const profile = await loadGoalsProfile();

  const seed: Record<string, any> = profile
    ? { ...syntheticSeedFor(profile), ...profileNutritionFields(profile) }
    : {};

  // Never overwrite an answer the user gave themselves.
  if (saved?.goal) delete seed.goal;
  if (saved?.targetRatePercentage != null) delete seed.targetRatePercentage;

  const merged = Object.keys(seed).length ? await mergeNutritionAnswers(seed) : saved;

  // N5 is the first remaining screen. Its literals still assume it is the 5th
  // of 12, so the offset drops by 4 and every downstream screen keeps its own
  // hardcoded numbers untouched.
  const baseOffset = (extraParams as any).flowStepOffset ?? 0;
  // N4Activity is now the first screen. Its literals assume it is the 4th of
  // 12, so the offset drops by 3 rather than 4 and every downstream screen
  // keeps its own hardcoded numbers untouched.
  navigation.navigate('N3Age', {
    answersSoFar: merged ?? {},
    ...extraParams,
    flowStepOffset: baseOffset - 2,
  });
}

/**
 * Restart the nutrition questionnaire from scratch.
 *
 * This CANNOT go through continueNutritionFlow, and the reason is subtle
 * enough to be worth stating. hasCompleteNutritionAnswers reads
 * resolveNutritionAnswers, which layers the draft on top of the FINALIZED
 * results — and clearing the draft does not clear those. So a user who has
 * already generated a plan still resolves as "complete" the instant after
 * they hit restart, and continueNutritionFlow bounces them straight back to
 * the summary. That is a loop: Restart -> Quick check -> Continue -> Summary.
 *
 * The old code avoided it by accident, by navigating directly to N1Goal and
 * never consulting the check. This does the same thing deliberately, and adds
 * the profile seed that the removed screens (N1-N4) used to supply — without
 * it, the user reaches the end and is told "Missing details".
 *
 * The finalized results are deliberately left alone: they are what the current
 * plan is built from, and wiping them when someone merely opens a restart they
 * may abandon would destroy a working plan. Finalizing again overwrites them.
 */
export async function restartNutritionFlow(navigation: any): Promise<void> {
  await clearNutritionAnswers();

  const profile = await loadGoalsProfile();
  const seed = profile
    ? { ...syntheticSeedFor(profile), ...profileNutritionFields(profile) }
    : {};
  const merged = Object.keys(seed).length ? await mergeNutritionAnswers(seed) : {};

  navigation.navigate('N3Age', {
    answersSoFar: merged ?? {},
    flowStepOffset: -2,
  });
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