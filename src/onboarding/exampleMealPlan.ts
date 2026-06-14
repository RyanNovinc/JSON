// This is the inner SimplifiedMealPlan (curated-meal-picker shape): meals live
// under dailyMeals, keyed by date. It is NOT what screens consume directly —
// see the wrapped `exampleMealPlan` export at the bottom of this file.
const exampleMealPlanData = {
  "id": "mealplan_20260613100000",
  "name": "7-Day Lean Bulk",
  "startDate": "2026-06-14",
  "endDate": "2026-06-20",
  "dailyMeals": {
    "2026-06-14": {
      "date": "2026-06-14",
      "dayName": "Sunday",
      "meals": [
        {
          "id": "meal_20260614_breakfast",
          "name": "Baked Oats",
          "type": "breakfast",
          "time": "8:00 AM",
          "calories": 960,
          "macros": {
            "protein": 61.2,
            "carbs": 124.8,
            "fat": 22.8,
            "fiber": 13.2
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 1.2,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260614_amshake",
          "name": "Protein Shake",
          "type": "morning_snack",
          "time": "11:00 AM",
          "calories": 120,
          "macros": {
            "protein": 24,
            "carbs": 3,
            "fat": 1.5,
            "fiber": 0
          },
          "ingredients": [
            {
              "item": "Whey protein powder",
              "amount": "30",
              "unit": "g",
              "notes": "1 scoop"
            },
            {
              "item": "Water",
              "amount": "300",
              "unit": "ml",
              "notes": ""
            }
          ],
          "instructions": [
            "Add 30 g whey protein and 300 ml water to a shaker",
            "Shake well and drink"
          ],
          "tags": [
            "adjuster",
            "high_protein"
          ],
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260614_lunch",
          "name": "Chilli Con Carne",
          "type": "lunch",
          "time": "1:45 PM",
          "calories": 775,
          "macros": {
            "protein": 52.5,
            "carbs": 47.5,
            "fat": 40.0,
            "fiber": 17.5
          },
          "curated_meal_slug": "chilli_con_carne",
          "plate_id": "chilli_con_carne",
          "scale_factor": 1.25,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260614_riceside",
          "name": "Steamed Rice",
          "type": "second_lunch",
          "time": "1:45 PM",
          "calories": 130,
          "macros": {
            "protein": 2.7,
            "carbs": 28,
            "fat": 0.3,
            "fiber": 0.4
          },
          "ingredients": [
            {
              "item": "Cooked jasmine rice",
              "amount": "100",
              "unit": "g",
              "notes": "~1/3 cup cooked"
            }
          ],
          "instructions": [
            "Steam or microwave 100 g pre-cooked jasmine rice until hot"
          ],
          "tags": [
            "adjuster",
            "side"
          ],
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260614_pmshake",
          "name": "Protein Shake",
          "type": "afternoon_snack",
          "time": "4:00 PM",
          "calories": 120,
          "macros": {
            "protein": 24,
            "carbs": 3,
            "fat": 1.5,
            "fiber": 0
          },
          "ingredients": [
            {
              "item": "Whey protein powder",
              "amount": "30",
              "unit": "g",
              "notes": "1 scoop"
            },
            {
              "item": "Water",
              "amount": "300",
              "unit": "ml",
              "notes": ""
            }
          ],
          "instructions": [
            "Add 30 g whey protein and 300 ml water to a shaker",
            "Shake well and drink"
          ],
          "tags": [
            "adjuster",
            "high_protein"
          ],
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260614_dinner",
          "name": "Salmon, Roast Potatoes & Greens",
          "type": "dinner",
          "time": "7:30 PM",
          "calories": 858,
          "macros": {
            "protein": 50.6,
            "carbs": 63.8,
            "fat": 41.8,
            "fiber": 7.7
          },
          "curated_meal_slug": "sheet_pan_salmon_potatoes",
          "plate_id": "standard",
          "scale_factor": 1.1,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        }
      ]
    },
    "2026-06-15": {
      "date": "2026-06-15",
      "dayName": "Monday",
      "meals": [
        {
          "id": "meal_20260615_breakfast",
          "name": "Baked Oats",
          "type": "breakfast",
          "time": "8:00 AM",
          "calories": 1000,
          "macros": {
            "protein": 63.8,
            "carbs": 130.0,
            "fat": 23.8,
            "fiber": 13.8
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 1.25,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260615_amshake",
          "name": "Protein Shake",
          "type": "morning_snack",
          "time": "11:00 AM",
          "calories": 120,
          "macros": {
            "protein": 24,
            "carbs": 3,
            "fat": 1.5,
            "fiber": 0
          },
          "ingredients": [
            {
              "item": "Whey protein powder",
              "amount": "30",
              "unit": "g",
              "notes": "1 scoop"
            },
            {
              "item": "Water",
              "amount": "300",
              "unit": "ml",
              "notes": ""
            }
          ],
          "instructions": [
            "Add 30 g whey protein and 300 ml water to a shaker",
            "Shake well and drink"
          ],
          "tags": [
            "adjuster",
            "high_protein"
          ],
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260615_lunch",
          "name": "Chilli Con Carne",
          "type": "lunch",
          "time": "1:45 PM",
          "calories": 806,
          "macros": {
            "protein": 54.6,
            "carbs": 49.4,
            "fat": 41.6,
            "fiber": 18.2
          },
          "curated_meal_slug": "chilli_con_carne",
          "plate_id": "chilli_con_carne",
          "scale_factor": 1.3,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260615_riceside",
          "name": "Steamed Rice",
          "type": "second_lunch",
          "time": "1:45 PM",
          "calories": 130,
          "macros": {
            "protein": 2.7,
            "carbs": 28,
            "fat": 0.3,
            "fiber": 0.4
          },
          "ingredients": [
            {
              "item": "Cooked jasmine rice",
              "amount": "100",
              "unit": "g",
              "notes": "~1/3 cup cooked"
            }
          ],
          "instructions": [
            "Steam or microwave 100 g pre-cooked jasmine rice until hot"
          ],
          "tags": [
            "adjuster",
            "side"
          ],
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260615_pmshake",
          "name": "Protein Shake",
          "type": "afternoon_snack",
          "time": "4:00 PM",
          "calories": 120,
          "macros": {
            "protein": 24,
            "carbs": 3,
            "fat": 1.5,
            "fiber": 0
          },
          "ingredients": [
            {
              "item": "Whey protein powder",
              "amount": "30",
              "unit": "g",
              "notes": "1 scoop"
            },
            {
              "item": "Water",
              "amount": "300",
              "unit": "ml",
              "notes": ""
            }
          ],
          "instructions": [
            "Add 30 g whey protein and 300 ml water to a shaker",
            "Shake well and drink"
          ],
          "tags": [
            "adjuster",
            "high_protein"
          ],
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260615_dinner",
          "name": "Salmon, Roast Potatoes & Greens",
          "type": "dinner",
          "time": "7:30 PM",
          "calories": 897,
          "macros": {
            "protein": 52.9,
            "carbs": 66.7,
            "fat": 43.7,
            "fiber": 8.0
          },
          "curated_meal_slug": "sheet_pan_salmon_potatoes",
          "plate_id": "standard",
          "scale_factor": 1.15,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        }
      ]
    },
    "2026-06-16": {
      "date": "2026-06-16",
      "dayName": "Tuesday",
      "meals": [
        {
          "id": "meal_20260616_breakfast",
          "name": "Baked Oats",
          "type": "breakfast",
          "time": "8:00 AM",
          "calories": 960,
          "macros": {
            "protein": 61.2,
            "carbs": 124.8,
            "fat": 22.8,
            "fiber": 13.2
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 1.2,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260616_amshake",
          "name": "Protein Shake",
          "type": "morning_snack",
          "time": "11:00 AM",
          "calories": 120,
          "macros": {
            "protein": 24,
            "carbs": 3,
            "fat": 1.5,
            "fiber": 0
          },
          "ingredients": [
            {
              "item": "Whey protein powder",
              "amount": "30",
              "unit": "g",
              "notes": "1 scoop"
            },
            {
              "item": "Water",
              "amount": "300",
              "unit": "ml",
              "notes": ""
            }
          ],
          "instructions": [
            "Add 30 g whey protein and 300 ml water to a shaker",
            "Shake well and drink"
          ],
          "tags": [
            "adjuster",
            "high_protein"
          ],
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260616_lunch",
          "name": "Chilli Con Carne",
          "type": "lunch",
          "time": "1:45 PM",
          "calories": 806,
          "macros": {
            "protein": 54.6,
            "carbs": 49.4,
            "fat": 41.6,
            "fiber": 18.2
          },
          "curated_meal_slug": "chilli_con_carne",
          "plate_id": "chilli_con_carne",
          "scale_factor": 1.3,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260616_riceside",
          "name": "Steamed Rice",
          "type": "second_lunch",
          "time": "1:45 PM",
          "calories": 130,
          "macros": {
            "protein": 2.7,
            "carbs": 28,
            "fat": 0.3,
            "fiber": 0.4
          },
          "ingredients": [
            {
              "item": "Cooked jasmine rice",
              "amount": "100",
              "unit": "g",
              "notes": "~1/3 cup cooked"
            }
          ],
          "instructions": [
            "Steam or microwave 100 g pre-cooked jasmine rice until hot"
          ],
          "tags": [
            "adjuster",
            "side"
          ],
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260616_pmshake",
          "name": "Protein Shake",
          "type": "afternoon_snack",
          "time": "4:00 PM",
          "calories": 120,
          "macros": {
            "protein": 24,
            "carbs": 3,
            "fat": 1.5,
            "fiber": 0
          },
          "ingredients": [
            {
              "item": "Whey protein powder",
              "amount": "30",
              "unit": "g",
              "notes": "1 scoop"
            },
            {
              "item": "Water",
              "amount": "300",
              "unit": "ml",
              "notes": ""
            }
          ],
          "instructions": [
            "Add 30 g whey protein and 300 ml water to a shaker",
            "Shake well and drink"
          ],
          "tags": [
            "adjuster",
            "high_protein"
          ],
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260616_dinner",
          "name": "Salmon, Roast Potatoes & Greens",
          "type": "dinner",
          "time": "7:30 PM",
          "calories": 858,
          "macros": {
            "protein": 50.6,
            "carbs": 63.8,
            "fat": 41.8,
            "fiber": 7.7
          },
          "curated_meal_slug": "sheet_pan_salmon_potatoes",
          "plate_id": "standard",
          "scale_factor": 1.1,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        }
      ]
    },
    "2026-06-17": {
      "date": "2026-06-17",
      "dayName": "Wednesday",
      "meals": [
        {
          "id": "meal_20260617_breakfast",
          "name": "Big Breakfast Plate",
          "type": "breakfast",
          "time": "8:00 AM",
          "calories": 1017,
          "macros": {
            "protein": 63.0,
            "carbs": 70.2,
            "fat": 53.1,
            "fiber": 9.9
          },
          "curated_meal_slug": "big_breakfast_plate",
          "plate_id": "standard",
          "scale_factor": 0.9,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260617_amshake",
          "name": "Protein Shake",
          "type": "morning_snack",
          "time": "11:00 AM",
          "calories": 120,
          "macros": {
            "protein": 24,
            "carbs": 3,
            "fat": 1.5,
            "fiber": 0
          },
          "ingredients": [
            {
              "item": "Whey protein powder",
              "amount": "30",
              "unit": "g",
              "notes": "1 scoop"
            },
            {
              "item": "Water",
              "amount": "300",
              "unit": "ml",
              "notes": ""
            }
          ],
          "instructions": [
            "Add 30 g whey protein and 300 ml water to a shaker",
            "Shake well and drink"
          ],
          "tags": [
            "adjuster",
            "high_protein"
          ],
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260617_lunch",
          "name": "Chilli Con Carne",
          "type": "lunch",
          "time": "1:45 PM",
          "calories": 806,
          "macros": {
            "protein": 54.6,
            "carbs": 49.4,
            "fat": 41.6,
            "fiber": 18.2
          },
          "curated_meal_slug": "chilli_con_carne",
          "plate_id": "chilli_con_carne",
          "scale_factor": 1.3,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260617_dinner",
          "name": "Honey Chicken over Jasmine Rice",
          "type": "dinner",
          "time": "7:30 PM",
          "calories": 1022,
          "macros": {
            "protein": 70.2,
            "carbs": 135.2,
            "fat": 19.5,
            "fiber": 2.6
          },
          "curated_meal_slug": "honey_chicken",
          "plate_id": "standard",
          "scale_factor": 1.3,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260617_vegside",
          "name": "Steamed Mixed Veg",
          "type": "evening_snack",
          "time": "7:30 PM",
          "calories": 60,
          "macros": {
            "protein": 4,
            "carbs": 8,
            "fat": 1,
            "fiber": 5
          },
          "ingredients": [
            {
              "item": "Frozen mixed vegetables",
              "amount": "150",
              "unit": "g",
              "notes": ""
            }
          ],
          "instructions": [
            "Microwave 150 g frozen mixed vegetables for ~4 minutes until hot"
          ],
          "tags": [
            "adjuster",
            "side",
            "vegetables"
          ],
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        }
      ]
    },
    "2026-06-18": {
      "date": "2026-06-18",
      "dayName": "Thursday",
      "meals": [
        {
          "id": "meal_20260618_breakfast",
          "name": "Baked Oats",
          "type": "breakfast",
          "time": "8:00 AM",
          "calories": 1160,
          "macros": {
            "protein": 74.0,
            "carbs": 150.8,
            "fat": 27.6,
            "fiber": 15.9
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 1.45,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260618_amshake",
          "name": "Protein Shake",
          "type": "morning_snack",
          "time": "11:00 AM",
          "calories": 120,
          "macros": {
            "protein": 24,
            "carbs": 3,
            "fat": 1.5,
            "fiber": 0
          },
          "ingredients": [
            {
              "item": "Whey protein powder",
              "amount": "30",
              "unit": "g",
              "notes": "1 scoop"
            },
            {
              "item": "Water",
              "amount": "300",
              "unit": "ml",
              "notes": ""
            }
          ],
          "instructions": [
            "Add 30 g whey protein and 300 ml water to a shaker",
            "Shake well and drink"
          ],
          "tags": [
            "adjuster",
            "high_protein"
          ],
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260618_lunch",
          "name": "Ćevapi with Flatbread",
          "type": "lunch",
          "time": "1:45 PM",
          "calories": 806,
          "macros": {
            "protein": 51.0,
            "carbs": 71.0,
            "fat": 35.0,
            "fiber": 7.0
          },
          "curated_meal_slug": "cevapi",
          "plate_id": "flatbread",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260618_dinner",
          "name": "Honey Chicken over Jasmine Rice",
          "type": "dinner",
          "time": "7:30 PM",
          "calories": 943,
          "macros": {
            "protein": 64.8,
            "carbs": 124.8,
            "fat": 18.0,
            "fiber": 2.4
          },
          "curated_meal_slug": "honey_chicken",
          "plate_id": "standard",
          "scale_factor": 1.2,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260618_vegside",
          "name": "Steamed Mixed Veg",
          "type": "evening_snack",
          "time": "7:30 PM",
          "calories": 120,
          "macros": {
            "protein": 8,
            "carbs": 16,
            "fat": 2,
            "fiber": 10
          },
          "ingredients": [
            {
              "item": "Frozen mixed vegetables",
              "amount": "300",
              "unit": "g",
              "notes": ""
            }
          ],
          "instructions": [
            "Microwave 300 g frozen mixed vegetables for ~8 minutes until hot"
          ],
          "tags": [
            "adjuster",
            "side",
            "vegetables"
          ],
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        }
      ]
    },
    "2026-06-19": {
      "date": "2026-06-19",
      "dayName": "Friday",
      "meals": [
        {
          "id": "meal_20260619_breakfast",
          "name": "Baked Oats",
          "type": "breakfast",
          "time": "8:00 AM",
          "calories": 1160,
          "macros": {
            "protein": 74.0,
            "carbs": 150.8,
            "fat": 27.6,
            "fiber": 15.9
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 1.45,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260619_amshake",
          "name": "Protein Shake",
          "type": "morning_snack",
          "time": "11:00 AM",
          "calories": 120,
          "macros": {
            "protein": 24,
            "carbs": 3,
            "fat": 1.5,
            "fiber": 0
          },
          "ingredients": [
            {
              "item": "Whey protein powder",
              "amount": "30",
              "unit": "g",
              "notes": "1 scoop"
            },
            {
              "item": "Water",
              "amount": "300",
              "unit": "ml",
              "notes": ""
            }
          ],
          "instructions": [
            "Add 30 g whey protein and 300 ml water to a shaker",
            "Shake well and drink"
          ],
          "tags": [
            "adjuster",
            "high_protein"
          ],
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260619_lunch",
          "name": "Ćevapi with Flatbread",
          "type": "lunch",
          "time": "1:45 PM",
          "calories": 806,
          "macros": {
            "protein": 51.0,
            "carbs": 71.0,
            "fat": 35.0,
            "fiber": 7.0
          },
          "curated_meal_slug": "cevapi",
          "plate_id": "flatbread",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260619_dinner",
          "name": "Honey Chicken over Jasmine Rice",
          "type": "dinner",
          "time": "7:30 PM",
          "calories": 943,
          "macros": {
            "protein": 64.8,
            "carbs": 124.8,
            "fat": 18.0,
            "fiber": 2.4
          },
          "curated_meal_slug": "honey_chicken",
          "plate_id": "standard",
          "scale_factor": 1.2,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260619_vegside",
          "name": "Steamed Mixed Veg",
          "type": "evening_snack",
          "time": "7:30 PM",
          "calories": 120,
          "macros": {
            "protein": 8,
            "carbs": 16,
            "fat": 2,
            "fiber": 10
          },
          "ingredients": [
            {
              "item": "Frozen mixed vegetables",
              "amount": "300",
              "unit": "g",
              "notes": ""
            }
          ],
          "instructions": [
            "Microwave 300 g frozen mixed vegetables for ~8 minutes until hot"
          ],
          "tags": [
            "adjuster",
            "side",
            "vegetables"
          ],
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        }
      ]
    },
    "2026-06-20": {
      "date": "2026-06-20",
      "dayName": "Saturday",
      "meals": [
        {
          "id": "meal_20260620_breakfast",
          "name": "Baked Oats",
          "type": "breakfast",
          "time": "8:00 AM",
          "calories": 1160,
          "macros": {
            "protein": 74.0,
            "carbs": 150.8,
            "fat": 27.6,
            "fiber": 15.9
          },
          "curated_meal_slug": "baked_oats",
          "plate_id": "standard",
          "scale_factor": 1.45,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260620_amshake",
          "name": "Protein Shake",
          "type": "morning_snack",
          "time": "11:00 AM",
          "calories": 120,
          "macros": {
            "protein": 24,
            "carbs": 3,
            "fat": 1.5,
            "fiber": 0
          },
          "ingredients": [
            {
              "item": "Whey protein powder",
              "amount": "30",
              "unit": "g",
              "notes": "1 scoop"
            },
            {
              "item": "Water",
              "amount": "300",
              "unit": "ml",
              "notes": ""
            }
          ],
          "instructions": [
            "Add 30 g whey protein and 300 ml water to a shaker",
            "Shake well and drink"
          ],
          "tags": [
            "adjuster",
            "high_protein"
          ],
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260620_lunch",
          "name": "Ćevapi with Flatbread",
          "type": "lunch",
          "time": "1:45 PM",
          "calories": 806,
          "macros": {
            "protein": 51.0,
            "carbs": 71.0,
            "fat": 35.0,
            "fiber": 7.0
          },
          "curated_meal_slug": "cevapi",
          "plate_id": "flatbread",
          "scale_factor": 1.0,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260620_dinner",
          "name": "Honey Chicken over Jasmine Rice",
          "type": "dinner",
          "time": "7:30 PM",
          "calories": 982,
          "macros": {
            "protein": 67.5,
            "carbs": 130.0,
            "fat": 18.8,
            "fiber": 2.5
          },
          "curated_meal_slug": "honey_chicken",
          "plate_id": "standard",
          "scale_factor": 1.25,
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        },
        {
          "id": "meal_20260620_vegside",
          "name": "Steamed Mixed Veg",
          "type": "evening_snack",
          "time": "7:30 PM",
          "calories": 120,
          "macros": {
            "protein": 8,
            "carbs": 16,
            "fat": 2,
            "fiber": 10
          },
          "ingredients": [
            {
              "item": "Frozen mixed vegetables",
              "amount": "300",
              "unit": "g",
              "notes": ""
            }
          ],
          "instructions": [
            "Microwave 300 g frozen mixed vegetables for ~8 minutes until hot"
          ],
          "tags": [
            "adjuster",
            "side",
            "vegetables"
          ],
          "isOriginal": true,
          "addedAt": "2026-06-13T10:00:00Z"
        }
      ]
    }
  },
  "grocery_list": {
    "total_estimated_cost_low": 175.3,
    "total_estimated_cost_high": 193,
    "currency": "AU$",
    "categories": [
      {
        "category_name": "Meat & Seafood",
        "items": [
          {
            "item_name": "Beef mince",
            "quantity": "1",
            "unit": "kg",
            "estimated_price": 13.0,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Beef/lamb mince (ćevapi)",
            "quantity": "600",
            "unit": "g",
            "estimated_price": 9.0,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Chicken thigh",
            "quantity": "700",
            "unit": "g",
            "estimated_price": 9.0,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Salmon fillets",
            "quantity": "700",
            "unit": "g",
            "estimated_price": 23.0,
            "notes": "~4 fillets",
            "is_purchased": false,
            "alternatives": [
              {
                "item_name": "Frozen salmon portions",
                "quantity": "700",
                "unit": "g",
                "estimated_price": 18.0,
                "notes": "Thaw overnight before use"
              }
            ]
          },
          {
            "item_name": "Bacon",
            "quantity": "250",
            "unit": "g",
            "estimated_price": 5.5,
            "notes": "",
            "is_purchased": false
          }
        ]
      },
      {
        "category_name": "Produce",
        "items": [
          {
            "item_name": "Brown onions",
            "quantity": "1",
            "unit": "kg",
            "estimated_price": 2.5,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Garlic",
            "quantity": "1",
            "unit": "bulb",
            "estimated_price": 1.0,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Red capsicum",
            "quantity": "1",
            "unit": "each",
            "estimated_price": 1.5,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Potatoes",
            "quantity": "1",
            "unit": "kg",
            "estimated_price": 3.5,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Broccoli",
            "quantity": "2",
            "unit": "heads",
            "estimated_price": 5.0,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Mushrooms",
            "quantity": "200",
            "unit": "g",
            "estimated_price": 2.5,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Tomatoes",
            "quantity": "2",
            "unit": "each",
            "estimated_price": 2.0,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Bananas",
            "quantity": "4",
            "unit": "each",
            "estimated_price": 2.0,
            "notes": "",
            "is_purchased": false
          }
        ]
      },
      {
        "category_name": "Pantry",
        "items": [
          {
            "item_name": "Rolled oats",
            "quantity": "1",
            "unit": "kg",
            "estimated_price": 2.5,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Jasmine rice",
            "quantity": "1",
            "unit": "kg",
            "estimated_price": 3.0,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Red kidney beans",
            "quantity": "2",
            "unit": "x 400g can",
            "estimated_price": 2.2,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Diced tomatoes",
            "quantity": "2",
            "unit": "x 400g can",
            "estimated_price": 2.2,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Tomato paste",
            "quantity": "1",
            "unit": "jar",
            "estimated_price": 1.0,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Baked beans",
            "quantity": "1",
            "unit": "can",
            "estimated_price": 1.3,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Honey",
            "quantity": "500",
            "unit": "g",
            "estimated_price": 5.0,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Soy sauce",
            "quantity": "1",
            "unit": "bottle",
            "estimated_price": 2.5,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Cornflour",
            "quantity": "1",
            "unit": "pack",
            "estimated_price": 1.5,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Pita/flatbread",
            "quantity": "6",
            "unit": "pack",
            "estimated_price": 3.5,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Bread",
            "quantity": "1",
            "unit": "loaf",
            "estimated_price": 3.5,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Olive oil",
            "quantity": "500",
            "unit": "ml",
            "estimated_price": 7.0,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Spices (paprika, cumin, chilli powder, baking powder)",
            "quantity": "1",
            "unit": "set",
            "estimated_price": 6.0,
            "notes": "",
            "is_purchased": false
          }
        ]
      },
      {
        "category_name": "Dairy & Eggs",
        "items": [
          {
            "item_name": "Full-cream milk",
            "quantity": "2",
            "unit": "L",
            "estimated_price": 3.1,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Eggs",
            "quantity": "12",
            "unit": "each",
            "estimated_price": 5.5,
            "notes": "",
            "is_purchased": false
          }
        ]
      },
      {
        "category_name": "Frozen",
        "items": [
          {
            "item_name": "Frozen mixed vegetables",
            "quantity": "1.5",
            "unit": "kg",
            "estimated_price": 6.0,
            "notes": "",
            "is_purchased": false
          },
          {
            "item_name": "Frozen berries",
            "quantity": "500",
            "unit": "g",
            "estimated_price": 5.0,
            "notes": "",
            "is_purchased": false
          }
        ]
      },
      {
        "category_name": "Supplements",
        "items": [
          {
            "item_name": "Whey protein",
            "quantity": "1",
            "unit": "kg tub",
            "estimated_price": 35.0,
            "notes": "Bought outside main store (chemist or supplement shop); ~10 scoops used",
            "is_purchased": false,
            "alternatives": [
              {
                "item_name": "Supermarket protein powder",
                "quantity": "1",
                "unit": "kg",
                "estimated_price": 30.0,
                "notes": "Health-food aisle at major supermarkets"
              }
            ]
          }
        ]
      }
    ]
  },
  "metadata": {
    "generatedAt": "2026-06-13T10:00:00Z",
    "totalCost_low": 175.3,
    "totalCost_high": 193,
    "duration": 7
  }
};

// MealPlanPreviewScreen (and the rest of the app) consume a *saved* MealPlan
// whose `data` field holds the SimplifiedMealPlan above. This mirrors exactly
// how a real curated plan is stored in NutritionHomeScreen.handleToggleSaveMealPlan:
//   { id, name, duration, meals, data: <SimplifiedMealPlan>, fingerprint, createdAt }
// Without this wrapper the screen reads plan.data.dailyMeals → undefined and
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