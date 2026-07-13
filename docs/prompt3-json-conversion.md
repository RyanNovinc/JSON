Please convert the meal plan you just created into a specific JSON format that can be imported into my nutrition app called JSON.fit.

# MEAL PLANNING STRUCTURE

This JSON format is designed to work directly with the app's simplified meal planning system. The structure uses dates as keys for easy lookup and management.

# CRITICAL: File Output Instructions

**DO NOT output JSON to chat** — it will hit token limits for plans longer than 7 days.

**You MUST:**
1. Create a file (use Code Interpreter on ChatGPT, or computer tool on Claude)
2. Write the complete JSON structure to the file
3. If you reach output limits, STOP at the end of a complete day, then continue appending to the same file
4. Never stop mid-day or mid-meal
5. When finished, provide the download link

# JSON Schema Required

```json
{
  "id": "string",
  "name": "string",
  "startDate": "string (YYYY-MM-DD format)",
  "endDate": "string (YYYY-MM-DD format)",
  "dailyMeals": {
    "YYYY-MM-DD": {
      "date": "string (YYYY-MM-DD format)",
      "dayName": "string",
      "meals": [
        {
          "id": "string",
          "name": "string",
          "type": "breakfast" | "lunch" | "dinner" | "snack",
          "time": "string (HH:MM AM/PM format)",
          "calories": number,
          "macros": {
            "protein": number,
            "carbs": number,
            "fat": number,
            "fiber": number
          },
          "ingredients": [
            {
              "item": "string",
              "amount": "string",
              "unit": "string",
              "notes": "string"
            }
          ],
          "instructions": ["string array"],
          "tags": ["string array"],
          "isOriginal": true,
          "addedAt": "string (ISO date format)"
        }
      ]
    }
  },
  "grocery_list": {
    "total_estimated_cost": number,
    "currency": "string",
    "categories": [
      {
        "category_name": "string",
        "items": [
          {
            "item_name": "string",
            "quantity": "string",
            "unit": "string",
            "estimated_price": number,
            "notes": "string",
            "is_purchased": false
          }
        ]
      }
    ]
  },
  "meal_prep_session": {
    "session_name": "string",
    "prep_time": number,
    "cook_time": number,
    "total_time": number,
    "covers": "string",
    "recommended_timing": "string",
    "equipment_needed": ["string array"],
    "instructions": ["string array"],
    "storage_guidelines": {
      "key": "string value"
    }
  },
  "metadata": {
    "generatedAt": "string (ISO date format)",
    "totalCost": number,
    "duration": number
  }
}
```

# Field Requirements

## Core Fields (REQUIRED — import validation checks these)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | YES | Unique identifier for the meal plan |
| name | string | YES | Descriptive title for the meal plan |
| startDate | string | YES | Plan start date in YYYY-MM-DD format |
| endDate | string | YES | Plan end date in YYYY-MM-DD format |
| dailyMeals | object | YES | Object with dates as keys and meal data as values |
| metadata.generatedAt | string | YES | ISO date when plan was generated |
| metadata.duration | number | YES | Number of days in the plan |
| metadata.totalCost | number | NO | Estimated total cost of the plan |

## Daily Meals Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| date | string | YES | Date in YYYY-MM-DD format (must match the object key) |
| dayName | string | YES | Day name (e.g. "Monday", "Tuesday") |
| meals | array | YES | Array of meal objects for this day |
| id | string | YES | Unique identifier for each meal |
| name | string | YES | Descriptive meal title |
| type | string | YES | EXACTLY: "breakfast", "lunch", "dinner", or "snack" |
| time | string | YES | Exact meal time (e.g. "7:45 AM", "12:30 PM") |
| calories | number | NO | Total calories per serving |
| macros.protein | number | NO | Grams of protein per serving |
| macros.carbs | number | NO | Grams of carbohydrates per serving |
| macros.fat | number | NO | Grams of fat per serving |
| macros.fiber | number | NO | Grams of fiber per serving |
| ingredients[].item | string | YES | Ingredient name |
| ingredients[].amount | string | YES | Quantity (e.g. "1", "0.5", "200") |
| ingredients[].unit | string | YES | Unit of measurement (e.g. "g", "ml", "cups") |
| ingredients[].notes | string | NO | Ingredient notes or substitutions |
| instructions | array | YES | Step-by-step cooking instructions |
| tags | array | NO | e.g. ["vegetarian", "high-protein", "quick"] |
| isOriginal | boolean | YES | Always set to true for AI-generated meals |
| addedAt | string | YES | ISO date when meal was created |

