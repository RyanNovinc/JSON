// src/utils/phaseTransition.ts
//
// Transition detection — the piece that makes the roadmap real. Something has
// to notice when the user has reached the current phase's exit and offer
// (never force) a regeneration.
//
// ── REWRITTEN 18 Aug 2026: DETECTS ON WEIGHT, NOT BODY FAT ──────────────────
//
// This used to read a body-fat TREND against the phase's exitBodyFatPct. An
// independent measurement review killed that:
//
//   - Consumer foot-to-foot BIA body fat has limits of agreement against DXA
//     of roughly ±4-8 PERCENTAGE POINTS, is worst exactly where change
//     detection matters, and moves with hydration, last meal and recent
//     exercise.
//   - Even DXA's least significant change is 1.0-1.5 kg of fat on
//     consecutive-day repeat scans (PMID 30454952).
//   - A phase moving someone 18% to 15% is about 2.4 kg of fat. That sits at
//     the edge of DXA's resolution and ENTIRELY BELOW a smart scale's noise
//     floor.
//
// So the old detector was reading noise and calling it a phase ending. Nothing
// about the code was wrong; the signal was unmeasurable.
//
// Bodyweight is different. Day-to-day within-person SD is about 0.53% of
// bodyweight (Vasey et al., Renal Failure 2023), so a smoothed weight trend CAN
// resolve the changes these phases target. deriveRoadmap now emits an
// `exitWeightKg` per phase, computed from the lean mass the model carries at
// that point, and this detects against that instead.
//
// Body fat is still shown to the user everywhere. It is simply no longer the
// thing a decision is taken on.
//
// Design decisions that survive from the original:
//   - Phases end on a NUMBER, never a date, and thresholds apply to a TREND.
//   - Nothing automatic. Regeneration stays user-initiated.
//   - A dismissed prompt stays dismissed FOR THAT THRESHOLD.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GoalsProfile, RoutePreference } from './goalsProfile';
import { deriveRoadmap } from './roadmap';
import type { RoadmapPhaseKind } from './roadmap';
import { phasesAt } from './phaseJourney';

export interface WeightReading {
  /** ISO date of the reading. */
  dateISO: string;
  weightKg: number;
}

/**
 * A body-composition reading precise enough to be believed — in practice a DXA
 * scan, because nothing else a home user has can resolve the change a phase
 * targets. See PRECISE_BODY_FAT_SOURCES in goalsProfile.
 */
export interface PreciseBodyFatReading {
  dateISO: string;
  bodyFatPct: number;
}

/**
 * How stale a scan may be and still count, in days.
 *
 * DXA users scan every three to six months, so the "three readings in 45 days"
 * rule the weight path uses would exclude them permanently — a single scan has
 * to be able to stand on its own. 120 days is the honest outer edge: past that
 * the body has had a season to move and the scan describes someone else.
 */
export const SCAN_MAX_AGE_DAYS = 120;

/**
 * Tolerance on a scan, in percentage points.
 *
 * DXA's least significant change on consecutive-day repeat scans is roughly
 * 1.0-1.5 kg of fat (PMID 30454952), which on an 80 kg person is about 1.5-2
 * percentage points. Half a point is well inside that and exists only to stop a
 * scan landing exactly on the threshold from being read as "not there yet" —
 * the same boundary problem EXIT_TOLERANCE_KG solves for weight.
 */
export const SCAN_TOLERANCE_PCT = 0.5;

/** Minimum readings inside the window before a trend exists at all. Below
 *  this, evaluateTransition never fires — one enthusiastic weigh-in must not
 *  end a phase. */
export const TREND_MIN_READINGS = 3;

/**
 * Minimum span the readings must cover, in days.
 *
 * NEW. Three readings taken in one afternoon are three samples of the same
 * moment, not a trend — and on weight that is a real failure mode, because
 * stepping on and off a scale three times is easy in a way that three body-fat
 * scans never was. The measurement review put the time to resolve a 0.5%/week
 * rate at about 15 days of daily weights, inflated toward 3-4 weeks once
 * autocorrelation is allowed for; 7 days is well under that and is deliberately
 * a floor on NONSENSE rather than a claim of statistical adequacy.
 */
export const TREND_MIN_SPAN_DAYS = 7;

