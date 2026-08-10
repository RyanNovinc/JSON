// src/components/route/PhysiqueFigure.tsx
//
// The silhouette the route screens draw: a body shape that changes with body
// fat, not an icon.
//
// WHY NOT BodyFigure. That component is a pictogram tuned to read at ~34pt in
// a list row, and pictograms do not survive being enlarged: the torso is a
// rectangle, the waist does not taper, and the definition marks disappear.
// This one is built to be looked at, so every dimension is a function of the
// body fat percentage rather than a fixed outline.
//
// WHAT MAKES IT READ AS A BODY, in the order the fixes mattered:
//   1. The arms hang CLEAR of the torso. Overlapping them merged everything
//      into one shape, which is most of what made the first attempt look like
//      signage.
//   2. The legs are separated and tapered, with feet, rather than two
//      rectangles butted together.
//   3. Eight heads tall rather than five.
//
// WHAT CARRIES SEX. Shoulder to hip ratio, not a hip number. Male shoulders
// stay wider than the hips at every body fat and female hips stay wider than
// the shoulders at every body fat, which reads at 40pt where a waist
// difference does not. The female scale is also shifted nine points, the same
// convention the tiers and the lean ribbon already use.
//
// WHAT CARRIES BODY FAT. The waist widens most and overtakes the chest at the
// top of the range, shoulders narrow slightly because taper is relative, and
// the abs, midline and oblique V fade out between roughly 8 and 17% where they
// genuinely stop being visible.
//
// The definition marks are CUT OUT in the surrounding colour rather than drawn
// in a darker shade, so the figure stays a single flat silhouette at any size.
// definitionColor must therefore match whatever sits behind it.

import React from 'react';
import Svg, { Path, Ellipse, Line } from 'react-native-svg';
import type { Sex } from '../../utils/goalsProfile';

/** Drawing space. Every number below is in these units. */
const VB_W = 120;
const VB_H = 200;
const CX = VB_W / 2;

/** Vertical landmarks. */
const SHOULDER_Y = 36;
const WAIST_Y = 92;
const HIP_Y = 112;
const KNEE_Y = 150;
const ANKLE_Y = 186;

interface Props {
  bodyFatPct: number;
  sex?: Sex;
  /** Rendered height in points. Width follows the drawing box. */
  height?: number;
  color: string;
  /** Whatever colour sits behind the figure: the definition marks are cut out
   *  in it, so a mismatch shows as visible slots on the torso. */
  definitionColor: string;
}

