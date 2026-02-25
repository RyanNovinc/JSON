# Review Block

First, read the JSON file you just created so you have the full content in context. Then review it as an experienced coach auditing a program for a client. This is an independent quality gate — do not assume your self-check caught everything.

## Review Checklist

Work through each check. For each, state PASS or FAIL with a brief note.

### 1. Plan Fidelity
Compare the JSON against the training plan above:
- Every exercise listed in the plan for this block appears in the JSON
- Set counts match the plan
- Muscle tags (primaryMuscles, secondaryMuscles) match the plan
- Day structure and exercise order match the plan
- For diff-based blocks (5+ block programs), verify that all carried-over exercises from the base block are present — not just the swapped ones
- No exercises were added, removed, or renamed
- If the plan includes cardio or secondary goal days, the cardio entry matches the plan's Secondary Goal Summary (activities, rotation order, duration)
- **FAIL if** any exercise is missing, added, or has wrong sets/muscles, or cardio day doesn't match the plan

### 2. Rep Progression Logic
For each exercise, check reps_weekly across all weeks:
- Reps change meaningfully across weeks (not "10, 10, 10" every week for every exercise)
- **Compound exercises should trend flat-to-decreasing** over the block (linear/intensity progression)
- **Isolation exercises should trend flat-to-increasing** over the block (ascending density)
- Compound rep ranges match the block's stated focus (e.g., a "Strength: 5-8 reps" block shouldn't have compound exercises at 12-15). Isolation exercises can run 2-4 reps higher than the block's stated range.
- **FAIL if** more than half the exercises have identical reps every week (flat progression)
- **FAIL if** compounds trend upward or isolations trend downward (wrong direction)
- **FAIL if** compound rep ranges don't match the block's focus

### 3. Deload Weeks
If the block includes a deload week:
- sets_weekly for the deload week is ~40-50% lower than training weeks
- Reps in the deload week are 2-3 higher per set than training weeks
- ALL exercises have reduced volume on the deload week, not just some
- **FAIL if** deload volume reduction is less than 30% or greater than 60%
- **FAIL if** any exercise has unchanged volume on the deload week

### 4. Superset Integrity
- Superset exercises are adjacent in the exercises array
- Both exercises reference each other by exact name in their notes: "Superset with [name]"
- The first superset exercise (SS[n]a) has shorter rest (60-90s); the second (SS[n]b) has full rest for its exercise type
- **FAIL if** superset exercises are separated, cross-references are missing/mismatched, or rest encoding is wrong

### 5. Exercise Name Consistency
- Each exercise uses the exact same name string everywhere: in the exercise field, in superset notes, and across days if it appears more than once
- **FAIL if** any name varies (e.g., "Cable Overhead Extension" vs "Overhead Cable Extension")

### 6. Rest Periods
- Heavy compounds (squat, deadlift, barbell bench, barbell OHP): 150-180s rest
- Other compounds (rows, lunges, dumbbell presses, pull-ups, dips, leg press): 120-150s rest
- Isolation exercises: 60-90s rest
- restQuick ≈ 65% of rest (±5s tolerance)
- If the plan specifies shorter or minimal rest, verify adjustments are consistent
- **FAIL if** any heavy compound has rest <150s, any other compound has rest <120s, or any isolation has rest >90s (unless plan specifies non-default rest)

### 7. Muscle Tags
- All primaryMuscles and secondaryMuscles use exact taxonomy names: Chest, Front Delts, Side Delts, Rear Delts, Lats, Upper Back, Traps, Biceps, Triceps, Forearms, Quads, Hamstrings, Glutes, Calves, Core
- No exercise has an empty primaryMuscles array
- Tags follow the compound tagging guide (e.g., rows = Primary Upper Back, Lats | Secondary Biceps, Rear Delts)
- **FAIL if** any non-taxonomy name appears or primaryMuscles is empty

### 8. Schema Compliance
- Weekly keys are block-relative (start from "1")
- deload_weeks array is present and correct if the block has deloads; omitted entirely (not an empty array) if no deloads
- secondaryMuscles is `[]` (not omitted) when empty
- All required fields are present for each exercise type
- reps_weekly values are comma-separated per-set targets, not shorthand
- sets_weekly is present for every week in the block; training weeks match the `sets` field; deload weeks show reduced values
- No warm-up sets included
- **FAIL if** any schema violation

### 9. Volume Verification
Cross-reference the volume summary output after the block against the plan's Volume Targets table:
- Count total primary-tagged sets per muscle group across all days (use training week set counts, not deload)
- Compare against the volume targets from the plan
- **FAIL if** any non-exempt muscle group is below its stated minimum

### 10. Alternatives Check
- Every strength exercise has 2 alternatives (or 1 for bodyweight-only programs)
- Each alternative includes primaryMuscles and secondaryMuscles (secondaryMuscles can be `[]`)
- Alternatives target the same primary muscles as the main exercise
- **FAIL if** alternatives are missing, incomplete, or target different primary muscles

### 11. Duration Reasonableness
Check that estimated_duration values are reasonable:
- Days with more exercises/sets should have proportionally longer durations
- No training day should exceed 90 minutes (or 95 for Push Hard programs with heavy compound days) or fall below 30 minutes unless the plan explicitly specifies otherwise
- Cardio days should roughly match the prescribed activity duration + 10 min for warmup/cooldown
- **FAIL if** any day's duration seems unreasonable given its exercise count and set total (e.g., 8 exercises at 4 sets each with compound rest shouldn't show 45 minutes)

## Output

If ALL checks pass:

> ✅ Reviewed — all checks passed. [One sentence summary of what was verified.]

If ANY check fails:
1. List each failure with the check name, what's wrong, and what the fix is
2. Output a corrected JSON file
3. Say what changed

Then say: "Say **next** to generate the next block. After each block, say **review** to verify it before moving on."

---

**Remember this review process.** After each future block in this conversation, when the user says "review", run this same checklist. No need to paste these instructions again.
