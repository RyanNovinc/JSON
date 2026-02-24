// Muscle group taxonomy - expanded granular list
export const MUSCLE_GROUPS = [
  'Chest', 'Front Delts', 'Side Delts', 'Rear Delts', 'Lats', 'Upper Back', 
  'Traps', 'Biceps', 'Triceps', 'Forearms', 'Quads', 'Hamstrings', 'Glutes', 
  'Calves', 'Core'
];

export interface QuestionnaireData {
  // Primary Goals
  primaryGoal?: string;
  customPrimaryGoal?: string;
  secondaryGoals?: string[];
  customSecondaryGoal?: string;
  specificSport?: string;
  athleticPerformanceDetails?: string;
  funSocialDetails?: string;
  injuryPreventionDetails?: string;
  flexibilityDetails?: string;
  customGoals?: string;
  
  // Training Frequency & Split
  totalTrainingDays?: number;
  gymTrainingDays?: number;
  otherTrainingDays?: number;
  customFrequency?: string;
  
  // Training Preferences
  priorityMuscleGroups?: string[];
  customMuscleGroup?: string;
  movementLimitations?: string[];
  customLimitation?: string;
  trainingStylePreference?: string;
  customTrainingStyle?: string;
  
  // Training Experience
  trainingExperience?: string;
  trainingApproach?: 'push_hard' | 'balanced' | 'conservative';
  
  // Program Preferences
  programDuration?: string;
  customDuration?: string;
  
  // Cardio Preferences (conditional - only when include_cardio secondary goal selected)
  cardioPreferences?: string[];

  // Equipment & Session Preferences
  selectedEquipment?: string[];
  specificEquipment?: string;
  unavailableEquipment?: string[];
  workoutDuration?: number;
  useAISuggestion?: boolean;
  restTimePreference?: string;
  useAIRestTime?: boolean;
  hasHeartRateMonitor?: boolean;
  
  // Exercise Preferences
  likedExercises?: string[];
  dislikedExercises?: string[];
  exerciseNoteDetail?: 'detailed' | 'brief' | 'minimal';
}

