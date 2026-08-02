// __tests__/nutritionSummaryEmptyState.test.ts
//
// Regression test for: "No saved questionnaire. Start a new one from Create."
// showing on NutritionSummaryScreen immediately after completing the flow.
//
// The screen's gate is `if (!answers || !answers.goal)` where `answers` comes
// from resolveNutritionAnswers(). Every assertion below is written against
// that expression, so a pass here means the screen renders.
//
// Runs with no device build. Storage is an in-memory map; the GoalsProfile
// modules are mocked so this tests the resolve/finalize logic in isolation
// rather than derivePhase's thresholds.

// ── In-memory AsyncStorage ─────────────────────────────────────────────────
// Behaves like the real thing in the way that matters here: values must be
// strings, so JSON.stringify(undefined) is rejected rather than stored.
const mockMemoryStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => {
  const api = {
    getItem: async (k: string) =>
      mockMemoryStore.has(k) ? mockMemoryStore.get(k)! : null,
    setItem: async (k: string, v: string) => {
      if (typeof v !== 'string') {
        throw new Error(`[AsyncStorage] value must be a string, got ${typeof v}`);
      }
      mockMemoryStore.set(k, v);
    },
    removeItem: async (k: string) => {
      mockMemoryStore.delete(k);
    },
    multiRemove: async (ks: string[]) => {
      ks.forEach((k) => mockMemoryStore.delete(k));
    },
    multiGet: async (ks: string[]) =>
      ks.map((k) => [k, mockMemoryStore.has(k) ? mockMemoryStore.get(k)! : null]),
    multiSet: async (pairs: [string, string][]) => {
      pairs.forEach(([k, v]) => mockMemoryStore.set(k, v));
    },
    mergeItem: async (k: string, v: string) => {
      mockMemoryStore.set(k, v);
    },
    getAllKeys: async () => [...mockMemoryStore.keys()],
    clear: async () => {
      mockMemoryStore.clear();
    },
  };
  // Exposed on BOTH the namespace and `default`. Source files do
  // `import AsyncStorage from '...'` (default), while jest.setup.js does
  // `require('...').clear()` (namespace). Only shipping `default` makes
  // the setup file throw "AsyncStorage.clear is not a function".
  return { __esModule: true, default: api, ...api };
});

let mockProfile: any = null;

jest.mock('../goalsProfileStorage', () => ({
  loadGoalsProfile: async () => mockProfile,
  saveGoalsProfile: async () => {},
  hasGoalsProfile: async () => !!mockProfile,
}));

jest.mock('../goalsProfile', () => ({
  derivePhase: () => 'cut',
}));

import {
  resolveNutritionAnswers,
  saveNutritionAnswers,
  loadNutritionAnswers,
  updateNutritionField,
  hasCompleteNutritionAnswers,
} from '../nutritionQuestionnaireStorage';
import { finalizeNutrition, computeMacros } from '../nutritionMacros';

const DRAFT_KEY = '@nutrition_questionnaire_answers';
const RESULTS_KEY = 'nutrition_questionnaire_results';
const BUDGET_KEY = 'budget_cooking_questionnaire_results';

// Everything the flow collects EXCEPT the goal. This is the state produced
// when the N1/N2 skip path fails to persist its synthetic goal: the user has
// answered every visible question, so nothing downstream looks wrong.
const answersWithoutGoal = {
  age: 32,
  gender: 'male' as const,
  height: 180,
  weight: 82,
  activityLevel: 'moderate' as const,
  dietType: 'balanced' as const,
  mealsPerDay: 3,
  snackFrequency: '1',
  snackingStyle: 'balanced',
  country: 'Australia',
  countryCode: 'AU',
  groceryStore: 'Woolworths',
  weeklyBudget: '150',
  planDuration: 7,
  startDate: 'tomorrow',
  skillConfidence: 3,
  timeInvestment: 60,
  cookingEquipment: ['oven', 'stovetop'],
};

// The gate at NutritionSummaryScreen.tsx:381.
const summaryRenders = (a: any) => !(!a || !a.goal);

