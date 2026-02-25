import { WorkoutRoutine } from '../utils/storage';
import { CompletedMesocycleSummary } from './programStorage';

interface ParsedWorkoutData {
  routine_name: string;
  description?: string;
  days_per_week: number;
  blocks: {
    block_name: string;
    weeks: string;
    structure?: string;
    deload_weeks?: number[];
    days: {
      day_name: string;
      estimated_duration?: number;
      exercises: {
        type: string;
        exercise?: string;
        activity?: string;
        circuit_name?: string;
        sets?: number;
        reps?: string;
        rest?: number;
        restQuick?: number;
        notes?: string;
        primaryMuscles?: string[];
        secondaryMuscles?: string[];
        alternatives?: any[];
        reps_weekly?: Record<string, string>;
        sets_weekly?: Record<string, number>;
        // ... other exercise-specific fields
      }[];
    }[];
  }[];
}

/**
 * Extracts a completed mesocycle summary from imported JSON blocks
 */
export function extractMesocycleSummary(
  routines: WorkoutRoutine[],  // all routines for this mesocycle
  phaseName: string
): CompletedMesocycleSummary {
  if (routines.length === 0) {
    throw new Error('No routines provided for mesocycle summary extraction');
  }

  // Parse the first routine's data to get basic info
  const firstRoutineData = parseRoutineData(routines[0]);
  
  // Extract split structure from first block
  const splitStructure = firstRoutineData.blocks[0]?.structure || 
                        inferSplitFromDayNames(firstRoutineData);

  // Extract rep range focus from block name or analyze exercises
  const repRangeFocus = extractRepRangeFocus(firstRoutineData);

  // Collect all strength exercises and calculate volume
  const { exercisesUsed, volumePerMuscle } = extractExercisesAndVolume(routines);

  return {
    mesocycleNumber: 1, // This will be set by the calling code
    phaseName,
    splitStructure,
    repRangeFocus,
    exercisesUsed: Array.from(exercisesUsed).sort(),
    volumePerMuscle
  };
}

/**
 * Parse routine data, handling both string and object formats
 */
function parseRoutineData(routine: WorkoutRoutine): ParsedWorkoutData {
  if (!routine.data) {
    throw new Error('Routine has no data field');
  }

  // If data is a string, parse it as JSON
  if (typeof routine.data === 'string') {
    try {
      return JSON.parse(routine.data);
    } catch (error) {
      throw new Error('Failed to parse routine data as JSON');
    }
  }

  // If data is already an object, use it directly
  return routine.data as ParsedWorkoutData;
}

/**
 * Infer split structure from day names if not explicitly provided
 */
function inferSplitFromDayNames(data: ParsedWorkoutData): string {
  if (!data.blocks[0]?.days) return 'Unknown Split';
  
  const dayNames = data.blocks[0].days.map(day => day.day_name).join(' / ');
  return `${dayNames} (${data.days_per_week}x/week)`;
}

/**
 * Extract rep range focus from block name or analyze exercises
 */
function extractRepRangeFocus(data: ParsedWorkoutData): string {
  // First, try to extract from block name
  const blockName = data.blocks[0]?.block_name || '';
  
  // Look for patterns like "8-12 reps" or "Hypertrophy: 8-12" 
  const repRangeMatch = blockName.match(/(\d+)-(\d+)\s*reps?/i) || 
                       blockName.match(/(\d+)-(\d+)/);
  
  if (repRangeMatch) {
    return `${repRangeMatch[1]}-${repRangeMatch[2]} reps`;
  }

  // If not found in block name, analyze compound exercises
  const compoundExercises = findCompoundExercises(data);
  if (compoundExercises.length > 0) {
    const repRanges = compoundExercises
      .map(ex => ex.reps)
      .filter(reps => reps && typeof reps === 'string')
      .slice(0, 3); // Take first 3 compound exercises

    if (repRanges.length > 0) {
      // Find most common rep range pattern
      const rangeCounts: Record<string, number> = {};
      repRanges.forEach(range => {
        const match = range.match(/(\d+)-(\d+)/);
        if (match) {
          const normalizedRange = `${match[1]}-${match[2]} reps`;
          rangeCounts[normalizedRange] = (rangeCounts[normalizedRange] || 0) + 1;
        }
      });

      const mostCommon = Object.keys(rangeCounts).reduce((a, b) => 
        rangeCounts[a] > rangeCounts[b] ? a : b
      );
      
      if (mostCommon) return mostCommon;
    }
  }

  return 'Mixed rep ranges';
}

