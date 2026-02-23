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
  return `# Convert Workout Program to JSON

Convert the workout program above into valid JSON matching the schema below. Do NOT redesign the program — translate it exactly as written.

## Output Instructions

**Write the JSON to a file** — do not output it to chat (it will hit token limits).
1. Create a file and write the complete JSON
2. If you hit output limits, stop at the end of a complete block, then continue appending
3. Never stop mid-block or mid-day
4. When finished, provide the download link

## JSON Schema
\`\`\`json
{
  "routine_name": "string",
  "description": "string (2-3 sentence overview from the program)",
  "days_per_week": number,
  "blocks": [
    {
      "block_name": "string (e.g. 'Block A')",
      "weeks": "string (e.g. '1-4' — include deload week in the block)",
      "structure": "string (e.g. 'Push Pull Legs Upper Lower')",
      "deload_weeks": [number] (e.g. [4] — which weeks within this block are deload weeks),
      "days": [
        {
          "day_name": "string (e.g. 'Push', 'Lower', 'Cardio')",
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
  "exercise": "string (exact name from program)",
  "sets": number,
  "reps": "string (e.g. '8-10')",
  "rest": number (seconds — from program's rest period),
  "restQuick": number (seconds — 60-70% of rest value),
  "primaryMuscles": ["from taxonomy"],
  "secondaryMuscles": ["from taxonomy"],
  "reps_weekly": { "1": "10-12", "2": "8-10", "3": "6-8", "4": "12" },
  "sets_weekly": { "1": 4, "2": 4, "3": 4, "4": 3 },
  "notes": "string or omit if none",
  "alternatives": [
    { "exercise": "string", "primaryMuscles": ["..."], "secondaryMuscles": ["..."] }
  ]
}
\`\`\`

### Cardio Exercise
For cardio days with rotating activities, use ONE cardio entry with progression_weekly describing each week:
\`\`\`json
{
  "type": "cardio",
  "activity": "Mixed Cardio Rotation",
  "duration_minutes": number (average duration),
  "target_intensity": "string (default intensity)",
  "cardio_mode": "steady_state",
  "progression_weekly": {
    "1": "25 min treadmill — steady state, RPE 4-5",
    "2": "30 min stationary bike — steady state, RPE 4-5",
    "3": "35 min stair climber — intervals 30s hard/60s easy",
    "4": "20 min treadmill — easy pace (deload)"
  },
  "notes": "string"
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
  "notes": "string or omit"
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
  "exercises": [{ "exercise": "string", "notes": "string" }],
  "notes": "string or omit"
}
\`\`\`

### Sport Exercise
\`\`\`json
{
  "type": "sport",
  "activity": "string",
  "duration_minutes": number,
  "notes": "string or omit"
}
\`\`\`

## Muscle Taxonomy (use EXACTLY these names)
Chest, Front Delts, Side Delts, Rear Delts, Lats, Upper Back, Traps, Biceps, Triceps, Forearms, Quads, Hamstrings, Glutes, Calves, Core

## Translation Rules

1. **Do not change anything** — use the exact exercise names, sets, reps, rest periods, muscles, alternatives, and notes from the program
2. **Block structure** — each block includes its deload week. A program with "Block A Weeks 1-3 + Deload Week 4" becomes one block with weeks "1-4" and weekly progressions using keys "1" through "4"
3. **Weekly progressions** — map the program's "Weekly progression: Wk1: 10-12, Wk2: 8-10, Wk3: 6-8, Wk4 (deload): 3x12" into reps_weekly and sets_weekly. Deload weeks get reduced sets via sets_weekly
4. **Supersets** — place superset exercises adjacent in the exercises array. Add "Superset with [other exercise]" to both exercises' notes fields
5. **Cardio rotation** — if cardio activities change week to week, use a single cardio entry with progression_weekly describing each week's activity, duration, mode, and intensity
6. **restQuick** — calculate as roughly 60-70% of the rest value, rounded to a clean number (e.g. rest: 180 → restQuick: 120, rest: 90 → restQuick: 60)
7. **Empty secondary muscles** — if an exercise has no secondary muscles, use an empty array \`[]\`
8. **Deload days** — deload weeks use the same day structure but with reduced sets_weekly values. Do NOT create separate deload days — the weekly progression system handles it
9. **Deload weeks** — for deload weeks, use the same rep numbers without additional weight guidance in reps_weekly. The app will automatically display "DELOAD" labels and provide weight guidance elsewhere in the UI. Keep reps_weekly values clean (e.g., just "12", not "12 (light)")
10. **Block-relative keys** — weekly progression keys are always relative to the block, starting from "1". Block B (weeks 5-8) uses keys "1", "2", "3", "4" — not "5", "6", "7", "8". Each block is an independent cycle.
11. **Deload week tagging** — add a deload_weeks array to each block indicating which week numbers (block-relative) are deload weeks. For a standard 4-week block with week 4 as deload, use "deload_weeks": [4]. This allows the app to display a "DELOAD" label and automatic 50% weight guidance in the UI.`;
};