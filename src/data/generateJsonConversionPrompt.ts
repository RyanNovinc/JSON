export const generateJsonConversionPrompt = () => {
  return `Please convert the meal plan you just created into a specific JSON format that can be imported into my nutrition app called JSON.fit.

# MEAL PREP INTELLIGENCE RULES

**WHAT TO ACTUALLY MEAL PREP (Include in meal_prep_sessions):**
- Proteins: Chicken, beef, fish, eggs (cook in batches, max 4-day storage)
- Grains: Rice, pasta, quinoa, oats (cook large batches, portion out)
- Roasted/cooked vegetables (sweet potato, broccoli, etc.)
- Cooked legumes/beans
- Soups, stews, curries, casseroles
- Hard-boiled eggs
- Overnight oats, chia puddings
- Any meal that takes >15 minutes to cook from scratch

**WHAT NOT TO MEAL PREP (Keep as daily fresh items):**
- Greek yogurt (just buy container, scoop 150g daily)
- Smoothies (blend fresh daily - takes 2 minutes)
- Fresh salads with leafy greens
- Avocado (add fresh to prevent browning)
- Toast, sandwiches (assemble fresh)
- Fresh fruit as toppings/sides
- Any item that takes <5 minutes to prepare fresh
- Items that lose quality when stored (crispy foods, fresh herbs)

**FOOD SAFETY & SESSION TIMING:**
- Cooked proteins: Maximum 4 days refrigerated storage
- For 7+ day plans: MUST create multiple prep sessions
- Example: Tuesday prep (covers Wed-Sat), Saturday prep (covers Sun-Tue)
- If user is "Dedicated Meal Prepper" (planningStyle 1): Can do 1 big session with freezing
- If user is "Weekly Planner" (planningStyle 2): Split into 2 sessions, 4-day max storage

**REALISTIC MEAL PREP PORTIONS:**
❌ WRONG: "Meal prep Greek Yogurt Bowl x7" 
✅ CORRECT: Make this a daily fresh item. Greek yogurt bowl takes 2 minutes to assemble.

❌ WRONG: "Meal prep smoothie ingredients x7"
✅ CORRECT: Daily fresh item. Smoothies take 2 minutes to blend fresh.

✅ CORRECT: "Batch cook chicken breast x7 servings" - This actually benefits from meal prep.

**PREP SESSION EFFICIENCY RULES:**
- Start longest-cooking items first (rice 20min, roasted vegetables 30min)
- Group by cooking method: All oven items together, all stovetop together
- While proteins bake, prep quick items (wash vegetables, portion snacks)
- Maximum 2 hours per session for home cooks
- If prep takes >2 hours, split into multiple sessions
- Include parallel cooking: "While chicken bakes (25min), cook rice and prep vegetables"

**SESSION SPLITTING LOGIC:**
- 7+ day plans: Always create 2+ sessions for food safety
- Batch 1: Days 1-4 (e.g., Tuesday evening prep → covers Wed-Sat)  
- Batch 2: Days 5-7+ (e.g., Saturday prep → covers Sun-Tue)
- Each session should cover 3-4 eating days maximum

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
  "plan_name": "string",
  "description": "string", 
  "duration_days": number,
  "total_meals": number,
  "meal_prep_sessions": [
    {
      "session_number": number,
      "session_name": "string",
      "prep_day": "string",
      "total_time": number,
      "unique_recipes": number,
      "batch_proteins": ["string array"],
      "covers_days": ["string array"],
      "prep_session_guide": [
        {
          "step": number,
          "title": "string", 
          "description": "string",
          "time_required": number
        }
      ]
    }
  ],
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
          "recommended_time": "string",
          "timing_reason": "string",
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
          "tags": ["string array"],
          "weekly_meal_coverage": [
            {
              "day": "string",
              "meal_type": "string"
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
| session_number | number | YES | Sequential numbering (1, 2, 3...) for meal prep sessions |
| session_name | string | YES | Descriptive name (e.g. "Weekly Batch Prep", "Mid-Week Refresh") |
| prep_day | string | YES | When to do this session (e.g. "Tuesday Evening", "Saturday") |
| total_time | number | YES | Total minutes for this specific prep session |
| unique_recipes | number | YES | Number of different meals prepared in this session |
| batch_proteins | array | YES | List of proteins to be batch cooked in this session |
| covers_days | array | YES | Days this prep session covers (e.g. ["Wednesday", "Thursday", "Friday"]) |
| step | number | YES | Prep session step number within this session |
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
| day_name | string | YES | e.g. "Monday", "Day 1" |  
| day_number | number | YES | Sequential day numbering starting from 1 |
| meal_name | string | YES | Descriptive meal title |
| meal_type | string | YES | EXACTLY: "breakfast", "lunch", "dinner", or "snack" |
| prep_time | number | NO | Minutes for prep work (use ORIGINAL cooking time, not reheating) |
| cook_time | number | NO | Minutes for actual cooking (use ORIGINAL cooking time, not reheating) |
| total_time | number | NO | Minutes from start to finish (use ORIGINAL cooking time, not reheating) |
| servings | number | NO | Number of servings recipe makes |
| calories | number | NO | Total calories per serving |
| recommended_time | string | YES | Exact meal time (e.g. "7:45 AM", "12:30 PM") based on user's sleep schedule |
| timing_reason | string | YES | Brief explanation why this timing optimizes sleep/metabolism |
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
| weekly_meal_coverage | array | YES | List of each day this meal appears in the plan |

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

# Multiple Meal Prep Sessions Instructions

**CRITICAL:** If your meal plan has multiple meal prep sessions (e.g. main prep + mid-week refresh), create separate session objects:

**Example - Single Session Plan:**
${'```'}json
"meal_prep_sessions": [
  {
    "session_number": 1,
    "session_name": "Weekly Batch Prep",
    "prep_day": "Sunday Evening", 
    "total_time": 90,
    "unique_recipes": 5,
    "batch_proteins": ["Chicken Breast", "Ground Turkey"],
    "covers_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    "prep_session_guide": [/* All prep steps */]
  }
]
${'```'}

**Example - Multiple Session Plan:**
${'```'}json  
"meal_prep_sessions": [
  {
    "session_number": 1,
    "session_name": "Weekly Batch Prep",
    "prep_day": "Tuesday Evening",
    "total_time": 115,
    "unique_recipes": 4,
    "batch_proteins": ["Chicken Breast", "Lean Beef Mince"],
    "covers_days": ["Wednesday", "Thursday", "Friday", "Saturday"],
    "prep_session_guide": [/* Steps 1-6 */]
  },
  {
    "session_number": 2, 
    "session_name": "Mid-Week Refresh",
    "prep_day": "Saturday",
    "total_time": 40,
    "unique_recipes": 1,
    "batch_proteins": ["Chicken Breast"],
    "covers_days": ["Sunday", "Monday", "Tuesday"],
    "prep_session_guide": [/* Step 7 */]
  }
]
${'```'}

**When to use multiple sessions:**
- Plans longer than 5 days often need multiple sessions
- Food safety (proteins shouldn't sit in fridge too long)
- When the meal plan explicitly mentions "mid-week refresh", "Saturday prep", etc.
- Different protein batches for different parts of the week

# Weekly Meal Coverage Instructions

For each meal, you MUST calculate and include the weekly_meal_coverage array that shows every day this specific meal appears in the plan:

**Example 1:** If "Protein Oats" appears as breakfast on Monday, Tuesday, Wednesday:
${'```'}json
"weekly_meal_coverage": [
  {"day": "Monday", "meal_type": "breakfast"},
  {"day": "Tuesday", "meal_type": "breakfast"}, 
  {"day": "Wednesday", "meal_type": "breakfast"}
]
${'```'}

**Example 2:** If "Chicken Salad" appears as lunch on Monday, Wednesday, Friday:
${'```'}json
"weekly_meal_coverage": [
  {"day": "Monday", "meal_type": "lunch"},
  {"day": "Wednesday", "meal_type": "lunch"},
  {"day": "Friday", "meal_type": "lunch"}
]
${'```'}

**CRITICAL:** The length of this array determines how many "X times per week" the meal shows in the app. Count carefully!

- If a meal appears 7 times → array length = 7 → displays "7x/week"
- If a meal appears 3 times → array length = 3 → displays "3x/week" 
- If a meal appears 1 time → array length = 1 → displays "1x/week"

Convert the meal plan you created above into this exact JSON format and save it to a file for download.`;
};