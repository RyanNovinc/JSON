/**
 * Canonical Exercise Mapping System
 * 
 * Maps exercise variations to their canonical base movement for unified
 * history tracking and notes. This allows all bench press variations
 * to share the same progression data and form notes.
 */

// Map specific exercise variations to their canonical base exercise
const CANONICAL_EXERCISE_MAP: { [key: string]: string } = {
  // Bench Press variations
  "Barbell Bench Press": "Bench Press",
  "Smith Machine Bench Press": "Bench Press", 
  "Dumbbell Bench Press": "Bench Press",
  
  // Incline Bench Press variations
  "Incline Barbell Bench Press": "Incline Bench Press",
  "Incline Dumbbell Bench Press": "Incline Bench Press",
  "Incline Smith Machine Bench Press": "Incline Bench Press",
  
  // Pull-up variations
  "Weighted Pull-up": "Pull-up",
  "Assisted Pull-up": "Pull-up", 
  "Lat Pulldown": "Pull-up", // Similar movement pattern
  
  // Overhead Press variations
  "Seated Barbell Overhead Press": "Overhead Press",
  "Standing Barbell Overhead Press": "Overhead Press",
  "Dumbbell Shoulder Press": "Overhead Press",
  "Seated Dumbbell Overhead Press": "Overhead Press",
  
  // Row variations
  "Chest-Supported T-Bar Row": "Horizontal Row",
  "Barbell Row": "Horizontal Row",
  "Dumbbell Row": "Horizontal Row",
  "Cable Row": "Horizontal Row",
  
  // Squat variations
  "Barbell Back Squat": "Squat",
  "Front Squat": "Squat",
  "Goblet Squat": "Squat",
  "Bulgarian Split Squat": "Single-Leg Squat",
  "Rear-Foot-Elevated Split Squat": "Single-Leg Squat",
  
  // Deadlift variations
  "Conventional Deadlift": "Deadlift",
  "Romanian Deadlift": "Romanian Deadlift",
  "Stiff-Leg Deadlift": "Romanian Deadlift",
  "Sumo Deadlift": "Deadlift",
  
  // Add more mappings as needed...
};

/**
 * Get the canonical exercise name for history/notes storage
 * @param exerciseName The specific exercise variation name
 * @returns The canonical base exercise name, or original name if no mapping exists
 */
export function getCanonicalExerciseName(exerciseName: string): string {
  return CANONICAL_EXERCISE_MAP[exerciseName] || exerciseName;
}

/**
 * Get all variations that map to the same canonical exercise
 * @param exerciseName Any exercise name (canonical or variation)
 * @returns Array of all exercise names that share the same canonical mapping
 */
export function getExerciseVariations(exerciseName: string): string[] {
  const canonical = getCanonicalExerciseName(exerciseName);
  
  const variations = Object.entries(CANONICAL_EXERCISE_MAP)
    .filter(([_, canonicalName]) => canonicalName === canonical)
    .map(([variation, _]) => variation);
  
  // If no variations found, the exercise might already be canonical
  if (variations.length === 0) {
    // Check if this is a canonical name that other exercises map to
    const hasVariations = Object.values(CANONICAL_EXERCISE_MAP).includes(exerciseName);
    if (hasVariations) {
      return [exerciseName];
    }
    // Otherwise return the original name
    return [exerciseName];
  }
  
  // Add the canonical name if it's not already in variations
  if (!variations.includes(canonical)) {
    variations.unshift(canonical);
  }
  
  return variations;
}

/**
 * Check if two exercises should share the same history/notes
 * @param exercise1 First exercise name
 * @param exercise2 Second exercise name 
 * @returns True if they share the same canonical mapping
 */
export function exercisesShareHistory(exercise1: string, exercise2: string): boolean {
  return getCanonicalExerciseName(exercise1) === getCanonicalExerciseName(exercise2);
}