# Plan a Workout Program

I'm using a fitness app called JSON.fit that supports multiple exercise types (strength, cardio, stretch, circuit, and sport). I need help designing a personalized workout program.

## INSTRUCTIONS

Review my profile and design a training plan. Show your reasoning — work through split selection, volume distribution, exercise choices, and trade-offs. Make definitive choices and explain your reasoning. The user will request changes if they disagree — do not ask questions or present alternatives to choose from.

Do NOT generate the full program. Only plan.

Before presenting the summary, complete these verification steps:

1. **List every exercise per day** with its set count and primary muscle tags.
2. **Total weekly volume per muscle group** (count only Primary tags).
3. **Look up this user's targets** — cross-reference their Training Approach (from the profile) against the Volume Targets table, and their Training Experience against the Experience-Scaled Minimums table. These are the numbers you must hit. If the user's Primary Goal is not muscle building or body recomposition, see Goal-Specific Quality Criteria for adjusted verification rules.
4. **If any muscle group is below target**, revise exercise selections and recount. Do not present the summary until all targets are met or explicitly flagged as constrained.
5. **Check distribution balance** — avoid some muscles maxed out while others sit at the floor of their target range.
6. **Estimate session duration** for each day:
   - **Strength days:** `(straight sets × avg rest) + (straight sets × 45s) + (superset pairs × pair rest × sets per pair) + (superset pairs × 45s × 2 × sets per pair) + 5 min warmup`. Count superset pairs as sharing rest periods — don't double-count.
   - **Cardio days:** Use the prescribed activity duration + 5 min warmup + 5 min cooldown.
   - If the profile specifies a session length, enforce it. If not, use 60-75 minutes as a default and flag any session that exceeds it.

---

## PLAN OUTPUT FORMAT

Use this exact structure so the generation prompt can parse it reliably.

<!-- BEGIN PLAN — when ready to generate JSON, copy everything from here to END PLAN and paste it above Prompt 2 -->

## Your Program Plan

**Split:** [split name] — [brief description]
**Sessions:** [estimated session lengths per day, calculated using the formula above]
**Blocks:** [block structure, weeks per block, deload timing]
**Periodization:** [how rep ranges / volume / intensity evolve across blocks over the full program duration]

| Day | Session | Focus |
|-----|---------|-------|
| 1   | ...     | ...   |
| ... | ...     | ...   |

### Volume Targets

| Muscle Group | Sets/Week | Min | Target | Status |
|---|---|---|---|---|
| Chest | 16 | 10 | 16-20 | ✅ |

(Include all 15 muscle groups. Use status indicators defined in Quality Check.)

### Exercise Selections (Working Sets Only)

For each block, list exercises grouped by training day using this format:

**Block A (Weeks 1-6) — [rep range focus, e.g. "Hypertrophy: 8-12 reps"]**

**Day 1 — [Session Name]**
| # | Exercise | Sets | Primary | Secondary | Notes |
|---|----------|------|---------|-----------|-------|
| 1 | Barbell Bench Press | 4 | Chest, Triceps | Front Delts | — |
| 2 | Incline Dumbbell Press | 3 | Chest, Front Delts | Triceps | — |
| SS1a | Lateral Raise | 3 | Side Delts | — | Superset with SS1b |
| SS1b | Face Pull | 3 | Rear Delts | Upper Back | Superset with SS1a |

Superset notation: Use SS[n]a / SS[n]b prefixes. Both exercises in a superset share the same number.

Repeat for every day in the block.

**Subsequent blocks:**
- For programs with **4 or fewer blocks**: list every block in full. Do not write "same as Block A" or "repeat."
- For programs with **5+ blocks**: list Blocks A and B in full. For subsequent blocks, list only exercises that change from the prior block and note what was swapped. Unchanged exercises can be referenced as "carry over from Block [X]." Always list the full day structure (day names and order) even when referencing carryovers.

Each block header must include its rep range focus. The rep range focus applies primarily to compound exercises — isolation exercises typically run 2-4 reps higher than the stated range (e.g., 10-15 rep isolations in a "6-10 reps" block is good programming).

