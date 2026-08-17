// src/components/route/PhaseLine.tsx
//
// The whole journey, drawn dim, with a single phase's segment lit.
//
// WHY IT EXISTS. The reveal screens used to be a phase name and a duration on
// black. After eight screens of instruments that hands the user two lines of
// text and asks them to feel something. This puts the plan they just locked in
// on the screen and shows them which part of it they are standing in.
//
// PACING MATCHES JourneyChart: segment widths come from each phase's estMonths
// midpoint, so a short trim is visually short. The two charts must agree, since
// the user sees them within seconds of each other.
//
// The y axis direction matches too: high body fat at the top, so the line
// descending means getting leaner.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import type { GoalsProfile } from '../../utils/goalsProfile';
import type { Roadmap } from '../../utils/roadmap';
import { expandPhases } from '../../utils/phaseJourney';

const VB = { W: 308, H: 96, X0: 4, X1: 304, Y0: 12, YB: 84 } as const;

/** How long the lit segment takes to draw itself. */
const SWEEP_MS = 900;

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  profile: GoalsProfile;
  roadmap: Roadmap;
  /**
   * Which LEG to light: an index into the expanded list of blocks the user will
   * actually do, not into roadmap.phases.
   *
   * This distinction is the whole bug it fixes. roadmap.phases holds four
   * definitions, two of which repeat, so lighting "phase 1" used to light every
   * trim in the journey at once — six segments instead of one.
   */
  legIndex: number;
  color: string;
  /** Draws the lit segment in on mount, with a bright head running ahead of
   *  it. Off by default so the chart can also be used as a static chart. */
  animate?: boolean;
}

const mid = (m: [number, number]) => (m[0] + m[1]) / 2;

