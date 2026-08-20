// src/utils/__tests__/roadmap.test.ts
//
// Pure-function tests for the roadmap model. No storage, no mocks.
//
// Several of these assert Ryan's real profile (77.3 kg, 20.4%, 185 cm, goal
// 90 kg at 13%) because it is the case the whole feature was designed around
// and the one whose numbers have been checked by hand.

import type { GoalsProfile } from '../goalsProfile';
import { FAT_PER_LEAN_KG } from '../syntheticNutritionAnswers';
import {
  leanMassKg,
  weightAtBodyFat,
  ffmiNormalised,
  classifyGoal,
  physiqueTargets,
  BODY_FAT_TIERS,
  bodyFatFromTier,
  navyBodyFat,
  bandFor,
  leanGainKgPerYear,
  lifetimeHeadroomKg,
  muscleBuiltKg,
  yearsToBuild,
  leanAtNormalisedFfmi,
  splitGap,
  deriveRoadmap,
  simulateLoss,
  monthsToCut,
  monthsToLoseWeight,
  monthsToRecomp,
  operatingRangeFor,
  MIN_RANGE_WIDTH_PCT,
} from '../roadmap';

const REAL: GoalsProfile = {
  currentWeightKg: 77.3,
  currentBodyFatPct: 20.4,
  goalWeightKg: 90,
  goalBodyFatPct: 13,
  trainingState: 'consistent',
  sex: 'male',
  heightCm: 185,
};

// ---------------------------------------------------------------------------

describe('body composition arithmetic', () => {
  it('computes lean mass', () => {
    expect(leanMassKg(77.3, 20.4)).toBeCloseTo(61.53, 2);
  });

  it('round-trips weight and body fat', () => {
    const lean = leanMassKg(90, 13);
    expect(weightAtBodyFat(lean, 13)).toBeCloseTo(90, 5);
  });

  // The overshoot rule from lean-mass-targets.md: holding lean mass constant,
  // a lower body fat means a LOWER scale weight. This is the arithmetic that
  // makes "bulk to 90 kg then cut" land nowhere near 90 kg.
  it('shows that the same lean mass weighs less at a lower body fat', () => {
    const lean = 78.3;
    expect(weightAtBodyFat(lean, 13)).toBeLessThan(weightAtBodyFat(lean, 20));
  });
});

describe('ffmiNormalised and classifyGoal', () => {
  it('applies the Kouri height correction', () => {
    // 78.3 / 1.85² = 22.88, then + 6.3 × (1.80 − 1.85) = −0.315
    expect(ffmiNormalised(78.3, 185)).toBeCloseTo(22.56, 2);
  });

  it('is a no-op at exactly 180 cm', () => {
    expect(ffmiNormalised(78.3, 180)).toBeCloseTo(78.3 / 1.8 / 1.8, 5);
  });

  // The same goal is reachable, borderline or impossible depending ONLY on
  // height. This is why GoalsProfile has to carry heightCm.
  it('calls the same lean target reachable at 185 cm and beyond at 175 cm', () => {
    expect(classifyGoal(78.3, 185, 'male').plausibility).toBe('reachable');
    expect(classifyGoal(78.3, 175, 'male').plausibility).toBe('beyond');
  });

  it('has a genuine borderline band, not a hard wall', () => {
    // 80 / 1.8² = 24.7, between the 24 limit and the 25.5 edge.
    expect(classifyGoal(80, 180, 'male').plausibility).toBe('borderline');
    // 83 / 1.8² = 25.6, past the edge.
    expect(classifyGoal(83, 180, 'male').plausibility).toBe('beyond');
  });

  it('uses lower limits for women', () => {
    // At 170 cm the Kouri correction adds 0.63, so 57 kg lean is 20.4 and 60 kg
    // is 21.4 — the female limit of 21 falls between them.
    expect(classifyGoal(57, 170, 'female').plausibility).toBe('reachable');
    expect(classifyGoal(60, 170, 'female').plausibility).toBe('borderline');
    expect(classifyGoal(70, 170, 'female').plausibility).toBe('beyond');
  });

  it('is stricter for women than men at the same lean mass and height', () => {
    expect(classifyGoal(64, 170, 'male').plausibility).toBe('reachable');
    expect(classifyGoal(64, 170, 'female').plausibility).not.toBe('reachable');
  });

  it('defaults to male limits when sex is unknown', () => {
    expect(classifyGoal(78.3, 185, undefined).plausibility).toBe('reachable');
  });
});

