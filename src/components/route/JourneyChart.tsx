// src/components/route/JourneyChart.tsx
//
// Body fat oscillating inside the selected route's band, from today to the
// goal. Lifted out of RouteScreen unchanged: it was already correct, and the
// only reason it moved is that the screen grew from three beats to six.
//
// Pacing is HONEST: segment widths come from each phase's estMonths midpoint,
// so a 1 to 3 month trim is visually shorter than a 4 to 9 month build. An
// earlier version used invented weights, which silently implied time
// proportions the model never claimed.
//
// Route changes MORPH rather than snap: every route's line is sampled at the
// same fixed x positions, so two routes are just two arrays of y pixels and
// the transition is one animated value interpolating between them (plus the
// band's top and bottom). Plain Animated with the JS driver, 350ms ease out,
// interruption safe: retargeting starts from wherever the line currently is.
//
// Note the y axis direction: yOf puts HIGH body fat at the TOP, so the line
// descending means getting leaner. Anything drawn alongside this must match.
//
// ── THE LINE IS SAMPLED, NOT INTERPOLATED (21 Aug 2026) ─────────────────────
//
// Until today this walked straight from one phase exit to the next, which is
// wrong in both directions and visibly so. A cut is a fixed fraction of a
// FALLING weight, so body fat drops faster as it runs; a build accrues lean
// toward a ceiling, so it flattens. `planCurve` supplies the path between the
// endpoints the roadmap already fixed — it takes no rate constants of its own,
// so the curve cannot disagree with the plan it is drawing.
//
// The straight walk survives as the fallback for a profile with no measured
// body fat, where there is no lean mass and therefore no trajectory to compute.
//
// ── THE NUMBERS MOVED ONTO THE CHART (24 Aug 2026) ──────────────────────────
//
// The tapped point's weight, body fat and month used to be a labelled row under
// the chart, on the argument that a bubble anchored to a point covers the
// neighbouring points the user is comparing it against — which is true, and at
// four years across 278pt the boundaries sit about 30pt apart. `nodeFlag` keeps
// that objection satisfied: the numbers sit at a FIXED height above the plot,
// so nothing is ever drawn over the line, and the readout does not jump as the
// user walks along the plan. Only the leader moves.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path, Rect, Circle, Line, Text as SvgText } from 'react-native-svg';
import type { GoalsProfile } from '../../utils/goalsProfile';
import type { Roadmap } from '../../utils/roadmap';
import { planCurve } from '../../utils/planCurve';

// N RAISED 48 -> 96 with the sampled line. At 48 a two month cut inside a four
// year plan got two samples, and the Q smoothing below then rounded its corner
// into the build beside it. The array is still fixed length, which is what lets
// two plans morph into each other.
const CHART = { X0: 30, X1: 308, Y0: 14, Y1: 104, N: 96 } as const;

/**
 * Vertical space the node flag needs above the plot, in viewBox units.
 *
 * It is CONSTANT while `nodeFlag` is on rather than appearing with the
 * selection: room that arrives on the first tap would shove the whole chart
 * down by 30pt at the moment the user touches it.
 */
const FLAG_ROOM = 30;

/**
 * Roughly how wide a string renders, so the flag can be centred on its point
 * and clamped to the plot.
 *
 * react-native-svg cannot measure text, and the alternatives are both worse: a
 * fixed width leaves a gutter beside "82.0 kg · 20.4% · Now" and clips
 * "91.9 kg · 14.2% · Month 27", and measuring off-screen with onLayout costs a
 * render pass on every tap. The set of strings here is narrow — digits, a
 * decimal point, "kg", "%", "Month" — so per-class em widths are close enough,
 * and being a point or two wide only pads the pill.
 */
function approxWidth(s: string, size: number): number {
  let em = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch >= '0' && ch <= '9') em += 0.56;
    else if (ch === ' ' || ch === '.') em += 0.28;
    else if (ch === '\u00b7') em += 0.34;
    else if (ch === '%') em += 0.86;
    else if (ch >= 'A' && ch <= 'Z') em += 0.66;
    else em += 0.52;
  }
  return em * size;
}

/** The flag's own copy of the readout's wording, so both agree. */
function whenLabel(month: number): string {
  return month < 0.5 ? 'Now' : `Month ${Math.round(month)}`;
}

type ChartTarget = {
  ys: number[];
  bandTop: number;
  bandBottom: number;
  startY: number;
  /** Phase strip boundaries in px: [openerEnd, cyclesEnd]. Equal when a
   *  segment is absent (single phase roadmaps collapse to one segment). */
  stripB: [number, number];
  stripLabels: [string, string, string];
  /** The vertical domain in body fat percent, so an axis can be drawn. */
  domain: [number, number];
  /**
   * Phase boundaries: where the line changes direction, and the only points
   * worth making tappable. Every reading a user takes off this chart is at one.
   */
  nodes: Array<{ x: number; y: number; month: number; bodyFatPct: number; weightKg: number; when: string }>;
  /** Whole-plan length in months, for the year lines. */
  months: number;
};