## Grocery List Fields (OPTIONAL — but required for grocery list UI)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| grocery_list | object | NO* | *Include this for grocery list functionality in the app |
| grocery_list.total_estimated_cost | number | YES | Total estimated cost for the full grocery list |
| grocery_list.currency | string | YES | Currency code (e.g. "AUD", "USD", "GBP") |
| grocery_list.categories | array | YES | Array of category objects |
| categories[].category_name | string | YES | Shopping section name (e.g. "Meat & Seafood", "Dairy") |
| categories[].items | array | YES | Array of item objects in this category |
| items[].item_name | string | YES | Specific product name |
| items[].quantity | string | YES | Amount needed (e.g. "1.4", "2", "500") |
| items[].unit | string | YES | Unit (e.g. "kg", "cans", "bags", "bottles") |
| items[].estimated_price | number | YES | Price in local currency |
| items[].notes | string | YES | Usage notes, storage tips, substitutions |
| items[].is_purchased | boolean | YES | Always set to false (user checks off in app) |

## Meal Prep Session Fields (OPTIONAL — but required for meal prep UI)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| meal_prep_session | object | NO* | *Include this for meal prep walkthrough in the app |
| meal_prep_session.session_name | string | YES | e.g. "Sunday Meal Prep" |
| meal_prep_session.prep_time | number | YES | Active prep time in minutes |
| meal_prep_session.cook_time | number | YES | Passive cooking time in minutes |
| meal_prep_session.total_time | number | YES | prep_time + cook_time |
| meal_prep_session.covers | string | YES | What the prep covers (e.g. "7 days of lunches and dinners") |
| meal_prep_session.recommended_timing | string | YES | When to do it (e.g. "Sunday afternoon") |
| meal_prep_session.equipment_needed | array | YES | List of equipment (e.g. ["Large pot", "Baking trays", "Food containers"]) |
| meal_prep_session.instructions | array | YES | Ordered step-by-step instructions for the full prep session |
| meal_prep_session.storage_guidelines | object | YES | Key-value pairs for storage info (e.g. {"proteins": "Refrigerate 4 days, freeze 3 months"}) |

# Critical Instructions Format Rules

**Instructions must be detailed step-by-step cooking directions (minimum 3-5 steps per recipe):**
- Break down each cooking action into separate steps
- Include cooking temperatures and times where relevant
- Add safety notes for raw ingredients
- Each step should be actionable and specific
- NEVER include "VARIATION:", "BATCH COOK:", or "MEAL PREP:" in instructions
- Put variations, batch cooking tips, and meal prep notes in the "notes" field instead
- Instructions should ONLY contain actual cooking steps needed to make the meal

**Example - WRONG:**
```
"instructions": ["Bake chicken 200°C 25min. Cook rice. Steam broccoli."]
```

**Example - CORRECT:**
```
"instructions": [
  "Preheat oven to 200°C",
  "Season chicken breast with salt and pepper", 
  "Place chicken on baking tray and bake for 25 minutes",
  "Cook rice according to package instructions",
  "Steam broccoli for 5-7 minutes until tender",
  "Serve chicken over rice with broccoli on the side"
]
```

# Ingredient Guidelines

- Use standard cooking measurements (cups, tbsp, oz, lbs, grams)
- Be specific with ingredient names (e.g. "boneless chicken breast" not "chicken")
- Include preparation notes in the notes field of ingredients if needed
- Use common, accessible ingredients

# Timing Requirements - CRITICAL

**Use ORIGINAL cooking times, NOT reheating times:**
- If your meal plan shows "Reheat time: 3 min" for a pre-cooked meal, DO NOT use 3 minutes
- Use the actual time it takes to cook the meal from scratch (e.g., rice = 15 min, pasta = 10-15 min, chicken = 20-25 min)
- Meal prep plans often show quick reheating instructions, but the JSON needs original cooking times
- Assembly-only meals (yogurt bowls, smoothies, toast) can be 2-5 minutes
- Cooked meals should be 15-30+ minutes depending on complexity

**Examples:**
- ❌ WRONG: "Chicken & Rice Bowl: 3 minutes" (this is reheating time)
- ✅ CORRECT: "Chicken & Rice Bowl: 20 minutes" (actual cooking time)

# Grocery List Guidelines

**The grocery list must:**
- Include EVERY ingredient from every meal across the full plan
- Total quantities correctly across all days (e.g., if 4 meals use 80g oats, list 320g)
- Use realistic prices for the specified store and location
- Organize into logical shopping categories
- Set all `is_purchased` to `false` (user checks these off in the app)
- Include helpful notes about usage, storage, and substitutions

**Category suggestions:**
- Meat & Seafood
- Dairy & Refrigerated
- Produce (Fresh)
- Frozen
- Pantry & Grains
- Condiments & Supplements

