// src/utils/__tests__/phasePosition.test.ts
//
// Regression tests for the phase-POSITION chain.
//
// THE BUG THESE EXIST FOR. `roadmap.phases[0]` is the opening phase — a
// DEFINITION, not a position. The middle blocks carry a `repeats` count, so the
// array is shorter than the journey and its first entry is the opener no matter
// how far along the user is. Several places read it as "the current phase", and
// every one of them described phase 1 forever:
//
//   - evaluateTransition, so automatic advancement past phase one could not
//     happen AT ALL — it kept testing a threshold the user had already crossed
//   - both prompt builders, so the AI wrote plans for a phase finished months
//     earlier
//   - the Create screen's route card
//
// The fix threads a count of confirmed transitions through all of them and
// reads `phasesAt(roadmap, count)`. These tests pin that.
//
// ASSERTED AGAINST expandPhases, NOT AGAINST NUMBERS. Every expectation below
// compares to the expanded journey rather than to a hardcoded body-fat figure,
// so a change to the roadmap's durations or bands moves the fixtures and the
// expectations together. The suite already survived durations shifting 44% by
// asserting shape rather than decimals; this keeps that. It is also why this
// file needed so little changing on 18 Aug when the roadmap went from ten
// phases to three.
//
// TWO THINGS DID CHANGE THAT DAY, and both are called out where they occur:
//   - Detection reads a WEIGHT trend, not a body-fat trend, because consumer
//     body-fat readings cannot resolve the change a phase targets. Readings
//     here are kilograms and thresholds are exitWeightKg.
//   - deriveRoadmap no longer collapses repeated cycles, so the collapsed
//     definitions and the expanded journey are now the SAME length. The test
//     that asserted collapsed < expanded is inverted below rather than deleted,
//     because the relationship still needs pinning — it just reversed.

import type { GoalsProfile } from '../goalsProfile';
import { derivePhase, phaseToVolumeTier } from '../goalsProfile';
import { deriveRoadmap } from '../roadmap';
import { expandPhases, phasesAt } from '../phaseJourney';
import { evaluateTransition, type WeightReading } from '../phaseTransition';
import { buildTrainingPhaseContext } from '../../data/planningPrompt';

/** Ryan's real profile — a multi-phase roadmap opening on a recomp. */
const MULTI: GoalsProfile = {
  currentWeightKg: 77.3,
  currentBodyFatPct: 20.4,
  goalWeightKg: 90,
  goalBodyFatPct: 13,
  trainingState: 'consistent',
  sex: 'male',
  heightCm: 185,
};

/**
 * HARD RULE 4: lean mass already meets the target, so the roadmap collapses to
 * a single terminal cut. The degenerate case for everything below — there is no
 * "next phase", which is what used to crash the workout block.
 */
const SINGLE: GoalsProfile = {
  currentWeightKg: 95,
  currentBodyFatPct: 25,
  goalWeightKg: 80,
  goalBodyFatPct: 12,
  trainingState: 'consistent',
  sex: 'male',
  heightCm: 185,
};

const roadmapFor = (p: GoalsProfile) => deriveRoadmap(p, p.routePreference ?? 'balanced')!;

/** Three readings inside the trend window, all at the same weight. The 14-day
 *  spread clears TREND_MIN_SPAN_DAYS; three flat readings make the weighted
 *  trend exactly the value passed, whatever the weighting. */
function readingsAt(weightKg: number, now = Date.now()): WeightReading[] {
  const DAY = 86_400_000;
  return [0, 7, 14].map((d) => ({
    dateISO: new Date(now - d * DAY).toISOString(),
    weightKg,
  }));
}

// ---------------------------------------------------------------------------

