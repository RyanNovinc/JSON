# JSON.fit — Prompt 1 Conditional Assembly Spec (v2)

## Overview

This document maps every section of Prompt 1 that can be dynamically assembled based on the user's questionnaire answers. It's aligned with the actual `QuestionnaireData` interface and `generateProgramSpecs` function in the codebase.

The goal: each user receives only the rules, tables, and guidance relevant to their specific combination — while preserving everything the AI needs to do its job correctly.

---

## Questionnaire Field → Conditional Trigger Mapping

These are the actual field names from the `QuestionnaireData` interface that drive conditional assembly:

| Trigger Name (this doc) | Actual Field | Possible Values |
|---|---|---|
| `GOAL` | `data.primaryGoal` | `burn_fat`, `build_muscle`, `gain_strength`, `body_recomposition`, `sport_specific`, `general_fitness`, `custom_primary` |
| `EXPERIENCE` | `data.trainingExperience` | `complete_beginner`, `beginner`, `intermediate`, `advanced` |
| `APPROACH` | `data.trainingApproach` | `push_hard`, `balanced`, `conservative` |
| `EQUIPMENT` | `data.selectedEquipment` | Array containing: `commercial_gym`, `home_gym`, `bodyweight`, `basic_equipment` |
| `REST` | `data.restTimePreference` / `data.useAIRestTime` | `optimal`, `moderate`, `minimal` / boolean |
| `DURATION` | `data.programDuration` | `4_weeks`, `8_weeks`, `12_weeks`, `6_months`, `1_year`, `custom` |
| `SECONDARY_GOALS` | `data.secondaryGoals` | Array containing: `include_cardio`, `athletic_performance`, `fun_social`, `injury_prevention`, `maintain_flexibility`, `custom_secondary` |
| `TRAINING_DAYS` | `data.totalTrainingDays` / `data.gymTrainingDays` | Numbers |
| `TRAINING_STYLE` | `data.trainingStylePreference` | String (e.g., `bodybuilding`) |

**Important notes from the codebase:**
- `complete_beginner` and `beginner` both map to "Beginner" tier in the prompt rules
- `selectedEquipment` is an **array** — users could technically select multiple (e.g., home gym + basic equipment), but the UI likely constrains to one
- `restTimePreference` uses `moderate` (not `shorter` as in the prompt). The prompt calls it "Shorter Rest Times." Map accordingly.
- `useAIRestTime = true` with no `restTimePreference` = "Let AI Choose"
- `useAISuggestion = true` with no `workoutDuration` = "Let AI suggest session length"

---

## Architecture Summary

| Prompt 1 Section | Status | Conditional Triggers |
|---|---|---|
| Instructions + Verification Steps | Partially conditional | `GOAL`, `SECONDARY_GOALS` |
| Plan Output Format | **STATIC** | — |
| My Profile | Already dynamic | — |
| Muscle Taxonomy | **STATIC** | — |
| Compound Tagging Guide | Conditional | `EQUIPMENT` |
| Planning Rules (19 rules) | 8 rules conditional | `GOAL`, `EXPERIENCE`, `EQUIPMENT`, `DURATION`, `SECONDARY_GOALS`, `APPROACH` |
| Rest Time Defaults | Conditional | `REST` |
| Volume Rules | Partially conditional | `APPROACH`, `EXPERIENCE`, `EQUIPMENT` |
| Goal-Specific Guidance | Heavily conditional | `GOAL` |

---

## Section-by-Section Conditional Blocks

Each block below has: the trigger condition, what to show for each value, and the exact text boundaries for splitting.

---

### SECTION 1: Instructions + Verification Steps

#### Block 1A — Core Instructions
**Condition:** STATIC (always include)
**Boundary:** From "Review my profile..." through verification step 2.

#### Block 1B — Verification Step 3 (Volume Lookup)
**Trigger:** `GOAL`

