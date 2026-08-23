// src/utils/roadmapStorage.ts
//
// Snapshots of the roadmap AS IT WAS RECOMMENDED, with the inputs that
// produced it and the date.
//
// WHY THIS EXISTS, AND WHY NOW. The roadmap's timeline comes from population
// averages — the decay curve carries ±30–40% individual variation, so the
// first estimate a user sees is a cold start. Once there are six to twelve
// months of logged weight, body fat and training, the app can stop guessing
// and re-estimate from that person's OWN measured rate, and the range should
// collapse hard.
//
// None of that is possible without a record of what was predicted. Deviation
// is (what happened) minus (what we said would happen), and the second term
// is unrecoverable after the fact: profiles get edited, goals change, and the
// derivation constants themselves will move as the research improves. A plan
// recomputed today from today's constants is NOT the plan the user was given.
//
// So this file is deliberately ahead of its consumer. The re-estimation
// engine is not built and should not be built yet — it has nothing to
// calibrate against. Capturing the snapshots is cheap now and impossible to
// backfill, which is the whole test for what to build early.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GoalsProfile, RoutePreference } from './goalsProfile';
import type { Roadmap } from './roadmap';

const KEY = '@roadmap_snapshots';

/**
 * Bumped whenever the SHAPE of a snapshot changes, or whenever the derivation
 * constants in roadmap.ts move enough that old snapshots are no longer
 * comparable to new ones. A deviation calculation must never mix versions
 * silently — that would attribute a change in our own model to the user's
 * progress.
 */
export const ROADMAP_MODEL_VERSION = 2;

// v1 -> v2, 24 Aug 2026. BOTH triggers above fired at once. The snapshot SHAPE
// changed (peakWeightKg and peakLeanness left SnapshotInputs; regainKg and
// novelKg left Roadmap), and the derivation moved far enough that old and new
// snapshots are not comparable: removing the regain credit took a returning
// lifter with an 11.5 kg gap from roughly 6-11 months to roughly 25.
//
// Comparing across that boundary would read our own model change as the user
// falling behind, which is the exact failure this field exists to prevent.
// v1 snapshots are KEPT — readAll does not filter on version — and they still
// carry the removed keys in their stored JSON, which is inert. shouldSnapshot's
// version check means the first read after upgrade records a fresh v2 baseline.

/** The inputs, frozen. Not a reference to the live profile, a copy. */
export interface SnapshotInputs {
  currentWeightKg: number;
  currentBodyFatPct?: number;
  goalWeightKg?: number;
  goalBodyFatPct?: number;
  trainingState: GoalsProfile['trainingState'];
  sex?: GoalsProfile['sex'];
  ageYears?: number;
  heightCm?: number;
}

export interface RoadmapSnapshot {
  /** ISO timestamp. Doubles as the identity — snapshots are append-only. */
  createdAt: string;
  modelVersion: number;
  route: RoutePreference;
  inputs: SnapshotInputs;
  roadmap: Roadmap;
}

/**
 * Cap on stored snapshots. The FIRST one is never evicted: it is the baseline
 * every later comparison is drawn against, and it is the only one that can
 * answer "how far off was the original promise". Everything after it is a
 * rolling window.
 */
const MAX_SNAPSHOTS = 12;

/** Re-plan cadence. A snapshot older than this is stale enough to re-record
 *  even when nothing the user controls has changed, so the history stays
 *  sampled over time rather than clustering around edits. */
const RESNAPSHOT_AFTER_DAYS = 30;

function toInputs(p: GoalsProfile): SnapshotInputs {
  return {
    currentWeightKg: p.currentWeightKg,
    currentBodyFatPct: p.currentBodyFatPct,
    goalWeightKg: p.goalWeightKg,
    goalBodyFatPct: p.goalBodyFatPct,
    trainingState: p.trainingState,
    sex: p.sex,
    ageYears: p.ageYears,
    heightCm: p.heightCm,
  };
}

const daysBetween = (a: string, b: number) =>
  (b - new Date(a).getTime()) / 86_400_000;

/**
 * Whether a new snapshot is worth recording.
 *
 * Weight moves constantly and body fat readings jitter by several points, so
 * recording on every change would fill the history with noise and evict the
 * signal. What matters is a change to the DESTINATION or the ROUTE — those
 * make the previous plan a different plan — plus a time-based sample so a
 * user who changes nothing still accumulates a trail.
 */
export function shouldSnapshot(
  latest: RoadmapSnapshot | undefined,
  profile: GoalsProfile,
  route: RoutePreference,
  now: number = Date.now(),
): boolean {
  if (!latest) return true;
  if (latest.modelVersion !== ROADMAP_MODEL_VERSION) return true;
  if (latest.route !== route) return true;

  const i = latest.inputs;
  if (i.goalWeightKg !== profile.goalWeightKg) return true;
  if (i.goalBodyFatPct !== profile.goalBodyFatPct) return true;
  if (i.trainingState !== profile.trainingState) return true;
  if (i.heightCm !== profile.heightCm) return true;
  if (i.sex !== profile.sex) return true;

  return daysBetween(latest.createdAt, now) >= RESNAPSHOT_AFTER_DAYS;
}

async function readAll(): Promise<RoadmapSnapshot[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive: a malformed entry is dropped rather than crashing every
    // reader. Same principle as sanitizeGoalsProfile.
    return parsed.filter(
      (s: any) => s && typeof s.createdAt === 'string' && s.roadmap && s.inputs,
    );
  } catch (e) {
    console.error('loadRoadmapSnapshots failed', e);
    return [];
  }
}

export async function loadRoadmapSnapshots(): Promise<RoadmapSnapshot[]> {
  return readAll();
}

export async function loadLatestRoadmapSnapshot(): Promise<RoadmapSnapshot | undefined> {
  const all = await readAll();
  return all[all.length - 1];
}

/** The original plan. What every deviation calculation is measured against. */
export async function loadBaselineRoadmapSnapshot(): Promise<RoadmapSnapshot | undefined> {
  const all = await readAll();
  return all[0];
}

/**
 * Records a snapshot if one is warranted. Returns the snapshot written, or
 * undefined when nothing material changed.
 *
 * Best-effort by design: a failed write must never block the user seeing
 * their route. Losing one snapshot costs a data point; a thrown error costs
 * the screen.
 */
export async function recordRoadmapSnapshot(
  profile: GoalsProfile,
  route: RoutePreference,
  roadmap: Roadmap,
): Promise<RoadmapSnapshot | undefined> {
  try {
    const all = await readAll();
    const latest = all[all.length - 1];
    if (!shouldSnapshot(latest, profile, route)) return undefined;

    const snapshot: RoadmapSnapshot = {
      createdAt: new Date().toISOString(),
      modelVersion: ROADMAP_MODEL_VERSION,
      route,
      inputs: toInputs(profile),
      roadmap,
    };

    const next = [...all, snapshot];
    // Evict from the middle, never the baseline and never the newest.
    while (next.length > MAX_SNAPSHOTS) next.splice(1, 1);

    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return snapshot;
  } catch (e) {
    console.error('recordRoadmapSnapshot failed', e);
    return undefined;
  }
}

export async function clearRoadmapSnapshots(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    console.error('clearRoadmapSnapshots failed', e);
  }
}