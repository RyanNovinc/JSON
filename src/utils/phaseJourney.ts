// src/utils/phaseJourney.ts
//
// An append-only record of every phase the user has finished.
//
// WHY THIS HAS TO EXIST. deriveRoadmap recomputes from the live profile every
// time it is called, and phases[0] is always "the current phase". That is a
// deliberate design and it self-heals beautifully — but it means someone on
// their third trim and someone on their first look identical to the app at the
// same body fat. Nothing can tell them apart, so nothing can say "phase 5 of
// 14", and nothing can stop a user at phase 2 being shown phase 5.
//
// WHAT IS STORED, AND WHAT IS NOT. Only what HAPPENED: a dated list of
// crossings the user confirmed. Never where they are now. A log of past events
// cannot disagree with a recomputed roadmap because it makes no claim about the
// present — when the roadmap reshapes, because the user changed their goal or
// their route, the history stays true and only the remaining phases move.
//
// This is why a stored phase INDEX would be wrong. An index points into a list
// that can change shape underneath it. A count of things that happened cannot.
//
// It also deliberately does not live in @roadmap_snapshots. That module exists
// to freeze predictions so a future re-estimation engine can measure deviation,
// it samples on a completely different rule, and its eviction policy deletes
// from the middle — which would silently eat journey history.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Roadmap, RoadmapPhaseKind } from './roadmap';

const KEY = '@phase_journey';

export interface PhaseTransition {
  /** ISO timestamp. Doubles as identity; the list is append-only. */
  confirmedAt: string;
  /**
   * Set by the user asserting their position rather than the app detecting a
   * crossing. Kept because the two are not the same evidence: a detected
   * transition rests on a median of three readings, a manual one rests on the
   * user saying so. Nothing reads it yet; a later re-estimation engine
   * measuring deviation would want to know which is which.
   */
  manual?: boolean;
  /** The phase that ended and the one it handed over to. */
  fromKind: string;
  toKind?: string;
  /** The exit that was crossed, and the trend that crossed it. Kept so a later
   *  version can show the user what the app believed at the time, rather than
   *  re-deriving a number that has since moved. */
  thresholdPct?: number;
  trendPct?: number;
}

export async function loadPhaseJourney(): Promise<PhaseTransition[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is PhaseTransition => t && typeof t.confirmedAt === 'string' && typeof t.fromKind === 'string',
    );
  } catch {
    return [];
  }
}

export async function recordPhaseTransition(t: Omit<PhaseTransition, 'confirmedAt'>): Promise<void> {
  try {
    const journey = await loadPhaseJourney();
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify([...journey, { ...t, confirmedAt: new Date().toISOString() }]),
    );
  } catch {
    // Best effort. A lost transition costs an off-by-one in the counter, never
    // data the user gave us.
  }
}

/**
 * Move the user to a chosen position in the journey.
 *
 * THE LIST IS THE POSITION. This module stores a count of confirmed
 * transitions, never an index, for the reason in the header: an index points
 * into a list that can change shape underneath it. So "put me on phase 6" is
 * not a number being set — it is transitions being added or removed until the
 * count says 5.
 *
 * Which means moving BACKWARD genuinely deletes history, and the UI has to say
 * so rather than presenting it as setting a value. The one thing the log is
 * not is append-only any more; that guarantee is traded, knowingly, for the
 * user being able to fix a wrong position.
 *
 * Kept here rather than in a screen so every write to the journey still goes
 * through this module.
 */
export async function setCompletedPhaseCount(
  target: number,
  expanded: ExpandedPhase[],
): Promise<void> {
  try {
    const journey = await loadPhaseJourney();
    const clamped = Math.max(0, Math.min(target, Math.max(0, expanded.length - 1)));
    if (clamped === journey.length) return;

    if (clamped < journey.length) {
      // Backward: drop the most recent entries. Deliberately the newest, not
      // an arbitrary slice — the log is chronological, so the transitions
      // being unmade are the last ones made.
      await AsyncStorage.setItem(KEY, JSON.stringify(journey.slice(0, clamped)));
      return;
    }

    // Forward: one entry per phase being marked finished, each naming the
    // phase it ended and the one it handed to, so the log reads the same way
    // whether the app detected it or the user asserted it.
    const added: PhaseTransition[] = [];
    for (let i = journey.length; i < clamped; i++) {
      const from = expanded[i];
      if (!from) break;
      added.push({
        confirmedAt: new Date().toISOString(),
        fromKind: from.kind,
        toKind: expanded[i + 1]?.kind,
        thresholdPct: from.exitBodyFatPct,
        manual: true,
      });
    }
    await AsyncStorage.setItem(KEY, JSON.stringify([...journey, ...added]));
  } catch (e) {
    console.error('setCompletedPhaseCount failed', e);
  }
}

