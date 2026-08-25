/**
 * Rest families for the JSON.fit exercise library.
 *
 * A rest family describes what an exercise COSTS, not what it trains. It is the
 * static half of rest resolution. The dynamic half (how heavily it is being
 * loaded this block, deloads, goal overrides, supersets) is applied at runtime
 * by resolveRest() in ../utils/restResolver.
 *
 *   axial_compound      Free-weight multi-joint carrying spinal or whole-body
 *                       load. The only family that can reach the heavy row.
 *                       Resolves heavy at low reps, moderate otherwise.
 *   supported_compound  Machine and cable multi-joint, or free-weight
 *                       multi-joint where a bench/pad carries the trunk. The
 *                       support removes the stabilisation demand that justifies
 *                       3-5 min, so these never reach the heavy row.
 *   unilateral_compound Single-leg or single-arm multi-joint.
 *   high_cost_isolation Single joint, but heavily loaded or through a long
 *                       range. Curls, leg curls, leg extensions, pec deck.
 *   low_cost_isolation  Single joint, light load or short range. Lateral
 *                       raises, shrugs, calf raises, wrist curls.
 *
 * NOTE ON THE ISOLATION NAMES (renamed 18 Aug 2026)
 * These two were previously `large_isolation` and `small_isolation`, named
 * after the size of the muscle trained. That contradicted this file's own
 * first principle — a rest family describes what an exercise COSTS, not what
 * it trains — and it read as a contradiction against `rep-range-guidance.md`,
 * which sorts the same exercises by muscle size for REP purposes and puts
 * curls and triceps extensions under small-muscle isolation.
 *
 * The two files were never measuring the same thing. Reps are prescribed by
 * muscle size; rest is prescribed by what the set costs to recover from. A
 * barbell curl is a small muscle doing an expensive set. Renaming makes that
 * explicit so the next person to add an exercise reasons about cost.
 *
 * NOTHING ELSE CHANGED. Every exercise sits in the same bucket it did before
 * and every rest value is identical. This rename is behaviour-neutral.
 *
 * Keys are the exact names from https://json.fit/exercises.md. Lookup is done
 * through a normalised index (see restResolver) so minor punctuation or casing
 * drift in AI-written plan JSON still matches.
 *
 * Lines marked JUDGMENT are the ones with no direct research behind them. They
 * were decided by applying the load/muscle-mass principle. Change any of them
 * freely; nothing else depends on them.
 */

export type RestFamily =
  | 'axial_compound'
  | 'supported_compound'
  | 'unilateral_compound'
  | 'high_cost_isolation'
  | 'low_cost_isolation';