describe('physiqueTargets', () => {
  const t = physiqueTargets(185, 'male');

  it('returns three targets in ascending size', () => {
    expect(t).toHaveLength(3);
    expect(t[0].goalWeightKg).toBeLessThan(t[1].goalWeightKg);
    expect(t[1].goalWeightKg).toBeLessThan(t[2].goalWeightKg);
  });

  it('produces sane numbers for a 185 cm man', () => {
    expect(t[0].goalWeightKg).toBeCloseTo(81.7, 1);
    expect(t[1].goalWeightKg).toBeCloseTo(89.5, 1);
    expect(t[2].goalWeightKg).toBeCloseTo(96.6, 1);
  });

  // Every generated target must pass its own plausibility check, or the
  // feature would suggest goals it then refuses to plan.
  it('never suggests a target it would classify as beyond reach', () => {
    [160, 170, 180, 190, 200].forEach((h) => {
      (['male', 'female'] as const).forEach((sex) => {
        physiqueTargets(h, sex).forEach((p) => {
          const lean = leanMassKg(p.goalWeightKg, p.goalBodyFatPct);
          expect(classifyGoal(lean, h, sex).plausibility).not.toBe('beyond');
        });
      });
    });
  });

  it('scales down and shifts body fat up for women', () => {
    const f = physiqueTargets(185, 'female');
    expect(f[1].goalWeightKg).toBeLessThan(t[1].goalWeightKg);
    expect(f[1].goalBodyFatPct).toBe(t[1].goalBodyFatPct + 9);
  });

  it('scales with height', () => {
    expect(physiqueTargets(195, 'male')[1].goalWeightKg).toBeGreaterThan(t[1].goalWeightKg);
  });
});

describe('body fat estimation', () => {
  it('has six tiers spanning the full parametric range', () => {
    expect(BODY_FAT_TIERS).toHaveLength(6);
    expect(BODY_FAT_TIERS[0].t).toBe(0);
    expect(BODY_FAT_TIERS[5].t).toBe(1);
  });

  it('increases monotonically', () => {
    for (let i = 1; i < BODY_FAT_TIERS.length; i++) {
      expect(BODY_FAT_TIERS[i].male[0]).toBeGreaterThan(BODY_FAT_TIERS[i - 1].male[0]);
      expect(BODY_FAT_TIERS[i].female[0]).toBeGreaterThan(BODY_FAT_TIERS[i - 1].female[0]);
    }
  });

  it('puts women higher than men for the same appearance', () => {
    BODY_FAT_TIERS.forEach((t) => expect(t.female[0]).toBeGreaterThan(t.male[0]));
  });

  it('returns the midpoint of the chosen tier', () => {
    expect(bodyFatFromTier(BODY_FAT_TIERS[1], 'male')).toBe(14); // (12+15)/2 rounded
    expect(bodyFatFromTier(BODY_FAT_TIERS[1], 'female')).toBe(22); // (20+23)/2 rounded
  });

  describe('navyBodyFat', () => {
    it('estimates for a man from waist, neck and height', () => {
      const v = navyBodyFat({ sex: 'male', waistCm: 86.9, neckCm: 38, heightCm: 185 })!;
      expect(v).toBeGreaterThan(12);
      expect(v).toBeLessThan(25);
    });

    it('rises with waist, all else equal', () => {
      const lean = navyBodyFat({ sex: 'male', waistCm: 80, neckCm: 38, heightCm: 185 })!;
      const soft = navyBodyFat({ sex: 'male', waistCm: 100, neckCm: 38, heightCm: 185 })!;
      expect(soft).toBeGreaterThan(lean);
    });

    it('needs hips for women and returns undefined without them', () => {
      expect(navyBodyFat({ sex: 'female', waistCm: 72, neckCm: 32, heightCm: 165 })).toBeUndefined();
      expect(
        navyBodyFat({ sex: 'female', waistCm: 72, neckCm: 32, heightCm: 165, hipCm: 96 }),
      ).toBeGreaterThan(15);
    });

    it('refuses impossible measurements rather than returning nonsense', () => {
      expect(navyBodyFat({ sex: 'male', waistCm: 30, neckCm: 38, heightCm: 185 })).toBeUndefined();
      expect(navyBodyFat({ sex: 'male', waistCm: 0, neckCm: 38, heightCm: 185 })).toBeUndefined();
    });
  });
});

describe('bandFor', () => {
  it('never lets a surplus run above 18% for men', () => {
    (['lean', 'balanced', 'roomy'] as const).forEach((r) => {
      expect(bandFor(r, 'male').ceiling).toBeLessThanOrEqual(18);
    });
  });

  it('gives the lean route the narrowest band and the most cycles', () => {
    const lean = bandFor('lean', 'male');
    const roomy = bandFor('roomy', 'male');
    expect(lean.ceiling - lean.floor).toBeLessThan(roomy.ceiling - roomy.floor);
    expect(lean.cycles).toBeGreaterThan(roomy.cycles);
  });

  it('shifts the whole band up for women', () => {
    expect(bandFor('balanced', 'female').floor).toBeGreaterThan(bandFor('balanced', 'male').floor);
  });
});

// ── The gain model ─────────────────────────────────────────────────────────
//
// These are the tests that matter most in this file. The rate model has two
// constants — the halving rule and the FFMI-derived headroom — and NOTHING
// else was fitted. If the published magnitudes below stop falling out of those
// two, the model has drifted away from the evidence and the number on the
// user's screen is no longer defensible.

