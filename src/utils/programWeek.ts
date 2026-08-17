// src/utils/programWeek.ts
//
// WHERE THE USER IS IN A BLOCK — one answer, shared.
//
// This logic was written inside DaysScreen and lived there alone. That file
// carries a comment recording what happened the first time it was split up:
// `loadCurrentWeek` read `currentWeek_<block>` and had ZERO CALLERS, so the
// saved week never took effect and every fresh mount snapped the view back to
// week 1. The logic being in a screen is what let that happen unnoticed.
//
// It is extracted here because a second consumer now needs the same answer
// without mounting a screen: the phase modifier has to know which weeks are
// still ahead of the user before it may touch them.
//
// RESOLUTION ORDER, unchanged from the screen it came from:
//
//   Take the LATER of "the week you last stood on" and "the first week you
//   have not finished", capped at the block's length.
//
// Each clause earns its place. Taking the later of the two respects a user who
// browsed ahead, which was the snap-back bug. It still auto-advances someone
// whose saved week is fully finished. And the cap stops a stale save from a
// since-shortened block pointing past the end.
//
// Going deliberately BACKWARDS is what the bookmark is for, and the bookmark
// is deliberately not consulted here — a modifier must follow what the user
// has done, not where they last looked.

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * KNOWN SHARP EDGE, deliberately preserved rather than silently changed.
 *
 * The key is the BLOCK NAME, not the routine id. Two routines that both
 * contain a block called "Block 1" therefore share a week position, and
 * starting a second program can inherit the first one's week.
 *
 * Fixing it means migrating existing keys, which is a separate change with its
 * own risk — and doing it quietly inside an extraction is how the original bug
 * got lost. Left as-is, named here so the next person meets it in the open.
 */
export const weekKeyFor = (blockName: string) => `currentWeek_${blockName}`;

/** Persisted when the user browses weeks or opens a workout. */
export async function saveCurrentWeek(blockName: string, week: number): Promise<void> {
  try {
    await AsyncStorage.setItem(weekKeyFor(blockName), String(week));
  } catch (e) {
    console.error('saveCurrentWeek failed', e);
  }
}

/** The saved week, or NaN when absent or unparseable. */
export async function loadSavedWeek(blockName: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(weekKeyFor(blockName));
    if (!raw) return NaN;
    return parseInt(raw, 10);
  } catch (e) {
    console.error('loadSavedWeek failed', e);
    return NaN;
  }
}

/**
 * The week the user is standing on in this block, 1-indexed.
 *
 * `completionWeek` is the first week with unfinished work, derived from
 * training history by the caller — the screens already compute it, and this
 * function deliberately does not, so there is exactly one place that knows how
 * completion is measured.
 *
 * Returns 1 when nothing is known. That default matters for the modifier: it
 * means an unresolvable position leaves the user at the START of the block, so
 * a modifier touching only LATER weeks does nothing at all rather than
 * something wrong.
 */
export async function resolveCurrentWeek(args: {
  blockName: string;
  totalWeeks: number;
  completionWeek?: number;
}): Promise<number> {
  const { blockName, totalWeeks, completionWeek } = args;
  const savedWeek = await loadSavedWeek(blockName);

  const saved = Number.isFinite(savedWeek) ? savedWeek : 1;
  const derived = completionWeek && completionWeek > 0 ? completionWeek : 1;

  return Math.min(Math.max(1, totalWeeks), Math.max(saved, derived));
}

/**
 * How many weeks a block runs, from its `weeks` string ("1-6", "7", "13-18").
 *
 * The string is the only statement of a block's length in the stored program —
 * the `days` array is one week's shape repeated, not a week list — so this is
 * the sole source and every consumer has to parse it the same way.
 */
export function blockWeekCount(weeks: string | undefined): number {
  if (!weeks) return 0;
  const parts = String(weeks)
    .split(/[-–—]/)
    .map((p) => parseInt(p.trim(), 10))
    .filter((n) => Number.isFinite(n));
  if (parts.length === 0) return 0;
  if (parts.length === 1) return 1;
  return Math.max(0, parts[1] - parts[0] + 1);
}