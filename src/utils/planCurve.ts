// src/utils/planCurve.ts
//
// The SHAPE of a plan, between the numbers the roadmap already fixed.
//
// deriveRoadmap answers "which phases, ending where, over how long". It says
// nothing about the path taken inside a phase, and every chart in the app has
// been drawing that path as a straight line. That is wrong in both directions
// and it is visible:
//
//   A CUT STEEPENS. Prescribed loss is a fixed fraction of bodyweight per week,
//   so weight decays exponentially and body fat falls faster as the cut runs.
//   A BUILD FLATTENS. Lean accrues toward a ceiling, so a long build adds most
//   of its muscle early and drifts at the end.
//
// ── WHY THIS TAKES NO RATE CONSTANTS ───────────────────────────────────────
//
// It could re-derive the trajectory from FAT_LOSS_FRACTION_BW_PER_WEEK, the fat
// mass gate and the gain decay, and then it would be a second model that can
// disagree with the first. Instead it INTERPOLATES: every phase's endpoints and
// duration come from the roadmap, and this module only decides the shape of the
// line between them. The curve cannot contradict the plan, because the plan
// supplies both ends of every segment.
//
// The one constant it borrows is GAIN_DECAY_K, and only as the shape of the
// build's easing — not as a rate.

import type { GoalsProfile } from './goalsProfile';
import type { Roadmap, RoadmapPhase, RoadmapPhaseKind } from './roadmap';
import { GAIN_DECAY_K, leanMassKg } from './roadmap';

const MONTHS_PER_YEAR = 12;

/** One sampled point on the line. */
export interface CurvePoint {
  /** Months from today. */
  month: number;
  bodyFatPct: number;
  weightKg: number;
  /** Index into `nodes` of the phase this point belongs to. */
  phase: number;
}

/**
 * A phase boundary: where the line changes direction, and the only places worth
 * making tappable. Every reading a user asks of this chart is at a node.
 */
export interface CurveNode {
  month: number;
  bodyFatPct: number;
  weightKg: number;
  kind: RoadmapPhaseKind | 'start';
  /** Plain words for the readout: "after a cut", "the number you bulk to". */
  when: string;
}

export interface PlanCurve {
  points: CurvePoint[];
  nodes: CurveNode[];
  totalMonths: number;
}

const bfOf = (leanKg: number, weightKg: number) =>
  weightKg > 0 ? ((weightKg - leanKg) / weightKg) * 100 : 0;

const weightAt = (leanKg: number, bfPct: number) => leanKg / (1 - bfPct / 100);

/**
 * Samples inside one phase.
 *
 * `t` runs 0..1 across the phase. Both ends are pinned to the roadmap's own
 * numbers, so `ease` only decides the route between them.
 */
function easeFor(kind: RoadmapPhaseKind, months: number): (t: number) => number {
  if (kind === 'build') {
    // Lean accrues toward a ceiling, so the curve is concave and the longer the
    // phase the more pronounced it is. A three month build is nearly straight;
    // a three year one is not. The decay constant is the same one the duration
    // model uses, applied over this phase's own length.
    const a = Math.max(0.15, GAIN_DECAY_K * (months / MONTHS_PER_YEAR));
    const denom = 1 - Math.exp(-a);
    return (t) => (1 - Math.exp(-a * t)) / denom;
  }
  // Cuts and reveals are exponential in WEIGHT, which is handled directly in
  // the sampler below, so nothing eases here. Recomps hold weight roughly
  // still while composition moves, and nothing in the literature gives that
  // segment a shape, so it stays linear and says so.
  return (t) => t;
}

/**
 * How many samples a phase gets. Enough that the curve reads as a curve,
 * few enough that a four year plan is not a thousand-point path.
 */
const samplesFor = (months: number) => Math.max(2, Math.min(40, Math.round(months * 1.5) + 2));

const WHEN: Record<RoadmapPhaseKind, string> = {
  recomp: 'after the recomp',
  build: 'end of a build',
  trim: 'after a cut',
  reveal: 'goal',
};

/**
 * Expands `repeats`, because a phase that runs three times is three segments on
 * the line and three separate dates, not one.
 */
function expand(phases: RoadmapPhase[]): RoadmapPhase[] {
  const out: RoadmapPhase[] = [];
  phases.forEach((ph) => {
    const n = Math.max(1, ph.repeats ?? 1);
    for (let i = 0; i < n; i++) out.push(ph);
  });
  return out;
}