| GOAL value | Text variant |
|---|---|
| `build_muscle`, `body_recomposition` | Current text as-is (full volume verification) |
| All others | Replace final sentence: "If the user's Primary Goal is not muscle building or body recomposition, see Goal-Specific Quality Criteria for adjusted verification rules." → "Since this is a [goal label] program, see Goal-Specific Quality Criteria for how volume verification applies to this goal." |

**Why:** The current phrasing implies the default path is hypertrophy. For strength/fat-loss/etc. users, leading with their actual verification mode prevents the AI from over-optimizing for hypertrophy volume.

#### Block 1C — Verification Step 6, Cardio Line
**Trigger:** `SECONDARY_GOALS` contains `include_cardio`

| Condition | Action |
|---|---|
| `include_cardio` in array | Include both strength-day and cardio-day duration formulas |
| `include_cardio` NOT in array | Omit the cardio-day formula line: "**Cardio days:** Use the prescribed activity duration + 5 min warmup + 5 min cooldown." |

---

### SECTION 2: Plan Output Format
**Condition:** STATIC (always include in full)
**Rationale:** This is the contract between Prompt 1 and Prompt 2. Sections like "Secondary Goal Summary" are already self-gated with "(if applicable)".

---

### SECTION 3: My Profile
**Condition:** Already dynamic (assembled by `generateProgramSpecs`)

---

### SECTION 4: Muscle Taxonomy + Compound Tagging Guide

#### Block 4A — Muscle Taxonomy List
**Condition:** STATIC (always include)

#### Block 4B — Compound Exercise Tagging Guide
**Trigger:** `EQUIPMENT`

| EQUIPMENT value | Include |
|---|---|
| `commercial_gym` | Gym equipment section only |
| `home_gym` | Gym equipment section only |
| `basic_equipment` | Both gym equipment AND bodyweight sections |
| `bodyweight` | Bodyweight section only |

**Text boundaries:**

*Gym equipment section* — from `**Barbell / Dumbbell / Cable / Machine:**` through `- Calf raise variants: Primary Calves`

*Bodyweight section* — from `**Bodyweight:**` through `- Planks / Dead bugs / Leg raises: Primary Core`

**Always include the header and preamble:**
```
### COMPOUND EXERCISE TAGGING GUIDE
Primary = main driver through full ROM. Secondary = assists but not the main driver.
```

---

### SECTION 5: Planning Rules

19 rules total. Here's the status of each:

| Rule | Content | Conditional? | Trigger |
|---|---|---|---|
| 1 | Equipment constraint | ✅ Yes | `EQUIPMENT` |
| 2 | Session duration | No | — |
| 3 | Single-purpose days | ✅ Yes | `SECONDARY_GOALS` |
| 4 | Exercise names as identifiers | No | — |
| 5 | Make definitive choices | No | — |
| 6 | Respect exercise preferences | No | — |
| 7 | Only working sets | No | — |
| 8 | Exercise count per session | ✅ Yes | `GOAL` |
| 9 | Rotate secondary activities | ✅ Yes | `SECONDARY_GOALS` |
| 10 | Rotate exercises between blocks | ✅ Yes | `DURATION` |
| 11 | Long-term periodization | ✅ Yes | `DURATION` |
| 12 | Block length by experience | ✅ Yes | `EXPERIENCE` |
| 13 | Duration → block count | ✅ Yes | `DURATION` |
| 14 | Mesocycle structure | ✅ Yes | `DURATION` |
| 15 | Deload frequency | ✅ Yes | `EXPERIENCE` (+ `DURATION` for beginners) |
| 16 | Deload structure | ✅ Yes | Paired with Rule 15 |
| 17 | Plateau management | ✅ Yes | `DURATION` |
| 18 | Pull movement balance | No | — |
| 19 | Complete block coverage | ✅ Yes | `DURATION` |

#### Rule 1 — Equipment Constraint
**Trigger:** `EQUIPMENT`

