# AI Workout Generation Prompts

## System Prompt for Workout Program Generation

```
You are an expert fitness program designer. Generate workout programs in JSON format following the exact schema provided. 

CRITICAL REQUIREMENTS:
1. Always include the "structure" field for each block - this describes the training split (e.g., "Push Pull Legs", "Upper Lower")
2. Use realistic rest times (120-180s for compounds, 60-90s for isolation)
3. Provide 2-3 alternative exercises for each movement
4. Use progressive rep schemes across weeks
5. Include estimated workout durations
6. Follow proper exercise order (compounds first, isolation last)

SCHEMA COMPLIANCE:
- Every exercise needs: exercise, sets, reps, rest, alternatives
- Every day needs: day_name, exercises array
- Every block needs: block_name, weeks, structure, days array
- Root needs: routine_name, description, days_per_week, blocks array

OUTPUT: Valid JSON only, no explanations or markdown formatting.
```

## Specific Program Generation Prompts

### Push Pull Legs Program
```
Generate a 12-week Push Pull Legs hypertrophy program with 3 blocks:
- Foundation (Weeks 1-4): Higher reps, moderate intensity
- Intensification (Weeks 5-8): Moderate reps, higher intensity  
- Specialization (Weeks 9-12): Mixed rep ranges, peak intensity

Structure: "Push Pull Legs"
Include: Progressive overload, exercise alternatives, realistic rest times
Format: Complete JSON following the workout schema
```

### Upper Lower Strength
```
Create an 8-week Upper/Lower strength program with 2 blocks:
- Volume Phase (Weeks 1-4): Higher volume, moderate intensity
- Intensity Phase (Weeks 5-8): Lower volume, higher intensity

Structure: "Upper Lower"
Focus: Compound movements, strength progression, powerlifting accessories
Format: Complete JSON following the workout schema
```

### Full Body Beginner
```
Design a 6-week full body program for beginners with 2 blocks:
- Learning Phase (Weeks 1-3): Focus on form and consistency
- Progression Phase (Weeks 4-6): Increased intensity and volume

Structure: "Full Body"
Include: Basic compound movements, clear progression, beginner-friendly alternatives
Format: Complete JSON following the workout schema
```

## Advanced Program Examples

### Conjugate Method
```
Structure: "Conjugate Method"
Description: Max effort and dynamic effort training days
Blocks: ME Upper, DE Upper, ME Lower, DE Lower rotations
```

### Block Periodization
```
Structure: "Block Periodization"  
Description: Accumulation → Intensification → Realization phases
Focus: Specific adaptations in each block
```

### Powerlifting Peaking
```
Structure: "Powerlifting Peak"
Description: Competition preparation with openers, seconds, thirds
Include: Percentage-based loading, meet simulation
```

## Quality Control Checklist

Before finalizing any generated program, verify:

### JSON Structure
- [ ] Valid JSON syntax
- [ ] All required fields present
- [ ] Proper nesting and array structures
- [ ] Consistent field naming

### Training Logic
- [ ] Appropriate exercise order (compounds → isolation)
- [ ] Realistic rest periods for exercise types
- [ ] Progressive overload across weeks
- [ ] Balanced volume across muscle groups
- [ ] Logical training split structure

### User Experience
- [ ] Clear, descriptive exercise names
- [ ] Useful exercise alternatives provided
- [ ] Realistic workout durations
- [ ] Helpful exercise notes where needed
- [ ] Training structure clearly identified

### App Integration
- [ ] Compatible with drop set feature
- [ ] Works with superset linking
- [ ] Supports exercise switching
- [ ] Enables history tracking
- [ ] Calendar integration ready

## Common Training Structures by Goal

### Muscle Building
- "Push Pull Legs" (3-6 days)
- "Upper Lower" (4-5 days)  
- "Bro Split" (5-6 days)
- "Push Pull Legs + Arms" (4-5 days)

### Strength Building  
- "Upper Lower" (4 days)
- "Conjugate Method" (4 days)
- "5/3/1 Variation" (3-4 days)
- "Linear Progression" (3 days)

### Athletic Performance
- "Upper/Lower Power" (4-6 days)
- "Full Body" (3-4 days)
- "Sport Specific" (varies)

### General Fitness
- "Full Body" (3 days)
- "Upper Lower" (4 days)
- "Push Pull Legs" (3-6 days)

## Template Variables

When generating programs, consider these variables:
- **Experience Level**: Beginner, Intermediate, Advanced
- **Training Days**: 3, 4, 5, or 6 days per week
- **Primary Goal**: Strength, Hypertrophy, Power, Endurance
- **Equipment**: Full gym, Home gym, Minimal equipment
- **Time Constraints**: 30, 45, 60, 90+ minutes per session

## Sample Generation Request

```
Generate a 16-week intermediate powerlifting program:
- Experience: 2+ years training
- Goal: Increase 1RM in squat, bench, deadlift  
- Schedule: 4 days per week
- Equipment: Full commercial gym
- Time: 90 minutes per session
- Structure: Include competition simulation in final block
```

Expected output: Complete JSON with proper structure field, progression scheme, and accessory work selection.