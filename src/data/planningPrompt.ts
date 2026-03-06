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
  const days = data.gymTrainingDays ?? 3;
  const goal = data.primaryGoal;
  const exp = data.trainingExperience;

  const splitMap: Record<number, Record<string, string>> = {
    2: {
      default: 'Full Body A / Full Body B',
    },
    3: {
      gain_strength: 'Full Body A / Full Body B / Full Body C',
      default: 'Push / Pull / Legs OR Full Body A / Full Body B / Full Body C',
    },
    4: {
      gain_strength: 'Upper A / Lower A / Upper B / Lower B',
      default: 'Upper / Lower / Upper / Lower',
    },
    5: {
      gain_strength: 'Upper A / Lower A / Push / Pull / Lower B',
      default: 'Push / Pull / Legs / Upper / Lower',
    },
    6: {
      default: 'Push / Pull / Legs / Push / Pull / Legs',
    },
  };

  // Experience-based adjustments
  if (days === 5 && exp === 'complete_beginner') {
    return '**Recommended Split:** Full Body A / Full Body B / Full Body C / Upper / Lower (reduced volume for beginners)';
  }

  const goalSplits = splitMap[days];
  const split = goalSplits?.[goal ?? 'default'] ?? goalSplits?.['default'] ?? 'Full Body';

  return `**Recommended Split:** ${split}`;
}

function getComplementarityRules(data: QuestionnaireData): string {
  const days = data.gymTrainingDays ?? 3;
  
  if (days <= 3) {
    return `**Session Complementarity:** Full-body split — no recovery conflicts possible. Proceed directly to exercise selection.`;
  }

  return `**Session Complementarity Pre-Pass (complete before exercise selection):**

Before writing any exercises, generate a Weekly Muscle State Matrix in this format:

Day | Primary Load | Secondary Load | Recovery Check
----|-------------|----------------|---------------
[fill for each training day]

**Output this scratchpad inside <scratchpad> tags only. Do not include it in the program document.**

Then validate against these rules:
- Compounds (Quads, Hamstrings, Glutes, Lats, Upper Back): 72hr minimum between PRIMARY sessions
- Isolation-dominant groups (Biceps, Triceps, Calves, Rear Delts, Side Delts): 48hr minimum between PRIMARY sessions
- MAINTENANCE volume permitted within recovery windows
- MAINTENANCE = isolation exercises only, max 50% of primary day set count

Conflict resolution:
- Compound group conflict → restructure that day's primary focus
- Isolation group conflict → downgrade to maintenance volume

The matrix is a scratchpad — do not include it in the final program document.`;
}

function getTimeFormula(data: QuestionnaireData): string {
  const equipment = data.selectedEquipment ?? [];
  
  const transitionTax = equipment.includes('commercial_gym') 
    ? 150  // seconds per exercise
    : equipment.includes('home_gym') 
    ? 90 
    : 60;

  return `**Session Duration Formula (mandatory — calculate and enforce):**

Straight sets: (sets × 45s) + (sets × rest_seconds)
Superset pairs: (pairs × 90s) + (pairs × rest_seconds) + (pairs × ${transitionTax}s setup tax)
Transition tax: exercise_count × ${transitionTax}s
Warmup: 300s fixed

If calculated duration exceeds target: remove lowest-priority isolation exercise and recalculate.
NEVER adjust the formula to match the target.
ALWAYS adjust exercise selection to match the formula.`;
}

function getMuscleAudit(data: QuestionnaireData): string {
  const goal = data.primaryGoal;
  
  const auditThreshold = goal === 'gain_strength' 
    ? 'compound-only groups exempt from isolation audit'
    : goal === 'burn_fat'
    ? 'relaxed thresholds apply — see volume rules'
    : 'full audit applies';

  return `**Muscle Group Coverage Audit (append to program):**

For each muscle group output one of these exact status indicators:

✅ = within target range
⚠️ LOW = below experience-scaled minimum — MUST fix in session tables before presenting
⚠️ HIGH = above 20 sets — flag only, no fix required unless priority muscle
ℹ️ CONSTRAINED = below target but above minimum due to split/equipment/schedule constraints

For CONSTRAINED: specify whether it applies per-block or globally, and explain why.
For LOW: do not mark as resolved until the session table has been updated to fix it.
For HIGH: note whether it is a priority muscle. If not, suggest the specific exercise to reduce and implement the reduction in the session table.

If direct sets = 0: justify with specific indirect volume numbers.

Audit threshold: ${auditThreshold}`;
}

