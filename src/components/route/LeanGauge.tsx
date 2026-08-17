// src/components/route/LeanGauge.tsx
//
// The goal leanness instrument. Replaces FrameCurve, which drew the same
// distribution over goal WEIGHT.
//
// WHY IT MOVED. The goal beats now ask for weight first and leanness second,
// because "I want to be 90 kg" is a thought people actually have and "I want to
// be 12%" mostly is not. Once the weight is fixed, leanness is what sets the
// muscle: 90 kg at 12% is 79 kg of lean mass and 90 kg at 20% is 72, which is
// the difference between past the drug-free ceiling and comfortably inside it.
// So the distribution, and the verdict that reads off it, belong here.
//
// THE CEILING INVERTS. On the old weight gauge, getting heavier eventually
// became implausible. Here, at a fixed weight, getting LEANER is what becomes
// implausible, because the same scale weight with less fat means more muscle.
// The shaded, faded region is therefore on the left.
//
// THE CURVE IS ILLUSTRATIVE, as it always was: no y axis, no numbers beyond
// the landmarks. It peaks at the midpoint between an untrained frame and the
// reachable limit, so its shape says "ordinary here, unusual at the edges" and
// nothing more precise than that.
//
// The rated band renders for male and unknown sex only, matching the guard
// everywhere else: the literature behind it is male body composition.

import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Line,
  Circle,
  Rect,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useSliderDrag } from './GoalInstruments';
import { hapticTick } from '../../utils/hapticTick';
import type { GoalsProfile } from '../../utils/goalsProfile';
import {
  ffmiLimitsFor,
  ffmiNormalised,
  leanMassKg,
  FFMI_UNTRAINED,
} from '../../utils/roadmap';
import { ATTRACTIVE_BF_RANGE } from '../../utils/attractivenessTargets';

const VB = { W: 320, H: 150, X0: 20, X1: 300, Y0: 16, YB: 110 } as const;
/** Body fat range the gauge spans, before the female shift. */
const BF_MIN = 6;
const BF_MAX = 30;

interface Props {
  profile: GoalsProfile;
  goalWeightKg: number;
  goalBodyFatPct: number;
  themeColor: string;
  onChange: (bodyFatPct: number, persist: boolean) => void;
}

