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
  customSecondaryGoal?: string;
  integrationMethods?: { [goalId: string]: 'integrated' | 'dedicated' };
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
  
  // Volume Preference
  volumePreference?: '8-12' | '12-16' | '16-20' | 'custom' | 'not_sure';
  customVolume?: string;
  gender?: 'male' | 'female' | 'prefer_not_to_say';
  
  // Program Preferences
  programDuration?: string;
  customDuration?: string;
  
  // Cardio Preferences (conditional - only when include_cardio secondary goal selected)
  cardioPreferences?: string[];

  // Equipment & Session Preferences
  selectedEquipment?: string[];
  specificEquipment?: string;
  unavailableEquipment?: string[];
  sessionStyle?: 'optimal' | 'moderate' | 'minimal';
  
  // Exercise Preferences
  likedExercises?: string[];
  dislikedExercises?: string[];
  exerciseNoteDetail?: 'detailed' | 'brief' | 'minimal';
  includeDirectCore?: boolean;
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

  // Secondary Goals - now handled through integrationMethods
  if (data.integrationMethods) {
    const secondaryMap: { [key: string]: string } = {
      'include_cardio': 'Include Cardiovascular Training',
      'athletic_performance': 'Athletic Performance Enhancement',
      'fun_social': 'Fun & Social Activities',
      'injury_prevention': 'Injury Prevention',
      'maintain_flexibility': 'Flexibility & Mobility',
    };
    
    const integratedGoals: string[] = [];
    const dedicatedGoals: string[] = [];
    
    Object.entries(data.integrationMethods).forEach(([goal, method]) => {
      const goalLabel = secondaryMap[goal] || goal;
      if (method === 'integrated') {
        integratedGoals.push(goalLabel);
      } else if (method === 'dedicated') {
        dedicatedGoals.push(goalLabel);
      }
    });
    
    if (integratedGoals.length > 0) {
      specs += `**Integrated Secondary Goals:** ${integratedGoals.join(', ')} (build these into primary workout sessions)\n`;
    }
    if (dedicatedGoals.length > 0) {
      specs += `**Dedicated Secondary Goals:** ${dedicatedGoals.join(', ')} (separate focused sessions required)\n`;
    }
  }

  // Specific Details
  if (data.specificSport && typeof data.specificSport === 'string') specs += `**Specific Sport:** ${data.specificSport}\n`;
  if (data.athleticPerformanceDetails && typeof data.athleticPerformanceDetails === 'string') specs += `**Athletic Performance Focus:** ${data.athleticPerformanceDetails}\n`;
  if (data.funSocialDetails && typeof data.funSocialDetails === 'string') specs += `**Fun/Social Activities:** ${data.funSocialDetails}\n`;
  if (data.injuryPreventionDetails && typeof data.injuryPreventionDetails === 'string') specs += `**Injury Prevention Focus:** ${data.injuryPreventionDetails}\n`;
  if (data.flexibilityDetails && typeof data.flexibilityDetails === 'string') specs += `**Flexibility Goals:** ${data.flexibilityDetails}\n`;
  if (data.customGoals && typeof data.customGoals === 'string') specs += `**Additional Goals:** ${data.customGoals}\n`;

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
    
    // Secondary goal integration details
    if (data.integrationMethods) {
      const integratedActivities: string[] = [];
      const dedicatedActivities: string[] = [];
      
      Object.entries(data.integrationMethods).forEach(([goal, method]) => {
        const activityMap: { [key: string]: string } = {
          'include_cardio': 'cardiovascular training',
          'maintain_flexibility': 'flexibility/mobility work',
          'athletic_performance': data.athleticPerformanceDetails && typeof data.athleticPerformanceDetails === 'string'
            ? `athletic performance training (${data.athleticPerformanceDetails})` 
            : 'athletic performance training',
          'injury_prevention': data.injuryPreventionDetails && typeof data.injuryPreventionDetails === 'string'
            ? `injury prevention work (${data.injuryPreventionDetails})`
            : 'injury prevention exercises',
          'fun_social': data.funSocialDetails && typeof data.funSocialDetails === 'string'
            ? `recreational activities (${data.funSocialDetails})`
            : 'fun & social activities',
          'custom_secondary': data.customSecondaryGoal?.toLowerCase() || 'custom focus'
        };
        
        const activity = activityMap[goal] || goal;
        
        if (method === 'integrated') {
          integratedActivities.push(activity);
        } else if (method === 'dedicated') {
          dedicatedActivities.push(activity);
        }
      });
      
      if (integratedActivities.length > 0) {
        specs += `- Integrated focus areas: ${integratedActivities.join(', ')} (build into primary workouts)\n`;
      }
      if (dedicatedActivities.length > 0 && data.otherTrainingDays && data.otherTrainingDays > 0) {
        specs += `- Dedicated focus days: ${dedicatedActivities.join(', ')} (${data.otherTrainingDays} ${data.otherTrainingDays === 1 ? 'day' : 'days'})\n`;
      }
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
    
    const exerciseGuidance: { [key: string]: string } = {
      'complete_beginner': 'Focus on basic compound movements only (squat, deadlift, bench press, rows). Avoid complex exercises like Bulgarian split squats, deficit deadlifts, or advanced variations. Use machine alternatives when form is still developing.',
      'beginner': 'Primarily compound movements with some basic isolation work. Stick to standard exercise variations. Avoid unilateral exercises, complex supersets, or advanced techniques.',
      'intermediate': 'Mix of compound and isolation exercises. Can handle standard exercise variations and some unilateral work. Introduce basic supersets and intensity techniques sparingly.',
      'advanced': 'Full range of exercises including advanced variations, unilateral movements, and complex techniques. Can handle deficit movements, pause reps, drop sets, and challenging exercise combinations.'
    };
    
    specs += `\n**Training Experience:** ${expMap[data.trainingExperience] || data.trainingExperience}\n`;
    specs += `**Exercise Selection Guidance:** ${exerciseGuidance[data.trainingExperience] || 'Use appropriate exercise complexity for experience level'}\n`;
  }

  // Volume Preference
  if (data.volumePreference) {
    let volumeText = '';
    if (data.volumePreference === 'custom' && data.customVolume) {
      volumeText = `${data.customVolume} sets per week per muscle group`;
    } else if (data.volumePreference === 'not_sure') {
      volumeText = 'User needs volume assessment - use moderate volume (12-16 sets/week) as default';
    } else {
      volumeText = `${data.volumePreference} sets per week per muscle group`;
    }
    specs += `**Weekly Volume Target:** ${volumeText}\n`;
  }

  // Gender (for volume context)
  if (data.gender) {
    const genderText = data.gender === 'prefer_not_to_say' ? 'Prefer not to say' : data.gender;
    specs += `**Gender:** ${genderText} (affects volume tolerance)\n`;
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
  if (data.integrationMethods?.['include_cardio'] && data.cardioPreferences && Array.isArray(data.cardioPreferences) && data.cardioPreferences.length > 0) {
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
  if (data.priorityMuscleGroups && Array.isArray(data.priorityMuscleGroups) && data.priorityMuscleGroups.length > 0) {
    specs += `\n**Priority Muscle Groups:** ${data.priorityMuscleGroups.join(', ')}\n`;
    if (data.customMuscleGroup && typeof data.customMuscleGroup === 'string') specs += `**Custom Muscle Group:** ${data.customMuscleGroup}\n`;
  }

  // Movement Limitations
  if (data.movementLimitations && Array.isArray(data.movementLimitations) && data.movementLimitations.length > 0) {
    // Filter out "Other" since custom limitation field captures the specific details
    const filteredLimitations = data.movementLimitations.filter(limitation => limitation !== 'Other');
    if (filteredLimitations.length > 0) {
      specs += `\n**Movements to Avoid:** ${filteredLimitations.join(', ')}\n`;
    }
    if (data.customLimitation && typeof data.customLimitation === 'string') specs += `**Custom Limitation to Avoid:** ${data.customLimitation}\n`;
  }

  // Training style preference (if provided)
  if (data.trainingStylePreference && typeof data.trainingStylePreference === 'string') specs += `**Training Style:** ${data.trainingStylePreference}\n`;
  
  // Custom training style details (if provided)
  if (data.customTrainingStyle && typeof data.customTrainingStyle === 'string') specs += `**Custom Training Style:** ${data.customTrainingStyle}\n`;

  // Equipment & Session Preferences
  if (data.selectedEquipment && Array.isArray(data.selectedEquipment) && data.selectedEquipment.length > 0) {
    const equipmentMap: { [key: string]: string } = {
      'commercial_gym': 'Commercial Gym (full equipment access including barbells, dumbbells, cables, machines)',
      'home_gym': 'Home Gym (personal equipment setup)',
      'bodyweight': 'Bodyweight Only (no equipment)',
      'basic_equipment': 'Basic Equipment (dumbbells, resistance bands)'
    };
    const mappedEquipment = data.selectedEquipment.map(eq => equipmentMap[eq] || eq);
    specs += `\n**Available Equipment:** ${mappedEquipment.join(', ')}\n`;
  }
  if (data.specificEquipment && typeof data.specificEquipment === 'string') specs += `**Specific Equipment Notes:** ${data.specificEquipment}\n`;
  if (data.unavailableEquipment && Array.isArray(data.unavailableEquipment) && data.unavailableEquipment.length > 0) {
    specs += `**Equipment to Avoid:** ${data.unavailableEquipment.join(', ')}\n`;
  }
  // Session Style (replaces separate duration and rest time preferences)
  if (data.sessionStyle) {
    const sessionMap: { [key: string]: string } = {
      'optimal': 'Rest Style: Optimal — full recovery between sets. Compounds: 2-3 min, Isolation: 90-120s. Session duration is unconstrained — let it be whatever the rest periods require.',
      'moderate': 'Rest Style: Moderate — compounds: 90-120s, isolation: 60-90s. Sessions typically 60-75 minutes.',
      'minimal': 'Rest Style: Minimal — compounds: 60-90s, isolation: 45-60s. Prioritizes time efficiency over per-set performance.'
    };
    specs += `**${sessionMap[data.sessionStyle]}\n`;
  } else {
    specs += `**Rest Style: Moderate — compounds: 90-120s, isolation: 60-90s. Sessions typically 60-75 minutes.\n`;
  }

  // Exercise Preferences
  if (data.likedExercises && Array.isArray(data.likedExercises) && data.likedExercises.length > 0) {
    specs += `\n**Preferred Exercises:** ${data.likedExercises.join(', ')}\n`;
  }
  if (data.dislikedExercises && Array.isArray(data.dislikedExercises) && data.dislikedExercises.length > 0) {
    specs += `**Exercises to Avoid:** ${data.dislikedExercises.join(', ')}\n`;
  }

  // Exercise Note Detail
  if (data.exerciseNoteDetail && typeof data.exerciseNoteDetail === 'string') {
    const detailLabels: { [key: string]: string } = {
      'detailed': 'Include detailed step-by-step form instructions for every exercise',
      'brief': 'Include brief coaching cues for compound lifts only',
      'minimal': 'Only include non-obvious technique tips or specific setup instructions — do not explain standard exercises'
    };
    specs += `**Exercise Note Detail:** ${detailLabels[data.exerciseNoteDetail] || data.exerciseNoteDetail}\n`;
  }

  if (data.includeDirectCore !== undefined) {
    specs += `**Direct Core Work:** ${data.includeDirectCore ? 'Yes — include dedicated core exercises' : 'No — omit direct core work'}\n`;
  }

  return specs;
};

export const getAIPrompt = (questionnaireData?: QuestionnaireData, outputPreference?: string) => {
  // Calculate equipment-specific transition tax
  const equipment = questionnaireData?.selectedEquipment ?? [];
  const transitionTax = equipment.includes('commercial_gym') 
    ? 150  // seconds per exercise
    : equipment.includes('home_gym') 
    ? 90 
    : 60;

  // Determine output format based on user preference
  const outputInstructions = outputPreference === 'copy_paste' 
    ? `**Output each block as a \`\`\`json code block in chat. Do not create files.**`
    : `**Write each block as a .json file. Do not output JSON to chat.**
1. Create a file and write the complete JSON
2. When finished, provide the download link`;

  return `# Generate Workout Program as JSON
// PROMPT 3: JSON Generation Prompt - Converts verified workout plans to JSON format

You are given a training plan above that has been reviewed and approved for quality. Generate the complete program as JSON files matching the schema below. Focus on accurate technical implementation rather than plan validation. Build directly to JSON — do not create markdown, documents, or any intermediate format.

## Constraint Reference Block

Before generating, note from the plan:
- Recommended split and session focus per day
- Any re-entry protocol requirements

Use these when applying rest style parameters and validating day structure.

## Output Instructions

**JSON only** — do not reproduce the program in chat or create any text version. Only output JSON file(s).

${outputInstructions}

**Multi-block programs:**
Generate one block at a time. After each block:
1. ${outputPreference === 'copy_paste' ? 'Output the JSON in a code block' : 'Provide the download link for that block\'s JSON file'}
2. Output a brief **volume summary** showing total primary-tagged sets per muscle group for that block (training weeks, not deload). This gives the reviewer something to check against.
3. Say: "Block 1 complete. Say 'review' to validate this block before continuing, or 'next' to generate Block 2 directly."
4. **STOP and wait for user input.** Do not proceed to the next block until the user responds.

**When user says "next" for subsequent blocks:**
1. Generate the next block directly as JSON format (do not create text version first)
2. Apply the same JSON schema and structure established above
3. ${outputPreference === 'copy_paste' ? 'Output the JSON in a code block' : 'Write the JSON to a file and provide download link'}
4. Output volume summary for the new block
5. Say: "Block [X] complete. Say 'review' to validate this block before continuing, or 'next' to generate Block [X+1] directly."
6. **STOP and wait for user input.** Do not proceed to the next block until the user responds.

**When user says "review" for any block:**
1. Read the workout program document from earlier in the conversation
2. Apply the embedded review checklist below to the specified block  
3. Generate the corrected JSON version with all fixes applied
4. ${outputPreference === 'copy_paste' ? 'Output the corrected JSON in a code block' : 'Write corrected JSON to file and provide download link'}
5. Say: "Block [X] reviewed and updated. Say 'next' to continue to Block [X+1]."

### Embedded Review Checklist

Re-read the workout plan document from earlier in the conversation. Compare your JSON output against the plan and fix any discrepancies in exercise names, set counts, muscle tags, superset pairings, or day structure.

Each block should be a complete, standalone JSON file with routine_name, description, days_per_week, and a single block in the blocks array. Keep routine_name and description consistent across all files.

**Long programs (5+ blocks):** Continue generating blocks in this same conversation. Do not suggest starting a fresh chat.

**Mesocycle-based programs:** If the plan states this is Mesocycle [X] of [N], after generating and delivering the FINAL block of this mesocycle:

If X < N:
1. Output a Mesocycle [X] Summary:
   - Phase name and training emphasis
   - Split structure used
   - Rep range focus
   - Volume per muscle group (sets/week from your volume summaries)
   - Key exercises used across all blocks
2. Then say: "Mesocycle [X] complete. When you're ready to continue, just ask me to generate Mesocycle [X+1] — I'll use the roadmap and summary above to design the next phase in this same conversation."

If X equals N, say: "That completes your full program — all [N] mesocycles are done. Enjoy your training!"

The plan is fully self-contained: it lists all exercise pools, block structures, and periodization details. You do not need conversation history from prior blocks to generate any block correctly. Always reference the plan — never rely on memory of prior blocks in the conversation.

---

## Translation Principles

1. **The plan is authoritative** — use the exercise names, sets, muscle tags, superset pairings, and day structure exactly as specified. Do not add, remove, or rename exercises. If the plan declares a mesocycle structure, append the mesocycle name to routine_name in every JSON file. The reviewed plan's set counts are final — do not adjust them based on your own volume recalculation.
2. **Treat exercise names as identifiers** — use the exact same string for the same exercise across all blocks, days, notes, and superset references. Never vary naming.
3. **Design what the plan doesn't specify** — you are responsible for rest periods, alternative exercises, and technique notes. For rep progressions: follow the plan's scheme if stated, otherwise use the defaults below.
4. **Only program working sets** — do not include warm-up sets.

---

## Exercise Programming Details

### Rep Progressions

For each exercise, design a weekly rep progression across the block. Since the app doesn't track weight, progressions are expressed entirely through rep targets — the user manages their own load increases.

**Starting point rule:**
Start at the TOP of the prescribed range in Week 1, reduce across the block. The rep ceiling is Week 1; the floor is the final training week before deload. This signals increasing load week over week.

**Linear progression (default for all exercises):**
Maintain rep targets in early weeks. Slight rep reduction in later weeks signals that the lifter should be using heavier loads.
Example (5-week block, 4 sets): Week 1: "10, 10, 10, 8" → Week 2: "10, 10, 8, 8" → Week 3: "8, 8, 8, 8" → Week 4: "8, 8, 6, 6" → Week 5 (deload): "12, 12"

\`reps_weekly\` values must be comma-separated rep targets per set (e.g., "10, 10, 10, 8"), not shorthand like "4x10".

**Match progressions to the plan's rep range focus.** If the plan says "Block B: Strength — 5-8 reps," your compound progressions should work within that range. Isolation exercises can run 2-4 reps higher than the block's stated range (e.g., 8-12 isolation reps in a "5-8" strength block is fine).

### Rest Periods

Use rest periods from the plan if specified, otherwise apply evidence-based defaults appropriate for exercise type and training goal. Calculate restQuick as approximately 65% of the main rest period.

**Superset rest encoding:** For superset pairs, the first exercise (SS[n]a) gets a brief transition rest to move to the second exercise. The second exercise (SS[n]b) gets the full rest appropriate to the exercise type before repeating the pair.

### Alternative Exercises

Each exercise must include 2 alternatives (1 for bodyweight-only programs). Alternatives should target the same primary muscles, use different equipment or movement variations, and include their own primaryMuscles and secondaryMuscles tags.

### Notes

Only include non-obvious technique tips or specific setup instructions. Do not add notes for standard exercises performed in standard ways. If the plan includes notes for an exercise, carry them through.

### Supersets

Place superset exercises adjacent in the exercises array. Include "Superset with [exact exercise name]" in both exercises' notes field. Add "superset_group": "ss1" (or "ss2", "ss3" etc.) to both exercises in the pair — use the same string value for both. The plan marks supersets with SS[n]a/SS[n]b notation — translate these to adjacent array entries with matching superset_group values.

---

## Muscle Taxonomy

Use the exact muscle taxonomy and compound exercise tagging guide from the workout plan above. Do not use generic terms like "Shoulders", "Back", "Arms", or "Legs".

---

## JSON Schema

\`\`\`json
{
  "routine_name": "string",
  "description": "string",
  "days_per_week": 7, // Always 7 for programs with rest days
  "blocks": [
    {
      "block_name": "string",
      "weeks": "string (e.g. '1-6')",
      "structure": "string (e.g. 'Push Pull Legs Upper Lower')",
      "weekly_schedule": [
        {
          "day_number": number,
          "type": "training" | "rest",
          "day_name": "string (e.g. 'Push', 'Pull', 'REST DAY')"
        }
      ],
      "deload_weeks": [number] (optional — include only if block has deloads),
      "days": [
        {
          "day_name": "string",
          "estimated_duration": number (minutes),
          "exercises": [Exercise]
        },
        {
          "day_name": "REST DAY", 
          "estimated_duration": 0,
          "exercises": []
        }
      ]
    }
  ],
  "_metadata": {
    "isSamplePlan": true (for sample plans only — prevents contaminating user exercise preferences)
  }
}
\`\`\`

**For sample plan generation only:** Include \`"_metadata": {"isSamplePlan": true}\` at the root level to prevent the plan from overwriting users' saved exercise preferences when imported.

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
  "superset_group": "string (optional — e.g. 'ss1'; same value on two exercises links them as a superset)",
  "reps_weekly": { "1": "string", "2": "string", ... },
  "sets_weekly": { "1": number, "2": number, ... },
  "notes": "string (optional — omit if not needed)",
  "alternatives": [
    { "exercise": "string", "primaryMuscles": [...], "secondaryMuscles": [...] }
  ]
}
\`\`\`

---

## Schema Rules

1. **Block-relative keys** — weekly progression keys always start from "1" within each block. Block B (weeks 7-12) uses "1", "2", "3"... not "7", "8", "9".
2. **Deload tagging** — if a block has deload weeks, include a \`deload_weeks\` array with the block-relative week numbers (e.g., [5] for a 5-week block with deload on week 5).
3. **Empty arrays** — if an exercise has no secondary muscles, use \`[]\`. Do not omit the field.
4. **restQuick** — calculate as ~65% of the \`rest\` value, rounded to a clean number.
5. **Estimated duration** — ALWAYS recalculate using this duration formula instead of trusting plan estimates: \`Straight sets: (sets × 45s) + (sets × rest_seconds) | Superset pairs: (pairs × 90s) + (pairs × rest_seconds) + (pairs × ${transitionTax}s) | Total: exercise_count × ${transitionTax}s + 300s warmup\`. If calculated duration exceeds session target, note the discrepancy but proceed with calculated value.
6. **Superset rest encoding** — for superset exercises, SS[n]a's \`rest\` field represents the inter-exercise transition rest (60-90s). SS[n]b's \`rest\` field represents the full rest before repeating the pair (compound or isolation default for that exercise type). \`restQuick\` is calculated from each exercise's own \`rest\` value.
7. **sets vs sets_weekly** — \`sets\` is the default set count for training weeks (used for display). \`sets_weekly\` must be specified for every week in the block: training weeks should match \`sets\`, and deload weeks should show reduced values. Both fields are required for every strength exercise.
8. **deload_weeks optionality** — omit \`deload_weeks\` entirely for blocks without deloads. Do not include an empty array.
9. **weekly_schedule** — create a 7-day schedule showing training and rest days. For each day 1-7, specify: day_number, type ("training" or "rest"), and day_name (e.g., "Push", "Pull", "REST DAY"). Training days must match the day_name values in the days array. Example for 5-day program: 
   - Day 1: {"day_number": 1, "type": "training", "day_name": "Push"}
   - Day 2: {"day_number": 2, "type": "training", "day_name": "Pull"}  
   - Day 3: {"day_number": 3, "type": "rest", "day_name": "REST DAY"}
   - Days 4,5: training, Day 6: rest, Day 7: training
10. **Sample plan protection** — for sample plans only, include \`"_metadata": {"isSamplePlan": true}\` at the root level to prevent overwriting users' exercise preferences during import.

---

## Pre-Delivery Self-Check

Before presenting each block, silently verify:

- [ ] Every exercise from the plan appears in JSON with correct set counts
- [ ] Exercise names are identical everywhere (across days, notes, superset references)
- [ ] Superset exercises are adjacent with matching superset_group values and cross-referenced in notes
- [ ] Rep progressions trend flat-to-decreasing across weeks (not identical every week)
- [ ] Deload weeks show reduced sets_weekly (~40-50%) and increased reps
- [ ] restQuick ≈ 65% of rest for every exercise
- [ ] Muscle tags match the compound tagging guide from the plan
- [ ] Block-relative week keys start from "1"
- [ ] Session durations are recalculated using the duration formula

Fix any issues before presenting.`;
};