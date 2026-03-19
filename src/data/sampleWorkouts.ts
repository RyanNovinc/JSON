import { WorkoutProgram } from '../types/workout';
import { muscleBuilderProProgram } from './muscleBuilderPro';
import { gluteAndToneProgram } from './gluteAndTone';

export const foundationBuilderProgram: WorkoutProgram = {
  "id": "17727999117880.yd7ak19i9k",
  "routine_name": "Foundation Builder",
  "description": "12-week full body general fitness program for beginners. Three days per week using antagonist supersets to maximise volume within 45-minute sessions. Block 1 builds movement quality and a base of fitness across 10–15 rep ranges.",
  "days_per_week": 7,
  "blocks": [
    {
      "block_name": "Block 1: Foundation (Part 1)",
      "weeks": "1-6",
      "structure": "Full Body Rest Full Body Rest Full Body Rest Rest",
      "days": [
        {
          "day_name": "Full Body A",
          "estimated_duration": 44,
          "exercises": [
            {
              "type": "strength",
              "exercise": "Barbell Back Squat",
              "sets": 3,
              "reps": "10",
              "rest": 75,
              "restQuick": 49,
              "primaryMuscles": ["Quads", "Glutes"],
              "secondaryMuscles": ["Core"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "11, 10, 10",
                "3": "11, 11, 10",
                "4": "12, 11, 11",
                "5": "12, 12, 11",
                "6": "12, 12, 12"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Leg Curl Machine. Brace core hard before descending, knees track toes, hit parallel or below.",
              "alternatives": [
                {"exercise": "Goblet Squat", "primaryMuscles": ["Quads", "Glutes"], "secondaryMuscles": ["Core"]},
                {"exercise": "Leg Press Machine", "primaryMuscles": ["Quads"], "secondaryMuscles": ["Glutes"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Leg Curl Machine",
              "sets": 3,
              "reps": "10",
              "rest": 120,
              "restQuick": 78,
              "primaryMuscles": ["Hamstrings"],
              "secondaryMuscles": ["Glutes"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "10, 10, 10",
                "3": "11, 10, 10",
                "4": "11, 11, 10",
                "5": "12, 11, 11",
                "6": "12, 12, 12"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Barbell Back Squat. Full extension before curling, slow 2–3 second negative.",
              "alternatives": [
                {"exercise": "Dumbbell Romanian Deadlift", "primaryMuscles": ["Hamstrings", "Glutes"], "secondaryMuscles": ["Core"]},
                {"exercise": "Nordic Curl", "primaryMuscles": ["Hamstrings"], "secondaryMuscles": []}
              ]
            },
            {
              "type": "strength",
              "exercise": "Lat Pulldown",
              "sets": 3,
              "reps": "10",
              "rest": 75,
              "restQuick": 49,
              "primaryMuscles": ["Lats"],
              "secondaryMuscles": ["Biceps", "Upper Back"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "11, 10, 10",
                "3": "11, 11, 10",
                "4": "12, 11, 11",
                "5": "12, 12, 11",
                "6": "12, 12, 12"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Dumbbell Bench Press. Pull elbows down toward hips, slight lean back, full stretch at top.",
              "alternatives": [
                {"exercise": "Assisted Pull-Up Machine", "primaryMuscles": ["Lats"], "secondaryMuscles": ["Biceps", "Upper Back"]},
                {"exercise": "Cable Straight Arm Pulldown", "primaryMuscles": ["Lats"], "secondaryMuscles": ["Triceps", "Upper Back"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Dumbbell Bench Press",
              "sets": 3,
              "reps": "10",
              "rest": 120,
              "restQuick": 78,
              "primaryMuscles": ["Chest", "Triceps"],
              "secondaryMuscles": ["Front Delts"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "10, 10, 10",
                "3": "11, 10, 10",
                "4": "11, 11, 10",
                "5": "12, 11, 11",
                "6": "12, 12, 12"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Lat Pulldown. Elbows at 60–70° from torso, lower to chest level with control.",
              "alternatives": [
                {"exercise": "Barbell Bench Press", "primaryMuscles": ["Chest", "Triceps"], "secondaryMuscles": ["Front Delts"]},
                {"exercise": "Machine Chest Press", "primaryMuscles": ["Chest", "Triceps"], "secondaryMuscles": ["Front Delts"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Seated Cable Row",
              "sets": 3,
              "reps": "10",
              "rest": 75,
              "restQuick": 49,
              "primaryMuscles": ["Upper Back", "Lats"],
              "secondaryMuscles": ["Biceps", "Rear Delts"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "11, 10, 10",
                "3": "11, 11, 10",
                "4": "12, 11, 11",
                "5": "12, 12, 11",
                "6": "12, 12, 12"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Dumbbell Lateral Raise. Drive elbows behind torso, pause at full contraction.",
              "alternatives": [
                {"exercise": "Machine Row", "primaryMuscles": ["Upper Back", "Lats"], "secondaryMuscles": ["Biceps", "Rear Delts"]},
                {"exercise": "Dumbbell Row", "primaryMuscles": ["Upper Back", "Lats"], "secondaryMuscles": ["Biceps", "Rear Delts"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Dumbbell Lateral Raise",
              "sets": 3,
              "reps": "12",
              "rest": 120,
              "restQuick": 78,
              "primaryMuscles": ["Side Delts"],
              "secondaryMuscles": ["Traps"],
              "reps_weekly": {
                "1": "12, 12, 12",
                "2": "12, 12, 12",
                "3": "13, 12, 12",
                "4": "13, 13, 12",
                "5": "14, 13, 13",
                "6": "15, 15, 14"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Seated Cable Row. Lead with elbows, slight forward lean, stop at shoulder height.",
              "alternatives": [
                {"exercise": "Cable Lateral Raise", "primaryMuscles": ["Side Delts"], "secondaryMuscles": ["Traps"]},
                {"exercise": "Machine Lateral Raise", "primaryMuscles": ["Side Delts"], "secondaryMuscles": ["Traps"]}
              ]
            }
          ]
        },
        {
          "day_name": "REST DAY",
          "estimated_duration": 0,
          "exercises": []
        },
        {
          "day_name": "Full Body B",
          "estimated_duration": 44,
          "exercises": [
            {
              "type": "strength",
              "exercise": "Dumbbell Romanian Deadlift",
              "sets": 3,
              "reps": "10",
              "rest": 75,
              "restQuick": 49,
              "primaryMuscles": ["Hamstrings", "Glutes"],
              "secondaryMuscles": ["Core"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "11, 10, 10",
                "3": "11, 11, 10",
                "4": "12, 11, 11",
                "5": "12, 12, 11",
                "6": "12, 12, 12"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Goblet Squat. Push hips back, feel hamstring stretch, keep dumbbells close to body.",
              "alternatives": [
                {"exercise": "Barbell Romanian Deadlift", "primaryMuscles": ["Hamstrings", "Glutes"], "secondaryMuscles": ["Core"]},
                {"exercise": "Cable Pull-Through", "primaryMuscles": ["Hamstrings", "Glutes"], "secondaryMuscles": ["Core"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Goblet Squat",
              "sets": 3,
              "reps": "12",
              "rest": 120,
              "restQuick": 78,
              "primaryMuscles": ["Quads", "Glutes"],
              "secondaryMuscles": ["Core"],
              "reps_weekly": {
                "1": "12, 12, 12",
                "2": "12, 12, 12",
                "3": "13, 12, 12",
                "4": "13, 13, 12",
                "5": "14, 14, 13",
                "6": "15, 15, 14"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Dumbbell Romanian Deadlift. Hold dumbbell at chest, elbows inside knees, upright torso.",
              "alternatives": [
                {"exercise": "Leg Press Machine", "primaryMuscles": ["Quads"], "secondaryMuscles": ["Glutes"]},
                {"exercise": "Hack Squat Machine", "primaryMuscles": ["Quads"], "secondaryMuscles": ["Glutes"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Barbell Bench Press",
              "sets": 3,
              "reps": "10",
              "rest": 75,
              "restQuick": 49,
              "primaryMuscles": ["Chest", "Triceps"],
              "secondaryMuscles": ["Front Delts"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "11, 10, 10",
                "3": "11, 11, 10",
                "4": "12, 11, 10",
                "5": "12, 12, 11",
                "6": "12, 12, 12"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Dumbbell Row. Retract shoulder blades, lower bar to lower chest, elbows at 45–70° from body.",
              "alternatives": [
                {"exercise": "Dumbbell Bench Press", "primaryMuscles": ["Chest", "Triceps"], "secondaryMuscles": ["Front Delts"]},
                {"exercise": "Machine Chest Press", "primaryMuscles": ["Chest", "Triceps"], "secondaryMuscles": ["Front Delts"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Dumbbell Row",
              "sets": 3,
              "reps": "10",
              "rest": 120,
              "restQuick": 78,
              "primaryMuscles": ["Upper Back", "Lats"],
              "secondaryMuscles": ["Biceps", "Rear Delts"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "10, 10, 10",
                "3": "11, 10, 10",
                "4": "11, 11, 10",
                "5": "12, 11, 11",
                "6": "12, 12, 12"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Barbell Bench Press. Pull elbow toward hip, get full stretch at bottom, keep hips square.",
              "alternatives": [
                {"exercise": "Seated Cable Row", "primaryMuscles": ["Upper Back", "Lats"], "secondaryMuscles": ["Biceps", "Rear Delts"]},
                {"exercise": "Machine Row", "primaryMuscles": ["Upper Back", "Lats"], "secondaryMuscles": ["Biceps", "Rear Delts"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Tricep Pushdown",
              "sets": 3,
              "reps": "12",
              "rest": 75,
              "restQuick": 49,
              "primaryMuscles": ["Triceps"],
              "secondaryMuscles": [],
              "reps_weekly": {
                "1": "12, 12, 12",
                "2": "12, 12, 12",
                "3": "13, 12, 12",
                "4": "13, 13, 12",
                "5": "14, 14, 13",
                "6": "15, 15, 14"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Cable Bicep Curl. Elbows fixed at sides throughout, full extension at bottom.",
              "alternatives": [
                {"exercise": "Cable Overhead Tricep Extension", "primaryMuscles": ["Triceps"], "secondaryMuscles": []},
                {"exercise": "Machine Tricep Extension", "primaryMuscles": ["Triceps"], "secondaryMuscles": []}
              ]
            },
            {
              "type": "strength",
              "exercise": "Cable Bicep Curl",
              "sets": 3,
              "reps": "12",
              "rest": 120,
              "restQuick": 78,
              "primaryMuscles": ["Biceps"],
              "secondaryMuscles": ["Forearms"],
              "reps_weekly": {
                "1": "12, 12, 12",
                "2": "12, 12, 12",
                "3": "13, 12, 12",
                "4": "13, 13, 12",
                "5": "14, 14, 13",
                "6": "15, 15, 14"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Tricep Pushdown. Elbows fixed at sides, full extension at bottom before each rep.",
              "alternatives": [
                {"exercise": "Dumbbell Bicep Curl", "primaryMuscles": ["Biceps"], "secondaryMuscles": ["Forearms"]},
                {"exercise": "Machine Bicep Curl", "primaryMuscles": ["Biceps"], "secondaryMuscles": ["Forearms"]}
              ]
            }
          ]
        },
        {
          "day_name": "REST DAY",
          "estimated_duration": 0,
          "exercises": []
        },
        {
          "day_name": "Full Body C",
          "estimated_duration": 44,
          "exercises": [
            {
              "type": "strength",
              "exercise": "Leg Press Machine",
              "sets": 3,
              "reps": "12",
              "rest": 75,
              "restQuick": 49,
              "primaryMuscles": ["Quads"],
              "secondaryMuscles": ["Glutes"],
              "reps_weekly": {
                "1": "12, 12, 12",
                "2": "12, 12, 12",
                "3": "13, 12, 12",
                "4": "13, 13, 12",
                "5": "14, 14, 13",
                "6": "15, 15, 14"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Dumbbell Romanian Deadlift. Feet shoulder-width, full range of motion, do not lock out knees.",
              "alternatives": [
                {"exercise": "Hack Squat Machine", "primaryMuscles": ["Quads"], "secondaryMuscles": ["Glutes"]},
                {"exercise": "Goblet Squat", "primaryMuscles": ["Quads", "Glutes"], "secondaryMuscles": ["Core"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Dumbbell Romanian Deadlift",
              "sets": 3,
              "reps": "10",
              "rest": 120,
              "restQuick": 78,
              "primaryMuscles": ["Hamstrings", "Glutes"],
              "secondaryMuscles": ["Core"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "10, 10, 10",
                "3": "11, 10, 10",
                "4": "11, 11, 10",
                "5": "12, 11, 11",
                "6": "12, 12, 12"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Leg Press Machine. Push hips back, feel strong hamstring stretch, keep dumbbells close to body.",
              "alternatives": [
                {"exercise": "Barbell Romanian Deadlift", "primaryMuscles": ["Hamstrings", "Glutes"], "secondaryMuscles": ["Core"]},
                {"exercise": "Cable Pull-Through", "primaryMuscles": ["Hamstrings", "Glutes"], "secondaryMuscles": ["Core"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Dumbbell Incline Press",
              "sets": 3,
              "reps": "10",
              "rest": 75,
              "restQuick": 49,
              "primaryMuscles": ["Chest", "Front Delts"],
              "secondaryMuscles": ["Triceps"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "11, 10, 10",
                "3": "11, 11, 10",
                "4": "12, 11, 11",
                "5": "12, 12, 11",
                "6": "12, 12, 12"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Barbell Bent-Over Row. Bench at 30–45°, dumbbells meet above upper chest at top.",
              "alternatives": [
                {"exercise": "Incline Barbell Bench Press", "primaryMuscles": ["Chest", "Front Delts"], "secondaryMuscles": ["Triceps"]},
                {"exercise": "Machine Incline Press", "primaryMuscles": ["Chest", "Front Delts"], "secondaryMuscles": ["Triceps"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Barbell Bent-Over Row",
              "sets": 3,
              "reps": "10",
              "rest": 120,
              "restQuick": 78,
              "primaryMuscles": ["Upper Back", "Lats"],
              "secondaryMuscles": ["Biceps", "Rear Delts"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "10, 10, 10",
                "3": "11, 10, 10",
                "4": "11, 11, 10",
                "5": "12, 11, 11",
                "6": "12, 12, 12"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Dumbbell Incline Press. Hip hinge to 45°, pull bar to lower chest, maintain flat back throughout.",
              "alternatives": [
                {"exercise": "Seated Cable Row", "primaryMuscles": ["Upper Back", "Lats"], "secondaryMuscles": ["Biceps", "Rear Delts"]},
                {"exercise": "Machine Row", "primaryMuscles": ["Upper Back", "Lats"], "secondaryMuscles": ["Biceps", "Rear Delts"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Dumbbell Lateral Raise",
              "sets": 3,
              "reps": "12",
              "rest": 75,
              "restQuick": 49,
              "primaryMuscles": ["Side Delts"],
              "secondaryMuscles": ["Traps"],
              "reps_weekly": {
                "1": "12, 12, 12",
                "2": "12, 12, 12",
                "3": "13, 12, 12",
                "4": "13, 13, 12",
                "5": "14, 14, 13",
                "6": "15, 15, 14"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Hammer Curl. Slight forward lean, lead with elbows, no shrug at the top.",
              "alternatives": [
                {"exercise": "Cable Lateral Raise", "primaryMuscles": ["Side Delts"], "secondaryMuscles": ["Traps"]},
                {"exercise": "Machine Lateral Raise", "primaryMuscles": ["Side Delts"], "secondaryMuscles": ["Traps"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Hammer Curl",
              "sets": 3,
              "reps": "12",
              "rest": 120,
              "restQuick": 78,
              "primaryMuscles": ["Biceps"],
              "secondaryMuscles": ["Forearms"],
              "reps_weekly": {
                "1": "12, 12, 12",
                "2": "12, 12, 12",
                "3": "13, 12, 12",
                "4": "13, 13, 12",
                "5": "14, 14, 13",
                "6": "15, 15, 14"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Dumbbell Lateral Raise. Neutral grip throughout, elbows fixed at sides, controlled negative.",
              "alternatives": [
                {"exercise": "Cable Bicep Curl", "primaryMuscles": ["Biceps"], "secondaryMuscles": ["Forearms"]},
                {"exercise": "EZ-Bar Curl", "primaryMuscles": ["Biceps"], "secondaryMuscles": ["Forearms"]}
              ]
            }
          ]
        },
        {
          "day_name": "REST DAY",
          "estimated_duration": 0,
          "exercises": []
        },
        {
          "day_name": "REST DAY",
          "estimated_duration": 0,
          "exercises": []
        }
      ]
    },
    {
      "block_name": "Block 2: Development (Part 2)",
      "weeks": "7-12",
      "structure": "Full Body Rest Full Body Rest Full Body Rest Rest",
      "days": [
        {
          "day_name": "Full Body A",
          "estimated_duration": 44,
          "exercises": [
            {
              "type": "strength",
              "exercise": "Hack Squat Machine",
              "sets": 3,
              "reps": "10",
              "rest": 75,
              "restQuick": 49,
              "primaryMuscles": ["Quads"],
              "secondaryMuscles": ["Glutes"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "10, 10, 8",
                "3": "10, 8, 8",
                "4": "8, 8, 8",
                "5": "8, 8, 6",
                "6": "8, 8, 8"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Lying Leg Curl Machine. Lower back flat against pad, full depth, drive through heels.",
              "alternatives": [
                {"exercise": "Leg Press Machine", "primaryMuscles": ["Quads"], "secondaryMuscles": ["Glutes"]},
                {"exercise": "Barbell Front Squat", "primaryMuscles": ["Quads", "Glutes"], "secondaryMuscles": ["Core"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Lying Leg Curl Machine",
              "sets": 3,
              "reps": "10",
              "rest": 120,
              "restQuick": 78,
              "primaryMuscles": ["Hamstrings"],
              "secondaryMuscles": ["Glutes"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "10, 10, 8",
                "3": "10, 8, 8",
                "4": "8, 8, 8",
                "5": "8, 8, 6",
                "6": "8, 8, 8"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Hack Squat Machine. Full extension at start, pause at top, slow 2–3 second negative.",
              "alternatives": [
                {"exercise": "Seated Leg Curl Machine", "primaryMuscles": ["Hamstrings"], "secondaryMuscles": ["Glutes"]},
                {"exercise": "Nordic Curl", "primaryMuscles": ["Hamstrings"], "secondaryMuscles": []}
              ]
            },
            {
              "type": "strength",
              "exercise": "Cable Straight Arm Pulldown",
              "sets": 3,
              "reps": "12",
              "rest": 75,
              "restQuick": 49,
              "primaryMuscles": ["Lats"],
              "secondaryMuscles": ["Triceps", "Upper Back"],
              "reps_weekly": {
                "1": "12, 12, 10",
                "2": "12, 10, 10",
                "3": "10, 10, 10",
                "4": "10, 10, 8",
                "5": "10, 8, 8",
                "6": "10, 10, 10"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Incline Dumbbell Bench Press. Arms nearly straight throughout, sweep bar to hips in a wide arc.",
              "alternatives": [
                {"exercise": "Lat Pulldown", "primaryMuscles": ["Lats"], "secondaryMuscles": ["Biceps", "Upper Back"]},
                {"exercise": "Assisted Pull-Up Machine", "primaryMuscles": ["Lats"], "secondaryMuscles": ["Biceps", "Upper Back"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Incline Dumbbell Bench Press",
              "sets": 3,
              "reps": "10",
              "rest": 120,
              "restQuick": 78,
              "primaryMuscles": ["Chest", "Front Delts"],
              "secondaryMuscles": ["Triceps"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "10, 10, 8",
                "3": "10, 8, 8",
                "4": "8, 8, 8",
                "5": "8, 8, 6",
                "6": "8, 8, 8"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Cable Straight Arm Pulldown. Bench at 30–45°, aim for heavier load than Block 1.",
              "alternatives": [
                {"exercise": "Incline Barbell Bench Press", "primaryMuscles": ["Chest", "Front Delts"], "secondaryMuscles": ["Triceps"]},
                {"exercise": "Machine Incline Press", "primaryMuscles": ["Chest", "Front Delts"], "secondaryMuscles": ["Triceps"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Machine Row",
              "sets": 3,
              "reps": "10",
              "rest": 75,
              "restQuick": 49,
              "primaryMuscles": ["Upper Back", "Lats"],
              "secondaryMuscles": ["Biceps", "Rear Delts"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "10, 10, 8",
                "3": "10, 8, 8",
                "4": "8, 8, 8",
                "5": "8, 8, 6",
                "6": "8, 8, 8"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Cable Lateral Raise. Chest on pad, drive elbows back, squeeze shoulder blades at full contraction.",
              "alternatives": [
                {"exercise": "Seated Cable Row", "primaryMuscles": ["Upper Back", "Lats"], "secondaryMuscles": ["Biceps", "Rear Delts"]},
                {"exercise": "Barbell Bent-Over Row", "primaryMuscles": ["Upper Back", "Lats"], "secondaryMuscles": ["Biceps", "Rear Delts"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Cable Lateral Raise",
              "sets": 3,
              "reps": "12",
              "rest": 120,
              "restQuick": 78,
              "primaryMuscles": ["Side Delts"],
              "secondaryMuscles": ["Traps"],
              "reps_weekly": {
                "1": "12, 12, 12",
                "2": "13, 12, 12",
                "3": "13, 13, 12",
                "4": "14, 13, 13",
                "5": "15, 14, 14",
                "6": "15, 15, 15"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Machine Row. Cable provides constant tension throughout the arc — use the full range of motion.",
              "alternatives": [
                {"exercise": "Dumbbell Lateral Raise", "primaryMuscles": ["Side Delts"], "secondaryMuscles": ["Traps"]},
                {"exercise": "Machine Lateral Raise", "primaryMuscles": ["Side Delts"], "secondaryMuscles": ["Traps"]}
              ]
            }
          ]
        },
        {
          "day_name": "REST DAY",
          "estimated_duration": 0,
          "exercises": []
        },
        {
          "day_name": "Full Body B",
          "estimated_duration": 44,
          "exercises": [
            {
              "type": "strength",
              "exercise": "Barbell Romanian Deadlift",
              "sets": 3,
              "reps": "10",
              "rest": 75,
              "restQuick": 49,
              "primaryMuscles": ["Hamstrings", "Glutes"],
              "secondaryMuscles": ["Core"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "10, 10, 8",
                "3": "10, 8, 8",
                "4": "8, 8, 8",
                "5": "8, 8, 6",
                "6": "8, 8, 8"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Dumbbell Bulgarian Split Squat. Bar stays close to shins, controlled descent, hinge deep.",
              "alternatives": [
                {"exercise": "Dumbbell Romanian Deadlift", "primaryMuscles": ["Hamstrings", "Glutes"], "secondaryMuscles": ["Core"]},
                {"exercise": "Cable Pull-Through", "primaryMuscles": ["Hamstrings", "Glutes"], "secondaryMuscles": ["Core"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Dumbbell Bulgarian Split Squat",
              "sets": 3,
              "reps": "10",
              "rest": 120,
              "restQuick": 78,
              "primaryMuscles": ["Quads", "Glutes"],
              "secondaryMuscles": ["Hamstrings", "Core"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "10, 10, 8",
                "3": "10, 8, 8",
                "4": "8, 8, 8",
                "5": "8, 8, 6",
                "6": "8, 8, 8"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Barbell Romanian Deadlift. Rear foot on bench, front shin near vertical, upright torso.",
              "alternatives": [
                {"exercise": "Goblet Squat", "primaryMuscles": ["Quads", "Glutes"], "secondaryMuscles": ["Core"]},
                {"exercise": "Reverse Lunge", "primaryMuscles": ["Quads", "Glutes"], "secondaryMuscles": ["Hamstrings", "Core"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Dumbbell Bench Press",
              "sets": 3,
              "reps": "10",
              "rest": 75,
              "restQuick": 49,
              "primaryMuscles": ["Chest", "Triceps"],
              "secondaryMuscles": ["Front Delts"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "10, 10, 8",
                "3": "10, 8, 8",
                "4": "8, 8, 8",
                "5": "8, 8, 6",
                "6": "8, 8, 8"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Chest-Supported Row Machine. Use heavier dumbbells than Block 1, same technique.",
              "alternatives": [
                {"exercise": "Barbell Bench Press", "primaryMuscles": ["Chest", "Triceps"], "secondaryMuscles": ["Front Delts"]},
                {"exercise": "Machine Chest Press", "primaryMuscles": ["Chest", "Triceps"], "secondaryMuscles": ["Front Delts"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Chest-Supported Row Machine",
              "sets": 3,
              "reps": "10",
              "rest": 120,
              "restQuick": 78,
              "primaryMuscles": ["Upper Back", "Lats"],
              "secondaryMuscles": ["Biceps", "Rear Delts"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "10, 10, 8",
                "3": "10, 8, 8",
                "4": "8, 8, 8",
                "5": "8, 8, 6",
                "6": "8, 8, 8"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Dumbbell Bench Press. Chest against pad, drive elbows back, squeeze shoulder blades at top.",
              "alternatives": [
                {"exercise": "Dumbbell Row", "primaryMuscles": ["Upper Back", "Lats"], "secondaryMuscles": ["Biceps", "Rear Delts"]},
                {"exercise": "Seated Cable Row", "primaryMuscles": ["Upper Back", "Lats"], "secondaryMuscles": ["Biceps", "Rear Delts"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Cable Overhead Tricep Extension",
              "sets": 3,
              "reps": "12",
              "rest": 75,
              "restQuick": 49,
              "primaryMuscles": ["Triceps"],
              "secondaryMuscles": [],
              "reps_weekly": {
                "1": "12, 12, 12",
                "2": "13, 12, 12",
                "3": "13, 13, 12",
                "4": "14, 13, 13",
                "5": "15, 14, 14",
                "6": "15, 15, 15"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Incline Dumbbell Curl. Face away from stack, elbows point upward and stay fixed, full stretch at top.",
              "alternatives": [
                {"exercise": "Tricep Pushdown", "primaryMuscles": ["Triceps"], "secondaryMuscles": []},
                {"exercise": "Machine Tricep Extension", "primaryMuscles": ["Triceps"], "secondaryMuscles": []}
              ]
            },
            {
              "type": "strength",
              "exercise": "Incline Dumbbell Curl",
              "sets": 3,
              "reps": "12",
              "rest": 120,
              "restQuick": 78,
              "primaryMuscles": ["Biceps"],
              "secondaryMuscles": ["Forearms"],
              "reps_weekly": {
                "1": "12, 12, 12",
                "2": "12, 12, 12",
                "3": "13, 12, 12",
                "4": "13, 13, 12",
                "5": "14, 13, 13",
                "6": "15, 14, 14"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Cable Overhead Tricep Extension. Arms hang straight down from incline bench, elbows stay behind torso.",
              "alternatives": [
                {"exercise": "Cable Bicep Curl", "primaryMuscles": ["Biceps"], "secondaryMuscles": ["Forearms"]},
                {"exercise": "Machine Bicep Curl", "primaryMuscles": ["Biceps"], "secondaryMuscles": ["Forearms"]}
              ]
            }
          ]
        },
        {
          "day_name": "REST DAY",
          "estimated_duration": 0,
          "exercises": []
        },
        {
          "day_name": "Full Body C",
          "estimated_duration": 44,
          "exercises": [
            {
              "type": "strength",
              "exercise": "Leg Press Machine",
              "sets": 3,
              "reps": "10",
              "rest": 75,
              "restQuick": 49,
              "primaryMuscles": ["Quads"],
              "secondaryMuscles": ["Glutes"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "10, 10, 8",
                "3": "10, 8, 8",
                "4": "8, 8, 8",
                "5": "8, 8, 6",
                "6": "8, 8, 8"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Barbell Romanian Deadlift. Heavier than Block 1, full range, do not lock out knees.",
              "alternatives": [
                {"exercise": "Hack Squat Machine", "primaryMuscles": ["Quads"], "secondaryMuscles": ["Glutes"]},
                {"exercise": "Goblet Squat", "primaryMuscles": ["Quads", "Glutes"], "secondaryMuscles": ["Core"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Barbell Romanian Deadlift",
              "sets": 3,
              "reps": "10",
              "rest": 120,
              "restQuick": 78,
              "primaryMuscles": ["Hamstrings", "Glutes"],
              "secondaryMuscles": ["Core"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "10, 10, 8",
                "3": "10, 8, 8",
                "4": "8, 8, 8",
                "5": "8, 8, 6",
                "6": "8, 8, 8"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Leg Press Machine. Bar stays close to shins, focus on controlled eccentric and loaded stretch.",
              "alternatives": [
                {"exercise": "Dumbbell Romanian Deadlift", "primaryMuscles": ["Hamstrings", "Glutes"], "secondaryMuscles": ["Core"]},
                {"exercise": "Cable Pull-Through", "primaryMuscles": ["Hamstrings", "Glutes"], "secondaryMuscles": ["Core"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Machine Chest Press",
              "sets": 3,
              "reps": "10",
              "rest": 75,
              "restQuick": 49,
              "primaryMuscles": ["Chest", "Triceps"],
              "secondaryMuscles": ["Front Delts"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "10, 10, 8",
                "3": "10, 8, 8",
                "4": "8, 8, 8",
                "5": "8, 8, 6",
                "6": "8, 8, 8"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Lat Pulldown. Adjust seat so handles are at mid-chest height, retract shoulder blades before pressing.",
              "alternatives": [
                {"exercise": "Dumbbell Bench Press", "primaryMuscles": ["Chest", "Triceps"], "secondaryMuscles": ["Front Delts"]},
                {"exercise": "Barbell Bench Press", "primaryMuscles": ["Chest", "Triceps"], "secondaryMuscles": ["Front Delts"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Lat Pulldown",
              "sets": 3,
              "reps": "10",
              "rest": 120,
              "restQuick": 78,
              "primaryMuscles": ["Lats"],
              "secondaryMuscles": ["Biceps", "Upper Back"],
              "reps_weekly": {
                "1": "10, 10, 10",
                "2": "10, 10, 8",
                "3": "10, 8, 8",
                "4": "8, 8, 8",
                "5": "8, 8, 6",
                "6": "8, 8, 8"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Machine Chest Press. Slightly narrower grip than Block 1 for variety, full lat stretch at top.",
              "alternatives": [
                {"exercise": "Assisted Pull-Up Machine", "primaryMuscles": ["Lats"], "secondaryMuscles": ["Biceps", "Upper Back"]},
                {"exercise": "Cable Straight Arm Pulldown", "primaryMuscles": ["Lats"], "secondaryMuscles": ["Triceps", "Upper Back"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "Machine Lateral Raise",
              "sets": 3,
              "reps": "12",
              "rest": 75,
              "restQuick": 49,
              "primaryMuscles": ["Side Delts"],
              "secondaryMuscles": ["Traps"],
              "reps_weekly": {
                "1": "12, 12, 12",
                "2": "13, 12, 12",
                "3": "13, 13, 12",
                "4": "14, 13, 13",
                "5": "15, 14, 14",
                "6": "15, 15, 15"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with EZ-Bar Curl. Adjust seat so pivot aligns with shoulder joint, use the full range of motion.",
              "alternatives": [
                {"exercise": "Dumbbell Lateral Raise", "primaryMuscles": ["Side Delts"], "secondaryMuscles": ["Traps"]},
                {"exercise": "Cable Lateral Raise", "primaryMuscles": ["Side Delts"], "secondaryMuscles": ["Traps"]}
              ]
            },
            {
              "type": "strength",
              "exercise": "EZ-Bar Curl",
              "sets": 3,
              "reps": "12",
              "rest": 120,
              "restQuick": 78,
              "primaryMuscles": ["Biceps"],
              "secondaryMuscles": ["Forearms"],
              "reps_weekly": {
                "1": "12, 12, 12",
                "2": "12, 12, 12",
                "3": "13, 12, 12",
                "4": "13, 13, 12",
                "5": "14, 13, 13",
                "6": "15, 14, 14"
              },
              "sets_weekly": {"1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3},
              "notes": "Superset with Machine Lateral Raise. Grip the angled sections of the EZ-bar, elbows pinned at sides.",
              "alternatives": [
                {"exercise": "Dumbbell Bicep Curl", "primaryMuscles": ["Biceps"], "secondaryMuscles": ["Forearms"]},
                {"exercise": "Cable Bicep Curl", "primaryMuscles": ["Biceps"], "secondaryMuscles": ["Forearms"]}
              ]
            }
          ]
        },
        {
          "day_name": "REST DAY",
          "estimated_duration": 0,
          "exercises": []
        },
        {
          "day_name": "REST DAY",
          "estimated_duration": 0,
          "exercises": []
        }
      ]
    }
  ]
};

// Export all sample workout programs
export { muscleBuilderProProgram, gluteAndToneProgram };

// The complete 52-week Muscle Builder Pro program is now in muscleBuilderPro.ts