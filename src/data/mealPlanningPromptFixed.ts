// ================================
// SIMPLIFIED DYNAMIC MEAL PLANNING PROMPT SYSTEM
// ================================
// Working version with proper error handling

import { WorkoutStorage } from '../utils/storage';

export const assembleMealPlanningPrompt = async (): Promise<string> => {
  try {
    // Load questionnaire data
    const nutritionResults = await WorkoutStorage.loadNutritionResults();
    const budgetCookingResults = await WorkoutStorage.loadBudgetCookingResults();
    const sleepResults = await WorkoutStorage.loadSleepOptimizationResults();
    
    if (!nutritionResults || !budgetCookingResults) {
      throw new Error('Please complete the Nutrition Goals and Budget & Cooking questionnaires first.');
    }
    
    const macroResults = nutritionResults?.macroResults || {} as any;
    const budgetData = budgetCookingResults?.formData || {} as any;
    const nutritionData = nutritionResults?.formData || {} as any;
    const sleepData = sleepResults?.formData;
    
    // Calculate fiber target
    const fiberTarget = macroResults.calories 
      ? Math.min(45, Math.max(25, Math.round((macroResults.calories / 1000) * 14)))
      : 30;
    
    // Get current date for meal plan start
    const getCurrentDate = (): string => {
      const today = new Date();
      const startDate = new Date(today.getTime() + (24 * 60 * 60 * 1000));
      return startDate.toLocaleDateString('en-AU', { weekday: 'long', month: 'short', day: 'numeric' });
    };
    
    // Build dynamic prompt with user's actual data
    const store = budgetData.groceryStore || 'Local supermarket';
    const country = budgetData.country || 'your country';
    
    let prompt = `I'm using a nutrition planning app called JSON.fit and need help creating a personalized meal plan.

**QUICK CREATION INSTRUCTIONS:**
1. **STANDARD KNOWLEDGE** - Use your existing knowledge base for common foods and recipes
2. **ESTIMATED PRICING** - Use typical pricing patterns for ${store} in ${country}

**MEAL PLAN REQUIREMENTS:**
1. **BUDGET CONSTRAINT** - ${budgetData.weeklyBudget || 'Moderate'} budget category
2. **MEAL PREP FOCUSED** - ${getMealPrepStyleText(budgetData.planningStyle)}
3. **INCLUDE DETAILED GROCERY LIST** - Organize by categories (Proteins, Dairy, Produce, etc.) with exact quantities, units, and estimated prices from ${store}
4. **SPECIFIC DATES** - Start the meal plan on tomorrow's date and use actual calendar dates
5. **SHOW CALCULATIONS** - For each meal, briefly explain how you arrived at the calorie/macro numbers

NUTRITION TARGETS:
- Daily calories: ${macroResults.calories || 2000}
- Protein: ${macroResults.protein || 150}g | Carbs: ${macroResults.carbs || 200}g | Fat: ${macroResults.fat || 67}g
- Daily fiber target: ${fiberTarget}g (aim for ${fiberTarget - 5}–${fiberTarget + 5}g range)
- ${budgetData.mealsPerDay || 3} meals per day
- Plan duration: ${budgetData.planDuration || 7} days
- Snacking style: ${budgetData.snackingStyle || 'Occasional snacker'}
- Goal: ${nutritionData.goal || 'maintain'} at ${nutritionData.rate || 'moderate'} rate

PERSONAL INFO:
- Gender: ${nutritionData.gender || 'Not specified'}
- Age: ${nutritionData.age || 'Not specified'}
- Activity level: ${nutritionData.activityLevel || 'moderate'}
- Job type: ${nutritionData.jobType || 'Not specified'}

DIETARY REQUIREMENTS:
- Allergies: ${budgetData.allergies?.length ? budgetData.allergies.join(', ') : 'None'}
- Avoid foods: ${budgetData.avoidFoods?.length ? budgetData.avoidFoods.join(', ') : 'None'}
- Eating challenges: ${budgetData.eatingChallenges?.length ? budgetData.eatingChallenges.join(', ') : 'None'}

NUTRIENT VARIETY PRIORITY:
**NOT SPECIFIED** - Use standard approach to nutrient variety balanced with other preferences`;

    // Add sleep optimization section if available
    if (sleepData?.bedtime && sleepData?.wakeTime) {
      prompt += `

**SLEEP-OPTIMIZED MEAL TIMING REQUIREMENTS:**
Based on my completed Sleep Optimization questionnaire:
- Sleep schedule: ${sleepData.bedtime} - ${sleepData.wakeTime}
- Optimization level: ${sleepData.optimizationLevel}
- CRITICAL: Calculate and provide specific meal times for each day based on these sleep parameters:
  • First meal: 30-90 minutes after wake time
  • Last meal: 3 hours before bedtime
  • 8-10 hour eating window
- PROVIDE SPECIFIC TIMES: For each meal in your plan, specify the recommended time (e.g., "7:45 AM", "12:30 PM", "6:00 PM") and briefly explain why that timing supports better sleep and metabolism`;
    }

    prompt += `

FRIDGE & PANTRY INVENTORY:
- No fridge/pantry inventory provided or user chose not to include existing ingredients

MEAL PREFERENCES:
- User wants AI to suggest all meals based on their profile and preferences

COOKING PREFERENCES:
- ${getMealPrepStyleText(budgetData.planningStyle)}
- ${getTimeInvestmentText(budgetData.timeInvestment)}
- ${getVarietySeekingText(budgetData.varietySeeking)}
- ${getSkillConfidenceText(budgetData.skillConfidence)}
- ${getCookingEnjoymentText(budgetData.cookingEnjoyment)}

AVAILABLE COOKING EQUIPMENT:
- Available equipment: ${budgetData.cookingEquipment?.join(', ') || 'basic kitchen equipment'}
- IMPORTANT: Only suggest meals that can be made with the above equipment. Do not suggest oven recipes if no oven available, etc.

LOCATION & BUDGET:
- Location: ${budgetData.city || 'Not specified'}, ${budgetData.country || 'Not specified'}
- Shop at: ${store}
- Focus on ingredients commonly available at ${budgetData.country || 'local'} supermarkets
- Budget level: ${getBudgetLevelDescription(budgetData.weeklyBudget)}
- Budget guidance: Based on the budget level above, estimate a realistic weekly grocery cost range in local currency for ${budgetData.city}, ${budgetData.country} and keep the plan within that range. State your estimate in the grocery list summary.

**MEAL PREP REQUIREMENTS** (based on my planning style):
- ${getMealPrepRequirementsText(budgetData.planningStyle)}

Please create a detailed ${budgetData.planDuration || 7}-day meal plan that:
1. **STARTS on ${getCurrentDate()}** and uses actual calendar dates
2. **MATCHES my meal prep personality** - don't give me 21 meals if I'm a "Weekly Planner"
3. **SHOWS NUTRITION CALCULATIONS** - briefly explain how you got the calories/macros for each meal
4. **INCLUDES ${sleepData ? 'SPECIFIC' : 'GENERAL'} MEAL TIMES** - ${sleepData ? 'For each meal, provide the exact recommended time based on my sleep schedule' : 'Provide suggested meal times'}
5. **INCLUDES DETAILED RECIPES** - For each meal provide:
   - Complete ingredients list with exact quantities and units
   - Step-by-step cooking instructions (minimum 3-5 steps per recipe)
   - Prep time and cook time for each meal
   - Serving size information
6. **INCLUDES STRUCTURED MEAL PREP PLAN** - exactly what to prep, how much, and what containers to use
7. Uses ingredients available at ${store} in ${budgetData.country}
8. Accounts for my dietary restrictions and cooking skill level
9. Hits macro targets using the tolerance rules below (protein daily, others weekly average)`;

    if (sleepData) {
      prompt += `
10. **PROVIDES MEAL TIMING RATIONALE** - Explain why each meal time optimizes sleep and circadian health`;
    }
    
    // Add static sections
    prompt += getGroceryListRequirements(store);
    prompt += getMealPrepSessionRequirements();
    prompt += getVerificationSteps();
    prompt += getFormatRequirements();
    prompt += getFeedbackWorkflow();

    return prompt;
    
  } catch (error) {
    console.error('Error generating dynamic meal planning prompt:', error);
    throw error;
  }
};

