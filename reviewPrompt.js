export const REVIEW_PROMPT = `# Critical Training Plan Review

Do not search conversation history or reference previous chats. This prompt is self-contained — all context needed is provided below.

First, read the workout program you just created so you have the full content in context. Then review it as an experienced workout planning expert conducting an independent audit of this training plan for a client. This is an independent quality gate — do not assume your self-check caught everything.

## CRITICAL INSTRUCTIONS

1. **Review the plan** using the checklist below, noting PASS or FAIL for each check.
2. **If ANY check fails, FIX IT IMMEDIATELY** — do not ask the user for permission to fix. Silently revise the plan to resolve all failures.
3. **After fixing, re-verify** — run the checklist again on the corrected plan to confirm all checks now pass.
4. **Present the CORRECTED plan** — output the complete, clean, final version of the workout program with all fixes applied.
5. **At the end, provide a brief change log** — a short bullet list of what you changed and why.
6. **Duration Reality Check** — Calculate the total session duration for each training day using the rest periods in the plan. If any session exceeds reasonable limits, flag it to the user:
   - **Optimal sessions >90 minutes**: "⚠️ This program creates [X] minute sessions with optimal rest periods. Continue with these longer sessions, or would you prefer shorter sessions with reduced rest periods?"
   - **Moderate sessions >75 minutes**: "⚠️ This program exceeds your 75-minute target, reaching [X] minutes. Continue as-is, or shall I adjust for shorter sessions?"
   - **Minimal sessions >60 minutes**: "⚠️ This program exceeds your 60-minute target, reaching [X] minutes. Shall I reduce volume or exercises to fit your time constraints?"
   
   **Wait for user confirmation before proceeding to JSON generation.**

## QUALITY CHECKLIST

### Exercise Library Compliance Check

- **Library conformance**: Every exercise in the program must appear by exact name in the JSON.fit exercise library at https://json.fit/exercises.md. If any exercise name doesn't match, replace it with a library entry that fits the movement pattern.
- **Tag accuracy**: Every exercise's primary and secondary muscle tags must match the library entry exactly. If any tag differs, correct it to match the library.
- **Alternative exercises**: Alternatives must also be from the library.

### Effective Volume Distribution Check

Calculate effective weekly volume for each muscle by summing (sets × 1.0 for primary) + (sets × 0.5 for secondary) across all training days.

- **Target range per muscle group** (effective volume, including secondary contributions):
  - Major muscles (Chest, Lats, Upper Back, Quads, Hamstrings, Glutes): 12-18 effective sets/week
  - Medium muscles (Side Delts, Biceps, Triceps, Calves): 10-16 effective sets/week
  - Exempt muscles (Front Delts, Rear Delts, Traps, Forearms unless auxiliary): may show 0 direct but should have some secondary contribution
  - Auxiliary muscles (user-requested): 4-6 sets/week as specified in their profile
- **Flag excesses**: If a major muscle exceeds 20 effective sets or a medium muscle exceeds 18, reduce the lowest-priority isolation exercise for that muscle.
- **Flag shortfalls**: If a major muscle is below 10 effective sets or a medium muscle is below 8, add volume by increasing sets on existing exercises or adding an additional exercise.
- **Priority muscles override**: If user specified priority muscles, those targets shift up to 18-22 effective sets/week.
- **Distribution balance**: Avoid one muscle maxing out while another sits at the floor of its range without clear reason.

### Weekly Volume Math Verification

The JSON will include a \`weekly_volume_by_muscle\` field. Manually calculate effective volume for at least three major muscles (e.g., Chest, Lats, Quads) and compare to what you'll output in that field. If your math is off, correct the plan until both the plan and your calculated totals agree.

### Exercise Selection Audit  

- **Compound movements**: At least 60% of exercises should be multi-joint movements (adjust per user experience level — beginners may lean higher toward compounds, advanced may need more isolation for specific muscle development)
- **Movement patterns**: Balanced push/pull ratios, adequate hip hinge and squat patterns for leg training
- **Progression potential**: All exercises should allow clear weight/rep/set progression across the mesocycle
- **Set counts**: Don't exceed 5 sets of any single isolation exercise in one session

### Programming Logic Review

- **Weekly structure**: Logical distribution of training stress across the week; no two consecutive days hitting the same major muscle group heavily
- **Exercise order**: Compound before isolation, higher skill before lower skill
- **Rep ranges**: Appropriate for stated goals (hypertrophy: 6-12 for compounds, 10-15 for isolation; isolation arm exercises always 10-15 regardless of block focus)
- **Auxiliary placement**: If user selected auxiliary muscles, those exercises should appear as finishers at the end of sessions, not as dedicated sessions

### Practical Implementation Check

- **Equipment consistency**: All exercises use equipment stated as available in the user's profile
- **Time realistic**: Sessions fit within stated time constraints (optimal ≤90min, moderate ≤75min, minimal ≤60min)
- **Skill appropriate**: Exercise complexity matches stated experience level
- **Duration calculation**: Calculate total workout time including rest periods and flag if excessive

End with: "When you're happy with this plan, send me the JSON conversion prompt and I'll convert it for import into JSON.fit."
`;

export default REVIEW_PROMPT;
