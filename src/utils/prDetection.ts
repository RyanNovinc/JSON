/**
 * prDetection.ts
 *
 * Whether a logged set is a personal best. Pure: no React, no storage, no clock.
 *
 * Split into two functions on purpose:
 *
 *   summarisePriorHistory  scans stored history ONCE and reduces it to a handful of
 *                          numbers. Expensive, and depends only on things that do not
 *                          change during a workout.
 *   detectPersonalBest     compares the current session's sets against that summary.
 *                          Cheap, and runs on every logged set.
 *
 * That split is not tidiness. History is stored one entry per SET, so a user two years in
 * has thousands of rows per exercise, and the first version rescanned all of them for
 * every exercise every time a set was logged. Strong shipped fixes for exactly this
 * failure — slow record calculation on large histories, and background termination while
 * processing them — which is a warning worth taking from someone who hit it in production.
 *
 * ── HOW HISTORY IS ACTUALLY STORED ──────────────────────────────────────────
 *
 * WorkoutStorage.addWorkoutEntry does `history.push(entry)` and the workout adapter calls
 * it once per COMPLETED SET. So getExerciseHistory returns a flat list where each element
 * is a single set with its own date, and `entry.sets` usually holds exactly one.
 *
 * Consequences, all of which have already caused bugs:
 *   - history.length is a SET count. Four entries can be one workout.
 *   - a set logged thirty seconds ago is already in "history" when the check runs, so any
 *     comparison that does not exclude the current session compares a value against
 *     itself and can never find a record.
 *   - counting sessions means grouping by day, the only session marker entries carry.
 *
 * ── THE THREE RECORD TYPES ──────────────────────────────────────────────────
 *
 * Estimated 1RM alone misses two things that are plainly records to the person lifting:
 *
 *   weight  A heavier top single than ever before. Previous 100x5 estimates 116.7kg;
 *           today's 110x1 estimates 110kg, so an e1RM-only check stays silent on
 *           somebody's heaviest ever lift.
 *   reps    Bodyweight work carries no weight at all, so an e1RM-only check can NEVER
 *           fire for pull-ups, dips or push-ups. Those users would never see one.
 *
 * Only one is announced per check, in that priority order: someone who has just finished a
 * set wants one piece of news, not three.
 *
 * ── ON MARGINS ──────────────────────────────────────────────────────────────
 *
 * The margin applies to weight AND estimated 1RM. It does not apply to reps.
 *
 * The first draft applied it only to the estimate, on the reasoning that Epley is a model
 * whose noise needs filtering while a weight on a bar is measured exactly. That sounded
 * principled and was wrong in practice: the tests caught the weight branch firing on a
 * 0.4kg increase, which meant the fallback swallowed the margin entirely and anyone on
 * linear progression would get a toast every session forever. Wallpaper.
 *
 * The margin is not really about measurement error. It is about SIGNIFICANCE — is this
 * worth interrupting someone for — and that question applies to a measured value exactly
 * as much as to an estimated one. 100.4kg over 100kg is not news.
 *
 * Reps stay strict because they are integers and the smallest possible increase is already
 * large in relative terms: one more rep on a set of twelve is over eight percent, well past
 * any margin worth setting. A percentage test there would only ever be a no-op.
 */

export type Unit = 'kg' | 'lbs';

/** What kind of record was set. */
export type PRKind = '1rm' | 'weight' | 'reps';

/** A set in the current session. Only completed ones can set a record. */
export interface CurrentSet {
  weight: string;
  reps: string;
  completed: boolean;
}

/** One stored entry. Per SET in practice, but the sets array is honoured as written. */
export interface HistoryEntry {
  date: string;
  sets: { weight: string; reps: string; unit?: Unit }[];
}

/**
 * Everything the check needs to know about what came before, reduced to numbers.
 * Computed once per workout rather than once per set.
 */
export interface PriorBests {
  /** Best estimated 1RM, in kg. Zero if there is no usable weighted history. */
  bestOneRMKg: number;
  /** Heaviest single weight, in kg. Zero if none. */
  bestWeightKg: number;
  /** Most reps in one set with no weight. Zero if no bodyweight history. */
  bestBodyweightReps: number;
  /** Distinct prior workout DAYS. This is what session gating uses. */
  sessionCount: number;
  /** Diagnostics only. */
  priorEntryCount: number;
  totalEntryCount: number;
}