/** How far back readings count toward the trend. */
export const TREND_WINDOW_DAYS = 45;

/**
 * Effective smoothing window for the exponentially weighted average, in days.
 *
 * The review compared EWMA, Kalman smoothing, LOESS, k-NN and random forests on
 * real daily smart-scale data (Turicchi et al., JMIR mHealth 2020, PMID
 * 32915155) and found EWMA and Kalman tied best at RMSE ~0.62-0.64%. Kalman is
 * formally an EWMA with an adaptive smoothing factor, so a plain EWMA gets
 * nearly all of the benefit for a fraction of the complexity. Recommended
 * effective window was 10-14 days.
 */
export const TREND_EWMA_DAYS = 12;

/**
 * Window used for DECISIONS — phase exits and the pace check. 28 days.
 *
 * ── WHY A SECOND WINDOW EXISTS, 19 Aug 2026 ────────────────────────────────
 *
 * Menstrual fluid retention moves bodyweight by about 0.45 kg on average and up
 * to 1-3 kg individually (Kanellakis 2023). For a 70 kg woman that equals or
 * exceeds a whole week of prescribed fat loss, so a phase exit evaluated at the
 * wrong point in her cycle can be inverted by water.
 *
 * THE EWMA CANNOT FIX THIS. An exponentially weighted average is a first-order
 * low-pass filter, and at a 28-day period with a 12-day centre of mass it still
 * passes about a third of the oscillation. Getting that under 10% would need a
 * centre of mass around 44 days, which destroys responsiveness for everyone.
 *
 * A SIMPLE MEAN OVER A FULL CYCLE DOES. An unweighted mean of length L has an
 * exact null at period L, and it degrades gently when L is wrong: a 28-day mean
 * passes 10% of a 25-day cycle and 7% of a 30-day one. Bull 2019 (612,613
 * cycles) puts the mean cycle at 29.3 ± 5.2 days, so a fixed 28 covers the
 * realistic range.
 *
 * APPLIED TO EVERYONE, not gated on sex. It costs men nothing — there is no
 * 28-day male oscillation to null and a longer window is simply more precise —
 * and it means no sex flag stands between a user and correct behaviour. That is
 * the part worth defending: a safety property that depends on a profile field
 * being filled in is not a safety property.
 *
 * The 12-day EWMA survives for DISPLAY, where responsiveness is the point and a
 * wrong call costs nothing.
 */
export const TREND_DECISION_DAYS = 28;

const DAY_MS = 86_400_000;

/**
 * The weight trend: an exponentially weighted average of the readings inside
 * the window, or null when too few readings or too short a span qualify.
 *
 * WHY NOT THE MEDIAN, which is what this used for body fat. The median was
 * there to survive one bad reading, and on BODY FAT that mattered enormously:
 * switching from a visual estimate to a smart scale could move a reading five
 * points in a single step, and a mean would have chased it. Weight has no
 * equivalent failure mode — nobody misreads their own weight by 5 kg — so the
 * outlier protection buys much less, while the median's insensitivity to WHEN a
 * reading happened costs real accuracy on a value that is genuinely trending.
 *
 * Weighting is by age of the reading, not by position in the list, so an
 * irregular weigher gets the same treatment as a daily one.
 *
 * THE OUTLIER GUARD IS DELIBERATELY LOOSE. It rejects readings more than 15%
 * from the window median, which catches typed nonsense — a transposed 79 into
 * 97, a misplaced decimal — and nothing else. It does NOT reject a reading a
 * few kg off the others, because on weight that is far more likely to be real
 * than wrong: a holiday, an illness, a heavy sodium week. The median this
 * replaced would have discarded such a reading, and on BODY FAT that was right
 * (a five-point jump there usually meant the measurement method changed). On
 * weight it would be throwing away signal.
 */
