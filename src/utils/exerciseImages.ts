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

// Pec deck fly images
let pecDeckFlyBlueStart: any = null;
let pecDeckFlyBlueEnd: any = null;
let pecDeckFlyPinkStart: any = null;
let pecDeckFlyPinkEnd: any = null;

// Weighted pull-up images
let weightedPullUpBlueStart: any = null;
let weightedPullUpBlueEnd: any = null;
let weightedPullUpPinkStart: any = null;
let weightedPullUpPinkEnd: any = null;

// Chin-up images
let chinUpBlueStart: any = null;
let chinUpBlueEnd: any = null;
let chinUpPinkStart: any = null;
let chinUpPinkEnd: any = null;

// Seated cable row images
let seatedCableRowBlueStart: any = null;
let seatedCableRowBlueEnd: any = null;
let seatedCableRowPinkStart: any = null;
let seatedCableRowPinkEnd: any = null;

// Chest-supported T-bar row images
let chestSupportedTBarRowBlueStart: any = null;
let chestSupportedTBarRowBlueEnd: any = null;
let chestSupportedTBarRowPinkStart: any = null;
let chestSupportedTBarRowPinkEnd: any = null;

// T-bar row images
let tBarRowBlueStart: any = null;
let tBarRowBlueEnd: any = null;
let tBarRowPinkStart: any = null;
let tBarRowPinkEnd: any = null;

// Chest-supported dumbbell row images
let chestSupportedDumbbellRowBlueStart: any = null;
let chestSupportedDumbbellRowBlueEnd: any = null;
let chestSupportedDumbbellRowPinkStart: any = null;
let chestSupportedDumbbellRowPinkEnd: any = null;

// Single-arm dumbbell row images
let singleArmDumbbellRowBlueStart: any = null;
let singleArmDumbbellRowBlueEnd: any = null;
let singleArmDumbbellRowPinkStart: any = null;
let singleArmDumbbellRowPinkEnd: any = null;

// Seated barbell overhead press images
let seatedBarbellOverheadPressBlueStart: any = null;
let seatedBarbellOverheadPressBlueEnd: any = null;
let seatedBarbellOverheadPressPinkStart: any = null;
let seatedBarbellOverheadPressPinkEnd: any = null;

// Machine shoulder press images
let machineShoulderPressBlueStart: any = null;
let machineShoulderPressBlueEnd: any = null;
let machineShoulderPressPinkStart: any = null;
let machineShoulderPressPinkEnd: any = null;

// Cable lateral raise images
let cableLateralRaiseBlueStart: any = null;
let cableLateralRaiseBlueEnd: any = null;
let cableLateralRaisePinkStart: any = null;
let cableLateralRaisePinkEnd: any = null;

// Face pull images
let facePullBlueStart: any = null;
let facePullBlueEnd: any = null;
let facePullPinkStart: any = null;
let facePullPinkEnd: any = null;

// Reverse pec deck images
let reversePecDeckBlueStart: any = null;
let reversePecDeckBlueEnd: any = null;
let reversePecDeckPinkStart: any = null;
let reversePecDeckPinkEnd: any = null;

// EZ-bar curl images
let ezBarCurlBlueStart: any = null;
let ezBarCurlBlueEnd: any = null;
let ezBarCurlPinkStart: any = null;
let ezBarCurlPinkEnd: any = null;

// Preacher curl images
let preacherCurlBlueStart: any = null;
let preacherCurlBlueEnd: any = null;
let preacherCurlPinkStart: any = null;
let preacherCurlPinkEnd: any = null;

// Cable curl images
let cableCurlBlueStart: any = null;
let cableCurlBlueEnd: any = null;
let cableCurlPinkStart: any = null;
let cableCurlPinkEnd: any = null;

// Incline dumbbell curl images
let inclineDumbbellCurlBlueStart: any = null;
let inclineDumbbellCurlBlueEnd: any = null;
let inclineDumbbellCurlPinkStart: any = null;
let inclineDumbbellCurlPinkEnd: any = null;

// Overhead cable triceps extension images
let overheadCableTricepsExtensionBlueStart: any = null;
let overheadCableTricepsExtensionBlueEnd: any = null;
let overheadCableTricepsExtensionPinkStart: any = null;
let overheadCableTricepsExtensionPinkEnd: any = null;

// Overhead dumbbell triceps extension images
let overheadDumbbellTricepsExtensionBlueStart: any = null;
let overheadDumbbellTricepsExtensionBlueEnd: any = null;
let overheadDumbbellTricepsExtensionPinkStart: any = null;
let overheadDumbbellTricepsExtensionPinkEnd: any = null;

// EZ-bar skullcrusher images
let ezBarSkullcrusherBlueStart: any = null;
let ezBarSkullcrusherBlueEnd: any = null;
let ezBarSkullcrusherPinkStart: any = null;
let ezBarSkullcrusherPinkEnd: any = null;

// Close grip bench press images
let closeGripBenchPressBlueStart: any = null;
let closeGripBenchPressBlueEnd: any = null;
let closeGripBenchPressPinkStart: any = null;
let closeGripBenchPressPinkEnd: any = null;

// Dips chest focus images
let dipsChestFocusBlueStart: any = null;
let dipsChestFocusBlueEnd: any = null;
let dipsChestFocusPinkStart: any = null;
let dipsChestFocusPinkEnd: any = null;

// Hack squat images
let hackSquatBlueStart: any = null;
let hackSquatBlueEnd: any = null;
let hackSquatPinkStart: any = null;
let hackSquatPinkEnd: any = null;

// Bulgarian split squat images
let bulgarianSplitSquatBlueStart: any = null;
let bulgarianSplitSquatBlueEnd: any = null;
let bulgarianSplitSquatPinkStart: any = null;
let bulgarianSplitSquatPinkEnd: any = null;

// Barbell front squat images
let barbellFrontSquatBlueStart: any = null;
let barbellFrontSquatBlueEnd: any = null;
let barbellFrontSquatPinkStart: any = null;
let barbellFrontSquatPinkEnd: any = null;

// Walking lunge images
let walkingLungeBlueStart: any = null;
let walkingLungeBlueEnd: any = null;
let walkingLungePinkStart: any = null;
let walkingLungePinkEnd: any = null;

// Barbell hip thrust images
let barbellHipThrustBlueStart: any = null;
let barbellHipThrustBlueEnd: any = null;
let barbellHipThrustPinkStart: any = null;
let barbellHipThrustPinkEnd: any = null;

// Seated calf raise images
let seatedCalfRaiseBlueStart: any = null;
let seatedCalfRaiseBlueEnd: any = null;
let seatedCalfRaisePinkStart: any = null;
let seatedCalfRaisePinkEnd: any = null;

// Back extension images
let backExtensionBlueStart: any = null;
let backExtensionBlueEnd: any = null;
let backExtensionPinkStart: any = null;
let backExtensionPinkEnd: any = null;

// Hanging leg raise images
let hangingLegRaiseBlueStart: any = null;
let hangingLegRaiseBlueEnd: any = null;
let hangingLegRaisePinkStart: any = null;
let hangingLegRaisePinkEnd: any = null;

// Smith machine calf raise images
let smithMachineCalfRaiseBlueStart: any = null;
let smithMachineCalfRaiseBlueEnd: any = null;
let smithMachineCalfRaisePinkStart: any = null;
let smithMachineCalfRaisePinkEnd: any = null;

// Dumbbell wrist curl images
let dumbbellWristCurlBlueStart: any = null;
let dumbbellWristCurlBlueEnd: any = null;
let dumbbellWristCurlPinkStart: any = null;
let dumbbellWristCurlPinkEnd: any = null;

