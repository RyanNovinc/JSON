// src/utils/__tests__/phaseTransition.test.ts
//
// Pure-function coverage for the transition-detection engine. The storage
// half (shouldPromptForCrossing / markCrossingDismissed) is exercised through
// the AsyncStorage jest mock, same as the other storage suites.
//
// REWRITTEN 18 Aug 2026 alongside the switch from body-fat detection to
// weight detection. Every assertion below is the old one's INTENT moved to its
// new home, except where the old intent is now wrong — those are called out
// individually, because a test that changed meaning silently is worse than no
// test at all.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  weightTrend,
  scanReachedExit,
  exitReached,
  evaluateTransition,
  shouldPromptForCrossing,
  markCrossingDismissed,
  clearCrossingDismissals,
  TREND_MIN_READINGS,
  TREND_MIN_SPAN_DAYS,
  WeightReading,
} from '../phaseTransition';
import type { GoalsProfile } from '../goalsProfile';

const NOW = new Date('2026-08-09T00:00:00Z').getTime();
const daysAgo = (d: number): string => new Date(NOW - d * 86_400_000).toISOString();
const r = (d: number, kg: number): WeightReading => ({ dateISO: daysAgo(d), weightKg: kg });

describe('weightTrend', () => {
  it('returns null below the minimum reading count — one weigh-in never ends a phase', () => {
    expect(weightTrend([r(1, 80)], NOW)).toBeNull();
    expect(weightTrend([r(1, 80), r(9, 80)], NOW)).toBeNull();
    expect(TREND_MIN_READINGS).toBe(3);
  });

  // NEW. Three readings taken the same afternoon are three samples of one
  // moment. This failure mode did not exist on body fat — nobody scans three
  // times in a day — but stepping on and off a scale is easy.
  it('returns null when the readings span too little time', () => {
    expect(weightTrend([r(0, 80), r(0, 80.4), r(0, 79.6)], NOW)).toBeNull();
    expect(TREND_MIN_SPAN_DAYS).toBe(7);
  });

  it('weights recent readings more heavily than old ones', () => {
    // Falling from 81 to 79 over ten days: the trend must sit nearer the
    // recent end than a plain mean (80) would put it.
    const trend = weightTrend([r(10, 81), r(5, 80), r(1, 79)], NOW)!;
    expect(trend).toBeLessThan(80);
    expect(trend).toBeGreaterThan(79);
  });

  it('is flat when the weight is flat', () => {
    expect(weightTrend([r(1, 80), r(8, 80), r(15, 80)], NOW)).toBeCloseTo(80, 5);
  });

  it('ignores readings outside the window', () => {
    // The old 95 kg readings predate the window and must not drag the trend up.
    const readings = [r(120, 95), r(90, 95), r(14, 80), r(7, 80), r(1, 80)];
    expect(weightTrend(readings, NOW)).toBeCloseTo(80, 1);
  });

  // CHANGED IN MEANING, deliberately. The old suite asserted that a MEDIAN made
  // one bad reading harmless. The trend is now an exponentially weighted
  // average, so the guard is a gross-error filter at 15% of the window median
  // instead: it drops typed nonsense (a transposed 97 for 79) and keeps a
  // reading a few kg out, because on WEIGHT that is more likely a holiday than
  // a mistake. On body fat a five-point outlier usually meant the measurement
  // method had changed, which is why the median was right there and is not here.
  it('drops a grossly wrong reading but keeps a plausible one', () => {
    const withTypo = weightTrend([r(1, 80), r(4, 80.2), r(5, 97), r(8, 79.8), r(12, 80.5)], NOW)!;
    expect(withTypo).toBeCloseTo(80, 0);

    // 74 among 80s is 7.5% out — inside the filter, so it counts.
    const withDip = weightTrend([r(1, 80), r(5, 74), r(9, 80)], NOW)!;
    expect(withDip).toBeLessThan(79);
  });

  it('returns null when rejecting outliers leaves too few readings', () => {
    expect(weightTrend([r(1, 80), r(5, 8), r(9, 80)], NOW)).toBeNull();
  });

  it('input order does not matter', () => {
    expect(weightTrend([r(9, 82), r(1, 80), r(5, 81)], NOW)).toBeCloseTo(
      weightTrend([r(1, 80), r(5, 81), r(9, 82)], NOW)!,
      10,
    );
  });
});

