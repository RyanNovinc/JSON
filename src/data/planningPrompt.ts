import { QuestionnaireData, generateProgramSpecs } from './workoutPrompt';
import { CompletedMesocycleSummary } from './programStorage';

export interface ProgramContext {
  totalMesocycles: number;
  currentMesocycle: number;
  mesocycleWeeks: number;
  mesocycleBlocks: number;
  mesocycleRoadmapText?: string;          // from previous plan, if available
  previousMesocycleSummary?: CompletedMesocycleSummary;
}

// ================================
// CONSTRAINT LAYER FUNCTIONS
// ================================

function getSplitArchitecture(data: QuestionnaireData): string {
  return '';
}

function getComplementarityRules(data: QuestionnaireData): string {
  return '';
}

function getTimeFormula(data: QuestionnaireData): string {
  return `**Session Duration:** Duration is determined by your chosen rest style. Do not compress rest periods to hit a time target — the rest style setting takes priority. If the user chose Optimal Rest, sessions may run 75-90 minutes and that is acceptable.`;
}

function getMuscleAudit(data: QuestionnaireData): string {
  return `**Volume Verification Requirements:**

**Status Indicators (use exactly these):**
- ✅ = within target range for user's training approach
- ⚠️ LOW = below experience-scaled minimum (must be fixed before presenting)
- ⚠️ HIGH = above the target range ceiling for the user's approach (flag for review)
- ℹ️ CONSTRAINED = below target but above minimum due to legitimate constraints

For LOW status: immediately revise the program to add volume before presenting. When fixing a LOW muscle: add sets to the day where that muscle is already trained, or add a second training day for that muscle.

If the profile says "Direct Core Work: No", do not add core exercises to any session. Core is exempt from volume requirements. If the profile says "Direct Core Work: Yes" or is silent, include 2–3 sets of direct core work per week distributed across 1–2 sessions. Core does not count toward any muscle group's volume target.

Include this audit as a section in your final program document.`;
}

function getReentryProtocol(data: QuestionnaireData): string {
  const duration = data.programDuration;
  
  if (duration === '4_weeks' || duration === '8_weeks') {
    return ''; // omit entirely for short programs
  }

  return `**Program Interruption Guidelines:**

For programs 12+ weeks, include a Re-entry Protocol section that addresses training gaps:

**Standard Re-entry Framework:**
- Missed 1 week: Resume current week/block with 10% load reduction
- Missed 2-3 weeks: Drop back one block, restart from week 1 of that block
- Missed 4+ weeks: Return to program beginning, treat as new baseline

**Program-Specific Considerations:**
- 12-week programs: Suggest re-entry points at weeks 4 and 8
- 6+ month programs: Align re-entry with mesocycle boundaries  
- 1-year programs: Provide detailed scenarios for different interruption lengths

Adapt these guidelines to your specific program structure and include this section in your final program document.`;
}

function generateConstraintLayer(data: QuestionnaireData): string {
  return [
    '## Program Architecture Constraints',
    '*(Complete all sections below before exercise selection)*',
    '',
    getSplitArchitecture(data),
    getComplementarityRules(data),
    getTimeFormula(data),
    getMuscleAudit(data),
    getReentryProtocol(data),
  ].filter(Boolean).join('\n\n');
}

// ================================
// STATIC TEXT CONSTANTS
// ================================

export const INSTRUCTIONS_HEADER = `# Create a Complete Workout Program

I'm using a workout app called JSON.fit. I need help creating a personalized workout program.

**USE WEB SEARCH** - If you have web search available, use it selectively to verify current research on volume recommendations, rest periods, exercise effectiveness, or training techniques that might improve this program. Current research can enhance programming decisions when it provides meaningful updates to established principles.

## INSTRUCTIONS

Review my profile and create a complete, structured workout program document using the PROGRAM DOCUMENT FORMAT provided below.

The user will request changes if they disagree with your choices.

Do not search conversation history or reference previous chats. This prompt is self-contained — all context needed is provided below. If this is a continuation of a multi-mesocycle program, the previous mesocycle summary and roadmap will be included in this prompt explicitly.

Before presenting the program, complete these verification steps:

1. **List every exercise per day** with its set count and primary muscle tags.
2. **Total effective weekly volume per muscle group** — for each non-exempt muscle, list every contributing exercise with its set count, tag type (Primary or Secondary), weight (1.0 for Primary, 0.5 for Secondary), and contribution (sets × weight). Sum the contributions. The table is the calculation — do not narrate or estimate totals.`;

export const VERIFICATION_STEP_3_HYPERTROPHY = `3. **Look up this user's targets** — cross-reference their Training Approach (from the profile) against the Volume Targets table, and their Training Experience against the Experience-Scaled Minimums table. These are the numbers you must hit. If the user's Primary Goal is not muscle building or body recomposition, see Goal-Specific Quality Criteria for adjusted verification rules.`;

