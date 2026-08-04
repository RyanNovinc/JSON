// Inner SimplifiedMealPlan: meals live under dailyMeals, keyed by date.
// NOT what screens consume directly — see the wrapper at the bottom.
const exampleMealPlanData = {
  "id": "plan_20260802_leanbulk",
  "name": "7-Day Lean Bulk",
  "startDate": "2026-08-02",
  "endDate": "2026-08-08",
  "dailyMeals": {
    "2026-08-02": {
      "date": "2026-08-02",
      "dayName": "Sunday",
      "meals": [
        {
          "id": "meal_20260802_breakfast",
          "name": "Maple Muscle Toast",
          "type": "breakfast",
          "time": "7:30 AM",
          "calories": 752,
          "macros": {
            "protein": 41.3,
            "carbs": 81.2,
            "fat": 29.4,
            "fiber": 4.2
          },
          "curated_meal_slug": "maple_muscle_toast",
          "plate_id": "standard",
          "scale_factor": 0.7,
          "isOriginal": true,
          "addedAt": "2026-08-02T07:30:00Z"
        },
        {
          "id": "meal_20260802_morning_snack",
          "name": "Baked Potato",
          "type": "morning_snack",
          "time": "9:45 AM",
          "calories": 58,
          "macros": {
            "protein": 1.5,
            "carbs": 13.0,
            "fat": 0.0,
            "fiber": 1.5
          },
          "curated_meal_slug": "baked_potato",
          "plate_id": "standard",
          "scale_factor": 0.5,
          "isOriginal": true,
          "addedAt": "2026-08-02T09:45:00Z"
        },
        {
          "id": "meal_20260802_snack",
          "name": "Hard-Boiled Eggs",
          "type": "snack",
          "time": "10:30 AM",
          "calories": 140,
          "macros": {
            "protein": 12.0,
            "carbs": 1.0,
            "fat": 10.0,
            "fiber": 0.0
          },
          "curated_meal_slug": "hard_boiled_eggs",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-08-02T10:30:00Z"
        },
        {
          "id": "meal_20260802_brunch",
          "name": "Baked Oats",
          "type": "brunch",
          "time": "11:15 AM",
          "calories": 561,
          "macros": {
            "protein": 36.4,
            "carbs": 75.6,
            "fat": 13.3,
            "fiber": 8.4
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 0.7,
          "isOriginal": true,
          "addedAt": "2026-08-02T11:15:00Z"
        },
        {
          "id": "meal_20260802_snack_2",
          "name": "Tuna Pouch",
          "type": "snack",
          "time": "1:00 PM",
          "calories": 110,
          "macros": {
            "protein": 25.0,
            "carbs": 0.0,
            "fat": 1.0,
            "fiber": 0.0
          },
          "curated_meal_slug": "tuna_pouch",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-08-02T13:00:00Z"
        },
        {
          "id": "meal_20260802_lunch",
          "name": "Beef & Broccoli Stir-Fry",
          "type": "lunch",
          "time": "2:45 PM",
          "calories": 660,
          "macros": {
            "protein": 47.6,
            "carbs": 81.6,
            "fat": 16.2,
            "fiber": 4.3
          },
          "curated_meal_slug": "beef_broccoli_stir_fry",
          "plate_id": "standard",
          "scale_factor": 0.85,
          "isOriginal": true,
          "addedAt": "2026-08-02T14:45:00Z"
        },
        {
          "id": "meal_20260802_afternoon_snack",
          "name": "Baked Potato",
          "type": "afternoon_snack",
          "time": "4:45 PM",
          "calories": 58,
          "macros": {
            "protein": 1.5,
            "carbs": 13.0,
            "fat": 0.0,
            "fiber": 1.5
          },
          "curated_meal_slug": "baked_potato",
          "plate_id": "standard",
          "scale_factor": 0.5,
          "isOriginal": true,
          "addedAt": "2026-08-02T16:45:00Z"
        },
        {
          "id": "meal_20260802_snack_3",
          "name": "Steamed Mixed Vegetables",
          "type": "snack",
          "time": "6:00 PM",
          "calories": 65,
          "macros": {
            "protein": 4.0,
            "carbs": 11.0,
            "fat": 1.0,
            "fiber": 5.0
          },
          "curated_meal_slug": "steamed_mixed_veg",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-08-02T18:00:00Z"
        },
        {
          "id": "meal_20260802_dinner",
          "name": "Chilli Con Carne",
          "type": "dinner",
          "time": "6:30 PM",
          "calories": 606,
          "macros": {
            "protein": 37.2,
            "carbs": 45.6,
            "fat": 31.2,
            "fiber": 12.0
          },
          "curated_meal_slug": "chilli_con_carne",
          "plate_id": "chilli_con_carne",
          "scale_factor": 1.2,
          "isOriginal": true,
          "addedAt": "2026-08-02T18:30:00Z"
        }
      ]
    },
    "2026-08-03": {
      "date": "2026-08-03",
      "dayName": "Monday",
      "meals": [
        {
          "id": "meal_20260803_breakfast",
          "name": "Baked Oats",
          "type": "breakfast",
          "time": "7:30 AM",
          "calories": 561,
          "macros": {
            "protein": 36.4,
            "carbs": 75.6,
            "fat": 13.3,
            "fiber": 8.4
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 0.7,
          "isOriginal": true,
          "addedAt": "2026-08-03T07:30:00Z"
        },
        {
          "id": "meal_20260803_morning_snack",
          "name": "Dark Chocolate",
          "type": "morning_snack",
          "time": "9:45 AM",
          "calories": 90,
          "macros": {
            "protein": 1.0,
            "carbs": 7.0,
            "fat": 6.5,
            "fiber": 1.5
          },
          "curated_meal_slug": "dark_chocolate",
          "plate_id": "standard",
          "scale_factor": 0.5,
          "isOriginal": true,
          "addedAt": "2026-08-03T09:45:00Z"
        },
        {
          "id": "meal_20260803_brunch",
          "name": "Baked Oats",
          "type": "brunch",
          "time": "11:15 AM",
          "calories": 561,
          "macros": {
            "protein": 36.4,
            "carbs": 75.6,
            "fat": 13.3,
            "fiber": 8.4
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 0.7,
          "isOriginal": true,
          "addedAt": "2026-08-03T11:15:00Z"
        },
        {
          "id": "meal_20260803_snack",
          "name": "Protein Shake",
          "type": "snack",
          "time": "1:00 PM",
          "calories": 250,
          "macros": {
            "protein": 35.0,
            "carbs": 16.0,
            "fat": 5.0,
            "fiber": 0.0
          },
          "curated_meal_slug": "protein_shake",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-08-03T13:00:00Z"
        },
        {
          "id": "meal_20260803_lunch",
          "name": "Chilli Con Carne",
          "type": "lunch",
          "time": "2:45 PM",
          "calories": 606,
          "macros": {
            "protein": 37.2,
            "carbs": 45.6,
            "fat": 31.2,
            "fiber": 12.0
          },
          "curated_meal_slug": "chilli_con_carne",
          "plate_id": "chilli_con_carne",
          "scale_factor": 1.2,
          "isOriginal": true,
          "addedAt": "2026-08-03T14:45:00Z"
        },
        {
          "id": "meal_20260803_afternoon_snack",
          "name": "Dark Chocolate",
          "type": "afternoon_snack",
          "time": "4:45 PM",
          "calories": 90,
          "macros": {
            "protein": 1.0,
            "carbs": 7.0,
            "fat": 6.5,
            "fiber": 1.5
          },
          "curated_meal_slug": "dark_chocolate",
          "plate_id": "standard",
          "scale_factor": 0.5,
          "isOriginal": true,
          "addedAt": "2026-08-03T16:45:00Z"
        },
        {
          "id": "meal_20260803_snack_2",
          "name": "Cheese",
          "type": "snack",
          "time": "5:30 PM",
          "calories": 115,
          "macros": {
            "protein": 7.0,
            "carbs": 1.0,
            "fat": 9.0,
            "fiber": 0.0
          },
          "curated_meal_slug": "cheese_snack",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-08-03T17:30:00Z"
        },
        {
          "id": "meal_20260803_dinner",
          "name": "Beef & Broccoli Stir-Fry",
          "type": "dinner",
          "time": "6:30 PM",
          "calories": 583,
          "macros": {
            "protein": 42.0,
            "carbs": 72.0,
            "fat": 14.3,
            "fiber": 3.8
          },
          "curated_meal_slug": "beef_broccoli_stir_fry",
          "plate_id": "standard",
          "scale_factor": 0.75,
          "isOriginal": true,
          "addedAt": "2026-08-03T18:30:00Z"
        }
      ]
    },
    "2026-08-04": {
      "date": "2026-08-04",
      "dayName": "Tuesday",
      "meals": [
        {
          "id": "meal_20260804_breakfast",
          "name": "Baked Oats",
          "type": "breakfast",
          "time": "7:30 AM",
          "calories": 561,
          "macros": {
            "protein": 36.4,
            "carbs": 75.6,
            "fat": 13.3,
            "fiber": 8.4
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 0.7,
          "isOriginal": true,
          "addedAt": "2026-08-04T07:30:00Z"
        },
        {
          "id": "meal_20260804_morning_snack",
          "name": "Dark Chocolate",
          "type": "morning_snack",
          "time": "9:45 AM",
          "calories": 90,
          "macros": {
            "protein": 1.0,
            "carbs": 7.0,
            "fat": 6.5,
            "fiber": 1.5
          },
          "curated_meal_slug": "dark_chocolate",
          "plate_id": "standard",
          "scale_factor": 0.5,
          "isOriginal": true,
          "addedAt": "2026-08-04T09:45:00Z"
        },
        {
          "id": "meal_20260804_brunch",
          "name": "Banana Bulk",
          "type": "brunch",
          "time": "11:15 AM",
          "calories": 749,
          "macros": {
            "protein": 39.0,
            "carbs": 94.2,
            "fat": 28.2,
            "fiber": 7.2
          },
          "curated_meal_slug": "banana_bulk",
          "plate_id": "standard",
          "scale_factor": 0.6,
          "isOriginal": true,
          "addedAt": "2026-08-04T11:15:00Z"
        },
        {
          "id": "meal_20260804_snack",
          "name": "Tuna Pouch",
          "type": "snack",
          "time": "1:00 PM",
          "calories": 110,
          "macros": {
            "protein": 25.0,
            "carbs": 0.0,
            "fat": 1.0,
            "fiber": 0.0
          },
          "curated_meal_slug": "tuna_pouch",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-08-04T13:00:00Z"
        },
        {
          "id": "meal_20260804_lunch",
          "name": "Beef & Broccoli Stir-Fry",
          "type": "lunch",
          "time": "2:45 PM",
          "calories": 583,
          "macros": {
            "protein": 42.0,
            "carbs": 72.0,
            "fat": 14.3,
            "fiber": 3.8
          },
          "curated_meal_slug": "beef_broccoli_stir_fry",
          "plate_id": "standard",
          "scale_factor": 0.75,
          "isOriginal": true,
          "addedAt": "2026-08-04T14:45:00Z"
        },
        {
          "id": "meal_20260804_afternoon_snack",
          "name": "Dark Chocolate",
          "type": "afternoon_snack",
          "time": "4:45 PM",
          "calories": 90,
          "macros": {
            "protein": 1.0,
            "carbs": 7.0,
            "fat": 6.5,
            "fiber": 1.5
          },
          "curated_meal_slug": "dark_chocolate",
          "plate_id": "standard",
          "scale_factor": 0.5,
          "isOriginal": true,
          "addedAt": "2026-08-04T16:45:00Z"
        },
        {
          "id": "meal_20260804_snack_2",
          "name": "Protein Shake",
          "type": "snack",
          "time": "5:30 PM",
          "calories": 250,
          "macros": {
            "protein": 35.0,
            "carbs": 16.0,
            "fat": 5.0,
            "fiber": 0.0
          },
          "curated_meal_slug": "protein_shake",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-08-04T17:30:00Z"
        },
        {
          "id": "meal_20260804_dinner",
          "name": "Chilli Con Carne",
          "type": "dinner",
          "time": "6:30 PM",
          "calories": 581,
          "macros": {
            "protein": 35.7,
            "carbs": 43.7,
            "fat": 29.9,
            "fiber": 11.5
          },
          "curated_meal_slug": "chilli_con_carne",
          "plate_id": "chilli_con_carne",
          "scale_factor": 1.15,
          "isOriginal": true,
          "addedAt": "2026-08-04T18:30:00Z"
        }
      ]
    },
    "2026-08-05": {
      "date": "2026-08-05",
      "dayName": "Wednesday",
      "meals": [
        {
          "id": "meal_20260805_breakfast",
          "name": "Baked Oats",
          "type": "breakfast",
          "time": "7:30 AM",
          "calories": 561,
          "macros": {
            "protein": 36.4,
            "carbs": 75.6,
            "fat": 13.3,
            "fiber": 8.4
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 0.7,
          "isOriginal": true,
          "addedAt": "2026-08-05T07:30:00Z"
        },
        {
          "id": "meal_20260805_morning_snack",
          "name": "Baked Potato",
          "type": "morning_snack",
          "time": "9:45 AM",
          "calories": 58,
          "macros": {
            "protein": 1.5,
            "carbs": 13.0,
            "fat": 0.0,
            "fiber": 1.5
          },
          "curated_meal_slug": "baked_potato",
          "plate_id": "standard",
          "scale_factor": 0.5,
          "isOriginal": true,
          "addedAt": "2026-08-05T09:45:00Z"
        },
        {
          "id": "meal_20260805_brunch",
          "name": "Big Breakfast Plate",
          "type": "brunch",
          "time": "11:15 AM",
          "calories": 907,
          "macros": {
            "protein": 45.5,
            "carbs": 56.7,
            "fat": 55.3,
            "fiber": 7.0
          },
          "curated_meal_slug": "big_breakfast_plate",
          "plate_id": "standard",
          "scale_factor": 0.7,
          "isOriginal": true,
          "addedAt": "2026-08-05T11:15:00Z"
        },
        {
          "id": "meal_20260805_snack",
          "name": "Tuna Pouch",
          "type": "snack",
          "time": "1:00 PM",
          "calories": 110,
          "macros": {
            "protein": 25.0,
            "carbs": 0.0,
            "fat": 1.0,
            "fiber": 0.0
          },
          "curated_meal_slug": "tuna_pouch",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-08-05T13:00:00Z"
        },
        {
          "id": "meal_20260805_lunch",
          "name": "Chilli Con Carne",
          "type": "lunch",
          "time": "2:45 PM",
          "calories": 581,
          "macros": {
            "protein": 35.7,
            "carbs": 43.7,
            "fat": 29.9,
            "fiber": 11.5
          },
          "curated_meal_slug": "chilli_con_carne",
          "plate_id": "chilli_con_carne",
          "scale_factor": 1.15,
          "isOriginal": true,
          "addedAt": "2026-08-05T14:45:00Z"
        },
        {
          "id": "meal_20260805_afternoon_snack",
          "name": "Baked Potato",
          "type": "afternoon_snack",
          "time": "4:45 PM",
          "calories": 58,
          "macros": {
            "protein": 1.5,
            "carbs": 13.0,
            "fat": 0.0,
            "fiber": 1.5
          },
          "curated_meal_slug": "baked_potato",
          "plate_id": "standard",
          "scale_factor": 0.5,
          "isOriginal": true,
          "addedAt": "2026-08-05T16:45:00Z"
        },
        {
          "id": "meal_20260805_snack_2",
          "name": "Protein Shake",
          "type": "snack",
          "time": "5:30 PM",
          "calories": 250,
          "macros": {
            "protein": 35.0,
            "carbs": 16.0,
            "fat": 5.0,
            "fiber": 0.0
          },
          "curated_meal_slug": "protein_shake",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-08-05T17:30:00Z"
        },
        {
          "id": "meal_20260805_dinner",
          "name": "Beef & Broccoli Stir-Fry",
          "type": "dinner",
          "time": "6:30 PM",
          "calories": 505,
          "macros": {
            "protein": 36.4,
            "carbs": 62.4,
            "fat": 12.4,
            "fiber": 3.3
          },
          "curated_meal_slug": "beef_broccoli_stir_fry",
          "plate_id": "standard",
          "scale_factor": 0.65,
          "isOriginal": true,
          "addedAt": "2026-08-05T18:30:00Z"
        }
      ]
    },
    "2026-08-06": {
      "date": "2026-08-06",
      "dayName": "Thursday",
      "meals": [
        {
          "id": "meal_20260806_breakfast",
          "name": "Baked Oats",
          "type": "breakfast",
          "time": "7:30 AM",
          "calories": 561,
          "macros": {
            "protein": 36.4,
            "carbs": 75.6,
            "fat": 13.3,
            "fiber": 8.4
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 0.7,
          "isOriginal": true,
          "addedAt": "2026-08-06T07:30:00Z"
        },
        {
          "id": "meal_20260806_morning_snack",
          "name": "Dark Chocolate",
          "type": "morning_snack",
          "time": "9:45 AM",
          "calories": 90,
          "macros": {
            "protein": 1.0,
            "carbs": 7.0,
            "fat": 6.5,
            "fiber": 1.5
          },
          "curated_meal_slug": "dark_chocolate",
          "plate_id": "standard",
          "scale_factor": 0.5,
          "isOriginal": true,
          "addedAt": "2026-08-06T09:45:00Z"
        },
        {
          "id": "meal_20260806_snack",
          "name": "Greek Yogurt",
          "type": "snack",
          "time": "10:30 AM",
          "calories": 170,
          "macros": {
            "protein": 17.0,
            "carbs": 9.0,
            "fat": 6.0,
            "fiber": 0.0
          },
          "curated_meal_slug": "greek_yogurt_snack",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-08-06T10:30:00Z"
        },
        {
          "id": "meal_20260806_brunch",
          "name": "Baked Oats",
          "type": "brunch",
          "time": "11:15 AM",
          "calories": 561,
          "macros": {
            "protein": 36.4,
            "carbs": 75.6,
            "fat": 13.3,
            "fiber": 8.4
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 0.7,
          "isOriginal": true,
          "addedAt": "2026-08-06T11:15:00Z"
        },
        {
          "id": "meal_20260806_snack_2",
          "name": "Tuna Pouch",
          "type": "snack",
          "time": "1:00 PM",
          "calories": 110,
          "macros": {
            "protein": 25.0,
            "carbs": 0.0,
            "fat": 1.0,
            "fiber": 0.0
          },
          "curated_meal_slug": "tuna_pouch",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-08-06T13:00:00Z"
        },
        {
          "id": "meal_20260806_lunch",
          "name": "Chilli Con Carne",
          "type": "lunch",
          "time": "2:45 PM",
          "calories": 556,
          "macros": {
            "protein": 34.1,
            "carbs": 41.8,
            "fat": 28.6,
            "fiber": 11.0
          },
          "curated_meal_slug": "chilli_con_carne",
          "plate_id": "chilli_con_carne",
          "scale_factor": 1.1,
          "isOriginal": true,
          "addedAt": "2026-08-06T14:45:00Z"
        },
        {
          "id": "meal_20260806_afternoon_snack",
          "name": "Dark Chocolate",
          "type": "afternoon_snack",
          "time": "4:45 PM",
          "calories": 90,
          "macros": {
            "protein": 1.0,
            "carbs": 7.0,
            "fat": 6.5,
            "fiber": 1.5
          },
          "curated_meal_slug": "dark_chocolate",
          "plate_id": "standard",
          "scale_factor": 0.5,
          "isOriginal": true,
          "addedAt": "2026-08-06T16:45:00Z"
        },
        {
          "id": "meal_20260806_snack_3",
          "name": "Steamed Mixed Vegetables",
          "type": "snack",
          "time": "6:00 PM",
          "calories": 65,
          "macros": {
            "protein": 4.0,
            "carbs": 11.0,
            "fat": 1.0,
            "fiber": 5.0
          },
          "curated_meal_slug": "steamed_mixed_veg",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-08-06T18:00:00Z"
        },
        {
          "id": "meal_20260806_dinner",
          "name": "Beef Bulgogi over Jasmine Rice",
          "type": "dinner",
          "time": "6:30 PM",
          "calories": 780,
          "macros": {
            "protein": 55.7,
            "carbs": 100.8,
            "fat": 16.8,
            "fiber": 2.1
          },
          "curated_meal_slug": "beef_bulgogi_bowl",
          "plate_id": "standard",
          "scale_factor": 1.05,
          "isOriginal": true,
          "addedAt": "2026-08-06T18:30:00Z"
        }
      ]
    },
    "2026-08-07": {
      "date": "2026-08-07",
      "dayName": "Friday",
      "meals": [
        {
          "id": "meal_20260807_breakfast",
          "name": "Baked Oats",
          "type": "breakfast",
          "time": "7:30 AM",
          "calories": 561,
          "macros": {
            "protein": 36.4,
            "carbs": 75.6,
            "fat": 13.3,
            "fiber": 8.4
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 0.7,
          "isOriginal": true,
          "addedAt": "2026-08-07T07:30:00Z"
        },
        {
          "id": "meal_20260807_morning_snack",
          "name": "Baked Potato",
          "type": "morning_snack",
          "time": "9:45 AM",
          "calories": 58,
          "macros": {
            "protein": 1.5,
            "carbs": 13.0,
            "fat": 0.0,
            "fiber": 1.5
          },
          "curated_meal_slug": "baked_potato",
          "plate_id": "standard",
          "scale_factor": 0.5,
          "isOriginal": true,
          "addedAt": "2026-08-07T09:45:00Z"
        },
        {
          "id": "meal_20260807_brunch",
          "name": "Baked Oats",
          "type": "brunch",
          "time": "11:15 AM",
          "calories": 561,
          "macros": {
            "protein": 36.4,
            "carbs": 75.6,
            "fat": 13.3,
            "fiber": 8.4
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 0.7,
          "isOriginal": true,
          "addedAt": "2026-08-07T11:15:00Z"
        },
        {
          "id": "meal_20260807_snack",
          "name": "Tuna Pouch",
          "type": "snack",
          "time": "1:00 PM",
          "calories": 110,
          "macros": {
            "protein": 25.0,
            "carbs": 0.0,
            "fat": 1.0,
            "fiber": 0.0
          },
          "curated_meal_slug": "tuna_pouch",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-08-07T13:00:00Z"
        },
        {
          "id": "meal_20260807_lunch",
          "name": "Beef Bulgogi over Jasmine Rice",
          "type": "lunch",
          "time": "2:45 PM",
          "calories": 743,
          "macros": {
            "protein": 53.0,
            "carbs": 96.0,
            "fat": 16.0,
            "fiber": 2.0
          },
          "curated_meal_slug": "beef_bulgogi_bowl",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-08-07T14:45:00Z"
        },
        {
          "id": "meal_20260807_afternoon_snack",
          "name": "Dark Chocolate",
          "type": "afternoon_snack",
          "time": "4:45 PM",
          "calories": 90,
          "macros": {
            "protein": 1.0,
            "carbs": 7.0,
            "fat": 6.5,
            "fiber": 1.5
          },
          "curated_meal_slug": "dark_chocolate",
          "plate_id": "standard",
          "scale_factor": 0.5,
          "isOriginal": true,
          "addedAt": "2026-08-07T16:45:00Z"
        },
        {
          "id": "meal_20260807_snack_2",
          "name": "Protein Shake",
          "type": "snack",
          "time": "5:30 PM",
          "calories": 250,
          "macros": {
            "protein": 35.0,
            "carbs": 16.0,
            "fat": 5.0,
            "fiber": 0.0
          },
          "curated_meal_slug": "protein_shake",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-08-07T17:30:00Z"
        },
        {
          "id": "meal_20260807_snack_3",
          "name": "Steamed Mixed Vegetables",
          "type": "snack",
          "time": "6:00 PM",
          "calories": 65,
          "macros": {
            "protein": 4.0,
            "carbs": 11.0,
            "fat": 1.0,
            "fiber": 5.0
          },
          "curated_meal_slug": "steamed_mixed_veg",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-08-07T18:00:00Z"
        },
        {
          "id": "meal_20260807_dinner",
          "name": "Chilli Con Carne",
          "type": "dinner",
          "time": "6:30 PM",
          "calories": 556,
          "macros": {
            "protein": 34.1,
            "carbs": 41.8,
            "fat": 28.6,
            "fiber": 11.0
          },
          "curated_meal_slug": "chilli_con_carne",
          "plate_id": "chilli_con_carne",
          "scale_factor": 1.1,
          "isOriginal": true,
          "addedAt": "2026-08-07T18:30:00Z"
        }
      ]
    },
    "2026-08-08": {
      "date": "2026-08-08",
      "dayName": "Saturday",
      "meals": [
        {
          "id": "meal_20260808_breakfast",
          "name": "Baked Oats",
          "type": "breakfast",
          "time": "7:30 AM",
          "calories": 561,
          "macros": {
            "protein": 36.4,
            "carbs": 75.6,
            "fat": 13.3,
            "fiber": 8.4
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 0.7,
          "isOriginal": true,
          "addedAt": "2026-08-08T07:30:00Z"
        },
        {
          "id": "meal_20260808_morning_snack",
          "name": "Dark Chocolate",
          "type": "morning_snack",
          "time": "9:45 AM",
          "calories": 90,
          "macros": {
            "protein": 1.0,
            "carbs": 7.0,
            "fat": 6.5,
            "fiber": 1.5
          },
          "curated_meal_slug": "dark_chocolate",
          "plate_id": "standard",
          "scale_factor": 0.5,
          "isOriginal": true,
          "addedAt": "2026-08-08T09:45:00Z"
        },
        {
          "id": "meal_20260808_brunch",
          "name": "Baked Oats",
          "type": "brunch",
          "time": "11:15 AM",
          "calories": 561,
          "macros": {
            "protein": 36.4,
            "carbs": 75.6,
            "fat": 13.3,
            "fiber": 8.4
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 0.7,
          "isOriginal": true,
          "addedAt": "2026-08-08T11:15:00Z"
        },
        {
          "id": "meal_20260808_snack",
          "name": "Tuna Pouch",
          "type": "snack",
          "time": "1:00 PM",
          "calories": 110,
          "macros": {
            "protein": 25.0,
            "carbs": 0.0,
            "fat": 1.0,
            "fiber": 0.0
          },
          "curated_meal_slug": "tuna_pouch",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-08-08T13:00:00Z"
        },
        {
          "id": "meal_20260808_lunch",
          "name": "Chilli Con Carne",
          "type": "lunch",
          "time": "2:45 PM",
          "calories": 556,
          "macros": {
            "protein": 34.1,
            "carbs": 41.8,
            "fat": 28.6,
            "fiber": 11.0
          },
          "curated_meal_slug": "chilli_con_carne",
          "plate_id": "chilli_con_carne",
          "scale_factor": 1.1,
          "isOriginal": true,
          "addedAt": "2026-08-08T14:45:00Z"
        },
        {
          "id": "meal_20260808_afternoon_snack",
          "name": "Dark Chocolate",
          "type": "afternoon_snack",
          "time": "4:45 PM",
          "calories": 90,
          "macros": {
            "protein": 1.0,
            "carbs": 7.0,
            "fat": 6.5,
            "fiber": 1.5
          },
          "curated_meal_slug": "dark_chocolate",
          "plate_id": "standard",
          "scale_factor": 0.5,
          "isOriginal": true,
          "addedAt": "2026-08-08T16:45:00Z"
        },
        {
          "id": "meal_20260808_dinner",
          "name": "Beef Bulgogi over Jasmine Rice",
          "type": "dinner",
          "time": "6:00 PM",
          "calories": 706,
          "macros": {
            "protein": 50.4,
            "carbs": 91.2,
            "fat": 15.2,
            "fiber": 1.9
          },
          "curated_meal_slug": "beef_bulgogi_bowl",
          "plate_id": "standard",
          "scale_factor": 0.95,
          "isOriginal": true,
          "addedAt": "2026-08-08T18:00:00Z"
        },
        {
          "id": "meal_20260808_evening_snack",
          "name": "Chocolate Protein Mug Cake",
          "type": "evening_snack",
          "time": "6:30 PM",
          "calories": 204,
          "macros": {
            "protein": 20.4,
            "carbs": 15.0,
            "fat": 8.4,
            "fiber": 1.8
          },
          "curated_meal_slug": "chocolate_protein_mug_cake",
          "plate_id": "standard",
          "scale_factor": 0.6,
          "isOriginal": true,
          "addedAt": "2026-08-08T18:30:00Z"
        }
      ]
    }
  },
  "grocery_list": {
    "total_estimated_cost": 313,
    "total_estimated_cost_low": 313,
    "total_estimated_cost_high": 344,
    "currency": "AU$",
    "categories": [
      {
        "category_name": "Meat & Seafood",
        "items": [
          {
            "item_name": "Sirloin steak",
            "ingredient_id": "sirloin_steak",
            "quantity": "1.6",
            "unit": "kg",
            "estimated_price": 54.4,
            "is_purchased": false
          },
          {
            "item_name": "Beef mince, regular",
            "ingredient_id": "beef_mince_regular",
            "quantity": "1",
            "unit": "kg",
            "estimated_price": 12.0,
            "notes": "2 x 500 g packs",
            "is_purchased": false
          },
          {
            "item_name": "Breakfast sausages",
            "ingredient_id": "breakfast_sausage",
            "quantity": "500",
            "unit": "g",
            "estimated_price": 7.5,
            "is_purchased": false
          },
          {
            "item_name": "Bacon rashers",
            "ingredient_id": "bacon",
            "quantity": "250",
            "unit": "g",
            "estimated_price": 8.0,
            "is_purchased": false
          },
          {
            "item_name": "Tuna pouches",
            "ingredient_id": "tuna",
            "quantity": "6",
            "unit": "x 95 g pouches",
            "estimated_price": 12.6,
            "is_purchased": false
          }
        ]
      },
      {
        "category_name": "Produce",
        "items": [
          {
            "item_name": "Bananas",
            "ingredient_id": "banana",
            "quantity": "690",
            "unit": "g",
            "estimated_price": 3.1,
            "notes": "About 6 medium",
            "is_purchased": false
          },
          {
            "item_name": "Broccoli",
            "ingredient_id": "broccoli",
            "quantity": "950",
            "unit": "g",
            "estimated_price": 8.5,
            "is_purchased": false
          },
          {
            "item_name": "Brown onions",
            "ingredient_id": "brown_onion",
            "quantity": "300",
            "unit": "g",
            "estimated_price": 1.3,
            "notes": "2 medium",
            "is_purchased": false
          },
          {
            "item_name": "Baking potatoes (Sebago)",
            "ingredient_id": "baking_potato",
            "quantity": "375",
            "unit": "g",
            "estimated_price": 1.8,
            "notes": "About 3 small",
            "is_purchased": false
          },
          {
            "item_name": "Brown/Swiss mushrooms",
            "ingredient_id": "mushroom_brown",
            "quantity": "60",
            "unit": "g",
            "estimated_price": 0.8,
            "is_purchased": false
          },
          {
            "item_name": "Cherry tomatoes",
            "ingredient_id": "cherry_tomatoes",
            "quantity": "250",
            "unit": "g",
            "estimated_price": 4.5,
            "notes": "1 punnet",
            "is_purchased": false
          },
          {
            "item_name": "Spring onions",
            "ingredient_id": "spring_onion",
            "quantity": "1",
            "unit": "bunch",
            "estimated_price": 3.0,
            "is_purchased": false
          },
          {
            "item_name": "Medjool dates",
            "ingredient_id": "medjool_dates",
            "quantity": "200",
            "unit": "g",
            "estimated_price": 8.5,
            "is_purchased": false
          },
          {
            "item_name": "Mixed berries, frozen",
            "ingredient_id": "mixed_berries",
            "quantity": "500",
            "unit": "g",
            "estimated_price": 7.5,
            "is_purchased": false
          }
        ]
      },
      {
        "category_name": "Dairy & Refrigerated",
        "items": [
          {
            "item_name": "Full-cream milk",
            "ingredient_id": "full_cream_milk",
            "quantity": "3",
            "unit": "L",
            "estimated_price": 5.2,
            "notes": "2 L plus 1 L",
            "is_purchased": false
          },
          {
            "item_name": "Eggs",
            "ingredient_id": "egg_whole",
            "quantity": "18",
            "unit": "count",
            "estimated_price": 11.0,
            "is_purchased": false
          },
          {
            "item_name": "Vanilla Greek yoghurt, full-fat",
            "ingredient_id": "greek_yoghurt_vanilla_full_fat",
            "quantity": "1000",
            "unit": "g",
            "estimated_price": 9.0,
            "notes": "2 x 500 g",
            "is_purchased": false
          },
          {
            "item_name": "Plain Greek yoghurt, full-fat",
            "ingredient_id": "greek_yoghurt_plain_full_fat",
            "quantity": "500",
            "unit": "g",
            "estimated_price": 5.5,
            "is_purchased": false
          },
          {
            "item_name": "Salted butter",
            "ingredient_id": "butter_salted",
            "quantity": "250",
            "unit": "g",
            "estimated_price": 6.5,
            "is_purchased": false
          },
          {
            "item_name": "Grated tasty cheese",
            "ingredient_id": "cheese_tasty_grated",
            "quantity": "250",
            "unit": "g",
            "estimated_price": 6.5,
            "is_purchased": false
          }
        ]
      },
      {
        "category_name": "Bakery",
        "items": [
          {
            "item_name": "Crusty sourdough loaf",
            "ingredient_id": "sourdough_crusty",
            "quantity": "1",
            "unit": "loaf",
            "estimated_price": 5.5,
            "is_purchased": false
          },
          {
            "item_name": "Brioche loaf, sliced",
            "ingredient_id": "brioche_loaf",
            "quantity": "500",
            "unit": "g",
            "estimated_price": 5.5,
            "is_purchased": false
          }
        ]
      },
      {
        "category_name": "Pantry & Grains",
        "items": [
          {
            "item_name": "Jasmine rice",
            "ingredient_id": "jasmine_rice",
            "quantity": "1",
            "unit": "kg",
            "estimated_price": 4.2,
            "is_purchased": false
          },
          {
            "item_name": "Rolled oats",
            "ingredient_id": "rolled_oats_raw",
            "quantity": "1",
            "unit": "kg",
            "estimated_price": 3.2,
            "is_purchased": false
          },
          {
            "item_name": "Honey",
            "ingredient_id": "honey",
            "quantity": "500",
            "unit": "g",
            "estimated_price": 7.5,
            "is_purchased": false
          },
          {
            "item_name": "Peanut butter, natural",
            "ingredient_id": "peanut_butter_natural",
            "quantity": "375",
            "unit": "g",
            "estimated_price": 6.0,
            "is_purchased": false
          },
          {
            "item_name": "Maple syrup",
            "ingredient_id": "maple_syrup",
            "quantity": "250",
            "unit": "ml",
            "estimated_price": 8.5,
            "is_purchased": false
          },
          {
            "item_name": "Olive oil",
            "ingredient_id": "olive_oil",
            "quantity": "500",
            "unit": "ml",
            "estimated_price": 9.5,
            "is_purchased": false
          },
          {
            "item_name": "Crushed tomatoes, canned",
            "ingredient_id": "crushed_tomatoes_canned",
            "quantity": "1600",
            "unit": "g",
            "estimated_price": 3.6,
            "notes": "2 x 800 g",
            "is_purchased": false
          },
          {
            "item_name": "Red kidney beans, canned",
            "ingredient_id": "kidney_beans_canned",
            "quantity": "420",
            "unit": "g",
            "estimated_price": 1.7,
            "is_purchased": false
          },
          {
            "item_name": "Black beans, canned",
            "ingredient_id": "black_beans_canned",
            "quantity": "420",
            "unit": "g",
            "estimated_price": 1.9,
            "is_purchased": false
          },
          {
            "item_name": "Chilli con carne seasoning sachets",
            "ingredient_id": "chilli_seasoning_mix",
            "quantity": "80",
            "unit": "g",
            "estimated_price": 3.2,
            "notes": "2 x 40 g sachets",
            "is_purchased": false
          },
          {
            "item_name": "Stir-fry sauce, oyster style",
            "ingredient_id": "asian_stir_fry_sauce_bottled",
            "quantity": "240",
            "unit": "g",
            "estimated_price": 3.6,
            "is_purchased": false
          },
          {
            "item_name": "Bulgogi marinade",
            "ingredient_id": "bulgogi_marinade_bottled",
            "quantity": "240",
            "unit": "g",
            "estimated_price": 5.5,
            "is_purchased": false
          },
          {
            "item_name": "Sesame seeds",
            "ingredient_id": "sesame_seeds",
            "quantity": "100",
            "unit": "g",
            "estimated_price": 3.0,
            "is_purchased": false
          },
          {
            "item_name": "Dark chocolate 70%+",
            "ingredient_id": "dark_chocolate",
            "quantity": "200",
            "unit": "g",
            "estimated_price": 8.0,
            "notes": "2 x 100 g",
            "is_purchased": false
          },
          {
            "item_name": "Cocoa powder, unsweetened",
            "ingredient_id": "cocoa_powder",
            "quantity": "200",
            "unit": "g",
            "estimated_price": 4.5,
            "is_purchased": false
          },
          {
            "item_name": "Chocolate chips",
            "ingredient_id": "chocolate_chips",
            "quantity": "250",
            "unit": "g",
            "estimated_price": 4.0,
            "is_purchased": false
          }
        ]
      },
      {
        "category_name": "Condiments & Supplements",
        "items": [
          {
            "item_name": "Vanilla whey protein",
            "ingredient_id": "whey_protein_vanilla",
            "quantity": "1",
            "unit": "kg",
            "estimated_price": 45.0,
            "is_purchased": false
          },
          {
            "item_name": "Baked beans",
            "ingredient_id": "baked_beans",
            "quantity": "400",
            "unit": "g",
            "estimated_price": 1.6,
            "is_purchased": false
          }
        ]
      }
    ],
    "scratch_extras": [
      {
        "item_name": "Garlic",
        "ingredient_id": "garlic_clove",
        "quantity": "2",
        "unit": "bulbs",
        "estimated_price": 2.0,
        "notes": "About 9 cloves"
      },
      {
        "item_name": "Fresh ginger",
        "ingredient_id": "ginger_fresh",
        "quantity": "50",
        "unit": "g",
        "estimated_price": 1.5
      },
      {
        "item_name": "Soy sauce",
        "ingredient_id": "soy_sauce",
        "quantity": "500",
        "unit": "ml",
        "estimated_price": 4.5
      },
      {
        "item_name": "Cornstarch",
        "ingredient_id": "cornstarch",
        "quantity": "300",
        "unit": "g",
        "estimated_price": 2.5
      },
      {
        "item_name": "Oyster sauce",
        "ingredient_id": "oyster_sauce",
        "quantity": "250",
        "unit": "ml",
        "estimated_price": 4.0
      },
      {
        "item_name": "Chinese cooking wine (Shaoxing)",
        "ingredient_id": "chinese_cooking_wine",
        "quantity": "640",
        "unit": "ml",
        "estimated_price": 6.0
      },
      {
        "item_name": "Brown sugar",
        "ingredient_id": "brown_sugar",
        "quantity": "1",
        "unit": "kg",
        "estimated_price": 3.2
      },
      {
        "item_name": "Sesame oil, toasted",
        "ingredient_id": "sesame_oil",
        "quantity": "250",
        "unit": "ml",
        "estimated_price": 6.0
      },
      {
        "item_name": "Brown onion",
        "ingredient_id": "brown_onion",
        "quantity": "1",
        "unit": "medium",
        "estimated_price": 0.6,
        "notes": "Extra, on top of the main list"
      },
      {
        "item_name": "Pear",
        "ingredient_id": "pear",
        "quantity": "1",
        "unit": "count",
        "estimated_price": 1.5
      },
      {
        "item_name": "Red capsicum",
        "ingredient_id": "capsicum_red",
        "quantity": "300",
        "unit": "g",
        "estimated_price": 5.0,
        "notes": "2 medium"
      },
      {
        "item_name": "Tomato paste",
        "ingredient_id": "tomato_paste",
        "quantity": "140",
        "unit": "g",
        "estimated_price": 1.6
      },
      {
        "item_name": "Beef stock cubes",
        "ingredient_id": "beef_stock_cube",
        "quantity": "60",
        "unit": "g",
        "estimated_price": 3.0
      },
      {
        "item_name": "White sugar",
        "ingredient_id": "sugar_white",
        "quantity": "1",
        "unit": "kg",
        "estimated_price": 2.8
      }
    ]
  },
  "metadata": {
    "generatedAt": "2026-08-02T09:00:00Z",
    "totalCost_low": 313,
    "totalCost_high": 344,
    "duration": 7
  }
};


// MealPlanPreviewScreen and the rest of the app consume a *saved* MealPlan
// whose `data` field holds the SimplifiedMealPlan above. This mirrors how a
// real curated plan is stored in NutritionHomeScreen.handleToggleSaveMealPlan:
//   { id, name, duration, meals, data, fingerprint, createdAt }
// Dates are static on purpose: MealPlanPreviewScreen.rebasePlanToToday()
// shifts them to the current week when the user adopts the plan.
export const exampleMealPlan = {
  id: exampleMealPlanData.id,
  name: exampleMealPlanData.name,
  duration: Object.keys(exampleMealPlanData.dailyMeals).length,
  meals: Object.values(exampleMealPlanData.dailyMeals).reduce(
    (total: number, day: any) => total + (day?.meals?.length || 0),
    0
  ),
  data: exampleMealPlanData,
  fingerprint: exampleMealPlanData.id,
  createdAt: Date.now(),
};