export default function PhaseLine({ profile, roadmap, legIndex, color, animate = false }: Props) {
  const { W, H, X0, X1, Y0, YB } = VB;

  // Waypoints as [months, exitBodyFat], plus which phase each belongs to, so a
  // segment can be lit without recomputing the shape.
  // One entry per block the user will actually do, in order. Repeats are
  // expanded here rather than collapsed, so each occurrence is addressable.
  // Expanded via the shared helper rather than rebuilt here. This file used to
  // destructure four phases positionally and push the reveal unconditionally,
  // which threw the moment a roadmap had three — the same bug as JourneyChart,
  // in a second copy of the same logic. One expansion, one place to fix.
  const legs: Array<{ months: number; bf: number }> = expandPhases(roadmap).map((p) => ({
    months: mid(p.estMonths),
    bf: p.exitBodyFatPct,
  }));

  const start = profile.currentBodyFatPct ?? roadmap.band.ceiling + 2;
  const total = legs.reduce((a, l) => a + l.months, 0) || 1;

  const all = [start, ...legs.map((l) => l.bf)];
  const hi = Math.max(...all) + 1.5;
  const lo = Math.min(...all) - 1.5;
  const yOf = (bf: number) => Y0 + ((hi - bf) / (hi - lo || 1)) * (YB - Y0);

  // Cumulative x for every node, and the x span belonging to the lit phase.
  const nodes: Array<{ x: number; y: number }> = [{ x: X0, y: yOf(start) }];
  let acc = 0;
  legs.forEach((l) => {
    acc += l.months;
    nodes.push({ x: X0 + (acc / total) * (X1 - X0), y: yOf(l.bf) });
  });

  const toPath = (pts: Array<{ x: number; y: number }>) =>
    pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  // Three states, not two. Everything before the current leg is TRAVELLED and
  // gets a dimmer version of the accent; the current leg is lit; everything
  // after stays neutral. Without the travelled state, a user three cycles in
  // sees the work they have done rendered identically to the work they have
  // not, which is most of what the line is there to show.
  const i = Math.min(Math.max(legIndex, 0), legs.length - 1);
  const lit = nodes.slice(i, i + 2);

  // Travelled and current as one continuous run, plus where along it the
  // current leg begins, so the gradient can reach full intensity exactly there.
  const run = nodes.slice(0, i + 2);
  const runEndX = run[run.length - 1]?.x ?? X1;
  const junction = runEndX > X0 ? Math.min(0.98, (nodes[i].x - X0) / (runEndX - X0)) : 0.9;

  // Cumulative length along the lit run, so the sweep can both reveal the
  // stroke and place a head at the right point at the same time.
  const segLens: number[] = [];
  let litLen = 0;
  for (let i = 1; i < lit.length; i++) {
    const d = Math.hypot(lit[i].x - lit[i - 1].x, lit[i].y - lit[i - 1].y);
    litLen += d;
    segLens.push(litLen);
  }

  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animate || lit.length < 2) return;
    sweep.setValue(0);
    Animated.timing(sweep, {
      toValue: 1,
      duration: SWEEP_MS,
      easing: Easing.out(Easing.cubic),
      // strokeDashoffset and cx are not transform or opacity, so this cannot
      // run on the native driver.
      useNativeDriver: false,
    }).start();
  }, [animate, litLen, sweep, lit.length]);

  const fractions = segLens.map((l) => l / (litLen || 1));
  const inputRange = [0, ...fractions];
  const headX = sweep.interpolate({
    inputRange,
    outputRange: lit.map((n) => n.x),
  });
  const headY = sweep.interpolate({
    inputRange,
    outputRange: lit.map((n) => n.y),
  });
  const dashOffset = sweep.interpolate({ inputRange: [0, 1], outputRange: [litLen, 0] });

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Path d={toPath(nodes)} fill="none" stroke="#26262b" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {/* ONE path for travelled and current together, with one gradient
          running through the junction.

          Two separate strokes cannot be made to meet cleanly: they differ in
          opacity and width, and they join at a corner where the line changes
          direction, so the eye reads the join as a colour change rather than
          as progress. Drawing them as a single stroke means there is no join
          to see — the intensity simply ramps up to full by the time it reaches
          the current leg.

          userSpaceOnUse so the stops land on viewBox coordinates. The default
          bounding-box units would rescale the ramp to whatever the path
          happens to span, so the fade would look different at every leg.

          Conditioned on the RUN, not on travelled: on the very first leg there
          is nothing behind the user yet, and gating on travelled would leave
          the static chart showing a lone dot with no line under it. */}
      {run.length > 1 ? (
        <>
          <Defs>
            <LinearGradient
              id="phaseRun"
              gradientUnits="userSpaceOnUse"
              x1={X0}
              y1={0}
              x2={runEndX}
              y2={0}
            >
              <Stop offset="0" stopColor={color} stopOpacity={0.1} />
              <Stop offset={junction.toFixed(3)} stopColor={color} stopOpacity={0.95} />
              <Stop offset="1" stopColor={color} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Path
            d={toPath(run)}
            fill="none"
            stroke="url(#phaseRun)"
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </>
      ) : null}

      {/* The animated sweep still draws the current leg on top, because it has
          to reveal itself independently of the run beneath it. */}
      {lit.length > 1 && animate ? (
        <>
          <AnimatedPath
            d={toPath(lit)}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={`${litLen}, ${litLen}`}
            strokeDashoffset={dashOffset as unknown as number}
          />
          {/* The head: a soft halo and a bright core, so it reads as light
              travelling rather than a dot being dragged. */}
          <AnimatedCircle cx={headX as unknown as number} cy={headY as unknown as number} r={9} fill={color} opacity={0.18} />
          <AnimatedCircle cx={headX as unknown as number} cy={headY as unknown as number} r={4.5} fill={color} />
        </>
      ) : null}

      {lit.length > 1 && !animate ? (
        <Circle cx={lit[lit.length - 1].x} cy={lit[lit.length - 1].y} r={4.5} fill={color} />
      ) : null}
    </Svg>
  );
}