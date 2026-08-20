// src/utils/__tests__/questionnaireRouting.test.ts
//
// Coverage for the flow-entry helpers in questionnaireRouting.ts, which had
// none before. These are the functions that enforce the "GoalsProfile first"
// gate, so the most important assertions here are the negative ones: no entry
// point may drop a user into Q3DaysPerWeek or N5DietType before a profile exists.
// A direct navigate to N1Goal in MealPlanPreviewScreen defeated that gate for
// first-run users reaching the example plan, and nothing failed.
//
// The three STORAGE modules are mocked. goalsProfile and syntheticNutritionAnswers
// are deliberately NOT mocked — they are pure, and running the real derivePhase
// here means the phase -> synthetic N1/N2 mapping is covered end to end.

import {
  startWorkoutFlow,
  startNutritionFlow,
  continueWorkoutFlow,
  continueNutritionFlow,
} from '../questionnaireRouting';

import {
  hasCompleteQuestionnaire,
  loadQuestionnaireAnswers,
} from '../questionnaireStorage';
import {
  hasCompleteNutritionAnswers,
  loadNutritionAnswers,
  mergeNutritionAnswers,
} from '../nutritionQuestionnaireStorage';
import { hasGoalsProfile, loadGoalsProfile } from '../goalsProfileStorage';

import type { GoalsProfile } from '../goalsProfile';

jest.mock('../questionnaireStorage');
jest.mock('../nutritionQuestionnaireStorage');
jest.mock('../goalsProfileStorage');

const mockHasCompleteQuestionnaire = hasCompleteQuestionnaire as jest.Mock;
const mockLoadQuestionnaireAnswers = loadQuestionnaireAnswers as jest.Mock;
const mockHasCompleteNutritionAnswers = hasCompleteNutritionAnswers as jest.Mock;
const mockLoadNutritionAnswers = loadNutritionAnswers as jest.Mock;
const mockMergeNutritionAnswers = mergeNutritionAnswers as jest.Mock;
const mockHasGoalsProfile = hasGoalsProfile as jest.Mock;
const mockLoadGoalsProfile = loadGoalsProfile as jest.Mock;

/** A profile with a goal weight — enough for derivePhase to give a direction. */
const PROFILE_WITH_GOAL: GoalsProfile = {
  currentWeightKg: 80,
  currentBodyFatPct: 25,
  goalWeightKg: 90,
  goalBodyFatPct: 12,
  trainingState: 'consistent',
};

/** A usable profile with no goal weight — direction is unknown. */
const PROFILE_NO_GOAL: GoalsProfile = {
  currentWeightKg: 80,
  trainingState: 'consistent',
};

function makeNav() {
  return { navigate: jest.fn() };
}

/** The routes a user must never reach before a GoalsProfile exists. */
const GATED_ROUTES = ['Q3DaysPerWeek', 'N3Age', 'N5DietType'];

function assertNoGatedRoute(nav: { navigate: jest.Mock }) {
  const visited = nav.navigate.mock.calls.map((c) => c[0]);
  GATED_ROUTES.forEach((route) => expect(visited).not.toContain(route));
}

beforeEach(() => {
  jest.clearAllMocks();
  // Safe defaults; individual tests override what they care about.
  mockHasCompleteQuestionnaire.mockResolvedValue(false);
  mockLoadQuestionnaireAnswers.mockResolvedValue(null);
  mockHasCompleteNutritionAnswers.mockResolvedValue(false);
  mockLoadNutritionAnswers.mockResolvedValue(null);
  mockMergeNutritionAnswers.mockImplementation(async (a: any) => ({ ...a }));
  mockHasGoalsProfile.mockResolvedValue(true);
  mockLoadGoalsProfile.mockResolvedValue(PROFILE_WITH_GOAL);
});

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

