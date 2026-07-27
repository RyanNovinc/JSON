/**
 * Rest resolution for JSON.fit.
 *
 * Replaces the old `rest` / `restQuick` fields in plan JSON. Rest is no longer
 * written by the AI at generation time; it is computed here, at runtime, from
 * data the plan already carries.
 *
 * The rule is single and fixed. What varies is its inputs:
 *
 *   rest family (static, per exercise)
 *     + how heavily it is loaded this block (reps_weekly / rir_weekly)
 *     + program goal
 *     + deload week
 *     + superset role
 *   -> one row of the matrix -> three values, one per pace
 *
 * That is why the same Barbell Back Squat rests 165 s in a hypertrophy block and
 * 240 s in a strength block without anything being regenerated.
 *
 * Source of the numbers: https://json.fit/rest-guidance.md
 * Keep the two in sync. This file is the authority at runtime; that file is the
 * authority for what the plan document tells the user.
 */

import { REST_FAMILIES, RestFamily } from '../data/restFamilies';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RestPace = 'optimal' | 'moderate' | 'minimal';

export interface RestTriple {
  optimal: number;
  moderate: number;
  minimal: number;
}

type MatrixRow =
  | 'heavy_compound'
  | 'moderate_compound'
  | 'unilateral'
  | 'large_isolation'
  | 'small_isolation'
  | 'superset_transition'
  | 'superset_round';

export interface RestContext {
  /** Exercise name as written in the plan JSON. */
  exerciseName: string;
  /**
   * Reps for the current week. Accepts either a reps_weekly value
   * ("10, 10, 10, 8") or a plain range from the `reps` field ("8-12").
   */
  repsThisWeek?: string | number;
  /** rir_weekly value for the current week ("4, 3, 2"). Optional. */
  rirThisWeek?: string;
  /** Root-level primary_goal from the plan. Optional. */
  primaryGoal?: string;
  /** True when the current week appears in the block's deload_weeks. */
  isDeloadWeek?: boolean;
  /**
   * For superset members. 'transition' is the first exercise of the pair (short
   * rest to move to the second). 'round' is the second (full rest before
   * repeating the pair).
   */
  supersetRole?: 'transition' | 'round';
  /**
   * Zero-based index of the set just completed. Only used to apply the extra
   * rest that follows a set taken to failure. Omit and that adjustment is
   * skipped.
   */
  setIndex?: number;
  /** Escape hatch for exercises outside the library. */
  familyOverride?: RestFamily;
}

// ---------------------------------------------------------------------------
// Matrix — seconds, from rest-guidance.md
// ---------------------------------------------------------------------------

const MATRIX: Record<MatrixRow, RestTriple> = {
  // 3-5 min / 2.5-3 min / 2 min
  heavy_compound: { optimal: 240, moderate: 165, minimal: 120 },
  // 2.5-3 min / 2 min / 75-90 s
  moderate_compound: { optimal: 165, moderate: 120, minimal: 90 },
  // Between-PAIRS values (2.5 min / 2 min / 90 s), not between-sides.
  // A `sets` entry in this app means both sides, so the timer only ever fires
  // between pairs. The between-sides numbers in rest-guidance.md are not a
  // timer event here.
  unilateral: { optimal: 150, moderate: 120, minimal: 90 },
  // 2 min / 75-90 s / 60 s
  large_isolation: { optimal: 120, moderate: 90, minimal: 60 },
  // 60-90 s / 45-75 s / 30-60 s
  small_isolation: { optimal: 75, moderate: 60, minimal: 45 },
  // Antagonist superset edge case: 30-60 s between the two exercises,
  // then 90 s-2 min before repeating the pair.
  superset_transition: { optimal: 60, moderate: 45, minimal: 30 },
  superset_round: { optimal: 120, moderate: 105, minimal: 90 },
};

/** Hard floor on heavy compounds. Applies at every pace, no exceptions. */
const HEAVY_COMPOUND_FLOOR = 120;

/** General fitness flattens everything to 60-120 s across all categories. */
const GENERAL_FITNESS_BAND: [number, number] = [60, 120];

/** Strength goal: heavy compounds get 3-5 min regardless of pace. */
const STRENGTH_HEAVY_COMPOUND = 240;