/**
 * A profile carrying `built` kg of lean mass above the untrained baseline.
 *
 * trainingState defaults to 'new' so the curve-reproduction tests measure
 * the RAW curve — pass a position-matched state when probing deeper
 * positions, or the state cap and the conflict widening fire inside tests
 * that exist to measure the curve itself.
 */
function profileWithBuilt(
  builtKg: number,
  heightCm = 185,
  trainingState: GoalsProfile['trainingState'] = 'new',
): GoalsProfile {
  const lean = leanAtNormalisedFfmi(19, heightCm) + builtKg;
  const bodyFatPct = 15;
  return {
    currentWeightKg: lean / (1 - bodyFatPct / 100),
    currentBodyFatPct: bodyFatPct,
    trainingState,
    sex: 'male',
    heightCm,
  };
}

const midpoint = (r: [number, number]) => (r[0] + r[1]) / 2;

describe('lifetimeHeadroomKg', () => {
  // Cross-check: computed from height and FFMI, it must land inside the
  // population figure of 18-23 kg above untrained, which was arrived at a
  // completely different way. Two unrelated methods agreeing is the main
  // reason to trust this constant at all.
  it('lands inside the published 18-23 kg lifetime range for a 185 cm man', () => {
    const L = lifetimeHeadroomKg(185, 'male');
    expect(L).toBeGreaterThanOrEqual(18);
    expect(L).toBeLessThanOrEqual(23);
  });

  it('scales with height', () => {
    expect(lifetimeHeadroomKg(195, 'male')).toBeGreaterThan(lifetimeHeadroomKg(175, 'male'));
  });

  // Deriving L from the baseline-to-ceiling span is what removes the need for
  // a separate female rate multiplier: a smaller span gives a slower curve.
  it('is smaller for women, with no separate multiplier applied', () => {
    expect(lifetimeHeadroomKg(185, 'female')).toBeLessThan(lifetimeHeadroomKg(185, 'male'));
  });
});

describe('the curve reproduces the published year-by-year magnitudes', () => {
  it('year one falls in the published 7-11 kg beginner band', () => {
    const mid = midpoint(leanGainKgPerYear(profileWithBuilt(0))!);
    expect(mid).toBeGreaterThanOrEqual(7);
    expect(mid).toBeLessThanOrEqual(11);
  });

  // The halving rule is the model's only shape assumption, so assert it
  // directly — but on the LOWER bound of each range. The upper bound is capped
  // at the DEXA ceiling, and comparing a capped figure against an uncapped one
  // would be measuring the cap rather than the curve.
  it('year two is half of year one', () => {
    const L = lifetimeHeadroomKg(185, 'male');
    const y1 = leanGainKgPerYear(profileWithBuilt(0))![0];
    const y2 = leanGainKgPerYear(profileWithBuilt(L * 0.5, 185, 'consistent'))![0];
    // Asserted as a RATIO. Both figures are rounded to one decimal, and
    // comparing them directly puts the difference on the tolerance boundary —
    // it would fail on rounding rather than on the model being wrong.
    expect(y2 / y1).toBeCloseTo(0.5, 1);
  });

  it('year four falls in the published 1-2 kg advanced band', () => {
    const L = lifetimeHeadroomKg(185, 'male');
    const builtByYear3 = L * (1 - Math.pow(0.5, 3));
    const mid = midpoint(leanGainKgPerYear(profileWithBuilt(builtByYear3, 185, 'advanced'))!);
    expect(mid).toBeGreaterThanOrEqual(1);
    expect(mid).toBeLessThanOrEqual(2);
  });

  it('never exceeds the DEXA-observed ceiling of ~0.23 kg per week', () => {
    const hi = leanGainKgPerYear(profileWithBuilt(0))![1];
    expect(hi).toBeLessThanOrEqual(0.23 * 52);
  });

  it('always returns a range, never a single figure', () => {
    const [lo, hi] = leanGainKgPerYear(profileWithBuilt(0))!;
    expect(hi).toBeGreaterThan(lo);
  });

  it('returns null without a height, rather than guessing', () => {
    const { heightCm, ...noHeight } = profileWithBuilt(0);
    expect(leanGainKgPerYear(noHeight as GoalsProfile)).toBeNull();
  });
});

describe('muscleBuiltKg', () => {
  // The correction that started this rewrite. Training HISTORY is not muscle
  // built: someone who trained and detrained carries an untrained person's
  // lean mass, and must be given an untrained person's rate.
  it('is zero for someone at or below the untrained baseline, whatever their training state', () => {
    expect(muscleBuiltKg({ ...REAL, trainingState: 'advanced' })).toBe(0);
  });

  it('rises with lean mass above the baseline', () => {
    expect(muscleBuiltKg(profileWithBuilt(10))).toBeCloseTo(10, 0);
  });

  it('is undefined without body fat or height', () => {
    const { currentBodyFatPct, ...noBf } = REAL;
    expect(muscleBuiltKg(noBf as GoalsProfile)).toBeUndefined();
  });
});

