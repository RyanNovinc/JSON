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
  return `# JSON Workout Program Generator

You are generating a workout program from the PROGRAM SPECS provided. Output valid JSON that can be imported into a fitness app.

## CRITICAL: File Output Instructions

**DO NOT output JSON to chat** — it will hit token limits for programs longer than 4 weeks.

**You MUST:**
1. Create a file (use Code Interpreter on ChatGPT, or computer tool on Claude)
2. Write the complete JSON structure to the file
3. If you reach output limits, STOP at the end of a complete block, then continue appending to the same file
4. Never stop mid-block or mid-day
5. When finished, provide the download link

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
      "structure": "string (e.g. 'Push Pull Legs')",
      "days": [
        {
          "day_name": "string",
          "estimated_duration": number (minutes),
          "exercises": [
            // STRENGTH EXERCISE (most common)
            {
              "type": "strength",
              "exercise": "string (e.g. 'Barbell Back Squat')",
              "sets": number,
              "reps": "string (e.g. '8-12')",
              "rest": number (seconds - optimal rest),
              "restQuick": number (seconds - quick mode rest),
              "primaryMuscles": ["array from muscle taxonomy"],
              "secondaryMuscles": ["array from muscle taxonomy"],
              "reps_weekly": {
                "1": "string",
                "2": "string",
                "3": "string",
                "4": "string"
              },
              "sets_weekly": {
                "1": number,
                "2": number,
                "3": number,
                "4": number
              },
              "notes": "string (coaching cues)",
              "alternatives": [
                {
                  "exercise": "string",
                  "primaryMuscles": ["array"],
                  "secondaryMuscles": ["array"]
                }
              ]
            },
            // CARDIO EXERCISE
            {
              "type": "cardio",
              "activity": "string (e.g. 'Treadmill Run')",
              "duration_minutes": number,
              "distance_value": number (optional),
              "distance_unit": "km" | "miles" (optional),
              "target_intensity": "string (e.g. 'Zone 2')",
              "cardio_mode": "steady_state" | "intervals" | "HIIT",
              "progression_weekly": {
                "1": "20 min easy",
                "4": "30 min moderate"
              },
              "notes": "string"
            },
            // STRETCH EXERCISE
            {
              "type": "stretch",
              "exercise": "string (e.g. 'Pigeon Stretch')",
              "hold_seconds": number,
              "sets": number,
              "per_side": boolean,
              "primaryMuscles": ["array from muscle taxonomy"],
              "notes": "string"
            },
            // CIRCUIT EXERCISE
            {
              "type": "circuit",
              "circuit_name": "string (e.g. 'Core Finisher')",
              "rounds": number,
              "work_seconds": number,
              "rest_seconds": number,
              "exercises": [
                {
                  "exercise": "string",
                  "notes": "string (optional)"
                }
              ],
              "notes": "string"
            },
            // SPORT EXERCISE
            {
              "type": "sport",
              "activity": "string (e.g. 'Basketball')",
              "duration_minutes": number (optional),
              "notes": "string"
            }
          ]
        }
      ]
    }
  ]
}
\`\`\`

## Exercise Type Requirements

**STRENGTH EXERCISES (most common):**
- \`type\`: "strength"
- \`exercise\`: Full descriptive name (e.g. "Barbell Back Squat")
- \`sets\`: Integer
- \`reps\`: String (e.g. "8-12", "5", "10-15")
- \`rest\`: Seconds - optimal rest for muscle growth
- \`restQuick\`: Seconds - shorter rest for time-crunched sessions
- \`primaryMuscles\`: REQUIRED array from muscle taxonomy
- \`secondaryMuscles\`: REQUIRED array from muscle taxonomy
- \`reps_weekly\`: Optional progressive overload
- \`sets_weekly\`: Optional progressive overload
- \`notes\`: Optional form cues
- \`alternatives\`: Optional array of objects with exercise/primaryMuscles/secondaryMuscles

**CARDIO EXERCISES:**
- \`type\`: "cardio"
- \`activity\`: Activity name (e.g. "Treadmill Run")
- \`duration_minutes\`: Required integer
- \`distance_value\`: Optional number
- \`distance_unit\`: Optional "km" or "miles"
- \`target_intensity\`: Optional string (e.g. "Zone 2")
- \`cardio_mode\`: Optional "steady_state", "intervals", or "HIIT"
- \`progression_weekly\`: Optional weekly progression
- \`notes\`: Optional

**STRETCH EXERCISES:**
- \`type\`: "stretch"
- \`exercise\`: Exercise name (e.g. "Pigeon Stretch")
- \`hold_seconds\`: Required integer
- \`sets\`: Required integer
- \`per_side\`: Required boolean
- \`primaryMuscles\`: REQUIRED array from muscle taxonomy
- \`notes\`: Optional

**CIRCUIT EXERCISES:**
- \`type\`: "circuit"
- \`circuit_name\`: Required string
- \`rounds\`: Required integer
- \`work_seconds\`: Required integer
- \`rest_seconds\`: Required integer
- \`exercises\`: Required array of objects with exercise name
- \`notes\`: Optional

**SPORT EXERCISES:**
- \`type\`: "sport"
- \`activity\`: Required string (e.g. "Basketball")
- \`duration_minutes\`: Optional integer
- \`notes\`: Optional

## Programming Guidelines

**Rest Periods (seconds):**
- Heavy compounds (squat, deadlift, bench): rest 180-240, restQuick 120-150
- Moderate compounds (rows, presses): rest 120-180, restQuick 90-120  
- Isolation exercises: rest 60-90, restQuick 45-60

**Progressive Overload (reps_weekly):**
- For strength/hypertrophy blocks, decrease reps weekly as user increases weight
- Example: {"1": "12", "2": "10", "3": "8", "4": "6"}
- Keys must match number of weeks in block

**Alternatives (for strength exercises only):**
- Include 1-2 alternatives for exercises requiring specific equipment
- Each alternative is an object with exercise, primaryMuscles, secondaryMuscles
- All muscle groups must be from the approved taxonomy

**Notes:**
- Include form cues for complex lifts
- Add tips for beginners/intermediates
- Keep notes concise (1-2 sentences)

## Exercise Glossary

**Exercise Naming Convention:**
Use full descriptive exercise names with equipment prefix where applicable:
- Examples: "Barbell Back Squat", "Dumbbell Lateral Raise", "Cable Face Pull"
- Use consistent naming throughout the program
- No exercise glossary validation - freeform names accepted

**Muscle Groups (use exactly as listed):**
${JSON.stringify(MUSCLE_GROUPS, null, 2)}

## PROGRAM SPECS

${generateProgramSpecs(questionnaireData)}

## Output Requirements

**FORMAT REQUIREMENTS:**
- Create the program as a text document
- Use simple text formatting with headers, bullet points, and tables
- Make it fast to generate and easy to copy/edit
- Include clear section breaks and organized workout structure
- Structure each workout day with complete exercise details and instructions

**OUTPUT STRUCTURE:**
Provide a comprehensive workout program that includes:

1. **Program Overview** - Brief description and key programming details
2. **Complete Training Blocks** - All workout days with exercises, sets, reps, rest periods
3. **Exercise Specifications** - Form cues, alternatives, and coaching notes  
4. **Progression Guidelines** - How to advance through the program
5. **Implementation Notes** - Practical tips for following the program

Focus on practical, effective programming that matches the specified goals, experience level, and constraints.

Generate the complete workout program based on the PROGRAM SPECS provided.`;
};