/**
 * Rules for an in-progress workout session that outlives the screen.
 *
 * WorkoutLogScreenAdapter persists the session (sets + timer start) under
 * WorkoutStorage's current-workout record so it survives leaving the screen
 * and relaunching the app. Two consumers need the same judgement about that
 * record:
 *  - the adapter, when it restores the record on open
 *  - ActiveWorkoutProvider, when it rehydrates the resume bar at launch
 *
 * A timer that has been "running" for longer than MAX_ACTIVE_WORKOUT_AGE_MS
 * is an abandoned session, not a workout: the user left without finishing and
 * came back the next day. Both consumers drop the start time in that case so
 * the screen never shows a 16-hour elapsed time.
 */

/** Longest a workout timer is allowed to keep running unattended. */
export const MAX_ACTIVE_WORKOUT_AGE_MS = 6 * 60 * 60 * 1000;

export interface ActiveWorkoutRouteParams {
  day: any;
  blockName: string;
  currentWeek: number;
  block?: any;
  routineName?: string;
}

export interface ActiveWorkoutSession {
  dayName: string;
  blockName: string;
  /** Seconds elapsed at the moment this snapshot was taken. */
  duration: number;
  routeParams: ActiveWorkoutRouteParams;
}

/** Shape of the record WorkoutStorage.saveCurrentWorkout persists. */
export interface CurrentWorkoutRecord {
  day?: any;
  blockName?: string;
  currentWeek?: number;
  block?: any;
  routineName?: string;
  allSetsData?: any[][];
  workoutStartTime?: string | Date | null;
  workoutDuration?: number;
  timestamp?: number;
  savedAt?: number;
}

export function parseWorkoutStartTime(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** True when a start time is too old to still be a live session. */
export function isWorkoutStartStale(start: Date | null, now: number = Date.now()): boolean {
  if (!start) return false;
  const age = now - start.getTime();
  // A start time in the future is a clock change, not a live workout either.
  return age < 0 || age > MAX_ACTIVE_WORKOUT_AGE_MS;
}

export function elapsedSecondsSince(start: Date, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - start.getTime()) / 1000));
}

/**
 * The session a stored record represents, or null when it holds no live timer.
 * Used at launch to seed ActiveWorkoutContext (and so the resume bar).
 */
export function sessionFromRecord(
  record: CurrentWorkoutRecord | null | undefined,
  now: number = Date.now(),
): ActiveWorkoutSession | null {
  if (!record) return null;
  const start = parseWorkoutStartTime(record.workoutStartTime);
  if (!start || isWorkoutStartStale(start, now)) return null;

  const dayName = record.day?.day_name;
  const blockName = record.blockName;
  if (!dayName || !blockName) return null;

  return {
    dayName,
    blockName,
    duration: elapsedSecondsSince(start, now),
    routeParams: {
      day: record.day,
      blockName,
      currentWeek: record.currentWeek || 1,
      block: record.block,
      routineName: record.routineName ?? record.block?.routineName,
    },
  };
}

/** Same (day, block, week) — the identity of a session for matching purposes. */
export function isSameWorkoutSession(
  a: { day?: any; blockName?: string; currentWeek?: number } | null | undefined,
  b: { day?: any; blockName?: string; currentWeek?: number } | null | undefined,
): boolean {
  if (!a || !b) return false;
  return (
    a.day?.day_name === b.day?.day_name &&
    a.blockName === b.blockName &&
    (a.currentWeek || 1) === (b.currentWeek || 1)
  );
}