function buildChartTarget(
  profile: GoalsProfile,
  roadmap: Roadmap,
  sparkline = false,
  compact = false,
  bandOnly = false,
  leanStopPct?: number,
  band = true,
): ChartTarget {
  const { X0, X1, Y0, Y1, N } = CHART;
  const start = profile.currentBodyFatPct ?? roadmap.band.ceiling + 2;
  const goal = roadmap.phases[roadmap.phases.length - 1].exitBodyFatPct;
  const { floor, ceiling } = roadmap.band;

  // Rounded outward to whole multiples of 2, so the axis ticks land on tidy
  // numbers instead of 21.4 and 9.6 — but ONLY when there are ticks to land
  // on. In sparkline mode that padding is dead space: the axis ran 20 to 10
  // while the line only ever occupied 18 to 13, leaving a third of the chart
  // empty with a stray "10%" floating in it.
  //
  // Compact mode takes the same tightening for the same reason: it has no
  // ticks either, so rounding out to whole multiples of 2 would spend a third
  // of a 60pt canvas on empty space. Both bounds still include the band edges,
  // so the band rect can never be drawn outside the canvas.
  const tight = sparkline || compact;
  /**
   * THE CANVAS MUST CONTAIN ITS OWN LINE.
   *
   * This used to size the vertical range from start, ceiling, goal and floor
   * only — never from the phases actually being drawn. That held while
   * FAT_PER_LEAN_KG was 0.2, because body fat then asymptotes at 16.7% and a
   * build could not climb past an 18% ceiling. At 0.5 the asymptote is 33%, and
   * a user who is ALREADY AT the ceiling and picks "start growing first" has
   * nowhere to go but up: the roadmap correctly returns `build->21.5%` and the
   * line left the top of the canvas.
   *
   * The ceiling rail cannot prevent that — it exists to stop a build CROSSING
   * the ceiling, and these users start standing on it. So the line is legitimate
   * and the domain was wrong. Taking the extremes from the phase exits makes
   * this correct for any future constant rather than for one value of it.
   */
  //
  // BAND-ONLY MODE TAKES ITS DOMAIN FROM THE MARKS, NOT THE PHASES. There is no
  // line on that screen — no plan has been chosen yet — so sizing to phase exits
  // would make the frame jump as the user moves the range, and the range is the
  // one thing that must sit still while they set it. Today, the goal, both band
  // edges and the lean stop are what has to fit.
  const exits = bandOnly ? [] : roadmap.phases.map((ph) => ph.exitBodyFatPct);
  const marks = leanStopPct != null ? [leanStopPct] : [];
  /**
   * THE BAND ONLY SIZES THE CANVAS WHEN THERE IS A BAND.
   *
   * A plan built with no range carries a sentinel ceiling — a number nobody
   * could reach, which is exactly how "no ceiling" is expressed — and feeding
   * that into the domain crushed the whole line into the bottom of the canvas
   * under a shaded rectangle covering everything above it. The user sees a
   * range on the one option that does not have one.
   */
  const edges = band ? [ceiling, floor] : [];
  const lineHi = Math.max(start, ...exits, ...marks, ...edges);
  const lineLo = Math.min(goal, ...exits, ...marks, ...edges);
  const hi = tight ? lineHi + 0.6 : Math.ceil((lineHi + 2) / 2) * 2;
  const lo = tight ? lineLo - 0.6 : Math.floor((lineLo - 2) / 2) * 2;
  // Vertical extent, not the constant. In sparkline mode the canvas is 44 tall
  // rather than 124, so plotting against CHART.Y1 draws most of the line
  // outside the viewBox — it renders, then gets clipped.
  const yTop = sparkline ? 6 : compact ? 8 : Y0;
  const yBottom = sparkline ? 38 : compact ? 62 : Y1;
  const yOf = (bf: number) => yTop + ((hi - bf) / (hi - lo)) * (yBottom - yTop);

  const mid = (m: [number, number]) => (m[0] + m[1]) / 2;

  /**
   * The reveal is CONDITIONAL. When the band floor already sits below the
   * user's goal body fat the cycles leave them leaner than they asked, and
   * deriveRoadmap correctly omits a terminal "cut" that would run upward — so
   * a roadmap can be three phases, not four.
   *
   * This used to destructure four positionally, which made `reveal` undefined
   * and threw "Cannot read property 'estMonths' of undefined" on render.
   */
  const phases = roadmap.phases;
  const hasReveal = phases.length > 1 && phases[phases.length - 1].kind === 'reveal';

  /**
   * Every phase occurrence, in order.
   *
   * REWRITTEN 17 Aug 2026. This used to hard-code the old four-slot shape —
   * opener, then phases[1] and phases[2] alternated blockA.repeats times, then
   * a reveal — which silently dropped everything after the opener whenever a
   * roadmap had fewer than three phases. deriveRoadmap now emits a variable
   * number of phases, all with repeats 1 in the common case, so the chart has
   * to walk them rather than assume positions.
   *
   * Reading `repeats` per phase keeps any future repeated phase working, and
   * for a single-phase roadmap it collapses to the one segment on its own.
   */
  const way: Array<[number, number]> = [];
  phases.forEach((ph) => {
    for (let i = 0; i < Math.max(1, ph.repeats); i++) {
      way.push([mid(ph.estMonths), ph.exitBodyFatPct]);
    }
  });
  if (way.length === 0) way.push([1, goal]);

  const total = way.reduce((a, w) => a + w[0], 0);

  let stripB: [number, number] = [X0, X0];
  let stripLabels: [string, string, string] = ['', '', ''];
  if (phases.length > 1) {
    const opener = phases[0];
    const openerShare = mid(opener.estMonths) / total;
    // No reveal means the middle runs to the end of the chart, so the third
    // segment has zero width and no label rather than an empty box marked
    // "Reveal".
    const revealShare = hasReveal ? mid(phases[phases.length - 1].estMonths) / total : 0;
    stripB = [X0 + openerShare * (X1 - X0), X0 + (1 - revealShare) * (X1 - X0)];
    const cap = (k: string) => k.charAt(0).toUpperCase() + k.slice(1);
    // The middle is however many phases sit between the opener and the reveal,
    // which is now usually ONE (a single build) rather than an alternating
    // pair. Naming them beats the old "Trim and build xN", which described a
    // cycle count the roadmap no longer produces in the common case.
    const middle = phases.slice(1, hasReveal ? phases.length - 1 : phases.length);
    stripLabels = [
      cap(opener.kind),
      middle.length === 0
        ? ''
        : middle.length === 1
          ? cap(middle[0].kind)
          : `${cap(middle[0].kind)} and ${middle[1].kind}`,
      hasReveal ? 'Reveal' : '',
    ];
  }

  const nodes: Array<[number, number]> = [[0, start]];
  let t = 0;
  way.forEach((w) => {
    t += w[0] / total;
    nodes.push([t, w[1]]);
  });

  // ── THE PATH ────────────────────────────────────────────────────────────
  //
  // planCurve returns the weekly trajectory anchored to these same phase exits
  // and durations. Sampling it at N fixed time positions keeps `ys` a fixed
  // length array, which is what the morph between two plans interpolates.
  const curve = planCurve(profile, roadmap);
  const ys: number[] = [];

  if (curve && curve.points.length > 1 && curve.totalMonths > 0) {
    const pts = curve.points;
    let k = 1;
    for (let i = 0; i < N; i++) {
      const at = (i / (N - 1)) * curve.totalMonths;
      while (k < pts.length - 1 && pts[k].month < at) k++;
      const a = pts[k - 1];
      const b = pts[k];
      const f = b.month === a.month ? 0 : (at - a.month) / (b.month - a.month);
      ys.push(yOf(a.bodyFatPct + (b.bodyFatPct - a.bodyFatPct) * f));
    }
  } else {
    // No measured body fat: no lean mass, no trajectory. Straight between the
    // exits, which is what this always did.
    for (let i = 0; i < N; i++) {
      const ti = i / (N - 1);
      let k = 1;
      while (k < nodes.length - 1 && nodes[k][0] < ti) k++;
      const [t0, b0] = nodes[k - 1];
      const [t1, b1] = nodes[k];
      const f = t1 === t0 ? 0 : (ti - t0) / (t1 - t0);
      ys.push(yOf(b0 + (b1 - b0) * f));
    }
  }

  const months = curve?.totalMonths ?? total;
  const nodePts =
    curve && months > 0
      ? curve.nodes.map((nd) => ({
          x: X0 + (nd.month / months) * (X1 - X0),
          y: yOf(nd.bodyFatPct),
          month: nd.month,
          bodyFatPct: nd.bodyFatPct,
          weightKg: nd.weightKg,
          when: nd.when,
        }))
      : [];

  return {
    ys,
    bandTop: yOf(ceiling),
    bandBottom: yOf(floor),
    startY: yOf(start),
    stripB,
    stripLabels,
    domain: [lo, hi],
    nodes: nodePts,
    months,
  };
}