| EQUIPMENT | Replacement text |
|---|---|
| `commercial_gym` | "**Full equipment access** — use any commercial gym equipment including barbells, dumbbells, cables, and machines. Prioritize barbells and machines for compound movements." |
| `home_gym` | "**Home gym equipment** — use only equipment typically available in a home gym (dumbbells, adjustable bench, pull-up bar, resistance bands). Do not program cable machines or specialized machines unless the profile's equipment notes specify them." |
| `basic_equipment` | "**Limited equipment** — the user has basic equipment (dumbbells, resistance bands). Adapt exercise selections accordingly. Use the bodyweight tagging guide for bodyweight exercises." |
| `bodyweight` | "**Bodyweight only** — do not include any equipment-based exercises. All movements must use body weight only (plus a pull-up bar if available). Use the bodyweight tagging guide above." |

**Note:** If `data.specificEquipment` or `data.unavailableEquipment` are provided, they're already in the profile section. The rule text provides general guidance; the profile provides specifics.

#### Rule 3 — Single-Purpose Training Days
**Trigger:** `SECONDARY_GOALS`

| Condition | Text |
|---|---|
| Array contains `include_cardio` OR `maintain_flexibility` OR `fun_social` OR `athletic_performance` | Current full text (mentions cardio days and flexibility days) |
| Empty array or only `injury_prevention` / `custom_secondary` | "**Each training day has a single primary purpose** — focus on one training quality per session." |

#### Rule 8 — Exercise Count Per Session
**Trigger:** `GOAL`

| GOAL | Text |
|---|---|
| `build_muscle`, `body_recomposition`, `burn_fat` | "**Exercise count per session** — aim for 6-10 exercises per session. Supersets count as 2 exercises." |
| `gain_strength`, `sport_specific` | "**Exercise count per session** — aim for 4-7 exercises per session. Fewer exercises with more sets on primary lifts. Supersets count as 2 exercises." |
| `general_fitness` | "**Exercise count per session** — aim for 5-8 exercises per session. Supersets count as 2 exercises." |
| `custom_primary` | Current full text showing all three ranges (AI needs to decide) |

#### Rule 9 — Rotate Secondary Goal Activities
**Trigger:** `SECONDARY_GOALS`

| Condition | Action |
|---|---|
| Array has any goals with activity types (`include_cardio`, `maintain_flexibility`, `fun_social`, `athletic_performance`) | Include rule |
| Empty array or only non-activity goals | Omit rule entirely |

#### Rule 10 — Rotate Exercises Between Blocks
**Trigger:** `DURATION`

| DURATION | Action |
|---|---|
| `4_weeks` | Omit (single block, nothing to rotate) |
| All others | Include |

#### Rule 11 — Long-Term Periodization
**Trigger:** `DURATION`

| DURATION | Action |
|---|---|
| `4_weeks`, `8_weeks`, `12_weeks` | Omit |
| `6_months`, `1_year`, `custom` | Include |

**Note:** For `custom` duration, include this rule since we can't know if the custom duration exceeds 16 weeks. Better to include than risk omitting.

#### Rule 12 — Block Length by Experience
**Trigger:** `EXPERIENCE`

| EXPERIENCE | Show only |
|---|---|
| `complete_beginner`, `beginner` | "4-6 weeks per block (including deload if applicable)." |
| `intermediate` | "5-6 weeks per block (4-5 training weeks + 1 deload)." |
| `advanced` | "5-6 weeks per block (4-5 training weeks + 1 deload)." |

#### Rule 13 — Program Duration → Block Count
**Trigger:** `DURATION`

Show only the user's selected duration row:

| DURATION | Text |
|---|---|
| `4_weeks` | "1 block" |
| `8_weeks` | "2 blocks (e.g., 4+4 or 3+1 deload + 3+1 deload)" |
| `12_weeks` | "2-3 blocks" |
| `6_months` | "4-5 blocks" |
| `1_year` | "8-10 blocks, organized into 2-3 mesocycles with distinct training phases" |
| `custom` | Include ALL rows (AI needs to pick based on custom duration) |