export function weightTrend(
  readings: WeightReading[],
  now: number = Date.now(),
): number | null {
  const cutoff = now - TREND_WINDOW_DAYS * DAY_MS;
  const inWindow = readings
    .map((r) => ({ t: new Date(r.dateISO).getTime(), kg: r.weightKg }))
    .filter(
      (r) =>
        Number.isFinite(r.t) &&
        Number.isFinite(r.kg) &&
        r.kg > 0 &&
        r.t >= cutoff &&
        r.t <= now + DAY_MS,
    );

  if (inWindow.length < TREND_MIN_READINGS) return null;

  // Gross-error rejection against the window median. 15% of bodyweight is far
  // outside anything physiology produces over 45 days and comfortably inside
  // what a typo produces.
  const sorted = inWindow.map((r) => r.kg).sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
  const kept = inWindow.filter((r) => Math.abs(r.kg - median) / median <= 0.15);
  if (kept.length < TREND_MIN_READINGS) return null;

  const times = kept.map((r) => r.t);
  const spanDays = (Math.max(...times) - Math.min(...times)) / DAY_MS;
  if (spanDays < TREND_MIN_SPAN_DAYS) return null;

  // Half-life form: a reading TREND_EWMA_DAYS old counts for 1/e of one taken
  // today. Normalised by the weights actually present, so a gap in the data
  // shifts influence rather than biasing the level.
  let num = 0;
  let den = 0;
  kept.forEach((r) => {
    const ageDays = (now - r.t) / DAY_MS;
    const w = Math.exp(-Math.max(0, ageDays) / TREND_EWMA_DAYS);
    num += w * r.kg;
    den += w;
  });
  return den > 0 ? num / den : null;
}

/**
 * The DECISION trend: an unweighted mean of the readings in the last 28 days.
 *
 * Unweighted on purpose. The whole reason this exists is the exact null a
 * uniform mean has at its own window length (see TREND_DECISION_DAYS); any
 * weighting destroys that null and hands back a share of the menstrual swing.
 * So the responsiveness the EWMA buys is deliberately given up here, because
 * this is the value a phase ending is judged on and being right matters more
 * than being quick.
 *
 * Shares weightTrend's guards: minimum readings, minimum span, and the same
 * gross-error filter against the median.
 */
export function decisionTrend(
  readings: WeightReading[],
  now: number = Date.now(),
): number | null {
  const cutoff = now - TREND_DECISION_DAYS * DAY_MS;
  const inWindow = readings
    .map((r) => ({ t: new Date(r.dateISO).getTime(), kg: r.weightKg }))
    .filter(
      (r) =>
        Number.isFinite(r.t) && Number.isFinite(r.kg) && r.kg > 0 && r.t >= cutoff && r.t <= now + DAY_MS,
    );
  if (inWindow.length < TREND_MIN_READINGS) return null;

  const sorted = inWindow.map((r) => r.kg).sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
  const kept = inWindow.filter((r) => Math.abs(r.kg - median) / median <= 0.15);
  if (kept.length < TREND_MIN_READINGS) return null;

  const times = kept.map((r) => r.t);
  if ((Math.max(...times) - Math.min(...times)) / DAY_MS < TREND_MIN_SPAN_DAYS) return null;

  return kept.reduce((a, r) => a + r.kg, 0) / kept.length;
}

/**
 * Whether a trend weight counts as having reached a phase's exit.
 * Direction depends on the phase KIND:
 *   - build ends when the trend rises UP to its target weight
 *   - trim / reveal end when the trend comes DOWN to theirs
 *
 * TOLERANCE, and it is not cosmetic. The weighted average of three identical
 * 90 kg readings evaluates to 90.00000000000001 in JavaScript, so a bare
 * `<= 90` reported a user standing exactly on their target as not having
 * reached it. Fifty grams is far below anything a scale resolves or a body
 * changes meaningfully, so it costs nothing and removes a whole class of
 * boundary flake.
 *
 * RECOMP IS NOT DETECTABLE AND RETURNS FALSE. A recomp is weight-neutral by
 * construction, so there is no weight signal to read, and the measurement
 * review was explicit that a recomposition cannot be verified at home by any
 * available tool: the scale does not move, and consumer body fat cannot resolve
 * the small simultaneous changes. A recomp must be TIME-BOXED and confirmed by
 * the user, never auto-detected. Returning false here is the honest answer, not
 * a gap to be filled later.
 */
export const EXIT_TOLERANCE_KG = 0.05;