describe('exitReached', () => {
  it('a build ends when the trend rises UP to its target weight', () => {
    expect(exitReached('build', 90, 90.2)).toBe(true);
    expect(exitReached('build', 90, 88)).toBe(false);
  });

  it('trims and the reveal end when the trend comes DOWN to theirs', () => {
    expect(exitReached('trim', 70, 69.8)).toBe(true);
    expect(exitReached('trim', 70, 71)).toBe(false);
    expect(exitReached('reveal', 90, 89.9)).toBe(true);
  });

  // NEW, and the honest answer rather than a gap. A recomp holds weight by
  // construction, so there is no weight signal to read, and the measurement
  // review found no home tool that can verify a recomposition: the scale does
  // not move and consumer body fat cannot resolve the small simultaneous
  // changes. A recomp must be time-boxed and user-confirmed.
  it('never reports a recomp as reached, whatever the weight does', () => {
    expect(exitReached('recomp', 80, 80)).toBe(false);
    expect(exitReached('recomp', 80, 70)).toBe(false);
    expect(exitReached('recomp', 80, 90)).toBe(false);
  });
});

describe('scanReachedExit', () => {
  const scan = (d: number, pct: number) => ({ dateISO: daysAgo(d), bodyFatPct: pct });

  it('reports null with no usable scan — no opinion, NOT "not finished"', () => {
    expect(scanReachedExit('trim', 12, [], NOW)).toBeNull();
  });

  // DXA users scan quarterly, so a scan has to stand alone for months — but not
  // forever. Past about four months the body has had a season to move and the
  // scan describes someone else.
  it('ignores a scan older than the staleness limit', () => {
    expect(scanReachedExit('trim', 12, [scan(200, 11.8)], NOW)).toBeNull();
    expect(scanReachedExit('trim', 12, [scan(60, 11.8)], NOW)).toBe(true);
  });

  it('reads direction from the phase kind, same as the weight path', () => {
    expect(scanReachedExit('trim', 12, [scan(3, 11.8)], NOW)).toBe(true);
    expect(scanReachedExit('trim', 12, [scan(3, 14)], NOW)).toBe(false);
    expect(scanReachedExit('build', 18, [scan(3, 18.2)], NOW)).toBe(true);
    expect(scanReachedExit('build', 18, [scan(3, 16)], NOW)).toBe(false);
  });

  // Averaging scans months apart would describe a body that no longer exists.
  it('uses the most recent scan only', () => {
    expect(scanReachedExit('trim', 12, [scan(90, 11), scan(2, 15)], NOW)).toBe(false);
    expect(scanReachedExit('trim', 12, [scan(2, 11), scan(90, 15)], NOW)).toBe(true);
  });

  // A scan landing exactly on the threshold must not read as "not there yet" —
  // the same boundary problem EXIT_TOLERANCE_KG solves for weight.
  it('tolerates a scan landing exactly on the threshold', () => {
    expect(scanReachedExit('trim', 12, [scan(1, 12)], NOW)).toBe(true);
    expect(scanReachedExit('build', 18, [scan(1, 18)], NOW)).toBe(true);
  });
});