// Note: getVerificationStep3 will generate the appropriate version
export const getVerificationStep3 = (goal: string): string => {
  const goalLabels: { [key: string]: string } = {
    burn_fat: 'Fat Loss',
    gain_strength: 'Strength Building', 
    sport_specific: 'Sport-Specific Training',
    general_fitness: 'General Fitness',
    custom_primary: 'Custom Goal'
  };

  if (goal === 'build_muscle' || goal === 'body_recomposition') {
    return VERIFICATION_STEP_3_HYPERTROPHY;
  }
  
  const goalLabel = goalLabels[goal] || 'this goal';
  return `3. **Look up this user's targets** — cross-reference their Training Approach (from the profile) against the Volume Targets table, and their Training Experience against the Experience-Scaled Minimums table. These are the numbers you must hit. Since this is a ${goalLabel} program, see Goal-Specific Quality Criteria for how volume verification applies to this goal.`;
};

export const VERIFICATION_STEPS_4_5 = `4. **If any muscle group is below target**, revise exercise selections and recount. Do not present the summary until all targets are met or explicitly flagged as constrained.
5. **Check distribution balance** — avoid some muscles maxed out while others sit at the floor of their target range.`;

export const VERIFICATION_STEP_6_WITH_CARDIO = `6. **Estimate session duration** for each day:
   - **Strength days:** Calculate based on exercise count, sets, and the user's chosen rest style — do not compress rest to hit an arbitrary time target.
   - **Cardio days:** Use the prescribed activity duration + 5 min warmup + 5 min cooldown.`;

export const VERIFICATION_STEP_6_NO_CARDIO = `6. **Estimate session duration** for each day:
   - **Strength days:** Calculate based on exercise count, sets, and the user's chosen rest style — do not compress rest to hit an arbitrary time target.`;

export const PROGRAM_DOCUMENT_FORMAT = `---

## OUTPUT FORMAT

Present the complete program clearly so the user can review and iterate before converting to JSON. Include:

- Program overview (duration, days per week, split, goal)
- All training sessions with exercises, sets, rep ranges (e.g. "8-12" or "10-15" — always a range, never a single number), rest periods, and muscle tags (Primary and Secondary). Exception: single-joint arm exercises (all curl variations, all triceps isolation) always use an isolation rep range of 10–15, regardless of the block's stated rep focus. These are never compound movements.
- Direct core work: if the profile says 'Direct Core Work: Yes' or is silent on this setting, include 2–3 sets distributed across 1–2 sessions (suitable exercises: Cable Crunch, Ab Wheel Rollout, Hanging Leg Raise, Plank variations). Core sets do not count toward any muscle group's volume target.
- Alternative exercises for each movement
- Weekly progression guidance
- Deload protocol
- Volume distribution summary by muscle group

Write naturally — this is a planning conversation, not a final document. The user will request changes before moving to JSON conversion.`;

export const EXERCISE_LIBRARY = `---

## EXERCISE LIBRARY

You MUST select exercises ONLY from the JSON.fit exercise library at https://json.fit/exercises.md.

Before generating this program, fetch that file. Then:

- Use EXACT exercise names as they appear in the library
- Use the EXACT primary and secondary muscle tags specified for each exercise in the library
- Do NOT invent exercises not in the library
- Do NOT re-tag muscles based on your own judgment
- If a movement pattern you want to include has no suitable exercise in the library, omit that pattern rather than inventing one
- When suggesting alternative exercises for a movement, only use exercises from the library

The library is the canonical source of truth for exercise names and muscle tagging. Your job is to select and program these exercises, not to define them.`;

export const MUSCLE_TAXONOMY = `---

## MUSCLE TAXONOMY

Use ONLY these exact muscle names — no generic terms like "Shoulders", "Back", "Arms", or "Legs":

Chest, Front Delts, Side Delts, Rear Delts, Lats, Upper Back, Traps, Biceps, Triceps, Forearms, Quads, Hamstrings, Glutes, Calves, Core

Use "Core" instead of "Lower Back" for spinal stabilization or erector engagement.`;

export const TAGGING_BODYWEIGHT = `**Bodyweight:**
- Push-ups (and variations): Primary Chest | Secondary Triceps, Front Delts
- Diamond / Close-grip push-ups: Primary Triceps, Chest
- Pike push-ups / Handstand push-ups: Primary Front Delts | Secondary Triceps, Side Delts
- Inverted rows: Primary Upper Back, Lats | Secondary Biceps, Rear Delts
- Pull-ups / Chin-ups: Primary Lats | Secondary Biceps, Upper Back
- Dips (parallel bars / bench): Primary Chest, Triceps
- Bodyweight squats / Pistol squats: Primary Quads, Glutes
- Lunges / Step-ups: Primary Quads, Glutes
- Glute bridges / Single-leg glute bridge: Primary Glutes | Secondary Hamstrings
- Nordic curls: Primary Hamstrings
- Calf raises (bodyweight): Primary Calves
- Planks / Dead bugs / Leg raises: Primary Core`;

// ================================
// PLANNING RULES
// ================================

export const PLANNING_RULES_HEADER = `---

## PLANNING RULES

### Core Principles`;

