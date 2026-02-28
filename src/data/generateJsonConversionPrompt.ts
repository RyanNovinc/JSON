export const generateJsonConversionPrompt = () => {
  return `Please convert the meal plan you just created into a specific JSON format that can be imported into my nutrition app called JSON.fit.

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

\`\`\`json
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
  "metadata": {
    "generatedAt": "string (ISO date format)",
    "totalCost": number,
    "duration": number
  }
}
\`\`\`

# Field Requirements

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | YES | Unique identifier for the meal plan |
| name | string | YES | Descriptive title for the meal plan |
| startDate | string | YES | Plan start date in YYYY-MM-DD format |
| endDate | string | YES | Plan end date in YYYY-MM-DD format |
| dailyMeals | object | YES | Object with dates as keys and meal data as values |
| date | string | YES | Date in YYYY-MM-DD format (must match the object key) |
| dayName | string | YES | Day name (e.g. "Monday", "Tuesday") |
| meals | array | YES | Array of meal objects for this day |
| id | string | YES | Unique identifier for each meal |
| name | string | YES | Descriptive meal title |
| type | string | YES | EXACTLY: "breakfast", "lunch", "dinner", or "snack" |
| time | string | YES | Exact meal time (e.g. "7:45 AM", "12:30 PM") |
| calories | number | NO | Total calories per serving |
| protein | number | NO | Grams of protein per serving |
| carbs | number | NO | Grams of carbohydrates per serving |
| fat | number | NO | Grams of fat per serving |
| fiber | number | NO | Grams of fiber per serving |
| item | string | YES | Ingredient name |
| amount | string | YES | Quantity (e.g. "1", "0.5", "1/2") |
| unit | string | YES | Unit of measurement |
| notes | string | NO | Ingredient notes or substitutions |
| instructions | array | YES | Step-by-step cooking instructions |
| tags | array | NO | e.g. ["vegetarian", "high-protein", "quick"] |
| isOriginal | boolean | YES | Always set to true for AI-generated meals |
| addedAt | string | YES | ISO date when meal was created |
| generatedAt | string | YES | ISO date when plan was generated |
| totalCost | number | NO | Estimated total cost of the plan |
| duration | number | YES | Number of days in the plan |

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
\`\`\`
"instructions": ["Bake chicken 200°C 25min. Cook rice. Steam broccoli."]
\`\`\`

**Example - CORRECT:**
\`\`\`
"instructions": [
  "Preheat oven to 200°C",
  "Season chicken breast with salt and pepper", 
  "Place chicken on baking tray and bake for 25 minutes",
  "Cook rice according to package instructions",
  "Steam broccoli for 5-7 minutes until tender",
  "Serve chicken over rice with broccoli on the side"
]
\`\`\`

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

# Quality Standards

- Ensure nutritional values are realistic and add up properly
- Balance variety across days appropriately
- Include prep efficiency considerations in notes
- Make sure meal timing and complexity is practical
- All numeric values should be reasonable (no impossible prep times, etc.)

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
${'```'}json
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
  "metadata": {
    "generatedAt": "2024-02-18T08:00:00Z",
    "totalCost": 45.50,
    "duration": 7
  }
}
${'```'}

Convert the meal plan you created above into this exact JSON format and save it to a file for download.`;
};