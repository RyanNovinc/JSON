// src/utils/__tests__/roadmap.test.ts
//
// Pure-function tests for the roadmap model. No storage, no mocks.
//
// Several of these assert Ryan's real profile (77.3 kg, 20.4%, 185 cm, goal
// 90 kg at 13%) because it is the case the whole feature was designed around
// and the one whose numbers have been checked by hand.

import type { GoalsProfile } from '../goalsProfile';
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

/** A profile carrying `built` kg of lean mass above the untrained baseline. */
function profileWithBuilt(builtKg: number, heightCm = 185): GoalsProfile {
  const lean = leanAtNormalisedFfmi(19, heightCm) + builtKg;
  const bodyFatPct = 15;
  return {
    currentWeightKg: lean / (1 - bodyFatPct / 100),
    currentBodyFatPct: bodyFatPct,
    trainingState: 'consistent',
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
    const y2 = leanGainKgPerYear(profileWithBuilt(L * 0.5))![0];
    // Asserted as a RATIO. Both figures are rounded to one decimal, and
    // comparing them directly puts the difference on the tolerance boundary —
    // it would fail on rounding rather than on the model being wrong.
    expect(y2 / y1).toBeCloseTo(0.5, 1);
  });

  it('year four falls in the published 1-2 kg advanced band', () => {
    const L = lifetimeHeadroomKg(185, 'male');
    const builtByYear3 = L * (1 - Math.pow(0.5, 3));
    const mid = midpoint(leanGainKgPerYear(profileWithBuilt(builtByYear3))!);
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
  it('pins the real profile at roughly 2 to 4 years of building', () => {
    const [lo, hi] = yearsToBuild(16.8, REAL)!;
    expect(lo).toBeGreaterThan(1.5);
    expect(hi).toBeLessThan(4.5);
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

  // Above the band ceiling, the opening phase must be a recomp — never a cut.
  // phase-selection.md forbids presenting a cut as a prerequisite for
  // building, and the band rule forbids a surplus above the ceiling. Recomp
  // is the only phase that satisfies both.
  it('opens with a recomp when the user is above the band ceiling', () => {
    const r = deriveRoadmap(REAL)!; // 20.4% against a balanced ceiling of 18
    expect(r.phases[0].kind).toBe('recomp');
    expect(r.phases.some((p) => p.kind === 'trim' && p.index === 1)).toBe(false);
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
  it('previews the candidate route, not the stored routePreference', () => {
    const p: GoalsProfile = { ...REAL, currentBodyFatPct: 16, routePreference: 'roomy' };
    expect(deriveRoadmap(p, 'lean')!.phases[0].kind).toBe('recomp'); // 16 > lean ceiling 15
    expect(deriveRoadmap(p, 'roomy')!.phases[0].kind).toBe('build'); // 16 ≤ roomy ceiling 18
  });

  it('ends on the reveal at the goal body fat', () => {
    const r = deriveRoadmap(REAL)!;
    const last = r.phases[r.phases.length - 1];
    expect(last.kind).toBe('reveal');
    expect(last.exitBodyFatPct).toBe(13);
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

  it('gives the lean route more cycles than the roomy one', () => {
    const lean = deriveRoadmap(REAL, 'lean')!;
    const roomy = deriveRoadmap(REAL, 'roomy')!;
    const cyclesOf = (r: typeof lean) => r.phases.find((p) => p.kind === 'trim')!.repeats;
    expect(cyclesOf(lean)).toBeGreaterThan(cyclesOf(roomy));
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