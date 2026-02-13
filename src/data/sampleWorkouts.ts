import { WorkoutProgram } from '../types/workout';
import { muscleBuilderProProgram } from './muscleBuilderPro';
import { gluteAndToneProgram } from './gluteAndTone';

export const quickStartProgram: WorkoutProgram = {
  "id": "sample_quick_start_ppl",
  "routine_name": "Quick Start - Push Pull Legs",
  "description": "10-week beginner Push Pull Legs program with progressive overload",
  "days_per_week": 3,
  "blocks": [
    {
      "block_name": "Weeks 1-3: Foundation Building",
      "weeks": "1-3",
      "structure": "Push Pull Legs",
      "days": [
        {
          "day_name": "Push Day",
          "estimated_duration": 60,
          "exercises": [
            {
              "exercise": "Push Ups",
              "sets": 3,
              "reps": "8-12",
              "reps_weekly": {"1": "12", "2": "10", "3": "8"},
              "rest": 90,
              "restQuick": 60,
              "notes": "Start with knee variation if needed, progress to full push-ups",
              "alternatives": ["Incline Push Up", "Dumbbell Bench Press"]
            },
            {
              "exercise": "Dumbbell Shoulder Press",
              "sets": 3,
              "reps": "8-12",
              "reps_weekly": {"1": "12", "2": "10", "3": "8"},
              "rest": 120,
              "restQuick": 90,
              "notes": "Focus on controlled movement and full range of motion",
              "alternatives": ["Overhead Press", "Machine Shoulder Press"]
            },
            {
              "exercise": "Lateral Raises",
              "sets": 3,
              "reps": "10-15",
              "reps_weekly": {"1": "15", "2": "12", "3": "10"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Light weight, focus on form",
              "alternatives": ["Cable Lateral Raise", "Machine Lateral Raise"]
            },
            {
              "exercise": "Tricep Pushdowns",
              "sets": 3,
              "reps": "10-15",
              "reps_weekly": {"1": "15", "2": "12", "3": "10"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Keep elbows tucked, squeeze at bottom",
              "alternatives": ["Overhead Tricep Extension", "Tricep Dips"]
            },
            {
              "exercise": "Dumbbell Fly",
              "sets": 2,
              "reps": "12-15",
              "reps_weekly": {"1": "15", "2": "14", "3": "12"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Light weight, focus on chest stretch",
              "alternatives": ["Pec Deck", "Cable Fly"]
            }
          ]
        },
        {
          "day_name": "Pull Day",
          "estimated_duration": 60,
          "exercises": [
            {
              "exercise": "Lat Pulldown",
              "sets": 3,
              "reps": "8-12",
              "reps_weekly": {"1": "12", "2": "10", "3": "8"},
              "rest": 120,
              "restQuick": 90,
              "notes": "Pull to upper chest, squeeze shoulder blades",
              "alternatives": ["Assisted Pull Up", "Machine Row"]
            },
            {
              "exercise": "Dumbbell Row",
              "sets": 3,
              "reps": "8-12",
              "reps_weekly": {"1": "12", "2": "10", "3": "8"},
              "rest": 90,
              "restQuick": 60,
              "notes": "Support chest on bench, row to hip",
              "alternatives": ["Barbell Row", "Cable Row"]
            },
            {
              "exercise": "Face Pull",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {"1": "15", "2": "14", "3": "12"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Pull to face level, squeeze rear delts",
              "alternatives": ["Rear Delt Fly", "Cable Rear Delt Fly"]
            },
            {
              "exercise": "Dumbbell Curls",
              "sets": 3,
              "reps": "10-15",
              "reps_weekly": {"1": "15", "2": "12", "3": "10"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Control the negative, avoid swinging",
              "alternatives": ["Barbell Curl", "Hammer Curl"]
            },
            {
              "exercise": "Hammer Curls",
              "sets": 2,
              "reps": "12-15",
              "reps_weekly": {"1": "15", "2": "14", "3": "12"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Neutral grip, target brachialis",
              "alternatives": ["Rope Hammer Curl", "Preacher Curl"]
            }
          ]
        },
        {
          "day_name": "Leg Day",
          "estimated_duration": 65,
          "exercises": [
            {
              "exercise": "Goblet Squat",
              "sets": 3,
              "reps": "10-15",
              "reps_weekly": {"1": "15", "2": "12", "3": "10"},
              "rest": 120,
              "restQuick": 90,
              "notes": "Hold dumbbell at chest, squat to parallel",
              "alternatives": ["Leg Press", "Dumbbell Squat"]
            },
            {
              "exercise": "Romanian Deadlift",
              "sets": 3,
              "reps": "8-12",
              "reps_weekly": {"1": "12", "2": "10", "3": "8"},
              "rest": 120,
              "restQuick": 90,
              "notes": "Hinge at hips, feel hamstring stretch",
              "alternatives": ["Dumbbell Romanian Deadlift", "Good Morning"]
            },
            {
              "exercise": "Walking Lunge",
              "sets": 3,
              "reps": "20-24",
              "reps_weekly": {"1": "24", "2": "22", "3": "20"},
              "rest": 90,
              "restQuick": 60,
              "notes": "10-12 per leg, control the descent",
              "alternatives": ["Reverse Lunge", "Leg Press"]
            },
            {
              "exercise": "Leg Curls",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {"1": "15", "2": "14", "3": "12"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Control both up and down phases",
              "alternatives": ["Lying Leg Curl", "Nordic Curl"]
            },
            {
              "exercise": "Standing Calf Raises",
              "sets": 4,
              "reps": "15-20",
              "reps_weekly": {"1": "15", "2": "18", "3": "20"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Full range of motion, pause at top",
              "alternatives": ["Seated Calf Raise", "Dumbbell Calf Raise"]
            }
          ]
        }
      ]
    },
    {
      "block_name": "Weeks 4-6: Strength Building",
      "weeks": "4-6",
      "structure": "Push Pull Legs",
      "days": [
        {
          "day_name": "Push Day",
          "estimated_duration": 65,
          "exercises": [
            {
              "exercise": "Dumbbell Bench Press",
              "sets": 4,
              "reps": "6-10",
              "reps_weekly": {"4": "10", "5": "8", "6": "6"},
              "rest": 150,
              "restQuick": 120,
              "notes": "Progress to heavier weights, focus on form",
              "alternatives": ["Push Up", "Machine Chest Press"]
            },
            {
              "exercise": "Dumbbell Shoulder Press",
              "sets": 4,
              "reps": "6-10",
              "reps_weekly": {"4": "10", "5": "8", "6": "6"},
              "rest": 120,
              "restQuick": 90,
              "notes": "Seated or standing, keep core tight",
              "alternatives": ["Overhead Press", "Machine Shoulder Press"]
            },
            {
              "exercise": "Incline Dumbbell Press",
              "sets": 3,
              "reps": "8-12",
              "reps_weekly": {"4": "12", "5": "10", "6": "8"},
              "rest": 120,
              "restQuick": 90,
              "notes": "45-degree angle, squeeze at top",
              "alternatives": ["Incline Push Up", "Incline Machine Press"]
            },
            {
              "exercise": "Lateral Raises",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {"4": "15", "5": "12", "6": "12"},
              "rest": 60,
              "restQuick": 45,
              "alternatives": ["Cable Lateral Raise", "Machine Lateral Raise"]
            },
            {
              "exercise": "Tricep Pushdowns",
              "sets": 3,
              "reps": "10-15",
              "reps_weekly": {"4": "15", "5": "12", "6": "10"},
              "rest": 60,
              "restQuick": 45,
              "alternatives": ["Overhead Tricep Extension", "Tricep Dips"]
            },
            {
              "exercise": "Overhead Tricep Extension",
              "sets": 2,
              "reps": "12-15",
              "reps_weekly": {"4": "15", "5": "12", "6": "12"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Feel the stretch at the bottom",
              "alternatives": ["Tricep Pushdown", "French Press"]
            }
          ]
        },
        {
          "day_name": "Pull Day",
          "estimated_duration": 65,
          "exercises": [
            {
              "exercise": "Lat Pulldown",
              "sets": 4,
              "reps": "6-10",
              "reps_weekly": {"4": "10", "5": "8", "6": "6"},
              "rest": 150,
              "restQuick": 120,
              "notes": "Progress to heavier weight",
              "alternatives": ["Assisted Pull Up", "Machine Row"]
            },
            {
              "exercise": "Barbell Row",
              "sets": 4,
              "reps": "6-10",
              "reps_weekly": {"4": "10", "5": "8", "6": "6"},
              "rest": 120,
              "restQuick": 90,
              "notes": "Hip hinge, row to lower chest",
              "alternatives": ["Dumbbell Row", "Cable Row"]
            },
            {
              "exercise": "Cable Row",
              "sets": 3,
              "reps": "8-12",
              "reps_weekly": {"4": "12", "5": "10", "6": "8"},
              "rest": 90,
              "restQuick": 60,
              "notes": "Squeeze shoulder blades together",
              "alternatives": ["Machine Row", "Inverted Row"]
            },
            {
              "exercise": "Face Pull",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {"4": "20", "5": "18", "6": "15"},
              "rest": 60,
              "restQuick": 45,
              "alternatives": ["Rear Delt Fly", "Cable Rear Delt Fly"]
            },
            {
              "exercise": "Barbell Curls",
              "sets": 3,
              "reps": "8-12",
              "reps_weekly": {"4": "12", "5": "10", "6": "8"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Strict form, no cheating",
              "alternatives": ["Dumbbell Curl", "Cable Curl"]
            },
            {
              "exercise": "Hammer Curls",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {"4": "15", "5": "12", "6": "12"},
              "rest": 60,
              "restQuick": 45,
              "alternatives": ["Rope Hammer Curl", "Preacher Curl"]
            }
          ]
        },
        {
          "day_name": "Leg Day",
          "estimated_duration": 70,
          "exercises": [
            {
              "exercise": "Barbell Back Squat",
              "sets": 4,
              "reps": "6-10",
              "reps_weekly": {"4": "10", "5": "8", "6": "6"},
              "rest": 180,
              "restQuick": 150,
              "notes": "Progress from goblet squats, focus on depth",
              "alternatives": ["Leg Press", "Goblet Squat"]
            },
            {
              "exercise": "Romanian Deadlift",
              "sets": 4,
              "reps": "6-10",
              "reps_weekly": {"4": "10", "5": "8", "6": "6"},
              "rest": 150,
              "restQuick": 120,
              "notes": "Increase weight, maintain form",
              "alternatives": ["Dumbbell Romanian Deadlift", "Good Morning"]
            },
            {
              "exercise": "Bulgarian Split Squat",
              "sets": 3,
              "reps": "16-20",
              "reps_weekly": {"4": "20", "5": "18", "6": "16"},
              "rest": 90,
              "restQuick": 60,
              "notes": "8-10 per leg, rear foot elevated",
              "alternatives": ["Walking Lunge", "Reverse Lunge"]
            },
            {
              "exercise": "Leg Curls",
              "sets": 3,
              "reps": "10-15",
              "reps_weekly": {"4": "15", "5": "12", "6": "10"},
              "rest": 60,
              "restQuick": 45,
              "alternatives": ["Lying Leg Curl", "Nordic Curl"]
            },
            {
              "exercise": "Leg Extension",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {"4": "15", "5": "12", "6": "12"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Squeeze quads at top",
              "alternatives": ["Goblet Squat", "Leg Press"]
            },
            {
              "exercise": "Standing Calf Raises",
              "sets": 4,
              "reps": "15-20",
              "reps_weekly": {"4": "20", "5": "18", "6": "15"},
              "rest": 60,
              "restQuick": 45,
              "alternatives": ["Seated Calf Raise", "Dumbbell Calf Raise"]
            }
          ]
        }
      ]
    },
    {
      "block_name": "Weeks 7-10: Advanced Development",
      "weeks": "7-10",
      "structure": "Push Pull Legs",
      "days": [
        {
          "day_name": "Push Day",
          "estimated_duration": 70,
          "exercises": [
            {
              "exercise": "Barbell Bench Press",
              "sets": 4,
              "reps": "5-8",
              "reps_weekly": {"7": "8", "8": "6", "9": "5", "10": "8"},
              "rest": 180,
              "restQuick": 150,
              "notes": "Progress to barbell, focus on strength",
              "alternatives": ["Dumbbell Bench Press", "Machine Chest Press"]
            },
            {
              "exercise": "Overhead Press",
              "sets": 4,
              "reps": "5-8",
              "reps_weekly": {"7": "8", "8": "6", "9": "5", "10": "8"},
              "rest": 180,
              "restQuick": 150,
              "notes": "Standing barbell press",
              "alternatives": ["Dumbbell Shoulder Press", "Machine Shoulder Press"]
            },
            {
              "exercise": "Incline Dumbbell Press",
              "sets": 3,
              "reps": "8-12",
              "reps_weekly": {"7": "12", "8": "10", "9": "8", "10": "10"},
              "rest": 120,
              "restQuick": 90,
              "alternatives": ["Incline Machine Press", "Incline Push Up"]
            },
            {
              "exercise": "Dips",
              "sets": 3,
              "reps": "8-12",
              "reps_weekly": {"7": "12", "8": "10", "9": "8", "10": "10"},
              "rest": 90,
              "restQuick": 60,
              "notes": "Use assistance if needed",
              "alternatives": ["Tricep Dips", "Close Grip Push Up"]
            },
            {
              "exercise": "Lateral Raises",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {"7": "15", "8": "12", "9": "12", "10": "15"},
              "rest": 60,
              "restQuick": 45,
              "alternatives": ["Cable Lateral Raise", "Machine Lateral Raise"]
            },
            {
              "exercise": "Close Grip Bench Press",
              "sets": 3,
              "reps": "8-12",
              "reps_weekly": {"7": "12", "8": "10", "9": "8", "10": "10"},
              "rest": 90,
              "restQuick": 60,
              "notes": "Hands shoulder-width apart",
              "alternatives": ["Tricep Pushdown", "Overhead Tricep Extension"]
            }
          ]
        },
        {
          "day_name": "Pull Day",
          "estimated_duration": 70,
          "exercises": [
            {
              "exercise": "Pull Ups",
              "sets": 4,
              "reps": "5-8",
              "reps_weekly": {"7": "8", "8": "6", "9": "5", "10": "8"},
              "rest": 180,
              "restQuick": 150,
              "notes": "Progress from lat pulldowns, use assistance if needed",
              "alternatives": ["Lat Pulldown", "Assisted Pull Up"]
            },
            {
              "exercise": "Barbell Row",
              "sets": 4,
              "reps": "5-8",
              "reps_weekly": {"7": "8", "8": "6", "9": "5", "10": "8"},
              "rest": 180,
              "restQuick": 150,
              "notes": "Heavier weight, maintain form",
              "alternatives": ["Dumbbell Row", "Cable Row"]
            },
            {
              "exercise": "T-Bar Row",
              "sets": 3,
              "reps": "8-12",
              "reps_weekly": {"7": "12", "8": "10", "9": "8", "10": "10"},
              "rest": 120,
              "restQuick": 90,
              "notes": "Chest supported if available",
              "alternatives": ["Cable Row", "Machine Row"]
            },
            {
              "exercise": "Lat Pulldown",
              "sets": 3,
              "reps": "10-15",
              "reps_weekly": {"7": "15", "8": "12", "9": "10", "10": "12"},
              "rest": 90,
              "restQuick": 60,
              "notes": "Wide grip variation",
              "alternatives": ["Machine Row", "Cable Row"]
            },
            {
              "exercise": "Face Pull",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {"7": "20", "8": "18", "9": "15", "10": "18"},
              "rest": 60,
              "restQuick": 45,
              "alternatives": ["Rear Delt Fly", "Cable Rear Delt Fly"]
            },
            {
              "exercise": "Barbell Curls",
              "sets": 3,
              "reps": "8-12",
              "reps_weekly": {"7": "12", "8": "10", "9": "8", "10": "10"},
              "rest": 60,
              "restQuick": 45,
              "alternatives": ["Dumbbell Curl", "Cable Curl"]
            },
            {
              "exercise": "Preacher Curls",
              "sets": 3,
              "reps": "10-15",
              "reps_weekly": {"7": "15", "8": "12", "9": "10", "10": "12"},
              "rest": 60,
              "restQuick": 45,
              "notes": "Focus on the stretch",
              "alternatives": ["Hammer Curl", "Cable Curl"]
            }
          ]
        },
        {
          "day_name": "Leg Day",
          "estimated_duration": 75,
          "exercises": [
            {
              "exercise": "Barbell Back Squat",
              "sets": 4,
              "reps": "5-8",
              "reps_weekly": {"7": "8", "8": "6", "9": "5", "10": "8"},
              "rest": 210,
              "restQuick": 180,
              "notes": "Heavy squats, focus on progression",
              "alternatives": ["Leg Press", "Front Squat"]
            },
            {
              "exercise": "Romanian Deadlift",
              "sets": 4,
              "reps": "5-8",
              "reps_weekly": {"7": "8", "8": "6", "9": "5", "10": "8"},
              "rest": 180,
              "restQuick": 150,
              "notes": "Heavy weight, perfect form",
              "alternatives": ["Dumbbell Romanian Deadlift", "Good Morning"]
            },
            {
              "exercise": "Front Squat",
              "sets": 3,
              "reps": "8-12",
              "reps_weekly": {"7": "12", "8": "10", "9": "8", "10": "10"},
              "rest": 150,
              "restQuick": 120,
              "notes": "Focus on upper back and core",
              "alternatives": ["Goblet Squat", "Leg Press"]
            },
            {
              "exercise": "Walking Lunge",
              "sets": 3,
              "reps": "20-24",
              "reps_weekly": {"7": "24", "8": "22", "9": "20", "10": "22"},
              "rest": 90,
              "restQuick": 60,
              "notes": "10-12 per leg with weights",
              "alternatives": ["Bulgarian Split Squat", "Reverse Lunge"]
            },
            {
              "exercise": "Leg Curls",
              "sets": 3,
              "reps": "10-15",
              "reps_weekly": {"7": "15", "8": "12", "9": "10", "10": "12"},
              "rest": 60,
              "restQuick": 45,
              "alternatives": ["Lying Leg Curl", "Nordic Curl"]
            },
            {
              "exercise": "Leg Extension",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {"7": "15", "8": "12", "9": "12", "10": "15"},
              "rest": 60,
              "restQuick": 45,
              "alternatives": ["Goblet Squat", "Leg Press"]
            },
            {
              "exercise": "Standing Calf Raises",
              "sets": 4,
              "reps": "15-20",
              "reps_weekly": {"7": "20", "8": "18", "9": "15", "10": "18"},
              "rest": 60,
              "restQuick": 45,
              "alternatives": ["Seated Calf Raise", "Dumbbell Calf Raise"]
            }
          ]
        }
      ]
    }
  ]
};

// Export all sample workout programs
export { muscleBuilderProProgram, gluteAndToneProgram };

// The complete 52-week Muscle Builder Pro program is now in muscleBuilderPro.ts