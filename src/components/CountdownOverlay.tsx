/**
 * CountdownOverlay.tsx
 *
 * The large on-screen 3-2-1-0 that runs alongside the rest timer's audio alert.
 *
 * The phone is usually on the floor during a set, so the last three seconds of a rest
 * need to be readable from two metres away without picking it up. Size alone does not
 * achieve that — peripheral vision resolves MOTION far better than detail — so each
 * number arrives with a scale-and-fade pulse rather than simply appearing.
 *
 * ── WHY THIS OWNS ITS OWN CLOCK ─────────────────────────────────────────────
 *
 * It does NOT read timer.timeElapsed. That value is written by TimerContext's 1s
 * interval, which ticks every 1000ms from whenever it happened to be created, with no
 * relationship to the second boundary. Driving a big visible number off it would show
 * "1" up to a full second after the countdown was actually at 1, and the mismatch
 * against the audio alert would be the most obvious thing on the screen.
 *
 * Instead everything derives from one value, the same one scheduleCountdownAlert uses:
 *
 *   endTime = startTime.getTime() + targetTime * 1000
 *
 * startTime is shifted forward by the pause duration in resumeTimer, so that expression
 * is correct at any moment, including after pause/resume and after rehydration.
 * Deliberately NOT fixedEndTime: that is written once in startTimer and never updated by
 * addTime, subtractTime or resumeTimer, so it goes stale the first time someone taps
 * ±30s.
 *
 * Because the sound and this overlay are both pure functions of endTime, they stay in
 * step without anything synchronising them. Nothing here talks to the audio path and
 * nothing in the audio path talks to this. That is the whole design.
 *
 * ── WHY IT IS IDLE UNTIL IT IS NEEDED ───────────────────────────────────────
 *
 * A 100ms interval running for the whole of a three minute rest would be 1800 pointless
 * wakeups. So the effect schedules a single timeout to the moment the window opens
 * (endTime - LEAD_MS), starts ticking only then, and stops itself once the zero has been
 * held. A rest costs one timeout until its final three seconds.
 *
 * ── TOUCHES PASS THROUGH ────────────────────────────────────────────────────
 *
 * pointerEvents="none" is not optional. This covers the entire screen including Finish
 * workout and the set checkboxes, and a rest ending is exactly when someone is reaching
 * for the next set. It must never eat a tap.
 */

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Animated, Easing, Dimensions } from 'react-native';
// COUNTDOWN_ALERT_LEAD_MS is IMPORTED, never redeclared. It is a property of
// json_fit_timer_v3.wav — a fixed ~3s asset with beeps laid out at 3/2/1/0 — so the
// numbers on screen and the beeps in the speaker are counting the same four seconds by
// construction rather than by two files happening to agree on 3000. A local copy here
// would be exactly the drift trap that COUNTDOWN_LEAD_SECONDS already fell into once.
import { useTimer, COUNTDOWN_ALERT_LEAD_MS } from '../contexts/TimerContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

const LEAD_MS = COUNTDOWN_ALERT_LEAD_MS;

/**
 * How long "0" stays up after the countdown reaches zero. The asset beeps at 0, so the
 * number has to still be there when that beep lands; vanishing on the stroke of zero
 * would leave the final beep pointing at nothing. Long enough to read, short enough that
 * it is gone before anyone starts their next set.
 */
const ZERO_HOLD_MS = 700;

/** Tick rate while the overlay is up. Fine enough that the number never lands late. */
const TICK_MS = 100;

/**
 * Rests shorter than this never get an overlay.
 *
 * This exists for supersets, which start a hardcoded 5s transition timer. Without a
 * floor, moving between two paired exercises would blank the whole screen with a giant
 * countdown for four of those five seconds, every single time. At 10s the overlay covers
 * roughly the last third of the shortest rest it appears on, which reads as a warning
 * rather than as the screen taking over.
 *
 * Raise it if short rests still feel interrupted; lower it if you want the superset
 * transition counted too.
 */
const MIN_REST_SECONDS = 10;

export interface CountdownOverlayProps {
  /** Accent colour, matching the rest of the screen. */
  themeColor?: string;
  /**
   * Call-site override. The USER's switch is timerSettings.visualCountdown, read from the
   * context below; this is for a screen that wants the overlay suppressed regardless of
   * the setting. Both must be true for anything to render or schedule.
   */
  enabled?: boolean;
  /** Override for MIN_REST_SECONDS. */
  minRestSeconds?: number;
}