export const generateProgramSpecs = (data?: QuestionnaireData): string => {
  if (!data) {
    return `**No questionnaire data provided.** Please have the user complete the fitness questionnaire first to generate a personalized program.`;
  }

  let specs = "";

  // Primary Goal
  if (data.primaryGoal) {
    const goalMap: { [key: string]: string } = {
      'burn_fat': 'Fat Loss (lose weight while preserving muscle)',
      'build_muscle': 'Muscle Building (gain lean mass and size)',
      'gain_strength': 'Strength Building (increase power and max lifts)',
      'body_recomposition': 'Body Recomposition (lose fat and gain muscle)',
      'sport_specific': 'Sport-Specific Training (performance training)',
      'general_fitness': 'General Fitness & Health (balanced approach)',
      'custom_primary': 'Custom Goal (user-defined objective)',
    };
    specs += `**Primary Goal:** ${goalMap[data.primaryGoal] || data.primaryGoal}\n`;
  }

  // Secondary Goals
  if (data.secondaryGoals && data.secondaryGoals.length > 0) {
    const secondaryMap: { [key: string]: string } = {
      'include_cardio': 'Include Cardiovascular Training',
      'athletic_performance': 'Athletic Performance Enhancement',
      'fun_social': 'Fun & Social Activities',
      'injury_prevention': 'Injury Prevention',
      'maintain_flexibility': 'Flexibility & Mobility',
    };
    const secondaryList = data.secondaryGoals.map(goal => secondaryMap[goal] || goal).join(', ');
    specs += `**Secondary Goals:** ${secondaryList}\n`;
  }

  // Specific Details
  if (data.specificSport) specs += `**Specific Sport:** ${data.specificSport}\n`;
  if (data.athleticPerformanceDetails) specs += `**Athletic Performance Focus:** ${data.athleticPerformanceDetails}\n`;
  if (data.funSocialDetails) specs += `**Fun/Social Activities:** ${data.funSocialDetails}\n`;
  if (data.injuryPreventionDetails) specs += `**Injury Prevention Focus:** ${data.injuryPreventionDetails}\n`;
  if (data.flexibilityDetails) specs += `**Flexibility Goals:** ${data.flexibilityDetails}\n`;
  if (data.customGoals) specs += `**Additional Goals:** ${data.customGoals}\n`;

  // Training Schedule
  if (data.totalTrainingDays) {
    specs += `\n**Training Schedule:**\n`;
    specs += `- Total training days per week: ${data.totalTrainingDays}\n`;
    
    if (data.gymTrainingDays) {
      // Get the primary goal title for gym days
      const primaryGoalTitle = data.customPrimaryGoal || (() => {
        const goalMap: { [key: string]: string } = {
          'burn_fat': 'Fat Loss',
          'build_muscle': 'Muscle Building',
          'gain_strength': 'Strength Training',
          'body_recomposition': 'Body Recomposition',
          'sport_specific': 'Sport-Specific Training',
          'general_fitness': 'General Fitness',
          'custom_primary': 'Custom Goal'
        };
        return goalMap[data.primaryGoal] || 'Gym Training';
      })();
      specs += `- ${primaryGoalTitle} days: ${data.gymTrainingDays}\n`;
    }
    
    if (data.otherTrainingDays && data.secondaryGoals && data.secondaryGoals.length > 0) {
      // Build specific description of what "other activities" includes
      const secondaryActivities: string[] = [];
      
      if (data.secondaryGoals.includes('include_cardio')) {
        secondaryActivities.push('cardiovascular training');
      }
      if (data.secondaryGoals.includes('maintain_flexibility')) {
        secondaryActivities.push('flexibility/mobility work');
      }
      if (data.secondaryGoals.includes('athletic_performance')) {
        if (data.athleticPerformanceDetails) {
          secondaryActivities.push(`athletic performance training (${data.athleticPerformanceDetails})`);
        } else {
          secondaryActivities.push('athletic performance training');
        }
      }
      if (data.secondaryGoals.includes('injury_prevention')) {
        if (data.injuryPreventionDetails) {
          secondaryActivities.push(`injury prevention work (${data.injuryPreventionDetails})`);
        } else {
          secondaryActivities.push('injury prevention exercises');
        }
      }
      if (data.secondaryGoals.includes('fun_social')) {
        if (data.funSocialDetails) {
          secondaryActivities.push(`recreational activities (${data.funSocialDetails})`);
        } else {
          secondaryActivities.push('fun & social activities');
        }
      }
      if (data.secondaryGoals.includes('custom_secondary') && data.customSecondaryGoal) {
        secondaryActivities.push(data.customSecondaryGoal.toLowerCase());
      }
      
      const activitiesDescription = secondaryActivities.length > 0 
        ? secondaryActivities.join(', ') 
        : 'other activities';
        
      specs += `- Additional focus days (${activitiesDescription}): ${data.otherTrainingDays}\n`;
    }
    
    if (data.customFrequency) specs += `- Custom frequency notes: ${data.customFrequency}\n`;
  }

  // Training Experience
  if (data.trainingExperience) {
    const expMap: { [key: string]: string } = {
      'complete_beginner': 'Complete Beginner (new to gym or returning after 6+ months)',
      'beginner': 'Beginner (6-12 months consistent training, learning form)',
      'intermediate': 'Intermediate (1+ years training, good form, steady progress)',
      'advanced': 'Advanced (2+ years, excellent technique, slow progression)',
    };
    specs += `\n**Training Experience:** ${expMap[data.trainingExperience] || data.trainingExperience}\n`;
  }

  // Training Approach
  if (data.trainingApproach) {
    const approachMap: { [key: string]: string } = {
      'push_hard': 'Push Hard — program toward upper end of optimal volume ranges. User understands this requires good sleep, nutrition, and recovery.',
      'balanced': 'Balanced — program in the middle of optimal volume ranges. Sustainable for most people with moderate recovery.',
      'conservative': 'Conservative — program toward lower end of volume ranges. Prioritize efficiency and easy recovery.'
    };
    specs += `**Training Approach:** ${approachMap[data.trainingApproach] || data.trainingApproach}\n`;
  }

  // Program Duration
  if (data.programDuration) {
    const durationMap: { [key: string]: string } = {
      '4_weeks': '4 weeks (quick trial program)',
      '8_weeks': '8 weeks (focused short-term program)',
      '12_weeks': '12 weeks (complete transformation cycle)',
      '6_months': '6 months (comprehensive progression)',
      '1_year': '1 year (long-term development plan)',
      'custom': data.customDuration || 'Custom duration',
    };
    specs += `\n**Program Duration:** ${durationMap[data.programDuration] || data.programDuration}\n`;
  }

  // Cardio Preferences (only when include_cardio is selected)
  if (data.secondaryGoals?.includes('include_cardio') && data.cardioPreferences && data.cardioPreferences.length > 0) {
    const cardioMap: { [key: string]: string } = {
      'treadmill': 'Treadmill / Indoor Running',
      'stationary_bike': 'Stationary Bike / Cycling',
      'rowing_machine': 'Rowing Machine',
      'swimming': 'Swimming',
      'stair_climber': 'Stair Climber / StepMill',
      'elliptical': 'Elliptical',
      'jump_rope': 'Jump Rope',
      'outdoor_running': 'Outdoor Running / Walking',
      'no_preference': 'No Preference (AI chooses)',
    };
    const preferredActivities = data.cardioPreferences.map(activity => cardioMap[activity] || activity).join(', ');
    specs += `**Preferred Cardio Activities:** ${preferredActivities}\n`;
  }

  // Priority Muscle Groups
  if (data.priorityMuscleGroups && data.priorityMuscleGroups.length > 0) {
    specs += `\n**Priority Muscle Groups:** ${data.priorityMuscleGroups.join(', ')}\n`;
    if (data.customMuscleGroup) specs += `**Custom Muscle Group:** ${data.customMuscleGroup}\n`;
  }

  // Movement Limitations
  if (data.movementLimitations && data.movementLimitations.length > 0) {
    // Filter out "Other" since custom limitation field captures the specific details
    const filteredLimitations = data.movementLimitations.filter(limitation => limitation !== 'Other');
    if (filteredLimitations.length > 0) {
      specs += `\n**Movements to Avoid:** ${filteredLimitations.join(', ')}\n`;
    }
    if (data.customLimitation) specs += `**Custom Limitation to Avoid:** ${data.customLimitation}\n`;
  }

  // Custom training style details (if provided)
  if (data.customTrainingStyle) specs += `**Custom Training Style:** ${data.customTrainingStyle}\n`;

  // Equipment & Session Preferences
  if (data.selectedEquipment && data.selectedEquipment.length > 0) {
    const equipmentMap: { [key: string]: string } = {
      'commercial_gym': 'Commercial Gym (full equipment access including barbells, dumbbells, cables, machines)',
      'home_gym': 'Home Gym (personal equipment setup)',
      'bodyweight': 'Bodyweight Only (no equipment)',
      'basic_equipment': 'Basic Equipment (dumbbells, resistance bands)'
    };
    const mappedEquipment = data.selectedEquipment.map(eq => equipmentMap[eq] || eq);
    specs += `\n**Available Equipment:** ${mappedEquipment.join(', ')}\n`;
  }
  if (data.specificEquipment) specs += `**Specific Equipment Notes:** ${data.specificEquipment}\n`;
  if (data.unavailableEquipment && data.unavailableEquipment.length > 0) {
    specs += `**Equipment to Avoid:** ${data.unavailableEquipment.join(', ')}\n`;
  }
  // Handle workout duration (including AI optimization case)
  if (data.workoutDuration && data.workoutDuration > 0) {
    specs += `**Preferred Session Length:** ${data.workoutDuration} minutes\n`;
  } else if (data.useAISuggestion) {
    specs += `**Session Length:** Not specified — design session length based on the user's goal, experience level, and number of exercises. For hypertrophy with an advanced lifter, 60-75 minutes is typical.\n`;
  }
  
  if (data.hasHeartRateMonitor !== undefined) {
    specs += `**Heart Rate Monitor:** ${data.hasHeartRateMonitor ? 'Available (can use for cardio optimization)' : 'Not available'}\n`;
  }
  
  // Handle rest time preference (including AI optimization case)
  if (data.restTimePreference) {
    const restMap: { [key: string]: string } = {
      'optimal': 'Optimal (longer rest for maximum performance)',
      'moderate': 'Moderate (balanced rest periods)',
      'minimal': 'Minimal (shorter rest for time efficiency)'
    };
    specs += `**Rest Time Preference:** ${restMap[data.restTimePreference] || data.restTimePreference}\n`;
  } else if (data.useAIRestTime) {
    specs += `**Rest Time Preference:** Not specified — use evidence-based rest periods appropriate for the user's goal. For hypertrophy: 1-2 min for compounds, 60-90 sec for isolation. For strength: 2-3 min for main lifts.\n`;
  }

  // Exercise Preferences
  if (data.likedExercises && data.likedExercises.length > 0) {
    specs += `\n**Preferred Exercises:** ${data.likedExercises.join(', ')}\n`;
  }
  if (data.dislikedExercises && data.dislikedExercises.length > 0) {
    specs += `**Exercises to Avoid:** ${data.dislikedExercises.join(', ')}\n`;
  }

  // Exercise Note Detail
  if (data.exerciseNoteDetail) {
    const detailLabels = {
      'detailed': 'Include detailed step-by-step form instructions for every exercise',
      'brief': 'Include brief coaching cues for compound lifts only',
      'minimal': 'Only include non-obvious technique tips or specific setup instructions — do not explain standard exercises'
    };
    specs += `**Exercise Note Detail:** ${detailLabels[data.exerciseNoteDetail]}\n`;
  }

  return specs;
};

