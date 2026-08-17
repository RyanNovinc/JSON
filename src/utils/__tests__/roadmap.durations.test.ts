import { deriveRoadmap, type Roadmap, type RoadmapPhase } from '../roadmap';
import type { GoalsProfile, RoutePreference } from '../goalsProfile';

/**
 * Phase durations and phase DIRECTION.
 *
 * Why this file exists, separately from roadmap.test.ts: that suite runs one
 * profile. On 12 Aug 2026 seven distinct defects were found by hand-tracing
 * eight profiles, and it caught one of them. Every defect was the same shape —
 * a phase that ran backwards, did nothing, or carried a duration that was never
 * computed — so the invariants below are written against that shape rather than
 * against specific numbers, which would just freeze today's constants.
 *
 * The one place exact numbers ARE asserted is the regression block at the
 * bottom, where a wrong number was shown to a user and the correct one is worth
 * pinning.
 */

const BASE: GoalsProfile = {
  currentWeightKg: 80,
  trainingState: 'consistent',
  sex: 'male',
  heightCm: 180,
};

const p = (over: Partial<GoalsProfile>): GoalsProfile => ({ ...BASE, ...over });

/** The literals deriveRoadmap falls back to when it cannot compute. Their
 *  presence in a cut phase means an input reached a null path. */
const FALLBACKS: Array<[number, number]> = [
  [1, 3],
  [3, 5],
  [4, 7],
];

const isFallback = (m: [number, number]) =>
  FALLBACKS.some(([lo, hi]) => m[0] === lo && m[1] === hi);

/** Where a phase STARTS: the previous phase's exit, or current body fat. */
function entryBf(phases: RoadmapPhase[], i: number, currentBf: number): number {
  return i === 0 ? currentBf : phases[i - 1].exitBodyFatPct;
}

type Case = {
  name: string;
  profile: GoalsProfile;
  route?: RoutePreference;
};

// The eight profiles hand-verified on 12 Aug, plus both non-default routes.
const CASES: Case[] = [
  {
    name: 'new lifter inside the band, goal above the floor',
    profile: p({ trainingState: 'new', currentBodyFatPct: 16, goalWeightKg: 90, goalBodyFatPct: 13 }),
  },
  {
    name: 'new lifter exactly on the band ceiling',
    profile: p({ trainingState: 'new', currentBodyFatPct: 18, goalWeightKg: 90, goalBodyFatPct: 13 }),
  },
  {
    name: 'new lifter above the band',
    profile: p({ trainingState: 'new', currentBodyFatPct: 25, goalWeightKg: 90, goalBodyFatPct: 13 }),
  },
  {
    name: 'lean lifter at the natural ceiling',
    profile: p({ currentWeightKg: 90, currentBodyFatPct: 11, goalWeightKg: 90, goalBodyFatPct: 7 }),
  },
  {
    name: 'lifter already leaner than the band floor',
    profile: p({ currentBodyFatPct: 11, goalWeightKg: 78, goalBodyFatPct: 8 }),
  },
  {
    name: 'female, above the band',
    profile: p({
      trainingState: 'new',
      sex: 'female',
      currentWeightKg: 80,
      heightCm: 165,
      currentBodyFatPct: 26,
      goalWeightKg: 62,
      goalBodyFatPct: 22,
    }),
  },
  {
    name: 'losing weight, lean mass already above target',
    profile: p({ currentBodyFatPct: 16, goalWeightKg: 70, goalBodyFatPct: 12 }),
  },
  {
    name: 'heavy male cutting hard',
    profile: p({
      currentWeightKg: 95,
      heightCm: 178,
      currentBodyFatPct: 30,
      goalWeightKg: 75,
      goalBodyFatPct: 15,
    }),
  },
  {
    name: 'lean route',
    route: 'lean',
    profile: p({ trainingState: 'new', currentBodyFatPct: 16, goalWeightKg: 90, goalBodyFatPct: 13 }),
  },
  {
    name: 'roomy route',
    route: 'roomy',
    profile: p({ trainingState: 'new', currentBodyFatPct: 16, goalWeightKg: 90, goalBodyFatPct: 13 }),
  },
];

