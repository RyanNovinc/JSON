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
// asserting shape rather than decimals; this keeps that.

import type { GoalsProfile } from '../goalsProfile';
import { derivePhase, phaseToVolumeTier } from '../goalsProfile';
import { deriveRoadmap } from '../roadmap';
import { expandPhases, phasesAt } from '../phaseJourney';
import { evaluateTransition, type BodyFatReading } from '../phaseTransition';
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

/** Three readings inside the trend window, all at the same value. */
function readingsAt(bodyFatPct: number, now = Date.now()): BodyFatReading[] {
  const DAY = 86_400_000;
  return [0, 7, 14].map((d) => ({
    dateISO: new Date(now - d * DAY).toISOString(),
    bodyFatPct,
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

  // roadmap.phases is SHORTER than the journey — that difference is the whole
  // reason phases[0] was never a position. If these ever match, the collapsing
  // has gone and every "read phases[0]" bug becomes invisible again.
  it('the collapsed definitions are fewer than the expanded journey', () => {
    const roadmap = roadmapFor(MULTI);
    expect(roadmap.phases.length).toBeLessThan(expandPhases(roadmap).length);
  });
});

describe('evaluateTransition reads the position, not the opener', () => {
  it('tests the OPENING phase threshold at zero completed', () => {
    const roadmap = roadmapFor(MULTI);
    const first = expandPhases(roadmap)[0];

    const check = evaluateTransition(MULTI, readingsAt(18), undefined, Date.now(), 0)!;
    expect(check.thresholdPct).toBe(first.exitBodyFatPct);
    expect(check.currentKind).toBe(first.kind);
  });

  // THE HEADLINE REGRESSION. Before the fix this returned the opener's
  // threshold no matter what was passed, so a user who had finished two phases
  // was measured against a line they crossed long ago and could never advance.
  it('tests the THIRD phase threshold at two completed', () => {
    const roadmap = roadmapFor(MULTI);
    const all = expandPhases(roadmap);
    const third = all[2];

    const check = evaluateTransition(MULTI, readingsAt(18), undefined, Date.now(), 2)!;
    expect(check.thresholdPct).toBe(third.exitBodyFatPct);
    expect(check.currentKind).toBe(third.kind);

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

    const check = evaluateTransition(MULTI, readingsAt(18), undefined, Date.now(), 2)!;
    expect(check.nextKind).toBe(all[3].kind);
    expect(check.nextExitBodyFatPct).toBe(all[3].exitBodyFatPct);
  });

  // Direction is kind-dependent: a build ends when the trend RISES to its
  // exit, everything else when it FALLS to it. Asserted at a position past the
  // opener so a future simplification of exitCrossed fails here.
  it('crosses a build phase upward and a trim phase downward', () => {
    const roadmap = roadmapFor(MULTI);
    const all = expandPhases(roadmap);

    const buildIdx = all.findIndex((p) => p.kind === 'build');
    const trimIdx = all.findIndex((p, i) => i > 0 && p.kind === 'trim');
    expect(buildIdx).toBeGreaterThan(-1);
    expect(trimIdx).toBeGreaterThan(-1);

    const build = all[buildIdx];
    const trim = all[trimIdx];

    // At the build's exit, arriving from below: crossed.
    expect(
      evaluateTransition(MULTI, readingsAt(build.exitBodyFatPct), undefined, Date.now(), buildIdx)!
        .crossed,
    ).toBe(true);
    // Well under it: not yet.
    expect(
      evaluateTransition(
        MULTI,
        readingsAt(build.exitBodyFatPct - 3),
        undefined,
        Date.now(),
        buildIdx,
      )!.crossed,
    ).toBe(false);

    // The trim runs the other way.
    expect(
      evaluateTransition(MULTI, readingsAt(trim.exitBodyFatPct), undefined, Date.now(), trimIdx)!
        .crossed,
    ).toBe(true);
    expect(
      evaluateTransition(
        MULTI,
        readingsAt(trim.exitBodyFatPct + 3),
        undefined,
        Date.now(),
        trimIdx,
      )!.crossed,
    ).toBe(false);
  });

  it('never treats too few readings as a crossing', () => {
    const one = readingsAt(10).slice(0, 1);
    const check = evaluateTransition(MULTI, one, undefined, Date.now(), 2)!;
    expect(check.trendPct).toBeNull();
    expect(check.crossed).toBe(false);
  });

  // Pins the out-of-range behaviour rather than leaving it incidental.
  it('handles a count past the end of the journey without throwing', () => {
    const roadmap = roadmapFor(MULTI);
    const beyond = expandPhases(roadmap).length + 5;
    expect(() => evaluateTransition(MULTI, readingsAt(14), undefined, Date.now(), beyond)).not.toThrow();
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

  // Before the fix this said "phase 1 of 10" to everyone, so the AI wrote a
  // program for a phase the user had finished months earlier.
  it('says phase 4 at three completed', () => {
    const ctx = ctxAt(MULTI, 3);
    expect(ctx).toContain('phase 4 of');
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
    const ctx = ctxAt(MULTI, 3);
    expect(ctx).toContain(LABEL[all[3].kind]);
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