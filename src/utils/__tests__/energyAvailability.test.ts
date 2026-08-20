// src/utils/__tests__/energyAvailability.test.ts
//
// Coverage for the energy-availability floor — the last gate before a calorie
// target reaches a user.
//
// WHY THIS FILE EXISTS SEPARATELY. The floor shipped on 19 Aug 2026 and the
// entire existing suite stayed green, which sounds like good news and is not:
// it means no fixture anywhere exercised it. A safety floor nothing tests is a
// liability, because the first time anyone finds out it is broken is when it
// fails to protect someone.
//
// The cases below are chosen from the measured gradient rather than invented:
// across a grid of weights, body fats and activity levels the floor raises 71%
// of cut targets at 10% body fat, 29% at 30%, and none at 40%. So there is a
// lean case that must be raised and a fatter case that must be left alone, and
// both are pinned here.

import {
  EA_FLOOR_KCAL_PER_KG_FFM,
  energyAvailability,
  estimateExerciseKcalPerDay,
  computeMacrosPhaseAware,
} from '../nutritionMacros';
import type { GoalsProfile } from '../goalsProfile';
import type { NutritionAnswers } from '../nutritionQuestionnaireStorage';

const ANSWERS = { dietType: 'balanced' } as NutritionAnswers;

/** Lean, light activity, cutting. Sits under the floor and must be raised. */
const LEAN_CUTTER: GoalsProfile = {
  currentWeightKg: 70,
  currentBodyFatPct: 10,
  goalWeightKg: 65,
  goalBodyFatPct: 8,
  trainingState: 'consistent',
  sex: 'male',
  ageYears: 30,
  heightCm: 175,
  activityLevel: 'light',
};

/** Plenty of fat to draw on. Clears the floor and must be left alone. */
const FAT_CUTTER: GoalsProfile = {
  currentWeightKg: 90,
  currentBodyFatPct: 30,
  goalWeightKg: 80,
  goalBodyFatPct: 25,
  trainingState: 'consistent',
  sex: 'male',
  ageYears: 30,
  heightCm: 175,
  activityLevel: 'moderate',
};

describe('energyAvailability', () => {
  it('is intake minus exercise, over fat-free mass', () => {
    // 2500 kcal, 400 spent training, 63 kg of lean mass.
    expect(energyAvailability(2500, 63, 400)).toBeCloseTo((2500 - 400) / 63, 6);
  });

  it('is undefined without a fat-free mass, rather than guessing one', () => {
    expect(energyAvailability(2500, undefined, 400)).toBeUndefined();
    expect(energyAvailability(2500, 0, 400)).toBeUndefined();
  });

  it('estimates exercise cost from activity level, and errs HIGH', () => {
    // Biased high on purpose: overestimating exercise lowers computed
    // availability, so the floor bites sooner. That is the safe direction.
    expect(estimateExerciseKcalPerDay('sedentary')).toBeLessThan(
      estimateExerciseKcalPerDay('extreme'),
    );
    // An unknown activity level must not resolve to zero, which would silently
    // disable the floor for anyone who skipped the question.
    expect(estimateExerciseKcalPerDay(undefined)).toBeGreaterThan(0);
  });
});

describe('the floor as applied to a real target', () => {
  it('RAISES a lean cutter whose target falls below the floor', () => {
    const m = computeMacrosPhaseAware(ANSWERS, LEAN_CUTTER)!;
    expect(m).not.toBeNull();
    expect(m.raisedForEnergyAvailability).toBe(true);
    // Raised to exactly the floor, not past it — the plan stays as aggressive
    // as it is allowed to be.
    expect(m.energyAvailability).toBe(EA_FLOOR_KCAL_PER_KG_FFM);
  });

  it('LEAVES ALONE a cutter with fat to draw on', () => {
    const m = computeMacrosPhaseAware(ANSWERS, FAT_CUTTER)!;
    expect(m).not.toBeNull();
    expect(m.raisedForEnergyAvailability).toBeUndefined();
    expect(m.energyAvailability!).toBeGreaterThan(EA_FLOOR_KCAL_PER_KG_FFM);
  });

  // The gradient is the whole justification for the floor being safe to apply
  // to everyone. If it ever inverts — protecting the fat and squeezing the lean
  // — the floor has become the opposite of what it is for.
  it('protects the lean more than the already-fat', () => {
    const lean = computeMacrosPhaseAware(ANSWERS, LEAN_CUTTER)!;
    const fat = computeMacrosPhaseAware(ANSWERS, FAT_CUTTER)!;
    expect(lean.raisedForEnergyAvailability).toBe(true);
    expect(fat.raisedForEnergyAvailability).toBeUndefined();
  });

  it('never returns a target below the floor for anyone it can compute one for', () => {
    const grid: GoalsProfile[] = [];
    for (const w of [55, 70, 85, 100]) {
      for (const bf of [8, 12, 18, 25, 35]) {
        for (const act of ['sedentary', 'light', 'moderate', 'heavy'] as const) {
          grid.push({
            currentWeightKg: w,
            currentBodyFatPct: bf,
            goalWeightKg: w - 8,
            goalBodyFatPct: Math.max(6, bf - 4),
            trainingState: 'consistent',
            sex: 'male',
            ageYears: 30,
            heightCm: 175,
            activityLevel: act,
          });
        }
      }
    }
    const checked = grid
      .map((p) => computeMacrosPhaseAware(ANSWERS, p))
      .filter((m): m is NonNullable<typeof m> => m != null && m.energyAvailability != null);

    expect(checked.length).toBeGreaterThan(0);
    checked.forEach((m) => {
      expect(m.energyAvailability!).toBeGreaterThanOrEqual(EA_FLOOR_KCAL_PER_KG_FFM);
    });
  });

  // Without a body-fat reading there is no fat-free mass, so no floor can be
  // computed. It must decline rather than invent one — the same refusal the
  // roadmap makes when it cannot derive a weight target.
  it('declines rather than guessing when body fat is unknown', () => {
    const noBf: GoalsProfile = { ...LEAN_CUTTER, currentBodyFatPct: undefined };
    const m = computeMacrosPhaseAware(ANSWERS, noBf)!;
    expect(m).not.toBeNull();
    expect(m.energyAvailability).toBeUndefined();
    expect(m.raisedForEnergyAvailability).toBeUndefined();
  });
});