// Rule 1 variants by equipment
export const getRule1 = (equipment: string[]): string => {
  const hasGymEquipment = equipment.some(e => ['commercial_gym', 'home_gym'].includes(e));
  const isBodyweightOnly = equipment.length === 1 && equipment[0] === 'bodyweight';
  const isBasicOnly = equipment.length === 1 && equipment[0] === 'basic_equipment';
  
  if (hasGymEquipment && equipment.includes('commercial_gym')) {
    return `1. **Full equipment access** — use any commercial gym equipment including barbells, dumbbells, cables, and machines. Prioritize barbells and machines for compound movements.`;
  } else if (hasGymEquipment && equipment.includes('home_gym')) {
    return `1. **Home gym equipment** — use only equipment typically available in a home gym (dumbbells, adjustable bench, pull-up bar, resistance bands). Do not program cable machines or specialized machines unless the profile's equipment notes specify them.`;
  } else if (isBasicOnly) {
    return `1. **Limited equipment** — the user has basic equipment (dumbbells, resistance bands). Adapt exercise selections accordingly. Use the bodyweight tagging guide for bodyweight exercises.`;
  } else if (isBodyweightOnly) {
    return `1. **Bodyweight only** — do not include any equipment-based exercises. All movements must use body weight only (plus a pull-up bar if available). Use the bodyweight tagging guide above.`;
  } else {
    // Fallback for mixed equipment
    return `1. **Only use available equipment** — do not include exercises the user can't perform. For "Bodyweight Only" or "Basic Equipment" profiles, adapt all exercise selections accordingly and use the bodyweight tagging guide above.`;
  }
};

export const STATIC_RULE_2 = `2. **Stay within rest style parameters** — use the rest periods defined by the user's Rest Style selection. Do not compress rest periods to hit a session time target. The rest style setting takes priority over session duration.`;

// Rule 3 variants by secondary goals
export const getRule3 = (hasActivityGoals: boolean): string => {
  if (hasActivityGoals) {
    return `3. **Each training day has a single primary purpose** — cardio days are standalone sessions, not add-ons to lifting days. Flexibility/mobility days are standalone unless the profile is general fitness with limited training days.`;
  } else {
    return `3. **Each training day has a single primary purpose** — focus on one training quality per session.`;
  }
};

export const STATIC_RULES_4_5_6_7 = `4. **Treat exercise names as identifiers** — once an exercise name appears in the plan, use that exact string everywhere (across blocks, in superset references, in notes). No variation.
5. **Make definitive choices** — explain reasoning and trade-offs, but commit to a plan. The user will tell you what to change.
6. **Respect exercise preferences** — if the profile lists liked exercises, incorporate them where they fit the plan. If it lists disliked exercises, avoid them and use alternatives for that movement pattern.
7. **Only program working sets** — do not include warm-up sets in the plan. The app tracks working sets only.
8. **Sets per exercise cap** — do not exceed 5 sets of any single isolation exercise in one session. If volume targets require more sets than this allows, distribute across a second exercise or a second training day rather than stacking onto one exercise.
9. **RIR (Reps in Reserve) considerations** — consider appropriate intensity levels that optimize stimulus-to-fatigue ratio based on exercise type and user experience level.
10. **Volume distribution across days** — if a muscle group is below its target range and only appears on 1-2 training days, add sets on a third day. Calves, biceps, and triceps can be placed on any training day regardless of the split's primary focus. Do not leave a muscle below target when adding 2-3 sets to an existing session would fix it.
11. **Target range, not just minimums** — clearing the experience-scaled minimum floor is not sufficient. Every non-exempt muscle should land within its target range from the Volume Targets table. If a muscle is above its minimum but below its target, treat it as a problem to solve, not an acceptable result.`;

// Rule 10 variants by goal
export const getRule8 = (goal: string): string => {
  if (goal === 'build_muscle' || goal === 'body_recomposition' || goal === 'burn_fat') {
    return `9. **Exercise count per session** — aim for 6-10 exercises per session. Supersets count as 2 exercises.`;
  } else if (goal === 'gain_strength' || goal === 'sport_specific') {
    return `9. **Exercise count per session** — aim for 4-7 exercises per session. Fewer exercises with more sets on primary lifts. Supersets count as 2 exercises.`;
  } else if (goal === 'general_fitness') {
    return `9. **Exercise count per session** — aim for 5-8 exercises per session. Supersets count as 2 exercises.`;
  } else {
    // custom_primary - show all ranges
    return `9. **Exercise count per session** — aim for 6-10 exercises per session for hypertrophy programs, 4-7 for strength programs, and 5-8 for general fitness. These are guidelines, not hard limits — supersets count as 2 exercises.`;
  }
};

export const ROTATION_PERIODIZATION_HEADER = `
### Rotation and Periodization`;

export const RULE_11 = `12. **Rotate secondary goal activities** — if the user has preferred activities (cardio types, sports, flexibility work, etc.), rotate through them across weeks. Every preferred activity should appear at least once per block.`;

export const RULE_12 = `13. **Rotate exercises between blocks** — change exercise variations while keeping movement patterns. Longer programs need more distinct exercise pools to prevent staleness.`;

export const RULE_13 = `14. **Long-term periodization** — for programs longer than 16 weeks, describe how training evolves across repeated cycles. Don't just rotate exercises — show how rep ranges, volume, or intensity shift over the course of the program.`;

export const BLOCK_STRUCTURE_HEADER = `
### Block Structure`;