export const getAIPrompt = (questionnaireData?: QuestionnaireData) => {
  return `# Generate Workout Program as JSON

You are given a training plan above. Generate the complete program as JSON files matching the schema below. Build directly to JSON — do not create markdown, documents, or any intermediate format.

## Output Instructions

**JSON only** — do not reproduce the program in chat or create any text version. Only output JSON file(s).

**Write JSON to a file** — do not output it to chat.
1. Create a file and write the complete JSON
2. When finished, provide the download link

**Multi-block programs:**
Generate one block at a time. After each block:
1. Provide the download link for that block's JSON file
2. Say: "Ready to import. Say **next** when you want the next block."

Each block should be a complete, standalone JSON file with routine_name, description, days_per_week, and a single block in the blocks array. Keep routine_name and description consistent across all files.

## Exercise Detail

For each exercise in the plan, you must design:
- **Sets and reps per week** across the block (reps_weekly, sets_weekly). Do not include weight/load guidance — the app doesn't track weight. reps_weekly values must be comma-separated rep targets per set (e.g., "10, 10, 10, 8"), not shorthand like "4x10".
- **Rest periods** — evidence-based defaults (compounds: 120-180 sec, isolation: 60-90 sec)
- **2 alternative exercises** — each with their own primary/secondary muscles from the taxonomy
- **Superset pairings** — if the plan specifies supersets, note them in both exercises
- **Notes** — only non-obvious technique tips or specific setup instructions
- **Deload weeks** — express through reduced sets (sets_weekly) and/or higher rep ranges. Do not reference weight.

## JSON Schema

\`\`\`json
{
  "routine_name": "string",
  "description": "string",
  "days_per_week": number,
  "blocks": [
    {
      "block_name": "string",
      "weeks": "string (e.g. '1-4')",
      "structure": "string (e.g. 'Push Pull Legs Upper Lower')",
      "deload_weeks": [number] (optional — e.g. [4]),
      "days": [
        {
          "day_name": "string",
          "estimated_duration": number (minutes),
          "exercises": [Exercise]
        }
      ]
    }
  ]
}
\`\`\`

### Strength Exercise
\`\`\`json
{
  "type": "strength",
  "exercise": "string",
  "sets": number,
  "reps": "string",
  "rest": number (seconds),
  "restQuick": number (seconds — ~65% of rest, rounded),
  "primaryMuscles": ["from taxonomy"],
  "secondaryMuscles": ["from taxonomy, or empty array"],
  "reps_weekly": { "1": "string", "2": "string", ... },
  "sets_weekly": { "1": number, "2": number, ... },
  "notes": "string (optional)",
  "alternatives": [
    { "exercise": "string", "primaryMuscles": [...], "secondaryMuscles": [...] }
  ]
}
\`\`\`

### Cardio Exercise
\`\`\`json
{
  "type": "cardio",
  "activity": "string",
  "duration_minutes": number,
  "target_intensity": "string (optional)",
  "cardio_mode": "string (optional)",
  "progression_weekly": { "1": "string", "2": "string", ... },
  "notes": "string (optional)"
}
\`\`\`

### Stretch Exercise
\`\`\`json
{
  "type": "stretch",
  "exercise": "string",
  "hold_seconds": number,
  "sets": number,
  "per_side": boolean,
  "primaryMuscles": ["from taxonomy"],
  "notes": "string (optional)"
}
\`\`\`

### Circuit Exercise
\`\`\`json
{
  "type": "circuit",
  "circuit_name": "string",
  "rounds": number,
  "work_seconds": number,
  "rest_seconds": number,
  "exercises": [{ "exercise": "string", "notes": "string (optional)" }],
  "notes": "string (optional)"
}
\`\`\`

### Sport Exercise
\`\`\`json
{
  "type": "sport",
  "activity": "string",
  "duration_minutes": number (optional),
  "notes": "string (optional)"
}
\`\`\`

## Muscle Taxonomy (use EXACTLY these names)
Chest, Front Delts, Side Delts, Rear Delts, Lats, Upper Back, Traps, Biceps, Triceps, Forearms, Quads, Hamstrings, Glutes, Calves, Core

## Translation Rules

1. **Follow the plan** — use the exercise names, sets, muscles, and structure from the plan. Design rep progressions, rest periods, alternatives, and notes.
2. **Block-relative keys** — weekly progression keys always start from "1" within each block. Block B (weeks 7-12) uses "1", "2", "3"... not "7", "8", "9".
3. **Deload tagging** — if a block has deload weeks, add a deload_weeks array with the block-relative week numbers (e.g. [6] for a 6-week block).
4. **Supersets** — place superset exercises adjacent in the exercises array. Include "Superset with [exercise name]" in both exercises' notes.
5. **Cardio rotation** — if cardio activities change week to week, use a single cardio entry with progression_weekly describing each week.
6. **restQuick** — calculate as ~65% of the rest value, rounded to a clean number.
7. **Empty arrays** — if an exercise has no secondary muscles, use []. Do not omit the field.
8. **Exercise name consistency** — use the exact same name for the same exercise across all blocks and days. Do not vary naming (e.g., always "Overhead Cable Extension", never "Cable Overhead Extension").
9. **Self-review** — before presenting each block, review your output as an experienced coach would. Check: rep progression logic across weeks, superset exercises are adjacent in the array, exercise names are identical where they repeat, rest periods match exercise type, muscle tags are accurate, deload week reduces volume, and the plan's exercise selections/sets/structure were faithfully translated. Fix any issues silently. After the download link, briefly list what you verified.`;
};