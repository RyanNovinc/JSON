/**
 * prDetection.test.ts
 *
 * Every case here is one the inline version got wrong on a real device, or one that would
 * have caught it, or a record type that an estimated-1RM-only check silently ignored. The
 * point of extracting this logic was to stop finding these one at a time in a gym.
 */

import {
  detectPersonalBest,
  summarisePriorHistory,
  HistoryEntry,
  CurrentSet,
  PriorBests,
} from '../prDetection';

// Epley, matching WorkoutLogScreen's default.
const epley = (weightKg: number, reps: number): number =>
  reps === 1 ? weightKg : weightKg * (1 + reps / 30);

const SESSION_START = new Date('2026-07-28T09:00:00Z').getTime();

/** One stored entry per set, because that is how addWorkoutEntry actually writes them. */
const at = (iso: string, weight: string, reps: string, unit?: 'kg' | 'lbs'): HistoryEntry => ({
  date: iso,
  sets: [{ weight, reps, ...(unit ? { unit } : {}) }],
});

const done = (weight: string, reps: string): CurrentSet => ({ weight, reps, completed: true });
const pending = (weight: string, reps: string): CurrentSet => ({
  weight,
  reps,
  completed: false,
});

const summarise = (history: HistoryEntry[], unit: 'kg' | 'lbs' = 'kg'): PriorBests =>
  summarisePriorHistory(history, SESSION_START, unit, epley);

const run = (
  sets: CurrentSet[],
  history: HistoryEntry[],
  overrides: Partial<{
    globalUnit: 'kg' | 'lbs';
    minPriorSessions: number;
    minImprovement: number;
  }> = {},
) => {
  const globalUnit = overrides.globalUnit ?? 'kg';
  return detectPersonalBest({
    sets,
    prior: summarise(history, globalUnit),
    globalUnit,
    calculate1RM: epley,
    minPriorSessions: overrides.minPriorSessions ?? 1,
    minImprovement: overrides.minImprovement ?? 1.01,
  });
};

describe('summarisePriorHistory', () => {
  it('excludes entries from the current workout', () => {
    const prior = summarise([
      at('2026-07-21T09:00:00Z', '90', '5'),
      at('2026-07-28T09:30:00Z', '200', '5'),
    ]);
    expect(prior.priorEntryCount).toBe(1);
    expect(prior.totalEntryCount).toBe(2);
    expect(prior.bestWeightKg).toBeCloseTo(90);
  });

  it('counts sessions by day, not by stored set count', () => {
    const prior = summarise([
      at('2026-07-21T09:00:00Z', '90', '5'),
      at('2026-07-21T09:10:00Z', '90', '5'),
      at('2026-07-21T09:20:00Z', '92.5', '5'),
      at('2026-07-21T09:30:00Z', '92.5', '5'),
    ]);
    expect(prior.sessionCount).toBe(1);
    expect(prior.priorEntryCount).toBe(4);
  });

  it('counts two separate days as two sessions', () => {
    const prior = summarise([
      at('2026-07-21T09:00:00Z', '90', '5'),
      at('2026-07-14T09:00:00Z', '88', '5'),
    ]);
    expect(prior.sessionCount).toBe(2);
  });

  it('tracks heaviest weight separately from best estimate', () => {
    const prior = summarise([
      at('2026-07-21T09:00:00Z', '100', '5'), // higher estimate
      at('2026-07-14T09:00:00Z', '110', '1'), // heavier weight
    ]);
    expect(prior.bestOneRMKg).toBeCloseTo(epley(100, 5));
    expect(prior.bestWeightKg).toBeCloseTo(110);
  });

  it('tracks bodyweight reps separately from weighted work', () => {
    const prior = summarise([
      at('2026-07-21T09:00:00Z', '', '12'),
      at('2026-07-14T09:00:00Z', '', '10'),
    ]);
    expect(prior.bestBodyweightReps).toBe(12);
    expect(prior.bestOneRMKg).toBe(0);
  });

  it('normalises stored lbs into kg', () => {
    const prior = summarise([at('2026-07-21T09:00:00Z', '220', '5', 'lbs')]);
    expect(prior.bestWeightKg).toBeCloseTo(220 * 0.453592);
  });

  it('treats an unparseable date as prior history', () => {
    const prior = summarise([{ date: 'not a date', sets: [{ weight: '100', reps: '5' }] }]);
    expect(prior.priorEntryCount).toBe(1);
  });

  it('handles a multi-set entry', () => {
    const prior = summarise([
      { date: '2026-07-21T09:00:00Z', sets: [{ weight: '80', reps: '5' }, { weight: '95', reps: '5' }] },
    ]);
    expect(prior.bestOneRMKg).toBeCloseTo(epley(95, 5));
  });
});

