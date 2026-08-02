/**
 * useRestTimerDisplay.ts
 *
 * What the rest timer badge should say, including the overtime counter that keeps
 * running once the countdown reaches zero.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 *
 * The old display did `Math.max(0, targetTime - timeElapsed)` and froze on a dead
 * "0:00". The keyboard accessory bar even had a guard specifically to hide that
 * corpse, because a stopped clock reading zero is noise. Rest overrun is completely
 * normal — plates, a queue for the rack, someone talking to you — and how long you
 * actually rested is real training information the app was throwing away.
 *
 * ── WHY IT DERIVES FROM A DEADLINE, NOT FROM timeElapsed ────────────────────
 *
 * timeElapsed is driven to exactly targetTime when a countdown finishes and then never
 * moves again, because TimerContext stops its interval at that moment. Anything reading
 * it can only ever report zero remaining.
 *
 * But the finished state deliberately PRESERVES startTime and targetTime (see the
 * four-state doc on TimerState), so the deadline survives:
 *
 *   endTime = startTime.getTime() + targetTime * 1000
 *
 * and overtime is just `Date.now() - endTime`. Nothing about the timer's state machine
 * needs to change to support this, and no AsyncStorage writes happen while it counts,
 * because the interval that would trigger them is already stopped. The overtime counter
 * is very nearly free.
 *
 * Deliberately not fixedEndTime: that is written once in startTimer and never updated by
 * addTime, subtractTime, resumeTimer or retargetLiveRest, so it goes stale.
 *
 * ── WHY IT CARRIES ITS OWN TICKER ───────────────────────────────────────────
 *
 * While a countdown is running, TimerContext's interval updates timeElapsed every second
 * and every consumer re-renders for free. Once it finishes, that interval stops — so
 * without a local ticker the overtime number would be computed once and then sit there.
 * The ticker runs ONLY during overtime, and stops itself at the cap, where the displayed
 * value has nothing left to change.
 */

import { useEffect, useState } from 'react';
import { useTimer } from '../contexts/TimerContext';

/**
 * Where the overtime counter stops counting.
 *
 * Past a few minutes the number stops being information about a rest and starts being
 * information about someone putting their phone down. "+18:42" tells you nothing that
 * "+3:00" did not, and it makes a small badge wide. The display freezes here rather than
 * disappearing, because "at least three minutes over" is still true and still useful.
 */
const OVERTIME_CAP_MS = 180 * 1000;

export interface RestTimerDisplay {
  /** Ready to render: "1:23" while resting, "+0:14" once past zero. */
  text: string;
  /** True once the rest has run past its deadline. Drives the colour change. */
  isOvertime: boolean;
  /**
   * Whether there is anything worth showing at all. False for no timer and for an idle
   * one that has never been started — the two cases that used to render a stranded
   * "0:00". True throughout overtime, which is the whole point.
   *
   * The bottom bar renders its badge unconditionally and can ignore this; the keyboard
   * accessory uses it in place of its old isRunning/isPaused guard.
   */
  visible: boolean;
}

function mmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function useRestTimerDisplay(): RestTimerDisplay {
  const { timer } = useTimer();

  // Defensive `new Date(...)`: loadPersistedState re-hydrates this into a Date, but this
  // costs nothing and survives a raw string.
  const startMs = timer?.startTime ? new Date(timer.startTime).getTime() : null;

  const endTime =
    timer && !timer.isCountUp && startMs !== null && timer.targetTime > 0
      ? startMs + timer.targetTime * 1000
      : null;

  // isFinished is the explicit signal, read from the flag rather than inferred from
  // `timeElapsed >= targetTime`. An idle timer satisfies that arithmetic too and is a
  // different state entirely: it represents a rest that never ran, not one that overran.
  const overtimeActive = !!(timer && !timer.isCountUp && timer.isFinished && endTime !== null);

  // Ticks only during overtime, and stops itself once the value is pinned at the cap.
  // The state is write-only; the re-render IS the product.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!overtimeActive || endTime === null) return;

    const id = setInterval(() => {
      setTick((t) => t + 1);
      // One tick past the cap, then stop: the render triggered above is what paints the
      // final clamped value, so clearing before it would freeze the display a second early.
      if (Date.now() - endTime >= OVERTIME_CAP_MS) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [overtimeActive, endTime]);

  if (!timer) {
    return { text: '0:00', isOvertime: false, visible: false };
  }

  if (timer.isCountUp) {
    // Count-up has no deadline to overrun, so it can never be overtime.
    return {
      text: mmss(timer.timeElapsed),
      isOvertime: false,
      visible: timer.isRunning || timer.isPaused,
    };
  }

  if (overtimeActive && endTime !== null) {
    const overMs = Math.min(Date.now() - endTime, OVERTIME_CAP_MS);
    return {
      text: `+${mmss(Math.max(0, Math.floor(overMs / 1000)))}`,
      isOvertime: true,
      visible: true,
    };
  }

  const remaining = Math.max(0, timer.targetTime - timer.timeElapsed);
  return {
    text: mmss(remaining),
    isOvertime: false,
    visible: timer.isRunning || timer.isPaused,
  };
}