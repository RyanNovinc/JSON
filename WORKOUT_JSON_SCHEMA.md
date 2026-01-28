# Workout JSON Schema Documentation

## Overview
This document outlines the JSON schema for workout programs in the fitness app, including all required and optional fields.

## Complete JSON Structure

```json
{
  "routine_name": "Program Name",
  "description": "Brief description of the program",
  "days_per_week": 6,
  "blocks": [
    {
      "block_name": "Phase Name",
      "weeks": "1-4",
      "structure": "Training Split Type",
      "days": [
        {
          "day_name": "Workout Day Name",
          "estimated_duration": 45,
          "exercises": [
            {
              "exercise": "Exercise Name",
              "sets": 4,
              "reps": "8-10",
              "rest": 180,
              "restQuick": 90,
              "alternatives": ["Alternative Exercise 1", "Alternative Exercise 2"],
              "notes": "Exercise-specific notes",
              "previous": {
                "weight": 100,
                "reps": 8
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## Field Descriptions

### Root Level
- **routine_name** (string, required): The name of the workout program
- **description** (string, required): Brief description of the program's purpose
- **days_per_week** (number, required): How many days per week the program runs
- **blocks** (array, required): Array of training blocks/phases

### Block Level
- **block_name** (string, required): Name of the training phase (e.g., "Foundation Phase", "Intensification")
- **weeks** (string, required): Week range for this block (e.g., "1-4", "5-8", "9")
- **structure** (string, required): Training split type - this appears on the blocks screen
- **days** (array, required): Array of workout days in this block

### Day Level
- **day_name** (string, required): Name of the workout day (e.g., "Push Day A", "Pull Day B")
- **estimated_duration** (number, optional): Estimated workout time in minutes
- **exercises** (array, required): Array of exercises for this day

### Exercise Level
- **exercise** (string, required): Primary exercise name
- **sets** (number, required): Number of sets
- **reps** (string, required): Rep range or progression scheme
- **rest** (number, required): Rest time between sets in seconds
- **restQuick** (number, optional): Quick rest option in seconds (typically 60% of normal rest)
- **alternatives** (array, optional): Alternative exercises that can be substituted
- **notes** (string, optional): Exercise-specific notes or form cues
- **previous** (object, optional): Previous performance data for progression tracking
  - **weight** (number): Last weight used
  - **reps** (number): Last reps completed

## Training Structure Examples

The `structure` field should describe the training split clearly:

### Common Training Splits
- **"Push Pull Legs"** - Classic 3-way split
- **"Upper Lower"** - 2-way split
- **"Full Body"** - Whole body each session
- **"Push Pull Legs + Arms"** - PPL with dedicated arm day
- **"Bro Split"** - Body part specific days
- **"Upper/Lower Power"** - Power-focused upper/lower
- **"Conjugate Method"** - Max effort and dynamic effort days
- **"Block Periodization"** - Volume/Intensity/Peaking blocks

### Specialized Programs
- **"5/3/1 Boring But Big"**
- **"Starting Strength"**
- **"Westside for Skinny Bastards"**
- **"German Volume Training"**
- **"Smolov Squat Program"**

## Rep Scheme Formats

### Simple Range
```json
"reps": "8-10"
```

### Weekly Progression
```json
"reps": "Week 1: 12-15, Week 2: 10-12, Week 3: 8-10, Week 4: 6-8"
```

### Pyramid Sets
```json
"reps": "12, 10, 8, 6"
```

### Percentage-Based
```json
"reps": "5 @ 85%, 3 @ 90%, 1 @ 95%"
```

## Rest Time Guidelines
- **Compound movements**: 120-180 seconds
- **Isolation exercises**: 60-90 seconds
- **Power/strength work**: 180-300 seconds
- **High-intensity sets**: 180+ seconds
- **Light/pump work**: 30-60 seconds

## Exercise Features

### Drop Sets
The app supports drop sets with:
- Smart weight/rep suggestions (20% weight reduction, +2 reps)
- Individual completion tracking
- Volume calculation inclusion
- History preservation

### Supersets
Exercises can be linked as supersets with:
- 3-second transition timer between linked exercises
- Visual indicators in the UI
- Normal rest after completing the superset

### Exercise Alternatives
Provide 2-3 alternative exercises for equipment substitutions:
```json
"alternatives": ["Dumbbell Bench Press", "Machine Chest Press", "Push-ups"]
```

## Best Practices

1. **Descriptive naming**: Use clear, specific exercise and day names
2. **Logical progression**: Ensure rep schemes and intensities progress appropriately
3. **Realistic timing**: Set achievable rest periods and workout durations
4. **Complete alternatives**: Always provide equipment alternatives
5. **Clear structure**: Use descriptive training split names that users understand immediately
6. **Consistent formatting**: Follow the schema exactly for proper app functionality

## Example Programs

### Push Pull Legs (Hypertrophy)
```json
{
  "routine_name": "Hypertrophy Push Pull Legs",
  "description": "6-day muscle building program with progressive overload",
  "days_per_week": 6,
  "blocks": [
    {
      "block_name": "Foundation Phase",
      "weeks": "1-4",
      "structure": "Push Pull Legs",
      "days": [...]
    }
  ]
}
```

### Upper Lower Strength
```json
{
  "block_name": "Strength Block",
  "weeks": "1-3",
  "structure": "Upper Lower",
  "days": [...]
}
```