// src/utils/phaseIntent.ts
//
// What each phase asks of the user, in terms of the number they actually
// measure: the scale.
//
// WHY THIS EXISTS. Every phase presented identically — a body fat threshold and
// a lit segment on a chart — so the app never said what any of them requires.
// Someone in a build watching the scale climb had no way to know that was the
// plan working rather than failing, and a build is the phase people quit. A
// recomp is the phase people think is broken, because the scale does nothing
// for months while the composition changes underneath.
//
// NO PREDICTED WEIGHT ON BUILDS, deliberately. A literature review found the
// widely cited gain-rate tables (Aragon's percentages, McDonald's halving) are
// expert heuristics with no traceable primary dataset, and no study fits rate
// against distance from a genetic ceiling. deriveRoadmap knows the TOTAL lean
// mass to add but nothing about how it splits across six builds, and muscle
// memory means early weeks of later builds are partly regain, so an even split
// would be wrong in a known direction. A number there would imply a precision
// that does not exist.
//
// TRIMS ARE THE EXCEPTION. Lean mass is approximately held through a well run
// cut, so the end weight is arithmetic on values already stored: lean divided
// by one minus the exit body fat. That one is checkable on a scale, so it gets
// a figure.

import { leanMassKg } from './roadmap';

export type ScaleDirection = 'up' | 'flat' | 'down';

export interface PhaseIntent {
  /** The instruction, as a verb. */
  title: string;
  /** Why, in one or two sentences. */
  detail: string;
  direction: ScaleDirection;
  /** One word for a stat tile. */
  word: string;
}

export function phaseIntentFor(kind: string): PhaseIntent {
  switch (kind) {
    case 'build':
      return {
        title: 'Gain weight on purpose',
        detail:
          'You eat above maintenance, so the scale climbs. Some of that is fat, and that is the trade — muscle goes on faster this way.',
        direction: 'up',
        word: 'Rising',
      };
    case 'trim':
      return {
        title: 'Lose fat, keep the muscle',
        detail:
          'You eat below maintenance and keep lifting hard. The scale falls, and the job is making sure what leaves is fat.',
        direction: 'down',
        word: 'Falling',
      };
    case 'recomp':
      return {
        title: 'Hold your weight',
        detail:
          'Muscle up, fat down, the scale roughly still. It is the one phase where both move at once.',
        direction: 'flat',
        word: 'Steady',
      };
    case 'reveal':
      return {
        title: 'Bring it down to the finish',
        detail: 'The last stretch. Fat comes off and what you have built underneath shows.',
        direction: 'down',
        word: 'Falling',
      };
    default:
      return {
        title: 'Keep going',
        detail: 'Log your weight each week and the plan adjusts around it.',
        direction: 'flat',
        word: 'Steady',
      };
  }
}

/**
 * The weight a phase ends at, or null when it cannot be known honestly.
 *
 * Only trims and reveals return a number. Both hold lean mass roughly constant
 * while fat comes off, so end weight = lean / (1 − exit body fat). A build
 * gains lean mass, and the app has no basis for deciding how much lands in this
 * particular build, so it returns null rather than guessing.
 */
export function phaseEndWeightKg(
  kind: string,
  currentWeightKg: number,
  currentBodyFatPct: number | undefined,
  exitBodyFatPct: number,
): number | null {
  if (kind !== 'trim' && kind !== 'reveal') return null;
  if (currentBodyFatPct == null || !currentWeightKg) return null;
  const lean = leanMassKg(currentWeightKg, currentBodyFatPct);
  const end = lean / (1 - exitBodyFatPct / 100);
  return Number.isFinite(end) && end > 0 ? end : null;
}