describe('the GoalsProfile gate', () => {
  it('sends a first-run user into GoalsIntake for the workout flow', async () => {
    mockHasGoalsProfile.mockResolvedValue(false);
    const nav = makeNav();

    await startWorkoutFlow(nav);

    expect(nav.navigate).toHaveBeenCalledWith('GoalsIntake', {
      nextFlow: 'workout',
    });
    assertNoGatedRoute(nav);
  });

  it('sends a first-run user into GoalsIntake for the nutrition flow', async () => {
    mockHasGoalsProfile.mockResolvedValue(false);
    const nav = makeNav();

    await startNutritionFlow(nav);

    expect(nav.navigate).toHaveBeenCalledWith('GoalsIntake', {
      nextFlow: 'nutrition',
    });
    assertNoGatedRoute(nav);
  });

  it('never reaches a questionnaire screen without a profile, whatever else is stored', async () => {
    // Even with completed questionnaires already on disk, no profile means
    // GoalsIntake. This is the case a direct navigate used to sail past.
    mockHasGoalsProfile.mockResolvedValue(false);
    mockHasCompleteQuestionnaire.mockResolvedValue(true);
    mockHasCompleteNutritionAnswers.mockResolvedValue(true);

    const workoutNav = makeNav();
    const nutritionNav = makeNav();
    await startWorkoutFlow(workoutNav);
    await startNutritionFlow(nutritionNav);

    assertNoGatedRoute(workoutNav);
    assertNoGatedRoute(nutritionNav);
    expect(workoutNav.navigate).toHaveBeenCalledTimes(1);
    expect(nutritionNav.navigate).toHaveBeenCalledTimes(1);
  });

  it('sends a returning user to ConfirmStats, not straight into the questions', async () => {
    const nav = makeNav();

    await startWorkoutFlow(nav);

    expect(nav.navigate).toHaveBeenCalledWith('ConfirmStats', {
      nextFlow: 'workout',
      extraParams: {},
    });
    assertNoGatedRoute(nav);
  });

  it('forwards extraParams to ConfirmStats', async () => {
    const nav = makeNav();

    await startNutritionFlow(nav, { fromOnboarding: true });

    expect(nav.navigate).toHaveBeenCalledWith('ConfirmStats', {
      nextFlow: 'nutrition',
      extraParams: { fromOnboarding: true },
    });
  });
});

// ---------------------------------------------------------------------------
// continueWorkoutFlow
// ---------------------------------------------------------------------------

describe('continueWorkoutFlow', () => {
  it('goes to the summary when the questionnaire is already complete', async () => {
    mockHasCompleteQuestionnaire.mockResolvedValue(true);
    const nav = makeNav();

    await continueWorkoutFlow(nav);

    expect(nav.navigate).toHaveBeenCalledWith('QuestionnaireSummary');
  });

  // Q3, not Q1: the primary-goal question left the flow on 9 Aug 2026, so Q3
  // is the first workout question a resuming user should land on.
  it('resumes at Q3 with the saved draft when incomplete', async () => {
    const saved = { totalTrainingDays: 4 };
    mockLoadQuestionnaireAnswers.mockResolvedValue(saved);
    const nav = makeNav();

    await continueWorkoutFlow(nav, { flowStepOffset: 3 });

    expect(nav.navigate).toHaveBeenCalledWith('Q3DaysPerWeek', {
      answersSoFar: saved,
      flowStepOffset: 3,
    });
  });

  it('passes an empty object rather than null when no draft exists', async () => {
    const nav = makeNav();

    await continueWorkoutFlow(nav);

    expect(nav.navigate).toHaveBeenCalledWith('Q3DaysPerWeek', {
      answersSoFar: {},
    });
  });
});

// ---------------------------------------------------------------------------
// continueNutritionFlow
// ---------------------------------------------------------------------------