/**
 * Estimated RM at or below which an axial compound counts as a heavy set.
 * Estimated RM = reps + RIR on the first working set.
 */
const HEAVY_SET_RM_THRESHOLD = 8;

/** Assumed RIR when the plan carries reps but no rir_weekly. */
const ASSUMED_RIR = 2;

/** Extra rest after a set taken to failure (rest-guidance.md edge cases). */
const FAILURE_BUMP_COMPOUND = 60;
const FAILURE_BUMP_ISOLATION = 30;

/** Used when an exercise name is not in the library. Deliberately generous. */
export const UNKNOWN_EXERCISE_REST: RestTriple = MATRIX.moderate_compound;

// ---------------------------------------------------------------------------
// Name lookup
// ---------------------------------------------------------------------------

/**
 * Plan JSON is written by an external LLM, so names can drift in punctuation or
 * casing even though the prompt demands exact library names.
 *
 * If src/utils/exerciseIdentity.ts exposes a more thorough normaliser, swap it
 * in here — that table already handles the variants seen in real imports.
 */
export function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const NORMALIZED_FAMILIES: Record<string, RestFamily> = Object.entries(
  REST_FAMILIES
).reduce((acc, [name, family]) => {
  acc[normalizeExerciseName(name)] = family;
  return acc;
}, {} as Record<string, RestFamily>);

