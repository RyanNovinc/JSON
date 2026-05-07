/**
 * Exercise Image Management Utility
 * 
 * Handles the organization and retrieval of exercise images with the following structure:
 * exercise-images/
 * ├── {exercise-name}/
 * │   ├── blue/
 * │   │   ├── start.png
 * │   │   └── end.png
 * │   └── pink/
 * │       ├── start.png
 * │       └── end.png
 */

console.log('🚀 EXERCISEIMAGES MODULE: Starting to load...');
console.log('🚀 EXERCISEIMAGES MODULE: This log should appear if module loads at all');

export type ColorTheme = 'blue' | 'pink';
export type MovementPhase = 'start' | 'end';

export interface ExerciseImageSet {
  start: string;
  end: string;
}

export interface ExerciseImages {
  blue: ExerciseImageSet;
  pink: ExerciseImageSet;
}

/**
 * Convert exercise name to folder-safe format
 * e.g., "Barbell Bench Press" -> "barbell-bench-press"
 */
export function exerciseNameToFolder(exerciseName: string): string {
  return exerciseName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Get the base URL for exercise images
 * This can be updated based on your hosting setup (AWS S3, etc.)
 */
export function getExerciseImageBaseUrl(): string {
  // For development: using require() for local assets
  // For production: update to your hosting URL (AWS S3, etc.)
  return '';  // We'll use require() instead of URL strings
}

/**
 * Generate the full URL for a specific exercise image
 */
export function getExerciseImageUrl(
  exerciseName: string, 
  theme: ColorTheme, 
  phase: MovementPhase
): string {
  const baseUrl = getExerciseImageBaseUrl();
  const folderName = exerciseNameToFolder(exerciseName);
  return `${baseUrl}/${folderName}/${theme}/${phase}.png`;
}

/**
 * Get all images for an exercise (both themes, both phases)
 */
export function getExerciseImages(exerciseName: string): ExerciseImages {
  return {
    blue: {
      start: getExerciseImageUrl(exerciseName, 'blue', 'start'),
      end: getExerciseImageUrl(exerciseName, 'blue', 'end'),
    },
    pink: {
      start: getExerciseImageUrl(exerciseName, 'pink', 'start'),
      end: getExerciseImageUrl(exerciseName, 'pink', 'end'),
    },
  };
}

/**
 * Get images for a specific theme
 */
export function getExerciseThemeImages(
  exerciseName: string, 
  theme: ColorTheme
): ExerciseImageSet {
  return {
    start: getExerciseImageUrl(exerciseName, theme, 'start'),
    end: getExerciseImageUrl(exerciseName, theme, 'end'),
  };
}

/**
 * Check if exercise images exist (for fallback handling)
 * This would need to be implemented based on your image hosting solution
 */
export async function exerciseImagesExist(exerciseName: string): Promise<boolean> {
  // Implement based on your hosting solution
  // For now, return true - you can implement actual checking later
  return true;
}

/**
 * Get exercise image URLs with fallback to default images
 */
export function getExerciseImagesWithFallback(
  exerciseName: string,
  theme: ColorTheme = 'blue',
  fallbackUrl?: string
): ExerciseImageSet {
  const images = getExerciseThemeImages(exerciseName, theme);
  
  // If you have default fallback images, you can implement the logic here
  const defaultFallback = fallbackUrl || 'https://your-domain.com/default-exercise-placeholder.png';
  
  return images;
}

/**
 * Example usage and folder structure reference
 */
export const FOLDER_STRUCTURE_EXAMPLE = {
  'barbell-bench-press': {
    blue: {
      start: 'barbell-bench-press/blue/start.png',
      end: 'barbell-bench-press/blue/end.png',
    },
    pink: {
      start: 'barbell-bench-press/pink/start.png', 
      end: 'barbell-bench-press/pink/end.png',
    },
  },
  'squat': {
    blue: {
      start: 'squat/blue/start.png',
      end: 'squat/blue/end.png',
    },
    pink: {
      start: 'squat/pink/start.png',
      end: 'squat/pink/end.png',
    },
  },
};

/**
 * Helper to generate the folder structure for a list of exercises
 * Useful for setting up your file system
 */
export function generateFolderStructure(exerciseNames: string[]): Record<string, ExerciseImages> {
  const structure: Record<string, ExerciseImages> = {};
  
  exerciseNames.forEach(name => {
    const folderName = exerciseNameToFolder(name);
    structure[folderName] = getExerciseImages(name);
  });
  
  return structure;
}

/**
 * Complete list of all exercises in the app (128 total)
 * Organized by muscle group as provided by user
 */
export const ALL_EXERCISES = [
  // Chest (12)
  'Barbell Bench Press',
  'Incline Barbell Bench Press',
  'Decline Barbell Bench Press',
  'Dumbbell Bench Press',
  'Incline Dumbbell Bench Press',
  'Machine Chest Press',
  'Smith Machine Bench Press',
  'Dips (Chest Focus)',
  'Cable Crossover',
  'Pec Deck Fly',
  'Dumbbell Fly',
  'Incline Dumbbell Fly',

  // Back — Lats, Upper Back (18)
  'Pull-up',
  'Weighted Pull-up',
  'Assisted Pull-up',
  'Chin-up',
  'Neutral-Grip Pull-up',
  'Lat Pulldown',
  'Neutral-Grip Lat Pulldown',
  'Close-Grip Lat Pulldown',
  'Barbell Row',
  'Pendlay Row',
  'T-Bar Row',
  'Chest-Supported T-Bar Row',
  'Chest-Supported Dumbbell Row',
  'Seated Cable Row',
  'Single-Arm Dumbbell Row',
  'Meadows Row',
  'Seal Row',
  'Straight-Arm Pulldown',
  'Dumbbell Pullover',

  // Shoulders (13)
  'Barbell Overhead Press',
  'Seated Barbell Overhead Press',
  'Seated Dumbbell Shoulder Press',
  'Machine Shoulder Press',
  'Arnold Press',
  'Dumbbell Lateral Raise',
  'Cable Lateral Raise',
  'Machine Lateral Raise',
  'Dumbbell Front Raise',
  'Cable Rear Delt Fly',
  'Reverse Pec Deck',
  'Face Pull',
  'Bent-Over Dumbbell Rear Delt Raise',

  // Traps (3)
  'Barbell Shrug',
  'Dumbbell Shrug',
  'Cable Shrug',

  // Biceps (10)
  'Barbell Curl',
  'EZ-Bar Curl',
  'Dumbbell Curl',
  'Incline Dumbbell Curl',
  'Preacher Curl',
  'Cable Curl',
  'Hammer Curl',
  'Cable Hammer Curl',
  'Concentration Curl',
  'Reverse Curl',

  // Triceps (9)
  'Triceps Pushdown',
  'Rope Triceps Pushdown',
  'Overhead Cable Triceps Extension',
  'Overhead Dumbbell Triceps Extension',
  'EZ-Bar Skullcrusher',
  'Dumbbell Skullcrusher',
  'Close-Grip Bench Press',
  'Dips (Triceps Focus)',
  'Triceps Kickback',

  // Quads (13)
  'Barbell Back Squat',
  'Barbell Front Squat',
  'Safety Bar Squat',
  'Smith Machine Squat',
  'Hack Squat',
  'Leg Press',
  'Pendulum Squat',
  'Bulgarian Split Squat',
  'Walking Lunge',
  'Reverse Lunge',
  'Step-Up',
  'Leg Extension',
  'Sissy Squat',

  // Hamstrings (11)
  'Romanian Deadlift',
  'Dumbbell Romanian Deadlift',
  'Stiff-Leg Deadlift',
  'Conventional Deadlift',
  'Sumo Deadlift',
  'Trap Bar Deadlift',
  'Lying Leg Curl',
  'Seated Leg Curl',
  'Nordic Curl',
  'Single-Leg Hamstring Curl',
  'Good Morning',

  // Glutes (9)
  'Barbell Hip Thrust',
  'Machine Hip Thrust',
  'Single-Leg Hip Thrust',
  'Barbell Glute Bridge',
  'Cable Glute Kickback',
  'Hip Abduction Machine',
  'Cable Hip Abduction',
  'Hip Adduction Machine',
  'Reverse Hyperextension',

  // Calves (5)
  'Standing Calf Raise',
  'Seated Calf Raise',
  'Smith Machine Calf Raise',
  'Leg Press Calf Raise',
  'Single-Leg Dumbbell Calf Raise',

  // Core (7)
  'Cable Crunch',
  'Hanging Leg Raise',
  'Captain\'s Chair Leg Raise',
  'Ab Wheel Rollout',
  'Decline Crunch',
  'Plank',
  'Reverse Crunch',

  // Lower Back (1)
  'Back Extension',

  // Neck (4)
  'Plate Neck Flexion',
  'Plate Neck Extension',
  'Neck Harness Flexion',
  'Neck Harness Extension',

  // Forearms (4)
  'Barbell Wrist Curl',
  'Dumbbell Wrist Curl',
  'Reverse Wrist Curl',
  'Farmer\'s Walk',

  // Obliques (5)
  'Pallof Press',
  'Side Plank',
  'Cable Woodchop',
  'Russian Twist',
  'Side Bend',

  // Shins (Tibialis) (2)
  'Tibialis Raise',
  'Weighted Tibialis Raise',

  // Serratus Anterior (2)
  'Serratus Punch',
  'Scapular Push-up',
] as const;

/**
 * Generate a script/command to create the folder structure
 */
export function generateMkdirCommands(exerciseNames: readonly string[] = ALL_EXERCISES): string[] {
  const commands: string[] = ['mkdir -p exercise-images'];
  
  exerciseNames.forEach(name => {
    const folderName = exerciseNameToFolder(name);
    commands.push(`mkdir -p exercise-images/${folderName}/blue`);
    commands.push(`mkdir -p exercise-images/${folderName}/pink`);
  });
  
  return commands;
}

/**
 * Generate the complete folder structure for all exercises
 */
export function generateAllExerciseFolders(): Record<string, ExerciseImages> {
  return generateFolderStructure([...ALL_EXERCISES]);
}

/**
 * Get exercise image using require() for React Native local assets
 * This function attempts to dynamically require images from the exercise-images folder
 */
export function getExerciseImageSource(
  exerciseName: string, 
  theme: ColorTheme = 'blue', 
  phase: MovementPhase = 'start'
): any {
  try {
    const folderName = exerciseNameToFolder(exerciseName);
    const imagePath = `../exercise-images/${folderName}/${theme}/${phase}.png`;
    
    // Note: Dynamic requires don't work in React Native
    // We'll need to create a static mapping instead
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Static image mapping for React Native
 * This maps exercise folder names to their image assets
 */
let EXERCISE_IMAGE_MAP: Record<string, any> = {};

// Test if we can import the images at all
let barbellBenchPressBlueStart: any = null;
let barbellBenchPressBlueEnd: any = null;
let barbellBenchPressPinkStart: any = null;
let barbellBenchPressPinkEnd: any = null;

// Barbell back squat images
let barbellBackSquatBlueStart: any = null;
let barbellBackSquatBlueEnd: any = null;
let barbellBackSquatPinkStart: any = null;
let barbellBackSquatPinkEnd: any = null;

// Romanian deadlift images
let romanianDeadliftBlueStart: any = null;
let romanianDeadliftBlueEnd: any = null;
let romanianDeadliftPinkStart: any = null;
let romanianDeadliftPinkEnd: any = null;

// Pull-up images
let pullUpBlueStart: any = null;
let pullUpBlueEnd: any = null;
let pullUpPinkStart: any = null;
let pullUpPinkEnd: any = null;

// Conventional deadlift images
let conventionalDeadliftBlueStart: any = null;
let conventionalDeadliftBlueEnd: any = null;
let conventionalDeadliftPinkStart: any = null;
let conventionalDeadliftPinkEnd: any = null;

// Lat pulldown images
let latPulldownBlueStart: any = null;
let latPulldownBlueEnd: any = null;
let latPulldownPinkStart: any = null;
let latPulldownPinkEnd: any = null;

// Barbell row images
let barbellRowBlueStart: any = null;
let barbellRowBlueEnd: any = null;
let barbellRowPinkStart: any = null;
let barbellRowPinkEnd: any = null;

// Barbell overhead press images
let barbellOverheadPressBlueStart: any = null;
let barbellOverheadPressBlueEnd: any = null;
let barbellOverheadPressPinkStart: any = null;
let barbellOverheadPressPinkEnd: any = null;

// Seated dumbbell shoulder press images
let seatedDumbbellShoulderPressBlueStart: any = null;
let seatedDumbbellShoulderPressBlueEnd: any = null;
let seatedDumbbellShoulderPressPinkStart: any = null;
let seatedDumbbellShoulderPressPinkEnd: any = null;

// Incline dumbbell bench press images
let inclineDumbbellBenchPressBlueStart: any = null;
let inclineDumbbellBenchPressBlueEnd: any = null;
let inclineDumbbellBenchPressPinkStart: any = null;
let inclineDumbbellBenchPressPinkEnd: any = null;

// Dumbbell lateral raise images
let dumbbellLateralRaiseBlueStart: any = null;
let dumbbellLateralRaiseBlueEnd: any = null;
let dumbbellLateralRaisePinkStart: any = null;
let dumbbellLateralRaisePinkEnd: any = null;

// Barbell curl images
let barbellCurlBlueStart: any = null;
let barbellCurlBlueEnd: any = null;
let barbellCurlPinkStart: any = null;
let barbellCurlPinkEnd: any = null;

// Dumbbell curl images
let dumbbellCurlBlueStart: any = null;
let dumbbellCurlBlueEnd: any = null;
let dumbbellCurlPinkStart: any = null;
let dumbbellCurlPinkEnd: any = null;

// Hammer curl images
let hammerCurlBlueStart: any = null;
let hammerCurlBlueEnd: any = null;
let hammerCurlPinkStart: any = null;
let hammerCurlPinkEnd: any = null;

// Triceps pushdown images
let tricepsPushdownBlueStart: any = null;
let tricepsPushdownBlueEnd: any = null;
let tricepsPushdownPinkStart: any = null;
let tricepsPushdownPinkEnd: any = null;

// Rope triceps pushdown images
let ropeTricepsPushdownBlueStart: any = null;
let ropeTricepsPushdownBlueEnd: any = null;
let ropeTricepsPushdownPinkStart: any = null;
let ropeTricepsPushdownPinkEnd: any = null;

// Leg press images
let legPressBlueStart: any = null;
let legPressBlueEnd: any = null;
let legPressPinkStart: any = null;
let legPressPinkEnd: any = null;

// Leg extension images
let legExtensionBlueStart: any = null;
let legExtensionBlueEnd: any = null;
let legExtensionPinkStart: any = null;
let legExtensionPinkEnd: any = null;

// Lying leg curl images
let lyingLegCurlBlueStart: any = null;
let lyingLegCurlBlueEnd: any = null;
let lyingLegCurlPinkStart: any = null;
let lyingLegCurlPinkEnd: any = null;

// Standing calf raise images
let standingCalfRaiseBlueStart: any = null;
let standingCalfRaiseBlueEnd: any = null;
let standingCalfRaisePinkStart: any = null;
let standingCalfRaisePinkEnd: any = null;

// Dumbbell bench press images
let dumbbellBenchPressBlueStart: any = null;
let dumbbellBenchPressBlueEnd: any = null;
let dumbbellBenchPressPinkStart: any = null;
let dumbbellBenchPressPinkEnd: any = null;

// Incline barbell bench press images
let inclineBarbellBenchPressBlueStart: any = null;
let inclineBarbellBenchPressBlueEnd: any = null;
let inclineBarbellBenchPressPinkStart: any = null;
let inclineBarbellBenchPressPinkEnd: any = null;

// Machine chest press images
let machineChestPressBlueStart: any = null;
let machineChestPressBlueEnd: any = null;
let machineChestPressPinkStart: any = null;
let machineChestPressPinkEnd: any = null;

// Cable crossover images
let cableCrossoverBlueStart: any = null;
let cableCrossoverBlueEnd: any = null;
let cableCrossoverPinkStart: any = null;
let cableCrossoverPinkEnd: any = null;

try {
  console.log('🔄 ATTEMPTING to load exercise images...');
  
  // Load barbell bench press images - try multiple names
  console.log('🏋️ Loading barbell bench press...');
  
  // Blue start
  try {
    barbellBenchPressBlueStart = require('../../exercise-images/barbell-bench-press/blue/start.png');
    console.log('✅ Loaded barbell-bench-press blue start.png');
  } catch (e) {
    try {
      barbellBenchPressBlueStart = require('../../exercise-images/barbell-bench-press/blue/start_v2.png');
      console.log('✅ Loaded barbell-bench-press blue start_v2.png');
    } catch (e2) {
      console.log('❌ No barbell-bench-press blue start image found');
    }
  }
  
  // Blue end
  try {
    barbellBenchPressBlueEnd = require('../../exercise-images/barbell-bench-press/blue/end.png');
    console.log('✅ Loaded barbell-bench-press blue end.png');
  } catch (e) {
    try {
      barbellBenchPressBlueEnd = require('../../exercise-images/barbell-bench-press/blue/end_v2.png');
      console.log('✅ Loaded barbell-bench-press blue end_v2.png');
    } catch (e2) {
      console.log('❌ No barbell-bench-press blue end image found');
    }
  }
  
  // Pink start
  try {
    barbellBenchPressPinkStart = require('../../exercise-images/barbell-bench-press/pink/start.png');
    console.log('✅ Loaded barbell-bench-press pink start.png');
  } catch (e) {
    try {
      barbellBenchPressPinkStart = require('../../exercise-images/barbell-bench-press/pink/start_v2.png');
      console.log('✅ Loaded barbell-bench-press pink start_v2.png');
    } catch (e2) {
      console.log('❌ No barbell-bench-press pink start image found');
    }
  }
  
  // Pink end
  try {
    barbellBenchPressPinkEnd = require('../../exercise-images/barbell-bench-press/pink/end.png');
    console.log('✅ Loaded barbell-bench-press pink end.png');
  } catch (e) {
    try {
      barbellBenchPressPinkEnd = require('../../exercise-images/barbell-bench-press/pink/end_v2.png');
      console.log('✅ Loaded barbell-bench-press pink end_v2.png');
    } catch (e2) {
      console.log('❌ No barbell-bench-press pink end image found');
    }
  }
  
  // Load barbell back squat images
  console.log('🏋️ Loading barbell back squat...');
  
  // Blue start
  try {
    barbellBackSquatBlueStart = require('../../exercise-images/barbell-back-squat/blue/start.png');
    console.log('✅ Loaded barbell-back-squat blue start.png');
  } catch (e) {
    console.log('❌ No barbell-back-squat blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    barbellBackSquatBlueEnd = require('../../exercise-images/barbell-back-squat/blue/end.png');
    console.log('✅ Loaded barbell-back-squat blue end.png');
  } catch (e) {
    console.log('❌ No barbell-back-squat blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    barbellBackSquatPinkStart = require('../../exercise-images/barbell-back-squat/pink/start.png');
    console.log('✅ Loaded barbell-back-squat pink start.png');
  } catch (e) {
    console.log('❌ No barbell-back-squat pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    barbellBackSquatPinkEnd = require('../../exercise-images/barbell-back-squat/pink/end.png');
    console.log('✅ Loaded barbell-back-squat pink end.png');
  } catch (e) {
    console.log('❌ No barbell-back-squat pink end.png found:', e.message);
  }
  
  // Load romanian deadlift images
  console.log('🏋️ Loading romanian deadlift...');
  
  // Blue start
  try {
    romanianDeadliftBlueStart = require('../../exercise-images/romanian-deadlift/blue/start.png');
    console.log('✅ Loaded romanian-deadlift blue start.png');
  } catch (e) {
    console.log('❌ No romanian-deadlift blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    romanianDeadliftBlueEnd = require('../../exercise-images/romanian-deadlift/blue/end.png');
    console.log('✅ Loaded romanian-deadlift blue end.png');
  } catch (e) {
    console.log('❌ No romanian-deadlift blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    romanianDeadliftPinkStart = require('../../exercise-images/romanian-deadlift/pink/start.png');
    console.log('✅ Loaded romanian-deadlift pink start.png');
  } catch (e) {
    console.log('❌ No romanian-deadlift pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    romanianDeadliftPinkEnd = require('../../exercise-images/romanian-deadlift/pink/end.png');
    console.log('✅ Loaded romanian-deadlift pink end.png');
  } catch (e) {
    console.log('❌ No romanian-deadlift pink end.png found:', e.message);
  }
  
  // Load pull-up images
  console.log('🏋️ Loading pull-up...');
  
  // Blue start
  try {
    pullUpBlueStart = require('../../exercise-images/pull-up/blue/start.png');
    console.log('✅ Loaded pull-up blue start.png');
  } catch (e) {
    console.log('❌ No pull-up blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    pullUpBlueEnd = require('../../exercise-images/pull-up/blue/end.png');
    console.log('✅ Loaded pull-up blue end.png');
  } catch (e) {
    console.log('❌ No pull-up blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    pullUpPinkStart = require('../../exercise-images/pull-up/pink/start.png');
    console.log('✅ Loaded pull-up pink start.png');
  } catch (e) {
    console.log('❌ No pull-up pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    pullUpPinkEnd = require('../../exercise-images/pull-up/pink/end.png');
    console.log('✅ Loaded pull-up pink end.png');
  } catch (e) {
    console.log('❌ No pull-up pink end.png found:', e.message);
  }
  
  // Load conventional deadlift images
  console.log('🏋️ Loading conventional deadlift...');
  
  // Blue start
  try {
    conventionalDeadliftBlueStart = require('../../exercise-images/conventional-deadlift/blue/start.png');
    console.log('✅ Loaded conventional-deadlift blue start.png');
  } catch (e) {
    console.log('❌ No conventional-deadlift blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    conventionalDeadliftBlueEnd = require('../../exercise-images/conventional-deadlift/blue/end.png');
    console.log('✅ Loaded conventional-deadlift blue end.png');
  } catch (e) {
    console.log('❌ No conventional-deadlift blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    conventionalDeadliftPinkStart = require('../../exercise-images/conventional-deadlift/pink/start.png');
    console.log('✅ Loaded conventional-deadlift pink start.png');
  } catch (e) {
    console.log('❌ No conventional-deadlift pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    conventionalDeadliftPinkEnd = require('../../exercise-images/conventional-deadlift/pink/end.png');
    console.log('✅ Loaded conventional-deadlift pink end.png');
  } catch (e) {
    console.log('❌ No conventional-deadlift pink end.png found:', e.message);
  }
  
  // Load lat pulldown images
  console.log('🏋️ Loading lat pulldown...');
  
  // Blue start
  try {
    latPulldownBlueStart = require('../../exercise-images/lat-pulldown/blue/start.png');
    console.log('✅ Loaded lat-pulldown blue start.png');
  } catch (e) {
    console.log('❌ No lat-pulldown blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    latPulldownBlueEnd = require('../../exercise-images/lat-pulldown/blue/end.png');
    console.log('✅ Loaded lat-pulldown blue end.png');
  } catch (e) {
    console.log('❌ No lat-pulldown blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    latPulldownPinkStart = require('../../exercise-images/lat-pulldown/pink/start.png');
    console.log('✅ Loaded lat-pulldown pink start.png');
  } catch (e) {
    console.log('❌ No lat-pulldown pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    latPulldownPinkEnd = require('../../exercise-images/lat-pulldown/pink/end.png');
    console.log('✅ Loaded lat-pulldown pink end.png');
  } catch (e) {
    console.log('❌ No lat-pulldown pink end.png found:', e.message);
  }
  
  // Load barbell row images
  console.log('🏋️ Loading barbell row...');
  
  // Blue start
  try {
    barbellRowBlueStart = require('../../exercise-images/barbell-row/blue/start.png');
    console.log('✅ Loaded barbell-row blue start.png');
  } catch (e) {
    console.log('❌ No barbell-row blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    barbellRowBlueEnd = require('../../exercise-images/barbell-row/blue/end.png');
    console.log('✅ Loaded barbell-row blue end.png');
  } catch (e) {
    console.log('❌ No barbell-row blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    barbellRowPinkStart = require('../../exercise-images/barbell-row/pink/start.png');
    console.log('✅ Loaded barbell-row pink start.png');
  } catch (e) {
    console.log('❌ No barbell-row pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    barbellRowPinkEnd = require('../../exercise-images/barbell-row/pink/end.png');
    console.log('✅ Loaded barbell-row pink end.png');
  } catch (e) {
    console.log('❌ No barbell-row pink end.png found:', e.message);
  }
  
  // Load barbell overhead press images
  console.log('🏋️ Loading barbell overhead press...');
  
  // Blue start
  try {
    barbellOverheadPressBlueStart = require('../../exercise-images/barbell-overhead-press/blue/start.png');
    console.log('✅ Loaded barbell-overhead-press blue start.png');
  } catch (e) {
    console.log('❌ No barbell-overhead-press blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    barbellOverheadPressBlueEnd = require('../../exercise-images/barbell-overhead-press/blue/end.png');
    console.log('✅ Loaded barbell-overhead-press blue end.png');
  } catch (e) {
    console.log('❌ No barbell-overhead-press blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    barbellOverheadPressPinkStart = require('../../exercise-images/barbell-overhead-press/pink/start.png');
    console.log('✅ Loaded barbell-overhead-press pink start.png');
  } catch (e) {
    console.log('❌ No barbell-overhead-press pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    barbellOverheadPressPinkEnd = require('../../exercise-images/barbell-overhead-press/pink/end.png');
    console.log('✅ Loaded barbell-overhead-press pink end.png');
  } catch (e) {
    console.log('❌ No barbell-overhead-press pink end.png found:', e.message);
  }
  
  // Load seated dumbbell shoulder press images
  console.log('🏋️ Loading seated dumbbell shoulder press...');
  
  // Blue start
  try {
    seatedDumbbellShoulderPressBlueStart = require('../../exercise-images/seated-dumbbell-shoulder-press/blue/start.png');
    console.log('✅ Loaded seated-dumbbell-shoulder-press blue start.png');
  } catch (e) {
    console.log('❌ No seated-dumbbell-shoulder-press blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    seatedDumbbellShoulderPressBlueEnd = require('../../exercise-images/seated-dumbbell-shoulder-press/blue/end.png');
    console.log('✅ Loaded seated-dumbbell-shoulder-press blue end.png');
  } catch (e) {
    console.log('❌ No seated-dumbbell-shoulder-press blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    seatedDumbbellShoulderPressPinkStart = require('../../exercise-images/seated-dumbbell-shoulder-press/pink/start.png');
    console.log('✅ Loaded seated-dumbbell-shoulder-press pink start.png');
  } catch (e) {
    console.log('❌ No seated-dumbbell-shoulder-press pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    seatedDumbbellShoulderPressPinkEnd = require('../../exercise-images/seated-dumbbell-shoulder-press/pink/end.png');
    console.log('✅ Loaded seated-dumbbell-shoulder-press pink end.png');
  } catch (e) {
    console.log('❌ No seated-dumbbell-shoulder-press pink end.png found:', e.message);
  }
  
  // Load incline dumbbell bench press images
  console.log('🏋️ Loading incline dumbbell bench press...');
  
  // Blue start
  try {
    inclineDumbbellBenchPressBlueStart = require('../../exercise-images/incline-dumbbell-bench-press/blue/start.png');
    console.log('✅ Loaded incline-dumbbell-bench-press blue start.png');
  } catch (e) {
    console.log('❌ No incline-dumbbell-bench-press blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    inclineDumbbellBenchPressBlueEnd = require('../../exercise-images/incline-dumbbell-bench-press/blue/end.png');
    console.log('✅ Loaded incline-dumbbell-bench-press blue end.png');
  } catch (e) {
    console.log('❌ No incline-dumbbell-bench-press blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    inclineDumbbellBenchPressPinkStart = require('../../exercise-images/incline-dumbbell-bench-press/pink/start.png');
    console.log('✅ Loaded incline-dumbbell-bench-press pink start.png');
  } catch (e) {
    console.log('❌ No incline-dumbbell-bench-press pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    inclineDumbbellBenchPressPinkEnd = require('../../exercise-images/incline-dumbbell-bench-press/pink/end.png');
    console.log('✅ Loaded incline-dumbbell-bench-press pink end.png');
  } catch (e) {
    console.log('❌ No incline-dumbbell-bench-press pink end.png found:', e.message);
  }
  
  // Load dumbbell lateral raise images
  console.log('🏋️ Loading dumbbell lateral raise...');
  
  // Blue start
  try {
    dumbbellLateralRaiseBlueStart = require('../../exercise-images/dumbbell-lateral-raise/blue/start.png');
    console.log('✅ Loaded dumbbell-lateral-raise blue start.png');
  } catch (e) {
    console.log('❌ No dumbbell-lateral-raise blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    dumbbellLateralRaiseBlueEnd = require('../../exercise-images/dumbbell-lateral-raise/blue/end.png');
    console.log('✅ Loaded dumbbell-lateral-raise blue end.png');
  } catch (e) {
    console.log('❌ No dumbbell-lateral-raise blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    dumbbellLateralRaisePinkStart = require('../../exercise-images/dumbbell-lateral-raise/pink/start.png');
    console.log('✅ Loaded dumbbell-lateral-raise pink start.png');
  } catch (e) {
    console.log('❌ No dumbbell-lateral-raise pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    dumbbellLateralRaisePinkEnd = require('../../exercise-images/dumbbell-lateral-raise/pink/end.png');
    console.log('✅ Loaded dumbbell-lateral-raise pink end.png');
  } catch (e) {
    console.log('❌ No dumbbell-lateral-raise pink end.png found:', e.message);
  }
  
  // Load barbell curl images
  console.log('🏋️ Loading barbell curl...');
  
  // Blue start
  try {
    barbellCurlBlueStart = require('../../exercise-images/barbell-curl/blue/start.png');
    console.log('✅ Loaded barbell-curl blue start.png');
  } catch (e) {
    console.log('❌ No barbell-curl blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    barbellCurlBlueEnd = require('../../exercise-images/barbell-curl/blue/end.png');
    console.log('✅ Loaded barbell-curl blue end.png');
  } catch (e) {
    console.log('❌ No barbell-curl blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    barbellCurlPinkStart = require('../../exercise-images/barbell-curl/pink/start.png');
    console.log('✅ Loaded barbell-curl pink start.png');
  } catch (e) {
    console.log('❌ No barbell-curl pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    barbellCurlPinkEnd = require('../../exercise-images/barbell-curl/pink/end.png');
    console.log('✅ Loaded barbell-curl pink end.png');
  } catch (e) {
    console.log('❌ No barbell-curl pink end.png found:', e.message);
  }
  
  // Load dumbbell curl images
  console.log('🏋️ Loading dumbbell curl...');
  
  // Blue start
  try {
    dumbbellCurlBlueStart = require('../../exercise-images/dumbbell-curl/blue/start.png');
    console.log('✅ Loaded dumbbell-curl blue start.png');
  } catch (e) {
    console.log('❌ No dumbbell-curl blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    dumbbellCurlBlueEnd = require('../../exercise-images/dumbbell-curl/blue/end.png');
    console.log('✅ Loaded dumbbell-curl blue end.png');
  } catch (e) {
    console.log('❌ No dumbbell-curl blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    dumbbellCurlPinkStart = require('../../exercise-images/dumbbell-curl/pink/start.png');
    console.log('✅ Loaded dumbbell-curl pink start.png');
  } catch (e) {
    console.log('❌ No dumbbell-curl pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    dumbbellCurlPinkEnd = require('../../exercise-images/dumbbell-curl/pink/end.png');
    console.log('✅ Loaded dumbbell-curl pink end.png');
  } catch (e) {
    console.log('❌ No dumbbell-curl pink end.png found:', e.message);
  }
  
  // Load hammer curl images
  console.log('🏋️ Loading hammer curl...');
  
  // Blue start
  try {
    hammerCurlBlueStart = require('../../exercise-images/hammer-curl/blue/start.png');
    console.log('✅ Loaded hammer-curl blue start.png');
  } catch (e) {
    console.log('❌ No hammer-curl blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    hammerCurlBlueEnd = require('../../exercise-images/hammer-curl/blue/end.png');
    console.log('✅ Loaded hammer-curl blue end.png');
  } catch (e) {
    console.log('❌ No hammer-curl blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    hammerCurlPinkStart = require('../../exercise-images/hammer-curl/pink/start.png');
    console.log('✅ Loaded hammer-curl pink start.png');
  } catch (e) {
    console.log('❌ No hammer-curl pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    hammerCurlPinkEnd = require('../../exercise-images/hammer-curl/pink/end.png');
    console.log('✅ Loaded hammer-curl pink end.png');
  } catch (e) {
    console.log('❌ No hammer-curl pink end.png found:', e.message);
  }
  
  // Load triceps pushdown images
  console.log('🏋️ Loading triceps pushdown...');
  
  // Blue start
  try {
    tricepsPushdownBlueStart = require('../../exercise-images/triceps-pushdown/blue/start.png');
    console.log('✅ Loaded triceps-pushdown blue start.png');
  } catch (e) {
    console.log('❌ No triceps-pushdown blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    tricepsPushdownBlueEnd = require('../../exercise-images/triceps-pushdown/blue/end.png');
    console.log('✅ Loaded triceps-pushdown blue end.png');
  } catch (e) {
    console.log('❌ No triceps-pushdown blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    tricepsPushdownPinkStart = require('../../exercise-images/triceps-pushdown/pink/start.png');
    console.log('✅ Loaded triceps-pushdown pink start.png');
  } catch (e) {
    console.log('❌ No triceps-pushdown pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    tricepsPushdownPinkEnd = require('../../exercise-images/triceps-pushdown/pink/end.png');
    console.log('✅ Loaded triceps-pushdown pink end.png');
  } catch (e) {
    console.log('❌ No triceps-pushdown pink end.png found:', e.message);
  }
  
  // Load rope triceps pushdown images
  console.log('🏋️ Loading rope triceps pushdown...');
  
  // Blue start
  try {
    ropeTricepsPushdownBlueStart = require('../../exercise-images/rope-triceps-pushdown/blue/start.png');
    console.log('✅ Loaded rope-triceps-pushdown blue start.png');
  } catch (e) {
    console.log('❌ No rope-triceps-pushdown blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    ropeTricepsPushdownBlueEnd = require('../../exercise-images/rope-triceps-pushdown/blue/end.png');
    console.log('✅ Loaded rope-triceps-pushdown blue end.png');
  } catch (e) {
    console.log('❌ No rope-triceps-pushdown blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    ropeTricepsPushdownPinkStart = require('../../exercise-images/rope-triceps-pushdown/pink/start.png');
    console.log('✅ Loaded rope-triceps-pushdown pink start.png');
  } catch (e) {
    console.log('❌ No rope-triceps-pushdown pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    ropeTricepsPushdownPinkEnd = require('../../exercise-images/rope-triceps-pushdown/pink/end.png');
    console.log('✅ Loaded rope-triceps-pushdown pink end.png');
  } catch (e) {
    console.log('❌ No rope-triceps-pushdown pink end.png found:', e.message);
  }
  
  // Load leg press images
  console.log('🏋️ Loading leg press...');
  
  // Blue start
  try {
    legPressBlueStart = require('../../exercise-images/leg-press/blue/start.png');
    console.log('✅ Loaded leg-press blue start.png');
  } catch (e) {
    console.log('❌ No leg-press blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    legPressBlueEnd = require('../../exercise-images/leg-press/blue/end.png');
    console.log('✅ Loaded leg-press blue end.png');
  } catch (e) {
    console.log('❌ No leg-press blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    legPressPinkStart = require('../../exercise-images/leg-press/pink/start.png');
    console.log('✅ Loaded leg-press pink start.png');
  } catch (e) {
    console.log('❌ No leg-press pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    legPressPinkEnd = require('../../exercise-images/leg-press/pink/end.png');
    console.log('✅ Loaded leg-press pink end.png');
  } catch (e) {
    console.log('❌ No leg-press pink end.png found:', e.message);
  }
  
  // Load leg extension images
  console.log('🏋️ Loading leg extension...');
  
  // Blue start
  try {
    legExtensionBlueStart = require('../../exercise-images/leg-extension/blue/start.png');
    console.log('✅ Loaded leg-extension blue start.png');
  } catch (e) {
    console.log('❌ No leg-extension blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    legExtensionBlueEnd = require('../../exercise-images/leg-extension/blue/end.png');
    console.log('✅ Loaded leg-extension blue end.png');
  } catch (e) {
    console.log('❌ No leg-extension blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    legExtensionPinkStart = require('../../exercise-images/leg-extension/pink/start.png');
    console.log('✅ Loaded leg-extension pink start.png');
  } catch (e) {
    console.log('❌ No leg-extension pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    legExtensionPinkEnd = require('../../exercise-images/leg-extension/pink/end.png');
    console.log('✅ Loaded leg-extension pink end.png');
  } catch (e) {
    console.log('❌ No leg-extension pink end.png found:', e.message);
  }
  
  // Load lying leg curl images
  console.log('🏋️ Loading lying leg curl...');
  
  // Blue start
  try {
    lyingLegCurlBlueStart = require('../../exercise-images/lying-leg-curl/blue/start.png');
    console.log('✅ Loaded lying-leg-curl blue start.png');
  } catch (e) {
    console.log('❌ No lying-leg-curl blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    lyingLegCurlBlueEnd = require('../../exercise-images/lying-leg-curl/blue/end.png');
    console.log('✅ Loaded lying-leg-curl blue end.png');
  } catch (e) {
    console.log('❌ No lying-leg-curl blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    lyingLegCurlPinkStart = require('../../exercise-images/lying-leg-curl/pink/start.png');
    console.log('✅ Loaded lying-leg-curl pink start.png');
  } catch (e) {
    console.log('❌ No lying-leg-curl pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    lyingLegCurlPinkEnd = require('../../exercise-images/lying-leg-curl/pink/end.png');
    console.log('✅ Loaded lying-leg-curl pink end.png');
  } catch (e) {
    console.log('❌ No lying-leg-curl pink end.png found:', e.message);
  }
  
  // Load standing calf raise images
  console.log('🏋️ Loading standing calf raise...');
  
  // Blue start
  try {
    standingCalfRaiseBlueStart = require('../../exercise-images/standing-calf-raise/blue/start.png');
    console.log('✅ Loaded standing-calf-raise blue start.png');
  } catch (e) {
    console.log('❌ No standing-calf-raise blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    standingCalfRaiseBlueEnd = require('../../exercise-images/standing-calf-raise/blue/end.png');
    console.log('✅ Loaded standing-calf-raise blue end.png');
  } catch (e) {
    console.log('❌ No standing-calf-raise blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    standingCalfRaisePinkStart = require('../../exercise-images/standing-calf-raise/pink/start.png');
    console.log('✅ Loaded standing-calf-raise pink start.png');
  } catch (e) {
    console.log('❌ No standing-calf-raise pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    standingCalfRaisePinkEnd = require('../../exercise-images/standing-calf-raise/pink/end.png');
    console.log('✅ Loaded standing-calf-raise pink end.png');
  } catch (e) {
    console.log('❌ No standing-calf-raise pink end.png found:', e.message);
  }
  
  // Load dumbbell bench press images
  console.log('🏋️ Loading dumbbell bench press...');
  
  // Blue start
  try {
    dumbbellBenchPressBlueStart = require('../../exercise-images/dumbbell-bench-press/blue/start.png');
    console.log('✅ Loaded dumbbell-bench-press blue start.png');
  } catch (e) {
    console.log('❌ No dumbbell-bench-press blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    dumbbellBenchPressBlueEnd = require('../../exercise-images/dumbbell-bench-press/blue/end.png');
    console.log('✅ Loaded dumbbell-bench-press blue end.png');
  } catch (e) {
    console.log('❌ No dumbbell-bench-press blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    dumbbellBenchPressPinkStart = require('../../exercise-images/dumbbell-bench-press/pink/start.png');
    console.log('✅ Loaded dumbbell-bench-press pink start.png');
  } catch (e) {
    console.log('❌ No dumbbell-bench-press pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    dumbbellBenchPressPinkEnd = require('../../exercise-images/dumbbell-bench-press/pink/end.png');
    console.log('✅ Loaded dumbbell-bench-press pink end.png');
  } catch (e) {
    console.log('❌ No dumbbell-bench-press pink end.png found:', e.message);
  }
  
  // Load incline barbell bench press images
  console.log('🏋️ Loading incline barbell bench press...');
  
  // Blue start
  try {
    inclineBarbellBenchPressBlueStart = require('../../exercise-images/incline-barbell-bench-press/blue/start.png');
    console.log('✅ Loaded incline-barbell-bench-press blue start.png');
  } catch (e) {
    console.log('❌ No incline-barbell-bench-press blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    inclineBarbellBenchPressBlueEnd = require('../../exercise-images/incline-barbell-bench-press/blue/end.png');
    console.log('✅ Loaded incline-barbell-bench-press blue end.png');
  } catch (e) {
    console.log('❌ No incline-barbell-bench-press blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    inclineBarbellBenchPressPinkStart = require('../../exercise-images/incline-barbell-bench-press/pink/start.png');
    console.log('✅ Loaded incline-barbell-bench-press pink start.png');
  } catch (e) {
    console.log('❌ No incline-barbell-bench-press pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    inclineBarbellBenchPressPinkEnd = require('../../exercise-images/incline-barbell-bench-press/pink/end.png');
    console.log('✅ Loaded incline-barbell-bench-press pink end.png');
  } catch (e) {
    console.log('❌ No incline-barbell-bench-press pink end.png found:', e.message);
  }
  
  // Load machine chest press images
  console.log('🏋️ Loading machine chest press...');
  
  // Blue start
  try {
    machineChestPressBlueStart = require('../../exercise-images/machine-chest-press/blue/start.png');
    console.log('✅ Loaded machine-chest-press blue start.png');
  } catch (e) {
    console.log('❌ No machine-chest-press blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    machineChestPressBlueEnd = require('../../exercise-images/machine-chest-press/blue/end.png');
    console.log('✅ Loaded machine-chest-press blue end.png');
  } catch (e) {
    console.log('❌ No machine-chest-press blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    machineChestPressPinkStart = require('../../exercise-images/machine-chest-press/pink/start.png');
    console.log('✅ Loaded machine-chest-press pink start.png');
  } catch (e) {
    console.log('❌ No machine-chest-press pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    machineChestPressPinkEnd = require('../../exercise-images/machine-chest-press/pink/end.png');
    console.log('✅ Loaded machine-chest-press pink end.png');
  } catch (e) {
    console.log('❌ No machine-chest-press pink end.png found:', e.message);
  }
  
  // Load cable crossover images
  console.log('🏋️ Loading cable crossover...');
  
  // Blue start
  try {
    cableCrossoverBlueStart = require('../../exercise-images/cable-crossover/blue/start.png');
    console.log('✅ Loaded cable-crossover blue start.png');
  } catch (e) {
    console.log('❌ No cable-crossover blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    cableCrossoverBlueEnd = require('../../exercise-images/cable-crossover/blue/end.png');
    console.log('✅ Loaded cable-crossover blue end.png');
  } catch (e) {
    console.log('❌ No cable-crossover blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    cableCrossoverPinkStart = require('../../exercise-images/cable-crossover/pink/start.png');
    console.log('✅ Loaded cable-crossover pink start.png');
  } catch (e) {
    console.log('❌ No cable-crossover pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    cableCrossoverPinkEnd = require('../../exercise-images/cable-crossover/pink/end.png');
    console.log('✅ Loaded cable-crossover pink end.png');
  } catch (e) {
    console.log('❌ No cable-crossover pink end.png found:', e.message);
  }
  
  console.log('✅ Finished loading all images:', { 
    benchPress: { blue: { barbellBenchPressBlueStart, barbellBenchPressBlueEnd }, pink: { barbellBenchPressPinkStart, barbellBenchPressPinkEnd } },
    backSquat: { blue: { barbellBackSquatBlueStart, barbellBackSquatBlueEnd }, pink: { barbellBackSquatPinkStart, barbellBackSquatPinkEnd } },
    romanianDeadlift: { blue: { romanianDeadliftBlueStart, romanianDeadliftBlueEnd }, pink: { romanianDeadliftPinkStart, romanianDeadliftPinkEnd } },
    pullUp: { blue: { pullUpBlueStart, pullUpBlueEnd }, pink: { pullUpPinkStart, pullUpPinkEnd } },
    conventionalDeadlift: { blue: { conventionalDeadliftBlueStart, conventionalDeadliftBlueEnd }, pink: { conventionalDeadliftPinkStart, conventionalDeadliftPinkEnd } },
    latPulldown: { blue: { latPulldownBlueStart, latPulldownBlueEnd }, pink: { latPulldownPinkStart, latPulldownPinkEnd } },
    barbellRow: { blue: { barbellRowBlueStart, barbellRowBlueEnd }, pink: { barbellRowPinkStart, barbellRowPinkEnd } },
    barbellOverheadPress: { blue: { barbellOverheadPressBlueStart, barbellOverheadPressBlueEnd }, pink: { barbellOverheadPressPinkStart, barbellOverheadPressPinkEnd } },
    seatedDumbbellShoulderPress: { blue: { seatedDumbbellShoulderPressBlueStart, seatedDumbbellShoulderPressBlueEnd }, pink: { seatedDumbbellShoulderPressPinkStart, seatedDumbbellShoulderPressPinkEnd } },
    inclineDumbbellBenchPress: { blue: { inclineDumbbellBenchPressBlueStart, inclineDumbbellBenchPressBlueEnd }, pink: { inclineDumbbellBenchPressPinkStart, inclineDumbbellBenchPressPinkEnd } },
    dumbbellLateralRaise: { blue: { dumbbellLateralRaiseBlueStart, dumbbellLateralRaiseBlueEnd }, pink: { dumbbellLateralRaisePinkStart, dumbbellLateralRaisePinkEnd } },
    barbellCurl: { blue: { barbellCurlBlueStart, barbellCurlBlueEnd }, pink: { barbellCurlPinkStart, barbellCurlPinkEnd } },
    dumbbellCurl: { blue: { dumbbellCurlBlueStart, dumbbellCurlBlueEnd }, pink: { dumbbellCurlPinkStart, dumbbellCurlPinkEnd } },
    hammerCurl: { blue: { hammerCurlBlueStart, hammerCurlBlueEnd }, pink: { hammerCurlPinkStart, hammerCurlPinkEnd } },
    tricepsPushdown: { blue: { tricepsPushdownBlueStart, tricepsPushdownBlueEnd }, pink: { tricepsPushdownPinkStart, tricepsPushdownPinkEnd } },
    ropeTricepsPushdown: { blue: { ropeTricepsPushdownBlueStart, ropeTricepsPushdownBlueEnd }, pink: { ropeTricepsPushdownPinkStart, ropeTricepsPushdownPinkEnd } },
    legPress: { blue: { legPressBlueStart, legPressBlueEnd }, pink: { legPressPinkStart, legPressPinkEnd } },
    legExtension: { blue: { legExtensionBlueStart, legExtensionBlueEnd }, pink: { legExtensionPinkStart, legExtensionPinkEnd } },
    lyingLegCurl: { blue: { lyingLegCurlBlueStart, lyingLegCurlBlueEnd }, pink: { lyingLegCurlPinkStart, lyingLegCurlPinkEnd } },
    standingCalfRaise: { blue: { standingCalfRaiseBlueStart, standingCalfRaiseBlueEnd }, pink: { standingCalfRaisePinkStart, standingCalfRaisePinkEnd } },
    dumbbellBenchPress: { blue: { dumbbellBenchPressBlueStart, dumbbellBenchPressBlueEnd }, pink: { dumbbellBenchPressPinkStart, dumbbellBenchPressPinkEnd } },
    inclineBarbellBenchPress: { blue: { inclineBarbellBenchPressBlueStart, inclineBarbellBenchPressBlueEnd }, pink: { inclineBarbellBenchPressPinkStart, inclineBarbellBenchPressPinkEnd } },
    machineChestPress: { blue: { machineChestPressBlueStart, machineChestPressBlueEnd }, pink: { machineChestPressPinkStart, machineChestPressPinkEnd } },
    cableCrossover: { blue: { cableCrossoverBlueStart, cableCrossoverBlueEnd }, pink: { cableCrossoverPinkStart, cableCrossoverPinkEnd } }
  });
  
  EXERCISE_IMAGE_MAP = {
    'barbell-bench-press': {
      blue: {
        start: barbellBenchPressBlueStart,
        end: barbellBenchPressBlueEnd,
      },
      pink: {
        start: barbellBenchPressPinkStart,
        end: barbellBenchPressPinkEnd,
      }
    },
    'barbell-back-squat': {
      blue: {
        start: barbellBackSquatBlueStart,
        end: barbellBackSquatBlueEnd,
      },
      pink: {
        start: barbellBackSquatPinkStart,
        end: barbellBackSquatPinkEnd,
      }
    },
    'romanian-deadlift': {
      blue: {
        start: romanianDeadliftBlueStart,
        end: romanianDeadliftBlueEnd,
      },
      pink: {
        start: romanianDeadliftPinkStart,
        end: romanianDeadliftPinkEnd,
      }
    },
    'pull-up': {
      blue: {
        start: pullUpBlueStart,
        end: pullUpBlueEnd,
      },
      pink: {
        start: pullUpPinkStart,
        end: pullUpPinkEnd,
      }
    },
    'conventional-deadlift': {
      blue: {
        start: conventionalDeadliftBlueStart,
        end: conventionalDeadliftBlueEnd,
      },
      pink: {
        start: conventionalDeadliftPinkStart,
        end: conventionalDeadliftPinkEnd,
      }
    },
    'lat-pulldown': {
      blue: {
        start: latPulldownBlueStart,
        end: latPulldownBlueEnd,
      },
      pink: {
        start: latPulldownPinkStart,
        end: latPulldownPinkEnd,
      }
    },
    'barbell-row': {
      blue: {
        start: barbellRowBlueStart,
        end: barbellRowBlueEnd,
      },
      pink: {
        start: barbellRowPinkStart,
        end: barbellRowPinkEnd,
      }
    },
    'barbell-overhead-press': {
      blue: {
        start: barbellOverheadPressBlueStart,
        end: barbellOverheadPressBlueEnd,
      },
      pink: {
        start: barbellOverheadPressPinkStart,
        end: barbellOverheadPressPinkEnd,
      }
    },
    'seated-dumbbell-shoulder-press': {
      blue: {
        start: seatedDumbbellShoulderPressBlueStart,
        end: seatedDumbbellShoulderPressBlueEnd,
      },
      pink: {
        start: seatedDumbbellShoulderPressPinkStart,
        end: seatedDumbbellShoulderPressPinkEnd,
      }
    },
    'incline-dumbbell-bench-press': {
      blue: {
        start: inclineDumbbellBenchPressBlueStart,
        end: inclineDumbbellBenchPressBlueEnd,
      },
      pink: {
        start: inclineDumbbellBenchPressPinkStart,
        end: inclineDumbbellBenchPressPinkEnd,
      }
    },
    'dumbbell-lateral-raise': {
      blue: {
        start: dumbbellLateralRaiseBlueStart,
        end: dumbbellLateralRaiseBlueEnd,
      },
      pink: {
        start: dumbbellLateralRaisePinkStart,
        end: dumbbellLateralRaisePinkEnd,
      }
    },
    'barbell-curl': {
      blue: {
        start: barbellCurlBlueStart,
        end: barbellCurlBlueEnd,
      },
      pink: {
        start: barbellCurlPinkStart,
        end: barbellCurlPinkEnd,
      }
    },
    'dumbbell-curl': {
      blue: {
        start: dumbbellCurlBlueStart,
        end: dumbbellCurlBlueEnd,
      },
      pink: {
        start: dumbbellCurlPinkStart,
        end: dumbbellCurlPinkEnd,
      }
    },
    'hammer-curl': {
      blue: {
        start: hammerCurlBlueStart,
        end: hammerCurlBlueEnd,
      },
      pink: {
        start: hammerCurlPinkStart,
        end: hammerCurlPinkEnd,
      }
    },
    'triceps-pushdown': {
      blue: {
        start: tricepsPushdownBlueStart,
        end: tricepsPushdownBlueEnd,
      },
      pink: {
        start: tricepsPushdownPinkStart,
        end: tricepsPushdownPinkEnd,
      }
    },
    'rope-triceps-pushdown': {
      blue: {
        start: ropeTricepsPushdownBlueStart,
        end: ropeTricepsPushdownBlueEnd,
      },
      pink: {
        start: ropeTricepsPushdownPinkStart,
        end: ropeTricepsPushdownPinkEnd,
      }
    },
    'leg-press': {
      blue: {
        start: legPressBlueStart,
        end: legPressBlueEnd,
      },
      pink: {
        start: legPressPinkStart,
        end: legPressPinkEnd,
      }
    },
    'leg-extension': {
      blue: {
        start: legExtensionBlueStart,
        end: legExtensionBlueEnd,
      },
      pink: {
        start: legExtensionPinkStart,
        end: legExtensionPinkEnd,
      }
    },
    'lying-leg-curl': {
      blue: {
        start: lyingLegCurlBlueStart,
        end: lyingLegCurlBlueEnd,
      },
      pink: {
        start: lyingLegCurlPinkStart,
        end: lyingLegCurlPinkEnd,
      }
    },
    'standing-calf-raise': {
      blue: {
        start: standingCalfRaiseBlueStart,
        end: standingCalfRaiseBlueEnd,
      },
      pink: {
        start: standingCalfRaisePinkStart,
        end: standingCalfRaisePinkEnd,
      }
    },
    'dumbbell-bench-press': {
      blue: {
        start: dumbbellBenchPressBlueStart,
        end: dumbbellBenchPressBlueEnd,
      },
      pink: {
        start: dumbbellBenchPressPinkStart,
        end: dumbbellBenchPressPinkEnd,
      }
    },
    'incline-barbell-bench-press': {
      blue: {
        start: inclineBarbellBenchPressBlueStart,
        end: inclineBarbellBenchPressBlueEnd,
      },
      pink: {
        start: inclineBarbellBenchPressPinkStart,
        end: inclineBarbellBenchPressPinkEnd,
      }
    },
    'machine-chest-press': {
      blue: {
        start: machineChestPressBlueStart,
        end: machineChestPressBlueEnd,
      },
      pink: {
        start: machineChestPressPinkStart,
        end: machineChestPressPinkEnd,
      }
    },
    'cable-crossover': {
      blue: {
        start: cableCrossoverBlueStart,
        end: cableCrossoverBlueEnd,
      },
      pink: {
        start: cableCrossoverPinkStart,
        end: cableCrossoverPinkEnd,
      }
    },
    // Add more exercises here as you create them
  };
  
  console.log('✅ EXERCISE_IMAGE_MAP loaded successfully:', Object.keys(EXERCISE_IMAGE_MAP));
  console.log('✅ Sample image data:', EXERCISE_IMAGE_MAP['barbell-bench-press']);
  
} catch (error) {
  console.log('❌ ERROR loading images:', error);
  console.log('❌ Error message:', error?.message);
  console.log('❌ Error stack:', error?.stack);
  EXERCISE_IMAGE_MAP = {};
}

/**
 * Resolve exercise image path for React Native
 * Returns the start position image for the blue theme by default
 */
export async function resolveExerciseImage(exercise: { exercise?: string; name?: string }): Promise<string | null> {
  console.log('🔍 RESOLVE_IMAGE: Function called with exercise:', exercise);
  
  const exerciseName = exercise.exercise || exercise.name || '';
  if (!exerciseName) {
    console.log('❌ RESOLVE_IMAGE: No exercise name provided');
    return null;
  }
  
  const folderName = exerciseNameToFolder(exerciseName);
  console.log(`🔍 RESOLVE_IMAGE: Looking for image for exercise: "${exerciseName}" -> folder: "${folderName}"`);
  console.log('🔍 RESOLVE_IMAGE: Available exercises in map:', Object.keys(EXERCISE_IMAGE_MAP));
  console.log('🔍 RESOLVE_IMAGE: Map for barbell-bench-press:', EXERCISE_IMAGE_MAP['barbell-bench-press']);
  
  try {
    // Check if exercise exists in our static mapping
    if (EXERCISE_IMAGE_MAP[folderName]?.blue?.start) {
      const imageAsset = EXERCISE_IMAGE_MAP[folderName].blue.start;
      console.log(`✅ RESOLVE_IMAGE: Found image asset for ${exerciseName}:`, imageAsset);
      return imageAsset;
    }
    
    console.log(`❌ RESOLVE_IMAGE: No image found for ${exerciseName} (${folderName})`);
    console.log(`❌ RESOLVE_IMAGE: Checked path: EXERCISE_IMAGE_MAP["${folderName}"]?.blue?.start`);
    return null;
  } catch (error) {
    console.log(`❌ RESOLVE_IMAGE: Error loading image for ${exerciseName}:`, error);
    return null;
  }
}

// Nothing here - removed the problematic dynamic loading

/**
 * Get both start and end images for an exercise with theme support
 * Returns {start: imageAsset, end: imageAsset} or null if not found
 * NOW AUTOMATICALLY TRIES TO FIND IMAGES FOR ANY EXERCISE!
 */
export async function resolveExerciseImagePair(
  exercise: { exercise?: string; name?: string }, 
  theme: 'blue' | 'pink' = 'blue'
): Promise<{start: any, end: any} | null> {
  console.log('🔍 RESOLVE_IMAGE_PAIR: Function called with exercise:', exercise, 'theme:', theme);
  
  const exerciseName = exercise.exercise || exercise.name || '';
  if (!exerciseName) {
    console.log('❌ RESOLVE_IMAGE_PAIR: No exercise name provided');
    return null;
  }
  
  const folderName = exerciseNameToFolder(exerciseName);
  console.log(`🔍 RESOLVE_IMAGE_PAIR: Looking for ${theme} images for exercise: "${exerciseName}" -> folder: "${folderName}"`);
  
  try {
    // First, check if exercise exists in our static mapping
    if (EXERCISE_IMAGE_MAP[folderName]?.[theme]?.start && EXERCISE_IMAGE_MAP[folderName]?.[theme]?.end) {
      const startImage = EXERCISE_IMAGE_MAP[folderName][theme].start;
      const endImage = EXERCISE_IMAGE_MAP[folderName][theme].end;
      console.log(`✅ RESOLVE_IMAGE_PAIR: Found ${theme} images in static map for ${exerciseName}`);
      return { start: startImage, end: endImage };
    }
    
    // If not in static map, no images available
    console.log(`❌ RESOLVE_IMAGE_PAIR: ${exerciseName} not found in static map - need to add manually`);
    console.log(`💡 RESOLVE_IMAGE_PAIR: Add "${folderName}" to EXERCISE_IMAGE_MAP to support this exercise`);
    
    console.log(`❌ RESOLVE_IMAGE_PAIR: No ${theme} image pair found for ${exerciseName} (${folderName})`);
    return null;
  } catch (error) {
    console.log(`❌ RESOLVE_IMAGE_PAIR: Error loading ${theme} images for ${exerciseName}:`, error);
    return null;
  }
}