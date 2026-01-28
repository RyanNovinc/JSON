# Quick Reference for JSON Workout Generation

## Copy-Paste Prompt Template

```
Generate a workout program in JSON format following this exact schema:

REQUIRED FIELDS:
- routine_name (string): Program name
- description (string): Brief program description  
- days_per_week (number): Training frequency
- blocks[].block_name (string): Phase name
- blocks[].weeks (string): Week range (e.g., "1-4")
- blocks[].structure (string): Training split type
- blocks[].days[].day_name (string): Workout name
- blocks[].days[].exercises[].exercise (string): Exercise name
- blocks[].days[].exercises[].sets (number): Number of sets
- blocks[].days[].exercises[].reps (string): Rep scheme
- blocks[].days[].exercises[].rest (number): Rest in seconds

CRITICAL: Always include the "structure" field - this shows users the training split type.

Common structure values:
- "Push Pull Legs"
- "Upper Lower" 
- "Full Body"
- "Bro Split"
- "Push Pull Legs + Arms"

Output valid JSON only, no formatting or explanations.
```

## Training Split Quick Reference

| Split Type | Days/Week | Structure Value |
|------------|-----------|----------------|
| Push Pull Legs | 3-6 | "Push Pull Legs" |
| Upper/Lower | 4-5 | "Upper Lower" |
| Full Body | 3-4 | "Full Body" |
| Body Part Split | 5-6 | "Bro Split" |
| PPL + Arms | 4-5 | "Push Pull Legs + Arms" |
| Powerlifting | 3-4 | "Powerlifting" |
| Conjugate | 4 | "Conjugate Method" |

## Essential Schema Snippet

```json
{
  "routine_name": "",
  "description": "", 
  "days_per_week": 0,
  "blocks": [
    {
      "block_name": "",
      "weeks": "",
      "structure": "REQUIRED - Training Split Type",
      "days": [
        {
          "day_name": "",
          "exercises": [
            {
              "exercise": "",
              "sets": 0,
              "reps": "",
              "rest": 0,
              "alternatives": []
            }
          ]
        }
      ]
    }
  ]
}
```

## Rest Time Guidelines
- Heavy compounds: 180-240s
- Light compounds: 120-150s  
- Isolation: 60-90s
- Power work: 240-300s

## Rep Scheme Examples
- Strength: "3-5", "5-8"
- Hypertrophy: "8-12", "10-15"
- Endurance: "15-20", "20+"
- Progressive: "Week 1: 12-15, Week 2: 10-12, Week 3: 8-10, Week 4: 6-8"