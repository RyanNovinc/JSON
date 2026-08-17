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
import Svg, { Path, Rect, Circle, Text as SvgText } from 'react-native-svg';
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
  const hi = sparkline
    ? Math.max(start, ceiling) + 0.6
    : Math.ceil((Math.max(start, ceiling) + 2) / 2) * 2;
  const lo = sparkline
    ? Math.min(goal, floor) - 0.6
    : Math.floor((Math.min(goal, floor) - 2) / 2) * 2;
  // Vertical extent, not the constant. In sparkline mode the canvas is 44 tall
  // rather than 124, so plotting against CHART.Y1 draws most of the line
  // outside the viewBox — it renders, then gets clipped.
  const yTop = sparkline ? 6 : Y0;
  const yBottom = sparkline ? 38 : Y1;
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

  const way: Array<[number, number]> = [];
  if (phases.length === 1) {
    way.push([mid(phases[0].estMonths), goal]);
  } else {
    const opener = phases[0];
    const blockA = phases[1];
    const blockB = phases[2];
    way.push([mid(opener.estMonths), opener.exitBodyFatPct]);
    if (blockA && blockB) {
      for (let i = 0; i < blockA.repeats; i++) {
        way.push([mid(blockA.estMonths), blockA.exitBodyFatPct]);
        way.push([mid(blockB.estMonths), blockB.exitBodyFatPct]);
      }
    }
    if (hasReveal) {
      const reveal = phases[phases.length - 1];
      way.push([mid(reveal.estMonths), reveal.exitBodyFatPct]);
    }
  }

  const total = way.reduce((a, w) => a + w[0], 0);

  let stripB: [number, number] = [X0, X0];
  let stripLabels: [string, string, string] = ['', '', ''];
  if (phases.length > 1) {
    const opener = phases[0];
    const openerShare = mid(opener.estMonths) / total;
    // No reveal means the cycles run to the end of the chart, so the third
    // segment has zero width and no label rather than an empty box marked
    // "Reveal".
    const revealShare = hasReveal ? mid(phases[phases.length - 1].estMonths) / total : 0;
    stripB = [X0 + openerShare * (X1 - X0), X0 + (1 - revealShare) * (X1 - X0)];
    const a = phases[1];
    const b = phases[2];
    const cap = (k: string) => k.charAt(0).toUpperCase() + k.slice(1);
    stripLabels = [
      cap(opener.kind),
      a && b ? `${cap(a.kind)} and ${b.kind} \u00d7${a.repeats}` : '',
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
}) {
  const target = React.useMemo(
    () => buildChartTarget(profile, roadmap, sparkline),
    [profile, roadmap, sparkline],
  );

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
  const { floor, ceiling } = roadmap.band;

  // One source of truth for whether the phase strip is drawn, used for the
  // canvas height as well as the render. The height used to key off `bare`
  // while the strip keyed off `strip ?? !bare`, so a caller passing
  // strip={false} with labels on reserved 36pt for a strip it never drew —
  // the dead space under the route card on Create.
  const showStrip = sparkline ? false : strip ?? !bare;
  const svgHeight = sparkline ? 44 : showStrip ? 160 : 124;

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
      {/* Without ticks the space above the band reads as a gap rather than as
          scale, which is why the chart looked emptier than the mockup. */}
      {bare && !sparkline
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

      {bare || sparkline ? null : (
        <>
          <SvgText x={X1 + 2} y={cur.bandTop + 4} fontSize={9} fill="#5c5c62">
            {`${ceiling}%`}
          </SvgText>
          <SvgText x={X1 + 2} y={cur.bandBottom + 3} fontSize={9} fill="#5c5c62">
            {`${floor}%`}
          </SvgText>
        </>
      )}
      <Path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={sparkline ? 1.8 : 2.5}
        strokeOpacity={sparkline ? 0.55 : 1}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {sparkline ? null : (
        <>
          <Circle cx={X0} cy={cur.startY} r={8} fill={`${color}2e`} />
          <Circle cx={X0} cy={cur.startY} r={4.5} fill={color} />
          <Circle cx={X1} cy={cur.ys[N - 1]} r={3.5} fill="#131316" stroke="#8e8e93" strokeWidth={1.5} />
        </>
      )}
      {bare || sparkline ? null : (
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