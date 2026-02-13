export const getMealPlanPrompt = () => {
  return `# JSON Meal Plan Generator

You are generating a meal plan from the MEAL PLAN SPECS provided. Output valid JSON that can be imported into a nutrition app.

## CRITICAL: File Output Instructions

**DO NOT output JSON to chat** — it will hit token limits for plans longer than 7 days.

**You MUST:**
1. Create a file (use Code Interpreter on ChatGPT, or computer tool on Claude)
2. Write the complete JSON structure to the file
3. If you reach output limits, STOP at the end of a complete week, then continue appending to the same file
4. Never stop mid-week or mid-day
5. When finished, provide the download link

## JSON Schema
\`\`\`json
{
  "plan_name": "string",
  "description": "string",
  "duration_days": number,
  "total_meals": number,
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

## Field Rules

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| plan_name | string | YES | Meal plan title |
| description | string | YES | Brief plan overview |
| duration_days | number | YES | Total days in the plan |
| total_meals | number | YES | Total number of meals |
| week_number | number | YES | Sequential week numbering |
| day_name | string | YES | e.g. "Monday", "Day 1" |
| day_number | number | YES | Sequential day numbering |
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

## Nutrition Guidelines

**Macro Balance Examples:**
- High Protein: 30-40% protein, 30-35% carbs, 25-35% fat
- Balanced: 20-25% protein, 45-50% carbs, 25-30% fat
- Low Carb: 25-30% protein, 10-20% carbs, 55-65% fat

**Micronutrient Optimization:**
When micronutrient preferences are provided, ensure daily meals collectively provide optimal amounts of:
- Iron (18mg daily): Include heme sources (red meat, fish) with vitamin C enhancers (citrus, peppers)
- B12 (2.4μg daily): Prioritize animal sources or fortified foods for vegetarians/vegans
- Vitamin D (20μg daily): Include fatty fish, fortified foods, mushrooms
- Calcium (1000mg daily): Dairy, leafy greens, fortified alternatives
- Magnesium (320mg daily): Nuts, seeds, whole grains, leafy greens
- Zinc (8mg daily): Meat, legumes, nuts, seeds
- Folate (400μg daily): Leafy greens, legumes, fortified grains
- Vitamin C (90mg daily): Citrus fruits, berries, peppers, tomatoes
- Vitamin A (900μg daily): Orange/red vegetables, leafy greens, liver

**Target 100% RDA for user demographic while considering:**
- Known deficiencies: Prioritize foods high in deficient nutrients
- Supplement use: Avoid excessive intake of supplemented nutrients through food
- Health conditions: Adjust for special needs (pregnancy, anemia, diabetes, etc.)
- Energy patterns: Include B-vitamins and iron-rich foods for low energy
- Sun exposure: Emphasize vitamin D foods for minimal exposure
- Absorption enhancers: Pair nutrients strategically (vitamin C + iron, healthy fats + fat-soluble vitamins)

**Cooking Times:**
- Quick meals: 5-15 minutes total
- Moderate: 20-45 minutes total
- Elaborate: 45+ minutes total

**Meal Planning:**
- Include variety across days
- Consider prep efficiency (batch cooking, make-ahead components)
- Balance cooking complexity throughout the week
- Include both fresh and pantry ingredients

**Ingredient Guidelines:**
- Use common, accessible ingredients
- Include alternatives in notes when appropriate
- Consider dietary restrictions from specs
- Use standard cooking measurements (cups, tbsp, oz, lbs)

**Instructions:**
- Write detailed, step-by-step cooking directions (minimum 3-5 steps per recipe)
- Break down each cooking action into separate steps
- Include cooking temperatures and times where relevant
- Add safety notes for raw ingredients
- Each step should be actionable and specific
- NEVER include "VARIATION:", "BATCH COOK:", or "MEAL PREP:" in instructions
- Put variations, batch cooking tips, and meal prep notes in the "notes" field instead
- Instructions should ONLY contain actual cooking steps needed to make the meal
- Example: Instead of "Bake chicken 200°C 25min. Cook rice. Steam broccoli." use:
  1. "Preheat oven to 200°C"
  2. "Season chicken breast with salt and pepper"
  3. "Place chicken on baking tray and bake for 25 minutes"
  4. "Cook rice according to package instructions"
  5. "Steam broccoli for 5-7 minutes until tender"
  6. "Serve chicken over rice with broccoli on the side"

Generate the complete meal plan following this structure exactly.`;
};