/**
 * The measured trend slope, as a percentage of bodyweight per week, with the
 * 95% confidence interval around it.
 *
 * WHY A SLOPE AND NOT JUST A LEVEL. A weight target on its own is dangerous
 * advice: "get to 76.7 kg" is satisfied by crash dieting there, and a large
 * share of what comes off that way is the muscle the plan exists to protect.
 * Garthe 2011 is the evidence — her slow group (0.7%/wk) GAINED lean while
 * losing fat; her fast group merely held it. So the rate is not a detail of the
 * plan, it IS the plan, and the weight is only where it lands.
 *
 * Ordinary least squares rather than the tidy equally-spaced formula, because
 * real weigh-ins are irregular. The confidence interval comes from the
 * residuals, which is what makes the "off plan" test below self-widening: sparse
 * or noisy data produces a wide interval and the app stays quiet, exactly as the
 * measurement review recommended.
 */
export function weightTrendSlope(
  readings: WeightReading[],
  now: number = Date.now(),
): { pctPerWeek: number; ciHalfWidth: number } | null {
  // Decision window, not the 45-day filter it used before. Same reasoning as
  // decisionTrend: a slope fitted across a partial cycle inherits the swing.
  const cutoff = now - TREND_DECISION_DAYS * DAY_MS;
  const pts = readings
    .map((r) => ({ t: new Date(r.dateISO).getTime(), kg: r.weightKg }))
    .filter(
      (r) => Number.isFinite(r.t) && Number.isFinite(r.kg) && r.kg > 0 && r.t >= cutoff && r.t <= now + DAY_MS,
    );
  if (pts.length < TREND_MIN_READINGS) return null;

  const sorted = pts.map((p) => p.kg).sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
  const kept = pts.filter((p) => Math.abs(p.kg - median) / median <= 0.15);
  if (kept.length < TREND_MIN_READINGS) return null;

  // x in weeks, y in kg.
  const xs = kept.map((p) => (p.t - now) / (7 * DAY_MS));
  const ys = kept.map((p) => p.kg);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  if (!(sxx > 0)) return null;
  const sxy = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
  const slopeKg = sxy / sxx;

  // Residual SD, then the standard error of the slope.
  const ss = xs.reduce((a, x, i) => a + (ys[i] - (my + slopeKg * (x - mx))) ** 2, 0);
  const se = n > 2 ? Math.sqrt(ss / (n - 2) / sxx) : Math.abs(slopeKg);

  const base = median > 0 ? median : my;
  return {
    pctPerWeek: (slopeKg / base) * 100,
    ciHalfWidth: (1.96 * se) / base * 100,
  };
}

export type Pace = 'on_track' | 'too_fast' | 'too_slow' | 'unknown';

/**
 * Whether a precise body-fat scan says this phase is finished.
 *
 * A SCAN CAN FIRE A PHASE ON ITS OWN, and the case that matters is when the two
 * signals DISAGREE: the scan says done, the weight trend says not yet. That is
 * not a glitch — DXA is the better instrument, and a user who paid for one
 * should get the benefit of it rather than being held to the proxy.
 *
 * Direction follows the phase kind exactly as the weight path does. Recomp is
 * the one case a scan CAN speak to where weight cannot, since a recomposition
 * is invisible on a scale by construction — so unlike exitReached, this does
 * not refuse it.
 *
 * Returns null when there is no usable scan, which the caller must treat as "no
 * opinion" rather than as "not finished".
 */
export function scanReachedExit(
  kind: RoadmapPhaseKind,
  exitBodyFatPct: number,
  scans: PreciseBodyFatReading[],
  now: number = Date.now(),
): boolean | null {
  const cutoff = now - SCAN_MAX_AGE_DAYS * DAY_MS;
  const usable = scans
    .map((s) => ({ t: new Date(s.dateISO).getTime(), pct: s.bodyFatPct }))
    .filter(
      (s) => Number.isFinite(s.t) && Number.isFinite(s.pct) && s.pct > 0 && s.pct < 70 && s.t >= cutoff && s.t <= now + DAY_MS,
    )
    .sort((a, b) => b.t - a.t);

  if (usable.length === 0) return null;

  // The most recent scan only. Averaging scans months apart would describe a
  // body that no longer exists; the latest one is the whole point of having it.
  const latest = usable[0].pct;
  return kind === 'build'
    ? latest >= exitBodyFatPct - SCAN_TOLERANCE_PCT
    : latest <= exitBodyFatPct + SCAN_TOLERANCE_PCT;
}