describe('deriveRoadmap phase durations', () => {
  describe.each(CASES)('$name', ({ profile, route }) => {
    let map: Roadmap;

    beforeAll(() => {
      const r = deriveRoadmap(profile, route ?? 'balanced');
      if (!r) throw new Error('deriveRoadmap returned null for a complete profile');
      map = r;
    });

    it('produces at least one phase', () => {
      expect(map.phases.length).toBeGreaterThan(0);
    });

    /**
     * The defect class that produced "18% → 18%" and "16% → 18% (Recomp)".
     * Builds are exempt: raising body fat to the band ceiling is their job.
     */
    it('has no non-build phase that ends at or above where it starts', () => {
      const bf = profile.currentBodyFatPct!;
      map.phases.forEach((phase, i) => {
        if (phase.kind === 'build') return;
        const start = entryBf(map.phases, i, bf);
        expect({ phase: phase.kind, start, exit: phase.exitBodyFatPct }).toMatchObject({
          exit: expect.any(Number),
        });
        expect(start).toBeGreaterThan(phase.exitBodyFatPct);
      });
    });

    /**
     * A cut phase on a literal means monthsToCut or monthsToRecomp hit a null
     * path — which is exactly how the backwards phases shipped durations that
     * looked computed. Builds legitimately still use [4, 9].
     */
    it('computes durations for every cut phase rather than falling back', () => {
      map.phases
        .filter((ph) => ph.kind !== 'build')
        .forEach((phase) => {
          expect({ kind: phase.kind, estMonths: phase.estMonths, fellBack: isFallback(phase.estMonths) })
            .toMatchObject({ fellBack: false });
        });
    });

    /**
     * Greater-than-or-equal, not strictly greater: the lean route produces
     * a degenerate [1.2, 1.2] because yearsToBuild rounds to one decimal in
     * YEARS, so a short phase's true bounds (0.064 and 0.132) both flatten to
     * 0.1 before the x12. Known precision artifact, tracked separately — the
     * assertion here is that a duration exists and is not inverted.
     */
    it('gives every phase a positive, non-inverted range', () => {
      map.phases.forEach((phase) => {
        expect(phase.estMonths[0]).toBeGreaterThan(0);
        expect(phase.estMonths[1]).toBeGreaterThanOrEqual(phase.estMonths[0]);
        expect(phase.repeats).toBeGreaterThanOrEqual(1);
      });
    });

    it('never reports the invented 1 to 12 year estimate', () => {
      expect(map.estYears).not.toEqual([1, 12]);
    });

    /**
     * Scoped to the DERIVED phases. estYears computes its build portion from
     * the lean gap while build PHASES still carry the [4, 9] literal, so the
     * two disagree by construction — see the skipped test below. The non-build
     * phases and estYears share one model, so this part must hold.
     *
     * The 0.6 month slack is one decimal place of a year, which is the
     * precision estYears is rounded to.
     */
    it('is at least as long as its derived phases', () => {
      const derivedMonths = map.phases
        .filter((ph) => ph.kind !== 'build')
        .reduce((sum, ph) => sum + ph.estMonths[1] * ph.repeats, 0);
      expect(map.estYears[1] * 12).toBeGreaterThanOrEqual(derivedMonths - 0.6);
    });

    /**
     * Un-skipped 13 Aug 2026, when the cycle count became derived.
     *
     * This failed for as long as build phases carried a literal while estYears
     * derived its build portion from the gap: for a lean lifter the builds
     * alone came to 36 months against an 18 month headline, so a user adding up
     * the phase cards got double. Deriving cycles from the gap made perBuild x
     * cycles reconstruct the total exactly, and this is the check that proves
     * it stays that way.
     */
    it('is at least as long as its longest phase, including builds', () => {
      const longestMonths = Math.max(...map.phases.map((ph) => ph.estMonths[1] * ph.repeats));
      expect(map.estYears[1] * 12).toBeGreaterThanOrEqual(longestMonths - 0.6);
    });
  });
});

describe('deriveRoadmap regressions', () => {
  /**
   * The single-reveal branch held lean mass constant, so its cut was timed for
   * the fat portion only. An 80 kg woman at 26% aiming for 62 kg at 22% was
   * told 1.2 to 2.4 months for a descent that ends at ~76 kg, 14 kg short of
   * what she asked for.
   */
  it('times a cut that must shed lean against the goal WEIGHT', () => {
    const map = deriveRoadmap(
      p({
        trainingState: 'new',
        sex: 'female',
        currentWeightKg: 80,
        heightCm: 165,
        currentBodyFatPct: 26,
        goalWeightKg: 62,
        goalBodyFatPct: 22,
      }),
    )!;

    const reveal = map.phases[map.phases.length - 1];
    // Fat-only timing gives ~[1.2, 2.4]. Total-weight timing gives ~[5.8, 11.7].
    expect(reveal.estMonths[0]).toBeGreaterThan(4);
    expect(reveal.estMonths[1]).toBeGreaterThan(8);
  });

  /**
   * Crediting a returning lifter's training history has to shorten the
   * estimate, or REGAIN_MULTIPLIER is decorative. An earlier version of
   * estYears took max(summed phases, gap) and silently stopped doing this.
   */
  it('shortens the estimate when a training peak is supplied', () => {
    const base = p({
      trainingState: 'returning',
      currentBodyFatPct: 16,
      goalWeightKg: 90,
      goalBodyFatPct: 13,
    });
    const without = deriveRoadmap(base)!;
    const with_ = deriveRoadmap({ ...base, peakWeightKg: 88, peakLeanness: 'average' })!;

    expect(with_.estYears[0]).toBeLessThan(without.estYears[0]);
    expect(with_.estYears[1]).toBeLessThan(without.estYears[1]);
  });

  /**
   * A build whose start equals the band ceiling has nowhere to go. The opener
   * must become the trim that makes room.
   */
  it('opens with a trim when the user is already at the band ceiling', () => {
    const map = deriveRoadmap(
      p({ trainingState: 'consistent', currentBodyFatPct: 18, goalWeightKg: 90, goalBodyFatPct: 13 }),
    )!;
    expect(map.phases[0].exitBodyFatPct).toBeLessThan(18);
  });

  /**
   * The band floor can sit BELOW the user's goal body fat, in which case the
   * cycles already leave them leaner than they asked and a terminal "cut"
   * upward is a rounding artifact, not a phase.
   */
  it('omits the reveal when the cycles already end leaner than the goal', () => {
    const map = deriveRoadmap(
      p({ trainingState: 'new', currentBodyFatPct: 16, goalWeightKg: 90, goalBodyFatPct: 13 }),
    )!;
    const last = map.phases[map.phases.length - 1];
    expect(last.kind).not.toBe('reveal');
  });
});