describe('phasesAt agrees with expandPhases at every position', () => {
  // The property everything else rests on. If this holds, the call sites are
  // consistent by construction; when it broke the first time, every consumer
  // broke silently and nothing caught it.
  it.each([
    ['multi-phase', MULTI],
    ['single-phase', SINGLE],
  ])('%s: current at n is the nth expanded phase', (_label, profile) => {
    const roadmap = roadmapFor(profile);
    const all = expandPhases(roadmap);
    expect(all.length).toBeGreaterThan(0);

    for (let n = 0; n < all.length; n++) {
      expect(phasesAt(roadmap, n).current).toEqual(all[n]);
    }
  });

  it('next at n is the phase after it, and undefined on the last', () => {
    const roadmap = roadmapFor(MULTI);
    const all = expandPhases(roadmap);

    for (let n = 0; n < all.length - 1; n++) {
      expect(phasesAt(roadmap, n).next).toEqual(all[n + 1]);
    }
    expect(phasesAt(roadmap, all.length - 1).next).toBeUndefined();
  });

  // INVERTED 18 Aug 2026. This used to assert the collapsed definitions were
  // FEWER than the expanded journey, because the middle blocks carried a
  // repeats count. deriveRoadmap no longer collapses — every phase is emitted
  // once with repeats 1 — so they now match, and expandPhases is a pass-through
  // for the common case.
  //
  // Still worth pinning: expandPhases must honour repeats if one ever returns,
  // and it must never DROP a phase. It silently dropped the build from every
  // two-phase roadmap for exactly as long as it assumed a fixed four-slot
  // shape, which is what this now catches.
  it('the expanded journey accounts for every phase and its repeats', () => {
    const roadmap = roadmapFor(MULTI);
    const expected = roadmap.phases.reduce((n, p) => n + Math.max(1, p.repeats ?? 1), 0);
    expect(expandPhases(roadmap)).toHaveLength(expected);
  });
});

describe('evaluateTransition reads the position, not the opener', () => {
  it('tests the OPENING phase threshold at zero completed', () => {
    const roadmap = roadmapFor(MULTI);
    const first = expandPhases(roadmap)[0];

    const check = evaluateTransition(MULTI, readingsAt(80), undefined, Date.now(), 0)!;
    expect(check.thresholdKg).toBe(first.exitWeightKg);
    expect(check.thresholdBodyFatPct).toBe(first.exitBodyFatPct);
    expect(check.currentKind).toBe(first.kind);
  });

  // THE HEADLINE REGRESSION. Before the fix this returned the opener's
  // threshold no matter what was passed, so a user who had finished two phases
  // was measured against a line they crossed long ago and could never advance.
  it('tests the LAST phase threshold at that many completed', () => {
    const roadmap = roadmapFor(MULTI);
    const all = expandPhases(roadmap);
    const last = all.length - 1;
    const target = all[last];

    const check = evaluateTransition(MULTI, readingsAt(80), undefined, Date.now(), last)!;
    expect(check.thresholdKg).toBe(target.exitWeightKg);
    expect(check.currentKind).toBe(target.kind);

    // The KIND must differ from the opener, or this test proves nothing.
    //
    // Deliberately not the threshold. An opening recomp exits at the band
    // CEILING and so does a build, so those two share a number while being
    // opposite phases — which is exactly why crossingId keys on
    // `kind@threshold` rather than the threshold alone. An earlier version of
    // this test asserted the numbers differed and failed against correct code.
    expect(check.currentKind).not.toBe(all[0].kind);
  });

  it('reports the NEXT phase from the position, not phases[1]', () => {
    const roadmap = roadmapFor(MULTI);
    const all = expandPhases(roadmap);

    // At position 1 the next phase is all[2], whatever the journey's length —
    // asserted relatively so this survives the roadmap reshaping again.
    const check = evaluateTransition(MULTI, readingsAt(80), undefined, Date.now(), 1)!;
    expect(check.nextKind).toBe(all[2].kind);
    expect(check.nextExitBodyFatPct).toBe(all[2].exitBodyFatPct);
  });

  // Direction is kind-dependent: a build ends when the trend RISES to its exit
  // weight, everything else when it FALLS to it. Asserted at positions PAST the
  // opener so a future simplification of exitReached fails here.
  //
  // Uses the build and the terminal reveal rather than build-and-trim: on this
  // fixture the only trim IS the opener, and the point of the test is that
  // direction is read from the phase at the position rather than from phases[0].
  it('reaches a build upward and a reveal downward', () => {
    const roadmap = roadmapFor(MULTI);
    const all = expandPhases(roadmap);

    const buildIdx = all.findIndex((p) => p.kind === 'build');
    const downIdx = all.findIndex((p, i) => i > 0 && (p.kind === 'reveal' || p.kind === 'trim'));
    expect(buildIdx).toBeGreaterThan(-1);
    expect(downIdx).toBeGreaterThan(-1);

    const build = all[buildIdx];
    const down = all[downIdx];
    expect(build.exitWeightKg).toBeDefined();
    expect(down.exitWeightKg).toBeDefined();

    // At the build's target weight, arriving from below: reached.
    expect(
      evaluateTransition(MULTI, readingsAt(build.exitWeightKg!), undefined, Date.now(), buildIdx)!
        .crossed,
    ).toBe(true);
    // Three kilos under it: not yet.
    expect(
      evaluateTransition(
        MULTI,
        readingsAt(build.exitWeightKg! - 3),
        undefined,
        Date.now(),
        buildIdx,
      )!.crossed,
    ).toBe(false);

    // The downward phase runs the other way.
    expect(
      evaluateTransition(MULTI, readingsAt(down.exitWeightKg!), undefined, Date.now(), downIdx)!
        .crossed,
    ).toBe(true);
    expect(
      evaluateTransition(
        MULTI,
        readingsAt(down.exitWeightKg! + 3),
        undefined,
        Date.now(),
        downIdx,
      )!.crossed,
    ).toBe(false);
  });

  it('never treats too few readings as a crossing', () => {
    const one = readingsAt(80).slice(0, 1);
    const check = evaluateTransition(MULTI, one, undefined, Date.now(), 1)!;
    expect(check.trendKg).toBeNull();
    expect(check.crossed).toBe(false);
  });

  // Pins the out-of-range behaviour rather than leaving it incidental.
  it('handles a count past the end of the journey without throwing', () => {
    const roadmap = roadmapFor(MULTI);
    const beyond = expandPhases(roadmap).length + 5;
    expect(() => evaluateTransition(MULTI, readingsAt(80), undefined, Date.now(), beyond)).not.toThrow();
  });
});

