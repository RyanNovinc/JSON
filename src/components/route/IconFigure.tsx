// src/components/route/IconFigure.tsx
//
// The body fat silhouette, built from the Ionicons man and woman pictograms
// rather than drawn from scratch.
//
// WHY. PhysiqueFigure tried to draw an anatomically varying body, and a
// parametric SVG at that size lands somewhere between crude and uncanny. The
// stock pictograms are clean, instantly legible, and already used on the sex
// beat, so reusing them keeps one visual language.
//
// HOW BODY FAT READS. The figure is scaled HORIZONTALLY, not uniformly.
// Scaling both axes just makes the icon bigger, which reads as closer, not
// heavier. Widening at a fixed height reads as body width, which is the thing
// actually changing.
//
// THE HONEST LIMITATION. A horizontal scale stretches the head and limbs along
// with the torso, so the range has to stay modest or it stops looking like a
// person. WIDEST is deliberately conservative for that reason. If you want a
// figure where only the midsection changes, that is a drawn asset, not a
// transform.

import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Sex } from '../../utils/goalsProfile';

/** Horizontal scale at the lean and soft ends of the useful range. */
const NARROWEST = 0.86;
const WIDEST = 1.3;

/** Body fat where the scale starts widening, before the female shift. */
const LEAN_END = 6;
const SPAN = 28;

interface Props {
  bodyFatPct: number;
  sex?: Sex;
  /** Icon size in points. Height stays fixed as the width changes. */
  size?: number;
  color: string;
}

function IconFigure({ bodyFatPct, sex, size = 72, color }: Props) {
  const shift = sex === 'female' ? 9 : 0;
  const t = Math.min(1, Math.max(0, (bodyFatPct - (LEAN_END + shift)) / SPAN));
  const scaleX = NARROWEST + t * (WIDEST - NARROWEST);

  return (
    // The wrapper is sized to the widest the figure can get, so a card holding
    // one does not reflow as the value changes.
    <View style={{ width: size * WIDEST, alignItems: 'center' }}>
      <View style={{ transform: [{ scaleX }] }}>
        <Ionicons name={sex === 'female' ? 'woman' : 'man'} size={size} color={color} />
      </View>
    </View>
  );
}

// Memoised: the route screens re-render on every drag frame, and the shape only
// changes when the whole percentage does.
export default React.memo(IconFigure);