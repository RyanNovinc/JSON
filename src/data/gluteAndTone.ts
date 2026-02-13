import { WorkoutProgram } from '../types/workout';

export const gluteAndToneProgram: WorkoutProgram = {
  "id": "sample_glute_tone_12w",
  "routine_name": "12-Week Glute & Tone",
  "description": "12-week program focused on glute development, toning, and feminine strength training",
  "days_per_week": 4,
  "blocks": [
    {
      "block_name": "Weeks 1-4: Foundation & Activation",
      "weeks": "1-4",
      "structure": "Lower/Upper/Lower/Upper",
      "days": [
        {
          "day_name": "Lower Body - Glute Focus",
          "estimated_duration": 50,
          "exercises": [
            {
              "exercise": "Glute Bridge",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {"1": "20", "2": "18", "3": "15", "4": "15"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Focus on squeezing glutes at the top, pause for 2 seconds",
              "alternatives": ["Single Leg Glute Bridge", "Hip Thrust"]
            },
            {
              "exercise": "Goblet Squat",
              "sets": 3,
              "reps": "12-18",
              "reps_weekly": {"1": "18", "2": "15", "3": "12", "4": "12"},
              "rest": 90,
              "restQuick": 60,
              "notes": "Light weight, focus on proper form, sit back into hips",
              "alternatives": ["Dumbbell Squat", "Box Squat"]
            },
            {
              "exercise": "Reverse Lunge",
              "sets": 3,
              "reps": "20-24",
              "reps_weekly": {"1": "24", "2": "22", "3": "20", "4": "20"},
              "rest": 60,
              "restQuick": 45,
              "notes": "10-12 per leg, focus on control",
              "alternatives": ["Lunge", "Dumbbell Lunge"]
            },
            {
              "exercise": "Clamshell",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {"1": "20", "2": "18", "3": "15", "4": "15"},
              "rest": 45,
              "restQuick": 30,
              "notes": "15-20 per side, focus on glute med activation",
              "alternatives": ["Hip Abduction Machine", "Cable Hip Abduction"]
            },
            {
              "exercise": "Pause Squat",
              "sets": 3,
              "reps": "8-12",
              "reps_weekly": {"1": "12", "2": "10", "3": "8", "4": "8"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Pause at bottom for 3 seconds, focus on control",
              "alternatives": ["Box Squat", "Goblet Squat"]
            },
            {
              "exercise": "Standing Calf Raises",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {"1": "15", "2": "18", "3": "20", "4": "20"},
              "rest": 45,
              "restQuick": 30,
              "notes": "Full range of motion, pause at top",
              "alternatives": ["Single Leg Calf Raise", "Seated Calf Raise"]
            }
          ]
        },
        {
          "day_name": "Upper Body - Tone & Sculpt",
          "estimated_duration": 45,
          "exercises": [
            {
              "exercise": "Push Ups",
              "sets": 3,
              "reps": "8-15",
              "reps_weekly": {"1": "15", "2": "12", "3": "10", "4": "8"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Modify on knees if needed, focus on chest and triceps",
              "alternatives": ["Incline Push Ups", "Dumbbell Bench Press"]
            },
            {
              "exercise": "Dumbbell Shoulder Press",
              "sets": 3,
              "reps": "10-15",
              "reps_weekly": {"1": "15", "2": "12", "3": "10", "4": "10"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Light to moderate weight, focus on control",
              "alternatives": ["Arnold Press", "Machine Shoulder Press"]
            },
            {
              "exercise": "Dumbbell Row",
              "sets": 3,
              "reps": "10-15",
              "reps_weekly": {"1": "15", "2": "12", "3": "10", "4": "10"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Squeeze shoulder blades together",
              "alternatives": ["Cable Row", "Inverted Row"]
            },
            {
              "exercise": "Tricep Dips",
              "sets": 3,
              "reps": "8-12",
              "reps_weekly": {"1": "12", "2": "10", "3": "8", "4": "8"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Use chair or bench, modify with bent knees",
              "alternatives": ["Close Grip Push Up", "Overhead Tricep Extension"]
            },
            {
              "exercise": "Lateral Raises",
              "sets": 3,
              "reps": "12-18",
              "reps_weekly": {"1": "18", "2": "15", "3": "12", "4": "12"},
              "rest": 45,
              "restQuick": 30,
              "notes": "Light weight, focus on shoulder definition",
              "alternatives": ["Cable Lateral Raises", "Front Raise"]
            },
            {
              "exercise": "Plank",
              "sets": 3,
              "reps": "20-45 sec",
              "reps_weekly": {"1": "20s", "2": "30s", "3": "40s", "4": "45s"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Hold for time, keep straight line from head to heels",
              "alternatives": ["Side Plank", "Dead Bug"]
            }
          ]
        }
      ]
    },
    {
      "block_name": "Weeks 5-8: Strength & Shaping",
      "weeks": "5-8",
      "structure": "Lower/Upper/Lower/Upper",
      "days": [
        {
          "day_name": "Lower Body - Glute Builder",
          "estimated_duration": 55,
          "exercises": [
            {
              "exercise": "Hip Thrust",
              "sets": 4,
              "reps": "12-18",
              "reps_weekly": {"5": "18", "6": "15", "7": "12", "8": "12"},
              "rest": 90,
              "restQuick": 60,
              "notes": "Use barbell or dumbbell, pause at top",
              "alternatives": ["Glute Bridge", "Single Leg Hip Thrust"]
            },
            {
              "exercise": "Goblet Squat",
              "sets": 4,
              "reps": "10-15",
              "reps_weekly": {"5": "15", "6": "12", "7": "10", "8": "10"},
              "rest": 90,
              "restQuick": 60,
              "notes": "Hold dumbbell at chest, focus on depth",
              "alternatives": ["Dumbbell Squat", "Box Squat"]
            },
            {
              "exercise": "Romanian Deadlift",
              "sets": 4,
              "reps": "10-15",
              "reps_weekly": {"5": "15", "6": "12", "7": "10", "8": "10"},
              "rest": 90,
              "restQuick": 60,
              "notes": "Feel the stretch in hamstrings and glutes",
              "alternatives": ["Single Leg Romanian Deadlift", "Stiff Leg Deadlift"]
            },
            {
              "exercise": "Bulgarian Split Squat",
              "sets": 3,
              "reps": "20-24",
              "reps_weekly": {"5": "24", "6": "22", "7": "20", "8": "20"},
              "rest": 60,
              "restQuick": 45,
              "notes": "10-12 per leg, rear foot elevated",
              "alternatives": ["Reverse Lunge", "Dumbbell Step Up"]
            },
            {
              "exercise": "Lateral Lunge",
              "sets": 3,
              "reps": "16-20",
              "reps_weekly": {"5": "20", "6": "18", "7": "16", "8": "16"},
              "rest": 60,
              "restQuick": 45,
              "notes": "8-10 per side, focus on glute med",
              "alternatives": ["Curtsy Lunge", "Dumbbell Lunge"]
            },
            {
              "exercise": "Single Leg Glute Bridge",
              "sets": 3,
              "reps": "20-24",
              "reps_weekly": {"5": "24", "6": "22", "7": "20", "8": "20"},
              "rest": 60,
              "restQuick": 45,
              "notes": "10-12 per leg, squeeze at top",
              "alternatives": ["Glute Bridge", "Hip Thrust"]
            }
          ]
        },
        {
          "day_name": "Upper Body - Sculpt & Define",
          "estimated_duration": 50,
          "exercises": [
            {
              "exercise": "Dumbbell Bench Press",
              "sets": 4,
              "reps": "8-12",
              "reps_weekly": {"5": "12", "6": "10", "7": "8", "8": "8"},
              "rest": 90,
              "restQuick": 60,
              "notes": "Focus on controlled movement",
              "alternatives": ["Push Up", "Incline Dumbbell Press"]
            },
            {
              "exercise": "Lat Pulldown",
              "sets": 4,
              "reps": "10-15",
              "reps_weekly": {"5": "15", "6": "12", "7": "10", "8": "10"},
              "rest": 90,
              "restQuick": 60,
              "notes": "Pull to upper chest, squeeze shoulder blades",
              "alternatives": ["Assisted Pull Up", "Dumbbell Row"]
            },
            {
              "exercise": "Dumbbell Shoulder Press",
              "sets": 3,
              "reps": "10-15",
              "reps_weekly": {"5": "15", "6": "12", "7": "10", "8": "10"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Seated or standing, control the weight",
              "alternatives": ["Arnold Press", "Machine Shoulder Press"]
            },
            {
              "exercise": "Dumbbell Row",
              "sets": 3,
              "reps": "10-15",
              "reps_weekly": {"5": "15", "6": "12", "7": "10", "8": "10"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Single arm or bent over, squeeze back",
              "alternatives": ["Cable Row", "Machine Row"]
            },
            {
              "exercise": "Overhead Tricep Extension",
              "sets": 3,
              "reps": "12-18",
              "reps_weekly": {"5": "18", "6": "15", "7": "12", "8": "12"},
              "rest": 45,
              "restQuick": 30,
              "notes": "Focus on tricep isolation",
              "alternatives": ["Tricep Dips", "Close Grip Push Up"]
            },
            {
              "exercise": "Bicycle Crunch",
              "sets": 3,
              "reps": "20-30",
              "reps_weekly": {"5": "20", "6": "25", "7": "30", "8": "30"},
              "rest": 45,
              "restQuick": 30,
              "notes": "Focus on controlled movement, not speed",
              "alternatives": ["Russian Twist", "Mountain Climber"]
            }
          ]
        }
      ]
    },
    {
      "block_name": "Weeks 9-12: Power & Definition",
      "weeks": "9-12",
      "structure": "Lower/Upper/Lower/Upper",
      "days": [
        {
          "day_name": "Lower Body - Glute Power",
          "estimated_duration": 60,
          "exercises": [
            {
              "exercise": "Hip Thrust",
              "sets": 4,
              "reps": "8-12",
              "reps_weekly": {"9": "12", "10": "10", "11": "8", "12": "8"},
              "rest": 120,
              "restQuick": 90,
              "notes": "Heavy weight, pause at top for 2 seconds",
              "alternatives": ["Dumbbell Hip Thrust", "Single Leg Hip Thrust"]
            },
            {
              "exercise": "Goblet Squat",
              "sets": 4,
              "reps": "8-12",
              "reps_weekly": {"9": "12", "10": "10", "11": "8", "12": "8"},
              "rest": 120,
              "restQuick": 90,
              "notes": "Wide stance, toes pointed out, target inner thighs",
              "alternatives": ["Dumbbell Squat", "Box Squat"]
            },
            {
              "exercise": "Single Leg Romanian Deadlift",
              "sets": 4,
              "reps": "16-20",
              "reps_weekly": {"9": "20", "10": "18", "11": "16", "12": "16"},
              "rest": 90,
              "restQuick": 60,
              "notes": "8-10 per leg, focus on balance and hamstring stretch",
              "alternatives": ["Romanian Deadlift", "Good Morning"]
            },
            {
              "exercise": "Walking Lunge",
              "sets": 3,
              "reps": "20-24",
              "reps_weekly": {"9": "24", "10": "22", "11": "20", "12": "20"},
              "rest": 60,
              "restQuick": 45,
              "notes": "10-12 per leg, add dumbbells for resistance",
              "alternatives": ["Reverse Lunge", "Dumbbell Step Up"]
            },
            {
              "exercise": "Curtsy Lunge",
              "sets": 3,
              "reps": "20-24",
              "reps_weekly": {"9": "24", "10": "22", "11": "20", "12": "20"},
              "rest": 60,
              "restQuick": 45,
              "notes": "10-12 per leg, target glute med and outer thigh",
              "alternatives": ["Lateral Lunge", "Dumbbell Lunge"]
            },
            {
              "exercise": "Goblet Squat",
              "sets": 3,
              "reps": "10-15",
              "reps_weekly": {"9": "15", "10": "12", "11": "10", "12": "10"},
              "rest": 90,
              "restQuick": 60,
              "notes": "Explosive movement on the way up, control down",
              "alternatives": ["Dumbbell Squat", "Box Squat"]
            }
          ]
        },
        {
          "day_name": "Upper Body - Total Tone",
          "estimated_duration": 55,
          "exercises": [
            {
              "exercise": "Push Ups",
              "sets": 3,
              "reps": "10-16",
              "reps_weekly": {"9": "16", "10": "14", "11": "12", "12": "10"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Focus on controlled movement and full range",
              "alternatives": ["Incline Push Ups", "Dumbbell Bench Press"]
            },
            {
              "exercise": "Assisted Pull Up",
              "sets": 4,
              "reps": "5-10",
              "reps_weekly": {"9": "10", "10": "8", "11": "6", "12": "5"},
              "rest": 120,
              "restQuick": 90,
              "notes": "Progress towards unassisted, focus on back engagement",
              "alternatives": ["Lat Pulldown", "Inverted Row"]
            },
            {
              "exercise": "Arnold Press",
              "sets": 3,
              "reps": "10-15",
              "reps_weekly": {"9": "15", "10": "12", "11": "10", "12": "10"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Rotate dumbbells as you press up",
              "alternatives": ["Dumbbell Shoulder Press", "Military Press"]
            },
            {
              "exercise": "Dumbbell Row",
              "sets": 3,
              "reps": "12-20",
              "reps_weekly": {"9": "20", "10": "16", "11": "14", "12": "12"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Single arm, focus on squeezing back",
              "alternatives": ["Cable Row", "Barbell Row"]
            },
            {
              "exercise": "Diamond Push Up",
              "sets": 3,
              "reps": "5-12",
              "reps_weekly": {"9": "12", "10": "10", "11": "8", "12": "5"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Hands form diamond shape, target triceps",
              "alternatives": ["Close Grip Push Up", "Overhead Tricep Extension"]
            },
            {
              "exercise": "Russian Twist",
              "sets": 3,
              "reps": "20-30",
              "reps_weekly": {"9": "20", "10": "25", "11": "30", "12": "30"},
              "rest": 45,
              "restQuick": 30,
              "notes": "Add weight for resistance, focus on core rotation",
              "alternatives": ["Bicycle Crunch", "Cable Woodchop"]
            }
          ]
        }
      ]
    }
  ]
};