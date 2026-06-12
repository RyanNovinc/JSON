/**
 * Exercise Identity System for History Tracking
 * 
 * Provides stable exercise IDs for history persistence with granularity:
 * MERGE cosmetic naming variations, KEEP equipment/angle/grip distinct
 * 
 * Unlike exerciseMapping.ts (used for suggestions/dedup), this system
 * preserves equipment distinctions for meaningful progression tracking.
 */

// Version tracking for identity table evolution
export const IDENTITY_TABLE_VERSION = 1;

/**
 * Normalize exercise name for consistent matching
 * Handles case/spacing/punctuation variations in custom exercises
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ')     // Collapse multiple spaces
    .trim();
}

/**
 * Hand-authored identity table mapping curated exercise variations to stable slugs.
 * 
 * GRANULARITY DECISION: Equipment/angle/grip variants stay separate for meaningful
 * progression tracking. Only pure cosmetic synonyms merge.
 * 
 * Equipment kept distinct: Barbell vs Dumbbell vs Smith Machine vs Cable
 * Angles kept distinct: Flat vs Incline vs Decline  
 * Grips kept distinct: Wide vs Close vs Neutral
 * Body positions kept distinct: Seated vs Standing
 * 
 * Cosmetic merging: "Bench Press" = "Barbell Bench Press" = "Flat Barbell Bench Press"
 */
const CURATED_IDENTITY_TABLE: { [normalizedName: string]: string } = {
  // BENCH PRESS - Barbell variations (flat)
  'bench press': 'bench_press_barbell',
  'barbell bench press': 'bench_press_barbell',
  'flat bench press': 'bench_press_barbell',
  'flat barbell bench press': 'bench_press_barbell',
  'bb bench press': 'bench_press_barbell',
  
  // BENCH PRESS - Equipment variants (separate identities)
  'dumbbell bench press': 'bench_press_dumbbell',
  'db bench press': 'bench_press_dumbbell',
  'smith machine bench press': 'bench_press_smith',
  'smith bench press': 'bench_press_smith',
  'cable bench press': 'bench_press_cable',
  
  // INCLINE BENCH PRESS - Equipment variants
  'incline bench press': 'incline_bench_press_barbell',
  'incline barbell bench press': 'incline_bench_press_barbell',
  'incline dumbbell bench press': 'incline_bench_press_dumbbell',
  'incline db bench press': 'incline_bench_press_dumbbell',
  'incline smith machine bench press': 'incline_bench_press_smith',
  'incline smith bench press': 'incline_bench_press_smith',
  
  // DECLINE BENCH PRESS - Equipment variants  
  'decline bench press': 'decline_bench_press_barbell',
  'decline barbell bench press': 'decline_bench_press_barbell',
  'decline dumbbell bench press': 'decline_bench_press_dumbbell',
  'decline db bench press': 'decline_bench_press_dumbbell',
  
  // CLOSE GRIP BENCH PRESS
  'close grip bench press': 'close_grip_bench_press',
  'close grip barbell bench press': 'close_grip_bench_press',
  'cgbp': 'close_grip_bench_press',
  
  // OVERHEAD PRESS - Position variants
  'overhead press': 'overhead_press_standing_barbell',
  'standing overhead press': 'overhead_press_standing_barbell',
  'standing barbell overhead press': 'overhead_press_standing_barbell',
  'military press': 'overhead_press_standing_barbell',
  'standing press': 'overhead_press_standing_barbell',
  
  'seated overhead press': 'overhead_press_seated_barbell',
  'seated barbell overhead press': 'overhead_press_seated_barbell',
  'seated press': 'overhead_press_seated_barbell',
  
  'dumbbell shoulder press': 'shoulder_press_dumbbell',
  'db shoulder press': 'shoulder_press_dumbbell',
  'seated dumbbell shoulder press': 'shoulder_press_seated_dumbbell',
  'seated db shoulder press': 'shoulder_press_seated_dumbbell',
  
  // PULL-UPS - Assistance variants (same movement, different loading)
  'pull up': 'pull_up',
  'pullup': 'pull_up',
  'pull ups': 'pull_up',
  'pullups': 'pull_up',
  'weighted pull up': 'pull_up',
  'weighted pullup': 'pull_up',
  'assisted pull up': 'pull_up',
  'assisted pullup': 'pull_up',
  
  // LAT PULLDOWN (different equipment, separate identity)
  'lat pulldown': 'lat_pulldown',
  'lat pull down': 'lat_pulldown',
  'wide grip lat pulldown': 'lat_pulldown_wide_grip',
  'close grip lat pulldown': 'lat_pulldown_close_grip',
  
  // ROWS - Equipment variants
  'barbell row': 'row_barbell',
  'bent over barbell row': 'row_barbell',
  'bb row': 'row_barbell',
  'pendlay row': 'row_barbell_pendlay',
  
  'dumbbell row': 'row_dumbbell',
  'db row': 'row_dumbbell',
  'single arm dumbbell row': 'row_dumbbell',
  'one arm dumbbell row': 'row_dumbbell',
  
  'cable row': 'row_cable',
  'seated cable row': 'row_cable',
  'low cable row': 'row_cable',
  
  'chest supported t bar row': 'row_t_bar',
  't bar row': 'row_t_bar',
  'chest supported row': 'row_chest_supported',
  
  // SQUATS - Equipment variants
  'squat': 'squat_barbell',
  'back squat': 'squat_barbell',
  'barbell back squat': 'squat_barbell',
  'barbell squat': 'squat_barbell',
  'bb squat': 'squat_barbell',
  
  'front squat': 'squat_front',
  'barbell front squat': 'squat_front',
  
  'goblet squat': 'squat_goblet',
  'dumbbell goblet squat': 'squat_goblet',
  
  'bulgarian split squat': 'split_squat_bulgarian',
  'rear foot elevated split squat': 'split_squat_bulgarian',
  'single leg squat': 'squat_single_leg',
  
  // DEADLIFTS - Style variants  
  'deadlift': 'deadlift_conventional',
  'conventional deadlift': 'deadlift_conventional',
  'barbell deadlift': 'deadlift_conventional',
  
  'sumo deadlift': 'deadlift_sumo',
  'sumo dl': 'deadlift_sumo',
  
  'romanian deadlift': 'deadlift_romanian',
  'rdl': 'deadlift_romanian',
  'stiff leg deadlift': 'deadlift_romanian',
  'stiff legged deadlift': 'deadlift_romanian',
  
  'trap bar deadlift': 'deadlift_trap_bar',
  'hex bar deadlift': 'deadlift_trap_bar',
  
  // CURLS - Equipment variants
  'barbell curl': 'curl_barbell',
  'barbell bicep curl': 'curl_barbell',
  'bb curl': 'curl_barbell',
  'standing barbell curl': 'curl_barbell',
  
  'dumbbell curl': 'curl_dumbbell',
  'db curl': 'curl_dumbbell',
  'dumbbell bicep curl': 'curl_dumbbell',
  'alternating dumbbell curl': 'curl_dumbbell',
  
  'ez bar curl': 'curl_ez_bar',
  'ez curl': 'curl_ez_bar',
  'ezbar curl': 'curl_ez_bar',
  
  'hammer curl': 'curl_hammer',
  'dumbbell hammer curl': 'curl_hammer',
  'neutral grip dumbbell curl': 'curl_hammer',
  
  'cable curl': 'curl_cable',
  'cable bicep curl': 'curl_cable',
  
  // TRICEPS - Equipment variants
  'tricep dip': 'dip_tricep',
  'triceps dip': 'dip_tricep',
  'dips': 'dip_tricep',
  'parallel bar dip': 'dip_tricep',
  'weighted dip': 'dip_tricep',
  
  'close grip push up': 'push_up_close_grip',
  'diamond push up': 'push_up_diamond',
  
  'overhead tricep extension': 'tricep_extension_overhead',
  'overhead dumbbell extension': 'tricep_extension_overhead',
  'french press': 'tricep_extension_overhead',
  
  // Add more as needed...
};