function PhysiqueFigure({
  bodyFatPct,
  sex,
  height = 96,
  color,
  definitionColor,
}: Props) {
  const female = sex === 'female';
  const shift = female ? 9 : 0;

  // 0 at the lean end of the useful range, 1 at the soft end.
  const t = clamp((bodyFatPct - (6 + shift)) / 28);

  const shoulder = female ? 20.5 - t * 1.0 : 26.5 - t * 2.0;
  const chest = female ? 18.0 + t * 4.0 : 22.5 + t * 4.0;
  const waist = female ? 12.5 + t * 12.5 : 14.5 + t * 13.5;
  const hip = female ? 22.0 + t * 6.5 : 17.5 + t * 6.0;
  const thigh = female ? 9.5 + t * 3.2 : 9.0 + t * 3.0;
  const armW = female ? 4.6 + t * 1.6 : 5.6 + t * 1.8;
  const headR = female ? 8.2 : 8.8;
  const neck = female ? 4.0 : 4.8;

  const absOpacity = clamp(1 - (bodyFatPct - (8 + shift)) / 9);
  const vOpacity = clamp(1 - (bodyFatPct - (7 + shift)) / 5);

  const width = (height * VB_W) / VB_H;

  const torso =
    `M ${CX - shoulder} ${SHOULDER_Y}` +
    ` C ${CX - chest} ${SHOULDER_Y + 12} ${CX - chest} ${SHOULDER_Y + 30} ${CX - waist} ${WAIST_Y}` +
    ` C ${CX - waist - 1} ${WAIST_Y + 8} ${CX - hip} ${HIP_Y - 8} ${CX - hip} ${HIP_Y}` +
    ` L ${CX + hip} ${HIP_Y}` +
    ` C ${CX + hip} ${HIP_Y - 8} ${CX + waist + 1} ${WAIST_Y + 8} ${CX + waist} ${WAIST_Y}` +
    ` C ${CX + chest} ${SHOULDER_Y + 30} ${CX + chest} ${SHOULDER_Y + 12} ${CX + shoulder} ${SHOULDER_Y} Z`;

  const leg = (s: 1 | -1) => {
    const hipX = CX + s * (hip * 0.52);
    const kneeX = CX + s * (thigh * 0.62);
    const ankX = CX + s * (thigh * 0.48);
    return (
      `M ${hipX - s * thigh} ${HIP_Y}` +
      ` C ${kneeX - s * (thigh * 0.62)} ${KNEE_Y} ${ankX - s * (thigh * 0.42)} ${ANKLE_Y - 16} ${ankX - s * (thigh * 0.4)} ${ANKLE_Y}` +
      ` L ${ankX + s * (thigh * 0.46)} ${ANKLE_Y}` +
      ` C ${ankX + s * (thigh * 0.4)} ${ANKLE_Y - 18} ${kneeX + s * (thigh * 0.55)} ${KNEE_Y} ${hipX + s * (hip * 0.46)} ${HIP_Y} Z`
    );
  };

  const arm = (s: 1 | -1) => {
    const top = CX + s * (shoulder - 1.5);
    const out = CX + s * (shoulder + armW * 0.4 + 1.5);
    return (
      `M ${top} ${SHOULDER_Y + 2}` +
      ` C ${out + s * 3} ${SHOULDER_Y + 26} ${out + s * 4} ${SHOULDER_Y + 56} ${out + s * 2.4} ${SHOULDER_Y + 82}` +
      ` L ${out - s * armW} ${SHOULDER_Y + 82}` +
      ` C ${out - s * (armW - 1)} ${SHOULDER_Y + 56} ${out - s * (armW - 1.5)} ${SHOULDER_Y + 28} ${top - s * (armW * 0.9)} ${SHOULDER_Y + 6} Z`
    );
  };

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Ellipse cx={CX} cy={18} rx={headR} ry={headR * 1.16} fill={color} />
      {/* Neck flares into the shoulders; the torso overlaps its base, which
          hides the join without needing a mask. */}
      <Path
        d={`M ${CX - neck} 27 L ${CX + neck} 27 L ${CX + neck + 1.7} ${SHOULDER_Y + 1} L ${CX - neck - 1.7} ${SHOULDER_Y + 1} Z`}
        fill={color}
      />
      <Path d={torso} fill={color} />
      <Path d={leg(-1)} fill={color} />
      <Path d={leg(1)} fill={color} />
      <Path d={arm(-1)} fill={color} />
      <Path d={arm(1)} fill={color} />

      {absOpacity > 0.02 ? (
        <>
          <Line
            x1={CX - 7}
            y1={SHOULDER_Y + 22}
            x2={CX + 7}
            y2={SHOULDER_Y + 22}
            stroke={definitionColor}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={absOpacity}
          />
          {[SHOULDER_Y + 32, SHOULDER_Y + 42, SHOULDER_Y + 52].map((y, i) => {
            const w = (waist - 2) * 0.58 - i * 1.2;
            return (
              <Line
                key={y}
                x1={CX - w}
                y1={y}
                x2={CX + w}
                y2={y}
                stroke={definitionColor}
                strokeWidth={2}
                strokeLinecap="round"
                opacity={absOpacity}
              />
            );
          })}
          <Line
            x1={CX}
            y1={SHOULDER_Y + 26}
            x2={CX}
            y2={WAIST_Y - 2}
            stroke={definitionColor}
            strokeWidth={1.6}
            opacity={absOpacity}
          />
        </>
      ) : null}

      {vOpacity > 0.02 ? (
        <>
          <Path
            d={`M ${CX - waist + 1.5} ${WAIST_Y - 2} L ${CX - 4} ${HIP_Y - 4}`}
            stroke={definitionColor}
            strokeWidth={1.8}
            strokeLinecap="round"
            fill="none"
            opacity={vOpacity}
          />
          <Path
            d={`M ${CX + waist - 1.5} ${WAIST_Y - 2} L ${CX + 4} ${HIP_Y - 4}`}
            stroke={definitionColor}
            strokeWidth={1.8}
            strokeLinecap="round"
            fill="none"
            opacity={vOpacity}
          />
        </>
      ) : null}
    </Svg>
  );
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));

// Memoised because the route screens re-render on every drag frame. Without
// this the figure rebuilds its paths dozens of times a second for a shape that
// only changes when the whole percentage changes. Callers should pass a
// rounded bodyFatPct so the comparison actually hits.
export default React.memo(PhysiqueFigure);