// Rule 14 variants by experience
export const getRule12 = (expTier: string): string => {
  if (expTier === 'beginner') {
    return `15. **Preferred block length by experience:**
    - **Beginner:** 4-6 weeks per block (including deload if applicable).`;
  } else if (expTier === 'intermediate') {
    return `15. **Preferred block length by experience:**
    - **Intermediate:** 5-6 weeks per block (4-5 training weeks + 1 deload).`;
  } else if (expTier === 'advanced') {
    return `15. **Preferred block length by experience:**
    - **Advanced:** 5-6 weeks per block (4-5 training weeks + 1 deload).`;
  } else {
    // Fallback
    return `15. **Preferred block length by experience:**
    - **Beginner:** 4-6 weeks per block (including deload if applicable).
    - **Intermediate:** 5-6 weeks per block (4-5 training weeks + 1 deload).
    - **Advanced:** 5-6 weeks per block (4-5 training weeks + 1 deload).`;
  }
};

// Rule 15 variants by duration
export const getRule13 = (duration: string): string => {
  const rule13Header = `16. **Program duration → block count:**`;
  
  if (duration === '4_weeks') {
    return `${rule13Header}
    - 4 weeks: 1 block`;
  } else if (duration === '8_weeks') {
    return `${rule13Header}
    - 8 weeks: 2 blocks (e.g., 4+4 or 3+1 deload + 3+1 deload)`;
  } else if (duration === '12_weeks') {
    return `${rule13Header}
    - 12 weeks: 2-3 blocks`;
  } else if (duration === '6_months') {
    return `${rule13Header}
    - 6 months (~26 weeks): 4-5 blocks`;
  } else if (duration === '1_year') {
    return `${rule13Header}
    - 1 year (~52 weeks): 8-10 blocks, organized into 2-3 mesocycles with distinct training phases`;
  } else {
    // custom - include all rows
    return `${rule13Header}
    - 4 weeks: 1 block
    - 8 weeks: 2 blocks (e.g., 4+4 or 3+1 deload + 3+1 deload)
    - 12 weeks: 2-3 blocks
    - 6 months (~26 weeks): 4-5 blocks
    - 1 year (~52 weeks): 8-10 blocks, organized into 2-3 mesocycles with distinct training phases`;
  }
};

export const RULE_16 = `17. **Mesocycle structure for programs 13+ weeks:** Any program longer than 12 weeks must be organised into mesocycles. Each mesocycle is typically 12-13 weeks (2-3 blocks). Each mesocycle shifts training emphasis — e.g., Mesocycle 1: Hypertrophy (8-12 reps), Mesocycle 2: Strength-Hypertrophy (6-10 reps), Mesocycle 3: Metabolic/Intensity (10-15 reps + advanced techniques).

**Declare the full mesocycle structure upfront** before detailing any exercises — output a Mesocycle Roadmap table in this format:

| Mesocycle | Phase Name | Rep Focus | Emphasis | Weeks | Blocks |
|-----------|-----------|-----------|----------|-------|--------|
| 1 | [name] | [e.g. 8-12] | [e.g. Hypertrophy] | [X] | [X] |
| 2 | [name] | [e.g. 6-10] | [e.g. Strength-Hypertrophy] | [X] | [X] |

Then detail exercises for **Block 1 of Mesocycle 1 only**. The user will approve each block before requesting the next. Do not generate Block 2 or any subsequent blocks until asked.`;

export const RECOVERY_PROGRESSION_HEADER = `
### Recovery and Progression`;

// Rule 15 variants by experience and duration
export const getRule15 = (expTier: string, duration: string): string => {
  if (expTier === 'beginner') {
    if (duration === '4_weeks' || duration === '8_weeks') {
      return `18. **Deload frequency by experience:**
    - **Beginner:** Deloads are not needed for this program length at your experience level.`;
    } else {
      return `18. **Deload frequency by experience:**
    - **Beginner:** Deloads generally not needed for programs under 12 weeks. For longer programs, deload every 6-8 weeks.`;
    }
  } else if (expTier === 'intermediate') {
    return `18. **Deload frequency by experience:**
    - **Intermediate:** Deload every 5-6 training weeks. Every block longer than 4 weeks must include a deload week.`;
  } else if (expTier === 'advanced') {
    return `18. **Deload frequency by experience:**
    - **Advanced:** Do not go more than 6 consecutive training weeks without a deload. Every block longer than 4 weeks must include a deload week.`;
  } else {
    // Fallback
    return `18. **Deload frequency by experience:**
    - **Beginner:** Deloads generally not needed for programs under 12 weeks. For longer programs, deload every 6-8 weeks.
    - **Intermediate:** Deload every 5-6 training weeks. Every block longer than 4 weeks must include a deload week.
    - **Advanced:** Do not go more than 6 consecutive training weeks without a deload. Every block longer than 4 weeks must include a deload week.`;
  }
};

export const RULE_17 = `19. **Deload structure** — deload weeks reduce total sets by ~40-50% while maintaining movement patterns. Rep ranges increase by 2-3 reps per set. The app does not track weight — do not reference load reductions.`;

export const RULE_18 = `20. **Plateau management** — for programs 8 weeks or longer, include guidance for when the lifter stalls on a prescribed progression. Frame in terms of rep targets, not weight.`;