describe('evaluateTransition', () => {
  // Same fixture the old suite used. On the balanced route this now opens with
  // a trim to 12% / 69.9 kg, then a build, then a reveal at the goal.
  const RECOMP: GoalsProfile = {
    currentWeightKg: 77.3,
    currentBodyFatPct: 20.4,
    goalWeightKg: 90,
    goalBodyFatPct: 13,
    trainingState: 'consistent',
    sex: 'male',
    heightCm: 185,
  };

  it('returns null when no roadmap can be derived', () => {
    const noGoal: GoalsProfile = { currentWeightKg: 80, trainingState: 'consistent' };
    expect(evaluateTransition(noGoal, [r(1, 80), r(8, 80), r(15, 80)], undefined, NOW)).toBeNull();
  });

  it('does not reach the exit without a trend, however low the single reading', () => {
    const check = evaluateTransition(RECOMP, [r(1, 60)], undefined, NOW)!;
    expect(check.trendKg).toBeNull();
    expect(check.crossed).toBe(false);
    expect(check.undetectable).toBe('not_enough');
  });

  it('carries the weight target and keeps the body fat for display', () => {
    const check = evaluateTransition(RECOMP, [r(1, 77), r(8, 77), r(15, 77)], undefined, NOW)!;
    expect(check.currentKind).toBe('trim');
    expect(check.thresholdKg).toBeCloseTo(69.9, 1);
    expect(check.thresholdBodyFatPct).toBe(12);
    expect(check.crossed).toBe(false); // 77 kg is well above the 69.9 kg target
  });

  it('reaches the exit when the weight trend comes down to the target', () => {
    // Readings chosen so the EWMA lands clearly BELOW the 69.9 kg target rather
    // than near it. The first draft used 71 / 70.2 / 69.5, whose weighted trend
    // is 69.96 — sixty grams the wrong side of the line, so the test failed and
    // the detector was right. Worth knowing when adding cases here: with a
    // 12-day half-life the newest reading carries roughly three times the
    // weight of one a fortnight old, so eyeballing the average will mislead.
    const check = evaluateTransition(
      RECOMP,
      [r(15, 70.5), r(8, 69.8), r(1, 69.2)],
      undefined,
      NOW,
    )!;
    expect(check.crossed).toBe(true);
    expect(check.currentKind).toBe('trim');
    expect(check.nextKind).toBe('build');
  });

  it('respects the route argument — a different route is a different plan', () => {
    const readings = [r(15, 70.5), r(8, 69.8), r(1, 69.2)];
    const balanced = evaluateTransition(RECOMP, readings, 'balanced', NOW)!;
    const lean = evaluateTransition(RECOMP, readings, 'lean', NOW)!;
    // Both open on a trim to the same floor here, but the route still decides
    // what FOLLOWS, which is what the prompt copy names.
    expect(balanced.nextExitBodyFatPct).not.toBe(lean.nextExitBodyFatPct);
  });

  it('single-phase (HARD RULE 4) roadmap: the goal is the exit and nothing follows', () => {
    const built: GoalsProfile = {
      currentWeightKg: 95,
      currentBodyFatPct: 25,
      goalWeightKg: 80,
      goalBodyFatPct: 12,
      trainingState: 'consistent',
      sex: 'male',
      heightCm: 185,
    };
    const check = evaluateTransition(built, [r(15, 95), r(8, 94), r(1, 94)], undefined, NOW)!;
    expect(check.currentKind).toBe('reveal');
    expect(check.thresholdKg).toBeCloseTo(80, 1);
    expect(check.thresholdBodyFatPct).toBe(12);
    expect(check.nextKind).toBeUndefined();
    expect(check.crossed).toBe(false);
  });

  // ── The scan path ────────────────────────────────────────────────────────
  //
  // The case that matters is DISAGREEMENT: the scan says done, the weight says
  // not yet. That is not a glitch — DXA is the better instrument and a user who
  // paid for one should get the benefit rather than being held to the proxy.
  it('a scan can end a phase the weight trend says is unfinished', () => {
    const farFromTarget = [r(15, 77), r(8, 77), r(1, 77)]; // target is 69.9 kg
    const noScan = evaluateTransition(RECOMP, farFromTarget, undefined, NOW, 0)!;
    expect(noScan.crossed).toBe(false);

    const withScan = evaluateTransition(RECOMP, farFromTarget, undefined, NOW, 0, [
      { dateISO: daysAgo(3), bodyFatPct: 11.8 },
    ])!;
    expect(withScan.crossed).toBe(true);
    expect(withScan.reachedBy).toBe('scan');
    expect(withScan.scanSaysReached).toBe(true);
  });

  it('names the weight when the weight is what got there', () => {
    const atTarget = [r(15, 70.5), r(8, 69.8), r(1, 69.2)];
    const check = evaluateTransition(RECOMP, atTarget, undefined, NOW, 0)!;
    expect(check.crossed).toBe(true);
    expect(check.reachedBy).toBe('weight');
    expect(check.scanSaysReached).toBeNull();
  });

  // A scan that says NOT finished must not veto the weight trend. It is extra
  // evidence, not a gate — otherwise buying a DXA would make the app harder to
  // satisfy than not having one.
  it('a scan saying not-yet does not block the weight path', () => {
    const atTarget = [r(15, 70.5), r(8, 69.8), r(1, 69.2)];
    const check = evaluateTransition(RECOMP, atTarget, undefined, NOW, 0, [
      { dateISO: daysAgo(3), bodyFatPct: 16 },
    ])!;
    expect(check.scanSaysReached).toBe(false);
    expect(check.crossed).toBe(true);
    expect(check.reachedBy).toBe('weight');
  });

  // NEW. Without a body-fat reading the roadmap cannot derive a lean mass, so
  // it cannot derive a scale target either. Declining is the honest answer;
  // guessing one would put us back where we started.
  it('declines to detect when the roadmap has no weight target', () => {
    const noBf: GoalsProfile = {
      currentWeightKg: 85,
      goalWeightKg: 90,
      goalBodyFatPct: 14,
      trainingState: 'consistent',
      sex: 'male',
      heightCm: 180,
    };
    const check = evaluateTransition(noBf, [r(15, 85), r(8, 85), r(1, 85)], undefined, NOW)!;
    expect(check.thresholdKg).toBeNull();
    expect(check.crossed).toBe(false);
    expect(check.undetectable).toBe('no_target');
  });
});

