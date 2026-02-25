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

  // Training style preference (if provided)
  if (data.trainingStylePreference) specs += `**Training Style:** ${data.trainingStylePreference}\n`;
  
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
      'shorter': 'Shorter (reduced rest for time efficiency)',
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
2. Output a brief **volume summary** showing total primary-tagged sets per muscle group for that block (training weeks, not deload). This gives the reviewer something to check against.
3. Say: "Ready to import. Say **next** when you want the next block, or **review** to verify this block first."

Each block should be a complete, standalone JSON file with routine_name, description, days_per_week, and a single block in the blocks array. Keep routine_name and description consistent across all files.

**Long programs (5+ blocks):** After every 3rd block, suggest the user start a fresh chat to maintain output quality. Say: "For best results on long programs, I recommend starting a fresh chat for the next batch of blocks. Paste your plan + this generation prompt and say 'Generate Block [next letter].' The plan contains everything needed — no prior conversation context is required."

**Mesocycle-based programs:** If the plan states this is Mesocycle [X] of [N], after generating and delivering the FINAL block of this mesocycle:

If X < N:
1. Output a Mesocycle [X] Summary:
   - Phase name and training emphasis
   - Split structure used
   - Rep range focus
   - Volume per muscle group (sets/week from your volume summaries)
   - Key exercises used across all blocks
2. Then say: "Mesocycle [X] complete. Paste your Planning Prompt to plan Mesocycle [X+1] — I'll use the summary above and the roadmap from your plan to design the next phase."

If X equals N, say: "That completes your full program — all [N] mesocycles are done. Enjoy your training!"

The plan is fully self-contained: it lists all exercise pools, block structures, and periodization details. You do not need conversation history from prior blocks to generate any block correctly. Always reference the plan — never rely on memory of prior blocks in the conversation.

---

## Translation Principles

1. **The plan is authoritative** — use the exercise names, sets, muscle tags, superset pairings, and day structure exactly as specified. Do not add, remove, or rename exercises.
2. **Treat exercise names as identifiers** — use the exact same string for the same exercise across all blocks, days, notes, and superset references. Never vary naming (e.g., always "Overhead Cable Extension", never "Cable Overhead Extension").
3. **Design what the plan doesn't specify** — you are responsible for rep progressions, rest periods, alternative exercises, and technique notes. The plan provides structure; you provide programming detail.
4. **Only program working sets** — do not include warm-up sets. The app tracks working sets only.
5. **The plan is self-contained** — it contains every exercise pool, block structure, and periodization detail needed to generate any block. Always reference the plan for exercise names and structure — never rely on memory of prior blocks in the conversation. If the plan uses a diff-based format for later blocks (referencing carryovers from earlier blocks), first reconstruct the complete exercise list by applying the stated changes to the referenced base block, then generate JSON from that complete list. Every block's JSON must contain all exercises for all days.

---

## Exercise Programming Details

### Rep Progressions

For each exercise, design a weekly rep progression across the block. Since the app doesn't track weight, progressions are expressed entirely through rep targets — the user manages their own load increases.

**Linear progression (default for compounds):**
Maintain rep targets in early weeks. Slight rep reduction in later weeks signals that the lifter should be using heavier loads.
Example (5-week block, 4 sets): Week 1: "10, 10, 10, 8" → Week 2: "10, 10, 8, 8" → Week 3: "8, 8, 8, 8" → Week 4: "8, 8, 6, 6" → Week 5 (deload): "12, 12"

**Ascending density (default for isolation):**
Increase reps over the block, building volume tolerance at the same working difficulty.
Example (5-week block, 3 sets): Week 1: "10, 10, 10" → Week 2: "11, 11, 10" → Week 3: "12, 12, 11" → Week 4: "12, 12, 12" → Week 5 (deload): "15, 15"

**Deload week pattern:**
Reduce sets by ~40-50% (via sets_weekly). Increase reps by 2-3 per set. Maintain movement patterns.
Example: If training weeks are 4 sets of "10, 10, 10, 8", deload is 2 sets of "12, 12".