export const BALANCE_HEADER = `
### Balance`;

export const STATIC_RULE_19 = `21. **Pull movement balance** — vertical pulls (pulldowns, pull-ups) should make up at least one-third of total back volume.`;

export const RULE_20 = `22. **Complete block coverage** — the plan must explicitly cover every block (with the diff-based exception for 5+ block programs as described in the output format).`;

// ================================
// REST TIME DEFAULTS
// ================================

export const REST_SECTION_HEADER = `Use evidence-based rest periods appropriate for exercise type and training goal. Adjust based on user's rest preference if specified.`;

export const getRestSection = (restTrigger: string): string => {
  if (restTrigger === 'OPTIMAL') {
    return "\n- **Optimal Rest:** Use full rest periods (2-3 min compounds, 90-120s isolation). Do not compress rest to hit a session time target. Session duration is whatever the rest periods require.";
  } else if (restTrigger === 'MINIMAL') {
    return "\n- **Minimal Rest:** Compounds 60-90s, isolation 45-60s. Prioritize time efficiency.";
  } else { // MODERATE
    return "\n- **Moderate Rest:** Compounds 90-120s, isolation 60-90s. Target 60-75 minute sessions.";
  }
};

export const STATIC_REST_TABLE = ``;

// ================================
// VOLUME RULES
// ================================

export const VOLUME_RULES_HEADER = `---

## VOLUME RULES

### Volume Targets by Training Approach (Natural Lifters)

Use the user's specified Volume Preference from their profile:`;

// Volume targets by user preference
export const getVolumeTargets = (volumePreference: string, customVolume?: string): string => {
  if (volumePreference === 'custom' && customVolume) {
    const customSets = parseInt(customVolume);
    const mediumSets = Math.max(6, Math.round(customSets * 0.75)); // Medium muscles get ~75% of major muscle volume
    return `| Volume Target | Major Muscles (sets/week) | Medium Muscles (sets/week) |
|---------------|--------------------------|---------------------------|
| Custom | ${customSets} | ${mediumSets} |`;
  } else if (volumePreference === '16-20') {
    return `| Volume Target | Major Muscles (sets/week) | Medium Muscles (sets/week) |
|---------------|--------------------------|---------------------------|
| High Volume | 16-20 | 12-16 |`;
  } else if (volumePreference === '12-16') {
    return `| Volume Target | Major Muscles (sets/week) | Medium Muscles (sets/week) |
|---------------|--------------------------|---------------------------|
| Moderate | 12-16 | 10-14 |`;
  } else if (volumePreference === '8-12') {
    return `| Volume Target | Major Muscles (sets/week) | Medium Muscles (sets/week) |
|---------------|--------------------------|---------------------------|
| Conservative | 8-12 | 8-10 |`;
  } else {
    // Fallback for 'not_sure' or undefined
    return `| Volume Target | Major Muscles (sets/week) | Medium Muscles (sets/week) |
|---------------|--------------------------|---------------------------|
| Moderate (Default) | 12-16 | 10-14 |`;
  }
};

export const STATIC_VOLUME_DEFINITIONS = `
**Major** = Chest, Lats, Upper Back, Quads, Hamstrings, Glutes
**Medium** = Side Delts, Biceps, Triceps, Calves

Going above the target range ceiling for any muscle group has diminishing returns for natural lifters.

### Experience-Scaled Minimums

Look up the user's Training Experience from their profile. No non-exempt muscle should fall below these floors:`;

// Experience minimums by tier
export const getExperienceMinimums = (expTier: string): string => {
  if (expTier === 'beginner') {
    return `| Level | Major Muscles (min sets/week) | Medium Muscles (min sets/week) |
|-------|-------------------------------|-------------------------------|
| Beginner | 6-8 | 6 |`;
  } else if (expTier === 'intermediate') {
    return `| Level | Major Muscles (min sets/week) | Medium Muscles (min sets/week) |
|-------|-------------------------------|-------------------------------|
| Intermediate | 8-10 | 6-8 |`;
  } else if (expTier === 'advanced') {
    return `| Level | Major Muscles (min sets/week) | Medium Muscles (min sets/week) |
|-------|-------------------------------|-------------------------------|
| Advanced | 10-12 | 8-10 |`;
  } else {
    // Fallback
    return `| Level | Major Muscles (min sets/week) | Medium Muscles (min sets/week) |
|-------|-------------------------------|-------------------------------|
| Beginner | 6-8 | 6 |
| Intermediate | 8-10 | 6-8 |
| Advanced | 10-12 | 8-10 |`;
  }
};

export const STATIC_PRIORITY_MUSCLES = `
### Priority Muscle Groups

If the profile specifies priority muscles, increase those toward 16-22 sets/week regardless of training approach. Reduce non-priority muscles toward their minimums to keep total stress recoverable. If no priority muscles are specified, distribute volume evenly across all muscle groups within the target range.

### Exempt Muscles (Can Show 0 Direct Sets)

Front Delts, Traps, Rear Delts, Forearms — these get sufficient indirect work from compounds. Core inclusion is controlled by the Direct Core Work setting in the user's profile — see point 7 in the Volume Verification Requirements above. Do not apply length-based core exemption rules. **Note:** Core being exempt from volume targets means it does not trigger a LOW flag and does not count toward any muscle group's set tally — it does not mean skip core entirely. Whether to include core exercises is determined solely by the Direct Core Work setting.

**IMPORTANT:** If a muscle appears in the user's Auxiliary Muscle Work list above, it is NOT exempt — include the specified volume for that muscle.`;