describe('yearsToBuild', () => {
  // EXPECTED MOVEMENT under the trainingState cap (13 Aug): the REAL profile
  // reports 'consistent' with built ≈ 0, so its rate is capped at 0.28 × L ≈
  // 5.7 kg/yr against a curve rate of 10.3 — the mid build time moves from
  // ~2.4 to ~3.2 years, range ≈ [2.4, 4.9]. The pre-cap number promised a
  // 10 kg novice year that "still adding weight most weeks" does not support.
  it('pins the real profile at roughly 2.5 to 5 years of building', () => {
    const [lo, hi] = yearsToBuild(16.8, REAL)!;
    expect(lo).toBeGreaterThan(2);
    expect(lo).toBeLessThan(3);
    expect(hi).toBeGreaterThan(4);
    expect(hi).toBeLessThan(5.5);
  });

  it('takes longer for someone who has already used most of their headroom', () => {
    const early = midpoint(yearsToBuild(3, profileWithBuilt(0))!);
    const late = midpoint(yearsToBuild(3, profileWithBuilt(15))!);
    expect(late).toBeGreaterThan(early);
  });

  // A goal beyond what the frame has left is a real answer, not an error.
  it('returns null when the gap exceeds the remaining headroom', () => {
    expect(yearsToBuild(30, REAL)).toBeNull();
  });

  it('returns null without a height', () => {
    const { heightCm, ...noHeight } = REAL;
    expect(yearsToBuild(10, noHeight as GoalsProfile)).toBeNull();
  });
});

describe('splitGap', () => {
  it('treats the whole gap as new muscle when no peak is known', () => {
    expect(splitGap(REAL, 16.8)).toEqual({ regainKg: 0, novelKg: 16.8 });
  });

  it('splits out regain when a previous peak is known', () => {
    const withPeak: GoalsProfile = { ...REAL, peakWeightKg: 85 };
    const { regainKg, novelKg } = splitGap(withPeak, 16.8);
    expect(regainKg).toBeGreaterThan(5);
    expect(regainKg).toBeLessThan(8);
    expect(regainKg + novelKg).toBeCloseTo(16.8, 1);
  });

  it('credits more regain to someone who was leaner at their peak', () => {
    const lean = splitGap({ ...REAL, peakWeightKg: 85, peakLeanness: 'lean' }, 16.8);
    const soft = splitGap({ ...REAL, peakWeightKg: 85, peakLeanness: 'soft' }, 16.8);
    expect(lean.regainKg).toBeGreaterThan(soft.regainKg);
  });

  it('never credits more regain than the gap itself', () => {
    const { regainKg } = splitGap({ ...REAL, peakWeightKg: 120 }, 16.8);
    expect(regainKg).toBeLessThanOrEqual(16.8);
  });

  it('ignores a peak lighter than current weight', () => {
    expect(splitGap({ ...REAL, peakWeightKg: 70 }, 16.8).regainKg).toBe(0);
  });
});

// ── The partition loop ─────────────────────────────────────────────────────
//
// First duration assertions in this file. Every bug found on 12 Aug lived in
// the gap where no test asserted a duration; these close it for the loss side.

describe('the partition loop', () => {
  // Ryan's real starting composition: 77.3 kg at 20.4%.
  const LEAN = 61.5;
  const FAT = 15.8;

  // Garthe 2011's slow group GAINED lean mass while losing weight at 0.7%/wk.
  // At the slow bound the loss-side deficit sits under the 500 kcal/day
  // ceiling for typical bodyweights (~425 kcal/day here), so the simulation
  // must reproduce that direction rather than assert it. This is the one
  // independent cross-check the loop has — if it fails, the coupling between
  // leanFractionOfLoss, the deficit and leanGainFactor has drifted.
  it('reproduces the Garthe slow-group direction: lean rises during a slow cut', () => {
    const r = simulateLoss({
      leanKg: LEAN,
      fatKg: FAT,
      targetBfPct: 15,
      rateFraction: 0.005,
      weeklyGainKg: 0.15,
    });
    expect(r).not.toBeNull();
    expect(r!.leanKg).toBeGreaterThan(LEAN);
  });

  it('loses lean during a fast cut, where the deficit clears the ceiling', () => {
    const r = simulateLoss({
      leanKg: LEAN,
      fatKg: FAT,
      targetBfPct: 15,
      rateFraction: 0.01,
      weeklyGainKg: 0.15,
    });
    expect(r).not.toBeNull();
    expect(r!.leanKg).toBeLessThan(LEAN);
  });

  // 60 kg of lean cannot weigh 55 kg at any body fat. The 13 Aug version
  // simulated through negative fat and reported the weeks it took to fail.
  it('returns null for a goal weight below what the lean mass can weigh', () => {
    expect(monthsToLoseWeight(60, 30, 10, 55)).toBeNull();
  });

  // The safety rail is a rail, not a result. Before this test the loop
  // returned { weeks: 1040 } here and the caller rounded it into a 239-month
  // phase card.
  it('returns null rather than an estimate when the rail is hit', () => {
    const r = simulateLoss({
      leanKg: LEAN,
      fatKg: FAT,
      targetBfPct: 10,
      rateFraction: 0.00001,
      weeklyGainKg: 0,
    });
    expect(r).toBeNull();
  });

  // "No phase needed" and "cannot compute" are different answers.
  it('reports zero weeks, not null, when the targets are already met', () => {
    const r = simulateLoss({
      leanKg: LEAN,
      fatKg: 7, // 10.2% body fat, already under the 15% target
      targetBfPct: 15,
      rateFraction: 0.005,
      weeklyGainKg: 0,
    });
    expect(r).not.toBeNull();
    expect(r!.weeks).toBe(0);
  });

  // The balanced-band trim on the real profile: fast bound near 1.8 months,
  // slow near 3–3.5. Bounds are deliberately loose — this pins the magnitude
  // and the ordering, not the decimal.
  it('times the balanced band trim at roughly two to four months', () => {
    const r = monthsToCut(LEAN, 18, 12, REAL);
    expect(r).not.toBeNull();
    const [lo, hi] = r!;
    expect(lo).toBeGreaterThan(1);
    expect(lo).toBeLessThan(3);
    expect(hi).toBeGreaterThan(lo);
    expect(hi).toBeLessThan(5);
  });

  it('derives a positive ascending range for a recomp', () => {
    const r = monthsToRecomp(REAL, 77.3, 20.4, 18);
    expect(r).not.toBeNull();
    expect(r![0]).toBeGreaterThan(0);
    expect(r![1]).toBeGreaterThan(r![0]);
  });
});