/**
 * Measured rate against prescribed rate.
 *
 * Flags only when the measured slope's confidence interval EXCLUDES the plan,
 * which is the measurement review's rule and is self-widening: two noisy
 * readings say nothing, three weeks of consistent ones say plenty.
 *
 * 'too_fast' means moving faster IN THE PHASE'S OWN DIRECTION — losing quicker
 * than a cut prescribes, or gaining quicker than a build does. Both are the
 * same mistake wearing different clothes: weight moving faster than the body
 * can convert it, so the surplus goes on as fat or the deficit comes off as
 * muscle.
 */
export function paceAgainstPlan(
  measured: { pctPerWeek: number; ciHalfWidth: number } | null,
  targetPctPerWeek: number | null | undefined,
): Pace {
  if (!measured || targetPctPerWeek == null || targetPctPerWeek === 0) return 'unknown';
  const dir = Math.sign(targetPctPerWeek);
  const excess = (measured.pctPerWeek - targetPctPerWeek) * dir;
  if (excess > measured.ciHalfWidth) return 'too_fast';
  if (excess < -measured.ciHalfWidth) return 'too_slow';
  return 'on_track';
}

export function exitReached(
  kind: RoadmapPhaseKind,
  exitWeightKg: number,
  trendKg: number,
): boolean {
  if (kind === 'recomp') return false;
  return kind === 'build'
    ? trendKg >= exitWeightKg - EXIT_TOLERANCE_KG
    : trendKg <= exitWeightKg + EXIT_TOLERANCE_KG;
}

export interface TransitionCheck {
  crossed: boolean;
  /** The 28-day mean, and the value every decision is taken on. null when too
   *  few readings, too short a span, or no measurable target. */
  trendKg: number | null;
  /** The responsive 12-day EWMA. For SHOWING the user only — never compared
   *  against a threshold, because it passes about a third of a menstrual
   *  swing. */
  displayTrendKg: number | null;
  /** The phase's target weight. null when the roadmap could not derive one —
   *  the degraded no-body-fat path, where no composition can be tracked. */
  thresholdKg: number | null;
  /** Kept for display and prompt copy. NOT what the decision is taken on. */
  thresholdBodyFatPct: number;
  /** Measured %BW/week and the prescribed one, so a screen can show both. */
  ratePctPerWeek: number | null;
  targetRatePctPerWeek: number | null;
  /**
   * Which signal ended the phase, when one did. 'scan' means a DXA reading got
   * there; 'weight' means the trend did. Lets a screen say WHY rather than
   * announcing a conclusion the user cannot trace — which matters most when the
   * two disagree.
   */
  reachedBy?: 'weight' | 'scan';
  /** The scan's verdict on this phase: true, false, or null for no usable scan.
   *  null is "no opinion", NOT "not finished". */
  scanSaysReached: boolean | null;
  /**
   * How the measured rate compares to the plan. A phase reached at 'too_fast'
   * is NOT a success to congratulate: the weight target was met, but at a speed
   * that costs lean tissue, which is the thing the phase existed to protect.
   */
  pace: Pace;
  currentKind: RoadmapPhaseKind;
  /** Absent on a single-phase (HARD RULE 4) roadmap — the goal is the exit. */
  nextKind?: RoadmapPhaseKind;
  nextExitBodyFatPct?: number;
  /**
   * Why detection declined, when it did. Lets a screen say something honest
   * instead of silently never prompting.
   *   'no_target'   — roadmap has no exit weight (body fat unknown)
   *   'not_enough'  — too few readings, or they span too little time
   *   'recomp'      — weight-neutral phase, not measurable at home
   *   'too_short'   — the phase ends before its own outcome is resolvable
   */
  undetectable?: 'no_target' | 'not_enough' | 'recomp' | 'too_short';
}

/**
 * The whole check, derived FRESH from the current profile (never snapshots —
 * they ignore current weight and body fat by design). Returns null when there
 * is nothing to detect at all: no roadmap, or no phases.
 */
