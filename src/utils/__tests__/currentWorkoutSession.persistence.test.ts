/**
 * Current-workout session persistence.
 *
 * Covers the fix for the "982:39 workout timer" defect: an in-progress record's
 * start time outlived the session it belonged to. Three rules are pinned here:
 *  1. The record key includes the week, and the two legacy key shapes are still
 *     read and migrated forward (so an in-flight workout survives the update).
 *  2. clearCurrentWorkout removes the week key AND the pre-week key.
 *  3. A start time older than MAX_ACTIVE_WORKOUT_AGE_MS is not a live session,
 *     for the adapter's restore and for the launch-time resume-bar rehydration.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutStorage } from '../storage';
import {
  MAX_ACTIVE_WORKOUT_AGE_MS,
  isWorkoutStartStale,
  sessionFromRecord,
  isSameWorkoutSession,
  elapsedSecondsSince,
} from '../activeWorkoutSession';

const DAY = { day_name: 'Full Body A — Squat Focus', exercises: [] };
const BLOCK = 'Block 1 — Foundation';
const PREFIX = 'current_workout_progress';
const weekKey = (week: number) => `${PREFIX}_${DAY.day_name}_${BLOCK}_week${week}`;
const legacyDayKey = `${PREFIX}_${DAY.day_name}_${BLOCK}`;

const record = (overrides: Record<string, any> = {}) => ({
  day: DAY,
  blockName: BLOCK,
  currentWeek: 2,
  allSetsData: [[{ weight: '20', reps: '10', completed: false }]],
  workoutStartTime: new Date().toISOString(),
  workoutDuration: 5,
  timestamp: Date.now(),
  ...overrides,
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('WorkoutStorage current-workout keys', () => {
  it('saves under a week-qualified key and loads it back by week', async () => {
    await WorkoutStorage.saveCurrentWorkout(record({ currentWeek: 2 }));

    expect(await AsyncStorage.getItem(weekKey(2))).not.toBeNull();
    expect(await AsyncStorage.getItem(legacyDayKey)).toBeNull();

    const loaded = await WorkoutStorage.loadCurrentWorkout(DAY.day_name, BLOCK, 2);
    expect(loaded.currentWeek).toBe(2);
    expect(loaded.allSetsData[0][0].weight).toBe('20');
  });

  it('keeps weeks apart: a week-1 session is invisible when opening week 2', async () => {
    await WorkoutStorage.saveCurrentWorkout(record({ currentWeek: 1 }));

    expect(await WorkoutStorage.loadCurrentWorkout(DAY.day_name, BLOCK, 2)).toBeNull();
    expect(await WorkoutStorage.loadCurrentWorkout(DAY.day_name, BLOCK, 1)).not.toBeNull();
  });

  it('migrates a pre-week record forward on read and removes the legacy key', async () => {
    const legacy = record({ currentWeek: undefined });
    delete (legacy as any).currentWeek;
    await AsyncStorage.setItem(legacyDayKey, JSON.stringify(legacy));

    const loaded = await WorkoutStorage.loadCurrentWorkout(DAY.day_name, BLOCK, 3);
    expect(loaded).not.toBeNull();
    expect(loaded.currentWeek).toBe(3);
    expect(loaded.workoutStartTime).toBe(legacy.workoutStartTime);

    expect(await AsyncStorage.getItem(legacyDayKey)).toBeNull();
    expect(await AsyncStorage.getItem(weekKey(3))).not.toBeNull();
  });

  it('still falls back to the original single-slot key', async () => {
    await AsyncStorage.setItem(PREFIX, JSON.stringify(record()));
    const loaded = await WorkoutStorage.loadCurrentWorkout(DAY.day_name, BLOCK, 2);
    expect(loaded).not.toBeNull();
  });

  it('clearCurrentWorkout removes both the week key and the pre-week key', async () => {
    await AsyncStorage.setItem(weekKey(2), JSON.stringify(record()));
    await AsyncStorage.setItem(legacyDayKey, JSON.stringify(record()));

    await WorkoutStorage.clearCurrentWorkout(DAY.day_name, BLOCK, 2);

    expect(await AsyncStorage.getItem(weekKey(2))).toBeNull();
    expect(await AsyncStorage.getItem(legacyDayKey)).toBeNull();
    // Finishing week 2 never touches a genuine week-1 record.
    await AsyncStorage.setItem(weekKey(1), JSON.stringify(record({ currentWeek: 1 })));
    await WorkoutStorage.clearCurrentWorkout(DAY.day_name, BLOCK, 2);
    expect(await AsyncStorage.getItem(weekKey(1))).not.toBeNull();
  });

  it('loadAllCurrentWorkouts lists every record, newest save first, skipping corrupt ones', async () => {
    await AsyncStorage.setItem(weekKey(1), JSON.stringify(record({ currentWeek: 1, savedAt: 100 })));
    await AsyncStorage.setItem(weekKey(2), JSON.stringify(record({ currentWeek: 2, savedAt: 300 })));
    await AsyncStorage.setItem(`${PREFIX}_Other_Block`, '{not json');
    await AsyncStorage.setItem('unrelated_key', '{}');

    const all = await WorkoutStorage.loadAllCurrentWorkouts();
    expect(all.map((r) => r.currentWeek)).toEqual([2, 1]);
  });
});

describe('activeWorkoutSession helpers', () => {
  const NOW = Date.parse('2026-09-18T09:19:00.000Z');

  it('treats a start time inside the window as live and one outside it as stale', () => {
    const fresh = new Date(NOW - 45 * 60 * 1000);
    const edge = new Date(NOW - MAX_ACTIVE_WORKOUT_AGE_MS);
    const stale = new Date(NOW - MAX_ACTIVE_WORKOUT_AGE_MS - 1);
    const yesterday = new Date(NOW - 16.5 * 60 * 60 * 1000); // the 982-minute case
    const future = new Date(NOW + 60 * 1000);

    expect(isWorkoutStartStale(fresh, NOW)).toBe(false);
    expect(isWorkoutStartStale(edge, NOW)).toBe(false);
    expect(isWorkoutStartStale(stale, NOW)).toBe(true);
    expect(isWorkoutStartStale(yesterday, NOW)).toBe(true);
    expect(isWorkoutStartStale(future, NOW)).toBe(true);
    expect(isWorkoutStartStale(null, NOW)).toBe(false);
  });

  it('builds a resumable session from a fresh record and rebuilds the route params', () => {
    const start = new Date(NOW - 754 * 1000);
    const session = sessionFromRecord(
      record({
        workoutStartTime: start.toISOString(),
        currentWeek: 2,
        block: { block_name: BLOCK, routineName: 'Foundation' },
      }),
      NOW,
    );

    expect(session).not.toBeNull();
    expect(session!.dayName).toBe(DAY.day_name);
    expect(session!.duration).toBe(754);
    expect(session!.routeParams).toMatchObject({
      blockName: BLOCK,
      currentWeek: 2,
      routineName: 'Foundation',
    });
    expect(session!.routeParams.day).toBe(DAY);
  });

  it('yields no session for a stale record, a timer-less record, or one missing identity', () => {
    const yesterday = new Date(NOW - 16.5 * 60 * 60 * 1000).toISOString();
    expect(sessionFromRecord(record({ workoutStartTime: yesterday }), NOW)).toBeNull();
    expect(sessionFromRecord(record({ workoutStartTime: null }), NOW)).toBeNull();
    expect(sessionFromRecord(record({ day: {} }), NOW)).toBeNull();
    expect(sessionFromRecord(null, NOW)).toBeNull();
  });

  it('matches sessions on day, block and week', () => {
    const a = { day: DAY, blockName: BLOCK, currentWeek: 1 };
    expect(isSameWorkoutSession(a, { day: DAY, blockName: BLOCK, currentWeek: 1 })).toBe(true);
    expect(isSameWorkoutSession(a, { day: DAY, blockName: BLOCK, currentWeek: 2 })).toBe(false);
    expect(isSameWorkoutSession(a, { day: DAY, blockName: 'Block 2', currentWeek: 1 })).toBe(false);
    // A missing week means week 1 (the adapter defaults currentWeek || 1).
    expect(isSameWorkoutSession(a, { day: DAY, blockName: BLOCK })).toBe(true);
    expect(isSameWorkoutSession(a, null)).toBe(false);
  });

  it('never reports negative elapsed time', () => {
    expect(elapsedSecondsSince(new Date(NOW + 5000), NOW)).toBe(0);
    expect(elapsedSecondsSince(new Date(NOW - 5000), NOW)).toBe(5);
  });
});