export const REST_FAMILIES: Record<string, RestFamily> = {
  // ---------------------------------------------------------------- CHEST (12)
  'Barbell Bench Press': 'axial_compound',
  'Incline Barbell Bench Press': 'axial_compound',
  'Decline Barbell Bench Press': 'axial_compound',
  'Dumbbell Bench Press': 'axial_compound',
  'Incline Dumbbell Bench Press': 'axial_compound',
  'Machine Chest Press': 'supported_compound',
  // JUDGMENT: Smith bench is a guided path with the trunk on a bench, so it
  // costs closer to a machine press than a free barbell press. Compare with
  // Smith Machine Squat below, which stays axial because it still loads the spine.
  'Smith Machine Bench Press': 'supported_compound',
  'Dips (Chest Focus)': 'axial_compound',
  'Cable Crossover': 'high_cost_isolation',
  'Pec Deck Fly': 'high_cost_isolation',
  'Dumbbell Fly': 'high_cost_isolation',
  'Incline Dumbbell Fly': 'high_cost_isolation',

  // ----------------------------------------------------------------- BACK (19)
  'Pull-up': 'axial_compound',
  'Weighted Pull-up': 'axial_compound',
  'Assisted Pull-up': 'supported_compound',
  'Chin-up': 'axial_compound',
  'Neutral-Grip Pull-up': 'axial_compound',
  'Lat Pulldown': 'supported_compound',
  'Neutral-Grip Lat Pulldown': 'supported_compound',
  'Close-Grip Lat Pulldown': 'supported_compound',
  'Barbell Row': 'axial_compound',
  'Pendlay Row': 'axial_compound',
  'T-Bar Row': 'axial_compound',
  // JUDGMENT: the chest support removes the isometric trunk demand that makes a
  // bent-over row expensive, which is the whole reason people program it.
  'Chest-Supported T-Bar Row': 'supported_compound',
  'Chest-Supported Dumbbell Row': 'supported_compound',
  'Seated Cable Row': 'supported_compound',
  'Single-Arm Dumbbell Row': 'unilateral_compound',
  'Meadows Row': 'unilateral_compound',
  'Seal Row': 'supported_compound',
  'Straight-Arm Pulldown': 'high_cost_isolation',
  'Dumbbell Pullover': 'high_cost_isolation',

  // ------------------------------------------------------------ SHOULDERS (13)
  'Barbell Overhead Press': 'axial_compound',
  'Seated Barbell Overhead Press': 'axial_compound',
  'Seated Dumbbell Shoulder Press': 'axial_compound',
  'Machine Shoulder Press': 'supported_compound',
  'Arnold Press': 'axial_compound',
  'Dumbbell Lateral Raise': 'low_cost_isolation',
  'Cable Lateral Raise': 'low_cost_isolation',
  'Machine Lateral Raise': 'low_cost_isolation',
  'Dumbbell Front Raise': 'low_cost_isolation',
  'Cable Rear Delt Fly': 'low_cost_isolation',
  'Reverse Pec Deck': 'low_cost_isolation',
  'Face Pull': 'low_cost_isolation',
  'Bent-Over Dumbbell Rear Delt Raise': 'low_cost_isolation',

  // ---------------------------------------------------------------- TRAPS (3)
  // JUDGMENT: the range of motion is short and the systemic cost is trivial,
  // whatever the size of the muscle. Short rest.
  'Barbell Shrug': 'low_cost_isolation',
  'Dumbbell Shrug': 'low_cost_isolation',
  'Cable Shrug': 'low_cost_isolation',

  // --------------------------------------------------------------- BICEPS (10)
  'Barbell Curl': 'high_cost_isolation',
  'EZ-Bar Curl': 'high_cost_isolation',
  'Dumbbell Curl': 'high_cost_isolation',
  'Incline Dumbbell Curl': 'high_cost_isolation',
  'Preacher Curl': 'high_cost_isolation',
  'Cable Curl': 'high_cost_isolation',
  'Hammer Curl': 'high_cost_isolation',
  'Cable Hammer Curl': 'high_cost_isolation',
  'Concentration Curl': 'high_cost_isolation',
  'Reverse Curl': 'high_cost_isolation',

  // -------------------------------------------------------------- TRICEPS (9)
  'Triceps Pushdown': 'high_cost_isolation',
  'Rope Triceps Pushdown': 'high_cost_isolation',
  'Overhead Cable Triceps Extension': 'high_cost_isolation',
  'Overhead Dumbbell Triceps Extension': 'high_cost_isolation',
  'EZ-Bar Skullcrusher': 'high_cost_isolation',
  'Dumbbell Skullcrusher': 'high_cost_isolation',
  'Close-Grip Bench Press': 'axial_compound',
  'Dips (Triceps Focus)': 'axial_compound',
  // JUDGMENT: kept with the other triceps work for consistency, though it is the
  // lightest movement in the library and low_cost_isolation is arguable.
  'Triceps Kickback': 'high_cost_isolation',

  // ---------------------------------------------------------------- QUADS (13)
  'Barbell Back Squat': 'axial_compound',
  'Barbell Front Squat': 'axial_compound',
  'Safety Bar Squat': 'axial_compound',
  // JUDGMENT: guided bar path, but still axially loaded through the spine. The
  // load and the muscle mass are unchanged, so it keeps compound cost.
  'Smith Machine Squat': 'axial_compound',
  'Hack Squat': 'supported_compound',
  'Leg Press': 'supported_compound',
  'Pendulum Squat': 'supported_compound',
  'Bulgarian Split Squat': 'unilateral_compound',
  'Walking Lunge': 'unilateral_compound',
  'Reverse Lunge': 'unilateral_compound',
  'Step-Up': 'unilateral_compound',
  'Leg Extension': 'high_cost_isolation',
  'Sissy Squat': 'high_cost_isolation',

  // ----------------------------------------------------------- HAMSTRINGS (11)
  'Romanian Deadlift': 'axial_compound',
  'Dumbbell Romanian Deadlift': 'axial_compound',
  'Stiff-Leg Deadlift': 'axial_compound',
  'Conventional Deadlift': 'axial_compound',
  'Sumo Deadlift': 'axial_compound',
  'Trap Bar Deadlift': 'axial_compound',
  'Lying Leg Curl': 'high_cost_isolation',
  'Seated Leg Curl': 'high_cost_isolation',
  'Nordic Curl': 'high_cost_isolation',
  'Single-Leg Hamstring Curl': 'high_cost_isolation',
  // JUDGMENT: axially loaded barbell hinge. Usually programmed light, but the
  // rep test will drop it to the moderate row on its own when it is.
  'Good Morning': 'axial_compound',

  // --------------------------------------------------------------- GLUTES (9)
  // JUDGMENT (researched): the hip thrust is loaded front-to-back with the trunk
  // on a bench, not axially through the spine, which is why it tolerates more
  // volume with less fatigue than a squat. Supported, not axial.
  'Barbell Hip Thrust': 'supported_compound',
  'Machine Hip Thrust': 'supported_compound',
  'Single-Leg Hip Thrust': 'unilateral_compound',
  'Barbell Glute Bridge': 'supported_compound',
  'Cable Glute Kickback': 'low_cost_isolation',
  'Hip Abduction Machine': 'low_cost_isolation',
  'Cable Hip Abduction': 'low_cost_isolation',
  'Hip Adduction Machine': 'low_cost_isolation',
  'Reverse Hyperextension': 'high_cost_isolation',

  // --------------------------------------------------------------- CALVES (5)
  'Standing Calf Raise': 'low_cost_isolation',
  'Seated Calf Raise': 'low_cost_isolation',
  'Smith Machine Calf Raise': 'low_cost_isolation',
  'Leg Press Calf Raise': 'low_cost_isolation',
  'Single-Leg Dumbbell Calf Raise': 'low_cost_isolation',

  // ----------------------------------------------------------------- CORE (7)
  'Cable Crunch': 'low_cost_isolation',
  'Hanging Leg Raise': 'low_cost_isolation',
  "Captain's Chair Leg Raise": 'low_cost_isolation',
  'Ab Wheel Rollout': 'low_cost_isolation',
  'Decline Crunch': 'low_cost_isolation',
  // JUDGMENT (researched): plank guidance clusters at 30-90 s rest, which is
  // already the low_cost_isolation row.
  'Plank': 'low_cost_isolation',
  'Reverse Crunch': 'low_cost_isolation',

  // ---------------------------------------------------------- LOWER BACK (1)
  'Back Extension': 'high_cost_isolation',

  // ----------------------------------------------------------------- NECK (4)
  'Plate Neck Flexion': 'low_cost_isolation',
  'Plate Neck Extension': 'low_cost_isolation',
  'Neck Harness Flexion': 'low_cost_isolation',
  'Neck Harness Extension': 'low_cost_isolation',

  // ------------------------------------------------------------- FOREARMS (4)
  'Barbell Wrist Curl': 'low_cost_isolation',
  'Dumbbell Wrist Curl': 'low_cost_isolation',
  'Reverse Wrist Curl': 'low_cost_isolation',
  // JUDGMENT (researched): the only genuine misfit in the library. Programming
  // guidance sits at 90 s to 2-3 min, which a compound row covers well enough.
  // Not worth a sixth family for one exercise.
  "Farmer's Walk": 'axial_compound',

  // ------------------------------------------------------------- OBLIQUES (5)
  'Pallof Press': 'low_cost_isolation',
  'Side Plank': 'low_cost_isolation',
  'Cable Woodchop': 'low_cost_isolation',
  'Russian Twist': 'low_cost_isolation',
  'Side Bend': 'low_cost_isolation',

  // ---------------------------------------------------------------- SHINS (2)
  'Tibialis Raise': 'low_cost_isolation',
  'Weighted Tibialis Raise': 'low_cost_isolation',

  // ------------------------------------------------------ SERRATUS ANTERIOR (2)
  'Serratus Punch': 'low_cost_isolation',
  'Scapular Push-up': 'low_cost_isolation',
};

/** Exercises in the library. Used by the dev-only coverage assertion. */
export const REST_FAMILY_COUNT = Object.keys(REST_FAMILIES).length; // 129