// Exempt muscles with conditional rear delt recommendation
export const getExemptMuscles = (volumePreference: string, gymDays: number): string => {
  const baseText = STATIC_PRIORITY_MUSCLES;
  
  if (volumePreference === '16-20' && gymDays >= 5) {
    return baseText + `

**Recommendation for High Volume programs with 5+ training days:** Add 3-6 sets of direct rear delt work (face pulls, reverse flyes) for balanced shoulder development — not required, but recommended when programming space allows.`;
  }
  
  return baseText;
};

export const BODYWEIGHT_VOLUME_ADJUSTMENTS = `
### Bodyweight-Only Volume Adjustments

For bodyweight-only profiles, some muscle groups are inherently harder to isolate (Side Delts, Calves, Biceps, Hamstrings). In these cases:
- Volume minimums for hard-to-target muscles drop by 2 sets/week.
- Flag any muscle that can't be adequately trained as ℹ️ CONSTRAINED with an explanation.
- Alternative exercise requirements reduce to 1 per exercise (instead of 2) since the bodyweight exercise pool is limited.`;

export const STATIC_STATUS_INDICATORS = `
### Status Indicators

- ✅ = within target range for the user's approach
- ⚠️ LOW = below the experience-scaled minimum — **must fix before presenting**
- ⚠️ HIGH = above the target range ceiling for the user's approach. For priority muscles, ceiling is 22 sets. Exceeding the ceiling has diminishing returns — reduce before presenting.
- ℹ️ CONSTRAINED = above minimum but below target due to split/schedule/equipment. Must explain in Recommendations.

### HIGH Threshold Handling

When HIGH occurs on a non-priority muscle:
- Identify the lowest-priority isolation exercise contributing to the excess
- Reduce it by 1-2 sets in the session table
- If reduction would drop below target range, leave at the ceiling for the user's approach and note as acceptable overflow`;

// Quality standards with approach-specific additions
export const getQualityStandards = (volumePreference: string): string => {
  let standards = STATIC_STATUS_INDICATORS;
  
  if (volumePreference === '16-20' || (volumePreference === 'custom' && parseInt(volumePreference) >= 16)) {
    standards += `
- A High Volume program where most muscles sit at the floor of their target range is underdelivering — **aim for the upper half**.`;
  } else if (volumePreference === '8-12') {
    standards += `
- A Conservative volume program doesn't need to push every muscle to maximum — staying within range is sufficient.`;
  }
  
  return standards;
};

// ================================
// GOAL-SPECIFIC GUIDANCE
// ================================

export const GOAL_GUIDANCE_HEADER = `---

## GOAL-SPECIFIC GUIDANCE

Adapt the plan based on the user's Primary Goal from their profile.`;

export const BUILD_MUSCLE_GUIDANCE = `
### Build Muscle / Body Recomposition
Prioritize hypertrophy rep ranges (8-12 for compounds, 10-15 for isolation). Volume is the primary driver.`;

export const BURN_FAT_GUIDANCE = `
### Burn Fat
Include higher-rep metabolic work and compound movements for caloric expenditure. Consider shorter rest periods.`;

export const GAIN_STRENGTH_GUIDANCE = `
### Gain Strength
Prioritize lower rep ranges (3-6 for main compounds, 6-10 for accessories). Longer rest periods and fewer exercises per session.`;

export const SPORT_SPECIFIC_GUIDANCE = `
### Sport-Specific Training
Design training around the movement patterns of the sport. Lifting supports the sport, not the other way around.`;

export const GENERAL_FITNESS_GUIDANCE = `
### General Fitness
Balanced approach across strength, cardio, and mobility. Use lower end of volume targets.`;

export const CUSTOM_GOAL_GUIDANCE = `
### Custom Goal
Design according to the user's custom description. Use the most applicable framework from above.`;

export const CUSTOM_GOAL_FRAMEWORK_SUMMARY = `

**Available frameworks:** Build Muscle (hypertrophy volume, 8-12 rep compounds), Burn Fat (metabolic + compounds, lower-end volume OK), Gain Strength (3-6 rep compounds, longer rest, fewer exercises), Sport-Specific (lifting supports the sport), General Fitness (balanced, circuits count for volume at rounds × exercises).`;