**Note:** The current prompt is missing a `16_weeks` option, but `programDuration` doesn't have that value in the questionnaire either. The questionnaire jumps from `12_weeks` to `6_months`. If you add a 16-week option later, add: "3 blocks".

#### Rule 14 — Mesocycle Structure
**Trigger:** `DURATION`

| DURATION | Action |
|---|---|
| `4_weeks`, `8_weeks`, `12_weeks` | Omit |
| `6_months`, `1_year`, `custom` | Include |

#### Rule 15 — Deload Frequency by Experience
**Trigger:** `EXPERIENCE` (with `DURATION` interaction for beginners)

| EXPERIENCE | DURATION | Show |
|---|---|---|
| `complete_beginner` / `beginner` | `4_weeks` or `8_weeks` | "Deloads are not needed for this program length at your experience level." |
| `complete_beginner` / `beginner` | `12_weeks` or longer | "Deloads generally not needed for programs under 12 weeks. For longer programs, deload every 6-8 weeks." |
| `intermediate` | Any | "Deload every 5-6 training weeks. Every block longer than 4 weeks must include a deload week." |
| `advanced` | Any | "Do not go more than 6 consecutive training weeks without a deload. Every block longer than 4 weeks must include a deload week." |

#### Rule 16 — Deload Structure
**Trigger:** Paired with Rule 15

| Condition | Action |
|---|---|
| Rule 15 says deloads not needed (beginner + short program) | Omit Rule 16 |
| Rule 15 includes deload guidance | Include Rule 16 |

#### Rule 17 — Plateau Management
**Trigger:** `DURATION`

| DURATION | Action |
|---|---|
| `4_weeks` | Omit |
| All others (8 weeks+) | Include |

**Note:** The current prompt says "for programs longer than 8 weeks." Since 8 weeks is borderline, include it for `8_weeks` — an 8-week program could benefit from plateau guidance.

#### Rule 19 — Complete Block Coverage
**Trigger:** `DURATION`

| DURATION | Action |
|---|---|
| `4_weeks` | Omit |
| All others | Include |

---

### SECTION 6: Rest Time Defaults

#### Block 6A — Rest Adjustment Instructions
**Trigger:** `REST` (mapped from `data.restTimePreference` + `data.useAIRestTime`)

First, derive the REST trigger:
```typescript
let restTrigger: string;
if (data.restTimePreference === 'optimal') restTrigger = 'OPTIMAL';
else if (data.restTimePreference === 'moderate') restTrigger = 'SHORTER';  // "moderate" in code = "Shorter" in prompt
else if (data.restTimePreference === 'minimal') restTrigger = 'MINIMAL';
else if (data.useAIRestTime) restTrigger = 'AI_CHOOSE';
else restTrigger = 'AI_CHOOSE'; // default fallback
```

**⚠️ NAMING MISMATCH:** The codebase uses `moderate` for what the prompt calls "Shorter Rest Times", and the prompt's "Optimal" maps to `optimal`. The questionnaire's rest map shows:
- `optimal` → "Optimal (longer rest for maximum performance)"
- `moderate` → "Moderate (balanced rest periods)"
- `minimal` → "Minimal (shorter rest for time efficiency)"

But in Prompt 1, the tiers are "Optimal", "Shorter", "Minimal". **Recommendation:** Align the naming. Either:
- (a) Change the prompt to use "Optimal / Moderate / Minimal" matching the code, OR
- (b) Change the code to use `optimal / shorter / minimal` matching the prompt

For this spec, I'll use the prompt's terminology and note the code mapping.