describe('detectPersonalBest — estimated 1RM', () => {
  it('finds a record that clears the margin', () => {
    const result = run(
      [done('100', '5')],
      [at('2026-07-21T09:00:00Z', '90', '5'), at('2026-07-14T09:00:00Z', '85', '5')],
    );
    expect(result.reason).toBe('pr');
    expect(result.pr!.kind).toBe('1rm');
    expect(result.pr!.value).toBeCloseTo(epley(100, 5));
    expect(result.pr!.improvement).toBeGreaterThan(0);
  });

  // The bug that made it impossible to ever fire.
  it('excludes sets logged during the current workout', () => {
    const result = run(
      [done('100', '5')],
      [at('2026-07-21T09:00:00Z', '90', '5'), at('2026-07-28T09:30:00Z', '100', '5')],
    );
    expect(result.reason).toBe('pr');
    expect(result.pr!.previous).toBeCloseTo(epley(90, 5));
  });

  it('reports no history when every stored set belongs to this workout', () => {
    const result = run([done('100', '5')], [at('2026-07-28T09:30:00Z', '100', '5')]);
    expect(result.reason).toBe('no-history');
  });

  it('reports no history on a first-ever session', () => {
    expect(run([done('100', '5')], []).reason).toBe('no-history');
  });

  it('gates on prior sessions, not stored set count', () => {
    const oneWorkoutFourSets = [
      at('2026-07-21T09:00:00Z', '90', '5'),
      at('2026-07-21T09:10:00Z', '90', '5'),
      at('2026-07-21T09:20:00Z', '92.5', '5'),
      at('2026-07-21T09:30:00Z', '92.5', '5'),
    ];
    const result = run([done('120', '5')], oneWorkoutFourSets, { minPriorSessions: 2 });
    expect(result.reason).toBe('insufficient-sessions');
  });

  it('rejects an improvement inside the margin', () => {
    const result = run([done('90.4', '5')], [at('2026-07-21T09:00:00Z', '90', '5')]);
    expect(result.reason).toBe('below-margin');
  });

  it('accepts an improvement that clears the margin', () => {
    expect(run([done('92', '5')], [at('2026-07-21T09:00:00Z', '90', '5')]).reason).toBe('pr');
  });

  it('ignores sets that are not completed', () => {
    const result = run([pending('200', '5')], [at('2026-07-21T09:00:00Z', '90', '5')]);
    expect(result.reason).toBe('no-completed-sets');
  });

  it('takes the best completed set, not the last', () => {
    const result = run([done('100', '5'), done('80', '5')], [at('2026-07-21T09:00:00Z', '90', '5')]);
    expect(result.pr!.value).toBeCloseTo(epley(100, 5));
  });

  it('lets more reps at the same weight count as a record', () => {
    expect(run([done('100', '8')], [at('2026-07-21T09:00:00Z', '100', '5')]).reason).toBe('pr');
  });
});

