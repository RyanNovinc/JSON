// src/utils/phaseTransition.ts
//
// Transition detection — the piece that makes the roadmap real. Something has
// to notice when the user's body-fat TREND crosses the current phase's exit
// threshold and offer (never force) a regeneration.
//
// Everything above the storage ruler is PURE and unit-tested. The screen hook
// (WeightEntrySheet's save path) calls evaluateTransition() after a reading
// lands and shows a non-blocking prompt when { crossed: true } comes back and
// shouldPromptForCrossing() agrees.
//
// Design decisions, in line with the canon:
//   - Phases end on a NUMBER, never a date, and thresholds apply to a TREND:
//     single readings carry ±3–5 points of error (see BodyFatSource), so the
//     trend is the MEDIAN of the recent readings inside a window. A median
//     resists one bad scale morning or a switch from a visual estimate to a
//     real scan far better than a mean.
//   - Nothing automatic. Regeneration stays user-initiated; the app's targets
//     recompute correctly on regeneration because every prompt derives fresh
//     from the profile (already true since 9 Aug 2026).
//   - A dismissed prompt stays dismissed FOR THAT THRESHOLD. Crossing 18% and
//     saying "not now" must not nag on every subsequent weigh-in; a LATER
//     phase's different threshold prompts again.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GoalsProfile, RoutePreference } from './goalsProfile';
import { deriveRoadmap } from './roadmap';
import type { RoadmapPhaseKind } from './roadmap';

export interface BodyFatReading {
  /** ISO date of the reading. */
  dateISO: string;
  bodyFatPct: number;
}

/** Minimum readings inside the window before a trend exists at all. Below
 *  this, evaluateTransition never fires — one enthusiastic weigh-in must not
 *  end a phase. */
export const TREND_MIN_READINGS = 3;

/** How far back readings count toward the trend. Wide enough that a
 *  once-a-fortnight measurer still accumulates three, narrow enough that a
 *  reading from a different phase of life can't drag the median. */
export const TREND_WINDOW_DAYS = 45;

const DAY_MS = 86_400_000;

/**
 * The body-fat trend: median of the readings inside the window, or null when
 * fewer than TREND_MIN_READINGS qualify. Order of the input does not matter.
 */
export function bodyFatTrend(
  readings: BodyFatReading[],
  now: number = Date.now(),
): number | null {
  const cutoff = now - TREND_WINDOW_DAYS * DAY_MS;
  const inWindow = readings
    .filter((r) => {
      const t = new Date(r.dateISO).getTime();
      return Number.isFinite(t) && t >= cutoff && t <= now + DAY_MS;
    })
    .map((r) => r.bodyFatPct)
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);

  if (inWindow.length < TREND_MIN_READINGS) return null;

  const mid = Math.floor(inWindow.length / 2);
  return inWindow.length % 2
    ? inWindow[mid]
    : (inWindow[mid - 1] + inWindow[mid]) / 2;
}

/**
 * Whether a trend value counts as having crossed a phase's exit threshold.
 * Direction depends on the phase KIND, not on comparison alone:
 *   - recomp ends when the trend comes DOWN to the band ceiling (entered from above)
 *   - trim / reveal end when the trend comes DOWN to their target
 *   - build ends when the trend rises UP to the band ceiling
 */
export function exitCrossed(
  kind: RoadmapPhaseKind,
  exitBodyFatPct: number,
  trendPct: number,
): boolean {
  return kind === 'build'
    ? trendPct >= exitBodyFatPct
    : trendPct <= exitBodyFatPct;
}

export interface TransitionCheck {
  crossed: boolean;
  /** null when too few readings for a trend — never treated as crossed. */
  trendPct: number | null;
  thresholdPct: number;
  currentKind: RoadmapPhaseKind;
  /** Absent on a single-phase (HARD RULE 4) roadmap — the goal is the exit. */
  nextKind?: RoadmapPhaseKind;
  /** The next phase's own exit threshold, for prompt copy ("a trim to ~12%"). */
  nextExitBodyFatPct?: number;
}

/**
 * The whole check, derived FRESH from the current profile (never snapshots —
 * they ignore current weight and body fat by design). Returns null when there
 * is nothing to detect: no roadmap (no goal body fat), or a phase vocabulary
 * this doesn't cover.
 */
export function evaluateTransition(
  profile: GoalsProfile,
  readings: BodyFatReading[],
  route?: RoutePreference,
  now: number = Date.now(),
): TransitionCheck | null {
  const roadmap = deriveRoadmap(profile, route ?? profile.routePreference ?? 'balanced');
  if (!roadmap || roadmap.phases.length === 0) return null;

  const current = roadmap.phases[0];
  const trendPct = bodyFatTrend(readings, now);

  return {
    crossed: trendPct != null && exitCrossed(current.kind, current.exitBodyFatPct, trendPct),
    trendPct,
    thresholdPct: current.exitBodyFatPct,
    currentKind: current.kind,
    nextKind: roadmap.phases[1]?.kind,
    nextExitBodyFatPct: roadmap.phases[1]?.exitBodyFatPct,
  };
}

// ---------------------------------------------------------------------------
// Prompt dedup (storage boundary)
// ---------------------------------------------------------------------------

const DISMISSED_KEY = 'phase_transition_dismissed';

/** One prompt per threshold: crossing 18% and dismissing must not nag on the
 *  next weigh-in, while the NEXT phase's different threshold prompts again.
 *  Kind is part of the identity because a trim and a build can share a
 *  boundary number (the ceiling) in opposite directions. */
const crossingId = (check: TransitionCheck): string =>
  `${check.currentKind}@${check.thresholdPct}`;

export async function shouldPromptForCrossing(
  check: TransitionCheck,
): Promise<boolean> {
  if (!check.crossed) return false;
  try {
    const raw = await AsyncStorage.getItem(DISMISSED_KEY);
    const dismissed: string[] = raw ? JSON.parse(raw) : [];
    return !dismissed.includes(crossingId(check));
  } catch {
    // Storage trouble must never suppress the prompt silently forever;
    // erring toward showing it once more is the safe direction.
    return true;
  }
}

export async function markCrossingDismissed(check: TransitionCheck): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(DISMISSED_KEY);
    const dismissed: string[] = raw ? JSON.parse(raw) : [];
    const id = crossingId(check);
    if (!dismissed.includes(id)) dismissed.push(id);
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
  } catch (e) {
    console.error('markCrossingDismissed failed', e);
  }
}

/** For the regenerate path: once the user regenerates, the old dismissals are
 *  history — the new phase gets a clean slate. */
export async function clearCrossingDismissals(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DISMISSED_KEY);
  } catch (e) {
    console.error('clearCrossingDismissals failed', e);
  }
}