export async function clearPhaseJourney(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

// ------------------------------------------------------------------ position

export interface ExpandedPhase {
  /** Was `string`, which quietly widened everything downstream — phaseTransition
   *  had to re-narrow it and could not, producing three tsc errors that predate
   *  the 18 Aug work. */
  kind: RoadmapPhaseKind;
  exitBodyFatPct: number;
  /** Scale weight this occurrence ends at. Carried through because transition
   *  detection reads it: consumer body fat cannot resolve the changes a phase
   *  targets, so exits are detected on a weight trend. See RoadmapPhase. */
  exitWeightKg?: number;
  /** Prescribed %BW/week. Detection compares the measured slope against it, so
   *  hitting the weight by crash dieting is not reported as finishing. */
  targetRatePctPerWeek?: number;
  /** Too short for its own outcome to be measurable. Detection declines. */
  belowDetectionThreshold?: boolean;
  estMonths: [number, number];
}

/**
 * Every block the user will actually do, in order, expanded from the collapsed
 * roadmap. roadmap.phases holds three or four DEFINITIONS, two of which carry
 * a repeats count; this is the list of OCCURRENCES the journey line draws and
 * that "phase 5 of 14" counts against.
 *
 * THREE or four: the terminal reveal only exists when there is something left
 * to strip after the cycles. Nothing here may assume a fixed length.
 *
 * Everything about the CURRENT phase should be read from here rather than from
 * roadmap.phases. phases[0] is always the OPENER, not the phase the user is
 * standing in, so naming a phase from it says "recomp" forever and comparing
 * body fat against its exit tests the wrong threshold. That was a real bug: the
 * check-in named the phase the user started with rather than the one they had
 * just finished.
 *
 * The block order is NOT fixed. deriveRoadmap runs build-first when the opener
 * is a trim, because a losing user enters the band from above. Reading the two
 * blocks in array order rather than assuming trim-then-build is what keeps this
 * correct for both.
 */
export function expandPhases(roadmap: Roadmap): ExpandedPhase[] {
  const asPhase = (p: Roadmap['phases'][number]): ExpandedPhase => ({
    kind: p.kind,
    exitBodyFatPct: p.exitBodyFatPct,
    exitWeightKg: p.exitWeightKg,
    targetRatePctPerWeek: p.targetRatePctPerWeek,
    belowDetectionThreshold: p.belowDetectionThreshold,
    estMonths: p.estMonths,
  });

  // REWRITTEN 18 Aug 2026. This used to hard-code the collapsed four-slot shape
  // — opener, then phases[1] and phases[2] alternated blockA.repeats times,
  // then a conditional reveal — and it required BOTH middle slots to exist.
  //
  // deriveRoadmap now emits a VARIABLE number of phases, all with repeats 1 in
  // the common case, so a TWO-PHASE plan (trim then build) lost its build
  // entirely: this returned one occurrence, the counter read "phase 1 of 1",
  // and phasesAt could never hand the user their build — they would have been
  // stuck in the trim forever. Verified against the live roadmap before fixing.
  //
  // Walking the list and honouring each phase's own repeats is correct for the
  // old shape, the new one, and anything either grows into. The identical
  // hard-coded assumption existed in JourneyChart and was fixed there first.
  const out: ExpandedPhase[] = [];
  roadmap.phases.forEach((p) => {
    for (let i = 0; i < Math.max(1, p.repeats ?? 1); i++) out.push(asPhase(p));
  });
  return out;
}

/** The phase the user is standing in, and the one after it. */
export function phasesAt(
  roadmap: Roadmap,
  completed: number,
): { current?: ExpandedPhase; next?: ExpandedPhase } {
  const all = expandPhases(roadmap);
  const i = Math.min(completed, all.length - 1);
  return { current: all[i], next: all[i + 1] };
}

/**
 * Which occurrence the user is standing in, zero based.
 *
 * One completed transition means they are in the second block, and so on.
 * Clamped to the last block so a user who has finished more transitions than
 * the current roadmap has blocks — which happens when they shorten their route
 * mid-journey — lands on the end rather than off it.
 */
export function currentLegIndex(roadmap: Roadmap, completed: number): number {
  return Math.min(completed, expandPhases(roadmap).length - 1);
}

/** Human position: 1 based, against the number of blocks that actually exist. */
export function phasePosition(
  roadmap: Roadmap,
  completed: number,
): { index: number; total: number } {
  const total = expandPhases(roadmap).length;
  return { index: Math.min(completed + 1, total), total };
}