describe('the workout prompt describes the phase the user is on', () => {
  const ctxAt = (profile: GoalsProfile, completed: number) => {
    const phase = derivePhase(profile);
    return buildTrainingPhaseContext(
      phase,
      phaseToVolumeTier(phase),
      undefined,
      roadmapFor(profile),
      profile,
      completed,
    );
  };

  it('says phase 1 at zero completed', () => {
    expect(ctxAt(MULTI, 0)).toContain('phase 1 of');
  });

  // Before the fix this said "phase 1 of N" to everyone, so the AI wrote a
  // program for a phase the user had finished months earlier. Indexed off the
  // journey's real length now — the fixture used to expand to ten phases and
  // expands to three since deriveRoadmap stopped churning cycles.
  it('names a later phase at that many completed', () => {
    const last = expandPhases(roadmapFor(MULTI)).length - 1;
    expect(last).toBeGreaterThan(0);
    const ctx = ctxAt(MULTI, last);
    expect(ctx).toContain(`phase ${last + 1} of`);
    expect(ctx).not.toContain('phase 1 of');
  });

  it('names the kind of the phase at that position', () => {
    const all = expandPhases(roadmapFor(MULTI));
    const LABEL: Record<string, string> = {
      recomp: 'Recomp',
      build: 'Build',
      trim: 'Trim',
      reveal: 'Final cut',
    };
    const last = all.length - 1;
    const ctx = ctxAt(MULTI, last);
    expect(ctx).toContain(LABEL[all[last].kind]);
  });

  // `last.index` and the occurrence count agree only while a terminal reveal
  // exists. The total must come from expandPhases so it stays right when the
  // reveal is omitted.
  it('totals the phases the user will actually do', () => {
    const total = expandPhases(roadmapFor(MULTI)).length;
    expect(ctxAt(MULTI, 0)).toContain(`phase 1 of ${total}`);
  });

  // On the FINAL phase there is no next. The multi-phase branch assumed one
  // existed and crashed reading its kind.
  it('does not throw on the last phase, and says nothing follows', () => {
    const all = expandPhases(roadmapFor(MULTI));
    const last = all.length - 1;
    expect(() => ctxAt(MULTI, last)).not.toThrow();
    expect(ctxAt(MULTI, last)).toContain('no later phases follow');
  });

  it('handles a single-phase roadmap', () => {
    expect(() => ctxAt(SINGLE, 0)).not.toThrow();
    expect(ctxAt(SINGLE, 0)).toContain('phase 1 of 1');
  });
});