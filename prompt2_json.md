# Generate Workout Program as JSON

You are given a training plan above. Generate the complete program as JSON files matching the schema below. Build directly to JSON — do not create markdown, documents, or any intermediate format.

## Output Instructions

**JSON only** — do not reproduce the program in chat or create any text version. Only output JSON file(s).

**Write JSON to a file** — do not output it to chat.
1. Create a file and write the complete JSON
2. When finished, provide the download link

**Multi-block programs:**
Generate one block at a time. After each block:
1. Provide the download link for that block's JSON file
2. Say: "Ready to import. Say **next** when you want the next block."

Each block should be a complete, standalone JSON file with routine_name, description, days_per_week, and a single block in the blocks array. Keep routine_name and description consistent across all files.

## Exercise Detail

For each exercise in the plan, you must design:
- **Sets and reps per week** across the block (reps_weekly, sets_weekly). Do not include weight/load guidance — the app doesn't track weight.
- **Rest periods** — evidence-based defaults (compounds: 120-180 sec, isolation: 60-90 sec)
- **2 alternative exercises** — each with their own primary/secondary muscles from the taxonomy
- **Superset pairings** — if the plan specifies supersets, note them in both exercises
- **Notes** — only non-obvious technique tips or specific setup instructions
- **Deload weeks** — express through reduced sets (sets_weekly) and/or higher rep ranges. Do not reference weight.

## JSON Schema

```json
{
  "routine_name": "string",
  "description": "string",
  "days_per_week": number,
  "blocks": [
    {
      "block_name": "string",
      "weeks": "string (e.g. '1-4')",
      "structure": "string (e.g. 'Push Pull Legs Upper Lower')",
      "deload_weeks": [number] (optional — e.g. [4]),
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
```

### Strength Exercise
```json
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
  "notes": "string (optional)",
  "alternatives": [
    { "exercise": "string", "primaryMuscles": [...], "secondaryMuscles": [...] }
  ]
}
```

### Cardio Exercise
```json
{
  "type": "cardio",
  "activity": "string",
  "duration_minutes": number,
  "target_intensity": "string (optional)",
  "cardio_mode": "string (optional)",
  "progression_weekly": { "1": "string", "2": "string", ... },
  "notes": "string (optional)"
}
```

### Stretch Exercise
```json
{
  "type": "stretch",
  "exercise": "string",
  "hold_seconds": number,
  "sets": number,
  "per_side": boolean,
  "primaryMuscles": ["from taxonomy"],
  "notes": "string (optional)"
}
```

### Circuit Exercise
```json
{
  "type": "circuit",
  "circuit_name": "string",
  "rounds": number,
  "work_seconds": number,
  "rest_seconds": number,
  "exercises": [{ "exercise": "string", "notes": "string (optional)" }],
  "notes": "string (optional)"
}
```

### Sport Exercise
```json
{
  "type": "sport",
  "activity": "string",
  "duration_minutes": number (optional),
  "notes": "string (optional)"
}
```

## Muscle Taxonomy (use EXACTLY these names)
Chest, Front Delts, Side Delts, Rear Delts, Lats, Upper Back, Traps, Biceps, Triceps, Forearms, Quads, Hamstrings, Glutes, Calves, Core

## Translation Rules

1. **Follow the plan** — use the exercise names, sets, muscles, and structure from the plan. Design rep progressions, rest periods, alternatives, and notes.
2. **Block-relative keys** — weekly progression keys always start from "1" within each block. Block B (weeks 7-12) uses "1", "2", "3"... not "7", "8", "9".
3. **Deload tagging** — if a block has deload weeks, add a deload_weeks array with the block-relative week numbers (e.g. [6] for a 6-week block).
4. **Supersets** — place superset exercises adjacent in the exercises array. Include "Superset with [exercise name]" in both exercises' notes.
5. **Cardio rotation** — if cardio activities change week to week, use a single cardio entry with progression_weekly describing each week.
6. **restQuick** — calculate as ~65% of the rest value, rounded to a clean number.
7. **Empty arrays** — if an exercise has no secondary muscles, use []. Do not omit the field.