describe('continueNutritionFlow', () => {
  it('goes to the summary when the nutrition answers are already complete', async () => {
    mockHasCompleteNutritionAnswers.mockResolvedValue(true);
    const nav = makeNav();

    await continueNutritionFlow(nav);

    expect(nav.navigate).toHaveBeenCalledWith('NutritionSummary');
    expect(mockMergeNutritionAnswers).not.toHaveBeenCalled();
  });

  // N3Age is the first screen as of 17 Aug 2026. Age and activity came BACK
  // into the flow as their own steps, because they were the two answers that
  // change the calorie target and neither was being asked here — activity was
  // being collected on ConfirmStats instead, where the user could not see why.
  //
  // Still one path for everyone: no branch, no "which route did this user
  // take" state, which was the source of a whole class of bugs in this file.
  it('always lands on N3Age, never on a screen that no longer exists', async () => {
    const nav = makeNav();

    await continueNutritionFlow(nav);

    expect(nav.navigate).toHaveBeenCalledWith('N3Age', expect.any(Object));
    const visited = nav.navigate.mock.calls.map((c: any[]) => c[0]);
    // N1Goal and N3AboutYou are genuinely gone. N2Rate exists but is reached
    // from the summary, never as a step in this flow.
    ['N1Goal', 'N3AboutYou', 'N2Rate'].forEach((r) => expect(visited).not.toContain(r));
  });

  // Down by TWO now, not four: N3Age is the entry point and its literals
  // assume it is the 3rd of 12, so every downstream screen keeps its own
  // hardcoded numbers untouched.
  it('shifts the step count down by two so the later screens keep their literals', async () => {
    const nav = makeNav();

    await continueNutritionFlow(nav, { flowStepOffset: 4 });

    expect(nav.navigate).toHaveBeenCalledWith(
      'N3Age',
      expect.objectContaining({ flowStepOffset: 2 }),
    );
  });

  it('seeds the goal from the derived phase', async () => {
    const nav = makeNav();

    await continueNutritionFlow(nav);

    // 80kg/25% -> 90kg/12%, consistent: gaining, but 25% sits above the
    // balanced band ceiling of 18, so since 9 Aug 2026 (D0) derivePhase opens
    // with a RECOMP — the same phase the route screen shows for this profile,
    // which is the whole point of the change. The synthetic mapping sends
    // recomp to maintain-shaped answers (recomp calories are set phase-aware,
    // not from a user rate). The historical wrong answers this pins out:
    // 'cut' (put a user asking to gain into a deficit) and 'gain_weight'
    // (ran a surplus above the band and contradicted the roadmap).
    expect(mockMergeNutritionAnswers).toHaveBeenCalledWith(
      expect.objectContaining({ goal: 'maintain' }),
    );
  });

  it('seeds sex, height and weight from the profile', async () => {
    mockLoadGoalsProfile.mockResolvedValue({
      ...PROFILE_WITH_GOAL,
      sex: 'male',
      ageYears: 28,
      heightCm: 185,
      activityLevel: 'moderate',
    });
    const nav = makeNav();

    await continueNutritionFlow(nav);

    expect(mockMergeNutritionAnswers).toHaveBeenCalledWith(
      expect.objectContaining({ gender: 'male', height: 185, weight: 80 }),
    );
  });

  // THE POINT OF THE 17 Aug CHANGE, asserted as a negative because that is the
  // only way it can be. Age and activity are asked as their own steps, so
  // seeding them from the profile would silently SKIP those questions for any
  // user whose profile already carried them — which is the duplication the
  // change removed, just inverted.
  it('does NOT seed age or activity, so the questions are actually asked', async () => {
    mockLoadGoalsProfile.mockResolvedValue({
      ...PROFILE_WITH_GOAL,
      sex: 'male',
      ageYears: 28,
      heightCm: 185,
      activityLevel: 'moderate',
    });
    const nav = makeNav();

    await continueNutritionFlow(nav);

    const seeded = mockMergeNutritionAnswers.mock.calls[0][0];
    expect(seeded).not.toHaveProperty('age');
    expect(seeded).not.toHaveProperty('activityLevel');
  });

  // The user's own answer always wins over the derived one.
  it('never overwrites a goal the user already gave', async () => {
    mockLoadNutritionAnswers.mockResolvedValue({ goal: 'lose_weight' });
    const nav = makeNav();

    await continueNutritionFlow(nav);

    expect(mockMergeNutritionAnswers).not.toHaveBeenCalledWith(
      expect.objectContaining({ goal: expect.anything() }),
    );
  });

  it('still lands on N3Age when there is no profile at all', async () => {
    mockLoadGoalsProfile.mockResolvedValue(null);
    const nav = makeNav();

    await continueNutritionFlow(nav);

    expect(nav.navigate).toHaveBeenCalledWith('N3Age', expect.any(Object));
  });
});