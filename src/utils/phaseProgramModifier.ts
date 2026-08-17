// src/utils/phaseProgramModifier.ts
//
// Adjusts a program the user has ALREADY IMPORTED when their phase changes, so
// entering a build does not mean generating a new program.
//
// ── WHY THIS IS SO SMALL ─────────────────────────────────────────────────────
//
// An evidence review (17 Aug 2026) went through everything the app assumed
// changes with phase, and most of it did not survive:
//
//   Cut volume reduction   DELETED. Roth 2023 randomised trained males to ~20
//                          vs ~12 weekly quad sets in a deficit and found no
//                          difference in muscle thickness or lean mass lost.
//                          The 2022 review found no support for reducing, and
//                          the only directional signal favours holding or
//                          RAISING volume. "Recovery is compromised, bias to
//                          MEV" was a mechanistic story, and it erred in the
//                          expensive direction — under-stimulating during the
//                          one phase whose purpose is retaining tissue.
//
//   Cut RIR increase       DELETED. No trial has ever manipulated proximity to
//                          failure under energy restriction. Self-reported RIR
//                          also carries 1-2 reps of error in trained lifters,
//                          so "+1 RIR" was an adjustment smaller than the noise
//                          it was expressed in.
//
//   Recomp                 COLLAPSED into maintenance. A recomp is at
//                          maintenance calories by definition, so recovery is
//                          not compromised relative to maintenance and no
//                          training variable has been shown to differ.
//
//   Exercise selection,    ALL FIXED. No phase-conditioned evidence for any of
//   split, rep ranges,     them. This is the finding that makes in-place
//   deloads, frequency     adjustment valid at all: if selection had to change,
//                          a phase change would require regeneration.
//
// What survived is one modifier, in one direction: a BOUNDED SET INCREASE when
// the user is building. Pelland 2026 (67 studies, 2,058 subjects) found
// hypertrophy rising with volume but with diminishing returns, so more helps
// somewhat. A surplus makes that extra work easier to recover from — it does
// not make a maximal workload necessary.
//
// It is also the only direction where being wrong is cheap. Over-shooting in a
// surplus costs fatigue and time. Under-stimulating in a deficit costs tissue.
//
// ── WHY ONLY sets_weekly ─────────────────────────────────────────────────────
//
// Rest is resolved at runtime from `reps_weekly` and `rir_weekly`, never from
// sets (see restResolver). Because the review left no RIR modifier, touching
// sets alone cannot disturb rest resolution. That is not luck being relied on
// quietly — it is the reason this file must never grow to touch RIR without
// re-checking what rest does in response.

import type { WorkoutProgram, StrengthExercise } from '../types/workout';
import { blockWeekCount, resolveCurrentWeek } from './programWeek';

/**
 * [B] Sets added per muscle, per session it is trained.
 *
 * The evidence band is +2 to +4 weekly sets. The rule below adds one set to the
 * first exercise training each muscle in each day, so a muscle trained twice a
 * week gains 2 and three times a week gains 3 — landing inside the band without
 * the app needing to know which muscles the user prioritises, which the stored
 * program does not record.
 */
const SETS_ADDED_PER_MUSCLE_PER_SESSION = 1;

/**
 * Ceiling from the planning rules: never more than 5 sets of one isolation
 * exercise in a session. Applied to every exercise here, not just isolation —
 * a compound that was already at 5 does not need a sixth to make this point.
 */
const MAX_SETS_PER_EXERCISE = 5;

export type PhaseDirection = 'building' | 'not_building';

/** Which phases count as building, for this file only. */
export function phaseDirection(kind: string): PhaseDirection {
  return kind === 'build' || kind === 'bulk' || kind === 'lean_bulk'
    ? 'building'
    : 'not_building';
}

export interface ModifierRecord {
  /** Routine this was applied to. */
  routineId: string;
  /** Signed sets added per exercise, keyed `${blockIndex}:${dayIndex}:${exerciseIndex}:${week}`. */
  deltas: Record<string, number>;
  appliedAt: string;
  forPhaseKind: string;
}

const isStrength = (e: unknown): e is StrengthExercise =>
  !!e && typeof e === 'object' && (e as { type?: string }).type === 'strength';

/**
 * Weeks in this block the modifier may touch.
 *
 * Three exclusions, all of them things a lifter would feel:
 *
 *   - Weeks already done or in progress. Changing the week someone is standing
 *     in moves the target mid-session.
 *   - Deload weeks. A deload is a deliberate reduction; adding sets to one
 *     cancels the thing it exists to do.
 *   - The week immediately BEFORE a deload. Raising the last hard week's volume
 *     is exactly when the deload after it was already going to be needed most.
 */
function eligibleWeeks(
  totalWeeks: number,
  currentWeek: number,
  deloadWeeks: number[] | undefined,
): number[] {
  const deloads = new Set(deloadWeeks ?? []);
  const out: number[] = [];
  for (let w = currentWeek + 1; w <= totalWeeks; w++) {
    if (deloads.has(w)) continue;
    if (deloads.has(w + 1)) continue;
    out.push(w);
  }
  return out;
}