// ── The trainingState cap ──────────────────────────────────────────────────
//
// min(curve rate, state cap): the curve bounds what the frame has left, the
// state bounds demonstrated progress, and state can only ever SLOW a rate.

describe('the trainingState cap', () => {
  const L = lifetimeHeadroomKg(185, 'male');

  // The common path, not an edge case: FFMI_UNTRAINED is a population
  // median, so built clamps to zero for roughly half of untrained men and
  // the curve hands them the full novice rate whatever they answered. The
  // cap turns "half of users get the novice rate regardless of state" into
  // "users get at most their state's pace".
  it('caps a consistent reporter with no banked muscle at 0.28 × L', () => {
    const r = leanGainKgPerYear(profileWithBuilt(0, 185, 'consistent'))!;
    expect(midpoint(r)).toBeCloseTo(0.28 * L, 1);
  });

  it('caps an advanced reporter with no banked muscle at 0.10 × L', () => {
    const r = leanGainKgPerYear(profileWithBuilt(0, 185, 'advanced'))!;
    expect(midpoint(r)).toBeCloseTo(0.1 * L, 1);
  });

  // Position-matched users pass UNDER their own cap — the cap only bites
  // when state and FFMI position disagree.
  it('leaves a position-matched advanced lifter untouched', () => {
    const builtByYear3 = L * (1 - Math.pow(0.5, 3));
    const capped = midpoint(leanGainKgPerYear(profileWithBuilt(builtByYear3, 185, 'advanced'))!);
    const raw = midpoint(leanGainKgPerYear(profileWithBuilt(builtByYear3, 185, 'new'))!);
    expect(capped).toBeCloseTo(raw, 0);
  });

  // Two estimators disagreeing by 2×+ means the model knows less, and the
  // interval must say so: ±35% → ±50% on a two-tier conflict.
  it('widens the range on a two-tier state/position conflict', () => {
    const conflicted = leanGainKgPerYear(profileWithBuilt(0, 185, 'advanced'))!;
    const adjacent = leanGainKgPerYear(profileWithBuilt(0, 185, 'consistent'))!;
    expect(conflicted[1] / conflicted[0]).toBeGreaterThan(adjacent[1] / adjacent[0]);
  });

  // The muscular novice, the other two-tier conflict: the rate stays
  // headroom-bounded — state never RAISES a rate — and the interval widens
  // instead, with his true outcome likely toward the fast edge.
  it('widens for a muscular novice without raising the rate', () => {
    const muscular = leanGainKgPerYear(profileWithBuilt(L * 0.9, 185, 'new'))!;
    const matched = leanGainKgPerYear(profileWithBuilt(L * 0.9, 185, 'advanced'))!;
    expect(midpoint(muscular)).toBeCloseTo(midpoint(matched), 0);
    expect(muscular[1] / muscular[0]).toBeGreaterThan(matched[1] / matched[0]);
  });

  // The regain exemption tripwire. Same body, returning-with-peak must beat
  // consistent: both cap the NOVEL portion at the same 0.28 × L, so any
  // difference is the muscle-memory credit surviving the cap. If the state
  // cap ever leaks into the regain rate, this is the assertion that trips.
  it('keeps the regain credit outside the cap: returning with a peak beats consistent', () => {
    const consistentP: GoalsProfile = {
      currentWeightKg: 85,
      currentBodyFatPct: 20,
      goalWeightKg: 90,
      goalBodyFatPct: 13,
      sex: 'male',
      heightCm: 185,
      trainingState: 'consistent',
    };
    const returningP: GoalsProfile = {
      ...consistentP,
      trainingState: 'returning',
      peakWeightKg: 88,
      peakLeanness: 'average',
    };
    const consistent = deriveRoadmap(consistentP)!.estYears;
    const returning = deriveRoadmap(returningP)!.estYears;
    expect(returning[0]).toBeLessThan(consistent[0]);
    expect(returning[1]).toBeLessThan(consistent[1]);
  });
});

