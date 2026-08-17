// src/utils/checkIn.ts
//
// When the weekly check-in is due, and the two writes it performs.
//
// WHY A ROLLING WINDOW, NOT A FIXED DAY. A fixed check-in day nags someone who
// already weighed in yesterday and stays silent for six days after someone
// misses theirs. Counting from the last completed check-in means a user who is
// already logging is never interrupted, which is the whole reason the badge can
// stay a single quiet dot rather than escalating.
//
// The user can still pin it to a weekday: preferredDay is stored and, when set,
// the due date rounds forward to the next occurrence of that day. Default is
// every seven days from the last one.
//
// THE BADGE CLEARS ON COMPLETION, NOT ON VIEW. Clearing when someone opens
// Profile forgets that they meant to come back, and this exists precisely to
// reach people who are not already logging. What stops it nagging is that it
// never escalates: one dot, no count, and an explicit skip inside the flow that
// stands the period down. The dot now appears on two surfaces (Profile and the
// tab bar), but it is the SAME dot in two places rather than two notifications:
// they read one source of truth and clear together on the same write.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordBodyFatReading } from './bodyFatHistory';
import { updateGoalsProfileField } from './goalsProfileStorage';
import { WorkoutStorage } from './storage';
import type { BodyFatSource } from './goalsProfile';

const STATE_KEY = '@check_in_state';

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_DAYS = 7;

export interface CheckInState {
  /** Last completed or explicitly skipped, whichever is later. */
  lastClosedAt?: string;
  /** 0 = Sunday. Unset means "every seven days from the last one". */
  preferredDay?: number;
}

// ------------------------------------------------------------- change notice
//
// ProfileScreen re-reads on focus, which is enough for a screen that unmounts.
// The tab bar does not: it is mounted for the whole session, so a value read at
// launch would still be claiming a check-in is waiting minutes after the user
// finished one. Every state write fans out to listeners so any long-lived
// consumer settles on the same tick as the screens do.

type CheckInListener = () => void;

const listeners = new Set<CheckInListener>();

/** Subscribe to check-in state writes. Returns an unsubscribe function. */
export function subscribeToCheckIn(listener: CheckInListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyCheckInChanged(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // A broken listener must not take down the write path.
    }
  });
}

export async function loadCheckInState(): Promise<CheckInState> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as CheckInState) : {};
  } catch {
    return {};
  }
}

async function saveCheckInState(next: CheckInState): Promise<void> {
  try {
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(next));
  } catch {
    // Best effort: a lost state write means one extra prompt, never lost data.
  }
  // Fires even if the write above threw: listeners derive from a fresh read, so
  // the worst case is they re-read and land on the value that is actually
  // stored, which is exactly what should be on screen.
  notifyCheckInChanged();
}

/** When the next check-in becomes available, given the last close. */
export function nextDueAt(state: CheckInState, now = new Date()): Date {
  if (!state.lastClosedAt) return now;
  const base = new Date(new Date(state.lastClosedAt).getTime() + PERIOD_DAYS * DAY_MS);
  if (state.preferredDay == null) return base;
  // Roll forward to the next occurrence of the chosen weekday, so pinning a day
  // can delay a check-in but never bring one forward into the same week.
  const ahead = (state.preferredDay - base.getDay() + 7) % 7;
  return new Date(base.getTime() + ahead * DAY_MS);
}

export function isCheckInDue(state: CheckInState, now = new Date()): boolean {
  return now.getTime() >= nextDueAt(state, now).getTime();
}

/** Whole days until the next one. Negative once it is due. */
export function daysUntilDue(state: CheckInState, now = new Date()): number {
  return Math.ceil((nextDueAt(state, now).getTime() - now.getTime()) / DAY_MS);
}

/** Completing and skipping close the period identically: the difference is what
 *  was written on the way, not how long the user is left alone. */
export async function closeCheckIn(preferredDay?: number): Promise<void> {
  const state = await loadCheckInState();
  await saveCheckInState({
    ...state,
    lastClosedAt: new Date().toISOString(),
    preferredDay: preferredDay ?? state.preferredDay,
  });
}

export async function setPreferredDay(day: number | undefined): Promise<void> {
  const state = await loadCheckInState();
  await saveCheckInState({ ...state, preferredDay: day });
}

// ---------------------------------------------------------------- the writes

export interface WeightHistoryEntry {
  id: string;
  weight: number;
  unit: 'kg' | 'lbs';
  date: string;
  notes?: string;
  bodyFatPct?: number;
}

/**
 * Appends a weigh-in to the same history the weight tracker reads, via
 * WorkoutStorage so the write goes through its write queue, pre-overwrite
 * backup and quarantine-on-corruption path rather than touching the
 * AsyncStorage key directly.
 */
export async function logWeighIn(
  weightKg: number,
  unit: 'kg' | 'lbs',
  bodyFatPct?: number,
  bodyFatSource?: BodyFatSource,
): Promise<void> {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return;
  try {
    const read = await WorkoutStorage.loadWeightHistoryResult();
    if (read.ok) {
      const entry: WeightHistoryEntry = {
        id: `${Date.now()}`,
        weight: unit === 'lbs' ? weightKg * 2.2046226218 : weightKg,
        unit,
        date: new Date().toISOString(),
        ...(bodyFatPct != null ? { bodyFatPct } : {}),
      };
      await WorkoutStorage.saveWeightHistory([...read.entries, entry]);
    }
  } catch {
    // ignore: the profile mirror below is what the rest of the app reads
  }

  await updateGoalsProfileField('currentWeightKg', weightKg);

  if (bodyFatPct != null) {
    await updateGoalsProfileField('currentBodyFatPct', bodyFatPct);
    if (bodyFatSource) await updateGoalsProfileField('bodyFatSource', bodyFatSource);
    // Dated, so it counts toward the trend the phase detector reads.
    await recordBodyFatReading(bodyFatPct, bodyFatSource, 'check-in');
  }
}