beforeEach(() => {
  mockMemoryStore.clear();
  mockProfile = null;
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the draft can never shadow the results with an explicit undefined', () => {
  it('drops undefined-valued keys on the way through JSON, so the key is absent', async () => {
    await saveNutritionAnswers({ ...answersWithoutGoal, goal: undefined } as any);

    expect(mockMemoryStore.get(DRAFT_KEY)).not.toContain('goal');

    const draft = await loadNutritionAnswers();
    expect('goal' in draft).toBe(false);
    expect(Object.values(draft).every((v) => v !== undefined)).toBe(true);
  });
});

describe('finalizeNutrition will not persist a record with no goal', () => {
  it('returns null instead of writing goal: ""', async () => {
    const macros = await finalizeNutrition(answersWithoutGoal as any);

    expect(macros).toBeNull();
    expect(mockMemoryStore.has(RESULTS_KEY)).toBe(false);
    expect(mockMemoryStore.has(BUDGET_KEY)).toBe(false);
  });

  it('still computes macros without a goal, which is why the guard is needed', () => {
    // Documents the trap: BMR/TDEE do not depend on goal, so computeMacros
    // cannot be the thing that catches this.
    expect(computeMacros(answersWithoutGoal as any)).not.toBeNull();
  });

  it('persists normally once a goal is present', async () => {
    const macros = await finalizeNutrition({
      ...answersWithoutGoal,
      goal: 'lose_weight',
      targetRatePercentage: 0.5,
    } as any);

    expect(macros).not.toBeNull();
    expect(JSON.parse(mockMemoryStore.get(RESULTS_KEY)!).formData.goal).toBe('lose_weight');

    const resolved = await resolveNutritionAnswers();
    expect(summaryRenders(resolved)).toBe(true);
    expect(resolved!.goal).toBe('lose_weight');
    expect(await hasCompleteNutritionAnswers()).toBe(true);
  });
});

describe('an already-broken record on disk still renders the summary', () => {
  // Seed the exact state a device is in after the old code ran: results with
  // an empty-string goal, no draft (finalize cleared it), GoalsProfile intact.
  const seedBrokenRecord = () => {
    mockMemoryStore.set(
      RESULTS_KEY,
      JSON.stringify({
        formData: {
          goal: '',
          rate: '0',
          gender: 'male',
          age: '32',
          height: '180',
          weight: '82',
          heightUnit: 'cm',
          weightUnit: 'kg',
          activityLevel: 'moderate',
          jobType: 'desk_job',
          dietType: 'balanced',
        },
        macroResults: {
          calories: 2650, protein: 133, carbs: 331, fat: 88, bmr: 1811, tdee: 2650,
        },
        completedAt: '2026-08-01T00:00:00.000Z',
      })
    );
    mockMemoryStore.set(
      BUDGET_KEY,
      JSON.stringify({
        formData: {
          weeklyBudget: '150', country: 'Australia', countryCode: 'AU', city: '',
          groceryStore: 'Woolworths', planningStyle: 3, cookingEnjoyment: 3,
          timeInvestment: 60, varietySeeking: 3, skillConfidence: 3, mealsPerDay: 3,
          snackingStyle: 'balanced', snackFrequency: '1', planDuration: 7,
          startDate: 'tomorrow', cookingEquipment: ['oven', 'stovetop'],
          eatingChallenges: [], allergies: [], avoidFoods: [],
        },
        completedAt: '2026-08-01T00:00:00.000Z',
      })
    );
  };

  it('recovers the goal from the GoalsProfile the skip path derived it from', async () => {
    seedBrokenRecord();
    mockProfile = { currentWeightKg: 82, goalWeightKg: 76, trainingState: 'consistent' };

    const resolved = await resolveNutritionAnswers();

    expect(summaryRenders(resolved)).toBe(true);
    expect(resolved!.goal).toBe('lose_weight'); // derivePhase mocked to 'cut'
    expect(resolved!.targetRatePercentage).toBe(0.5);
    expect(await hasCompleteNutritionAnswers()).toBe(true);
  });

  it('re-finalizing from the summary writes the recovered goal back', async () => {
    seedBrokenRecord();
    mockProfile = { currentWeightKg: 82, goalWeightKg: 76, trainingState: 'consistent' };

    // What NutritionSummaryScreen.proceedToPrompt does on Continue.
    const resolved = await resolveNutritionAnswers();
    const macros = await finalizeNutrition(resolved!);

    expect(macros).not.toBeNull();
    expect(JSON.parse(mockMemoryStore.get(RESULTS_KEY)!).formData.goal).toBe('lose_weight');
  });

  it('with no GoalsProfile to recover from, the empty state is honest', async () => {
    seedBrokenRecord();
    mockProfile = null;

    const resolved = await resolveNutritionAnswers();

    expect(summaryRenders(resolved)).toBe(false);
    expect(await hasCompleteNutritionAnswers()).toBe(false);
  });
});