// Goal guidance selection function
export const getGoalGuidance = (goal: string): string => {
  let guidance = GOAL_GUIDANCE_HEADER;
  
  if (goal === 'build_muscle' || goal === 'body_recomposition') {
    guidance += BUILD_MUSCLE_GUIDANCE;
  } else if (goal === 'burn_fat') {
    guidance += BURN_FAT_GUIDANCE;
  } else if (goal === 'gain_strength') {
    guidance += GAIN_STRENGTH_GUIDANCE;
  } else if (goal === 'sport_specific') {
    guidance += SPORT_SPECIFIC_GUIDANCE;
  } else if (goal === 'general_fitness') {
    guidance += GENERAL_FITNESS_GUIDANCE;
  } else if (goal === 'custom_primary') {
    guidance += CUSTOM_GOAL_GUIDANCE;
    guidance += CUSTOM_GOAL_FRAMEWORK_SUMMARY;
  } else {
    // Fallback - include all
    guidance += BUILD_MUSCLE_GUIDANCE;
    guidance += BURN_FAT_GUIDANCE;
    guidance += GAIN_STRENGTH_GUIDANCE;
    guidance += SPORT_SPECIFIC_GUIDANCE;
    guidance += GENERAL_FITNESS_GUIDANCE;
    guidance += CUSTOM_GOAL_GUIDANCE;
  }
  
  return guidance;
};

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Calculate mesocycle structure from program duration
 */
function calculateMesocycleDefaults(duration: string): {
  totalMesocycles: number;
  mesocycleWeeks: number;
  mesocycleBlocks: number;
} {
  switch (duration) {
    case '6_months':
      return { totalMesocycles: 2, mesocycleWeeks: 13, mesocycleBlocks: 2 };
    case '1_year':
      return { totalMesocycles: 3, mesocycleWeeks: 17, mesocycleBlocks: 3 };
    case 'custom':
      // Default fallback - could be enhanced to parse custom duration
      return { totalMesocycles: 3, mesocycleWeeks: 18, mesocycleBlocks: 3 };
    default:
      return { totalMesocycles: 1, mesocycleWeeks: 12, mesocycleBlocks: 2 };
  }
}

/**
 * Generate the plan output format
 */
function getProgramDocumentFormat(): string {
  return PROGRAM_DOCUMENT_FORMAT;
}

// ================================
// MAIN ASSEMBLY FUNCTION
// ================================

