// Inner SimplifiedMealPlan (curated meal picker shape): meals live under
// dailyMeals, keyed by date. This is NOT what screens consume directly. See
// the wrapped `exampleMealPlan` export at the bottom of this file.
const exampleMealPlanData = {
  "id": "plan_1781600400",
  "name": "7-Day Lean Bulk",
  "startDate": "2026-06-16",
  "endDate": "2026-06-22",
  "dailyMeals": {
    "2026-06-16": {
      "date": "2026-06-16",
      "dayName": "Tuesday",
      "meals": [
        {
          "id": "meal_20260616_breakfast_baked_oats",
          "name": "Baked Oats",
          "type": "breakfast",
          "time": "8:30 AM",
          "calories": 1000,
          "macros": {
            "protein": 64,
            "carbs": 130,
            "fat": 24,
            "fiber": 14
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 1.25,
          "isOriginal": true,
          "addedAt": "2026-06-16T08:30:00Z"
        },
        {
          "id": "meal_20260616_morning_snack_banana_snack",
          "name": "Banana",
          "type": "morning_snack",
          "time": "10:45 AM",
          "calories": 105,
          "macros": {
            "protein": 1,
            "carbs": 27,
            "fat": 0,
            "fiber": 3
          },
          "curated_meal_slug": "banana_snack",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-06-16T10:45:00Z"
        },
        {
          "id": "meal_20260616_brunch_dirty_eden",
          "name": "Dirty Eden",
          "type": "brunch",
          "time": "12:15 PM",
          "calories": 699,
          "macros": {
            "protein": 34,
            "carbs": 63,
            "fat": 36,
            "fiber": 11
          },
          "curated_meal_slug": "dirty_eden",
          "plate_id": "standard",
          "scale_factor": 0.6,
          "isOriginal": true,
          "addedAt": "2026-06-16T12:15:00Z"
        },
        {
          "id": "meal_20260616_lunch_butter_chicken",
          "name": "Butter Chicken",
          "type": "lunch",
          "time": "3:00 PM",
          "calories": 343,
          "macros": {
            "protein": 34,
            "carbs": 10,
            "fat": 20,
            "fiber": 2
          },
          "curated_meal_slug": "butter_chicken",
          "plate_id": "butter_chicken",
          "scale_factor": 0.7,
          "isOriginal": true,
          "addedAt": "2026-06-16T15:00:00Z"
        },
        {
          "id": "meal_20260616_adj_tuna_pouch",
          "name": "Tuna Pouch",
          "type": "snack",
          "time": "3:00 PM",
          "calories": 110,
          "macros": {
            "protein": 25,
            "carbs": 0,
            "fat": 1,
            "fiber": 0
          },
          "curated_meal_slug": "tuna_pouch",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-06-16T15:00:00Z"
        },
        {
          "id": "meal_20260616_afternoon_snack_beef_jerky",
          "name": "Beef Jerky",
          "type": "afternoon_snack",
          "time": "5:00 PM",
          "calories": 104,
          "macros": {
            "protein": 13,
            "carbs": 4,
            "fat": 3,
            "fiber": 0
          },
          "curated_meal_slug": "beef_jerky",
          "plate_id": "standard",
          "scale_factor": 0.9,
          "isOriginal": true,
          "addedAt": "2026-06-16T17:00:00Z"
        },
        {
          "id": "meal_20260616_dinner_honey_chicken",
          "name": "Honey Chicken over Jasmine Rice",
          "type": "dinner",
          "time": "6:30 PM",
          "calories": 432,
          "macros": {
            "protein": 30,
            "carbs": 57,
            "fat": 8,
            "fiber": 1
          },
          "curated_meal_slug": "honey_chicken",
          "plate_id": "standard",
          "scale_factor": 0.55,
          "isOriginal": true,
          "addedAt": "2026-06-16T18:30:00Z"
        },
        {
          "id": "meal_20260616_evening_snack_chocolate_protein_mousse",
          "name": "Chocolate Protein Mousse",
          "type": "evening_snack",
          "time": "7:15 PM",
          "calories": 375,
          "macros": {
            "protein": 36,
            "carbs": 34,
            "fat": 13,
            "fiber": 4
          },
          "curated_meal_slug": "chocolate_protein_mousse",
          "plate_id": "standard",
          "scale_factor": 0.95,
          "isOriginal": true,
          "addedAt": "2026-06-16T19:15:00Z"
        }
      ]
    },
    "2026-06-17": {
      "date": "2026-06-17",
      "dayName": "Wednesday",
      "meals": [
        {
          "id": "meal_20260617_breakfast_baked_oats",
          "name": "Baked Oats",
          "type": "breakfast",
          "time": "8:30 AM",
          "calories": 600,
          "macros": {
            "protein": 38,
            "carbs": 78,
            "fat": 14,
            "fiber": 8
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 0.75,
          "isOriginal": true,
          "addedAt": "2026-06-17T08:30:00Z"
        },
        {
          "id": "meal_20260617_morning_snack_beef_jerky",
          "name": "Beef Jerky",
          "type": "morning_snack",
          "time": "10:45 AM",
          "calories": 115,
          "macros": {
            "protein": 14,
            "carbs": 5,
            "fat": 3,
            "fiber": 0
          },
          "curated_meal_slug": "beef_jerky",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-06-17T10:45:00Z"
        },
        {
          "id": "meal_20260617_brunch_banana_bulk",
          "name": "Banana Bulk",
          "type": "brunch",
          "time": "12:15 PM",
          "calories": 976,
          "macros": {
            "protein": 48,
            "carbs": 114,
            "fat": 38,
            "fiber": 9
          },
          "curated_meal_slug": "banana_bulk",
          "plate_id": "standard",
          "scale_factor": 0.75,
          "isOriginal": true,
          "addedAt": "2026-06-17T12:15:00Z"
        },
        {
          "id": "meal_20260617_lunch_butter_chicken",
          "name": "Butter Chicken",
          "type": "lunch",
          "time": "3:00 PM",
          "calories": 686,
          "macros": {
            "protein": 67,
            "carbs": 20,
            "fat": 39,
            "fiber": 4
          },
          "curated_meal_slug": "butter_chicken",
          "plate_id": "butter_chicken",
          "scale_factor": 1.4,
          "isOriginal": true,
          "addedAt": "2026-06-17T15:00:00Z"
        },
        {
          "id": "meal_20260617_adj_tuna_pouch",
          "name": "Tuna Pouch",
          "type": "snack",
          "time": "3:00 PM",
          "calories": 110,
          "macros": {
            "protein": 25,
            "carbs": 0,
            "fat": 1,
            "fiber": 0
          },
          "curated_meal_slug": "tuna_pouch",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-06-17T15:00:00Z"
        },
        {
          "id": "meal_20260617_afternoon_snack_dried_fruit",
          "name": "Dried Fruit",
          "type": "afternoon_snack",
          "time": "5:00 PM",
          "calories": 162,
          "macros": {
            "protein": 1,
            "carbs": 39,
            "fat": 0,
            "fiber": 4
          },
          "curated_meal_slug": "dried_fruit",
          "plate_id": "standard",
          "scale_factor": 1.25,
          "isOriginal": true,
          "addedAt": "2026-06-17T17:00:00Z"
        },
        {
          "id": "meal_20260617_dinner_honey_chicken",
          "name": "Honey Chicken over Jasmine Rice",
          "type": "dinner",
          "time": "6:30 PM",
          "calories": 472,
          "macros": {
            "protein": 32,
            "carbs": 62,
            "fat": 9,
            "fiber": 1
          },
          "curated_meal_slug": "honey_chicken",
          "plate_id": "standard",
          "scale_factor": 0.6,
          "isOriginal": true,
          "addedAt": "2026-06-17T18:30:00Z"
        },
        {
          "id": "meal_20260617_adj_steamed_mixed_veg",
          "name": "Steamed Mixed Veg",
          "type": "snack",
          "time": "6:30 PM",
          "calories": 130,
          "macros": {
            "protein": 8,
            "carbs": 22,
            "fat": 2,
            "fiber": 10
          },
          "curated_meal_slug": "steamed_mixed_veg",
          "plate_id": "standard",
          "scale_factor": 2.0,
          "isOriginal": true,
          "addedAt": "2026-06-17T18:30:00Z"
        }
      ]
    },
    "2026-06-18": {
      "date": "2026-06-18",
      "dayName": "Thursday",
      "meals": [
        {
          "id": "meal_20260618_breakfast_baked_oats",
          "name": "Baked Oats",
          "type": "breakfast",
          "time": "8:30 AM",
          "calories": 920,
          "macros": {
            "protein": 59,
            "carbs": 120,
            "fat": 22,
            "fiber": 13
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 1.15,
          "isOriginal": true,
          "addedAt": "2026-06-18T08:30:00Z"
        },
        {
          "id": "meal_20260618_morning_snack_beef_jerky",
          "name": "Beef Jerky",
          "type": "morning_snack",
          "time": "10:45 AM",
          "calories": 92,
          "macros": {
            "protein": 11,
            "carbs": 4,
            "fat": 2,
            "fiber": 0
          },
          "curated_meal_slug": "beef_jerky",
          "plate_id": "standard",
          "scale_factor": 0.8,
          "isOriginal": true,
          "addedAt": "2026-06-18T10:45:00Z"
        },
        {
          "id": "meal_20260618_brunch_dirty_eden",
          "name": "Dirty Eden",
          "type": "brunch",
          "time": "12:15 PM",
          "calories": 699,
          "macros": {
            "protein": 34,
            "carbs": 63,
            "fat": 36,
            "fiber": 11
          },
          "curated_meal_slug": "dirty_eden",
          "plate_id": "standard",
          "scale_factor": 0.6,
          "isOriginal": true,
          "addedAt": "2026-06-18T12:15:00Z"
        },
        {
          "id": "meal_20260618_lunch_butter_chicken",
          "name": "Butter Chicken",
          "type": "lunch",
          "time": "3:00 PM",
          "calories": 392,
          "macros": {
            "protein": 38,
            "carbs": 11,
            "fat": 22,
            "fiber": 2
          },
          "curated_meal_slug": "butter_chicken",
          "plate_id": "butter_chicken",
          "scale_factor": 0.8,
          "isOriginal": true,
          "addedAt": "2026-06-18T15:00:00Z"
        },
        {
          "id": "meal_20260618_adj_tuna_pouch",
          "name": "Tuna Pouch",
          "type": "snack",
          "time": "3:00 PM",
          "calories": 110,
          "macros": {
            "protein": 25,
            "carbs": 0,
            "fat": 1,
            "fiber": 0
          },
          "curated_meal_slug": "tuna_pouch",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-06-18T15:00:00Z"
        },
        {
          "id": "meal_20260618_afternoon_snack_cheese_snack",
          "name": "Cheese",
          "type": "afternoon_snack",
          "time": "5:00 PM",
          "calories": 63,
          "macros": {
            "protein": 4,
            "carbs": 1,
            "fat": 5,
            "fiber": 0
          },
          "curated_meal_slug": "cheese_snack",
          "plate_id": "standard",
          "scale_factor": 0.55,
          "isOriginal": true,
          "addedAt": "2026-06-18T17:00:00Z"
        },
        {
          "id": "meal_20260618_dinner_honey_chicken",
          "name": "Honey Chicken over Jasmine Rice",
          "type": "dinner",
          "time": "6:30 PM",
          "calories": 432,
          "macros": {
            "protein": 30,
            "carbs": 57,
            "fat": 8,
            "fiber": 1
          },
          "curated_meal_slug": "honey_chicken",
          "plate_id": "standard",
          "scale_factor": 0.55,
          "isOriginal": true,
          "addedAt": "2026-06-18T18:30:00Z"
        },
        {
          "id": "meal_20260618_adj_steamed_mixed_veg",
          "name": "Steamed Mixed Veg",
          "type": "snack",
          "time": "6:30 PM",
          "calories": 130,
          "macros": {
            "protein": 8,
            "carbs": 22,
            "fat": 2,
            "fiber": 10
          },
          "curated_meal_slug": "steamed_mixed_veg",
          "plate_id": "standard",
          "scale_factor": 2.0,
          "isOriginal": true,
          "addedAt": "2026-06-18T18:30:00Z"
        },
        {
          "id": "meal_20260618_evening_snack_cottage_cheese_ice_cream",
          "name": "Cottage Cheese Ice Cream",
          "type": "evening_snack",
          "time": "7:15 PM",
          "calories": 351,
          "macros": {
            "protein": 26,
            "carbs": 41,
            "fat": 11,
            "fiber": 3
          },
          "curated_meal_slug": "cottage_cheese_ice_cream",
          "plate_id": "standard",
          "scale_factor": 0.9,
          "isOriginal": true,
          "addedAt": "2026-06-18T19:15:00Z"
        }
      ]
    },
    "2026-06-19": {
      "date": "2026-06-19",
      "dayName": "Friday",
      "meals": [
        {
          "id": "meal_20260619_breakfast_baked_oats",
          "name": "Baked Oats",
          "type": "breakfast",
          "time": "8:30 AM",
          "calories": 680,
          "macros": {
            "protein": 43,
            "carbs": 88,
            "fat": 16,
            "fiber": 9
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 0.85,
          "isOriginal": true,
          "addedAt": "2026-06-19T08:30:00Z"
        },
        {
          "id": "meal_20260619_adj_berries",
          "name": "Berries",
          "type": "snack",
          "time": "8:30 AM",
          "calories": 80,
          "macros": {
            "protein": 1,
            "carbs": 18,
            "fat": 0,
            "fiber": 5
          },
          "curated_meal_slug": "berries",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-06-19T08:30:00Z"
        },
        {
          "id": "meal_20260619_morning_snack_beef_jerky",
          "name": "Beef Jerky",
          "type": "morning_snack",
          "time": "10:45 AM",
          "calories": 207,
          "macros": {
            "protein": 25,
            "carbs": 9,
            "fat": 5,
            "fiber": 0
          },
          "curated_meal_slug": "beef_jerky",
          "plate_id": "standard",
          "scale_factor": 1.8,
          "isOriginal": true,
          "addedAt": "2026-06-19T10:45:00Z"
        },
        {
          "id": "meal_20260619_brunch_cookies_gains",
          "name": "Cookies & Gains",
          "type": "brunch",
          "time": "12:15 PM",
          "calories": 804,
          "macros": {
            "protein": 39,
            "carbs": 90,
            "fat": 33,
            "fiber": 4
          },
          "curated_meal_slug": "cookies_gains",
          "plate_id": "standard",
          "scale_factor": 0.7,
          "isOriginal": true,
          "addedAt": "2026-06-19T12:15:00Z"
        },
        {
          "id": "meal_20260619_lunch_butter_chicken",
          "name": "Butter Chicken",
          "type": "lunch",
          "time": "3:00 PM",
          "calories": 662,
          "macros": {
            "protein": 65,
            "carbs": 19,
            "fat": 38,
            "fiber": 4
          },
          "curated_meal_slug": "butter_chicken",
          "plate_id": "butter_chicken",
          "scale_factor": 1.35,
          "isOriginal": true,
          "addedAt": "2026-06-19T15:00:00Z"
        },
        {
          "id": "meal_20260619_adj_tuna_pouch",
          "name": "Tuna Pouch",
          "type": "snack",
          "time": "3:00 PM",
          "calories": 110,
          "macros": {
            "protein": 25,
            "carbs": 0,
            "fat": 1,
            "fiber": 0
          },
          "curated_meal_slug": "tuna_pouch",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-06-19T15:00:00Z"
        },
        {
          "id": "meal_20260619_afternoon_snack_banana_snack",
          "name": "Banana",
          "type": "afternoon_snack",
          "time": "5:00 PM",
          "calories": 226,
          "macros": {
            "protein": 2,
            "carbs": 58,
            "fat": 0,
            "fiber": 6
          },
          "curated_meal_slug": "banana_snack",
          "plate_id": "standard",
          "scale_factor": 2.15,
          "isOriginal": true,
          "addedAt": "2026-06-19T17:00:00Z"
        },
        {
          "id": "meal_20260619_dinner_honey_chicken",
          "name": "Honey Chicken over Jasmine Rice",
          "type": "dinner",
          "time": "6:30 PM",
          "calories": 432,
          "macros": {
            "protein": 30,
            "carbs": 57,
            "fat": 8,
            "fiber": 1
          },
          "curated_meal_slug": "honey_chicken",
          "plate_id": "standard",
          "scale_factor": 0.55,
          "isOriginal": true,
          "addedAt": "2026-06-19T18:30:00Z"
        },
        {
          "id": "meal_20260619_adj_steamed_mixed_veg",
          "name": "Steamed Mixed Veg",
          "type": "snack",
          "time": "6:30 PM",
          "calories": 65,
          "macros": {
            "protein": 4,
            "carbs": 11,
            "fat": 1,
            "fiber": 5
          },
          "curated_meal_slug": "steamed_mixed_veg",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-06-19T18:30:00Z"
        }
      ]
    },
    "2026-06-20": {
      "date": "2026-06-20",
      "dayName": "Saturday",
      "meals": [
        {
          "id": "meal_20260620_breakfast_egg_muffins",
          "name": "Egg Muffins",
          "type": "breakfast",
          "time": "8:30 AM",
          "calories": 592,
          "macros": {
            "protein": 33,
            "carbs": 47,
            "fat": 31,
            "fiber": 6
          },
          "curated_meal_slug": "egg_muffins",
          "plate_id": "standard",
          "scale_factor": 0.75,
          "isOriginal": true,
          "addedAt": "2026-06-20T08:30:00Z"
        },
        {
          "id": "meal_20260620_morning_snack_beef_jerky",
          "name": "Beef Jerky",
          "type": "morning_snack",
          "time": "10:45 AM",
          "calories": 144,
          "macros": {
            "protein": 18,
            "carbs": 6,
            "fat": 4,
            "fiber": 0
          },
          "curated_meal_slug": "beef_jerky",
          "plate_id": "standard",
          "scale_factor": 1.25,
          "isOriginal": true,
          "addedAt": "2026-06-20T10:45:00Z"
        },
        {
          "id": "meal_20260620_brunch_baked_oats",
          "name": "Baked Oats",
          "type": "brunch",
          "time": "12:15 PM",
          "calories": 600,
          "macros": {
            "protein": 38,
            "carbs": 78,
            "fat": 14,
            "fiber": 8
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 0.75,
          "isOriginal": true,
          "addedAt": "2026-06-20T12:15:00Z"
        },
        {
          "id": "meal_20260620_adj_protein_bar",
          "name": "Protein Bar",
          "type": "snack",
          "time": "1:30 PM",
          "calories": 220,
          "macros": {
            "protein": 20,
            "carbs": 22,
            "fat": 7,
            "fiber": 5
          },
          "curated_meal_slug": "protein_bar",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-06-20T13:30:00Z"
        },
        {
          "id": "meal_20260620_lunch_cevapi",
          "name": "Ćevapi with Flatbread",
          "type": "lunch",
          "time": "3:00 PM",
          "calories": 524,
          "macros": {
            "protein": 33,
            "carbs": 46,
            "fat": 23,
            "fiber": 5
          },
          "curated_meal_slug": "cevapi",
          "plate_id": "flatbread",
          "scale_factor": 0.65,
          "isOriginal": true,
          "addedAt": "2026-06-20T15:00:00Z"
        },
        {
          "id": "meal_20260620_adj_tuna_pouch",
          "name": "Tuna Pouch",
          "type": "snack",
          "time": "3:00 PM",
          "calories": 110,
          "macros": {
            "protein": 25,
            "carbs": 0,
            "fat": 1,
            "fiber": 0
          },
          "curated_meal_slug": "tuna_pouch",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-06-20T15:00:00Z"
        },
        {
          "id": "meal_20260620_afternoon_snack_banana_snack",
          "name": "Banana",
          "type": "afternoon_snack",
          "time": "5:00 PM",
          "calories": 284,
          "macros": {
            "protein": 3,
            "carbs": 73,
            "fat": 0,
            "fiber": 8
          },
          "curated_meal_slug": "banana_snack",
          "plate_id": "standard",
          "scale_factor": 2.7,
          "isOriginal": true,
          "addedAt": "2026-06-20T17:00:00Z"
        },
        {
          "id": "meal_20260620_dinner_honey_soy_salmon_noodles",
          "name": "Honey Soy Salmon Noodle Bowl",
          "type": "dinner",
          "time": "6:30 PM",
          "calories": 451,
          "macros": {
            "protein": 29,
            "carbs": 41,
            "fat": 18,
            "fiber": 3
          },
          "curated_meal_slug": "honey_soy_salmon_noodles",
          "plate_id": "standard",
          "scale_factor": 0.55,
          "isOriginal": true,
          "addedAt": "2026-06-20T18:30:00Z"
        },
        {
          "id": "meal_20260620_evening_snack_chocolate_protein_mug_cake",
          "name": "Chocolate Protein Mug Cake",
          "type": "evening_snack",
          "time": "7:15 PM",
          "calories": 358,
          "macros": {
            "protein": 37,
            "carbs": 24,
            "fat": 14,
            "fiber": 3
          },
          "curated_meal_slug": "chocolate_protein_mug_cake",
          "plate_id": "standard",
          "scale_factor": 1.1,
          "isOriginal": true,
          "addedAt": "2026-06-20T19:15:00Z"
        }
      ]
    },
    "2026-06-21": {
      "date": "2026-06-21",
      "dayName": "Sunday",
      "meals": [
        {
          "id": "meal_20260621_breakfast_egg_muffins",
          "name": "Egg Muffins",
          "type": "breakfast",
          "time": "8:30 AM",
          "calories": 553,
          "macros": {
            "protein": 31,
            "carbs": 44,
            "fat": 29,
            "fiber": 6
          },
          "curated_meal_slug": "egg_muffins",
          "plate_id": "standard",
          "scale_factor": 0.7,
          "isOriginal": true,
          "addedAt": "2026-06-21T08:30:00Z"
        },
        {
          "id": "meal_20260621_morning_snack_dried_fruit",
          "name": "Dried Fruit",
          "type": "morning_snack",
          "time": "10:45 AM",
          "calories": 72,
          "macros": {
            "protein": 1,
            "carbs": 17,
            "fat": 0,
            "fiber": 2
          },
          "curated_meal_slug": "dried_fruit",
          "plate_id": "standard",
          "scale_factor": 0.55,
          "isOriginal": true,
          "addedAt": "2026-06-21T10:45:00Z"
        },
        {
          "id": "meal_20260621_brunch_baked_oats",
          "name": "Baked Oats",
          "type": "brunch",
          "time": "12:15 PM",
          "calories": 1000,
          "macros": {
            "protein": 64,
            "carbs": 130,
            "fat": 24,
            "fiber": 14
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 1.25,
          "isOriginal": true,
          "addedAt": "2026-06-21T12:15:00Z"
        },
        {
          "id": "meal_20260621_adj_protein_bar",
          "name": "Protein Bar",
          "type": "snack",
          "time": "1:30 PM",
          "calories": 220,
          "macros": {
            "protein": 20,
            "carbs": 22,
            "fat": 7,
            "fiber": 5
          },
          "curated_meal_slug": "protein_bar",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-06-21T13:30:00Z"
        },
        {
          "id": "meal_20260621_lunch_cevapi",
          "name": "Ćevapi with Flatbread",
          "type": "lunch",
          "time": "3:00 PM",
          "calories": 564,
          "macros": {
            "protein": 36,
            "carbs": 50,
            "fat": 24,
            "fiber": 5
          },
          "curated_meal_slug": "cevapi",
          "plate_id": "flatbread",
          "scale_factor": 0.7,
          "isOriginal": true,
          "addedAt": "2026-06-21T15:00:00Z"
        },
        {
          "id": "meal_20260621_adj_tuna_pouch",
          "name": "Tuna Pouch",
          "type": "snack",
          "time": "3:00 PM",
          "calories": 110,
          "macros": {
            "protein": 25,
            "carbs": 0,
            "fat": 1,
            "fiber": 0
          },
          "curated_meal_slug": "tuna_pouch",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-06-21T15:00:00Z"
        },
        {
          "id": "meal_20260621_afternoon_snack_beef_jerky",
          "name": "Beef Jerky",
          "type": "afternoon_snack",
          "time": "5:00 PM",
          "calories": 213,
          "macros": {
            "protein": 26,
            "carbs": 9,
            "fat": 6,
            "fiber": 0
          },
          "curated_meal_slug": "beef_jerky",
          "plate_id": "standard",
          "scale_factor": 1.85,
          "isOriginal": true,
          "addedAt": "2026-06-21T17:00:00Z"
        },
        {
          "id": "meal_20260621_dinner_honey_soy_salmon_noodles",
          "name": "Honey Soy Salmon Noodle Bowl",
          "type": "dinner",
          "time": "6:30 PM",
          "calories": 492,
          "macros": {
            "protein": 32,
            "carbs": 45,
            "fat": 20,
            "fiber": 3
          },
          "curated_meal_slug": "honey_soy_salmon_noodles",
          "plate_id": "standard",
          "scale_factor": 0.6,
          "isOriginal": true,
          "addedAt": "2026-06-21T18:30:00Z"
        },
        {
          "id": "meal_20260621_adj_steamed_mixed_veg",
          "name": "Steamed Mixed Veg",
          "type": "snack",
          "time": "6:30 PM",
          "calories": 65,
          "macros": {
            "protein": 4,
            "carbs": 11,
            "fat": 1,
            "fiber": 5
          },
          "curated_meal_slug": "steamed_mixed_veg",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-06-21T18:30:00Z"
        }
      ]
    },
    "2026-06-22": {
      "date": "2026-06-22",
      "dayName": "Monday",
      "meals": [
        {
          "id": "meal_20260622_breakfast_egg_muffins",
          "name": "Egg Muffins",
          "type": "breakfast",
          "time": "8:30 AM",
          "calories": 592,
          "macros": {
            "protein": 33,
            "carbs": 47,
            "fat": 31,
            "fiber": 6
          },
          "curated_meal_slug": "egg_muffins",
          "plate_id": "standard",
          "scale_factor": 0.75,
          "isOriginal": true,
          "addedAt": "2026-06-22T08:30:00Z"
        },
        {
          "id": "meal_20260622_morning_snack_dried_fruit",
          "name": "Dried Fruit",
          "type": "morning_snack",
          "time": "10:45 AM",
          "calories": 91,
          "macros": {
            "protein": 1,
            "carbs": 22,
            "fat": 0,
            "fiber": 2
          },
          "curated_meal_slug": "dried_fruit",
          "plate_id": "standard",
          "scale_factor": 0.7,
          "isOriginal": true,
          "addedAt": "2026-06-22T10:45:00Z"
        },
        {
          "id": "meal_20260622_brunch_baked_oats",
          "name": "Baked Oats",
          "type": "brunch",
          "time": "12:15 PM",
          "calories": 800,
          "macros": {
            "protein": 51,
            "carbs": 104,
            "fat": 19,
            "fiber": 11
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-06-22T12:15:00Z"
        },
        {
          "id": "meal_20260622_adj_protein_bar",
          "name": "Protein Bar",
          "type": "snack",
          "time": "1:30 PM",
          "calories": 220,
          "macros": {
            "protein": 20,
            "carbs": 22,
            "fat": 7,
            "fiber": 5
          },
          "curated_meal_slug": "protein_bar",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-06-22T13:30:00Z"
        },
        {
          "id": "meal_20260622_lunch_cevapi",
          "name": "Ćevapi with Flatbread",
          "type": "lunch",
          "time": "3:00 PM",
          "calories": 484,
          "macros": {
            "protein": 31,
            "carbs": 43,
            "fat": 21,
            "fiber": 4
          },
          "curated_meal_slug": "cevapi",
          "plate_id": "flatbread",
          "scale_factor": 0.6,
          "isOriginal": true,
          "addedAt": "2026-06-22T15:00:00Z"
        },
        {
          "id": "meal_20260622_adj_tuna_pouch",
          "name": "Tuna Pouch",
          "type": "snack",
          "time": "3:00 PM",
          "calories": 110,
          "macros": {
            "protein": 25,
            "carbs": 0,
            "fat": 1,
            "fiber": 0
          },
          "curated_meal_slug": "tuna_pouch",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-06-22T15:00:00Z"
        },
        {
          "id": "meal_20260622_adj_protein_shake",
          "name": "Protein Shake",
          "type": "snack",
          "time": "3:00 PM",
          "calories": 250,
          "macros": {
            "protein": 35,
            "carbs": 16,
            "fat": 5,
            "fiber": 0
          },
          "curated_meal_slug": "protein_shake",
          "plate_id": "standard",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-06-22T15:00:00Z"
        },
        {
          "id": "meal_20260622_afternoon_snack_banana_snack",
          "name": "Banana",
          "type": "afternoon_snack",
          "time": "5:00 PM",
          "calories": 284,
          "macros": {
            "protein": 3,
            "carbs": 73,
            "fat": 0,
            "fiber": 8
          },
          "curated_meal_slug": "banana_snack",
          "plate_id": "standard",
          "scale_factor": 2.7,
          "isOriginal": true,
          "addedAt": "2026-06-22T17:00:00Z"
        },
        {
          "id": "meal_20260622_dinner_honey_soy_salmon_noodles",
          "name": "Honey Soy Salmon Noodle Bowl",
          "type": "dinner",
          "time": "6:30 PM",
          "calories": 492,
          "macros": {
            "protein": 32,
            "carbs": 45,
            "fat": 20,
            "fiber": 3
          },
          "curated_meal_slug": "honey_soy_salmon_noodles",
          "plate_id": "standard",
          "scale_factor": 0.6,
          "isOriginal": true,
          "addedAt": "2026-06-22T18:30:00Z"
        }
      ]
    }
  },
  "grocery_list": {
    "total_estimated_cost_low": 208.3,
    "total_estimated_cost_high": 230,
    "currency": "AU$",
    "categories": [
      {
        "category_name": "Meat & Seafood",
        "items": [
          {
            "item_name": "Chicken breast fillet",
            "quantity": "700",
            "unit": "g",
            "estimated_price": 9.5,
            "is_purchased": false
          },
          {
            "item_name": "Chicken thigh fillet",
            "quantity": "600",
            "unit": "g",
            "estimated_price": 8.5,
            "is_purchased": false
          },
          {
            "item_name": "Beef/lamb mince",
            "quantity": "500",
            "unit": "g",
            "estimated_price": 7.5,
            "is_purchased": false
          },
          {
            "item_name": "Salmon fillets",
            "quantity": "4",
            "unit": "fillets",
            "estimated_price": 22.0,
            "is_purchased": false
          },
          {
            "item_name": "Shaved ham",
            "quantity": "100",
            "unit": "g",
            "estimated_price": 3.5,
            "is_purchased": false
          }
        ]
      },
      {
        "category_name": "Pantry & Dry Goods",
        "items": [
          {
            "item_name": "Rolled oats",
            "quantity": "1",
            "unit": "kg",
            "estimated_price": 1.8,
            "is_purchased": false
          },
          {
            "item_name": "Jasmine rice",
            "quantity": "1",
            "unit": "kg",
            "estimated_price": 3.5,
            "is_purchased": false
          },
          {
            "item_name": "Egg/hokkien noodles",
            "quantity": "440",
            "unit": "g",
            "estimated_price": 3.0,
            "is_purchased": false
          },
          {
            "item_name": "Lebanese flatbread",
            "quantity": "6",
            "unit": "pack",
            "estimated_price": 3.5,
            "is_purchased": false
          },
          {
            "item_name": "Butter chicken simmer sauce",
            "quantity": "2",
            "unit": "jars (485g)",
            "estimated_price": 7.0,
            "is_purchased": false
          },
          {
            "item_name": "Honey",
            "quantity": "500",
            "unit": "g",
            "estimated_price": 6.0,
            "is_purchased": false
          },
          {
            "item_name": "Soy sauce",
            "quantity": "250",
            "unit": "ml",
            "estimated_price": 2.5,
            "is_purchased": false
          },
          {
            "item_name": "Cornflour",
            "quantity": "200",
            "unit": "g",
            "estimated_price": 1.5,
            "is_purchased": false
          },
          {
            "item_name": "Protein cookies",
            "quantity": "1",
            "unit": "pack",
            "estimated_price": 5.0,
            "is_purchased": false
          },
          {
            "item_name": "Smooth peanut butter",
            "quantity": "375",
            "unit": "g",
            "estimated_price": 4.5,
            "is_purchased": false
          },
          {
            "item_name": "Cocoa powder",
            "quantity": "125",
            "unit": "g",
            "estimated_price": 3.0,
            "is_purchased": false
          },
          {
            "item_name": "Baking powder",
            "quantity": "1",
            "unit": "tub",
            "estimated_price": 2.0,
            "is_purchased": false
          },
          {
            "item_name": "Mixed nuts/seeds",
            "quantity": "200",
            "unit": "g",
            "estimated_price": 4.5,
            "is_purchased": false
          },
          {
            "item_name": "Tuna pouches",
            "quantity": "7",
            "unit": "x 95g",
            "estimated_price": 14.0,
            "is_purchased": false
          },
          {
            "item_name": "Beef jerky",
            "quantity": "250",
            "unit": "g",
            "estimated_price": 18.0,
            "is_purchased": false
          },
          {
            "item_name": "Protein bars",
            "quantity": "3",
            "unit": "bars",
            "estimated_price": 7.5,
            "is_purchased": false
          },
          {
            "item_name": "Mixed dried fruit",
            "quantity": "375",
            "unit": "g",
            "estimated_price": 5.5,
            "is_purchased": false
          },
          {
            "item_name": "Dark chocolate block",
            "quantity": "1",
            "unit": "block",
            "estimated_price": 4.0,
            "is_purchased": false
          }
        ]
      },
      {
        "category_name": "Dairy & Chilled",
        "items": [
          {
            "item_name": "Eggs",
            "quantity": "18",
            "unit": "pack",
            "estimated_price": 7.5,
            "is_purchased": false
          },
          {
            "item_name": "Full-cream milk",
            "quantity": "3",
            "unit": "L",
            "estimated_price": 4.5,
            "is_purchased": false
          },
          {
            "item_name": "Cottage cheese",
            "quantity": "500",
            "unit": "g",
            "estimated_price": 5.0,
            "is_purchased": false
          },
          {
            "item_name": "Greek yoghurt",
            "quantity": "1",
            "unit": "kg",
            "estimated_price": 6.0,
            "is_purchased": false
          },
          {
            "item_name": "Tasty cheese block",
            "quantity": "250",
            "unit": "g",
            "estimated_price": 5.5,
            "is_purchased": false
          },
          {
            "item_name": "Thickened cream",
            "quantity": "300",
            "unit": "ml",
            "estimated_price": 2.5,
            "is_purchased": false
          },
          {
            "item_name": "Choc chips",
            "quantity": "200",
            "unit": "g",
            "estimated_price": 3.0,
            "is_purchased": false
          }
        ]
      },
      {
        "category_name": "Produce",
        "items": [
          {
            "item_name": "Bananas",
            "quantity": "2",
            "unit": "kg",
            "estimated_price": 5.5,
            "is_purchased": false
          },
          {
            "item_name": "Frozen mixed berries",
            "quantity": "500",
            "unit": "g",
            "estimated_price": 6.0,
            "is_purchased": false
          },
          {
            "item_name": "Frozen mixed vegetables",
            "quantity": "1",
            "unit": "kg",
            "estimated_price": 4.0,
            "is_purchased": false
          },
          {
            "item_name": "Brown onion",
            "quantity": "3",
            "unit": "each",
            "estimated_price": 1.5,
            "is_purchased": false
          },
          {
            "item_name": "Garlic",
            "quantity": "1",
            "unit": "bulb",
            "estimated_price": 1.0,
            "is_purchased": false
          },
          {
            "item_name": "Red capsicum",
            "quantity": "2",
            "unit": "each",
            "estimated_price": 4.0,
            "is_purchased": false
          },
          {
            "item_name": "Baby spinach",
            "quantity": "120",
            "unit": "g",
            "estimated_price": 3.5,
            "is_purchased": false
          },
          {
            "item_name": "Fresh ginger",
            "quantity": "1",
            "unit": "small knob",
            "estimated_price": 1.0,
            "is_purchased": false
          }
        ]
      },
      {
        "category_name": "Supplements",
        "items": [
          {
            "item_name": "Whey/protein powder",
            "quantity": "~22",
            "unit": "scoops",
            "estimated_price": 0,
            "is_purchased": false,
            "notes": "Bought from your supplement supplier, not Woolworths"
          }
        ]
      }
    ]
  },
  "metadata": {
    "generatedAt": "2026-06-16T09:00:00Z",
    "totalCost_low": 208.3,
    "totalCost_high": 230,
    "duration": 7
  }
};

// MealPlanPreviewScreen and the rest of the app consume a *saved* MealPlan
// whose `data` field holds the SimplifiedMealPlan above. This mirrors how a
// real curated plan is stored in NutritionHomeScreen.handleToggleSaveMealPlan:
//   { id, name, duration, meals, data: <SimplifiedMealPlan>, fingerprint, createdAt }
// Without this wrapper the screen reads plan.data.dailyMeals as undefined and
// shows "This plan doesn't have detailed day data."
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