/**
 * Resolve exercise name to stable ID for history tracking
 * 
 * @param name Exercise name (any variation)
 * @returns Stable exercise ID: curated slug or custom:{normalized}
 */
export function resolveExerciseId(name: string): string {
  const normalized = normalizeName(name);
  
  // Check curated identity table
  const curatedId = CURATED_IDENTITY_TABLE[normalized];
  if (curatedId) {
    return curatedId;
  }
  
  // Custom exercise: deterministic ID based on normalized name
  return `custom:${normalized}`;
}

/**
 * Check if two exercises should share the same history
 * @param exercise1 First exercise name
 * @param exercise2 Second exercise name 
 * @returns True if they resolve to the same exercise ID
 */
export function exercisesShareHistory(exercise1: string, exercise2: string): boolean {
  return resolveExerciseId(exercise1) === resolveExerciseId(exercise2);
}

/**
 * Get all known variations that would resolve to the same ID as the given exercise
 * @param exerciseName Exercise name to find variations for
 * @returns Array of exercise names that share the same identity
 */
export function getExerciseVariations(exerciseName: string): string[] {
  const targetId = resolveExerciseId(exerciseName);
  
  // If it's a custom exercise, only the normalized form matches
  if (targetId.startsWith('custom:')) {
    return [exerciseName];
  }
  
  // Find all curated variations that map to the same ID
  const variations: string[] = [];
  for (const [normalizedName, id] of Object.entries(CURATED_IDENTITY_TABLE)) {
    if (id === targetId) {
      // Convert back to a display form (this is approximate, but good enough for suggestions)
      const displayForm = normalizedName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      variations.push(displayForm);
    }
  }
  
  return variations.length > 0 ? variations : [exerciseName];
}