| REST Trigger | What to include |
|---|---|
| `OPTIMAL` (code: `optimal`) | Omit the adjustment paragraph. Just show the rest time defaults table. |
| `SHORTER` (code: `moderate`) | Show: "Reduce default rest times by ~25% (e.g., compounds 90-135s, isolation 45-70s)." Then the defaults table with note. |
| `MINIMAL` (code: `minimal`) | Show: "Reduce default rest times by ~40% (e.g., compounds 75-110s, isolation 35-55s). Note in trade-offs that this limits strength/hypertrophy outcomes." Then the defaults table with note. |
| `AI_CHOOSE` (code: `useAIRestTime = true`) | Show full current text with all three adjustment options (AI needs to see all tiers to make its choice). |

#### Block 6B — Rest Time Defaults Table
**Condition:** STATIC (always include)
The actual table with heavy compounds / other compounds / isolation / superset defaults is always needed.

---

### SECTION 7: Volume Rules

#### Block 7A — Volume Targets by Training Approach
**Trigger:** `APPROACH`

| APPROACH | Show |
|---|---|
| `push_hard` | Single row: Major 16-20, Medium 12-16 |
| `balanced` | Single row: Major 12-16, Medium 10-14 |
| `conservative` | Single row: Major 10-12, Medium 8-10 |

Always include the Major/Medium muscle group definitions:
> **Major** = Chest, Lats, Upper Back, Quads, Hamstrings, Glutes
> **Medium** = Side Delts, Biceps, Triceps, Calves

And the 20-set ceiling:
> Going above 20 sets/week for any muscle group has diminishing returns for natural lifters.

#### Block 7B — Experience-Scaled Minimums
**Trigger:** `EXPERIENCE`

| EXPERIENCE | Show |
|---|---|
| `complete_beginner`, `beginner` | Major min 6-8, Medium min 6 |
| `intermediate` | Major min 8-10, Medium min 6-8 |
| `advanced` | Major min 10-12, Medium min 8-10 |

#### Block 7C — Priority Muscle Groups
**Condition:** STATIC (always include)

#### Block 7D — Exempt Muscles
**Trigger:** `APPROACH` + `TRAINING_DAYS`

Base text (always include):
> Front Delts, Traps, Rear Delts, Forearms — these get sufficient indirect work from compounds. Core may be exempt for short programs (under 12 weeks) but should be included in longer programs.

Conditional addition:

| Condition | Action |
|---|---|
| `APPROACH` = `push_hard` AND `data.gymTrainingDays >= 5` | Append: "**Recommendation for Push Hard programs with 5+ training days:** Add 3-6 sets of direct rear delt work (face pulls, reverse flyes) for balanced shoulder development — not required, but recommended when programming space allows." |
| Otherwise | Omit the rear delt recommendation |

#### Block 7E — Bodyweight-Only Volume Adjustments
**Trigger:** `EQUIPMENT`

| EQUIPMENT | Action |
|---|---|
| `bodyweight` in array | Include full section |
| All others | Omit entire section |

#### Block 7F — Status Indicators
**Condition:** STATIC (always include)

#### Block 7G — Quality Standards
**Trigger:** `APPROACH`

Base text (always include):
> - If any non-exempt muscle is below minimum, **revise the plan before presenting**.
> - If the user's approach targets aren't met and a practical fix exists (add a superset, swap an exercise), **implement it** rather than flagging.
> - After verifying ranges, **check distribution balance** — avoid some muscles maxed out while others sit at the floor.

Conditional additions:

| APPROACH | Append |
|---|---|
| `push_hard` | "A Push Hard program where most muscles sit at the floor of their target range is underdelivering — **aim for the upper half**." |
| `balanced` | (nothing extra — base text is sufficient) |
| `conservative` | "A Conservative program doesn't need to push every muscle to maximum — staying within range is sufficient." |

---

### SECTION 8: Goal-Specific Guidance

**Trigger:** `GOAL`

This is the highest-impact conditional. Include ONLY the matching section:

| GOAL value | Section to include |
|---|---|
| `build_muscle` | "Build Muscle / Body Recomposition" |
| `body_recomposition` | "Build Muscle / Body Recomposition" |
| `burn_fat` | "Burn Fat" |
| `gain_strength` | "Gain Strength" |
| `sport_specific` | "Sport-Specific Training" |
| `general_fitness` | "General Fitness" |
| `custom_primary` | "Custom Goal" + framework summary (see below) |

**Custom Goal safety net:** When `GOAL` = `custom_primary`, the Custom Goal section says "If the custom goal maps closely to one of the above, use that framework." But "the above" has been stripped. Append this after the Custom Goal section:

> **Available frameworks:** Build Muscle (hypertrophy volume, 8-12 rep compounds), Burn Fat (metabolic + compounds, lower-end volume OK), Gain Strength (3-6 rep compounds, longer rest, fewer exercises), Sport-Specific (lifting supports the sport), General Fitness (balanced, circuits count for volume at rounds × exercises).

---

## Interaction Warnings

These are combinations where two conditional triggers interact and could cause issues if handled independently:

### 1. Beginner + Short Duration → Deload Rules
**Fields:** `EXPERIENCE` ∈ {`complete_beginner`, `beginner`} AND `DURATION` ∈ {`4_weeks`, `8_weeks`}
**Result:** Rules 15 AND 16 both get omitted. This is correct — no deloads needed.
**Verify:** Plan Output Format still has "Deload Structure" section, but AI will correctly write "N/A" or skip it.

### 2. Custom Duration → Can't Gate on Duration
**Field:** `DURATION` = `custom`
**Result:** We don't know the actual length. Include ALL duration-gated content (rules 10, 11, 13 full table, 14, 17, 19).
**Implementation:** Treat `custom` as equivalent to the longest duration for inclusion purposes.

### 3. Custom Goal → Needs Framework Summary
**Field:** `GOAL` = `custom_primary`
**Result:** Other goal sections are stripped but referenced by the Custom Goal section.
**Fix:** Append the framework summary (defined above in Section 8).

### 4. Body Recomp Without Cardio Secondary
**Field:** `GOAL` = `body_recomposition` AND `include_cardio` NOT in `SECONDARY_GOALS`
**Result:** The goal section mentions cardio but no cardio rules are included.
**Status:** Safe — the goal section says "include cardio *if the user selected it as a secondary goal*." The conditional is already in the text.

### 5. Multiple Equipment Types
**Field:** `selectedEquipment` array has multiple values
**Result:** Need to pick the right tagging guide variant.
**Logic:** If array contains `commercial_gym`, use gym-only guide (it supersedes everything). If array contains `home_gym` + `basic_equipment`, use gym-only guide. If array contains `bodyweight` only, use bodyweight guide. If array contains `basic_equipment` only, use both guides.
**Simplified rule:** If ANY gym-type equipment (`commercial_gym`, `home_gym`) is present → gym guide only. If only `basic_equipment` → both guides. If only `bodyweight` → bodyweight guide only.

### 6. Rest Preference Naming Mismatch
**Fields:** Code uses `moderate`, prompt uses "Shorter"
**Action needed:** Align before implementing. See Section 6 notes.

---

## Assembly Pseudocode