export default function CountdownOverlay({
  themeColor = '#22d3ee',
  enabled = true,
  minRestSeconds = MIN_REST_SECONDS,
}: CountdownOverlayProps) {
  const { timer, timerSettings } = useTimer();

  /** The number currently on screen, or null when the overlay is closed. */
  const [num, setNum] = useState<number | null>(null);
  /** Kept true through the fade-out, so the exit animation has something to animate. */
  const [mounted, setMounted] = useState(false);

  const scrim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  // Defensive `new Date(...)`: a timer restored from AsyncStorage is re-hydrated into a
  // Date by loadPersistedState, but this costs nothing and survives a raw string.
  const startMs = timer?.startTime ? new Date(timer.startTime).getTime() : null;
  const targetTime = timer?.targetTime ?? 0;

  // A finished countdown still counts: isRunning goes false the moment it hits zero, but
  // the zero itself has to stay up for ZERO_HOLD_MS. TimerContext preserves startTime and
  // targetTime in the finished state, so endTime is still computable there.
  const eligible = !!(
    enabled &&
    // The user's switch. Turning it off leaves the sound and the vibration untouched —
    // they are scheduled in TimerContext and know nothing about this component.
    timerSettings.visualCountdown &&
    timer &&
    !timer.isCountUp &&
    !timer.isPaused &&
    (timer.isRunning || timer.isFinished) &&
    startMs !== null &&
    targetTime >= minRestSeconds
  );

  const endTime = eligible && startMs !== null ? startMs + targetTime * 1000 : null;

  // ── The clock ────────────────────────────────────────────────────────────
  // Keyed on the values that DEFINE the deadline and deliberately not on timeElapsed:
  // including it would tear this down and rebuild it every second, which is both wasteful
  // and a way to reintroduce the drift the whole component exists to avoid.
  useEffect(() => {
    if (endTime === null) {
      setNum(null);
      return;
    }

    let openTimeout: ReturnType<typeof setTimeout> | null = null;
    let tick: ReturnType<typeof setInterval> | null = null;

    const read = () => {
      const remaining = endTime - Date.now();

      // Past zero and past the hold: close, and stop ticking. Nothing re-opens it, because
      // endTime only moves when the deps above change, which rebuilds this effect anyway.
      if (remaining <= -ZERO_HOLD_MS) {
        setNum(null);
        if (tick) {
          clearInterval(tick);
          tick = null;
        }
        return;
      }

      // Clamped at LEAD/1000 so a timer that fires a few ms early cannot flash a "4".
      setNum(remaining > 0 ? Math.min(LEAD_MS / 1000, Math.ceil(remaining / 1000)) : 0);
    };

    const begin = () => {
      read();
      tick = setInterval(read, TICK_MS);
    };

    const untilWindow = endTime - LEAD_MS - Date.now();
    if (untilWindow > 0) {
      // Clear before scheduling. This effect re-runs whenever the deadline MOVES, and a
      // deadline can move forward while the overlay is already up: tapping +30s at "2", or
      // switching pace mid-rest to a longer one (retargetLiveRest keeps startTime and only
      // raises targetTime). Without this the overlay would freeze on a stale number for the
      // whole of the extended rest, then re-open on top of itself.
      setNum(null);
      openTimeout = setTimeout(begin, untilWindow);
    } else {
      // Already inside the window: a rest restored mid-countdown, or ±time landing the
      // deadline in here. Open straight away rather than waiting for the next change.
      begin();
    }

    return () => {
      if (openTimeout) clearTimeout(openTimeout);
      if (tick) clearInterval(tick);
    };
  }, [endTime]);

  // ── The pulse ────────────────────────────────────────────────────────────
  // Restarted on every change of number, so each one arrives rather than appears. Native
  // driver: transform and opacity only, so it runs on the UI thread and a busy JS thread
  // cannot stutter it.
  useEffect(() => {
    if (num === null) return;
    pulse.setValue(0);
    Animated.timing(pulse, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [num, pulse]);

  // ── The scrim ────────────────────────────────────────────────────────────
  const open = num !== null;
  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.timing(scrim, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(scrim, {
      toValue: 0,
      duration: 260,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => {
      // Only unmount on a completed fade. A cancelled one means a new countdown grabbed
      // the value mid-exit, and unmounting there would blink the incoming number away.
      if (finished) setMounted(false);
    });
  }, [open, scrim]);

  if (!mounted) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.root, { opacity: scrim }]}>
      <Animated.Text
        // Never scales with the OS font size setting. Every other number on this screen
        // does, but this one is already sized off the screen width and a large accessibility
        // multiplier would push it past both edges.
        allowFontScaling={false}
        style={[
          styles.num,
          {
            color: themeColor,
            opacity: pulse.interpolate({
              inputRange: [0, 0.45, 1],
              outputRange: [0, 1, 1],
            }),
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.28, 1],
                }),
              },
            ],
          },
        ]}
      >
        {num ?? 0}
      </Animated.Text>
    </Animated.View>
  );
}

const NUM_SIZE = Math.round(Math.min(SCREEN_WIDTH * 0.52, 220));

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    // Above the bottom bar (no z-index) and the keyboard accessory (400), below nothing
    // else on this screen. elevation is the Android half of the same statement.
    zIndex: 500,
    elevation: 500,
  },
  num: {
    fontSize: NUM_SIZE,
    // Explicit, and larger than the font size: digits in DM Mono have descender clearance
    // that an implicit line box will clip at this scale.
    lineHeight: Math.round(NUM_SIZE * 1.12),
    fontFamily: 'DMMono-Medium',
    letterSpacing: -Math.round(NUM_SIZE * 0.04),
    textAlign: 'center',
    includeFontPadding: false,
  },
});