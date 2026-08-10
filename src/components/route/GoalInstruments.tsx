// src/components/route/GoalInstruments.tsx
//
// The two draggable lines on RouteScreen's goal beats, lifted out of the
// screen so the screen can be read in one sitting.
//
//   LeanRibbon  — goal body fat on a zone axis (beat 3)
//   FrameCurve  — goal weight on a stylised distribution of natural lifters
//                 at the user's height (beat 4)
//
// Both share one drag hook, which reports a 0..1 position along the track.
//
// WHAT CHANGED FROM THE INLINE VERSION
//
// LeanRibbon already painted ATTRACTIVE_BF_RANGE as a gold segment, but with
// nothing naming it, so it read as decoration. It is now labelled and carries a
// tick at ATTRACTIVE_BF_CENTRE. It still renders for male and unknown sex only:
// the literature behind the constant is male body composition.
//
// FrameCurve used to paint one sweet spot slice and one dashed line. It now
// paints all six regions routeZones knows about, and the region the pin is
// standing in brightens. That is the fix for the gauge being unreadable while
// dragging: the sentence under it changes at exactly the boundaries the eye
// can see, and both come from the same module.
//
// The ceiling is a fading ZONE between ffmiLimitsFor().ok and .edge rather than
// a hard line, because roadmap.ts says the grey zone is deliberate and the
// boundaries soft. Drawing a wall would contradict the constant it is drawn
// from.
//
// The pin no longer carries a "85.5 kg" label. It sat directly under the
// largest number on the screen, and the line's position is the information.

import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import Svg, {
  Path,
  Rect,
  Circle,
  Line,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { hapticTick } from '../../utils/hapticTick';
import type { GoalsProfile } from '../../utils/goalsProfile';
import {
  ffmiLimitsFor,
  leanAtNormalisedFfmi,
  weightAtBodyFat,
  leanMassKg,
  FFMI_UNTRAINED,
} from '../../utils/roadmap';
import {
  ATTRACTIVE_BF_RANGE,
  ATTRACTIVE_BF_CENTRE,
} from '../../utils/attractivenessTargets';
import { frameLandmarks, type FrameZoneKey, type EvidenceTopic } from '../../utils/routeZones';

// ---------------------------------------------------------------------------
// Shared drag
// ---------------------------------------------------------------------------

export function useSliderDrag(onFraction: (t: number, phase: 'move' | 'release') => void) {
  const trackW = useRef(0);
  const cb = useRef(onFraction);
  cb.current = onFraction;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: any) => {
        if (trackW.current > 0) cb.current(clamp(e.nativeEvent.locationX / trackW.current), 'move');
      },
      onPanResponderMove: (e: any) => {
        if (trackW.current > 0) cb.current(clamp(e.nativeEvent.locationX / trackW.current), 'move');
      },
      onPanResponderRelease: () => cb.current(-1, 'release'),
    }),
  ).current;
  return {
    panHandlers: pan.panHandlers,
    onLayout: (e: any) => {
      trackW.current = e.nativeEvent.layout.width;
    },
  };
}

// ---------------------------------------------------------------------------
// LeanRibbon
// ---------------------------------------------------------------------------

const RIBBON = { X0: 6, X1: 314 } as const;