export const getMealPlanReviewPrompt = async (): Promise<string> => {
  try {
    // Load user data to customize hard constraints
    const nutritionResults = await WorkoutStorage.loadNutritionResults();
    const sleepResults = await WorkoutStorage.loadSleepOptimizationResults();
    const budgetCookingResults = await WorkoutStorage.loadBudgetCookingResults();
    
    const macroResults = nutritionResults?.macroResults || {} as any;
    const sleepData = sleepResults?.formData;
    const equipmentData = (budgetCookingResults?.formData as any)?.cookingEquipment || [];
    
    const proteinTarget = macroResults.protein || 150;
    const fiberTarget = macroResults.calories 
      ? Math.min(45, Math.max(25, Math.round((macroResults.calories / 1000) * 14)))
      : 30;
    const fiberMinimum = Math.round(fiberTarget * 0.8);
    
    // Build hard constraints section with user's actual targets
    const hardConstraintsSection = sleepData ? `
## HARD CONSTRAINTS — ZERO TOLERANCE

These must pass after your fixes. If any of these still fail after revision, you have not finished — go back and fix again.

- **Eating window** MUST be within the specified range (e.g., 8-10h for ${sleepData.optimizationLevel} sleep optimization). Do not rationalize exceeding it.
- **Protein** MUST be within 10% of ${proteinTarget}g target on EVERY individual day. No exceptions.
- **Weekly average calories** MUST be within 5% of target.
- **Weekly average carbs and fat** MUST be within 10% of target.
- **Fiber** MUST hit at least ${fiberMinimum}g (80% of ${fiberTarget}g target) on EVERY individual day.
- **Equipment** — every recipe MUST use only the user's listed equipment: ${equipmentData.join(', ') || 'basic kitchen equipment'}. No blender if no blender listed.
- **No draft content** — the output must contain zero working, iteration, or revision commentary.` :
`
## HARD CONSTRAINTS — ZERO TOLERANCE

These must pass after your fixes. If any of these still fail after revision, you have not finished — go back and fix again.

- **Protein** MUST be within 10% of ${proteinTarget}g target on EVERY individual day. No exceptions.
- **Weekly average calories** MUST be within 5% of target.
- **Weekly average carbs and fat** MUST be within 10% of target.
- **Fiber** MUST hit at least ${fiberMinimum}g (80% of ${fiberTarget}g target) on EVERY individual day.
- **Equipment** — every recipe MUST use only the user's listed equipment: ${equipmentData.join(', ') || 'basic kitchen equipment'}. No blender if no blender listed.
- **No draft content** — the output must contain zero working, iteration, or revision commentary.`;
    
    const sleepComplianceSection = sleepData ? `### 7. Sleep Optimization Compliance (if applicable)
If sleep optimization was requested, check meal timing:
- Meal times align with specified sleep schedule (${sleepData.bedtime} - ${sleepData.wakeTime})
- Eating window matches optimization level (${sleepData.optimizationLevel})
- Last meal timing respects bedtime constraints (2-4+ hours before bed)
- First meal timing aligns with wake time preferences
- **FAIL if** meal timing conflicts with sleep optimization requirements
- **FIX**: Shift meal times to fit the specified eating window. Recalculate all gaps and verify.` : 
'### 7. Sleep Optimization Compliance (if applicable)\nSleep optimization not enabled - skip this check.';
    
    return `# Review and Fix Meal Plan

First, read the meal plan you just created so you have the full content in context. Then review it as an experienced nutritionist and meal planning expert auditing a plan for a client. This is an independent quality gate — do not assume your self-check caught everything.

## CRITICAL INSTRUCTIONS

1. **Review the plan** using the checklist below, noting PASS or FAIL for each check.
2. **If ANY check fails, FIX IT IMMEDIATELY** — do not ask the user for permission to fix. Silently revise the plan to resolve all failures.
3. **After fixing, re-verify** — run the checklist again on the corrected plan to confirm all checks now pass.
4. **Present the CORRECTED plan** — output the complete, clean, final version of the meal plan with all fixes applied. Do not show the review process, do not show before/after comparisons, do not show your working. Present ONLY the clean corrected plan.
5. **At the end, provide a brief change log** — a short bullet list of what you changed and why (e.g., "Reduced rice from 100g to 80g dry to bring carbs within 10% of target").
6. **Remind the user about JSON conversion** — after presenting the corrected plan, tell the user: "When you're happy with this plan, send me the JSON conversion prompt and I'll convert it for import into JSON.fit."
${hardConstraintsSection}

## What "Fix" Means for Each Type of Failure

- **Nutrition targets off**: Adjust portion sizes, swap ingredients, or rebalance meals. Recalculate and verify.
- **Budget exceeded**: Swap premium ingredients for budget alternatives, reduce expensive protein frequency, adjust quantities.
- **Equipment violation**: Replace recipes requiring unavailable equipment with alternatives using only listed equipment.
- **Eating window wrong**: Shift meal times to fit the specified window. Recalculate gaps.
- **Grocery list errors**: Add missing items, correct quantities, fix prices.
- **Meal prep incomplete**: Add missing steps, equipment, or storage guidelines.
- **Draft/working shown**: Remove all iteration, working, and draft content. Present only the final clean version.
- **Internal contradictions**: Resolve all mismatches between overview tables, daily schedules, grocery lists, and recipes.

## Review Checklist

Work through each check. For each, state PASS or FAIL with a brief note. If FAIL, describe the fix you are applying.

### 1. Nutrition Target Verification
Use these evidence-based tolerance rules (not all macros need the same daily precision):
- **Protein**: Must be within 10% of target on EVERY individual day. Muscle protein synthesis is a daily process — consistent daily protein matters most.
- **Calories**: Weekly average must be within 5% of target. Individual days can vary up to ±10%. Total weekly energy balance drives weight change.
- **Carbs & Fat**: Weekly average must be within 10% of target. Individual days can flex ±15%. Day-to-day variation is normal and even beneficial.
- **Fiber**: Must hit at least 80% of the daily target on EVERY day. Gut health requires daily consistency.
- **FAIL if** protein is off by >10% on any individual day, OR weekly average calories are off by >5%, OR weekly average carbs/fat are off by >10%, OR fiber drops below 80% of target on any day.
- **FIX**: Adjust portion sizes (reduce/increase carb sources, swap proteins, modify fat sources). For protein fixes, adjust daily. For carb/fat fixes, rebalance the weekly average rather than forcing every day to be identical.

### 2. Budget Compliance
Check if the plan respects budget constraints.

### 3. Meal Prep Style Alignment
Verify the plan matches the user's planning style preference.

### 4. Dietary Restrictions & Preferences
Check compliance with dietary requirements.

### 5. Cooking Feasibility
Assess if the plan is practical for the user.

### 6. Location & Ingredient Availability
Verify ingredients are accessible.

${sleepComplianceSection}

### 8. Practical Implementation
Assess overall plan practicality.

### 9. Nutritional Quality & Balance
Evaluate nutritional completeness.

### 10. Grocery List Completeness & Accuracy
Verify the grocery list is complete and correct.

### 11. Meal Prep Session Completeness
Verify the meal prep guide is functional.

### 12. Overall Coherence
Final assessment of plan quality.

## Output Format

**If all 12 checks PASS on first review:**
- State "All checks passed — plan is ready."
- Present the plan as-is (clean, no changes needed).
- End with: "When you're happy with this plan, send me the JSON conversion prompt and I'll convert it for import into JSON.fit."

**If any checks FAIL:**
1. Show a brief summary table of PASS/FAIL results (one line per check).
2. Show a brief change log (bullet list of what you fixed and why).
3. Present the COMPLETE CORRECTED PLAN — the full meal plan document with all fixes applied, formatted cleanly. This must be a complete standalone document, not a diff or partial update.
4. End with: "When you're happy with this plan, send me the JSON conversion prompt and I'll convert it for import into JSON.fit."`;
    
  } catch (error) {
    console.error('Error generating dynamic meal plan review prompt:', error);
    throw error;
  }
};