describe('WeightEntrySheet must not finalize mid-questionnaire', () => {
  // The sheet is opened from N3AboutYouScreen, question 3 of 10. Its old gate
  // was gender && age && height && activityLevel, all of which N3 has by then.
  // finalizeNutrition() clears the draft, so that gate wiped the in-progress
  // answers, synthetic goal included.
  it('the old field gate is true at N3 while the questionnaire is not complete', async () => {
    await saveNutritionAnswers({
      goal: 'lose_weight',
      targetRatePercentage: 0.5,
      age: 28, gender: 'male', height: 183, activityLevel: 'light',
    } as any);

    const a = await resolveNutritionAnswers();
    const oldGate = !!a && !!a.gender && a.age != null && a.height != null && !!a.activityLevel;

    expect(oldGate).toBe(true);                          // would have finalized
    expect(await hasCompleteNutritionAnswers()).toBe(false); // new gate holds
  });

  it('the draft survives a weight save at N3', async () => {
    await saveNutritionAnswers({
      goal: 'lose_weight',
      targetRatePercentage: 0.5,
      age: 28, gender: 'male', height: 183, activityLevel: 'light',
    } as any);

    // What handleSave now does mid-flow: write the field, skip the finalize.
    await updateNutritionField('weight', 77);
    if (await hasCompleteNutritionAnswers()) {
      await finalizeNutrition((await resolveNutritionAnswers())!);
    }

    const draft = await loadNutritionAnswers();
    expect(draft.goal).toBe('lose_weight');
    expect(draft.targetRatePercentage).toBe(0.5);
    expect(draft.weight).toBe(77);
  });
});

describe('the blank-aware overlay does not regress the cases it was built for', () => {
  const finalizeGood = () =>
    finalizeNutrition({
      ...answersWithoutGoal,
      goal: 'gain_weight',
      targetRatePercentage: 0.25,
    } as any);

  it('an edit written to the cleared draft wins over the finalized value', async () => {
    await finalizeGood();
    expect(mockMemoryStore.has(DRAFT_KEY)).toBe(false); // finalize cleared it

    // N1Goal in editMode writes its one field back to the empty draft.
    await saveNutritionAnswers({ goal: 'maintain' } as any);

    const resolved = await resolveNutritionAnswers();
    expect(resolved!.goal).toBe('maintain');
    expect(resolved!.activityLevel).toBe('moderate'); // results still showing through
  });

  it('mid-questionnaire, with a draft and no results, the draft is returned', async () => {
    await saveNutritionAnswers({ goal: 'maintain', age: 32 } as any);

    const resolved = await resolveNutritionAnswers();
    expect(resolved!.goal).toBe('maintain');
    expect(await hasCompleteNutritionAnswers()).toBe(false);
  });

  it('a genuinely empty install still returns null', async () => {
    expect(await resolveNutritionAnswers()).toBeNull();
    expect(await hasCompleteNutritionAnswers()).toBe(false);
  });

  it('a blank draft value cannot erase a finalized answer', async () => {
    await finalizeGood();
    await saveNutritionAnswers({ groceryStore: '', country: '' } as any);

    const resolved = await resolveNutritionAnswers();
    expect(resolved!.groceryStore).toBe('Woolworths');
    expect(resolved!.country).toBe('Australia');
  });
});