\`reps_weekly\` values must be comma-separated rep targets per set (e.g., "10, 10, 10, 8"), not shorthand like "4x10".

**Match progressions to the plan's rep range focus.** If the plan says "Block B: Strength — 5-8 reps," your compound progressions should work within that range. Isolation exercises can run 2-4 reps higher than the block's stated range (e.g., 8-12 isolation reps in a "5-8" strength block is fine).

### Rest Periods

Use the rest periods specified in the plan if present. Otherwise use these defaults:

**Heavy compounds** = squat variations, deadlift variations, barbell bench press, barbell overhead press.
**Other compounds** = everything else with 2+ joints (rows, lunges, dumbbell presses, pull-ups, dips, leg press, etc.).

| Exercise Type | rest (seconds) | restQuick (~65% of rest, rounded) |
|---------------|---------------|-----------------------------------|
| Heavy compounds | 150-180 | 100-115 |
| Other compounds | 120-150 | 80-100 |
| Isolation exercises | 60-90 | 40-60 |

**Superset rest encoding:** For superset pairs, the first exercise (SS[n]a) gets a short rest of 60-90s (transition to the second exercise). The second exercise (SS[n]b) gets the full rest appropriate to the exercise type (compound or isolation). This means you rest briefly between the two exercises, then take a full rest before starting the pair again.

If the plan notes shorter or minimal rest preferences, reduce accordingly (shorter: ~25% reduction; minimal: ~40% reduction).

### Alternative Exercises

Each exercise must include 2 alternatives (or 1 alternative for bodyweight-only programs where the exercise pool is limited). Alternatives should:
- Target the same primary muscles
- Use a different movement variation or equipment
- Include their own primaryMuscles and secondaryMuscles tags

### Notes

Only include non-obvious technique tips or specific setup instructions. Do not add notes for standard exercises performed in standard ways. If the plan includes notes for an exercise, carry them through.

### Supersets

Place superset exercises adjacent in the exercises array. Include "Superset with [exact exercise name]" in both exercises' notes field. The plan marks supersets with SS[n]a/SS[n]b notation — translate these to adjacent array entries.

### Cardio Rotation

If the plan prescribes a cardio day that rotates through different activities across weeks, encode it as a single cardio entry where progression_weekly describes each week's activity:

\`\`\`json
{
  "type": "cardio",
  "activity": "Cardio Rotation",
  "duration_minutes": 30,
  "target_intensity": "Moderate (RPE 5-7)",
  "progression_weekly": {
    "1": "Treadmill / Indoor Running — 30 min steady state, moderate pace",
    "2": "Stationary Bike / Cycling — 30 min, mix of seated and standing intervals",
    "3": "Swimming — 30 min continuous laps, mixed strokes",
    "4": "Stair Climber / StepMill — 25 min steady climb + 5 min cooldown",
    "5": "Treadmill / Indoor Running — 30 min with 5x1 min faster intervals"
  },
  "notes": "Rotate through preferred activities each week. Adjust duration and intensity as needed."
}
\`\`\`

Use the activity names exactly as they appear in the plan's Secondary Goal Summary.

---

## Muscle Taxonomy

Use EXACTLY these names — no generic terms like "Shoulders", "Back", "Arms", or "Legs":

Chest, Front Delts, Side Delts, Rear Delts, Lats, Upper Back, Traps, Biceps, Triceps, Forearms, Quads, Hamstrings, Glutes, Calves, Core

### Compound Exercise Tagging Guide

Primary = main driver through full ROM. Secondary = assists but not the main driver.

**Barbell / Dumbbell / Cable / Machine:**
- Bench press variants: Primary Chest, Triceps
- Incline press variants: Primary Chest, Front Delts | Secondary Triceps
- Row variants: Primary Upper Back, Lats | Secondary Biceps, Rear Delts
- Pull-up / Pulldown: Primary Lats | Secondary Biceps, Upper Back
- Overhead press: Primary Front Delts, Triceps | Secondary Side Delts
- Squat variants: Primary Quads, Glutes
- Leg press / Hack squat: Primary Quads | Secondary Glutes
- Lunge / Split squat: Primary Quads, Glutes
- Hip hinge (RDL, good morning): Primary Hamstrings, Glutes
- Hip thrust: Primary Glutes | Secondary Hamstrings
- Dips: Primary Chest, Triceps
- Calf raise variants: Primary Calves

**Bodyweight:**
- Push-ups (and variations): Primary Chest, Triceps | Secondary Front Delts
- Diamond / Close-grip push-ups: Primary Triceps, Chest
- Pike push-ups / Handstand push-ups: Primary Front Delts, Triceps | Secondary Side Delts
- Inverted rows: Primary Upper Back, Lats | Secondary Biceps, Rear Delts
- Pull-ups / Chin-ups: Primary Lats | Secondary Biceps, Upper Back
- Dips (parallel bars / bench): Primary Chest, Triceps
- Bodyweight squats / Pistol squats: Primary Quads, Glutes
- Lunges / Step-ups: Primary Quads, Glutes
- Glute bridges / Single-leg glute bridge: Primary Glutes | Secondary Hamstrings
- Nordic curls: Primary Hamstrings
- Calf raises (bodyweight): Primary Calves
- Planks / Dead bugs / Leg raises: Primary Core

---

## JSON Schema

\`\`\`json
{
  "routine_name": "string",
  "description": "string",
  "days_per_week": number,
  "blocks": [
    {
      "block_name": "string",
      "weeks": "string (e.g. '1-6')",
      "structure": "string (e.g. 'Push Pull Legs Upper Lower')",
      "deload_weeks": [number] (optional — include only if block has deloads),
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
  "notes": "string (optional — omit if not needed)",
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

---

## Schema Rules

1. **Block-relative keys** — weekly progression keys always start from "1" within each block. Block B (weeks 7-12) uses "1", "2", "3"... not "7", "8", "9".
2. **Deload tagging** — if a block has deload weeks, include a \`deload_weeks\` array with the block-relative week numbers (e.g., [5] for a 5-week block with deload on week 5).
3. **Empty arrays** — if an exercise has no secondary muscles, use \`[]\`. Do not omit the field.
4. **restQuick** — calculate as ~65% of the \`rest\` value, rounded to a clean number.
5. **Estimated duration** — use the plan's session estimates. If not provided, calculate using the superset-adjusted formula: \`(straight sets × avg rest) + (straight sets × 45s) + (superset pairs × pair rest × sets per pair) + (superset pairs × 45s × 2 × sets per pair) + 5 min warmup\`.
6. **Superset rest encoding** — for superset exercises, SS[n]a's \`rest\` field represents the inter-exercise transition rest (60-90s). SS[n]b's \`rest\` field represents the full rest before repeating the pair (compound or isolation default for that exercise type). \`restQuick\` is calculated from each exercise's own \`rest\` value.
7. **sets vs sets_weekly** — \`sets\` is the default set count for training weeks (used for display). \`sets_weekly\` must be specified for every week in the block: training weeks should match \`sets\`, and deload weeks should show reduced values. Both fields are required for every strength exercise.
8. **deload_weeks optionality** — omit \`deload_weeks\` entirely for blocks without deloads. Do not include an empty array.

---

## Pre-Delivery Self-Check

Before presenting each block's download link, silently verify:

- [ ] Every exercise from the plan appears in the JSON with correct set counts
- [ ] Exercise names are identical everywhere they appear (across days, notes, superset references)
- [ ] Superset exercises are adjacent in the array and cross-reference each other in notes
- [ ] Superset rest is correctly encoded (SS[n]a gets short rest, SS[n]b gets full rest)
- [ ] Rep progressions change meaningfully across weeks (not identical every week for all exercises)
- [ ] Compounds trend flat-to-decreasing reps; isolations trend flat-to-increasing
- [ ] Deload weeks show reduced sets_weekly (~40-50% fewer) and increased reps
- [ ] Rest periods match exercise type (heavy compounds ≥150s, other compounds ≥120s, isolation ≤90s)
- [ ] Muscle tags match the compound tagging guide
- [ ] primaryMuscles and secondaryMuscles use exact taxonomy names
- [ ] No exercise has empty primaryMuscles
- [ ] Block-relative week keys start from "1"
- [ ] \`restQuick\` ≈ 65% of \`rest\` for every exercise
- [ ] Rep ranges match the block's stated focus from the plan
- [ ] No warm-up sets included — working sets only

Fix any issues before presenting. After the download link and volume summary, briefly note what you verified (one line, not a full checklist).`;
};