```typescript
function assemblePrompt1(data: QuestionnaireData): string {
  // Derive trigger values
  const goal = data.primaryGoal;
  const exp = data.trainingExperience;  // complete_beginner | beginner | intermediate | advanced
  const expTier = ['complete_beginner', 'beginner'].includes(exp) ? 'beginner' : exp;  // normalize
  const approach = data.trainingApproach;
  const equipment = data.selectedEquipment || [];
  const hasGymEquipment = equipment.some(e => ['commercial_gym', 'home_gym'].includes(e));
  const isBodyweightOnly = equipment.length === 1 && equipment[0] === 'bodyweight';
  const isBasicOnly = equipment.length === 1 && equipment[0] === 'basic_equipment';
  const duration = data.programDuration;
  const isCustomDuration = duration === 'custom';
  const isLongProgram = ['6_months', '1_year', 'custom'].includes(duration);
  const isShortProgram = ['4_weeks'].includes(duration);
  const secondaryGoals = data.secondaryGoals || [];
  const hasCardio = secondaryGoals.includes('include_cardio');
  const hasActivityGoals = secondaryGoals.some(g => 
    ['include_cardio', 'maintain_flexibility', 'fun_social', 'athletic_performance'].includes(g)
  );
  const gymDays = data.gymTrainingDays || 0;
  
  // Derive rest trigger
  let restTrigger: 'OPTIMAL' | 'SHORTER' | 'MINIMAL' | 'AI_CHOOSE';
  if (data.restTimePreference === 'optimal') restTrigger = 'OPTIMAL';
  else if (data.restTimePreference === 'moderate') restTrigger = 'SHORTER';
  else if (data.restTimePreference === 'minimal') restTrigger = 'MINIMAL';
  else restTrigger = 'AI_CHOOSE';
  
  // Derive deload needed
  const beginnerShortProgram = expTier === 'beginner' && ['4_weeks', '8_weeks'].includes(duration);
  const deloadsNeeded = !beginnerShortProgram;
  
  let prompt = '';
  
  // === SECTION 1: Instructions ===
  prompt += STATIC_INSTRUCTIONS;  // Everything through verification step 2
  prompt += getVerificationStep3(goal);
  prompt += STATIC_VERIFICATION_STEPS_4_5;
  prompt += getVerificationStep6(hasCardio);
  
  // === SECTION 2: Plan Output Format ===
  prompt += STATIC_PLAN_OUTPUT_FORMAT;  // Always full
  
  // === SECTION 3: Profile ===
  prompt += generateProgramSpecs(data);  // Existing function
  
  // === SECTION 4: Muscle Taxonomy + Tagging ===
  prompt += STATIC_MUSCLE_TAXONOMY;
  prompt += TAGGING_GUIDE_HEADER;
  if (isBodyweightOnly) {
    prompt += TAGGING_BODYWEIGHT;
  } else if (isBasicOnly) {
    prompt += TAGGING_GYM;
    prompt += TAGGING_BODYWEIGHT;
  } else {
    prompt += TAGGING_GYM;  // commercial_gym, home_gym, or mixed
  }
  
  // === SECTION 5: Planning Rules ===
  prompt += getRule1(equipment);
  prompt += STATIC_RULE_2;
  prompt += getRule3(hasActivityGoals);
  prompt += STATIC_RULES_4_5_6_7;
  prompt += getRule8(goal);
  if (hasActivityGoals) prompt += RULE_9;
  if (!isShortProgram) prompt += RULE_10;
  if (isLongProgram) prompt += RULE_11;
  prompt += getRule12(expTier);
  prompt += getRule13(duration);
  if (isLongProgram) prompt += RULE_14;
  prompt += getRule15(expTier, duration);
  if (deloadsNeeded) prompt += RULE_16;
  if (duration !== '4_weeks') prompt += RULE_17;
  prompt += STATIC_RULE_18;
  if (!isShortProgram) prompt += RULE_19;
  
  // === SECTION 6: Rest Time Defaults ===
  prompt += getRestSection(restTrigger);
  prompt += STATIC_REST_TABLE;
  
  // === SECTION 7: Volume Rules ===
  prompt += getVolumeTargets(approach);
  prompt += STATIC_VOLUME_DEFINITIONS;  // Major/Medium lists + 20-set ceiling
  prompt += getExperienceMinimums(expTier);
  prompt += STATIC_PRIORITY_MUSCLES;
  prompt += getExemptMuscles(approach, gymDays);
  if (isBodyweightOnly) prompt += BODYWEIGHT_VOLUME_ADJUSTMENTS;
  prompt += STATIC_STATUS_INDICATORS;
  prompt += getQualityStandards(approach);
  
  // === SECTION 8: Goal-Specific Guidance ===
  prompt += getGoalGuidance(goal);
  
  return prompt;
}
```