export default function JourneyChart({
  profile,
  roadmap,
  color,
  bare = false,
  strip,
  sparkline = false,
  compact = false,
  bandOnly = false,
  leanStopPct,
  frame = false,
  muscleKg,
  band = true,
  yearLines = false,
  targetPct,
  onSelectNode,
  selectedNode,
  nodeFlag = false,
}: {
  profile: GoalsProfile;
  roadmap: Roadmap;
  color: string;
  /** Drops every label and the phase strip, leaving the line and the band.
   *  The route picker states the same facts around the chart, where they do
   *  not collide with each other, so drawing them inside as well was the same
   *  information three times over. */
  bare?: boolean;
  /** The phase strip, independent of `bare`. The summary wants the strip
   *  without the floating labels, since it is the only screen that explains
   *  the shape of the plan. */
  strip?: boolean;
  /**
   * Line only: no band, no endpoint dots, no labels, no axis, no strip, and a
   * domain tightened to the line itself.
   *
   * For places where the roadmap is CONTEXT rather than the subject — the
   * Create screen sits it under a question about today, where a full chart
   * with axis ticks reads as a widget bolted to the bottom of the screen. It
   * still draws the user's real phases; it just stops asking to be read as
   * data.
   */
  sparkline?: boolean;
  /**
   * Half height, no axis ticks, no endpoint dots, and a domain tightened to
   * the line — but the band and the muscle bracket both survive, which is what
   * separates it from `sparkline`.
   *
   * For the run-it sheet on beat 9, where the chart is a PREVIEW of a choice
   * being made a few pixels below it. The bracket is the reason it exists: its
   * position is the only thing that shows WHEN you grow, so a picker without
   * it in view asks the user to choose blind.
   */
  compact?: boolean;
  /**
   * THE FRAME WITHOUT THE PLAN: axis labels, the band, and the marks it sits
   * against — today, the goal and the lean stop — with NO line, no dots, no
   * bracket and no strip.
   *
   * For the range screen, which asks the user to set the band BEFORE any plan
   * exists. Drawing a journey there would show a plan they have not chosen yet,
   * and the next screen would then have to redraw the band in a different place.
   * Same component and same geometry on both screens, so the band does not move
   * between them and the line simply arrives.
   */
  bandOnly?: boolean;
  /**
   * Body fat at the lean stop, drawn as a solid amber rule. Comes from
   * `leanStopFor(sex)` — the caller passes it rather than this file importing
   * operatingBands, because the chart should draw what it is told and not hold
   * an opinion about where the stop is.
   */
  leanStopPct?: number;
  /** The Ledger treatment's L: a hairline down the axis and along the base.
   *  Opt-in, so the charts that predate it are untouched. */
  frame?: boolean;
  /**
   * Kilograms of lean mass the plan builds. When present, a bracket is drawn
   * under the stretch of line where the building happens and labelled with it.
   *
   * It exists because the corrected roadmap draws a nearly FLAT line through
   * the build — at 0.2 kg of fat per kg of lean, body fat barely moves — and a
   * flat line reads as nothing happening when it is in fact the part where all
   * the muscle goes on. The bracket's POSITION is also the only thing on the
   * screen that shows WHEN you grow, which is what separates the two orders.
   */
  muscleKg?: number;
  /**
   * Draw the band at all. FALSE for a plan built with no range — "grow now, cut
   * at the end" has no ceiling, so `roadmap.band` carries a fallback the user
   * never chose, and shading it would show them a rule they did not set.
   */
  band?: boolean;
  /**
   * Faint vertical rules at each year. Without them the chart says what happens
   * and in what order and nothing about WHEN — a dip could be month three or
   * month thirty and it reads the same. They also make the model's own headline
   * visible: the first build is enormous and the cuts are slivers.
   */
  yearLines?: boolean;
  /**
   * A solid rule at a single body fat, with NOTHING shaded under it. For the
   * "bulk up to" screen, where the number is a TARGET rather than a region —
   * the range screens shade because a range is a region, and this one must not,
   * or the two screens claim the same thing about different questions.
   */
  targetPct?: number;
  /**
   * Makes every phase boundary tappable. The numbers themselves are drawn by
   * `nodeFlag` below; a caller can still take the node and render its own
   * readout, which is what this did before the flag existed.
   */
  onSelectNode?: (
    node: { month: number; bodyFatPct: number; weightKg: number; when: string },
    index: number,
  ) => void;
  /** Index of the lit node, or null. */
  selectedNode?: number | null;
  /**
   * THE SELECTED NODE'S NUMBERS, ON THE CHART.
   *
   * One line — weight, body fat, month — pinned at a FIXED height above the
   * plot, tracking the point horizontally and clamped to the plot edges, with a
   * hairline leader dropping to the dot.
   *
   * This replaces the labelled row that used to sit under the chart, and it is
   * the one shape that survives the objection which put the numbers down there
   * in the first place: at four years across 278pt the phase boundaries sit
   * about 30pt apart, so a bubble ANCHORED to a point covers the neighbours the
   * user is comparing it against. A flag at a fixed height never sits over the
   * line at all, and it does not jump vertically as the user moves along the
   * plan — only the leader moves.
   *
   * It costs `FLAG_ROOM` above the plot, taken by extending the viewBox UPWARD
   * so that not one plotted coordinate moves.
   */
  nodeFlag?: boolean;
}) {
  const target = React.useMemo(
    () => buildChartTarget(profile, roadmap, sparkline, compact, bandOnly, leanStopPct, band),
    [profile, roadmap, sparkline, compact, bandOnly, leanStopPct, band],
  );

  /** The build's span as a fraction of the timeline, for the bracket. */
  const buildSpan = React.useMemo(() => {
    const mid = (m: [number, number]) => (m[0] + m[1]) / 2;
    const total = roadmap.phases.reduce((a, ph) => a + mid(ph.estMonths) * ph.repeats, 0);
    if (total <= 0) return null;
    let at = 0;
    let lo: number | null = null;
    let hi = 0;
    roadmap.phases.forEach((ph) => {
      const w = (mid(ph.estMonths) * ph.repeats) / total;
      if (ph.kind === 'build') {
        if (lo == null) lo = at;
        hi = at + w;
      }
      at += w;
    });
    return lo == null ? null : { lo: lo as number, hi };
  }, [roadmap]);

  const shown = useRef<ChartTarget>({ ...target, ys: target.ys.slice() });
  const anim = useRef(new Animated.Value(1)).current;
  const [, bump] = useState(0);

  useEffect(() => {
    const from: ChartTarget = {
      ...shown.current,
      ys: shown.current.ys.slice(),
      stripB: [...shown.current.stripB] as [number, number],
    };
    anim.stopAnimation();
    anim.setValue(0);
    const id = anim.addListener(({ value }) => {
      shown.current = {
        ys: target.ys.map((y, i) => from.ys[i] + (y - from.ys[i]) * value),
        bandTop: from.bandTop + (target.bandTop - from.bandTop) * value,
        bandBottom: from.bandBottom + (target.bandBottom - from.bandBottom) * value,
        startY: from.startY + (target.startY - from.startY) * value,
        stripB: [
          from.stripB[0] + (target.stripB[0] - from.stripB[0]) * value,
          from.stripB[1] + (target.stripB[1] - from.stripB[1]) * value,
        ],
        stripLabels: target.stripLabels,
        nodes: target.nodes,
        months: target.months,
        // Was omitted, which is the tsc error on this object: the axis ticks
        // read target.domain directly so nothing broke visually, but the frame
        // object was not a ChartTarget.
        domain: target.domain,
      };
      bump((v) => v + 1);
    });
    Animated.timing(anim, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [target, anim]);

  const cur = shown.current;
  const { X0, X1, Y0, Y1, N } = CHART;
  const xOf = (i: number) => X0 + (i / (N - 1)) * (X1 - X0);

  let d = `M ${xOf(0).toFixed(1)} ${cur.ys[0].toFixed(1)}`;
  for (let i = 1; i < N - 1; i++) {
    const mx = (xOf(i) + xOf(i + 1)) / 2;
    const my = (cur.ys[i] + cur.ys[i + 1]) / 2;
    d += ` Q ${xOf(i).toFixed(1)} ${cur.ys[i].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  d += ` L ${xOf(N - 1).toFixed(1)} ${cur.ys[N - 1].toFixed(1)}`;

  const startBf = profile.currentBodyFatPct;
  const goalBf = roadmap.phases[roadmap.phases.length - 1].exitBodyFatPct;

  // The render's own copy of buildChartTarget's yOf, for the marks drawn in
  // band-only mode. It reads `target.domain` rather than re-deriving the bounds,
  // so a rule can never land on a different pixel from the band beside it.
  const yAt = (bf: number) => {
    const [lo, hi] = target.domain;
    return Y0 + ((hi - bf) / (hi - lo)) * (Y1 - Y0);
  };
  const { floor, ceiling } = roadmap.band;

  // One source of truth for whether the phase strip is drawn, used for the
  // canvas height as well as the render. The height used to key off `bare`
  // while the strip keyed off `strip ?? !bare`, so a caller passing
  // strip={false} with labels on reserved 36pt for a strip it never drew —
  // the dead space under the route card on Create.
  const showStrip = bandOnly ? false : sparkline || compact ? false : strip ?? !bare;
  // The line's own bottom edge, which the bracket hangs off. It is Y1 in the
  // full size chart and the compact canvas is shorter, so hard-coding Y1 here
  // drew the bracket below the viewBox and it silently vanished.
  const lineBottom = compact ? 62 : Y1;
  // +34 in bare mode for the muscle bracket and its label, which sit below Y1
  // where the phase strip would otherwise be.
  const svgHeight = bandOnly
    ? 132
    : sparkline
    ? 44
    : compact
      ? muscleKg != null ? 96 : 72
      : showStrip
        ? 160
        : muscleKg != null
          ? 158
          : 124;

  const stripY = Y1 + 18;
  const stripLabelY = stripY + 18;
  const seg1w = Math.max(0, cur.stripB[0] - X0 - 2);
  const seg2w = Math.max(0, cur.stripB[1] - cur.stripB[0] - 4);
  const seg3w = Math.max(0, X1 - cur.stripB[1] - 2);

  /**
   * THE FLAG GETS ITS ROOM FROM THE VIEWBOX, NOT FROM THE LAYOUT.
   *
   * Moving Y0 down by 30 would have moved the band, the year lines, the marks
   * and every y in `ys` with it, and `shown.current` interpolates those across
   * a 350ms morph — so the whole chart would have had two different geometries
   * depending on a boolean. Extending the viewBox upward instead leaves every
   * plotted coordinate exactly where it was and simply reveals negative y.
   */
  const flagRoom = nodeFlag ? FLAG_ROOM : 0;
  /** The selected node, if there is one to draw. Empty for a profile with no
   *  measured body fat, where `nodes` is [] and the fallback line has no
   *  boundaries to tap. */
  const flagNode = nodeFlag && selectedNode != null ? target.nodes[selectedNode] : undefined;

  return (
    <Svg
      width="100%"
      height={svgHeight + flagRoom}
      viewBox={`0 ${-flagRoom} 320 ${svgHeight + flagRoom}`}
    >
      {sparkline || !band ? null : (
        <Rect
          x={X0}
          y={cur.bandTop}
          width={X1 - X0}
          height={Math.max(0, cur.bandBottom - cur.bandTop)}
          rx={8}
          fill={`${color}1a`}
        />
      )}

      {/* Drawn first so everything else sits over them. */}
      {yearLines && target.months > 12 && !sparkline
        ? Array.from({ length: Math.floor(target.months / 12) }, (_, i) => i + 1).map((yr) => {
            const x = X0 + ((yr * 12) / target.months) * (X1 - X0);
            return (
              <React.Fragment key={`yr${yr}`}>
                <Line x1={x} y1={Y0} x2={x} y2={Y1} stroke="#1e1e24" strokeWidth={1} />
                <SvgText x={x + 3} y={Y1 - 4} fontSize={8} fill="#3f3f46">
                  {`${yr}y`}
                </SvgText>
              </React.Fragment>
            );
          })
        : null}

      {/* THE TARGET, not a region: one rule, nothing under it.

          PINNED AT THE EDGE WHEN IT IS ABOVE THE CHART. The domain deliberately
          does NOT grow to include this rule — doing that would rescale the band,
          today and the goal underneath the user while they tap the stepper, and
          those three sitting still is the whole reason the band-only domain
          comes from the marks. So a target past the top of the chart sticks to
          the frame, dims, and carries a caret with its own value: it then reads
          as pointing off the chart rather than as claiming to be 20%. */}
      {targetPct != null
        ? (() => {
            const hiPct = target.domain[1];
            const off = targetPct > hiPct;
            const y = off ? Y0 : yAt(targetPct);
            return (
              <>
                <Line
                  x1={X0}
                  y1={y}
                  x2={X1}
                  y2={y}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeOpacity={off ? 0.55 : 1}
                />
                <SvgText
                  x={X1 - 2}
                  y={y - 5}
                  fontSize={8.5}
                  fill={color}
                  fillOpacity={off ? 0.75 : 1}
                  textAnchor="end"
                >
                  {off ? `\u25b2 ${targetPct}%` : `${targetPct}%`}
                </SvgText>
              </>
            );
          })()
        : null}
      {/* THE MARKS THE RANGE SITS AGAINST. Dashed for today and the goal because
          neither is a decision — they are where the user already is and where
          they already said they wanted to be — and solid amber for the stop,
          which IS a limit. Drawn under the band so a range overlapping one of
          them reads as the band covering it rather than as a broken rule. */}
      {bandOnly ? (
        <>
          {leanStopPct != null ? (
            <Line
              x1={X0}
              y1={yAt(leanStopPct)}
              x2={X1}
              y2={yAt(leanStopPct)}
              stroke="#8a6b28"
              strokeWidth={1}
            />
          ) : null}
          {[
            { v: startBf, label: 'TODAY' },
            { v: goalBf, label: 'GOAL' },
          ].map((m) =>
            m.v == null ? null : (
              <React.Fragment key={m.label}>
                <Line
                  x1={X0}
                  y1={yAt(m.v)}
                  x2={X1}
                  y2={yAt(m.v)}
                  stroke="#2c2c31"
                  strokeWidth={1}
                  strokeDasharray="2 5"
                />
                <SvgText
                  x={X0 + 4}
                  y={yAt(m.v) - 5}
                  fontSize={7.6}
                  fill="#4b4b52"
                  letterSpacing={1.15}
                >
                  {`${m.label} ${Math.round(m.v)}%`}
                </SvgText>
              </React.Fragment>
            ),
          )}
        </>
      ) : null}

      {/* The Ledger L. A hairline down the axis and along the base, so the
          numbers read as a scale rather than as text floating beside a shape. */}
      {frame ? (
        <>
          <Line x1={X0} y1={Y0} x2={X0} y2={Y1} stroke="#232328" strokeWidth={1} />
          <Line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke="#232328" strokeWidth={1} />
        </>
      ) : null}

      {/* Without ticks the space above the band reads as a gap rather than as
          scale, which is why the chart looked emptier than the mockup. */}
      {(bare || bandOnly) && !sparkline && !compact
        ? [0, 1, 2, 3].map((i) => {
            const [lo, hi] = target.domain;
            const pct = hi - ((hi - lo) * i) / 3;
            const y = Y0 + ((hi - pct) / (hi - lo)) * (Y1 - Y0);
            return (
              <SvgText key={i} x={X0 - 4} y={y + 3} fontSize={8.5} fill="#3f3f46" textAnchor="end">
                {`${Math.round(pct)}%`}
              </SvgText>
            );
          })
        : null}

      {bare || sparkline || compact ? null : (
        <>
          <SvgText x={X1 + 2} y={cur.bandTop + 4} fontSize={9} fill="#5c5c62">
            {`${ceiling}%`}
          </SvgText>
          <SvgText x={X1 + 2} y={cur.bandBottom + 3} fontSize={9} fill="#5c5c62">
            {`${floor}%`}
          </SvgText>
        </>
      )}
      {bandOnly ? null : (
      <Path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={sparkline ? 1.8 : compact ? 2.2 : 2.5}
        strokeOpacity={sparkline ? 0.55 : 1}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      )}
      {sparkline || compact || bandOnly ? null : (
        <>
          <Circle cx={X0} cy={cur.startY} r={8} fill={`${color}2e`} />
          <Circle cx={X0} cy={cur.startY} r={4.5} fill={color} />
          <Circle cx={X1} cy={cur.ys[N - 1]} r={3.5} fill="#131316" stroke="#8e8e93" strokeWidth={1.5} />
        </>
      )}
      {/* ── THE TAPPABLE POINTS ───────────────────────────────────────────
          A visible dot on every boundary, because a tap target nobody can see
          is a feature nobody finds, and a generous invisible circle over it —
          at four years across 278pt the boundaries sit about 30pt apart and a
          fingertip is wider than that.

          Drawn from `target` rather than the animating copy on purpose: the
          number of phases changes between plans, and two arrays of different
          lengths have no meaningful interpolation. The line morphs, the dots
          arrive. */}
      {onSelectNode && !sparkline && !bandOnly
        ? target.nodes.map((nd, i) => (
            <React.Fragment key={`nd${i}`}>
              <Circle
                cx={nd.x}
                cy={nd.y}
                r={selectedNode === i ? 5 : 3.2}
                fill={selectedNode === i ? color : '#0a0a0b'}
                stroke={color}
                strokeWidth={selectedNode === i ? 0 : 1.6}
              />
              <Circle
                cx={nd.x}
                cy={nd.y}
                r={17}
                fill="transparent"
                onPress={() =>
                  onSelectNode(
                    {
                      month: nd.month,
                      bodyFatPct: nd.bodyFatPct,
                      weightKg: nd.weightKg,
                      when: nd.when,
                    },
                    i,
                  )
                }
              />
            </React.Fragment>
          ))
        : null}

      {/* ── THE NODE FLAG ─────────────────────────────────────────────────
          One line at a fixed height above the plot, with a hairline leader down
          to the dot it belongs to. Drawn after the line and the dots so the
          pill sits over both; the leader crossing the line is what makes it
          read as pointing rather than as another rule on the chart.

          The pill is filled with the SCREEN background rather than a card
          colour. It is a label on the chart, not a surface floating above it,
          which is the rule the rest of this flow follows — and it means the
          leader disappears cleanly behind it. */}
      {flagNode
        ? (() => {
            const label = `${flagNode.weightKg.toFixed(1)} kg \u00b7 ${flagNode.bodyFatPct.toFixed(
              1,
            )}% \u00b7 ${whenLabel(flagNode.month)}`;
            const fs = 11;
            const w = Math.min(X1 - X0, approxWidth(label, fs) + 22);
            const h = 21;
            const top = -flagRoom + 4;
            /**
             * CLAMPED TO THE PLOT, so the first and last nodes keep their
             * numbers on screen instead of half of them hanging past the axis.
             * The leader is what tells the user which point an off-centre flag
             * belongs to, which is why it is drawn to the node's own x and not
             * to the middle of the pill.
             */
            const bx = Math.min(Math.max(flagNode.x - w / 2, X0), X1 - w);
            return (
              <>
                <Line
                  x1={flagNode.x}
                  y1={top + h}
                  x2={flagNode.x}
                  y2={flagNode.y - 7}
                  stroke={color}
                  strokeWidth={1}
                  strokeOpacity={0.45}
                />
                <Rect
                  x={bx}
                  y={top}
                  width={w}
                  height={h}
                  rx={h / 2}
                  fill="#0a0a0b"
                  stroke="#2c2c33"
                  strokeWidth={1}
                />
                <SvgText
                  x={bx + w / 2}
                  y={top + 14.5}
                  fontSize={fs}
                  fontWeight="600"
                  fill="#e8e8ea"
                  textAnchor="middle"
                >
                  {label}
                </SvgText>
              </>
            );
          })()
        : null}

      {muscleKg != null && buildSpan && !sparkline
        ? (() => {
            const x1 = X0 + buildSpan.lo * (X1 - X0);
            const x2 = X0 + buildSpan.hi * (X1 - X0);
            const y = lineBottom + 12;
            return (
              <>
                <Line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={1} strokeOpacity={0.38} />
                <Line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke={color} strokeWidth={1} strokeOpacity={0.38} />
                <Line x1={x2} y1={y - 4} x2={x2} y2={y + 4} stroke={color} strokeWidth={1} strokeOpacity={0.38} />
                <SvgText x={(x1 + x2) / 2} y={y + 16} fontSize={11} fill={color} textAnchor="middle">
                  {`+${muscleKg} kg muscle`}
                </SvgText>
              </>
            );
          })()
        : null}

      {bare || sparkline || compact ? null : (
        <>
          <SvgText x={X0 + 14} y={Math.max(11, cur.startY - 9)} fontSize={11} fill={color}>
            {startBf != null ? `You \u00b7 ${Math.round(startBf)}%` : 'You'}
          </SvgText>
          <SvgText
            x={X1 - 2}
            y={Math.min(Y1 + 12, cur.ys[N - 1] + 16)}
            fontSize={11}
            fill="#8e8e93"
            textAnchor="end"
          >
            {`Goal \u00b7 ${goalBf}%`}
          </SvgText>
        </>
      )}

      {showStrip ? (
        <>
      {seg1w > 0 ? <Rect x={X0} y={stripY} width={seg1w} height={6} rx={3} fill={color} /> : null}
      <Rect
        x={seg1w > 0 ? cur.stripB[0] + 2 : X0}
        y={stripY}
        width={seg1w > 0 ? seg2w : Math.max(0, cur.stripB[1] - X0 - 2)}
        height={6}
        rx={3}
        fill="rgba(255,255,255,0.12)"
      />
      <Rect x={cur.stripB[1] + 2} y={stripY} width={seg3w} height={6} rx={3} fill="rgba(255,255,255,0.12)" />
      {cur.stripLabels[0] ? (
        <SvgText
          x={X0 + Math.max(16, (cur.stripB[0] - X0) / 2)}
          y={stripLabelY}
          fontSize={10}
          fill={color}
          textAnchor="middle"
        >
          {cur.stripLabels[0]}
        </SvgText>
      ) : null}
      {cur.stripLabels[1] ? (
        <SvgText
          x={(cur.stripB[0] + cur.stripB[1]) / 2}
          y={stripLabelY}
          fontSize={10}
          fill="#8e8e93"
          textAnchor="middle"
        >
          {cur.stripLabels[1]}
        </SvgText>
      ) : null}
      {cur.stripLabels[2] ? (
        <SvgText
          x={Math.min(X1 - 14, cur.stripB[1] + Math.max(16, (X1 - cur.stripB[1]) / 2))}
          y={stripLabelY}
          fontSize={10}
          fill="#8e8e93"
          textAnchor="middle"
        >
          {cur.stripLabels[2]}
        </SvgText>
      ) : null}
        </>
      ) : null}
    </Svg>
  );
}