// src/utils/__tests__/phaseTransition.test.ts
//
// Pure-function coverage for the transition-detection engine. The storage
// half (shouldPromptForCrossing / markCrossingDismissed) is exercised through
// the AsyncStorage jest mock, same as the other storage suites.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  bodyFatTrend,
  exitCrossed,
  evaluateTransition,
  shouldPromptForCrossing,
  markCrossingDismissed,
  clearCrossingDismissals,
  TREND_MIN_READINGS,
  BodyFatReading,
} from '../phaseTransition';
import type { GoalsProfile } from '../goalsProfile';

const NOW = new Date('2026-08-09T00:00:00Z').getTime();
const daysAgo = (d: number): string => new Date(NOW - d * 86_400_000).toISOString();
const r = (d: number, pct: number): BodyFatReading => ({ dateISO: daysAgo(d), bodyFatPct: pct });

describe('bodyFatTrend', () => {
  it('returns null below the minimum reading count — one weigh-in never ends a phase', () => {
    expect(bodyFatTrend([r(1, 18)], NOW)).toBeNull();
    expect(bodyFatTrend([r(1, 18), r(3, 18)], NOW)).toBeNull();
    expect(TREND_MIN_READINGS).toBe(3);
  });

  it('is the median, so one outlier reading cannot fake a crossing', () => {
    // Two honest readings at 20 and one bad scale morning at 14: the median
    // stays at 20. A mean (18) would have crossed an 18% threshold.
    expect(bodyFatTrend([r(1, 20), r(5, 14), r(9, 20)], NOW)).toBe(20);
  });

  it('ignores readings outside the window', () => {
    // The old 25% readings predate the window and must not drag the median up.
    const readings = [r(120, 25), r(90, 25), r(10, 18), r(5, 18), r(1, 17)];
    expect(bodyFatTrend(readings, NOW)).toBe(18);
  });

  it('averages the middle pair on an even count', () => {
    expect(bodyFatTrend([r(1, 17), r(2, 18), r(3, 19), r(4, 20)], NOW)).toBe(18.5);
  });

  it('input order does not matter', () => {
    expect(bodyFatTrend([r(9, 20), r(1, 18), r(5, 19)], NOW)).toBe(
      bodyFatTrend([r(1, 18), r(5, 19), r(9, 20)], NOW),
    );
  });
});

describe('exitCrossed', () => {
  it('recomp ends when the trend comes DOWN to the ceiling', () => {
    expect(exitCrossed('recomp', 18, 17.5)).toBe(true);
    expect(exitCrossed('recomp', 18, 18)).toBe(true);
    expect(exitCrossed('recomp', 18, 19)).toBe(false);
  });

  it('a build ends when the trend rises UP to the ceiling', () => {
    expect(exitCrossed('build', 18, 18.2)).toBe(true);
    expect(exitCrossed('build', 18, 16)).toBe(false);
  });

  it('trims and the reveal end when the trend comes down to their target', () => {
    expect(exitCrossed('trim', 12, 11.8)).toBe(true);
    expect(exitCrossed('trim', 12, 13)).toBe(false);
    expect(exitCrossed('reveal', 13, 12.9)).toBe(true);
  });
});

describe('evaluateTransition', () => {
  // Ryan-shaped profile: recomp opener exiting at the balanced ceiling (18).
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
    expect(evaluateTransition(noGoal, [r(1, 18), r(2, 18), r(3, 18)], undefined, NOW)).toBeNull();
  });

  it('does not cross without a trend, however low the single reading', () => {
    const check = evaluateTransition(RECOMP, [r(1, 15)], undefined, NOW)!;
    expect(check.trendPct).toBeNull();
    expect(check.crossed).toBe(false);
    expect(check.thresholdPct).toBe(18);
  });

  it('crosses when the trend reaches the recomp exit, and names what follows', () => {
    const check = evaluateTransition(
      RECOMP,
      [r(10, 18.5), r(5, 18), r(1, 17.6)],
      undefined,
      NOW,
    )!;
    expect(check.crossed).toBe(true);
    expect(check.currentKind).toBe('recomp');
    expect(check.nextKind).toBe('trim');
    expect(check.nextExitBodyFatPct).toBe(12); // balanced floor — feeds the prompt copy
  });

  it('respects the route argument — a lean-route ceiling crosses earlier', () => {
    // Trend 16 is inside the balanced band (ceiling 18 → recomp already exited
    // at 18… so use readings around 15.5): lean ceiling is 15.
    const readings = [r(8, 16), r(4, 15.8), r(1, 15.6)];
    const balanced = evaluateTransition(RECOMP, readings, 'balanced', NOW)!;
    const lean = evaluateTransition(RECOMP, readings, 'lean', NOW)!;
    expect(balanced.crossed).toBe(true); // 15.8 ≤ 18
    expect(lean.thresholdPct).toBe(15);
    expect(lean.crossed).toBe(false); // 15.8 > 15
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
    const check = evaluateTransition(built, [r(1, 24), r(2, 25), r(3, 25)], undefined, NOW)!;
    expect(check.currentKind).toBe('reveal');
    expect(check.thresholdPct).toBe(12);
    expect(check.nextKind).toBeUndefined();
    expect(check.nextExitBodyFatPct).toBeUndefined();
    expect(check.crossed).toBe(false);
  });
});

describe('prompt dedup', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  const CROSSED = {
    crossed: true,
    trendPct: 17.8,
    thresholdPct: 18,
    currentKind: 'recomp' as const,
    nextKind: 'trim' as const,
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
    // A later phase's different threshold still prompts.
    const nextPhase = { ...CROSSED, currentKind: 'trim' as const, thresholdPct: 12 };
    expect(await shouldPromptForCrossing(nextPhase)).toBe(true);
  });

  it('the same boundary number in the opposite direction is a different crossing', async () => {
    // A trim and a build can share the ceiling; dismissing one must not
    // silence the other. Kind is part of the identity.
    await markCrossingDismissed(CROSSED);
    const buildAtSameNumber = { ...CROSSED, currentKind: 'build' as const };
    expect(await shouldPromptForCrossing(buildAtSameNumber)).toBe(true);
  });

  it('regeneration clears the slate', async () => {
    await markCrossingDismissed(CROSSED);
    await clearCrossingDismissals();
    expect(await shouldPromptForCrossing(CROSSED)).toBe(true);
  });
});