export type PRReason =
  | 'pr'
  | 'no-completed-sets'
  | 'no-history'
  | 'insufficient-sessions'
  | 'no-usable-history'
  | 'below-margin';

export interface PRAchievement {
  kind: PRKind;
  /** kg for '1rm' and 'weight'; a rep count for 'reps'. */
  value: number;
  previous: number;
  improvement: number;
}

export interface PRDetectionResult {
  pr: PRAchievement | null;
  reason: PRReason;
  /** Human-readable, carrying the numbers that decided it. For the dev log. */
  detail: string;
}

function toKg(weight: number, unit: Unit): number {
  return unit === 'lbs' ? weight * 0.453592 : weight;
}

/**
 * Parse a stored or typed set into numbers, or null if it is not a usable reading.
 *
 * Weight is allowed to be absent — that is exactly what bodyweight work looks like, and
 * reading an empty string as 0kg would turn every pull-up into a zero-weight lift. Reps
 * must be present and positive either way.
 */
function parseSet(
  weight: string,
  reps: string,
  unit: Unit,
): { weightKg: number; reps: number; hasWeight: boolean } | null {
  const r = parseInt(reps, 10);
  if (!isFinite(r) || r <= 0) return null;

  const w = parseFloat(weight);
  const hasWeight = isFinite(w) && w > 0;
  return { weightKg: hasWeight ? toKg(w, unit) : 0, reps: r, hasWeight };
}

/** YYYY-M-D in local time. The grouping key for "how many sessions is this". */
function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Reduce an exercise's stored history to the numbers a record has to beat.
 *
 * `sessionStart` is epoch ms; entries at or after it belong to the workout in progress and
 * are excluded. An unparseable date counts as prior rather than current: a corrupted entry
 * should make a record harder to claim, not easier.
 */
export function summarisePriorHistory(
  history: HistoryEntry[],
  sessionStart: number,
  globalUnit: Unit,
  calculate1RM: (weightKg: number, reps: number) => number,
): PriorBests {
  let bestOneRMKg = 0;
  let bestWeightKg = 0;
  let bestBodyweightReps = 0;
  let priorEntryCount = 0;
  const days = new Set<string>();

  for (const entry of history) {
    const when = new Date(entry.date).getTime();
    if (isFinite(when) && when >= sessionStart) continue;

    priorEntryCount += 1;
    days.add(isFinite(when) ? dayKey(when) : entry.date);

    for (const set of entry.sets) {
      const parsed = parseSet(set.weight, set.reps, set.unit ?? globalUnit);
      if (!parsed) continue;

      if (parsed.hasWeight) {
        const est = calculate1RM(parsed.weightKg, parsed.reps);
        if (est > bestOneRMKg) bestOneRMKg = est;
        if (parsed.weightKg > bestWeightKg) bestWeightKg = parsed.weightKg;
      } else if (parsed.reps > bestBodyweightReps) {
        bestBodyweightReps = parsed.reps;
      }
    }
  }

  return {
    bestOneRMKg,
    bestWeightKg,
    bestBodyweightReps,
    sessionCount: days.size,
    priorEntryCount,
    totalEntryCount: history.length,
  };
}

export interface PRDetectionInput {
  sets: CurrentSet[];
  prior: PriorBests;
  /** The unit the CURRENT session's sets are typed in. Stored sets carry their own. */
  globalUnit: Unit;
  calculate1RM: (weightKg: number, reps: number) => number;
  minPriorSessions: number;
  /** Multiplier the 1RM and weight records must exceed, e.g. 1.01. Not applied to reps. */
  minImprovement: number;
}

