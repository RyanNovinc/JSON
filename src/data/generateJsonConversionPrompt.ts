export const generateJsonConversionPrompt = () => {
  return `Please convert the meal plan you just created into a specific JSON format that can be imported into my nutrition app called JSON.fit.

# CRITICAL: File Output Instructions

**DO NOT output JSON to chat** — it will hit token limits for plans longer than 7 days.

**You MUST:**
1. Create a file (use Code Interpreter on ChatGPT, or computer tool on Claude)
2. Write the complete JSON structure to the file
3. If you reach output limits, STOP at the end of a complete week, then continue appending to the same file
4. Never stop mid-week or mid-day
5. When finished, provide the download link

# JSON Schema Required

\`\`\`json
{
  "plan_name": "string",
  "description": "string", 
  "duration_days": number,
  "total_meals": number,
  "weekly_meal_prep": {
    "total_prep_time": number,
    "unique_recipes": number,
    "batch_proteins": ["string array"],
    "prep_session_guide": [
      {
        "step": number,
        "title": "string",
        "description": "string",
        "time_required": number
      }
    ]
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
  "weeks": [
    {
      "week_number": number,
      "days": [
        {
          "day_name": "string",
          "day_number": number,
          "meals": [
            {
              "meal_name": "string",
              "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
              "prep_time": number,
              "cook_time": number,
              "total_time": number,
              "servings": number,
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
              "notes": "string",
              "tags": ["string array"]
            }
          ]
        }
      ]
    }
  ]
}
\`\`\`

# Field Requirements

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| plan_name | string | YES | Descriptive title for the meal plan |
| description | string | YES | Brief overview of the plan's focus/benefits |
| duration_days | number | YES | Total number of days in the plan |
| total_meals | number | YES | Total number of meals across all days |
| total_prep_time | number | YES | Total minutes for weekly meal prep session |
| unique_recipes | number | YES | Number of different meals in the plan |
| batch_proteins | array | YES | List of proteins to be batch cooked |
| step | number | YES | Prep session step number |
| title | string | YES | Brief title for prep step |
| description | string | YES | Detailed description of prep step |
| time_required | number | NO | Minutes required for this prep step |
| total_estimated_cost | number | YES | Total estimated grocery cost |
| currency | string | YES | Currency for prices (e.g. "AUD", "USD") |
| category_name | string | YES | Grocery category (e.g. "Proteins", "Dairy") |
| item_name | string | YES | Grocery item name |
| quantity | string | YES | How much to buy (e.g. "2kg", "1 pack") |
| unit | string | YES | Unit for grocery item |
| estimated_price | number | YES | Estimated cost for this item |
| is_purchased | boolean | YES | Whether item has been purchased (default: false) |
| week_number | number | YES | Sequential week numbering starting from 1 |
| day_name | string | YES | e.g. "Monday", "Day 1" |  
| day_number | number | YES | Sequential day numbering starting from 1 |
| meal_name | string | YES | Descriptive meal title |
| meal_type | string | YES | EXACTLY: "breakfast", "lunch", "dinner", or "snack" |
| prep_time | number | NO | Minutes for prep work |
| cook_time | number | NO | Minutes for actual cooking |
| total_time | number | NO | Minutes from start to finish |
| servings | number | NO | Number of servings recipe makes |
| calories | number | NO | Total calories per serving |
| protein | number | NO | Grams of protein per serving |
| carbs | number | NO | Grams of carbohydrates per serving |
| fat | number | NO | Grams of fat per serving |
| fiber | number | NO | Grams of fiber per serving |
| item | string | YES | Ingredient name |
| amount | string | YES | Quantity (e.g. "1", "0.5", "1/2") |
| unit | string | YES | Unit of measurement |
| instructions | array | YES | Step-by-step cooking instructions |
| notes | string | NO | Tips, substitutions, storage notes |
| tags | array | NO | e.g. ["vegetarian", "high-protein", "quick"] |

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

# Quality Standards

- Ensure nutritional values are realistic and add up properly
- Balance variety across days appropriately
- Include prep efficiency considerations in notes
- Make sure meal timing and complexity is practical
- All numeric values should be reasonable (no impossible prep times, etc.)

Convert the meal plan you created above into this exact JSON format and save it to a file for download.`;
};