# AI Workout Program Generator Instructions

**Copy and paste this entire message into Claude or ChatGPT along with your program request**

---

## Instructions

Create a workout program in JSON format for my fitness app.

## How to Output (IMPORTANT)

**DO NOT output JSON directly to chat** - it will hit token limits for long programs.

Instead:
1. **Write to a file** - Use Code Interpreter (ChatGPT) or create an Artifact (Claude)
2. **Start the file** with the JSON header (routine_name, description, days_per_week, blocks array)
3. **Keep appending** complete blocks to the same file until the full program is done
4. **Never stop mid-block** - always finish a complete block before pausing
5. **When complete**, provide the download link

This allows you to generate full 52-week programs (5000+ lines) in a single file.

**The file should contain ONLY valid JSON, no explanations or markdown**

### Required JSON Schema:
```json
{
  "routine_name": "Program Name",
  "description": "Brief program description",
  "days_per_week": 6,
  "blocks": [
    {
      "block_name": "Phase Name",
      "weeks": "1-4",
      "structure": "Push Pull Legs",
      "days": [
        {
          "day_name": "Workout Name",
          "estimated_duration": 45,
          "exercises": [
            {
              "exercise": "Exercise Name",
              "sets": 4,
              "reps": "8-10",
              "rest": 180,
              "restQuick": 90,
              "alternatives": ["Alt Exercise 1", "Alt Exercise 2"],
              "notes": "Form cues or tips"
            }
          ]
        }
      ]
    }
  ]
}
```

### Key Requirements:
- **rest**: Time in seconds (180 = 3 minutes)
- **restQuick**: 60% of normal rest in seconds  
- **estimated_duration**: Workout time in minutes
- **structure**: Training split type (REQUIRED - shows on blocks screen)
- **alternatives**: 2-3 alternative exercises for equipment substitutions
- **reps**: Can be ranges ("8-10") or progressions ("Week 1: 12-15, Week 2: 10-12")

### Training Structures:
- "Push Pull Legs" (3-6 days)
- "Upper Lower" (4-5 days)
- "Full Body" (3-4 days)
- "Bro Split" (5-6 days)
- "Push Pull Legs + Arms" (4-5 days)
- "Powerlifting" (3-4 days)
- "Conjugate Method" (4 days)

### Exercise Database (Use these exact names):

**CHEST:**
Barbell Bench Press, Incline Barbell Press, Decline Barbell Press, Dumbbell Bench Press, Incline Dumbbell Press, Decline Dumbbell Press, Dumbbell Flye, Incline Dumbbell Flye, Cable Flye, Incline Cable Flye, Pec Deck, Chest Dips, Push-ups, Incline Push-ups, Decline Push-ups, Diamond Push-ups, Wide Grip Push-ups, Machine Chest Press, Incline Machine Press, Hammer Strength Chest Press, Cable Crossover, Low Cable Crossover, High Cable Crossover

**BACK:**
Pull-ups, Chin-ups, Wide Grip Pull-ups, Neutral Grip Pull-ups, Lat Pulldown, Wide Grip Lat Pulldown, Neutral Grip Lat Pulldown, Barbell Row, Bent Over Barbell Row, Pendlay Row, T-Bar Row, Dumbbell Row, Single Arm Dumbbell Row, Chest Supported Row, Cable Row, Seated Cable Row, Cable Lat Pulldown, Face Pulls, Reverse Flye, Shrugs, Barbell Shrugs, Dumbbell Shrugs, Cable Shrugs, Deadlift, Romanian Deadlift, Stiff Leg Deadlift, Sumo Deadlift, Rack Pulls, Hyperextensions, Good Mornings, Cable Pull Through

**SHOULDERS:**
Overhead Press, Military Press, Behind Neck Press, Dumbbell Shoulder Press, Seated Dumbbell Press, Arnold Press, Lateral Raise, Dumbbell Lateral Raise, Cable Lateral Raise, Front Raise, Dumbbell Front Raise, Cable Front Raise, Rear Delt Flye, Reverse Pec Deck, Cable Reverse Flye, Upright Row, Barbell Upright Row, Dumbbell Upright Row, Cable Upright Row, Pike Push-ups, Handstand Push-ups, Machine Shoulder Press

