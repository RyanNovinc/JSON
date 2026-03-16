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
  // Handle workout duration (including AI optimization case)
  if (data.workoutDuration && data.workoutDuration > 0) {
    specs += `**Preferred Session Length:** ${data.workoutDuration} minutes\n`;
  } else if (data.useAISuggestion) {
    specs += `**Session Length:** Not specified — design session length based on the user's goal, experience level, and number of exercises. For hypertrophy with an advanced lifter, 60-75 minutes is typical.\n`;
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

export const getAIPrompt = (questionnaireData?: QuestionnaireData) => {
  // Calculate equipment-specific transition tax
  const equipment = questionnaireData?.selectedEquipment ?? [];
  const transitionTax = equipment.includes('commercial_gym') 
    ? 150  // seconds per exercise
    : equipment.includes('home_gym') 
    ? 90 
    : 60;

  return `# Generate Workout Program as JSON
// PROMPT 3: JSON Generation Prompt - Converts verified workout plans to JSON format

You are given a training plan above that has been reviewed and approved for quality. Generate the complete program as JSON files matching the schema below. Focus on accurate technical implementation rather than plan validation. Build directly to JSON — do not create markdown, documents, or any intermediate format.

## Constraint Reference Block

Before generating, note from the plan:
- Recommended split and session focus per day
- Any re-entry protocol requirements

Use these when calculating session durations and validating day structure.

## Output Instructions

**JSON only** — do not reproduce the program in chat or create any text version. Only output JSON file(s).

**Write JSON to a file** — do not output it to chat.
1. Create a file and write the complete JSON
2. When finished, provide the download link

**Multi-block programs:**
Generate one block at a time. After each block:
1. Provide the download link for that block's JSON file
2. Output a brief **volume summary** showing total primary-tagged sets per muscle group for that block (training weeks, not deload). This gives the reviewer something to check against.
3. Say: "Block 1 complete. Say 'review' to validate this block before continuing, or 'next' to generate Block 2 directly."
4. **STOP and wait for user input.** Do not proceed to the next block until the user responds.

**When user says "next" for subsequent blocks:**
1. Generate the next block directly as JSON format (do not create text version first)
2. Apply the same JSON schema and structure established above
3. Write the JSON to a file and provide download link
4. Output volume summary for the new block
5. Say: "Block [X] complete. Say 'review' to validate this block before continuing, or 'next' to generate Block [X+1] directly."
6. **STOP and wait for user input.** Do not proceed to the next block until the user responds.

**When user says "review" for any block:**
1. Read the workout program document from earlier in the conversation
2. Apply the embedded review checklist below to the specified block  
3. Generate the corrected JSON version with all fixes applied
4. Write corrected JSON to file and provide download link
5. Say: "Block [X] reviewed and updated. Say 'next' to continue to Block [X+1]."

### Embedded Review Checklist
// IMPORTANT: This checklist must stay synchronized with Step 2 review process in ImportRoutineScreen.tsx
// If you update one checklist, update both to maintain consistency across the workflow

Apply these checks to the block before correcting the JSON:

**Architecture Validation:**
- [ ] Split structure matches the plan's recommended architecture
- [ ] Session coherence rules are followed (muscle recovery windows)
- [ ] Sessions don't exceed calculated duration limits from formula

**Volume Analysis:**
- [ ] All muscle groups meet minimum weekly set thresholds (12+ major, 8+ medium muscles)
- [ ] Volume distribution is balanced across training days
- [ ] The program document includes a Muscle Group Coverage Audit section  
- [ ] Every muscle group with 0 direct sets has an explicit indirect volume justification
- [ ] **FAIL if** the audit section is missing entirely from the document

**Programming Quality:**
- [ ] Exercise selection matches stated goals and experience level
- [ ] Rep ranges align with block focus (strength/hypertrophy/endurance)
- [ ] Progression patterns are realistic and appropriate
- [ ] Rest periods match exercise complexity and training demands

**Implementation Practicality:**
- [ ] Session complexity is manageable for target audience
- [ ] Equipment requirements match available resources
- [ ] Exercise transitions are logical and efficient
- [ ] Workout flow supports adherence and motivation

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

1. **The plan is authoritative** — use the exercise names, sets, muscle tags, superset pairings, and day structure exactly as specified. Do not add, remove, or rename exercises. If the plan declares a mesocycle structure, append \`- Mesocycle X\` to the routine_name in every JSON file for that mesocycle (e.g., \`"Iron Year - Mesocycle 1"\`). This is required for the app to correctly associate imported blocks with the right mesocycle. The reviewed plan is authoritative on set counts and exercise selection — do not add, remove, or reduce sets on any exercise to fix volume calculations. If your volume recalculation produces a HIGH or LOW flag that differs from the reviewed plan's audit, note the discrepancy in your volume summary but proceed with the reviewed plan's set counts unchanged.
2. **Treat exercise names as identifiers** — use the exact same string for the same exercise across all blocks, days, notes, and superset references. Never vary naming (e.g., always "Overhead Cable Extension", never "Cable Overhead Extension").
3. **Design what the plan doesn't specify** — you are responsible for rest periods, alternative exercises, and technique notes. For rep progressions: if the plan states a progression scheme, follow it exactly. If the plan is silent on progressions, use the defaults below. The plan provides structure; you provide programming detail.
4. **Only program working sets** — do not include warm-up sets. The app tracks working sets only.
5. **The plan is self-contained** — it contains every exercise pool, block structure, and periodization detail needed to generate any block. Always reference the plan for exercise names and structure — never rely on memory of prior blocks in the conversation. If the plan uses a diff-based format for later blocks (referencing carryovers from earlier blocks), first reconstruct the complete exercise list by applying the stated changes to the referenced base block, then generate JSON from that complete list. Every block's JSON must contain all exercises for all days.

---

## Exercise Programming Details

### Rep Progressions

For each exercise, design a weekly rep progression across the block. Since the app doesn't track weight, progressions are expressed entirely through rep targets — the user manages their own load increases.

**Starting point rule:**
- **Compounds:** Start at the TOP of the prescribed range in Week 1, reduce across the block. The rep ceiling is Week 1; the floor is the final training week before deload. This signals increasing load week over week.
- **Isolations:** Start at the BOTTOM of the prescribed range in Week 1, climb toward the ceiling across the block. Never start at the ceiling — leave room to progress.

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

Place superset exercises adjacent in the exercises array. Include "Superset with [exact exercise name]" in both exercises' notes field. Add "superset_group": "ss1" (or "ss2", "ss3" etc.) to both exercises in the pair — use the same string value for both. The plan marks supersets with SS[n]a/SS[n]b notation — translate these to adjacent array entries with matching superset_group values.

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
5. **Estimated duration** — ALWAYS recalculate using this duration formula instead of trusting plan estimates: \`Straight sets: (sets × 45s) + (sets × rest_seconds) | Superset pairs: (pairs × 90s) + (pairs × rest_seconds) + (pairs × ${transitionTax}s) | Total: exercise_count × ${transitionTax}s + 300s warmup\`. If calculated duration exceeds session target, note the discrepancy but proceed with calculated value.
6. **Superset rest encoding** — for superset exercises, SS[n]a's \`rest\` field represents the inter-exercise transition rest (60-90s). SS[n]b's \`rest\` field represents the full rest before repeating the pair (compound or isolation default for that exercise type). \`restQuick\` is calculated from each exercise's own \`rest\` value.
7. **sets vs sets_weekly** — \`sets\` is the default set count for training weeks (used for display). \`sets_weekly\` must be specified for every week in the block: training weeks should match \`sets\`, and deload weeks should show reduced values. Both fields are required for every strength exercise.
8. **deload_weeks optionality** — omit \`deload_weeks\` entirely for blocks without deloads. Do not include an empty array.
9. **Sample plan protection** — for sample plans only, include \`"_metadata": {"isSamplePlan": true}\` at the root level to prevent overwriting users' exercise preferences during import.

---

## Pre-Delivery Self-Check

Before presenting each block's download link, silently verify:

**Constraint Validation:**
- [ ] Session durations match recalculated formula values (not plan estimates)
- [ ] Split architecture follows plan's recommended structure
- [ ] Session coherence rules are respected (muscle recovery windows)
- [ ] Muscle coverage audit exists in source plan before proceeding
- [ ] Deload patterns match re-entry protocol volume reduction targets

**Schema Compliance:**
- [ ] Every exercise from the plan appears in the JSON with correct set counts
- [ ] Exercise names are identical everywhere they appear (across days, notes, superset references)
- [ ] Superset exercises are adjacent in the array and cross-reference each other in notes
- [ ] Superset rest is correctly encoded (SS[n]a gets short rest, SS[n]b gets full rest)
- [ ] Superset pairs both have a matching superset_group field with the same value (e.g. "ss1")
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