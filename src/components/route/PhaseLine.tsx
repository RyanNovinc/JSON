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

import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import type { GoalsProfile } from '../../utils/goalsProfile';
import type { Roadmap } from '../../utils/roadmap';

const VB = { W: 308, H: 96, X0: 4, X1: 304, Y0: 12, YB: 84 } as const;

interface Props {
  profile: GoalsProfile;
  roadmap: Roadmap;
  /** Which phase to light. Index into roadmap.phases. */
  phaseIndex: number;
  color: string;
}

const mid = (m: [number, number]) => (m[0] + m[1]) / 2;

export default function PhaseLine({ profile, roadmap, phaseIndex, color }: Props) {
  const { W, H, X0, X1, Y0, YB } = VB;

  // Waypoints as [months, exitBodyFat], plus which phase each belongs to, so a
  // segment can be lit without recomputing the shape.
  const legs: Array<{ months: number; bf: number; phase: number }> = [];
  if (roadmap.phases.length === 1) {
    legs.push({ months: mid(roadmap.phases[0].estMonths), bf: roadmap.phases[0].exitBodyFatPct, phase: 0 });
  } else {
    const [opener, blockA, blockB, reveal] = roadmap.phases;
    legs.push({ months: mid(opener.estMonths), bf: opener.exitBodyFatPct, phase: 0 });
    for (let i = 0; i < blockA.repeats; i++) {
      legs.push({ months: mid(blockA.estMonths), bf: blockA.exitBodyFatPct, phase: 1 });
      legs.push({ months: mid(blockB.estMonths), bf: blockB.exitBodyFatPct, phase: 2 });
    }
    legs.push({ months: mid(reveal.estMonths), bf: reveal.exitBodyFatPct, phase: 3 });
  }

  const start = profile.currentBodyFatPct ?? roadmap.band.ceiling + 2;
  const total = legs.reduce((a, l) => a + l.months, 0) || 1;

  const all = [start, ...legs.map((l) => l.bf)];
  const hi = Math.max(...all) + 1.5;
  const lo = Math.min(...all) - 1.5;
  const yOf = (bf: number) => Y0 + ((hi - bf) / (hi - lo || 1)) * (YB - Y0);

  // Cumulative x for every node, and the x span belonging to the lit phase.
  const nodes: Array<{ x: number; y: number; phase: number }> = [
    { x: X0, y: yOf(start), phase: -1 },
  ];
  let acc = 0;
  legs.forEach((l) => {
    acc += l.months;
    nodes.push({ x: X0 + (acc / total) * (X1 - X0), y: yOf(l.bf), phase: l.phase });
  });

  const toPath = (pts: Array<{ x: number; y: number }>) =>
    pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  // The lit run is every node of this phase plus the one before it, so the
  // segment starts where the previous phase ended rather than floating.
  const firstIdx = nodes.findIndex((n) => n.phase === phaseIndex);
  const lastIdx = nodes.map((n) => n.phase).lastIndexOf(phaseIndex);
  const lit = firstIdx > 0 ? nodes.slice(firstIdx - 1, lastIdx + 1) : [];

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Path d={toPath(nodes)} fill="none" stroke="#26262b" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {lit.length > 1 ? (
        <Path d={toPath(lit)} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      ) : null}
      {lit.length > 1 ? (
        <Circle cx={lit[lit.length - 1].x} cy={lit[lit.length - 1].y} r={4.5} fill={color} />
      ) : null}
    </Svg>
  );
}