export function detectPersonalBest(input: PRDetectionInput): PRDetectionResult {
  const { sets, prior, globalUnit, calculate1RM, minPriorSessions, minImprovement } = input;

  // ── This session's bests ─────────────────────────────────────────
  let sessionOneRMKg = 0;
  let sessionWeightKg = 0;
  let sessionBodyweightReps = 0;

  for (const set of sets) {
    if (!set.completed) continue;
    const parsed = parseSet(set.weight, set.reps, globalUnit);
    if (!parsed) continue;

    if (parsed.hasWeight) {
      const est = calculate1RM(parsed.weightKg, parsed.reps);
      if (est > sessionOneRMKg) sessionOneRMKg = est;
      if (parsed.weightKg > sessionWeightKg) sessionWeightKg = parsed.weightKg;
    } else if (parsed.reps > sessionBodyweightReps) {
      sessionBodyweightReps = parsed.reps;
    }
  }

  const didWeighted = sessionOneRMKg > 0;
  const didBodyweight = sessionBodyweightReps > 0;

  if (!didWeighted && !didBodyweight) {
    return {
      pr: null,
      reason: 'no-completed-sets',
      detail: 'no completed set with usable numbers',
    };
  }

  if (prior.priorEntryCount === 0) {
    return {
      pr: null,
      reason: 'no-history',
      detail:
        prior.totalEntryCount === 0
          ? 'never logged before'
          : `all ${prior.totalEntryCount} stored set(s) are from this workout`,
    };
  }

  if (prior.sessionCount < minPriorSessions) {
    return {
      pr: null,
      reason: 'insufficient-sessions',
      detail: `${prior.sessionCount} prior session(s) across ${prior.priorEntryCount} stored set(s), needs ${minPriorSessions}`,
    };
  }

  // ── Weighted work: estimated 1RM first, then heaviest weight ─────
  // 1RM leads because it is the app's own currency (the badge, the progression chart) and
  // because it is the more common record. Heaviest weight is the fallback that catches a
  // heavy low-rep single, which can be someone's best ever lift while estimating LOWER
  // than a previous high-rep set.
  if (didWeighted) {
    if (prior.bestOneRMKg <= 0 && prior.bestWeightKg <= 0) {
      return {
        pr: null,
        reason: 'no-usable-history',
        detail: `${prior.priorEntryCount} prior set(s) but none with a usable weight`,
      };
    }

    const oneRMThreshold = prior.bestOneRMKg * minImprovement;
    if (prior.bestOneRMKg > 0 && sessionOneRMKg > oneRMThreshold) {
      return {
        pr: {
          kind: '1rm',
          value: sessionOneRMKg,
          previous: prior.bestOneRMKg,
          improvement: sessionOneRMKg - prior.bestOneRMKg,
        },
        reason: 'pr',
        detail: `1RM ${sessionOneRMKg.toFixed(1)}kg beats ${prior.bestOneRMKg.toFixed(1)}kg`,
      };
    }

    // Same relative margin as the estimate. See ON MARGINS: this branch fired on a 0.4kg
    // increase without it, which made the 1RM margin pointless because every trivial
    // progression step came through here instead.
    const weightThreshold = prior.bestWeightKg * minImprovement;
    if (prior.bestWeightKg > 0 && sessionWeightKg > weightThreshold) {
      return {
        pr: {
          kind: 'weight',
          value: sessionWeightKg,
          previous: prior.bestWeightKg,
          improvement: sessionWeightKg - prior.bestWeightKg,
        },
        reason: 'pr',
        detail: `weight ${sessionWeightKg.toFixed(1)}kg beats ${prior.bestWeightKg.toFixed(1)}kg`,
      };
    }

    return {
      pr: null,
      reason: 'below-margin',
      detail: `1RM ${sessionOneRMKg.toFixed(1)}kg vs ${prior.bestOneRMKg.toFixed(
        1,
      )}kg (needs > ${oneRMThreshold.toFixed(1)}), weight ${sessionWeightKg.toFixed(
        1,
      )}kg vs ${prior.bestWeightKg.toFixed(1)}kg (needs > ${weightThreshold.toFixed(1)})`,
    };
  }

  // ── Bodyweight work: most reps in a set ──────────────────────────
  if (prior.bestBodyweightReps <= 0) {
    return {
      pr: null,
      reason: 'no-usable-history',
      detail: `${prior.priorEntryCount} prior set(s) but no bodyweight reps to beat`,
    };
  }

  // Strict, and no margin: reps are whole numbers and one more is one more.
  if (sessionBodyweightReps > prior.bestBodyweightReps) {
    return {
      pr: {
        kind: 'reps',
        value: sessionBodyweightReps,
        previous: prior.bestBodyweightReps,
        improvement: sessionBodyweightReps - prior.bestBodyweightReps,
      },
      reason: 'pr',
      detail: `${sessionBodyweightReps} reps beats ${prior.bestBodyweightReps}`,
    };
  }

  return {
    pr: null,
    reason: 'below-margin',
    detail: `${sessionBodyweightReps} reps vs best ${prior.bestBodyweightReps}`,
  };
}