describe('detectPersonalBest — heaviest weight', () => {
  // The gap an estimated-1RM-only check leaves: a top single that is the heaviest lift of
  // someone's life but estimates LOWER than a previous high-rep set.
  it('catches a heaviest-ever weight that is not a 1RM record', () => {
    const result = run([done('110', '1')], [at('2026-07-21T09:00:00Z', '100', '5')]);
    expect(result.reason).toBe('pr');
    expect(result.pr!.kind).toBe('weight');
    expect(result.pr!.value).toBeCloseTo(110);
    expect(result.pr!.previous).toBeCloseTo(100);
  });

  it('prefers the 1RM record when both would fire', () => {
    const result = run([done('120', '5')], [at('2026-07-21T09:00:00Z', '100', '5')]);
    expect(result.pr!.kind).toBe('1rm');
  });

  // The margin applies here too. Without it, every linear-progression step would fire as a
  // heaviest-ever record and the toast would appear every single session.
  it('rejects a trivial weight increase', () => {
    const result = run([done('100.5', '1')], [at('2026-07-21T09:00:00Z', '100', '1')]);
    expect(result.reason).toBe('below-margin');
  });

  // A prior high-rep set keeps the estimate out of reach (100x5 estimates 116.7), so this
  // exercises the weight branch specifically rather than falling through to 1RM.
  it('accepts a meaningful weight increase when the estimate cannot fire', () => {
    const result = run([done('106', '1')], [at('2026-07-21T09:00:00Z', '100', '5')]);
    expect(result.reason).toBe('pr');
    expect(result.pr!.kind).toBe('weight');
    expect(result.pr!.value).toBeCloseTo(106);
  });

  it('rejects a trivial weight increase when the estimate cannot fire', () => {
    const result = run([done('100.5', '1')], [at('2026-07-21T09:00:00Z', '100', '5')]);
    expect(result.reason).toBe('below-margin');
  });

  it('rejects an equal top weight', () => {
    const result = run([done('100', '1')], [at('2026-07-21T09:00:00Z', '100', '1')]);
    expect(result.reason).toBe('below-margin');
  });
});

describe('detectPersonalBest — bodyweight reps', () => {
  // Without this whole category, pull-ups and dips could never produce a record at all.
  it('catches more reps than ever on a bodyweight exercise', () => {
    const result = run([done('', '14')], [at('2026-07-21T09:00:00Z', '', '12')]);
    expect(result.reason).toBe('pr');
    expect(result.pr!.kind).toBe('reps');
    expect(result.pr!.value).toBe(14);
    expect(result.pr!.improvement).toBe(2);
  });

  it('rejects equalling the previous best reps', () => {
    expect(run([done('', '12')], [at('2026-07-21T09:00:00Z', '', '12')]).reason).toBe('below-margin');
  });

  it('takes the best set of the session', () => {
    const result = run([done('', '10'), done('', '15')], [at('2026-07-21T09:00:00Z', '', '12')]);
    expect(result.pr!.value).toBe(15);
  });

  it('reports no usable history when the exercise was previously weighted', () => {
    const result = run([done('', '20')], [at('2026-07-21T09:00:00Z', '50', '5')]);
    expect(result.reason).toBe('no-usable-history');
  });

  it('does not treat a missing weight as a zero-kilo lift', () => {
    const result = run([done('', '12')], [at('2026-07-21T09:00:00Z', '', '5')]);
    expect(result.pr!.kind).toBe('reps');
  });
});

describe('detectPersonalBest — units', () => {
  it('normalises stored lbs against a kg session', () => {
    // 220lbs is ~99.8kg, so 100kg should not clear a one percent margin over it.
    const result = run([done('100', '5')], [at('2026-07-21T09:00:00Z', '220', '5', 'lbs')]);
    expect(result.reason).toBe('below-margin');
  });

  it('normalises a lbs session against stored kg', () => {
    const result = run([done('250', '5')], [at('2026-07-21T09:00:00Z', '100', '5', 'kg')], {
      globalUnit: 'lbs',
    });
    expect(result.reason).toBe('pr');
  });

  it('assumes the display unit for stored sets that carry none', () => {
    const result = run([done('100', '5')], [at('2026-07-21T09:00:00Z', '90', '5')], {
      globalUnit: 'lbs',
    });
    expect(result.reason).toBe('pr');
    expect(result.pr!.previous).toBeCloseTo(epley(90 * 0.453592, 5));
  });
});