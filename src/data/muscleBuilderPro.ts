import { WorkoutProgram } from '../types/workout';

export const muscleBuilderProProgram: WorkoutProgram = {
  "id": "sample_muscle_builder_pro_52w",
  "routine_name": "52-Week Advanced Hypertrophy Program",
  "description": "A comprehensive 52-week periodized muscle growth program using an Upper/Lower split. Structured in 4-week mesocycles alternating between Accumulation (high volume), Intensification (heavier loads), and Deload phases. Prioritizes leg and calf development while building balanced overall musculature. Designed for advanced lifters with full gym access.",
  "days_per_week": 4,
  "blocks": [
    {
      "block_name": "Block 1 - Foundation Volume (Accumulation)",
      "weeks": "1-4",
      "structure": "Upper Lower",
      "days": [
        {
          "day_name": "Upper A - Push Emphasis",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Barbell Bench Press",
              "sets": 4,
              "reps": "8-12",
              "reps_weekly": {
                "1": "12",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Control the eccentric, drive through chest. RPE 7-8.",
              "alternatives": [
                "Dumbbell Bench Press",
                "Machine Chest Press"
              ]
            },
            {
              "exercise": "Incline Dumbbell Press",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "30-45 degree angle. Full stretch at bottom.",
              "alternatives": [
                "Incline Barbell Bench Press",
                "Incline Machine Press"
              ]
            },
            {
              "exercise": "Cable Fly",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Squeeze at peak contraction. Constant tension.",
              "alternatives": [
                "Pec Deck",
                "Dumbbell Fly"
              ]
            },
            {
              "exercise": "Overhead Press",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Brace core, press in slight arc. RPE 7-8.",
              "alternatives": [
                "Seated Dumbbell Press",
                "Machine Shoulder Press"
              ]
            },
            {
              "exercise": "Lateral Raise",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Slight forward lean, lead with elbows.",
              "alternatives": [
                "Cable Lateral Raise",
                "Machine Lateral Raise"
              ]
            },
            {
              "exercise": "Push Up",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Full ROM. Add weight vest if needed.",
              "alternatives": [
                "Incline Push Up",
                "Decline Push Up"
              ]
            },
            {
              "exercise": "Tricep Pushdown",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Lock elbows at sides. Full extension.",
              "alternatives": [
                "Rope Pushdown",
                "V-Bar Pushdown"
              ]
            },
            {
              "exercise": "Overhead Tricep Extension",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Deep stretch at bottom. Control the weight.",
              "alternatives": [
                "Overhead Cable Extension",
                "French Press"
              ]
            }
          ]
        },
        {
          "day_name": "Lower A - Quad & Calf Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Barbell Back Squat",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 210,
              "restQuick": 150,
              "notes": "Hit depth. Brace hard. RPE 7-8.",
              "alternatives": [
                "High Bar Squat",
                "Safety Bar Squat"
              ]
            },
            {
              "exercise": "Leg Press",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Medium foot placement. Full ROM without lower back rounding.",
              "alternatives": [
                "Hack Squat",
                "Pendulum Squat"
              ]
            },
            {
              "exercise": "Leg Extension",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Squeeze at top for 1 second. Control negative.",
              "alternatives": [
                "Single Leg Extension"
              ]
            },
            {
              "exercise": "Walking Lunge",
              "sets": 3,
              "reps": "12-14",
              "reps_weekly": {
                "1": "14",
                "2": "14",
                "3": "12",
                "4": "12"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Per leg. Long strides, upright torso.",
              "alternatives": [
                "Dumbbell Walking Lunge",
                "Dumbbell Lunge"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 5,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Full stretch, pause at top. 2 sec negative.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Donkey Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 4,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Soleus focus. Deep stretch, controlled tempo.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            },
            {
              "exercise": "Tibialis Raise",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Prehab work. Full ROM.",
              "alternatives": []
            }
          ]
        },
        {
          "day_name": "Upper B - Pull Emphasis",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Pull Up",
              "sets": 4,
              "reps": "6-10",
              "reps_weekly": {
                "1": "10",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Add weight when hitting top of range. Full dead hang.",
              "alternatives": [
                "Assisted Pull Up",
                "Lat Pulldown"
              ]
            },
            {
              "exercise": "Barbell Row",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "45-degree torso. Drive elbows back. RPE 7-8.",
              "alternatives": [
                "Pendlay Row",
                "T-Bar Row"
              ]
            },
            {
              "exercise": "Chest Supported Row",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "No momentum. Squeeze at contraction.",
              "alternatives": [
                "Seal Row",
                "Machine Row"
              ]
            },
            {
              "exercise": "Lat Pulldown",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Drive elbows down and back. Full stretch at top.",
              "alternatives": [
                "Wide Grip Lat Pulldown",
                "Neutral Grip Lat Pulldown"
              ]
            },
            {
              "exercise": "Face Pull",
              "sets": 4,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "External rotation at end. Shoulder health priority.",
              "alternatives": [
                "Cable Face Pull",
                "Rear Delt Fly"
              ]
            },
            {
              "exercise": "Barbell Curl",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "No swinging. Control negative.",
              "alternatives": [
                "EZ Bar Curl",
                "Dumbbell Curl"
              ]
            },
            {
              "exercise": "Incline Dumbbell Curl",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Stretch emphasis. Keep shoulders back.",
              "alternatives": [
                "Bayesian Cable Curl",
                "Spider Curl"
              ]
            },
            {
              "exercise": "Hammer Curl",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Brachialis focus. Neutral grip throughout.",
              "alternatives": [
                "Rope Hammer Curl",
                "Cross Body Hammer Curl"
              ]
            }
          ]
        },
        {
          "day_name": "Lower B - Hamstring & Glute Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Romanian Deadlift",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Hinge at hips. Feel hamstring stretch. RPE 7-8.",
              "alternatives": [
                "Dumbbell Romanian Deadlift",
                "Stiff Leg Deadlift"
              ]
            },
            {
              "exercise": "Leg Press (High Foot)",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "High and wide foot placement. Glute/ham emphasis.",
              "alternatives": [
                "Hack Squat",
                "Belt Squat"
              ]
            },
            {
              "exercise": "Bulgarian Split Squat",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Per leg. Lean slightly forward for glutes.",
              "alternatives": [
                "Dumbbell Bulgarian Split Squat",
                "Reverse Lunge"
              ]
            },
            {
              "exercise": "Lying Leg Curl",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Don't lift hips. Control the negative.",
              "alternatives": [
                "Seated Leg Curl",
                "Leg Curl"
              ]
            },
            {
              "exercise": "Hip Thrust",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Pause at top. Full glute squeeze.",
              "alternatives": [
                "Machine Hip Thrust",
                "Barbell Glute Bridge"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Full ROM. 2 sec pause at stretch.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Dumbbell Calf Raise"
              ]
            },
            {
              "exercise": "Leg Press Calf Raise",
              "sets": 4,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Deep stretch. Controlled tempo.",
              "alternatives": [
                "Seated Calf Raise",
                "Single Leg Calf Raise"
              ]
            }
          ]
        }
      ]
    },
    {
      "block_name": "Block 2 - Strength Foundation (Intensification)",
      "weeks": "5-8",
      "structure": "Upper Lower",
      "days": [
        {
          "day_name": "Upper A - Push Emphasis",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Barbell Bench Press",
              "sets": 5,
              "reps": "5-8",
              "reps_weekly": {
                "1": "8",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 210,
              "restQuick": 150,
              "notes": "Heavier loads this block. RPE 8.",
              "alternatives": [
                "Dumbbell Bench Press",
                "Machine Chest Press"
              ]
            },
            {
              "exercise": "Incline Barbell Bench Press",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Controlled descent. Drive through upper chest.",
              "alternatives": [
                "Incline Dumbbell Press",
                "Smith Machine Incline Press"
              ]
            },
            {
              "exercise": "Dip",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Add weight as needed. Slight forward lean for chest.",
              "alternatives": [
                "Chest Dip",
                "Machine Dip"
              ]
            },
            {
              "exercise": "Push Up",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Weighted if possible. Full ROM.",
              "alternatives": [
                "Decline Push Up",
                "Diamond Push Up"
              ]
            },
            {
              "exercise": "Seated Dumbbell Press",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Heavier than last block. Full ROM.",
              "alternatives": [
                "Overhead Press",
                "Machine Shoulder Press"
              ]
            },
            {
              "exercise": "Cable Lateral Raise",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Constant tension. Controlled throughout.",
              "alternatives": [
                "Lateral Raise",
                "Machine Lateral Raise"
              ]
            },
            {
              "exercise": "Close Grip Bench Press",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Elbows tucked. Tricep focus.",
              "alternatives": [
                "JM Press",
                "Floor Press"
              ]
            },
            {
              "exercise": "Skull Crusher",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Lower to forehead. Full stretch.",
              "alternatives": [
                "Dumbbell Skull Crusher",
                "French Press"
              ]
            }
          ]
        },
        {
          "day_name": "Lower A - Quad & Calf Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Barbell Back Squat",
              "sets": 5,
              "reps": "5-8",
              "reps_weekly": {
                "1": "8",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 240,
              "restQuick": 150,
              "notes": "Heavier loads. Brace hard. RPE 8.",
              "alternatives": [
                "Low Bar Squat",
                "Safety Bar Squat"
              ]
            },
            {
              "exercise": "Front Squat",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Upright torso. Quad dominant.",
              "alternatives": [
                "Goblet Squat",
                "Hack Squat"
              ]
            },
            {
              "exercise": "Leg Press",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Load it up. Full ROM.",
              "alternatives": [
                "Hack Squat",
                "Pendulum Squat"
              ]
            },
            {
              "exercise": "Leg Extension",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Squeeze and hold at top.",
              "alternatives": [
                "Single Leg Extension"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 5,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 75,
              "restQuick": 45,
              "notes": "Heavier weight. Full stretch.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Donkey Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Deep stretch at bottom. Controlled.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            },
            {
              "exercise": "Tibialis Raise",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Maintain prehab work.",
              "alternatives": []
            }
          ]
        },
        {
          "day_name": "Upper B - Pull Emphasis",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Pull Up",
              "sets": 5,
              "reps": "5-8",
              "reps_weekly": {
                "1": "8",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Add weight. Dead hang each rep.",
              "alternatives": [
                "Chin Up",
                "Neutral Grip Pull Up"
              ]
            },
            {
              "exercise": "Pendlay Row",
              "sets": 4,
              "reps": "5-8",
              "reps_weekly": {
                "1": "8",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Explosive pull from floor. Reset each rep.",
              "alternatives": [
                "Barbell Row",
                "T-Bar Row"
              ]
            },
            {
              "exercise": "Dumbbell Row",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Heavy. Drive elbow to hip.",
              "alternatives": [
                "Kroc Row",
                "Meadows Row"
              ]
            },
            {
              "exercise": "Wide Grip Lat Pulldown",
              "sets": 3,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Wide grip. Full stretch at top.",
              "alternatives": [
                "Lat Pulldown",
                "Neutral Grip Lat Pulldown"
              ]
            },
            {
              "exercise": "Face Pull",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Rear delt and rotator cuff health.",
              "alternatives": [
                "Cable Rear Delt Fly",
                "Rear Delt Fly"
              ]
            },
            {
              "exercise": "EZ Bar Curl",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 75,
              "restQuick": 45,
              "notes": "Heavier curls this block. Control negative.",
              "alternatives": [
                "Barbell Curl",
                "Dumbbell Curl"
              ]
            },
            {
              "exercise": "Preacher Curl",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Full extension. No swinging.",
              "alternatives": [
                "Dumbbell Preacher Curl",
                "Machine Preacher Curl"
              ]
            },
            {
              "exercise": "Rope Hammer Curl",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Brachialis focus.",
              "alternatives": [
                "Hammer Curl",
                "Cross Body Hammer Curl"
              ]
            }
          ]
        },
        {
          "day_name": "Lower B - Hamstring & Glute Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Conventional Deadlift",
              "sets": 5,
              "reps": "5-6",
              "reps_weekly": {
                "1": "6",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 240,
              "restQuick": 150,
              "notes": "Heavy pulls. Brace and lock out. RPE 8.",
              "alternatives": [
                "Sumo Deadlift",
                "Trap Bar Deadlift"
              ]
            },
            {
              "exercise": "Romanian Deadlift",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Heavier loads. Deep stretch.",
              "alternatives": [
                "Stiff Leg Deadlift",
                "Dumbbell Romanian Deadlift"
              ]
            },
            {
              "exercise": "Bulgarian Split Squat",
              "sets": 3,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Per leg. Add load progressively.",
              "alternatives": [
                "Dumbbell Bulgarian Split Squat",
                "Barbell Bulgarian Split Squat"
              ]
            },
            {
              "exercise": "Seated Leg Curl",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 75,
              "restQuick": 45,
              "notes": "Full ROM. Control negative.",
              "alternatives": [
                "Lying Leg Curl",
                "Leg Curl"
              ]
            },
            {
              "exercise": "Hip Thrust",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Heavier weight. Full lockout.",
              "alternatives": [
                "Machine Hip Thrust",
                "Barbell Glute Bridge"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Progressive overload on calves.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Donkey Calf Raise"
              ]
            },
            {
              "exercise": "Single Leg Calf Raise",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Per leg. Balance and isolation.",
              "alternatives": [
                "Dumbbell Calf Raise",
                "Leg Press Calf Raise"
              ]
            }
          ]
        }
      ]
    },
    {
      "block_name": "Block 3 - Volume Accumulation Phase 2",
      "weeks": "9-12",
      "structure": "Upper Lower",
      "days": [
        {
          "day_name": "Upper A - Push Emphasis",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Dumbbell Bench Press",
              "sets": 4,
              "reps": "8-12",
              "reps_weekly": {
                "1": "12",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Full ROM. Greater stretch than barbell.",
              "alternatives": [
                "Barbell Bench Press",
                "Machine Chest Press"
              ]
            },
            {
              "exercise": "Incline Dumbbell Press",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Upper chest focus. Deep stretch.",
              "alternatives": [
                "Incline Barbell Bench Press",
                "Incline Machine Press"
              ]
            },
            {
              "exercise": "High Cable Fly",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Lower chest emphasis. Squeeze at bottom.",
              "alternatives": [
                "Cable Fly",
                "Pec Deck"
              ]
            },
            {
              "exercise": "Push Up",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Finisher. Add weight if needed.",
              "alternatives": [
                "Decline Push Up",
                "Diamond Push Up"
              ]
            },
            {
              "exercise": "Arnold Press",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Rotation through press. Full ROM.",
              "alternatives": [
                "Seated Dumbbell Press",
                "Dumbbell Shoulder Press"
              ]
            },
            {
              "exercise": "Lateral Raise",
              "sets": 4,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "High rep pump. Constant tension.",
              "alternatives": [
                "Cable Lateral Raise",
                "Machine Lateral Raise"
              ]
            },
            {
              "exercise": "Rope Pushdown",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Spread rope at bottom. Peak contraction.",
              "alternatives": [
                "Tricep Pushdown",
                "V-Bar Pushdown"
              ]
            },
            {
              "exercise": "Overhead Cable Extension",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Long head emphasis. Deep stretch.",
              "alternatives": [
                "Overhead Tricep Extension",
                "French Press"
              ]
            }
          ]
        },
        {
          "day_name": "Lower A - Quad & Calf Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "High Bar Squat",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Upright torso. Quad emphasis.",
              "alternatives": [
                "Barbell Back Squat",
                "Front Squat"
              ]
            },
            {
              "exercise": "Hack Squat",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Low foot placement. Quad killer.",
              "alternatives": [
                "Leg Press",
                "Pendulum Squat"
              ]
            },
            {
              "exercise": "Leg Press",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 150,
              "restQuick": 90,
              "notes": "Higher rep pump. Full ROM.",
              "alternatives": [
                "Pendulum Squat",
                "Belt Squat"
              ]
            },
            {
              "exercise": "Leg Extension",
              "sets": 4,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Burnout. Hold peak contraction.",
              "alternatives": [
                "Single Leg Extension"
              ]
            },
            {
              "exercise": "Dumbbell Walking Lunge",
              "sets": 3,
              "reps": "12-14",
              "reps_weekly": {
                "1": "14",
                "2": "14",
                "3": "12",
                "4": "12"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Per leg. Step through.",
              "alternatives": [
                "Walking Lunge",
                "Dumbbell Lunge"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 5,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Volume phase. Full ROM every rep.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Donkey Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 4,
              "reps": "20-25",
              "reps_weekly": {
                "1": "25",
                "2": "25",
                "3": "20",
                "4": "20"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "High rep soleus work.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            },
            {
              "exercise": "Tibialis Raise",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Consistent prehab.",
              "alternatives": []
            }
          ]
        },
        {
          "day_name": "Upper B - Pull Emphasis",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Chin Up",
              "sets": 4,
              "reps": "8-12",
              "reps_weekly": {
                "1": "12",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Supinated grip. Bicep and lat focus.",
              "alternatives": [
                "Pull Up",
                "Neutral Grip Pull Up"
              ]
            },
            {
              "exercise": "T-Bar Row",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Squeeze at top. Thick back builder.",
              "alternatives": [
                "Barbell Row",
                "Chest Supported Row"
              ]
            },
            {
              "exercise": "Cable Row",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Stretch forward, pull to navel.",
              "alternatives": [
                "Wide Grip Cable Row",
                "Machine Row"
              ]
            },
            {
              "exercise": "Straight Arm Pulldown",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Lat isolation. Keep arms straight.",
              "alternatives": [
                "Lat Pulldown"
              ]
            },
            {
              "exercise": "Rear Delt Fly",
              "sets": 4,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Rear delt pump. Light weight, high reps.",
              "alternatives": [
                "Machine Rear Delt Fly",
                "Cable Rear Delt Fly"
              ]
            },
            {
              "exercise": "Pull Up",
              "sets": 3,
              "reps": "6-10",
              "reps_weekly": {
                "1": "10",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Second vertical pull. Add weight if needed.",
              "alternatives": [
                "Wide Grip Pull Up",
                "Lat Pulldown"
              ]
            },
            {
              "exercise": "Dumbbell Curl",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Alternating or simultaneous. Full ROM.",
              "alternatives": [
                "Alternating Dumbbell Curl",
                "Barbell Curl"
              ]
            },
            {
              "exercise": "Spider Curl",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Short head emphasis. No momentum.",
              "alternatives": [
                "Preacher Curl",
                "Concentration Curl"
              ]
            },
            {
              "exercise": "Hammer Curl",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Brachialis pump.",
              "alternatives": [
                "Rope Hammer Curl",
                "Cross Body Hammer Curl"
              ]
            }
          ]
        },
        {
          "day_name": "Lower B - Hamstring & Glute Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Stiff Leg Deadlift",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Hamstring stretch. Lighter than RDL for volume.",
              "alternatives": [
                "Romanian Deadlift",
                "Dumbbell Romanian Deadlift"
              ]
            },
            {
              "exercise": "Leg Press (High Foot)",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "High foot position. Glute and hamstring.",
              "alternatives": [
                "Belt Squat",
                "Hack Squat"
              ]
            },
            {
              "exercise": "Dumbbell Bulgarian Split Squat",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Per leg. Forward lean for glutes.",
              "alternatives": [
                "Bulgarian Split Squat",
                "Reverse Lunge"
              ]
            },
            {
              "exercise": "Lying Leg Curl",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Volume phase. Control eccentric.",
              "alternatives": [
                "Seated Leg Curl",
                "Single Leg Curl"
              ]
            },
            {
              "exercise": "Cable Pull Through",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Hip hinge pattern. Glute squeeze at top.",
              "alternatives": [
                "Hip Thrust",
                "Kettlebell Swing"
              ]
            },
            {
              "exercise": "Hip Thrust",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Volume. Hold at top.",
              "alternatives": [
                "Machine Hip Thrust",
                "Glute Bridge"
              ]
            },
            {
              "exercise": "Donkey Calf Raise",
              "sets": 4,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Different angle. Full ROM.",
              "alternatives": [
                "Standing Calf Raise",
                "Smith Machine Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 4,
              "reps": "20-25",
              "reps_weekly": {
                "1": "25",
                "2": "25",
                "3": "20",
                "4": "20"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Soleus volume.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            }
          ]
        }
      ]
    },
    {
      "block_name": "Block 4 - Strength Phase 2 (Intensification)",
      "weeks": "13-16",
      "structure": "Upper Lower",
      "days": [
        {
          "day_name": "Upper A - Push Emphasis",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Barbell Bench Press",
              "sets": 5,
              "reps": "4-6",
              "reps_weekly": {
                "1": "6",
                "2": "5",
                "3": "4",
                "4": "4"
              },
              "rest": 240,
              "restQuick": 150,
              "notes": "Peak strength. RPE 8-9.",
              "alternatives": [
                "Dumbbell Bench Press",
                "Smith Machine Bench Press"
              ]
            },
            {
              "exercise": "Incline Barbell Bench Press",
              "sets": 4,
              "reps": "5-8",
              "reps_weekly": {
                "1": "8",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Heavy incline work.",
              "alternatives": [
                "Incline Dumbbell Press",
                "Smith Machine Incline Press"
              ]
            },
            {
              "exercise": "Chest Dip",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Weighted. Forward lean.",
              "alternatives": [
                "Dip",
                "Machine Dip"
              ]
            },
            {
              "exercise": "Military Press",
              "sets": 4,
              "reps": "5-8",
              "reps_weekly": {
                "1": "8",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Strict form. Standing or seated.",
              "alternatives": [
                "Overhead Press",
                "Push Press"
              ]
            },
            {
              "exercise": "Machine Lateral Raise",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Controlled reps.",
              "alternatives": [
                "Lateral Raise",
                "Cable Lateral Raise"
              ]
            },
            {
              "exercise": "Push Up",
              "sets": 3,
              "reps": "10-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Weighted for strength phase.",
              "alternatives": [
                "Decline Push Up",
                "Diamond Push Up"
              ]
            },
            {
              "exercise": "Close Grip Bench Press",
              "sets": 4,
              "reps": "5-8",
              "reps_weekly": {
                "1": "8",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Heavy tricep compound.",
              "alternatives": [
                "JM Press",
                "Floor Press"
              ]
            },
            {
              "exercise": "Tricep Dip",
              "sets": 3,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Upright torso for triceps.",
              "alternatives": [
                "Bench Dip",
                "Machine Dip"
              ]
            }
          ]
        },
        {
          "day_name": "Lower A - Quad & Calf Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Barbell Back Squat",
              "sets": 5,
              "reps": "4-6",
              "reps_weekly": {
                "1": "6",
                "2": "5",
                "3": "4",
                "4": "4"
              },
              "rest": 270,
              "restQuick": 180,
              "notes": "Peak strength work. Full depth. RPE 8-9.",
              "alternatives": [
                "Low Bar Squat",
                "Safety Bar Squat"
              ]
            },
            {
              "exercise": "Front Squat",
              "sets": 4,
              "reps": "5-6",
              "reps_weekly": {
                "1": "6",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Heavy quad work. Stay upright.",
              "alternatives": [
                "Hack Squat",
                "Goblet Squat"
              ]
            },
            {
              "exercise": "Leg Press",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Heavy loads. Full ROM.",
              "alternatives": [
                "Hack Squat",
                "Pendulum Squat"
              ]
            },
            {
              "exercise": "Leg Extension",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Pump work after compounds.",
              "alternatives": [
                "Single Leg Extension"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 5,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Heavy calf work. Full ROM.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Donkey Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Heavier loads for soleus.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            },
            {
              "exercise": "Tibialis Raise",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Shin prehab.",
              "alternatives": []
            }
          ]
        },
        {
          "day_name": "Upper B - Pull Emphasis",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Pull Up",
              "sets": 5,
              "reps": "4-6",
              "reps_weekly": {
                "1": "6",
                "2": "5",
                "3": "4",
                "4": "4"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Heavy weighted pull ups. RPE 8-9.",
              "alternatives": [
                "Chin Up",
                "Neutral Grip Pull Up"
              ]
            },
            {
              "exercise": "Barbell Row",
              "sets": 5,
              "reps": "5-6",
              "reps_weekly": {
                "1": "6",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Heavy rows. Controlled cheating okay.",
              "alternatives": [
                "Pendlay Row",
                "T-Bar Row"
              ]
            },
            {
              "exercise": "Dumbbell Row",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Heavy dumbbells. Power.",
              "alternatives": [
                "Kroc Row",
                "Meadows Row"
              ]
            },
            {
              "exercise": "Close Grip Lat Pulldown",
              "sets": 3,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Stretch and squeeze.",
              "alternatives": [
                "Neutral Grip Lat Pulldown",
                "Lat Pulldown"
              ]
            },
            {
              "exercise": "Cable Face Pull",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Shoulder health.",
              "alternatives": [
                "Face Pull",
                "Rear Delt Fly"
              ]
            },
            {
              "exercise": "Barbell Curl",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Heavy curls.",
              "alternatives": [
                "EZ Bar Curl",
                "Dumbbell Curl"
              ]
            },
            {
              "exercise": "Dumbbell Preacher Curl",
              "sets": 3,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Isolation after heavy compound.",
              "alternatives": [
                "Preacher Curl",
                "Machine Preacher Curl"
              ]
            },
            {
              "exercise": "Hammer Curl",
              "sets": 3,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Forearm and brachialis.",
              "alternatives": [
                "Rope Hammer Curl",
                "Cross Body Hammer Curl"
              ]
            }
          ]
        },
        {
          "day_name": "Lower B - Hamstring & Glute Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Conventional Deadlift",
              "sets": 5,
              "reps": "4-5",
              "reps_weekly": {
                "1": "5",
                "2": "5",
                "3": "4",
                "4": "4"
              },
              "rest": 270,
              "restQuick": 180,
              "notes": "Peak pulling strength. RPE 8-9.",
              "alternatives": [
                "Sumo Deadlift",
                "Trap Bar Deadlift"
              ]
            },
            {
              "exercise": "Romanian Deadlift",
              "sets": 4,
              "reps": "5-8",
              "reps_weekly": {
                "1": "8",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Heavy hamstring stretch.",
              "alternatives": [
                "Stiff Leg Deadlift",
                "Dumbbell Romanian Deadlift"
              ]
            },
            {
              "exercise": "Barbell Bulgarian Split Squat",
              "sets": 3,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Per leg. Heavy unilateral work.",
              "alternatives": [
                "Bulgarian Split Squat",
                "Dumbbell Bulgarian Split Squat"
              ]
            },
            {
              "exercise": "Nordic Curl",
              "sets": 3,
              "reps": "5-8",
              "reps_weekly": {
                "1": "8",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Eccentric hamstring strength. Use assistance if needed.",
              "alternatives": [
                "Glute Ham Raise",
                "Lying Leg Curl"
              ]
            },
            {
              "exercise": "Hip Thrust",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Heavy hip extension.",
              "alternatives": [
                "Machine Hip Thrust",
                "Barbell Glute Bridge"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 75,
              "restQuick": 45,
              "notes": "Heavy standing calf.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Donkey Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Heavier loads.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            }
          ]
        }
      ]
    },
    {
      "block_name": "Block 5 - Active Recovery & Transition (Deload)",
      "weeks": "17-20",
      "structure": "Upper Lower",
      "days": [
        {
          "day_name": "Upper A - Push Emphasis",
          "estimated_duration": 75,
          "exercises": [
            {
              "exercise": "Machine Chest Press",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Deload week. Controlled tempo. RPE 6-7.",
              "alternatives": [
                "Barbell Bench Press",
                "Dumbbell Bench Press"
              ]
            },
            {
              "exercise": "Incline Machine Press",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Light weight, good contraction.",
              "alternatives": [
                "Incline Dumbbell Press",
                "Incline Barbell Bench Press"
              ]
            },
            {
              "exercise": "Pec Deck",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Pump work. No grinding.",
              "alternatives": [
                "Cable Fly",
                "Dumbbell Fly"
              ]
            },
            {
              "exercise": "Push Up",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Bodyweight only. Focus on form.",
              "alternatives": [
                "Incline Push Up"
              ]
            },
            {
              "exercise": "Machine Shoulder Press",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Joint-friendly pressing.",
              "alternatives": [
                "Seated Dumbbell Press",
                "Dumbbell Shoulder Press"
              ]
            },
            {
              "exercise": "Lateral Raise",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Light weight, perfect form.",
              "alternatives": [
                "Cable Lateral Raise",
                "Machine Lateral Raise"
              ]
            },
            {
              "exercise": "Tricep Pushdown",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Easy isolation work.",
              "alternatives": [
                "Rope Pushdown",
                "V-Bar Pushdown"
              ]
            }
          ]
        },
        {
          "day_name": "Lower A - Quad & Calf Focus",
          "estimated_duration": 75,
          "exercises": [
            {
              "exercise": "Goblet Squat",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Deload. Perfect depth, light weight. RPE 6-7.",
              "alternatives": [
                "Dumbbell Squat",
                "Barbell Back Squat"
              ]
            },
            {
              "exercise": "Leg Press",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Moderate weight. Full ROM.",
              "alternatives": [
                "Hack Squat",
                "Pendulum Squat"
              ]
            },
            {
              "exercise": "Leg Extension",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Light pump work.",
              "alternatives": [
                "Single Leg Extension"
              ]
            },
            {
              "exercise": "Walking Lunge",
              "sets": 2,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Per leg. Bodyweight or light.",
              "alternatives": [
                "Dumbbell Walking Lunge",
                "Lunge"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Maintain calf frequency.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Dumbbell Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "High rep soleus.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            },
            {
              "exercise": "Tibialis Raise",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Maintain prehab.",
              "alternatives": []
            }
          ]
        },
        {
          "day_name": "Upper B - Pull Emphasis",
          "estimated_duration": 75,
          "exercises": [
            {
              "exercise": "Lat Pulldown",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Deload. Smooth reps. RPE 6-7.",
              "alternatives": [
                "Wide Grip Lat Pulldown",
                "Neutral Grip Lat Pulldown"
              ]
            },
            {
              "exercise": "Machine Row",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Controlled squeeze.",
              "alternatives": [
                "Cable Row",
                "Chest Supported Row"
              ]
            },
            {
              "exercise": "Pull Up",
              "sets": 3,
              "reps": "6-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "6"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Bodyweight only. Perfect form.",
              "alternatives": [
                "Assisted Pull Up",
                "Chin Up"
              ]
            },
            {
              "exercise": "Face Pull",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Light weight, external rotation.",
              "alternatives": [
                "Cable Face Pull",
                "Rear Delt Fly"
              ]
            },
            {
              "exercise": "Cable Curl",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Constant tension.",
              "alternatives": [
                "Dumbbell Curl",
                "EZ Bar Curl"
              ]
            },
            {
              "exercise": "Hammer Curl",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Light pump.",
              "alternatives": [
                "Rope Hammer Curl",
                "Cross Body Hammer Curl"
              ]
            }
          ]
        },
        {
          "day_name": "Lower B - Hamstring & Glute Focus",
          "estimated_duration": 75,
          "exercises": [
            {
              "exercise": "Dumbbell Romanian Deadlift",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Deload. Feel the stretch. RPE 6-7.",
              "alternatives": [
                "Romanian Deadlift",
                "Stiff Leg Deadlift"
              ]
            },
            {
              "exercise": "Leg Press (High Foot)",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Light weight. Full ROM.",
              "alternatives": [
                "Belt Squat",
                "Hack Squat"
              ]
            },
            {
              "exercise": "Lying Leg Curl",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Control the negative.",
              "alternatives": [
                "Seated Leg Curl",
                "Leg Curl"
              ]
            },
            {
              "exercise": "Glute Bridge",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Bodyweight or light. Squeeze at top.",
              "alternatives": [
                "Hip Thrust",
                "Single Leg Glute Bridge"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Light calf work.",
              "alternatives": [
                "Dumbbell Calf Raise",
                "Smith Machine Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Easy soleus work.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            }
          ]
        }
      ]
    },
    {
      "block_name": "Block 6 - Hypertrophy Focus (Accumulation)",
      "weeks": "21-24",
      "structure": "Upper Lower",
      "days": [
        {
          "day_name": "Upper A - Push Emphasis",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Dumbbell Bench Press",
              "sets": 4,
              "reps": "8-12",
              "reps_weekly": {
                "1": "12",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Greater ROM. RPE 7-8.",
              "alternatives": [
                "Barbell Bench Press",
                "Machine Chest Press"
              ]
            },
            {
              "exercise": "Incline Dumbbell Press",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Upper chest development.",
              "alternatives": [
                "Incline Barbell Bench Press",
                "Incline Machine Press"
              ]
            },
            {
              "exercise": "Low Cable Fly",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Upper chest squeeze.",
              "alternatives": [
                "Incline Dumbbell Fly",
                "Cable Fly"
              ]
            },
            {
              "exercise": "Push Up",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Finisher. Weighted if needed.",
              "alternatives": [
                "Decline Push Up",
                "Diamond Push Up"
              ]
            },
            {
              "exercise": "Seated Dumbbell Shoulder Press",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Full ROM. Controlled.",
              "alternatives": [
                "Seated Dumbbell Press",
                "Arnold Press"
              ]
            },
            {
              "exercise": "Cable Lateral Raise",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Constant tension.",
              "alternatives": [
                "Lateral Raise",
                "Machine Lateral Raise"
              ]
            },
            {
              "exercise": "V-Bar Pushdown",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Full lockout.",
              "alternatives": [
                "Tricep Pushdown",
                "Straight Bar Pushdown"
              ]
            },
            {
              "exercise": "Overhead Tricep Extension (Cable)",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Long head stretch.",
              "alternatives": [
                "Overhead Cable Extension",
                "French Press"
              ]
            }
          ]
        },
        {
          "day_name": "Lower A - Quad & Calf Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Barbell Back Squat",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Hypertrophy rep range. RPE 7-8.",
              "alternatives": [
                "High Bar Squat",
                "Safety Bar Squat"
              ]
            },
            {
              "exercise": "Pendulum Squat",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Great quad builder. Deep stretch.",
              "alternatives": [
                "Hack Squat",
                "Leg Press"
              ]
            },
            {
              "exercise": "Leg Press",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Volume work. Full ROM.",
              "alternatives": [
                "Hack Squat",
                "Belt Squat"
              ]
            },
            {
              "exercise": "Leg Extension",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Peak contraction hold.",
              "alternatives": [
                "Single Leg Extension"
              ]
            },
            {
              "exercise": "Sissy Squat",
              "sets": 3,
              "reps": "10-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Rectus femoris emphasis. Use assistance if needed.",
              "alternatives": [
                "Leg Extension",
                "Goblet Squat"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 5,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Full stretch at bottom.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Donkey Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 4,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Soleus volume.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            },
            {
              "exercise": "Tibialis Raise",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Shin prehab.",
              "alternatives": []
            }
          ]
        },
        {
          "day_name": "Upper B - Pull Emphasis",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Pull Up",
              "sets": 4,
              "reps": "8-12",
              "reps_weekly": {
                "1": "12",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Hypertrophy focus. Add weight at top of range.",
              "alternatives": [
                "Chin Up",
                "Wide Grip Pull Up"
              ]
            },
            {
              "exercise": "Chest Supported Row",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Strict form. Squeeze at top.",
              "alternatives": [
                "Seal Row",
                "Machine Row"
              ]
            },
            {
              "exercise": "Single Arm Cable Row",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 75,
              "restQuick": 45,
              "notes": "Per arm. Stretch and squeeze.",
              "alternatives": [
                "Dumbbell Row",
                "Cable Row"
              ]
            },
            {
              "exercise": "Neutral Grip Lat Pulldown",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Great lat stretch.",
              "alternatives": [
                "Lat Pulldown",
                "Close Grip Lat Pulldown"
              ]
            },
            {
              "exercise": "Machine Rear Delt Fly",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Rear delt pump.",
              "alternatives": [
                "Rear Delt Fly",
                "Cable Rear Delt Fly"
              ]
            },
            {
              "exercise": "Face Pull",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "External rotation at end.",
              "alternatives": [
                "Cable Face Pull"
              ]
            },
            {
              "exercise": "EZ Bar Curl",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Strict form.",
              "alternatives": [
                "Barbell Curl",
                "Dumbbell Curl"
              ]
            },
            {
              "exercise": "Incline Dumbbell Curl",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Long head stretch.",
              "alternatives": [
                "Bayesian Cable Curl",
                "Spider Curl"
              ]
            },
            {
              "exercise": "Reverse Curl",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Brachioradialis and forearms.",
              "alternatives": [
                "EZ Bar Reverse Curl",
                "Hammer Curl"
              ]
            }
          ]
        },
        {
          "day_name": "Lower B - Hamstring & Glute Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Romanian Deadlift",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Deep stretch. RPE 7-8.",
              "alternatives": [
                "Stiff Leg Deadlift",
                "Dumbbell Romanian Deadlift"
              ]
            },
            {
              "exercise": "Belt Squat",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Spine-friendly squat pattern.",
              "alternatives": [
                "Leg Press (High Foot)",
                "Hack Squat"
              ]
            },
            {
              "exercise": "Bulgarian Split Squat",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Per leg. Forward lean for glutes.",
              "alternatives": [
                "Dumbbell Bulgarian Split Squat",
                "Deficit Reverse Lunge"
              ]
            },
            {
              "exercise": "Seated Leg Curl",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Full ROM. Squeeze at contraction.",
              "alternatives": [
                "Lying Leg Curl",
                "Leg Curl"
              ]
            },
            {
              "exercise": "Hip Thrust",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Full lockout squeeze.",
              "alternatives": [
                "Machine Hip Thrust",
                "Barbell Glute Bridge"
              ]
            },
            {
              "exercise": "Cable Glute Kickback",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Per leg. Glute isolation.",
              "alternatives": [
                "Machine Kickback",
                "Donkey Kick"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "2 sec pause at stretch.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Donkey Calf Raise"
              ]
            },
            {
              "exercise": "Leg Press Calf Raise",
              "sets": 4,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "High rep calf finisher.",
              "alternatives": [
                "Seated Calf Raise",
                "Single Leg Calf Raise"
              ]
            }
          ]
        }
      ]
    },
    {
      "block_name": "Block 7 - Strength Phase 3 (Intensification)",
      "weeks": "25-28",
      "structure": "Upper Lower",
      "days": [
        {
          "day_name": "Upper A - Push Emphasis",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Barbell Bench Press",
              "sets": 5,
              "reps": "5-8",
              "reps_weekly": {
                "1": "8",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 210,
              "restQuick": 150,
              "notes": "Strength building. RPE 8.",
              "alternatives": [
                "Dumbbell Bench Press",
                "Smith Machine Bench Press"
              ]
            },
            {
              "exercise": "Incline Barbell Bench Press",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Upper chest strength.",
              "alternatives": [
                "Incline Dumbbell Press",
                "Smith Machine Incline Press"
              ]
            },
            {
              "exercise": "Dip",
              "sets": 4,
              "reps": "6-10",
              "reps_weekly": {
                "1": "10",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Weighted. Progressive overload.",
              "alternatives": [
                "Chest Dip",
                "Machine Dip"
              ]
            },
            {
              "exercise": "Push Up",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Weighted if possible.",
              "alternatives": [
                "Decline Push Up",
                "Diamond Push Up"
              ]
            },
            {
              "exercise": "Overhead Press",
              "sets": 4,
              "reps": "5-8",
              "reps_weekly": {
                "1": "8",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Standing strict press.",
              "alternatives": [
                "Seated Barbell Press",
                "Push Press"
              ]
            },
            {
              "exercise": "Lateral Raise",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Side delt volume.",
              "alternatives": [
                "Cable Lateral Raise",
                "Machine Lateral Raise"
              ]
            },
            {
              "exercise": "Close Grip Bench Press",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Tricep strength.",
              "alternatives": [
                "JM Press",
                "Floor Press"
              ]
            },
            {
              "exercise": "Skull Crusher",
              "sets": 3,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 75,
              "restQuick": 45,
              "notes": "Control the descent.",
              "alternatives": [
                "Dumbbell Skull Crusher",
                "French Press"
              ]
            }
          ]
        },
        {
          "day_name": "Lower A - Quad & Calf Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Barbell Back Squat",
              "sets": 5,
              "reps": "5-8",
              "reps_weekly": {
                "1": "8",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 240,
              "restQuick": 150,
              "notes": "Strength squat. RPE 8.",
              "alternatives": [
                "Low Bar Squat",
                "Safety Bar Squat"
              ]
            },
            {
              "exercise": "Pause Squat",
              "sets": 3,
              "reps": "5-6",
              "reps_weekly": {
                "1": "6",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "2-3 sec pause at bottom. Builds strength out of hole.",
              "alternatives": [
                "Paused Squat",
                "Box Squat"
              ]
            },
            {
              "exercise": "Leg Press",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Heavy leg press.",
              "alternatives": [
                "Hack Squat",
                "Pendulum Squat"
              ]
            },
            {
              "exercise": "Leg Extension",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Quad pump after compounds.",
              "alternatives": [
                "Single Leg Extension"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 5,
              "reps": "8-12",
              "reps_weekly": {
                "1": "12",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Heavy calf raises.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Donkey Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Heavier soleus work.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            },
            {
              "exercise": "Tibialis Raise",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Maintain prehab.",
              "alternatives": []
            }
          ]
        },
        {
          "day_name": "Upper B - Pull Emphasis",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Wide Grip Pull Up",
              "sets": 5,
              "reps": "5-8",
              "reps_weekly": {
                "1": "8",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Weighted. Wide lat activation.",
              "alternatives": [
                "Pull Up",
                "Chin Up"
              ]
            },
            {
              "exercise": "Pendlay Row",
              "sets": 4,
              "reps": "5-6",
              "reps_weekly": {
                "1": "6",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Explosive off floor.",
              "alternatives": [
                "Barbell Row",
                "T-Bar Row"
              ]
            },
            {
              "exercise": "Dumbbell Row",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Heavy single arm work.",
              "alternatives": [
                "Kroc Row",
                "Meadows Row"
              ]
            },
            {
              "exercise": "Lat Pulldown",
              "sets": 3,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Stretch and squeeze.",
              "alternatives": [
                "Wide Grip Lat Pulldown",
                "Neutral Grip Lat Pulldown"
              ]
            },
            {
              "exercise": "Face Pull",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Shoulder health priority.",
              "alternatives": [
                "Cable Face Pull",
                "Rear Delt Fly"
              ]
            },
            {
              "exercise": "Barbell Curl",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Heavy curls.",
              "alternatives": [
                "EZ Bar Curl",
                "Dumbbell Curl"
              ]
            },
            {
              "exercise": "Preacher Curl",
              "sets": 3,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Strict isolation.",
              "alternatives": [
                "Dumbbell Preacher Curl",
                "Machine Preacher Curl"
              ]
            },
            {
              "exercise": "Hammer Curl",
              "sets": 3,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Brachialis strength.",
              "alternatives": [
                "Rope Hammer Curl",
                "Cross Body Hammer Curl"
              ]
            }
          ]
        },
        {
          "day_name": "Lower B - Hamstring & Glute Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Trap Bar Deadlift",
              "sets": 5,
              "reps": "5-6",
              "reps_weekly": {
                "1": "6",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 240,
              "restQuick": 150,
              "notes": "Heavy pulls. Neutral spine.",
              "alternatives": [
                "Conventional Deadlift",
                "Sumo Deadlift"
              ]
            },
            {
              "exercise": "Romanian Deadlift",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Heavy hamstring work.",
              "alternatives": [
                "Stiff Leg Deadlift",
                "Dumbbell Romanian Deadlift"
              ]
            },
            {
              "exercise": "Bulgarian Split Squat",
              "sets": 3,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Per leg. Heavy unilateral.",
              "alternatives": [
                "Dumbbell Bulgarian Split Squat",
                "Barbell Bulgarian Split Squat"
              ]
            },
            {
              "exercise": "Lying Leg Curl",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 75,
              "restQuick": 45,
              "notes": "Heavier hamstring curls.",
              "alternatives": [
                "Seated Leg Curl",
                "Leg Curl"
              ]
            },
            {
              "exercise": "Hip Thrust",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Heavy glute work.",
              "alternatives": [
                "Machine Hip Thrust",
                "Barbell Glute Bridge"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 75,
              "restQuick": 45,
              "notes": "Heavy calf work.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Donkey Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Heavier soleus.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            }
          ]
        }
      ]
    },
    {
      "block_name": "Block 8 - Volume Accumulation Phase 3",
      "weeks": "29-32",
      "structure": "Upper Lower",
      "days": [
        {
          "day_name": "Upper A - Push Emphasis",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Incline Dumbbell Press",
              "sets": 4,
              "reps": "8-12",
              "reps_weekly": {
                "1": "12",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Start with incline this block. RPE 7-8.",
              "alternatives": [
                "Incline Barbell Bench Press",
                "Incline Machine Press"
              ]
            },
            {
              "exercise": "Dumbbell Bench Press",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Full ROM. Control the stretch.",
              "alternatives": [
                "Barbell Bench Press",
                "Machine Chest Press"
              ]
            },
            {
              "exercise": "Cable Fly",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Constant tension. Peak squeeze.",
              "alternatives": [
                "Pec Deck",
                "Dumbbell Fly"
              ]
            },
            {
              "exercise": "Push Up",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Finisher. Add weight as needed.",
              "alternatives": [
                "Decline Push Up",
                "Incline Push Up"
              ]
            },
            {
              "exercise": "Arnold Press",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Full rotation. Shoulder volume.",
              "alternatives": [
                "Seated Dumbbell Press",
                "Dumbbell Shoulder Press"
              ]
            },
            {
              "exercise": "Leaning Lateral Raise",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Per arm. Longer range of motion.",
              "alternatives": [
                "Lateral Raise",
                "Cable Lateral Raise"
              ]
            },
            {
              "exercise": "Rope Pushdown",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Spread at bottom. Full extension.",
              "alternatives": [
                "Tricep Pushdown",
                "V-Bar Pushdown"
              ]
            },
            {
              "exercise": "French Press",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Long head stretch.",
              "alternatives": [
                "Overhead Tricep Extension",
                "Overhead Cable Extension"
              ]
            }
          ]
        },
        {
          "day_name": "Lower A - Quad & Calf Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Front Squat",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Lead with front squat this block. RPE 7-8.",
              "alternatives": [
                "High Bar Squat",
                "Goblet Squat"
              ]
            },
            {
              "exercise": "Hack Squat",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Deep stretch. Quad focused.",
              "alternatives": [
                "Leg Press",
                "Pendulum Squat"
              ]
            },
            {
              "exercise": "Leg Press",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Volume accumulation.",
              "alternatives": [
                "Pendulum Squat",
                "Belt Squat"
              ]
            },
            {
              "exercise": "Leg Extension",
              "sets": 4,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "High rep quad pump.",
              "alternatives": [
                "Single Leg Extension"
              ]
            },
            {
              "exercise": "Reverse Lunge",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Per leg. Step back for quad emphasis.",
              "alternatives": [
                "Dumbbell Reverse Lunge",
                "Deficit Reverse Lunge"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 5,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Volume phase. Full ROM.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Donkey Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 4,
              "reps": "20-25",
              "reps_weekly": {
                "1": "25",
                "2": "25",
                "3": "20",
                "4": "20"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "High rep soleus.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            },
            {
              "exercise": "Tibialis Raise",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Shin prehab.",
              "alternatives": []
            }
          ]
        },
        {
          "day_name": "Upper B - Pull Emphasis",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Neutral Grip Pull Up",
              "sets": 4,
              "reps": "8-12",
              "reps_weekly": {
                "1": "12",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Neutral grip for joint-friendly pulling.",
              "alternatives": [
                "Pull Up",
                "Chin Up"
              ]
            },
            {
              "exercise": "T-Bar Row",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Squeeze at top. Thick back.",
              "alternatives": [
                "Barbell Row",
                "Chest Supported Row"
              ]
            },
            {
              "exercise": "Cable Row",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Stretch and contract.",
              "alternatives": [
                "Wide Grip Cable Row",
                "Machine Row"
              ]
            },
            {
              "exercise": "Pull Up",
              "sets": 3,
              "reps": "6-10",
              "reps_weekly": {
                "1": "10",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Second vertical pull. Weighted if needed.",
              "alternatives": [
                "Wide Grip Pull Up",
                "Lat Pulldown"
              ]
            },
            {
              "exercise": "Straight Arm Pulldown",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Lat isolation.",
              "alternatives": [
                "Lat Pulldown"
              ]
            },
            {
              "exercise": "Incline Rear Delt Fly",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Face down on incline. Great rear delt isolation.",
              "alternatives": [
                "Rear Delt Fly",
                "Machine Rear Delt Fly"
              ]
            },
            {
              "exercise": "Alternating Dumbbell Curl",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Per arm. Focus on each rep.",
              "alternatives": [
                "Dumbbell Curl",
                "Barbell Curl"
              ]
            },
            {
              "exercise": "Concentration Curl",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Peak contraction. Mind-muscle connection.",
              "alternatives": [
                "Spider Curl",
                "Preacher Curl"
              ]
            },
            {
              "exercise": "Hammer Curl",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Brachialis pump.",
              "alternatives": [
                "Rope Hammer Curl",
                "Cross Body Hammer Curl"
              ]
            }
          ]
        },
        {
          "day_name": "Lower B - Hamstring & Glute Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Good Morning",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Light to moderate. Posterior chain activation.",
              "alternatives": [
                "Romanian Deadlift",
                "Stiff Leg Deadlift"
              ]
            },
            {
              "exercise": "Leg Press (High Foot)",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "High foot for glutes and hams.",
              "alternatives": [
                "Belt Squat",
                "Hack Squat"
              ]
            },
            {
              "exercise": "Dumbbell Bulgarian Split Squat",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Per leg. Volume focus.",
              "alternatives": [
                "Bulgarian Split Squat",
                "Reverse Lunge"
              ]
            },
            {
              "exercise": "Lying Leg Curl",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Control eccentric.",
              "alternatives": [
                "Seated Leg Curl",
                "Single Leg Curl"
              ]
            },
            {
              "exercise": "Hip Thrust",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Volume. Full squeeze.",
              "alternatives": [
                "Machine Hip Thrust",
                "Barbell Glute Bridge"
              ]
            },
            {
              "exercise": "Hyperextension",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Lower back and glute work.",
              "alternatives": [
                "Back Extension",
                "Reverse Hyperextension"
              ]
            },
            {
              "exercise": "Donkey Calf Raise",
              "sets": 4,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Different angle variation.",
              "alternatives": [
                "Standing Calf Raise",
                "Smith Machine Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 4,
              "reps": "20-25",
              "reps_weekly": {
                "1": "25",
                "2": "25",
                "3": "20",
                "4": "20"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "High rep soleus volume.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            }
          ]
        }
      ]
    },
    {
      "block_name": "Block 9 - Peak Strength (Intensification)",
      "weeks": "33-36",
      "structure": "Upper Lower",
      "days": [
        {
          "day_name": "Upper A - Push Emphasis",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Barbell Bench Press",
              "sets": 5,
              "reps": "3-6",
              "reps_weekly": {
                "1": "6",
                "2": "5",
                "3": "4",
                "4": "3"
              },
              "rest": 240,
              "restQuick": 150,
              "notes": "Peak strength. Near maximal loads. RPE 8-9.",
              "alternatives": [
                "Dumbbell Bench Press",
                "Smith Machine Bench Press"
              ]
            },
            {
              "exercise": "Incline Barbell Bench Press",
              "sets": 4,
              "reps": "5-6",
              "reps_weekly": {
                "1": "6",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Heavy incline pressing.",
              "alternatives": [
                "Incline Dumbbell Press",
                "Smith Machine Incline Press"
              ]
            },
            {
              "exercise": "Dip",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Heavy weighted dips.",
              "alternatives": [
                "Chest Dip",
                "Machine Dip"
              ]
            },
            {
              "exercise": "Push Up",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Weighted. Maintain push pattern.",
              "alternatives": [
                "Decline Push Up",
                "Diamond Push Up"
              ]
            },
            {
              "exercise": "Push Press",
              "sets": 4,
              "reps": "4-6",
              "reps_weekly": {
                "1": "6",
                "2": "5",
                "3": "4",
                "4": "4"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Leg drive for overload. Peak pressing.",
              "alternatives": [
                "Overhead Press",
                "Military Press"
              ]
            },
            {
              "exercise": "Lateral Raise",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Side delt volume.",
              "alternatives": [
                "Cable Lateral Raise",
                "Machine Lateral Raise"
              ]
            },
            {
              "exercise": "Close Grip Bench Press",
              "sets": 4,
              "reps": "5-6",
              "reps_weekly": {
                "1": "6",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Heavy tricep pressing.",
              "alternatives": [
                "JM Press",
                "Floor Press"
              ]
            },
            {
              "exercise": "Dip",
              "sets": 3,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Upright for triceps.",
              "alternatives": [
                "Tricep Dip",
                "Bench Dip"
              ]
            }
          ]
        },
        {
          "day_name": "Lower A - Quad & Calf Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Barbell Back Squat",
              "sets": 5,
              "reps": "3-5",
              "reps_weekly": {
                "1": "5",
                "2": "4",
                "3": "3",
                "4": "3"
              },
              "rest": 270,
              "restQuick": 180,
              "notes": "Peak squat strength. Near max loads. RPE 8-9.",
              "alternatives": [
                "Low Bar Squat",
                "Safety Bar Squat"
              ]
            },
            {
              "exercise": "Pause Squat",
              "sets": 3,
              "reps": "3-5",
              "reps_weekly": {
                "1": "5",
                "2": "4",
                "3": "3",
                "4": "3"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "3 sec pause. Builds bottom strength.",
              "alternatives": [
                "Paused Squat",
                "Box Squat"
              ]
            },
            {
              "exercise": "Leg Press",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Heavy leg press.",
              "alternatives": [
                "Hack Squat",
                "Pendulum Squat"
              ]
            },
            {
              "exercise": "Leg Extension",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Pump after heavy work.",
              "alternatives": [
                "Single Leg Extension"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 5,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Heavy calf work.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Donkey Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Heavier soleus.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            },
            {
              "exercise": "Tibialis Raise",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Shin prehab.",
              "alternatives": []
            }
          ]
        },
        {
          "day_name": "Upper B - Pull Emphasis",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Pull Up",
              "sets": 5,
              "reps": "3-6",
              "reps_weekly": {
                "1": "6",
                "2": "5",
                "3": "4",
                "4": "3"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Heavy weighted. Peak pulling strength.",
              "alternatives": [
                "Chin Up",
                "Neutral Grip Pull Up"
              ]
            },
            {
              "exercise": "Barbell Row",
              "sets": 5,
              "reps": "4-6",
              "reps_weekly": {
                "1": "6",
                "2": "5",
                "3": "4",
                "4": "4"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Heavy rows. Slight momentum okay.",
              "alternatives": [
                "Pendlay Row",
                "T-Bar Row"
              ]
            },
            {
              "exercise": "Dumbbell Row",
              "sets": 4,
              "reps": "5-8",
              "reps_weekly": {
                "1": "8",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Heavy dumbbells.",
              "alternatives": [
                "Kroc Row",
                "Meadows Row"
              ]
            },
            {
              "exercise": "Lat Pulldown",
              "sets": 3,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Maintain vertical pull volume.",
              "alternatives": [
                "Wide Grip Lat Pulldown",
                "Neutral Grip Lat Pulldown"
              ]
            },
            {
              "exercise": "Face Pull",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Shoulder health critical.",
              "alternatives": [
                "Cable Face Pull",
                "Rear Delt Fly"
              ]
            },
            {
              "exercise": "Barbell Curl",
              "sets": 4,
              "reps": "5-8",
              "reps_weekly": {
                "1": "8",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Heavy curls.",
              "alternatives": [
                "EZ Bar Curl",
                "Dumbbell Curl"
              ]
            },
            {
              "exercise": "Preacher Curl",
              "sets": 3,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Strict isolation.",
              "alternatives": [
                "Dumbbell Preacher Curl",
                "Machine Preacher Curl"
              ]
            },
            {
              "exercise": "Hammer Curl",
              "sets": 3,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Brachialis strength.",
              "alternatives": [
                "Rope Hammer Curl",
                "Cross Body Hammer Curl"
              ]
            }
          ]
        },
        {
          "day_name": "Lower B - Hamstring & Glute Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Conventional Deadlift",
              "sets": 5,
              "reps": "3-5",
              "reps_weekly": {
                "1": "5",
                "2": "4",
                "3": "3",
                "4": "3"
              },
              "rest": 270,
              "restQuick": 180,
              "notes": "Peak deadlift strength. RPE 8-9.",
              "alternatives": [
                "Sumo Deadlift",
                "Trap Bar Deadlift"
              ]
            },
            {
              "exercise": "Deficit Deadlift",
              "sets": 3,
              "reps": "4-6",
              "reps_weekly": {
                "1": "6",
                "2": "5",
                "3": "4",
                "4": "4"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "2-3 inch deficit. Builds off-floor strength.",
              "alternatives": [
                "Romanian Deadlift",
                "Paused Deadlift"
              ]
            },
            {
              "exercise": "Bulgarian Split Squat",
              "sets": 3,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Per leg. Heavy unilateral.",
              "alternatives": [
                "Barbell Bulgarian Split Squat",
                "Dumbbell Bulgarian Split Squat"
              ]
            },
            {
              "exercise": "Glute Ham Raise",
              "sets": 4,
              "reps": "6-10",
              "reps_weekly": {
                "1": "10",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Full hamstring activation.",
              "alternatives": [
                "Nordic Curl",
                "Lying Leg Curl"
              ]
            },
            {
              "exercise": "Hip Thrust",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Heavy glute work.",
              "alternatives": [
                "Machine Hip Thrust",
                "Barbell Glute Bridge"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 75,
              "restQuick": 45,
              "notes": "Heavy calf raises.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Donkey Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Heavier soleus.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            }
          ]
        }
      ]
    },
    {
      "block_name": "Block 10 - Active Recovery & Transition 2 (Deload)",
      "weeks": "37-40",
      "structure": "Upper Lower",
      "days": [
        {
          "day_name": "Upper A - Push Emphasis",
          "estimated_duration": 75,
          "exercises": [
            {
              "exercise": "Machine Chest Press",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Deload. Light weight, good form. RPE 6-7.",
              "alternatives": [
                "Barbell Bench Press",
                "Dumbbell Bench Press"
              ]
            },
            {
              "exercise": "Incline Dumbbell Press",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Light and controlled.",
              "alternatives": [
                "Incline Machine Press",
                "Incline Barbell Bench Press"
              ]
            },
            {
              "exercise": "Cable Fly",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Pump work.",
              "alternatives": [
                "Pec Deck",
                "Dumbbell Fly"
              ]
            },
            {
              "exercise": "Push Up",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Bodyweight only.",
              "alternatives": [
                "Incline Push Up"
              ]
            },
            {
              "exercise": "Dumbbell Shoulder Press",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Light pressing.",
              "alternatives": [
                "Seated Dumbbell Press",
                "Machine Shoulder Press"
              ]
            },
            {
              "exercise": "Lateral Raise",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Light pump.",
              "alternatives": [
                "Cable Lateral Raise",
                "Machine Lateral Raise"
              ]
            },
            {
              "exercise": "Tricep Pushdown",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Easy tricep work.",
              "alternatives": [
                "Rope Pushdown",
                "V-Bar Pushdown"
              ]
            }
          ]
        },
        {
          "day_name": "Lower A - Quad & Calf Focus",
          "estimated_duration": 75,
          "exercises": [
            {
              "exercise": "Goblet Squat",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Deload. Light and controlled. RPE 6-7.",
              "alternatives": [
                "Dumbbell Squat",
                "Barbell Back Squat"
              ]
            },
            {
              "exercise": "Leg Press",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Moderate weight.",
              "alternatives": [
                "Hack Squat",
                "Pendulum Squat"
              ]
            },
            {
              "exercise": "Leg Extension",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Light quad pump.",
              "alternatives": [
                "Single Leg Extension"
              ]
            },
            {
              "exercise": "Lunge",
              "sets": 2,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Per leg. Bodyweight or light.",
              "alternatives": [
                "Dumbbell Lunge",
                "Walking Lunge"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 4,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Maintain calf frequency.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Dumbbell Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Light soleus work.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            },
            {
              "exercise": "Tibialis Raise",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Maintain prehab.",
              "alternatives": []
            }
          ]
        },
        {
          "day_name": "Upper B - Pull Emphasis",
          "estimated_duration": 75,
          "exercises": [
            {
              "exercise": "Lat Pulldown",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Deload. Smooth reps. RPE 6-7.",
              "alternatives": [
                "Wide Grip Lat Pulldown",
                "Neutral Grip Lat Pulldown"
              ]
            },
            {
              "exercise": "Machine Row",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Controlled rows.",
              "alternatives": [
                "Cable Row",
                "Chest Supported Row"
              ]
            },
            {
              "exercise": "Pull Up",
              "sets": 3,
              "reps": "6-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "6"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Bodyweight only.",
              "alternatives": [
                "Assisted Pull Up",
                "Chin Up"
              ]
            },
            {
              "exercise": "Face Pull",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Light shoulder health work.",
              "alternatives": [
                "Cable Face Pull",
                "Rear Delt Fly"
              ]
            },
            {
              "exercise": "Dumbbell Curl",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Light curls.",
              "alternatives": [
                "Cable Curl",
                "EZ Bar Curl"
              ]
            },
            {
              "exercise": "Hammer Curl",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Light pump.",
              "alternatives": [
                "Rope Hammer Curl",
                "Cross Body Hammer Curl"
              ]
            }
          ]
        },
        {
          "day_name": "Lower B - Hamstring & Glute Focus",
          "estimated_duration": 75,
          "exercises": [
            {
              "exercise": "Dumbbell Romanian Deadlift",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Deload. Light stretch. RPE 6-7.",
              "alternatives": [
                "Romanian Deadlift",
                "Stiff Leg Deadlift"
              ]
            },
            {
              "exercise": "Leg Press (High Foot)",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Light weight.",
              "alternatives": [
                "Belt Squat",
                "Hack Squat"
              ]
            },
            {
              "exercise": "Lying Leg Curl",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Control the movement.",
              "alternatives": [
                "Seated Leg Curl",
                "Leg Curl"
              ]
            },
            {
              "exercise": "Glute Bridge",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Light glute activation.",
              "alternatives": [
                "Hip Thrust",
                "Single Leg Glute Bridge"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Light calf work.",
              "alternatives": [
                "Dumbbell Calf Raise",
                "Smith Machine Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Easy soleus.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            }
          ]
        }
      ]
    },
    {
      "block_name": "Block 11 - Final Hypertrophy Push (Accumulation)",
      "weeks": "41-44",
      "structure": "Upper Lower",
      "days": [
        {
          "day_name": "Upper A - Horizontal Push Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Dumbbell Bench Press",
              "sets": 4,
              "reps": "8-12",
              "reps_weekly": {
                "1": "12",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Maximum stretch and contraction. RPE 7-8.",
              "alternatives": [
                "Barbell Bench Press",
                "Machine Chest Press"
              ]
            },
            {
              "exercise": "Incline Dumbbell Press",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Upper chest development.",
              "alternatives": [
                "Incline Barbell Bench Press",
                "Incline Machine Press"
              ]
            },
            {
              "exercise": "Cable Fly",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Constant tension. Peak contraction squeeze.",
              "alternatives": [
                "Pec Deck",
                "Dumbbell Fly"
              ]
            },
            {
              "exercise": "Push Up",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Weighted if possible. Full ROM.",
              "alternatives": [
                "Decline Push Up",
                "Diamond Push Up"
              ]
            },
            {
              "exercise": "Cable Row",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Stretch and squeeze.",
              "alternatives": [
                "Machine Row",
                "Chest Supported Row"
              ]
            },
            {
              "exercise": "Dumbbell Row",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Drive elbow back.",
              "alternatives": [
                "Meadows Row",
                "T-Bar Row"
              ]
            },
            {
              "exercise": "Lateral Raise",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Light weight, high reps.",
              "alternatives": [
                "Cable Lateral Raise",
                "Machine Lateral Raise"
              ]
            },
            {
              "exercise": "EZ Bar Curl",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "No swing, control negative.",
              "alternatives": [
                "Barbell Curl",
                "Cable Curl"
              ]
            },
            {
              "exercise": "Rope Pushdown",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Spread at bottom for full contraction.",
              "alternatives": [
                "Tricep Pushdown",
                "V-Bar Pushdown"
              ]
            }
          ]
        },
        {
          "day_name": "Lower A - Quad Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Barbell Back Squat",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Hypertrophy focus. Deep squats. RPE 7-8.",
              "alternatives": [
                "High Bar Squat",
                "Safety Bar Squat"
              ]
            },
            {
              "exercise": "Leg Press",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Volume work. Full ROM.",
              "alternatives": [
                "Hack Squat",
                "Pendulum Squat"
              ]
            },
            {
              "exercise": "Hack Squat",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Quad focused. Deep stretch.",
              "alternatives": [
                "Pendulum Squat",
                "Leg Press"
              ]
            },
            {
              "exercise": "Leg Extension",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Quad isolation. Squeeze at top.",
              "alternatives": [
                "Single Leg Extension"
              ]
            },
            {
              "exercise": "Dumbbell Walking Lunge",
              "sets": 3,
              "reps": "12-14",
              "reps_weekly": {
                "1": "14",
                "2": "14",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Per leg. Upright torso.",
              "alternatives": [
                "Walking Lunge",
                "Dumbbell Lunge"
              ]
            },
            {
              "exercise": "Lying Leg Curl",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Hamstring balance.",
              "alternatives": [
                "Seated Leg Curl",
                "Leg Curl"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 5,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "High volume for calf priority.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Donkey Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 4,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Soleus volume.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            },
            {
              "exercise": "Tibialis Raise",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Shin prehab.",
              "alternatives": []
            }
          ]
        },
        {
          "day_name": "Upper B - Vertical Push Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Pull Up",
              "sets": 4,
              "reps": "8-12",
              "reps_weekly": {
                "1": "12",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Hypertrophy focus. Add weight at top of range.",
              "alternatives": [
                "Chin Up",
                "Wide Grip Pull Up"
              ]
            },
            {
              "exercise": "Overhead Press",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Strict form. Full lockout.",
              "alternatives": [
                "Seated Barbell Press",
                "Push Press"
              ]
            },
            {
              "exercise": "Neutral Grip Lat Pulldown",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Great lat stretch and squeeze.",
              "alternatives": [
                "Lat Pulldown",
                "Close Grip Lat Pulldown"
              ]
            },
            {
              "exercise": "Seated Dumbbell Press",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Full ROM pressing.",
              "alternatives": [
                "Arnold Press",
                "Machine Shoulder Press"
              ]
            },
            {
              "exercise": "T-Bar Row",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Thick back builder.",
              "alternatives": [
                "Barbell Row",
                "Chest Supported Row"
              ]
            },
            {
              "exercise": "Rear Delt Fly",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Rear delt volume.",
              "alternatives": [
                "Machine Rear Delt Fly",
                "Cable Rear Delt Fly"
              ]
            },
            {
              "exercise": "Face Pull",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Shoulder health.",
              "alternatives": [
                "Cable Face Pull"
              ]
            },
            {
              "exercise": "Incline Dumbbell Curl",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Long head stretch.",
              "alternatives": [
                "Bayesian Cable Curl",
                "Spider Curl"
              ]
            },
            {
              "exercise": "Overhead Cable Extension",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Long head emphasis.",
              "alternatives": [
                "Overhead Tricep Extension",
                "French Press"
              ]
            }
          ]
        },
        {
          "day_name": "Lower B - Posterior Chain Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Romanian Deadlift",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Deep hamstring stretch. RPE 7-8.",
              "alternatives": [
                "Stiff Leg Deadlift",
                "Dumbbell Romanian Deadlift"
              ]
            },
            {
              "exercise": "Leg Press (High Foot)",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Glute and hamstring emphasis.",
              "alternatives": [
                "Belt Squat",
                "Hack Squat"
              ]
            },
            {
              "exercise": "Bulgarian Split Squat",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Per leg. Forward lean for glutes.",
              "alternatives": [
                "Dumbbell Bulgarian Split Squat",
                "Reverse Lunge"
              ]
            },
            {
              "exercise": "Seated Leg Curl",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Full ROM hamstring work.",
              "alternatives": [
                "Lying Leg Curl",
                "Leg Curl"
              ]
            },
            {
              "exercise": "Hip Thrust",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Full glute squeeze at lockout.",
              "alternatives": [
                "Machine Hip Thrust",
                "Barbell Glute Bridge"
              ]
            },
            {
              "exercise": "Hyperextension",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Lower back and glute work.",
              "alternatives": [
                "Back Extension",
                "Reverse Hyperextension"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Full ROM. Pause at stretch.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Donkey Calf Raise"
              ]
            },
            {
              "exercise": "Leg Press Calf Raise",
              "sets": 4,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Calf finisher.",
              "alternatives": [
                "Seated Calf Raise",
                "Single Leg Calf Raise"
              ]
            }
          ]
        }
      ]
    },
    {
      "block_name": "Block 12 - Peak & Consolidation (Intensification)",
      "weeks": "45-48",
      "structure": "Upper Lower",
      "days": [
        {
          "day_name": "Upper A - Horizontal Push Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Barbell Bench Press",
              "sets": 5,
              "reps": "4-8",
              "reps_weekly": {
                "1": "8",
                "2": "6",
                "3": "5",
                "4": "4"
              },
              "rest": 210,
              "restQuick": 150,
              "notes": "Peak pressing strength. RPE 8-9.",
              "alternatives": [
                "Dumbbell Bench Press",
                "Smith Machine Bench Press"
              ]
            },
            {
              "exercise": "Incline Barbell Bench Press",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Heavy incline.",
              "alternatives": [
                "Incline Dumbbell Press",
                "Smith Machine Incline Press"
              ]
            },
            {
              "exercise": "Dip",
              "sets": 4,
              "reps": "6-10",
              "reps_weekly": {
                "1": "10",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Weighted. Progressive overload.",
              "alternatives": [
                "Chest Dip",
                "Machine Dip"
              ]
            },
            {
              "exercise": "Push Up",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Weighted if possible.",
              "alternatives": [
                "Decline Push Up",
                "Diamond Push Up"
              ]
            },
            {
              "exercise": "Barbell Row",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Heavy rows.",
              "alternatives": [
                "Pendlay Row",
                "T-Bar Row"
              ]
            },
            {
              "exercise": "Dumbbell Row",
              "sets": 3,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Heavy single arm work.",
              "alternatives": [
                "Kroc Row",
                "Meadows Row"
              ]
            },
            {
              "exercise": "Lateral Raise",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Side delt work.",
              "alternatives": [
                "Cable Lateral Raise",
                "Machine Lateral Raise"
              ]
            },
            {
              "exercise": "Barbell Curl",
              "sets": 3,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 75,
              "restQuick": 45,
              "notes": "Heavier curls.",
              "alternatives": [
                "EZ Bar Curl",
                "Dumbbell Curl"
              ]
            },
            {
              "exercise": "Close Grip Bench Press",
              "sets": 3,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 120,
              "restQuick": 90,
              "notes": "Heavy tricep pressing.",
              "alternatives": [
                "JM Press",
                "Floor Press"
              ]
            }
          ]
        },
        {
          "day_name": "Lower A - Quad Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Barbell Back Squat",
              "sets": 5,
              "reps": "4-6",
              "reps_weekly": {
                "1": "6",
                "2": "5",
                "3": "4",
                "4": "4"
              },
              "rest": 240,
              "restQuick": 150,
              "notes": "Peak squat strength. RPE 8-9.",
              "alternatives": [
                "Low Bar Squat",
                "Safety Bar Squat"
              ]
            },
            {
              "exercise": "Front Squat",
              "sets": 4,
              "reps": "5-8",
              "reps_weekly": {
                "1": "8",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Heavy quad work.",
              "alternatives": [
                "Hack Squat",
                "Goblet Squat"
              ]
            },
            {
              "exercise": "Leg Press",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Heavy leg press.",
              "alternatives": [
                "Hack Squat",
                "Pendulum Squat"
              ]
            },
            {
              "exercise": "Leg Extension",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Pump after compounds.",
              "alternatives": [
                "Single Leg Extension"
              ]
            },
            {
              "exercise": "Lying Leg Curl",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Hamstring balance.",
              "alternatives": [
                "Seated Leg Curl",
                "Leg Curl"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 5,
              "reps": "8-12",
              "reps_weekly": {
                "1": "12",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 75,
              "restQuick": 45,
              "notes": "Heavier calf work.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Donkey Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Heavier soleus.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            },
            {
              "exercise": "Tibialis Raise",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Shin prehab.",
              "alternatives": []
            }
          ]
        },
        {
          "day_name": "Upper B - Vertical Push Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Pull Up",
              "sets": 5,
              "reps": "4-8",
              "reps_weekly": {
                "1": "8",
                "2": "6",
                "3": "5",
                "4": "4"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Peak weighted pull ups. RPE 8-9.",
              "alternatives": [
                "Chin Up",
                "Neutral Grip Pull Up"
              ]
            },
            {
              "exercise": "Overhead Press",
              "sets": 4,
              "reps": "5-8",
              "reps_weekly": {
                "1": "8",
                "2": "6",
                "3": "5",
                "4": "5"
              },
              "rest": 180,
              "restQuick": 120,
              "notes": "Peak pressing.",
              "alternatives": [
                "Push Press",
                "Seated Barbell Press"
              ]
            },
            {
              "exercise": "Lat Pulldown",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Heavier lat work.",
              "alternatives": [
                "Wide Grip Lat Pulldown",
                "Neutral Grip Lat Pulldown"
              ]
            },
            {
              "exercise": "Arnold Press",
              "sets": 3,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Shoulder volume.",
              "alternatives": [
                "Seated Dumbbell Press",
                "Dumbbell Shoulder Press"
              ]
            },
            {
              "exercise": "Chest Supported Row",
              "sets": 3,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Strict back work.",
              "alternatives": [
                "Seal Row",
                "Machine Row"
              ]
            },
            {
              "exercise": "Face Pull",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Shoulder health priority.",
              "alternatives": [
                "Cable Face Pull",
                "Rear Delt Fly"
              ]
            },
            {
              "exercise": "EZ Bar Curl",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 75,
              "restQuick": 45,
              "notes": "Heavier curls.",
              "alternatives": [
                "Barbell Curl",
                "Dumbbell Curl"
              ]
            },
            {
              "exercise": "Skull Crusher",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 75,
              "restQuick": 45,
              "notes": "Heavy tricep work.",
              "alternatives": [
                "Dumbbell Skull Crusher",
                "French Press"
              ]
            }
          ]
        },
        {
          "day_name": "Lower B - Posterior Chain Focus",
          "estimated_duration": 90,
          "exercises": [
            {
              "exercise": "Conventional Deadlift",
              "sets": 5,
              "reps": "3-5",
              "reps_weekly": {
                "1": "5",
                "2": "4",
                "3": "3",
                "4": "3"
              },
              "rest": 270,
              "restQuick": 180,
              "notes": "Peak deadlift strength. RPE 8-9.",
              "alternatives": [
                "Sumo Deadlift",
                "Trap Bar Deadlift"
              ]
            },
            {
              "exercise": "Romanian Deadlift",
              "sets": 4,
              "reps": "6-8",
              "reps_weekly": {
                "1": "8",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 150,
              "restQuick": 100,
              "notes": "Heavy hamstring stretch.",
              "alternatives": [
                "Stiff Leg Deadlift",
                "Dumbbell Romanian Deadlift"
              ]
            },
            {
              "exercise": "Bulgarian Split Squat",
              "sets": 3,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Per leg. Heavy unilateral.",
              "alternatives": [
                "Dumbbell Bulgarian Split Squat",
                "Barbell Bulgarian Split Squat"
              ]
            },
            {
              "exercise": "Glute Ham Raise",
              "sets": 3,
              "reps": "6-10",
              "reps_weekly": {
                "1": "10",
                "2": "8",
                "3": "6",
                "4": "6"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Advanced hamstring work.",
              "alternatives": [
                "Nordic Curl",
                "Lying Leg Curl"
              ]
            },
            {
              "exercise": "Hip Thrust",
              "sets": 4,
              "reps": "8-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "8"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Heavy glute work.",
              "alternatives": [
                "Machine Hip Thrust",
                "Barbell Glute Bridge"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 4,
              "reps": "10-12",
              "reps_weekly": {
                "1": "12",
                "2": "12",
                "3": "10",
                "4": "10"
              },
              "rest": 75,
              "restQuick": 45,
              "notes": "Heavy calf work.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Donkey Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 4,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Heavier soleus.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            }
          ]
        }
      ]
    },
    {
      "block_name": "Block 13 - Final Deload & Transition",
      "weeks": "49-52",
      "structure": "Upper Lower",
      "days": [
        {
          "day_name": "Upper A - Horizontal Push Focus",
          "estimated_duration": 75,
          "exercises": [
            {
              "exercise": "Machine Chest Press",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Final deload. Light weight, perfect form. RPE 6-7.",
              "alternatives": [
                "Barbell Bench Press",
                "Dumbbell Bench Press"
              ]
            },
            {
              "exercise": "Incline Dumbbell Press",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Light and controlled.",
              "alternatives": [
                "Incline Machine Press",
                "Incline Barbell Bench Press"
              ]
            },
            {
              "exercise": "Push Up",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Bodyweight. Quality reps.",
              "alternatives": [
                "Incline Push Up",
                "Decline Push Up"
              ]
            },
            {
              "exercise": "Cable Row",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Light pulling.",
              "alternatives": [
                "Machine Row",
                "Chest Supported Row"
              ]
            },
            {
              "exercise": "Lateral Raise",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Light pump.",
              "alternatives": [
                "Cable Lateral Raise",
                "Machine Lateral Raise"
              ]
            },
            {
              "exercise": "Cable Curl",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Light curls.",
              "alternatives": [
                "Dumbbell Curl",
                "EZ Bar Curl"
              ]
            },
            {
              "exercise": "Tricep Pushdown",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Easy tricep work.",
              "alternatives": [
                "Rope Pushdown",
                "V-Bar Pushdown"
              ]
            }
          ]
        },
        {
          "day_name": "Lower A - Quad Focus",
          "estimated_duration": 75,
          "exercises": [
            {
              "exercise": "Goblet Squat",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Final deload. Perfect depth, light weight. RPE 6-7.",
              "alternatives": [
                "Dumbbell Squat",
                "Barbell Back Squat"
              ]
            },
            {
              "exercise": "Leg Press",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Moderate weight. Full ROM.",
              "alternatives": [
                "Hack Squat",
                "Pendulum Squat"
              ]
            },
            {
              "exercise": "Leg Extension",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Light quad pump.",
              "alternatives": [
                "Single Leg Extension"
              ]
            },
            {
              "exercise": "Lying Leg Curl",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Light hamstring work.",
              "alternatives": [
                "Seated Leg Curl",
                "Leg Curl"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 4,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Maintain calf frequency.",
              "alternatives": [
                "Smith Machine Calf Raise",
                "Dumbbell Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Light soleus work.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            },
            {
              "exercise": "Tibialis Raise",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Maintain prehab.",
              "alternatives": []
            }
          ]
        },
        {
          "day_name": "Upper B - Vertical Push Focus",
          "estimated_duration": 75,
          "exercises": [
            {
              "exercise": "Lat Pulldown",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Final deload. Smooth reps. RPE 6-7.",
              "alternatives": [
                "Wide Grip Lat Pulldown",
                "Neutral Grip Lat Pulldown"
              ]
            },
            {
              "exercise": "Machine Shoulder Press",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Light pressing.",
              "alternatives": [
                "Seated Dumbbell Press",
                "Dumbbell Shoulder Press"
              ]
            },
            {
              "exercise": "Pull Up",
              "sets": 3,
              "reps": "6-10",
              "reps_weekly": {
                "1": "10",
                "2": "10",
                "3": "8",
                "4": "6"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Bodyweight only. Quality reps.",
              "alternatives": [
                "Assisted Pull Up",
                "Chin Up"
              ]
            },
            {
              "exercise": "Machine Row",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Light back work.",
              "alternatives": [
                "Cable Row",
                "Chest Supported Row"
              ]
            },
            {
              "exercise": "Rear Delt Fly",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Light rear delt pump.",
              "alternatives": [
                "Machine Rear Delt Fly",
                "Cable Rear Delt Fly"
              ]
            },
            {
              "exercise": "Dumbbell Curl",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Light curls.",
              "alternatives": [
                "Cable Curl",
                "Hammer Curl"
              ]
            },
            {
              "exercise": "Overhead Tricep Extension",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Light stretch emphasis.",
              "alternatives": [
                "Overhead Cable Extension",
                "French Press"
              ]
            }
          ]
        },
        {
          "day_name": "Lower B - Posterior Chain Focus",
          "estimated_duration": 75,
          "exercises": [
            {
              "exercise": "Dumbbell Romanian Deadlift",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Final deload. Light stretch. RPE 6-7.",
              "alternatives": [
                "Romanian Deadlift",
                "Stiff Leg Deadlift"
              ]
            },
            {
              "exercise": "Leg Press (High Foot)",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 90,
              "restQuick": 60,
              "notes": "Light weight.",
              "alternatives": [
                "Belt Squat",
                "Hack Squat"
              ]
            },
            {
              "exercise": "Seated Leg Curl",
              "sets": 3,
              "reps": "12-15",
              "reps_weekly": {
                "1": "15",
                "2": "15",
                "3": "12",
                "4": "12"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Light hamstring work.",
              "alternatives": [
                "Lying Leg Curl",
                "Leg Curl"
              ]
            },
            {
              "exercise": "Glute Bridge",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Light glute activation.",
              "alternatives": [
                "Hip Thrust",
                "Single Leg Glute Bridge"
              ]
            },
            {
              "exercise": "Standing Calf Raise",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 60,
              "restQuick": 45,
              "notes": "Light calf work. End of program.",
              "alternatives": [
                "Dumbbell Calf Raise",
                "Smith Machine Calf Raise"
              ]
            },
            {
              "exercise": "Seated Calf Raise",
              "sets": 3,
              "reps": "15-20",
              "reps_weekly": {
                "1": "20",
                "2": "20",
                "3": "15",
                "4": "15"
              },
              "rest": 45,
              "restQuick": 30,
              "notes": "Final soleus work.",
              "alternatives": [
                "Leg Press Calf Raise"
              ]
            }
          ]
        }
      ]
    }
  ]
};