export default function LeanGauge({
  profile,
  goalWeightKg,
  goalBodyFatPct,
  themeColor,
  onChange,
}: Props) {
  const { X0, X1, Y0, YB, W, H } = VB;
  const heightCm = profile.heightCm;
  const female = profile.sex === 'female';
  const shift = female ? 9 : 0;
  const lo = BF_MIN + shift;
  const hi = BF_MAX + shift;

  const geom = useMemo(() => {
    if (heightCm == null) return null;
    const sexKey = female ? 'female' : 'male';
    const limits = ffmiLimitsFor(profile.sex);
    // Peak halfway between untrained and the reachable limit. The shape only
    // has to say "ordinary here, unusual at the edges".
    const peak = (FFMI_UNTRAINED[sexKey] + limits.ok) / 2;
    const sigma = Math.max(1, (limits.ok - FFMI_UNTRAINED[sexKey]) / 2.6);
    return { limits, peak, sigma };
  }, [heightCm, female, profile.sex]);

  const xOf = (bf: number) =>
    X0 + Math.min(1, Math.max(0, (bf - lo) / (hi - lo))) * (X1 - X0);

  const nAt = (bf: number) =>
    heightCm == null ? 0 : ffmiNormalised(leanMassKg(goalWeightKg, bf), heightCm);

  const yAt = (bf: number) => {
    if (!geom) return YB;
    const z = (nAt(bf) - geom.peak) / geom.sigma;
    return YB - (YB - Y0) * Math.exp(-0.5 * z * z);
  };

  const last = useRef(goalBodyFatPct);
  const [live, setLive] = useState<number | null>(null);
  const drag = useSliderDrag((t, phase) => {
    if (phase === 'release') {
      setLive(null);
      onChange(last.current, true);
      return;
    }
    // t is a fraction of the whole view, but the plot only spans X0 to X1
    // inside the viewBox. Mapping t straight onto the value range meant the pin
    // landed right of the finger by the width of the left inset.
    const plotT = ((t * W - X0) / (X1 - X0));
    const raw = lo + Math.min(1, Math.max(0, plotT)) * (hi - lo);
    setLive(Math.min(hi, Math.max(lo, raw)));
    const next = Math.min(hi, Math.max(lo, Math.round(raw)));
    if (next !== last.current) {
      last.current = next;
      hapticTick();
      onChange(next, false);
    }
  });

  if (!geom || heightCm == null) {
    return (
      <Text style={styles.fallback}>
        Add your height in Goals and stats and this becomes a map of what your frame supports.
      </Text>
    );
  }

  const curve = (() => {
    let d = '';
    for (let i = 0; i <= 90; i++) {
      const bf = lo + ((hi - lo) * i) / 90;
      d += `${i ? ' L' : 'M'} ${xOf(bf).toFixed(1)} ${yAt(bf).toFixed(1)}`;
    }
    return d;
  })();

  // Always drawn, wherever the pin is. It is a fixed body fat range on a body
  // fat axis, so unlike the old weight gauge it never moves and there is
  // nothing to gate it on. Gating it meant the band you are trying to reach
  // disappeared the moment you were not already in it.
  const showRated = !female;
  const ratedSlice = showRated
    ? (() => {
        let d = '';
        for (let i = 0; i <= 30; i++) {
          const bf = ATTRACTIVE_BF_RANGE[0] + ((ATTRACTIVE_BF_RANGE[1] - ATTRACTIVE_BF_RANGE[0]) * i) / 30;
          d += `${i ? ' L' : 'M'} ${xOf(bf).toFixed(1)} ${yAt(bf).toFixed(1)}`;
        }
        return `${d} L ${xOf(ATTRACTIVE_BF_RANGE[1]).toFixed(1)} ${YB} L ${xOf(ATTRACTIVE_BF_RANGE[0]).toFixed(1)} ${YB} Z`;
      })()
    : null;

  // The leanest body fat this weight can be carried at before the muscle it
  // implies passes the outer edge of what has been recorded drug free.
  const edgeBf = (() => {
    for (let bf = lo; bf <= hi; bf += 0.1) {
      if (nAt(bf) <= geom.limits.edge) return bf;
    }
    return null;
  })();

  const pinBf = live ?? goalBodyFatPct;

  return (
    <View onLayout={drag.onLayout} {...drag.panHandlers}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          {/* Fades toward the lean end, which is the impossible one here. */}
          <LinearGradient id="lgBeyond" x1="1" y1="0" x2="0" y2="0">
            <Stop offset="0" stopColor="#0a0a0b" stopOpacity={0} />
            <Stop offset="1" stopColor="#0a0a0b" stopOpacity={0.72} />
          </LinearGradient>
        </Defs>

        {/* One flat fill under the curve. Stacking translucent layers is what
            turned the old gauge muddy. */}
        <Path d={`${curve} L ${X1} ${YB} L ${X0} ${YB} Z`} fill="#ffffff" opacity={0.035} />
        {ratedSlice ? <Path d={ratedSlice} fill={themeColor} opacity={0.22} /> : null}
        <Path d={curve} fill="none" stroke="#4b4b52" strokeWidth={1.8} strokeLinecap="round" />
        <Line x1={X0} y1={YB} x2={X1} y2={YB} stroke="#232327" strokeWidth={1} />

        {edgeBf != null && edgeBf > lo + 0.2 ? (
          <>
            <Rect x={X0} y={Y0} width={Math.max(0, xOf(edgeBf) - X0)} height={YB - Y0} fill="url(#lgBeyond)" />
            <Line
              x1={xOf(edgeBf)}
              y1={Y0 - 4}
              x2={xOf(edgeBf)}
              y2={YB}
              stroke="#52525b"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <SvgText
              x={Math.max(X0 + 46, xOf(edgeBf) - 46)}
              y={YB + 17}
              fontSize={9.5}
              fill="#6b6b70"
              textAnchor="middle"
            >
              Past the ceiling
            </SvgText>
          </>
        ) : null}

        {showRated ? (
          <SvgText
            x={(xOf(ATTRACTIVE_BF_RANGE[0]) + xOf(ATTRACTIVE_BF_RANGE[1])) / 2}
            y={YB + 17}
            fontSize={9.5}
            fill={themeColor}
            textAnchor="middle"
          >
            Most aesthetic
          </SvgText>
        ) : null}

        <Line
          x1={xOf(pinBf)}
          y1={Y0 - 6}
          x2={xOf(pinBf)}
          y2={YB}
          stroke={themeColor}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <Circle cx={xOf(pinBf)} cy={yAt(pinBf)} r={5.5} fill={themeColor} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    fontSize: 12.5,
    lineHeight: 19,
    color: '#71717a',
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
});