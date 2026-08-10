// src/components/route/ScaleRuler.tsx
//
// The horizontal scale used by the weight and height beats. Replaces the
// earlier WeightRuler, which hardcoded kilograms.
//
// WHY A RULER AND NOT A SLIDER. A slider maps the whole legal range onto one
// track width, so at 35 to 200 kg a single pixel is worth about half a kilo
// and nobody can land on a specific number. The ruler instead moves the SCALE
// under a fixed needle at a constant pixels-per-unit, which makes a fine step
// reachable anywhere in the range and gives the drag a physical feel.
//
// EVERYTHING IS IN DISPLAY UNITS. This component knows nothing about kilograms
// or centimetres: the caller converts, passes a value, a step and a label
// formatter, and converts back. That is what lets the same component count
// kilos, pounds, centimetres, or inches with a foot marked every twelve.
//
// FLINGING. Release with enough velocity and the scale keeps travelling, with
// friction, until it slows to a stop or hits an end. Touching down catches it
// mid-glide, like a finger on a record. The loop runs off refs and
// requestAnimationFrame, so it never waits on a render.
//
// THE PANRESPONDER IS CREATED EXACTLY ONCE. An earlier version rebuilt it in a
// useMemo keyed on onChange, and onChange is a fresh closure on every parent
// render, so the responder was replaced mid-gesture and the drag died after a
// single frame. Everything the gesture reads now lives behind refs.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import { hapticEdge, hapticTick } from '../../utils/hapticTick';
import Svg, {
  Line,
  Rect,
  Path,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

// Taller than the first version to make room for a range label above the
// ticks, which is what lets the goal scale mark its rated band in place.
const HEIGHT = 88;
const RANGE_LABEL_Y = 10;
const TICK_TOP = 24;
const LABEL_Y = 68;

/** Below this a throw counts as a release rather than a fling. */
const FLING_MIN_VX = 0.15;
/** Per frame velocity retained. Lower stops sooner. */
const FRICTION = 0.94;
const FLING_END_VX = 0.02;
const FRAME_MS = 16;

interface Props {
  /** In display units, whatever the caller is counting. */
  value: number;
  min: number;
  max: number;
  /** Smallest increment the scale reports. */
  step: number;
  /** Spacing between drawn ticks. Defaults to step. Kept separate because a
   *  0.1 kg reporting step would draw a tick every 1.3 points. */
  tickStep?: number;
  /** Points of travel per one display unit. Sets how fine the drag feels. */
  pxPerUnit: number;
  /** Which ticks get a full-height mark and a printed label. */
  isMajor: (v: number) => boolean;
  formatLabel: (v: number) => string;
  /** committed is false while moving, true once it settles. */
  onChange: (next: number, committed: boolean) => void;
  themeColor: string;
  /** Whatever sits behind the ruler, so the ends fade into it. */
  backgroundColor?: string;
  /** How often a detent fires, in display units. One per kilo, pound,
   *  centimetre or inch by default. Firing on the reporting step instead would
   *  mean ten taps per kilogram. */
  hapticStep?: number;
  /** Colour per tick. Lets the scale carry zones in its own marks rather than
   *  needing a separate coloured bar underneath it. */
  tickColor?: (v: number, isMajor: boolean) => string;
  /** One labelled span drawn above the ticks, clipped to what is on screen.
   *  Used for the researched band on the goal scale. */
  rangeLabel?: { from: number; to: number; text: string; colour: string };
}

export default function ScaleRuler({
  value,
  min,
  max,
  step,
  tickStep,
  pxPerUnit,
  isMajor,
  formatLabel,
  onChange,
  themeColor,
  backgroundColor = '#0a0a0b',
  hapticStep = 1,
  tickColor,
  rangeLabel,
}: Props) {
  const [width, setWidth] = useState(0);

  const cb = useRef(onChange);
  cb.current = onChange;
  const cfg = useRef({ min, max, step, pxPerUnit });
  cfg.current = { min, max, step, pxPerUnit };
  const latest = useRef(value);
  latest.current = value;
  const startValue = useRef(value);

  const quantise = (raw: number) => {
    const { min: lo, max: hi, step: st } = cfg.current;
    const snapped = Math.round(raw / st) * st;
    // Re-round to kill floating point dust from the division.
    return Math.min(hi, Math.max(lo, Math.round(snapped * 1000) / 1000));
  };

  // Which detent we last buzzed on, so a tick fires once per crossing rather
  // than once per reported change.
  const lastDetent = useRef(Math.round(value / hapticStep));
  const detent = (v: number) => {
    const d = Math.round(v / hapticStep);
    if (d !== lastDetent.current) {
      lastDetent.current = d;
      hapticTick();
    }
  };

  const glide = useRef<number | null>(null);
  const stopGlide = () => {
    if (glide.current != null) {
      cancelAnimationFrame(glide.current);
      glide.current = null;
    }
  };

  const startGlide = (vx: number) => {
    let v = vx;
    const step2 = () => {
      v *= FRICTION;
      // Dragging right lowers the number, so a rightward throw keeps lowering it.
      const next = quantise(latest.current - (v * FRAME_MS) / cfg.current.pxPerUnit);
      const atEdge = next === cfg.current.min || next === cfg.current.max;
      if (next !== latest.current) {
        latest.current = next;
        detent(next);
        cb.current(next, false);
      }
      if (Math.abs(v) < FLING_END_VX || atEdge) {
        glide.current = null;
        if (atEdge) hapticEdge();
        cb.current(latest.current, true);
        return;
      }
      glide.current = requestAnimationFrame(step2);
    };
    glide.current = requestAnimationFrame(step2);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      // Stop the parent ScrollView taking the gesture partway through.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,

      onPanResponderGrant: () => {
        stopGlide();
        startValue.current = latest.current;
      },
      onPanResponderMove: (_e, g) => {
        const next = quantise(startValue.current - g.dx / cfg.current.pxPerUnit);
        if (next !== latest.current) {
          const wasEdge = latest.current === cfg.current.min || latest.current === cfg.current.max;
          latest.current = next;
          const isEdge = next === cfg.current.min || next === cfg.current.max;
          if (isEdge && !wasEdge) hapticEdge();
          else detent(next);
          cb.current(next, false);
        }
      },
      onPanResponderRelease: (_e, g) => {
        if (Math.abs(g.vx) > FLING_MIN_VX) startGlide(g.vx);
        else cb.current(latest.current, true);
      },
      onPanResponderTerminate: () => {
        stopGlide();
        cb.current(latest.current, true);
      },
    }),
  ).current;

  useEffect(() => stopGlide, []);

  const centre = width / 2;

  const ticks = useMemo(() => {
    if (!width) return [];
    const ts = tickStep ?? step;
    const span = centre / pxPerUnit;
    const first = Math.floor((value - span) / ts) * ts;
    const last = Math.ceil((value + span) / ts) * ts;
    const out: Array<{ x: number; h: number; colour: string; opacity: number; w: number; label?: string }> = [];

    for (let v = first; v <= last; v += ts) {
      const rounded = Math.round(v * 1000) / 1000;
      if (rounded < min || rounded > max) continue;
      const major = isMajor(rounded);
      const whole = Math.abs(rounded - Math.round(rounded)) < 0.001;
      out.push({
        x: centre + (rounded - value) * pxPerUnit,
        h: major ? 26 : whole ? 16 : 9,
        colour: tickColor
          ? tickColor(rounded, major)
          : major
            ? '#7a7a82'
            : whole
              ? '#3f3f46'
              : '#2c2c31',
        // Zone tinted ticks need the minor ones held back or the colour reads
        // as a solid block instead of a scale.
        opacity: tickColor ? (major ? 0.95 : 0.42) : 1,
        w: major ? 1.6 : 1,
        label: major ? formatLabel(rounded) : undefined,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, centre, value, min, max, step, tickStep, pxPerUnit, tickColor]);

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="adjustable"
      accessibilityValue={{ text: formatLabel(value) }}
      {...pan.panHandlers}
    >
      {width > 0 ? (
        <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} pointerEvents="none">
          <Defs>
            <LinearGradient id="srFade" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={backgroundColor} stopOpacity={1} />
              <Stop offset="0.17" stopColor={backgroundColor} stopOpacity={0} />
              <Stop offset="0.83" stopColor={backgroundColor} stopOpacity={0} />
              <Stop offset="1" stopColor={backgroundColor} stopOpacity={1} />
            </LinearGradient>
          </Defs>

          {ticks.map((t, i) => (
            <React.Fragment key={i}>
              <Line
                x1={t.x}
                y1={TICK_TOP}
                x2={t.x}
                y2={TICK_TOP + t.h}
                stroke={t.colour}
                strokeOpacity={t.opacity}
                strokeWidth={t.w}
                strokeLinecap="round"
              />
              {t.label ? (
                <SvgText
                  x={t.x}
                  y={LABEL_Y}
                  fontSize={11}
                  fill={tickColor ? t.colour : '#5b5b62'}
                  fillOpacity={tickColor ? 0.75 : 1}
                  textAnchor="middle"
                >
                  {t.label}
                </SvgText>
              ) : null}
            </React.Fragment>
          ))}

          {/* Centred on whatever part of the range is on screen, so it stays
              readable as the scale slides past it. */}
          {rangeLabel && width > 0
            ? (() => {
                const x0 = centre + (rangeLabel.from - value) * pxPerUnit;
                const x1 = centre + (rangeLabel.to - value) * pxPerUnit;
                const visibleFrom = Math.max(x0, 12);
                const visibleTo = Math.min(x1, width - 12);
                if (visibleTo - visibleFrom < 40) return null;
                return (
                  <SvgText
                    x={(visibleFrom + visibleTo) / 2}
                    y={RANGE_LABEL_Y}
                    fontSize={9}
                    fontWeight="700"
                    fill={rangeLabel.colour}
                    textAnchor="middle"
                  >
                    {rangeLabel.text}
                  </SvgText>
                );
              })()
            : null}

          {/* Fade above the ticks so they dissolve at the edges rather than
              being clipped, which would read as a broken scale. */}
          <Rect x={0} y={0} width={width} height={HEIGHT} fill="url(#srFade)" />

          {/* Needle last: it must never be dimmed by the fade. */}
          <Path
            d={`M ${centre - 5} ${TICK_TOP - 6} L ${centre + 5} ${TICK_TOP - 6} L ${centre} ${TICK_TOP + 1} Z`}
            fill={themeColor}
          />
          <Line
            x1={centre}
            y1={TICK_TOP - 6}
            x2={centre}
            y2={HEIGHT - 26}
            stroke={themeColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Taller than the artwork: the scale is 74pt of drawing, but a finger needs
  // more than that to grab comfortably.
  wrap: { height: HEIGHT + 26, justifyContent: 'center' },
});