# Meal Prep Session Guidelines

**The meal prep session must:**
- Cover all batch-cooked items referenced in the daily meals
- List instructions in logical order (start longest-cooking items first)
- Include realistic time estimates
- List all equipment needed
- Provide storage guidelines for each type of prepped food
- Match the actual recipes — don't reference items that aren't in the plan

**storage_guidelines format:**
```json
"storage_guidelines": {
  "cooked_chicken": "Refrigerate up to 4 days, freeze up to 3 months",
  "cooked_rice": "Refrigerate up to 5 days",
  "bolognese_sauce": "Refrigerate 3 days, freeze up to 3 months",
  "prepped_vegetables": "Refrigerate 3-5 days, do not freeze"
}
```

# Quality Standards

- Ensure nutritional values are realistic and add up properly
- Balance variety across days appropriately
- Include prep efficiency considerations in notes
- Make sure meal timing and complexity is practical
- All numeric values should be reasonable (no impossible prep times, etc.)
- Grocery list must be cross-checked against all recipes
- Meal prep session must align with batch-cooked items in the plan

# Date and Meal ID Instructions

**Date Format Requirements:**
- All dates must be in YYYY-MM-DD format (e.g., "2024-02-18")
- startDate should be the first day of the meal plan
- endDate should be the last day of the meal plan
- Each dailyMeals key must exactly match its corresponding date value

**Meal ID Generation:**
- Each meal needs a unique ID (e.g., "meal_1_breakfast", "meal_2_lunch")
- IDs should be descriptive and unique across the entire plan
- Format suggestion: "meal_{dayNumber}_{mealType}_{index}"

**Example Structure:**
```json
{
  "id": "plan_7day_balanced",
  "name": "7-Day Balanced Nutrition Plan",
  "startDate": "2024-02-18", 
  "endDate": "2024-02-24",
  "dailyMeals": {
    "2024-02-18": {
      "date": "2024-02-18",
      "dayName": "Sunday",
      "meals": [
        {
          "id": "meal_1_breakfast_1",
          "name": "Protein Oats with Berries",
          "type": "breakfast",
          "time": "7:30 AM",
          "calories": 420,
          "macros": {
            "protein": 25,
            "carbs": 48,
            "fat": 12,
            "fiber": 8
          },
          "ingredients": [
            {
              "item": "rolled oats",
              "amount": "0.5",
              "unit": "cup",
              "notes": ""
            }
          ],
          "instructions": [
            "Combine oats with protein powder in a bowl",
            "Add milk and mix well",
            "Top with fresh berries"
          ],
          "tags": ["high-protein", "breakfast"],
          "isOriginal": true,
          "addedAt": "2024-02-18T08:00:00Z"
        }
      ]
    }
  },
  "grocery_list": {
    "total_estimated_cost": 132.50,
    "currency": "AUD",
    "categories": [
      {
        "category_name": "Meat & Seafood",
        "items": [
          {
            "item_name": "Chicken Breast Fillets",
            "quantity": "1.4",
            "unit": "kg",
            "estimated_price": 16.80,
            "notes": "For batch-cook lunches. ~$12/kg at Coles.",
            "is_purchased": false
          }
        ]
      }
    ]
  },
  "meal_prep_session": {
    "session_name": "Sunday Meal Prep",
    "prep_time": 30,
    "cook_time": 60,
    "total_time": 90,
    "covers": "7 days of lunches and 3 dinners",
    "recommended_timing": "Sunday afternoon",
    "equipment_needed": ["Large pot", "Baking trays", "Food containers", "Sharp knife"],
    "instructions": [
      "Start by preheating the oven to 200°C for the chicken",
      "While oven heats, rinse and start the rice on the stovetop",
      "Season and bake the chicken for 30-35 minutes",
      "While chicken bakes, prepare the bolognese sauce on the stovetop",
      "Chop all vegetables for the week and store in containers",
      "Once everything is cooked, let it cool before portioning into containers"
    ],
    "storage_guidelines": {
      "cooked_chicken": "Refrigerate up to 4 days, freeze remainder for days 5-7",
      "cooked_rice": "Refrigerate up to 5 days in airtight container",
      "bolognese_sauce": "Refrigerate 3 days, freeze 2 portions for later in the week",
      "prepped_vegetables": "Refrigerate in ziplock bags for 3-5 days"
    }
  },
  "metadata": {
    "generatedAt": "2024-02-18T08:00:00Z",
    "totalCost": 132.50,
    "duration": 7
  }
}
```

Convert the meal plan you created above into this exact JSON format and save it to a file for download.