### Plateau Management
[For programs longer than 8 weeks: guidance for when the lifter stalls on a prescribed progression. Since the app doesn't track weight, frame this in terms of rep targets — e.g., "if you can't hit the prescribed reps for 2 consecutive weeks, reduce by 1-2 reps per set and rebuild."]

### Deload Structure
[Approach and which weeks are deloads in each block. See Deload Rules below for requirements.]

### Secondary Goal Summary
[If the profile includes secondary goals with dedicated training days: what activities, how they rotate across weeks, how they progress, and how they fit with the primary training days.]

### Trade-offs (if any)
- [1-3 bullets noting meaningful compromises]

### Recommendation (if applicable)
If the plan has significant limitations, suggest one clear change. Keep it simple — no jargon. Example: "I'd recommend 5 lifting days + 1 cardio day instead of 4+1. This would solve the volume constraints and keep sessions shorter."

Each training day has a single primary purpose. Do not suggest combining cardio with lifting sessions.

<!-- END PLAN -->

End with: "Let me know if you want any changes. When you're happy with the plan, you can use it with your JSON import prompt to generate the program files."

The profile represents preferences, not hard constraints. If the user's goals would be significantly better served by a different setup (e.g., more training days, a different split), recommend that clearly. Respect their choices if confirmed, but don't silently accept a suboptimal setup.

---

## MY PROFILE

[PROFILE CONTENT INSERTED HERE BY APP]

---

## MUSCLE TAXONOMY

Use ONLY these exact muscle names — no generic terms like "Shoulders", "Back", "Arms", or "Legs":

Chest, Front Delts, Side Delts, Rear Delts, Lats, Upper Back, Traps, Biceps, Triceps, Forearms, Quads, Hamstrings, Glutes, Calves, Core

Use "Core" instead of "Lower Back" for spinal stabilization or erector engagement.

### COMPOUND EXERCISE TAGGING GUIDE

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

## PLANNING RULES

### Core Principles

1. **Only use available equipment** — do not include exercises the user can't perform. For "Bodyweight Only" or "Basic Equipment" profiles, adapt all exercise selections accordingly and use the bodyweight tagging guide above.
2. **Stay within session duration** — estimate using the formula in the verification steps (superset-adjusted). If the profile specifies a session length, that is a hard constraint. If it says "Let AI suggest," use 60-75 minutes for hypertrophy/strength, 45-60 minutes for general fitness/fat loss, and note your recommendation.
3. **Each training day has a single primary purpose** — cardio days are standalone sessions, not add-ons to lifting days. Flexibility/mobility days are standalone unless the profile is general fitness with limited training days.
4. **Treat exercise names as identifiers** — once an exercise name appears in the plan, use that exact string everywhere (across blocks, in superset references, in notes). No variation.
5. **Make definitive choices** — explain reasoning and trade-offs, but commit to a plan. The user will tell you what to change.
6. **Respect exercise preferences** — if the profile lists liked exercises, incorporate them where they fit the plan. If it lists disliked exercises, avoid them and use alternatives for that movement pattern.
7. **Only program working sets** — do not include warm-up sets in the plan. The app tracks working sets only.
8. **Exercise count per session** — aim for 6-10 exercises per session for hypertrophy programs, 4-7 for strength programs, and 5-8 for general fitness. These are guidelines, not hard limits — supersets count as 2 exercises.

### Rotation and Periodization

8. **Rotate secondary goal activities** — if the user has preferred activities (cardio types, sports, flexibility work, etc.), rotate through them across weeks. Every preferred activity should appear at least once per block.
9. **Rotate exercises between blocks** — change exercise variations while keeping movement patterns. Longer programs need more distinct exercise pools to prevent staleness.
10. **Long-term periodization** — for programs longer than 16 weeks, describe how training evolves across repeated cycles. Don't just rotate exercises — show how rep ranges, volume, or intensity shift over the course of the program.

### Block Structure

11. **Preferred block length by experience:**
    - **Beginner:** 4-6 weeks per block (including deload if applicable).
    - **Intermediate:** 5-6 weeks per block (4-5 training weeks + 1 deload).
    - **Advanced:** 5-6 weeks per block (4-5 training weeks + 1 deload).
12. **Program duration → block count:**
    - 4 weeks: 1 block
    - 8 weeks: 2 blocks (e.g., 4+4 or 3+1 deload + 3+1 deload)
    - 12 weeks: 2-3 blocks
    - 16 weeks: 3 blocks
    - 6 months (~26 weeks): 4-5 blocks
    - 1 year (~52 weeks): 8-10 blocks, organized into 2-3 mesocycles with distinct training phases
13. **Mesocycle structure for programs 6+ months:** Group blocks into mesocycles (e.g., 3 blocks per mesocycle). Each mesocycle shifts emphasis — e.g., Mesocycle 1: Hypertrophy (8-12 reps), Mesocycle 2: Strength-Hypertrophy (6-10 reps), Mesocycle 3: Metabolic/Intensity (10-15 reps + advanced techniques). Describe the full mesocycle plan, then detail exercises for the first mesocycle's blocks.

### Recovery and Progression

14. **Deload frequency by experience:**
    - **Beginner:** Deloads generally not needed for programs under 12 weeks. For longer programs, deload every 6-8 weeks.
    - **Intermediate:** Deload every 5-6 training weeks. Every block longer than 4 weeks must include a deload week.
    - **Advanced:** Do not go more than 6 consecutive training weeks without a deload. Every block longer than 4 weeks must include a deload week.
15. **Deload structure** — deload weeks reduce total sets by ~40-50% while maintaining movement patterns. Rep ranges increase by 2-3 reps per set. The app does not track weight — do not reference load reductions.
16. **Plateau management** — for programs longer than 8 weeks, include guidance for when the lifter stalls on a prescribed progression. Frame in terms of rep targets, not weight.

### Balance

17. **Pull movement balance** — vertical pulls (pulldowns, pull-ups) should make up at least one-third of total back volume.
18. **Complete block coverage** — the plan must explicitly cover every block (with the diff-based exception for 5+ block programs as described in the output format).

---

## REST TIME DEFAULTS

Use these when the profile says "Let AI choose" or doesn't specify a preference. If the profile specifies a rest preference, adjust accordingly:

- **Optimal Rest Times:** Use the defaults below as-is.
- **Shorter Rest Times:** Reduce by ~25% (e.g., compounds 90-135s, isolation 45-70s).
- **Minimal Rest Times:** Reduce by ~40% (e.g., compounds 75-110s, isolation 35-55s). Note in trade-offs that this limits strength/hypertrophy outcomes.

**Heavy compounds** = squat variations, deadlift variations, barbell bench press, barbell overhead press.
**Other compounds** = everything else with 2+ joints (rows, lunges, dumbbell presses, pull-ups, dips, leg press, etc.).

| Exercise Type | Default Rest (seconds) |
|---------------|----------------------|
| Heavy compounds | 150-180 |
| Other compounds | 120-150 |
| Isolation exercises | 60-90 |
| Superset exercises | SS[n]a: 60-90 (transition to second exercise); SS[n]b: full rest for its exercise type (compound or isolation) before repeating the pair |

These defaults are also needed for session duration estimation.

---

## VOLUME RULES

### Volume Targets by Training Approach (Natural Lifters)

Look up the user's Training Approach from their profile:

| Approach | Major Muscles (sets/week) | Medium Muscles (sets/week) |
|----------|--------------------------|---------------------------|
| Push Hard | 16-20 | 12-16 |
| Balanced | 12-16 | 10-14 |
| Conservative | 10-12 | 8-10 |

**Major** = Chest, Lats, Upper Back, Quads, Hamstrings, Glutes
**Medium** = Side Delts, Biceps, Triceps, Calves

Going above 20 sets/week for any muscle group has diminishing returns for natural lifters.

### Experience-Scaled Minimums

Look up the user's Training Experience from their profile. No non-exempt muscle should fall below these floors:

| Level | Major Muscles (min sets/week) | Medium Muscles (min sets/week) |
|-------|-------------------------------|-------------------------------|
| Beginner | 6-8 | 6 |
| Intermediate | 8-10 | 6-8 |
| Advanced | 10-12 | 8-10 |

### Priority Muscle Groups

If the profile specifies priority muscles, increase those toward 16-22 sets/week regardless of training approach. Reduce non-priority muscles toward their minimums to keep total stress recoverable. If no priority muscles are specified, distribute volume evenly across all muscle groups within the target range.

### Exempt Muscles (Can Show 0 Direct Sets)

Front Delts, Traps, Rear Delts, Forearms — these get sufficient indirect work from compounds. Core may be exempt for short programs (under 12 weeks) but should be included in longer programs.

**Recommendation for Push Hard programs with 5+ training days:** Add 3-6 sets of direct rear delt work (face pulls, reverse flyes) for balanced shoulder development — not required, but recommended when programming space allows.

### Bodyweight-Only Volume Adjustments

For bodyweight-only profiles, some muscle groups are inherently harder to isolate (Side Delts, Calves, Biceps, Hamstrings). In these cases:
- Volume minimums for hard-to-target muscles drop by 2 sets/week.
- Flag any muscle that can't be adequately trained as ℹ️ CONSTRAINED with an explanation.
- Alternative exercise requirements reduce to 1 per exercise (instead of 2) since the bodyweight exercise pool is limited.

### Status Indicators

- ✅ = within target range for the user's approach
- ⚠️ LOW = below the experience-scaled minimum — **must fix before presenting**
- ⚠️ HIGH = above 20 sets — diminishing returns unless it's a priority muscle
- ℹ️ CONSTRAINED = above minimum but below target due to split/schedule/equipment. Must explain in Recommendations.

### Quality Standards

- If any non-exempt muscle is below minimum, **revise the plan before presenting**.
- If the user's approach targets aren't met and a practical fix exists (add a superset, swap an exercise), **implement it** rather than flagging.
- A Push Hard program where most muscles sit at the floor of their target range is underdelivering — **aim for the upper half**.
- A Conservative program doesn't need to push every muscle to maximum — staying within range is sufficient.
- After verifying ranges, **check distribution balance** — avoid some muscles maxed out while others sit at the floor.

---

## GOAL-SPECIFIC GUIDANCE

Adapt the plan based on the user's Primary Goal from their profile.

### Build Muscle / Body Recomposition
Prioritize hypertrophy rep ranges (8-12 for compounds, 10-15 for isolation). Volume is the primary driver. Apply the full volume verification system above. For recomp, include cardio if the user selected it as a secondary goal.

### Burn Fat
Include higher-rep metabolic work and prioritize compound movements for caloric expenditure. Lifting volume can sit at the lower end of the user's approach range — the minimum targets still apply, but pushing to the upper end is less important than for muscle building. Cardio days (if present) are important for the goal. Consider shorter rest periods if the user didn't specify a preference.

### Gain Strength
Prioritize lower rep ranges (3-6 for main compounds, 6-10 for accessories). Longer rest periods (use heavy compound defaults for most exercises). Fewer exercises per session but more sets on primary lifts. Volume targets still apply but sets on main lifts count more heavily — 5 sets of squats at RPE 8-9 delivers more stimulus than the same volume split across 3 exercises. Periodize with progressively heavier blocks.

### Sport-Specific Training
The profile should include sport details. Design training around the movement patterns and physical demands of that sport. Lifting supports the sport — not the other way around. Volume targets apply to lifting days only — sport practice days don't count toward muscle volume. If the user has few lifting days (2-3), volume minimums may be hard to hit; use ℹ️ CONSTRAINED and explain.

### General Fitness
Balanced approach across strength, cardio, and mobility. Don't over-optimize for any single quality. Wider exercise variety is appropriate. Sessions can be shorter and more varied. Volume targets apply but use the lower end of the range — general fitness doesn't require hypertrophy-optimal volume. Circuit-type training counts toward muscle volume: each exercise in a circuit gets volume credit equal to the number of rounds (e.g., a 3-round circuit with 4 exercises = 3 sets per exercise for volume counting purposes). Prompt 3's volume verification should count circuit rounds as sets.

### Custom Goal
Read the user's custom description and design accordingly. If the custom goal maps closely to one of the above, use that framework. If it's genuinely unique, explain your interpretation and approach.
