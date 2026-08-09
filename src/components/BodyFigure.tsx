// src/components/BodyFigure.tsx
//
// The parametric body figure used by the body-fat tier picker.
//
// ONE path, ONE parameter. `t` runs 0 (leanest) to 1 (heaviest) and every
// dimension is a lerp on it, so six tiers times two sexes come from a single
// component rather than twelve assets.
//
// WHY IT IS DRAWN RATHER THAN LICENSED. The tiers are read COMPARATIVELY —
// the user scans them looking for themselves — so the figures must differ in
// exactly one variable and be identical in pose, proportion, line weight and
// stance. Stock sets fail that by construction, because their figures were
// drawn separately for different purposes. Worse, every graded human series
// on the market grades by BMI, which draws the lean end as SKINNY. An 8%
// body-fat lifter is not thin, and a picker that says otherwise will be
// misread by exactly the users it matters most for.
//
// The fix is the shoulder-to-waist ratio: shoulder width barely moves across
// the range while the waist nearly triples, so the ratio falls from about 1.8
// to about 0.9. That ratio is what the eye actually reads as "in shape",
// not overall size.

import React from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';
import type { Sex } from '../utils/goalsProfile';

interface Dimensions {
  sh: [number, number]; // shoulder half-width
  ch: [number, number]; // chest half-width
  wa: [number, number]; // waist half-width
  hi: [number, number]; // hip half-width
  neck: [number, number];
  arm: [number, number];
  leg: [number, number];
  head: [number, number];
}

// Each pair is [leanest, heaviest]. Note how little `sh` moves compared with
// `wa` — that gap is the whole illusion.
const PARAMS: Record<'male' | 'female', Dimensions> = {
  male: {
    sh: [20, 24],
    ch: [18, 25],
    wa: [11, 26],
    hi: [14, 24],
    neck: [4.6, 7.4],
    arm: [4.4, 7.2],
    leg: [8.4, 13.4],
    head: [6.8, 7.6],
  },
  female: {
    sh: [16.5, 20],
    ch: [15.5, 21],
    wa: [10.5, 23],
    hi: [18, 27],
    neck: [3.8, 6.2],
    arm: [3.8, 6.4],
    leg: [8.8, 13.6],
    head: [6.6, 7.4],
  },
};

const CENTRE = 30;
const VIEWBOX = '0 0 60 150';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface BodyFigureProps {
  /** 0 = leanest tier, 1 = heaviest. Clamped. */
  t: number;
  sex?: Sex;
  /** Rendered width in px. Height follows the 60:150 viewBox ratio. */
  size?: number;
  color?: string;
  /**
   * The faint definition mark on the leanest figures. It fades out by roughly
   * the third tier and is what makes "abs clearly defined" legible at 38px —
   * without it the leanest figure reads as underweight rather than lean.
   */
  showDefinition?: boolean;
  /** Colour the definition mark is cut out in. Should match the card behind. */
  definitionColor?: string;
}

export default function BodyFigure({
  t,
  sex,
  size = 38,
  color = '#52525b',
  showDefinition = true,
  definitionColor = '#131316',
}: BodyFigureProps) {
  const clamped = Math.max(0, Math.min(1, t));
  const p = PARAMS[sex === 'female' ? 'female' : 'male'];
  const d = (key: keyof Dimensions) => lerp(p[key][0], p[key][1], clamped);

  const sh = d('sh');
  const ch = d('ch');
  const wa = d('wa');
  const hi = d('hi');
  const neck = d('neck');
  const arm = d('arm');
  const leg = d('leg');
  const head = d('head');

  const armX = sh + arm * 0.35;
  const legX = hi * 0.42;
  const definitionOpacity = Math.max(0, 1 - clamped * 3.2) * 0.55;

  // Torso, mirrored about the centre line.
  const torso =
    `M ${CENTRE - sh} 32 ` +
    `C ${CENTRE - sh - 0.5} 40, ${CENTRE - ch} 44, ${CENTRE - wa} 60 ` +
    `C ${CENTRE - wa - 0.4} 68, ${CENTRE - hi} 70, ${CENTRE - hi} 82 ` +
    `L ${CENTRE + hi} 82 ` +
    `C ${CENTRE + hi} 70, ${CENTRE + wa + 0.4} 68, ${CENTRE + wa} 60 ` +
    `C ${CENTRE + ch} 44, ${CENTRE + sh + 0.5} 40, ${CENTRE + sh} 32 Z`;

  return (
    <Svg width={size} height={(size * 150) / 60} viewBox={VIEWBOX}>
      <Circle cx={CENTRE} cy={13} r={head} fill={color} />
      <Path
        d={`M ${CENTRE} 20 L ${CENTRE} 30`}
        stroke={color}
        strokeWidth={neck}
        strokeLinecap="round"
      />
      <Path
        d={`M ${CENTRE - armX} 36 L ${CENTRE - armX - 1.5} 74`}
        stroke={color}
        strokeWidth={arm}
        strokeLinecap="round"
      />
      <Path
        d={`M ${CENTRE + armX} 36 L ${CENTRE + armX + 1.5} 74`}
        stroke={color}
        strokeWidth={arm}
        strokeLinecap="round"
      />
      <Path d={torso} fill={color} />
      <Path
        d={`M ${CENTRE - legX} 84 L ${CENTRE - legX - 1} 138`}
        stroke={color}
        strokeWidth={leg}
        strokeLinecap="round"
      />
      <Path
        d={`M ${CENTRE + legX} 84 L ${CENTRE + legX + 1} 138`}
        stroke={color}
        strokeWidth={leg}
        strokeLinecap="round"
      />
      {showDefinition && definitionOpacity > 0.02 ? (
        <G
          stroke={definitionColor}
          strokeWidth={1.1}
          strokeLinecap="round"
          opacity={definitionOpacity}
        >
          <Path d={`M ${CENTRE} 47 L ${CENTRE} 62`} />
          <Path d={`M ${CENTRE - 4.4} 51 L ${CENTRE + 4.4} 51`} />
          <Path d={`M ${CENTRE - 4.0} 57 L ${CENTRE + 4.0} 57`} />
        </G>
      ) : null}
    </Svg>
  );
}