export function evaluateTransition(
  profile: GoalsProfile,
  readings: WeightReading[],
  route?: RoutePreference,
  now: number = Date.now(),
  completedPhases = 0,
  /**
   * Body-fat readings from a PRECISE source only — the caller filters on
   * isPreciseBodyFatSource before passing them. Deliberately not filtered here:
   * this module never sees a source field, so handing it unfiltered readings
   * would let a smart-scale number end a phase, which is the exact failure the
   * weight path exists to prevent.
   */
  scans: PreciseBodyFatReading[] = [],
): TransitionCheck | null {
  const roadmap = deriveRoadmap(profile, route ?? profile.routePreference ?? 'balanced');
  if (!roadmap || roadmap.phases.length === 0) return null;

  /**
   * phasesAt, NOT roadmap.phases[0].
   *
   * phases[0] is always the OPENER — a definition, not a position. Reading it
   * here meant detection could only ever notice the FIRST crossing: once the
   * user moved on, this kept testing the opener's threshold against a body
   * that had left it behind, so nobody was ever advanced automatically past
   * phase one.
   */
  const legs = phasesAt(roadmap, completedPhases);
  const current = legs.current;
  if (!current) return null;

  const thresholdKg = current.exitWeightKg ?? null;
  // DECISIONS read the 28-day mean; the EWMA is carried alongside for display.
  const trendKg = decisionTrend(readings, now);
  const displayTrendKg = weightTrend(readings, now);
  const slope = weightTrendSlope(readings, now);
  const targetRate = current.targetRatePctPerWeek ?? null;

  const scanSaysReached = scanReachedExit(current.kind, current.exitBodyFatPct, scans, now);

  const base = {
    trendKg,
    displayTrendKg,
    thresholdKg,
    scanSaysReached,
    thresholdBodyFatPct: current.exitBodyFatPct,
    ratePctPerWeek: slope ? Math.round(slope.pctPerWeek * 100) / 100 : null,
    targetRatePctPerWeek: targetRate,
    pace: paceAgainstPlan(slope, targetRate),
    currentKind: current.kind,
    nextKind: legs.next?.kind,
    nextExitBodyFatPct: legs.next?.exitBodyFatPct,
  };

  // A SCAN OVERRIDES EVERY REFUSAL BELOW. Those refusals all say the same
  // thing — the WEIGHT signal cannot answer — and none of them is a reason to
  // ignore a measurement that can. A recomp is the sharpest example: invisible
  // on a scale by construction, perfectly visible on a scan.
  if (scanSaysReached === true) {
    return { ...base, crossed: true, reachedBy: 'scan' };
  }

  // ORDER MATTERS: most fundamental reason first. A phase can be both targetless
  // and too short, and reporting "too short" for one that has no target at all
  // sends the caller chasing the wrong fix.
  if (current.kind === 'recomp') return { ...base, crossed: false, undetectable: 'recomp' };
  if (thresholdKg == null) return { ...base, crossed: false, undetectable: 'no_target' };
  // A phase shorter than about three weeks finishes before a home scale can
  // resolve whether it worked, so claiming to detect its end would be reading
  // noise. Same honest refusal as the recomp above: time-box it, let the user
  // confirm. See MIN_DETECTABLE_PHASE_MONTHS.
  if (current.belowDetectionThreshold) return { ...base, crossed: false, undetectable: 'too_short' };
  if (trendKg == null) return { ...base, crossed: false, undetectable: 'not_enough' };

  const byWeight = exitReached(current.kind, thresholdKg, trendKg);
  return { ...base, crossed: byWeight, reachedBy: byWeight ? 'weight' : undefined };
}

// ---------------------------------------------------------------------------
// Prompt dedup (storage boundary)
// ---------------------------------------------------------------------------

const DISMISSED_KEY = 'phase_transition_dismissed';

/**
 * One prompt per threshold: crossing a target and dismissing must not nag on
 * the next weigh-in, while the NEXT phase's different threshold prompts again.
 * Kind is part of the identity because a trim and a build can share a boundary
 * in opposite directions.
 *
 * KEYED ON THE BODY FAT, not the weight, deliberately. The weight target is
 * recomputed from current lean mass every time the roadmap is derived, so it
 * drifts by grams as the user's data changes and would produce a new id — and
 * therefore a fresh prompt — on every weigh-in. The body-fat exit is stable.
 * This is display-derived identity for a display-stable value; it is not the
 * detection reverting to body fat.
 */
const crossingId = (check: TransitionCheck): string =>
  `${check.currentKind}@${check.thresholdBodyFatPct}`;

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