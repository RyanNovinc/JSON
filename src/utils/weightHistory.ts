// src/utils/weightHistory.ts
//
// The one way to record a weight the user has told us.
//
// ── THE BUG THIS EXISTS FOR ─────────────────────────────────────────────────
//
// Weight lives in two places: `GoalsProfile.currentWeightKg` (what every plan
// is calculated from) and `weight_tracking_history` (the dated series the
// charts and the phase-transition trend read).
//
// WeightEntrySheet writes an entry and then mirrors it into the profile, so
// the tracker keeps both in step. Nothing went the other way. RouteScreen and
// ConfirmStatsScreen both call `updateGoalsProfileField('currentWeightKg')`
// directly and leave no dated entry behind, so a user who updated their weight
// in the route flow saw the new number on ConfirmStats above the line "logged
// 5 days ago" — the profile had moved and the history had not.
//
// It costs more than a confusing label. The weight series is what a future
// trend correction would read, and it was missing every weigh-in that happened
// outside the tracker.
//
// ── WHY THE GUARDS ARE COPIED, NOT SIMPLIFIED ───────────────────────────────
//
// This series is the one store in the app with backups, quarantine and
// read-back verification, and the guards below are load-bearing:
//
//   - `loadWeightHistoryResult` distinguishes "no entries yet" from "could not
//     read". Writing `[entry, ...[]]` after a FAILED read replaces the user's
//     entire history with one row. That is the data-loss path.
//   - the read-back confirms the entry actually landed. A silently dropped
//     write used to surface weeks later as a missing weigh-in.
//
// Anything calling this gets both for free. That is the point of it existing.
//
// ── KNOWN DUPLICATION, deliberate for now ───────────────────────────────────
//
// WeightEntrySheet has its own copy of this save, and has NOT been migrated.
// Its version does two extra things: it runs phase-transition detection off the
// just-written history, and it merges the whole profile in one write rather
// than field by field. Folding those in means refactoring the one path in the
// app with backups and read-back verification, which is not a change to make
// without a device to test it on.
//
// So there are two copies. If the guards here ever change, change them there
// too — that file is the reference implementation and this is the extraction.

import { WorkoutStorage } from './storage';
import { loadGoalsProfile, updateGoalsProfileField } from './goalsProfileStorage';
import { recordBodyFatReading } from './bodyFatHistory';
import type { BodyFatSource } from './goalsProfile';

const LBS_TO_KG = 0.453592;

export interface WeightEntryRecord {
  id: string;
  weight: number;
  unit: 'kg' | 'lbs';
  date: string;
  notes?: string;
  bodyFatPct?: number;
}

export type RecordWeightResult =
  | { ok: true; entry: WeightEntryRecord }
  | { ok: false; reason: 'unreadable' | 'unverified' | 'invalid' };

export interface RecordWeightArgs {
  /** Always kilograms. Conversion happens at the edges, as everywhere else. */
  weightKg: number;
  /** The unit to STORE in, so the chart shows what the user typed. */
  unit: 'kg' | 'lbs';
  bodyFatPct?: number;
  bodyFatSource?: BodyFatSource;
  notes?: string;
  /** Which screen recorded it. Diagnostics only. */
  origin?: string;
}

/**
 * Records a weigh-in in BOTH stores, in the order that cannot lose data.
 *
 * The entry goes first and is verified. The profile mirror runs after and is
 * non-fatal: if it fails, the weigh-in is still safely stored and the next
 * screen that reads the profile shows a slightly old number, which is a much
 * smaller problem than a lost entry.
 *
 * Returns a result rather than alerting, so a screen mid-flow can log and
 * carry on while the tracker sheet can tell the user something went wrong.
 */
export async function recordWeightEntry(args: RecordWeightArgs): Promise<RecordWeightResult> {
  const { weightKg, unit, bodyFatPct, bodyFatSource, notes, origin } = args;

  if (!Number.isFinite(weightKg) || weightKg <= 0) return { ok: false, reason: 'invalid' };

  const displayWeight = unit === 'lbs' ? weightKg / LBS_TO_KG : weightKg;

  const entry: WeightEntryRecord = {
    // Date.now() alone collides when two saves land in the same millisecond,
    // and a duplicate id makes a later delete remove the wrong row.
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    weight: Math.round(displayWeight * 10) / 10,
    unit,
    date: new Date().toISOString(),
    notes: notes?.trim() || undefined,
    bodyFatPct: bodyFatPct == null ? undefined : Math.round(bodyFatPct * 10) / 10,
  };

  const read = await WorkoutStorage.loadWeightHistoryResult();
  if (!read.ok) {
    console.error(`[recordWeightEntry:${origin ?? 'unknown'}] store unreadable`, read.reason);
    return { ok: false, reason: 'unreadable' };
  }

  await WorkoutStorage.saveWeightHistory([entry, ...(read.entries || [])]);

  const confirmed = await WorkoutStorage.loadWeightHistoryResult();
  if (!confirmed.ok || !confirmed.entries.some((e: any) => e?.id === entry.id)) {
    console.error(`[recordWeightEntry:${origin ?? 'unknown'}] save unverified`, confirmed.reason);
    return { ok: false, reason: 'unverified' };
  }

  // Mirror into the profile. Non-fatal by design — see the docstring.
  try {
    await updateGoalsProfileField('currentWeightKg', weightKg);
    if (bodyFatPct != null) {
      await updateGoalsProfileField('currentBodyFatPct', bodyFatPct);
      if (bodyFatSource) await updateGoalsProfileField('bodyFatSource', bodyFatSource);
      // The body-fat series is separate and deliberately so — see
      // bodyFatHistory's header on why a body-fat estimate is not a weigh-in.
      await recordBodyFatReading(bodyFatPct, bodyFatSource, origin);
    }
  } catch (e) {
    console.error(`[recordWeightEntry:${origin ?? 'unknown'}] profile mirror failed`, e);
  }

  return { ok: true, entry };
}

/**
 * How many days since the last recorded weigh-in, or null when there are none.
 *
 * Exists so "logged N days ago" is computed the same way everywhere. The
 * staleness label was reading the entry series while the value beside it came
 * from the profile — which is exactly how the two got to disagree.
 */
export async function daysSinceLastWeighIn(): Promise<number | null> {
  const read = await WorkoutStorage.loadWeightHistoryResult();
  if (!read.ok || !read.entries?.length) return null;

  const latest = read.entries.reduce((a: any, b: any) =>
    new Date(a?.date ?? 0).getTime() >= new Date(b?.date ?? 0).getTime() ? a : b,
  );
  if (!latest?.date) return null;

  const days = Math.floor((Date.now() - new Date(latest.date).getTime()) / 86_400_000);
  return Number.isFinite(days) ? Math.max(0, days) : null;
}