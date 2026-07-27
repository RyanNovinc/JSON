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
 *   large_isolation     Single joint, large muscle.
 *   small_isolation     Single joint, small muscle or short range of motion.
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
  | 'large_isolation'
  | 'small_isolation';

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
  'Cable Crossover': 'large_isolation',
  'Pec Deck Fly': 'large_isolation',
  'Dumbbell Fly': 'large_isolation',
  'Incline Dumbbell Fly': 'large_isolation',

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
  'Straight-Arm Pulldown': 'large_isolation',
  'Dumbbell Pullover': 'large_isolation',

  // ------------------------------------------------------------ SHOULDERS (13)
  'Barbell Overhead Press': 'axial_compound',
  'Seated Barbell Overhead Press': 'axial_compound',
  'Seated Dumbbell Shoulder Press': 'axial_compound',
  'Machine Shoulder Press': 'supported_compound',
  'Arnold Press': 'axial_compound',
  'Dumbbell Lateral Raise': 'small_isolation',
  'Cable Lateral Raise': 'small_isolation',
  'Machine Lateral Raise': 'small_isolation',
  'Dumbbell Front Raise': 'small_isolation',
  'Cable Rear Delt Fly': 'small_isolation',
  'Reverse Pec Deck': 'small_isolation',
  'Face Pull': 'small_isolation',
  'Bent-Over Dumbbell Rear Delt Raise': 'small_isolation',

  // ---------------------------------------------------------------- TRAPS (3)
  // JUDGMENT: traps are a large muscle, but the range of motion is short and the
  // systemic cost is trivial. Short rest.
  'Barbell Shrug': 'small_isolation',
  'Dumbbell Shrug': 'small_isolation',
  'Cable Shrug': 'small_isolation',

  // --------------------------------------------------------------- BICEPS (10)
  'Barbell Curl': 'large_isolation',
  'EZ-Bar Curl': 'large_isolation',
  'Dumbbell Curl': 'large_isolation',
  'Incline Dumbbell Curl': 'large_isolation',
  'Preacher Curl': 'large_isolation',
  'Cable Curl': 'large_isolation',
  'Hammer Curl': 'large_isolation',
  'Cable Hammer Curl': 'large_isolation',
  'Concentration Curl': 'large_isolation',
  'Reverse Curl': 'large_isolation',

  // -------------------------------------------------------------- TRICEPS (9)
  'Triceps Pushdown': 'large_isolation',
  'Rope Triceps Pushdown': 'large_isolation',
  'Overhead Cable Triceps Extension': 'large_isolation',
  'Overhead Dumbbell Triceps Extension': 'large_isolation',
  'EZ-Bar Skullcrusher': 'large_isolation',
  'Dumbbell Skullcrusher': 'large_isolation',
  'Close-Grip Bench Press': 'axial_compound',
  'Dips (Triceps Focus)': 'axial_compound',
  // JUDGMENT: kept with the other triceps work for consistency, though it is the
  // lightest movement in the library and small_isolation is arguable.
  'Triceps Kickback': 'large_isolation',

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
  'Leg Extension': 'large_isolation',
  'Sissy Squat': 'large_isolation',

  // ----------------------------------------------------------- HAMSTRINGS (11)
  'Romanian Deadlift': 'axial_compound',
  'Dumbbell Romanian Deadlift': 'axial_compound',
  'Stiff-Leg Deadlift': 'axial_compound',
  'Conventional Deadlift': 'axial_compound',
  'Sumo Deadlift': 'axial_compound',
  'Trap Bar Deadlift': 'axial_compound',
  'Lying Leg Curl': 'large_isolation',
  'Seated Leg Curl': 'large_isolation',
  'Nordic Curl': 'large_isolation',
  'Single-Leg Hamstring Curl': 'large_isolation',
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
  'Cable Glute Kickback': 'small_isolation',
  'Hip Abduction Machine': 'small_isolation',
  'Cable Hip Abduction': 'small_isolation',
  'Hip Adduction Machine': 'small_isolation',
  'Reverse Hyperextension': 'large_isolation',

  // --------------------------------------------------------------- CALVES (5)
  'Standing Calf Raise': 'small_isolation',
  'Seated Calf Raise': 'small_isolation',
  'Smith Machine Calf Raise': 'small_isolation',
  'Leg Press Calf Raise': 'small_isolation',
  'Single-Leg Dumbbell Calf Raise': 'small_isolation',

  // ----------------------------------------------------------------- CORE (7)
  'Cable Crunch': 'small_isolation',
  'Hanging Leg Raise': 'small_isolation',
  "Captain's Chair Leg Raise": 'small_isolation',
  'Ab Wheel Rollout': 'small_isolation',
  'Decline Crunch': 'small_isolation',
  // JUDGMENT (researched): plank guidance clusters at 30-90 s rest, which is
  // already the small_isolation row.
  'Plank': 'small_isolation',
  'Reverse Crunch': 'small_isolation',

  // ---------------------------------------------------------- LOWER BACK (1)
  'Back Extension': 'large_isolation',

  // ----------------------------------------------------------------- NECK (4)
  'Plate Neck Flexion': 'small_isolation',
  'Plate Neck Extension': 'small_isolation',
  'Neck Harness Flexion': 'small_isolation',
  'Neck Harness Extension': 'small_isolation',

  // ------------------------------------------------------------- FOREARMS (4)
  'Barbell Wrist Curl': 'small_isolation',
  'Dumbbell Wrist Curl': 'small_isolation',
  'Reverse Wrist Curl': 'small_isolation',
  // JUDGMENT (researched): the only genuine misfit in the library. Programming
  // guidance sits at 90 s to 2-3 min, which a compound row covers well enough.
  // Not worth a sixth family for one exercise.
  "Farmer's Walk": 'axial_compound',

  // ------------------------------------------------------------- OBLIQUES (5)
  'Pallof Press': 'small_isolation',
  'Side Plank': 'small_isolation',
  'Cable Woodchop': 'small_isolation',
  'Russian Twist': 'small_isolation',
  'Side Bend': 'small_isolation',

  // ---------------------------------------------------------------- SHINS (2)
  'Tibialis Raise': 'small_isolation',
  'Weighted Tibialis Raise': 'small_isolation',

  // ------------------------------------------------------ SERRATUS ANTERIOR (2)
  'Serratus Punch': 'small_isolation',
  'Scapular Push-up': 'small_isolation',
};

/** Exercises in the library. Used by the dev-only coverage assertion. */
export const REST_FAMILY_COUNT = Object.keys(REST_FAMILIES).length; // 129