// Reverse wrist curl images
let reverseWristCurlBlueStart: any = null;
let reverseWristCurlBlueEnd: any = null;
let reverseWristCurlPinkStart: any = null;
let reverseWristCurlPinkEnd: any = null;

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
  
  // Load pec deck fly images
  console.log('🏋️ Loading pec deck fly...');
  
  // Blue start
  try {
    pecDeckFlyBlueStart = require('../../exercise-images/pec-deck-fly/blue/start.png');
    console.log('✅ Loaded pec-deck-fly blue start.png');
  } catch (e) {
    console.log('❌ No pec-deck-fly blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    pecDeckFlyBlueEnd = require('../../exercise-images/pec-deck-fly/blue/end.png');
    console.log('✅ Loaded pec-deck-fly blue end.png');
  } catch (e) {
    console.log('❌ No pec-deck-fly blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    pecDeckFlyPinkStart = require('../../exercise-images/pec-deck-fly/pink/start.png');
    console.log('✅ Loaded pec-deck-fly pink start.png');
  } catch (e) {
    console.log('❌ No pec-deck-fly pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    pecDeckFlyPinkEnd = require('../../exercise-images/pec-deck-fly/pink/end.png');
    console.log('✅ Loaded pec-deck-fly pink end.png');
  } catch (e) {
    console.log('❌ No pec-deck-fly pink end.png found:', e.message);
  }
  
  // Load weighted pull-up images
  console.log('🏋️ Loading weighted pull-up...');
  
  // Blue start
  try {
    weightedPullUpBlueStart = require('../../exercise-images/weighted-pull-up/blue/start.png');
    console.log('✅ Loaded weighted-pull-up blue start.png');
  } catch (e) {
    console.log('❌ No weighted-pull-up blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    weightedPullUpBlueEnd = require('../../exercise-images/weighted-pull-up/blue/end.png');
    console.log('✅ Loaded weighted-pull-up blue end.png');
  } catch (e) {
    console.log('❌ No weighted-pull-up blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    weightedPullUpPinkStart = require('../../exercise-images/weighted-pull-up/pink/start.png');
    console.log('✅ Loaded weighted-pull-up pink start.png');
  } catch (e) {
    console.log('❌ No weighted-pull-up pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    weightedPullUpPinkEnd = require('../../exercise-images/weighted-pull-up/pink/end.png');
    console.log('✅ Loaded weighted-pull-up pink end.png');
  } catch (e) {
    console.log('❌ No weighted-pull-up pink end.png found:', e.message);
  }
  
  // Load chin-up images
  console.log('🏋️ Loading chin-up...');
  
  // Blue start
  try {
    chinUpBlueStart = require('../../exercise-images/chin-up/blue/start.png');
    console.log('✅ Loaded chin-up blue start.png');
  } catch (e) {
    console.log('❌ No chin-up blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    chinUpBlueEnd = require('../../exercise-images/chin-up/blue/end.png');
    console.log('✅ Loaded chin-up blue end.png');
  } catch (e) {
    console.log('❌ No chin-up blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    chinUpPinkStart = require('../../exercise-images/chin-up/pink/start.png');
    console.log('✅ Loaded chin-up pink start.png');
  } catch (e) {
    console.log('❌ No chin-up pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    chinUpPinkEnd = require('../../exercise-images/chin-up/pink/end.png');
    console.log('✅ Loaded chin-up pink end.png');
  } catch (e) {
    console.log('❌ No chin-up pink end.png found:', e.message);
  }
  
  // Load seated cable row images
  console.log('🏋️ Loading seated cable row...');
  
  // Blue start
  try {
    seatedCableRowBlueStart = require('../../exercise-images/seated-cable-row/blue/start.png');
    console.log('✅ Loaded seated-cable-row blue start.png');
  } catch (e) {
    console.log('❌ No seated-cable-row blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    seatedCableRowBlueEnd = require('../../exercise-images/seated-cable-row/blue/end.png');
    console.log('✅ Loaded seated-cable-row blue end.png');
  } catch (e) {
    console.log('❌ No seated-cable-row blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    seatedCableRowPinkStart = require('../../exercise-images/seated-cable-row/pink/start.png');
    console.log('✅ Loaded seated-cable-row pink start.png');
  } catch (e) {
    console.log('❌ No seated-cable-row pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    seatedCableRowPinkEnd = require('../../exercise-images/seated-cable-row/pink/end.png');
    console.log('✅ Loaded seated-cable-row pink end.png');
  } catch (e) {
    console.log('❌ No seated-cable-row pink end.png found:', e.message);
  }
  
  // Load chest-supported T-bar row images
  console.log('🏋️ Loading chest-supported T-bar row...');
  
  // Blue start
  try {
    chestSupportedTBarRowBlueStart = require('../../exercise-images/chest-supported-t-bar-row/blue/start.png');
    console.log('✅ Loaded chest-supported-t-bar-row blue start.png');
  } catch (e) {
    console.log('❌ No chest-supported-t-bar-row blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    chestSupportedTBarRowBlueEnd = require('../../exercise-images/chest-supported-t-bar-row/blue/end.png');
    console.log('✅ Loaded chest-supported-t-bar-row blue end.png');
  } catch (e) {
    console.log('❌ No chest-supported-t-bar-row blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    chestSupportedTBarRowPinkStart = require('../../exercise-images/chest-supported-t-bar-row/pink/start.png');
    console.log('✅ Loaded chest-supported-t-bar-row pink start.png');
  } catch (e) {
    console.log('❌ No chest-supported-t-bar-row pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    chestSupportedTBarRowPinkEnd = require('../../exercise-images/chest-supported-t-bar-row/pink/end.png');
    console.log('✅ Loaded chest-supported-t-bar-row pink end.png');
  } catch (e) {
    console.log('❌ No chest-supported-t-bar-row pink end.png found:', e.message);
  }
  
  // Load T-bar row images
  console.log('🏋️ Loading T-bar row...');
  
  // Blue start
  try {
    tBarRowBlueStart = require('../../exercise-images/t-bar-row/blue/start.png');
    console.log('✅ Loaded t-bar-row blue start.png');
  } catch (e) {
    console.log('❌ No t-bar-row blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    tBarRowBlueEnd = require('../../exercise-images/t-bar-row/blue/end.png');
    console.log('✅ Loaded t-bar-row blue end.png');
  } catch (e) {
    console.log('❌ No t-bar-row blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    tBarRowPinkStart = require('../../exercise-images/t-bar-row/pink/start.png');
    console.log('✅ Loaded t-bar-row pink start.png');
  } catch (e) {
    console.log('❌ No t-bar-row pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    tBarRowPinkEnd = require('../../exercise-images/t-bar-row/pink/end.png');
    console.log('✅ Loaded t-bar-row pink end.png');
  } catch (e) {
    console.log('❌ No t-bar-row pink end.png found:', e.message);
  }
  
  // Load chest-supported dumbbell row images
  console.log('🏋️ Loading chest-supported dumbbell row...');
  
  // Blue start
  try {
    chestSupportedDumbbellRowBlueStart = require('../../exercise-images/chest-supported-dumbbell-row/blue/start.png');
    console.log('✅ Loaded chest-supported-dumbbell-row blue start.png');
  } catch (e) {
    console.log('❌ No chest-supported-dumbbell-row blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    chestSupportedDumbbellRowBlueEnd = require('../../exercise-images/chest-supported-dumbbell-row/blue/end.png');
    console.log('✅ Loaded chest-supported-dumbbell-row blue end.png');
  } catch (e) {
    console.log('❌ No chest-supported-dumbbell-row blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    chestSupportedDumbbellRowPinkStart = require('../../exercise-images/chest-supported-dumbbell-row/pink/start.png');
    console.log('✅ Loaded chest-supported-dumbbell-row pink start.png');
  } catch (e) {
    console.log('❌ No chest-supported-dumbbell-row pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    chestSupportedDumbbellRowPinkEnd = require('../../exercise-images/chest-supported-dumbbell-row/pink/end.png');
    console.log('✅ Loaded chest-supported-dumbbell-row pink end.png');
  } catch (e) {
    console.log('❌ No chest-supported-dumbbell-row pink end.png found:', e.message);
  }
  
  // Load single-arm dumbbell row images
  console.log('🏋️ Loading single-arm dumbbell row...');
  
  // Blue start
  try {
    singleArmDumbbellRowBlueStart = require('../../exercise-images/single-arm-dumbbell-row/blue/start.png');
    console.log('✅ Loaded single-arm-dumbbell-row blue start.png');
  } catch (e) {
    console.log('❌ No single-arm-dumbbell-row blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    singleArmDumbbellRowBlueEnd = require('../../exercise-images/single-arm-dumbbell-row/blue/end.png');
    console.log('✅ Loaded single-arm-dumbbell-row blue end.png');
  } catch (e) {
    console.log('❌ No single-arm-dumbbell-row blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    singleArmDumbbellRowPinkStart = require('../../exercise-images/single-arm-dumbbell-row/pink/start.png');
    console.log('✅ Loaded single-arm-dumbbell-row pink start.png');
  } catch (e) {
    console.log('❌ No single-arm-dumbbell-row pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    singleArmDumbbellRowPinkEnd = require('../../exercise-images/single-arm-dumbbell-row/pink/end.png');
    console.log('✅ Loaded single-arm-dumbbell-row pink end.png');
  } catch (e) {
    console.log('❌ No single-arm-dumbbell-row pink end.png found:', e.message);
  }
  
  // Load seated barbell overhead press images
  console.log('🏋️ Loading seated barbell overhead press...');
  
  // Blue start
  try {
    seatedBarbellOverheadPressBlueStart = require('../../exercise-images/seated-barbell-overhead-press/blue/start.png');
    console.log('✅ Loaded seated-barbell-overhead-press blue start.png');
  } catch (e) {
    console.log('❌ No seated-barbell-overhead-press blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    seatedBarbellOverheadPressBlueEnd = require('../../exercise-images/seated-barbell-overhead-press/blue/end.png');
    console.log('✅ Loaded seated-barbell-overhead-press blue end.png');
  } catch (e) {
    console.log('❌ No seated-barbell-overhead-press blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    seatedBarbellOverheadPressPinkStart = require('../../exercise-images/seated-barbell-overhead-press/pink/start.png');
    console.log('✅ Loaded seated-barbell-overhead-press pink start.png');
  } catch (e) {
    console.log('❌ No seated-barbell-overhead-press pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    seatedBarbellOverheadPressPinkEnd = require('../../exercise-images/seated-barbell-overhead-press/pink/end.png');
    console.log('✅ Loaded seated-barbell-overhead-press pink end.png');
  } catch (e) {
    console.log('❌ No seated-barbell-overhead-press pink end.png found:', e.message);
  }
  
  // Load machine shoulder press images
  console.log('🏋️ Loading machine shoulder press...');
  
  // Blue start
  try {
    machineShoulderPressBlueStart = require('../../exercise-images/machine-shoulder-press/blue/start.png');
    console.log('✅ Loaded machine-shoulder-press blue start.png');
  } catch (e) {
    console.log('❌ No machine-shoulder-press blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    machineShoulderPressBlueEnd = require('../../exercise-images/machine-shoulder-press/blue/end.png');
    console.log('✅ Loaded machine-shoulder-press blue end.png');
  } catch (e) {
    console.log('❌ No machine-shoulder-press blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    machineShoulderPressPinkStart = require('../../exercise-images/machine-shoulder-press/pink/start.png');
    console.log('✅ Loaded machine-shoulder-press pink start.png');
  } catch (e) {
    console.log('❌ No machine-shoulder-press pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    machineShoulderPressPinkEnd = require('../../exercise-images/machine-shoulder-press/pink/end.png');
    console.log('✅ Loaded machine-shoulder-press pink end.png');
  } catch (e) {
    console.log('❌ No machine-shoulder-press pink end.png found:', e.message);
  }
  
  // Load cable lateral raise images
  console.log('🏋️ Loading cable lateral raise...');
  
  // Blue start
  try {
    cableLateralRaiseBlueStart = require('../../exercise-images/cable-lateral-raise/blue/start.png');
    console.log('✅ Loaded cable-lateral-raise blue start.png');
  } catch (e) {
    console.log('❌ No cable-lateral-raise blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    cableLateralRaiseBlueEnd = require('../../exercise-images/cable-lateral-raise/blue/end.png');
    console.log('✅ Loaded cable-lateral-raise blue end.png');
  } catch (e) {
    console.log('❌ No cable-lateral-raise blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    cableLateralRaisePinkStart = require('../../exercise-images/cable-lateral-raise/pink/start.png');
    console.log('✅ Loaded cable-lateral-raise pink start.png');
  } catch (e) {
    console.log('❌ No cable-lateral-raise pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    cableLateralRaisePinkEnd = require('../../exercise-images/cable-lateral-raise/pink/end.png');
    console.log('✅ Loaded cable-lateral-raise pink end.png');
  } catch (e) {
    console.log('❌ No cable-lateral-raise pink end.png found:', e.message);
  }
  
  // Load face pull images
  console.log('🏋️ Loading face pull...');
  
  // Blue start
  try {
    facePullBlueStart = require('../../exercise-images/face-pull/blue/start.png');
    console.log('✅ Loaded face-pull blue start.png');
  } catch (e) {
    console.log('❌ No face-pull blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    facePullBlueEnd = require('../../exercise-images/face-pull/blue/end.png');
    console.log('✅ Loaded face-pull blue end.png');
  } catch (e) {
    console.log('❌ No face-pull blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    facePullPinkStart = require('../../exercise-images/face-pull/pink/start.png');
    console.log('✅ Loaded face-pull pink start.png');
  } catch (e) {
    console.log('❌ No face-pull pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    facePullPinkEnd = require('../../exercise-images/face-pull/pink/end.png');
    console.log('✅ Loaded face-pull pink end.png');
  } catch (e) {
    console.log('❌ No face-pull pink end.png found:', e.message);
  }
  
  // Load reverse pec deck images
  console.log('🏋️ Loading reverse pec deck...');
  
  // Blue start
  try {
    reversePecDeckBlueStart = require('../../exercise-images/reverse-pec-deck/blue/start.png');
    console.log('✅ Loaded reverse-pec-deck blue start.png');
  } catch (e) {
    console.log('❌ No reverse-pec-deck blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    reversePecDeckBlueEnd = require('../../exercise-images/reverse-pec-deck/blue/end.png');
    console.log('✅ Loaded reverse-pec-deck blue end.png');
  } catch (e) {
    console.log('❌ No reverse-pec-deck blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    reversePecDeckPinkStart = require('../../exercise-images/reverse-pec-deck/pink/start.png');
    console.log('✅ Loaded reverse-pec-deck pink start.png');
  } catch (e) {
    console.log('❌ No reverse-pec-deck pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    reversePecDeckPinkEnd = require('../../exercise-images/reverse-pec-deck/pink/end.png');
    console.log('✅ Loaded reverse-pec-deck pink end.png');
  } catch (e) {
    console.log('❌ No reverse-pec-deck pink end.png found:', e.message);
  }
  
  // Load EZ-bar curl images
  console.log('🏋️ Loading EZ-bar curl...');
  
  // Blue start
  try {
    ezBarCurlBlueStart = require('../../exercise-images/ez-bar-curl/blue/start.png');
    console.log('✅ Loaded ez-bar-curl blue start.png');
  } catch (e) {
    console.log('❌ No ez-bar-curl blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    ezBarCurlBlueEnd = require('../../exercise-images/ez-bar-curl/blue/end.png');
    console.log('✅ Loaded ez-bar-curl blue end.png');
  } catch (e) {
    console.log('❌ No ez-bar-curl blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    ezBarCurlPinkStart = require('../../exercise-images/ez-bar-curl/pink/start.png');
    console.log('✅ Loaded ez-bar-curl pink start.png');
  } catch (e) {
    console.log('❌ No ez-bar-curl pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    ezBarCurlPinkEnd = require('../../exercise-images/ez-bar-curl/pink/end.png');
    console.log('✅ Loaded ez-bar-curl pink end.png');
  } catch (e) {
    console.log('❌ No ez-bar-curl pink end.png found:', e.message);
  }
  
  // Load preacher curl images
  console.log('🏋️ Loading preacher curl...');
  
  // Blue start
  try {
    preacherCurlBlueStart = require('../../exercise-images/preacher-curl/blue/start.png');
    console.log('✅ Loaded preacher-curl blue start.png');
  } catch (e) {
    console.log('❌ No preacher-curl blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    preacherCurlBlueEnd = require('../../exercise-images/preacher-curl/blue/end.png');
    console.log('✅ Loaded preacher-curl blue end.png');
  } catch (e) {
    console.log('❌ No preacher-curl blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    preacherCurlPinkStart = require('../../exercise-images/preacher-curl/pink/start.png');
    console.log('✅ Loaded preacher-curl pink start.png');
  } catch (e) {
    console.log('❌ No preacher-curl pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    preacherCurlPinkEnd = require('../../exercise-images/preacher-curl/pink/end.png');
    console.log('✅ Loaded preacher-curl pink end.png');
  } catch (e) {
    console.log('❌ No preacher-curl pink end.png found:', e.message);
  }
  
  // Load cable curl images
  console.log('🏋️ Loading cable curl...');
  
  // Blue start
  try {
    cableCurlBlueStart = require('../../exercise-images/cable-curl/blue/start.png');
    console.log('✅ Loaded cable-curl blue start.png');
  } catch (e) {
    console.log('❌ No cable-curl blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    cableCurlBlueEnd = require('../../exercise-images/cable-curl/blue/end.png');
    console.log('✅ Loaded cable-curl blue end.png');
  } catch (e) {
    console.log('❌ No cable-curl blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    cableCurlPinkStart = require('../../exercise-images/cable-curl/pink/start.png');
    console.log('✅ Loaded cable-curl pink start.png');
  } catch (e) {
    console.log('❌ No cable-curl pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    cableCurlPinkEnd = require('../../exercise-images/cable-curl/pink/end.png');
    console.log('✅ Loaded cable-curl pink end.png');
  } catch (e) {
    console.log('❌ No cable-curl pink end.png found:', e.message);
  }
  
  // Load incline dumbbell curl images
  console.log('🏋️ Loading incline dumbbell curl...');
  
  // Blue start
  try {
    inclineDumbbellCurlBlueStart = require('../../exercise-images/incline-dumbbell-curl/blue/start.png');
    console.log('✅ Loaded incline-dumbbell-curl blue start.png');
  } catch (e) {
    console.log('❌ No incline-dumbbell-curl blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    inclineDumbbellCurlBlueEnd = require('../../exercise-images/incline-dumbbell-curl/blue/end.png');
    console.log('✅ Loaded incline-dumbbell-curl blue end.png');
  } catch (e) {
    console.log('❌ No incline-dumbbell-curl blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    inclineDumbbellCurlPinkStart = require('../../exercise-images/incline-dumbbell-curl/pink/start.png');
    console.log('✅ Loaded incline-dumbbell-curl pink start.png');
  } catch (e) {
    console.log('❌ No incline-dumbbell-curl pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    inclineDumbbellCurlPinkEnd = require('../../exercise-images/incline-dumbbell-curl/pink/end.png');
    console.log('✅ Loaded incline-dumbbell-curl pink end.png');
  } catch (e) {
    console.log('❌ No incline-dumbbell-curl pink end.png found:', e.message);
  }
  
  // Load overhead cable triceps extension images
  console.log('🏋️ Loading overhead cable triceps extension...');
  
  // Blue start
  try {
    overheadCableTricepsExtensionBlueStart = require('../../exercise-images/overhead-cable-triceps-extension/blue/start.png');
    console.log('✅ Loaded overhead-cable-triceps-extension blue start.png');
  } catch (e) {
    console.log('❌ No overhead-cable-triceps-extension blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    overheadCableTricepsExtensionBlueEnd = require('../../exercise-images/overhead-cable-triceps-extension/blue/end.png');
    console.log('✅ Loaded overhead-cable-triceps-extension blue end.png');
  } catch (e) {
    console.log('❌ No overhead-cable-triceps-extension blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    overheadCableTricepsExtensionPinkStart = require('../../exercise-images/overhead-cable-triceps-extension/pink/start.png');
    console.log('✅ Loaded overhead-cable-triceps-extension pink start.png');
  } catch (e) {
    console.log('❌ No overhead-cable-triceps-extension pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    overheadCableTricepsExtensionPinkEnd = require('../../exercise-images/overhead-cable-triceps-extension/pink/end.png');
    console.log('✅ Loaded overhead-cable-triceps-extension pink end.png');
  } catch (e) {
    console.log('❌ No overhead-cable-triceps-extension pink end.png found:', e.message);
  }
  
  // Load overhead dumbbell triceps extension images
  console.log('🏋️ Loading overhead dumbbell triceps extension...');
  
  // Blue start
  try {
    overheadDumbbellTricepsExtensionBlueStart = require('../../exercise-images/overhead-dumbbell-triceps-extension/blue/start.png');
    console.log('✅ Loaded overhead-dumbbell-triceps-extension blue start.png');
  } catch (e) {
    console.log('❌ No overhead-dumbbell-triceps-extension blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    overheadDumbbellTricepsExtensionBlueEnd = require('../../exercise-images/overhead-dumbbell-triceps-extension/blue/end.png');
    console.log('✅ Loaded overhead-dumbbell-triceps-extension blue end.png');
  } catch (e) {
    console.log('❌ No overhead-dumbbell-triceps-extension blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    overheadDumbbellTricepsExtensionPinkStart = require('../../exercise-images/overhead-dumbbell-triceps-extension/pink/start.png');
    console.log('✅ Loaded overhead-dumbbell-triceps-extension pink start.png');
  } catch (e) {
    console.log('❌ No overhead-dumbbell-triceps-extension pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    overheadDumbbellTricepsExtensionPinkEnd = require('../../exercise-images/overhead-dumbbell-triceps-extension/pink/end.png');
    console.log('✅ Loaded overhead-dumbbell-triceps-extension pink end.png');
  } catch (e) {
    console.log('❌ No overhead-dumbbell-triceps-extension pink end.png found:', e.message);
  }
  
  // Load EZ-bar skullcrusher images
  console.log('🏋️ Loading EZ-bar skullcrusher...');
  
  // Blue start
  try {
    ezBarSkullcrusherBlueStart = require('../../exercise-images/ez-bar-skullcrusher/blue/start.png');
    console.log('✅ Loaded ez-bar-skullcrusher blue start.png');
  } catch (e) {
    console.log('❌ No ez-bar-skullcrusher blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    ezBarSkullcrusherBlueEnd = require('../../exercise-images/ez-bar-skullcrusher/blue/end.png');
    console.log('✅ Loaded ez-bar-skullcrusher blue end.png');
  } catch (e) {
    console.log('❌ No ez-bar-skullcrusher blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    ezBarSkullcrusherPinkStart = require('../../exercise-images/ez-bar-skullcrusher/pink/start.png');
    console.log('✅ Loaded ez-bar-skullcrusher pink start.png');
  } catch (e) {
    console.log('❌ No ez-bar-skullcrusher pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    ezBarSkullcrusherPinkEnd = require('../../exercise-images/ez-bar-skullcrusher/pink/end.png');
    console.log('✅ Loaded ez-bar-skullcrusher pink end.png');
  } catch (e) {
    console.log('❌ No ez-bar-skullcrusher pink end.png found:', e.message);
  }
  
  // Load close grip bench press images
  console.log('🏋️ Loading close grip bench press...');
  
  // Blue start
  try {
    closeGripBenchPressBlueStart = require('../../exercise-images/close-grip-bench-press/blue/start.png');
    console.log('✅ Loaded close-grip-bench-press blue start.png');
  } catch (e) {
    console.log('❌ No close-grip-bench-press blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    closeGripBenchPressBlueEnd = require('../../exercise-images/close-grip-bench-press/blue/end.png');
    console.log('✅ Loaded close-grip-bench-press blue end.png');
  } catch (e) {
    console.log('❌ No close-grip-bench-press blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    closeGripBenchPressPinkStart = require('../../exercise-images/close-grip-bench-press/pink/start.png');
    console.log('✅ Loaded close-grip-bench-press pink start.png');
  } catch (e) {
    console.log('❌ No close-grip-bench-press pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    closeGripBenchPressPinkEnd = require('../../exercise-images/close-grip-bench-press/pink/end.png');
    console.log('✅ Loaded close-grip-bench-press pink end.png');
  } catch (e) {
    console.log('❌ No close-grip-bench-press pink end.png found:', e.message);
  }
  
  // Load dips chest focus images
  console.log('🏋️ Loading dips chest focus...');
  
  // Blue start
  try {
    dipsChestFocusBlueStart = require('../../exercise-images/dips-chest-focus/blue/start.png');
    console.log('✅ Loaded dips-chest-focus blue start.png');
  } catch (e) {
    console.log('❌ No dips-chest-focus blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    dipsChestFocusBlueEnd = require('../../exercise-images/dips-chest-focus/blue/end.png');
    console.log('✅ Loaded dips-chest-focus blue end.png');
  } catch (e) {
    console.log('❌ No dips-chest-focus blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    dipsChestFocusPinkStart = require('../../exercise-images/dips-chest-focus/pink/start.png');
    console.log('✅ Loaded dips-chest-focus pink start.png');
  } catch (e) {
    console.log('❌ No dips-chest-focus pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    dipsChestFocusPinkEnd = require('../../exercise-images/dips-chest-focus/pink/end.png');
    console.log('✅ Loaded dips-chest-focus pink end.png');
  } catch (e) {
    console.log('❌ No dips-chest-focus pink end.png found:', e.message);
  }
  
  // Load hack squat images
  console.log('🏋️ Loading hack squat...');
  
  // Blue start
  try {
    hackSquatBlueStart = require('../../exercise-images/hack-squat/blue/start.png');
    console.log('✅ Loaded hack-squat blue start.png');
  } catch (e) {
    console.log('❌ No hack-squat blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    hackSquatBlueEnd = require('../../exercise-images/hack-squat/blue/end.png');
    console.log('✅ Loaded hack-squat blue end.png');
  } catch (e) {
    console.log('❌ No hack-squat blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    hackSquatPinkStart = require('../../exercise-images/hack-squat/pink/start.png');
    console.log('✅ Loaded hack-squat pink start.png');
  } catch (e) {
    console.log('❌ No hack-squat pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    hackSquatPinkEnd = require('../../exercise-images/hack-squat/pink/end.png');
    console.log('✅ Loaded hack-squat pink end.png');
  } catch (e) {
    console.log('❌ No hack-squat pink end.png found:', e.message);
  }
  
  // Load bulgarian split squat images
  console.log('🏋️ Loading bulgarian split squat...');
  
  // Blue start
  try {
    bulgarianSplitSquatBlueStart = require('../../exercise-images/bulgarian-split-squat/blue/start.png');
    console.log('✅ Loaded bulgarian-split-squat blue start.png');
  } catch (e) {
    console.log('❌ No bulgarian-split-squat blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    bulgarianSplitSquatBlueEnd = require('../../exercise-images/bulgarian-split-squat/blue/end.png');
    console.log('✅ Loaded bulgarian-split-squat blue end.png');
  } catch (e) {
    console.log('❌ No bulgarian-split-squat blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    bulgarianSplitSquatPinkStart = require('../../exercise-images/bulgarian-split-squat/pink/start.png');
    console.log('✅ Loaded bulgarian-split-squat pink start.png');
  } catch (e) {
    console.log('❌ No bulgarian-split-squat pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    bulgarianSplitSquatPinkEnd = require('../../exercise-images/bulgarian-split-squat/pink/end.png');
    console.log('✅ Loaded bulgarian-split-squat pink end.png');
  } catch (e) {
    console.log('❌ No bulgarian-split-squat pink end.png found:', e.message);
  }
  
  // Load barbell front squat images
  console.log('🏋️ Loading barbell front squat...');
  
  // Blue start
  try {
    barbellFrontSquatBlueStart = require('../../exercise-images/barbell-front-squat/blue/start.png');
    console.log('✅ Loaded barbell-front-squat blue start.png');
  } catch (e) {
    console.log('❌ No barbell-front-squat blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    barbellFrontSquatBlueEnd = require('../../exercise-images/barbell-front-squat/blue/end.png');
    console.log('✅ Loaded barbell-front-squat blue end.png');
  } catch (e) {
    console.log('❌ No barbell-front-squat blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    barbellFrontSquatPinkStart = require('../../exercise-images/barbell-front-squat/pink/start.png');
    console.log('✅ Loaded barbell-front-squat pink start.png');
  } catch (e) {
    console.log('❌ No barbell-front-squat pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    barbellFrontSquatPinkEnd = require('../../exercise-images/barbell-front-squat/pink/end.png');
    console.log('✅ Loaded barbell-front-squat pink end.png');
  } catch (e) {
    console.log('❌ No barbell-front-squat pink end.png found:', e.message);
  }
  
  // Load walking lunge images
  console.log('🏋️ Loading walking lunge...');
  
  // Blue start
  try {
    walkingLungeBlueStart = require('../../exercise-images/walking-lunge/blue/start.png');
    console.log('✅ Loaded walking-lunge blue start.png');
  } catch (e) {
    console.log('❌ No walking-lunge blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    walkingLungeBlueEnd = require('../../exercise-images/walking-lunge/blue/end.png');
    console.log('✅ Loaded walking-lunge blue end.png');
  } catch (e) {
    console.log('❌ No walking-lunge blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    walkingLungePinkStart = require('../../exercise-images/walking-lunge/pink/start.png');
    console.log('✅ Loaded walking-lunge pink start.png');
  } catch (e) {
    console.log('❌ No walking-lunge pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    walkingLungePinkEnd = require('../../exercise-images/walking-lunge/pink/end.png');
    console.log('✅ Loaded walking-lunge pink end.png');
  } catch (e) {
    console.log('❌ No walking-lunge pink end.png found:', e.message);
  }
  
  // Load barbell hip thrust images
  console.log('🏋️ Loading barbell hip thrust...');
  
  // Blue start
  try {
    barbellHipThrustBlueStart = require('../../exercise-images/barbell-hip-thrust/blue/start.png');
    console.log('✅ Loaded barbell-hip-thrust blue start.png');
  } catch (e) {
    console.log('❌ No barbell-hip-thrust blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    barbellHipThrustBlueEnd = require('../../exercise-images/barbell-hip-thrust/blue/end.png');
    console.log('✅ Loaded barbell-hip-thrust blue end.png');
  } catch (e) {
    console.log('❌ No barbell-hip-thrust blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    barbellHipThrustPinkStart = require('../../exercise-images/barbell-hip-thrust/pink/start.png');
    console.log('✅ Loaded barbell-hip-thrust pink start.png');
  } catch (e) {
    console.log('❌ No barbell-hip-thrust pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    barbellHipThrustPinkEnd = require('../../exercise-images/barbell-hip-thrust/pink/end.png');
    console.log('✅ Loaded barbell-hip-thrust pink end.png');
  } catch (e) {
    console.log('❌ No barbell-hip-thrust pink end.png found:', e.message);
  }
  
  // Load seated calf raise images
  console.log('🏋️ Loading seated calf raise...');
  
  // Blue start
  try {
    seatedCalfRaiseBlueStart = require('../../exercise-images/seated-calf-raise/blue/start.png');
    console.log('✅ Loaded seated-calf-raise blue start.png');
  } catch (e) {
    console.log('❌ No seated-calf-raise blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    seatedCalfRaiseBlueEnd = require('../../exercise-images/seated-calf-raise/blue/end.png');
    console.log('✅ Loaded seated-calf-raise blue end.png');
  } catch (e) {
    console.log('❌ No seated-calf-raise blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    seatedCalfRaisePinkStart = require('../../exercise-images/seated-calf-raise/pink/start.png');
    console.log('✅ Loaded seated-calf-raise pink start.png');
  } catch (e) {
    console.log('❌ No seated-calf-raise pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    seatedCalfRaisePinkEnd = require('../../exercise-images/seated-calf-raise/pink/end.png');
    console.log('✅ Loaded seated-calf-raise pink end.png');
  } catch (e) {
    console.log('❌ No seated-calf-raise pink end.png found:', e.message);
  }
  
  // Load back extension images
  console.log('🏋️ Loading back extension...');
  
  // Blue start
  try {
    backExtensionBlueStart = require('../../exercise-images/back-extension/blue/start.png');
    console.log('✅ Loaded back-extension blue start.png');
  } catch (e) {
    console.log('❌ No back-extension blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    backExtensionBlueEnd = require('../../exercise-images/back-extension/blue/end.png');
    console.log('✅ Loaded back-extension blue end.png');
  } catch (e) {
    console.log('❌ No back-extension blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    backExtensionPinkStart = require('../../exercise-images/back-extension/pink/start.png');
    console.log('✅ Loaded back-extension pink start.png');
  } catch (e) {
    console.log('❌ No back-extension pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    backExtensionPinkEnd = require('../../exercise-images/back-extension/pink/end.png');
    console.log('✅ Loaded back-extension pink end.png');
  } catch (e) {
    console.log('❌ No back-extension pink end.png found:', e.message);
  }
  
  // Load hanging leg raise images
  console.log('🏋️ Loading hanging leg raise...');
  
  // Blue start
  try {
    hangingLegRaiseBlueStart = require('../../exercise-images/hanging-leg-raise/blue/start.png');
    console.log('✅ Loaded hanging-leg-raise blue start.png');
  } catch (e) {
    console.log('❌ No hanging-leg-raise blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    hangingLegRaiseBlueEnd = require('../../exercise-images/hanging-leg-raise/blue/end.png');
    console.log('✅ Loaded hanging-leg-raise blue end.png');
  } catch (e) {
    console.log('❌ No hanging-leg-raise blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    hangingLegRaisePinkStart = require('../../exercise-images/hanging-leg-raise/pink/start.png');
    console.log('✅ Loaded hanging-leg-raise pink start.png');
  } catch (e) {
    console.log('❌ No hanging-leg-raise pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    hangingLegRaisePinkEnd = require('../../exercise-images/hanging-leg-raise/pink/end.png');
    console.log('✅ Loaded hanging-leg-raise pink end.png');
  } catch (e) {
    console.log('❌ No hanging-leg-raise pink end.png found:', e.message);
  }
  
  // Load smith machine calf raise images
  console.log('🏋️ Loading smith machine calf raise...');
  
  // Blue start
  try {
    smithMachineCalfRaiseBlueStart = require('../../exercise-images/smith-machine-calf-raise/blue/start.png');
    console.log('✅ Loaded smith-machine-calf-raise blue start.png');
  } catch (e) {
    console.log('❌ No smith-machine-calf-raise blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    smithMachineCalfRaiseBlueEnd = require('../../exercise-images/smith-machine-calf-raise/blue/end.png');
    console.log('✅ Loaded smith-machine-calf-raise blue end.png');
  } catch (e) {
    console.log('❌ No smith-machine-calf-raise blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    smithMachineCalfRaisePinkStart = require('../../exercise-images/smith-machine-calf-raise/pink/start.png');
    console.log('✅ Loaded smith-machine-calf-raise pink start.png');
  } catch (e) {
    console.log('❌ No smith-machine-calf-raise pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    smithMachineCalfRaisePinkEnd = require('../../exercise-images/smith-machine-calf-raise/pink/end.png');
    console.log('✅ Loaded smith-machine-calf-raise pink end.png');
  } catch (e) {
    console.log('❌ No smith-machine-calf-raise pink end.png found:', e.message);
  }
  
  // Load dumbbell wrist curl images
  console.log('🏋️ Loading dumbbell wrist curl...');
  
  // Blue start
  try {
    dumbbellWristCurlBlueStart = require('../../exercise-images/dumbbell-wrist-curl/blue/start.png');
    console.log('✅ Loaded dumbbell-wrist-curl blue start.png');
  } catch (e) {
    console.log('❌ No dumbbell-wrist-curl blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    dumbbellWristCurlBlueEnd = require('../../exercise-images/dumbbell-wrist-curl/blue/end.png');
    console.log('✅ Loaded dumbbell-wrist-curl blue end.png');
  } catch (e) {
    console.log('❌ No dumbbell-wrist-curl blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    dumbbellWristCurlPinkStart = require('../../exercise-images/dumbbell-wrist-curl/pink/start.png');
    console.log('✅ Loaded dumbbell-wrist-curl pink start.png');
  } catch (e) {
    console.log('❌ No dumbbell-wrist-curl pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    dumbbellWristCurlPinkEnd = require('../../exercise-images/dumbbell-wrist-curl/pink/end.png');
    console.log('✅ Loaded dumbbell-wrist-curl pink end.png');
  } catch (e) {
    console.log('❌ No dumbbell-wrist-curl pink end.png found:', e.message);
  }
  
  // Load reverse wrist curl images
  console.log('🏋️ Loading reverse wrist curl...');
  
  // Blue start
  try {
    reverseWristCurlBlueStart = require('../../exercise-images/reverse-wrist-curl/blue/start.png');
    console.log('✅ Loaded reverse-wrist-curl blue start.png');
  } catch (e) {
    console.log('❌ No reverse-wrist-curl blue start.png found:', e.message);
  }
  
  // Blue end
  try {
    reverseWristCurlBlueEnd = require('../../exercise-images/reverse-wrist-curl/blue/end.png');
    console.log('✅ Loaded reverse-wrist-curl blue end.png');
  } catch (e) {
    console.log('❌ No reverse-wrist-curl blue end.png found:', e.message);
  }
  
  // Pink start
  try {
    reverseWristCurlPinkStart = require('../../exercise-images/reverse-wrist-curl/pink/start.png');
    console.log('✅ Loaded reverse-wrist-curl pink start.png');
  } catch (e) {
    console.log('❌ No reverse-wrist-curl pink start.png found:', e.message);
  }
  
  // Pink end
  try {
    reverseWristCurlPinkEnd = require('../../exercise-images/reverse-wrist-curl/pink/end.png');
    console.log('✅ Loaded reverse-wrist-curl pink end.png');
  } catch (e) {
    console.log('❌ No reverse-wrist-curl pink end.png found:', e.message);
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
    cableCrossover: { blue: { cableCrossoverBlueStart, cableCrossoverBlueEnd }, pink: { cableCrossoverPinkStart, cableCrossoverPinkEnd } },
    pecDeckFly: { blue: { pecDeckFlyBlueStart, pecDeckFlyBlueEnd }, pink: { pecDeckFlyPinkStart, pecDeckFlyPinkEnd } },
    weightedPullUp: { blue: { weightedPullUpBlueStart, weightedPullUpBlueEnd }, pink: { weightedPullUpPinkStart, weightedPullUpPinkEnd } },
    chinUp: { blue: { chinUpBlueStart, chinUpBlueEnd }, pink: { chinUpPinkStart, chinUpPinkEnd } },
    seatedCableRow: { blue: { seatedCableRowBlueStart, seatedCableRowBlueEnd }, pink: { seatedCableRowPinkStart, seatedCableRowPinkEnd } },
    chestSupportedTBarRow: { blue: { chestSupportedTBarRowBlueStart, chestSupportedTBarRowBlueEnd }, pink: { chestSupportedTBarRowPinkStart, chestSupportedTBarRowPinkEnd } },
    tBarRow: { blue: { tBarRowBlueStart, tBarRowBlueEnd }, pink: { tBarRowPinkStart, tBarRowPinkEnd } },
    chestSupportedDumbbellRow: { blue: { chestSupportedDumbbellRowBlueStart, chestSupportedDumbbellRowBlueEnd }, pink: { chestSupportedDumbbellRowPinkStart, chestSupportedDumbbellRowPinkEnd } },
    singleArmDumbbellRow: { blue: { singleArmDumbbellRowBlueStart, singleArmDumbbellRowBlueEnd }, pink: { singleArmDumbbellRowPinkStart, singleArmDumbbellRowPinkEnd } },
    seatedBarbellOverheadPress: { blue: { seatedBarbellOverheadPressBlueStart, seatedBarbellOverheadPressBlueEnd }, pink: { seatedBarbellOverheadPressPinkStart, seatedBarbellOverheadPressPinkEnd } },
    machineShoulderPress: { blue: { machineShoulderPressBlueStart, machineShoulderPressBlueEnd }, pink: { machineShoulderPressPinkStart, machineShoulderPressPinkEnd } },
    cableLateralRaise: { blue: { cableLateralRaiseBlueStart, cableLateralRaiseBlueEnd }, pink: { cableLateralRaisePinkStart, cableLateralRaisePinkEnd } },
    facePull: { blue: { facePullBlueStart, facePullBlueEnd }, pink: { facePullPinkStart, facePullPinkEnd } },
    reversePecDeck: { blue: { reversePecDeckBlueStart, reversePecDeckBlueEnd }, pink: { reversePecDeckPinkStart, reversePecDeckPinkEnd } },
    ezBarCurl: { blue: { ezBarCurlBlueStart, ezBarCurlBlueEnd }, pink: { ezBarCurlPinkStart, ezBarCurlPinkEnd } },
    preacherCurl: { blue: { preacherCurlBlueStart, preacherCurlBlueEnd }, pink: { preacherCurlPinkStart, preacherCurlPinkEnd } },
    cableCurl: { blue: { cableCurlBlueStart, cableCurlBlueEnd }, pink: { cableCurlPinkStart, cableCurlPinkEnd } },
    inclineDumbbellCurl: { blue: { inclineDumbbellCurlBlueStart, inclineDumbbellCurlBlueEnd }, pink: { inclineDumbbellCurlPinkStart, inclineDumbbellCurlPinkEnd } },
    overheadCableTricepsExtension: { blue: { overheadCableTricepsExtensionBlueStart, overheadCableTricepsExtensionBlueEnd }, pink: { overheadCableTricepsExtensionPinkStart, overheadCableTricepsExtensionPinkEnd } },
    overheadDumbbellTricepsExtension: { blue: { overheadDumbbellTricepsExtensionBlueStart, overheadDumbbellTricepsExtensionBlueEnd }, pink: { overheadDumbbellTricepsExtensionPinkStart, overheadDumbbellTricepsExtensionPinkEnd } },
    ezBarSkullcrusher: { blue: { ezBarSkullcrusherBlueStart, ezBarSkullcrusherBlueEnd }, pink: { ezBarSkullcrusherPinkStart, ezBarSkullcrusherPinkEnd } },
    closeGripBenchPress: { blue: { closeGripBenchPressBlueStart, closeGripBenchPressBlueEnd }, pink: { closeGripBenchPressPinkStart, closeGripBenchPressPinkEnd } },
    dipsChestFocus: { blue: { dipsChestFocusBlueStart, dipsChestFocusBlueEnd }, pink: { dipsChestFocusPinkStart, dipsChestFocusPinkEnd } },
    hackSquat: { blue: { hackSquatBlueStart, hackSquatBlueEnd }, pink: { hackSquatPinkStart, hackSquatPinkEnd } },
    bulgarianSplitSquat: { blue: { bulgarianSplitSquatBlueStart, bulgarianSplitSquatBlueEnd }, pink: { bulgarianSplitSquatPinkStart, bulgarianSplitSquatPinkEnd } },
    barbellFrontSquat: { blue: { barbellFrontSquatBlueStart, barbellFrontSquatBlueEnd }, pink: { barbellFrontSquatPinkStart, barbellFrontSquatPinkEnd } },
    walkingLunge: { blue: { walkingLungeBlueStart, walkingLungeBlueEnd }, pink: { walkingLungePinkStart, walkingLungePinkEnd } },
    barbellHipThrust: { blue: { barbellHipThrustBlueStart, barbellHipThrustBlueEnd }, pink: { barbellHipThrustPinkStart, barbellHipThrustPinkEnd } },
    seatedCalfRaise: { blue: { seatedCalfRaiseBlueStart, seatedCalfRaiseBlueEnd }, pink: { seatedCalfRaisePinkStart, seatedCalfRaisePinkEnd } }
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
    'pec-deck-fly': {
      blue: {
        start: pecDeckFlyBlueStart,
        end: pecDeckFlyBlueEnd,
      },
      pink: {
        start: pecDeckFlyPinkStart,
        end: pecDeckFlyPinkEnd,
      }
    },
    'weighted-pull-up': {
      blue: {
        start: weightedPullUpBlueStart,
        end: weightedPullUpBlueEnd,
      },
      pink: {
        start: weightedPullUpPinkStart,
        end: weightedPullUpPinkEnd,
      }
    },
    'chin-up': {
      blue: {
        start: chinUpBlueStart,
        end: chinUpBlueEnd,
      },
      pink: {
        start: chinUpPinkStart,
        end: chinUpPinkEnd,
      }
    },
    'seated-cable-row': {
      blue: {
        start: seatedCableRowBlueStart,
        end: seatedCableRowBlueEnd,
      },
      pink: {
        start: seatedCableRowPinkStart,
        end: seatedCableRowPinkEnd,
      }
    },
    'chest-supported-t-bar-row': {
      blue: {
        start: chestSupportedTBarRowBlueStart,
        end: chestSupportedTBarRowBlueEnd,
      },
      pink: {
        start: chestSupportedTBarRowPinkStart,
        end: chestSupportedTBarRowPinkEnd,
      }
    },
    't-bar-row': {
      blue: {
        start: tBarRowBlueStart,
        end: tBarRowBlueEnd,
      },
      pink: {
        start: tBarRowPinkStart,
        end: tBarRowPinkEnd,
      }
    },
    'chest-supported-dumbbell-row': {
      blue: {
        start: chestSupportedDumbbellRowBlueStart,
        end: chestSupportedDumbbellRowBlueEnd,
      },
      pink: {
        start: chestSupportedDumbbellRowPinkStart,
        end: chestSupportedDumbbellRowPinkEnd,
      }
    },
    'single-arm-dumbbell-row': {
      blue: {
        start: singleArmDumbbellRowBlueStart,
        end: singleArmDumbbellRowBlueEnd,
      },
      pink: {
        start: singleArmDumbbellRowPinkStart,
        end: singleArmDumbbellRowPinkEnd,
      }
    },
    'seated-barbell-overhead-press': {
      blue: {
        start: seatedBarbellOverheadPressBlueStart,
        end: seatedBarbellOverheadPressBlueEnd,
      },
      pink: {
        start: seatedBarbellOverheadPressPinkStart,
        end: seatedBarbellOverheadPressPinkEnd,
      }
    },
    'machine-shoulder-press': {
      blue: {
        start: machineShoulderPressBlueStart,
        end: machineShoulderPressBlueEnd,
      },
      pink: {
        start: machineShoulderPressPinkStart,
        end: machineShoulderPressPinkEnd,
      }
    },
    'cable-lateral-raise': {
      blue: {
        start: cableLateralRaiseBlueStart,
        end: cableLateralRaiseBlueEnd,
      },
      pink: {
        start: cableLateralRaisePinkStart,
        end: cableLateralRaisePinkEnd,
      }
    },
    'face-pull': {
      blue: {
        start: facePullBlueStart,
        end: facePullBlueEnd,
      },
      pink: {
        start: facePullPinkStart,
        end: facePullPinkEnd,
      }
    },
    'reverse-pec-deck': {
      blue: {
        start: reversePecDeckBlueStart,
        end: reversePecDeckBlueEnd,
      },
      pink: {
        start: reversePecDeckPinkStart,
        end: reversePecDeckPinkEnd,
      }
    },
    'ez-bar-curl': {
      blue: {
        start: ezBarCurlBlueStart,
        end: ezBarCurlBlueEnd,
      },
      pink: {
        start: ezBarCurlPinkStart,
        end: ezBarCurlPinkEnd,
      }
    },
    'preacher-curl': {
      blue: {
        start: preacherCurlBlueStart,
        end: preacherCurlBlueEnd,
      },
      pink: {
        start: preacherCurlPinkStart,
        end: preacherCurlPinkEnd,
      }
    },
    'cable-curl': {
      blue: {
        start: cableCurlBlueStart,
        end: cableCurlBlueEnd,
      },
      pink: {
        start: cableCurlPinkStart,
        end: cableCurlPinkEnd,
      }
    },
    'incline-dumbbell-curl': {
      blue: {
        start: inclineDumbbellCurlBlueStart,
        end: inclineDumbbellCurlBlueEnd,
      },
      pink: {
        start: inclineDumbbellCurlPinkStart,
        end: inclineDumbbellCurlPinkEnd,
      }
    },
    'overhead-cable-triceps-extension': {
      blue: {
        start: overheadCableTricepsExtensionBlueStart,
        end: overheadCableTricepsExtensionBlueEnd,
      },
      pink: {
        start: overheadCableTricepsExtensionPinkStart,
        end: overheadCableTricepsExtensionPinkEnd,
      }
    },
    'overhead-dumbbell-triceps-extension': {
      blue: {
        start: overheadDumbbellTricepsExtensionBlueStart,
        end: overheadDumbbellTricepsExtensionBlueEnd,
      },
      pink: {
        start: overheadDumbbellTricepsExtensionPinkStart,
        end: overheadDumbbellTricepsExtensionPinkEnd,
      }
    },
    'ez-bar-skullcrusher': {
      blue: {
        start: ezBarSkullcrusherBlueStart,
        end: ezBarSkullcrusherBlueEnd,
      },
      pink: {
        start: ezBarSkullcrusherPinkStart,
        end: ezBarSkullcrusherPinkEnd,
      }
    },
    'close-grip-bench-press': {
      blue: {
        start: closeGripBenchPressBlueStart,
        end: closeGripBenchPressBlueEnd,
      },
      pink: {
        start: closeGripBenchPressPinkStart,
        end: closeGripBenchPressPinkEnd,
      }
    },
    'dips-chest-focus': {
      blue: {
        start: dipsChestFocusBlueStart,
        end: dipsChestFocusBlueEnd,
      },
      pink: {
        start: dipsChestFocusPinkStart,
        end: dipsChestFocusPinkEnd,
      }
    },
    'hack-squat': {
      blue: {
        start: hackSquatBlueStart,
        end: hackSquatBlueEnd,
      },
      pink: {
        start: hackSquatPinkStart,
        end: hackSquatPinkEnd,
      }
    },
    'bulgarian-split-squat': {
      blue: {
        start: bulgarianSplitSquatBlueStart,
        end: bulgarianSplitSquatBlueEnd,
      },
      pink: {
        start: bulgarianSplitSquatPinkStart,
        end: bulgarianSplitSquatPinkEnd,
      }
    },
    'barbell-front-squat': {
      blue: {
        start: barbellFrontSquatBlueStart,
        end: barbellFrontSquatBlueEnd,
      },
      pink: {
        start: barbellFrontSquatPinkStart,
        end: barbellFrontSquatPinkEnd,
      }
    },
    'walking-lunge': {
      blue: {
        start: walkingLungeBlueStart,
        end: walkingLungeBlueEnd,
      },
      pink: {
        start: walkingLungePinkStart,
        end: walkingLungePinkEnd,
      }
    },
    'barbell-hip-thrust': {
      blue: {
        start: barbellHipThrustBlueStart,
        end: barbellHipThrustBlueEnd,
      },
      pink: {
        start: barbellHipThrustPinkStart,
        end: barbellHipThrustPinkEnd,
      }
    },
    'seated-calf-raise': {
      blue: {
        start: seatedCalfRaiseBlueStart,
        end: seatedCalfRaiseBlueEnd,
      },
      pink: {
        start: seatedCalfRaisePinkStart,
        end: seatedCalfRaisePinkEnd,
      }
    },
    'back-extension': {
      blue: {
        start: backExtensionBlueStart,
        end: backExtensionBlueEnd,
      },
      pink: {
        start: backExtensionPinkStart,
        end: backExtensionPinkEnd,
      }
    },
    'hanging-leg-raise': {
      blue: {
        start: hangingLegRaiseBlueStart,
        end: hangingLegRaiseBlueEnd,
      },
      pink: {
        start: hangingLegRaisePinkStart,
        end: hangingLegRaisePinkEnd,
      }
    },
    'smith-machine-calf-raise': {
      blue: {
        start: smithMachineCalfRaiseBlueStart,
        end: smithMachineCalfRaiseBlueEnd,
      },
      pink: {
        start: smithMachineCalfRaisePinkStart,
        end: smithMachineCalfRaisePinkEnd,
      }
    },
    'dumbbell-wrist-curl': {
      blue: {
        start: dumbbellWristCurlBlueStart,
        end: dumbbellWristCurlBlueEnd,
      },
      pink: {
        start: dumbbellWristCurlPinkStart,
        end: dumbbellWristCurlPinkEnd,
      }
    },
    'reverse-wrist-curl': {
      blue: {
        start: reverseWristCurlBlueStart,
        end: reverseWristCurlBlueEnd,
      },
      pink: {
        start: reverseWristCurlPinkStart,
        end: reverseWristCurlPinkEnd,
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
  
  const exerciseName = exercise.exercise || exercise.name || '';
  if (!exerciseName) {
    console.log('❌ RESOLVE_IMAGE: No exercise name provided');
    return null;
  }
  
  const folderName = exerciseNameToFolder(exerciseName);
  
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
  
  const exerciseName = exercise.exercise || exercise.name || '';
  if (!exerciseName) {
    console.log('❌ RESOLVE_IMAGE_PAIR: No exercise name provided');
    return null;
  }
  
  const folderName = exerciseNameToFolder(exerciseName);
  
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