export function assemblePlanningPrompt(
  data: QuestionnaireData,
  mesocycleContext?: ProgramContext
): string {
  // Derive trigger values
  const goal = data.primaryGoal || 'build_muscle';
  const exp = data.trainingExperience || 'intermediate';
  const expTier = ['complete_beginner', 'beginner'].includes(exp) ? 'beginner' : exp;
  const volumePreference = data.volumePreference || '12-16';
  const customVolume = data.customVolume;
  const equipment = data.selectedEquipment || [];
  const hasGymEquipment = equipment.some(e => ['commercial_gym', 'home_gym'].includes(e));
  const isBodyweightOnly = equipment.length === 1 && equipment[0] === 'bodyweight';
  const isBasicOnly = equipment.length === 1 && equipment[0] === 'basic_equipment';
  const duration = data.programDuration || '12_weeks';
  const isCustomDuration = duration === 'custom';
  const isLongProgram = ['6_months', '1_year', 'custom'].includes(duration);
  const isShortProgram = ['4_weeks'].includes(duration);
  const integrationMethods = data.integrationMethods || {};
  const hasCardio = integrationMethods['include_cardio'] !== undefined;
  const hasActivityGoals = Object.keys(integrationMethods).some(g => 
    ['include_cardio', 'maintain_flexibility', 'fun_social', 'athletic_performance'].includes(g)
  );
  const gymDays = data.gymTrainingDays || 0;
  
  // Derive rest trigger from sessionStyle
  let restTrigger: 'OPTIMAL' | 'MODERATE' | 'MINIMAL';
  if (data.sessionStyle === 'optimal') restTrigger = 'OPTIMAL';
  else if (data.sessionStyle === 'minimal') restTrigger = 'MINIMAL';
  else restTrigger = 'MODERATE'; // default or 'moderate'
  
  // Derive deload needed
  const beginnerShortProgram = expTier === 'beginner' && ['4_weeks', '8_weeks'].includes(duration);
  const deloadsNeeded = !beginnerShortProgram;

  // Always generate fresh prompts without mesocycle auto-continuation
  
  let prompt = '';
  
  // === SECTION 1: Instructions ===
  prompt += INSTRUCTIONS_HEADER;
  prompt += '\n' + getVerificationStep3(goal);
  prompt += '\n' + VERIFICATION_STEPS_4_5;
  prompt += '\n' + (hasCardio ? VERIFICATION_STEP_6_WITH_CARDIO : VERIFICATION_STEP_6_NO_CARDIO);
  
  // === SECTION 2: Program Document Format ===
  prompt += '\n\n' + getProgramDocumentFormat();
  
  // === SECTION 3: Profile ===
  prompt += `\n\n---

## MY PROFILE

${generateProgramSpecs(data)}`;

  // Inject mesocycle context if continuing from a previous phase
  if (mesocycleContext?.previousMesocycleSummary || mesocycleContext?.mesocycleRoadmapText) {
    prompt += `\n\n---\n\n## MESOCYCLE CONTEXT\n\nThis program is a continuation of a longer plan.\n`;
    if (mesocycleContext.mesocycleRoadmapText) {
      prompt += `\n**Mesocycle Roadmap:**\n${mesocycleContext.mesocycleRoadmapText}\n`;
    }
    if (mesocycleContext.previousMesocycleSummary) {
      const s = mesocycleContext.previousMesocycleSummary;
      prompt += `\n**Previous Mesocycle Summary (Mesocycle ${s.mesocycleNumber} — ${s.phaseName}):**\n`;
      prompt += `- Split: ${s.splitStructure}\n`;
      prompt += `- Rep focus: ${s.repRangeFocus}\n`;
      prompt += `- Key exercises used: ${s.exercisesUsed?.join(', ') || 'not recorded'}\n`;
      prompt += `\nRotate exercises from the previous phase and build on the established volume baseline.\n`;
    }
  }

  // === SECTION 3.5: Constraint Layer ===
  prompt += '\n\n' + generateConstraintLayer(data);
  
  // === SECTION 4: Exercise Library + Muscle Taxonomy + Tagging ===
  prompt += '\n\n' + EXERCISE_LIBRARY;
  
  let muscleTaxonomy = MUSCLE_TAXONOMY;
  
  // Add auxiliary muscles to taxonomy if user has selected any
  if (data.auxiliaryMuscles && Array.isArray(data.auxiliaryMuscles) && data.auxiliaryMuscles.length > 0) {
    const auxiliaryMuscleNames: { [key: string]: string } = {
      'neck': 'Neck',
      'obliques': 'Obliques', 
      'hip_abductors': 'Hip Abductors',
      'hip_adductors': 'Hip Adductors',
      'serratus': 'Serratus Anterior',
      'shins': 'Tibialis'
    };
    
    const selectedAuxiliaryNames = data.auxiliaryMuscles
      .map(muscle => auxiliaryMuscleNames[muscle])
      .filter(Boolean);
      
    if (selectedAuxiliaryNames.length > 0) {
      muscleTaxonomy += `\n\n**Additional muscles for this program:** ${selectedAuxiliaryNames.join(', ')}`;
    }
    
    // Update Lower Back rule if user selected it
    if (data.auxiliaryMuscles.includes('lower_back')) {
      muscleTaxonomy += `\n\n**Note:** For this program, use "Lower Back" as a valid muscle tag since the user has specifically requested lower back training.`;
    }
  }
  
  prompt += '\n\n' + muscleTaxonomy;
  if (isBodyweightOnly) {
    prompt += '\n\n' + TAGGING_BODYWEIGHT;
  }
  
  // === SECTION 5: Planning Rules ===
  prompt += '\n\n' + PLANNING_RULES_HEADER;
  prompt += '\n\n' + getRule1(equipment);
  prompt += '\n' + STATIC_RULE_2;
  prompt += '\n' + getRule3(hasActivityGoals);
  prompt += '\n' + STATIC_RULES_4_5_6_7;
  prompt += '\n' + getRule8(goal);
  
  const hasRotationRules = hasActivityGoals || !isShortProgram || isLongProgram;
  if (hasRotationRules) prompt += '\n' + ROTATION_PERIODIZATION_HEADER;
  if (hasActivityGoals) prompt += '\n' + RULE_11;
  if (!isShortProgram) prompt += '\n' + RULE_12;
  
  // Use simple rules without mesocycle auto-continuation
  if (isLongProgram) prompt += '\n' + RULE_13;
  prompt += '\n' + BLOCK_STRUCTURE_HEADER;
  prompt += '\n' + getRule12(expTier);
  prompt += '\n' + getRule13(duration);
  const needsMesocycleStructure = isLongProgram || duration === '12_weeks';
  if (needsMesocycleStructure) prompt += '\n' + RULE_16;
  
  prompt += '\n' + RECOVERY_PROGRESSION_HEADER;
  prompt += '\n' + getRule15(expTier, duration);
  if (deloadsNeeded) prompt += '\n' + RULE_17;
  if (duration !== '4_weeks') prompt += '\n' + RULE_18;
  
  prompt += '\n' + BALANCE_HEADER;
  prompt += '\n' + STATIC_RULE_19;
  if (!isShortProgram) prompt += '\n' + RULE_20;
  
  // === SECTION 6: Rest Time Defaults ===
  prompt += '\n\n' + REST_SECTION_HEADER;
  prompt += '\n' + getRestSection(restTrigger);
  prompt += '\n' + STATIC_REST_TABLE;
  
  // === SECTION 7: Volume Rules ===
  prompt += '\n\n' + VOLUME_RULES_HEADER;
  prompt += '\n' + getVolumeTargets(volumePreference, customVolume);
  prompt += '\n' + STATIC_VOLUME_DEFINITIONS;
  prompt += '\n' + getExperienceMinimums(expTier);
  prompt += '\n' + getExemptMuscles(volumePreference, gymDays);
  if (isBodyweightOnly) prompt += '\n' + BODYWEIGHT_VOLUME_ADJUSTMENTS;
  prompt += '\n' + getQualityStandards(volumePreference);
  
  // === SECTION 8: Goal-Specific Guidance ===
  prompt += '\n\n' + getGoalGuidance(goal);
  
  prompt += `\n\n---\n\n## NEXT STEP\n\nOnce you have presented the program document, end your response with exactly this message:\n\n"Program complete. **Next step:** Paste the Review Prompt from the app into this conversation to verify this plan before generating JSON."`;

  return prompt;
}