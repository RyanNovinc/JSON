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

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path, Rect, Circle, Line, Text as SvgText } from 'react-native-svg';
import type { GoalsProfile } from '../../utils/goalsProfile';
import type { Roadmap } from '../../utils/roadmap';

const CHART = { X0: 30, X1: 308, Y0: 14, Y1: 104, N: 48 } as const;

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
};

function buildChartTarget(
  profile: GoalsProfile,
  roadmap: Roadmap,
  sparkline = false,
  compact = false,
  bandOnly = false,
  leanStopPct?: number,
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
  const lineHi = Math.max(start, ...exits, ...marks, ceiling);
  const lineLo = Math.min(goal, ...exits, ...marks, floor);
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

  const ys: number[] = [];
  for (let i = 0; i < N; i++) {
    const ti = i / (N - 1);
    let k = 1;
    while (k < nodes.length - 1 && nodes[k][0] < ti) k++;
    const [t0, b0] = nodes[k - 1];
    const [t1, b1] = nodes[k];
    const f = t1 === t0 ? 0 : (ti - t0) / (t1 - t0);
    ys.push(yOf(b0 + (b1 - b0) * f));
  }

  return {
    ys,
    bandTop: yOf(ceiling),
    bandBottom: yOf(floor),
    startY: yOf(start),
    stripB,
    stripLabels,
    domain: [lo, hi],
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
}) {
  const target = React.useMemo(
    () => buildChartTarget(profile, roadmap, sparkline, compact, bandOnly, leanStopPct),
    [profile, roadmap, sparkline, compact, bandOnly, leanStopPct],
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

  return (
    <Svg width="100%" height={svgHeight} viewBox={`0 0 320 ${svgHeight}`}>
      {sparkline ? null : (
        <Rect
          x={X0}
          y={cur.bandTop}
          width={X1 - X0}
          height={Math.max(0, cur.bandBottom - cur.bandTop)}
          rx={8}
          fill={`${color}1a`}
        />
      )}
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