function getReentryProtocol(data: QuestionnaireData): string {
  const duration = data.programDuration;
  
  if (duration === '4_weeks' || duration === '8_weeks') {
    return ''; // omit entirely
  }

  const protocols: Record<string, string> = {
    '12_weeks': `Re-entry points: Week 4, Week 8`,
    '6_months': `Re-entry at each mesocycle boundary`,
    '1_year': `Three-scenario re-entry protocol required`,
  };

  const protocol = protocols[duration ?? '12_weeks'] ?? protocols['12_weeks'];

  return `**Program Interruption Protocol (mandatory):**

Include a Re-entry Guide section in the program document:
- Missed 1 week: resume current block, reduce load 10%
- Missed 2–3 weeks: drop back one block, restart week 1 of that block  
- Missed 4+ weeks: return to program start, treat as new baseline

${protocol}`;
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

I'm using a fitness app called JSON.fit that supports multiple exercise types (strength, cardio, stretch, circuit, and sport). I need help creating a personalized workout program.

**USE WEB SEARCH** - If you have web search available, use it selectively to verify current research on volume recommendations, rest periods, exercise effectiveness, or training techniques that might improve this program. Current research can enhance programming decisions when it provides meaningful updates to established principles.

## INSTRUCTIONS

Review my profile and create a complete, structured workout program document using the PROGRAM DOCUMENT FORMAT provided below.

The user will request changes if they disagree with your choices.

If this conversation contains a completed mesocycle summary and roadmap from a previous phase, use them as context: follow the roadmap's prescribed progression, rotate exercises from the previous phase, and build on the established volume baseline.

Before presenting the program, complete these verification steps:

1. **List every exercise per day** with its set count and primary muscle tags.
2. **Total weekly volume per muscle group** (count only Primary tags).`;

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
   - **Strength days:** Use the Session Duration Formula from the Program Architecture Constraints section above — do not recalculate independently.
   - **Cardio days:** Use the prescribed activity duration + 5 min warmup + 5 min cooldown.
   - If the profile specifies a session length, enforce it. If not, use 60-75 minutes as a default and flag any session that exceeds it.`;

export const VERIFICATION_STEP_6_NO_CARDIO = `6. **Estimate session duration** for each day:
   - **Strength days:** Use the Session Duration Formula from the Program Architecture Constraints section above — do not recalculate independently.
   - If the profile specifies a session length, enforce it. If not, use 60-75 minutes as a default and flag any session that exceeds it.`;

export const PROGRAM_DOCUMENT_FORMAT = `---

## PROGRAM DOCUMENT FORMAT

Create a complete, structured workout program document using this exact format:

<!-- BEGIN PROGRAM DOCUMENT -->

# [PROGRAM NAME] - Complete Workout Program

**Program Overview:**
- Duration: [X weeks] 
- Training Days: [X days per week]
- Split: [split type and description]
- Goal: [primary goal focus]

## Daily Workout Sessions

### Block 1: [Block Name] (Weeks 1-[X])
**Focus:** [rep range and training emphasis, e.g., "Hypertrophy: 8-12 reps"]

#### Day 1: [Session Name] (~[X] minutes)
**Target Muscles:** [primary muscle groups]

| Exercise | Sets | Reps | Rest | Primary Muscles | Secondary Muscles | Notes |
|----------|------|------|------|-----------------|-------------------|-------|
| [Exercise 1] | [X] | [X-X] | [X]s | [muscles] | [muscles] | [form cues or setup] |
| [Exercise 2] | [X] | [X-X] | [X]s | [muscles] | [muscles] | [form cues or setup] |

**Alternative Exercises:**
- [Exercise 1] → [Alternative 1], [Alternative 2]
- [Exercise 2] → [Alternative 1], [Alternative 2]

#### Day 2: [Session Name] (~[X] minutes)
[Same format as Day 1]

[Continue for all training days in the block]

### Block 2: [Block Name] (Weeks [X]-[X])
**Focus:** [rep range and training emphasis]
[Same format as Block 1, listing all days and exercises]

[Continue for all blocks in the program]

## Weekly Progression Schedule

### Block 1 Progression (Weeks 1-[X])
**Week 1:**
- All exercises: Start at lower end of rep ranges

**Week 2:**
- Add 1 rep to all exercises or add weight if available

**Week 3:**
- Continue progression, aim for upper end of rep ranges

[Continue for all weeks and blocks]

## Exercise Database

### [Exercise Name]
**Primary Muscles:** [muscles]
**Secondary Muscles:** [muscles] 
**Equipment:** [required equipment]
**Form Cues:** [key technique points]
**Common Mistakes:** [what to avoid]
**Alternatives:** [2-3 alternative exercises]

[Include entry for every exercise in the program]

## Implementation Guide

### Rest Periods
- Heavy Compounds (Squat, Deadlift, Bench): [X] seconds
- Other Compounds: [X] seconds  
- Isolation Exercises: [X] seconds

### Deload Protocol
**When:** Week [X] of each block
**Method:** Reduce sets by 40% while maintaining rep ranges
**Purpose:** Recovery and preparation for next block

### Plateau Management
**If you stall:** Drop reps by 2 and rebuild progression
**Exercise Rotation:** Substitute similar movement patterns when needed

### Session Structure
1. **Warm-up** (5-10 minutes): Dynamic movements and mobility
2. **Main Work** ([X] minutes): Follow exercise order as written
3. **Cool-down** (5 minutes): Light stretching and recovery

## Volume Distribution

| Muscle Group | Sets/Week | Training Frequency |
|--------------|-----------|-------------------|
| [Muscle] | [X] | [X]x per week |

<!-- END PROGRAM DOCUMENT -->

**FORMAT REQUIREMENTS:**
- Create the program as a text document (not a formatted document)
- Use simple text formatting with headers, bullet points, and tables
- Make it fast to generate and easy to copy/edit
- **INCLUDE ALL WORKOUT SESSIONS** in the document with complete exercise details
- **INCLUDE PROGRESSION SCHEDULE** showing week-by-week changes
- **INCLUDE EXERCISE DATABASE** with alternatives and form guidance  
- **INCLUDE IMPLEMENTATION GUIDE** with rest periods and protocols
- Every exercise must have sets, reps, rest periods, muscle tags, and alternatives
- Present ONLY the final program document — do not show working, drafts, or iteration`;

export const MUSCLE_TAXONOMY = `---

## MUSCLE TAXONOMY

Use ONLY these exact muscle names — no generic terms like "Shoulders", "Back", "Arms", or "Legs":

Chest, Front Delts, Side Delts, Rear Delts, Lats, Upper Back, Traps, Biceps, Triceps, Forearms, Quads, Hamstrings, Glutes, Calves, Core

Use "Core" instead of "Lower Back" for spinal stabilization or erector engagement.`;

export const TAGGING_HEADER = `### COMPOUND EXERCISE TAGGING GUIDE

Primary = main driver through full ROM. Secondary = assists but not the main driver.`;

export const TAGGING_GYM = `**Barbell / Dumbbell / Cable / Machine:**
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
- Calf raise variants: Primary Calves`;

export const TAGGING_BODYWEIGHT = `**Bodyweight:**
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

export const STATIC_RULE_2 = `2. **Stay within session duration** — use the Session Duration Formula from the Program Architecture Constraints section. If the profile specifies a session length, that is a hard constraint. If it says "Let AI suggest," use 60-75 minutes for hypertrophy/strength, 45-60 minutes for general fitness/fat loss, and note your recommendation.`;

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
7. **Only program working sets** — do not include warm-up sets in the plan. The app tracks working sets only.`;

// Rule 8 variants by goal
export const getRule8 = (goal: string): string => {
  if (goal === 'build_muscle' || goal === 'body_recomposition' || goal === 'burn_fat') {
    return `8. **Exercise count per session** — aim for 6-10 exercises per session. Supersets count as 2 exercises.`;
  } else if (goal === 'gain_strength' || goal === 'sport_specific') {
    return `8. **Exercise count per session** — aim for 4-7 exercises per session. Fewer exercises with more sets on primary lifts. Supersets count as 2 exercises.`;
  } else if (goal === 'general_fitness') {
    return `8. **Exercise count per session** — aim for 5-8 exercises per session. Supersets count as 2 exercises.`;
  } else {
    // custom_primary - show all ranges
    return `8. **Exercise count per session** — aim for 6-10 exercises per session for hypertrophy programs, 4-7 for strength programs, and 5-8 for general fitness. These are guidelines, not hard limits — supersets count as 2 exercises.`;
  }
};

export const ROTATION_PERIODIZATION_HEADER = `
### Rotation and Periodization`;

export const RULE_9 = `9. **Rotate secondary goal activities** — if the user has preferred activities (cardio types, sports, flexibility work, etc.), rotate through them across weeks. Every preferred activity should appear at least once per block.`;

export const RULE_10 = `10. **Rotate exercises between blocks** — change exercise variations while keeping movement patterns. Longer programs need more distinct exercise pools to prevent staleness.`;

export const RULE_11 = `11. **Long-term periodization** — for programs longer than 16 weeks, describe how training evolves across repeated cycles. Don't just rotate exercises — show how rep ranges, volume, or intensity shift over the course of the program.`;

export const BLOCK_STRUCTURE_HEADER = `
### Block Structure`;

// Rule 12 variants by experience
export const getRule12 = (expTier: string): string => {
  if (expTier === 'beginner') {
    return `12. **Preferred block length by experience:**
    - **Beginner:** 4-6 weeks per block (including deload if applicable).`;
  } else if (expTier === 'intermediate') {
    return `12. **Preferred block length by experience:**
    - **Intermediate:** 5-6 weeks per block (4-5 training weeks + 1 deload).`;
  } else if (expTier === 'advanced') {
    return `12. **Preferred block length by experience:**
    - **Advanced:** 5-6 weeks per block (4-5 training weeks + 1 deload).`;
  } else {
    // Fallback
    return `12. **Preferred block length by experience:**
    - **Beginner:** 4-6 weeks per block (including deload if applicable).
    - **Intermediate:** 5-6 weeks per block (4-5 training weeks + 1 deload).
    - **Advanced:** 5-6 weeks per block (4-5 training weeks + 1 deload).`;
  }
};

// Rule 13 variants by duration
export const getRule13 = (duration: string): string => {
  const rule13Header = `13. **Program duration → block count:**`;
  
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

export const RULE_14 = `14. **Mesocycle structure for programs 6+ months:** Group blocks into mesocycles (e.g., 3 blocks per mesocycle). Each mesocycle shifts emphasis — e.g., Mesocycle 1: Hypertrophy (8-12 reps), Mesocycle 2: Strength-Hypertrophy (6-10 reps), Mesocycle 3: Metabolic/Intensity (10-15 reps + advanced techniques). Describe the full mesocycle plan, then detail exercises for the first mesocycle's blocks.`;

export const RECOVERY_PROGRESSION_HEADER = `
### Recovery and Progression`;

// Rule 15 variants by experience and duration
export const getRule15 = (expTier: string, duration: string): string => {
  if (expTier === 'beginner') {
    if (duration === '4_weeks' || duration === '8_weeks') {
      return `15. **Deload frequency by experience:**
    - **Beginner:** Deloads are not needed for this program length at your experience level.`;
    } else {
      return `15. **Deload frequency by experience:**
    - **Beginner:** Deloads generally not needed for programs under 12 weeks. For longer programs, deload every 6-8 weeks.`;
    }
  } else if (expTier === 'intermediate') {
    return `15. **Deload frequency by experience:**
    - **Intermediate:** Deload every 5-6 training weeks. Every block longer than 4 weeks must include a deload week.`;
  } else if (expTier === 'advanced') {
    return `15. **Deload frequency by experience:**
    - **Advanced:** Do not go more than 6 consecutive training weeks without a deload. Every block longer than 4 weeks must include a deload week.`;
  } else {
    // Fallback
    return `15. **Deload frequency by experience:**
    - **Beginner:** Deloads generally not needed for programs under 12 weeks. For longer programs, deload every 6-8 weeks.
    - **Intermediate:** Deload every 5-6 training weeks. Every block longer than 4 weeks must include a deload week.
    - **Advanced:** Do not go more than 6 consecutive training weeks without a deload. Every block longer than 4 weeks must include a deload week.`;
  }
};

export const RULE_16 = `16. **Deload structure** — deload weeks reduce total sets by ~40-50% while maintaining movement patterns. Rep ranges increase by 2-3 reps per set. The app does not track weight — do not reference load reductions.`;

export const RULE_17 = `17. **Plateau management** — for programs 8 weeks or longer, include guidance for when the lifter stalls on a prescribed progression. Frame in terms of rep targets, not weight.`;

export const BALANCE_HEADER = `
### Balance`;

export const STATIC_RULE_18 = `18. **Pull movement balance** — vertical pulls (pulldowns, pull-ups) should make up at least one-third of total back volume.`;

export const RULE_19 = `19. **Complete block coverage** — the plan must explicitly cover every block (with the diff-based exception for 5+ block programs as described in the output format).`;

// ================================
// REST TIME DEFAULTS
// ================================

export const REST_SECTION_HEADER = `---

## REST TIME DEFAULTS

Use these when the profile says "Let AI choose" or doesn't specify a preference. If the profile specifies a rest preference, adjust accordingly:`;

export const getRestSection = (restTrigger: string): string => {
  if (restTrigger === 'OPTIMAL') {
    return ''; // No adjustment text needed
  } else if (restTrigger === 'SHORTER') {
    return `
- **Shorter Rest Times:** Reduce by ~25% (e.g., compounds 90-135s, isolation 45-70s).`;
  } else if (restTrigger === 'MINIMAL') {
    return `
- **Minimal Rest Times:** Reduce by ~40% (e.g., compounds 75-110s, isolation 35-55s). Note in trade-offs that this limits strength/hypertrophy outcomes.`;
  } else { // AI_CHOOSE
    return `
- **Optimal Rest Times:** Use the defaults below as-is.
- **Shorter Rest Times:** Reduce by ~25% (e.g., compounds 90-135s, isolation 45-70s).
- **Minimal Rest Times:** Reduce by ~40% (e.g., compounds 75-110s, isolation 35-55s). Note in trade-offs that this limits strength/hypertrophy outcomes.`;
  }
};

export const STATIC_REST_TABLE = `
**Heavy compounds** = squat variations, deadlift variations, barbell bench press, barbell overhead press.
**Other compounds** = everything else with 2+ joints (rows, lunges, dumbbell presses, pull-ups, dips, leg press, etc.).

| Exercise Type | Default Rest (seconds) |
|---------------|----------------------|
| Heavy compounds | 150-180 |
| Other compounds | 120-150 |
| Isolation exercises | 60-90 |
| Superset exercises | SS[n]a: 60-90 (transition to second exercise); SS[n]b: full rest for its exercise type (compound or isolation) before repeating the pair |

These defaults are also needed for session duration estimation.`;

// ================================
// VOLUME RULES
// ================================

export const VOLUME_RULES_HEADER = `---

## VOLUME RULES

### Volume Targets by Training Approach (Natural Lifters)

Look up the user's Training Approach from their profile:`;

// Volume targets by approach
export const getVolumeTargets = (approach: string): string => {
  if (approach === 'push_hard') {
    return `| Approach | Major Muscles (sets/week) | Medium Muscles (sets/week) |
|----------|--------------------------|---------------------------|
| Push Hard | 16-20 | 12-16 |`;
  } else if (approach === 'balanced') {
    return `| Approach | Major Muscles (sets/week) | Medium Muscles (sets/week) |
|----------|--------------------------|---------------------------|
| Balanced | 12-16 | 10-14 |`;
  } else if (approach === 'conservative') {
    return `| Approach | Major Muscles (sets/week) | Medium Muscles (sets/week) |
|----------|--------------------------|---------------------------|
| Conservative | 10-12 | 8-10 |`;
  } else {
    // Fallback
    return `| Approach | Major Muscles (sets/week) | Medium Muscles (sets/week) |
|----------|--------------------------|---------------------------|
| Push Hard | 16-20 | 12-16 |
| Balanced | 12-16 | 10-14 |
| Conservative | 10-12 | 8-10 |`;
  }
};

export const STATIC_VOLUME_DEFINITIONS = `
**Major** = Chest, Lats, Upper Back, Quads, Hamstrings, Glutes
**Medium** = Side Delts, Biceps, Triceps, Calves

Going above 20 sets/week for any muscle group has diminishing returns for natural lifters.

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

Front Delts, Traps, Rear Delts, Forearms — these get sufficient indirect work from compounds. Core may be exempt for short programs (under 12 weeks) but should be included in longer programs.`;

// Exempt muscles with conditional rear delt recommendation
export const getExemptMuscles = (approach: string, gymDays: number): string => {
  const baseText = STATIC_PRIORITY_MUSCLES;
  
  if (approach === 'push_hard' && gymDays >= 5) {
    return baseText + `

**Recommendation for Push Hard programs with 5+ training days:** Add 3-6 sets of direct rear delt work (face pulls, reverse flyes) for balanced shoulder development — not required, but recommended when programming space allows.`;
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
- ⚠️ HIGH = above 20 sets for non-priority muscles, or above 22 sets for priority muscles. Diminishing returns for natural lifters
- ℹ️ CONSTRAINED = above minimum but below target due to split/schedule/equipment. Must explain in Recommendations.

### Quality Standards

- If any non-exempt muscle is below minimum, **revise the plan before presenting**.
- If the user's approach targets aren't met and a practical fix exists (add a superset, swap an exercise), **implement it** rather than flagging.
- After verifying ranges, **check distribution balance** — avoid some muscles maxed out while others sit at the floor.

### HIGH Threshold Handling

When HIGH occurs on a non-priority muscle:
- Identify the lowest-priority isolation exercise contributing to the excess
- Reduce it by 1-2 sets in the session table
- If reduction would drop below target range, leave at target ceiling (16 sets) and note as acceptable overflow

"Recoverable" is not a valid justification for leaving HIGH unfixed. The only valid exception is a priority muscle explicitly named in the user profile.`;

// Quality standards with approach-specific additions
export const getQualityStandards = (approach: string): string => {
  let standards = STATIC_STATUS_INDICATORS;
  
  if (approach === 'push_hard') {
    standards += `
- A Push Hard program where most muscles sit at the floor of their target range is underdelivering — **aim for the upper half**.`;
  } else if (approach === 'conservative') {
    standards += `
- A Conservative program doesn't need to push every muscle to maximum — staying within range is sufficient.`;
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
Prioritize hypertrophy rep ranges (8-12 for compounds, 10-15 for isolation). Volume is the primary driver. Apply the full volume verification system above. For recomp, include cardio if the user selected it as a secondary goal.`;

export const BURN_FAT_GUIDANCE = `
### Burn Fat
Include higher-rep metabolic work and prioritize compound movements for caloric expenditure. Lifting volume can sit at the lower end of the user's approach range — the minimum targets still apply, but pushing to the upper end is less important than for muscle building. Cardio days (if present) are important for the goal. Consider shorter rest periods if the user didn't specify a preference.`;

export const GAIN_STRENGTH_GUIDANCE = `
### Gain Strength
Prioritize lower rep ranges (3-6 for main compounds, 6-10 for accessories). Longer rest periods (use heavy compound defaults for most exercises). Fewer exercises per session but more sets on primary lifts. Volume targets still apply but sets on main lifts count more heavily — 5 sets of squats at RPE 8-9 delivers more stimulus than the same volume split across 3 exercises. Periodize with progressively heavier blocks.`;

export const SPORT_SPECIFIC_GUIDANCE = `
### Sport-Specific Training
The profile should include sport details. Design training around the movement patterns and physical demands of that sport. Lifting supports the sport — not the other way around. Volume targets apply to lifting days only — sport practice days don't count toward muscle volume. If the user has few lifting days (2-3), volume minimums may be hard to hit; use ℹ️ CONSTRAINED and explain.`;

export const GENERAL_FITNESS_GUIDANCE = `
### General Fitness
Balanced approach across strength, cardio, and mobility. Don't over-optimize for any single quality. Wider exercise variety is appropriate. Sessions can be shorter and more varied. Volume targets apply but use the lower end of the range — general fitness doesn't require hypertrophy-optimal volume. Circuit-type training counts toward muscle volume: each exercise in a circuit gets volume credit equal to the number of rounds (e.g., a 3-round circuit with 4 exercises = 3 sets per exercise for volume counting purposes). Prompt 3's volume verification should count circuit rounds as sets.`;

export const CUSTOM_GOAL_GUIDANCE = `
### Custom Goal
Read the user's custom description and design accordingly. If the custom goal maps closely to one of the above, use that framework. If it's genuinely unique, explain your interpretation and approach.`;

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
  data: QuestionnaireData
): string {
  // Derive trigger values
  const goal = data.primaryGoal || 'build_muscle';
  const exp = data.trainingExperience || 'intermediate';
  const expTier = ['complete_beginner', 'beginner'].includes(exp) ? 'beginner' : exp;
  const approach = data.trainingApproach || 'balanced';
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
  
  // Derive rest trigger
  let restTrigger: 'OPTIMAL' | 'SHORTER' | 'MINIMAL' | 'AI_CHOOSE';
  if (data.restTimePreference === 'optimal') restTrigger = 'OPTIMAL';
  else if (data.restTimePreference === 'shorter') restTrigger = 'SHORTER';
  else if (data.restTimePreference === 'minimal') restTrigger = 'MINIMAL';
  else restTrigger = 'AI_CHOOSE';
  
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

  // === SECTION 3.5: Constraint Layer ===
  prompt += '\n\n' + generateConstraintLayer(data);

  // Mesocycle auto-continuation logic removed for better UX
  
  // === SECTION 4: Muscle Taxonomy + Tagging ===
  prompt += '\n\n' + MUSCLE_TAXONOMY;
  prompt += '\n\n' + TAGGING_HEADER;
  if (isBodyweightOnly) {
    prompt += '\n' + TAGGING_BODYWEIGHT;
  } else if (isBasicOnly) {
    prompt += '\n' + TAGGING_GYM;
    prompt += '\n\n' + TAGGING_BODYWEIGHT;
  } else {
    prompt += '\n' + TAGGING_GYM; // commercial_gym, home_gym, or mixed
  }
  
  // === SECTION 5: Planning Rules ===
  prompt += '\n\n' + PLANNING_RULES_HEADER;
  prompt += '\n\n' + getRule1(equipment);
  prompt += '\n' + STATIC_RULE_2;
  prompt += '\n' + getRule3(hasActivityGoals);
  prompt += '\n' + STATIC_RULES_4_5_6_7;
  prompt += '\n' + getRule8(goal);
  
  prompt += '\n' + ROTATION_PERIODIZATION_HEADER;
  if (hasActivityGoals) prompt += '\n' + RULE_9;
  if (!isShortProgram) prompt += '\n' + RULE_10;
  
  // Use simple rules without mesocycle auto-continuation
  if (isLongProgram) prompt += '\n' + RULE_11;
  prompt += '\n' + BLOCK_STRUCTURE_HEADER;
  prompt += '\n' + getRule12(expTier);
  prompt += '\n' + getRule13(duration);
  if (isLongProgram) prompt += '\n' + RULE_14;
  
  prompt += '\n' + RECOVERY_PROGRESSION_HEADER;
  prompt += '\n' + getRule15(expTier, duration);
  if (deloadsNeeded) prompt += '\n' + RULE_16;
  if (duration !== '4_weeks') prompt += '\n' + RULE_17;
  
  prompt += '\n' + BALANCE_HEADER;
  prompt += '\n' + STATIC_RULE_18;
  if (!isShortProgram) prompt += '\n' + RULE_19;
  
  // === SECTION 6: Rest Time Defaults ===
  prompt += '\n\n' + REST_SECTION_HEADER;
  prompt += '\n' + getRestSection(restTrigger);
  prompt += '\n' + STATIC_REST_TABLE;
  
  // === SECTION 7: Volume Rules ===
  prompt += '\n\n' + VOLUME_RULES_HEADER;
  prompt += '\n' + getVolumeTargets(approach);
  prompt += '\n' + STATIC_VOLUME_DEFINITIONS;
  prompt += '\n' + getExperienceMinimums(expTier);
  prompt += '\n' + getExemptMuscles(approach, gymDays);
  if (isBodyweightOnly) prompt += '\n' + BODYWEIGHT_VOLUME_ADJUSTMENTS;
  prompt += '\n' + getQualityStandards(approach);
  
  // === SECTION 8: Goal-Specific Guidance ===
  prompt += '\n\n' + getGoalGuidance(goal);
  
  return prompt;
}