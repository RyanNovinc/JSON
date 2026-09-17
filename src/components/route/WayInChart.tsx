/**
 * WayInMini — the shape of one way into the range, for its row on the way-in
 * screen.
 *
 * REPLACED THE FULL CHART ON 14 Sep 2026. The first version of the screen drew
 * all three ways on one weight-over-months chart above the rows, and the
 * screen read as overloaded next to the rest of the flow. Now each row carries
 * its own miniature, the way the route screen's rows do, and the file keeps
 * its name so the screen's import did not have to move.
 *
 * THE ONE SHAPE ON THIS JOURNEY THAT PLOTS WEIGHT, deliberately. Every other
 * miniature draws body fat, and the way-in question is not about body fat —
 * all three answers arrive at the same body fat. It is about what the scale
 * does on the way there, which is the number the user objected to. So the
 * dashed rule is where they stand today and the line is where the scale goes.
 *
 * The drop is drawn to scale against the DEEPEST of the three options, so the
 * three miniatures compare with each other: a hold is flat on the rule, an
 * ease drifts a little under it, a cut drops to the bottom. Time is not drawn
 * — every line runs the full width — because a cut's two months beside a
 * hold's fifteen would leave the cut a stub, and the months are on the line of
 * text beside it. The route between the ends follows planCurve's rule for the
 * phase kind: a cut is exponential in weight, a hold is flat, an ease is a
 * straight drift.
 */

import React from 'react';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import type { WayIn } from '../../utils/goalsProfile';

export interface WayInOption {
  id: WayIn;
  /** The weight the opener lands on, from the engine's phase. */
  exitWeightKg: number;
  /** The engine's [lo, hi] months for that phase. */
  months: [number, number];
  /** The body fat it lands at — the bottom of the range, or above it when a hold stops early. */
  exitBodyFatPct: number;
}

interface Props {
  id: WayIn;
  weightKg: number;
  exitWeightKg: number;
  /** The lowest exit weight among the options on screen; sets the scale of the drop. */
  deepestExitWeightKg: number;
  color: string;
}

const W = 116;
const H = 70;
const X0 = 4;
const X1 = 110;
const Y_TODAY = 22;
const Y_DEEP = 58;
const N = 20;

export default function WayInMini({ id, weightKg, exitWeightKg, deepestExitWeightKg, color }: Props) {
  const span = Math.max(0.1, weightKg - deepestExitWeightKg);
  const yOf = (w: number) => Y_TODAY + ((weightKg - w) / span) * (Y_DEEP - Y_TODAY);
  const end = Math.max(Y_TODAY, Math.min(Y_DEEP, yOf(exitWeightKg)));

  const pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = X0 + (X1 - X0) * t;
    let y: number;
    if (id === 'hold') y = Y_TODAY;
    else if (id === 'cut') y = yOf(weightKg * Math.pow(exitWeightKg / weightKg, t));
    else y = Y_TODAY + (end - Y_TODAY) * t;
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${Math.min(Y_DEEP, y).toFixed(1)}`);
  }

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Line x1={0} y1={Y_TODAY} x2={W} y2={Y_TODAY} stroke="#2a2a30" strokeWidth={1} strokeDasharray="2 3" />
      <Path
        d={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Circle cx={X1} cy={end} r={3} fill={color === '#54545e' ? '#0a0a0b' : color} stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}