/**
 * Turns a roadmap into the line the chart draws.
 *
 * Returns null when the profile has no measured body fat, because without it
 * there is no lean mass, no weight at any point, and nothing honest to plot.
 */
export function planCurve(profile: GoalsProfile, roadmap: Roadmap | null): PlanCurve | null {
  if (!roadmap || roadmap.phases.length === 0) return null;
  const { currentWeightKg, currentBodyFatPct } = profile;
  if (currentBodyFatPct == null || !currentWeightKg) return null;

  const phases = expand(roadmap.phases);

  let month = 0;
  let weight = currentWeightKg;
  let bf = currentBodyFatPct;

  const points: CurvePoint[] = [{ month: 0, bodyFatPct: bf, weightKg: weight, phase: 0 }];
  const nodes: CurveNode[] = [
    { month: 0, bodyFatPct: bf, weightKg: weight, kind: 'start', when: 'today' },
  ];

  phases.forEach((ph, i) => {
    // The MIDPOINT of the estimate, not either bound. The chart draws one line
    // and the honest range lives on the axis label, which already says "1.6 to
    // 3.4 yr" — drawing the optimistic bound and labelling the pessimistic one
    // would be two different claims on one screen.
    const months = (ph.estMonths[0] + ph.estMonths[1]) / 2;
    const endBf = ph.exitBodyFatPct;

    // A phase without a scale target can still be drawn, because lean is held
    // through a cut by definition: the weight at the exit is this lean mass at
    // the exit body fat. For a build there is no such shortcut, so the segment
    // falls back to a straight line rather than inventing a partition.
    const leanNow = leanMassKg(weight, bf);
    const endWeight =
      ph.exitWeightKg ??
      (ph.kind === 'build' ? weight + (weight * (endBf - bf)) / 100 : weightAt(leanNow, endBf));

    const n = samplesFor(months);
    const ease = easeFor(ph.kind, months);

    for (let s = 1; s <= n; s++) {
      const t = s / n;
      let wAt: number;
      let bfAt: number;

      if (ph.kind === 'trim' || ph.kind === 'reveal') {
        // Exponential in weight — a fixed fraction of a falling number — with
        // lean held, which is what makes body fat fall faster as it goes.
        wAt = weight * Math.pow(endWeight / weight, t);
        bfAt = bfOf(leanNow, wAt);
      } else {
        const e = ease(t);
        bfAt = bf + (endBf - bf) * e;
        wAt = weight + (endWeight - weight) * e;
      }

      points.push({ month: month + months * t, bodyFatPct: bfAt, weightKg: wAt, phase: i + 1 });
    }

    month += months;
    weight = endWeight;
    bf = endBf;

    nodes.push({
      month,
      bodyFatPct: bf,
      weightKg: weight,
      kind: ph.kind,
      when: i === phases.length - 1 ? 'goal' : WHEN[ph.kind],
    });
  });

  return { points, nodes, totalMonths: month };
}

/**
 * The two dates a user asks of this chart, and the reason the phases have to be
 * TIMED rather than merely ordered.
 *
 * `firstAtGoalMonth` is deliberately null when the goal body fat is only
 * reached at the end: landing on it in the final month is the plan finishing,
 * not a milestone worth naming. It is the whole difference between the routes —
 * cutting first puts a user at their goal body fat in month three, and the
 * other two only at the end.
 */
export function planMilestones(curve: PlanCurve | null, goalBodyFatPct: number) {
  if (!curve || curve.nodes.length < 2) return null;
  let heaviest = curve.nodes[0];
  let firstAtGoal: CurveNode | null = null;

  curve.nodes.forEach((nd, i) => {
    if (nd.weightKg > heaviest.weightKg) heaviest = nd;
    if (
      firstAtGoal == null &&
      i > 0 &&
      i < curve.nodes.length - 1 &&
      nd.bodyFatPct <= goalBodyFatPct + 0.3
    ) {
      firstAtGoal = nd;
    }
  });

  return {
    heaviestMonth: heaviest.month,
    heaviestKg: heaviest.weightKg,
    firstAtGoalMonth: firstAtGoal ? (firstAtGoal as CurveNode).month : null,
    totalMonths: curve.totalMonths,
  };
}