/**
 * Find compound exercises (typically have multiple primary muscles)
 */
function findCompoundExercises(data: ParsedWorkoutData): any[] {
  const compoundExercises: any[] = [];
  
  for (const block of data.blocks) {
    for (const day of block.days) {
      for (const exercise of day.exercises) {
        if (exercise.type === 'strength' && 
            exercise.primaryMuscles && 
            exercise.primaryMuscles.length >= 2) {
          compoundExercises.push(exercise);
        }
      }
    }
  }
  
  return compoundExercises;
}

/**
 * Extract all strength exercises and calculate volume per muscle
 */
function extractExercisesAndVolume(routines: WorkoutRoutine[]): {
  exercisesUsed: Set<string>;
  volumePerMuscle: Record<string, number>;
} {
  const exercisesUsed = new Set<string>();
  const volumePerMuscle: Record<string, number> = {};

  for (const routine of routines) {
    const data = parseRoutineData(routine);
    
    for (const block of data.blocks) {
      // Get deload weeks to exclude from volume calculation
      const deloadWeeks = new Set(block.deload_weeks || []);
      
      for (const day of block.days) {
        for (const exercise of day.exercises) {
          // Only process strength exercises
          if (exercise.type !== 'strength' || !exercise.exercise) {
            continue;
          }

          // Add to exercises used
          exercisesUsed.add(exercise.exercise);

          // Calculate volume for each primary muscle
          if (exercise.primaryMuscles && exercise.sets) {
            const setsPerSession = exercise.sets;
            
            for (const muscle of exercise.primaryMuscles) {
              if (!volumePerMuscle[muscle]) {
                volumePerMuscle[muscle] = 0;
              }
              
              // Add volume: sets per session × number of training weeks
              // We need to count how many times this day appears per week
              const trainingWeeks = calculateTrainingWeeks(block.weeks, deloadWeeks);
              volumePerMuscle[muscle] += setsPerSession * trainingWeeks;
            }
          }
        }
      }
    }
  }

  return { exercisesUsed, volumePerMuscle };
}

/**
 * Calculate number of training weeks (excluding deloads) and sessions per week
 */
function calculateTrainingWeeks(weeksString: string, deloadWeeks: Set<number>): number {
  // Parse week range (e.g., "1-4" or "5")
  const weekParts = weeksString.split('-');
  const startWeek = parseInt(weekParts[0]);
  const endWeek = weekParts.length > 1 ? parseInt(weekParts[1]) : startWeek;
  
  let trainingWeeks = 0;
  for (let week = startWeek; week <= endWeek; week++) {
    if (!deloadWeeks.has(week)) {
      trainingWeeks++;
    }
  }
  
  return trainingWeeks;
}

/**
 * Utility function to get muscle groups that appear in the data
 */
export function getUsedMuscleGroups(routines: WorkoutRoutine[]): string[] {
  const muscleGroups = new Set<string>();
  
  for (const routine of routines) {
    try {
      const data = parseRoutineData(routine);
      
      for (const block of data.blocks) {
        for (const day of block.days) {
          for (const exercise of day.exercises) {
            if (exercise.type === 'strength' && exercise.primaryMuscles) {
              exercise.primaryMuscles.forEach(muscle => muscleGroups.add(muscle));
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to parse routine data for muscle groups:', error);
    }
  }
  
  return Array.from(muscleGroups).sort();
}