describe('deriveRoadmap', () => {
  it('returns null without a goal', () => {
    expect(deriveRoadmap({ currentWeightKg: 80, trainingState: 'new' })).toBeNull();
  });

  it('computes the real profile end to end', () => {
    const r = deriveRoadmap(REAL)!;
    expect(r.leanNowKg).toBeCloseTo(61.5, 1);
    expect(r.leanTargetKg).toBeCloseTo(78.3, 1);
    expect(r.gapKg).toBeCloseTo(16.8, 1);
    expect(r.plausibility).toBe('reachable');
    expect(r.ffmi).toBeCloseTo(22.56, 1);
  });

  // WAS 'opens with a recomp when the user is above the band ceiling'. The
  // recomp opener went with the 17 Aug fat-per-lean correction: a recomp is the
  // SLOWEST way to shed fat (monthsToRecomp 20->14 is [6.9, 12.3] against
  // monthsToCut's [2.1, 3.5]) and it existed only to reach a band ceiling that
  // the prescribed surplus never pushes anyone past.
  //
  // What phase-selection.md actually forbids is a cut presented as a
  // PREREQUISITE for building. That rule is now kept by the ORDER being the
  // user's, not by the opener's kind — so this asserts the same protection at
  // its new site. If build_first ever stops producing a build opener, the cut
  // has quietly become mandatory again.
  it('never forces a cut first — the order belongs to the user', () => {
    const cutFirst = deriveRoadmap({ ...REAL, phaseOrder: 'cut_first' })!;
    const buildFirst = deriveRoadmap({ ...REAL, phaseOrder: 'build_first' })!;
    expect(cutFirst.phases[0].kind).toBe('trim');
    expect(buildFirst.phases[0].kind).toBe('build');
    // Unasked, someone 7.4 points above their goal defaults to cutting first.
    expect(deriveRoadmap(REAL)!.phases[0].kind).toBe('trim');
  });

  it('opens with a build when already inside the band', () => {
    const r = deriveRoadmap({ ...REAL, currentBodyFatPct: 14 })!;
    expect(r.phases[0].kind).toBe('build');
  });

  // D0 (9 Aug 2026): the opener is derivePhase's answer, mapped — the roadmap
  // can no longer disagree with the badge or the prompts. The old opener was
  // a band-only two-branch guess with NO LOSING PATH: this user, who asked to
  // lose 10 kg, was told to hold their weight (recomp).
  it('opens with a trim for a losing user, never a recomp', () => {
    const losing: GoalsProfile = {
      currentWeightKg: 90,
      currentBodyFatPct: 25,
      goalWeightKg: 80,
      goalBodyFatPct: 12,
      trainingState: 'consistent',
      sex: 'male',
      heightCm: 185,
    };
    const r = deriveRoadmap(losing)!;
    expect(r.phases[0].kind).toBe('trim');
    expect(r.phases[0].exitBodyFatPct).toBe(12); // per-kind exit: trims end at the floor
  });

  // lean-mass-targets.md HARD RULE 4, finally implemented: current lean mass
  // already at or above target with body fat above goal means the muscle is
  // built — the plan is one terminal cut, not build cycles they don't need.
  it('collapses to a single reveal when lean mass already meets the target', () => {
    const built: GoalsProfile = {
      currentWeightKg: 95, // 71.25 kg lean at 25%
      currentBodyFatPct: 25,
      goalWeightKg: 80, // 70.4 kg lean at 12% — already banked
      goalBodyFatPct: 12,
      trainingState: 'consistent',
      sex: 'male',
      heightCm: 185,
    };
    const r = deriveRoadmap(built)!;
    expect(r.phases).toHaveLength(1);
    expect(r.phases[0].kind).toBe('reveal');
    expect(r.phases[0].exitBodyFatPct).toBe(12);
    expect(r.gapKg).toBeLessThanOrEqual(0);
  });

  // The route ARGUMENT overrides the stored routePreference for the opener,
  // so scrubbing between routes on the route screen previews each candidate
  // route's own opener — not the stored one's.
  //
  // REWRITTEN 20 Aug 2026, when the range became the user's. The FLOOR is no
  // longer a route figure at all: it is `operatingRangeFor`'s resolved bottom,
  // read from the profile, so it is identical whichever route is previewed.
  // This fixture has nothing to shed before building, so both resolve to the
  // user's current 16%.
  //
  // Was: expect(lean.band).toEqual({ floor: 12, ceiling: 15 }) and roomy
  // { floor: 14, ceiling: 18 }. What the route still previews is the FALLBACK
  // CEILING for a profile that has not set one, so the test's intent survives
  // on that half — and the floors being equal is now itself the assertion
  // worth making, because a floor that still moved with the route would mean
  // the retirement had not happened.
  it('previews the candidate route, not the stored routePreference', () => {
    const p: GoalsProfile = { ...REAL, currentBodyFatPct: 16, routePreference: 'roomy' };
    const lean = deriveRoadmap(p, 'lean')!;
    const roomy = deriveRoadmap(p, 'roomy')!;
    expect(lean.band.ceiling).toBe(15);
    expect(roomy.band.ceiling).toBe(18);
    expect(lean.band.floor).toBe(roomy.band.floor);
    // The opener's KIND no longer separates the routes — both build, because
    // neither has fat to shed before building. What still separates them is
    // that roomy maps to `bulk` (0.5 kg fat per kg lean against lean_bulk's
    // 0.2), so its build actually reaches the ceiling and the rail splits it.
    expect(roomy.phases.length).toBeGreaterThan(lean.phases.length);
  });

  // The two edges of the range are now SET rather than derived, and this pins
  // the three rules that govern them. Added 20 Aug 2026 with the range.
  it('resolves the operating range from the profile, not the route', () => {
    const p: GoalsProfile = { ...REAL, preBuildBf: 13, ceilingBf: 16 };
    const r = operatingRangeFor(p, 'balanced')!;
    expect(r.bottom).toBe(13);
    expect(r.top).toBe(16);
    // Same range under a different route argument.
    expect(operatingRangeFor(p, 'lean')!.top).toBe(16);
    // The stop is sex-based and the bottom cannot go under it.
    expect(operatingRangeFor({ ...p, preBuildBf: 5 }, 'balanced')!.bottom).toBe(r.leanStop);
    // A top closer than MIN_RANGE_WIDTH_PCT is widened, never accepted.
    expect(operatingRangeFor({ ...p, ceilingBf: 13.5 }, 'balanced')!.top).toBe(
      13 + MIN_RANGE_WIDTH_PCT,
    );
    // No upper clamp: a ceiling above where the build tops out is allowed
    // through, because refusing it would be choosing for the user.
    expect(operatingRangeFor({ ...p, ceilingBf: 30 }, 'balanced')!.top).toBe(30);
  });

  // The suggestion is a RANGE, not a width added to wherever the user happens
  // to have left the bottom. Added 20 Aug 2026, after a bottom nudged to 15.5
  // produced "the suggested 15.5 to 18.5%".
  it('suggests both ends, independent of where the user left the bottom', () => {
    const a = operatingRangeFor({ ...REAL, preBuildBf: 15.5 }, 'balanced')!;
    const b = operatingRangeFor({ ...REAL, preBuildBf: 12 }, 'balanced')!;
    expect(a.suggestedBottom).toBe(b.suggestedBottom);
    expect(a.suggestedTop).toBe(b.suggestedTop);
    expect(a.suggestedTop - a.suggestedBottom).toBeGreaterThanOrEqual(MIN_RANGE_WIDTH_PCT);
    // And it is a value the control could actually be set to.
    expect(a.suggestedBottom).toBeGreaterThanOrEqual(a.leanStop);
    expect(a.suggestedBottom).toBeLessThanOrEqual(Math.max(a.leanStop, a.topStop));
  });

  // Nothing to shed means no range to choose. Cycling someone toward a goal
  // body fat ABOVE where they stand trims them back to today's leanness on the
  // way, and the plan then ends below the goal because the terminal cut only
  // fires on an overshoot.
  it('offers no range to a user whose goal body fat is above their own', () => {
    const p: GoalsProfile = { ...REAL, currentBodyFatPct: 14, goalBodyFatPct: 18 };
    expect(operatingRangeFor(p, 'balanced')).toBeNull();
    const r = deriveRoadmap(p, 'balanced')!;
    expect(r.phases.filter((ph) => ph.kind === 'trim').length).toBe(0);
  });

  // The order and the range are ORTHOGONAL, and this is the test that says so.
  // Build-first used to be expressed by parking the bottom at current body fat,
  // which silently moved every mid-build trim with it. Added 20 Aug 2026.
  it('keeps the range the user set whichever order they choose', () => {
    const base: GoalsProfile = { ...REAL, preBuildBf: 13, ceilingBf: 16 };
    const cut = deriveRoadmap({ ...base, phaseOrder: 'cut_first' }, 'balanced')!;
    const build = deriveRoadmap({ ...base, phaseOrder: 'build_first' }, 'balanced')!;
    // Same range on both, read back off the plan.
    expect(cut.band).toEqual(build.band);
    expect(cut.band.floor).toBe(13);
    expect(cut.band.ceiling).toBe(16);
    // Only the opening cut differs.
    expect(cut.phases[0].kind).toBe('trim');
    expect(build.phases[0].kind).toBe('build');
  });

  // A build that lands exactly on the ceiling used to leave a rounding crumb of
  // lean behind, and the rail inserted a whole trim and rebuild for it — which
  // finished the plan at the BOTTOM of the range instead of the goal. The
  // remainder guard is the fix; this pins the outcome rather than the guard.
  it('does not interrupt a build for a remainder too small to be a phase', () => {
    const p: GoalsProfile = { ...REAL, preBuildBf: 12, ceilingBf: 15 };
    const r = deriveRoadmap(p, 'balanced')!;
    const last = r.phases[r.phases.length - 1];
    expect(last.exitBodyFatPct).toBeLessThanOrEqual(REAL.goalBodyFatPct! + 0.25);
    r.phases.forEach((ph) => {
      if (ph.kind === 'build') expect(ph.estMonths[1]).toBeGreaterThan(0);
    });
  });

  // The KIND of the final phase now depends on the order — cutting first ends
  // on the build that lands on the goal, building first ends on a reveal. The
  // invariant that survives, and the one that actually matters, is that the
  // plan finishes exactly where the user asked.
  it('ends at the goal body fat whichever order is chosen', () => {
    (['cut_first', 'build_first'] as const).forEach((phaseOrder) => {
      const r = deriveRoadmap({ ...REAL, phaseOrder })!;
      expect(r.phases[r.phases.length - 1].exitBodyFatPct).toBe(13);
    });
  });

  it('gives every phase a range, never a fixed duration', () => {
    deriveRoadmap(REAL)!.phases.forEach((p) => {
      expect(p.estMonths[1]).toBeGreaterThan(p.estMonths[0]);
    });
  });

  it('estimates the whole journey as a range in years', () => {
    const [lo, hi] = deriveRoadmap(REAL)!.estYears;
    expect(lo).toBeGreaterThan(1);
    expect(hi).toBeGreaterThan(lo);
  });

  it('shortens the estimate when regain is available', () => {
    const without = deriveRoadmap(REAL)!.estYears;
    const with_ = deriveRoadmap({ ...REAL, peakWeightKg: 85 })!.estYears;
    expect(with_[0]).toBeLessThan(without[0]);
    expect(with_[1]).toBeLessThan(without[1]);
  });

  // WAS 'gives the lean route more cycles than the roomy one'. Cycle count no
  // longer comes from band width, which is the whole 17 Aug correction, so
  // that assertion tested the defect rather than the behaviour.
  //
  // THIS IS THE INVARIANT THAT REPLACED IT, and it is the most important one in
  // the file. A build's fat cost comes from FAT_PER_LEAN_KG (0.2 on a lean
  // bulk), never from the band. The old model ran every build floor -> ceiling,
  // which implied 2.65 kg of fat per kg of lean on the balanced route against
  // the 0.2 the nutrition side actually prescribes — so the roadmap drew a plan
  // the macros would never produce, and scheduled four trims that could never
  // fire. If a lean-bulk build ever exits at the ceiling again, this trips.
  it('sizes a lean-bulk build from the surplus, not the band width', () => {
    // REWRITTEN 18 Aug when FAT_PER_LEAN_KG rose to 0.5. The old assertion was
    // that a build exits well BELOW the ceiling, which only held because 0.2
    // made body fat asymptote at 16.7% and put an 18% ceiling out of reach. At
    // 0.5 the asymptote is 33%, so a build legitimately approaches the ceiling
    // and that assertion would fail for the right reason.
    //
    // This tests the actual invariant instead: the fat a build adds is
    // leanGained x FAT_PER_LEAN_KG. Under the old band-driven model every build
    // ran floor to ceiling regardless, which for the balanced route implied
    // 2.65 kg of fat per kg of lean against the 0.5 the kitchen prescribes. If
    // the band ever drives fat gain again, this ratio moves and this trips.
    const r = deriveRoadmap(REAL)!;
    const build = r.phases.find((p) => p.kind === 'build')!;
    const before = r.phases[r.phases.indexOf(build) - 1];
    const leanAt = r.leanNowKg!;
    const fatAtBf = (lean: number, bf: number) => (lean * (bf / 100)) / (1 - bf / 100);
    const fatBefore = fatAtBf(leanAt, before.exitBodyFatPct);
    const leanAfter = leanAt + r.gapKg!;
    const fatAfter = fatAtBf(leanAfter, build.exitBodyFatPct);
    const impliedRatio = (fatAfter - fatBefore) / r.gapKg!;
    expect(impliedRatio).toBeCloseTo(FAT_PER_LEAN_KG.lean_bulk, 1);
  });

  it('still produces a plan without body fat, just without the gap', () => {
    const { currentBodyFatPct, ...noBf } = REAL;
    const r = deriveRoadmap(noBf as GoalsProfile)!;
    expect(r.leanTargetKg).toBeCloseTo(78.3, 1);
    expect(r.gapKg).toBeUndefined();
    expect(r.phases.length).toBeGreaterThan(0);
  });

  it('omits plausibility rather than guessing when height is unknown', () => {
    const { heightCm, ...noHeight } = REAL;
    const r = deriveRoadmap(noHeight as GoalsProfile)!;
    expect(r.plausibility).toBeUndefined();
    expect(r.ffmi).toBeUndefined();
  });
});