---

## Token Impact Estimates

| Section | Tokens in current static prompt | Tokens after conditional assembly (typical user) | Savings |
|---|---|---|---|
| Tagging guide | ~350 | ~180 | ~170 |
| Planning rules | ~850 | ~550 | ~300 |
| Rest time intro | ~150 | ~40 | ~110 |
| Volume tables | ~300 | ~150 | ~150 |
| Goal-specific guidance | ~650 | ~120 | ~530 |
| Bodyweight volume (if N/A) | ~120 | 0 | ~120 |
| **Estimated total savings** | | | **~800-1,400** |

The exact savings depend on the user profile. Most common profile (Commercial Gym / Build Muscle / Intermediate-Advanced) saves ~800 tokens. Least common but most stripped (Bodyweight / General Fitness / Beginner / 4 weeks) saves ~1,400 tokens.

---

## Sections That MUST Stay Static

Never conditionally assemble these — the AI always needs them:

1. **Muscle Taxonomy list** (all 15 names)
2. **Plan Output Format** (full template — contract with Prompt 2)
3. **Rules 2, 4, 5, 6, 7, 18** (universal planning principles)
4. **Status Indicators** (✅, ⚠️, ℹ️ definitions)
5. **Priority Muscle Groups rule** (profile specifies priorities; rule is universal)
6. **Rest Time Defaults Table** (always needed as a calculation base)
7. **Major/Medium muscle definitions + 20-set ceiling** (context for any volume table)

---

## Testing Strategy

### Priority Test Profiles

These 7 profiles cover every conditional branch:

| # | Goal | Experience | Equipment | Approach | Duration | Secondary Goals | REST |
|---|---|---|---|---|---|---|---|
| 1 | `build_muscle` | `intermediate` | `commercial_gym` | `balanced` | `12_weeks` | `include_cardio` | `optimal` |
| 2 | `build_muscle` | `advanced` | `commercial_gym` | `push_hard` | `1_year` | `include_cardio` | AI choose |
| 3 | `general_fitness` | `beginner` | `bodyweight` | `balanced` | `8_weeks` | `maintain_flexibility` | `moderate` |
| 4 | `gain_strength` | `intermediate` | `commercial_gym` | `push_hard` | `6_months` | None | `optimal` |
| 5 | `burn_fat` | `complete_beginner` | `basic_equipment` | `conservative` | `4_weeks` | `include_cardio` | `minimal` |
| 6 | `body_recomposition` | `intermediate` | `home_gym` | `balanced` | `12_weeks` | `include_cardio`, `maintain_flexibility` | `moderate` |
| 7 | `custom_primary` | `advanced` | `commercial_gym` | `push_hard` | `custom` | `athletic_performance` | AI choose |

### Per-Profile Checklist

For each test profile, verify:
- [ ] AI has a volume target table with exactly one approach row
- [ ] AI has experience minimums for exactly one tier
- [ ] AI has the correct tagging guide for the equipment type
- [ ] AI has goal-specific guidance for only the user's goal
- [ ] AI has deload rules if program is long enough
- [ ] AI has periodization rules if program is long enough
- [ ] No dead references ("see above" pointing to stripped content)
- [ ] Custom goal includes framework summary
- [ ] Rest section matches the user's preference

---

## Implementation Checklist

- [ ] Extract each conditional block into a named constant or template function
- [ ] Map `data.restTimePreference` values to prompt terminology (fix the `moderate` → "Shorter" mismatch)
- [ ] Normalize `complete_beginner` + `beginner` → single "beginner" tier for rule lookups
- [ ] Handle `selectedEquipment` as array (derive single equipment tier)
- [ ] Handle `custom` duration as "include everything" fallback
- [ ] Add framework summary to Custom Goal section
- [ ] Test all 7 priority profiles
- [ ] Verify assembled prompts against Prompt 2's expectations (exercise types, schema references)