**ARMS - BICEPS:**
Barbell Curl, EZ Bar Curl, Dumbbell Curl, Hammer Curl, Concentration Curl, Preacher Curl, Cable Curl, Cable Hammer Curl, 21s, Incline Dumbbell Curl, Spider Curl, Drag Curl, Reverse Curl, Cable Reverse Curl, Machine Curl

**ARMS - TRICEPS:**
Close Grip Bench Press, Tricep Dips, Overhead Tricep Extension, Dumbbell Tricep Extension, Cable Tricep Extension, Rope Pushdown, Cable Pushdown, V-Bar Pushdown, Reverse Grip Pushdown, Skull Crushers, French Press, Kickbacks, Diamond Push-ups, JM Press, Board Press

**LEGS - QUADRICEPS:**
Squat, Back Squat, Front Squat, Goblet Squat, Bulgarian Split Squat, Leg Press, Hack Squat, Leg Extension, Walking Lunges, Reverse Lunges, Lateral Lunges, Step-ups, Box Step-ups, Wall Sit, Pistol Squat, Jump Squat, Cossack Squat

**LEGS - HAMSTRINGS:**
Romanian Deadlift, Stiff Leg Deadlift, Good Mornings, Leg Curl, Lying Leg Curl, Seated Leg Curl, Standing Leg Curl, Nordic Curl, Glute Ham Raise, Single Leg RDL

**LEGS - GLUTES:**
Hip Thrust, Barbell Hip Thrust, Dumbbell Hip Thrust, Single Leg Hip Thrust, Glute Bridge, Single Leg Glute Bridge, Bulgarian Split Squat, Reverse Lunge, Lateral Lunge, Clamshells, Side Lying Hip Abduction, Monster Walk, Crab Walk, Fire Hydrant

**LEGS - CALVES:**
Calf Raise, Standing Calf Raise, Seated Calf Raise, Dumbbell Calf Raise, Machine Calf Raise, Single Leg Calf Raise, Donkey Calf Raise, Calf Press on Leg Press

**CORE:**
Plank, Side Plank, Dead Bug, Bird Dog, Mountain Climbers, Russian Twist, Bicycle Crunch, Crunch, Sit-ups, Leg Raise, Hanging Leg Raise, Knee Raise, V-ups, Flutter Kicks, Scissor Kicks, Hollow Hold, Ab Wheel, Cable Crunch, Wood Chop, Pallof Press, Bear Crawl

**CARDIO:**
Treadmill, Elliptical, Stationary Bike, Rowing Machine, Stair Climber, Jump Rope, Burpees, High Knees, Butt Kicks, Jumping Jacks, Sprint Intervals, Hill Sprints, Bike Sprints, Swimming

**OLYMPIC/POWER:**
Clean and Press, Clean and Jerk, Snatch, Power Clean, Hang Clean, Push Press, Push Jerk, Thruster, Kettlebell Swing, Kettlebell Clean, Kettlebell Snatch, Medicine Ball Slam, Box Jump, Broad Jump, Vertical Jump

**FUNCTIONAL:**
Farmer's Walk, Suitcase Carry, Turkish Get-up, Bear Crawl, Crab Walk, Duck Walk, Burpees, Mountain Climbers, Battle Ropes, Tire Flips, Sledgehammer Swings, Atlas Stone Lift, Yoke Walk

**STRETCHING/MOBILITY:**
Cat Cow, Child's Pose, Downward Dog, Pigeon Pose, Hip Flexor Stretch, Hamstring Stretch, Quad Stretch, Calf Stretch, Chest Stretch, Shoulder Stretch, Tricep Stretch, Lat Stretch, IT Band Stretch, Foam Rolling

**ISOMETRIC:**
Plank, Side Plank, Wall Sit, Hollow Hold, L-Sit, Front Lever, Back Lever, Human Flag, Handstand Hold

### Rest Time Guidelines:
- Heavy compounds: 180-240 seconds
- Light compounds: 120-150 seconds
- Isolation exercises: 60-90 seconds
- Power/explosive: 240-300 seconds

### Example Program Request:
"Create me a 52-week hypertrophy program for bulking from 82kg to 90kg, 5 days per week"

**Remember: Write to a downloadable file, never output JSON directly to chat!**

---

**Now add your specific program request below:**