export const generateJsonConversionPrompt = (): string => {
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

The JSON structure includes dailyMeals with date-keyed objects, grocery_list with categories and items, meal_prep_session with instructions, and metadata.

Start the conversion now and create the JSON file.`;
};

// ================================
// HELPER FUNCTIONS
// ================================

const getMealPrepStyleText = (style: number): string => {
  const styles: { [key: number]: string } = {
    1: 'Dedicated Meal Prepper - batch cook everything, same meals multiple days, cook once per week',
    2: 'Weekly Planner - meal prep focused, repeat meals, minimize daily cooking',
    3: 'Flexible Planner - some meal prep, some fresh cooking, moderate variety',
    4: 'Spontaneous Cook - mostly fresh cooking, minimal meal prep',
    5: 'Last-Minute Decider - fresh meals daily, no meal prep, maximum variety'
  };
  return styles[style] || styles[3];
};

const getTimeInvestmentText = (investment: number): string => {
  const investments: { [key: number]: string } = {
    1: 'Speed Cook - 5-10 minute meals, microwave options, minimal prep work',
    2: 'Quick Meals - 10-20 minutes cooking time, simple one-pot meals',
    3: 'Moderate Cook - 20-30 minute meals, comfortable with some prep',
    4: 'Thorough Cook - 30-60 minute recipes, enjoys involved preparations',
    5: 'Slow Food Lover - 60+ minute cooking sessions, complex multi-step recipes'
  };
  return investments[investment] || investments[3];
};

const getVarietySeekingText = (seeking: number): string => {
  const varieties: { [key: number]: string } = {
    1: 'Routine Eater - identical meals all week, finds comfort in consistency',
    2: 'Mostly Consistent - fine eating same meals repeatedly, enjoys routine',
    3: 'Moderate Variety - some repeated meals, some different options',
    4: 'Variety Seeker - different meals most days, some repeats okay',
    5: 'Adventure Eater - completely different meals every day, craves new experiences'
  };
  return varieties[seeking] || varieties[3];
};

const getSkillConfidenceText = (confidence: number): string => {
  const skills: { [key: number]: string } = {
    1: 'Kitchen Beginner - stick to basic techniques, familiar ingredients only',
    2: 'Cautious Cook - simple techniques, avoid complex recipes',
    3: 'Comfortable Cook - can handle standard recipes, moderate complexity',
    4: 'Confident Cook - comfortable with most recipes, willing to try new techniques',
    5: 'Kitchen Experimenter - excited by complex recipes, new techniques, unusual ingredients'
  };
  return skills[confidence] || skills[3];
};

const getCookingEnjoymentText = (enjoyment: number): string => {
  const enjoyments: { [key: number]: string } = {
    1: 'Cooking Avoider - prioritize convenience, takeout alternatives, minimal cleanup',
    2: 'Reluctant Cook - sees cooking as chore, prioritize convenience',
    3: 'Neutral Cook - willing to cook but values efficiency and practicality',
    4: 'Cooking Enthusiast - finds cooking relaxing, enjoys involved recipes',
    5: 'Passionate Home Chef - loves the process, excited by complex recipes'
  };
  return enjoyments[enjoyment] || enjoyments[3];
};

const getBudgetLevelDescription = (budgetLevel: string): string => {
  const descriptions: { [key: string]: string } = {
    'very_tight': 'Very Tight Budget - Every dollar counts, prioritize affordability over all other factors',
    'budget_conscious': 'Budget Conscious - Value and cost-effectiveness are important considerations',
    'moderate': 'Moderate Spending - Balanced approach to cost and quality, some flexibility for variety',
    'comfortable': 'Comfortable Budget - Quality and convenience valued over strict cost savings',
    'generous': 'Generous Budget - Cost is not a primary constraint, quality and variety prioritized'
  };
  return descriptions[budgetLevel] || descriptions['moderate'];
};

const getMealPrepRequirementsText = (planningStyle: number): string => {
  if (planningStyle <= 2) {
    return 'I want to meal prep! Give me 3-4 repeated meals max, not 21 different ones - Focus on batch cooking 1-2 proteins for the week - Same breakfast for multiple days is fine';
  } else if (planningStyle >= 4) {
    return 'I prefer fresh, different meals each day - Minimal meal prep, focus on quick daily cooking';
  } else {
    return 'Moderate meal prep - some repeated meals, some variety - 1-2 batch cooked items, but change up sides and seasonings - 5-6 different meals max across the week';
  }
};

// ================================
// STATIC SECTIONS
// ================================

const getGroceryListRequirements = (store: string): string => {
  return `

---

## GROCERY LIST REQUIREMENTS

**IMPORTANT:** Your meal plan MUST include a detailed grocery list structured by category. This grocery list will be imported into the app for shopping, so accuracy matters.

For each grocery item include:
- **Item name** - Specific product name (e.g., "${store} Lean Beef Mince" not just "beef")
- **Quantity** - Exact amount needed for the full week
- **Unit** - Standard unit (kg, g, L, ml, cans, bags, etc.)
- **Estimated price** - Realistic price for the specified store and location
- **Notes** - How the item is used in the plan, storage tips, or substitution notes
- **Purchased status** - Always set to not purchased (the user will check these off in the app)

Organize items into logical shopping categories:
- Meat & Seafood
- Dairy & Refrigerated
- Produce (Fresh)
- Frozen
- Pantry & Grains
- Condiments & Supplements
- (Add other categories as needed)

Include a **total estimated cost** and **currency** for the full grocery list.`;
};

const getMealPrepSessionRequirements = (): string => {
  return `

---

## MEAL PREP SESSION REQUIREMENTS

**IMPORTANT:** Your meal plan MUST include a structured meal prep session guide. This will be displayed in the app as a step-by-step prep walkthrough.

Include:
- **Session name** - e.g., "Sunday Meal Prep" or "Weekly Batch Cook"
- **Prep time and cook time** - Separate active prep vs passive cooking time
- **Total time** - Combined duration
- **Coverage** - What days/meals the prep covers (e.g., "7 days of lunches and dinners")
- **Recommended timing** - When to do the prep (e.g., "Sunday afternoon")
- **Equipment needed** - List of equipment required for the prep session
- **Step-by-step instructions** - Clear, ordered instructions for the full prep session
- **Storage guidelines** - How long each prepped item lasts in fridge vs freezer`;
};

const getVerificationSteps = (): string => {
  return `

---

## VERIFICATION STEPS

Before presenting the meal plan, complete these checks:

1. **Macro tolerance rules** — Not all macros need the same daily precision. Use these evidence-based rules:
   - **Protein**: Must be within 10% of target on EVERY individual day. Muscle protein synthesis is a daily process — consistent protein intake matters.
   - **Calories**: Weekly average must be within 5% of target. Individual days can vary up to ±10%. For weight gain, total weekly energy balance drives results.
   - **Carbs & Fat**: Weekly average must be within 10% of target. Individual days can flex more freely (±15%). Day-to-day variation in carbs and fat is normal and even beneficial if it aligns with activity levels.
   - **Fiber**: Must hit at least 80% of the daily target (e.g., 33.6g if target is 42g) on EVERY day. Gut health benefits require daily consistency.

2. **Protein distribution** — Check that protein is spread across meals, not loaded into one. Each meal should have a meaningful protein source (minimum 15-20g per main meal). Snacks can be lower.

3. **Cooking time alignment** — Verify that actual cooking times match the user's time investment preference.

4. **Meal prep coherence** — If the user's planning style is 1-2 (meal prep focused), verify batch-cooked items are actually reused across multiple meals.

5. **Budget reasonableness** — Mentally estimate the grocery cost and verify it matches the specified budget level.

6. **Equipment check** — Confirm every recipe can be made with the user's listed cooking equipment.

7. **Dietary restriction compliance** — Scan every ingredient across every meal to confirm zero allergens or avoided foods appear.

8. **Ingredient diversity audit** — Count unique protein sources (min 3), vegetables (min 6), carb sources (min 3), and fruits (min 3).

9. **Fiber target check** — Sum daily fiber for each day and fix if any day falls below 80% of target.

10. **Meal timing gap check** — Verify no gap longer than 5 hours between meals during waking hours.

11. **Grocery list completeness** — Verify the grocery list includes every ingredient from every meal with correct total quantities.

12. **Grocery list cross-check** — Walk through each recipe ingredient and confirm it appears in the grocery list.

13. **Meal prep session completeness** — Verify the meal prep guide covers all batch-cooked items mentioned in the recipes.

If any check fails, fix the plan before presenting. Do not present a plan with known issues — revise and recheck.`;
};

const getFormatRequirements = (): string => {
  return `

**FORMAT REQUIREMENTS:**
- Create the plan as a text document (not a formatted document)
- Use simple text formatting with headers, bullet points, and tables
- Make it fast to generate and easy to copy/edit
- Include a "Weekly Meal Prep" summary section showing total prep time and number of unique recipes
- Structure each meal as a complete recipe with ingredients and instructions
- **INCLUDE THE GROCERY LIST** in the document — organized by category with quantities, prices, and notes
- **INCLUDE THE MEAL PREP SESSION** in the document — with step-by-step instructions, equipment, and storage guidelines
- Present ONLY the final plan — do not show working, drafts, or iteration. If you need to adjust during creation, do so silently and present only the clean final version.

Focus on practical, batch-cookable meals that match my planning preferences.`;
};

const getFeedbackWorkflow = (): string => {
  return `

**IMPORTANT - FEEDBACK WORKFLOW:**
After creating the initial meal plan:
1. Present the complete meal plan with a brief summary
2. Ask me to review the plan and provide feedback on:
   - Foods I don't like or want to substitute
   - Meals that seem too complex or too simple for my skill level
   - Any ingredients I want to avoid or swap out
   - Portion sizes or macro distribution adjustments
   - Meal prep timing or complexity concerns
   - Grocery list corrections (wrong items, missing items, price adjustments)
3. **WAIT for my feedback before proceeding**
4. Make any requested adjustments to the meal plan
5. Only after I'm satisfied with the plan should you ask if I want the JSON conversion

**Do NOT automatically convert to JSON** - I need to approve the meal plan first.`;
};