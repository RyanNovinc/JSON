I'm using a fitness app called JSON.fit that supports multiple exercise types (strength, cardio, stretch, circuit, and sport). I need help designing a personalized workout program.

## INSTRUCTIONS

Review my profile and design a training plan. Show your reasoning — work through split selection, volume distribution, exercise choices, and trade-offs. Before presenting the summary, list every exercise per day with its set count and primary muscle tags, then total weekly volume per muscle group. If any muscle group is below target, revise and recount. Do not present the summary until all targets are met or flagged.

When done, end with a clean summary:

---
## Your Program Plan

**Split:** [split name] — [brief description]
**Sessions:** [estimated session lengths]
**Blocks:** [block structure and deload timing]

| Day | Session | Focus |
|-----|---------|-------|
| 1   | ...     | ...   |
| ... | ...     | ...   |

### Volume Targets
[Volume table — all muscle groups, sets/week, target ranges, status indicators as defined in Quality Check]

### Exercise Selections
For each training day, list every exercise with sets, primary/secondary muscles, and superset pairings. For programs with multiple exercise pools (rotations across blocks), list all pools.

### Secondary Goal Summary
If the profile includes secondary goals with dedicated training days, summarize how those days are structured: what activities, how they progress or rotate, and how they fit with the lifting days.

### Trade-offs (if any)
- [1-3 bullets noting meaningful compromises]

### Recommendation (if applicable)
If the plan has significant limitations, suggest one clear change. Keep it simple — no jargon. Example: "I'd recommend 5 lifting days + 1 cardio day instead of 4+1. This would solve the volume constraints and keep sessions shorter."

Do not suggest combining cardio with lifting sessions. Do not ask the user questions about the plan — they'll tell you what to change.

End with: "Let me know if you want any changes. When you're happy with the plan, you can use it with your JSON import prompt to generate the program files."
---

The profile represents preferences, not hard constraints. If the user's goals would be significantly better served by a different setup (e.g., more training days), recommend that. Respect their choices if confirmed, but don't silently accept a suboptimal setup.

Do NOT generate the full program. Only plan.

## MY PROFILE

**Primary Goal:** Muscle Building (gain lean mass and size)
**Secondary Goals:** Include Cardiovascular Training

**Training Schedule:**
- Total training days per week: 6
- Muscle Building days: 5
- Additional focus days (cardiovascular training): 1

**Training Experience:** Advanced (2+ years, excellent technique, slow progression)
**Training Approach:** Push Hard — target upper end of optimal volume ranges.

**Program Duration:** 1 year (long-term development plan)
**Preferred Cardio Activities:** Treadmill / Indoor Running, Stationary Bike / Cycling, Swimming, Stair Climber / StepMill

**Available Equipment:** Commercial Gym (full equipment access)
**Session Length:** Not specified — use 60-75 minutes as typical for hypertrophy with an advanced lifter.
**Heart Rate Monitor:** Not available
**Rest Time Preference:** Not specified — use evidence-based defaults.
**Exercise Note Detail:** Only non-obvious technique tips or specific setup instructions.

## MUSCLE TAXONOMY

Use ONLY these exact muscle names — no generic terms like "Shoulders", "Back", "Arms", or "Legs":

Chest, Front Delts, Side Delts, Rear Delts, Lats, Upper Back, Traps, Biceps, Triceps, Forearms, Quads, Hamstrings, Glutes, Calves, Core

Use "Core" instead of "Lower Back" for spinal stabilization or erector engagement.

### COMPOUND EXERCISE TAGGING GUIDE

Primary = main driver through full ROM. Secondary = assists but not the main driver.

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

## PLANNING RULES

1. **Only use available equipment** — do not include exercises the user can't perform with their listed equipment
2. **Stay within session duration** — each session must fit the stated time limit
3. **Rotate secondary goal activities** — if the user has preferred activities (cardio, mobility, sport, etc.), rotate through them. Every preferred activity should appear at least once.
4. **Rotate exercises between blocks** — change exercise variations while keeping movement patterns. Longer programs need more distinct exercise pools to prevent staleness.
5. **Plateau management** — for programs longer than 8 weeks, include guidance for when the lifter stalls on a prescribed progression.
6. **Deload structure** — if appropriate, include deload weeks with a clear approach (e.g., reduced sets, higher rep ranges). The app does not track weight.

## QUALITY CHECK

Before presenting the plan, verify volume per muscle group. Count only Primary muscle tags. Format as:

| Muscle Group | Sets/Week | Min | Target | Optimal | Status |
|---|---|---|---|---|---|
| Chest | 16 | 10 | 16-20 | 12-20 | ✅ |
| Calves | 18 | 8 | 16-22 | 12-22 (priority) | ✅ |

**Volume targets by training approach (natural lifters):**

| Approach | Major Muscles | Medium Muscles |
|----------|--------------|----------------|
| Push Hard | 16-20 sets/week | 12-16 sets/week |
| Balanced | 12-16 sets/week | 10-14 sets/week |
| Conservative | 10-12 sets/week | 8-10 sets/week |

Major = Chest, Lats, Upper Back, Quads, Hamstrings, Glutes
Medium = Side Delts, Biceps, Triceps, Calves

Going above 20 sets/week for any muscle group has diminishing returns for natural lifters.

**Priority muscle groups:** Increase toward 16-22 sets/week. Reduce non-priority muscles toward minimums to keep total stress recoverable.

**Exempt muscles (can show 0 direct sets):** Front Delts, Traps, Rear Delts, Forearms — these get sufficient indirect work from compounds. Core may be exempt for short programs but should be included in longer programs.

**Experience-scaled minimums:**

| Level | Major Muscles | Medium Muscles |
|-------|--------------|----------------|
| Beginner | 6-8 sets/week | 6 sets/week |
| Intermediate | 8-10 sets/week | 6-8 sets/week |
| Advanced | 10-12 sets/week | 8-10 sets/week |

**Status indicators:**
- ✅ = within target range
- ⚠️ LOW = below minimum — must fix before presenting
- ⚠️ HIGH = above 20 sets — diminishing returns unless priority muscle
- ℹ️ CONSTRAINED = above minimum but below target due to split/schedule. Must explain in Recommendations.

If any non-exempt muscle is below minimum, revise the plan before presenting. If Push Hard targets aren't met and a practical fix exists (add a superset, swap an exercise), implement it rather than flagging. A Push Hard program where most muscles sit at the floor of their target range is underdelivering — aim for the upper half.

After verifying ranges, check distribution balance — avoid some muscles maxed out while others sit at the floor.
