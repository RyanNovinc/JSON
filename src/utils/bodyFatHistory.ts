// src/utils/bodyFatHistory.ts
//
// A dated, append-only record of every body fat estimate the user gives.
//
// WHY THIS EXISTS. Phase transitions are detected from a body fat TREND, and
// phaseTransition.ts builds that trend from readings attached to weight
// entries. But four screens write GoalsProfile.currentBodyFatPct as a bare
// scalar and leave no dated reading behind: RouteScreen, GoalsStatsScreen,
// ConfirmStatsScreen and GoalsIntakeScreen. A user who re-estimates three times
// through the route flow produces zero trend data, so the detector can never
// fire for them. This is the store those screens write to.
//
// WHY NOT JUST APPEND A WEIGHT ENTRY. Because a body fat estimate is not a
// weigh-in. Creating an entry in weight_tracking_history would need a weight,
// and the only weight available is a stale profile value, so the weight chart
// would gain points the user never stood on a scale for. That series is the one
// signal in the app with backups, quarantine and read-back verification; it
// should not be polluted to make a different feature easier. The cost is that
// the trend now has two sources and has to merge them.
//
// PROVENANCE IS PER READING, not per profile. GoalsProfile.bodyFatSource is a
// single field whose own docstring says it exists so the app can compare two
// readings, which it cannot do when only the latest value has a source. A DEXA
// scan and a visual tier guess should not be medianed as equals, and that is
// only fixable if each reading carries its own source and date.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BodyFatSource } from './goalsProfile';

const KEY = '@body_fat_readings';

/** Kept small on purpose: the trend window is 45 days, so history beyond a
 *  year is dead weight in a value that is read on every weigh-in. */
const MAX_READINGS = 60;

export interface BodyFatReadingRecord {
  /** ISO timestamp. Doubles as identity, as with roadmap snapshots. */
  dateISO: string;
  bodyFatPct: number;
  /** How it was arrived at, so a future trend can weight a tape or scan
   *  reading above a tier guess instead of treating them alike. */
  source?: BodyFatSource;
  /** Which screen recorded it. Diagnostics only; never shown to the user. */
  origin?: string;
}

export async function loadBodyFatReadings(): Promise<BodyFatReadingRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is BodyFatReadingRecord =>
        r &&
        typeof r.dateISO === 'string' &&
        typeof r.bodyFatPct === 'number' &&
        Number.isFinite(r.bodyFatPct),
    );
  } catch {
    // Best effort throughout: a missing trend costs a prompt, never data.
    return [];
  }
}

/**
 * Appends a reading. Two guards, both about not manufacturing a trend out of
 * one estimate:
 *
 *   - An identical value logged again within the same day replaces rather than
 *     appends. Dragging the estimator back and forth on one screen should not
 *     produce five readings that then median to a fake consensus.
 *   - Everything else appends, including a different value on the same day,
 *     because changing your mind is a real second reading.
 */
export async function recordBodyFatReading(
  bodyFatPct: number,
  source?: BodyFatSource,
  origin?: string,
): Promise<void> {
  if (!Number.isFinite(bodyFatPct) || bodyFatPct <= 0) return;
  try {
    const readings = await loadBodyFatReadings();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const sameDayIdentical = readings.findIndex(
      (r) => r.dateISO.slice(0, 10) === today && Math.round(r.bodyFatPct) === Math.round(bodyFatPct),
    );

    const record: BodyFatReadingRecord = {
      dateISO: now.toISOString(),
      bodyFatPct,
      source,
      origin,
    };

    const next =
      sameDayIdentical >= 0
        ? readings.map((r, i) => (i === sameDayIdentical ? record : r))
        : [...readings, record];

    next.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    await AsyncStorage.setItem(KEY, JSON.stringify(next.slice(-MAX_READINGS)));
  } catch {
    // Swallowed deliberately. A failed reading must never block the save the
    // user actually asked for.
  }
}

export async function clearBodyFatReadings(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}