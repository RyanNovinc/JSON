// src/utils/hapticTick.ts
//
// Detent feedback for the route screen's draggable instruments.
//
// WHY THROTTLED. A hard fling on the weight scale crosses a whole kilogram
// every few frames, which is fast enough that the taps stop reading as
// separate detents and start reading as a buzz. Twenty odd milliseconds is
// roughly where they stay distinct.
//
// The throttle is module level on purpose: only one instrument can be under a
// finger at a time, so a shared clock is the correct model, and it also keeps
// a glide on one control from stacking with anything else.
//
// Everything is fire and forget. Haptics are unavailable on simulators and on
// some Android hardware, and a missing buzz is never worth an unhandled
// rejection.

import * as Haptics from 'expo-haptics';

let lastTickAt = 0;

/** One detent. Call whenever the reported value crosses a step. */
export function hapticTick(minGapMs = 24): void {
  const now = Date.now();
  if (now - lastTickAt < minGapMs) return;
  lastTickAt = now;
  Haptics.selectionAsync().catch(() => {});
}

/** Heavier than a detent: the scale has run into the end of its range. */
export function hapticEdge(): void {
  lastTickAt = Date.now();
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}