describe('prompt dedup', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  const CROSSED = {
    crossed: true,
    trendKg: 69.8,
    displayTrendKg: 69.8,
    thresholdKg: 69.9,
    thresholdBodyFatPct: 12,
    scanSaysReached: null,
    ratePctPerWeek: -0.6,
    targetRatePctPerWeek: -0.58,
    pace: 'on_track' as const,
    currentKind: 'trim' as const,
    nextKind: 'build' as const,
  };

  it('prompts for a fresh crossing', async () => {
    expect(await shouldPromptForCrossing(CROSSED)).toBe(true);
  });

  it('never prompts for a non-crossing', async () => {
    expect(await shouldPromptForCrossing({ ...CROSSED, crossed: false })).toBe(false);
  });

  it('a dismissal silences THAT threshold only', async () => {
    await markCrossingDismissed(CROSSED);
    expect(await shouldPromptForCrossing(CROSSED)).toBe(false);
    const nextPhase = { ...CROSSED, currentKind: 'reveal' as const, thresholdBodyFatPct: 13 };
    expect(await shouldPromptForCrossing(nextPhase)).toBe(true);
  });

  it('the same boundary number in the opposite direction is a different crossing', async () => {
    await markCrossingDismissed(CROSSED);
    const buildAtSameNumber = { ...CROSSED, currentKind: 'build' as const };
    expect(await shouldPromptForCrossing(buildAtSameNumber)).toBe(true);
  });

  // The dedup id is keyed on the BODY FAT exit, not the weight one, and this
  // pins why: the weight target is recomputed from current lean mass on every
  // derive, so it drifts by grams as data arrives. Keying on it would mint a
  // new id — and a fresh prompt — at every weigh-in. Using the stable number
  // for identity is not the detection reverting to body fat.
  it('a drifting weight target does not resurrect a dismissed prompt', async () => {
    await markCrossingDismissed(CROSSED);
    const drifted = { ...CROSSED, thresholdKg: 69.7, trendKg: 69.6 };
    expect(await shouldPromptForCrossing(drifted)).toBe(false);
  });

  it('regeneration clears the slate', async () => {
    await markCrossingDismissed(CROSSED);
    await clearCrossingDismissals();
    expect(await shouldPromptForCrossing(CROSSED)).toBe(true);
  });
});