/**
 * Which exercises in a day receive the extra set.
 *
 * ONE PER MUSCLE, the first exercise that trains it. Not every exercise: adding
 * a set to all of them would multiply a day's volume rather than nudge it, and
 * the band being aimed at is +2 to +4 weekly sets per muscle, not per exercise.
 *
 * Primary tags only. A secondary tag counts as half a set in this app's own
 * volume arithmetic, so treating one as a reason to add a whole set would
 * overshoot the muscle it names.
 */
function exercisesToBump(exercises: unknown[]): Set<number> {
  const seen = new Set<string>();
  const picked = new Set<number>();

  exercises.forEach((ex, i) => {
    if (!isStrength(ex)) return;
    const primary = ex.primaryMuscles ?? [];
    const isFirstForSomeMuscle = primary.some((m) => !seen.has(m));
    if (!isFirstForSomeMuscle) return;
    primary.forEach((m) => seen.add(m));
    picked.add(i);
  });

  return picked;
}

export interface ApplyResult {
  program: WorkoutProgram;
  record: ModifierRecord;
  /** Total sets added across the whole program, for the confirmation copy. */
  setsAdded: number;
}

/**
 * Apply the building increase to the weeks still ahead of the user.
 *
 * Returns a NEW program object — the caller writes it. This function does not
 * touch storage, because `WorkoutRoutine.data` is typed `any` and there is no
 * validation at the storage layer, so the fewer places that write into it the
 * better.
 */
export async function applyBuildingIncrease(args: {
  routineId: string;
  program: WorkoutProgram;
  forPhaseKind: string;
  /** First unfinished week per block, from training history. Optional. */
  completionWeekByBlock?: Record<string, number>;
}): Promise<ApplyResult> {
  const { routineId, program, forPhaseKind, completionWeekByBlock } = args;

  const next: WorkoutProgram = JSON.parse(JSON.stringify(program));
  const deltas: Record<string, number> = {};
  let setsAdded = 0;

  for (let b = 0; b < (next.blocks?.length ?? 0); b++) {
    const block = next.blocks[b];
    const totalWeeks = blockWeekCount(block.weeks);
    if (totalWeeks <= 0) continue;

    const currentWeek = await resolveCurrentWeek({
      blockName: block.block_name,
      totalWeeks,
      completionWeek: completionWeekByBlock?.[block.block_name],
    });

    const weeks = eligibleWeeks(totalWeeks, currentWeek, block.deload_weeks);
    if (weeks.length === 0) continue;

    (block.days ?? []).forEach((day, d) => {
      const bump = exercisesToBump(day.exercises ?? []);

      (day.exercises ?? []).forEach((ex, i) => {
        if (!bump.has(i) || !isStrength(ex)) return;

        // sets_weekly may be absent on older plans. Seeding it from `sets`
        // preserves what the exercise already did rather than inventing a
        // baseline, and gives the modifier something to add to.
        const base = ex.sets_weekly ?? {};
        const seeded: Record<string, number> = { ...base };

        weeks.forEach((w) => {
          const key = String(w);
          const before = seeded[key] ?? ex.sets ?? 3;
          const after = Math.min(MAX_SETS_PER_EXERCISE, before + SETS_ADDED_PER_MUSCLE_PER_SESSION);
          const delta = after - before;
          if (delta <= 0) return;
          seeded[key] = after;
          deltas[`${b}:${d}:${i}:${w}`] = delta;
          setsAdded += delta;
        });

        ex.sets_weekly = seeded;
      });
    });
  }

  return {
    program: next,
    record: {
      routineId,
      deltas,
      appliedAt: new Date().toISOString(),
      forPhaseKind,
    },
    setsAdded,
  };
}

/**
 * Undo a previously applied increase — used when the user leaves a building
 * phase, and as the escape hatch behind an "undo" control.
 *
 * Driven by the RECORD rather than by recomputing the rule. Recomputing would
 * subtract whatever the rule says today, which is not necessarily what was
 * added: the user may have edited the program, and the rule itself may have
 * changed between versions. Only the record knows what this modifier actually
 * did.
 */
export function revertIncrease(program: WorkoutProgram, record: ModifierRecord): WorkoutProgram {
  const next: WorkoutProgram = JSON.parse(JSON.stringify(program));

  Object.entries(record.deltas).forEach(([key, delta]) => {
    const [b, d, i, w] = key.split(':');
    const ex = next.blocks?.[Number(b)]?.days?.[Number(d)]?.exercises?.[Number(i)];
    if (!isStrength(ex) || !ex.sets_weekly) return;

    const before = ex.sets_weekly[w];
    if (typeof before !== 'number') return;

    // Floor at 1. If the user edited the program down below what we added,
    // subtracting blindly could reach zero sets — an exercise that exists but
    // is never performed, which is worse than a slightly wrong count.
    ex.sets_weekly[w] = Math.max(1, before - delta);
  });

  return next;
}