export function getRestFamily(exerciseName: string): RestFamily | null {
  if (!exerciseName) return null;
  return NORMALIZED_FAMILIES[normalizeExerciseName(exerciseName)] ?? null;
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * First working set's value, taking the low end of any range.
 *
 *   "10, 10, 10, 8" -> 10      (first set)
 *   "8-12"          -> 8       (heaviest end of a prescribed range)
 *   "1-2, 0-1, 0"   -> 1
 *   12              -> 12
 */
function firstSetValue(input?: string | number): number | null {
  if (input === undefined || input === null) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;

  const firstSegment = String(input).split(',')[0] ?? '';
  const match = firstSegment.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/** Last set's RIR, taking the low end of any range. Used for failure detection. */
function lastSetValue(input?: string): number | null {
  if (!input) return null;
  const segments = String(input).split(',');
  const lastSegment = segments[segments.length - 1] ?? '';
  const match = lastSegment.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function setCount(input?: string): number {
  if (!input) return 0;
  return String(input).split(',').length;
}

// ---------------------------------------------------------------------------
// Row selection
// ---------------------------------------------------------------------------

/**
 * Is this axial compound being loaded heavily this block?
 *
 * Estimated RM = first-set reps + first-set RIR. A squat at 10 reps / RIR 3 is a
 * 13RM load and sits on the moderate row. The same squat at 5 reps / RIR 2 is a
 * 7RM load and sits on the heavy row. This is the entire mechanism by which
 * block 10 shifting to a strength emphasis changes rest without regeneration.
 */
function isHeavySet(ctx: RestContext): boolean {
  const reps = firstSetValue(ctx.repsThisWeek);
  if (reps === null) return false; // no rep data: assume moderate, never heavy

  const rir = firstSetValue(ctx.rirThisWeek) ?? ASSUMED_RIR;
  return reps + rir <= HEAVY_SET_RM_THRESHOLD;
}

function selectRow(family: RestFamily, ctx: RestContext): MatrixRow {
  switch (family) {
    case 'axial_compound':
      return isHeavySet(ctx) ? 'heavy_compound' : 'moderate_compound';
    case 'supported_compound':
      // Machines and cables never reach the heavy row. The support removes the
      // stabilisation demand that justifies 3-5 min in the first place.
      return 'moderate_compound';
    case 'unilateral_compound':
      return 'unilateral';
    case 'large_isolation':
      return 'large_isolation';
    case 'small_isolation':
      return 'small_isolation';
  }
}

// ---------------------------------------------------------------------------
// Adjustments
// ---------------------------------------------------------------------------

function mapTriple(triple: RestTriple, fn: (n: number) => number): RestTriple {
  return {
    optimal: fn(triple.optimal),
    moderate: fn(triple.moderate),
    minimal: fn(triple.minimal),
  };
}

function roundTo5(n: number): number {
  return Math.round(n / 5) * 5;
}

/**
 * Was the set just completed taken to failure? Only the last set of an exercise
 * normally carries RIR 0, so this fires once per exercise at most.
 */
function isFailureSet(ctx: RestContext): boolean {
  if (ctx.setIndex === undefined || !ctx.rirThisWeek) return false;
  const total = setCount(ctx.rirThisWeek);
  if (total === 0 || ctx.setIndex !== total - 1) return false;
  return lastSetValue(ctx.rirThisWeek) === 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * All three pace values for one exercise, in the context of the block, week and
 * set it sits in. Pure and synchronous — safe to call on every render.
 */
export function resolveRest(ctx: RestContext): RestTriple {
  const family = ctx.familyOverride ?? getRestFamily(ctx.exerciseName);

  // --- Supersets bypass the family entirely -------------------------------
  if (ctx.supersetRole) {
    const row: MatrixRow =
      ctx.supersetRole === 'transition' ? 'superset_transition' : 'superset_round';
    let triple = MATRIX[row];
    if (ctx.isDeloadWeek) triple = flattenToOptimal(triple);
    if (isGeneralFitness(ctx)) triple = clampToBand(triple, GENERAL_FITNESS_BAND);
    return mapTriple(triple, roundTo5);
  }

  if (!family) return mapTriple(UNKNOWN_EXERCISE_REST, roundTo5);

  const row = selectRow(family, ctx);
  let triple = MATRIX[row];

  // --- Goal override ------------------------------------------------------
  // rest-guidance.md: strength work gets 3-5 min on heavy compounds regardless
  // of tier. Applied to axial compounds only — a leg press in a strength block
  // is still a supported movement.
  if (isStrengthGoal(ctx) && family === 'axial_compound') {
    triple = {
      optimal: STRENGTH_HEAVY_COMPOUND,
      moderate: STRENGTH_HEAVY_COMPOUND,
      minimal: STRENGTH_HEAVY_COMPOUND,
    };
  }

  // --- Sets to failure ----------------------------------------------------
  if (isFailureSet(ctx)) {
    const bump =
      row === 'heavy_compound' ||
      row === 'moderate_compound' ||
      row === 'unilateral'
        ? FAILURE_BUMP_COMPOUND
        : FAILURE_BUMP_ISOLATION;
    triple = mapTriple(triple, (n) => n + bump);
  }

  // --- Deload -------------------------------------------------------------
  // rest-guidance.md prescribes 2-3 min on deloads, but applied literally that
  // would make a deload lateral raise rest longer than a training-week one.
  // Resolving every pace to the optimal column expresses the same intent
  // (full recovery, less work) without that inversion. Switching pace during a
  // deload therefore does nothing, which is deliberate. Change this one line if
  // you want deloads to stay switchable.
  if (ctx.isDeloadWeek) triple = flattenToOptimal(triple);

  // --- General fitness ----------------------------------------------------
  if (isGeneralFitness(ctx)) triple = clampToBand(triple, GENERAL_FITNESS_BAND);

  // --- Hard floor ---------------------------------------------------------
  // "Never below 2 min on heavy compounds, regardless of tier or instructions
  // elsewhere." Applied last so nothing above can undercut it.
  if (row === 'heavy_compound') {
    triple = mapTriple(triple, (n) => Math.max(n, HEAVY_COMPOUND_FLOOR));
  }

  return mapTriple(triple, roundTo5);
}

/** Convenience wrapper when you only need the currently selected pace. */
export function resolveRestSeconds(ctx: RestContext, pace: RestPace): number {
  return resolveRest(ctx)[pace];
}

/** Select from an already-resolved triple. Used when retargeting a live timer. */
export function pickPace(triple: RestTriple, pace: RestPace): number {
  return triple[pace];
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function isStrengthGoal(ctx: RestContext): boolean {
  return ctx.primaryGoal === 'gain_strength';
}

function isGeneralFitness(ctx: RestContext): boolean {
  return ctx.primaryGoal === 'general_fitness';
}

function flattenToOptimal(triple: RestTriple): RestTriple {
  return {
    optimal: triple.optimal,
    moderate: triple.optimal,
    minimal: triple.optimal,
  };
}

function clampToBand(triple: RestTriple, [lo, hi]: [number, number]): RestTriple {
  return mapTriple(triple, (n) => Math.min(Math.max(n, lo), hi));
}