export function LeanRibbon({
  sex,
  valuePct,
  themeColor,
  onChange,
}: {
  sex?: GoalsProfile['sex'];
  valuePct: number;
  themeColor: string;
  onChange: (pct: number, persist: boolean) => void;
}) {
  const female = sex === 'female';
  const shift = female ? 9 : 0;
  const bfMin = 8 + shift;
  const bfMax = 22 + shift;
  const { X0, X1 } = RIBBON;
  const xOf = (bf: number) =>
    X0 + Math.min(1, Math.max(0, (bf - bfMin) / (bfMax - bfMin))) * (X1 - X0);

  const last = useRef(valuePct);
  // The pin follows the finger continuously while the VALUE stays whole. The
  // track spans 14 points across the full width, so snapping the pin as well
  // made it jump roughly 22px at a time.
  const [livePct, setLivePct] = useState<number | null>(null);

  const drag = useSliderDrag((t, phase) => {
    if (phase === 'release') {
      setLivePct(null);
      onChange(last.current, true);
      return;
    }
    const raw = bfMin + t * (bfMax - bfMin);
    setLivePct(Math.min(bfMax, Math.max(bfMin, raw)));
    const pct = Math.min(bfMax, Math.max(bfMin, Math.round(raw)));
    if (pct !== last.current) {
      last.current = pct;
      hapticTick();
      onChange(pct, false);
    }
  });

  const zones = [
    { label: 'Very lean', bf: 9 + shift },
    { label: 'Athletic', bf: 13.5 + shift },
    { label: 'Fit', bf: 17.5 + shift },
    { label: 'Soft', bf: 20.5 + shift },
  ];
  const pinX = xOf(livePct ?? valuePct);
  const inRated =
    !female && valuePct >= ATTRACTIVE_BF_RANGE[0] && valuePct <= ATTRACTIVE_BF_RANGE[1];
  const ratedX0 = xOf(ATTRACTIVE_BF_RANGE[0]);
  const ratedX1 = xOf(ATTRACTIVE_BF_RANGE[1]);

  return (
    <View onLayout={drag.onLayout} {...drag.panHandlers}>
      <Svg width="100%" height={52} viewBox="0 0 320 52">
        <Rect x={X0} y={24} width={X1 - X0} height={6} rx={3} fill="rgba(255,255,255,0.08)" />

        {!female ? (
          <>
            <Rect
              x={ratedX0}
              y={24}
              width={Math.max(0, ratedX1 - ratedX0)}
              height={6}
              rx={3}
              fill={inRated ? 'rgba(245,213,101,0.62)' : 'rgba(245,213,101,0.42)'}
            />
            {/* Centre of the rated range. A tick rather than a second band:
                the [A] graded finding is that the optimum is a plateau. */}
            <Line
              x1={xOf(ATTRACTIVE_BF_CENTRE)}
              y1={25}
              x2={xOf(ATTRACTIVE_BF_CENTRE)}
              y2={29}
              stroke="#8a7c4e"
              strokeWidth={1}
            />
            <SvgText
              x={(ratedX0 + ratedX1) / 2}
              y={15}
              fontSize={9}
              fontWeight="700"
              fill={inRated ? '#f5d565' : '#8a7c4e'}
              textAnchor="middle"
            >
              RATED BEST
            </SvgText>
          </>
        ) : null}

        <Path d={`M ${pinX} 17 L ${pinX} 37`} stroke={themeColor} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={pinX} cy={27} r={5.5} fill={themeColor} />

        {zones.map((z) => (
          <SvgText key={z.label} x={xOf(z.bf)} y={50} fontSize={9} fill="#6b6b70" textAnchor="middle">
            {z.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------
// FrameCurve
// ---------------------------------------------------------------------------

const CURVE = { X0: 8, X1: 312, BASE_Y: 86, PEAK: 68, N: 48, MU: 0.42, SIGMA: 0.24 } as const;

/** How far past the outer edge the axis runs, in normalised FFMI. Without
 *  headroom the pin cannot reach the 'beyond' region and the user can never
 *  see what going too far looks like. */
const BEYOND_HEADROOM = 1.5;

export function FrameCurve({
  profile,
  goalWeightKg,
  goalBodyFatPct,
  zoneKey,
  themeColor,
  onGoalWeight,
  onLandmarkPress,
}: {
  profile: GoalsProfile;
  goalWeightKg: number;
  goalBodyFatPct: number;
  /** Which region the pin is in, from routeZones. Drives the highlight. */
  zoneKey: FrameZoneKey;
  themeColor: string;
  onGoalWeight: (weightKg: number, persist: boolean) => void;
  onLandmarkPress?: (topic: EvidenceTopic) => void;
}) {
  const { X0, X1, BASE_Y, PEAK, N, MU, SIGMA } = CURVE;
  const heightCm = profile.heightCm;
  const sex = profile.sex;
  const female = sex === 'female';

  const geom = useMemo(() => {
    if (heightCm == null) return null;
    const sexKey = female ? 'female' : 'male';
    const limits = ffmiLimitsFor(sex);
    const marks = frameLandmarks(heightCm, goalBodyFatPct, sex);
    const baseW = weightAtBodyFat(
      leanAtNormalisedFfmi(FFMI_UNTRAINED[sexKey], heightCm),
      goalBodyFatPct,
    );
    const maxW = weightAtBodyFat(
      leanAtNormalisedFfmi(limits.edge + BEYOND_HEADROOM, heightCm),
      goalBodyFatPct,
    );
    return { ...marks, baseW, maxW };
  }, [heightCm, goalBodyFatPct, sex, female]);

  const ys = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      out.push(BASE_Y - PEAK * Math.exp(-((t - MU) ** 2) / (2 * SIGMA ** 2)));
    }
    return out;
  }, []);

  const xAt = (i: number) => X0 + (i / (N - 1)) * (X1 - X0);
  const xOf = (w: number) => {
    if (!geom) return X0;
    const t = (w - geom.baseW) / (geom.maxW - geom.baseW);
    return X0 + Math.min(1, Math.max(0, t)) * (X1 - X0);
  };
  const yAtX = (x: number) => {
    const t = ((x - X0) / (X1 - X0)) * (N - 1);
    const i = Math.min(N - 2, Math.max(0, Math.floor(t)));
    const f = t - i;
    return ys[i] + (ys[i + 1] - ys[i]) * f;
  };

  const smoothPath = (from: number, to: number) => {
    let d = `M ${xAt(from).toFixed(1)} ${ys[from].toFixed(1)}`;
    for (let i = from + 1; i < to; i++) {
      const mx = (xAt(i) + xAt(i + 1)) / 2;
      const my = (ys[i] + ys[i + 1]) / 2;
      d += ` Q ${xAt(i).toFixed(1)} ${ys[i].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    d += ` L ${xAt(to).toFixed(1)} ${ys[to].toFixed(1)}`;
    return d;
  };

  /** A filled slice under the curve between two weights. */
  const sliceFor = (loKg: number, hiKg: number) => {
    const i0 = Math.round(((xOf(loKg) - X0) / (X1 - X0)) * (N - 1));
    const i1 = Math.round(((xOf(hiKg) - X0) / (X1 - X0)) * (N - 1));
    if (i1 - i0 < 2) return null;
    return `${smoothPath(i0, i1)} L ${xAt(i1).toFixed(1)} ${BASE_Y} L ${xAt(i0).toFixed(1)} ${BASE_Y} Z`;
  };

  const last = useRef(goalWeightKg);
  const [liveW, setLiveW] = useState<number | null>(null);

  const drag = useSliderDrag((t, phase) => {
    const g = geom;
    if (!g) return;
    if (phase === 'release') {
      setLiveW(null);
      onGoalWeight(last.current, true);
      return;
    }
    const raw = Math.min(g.maxW, Math.max(g.baseW + 1, g.baseW + t * (g.maxW - g.baseW)));
    setLiveW(raw);
    const w = Math.round(raw * 2) / 2;
    if (w !== last.current) {
      last.current = w;
      // Every half kilo, matching the step the curve actually reports.
      hapticTick();
      onGoalWeight(w, false);
    }
  });

  if (!geom) {
    return (
      <Text style={styles.gaugeFallback}>
        Add your height in Goals and stats and this becomes a map of what your frame supports.
      </Text>
    );
  }

  const line = smoothPath(0, N - 1);
  const area = `${line} L ${X1} ${BASE_Y} L ${X0} ${BASE_Y} Z`;

  const ratedSlice =
    geom.ratedApplies && geom.ratedLoKg != null && geom.ratedHiKg != null
      ? sliceFor(geom.ratedLoKg, geom.ratedHiKg)
      : null;
  const stretchSlice =
    geom.ratedApplies && geom.ratedHiKg != null && geom.stretchKg != null
      ? sliceFor(geom.ratedHiKg, geom.stretchKg)
      : null;

  const okX = xOf(geom.okKg);
  const edgeX = xOf(geom.edgeKg);
  const pinX = xOf(liveW ?? goalWeightKg);
  const pinY = yAtX(pinX);
  const ratedLabelX =
    geom.ratedLoKg != null && geom.ratedHiKg != null
      ? (xOf(geom.ratedLoKg) + xOf(geom.ratedHiKg)) / 2
      : 0;
  // The two bottom labels must never collide: short frames compress the axis.
  const showRatedLabel = ratedSlice != null && Math.abs(ratedLabelX - edgeX) > 74;

  return (
    <View onLayout={drag.onLayout} {...drag.panHandlers}>
      <Svg width="100%" height={106} viewBox="0 0 320 106">
        <Defs>
          <LinearGradient id="fcCeiling" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#8e8e93" stopOpacity={0} />
            <Stop offset="1" stopColor="#8e8e93" stopOpacity={0.22} />
          </LinearGradient>
          <LinearGradient id="fcCeilingOn" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#f0b429" stopOpacity={0.05} />
            <Stop offset="1" stopColor="#f0b429" stopOpacity={0.3} />
          </LinearGradient>
        </Defs>

        <Path d={area} fill={`${themeColor}14`} />

        {/* Highlight for the unshaded regions, so every zone lights up. */}
        {zoneKey === 'under' && geom.ratedLoKg != null ? (
          <Rect x={X0} y={0} width={Math.max(0, xOf(geom.ratedLoKg) - X0)} height={BASE_Y} fill="#8e8e93" opacity={0.07} />
        ) : null}
        {zoneKey === 'ok' ? (
          <Rect
            x={geom.stretchKg != null ? xOf(geom.stretchKg) : X0}
            y={0}
            width={Math.max(0, okX - (geom.stretchKg != null ? xOf(geom.stretchKg) : X0))}
            height={BASE_Y}
            fill={themeColor}
            opacity={0.09}
          />
        ) : null}
        {zoneKey === 'beyond' ? (
          <Rect x={edgeX} y={0} width={Math.max(0, X1 - edgeX)} height={BASE_Y} fill="#f87171" opacity={0.1} />
        ) : null}

        {ratedSlice ? (
          <Path d={ratedSlice} fill="#f5d565" opacity={zoneKey === 'rated' ? 0.44 : 0.22} />
        ) : null}
        {stretchSlice ? (
          <Path d={stretchSlice} fill="#f5d565" opacity={zoneKey === 'stretch' ? 0.2 : 0.08} />
        ) : null}

        {/* The ceiling: a zone that fades out, not a wall. */}
        <Rect
          x={okX}
          y={0}
          width={Math.max(0, edgeX - okX)}
          height={BASE_Y}
          fill={zoneKey === 'grey' ? 'url(#fcCeilingOn)' : 'url(#fcCeiling)'}
        />
        <Path d={`M ${okX} 6 L ${okX} ${BASE_Y}`} stroke="#52525b" strokeWidth={1} strokeDasharray="2 4" />
        <Path d={`M ${edgeX} 6 L ${edgeX} ${BASE_Y}`} stroke="#6b6b70" strokeWidth={1} strokeDasharray="2 4" />

        <Path d={line} fill="none" stroke={themeColor} strokeWidth={2} strokeLinecap="round" opacity={0.9} />

        <Path d={`M ${pinX} 10 L ${pinX} ${BASE_Y}`} stroke={themeColor} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={pinX} cy={pinY} r={8} fill={`${themeColor}30`} />
        <Circle cx={pinX} cy={pinY} r={4.5} fill={themeColor} />

        {showRatedLabel ? (
          <SvgText
            x={ratedLabelX}
            y={100}
            fontSize={9.5}
            fill={zoneKey === 'rated' ? '#f5d565' : '#8a7c4e'}
            textAnchor="middle"
            onPress={() => onLandmarkPress?.('rated')}
          >
            Rated best
          </SvgText>
        ) : null}

        <SvgText
          x={Math.min(288, Math.max(70, edgeX))}
          y={100}
          fontSize={9.5}
          fill={zoneKey === 'grey' || zoneKey === 'beyond' ? '#f0b429' : '#8e8e93'}
          textAnchor="middle"
          onPress={() => onLandmarkPress?.('ceiling')}
        >
          Estimated ceiling
        </SvgText>
      </Svg>
    </View>
  );
}

/** Lean mass a goal implies, for callers that need it alongside the gauge. */
export const goalLeanMass = (goalWeightKg: number, goalBodyFatPct: number) =>
  leanMassKg(goalWeightKg, goalBodyFatPct);

const styles = StyleSheet.create({
  gaugeFallback: {
    fontSize: 12.5,
    lineHeight: 19,
    color: '#71717a',
    paddingVertical: 18,
    paddingHorizontal: 4,
  },
});