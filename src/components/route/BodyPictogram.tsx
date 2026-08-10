// src/components/route/BodyPictogram.tsx
//
// The body fat silhouette. A pictogram in the restroom-sign language, drawn
// rather than borrowed, so the body can widen while everything else holds
// still.
//
// WHY DRAWN AND NOT THE IONICONS GLYPH. Scaling a glyph horizontally widens the
// head and limbs along with the torso, which reads as a distorted icon rather
// than a heavier body. Drawing it means the head, the leg length and the hem
// are fixed constants and only the torso and hips are functions of body fat.
// That is the entire trick, and it is why this reads when two earlier and far
// more detailed attempts did not.
//
// WHAT IS DELIBERATELY ABSENT. No abs, no waist taper, no definition marks, no
// separate arms. Arms are the sloped shoulder line, exactly as in the real
// icon. Every one of those details was in the previous version and every one
// of them looked uncanny below about 100pt.
//
// WHAT CARRIES SEX. The skirt. Male widens at the shoulder and waist, female
// at the hip, and the female scale is shifted nine points, the same convention
// the tiers and the goal scale already use.

import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import type { Sex } from '../../utils/goalsProfile';

/** Drawing space. Every number below is in these units. */
const VB_W = 120;
const VB_H = 200;
const CX = VB_W / 2;

/** Fixed landmarks. None of these move with body fat, on purpose. */
const HEAD_R = 13;
const HEAD_Y = 26;
const SHOULDER_Y = 48;
const WAIST_Y = 104;
const HIP_Y = 118;
const HEM_Y = 186;
const LEG_GAP = 3.5;

/** Body fat where widening starts, before the female shift, and how many
 *  points it takes to reach the widest. */
const LEAN_END = 6;
const SPAN = 28;

interface Props {
  bodyFatPct: number;
  sex?: Sex;
  /** Rendered height in points. Width follows the drawing box. */
  height?: number;
  color: string;
}

function BodyPictogram({ bodyFatPct, sex, height = 96, color }: Props) {
  const female = sex === 'female';
  const shift = female ? 9 : 0;
  const t = Math.min(1, Math.max(0, (bodyFatPct - (LEAN_END + shift)) / SPAN));

  const shoulder = (female ? 22 : 27) + t * 9;
  const waist = (female ? 19 : 22) + t * 13;
  const hip = (female ? 30 : 22) + t * 13;
  const legOuter = (female ? 15 : 16) + t * 6;

  const width = (height * VB_W) / VB_H;

  // The shoulder line is a single quadratic, which is what stands in for arms.
  const body = female
    ? `M ${CX - shoulder} ${SHOULDER_Y}` +
      ` Q ${CX} ${SHOULDER_Y - 9} ${CX + shoulder} ${SHOULDER_Y}` +
      ` L ${CX + waist} ${WAIST_Y}` +
      ` L ${CX + hip} ${HIP_Y}` +
      ` L ${CX - hip} ${HIP_Y}` +
      ` L ${CX - waist} ${WAIST_Y} Z`
    : `M ${CX - shoulder} ${SHOULDER_Y}` +
      ` Q ${CX} ${SHOULDER_Y - 9} ${CX + shoulder} ${SHOULDER_Y}` +
      ` L ${CX + waist} ${WAIST_Y}` +
      ` L ${CX + waist * 0.94} ${HIP_Y}` +
      ` L ${CX - waist * 0.94} ${HIP_Y}` +
      ` L ${CX - waist} ${WAIST_Y} Z`;

  const leg = (s: 1 | -1) =>
    `M ${CX + s * legOuter} ${HIP_Y}` +
    ` L ${CX + s * LEG_GAP} ${HIP_Y}` +
    ` L ${CX + s * LEG_GAP} ${HEM_Y}` +
    ` L ${CX + s * (legOuter - 2)} ${HEM_Y} Z`;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Circle cx={CX} cy={HEAD_Y} r={HEAD_R} fill={color} />
      <Path d={body} fill={color} />
      <Path d={leg(-1)} fill={color} />
      <Path d={leg(1)} fill={color} />
    </Svg>
  );
}

// Memoised: the route screens re-render on every drag frame, and the shape only
// changes when the whole percentage does. Callers should pass a rounded value.
export default React.memo(BodyPictogram);