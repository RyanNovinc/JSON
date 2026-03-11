// ================================
// SIMPLIFIED DYNAMIC MEAL PLANNING PROMPT SYSTEM
// ================================
// Working version with proper error handling

import { WorkoutStorage } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const assembleMealPlanningPrompt = async (): Promise<string> => {
  try {
    // Load questionnaire data
    const nutritionResults = await WorkoutStorage.loadNutritionResults();
    const budgetCookingResults = await WorkoutStorage.loadBudgetCookingResults();
    const sleepResults = await WorkoutStorage.loadSleepOptimizationResults();
    const fridgePantryResults = await WorkoutStorage.loadFridgePantryResults();
    
    // Load favorite meals data for detailed meal information
    const favoriteMealsData = await AsyncStorage.getItem('@nutrition_favorites');
    const favoriteMeals = favoriteMealsData ? JSON.parse(favoriteMealsData) : [];
    
    if (!nutritionResults || !budgetCookingResults) {
      throw new Error('Please complete the Nutrition Goals and Budget & Cooking questionnaires first.');
    }
    
    const macroResults = nutritionResults?.macroResults || {} as any;
    const budgetData = budgetCookingResults?.formData || {} as any;
    const nutritionData = nutritionResults?.formData || {} as any;
    const sleepData = sleepResults?.formData;
    const fridgePantryData = fridgePantryResults?.formData;
    
    // Calculate fiber target
    const fiberTarget = macroResults.calories 
      ? Math.min(45, Math.max(25, Math.round((macroResults.calories / 1000) * 14)))
      : 30;
    
    // Helper function to format favorite meals details
    const formatSelectedFavoriteMeals = (selectedFavoriteIds: string[], allFavoriteMeals: any[]) => {
      if (!selectedFavoriteIds?.length || !allFavoriteMeals?.length) {
        return '';
      }

      const selectedMealDetails = selectedFavoriteIds
        .map(mealId => {
          const favoriteMeal = allFavoriteMeals.find(fav => fav.mealId === mealId);
          if (!favoriteMeal?.meal) return null;
          
          const meal = favoriteMeal.meal;
          return `  • ${meal.name || 'Unnamed Meal'}${meal.ingredients?.length ? ` - ${meal.ingredients.slice(0, 5).map(ing => ing.name).join(', ')}${meal.ingredients.length > 5 ? '...' : ''}` : ''}`;
        })
        .filter(Boolean)
        .join('\n\n');

      return selectedMealDetails ? `\n- Selected favorite meals to include in the plan:\n${selectedMealDetails}` : '';
    };
    
    // Get current date for meal plan start
    const getCurrentDate = (): string => {
      const today = new Date();
      let startDate = new Date();
      
      switch (budgetData.startDate) {
        case 'today':
          startDate = new Date(today);
          break;
        case 'tomorrow':
          startDate = new Date(today.getTime() + (24 * 60 * 60 * 1000));
          break;
        case 'next_monday':
          const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
          startDate = new Date(today.getTime() + (daysUntilMonday * 24 * 60 * 60 * 1000));
          break;
        case 'custom':
          if (budgetData.customStartDate) {
            startDate = new Date(budgetData.customStartDate);
          } else {
            // Fallback to tomorrow if custom date is invalid
            startDate = new Date(today.getTime() + (24 * 60 * 60 * 1000));
          }
          break;
        default:
          startDate = new Date(today.getTime() + (24 * 60 * 60 * 1000));
      }
      
      return startDate.toLocaleDateString('en-AU', { weekday: 'long', month: 'short', day: 'numeric' });
    };
    
    // Build dynamic prompt with user's actual data
    const store = budgetData.groceryStore || 'Local supermarket';
    const city = budgetData.city || 'your city';
    const country = budgetData.country || 'your country';
    
    let prompt = `I'm using a nutrition planning app called JSON.fit and need help creating a personalized meal plan.

**QUICK CREATION INSTRUCTIONS:**
1. **STANDARD KNOWLEDGE** - Use your existing knowledge base for common foods and recipes
2. **ESTIMATED PRICING** - Use typical pricing patterns for ${store} in ${country}
3. **USE WEB SEARCH** - If you have web search available, use it to improve the plan — verifying prices, checking product availability, confirming nutritional info, etc. Current, real-world data produces a better plan than estimates from training data.

**CONSTRAINT CONFLICT HANDLING:**

Sometimes the user's preferences will conflict — for example, a very low budget combined with beginner skill level and high calorie targets, or maximum variety with dedicated meal prep. When constraints cannot all be satisfied simultaneously:

1. **PRIORITISE** in this order: food safety > calorie/macro targets > budget > dietary restrictions > skill/time level > variety > micronutrient diversity
2. **ACKNOWLEDGE** the trade-off in the plan notes — tell the user which constraint you relaxed and why. For example: "Your moderate budget target is difficult to hit at 3000 kcal/day with convenience products. This plan uses some from-scratch cooking (rice cooker instead of microwave pouches) to bring costs closer to your budget. If you prefer fully no-cook meals, expect the weekly cost to be higher."
3. **NEVER** silently ignore a constraint. If you can't meet it, say so.

**NUTRITION TARGETS:**
- Daily calories: ${macroResults.calories || 2000}
- Protein: ${macroResults.protein || 150}g | Carbs: ${macroResults.carbs || 200}g | Fat: ${macroResults.fat || 67}g
- Daily fiber target: ${fiberTarget}g (aim for ${fiberTarget - 5}–${fiberTarget + 5}g range)
- ${budgetData.mealsPerDay || 3} eating occasions per day (includes both main meals and snacks)
- Plan duration: ${budgetData.planDuration || 7} days
- Snacking style: ${budgetData.snackingStyle || 'Occasional snacker'}
- Goal: ${nutritionData.goal || 'maintain'} at ${nutritionData.rate || 'moderate'} rate

**MEAL PLAN REQUIREMENTS:**
1. **BUDGET CONSTRAINT** - ${getBudgetConstraintText(budgetData)}
2. **MEAL PREP FOCUSED** - ${getMealPrepStyleText(budgetData.planningStyle, budgetData.skillConfidence, budgetData.timeInvestment)}
3. **INCLUDE DETAILED GROCERY LIST** - Organize by categories (Proteins, Dairy, Produce, etc.) with exact quantities, units, and estimated prices from ${store} in ${city}, ${country}
4. **SPECIFIC DATES** - Start the meal plan on ${getCurrentDate()} and use actual calendar dates
5. **SHOW CALCULATIONS** - For each meal, briefly explain how you arrived at the calorie/macro numbers

${getVarietyRequirements(budgetData, budgetData.skillConfidence, budgetData.timeInvestment)}${getSkillRequirements(budgetData)}${getTimeRequirements(budgetData)}

${getMealStructure(budgetData.mealsPerDay || 3, macroResults.protein || 150)}

**SNACKING GUIDANCE BASED ON USER PREFERENCE:**
Based on snacking style "${budgetData.snackingStyle}":
${getSnackingGuidance(budgetData.snackingStyle, budgetData.mealsPerDay || 3)}

**KEY RULE FOR JSON OUTPUT:** Use ONLY these meal types: breakfast, lunch, dinner, snack. If you have multiple snacks, they all use type "snack" — differentiate them by name (e.g., "Morning Protein Snack", "Afternoon Energy Snack").

PERSONAL INFO:
- Gender: ${nutritionData.gender || 'Not specified'}
- Age: ${nutritionData.age || 'Not specified'}
- Activity level: ${nutritionData.activityLevel || 'moderate'}
- Job type: ${nutritionData.jobType || 'desk_job'}

DIETARY REQUIREMENTS:
- Allergies: ${budgetData.allergies?.length ? budgetData.allergies.join(', ') : 'None'}
- Avoid foods: ${budgetData.avoidFoods?.length ? budgetData.avoidFoods.join(', ') : 'None'}
- Eating challenges: ${budgetData.eatingChallenges?.length ? budgetData.eatingChallenges.join(', ') : 'None'}

NUTRIENT VARIETY PRIORITY:
**NOT SPECIFIED** - Use standard approach to nutrient variety balanced with other preferences

## BASELINE HEALTHY EATING

Every meal plan should include vegetables and fruit daily and rotate protein sources across the week. These are baseline expectations for any nutritionally complete plan — don't skip entire food groups or rely on a single protein source all week. Prioritise the user's macro targets and preferences, but flag it if the plan is significantly lacking in any major food group.`;

    // Add sleep optimization section if available
    if (sleepData?.bedtime && sleepData?.wakeTime) {
      const optimizationLevel = sleepData.optimizationLevel || 'minimal';
      let firstMealTiming: string;
      let lastMealTiming: string;
      let timingGuidance: string;

      if (optimizationLevel === 'maximum') {
        firstMealTiming = 'within 30-60 minutes of wake time';
        lastMealTiming = '4+ hours before bedtime';
        timingGuidance = 'This user has chosen maximum sleep optimization. Prioritise finishing dinner 4+ hours before bed for optimal circadian rhythm synchronization and sleep quality.';
      } else if (optimizationLevel === 'moderate') {
        firstMealTiming = 'within 30-90 minutes of wake time';
        lastMealTiming = '3 hours before bedtime';
        timingGuidance = 'This user has chosen moderate sleep optimization. Finish dinner 3 hours before bed for enhanced sleep quality and proper digestion.';
      } else { // 'minimal' or any legacy values
        firstMealTiming = 'within 2 hours of wake time';
        lastMealTiming = '2 hours before bedtime';
        timingGuidance = 'Basic sleep-aware meal timing. Finish dinner with enough time to digest before bed.';
      }
      
      prompt += `

**SLEEP-OPTIMIZED MEAL TIMING REQUIREMENTS:**
Based on my completed Sleep Optimization questionnaire:
- Sleep schedule: ${sleepData.bedtime} - ${sleepData.wakeTime}
- Optimization level: ${optimizationLevel}
- IMPORTANT: Calculate and provide specific meal times for each day based on these sleep parameters:
  • First meal: ${firstMealTiming}
  • Last meal: ${lastMealTiming}
  • Space meals 3-5 hours apart during waking hours
- ${timingGuidance}
- PROVIDE SPECIFIC TIMES: For each meal in your plan, specify the recommended time (e.g., "7:45 AM", "12:30 PM", "6:00 PM") and briefly explain why that timing supports better sleep and metabolism`;
    } else {
      // No sleep optimization - add basic meal timing guidance
      prompt += `

**MEAL TIMING:**
- Space meals roughly 3-5 hours apart during waking hours
- No specific eating window constraint`;
    }

    prompt += `

FRIDGE & PANTRY INVENTORY:
${fridgePantryData && fridgePantryData.wantToUseExistingIngredients && fridgePantryData.ingredients?.length ? `
**IMPORTANT: I have ingredients at home that I want to use in my meal plan**
- Usage preference: ${fridgePantryData.preferences?.primaryApproach === 'maximize' ? 
  'MAXIMIZE MY INVENTORY - Plan meals specifically around what I already have' :
  fridgePantryData.preferences?.primaryApproach === 'expiry' ? 
  'EXPIRY FOCUSED - Prioritize using items before they expire' :
  'AI-LED PLANNING - Create optimal meal plans first, naturally incorporate my items when they fit'
}

Available ingredients:
${fridgePantryData.ingredients.map(item => {
  const expiryInfo = item.expiryDate ? ` (expires ${new Date(item.expiryDate).toLocaleDateString()})` : '';
  const quantity = item.quantity && item.unit ? ` - ${item.quantity} ${item.unit}` : '';
  const notes = item.notes ? ` (${item.notes})` : '';
  return `• ${item.name}${quantity}${expiryInfo}${notes} [${item.location}]`;
}).join('\n')}

${fridgePantryData.preferences?.primaryApproach === 'maximize' ? 
  '**CRITICAL: Build the meal plan around these ingredients as much as possible. These should be the foundation of your meal suggestions.**' :
  fridgePantryData.preferences?.primaryApproach === 'expiry' ? 
  '**CRITICAL: Prioritize ingredients with expiry dates first, especially those expiring soon. Build meals around expiring items.**' :
  'Use these ingredients when they naturally fit into optimal meal plans, but don\'t force them if they don\'t work well.'
}

**GROCERY LIST ADJUSTMENT:** If the meal plan uses ingredients the user already has, either exclude them from the grocery list entirely or reduce the quantity to only what's additionally needed. Note which items are "already in pantry" so the user knows they don't need to buy them.` : '- No fridge/pantry inventory provided or user chose not to include existing ingredients'}

MEAL PREFERENCES:
${budgetData.mealPreferences === 'include_favorites' ? 
  `- User wants to include their favorite meals in the plan${formatSelectedFavoriteMeals(budgetData.selectedFavorites, favoriteMeals)}${budgetData.customMealRequests ? `\n- Custom requests: ${budgetData.customMealRequests}` : ''}` :
  '- User wants AI to suggest all meals based on their profile and preferences'
}

COOKING PREFERENCES:
- ${getMealPrepStyleText(budgetData.planningStyle, budgetData.skillConfidence, budgetData.timeInvestment)}
- ${getTimeInvestmentText(budgetData.timeInvestment)}
- ${getVarietySeekingText(budgetData.varietySeeking)}
- ${getSkillConfidenceText(budgetData.skillConfidence)}${(budgetData.skillConfidence || 3) > 1 ? `\n- ${getCookingEnjoymentText(budgetData.cookingEnjoyment)}` : ''}

AVAILABLE COOKING EQUIPMENT:
- Available equipment: ${budgetData.cookingEquipment?.join(', ') || 'basic kitchen equipment'}
- IMPORTANT: Only suggest meals that can be made with the above equipment. Do not suggest oven recipes if no oven available, etc.${(() => {
  const skillConfidence = budgetData.skillConfidence || 3;
  const timeInvestment = budgetData.timeInvestment || 3;
  
  if (skillConfidence <= 1) {
    return `\n- **SKILL OVERRIDE**: Despite the equipment list above, this Kitchen Beginner should ONLY use: microwave, blender, and rice cooker. Do NOT suggest stovetop, oven, or air fryer recipes — the user owns this equipment but the plan should not require it at this skill level.`;
  } else if (skillConfidence <= 2 && timeInvestment <= 2) {
    return `\n- **SIMPLIFIED USE**: For this user's skill/time level, prefer microwave, rice cooker, air fryer, and blender. Stovetop is acceptable only for very simple tasks (boiling water, heating a pan with oil). Oven use should be limited to simple tray bakes.`;
  }
  return '';
})()}

LOCATION & BUDGET:
- Location: ${budgetData.city || 'Not specified'}, ${budgetData.country || 'Not specified'}
- Shop at: ${store}
- Focus on ingredients commonly available at ${budgetData.country || 'local'} supermarkets
${buildBudgetSection(budgetData)}

**MEAL PREP REQUIREMENTS** (based on my planning style):
- ${getMealPrepRequirementsText(budgetData.planningStyle, budgetData.skillConfidence, budgetData.timeInvestment)}

Please create a detailed ${budgetData.planDuration || 7}-day meal plan that:
1. **STARTS on ${getCurrentDate()}** and uses actual calendar dates
2. **MATCHES my meal prep personality** - don't give me 21 meals if I'm a "Weekly Planner"
3. **SHOWS NUTRITION CALCULATIONS** - briefly explain how you got the calories/macros for each meal
4. **INCLUDES ${sleepData ? 'SPECIFIC' : 'GENERAL'} MEAL TIMES** - ${sleepData ? 'For each meal, provide the exact recommended time based on my sleep schedule' : 'Provide suggested meal times'}
5. **INCLUDES DETAILED RECIPES** - For each meal provide:
   - Complete ingredients list with exact quantities and units
   - Step-by-step instructions (as many steps as needed - some meals may only require 1 step, others may need several)
   - Prep time and cook time for each meal
   - Serving size information
   - **WHOLE-PACK RULE**: Always use single-serve convenience products whole — never partial pouches, half packets, or fractions of containers. Use complete packages as intended and adjust other ingredients to balance macros around the full portion size.
6. **INCLUDES STRUCTURED MEAL PREP PLAN** - exactly what to prep, how much, and what containers to use
7. Uses ingredients available at ${store} in ${budgetData.country}
8. Accounts for my dietary restrictions and cooking skill level
9. Hits macro targets using the tolerance rules below (protein daily, others weekly average)`;

    if (sleepData) {
      prompt += `
10. **PROVIDES MEAL TIMING RATIONALE** - Explain why each meal time optimizes sleep and circadian health`;
    }
    
    // Add static sections
    prompt += getGroceryListRequirements(store, budgetData.planDuration || 7);
    prompt += getMealPrepSessionRequirements(budgetData.planDuration || 7, budgetData.skillConfidence, budgetData.timeInvestment, budgetData.planningStyle);
    prompt += getVerificationSteps(budgetData.mealsPerDay || 3, macroResults.protein || 150, budgetData.planDuration || 7, nutritionData, budgetData);
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
    const budgetData = budgetCookingResults?.formData || {} as any;
    const equipmentData = (budgetCookingResults?.formData as any)?.cookingEquipment || [];
    
    const proteinTarget = macroResults.protein || 150;
    const fiberTarget = macroResults.calories 
      ? Math.min(45, Math.max(25, Math.round((macroResults.calories / 1000) * 14)))
      : 30;
    const fiberMinimum = Math.round(fiberTarget * 0.8);
    const planDuration = budgetData.planDuration || 7;
    
    // Calculate period labels for duration-aware text
    const periodLabel = planDuration <= 7 ? 'Plan-period' : 'Weekly';
    const periodNote = planDuration < 7 
      ? `(averaged across all ${planDuration} days)` 
      : planDuration === 7 
        ? '(averaged across the full 7-day plan)' 
        : '(calculate rolling 7-day averages)';
    
    // Build hard constraints section with user's actual targets
    let hardConstraintsSection = `
## HARD CONSTRAINTS — ZERO TOLERANCE

These must pass after your fixes. If any of these still fail after revision, you have not finished — go back and fix again.

`;

    // Add last meal timing constraint if sleep optimization is enabled
    if (sleepData?.bedtime && sleepData?.wakeTime) {
      const optimizationLevel = sleepData.optimizationLevel || 'minimal';
      const lastMealBuffer = optimizationLevel === 'maximum' ? '4+' : optimizationLevel === 'moderate' ? '3' : '2';
      
      hardConstraintsSection += `- **Sleep optimization priority** — target finishing last meal at least ${lastMealBuffer} hours before bedtime (${sleepData.bedtime}) to support sleep quality.
`;
    }
    
    hardConstraintsSection += `- **Protein priority** — aim to keep protein within 10% of ${proteinTarget}g target daily for optimal results.
- **${periodLabel} average calories** — target within 5% of target ${periodNote}.
- **${periodLabel} average carbs and fat** — aim for within 10% of target ${periodNote}.
- **Fiber priority** — target at least ${fiberMinimum}g (80% of ${fiberTarget}g target) daily for digestive health.
- **Equipment compatibility** — design recipes using only the user's listed equipment: ${equipmentData.join(', ') || 'basic kitchen equipment'}. Adapt techniques to available tools.`;

    
    // Add skill/time compliance to hard constraints
    const skillTimeConstraints = getSkillTimeHardConstraints(budgetData);
    if (skillTimeConstraints) {
      hardConstraintsSection += skillTimeConstraints;
    }

    hardConstraintsSection += `
- **No draft content** — the output must contain zero working, iteration, or revision commentary.`;
    
    const sleepComplianceSection = sleepData?.bedtime && sleepData?.wakeTime ? (() => {
      const optimizationLevel = sleepData.optimizationLevel || 'minimal';
      const lastMealBuffer = optimizationLevel === 'maximum' ? '4+' : optimizationLevel === 'moderate' ? '3' : '2';
      const firstMealWindow = optimizationLevel === 'maximum' ? '0.5-1' : optimizationLevel === 'moderate' ? '0.5-1.5' : '2';
      
      return `### 7. Sleep Optimization Compliance (if applicable)
If sleep optimization was requested, check meal timing:
- **Sleep timing priority**: Target finishing last meal at least ${lastMealBuffer} hours before bedtime (${sleepData.bedtime}). Calculate the actual time and verify alignment.
- **SOFT**: First meal should be within ${firstMealWindow} hours of wake time (${sleepData.wakeTime}).
- **SOFT**: Meals should be spaced 3-5 hours apart. No gap longer than 5 hours during waking hours.
- **FAIL if** last meal is too close to bedtime (less than ${lastMealBuffer} hours before ${sleepData.bedtime}).
- **FIX**: Move dinner earlier. If this creates a gap longer than 5 hours, add or shift a snack to fill the gap.`;
    })() : 
'### 7. Sleep Optimization Compliance (if applicable)\nN/A — sleep optimization not enabled. Check meals are spaced 3-5 hours apart.';
    
    return `# Review and Fix Meal Plan

First, read the meal plan you just created so you have the full content in context. Then review it as an experienced nutritionist and meal planning expert auditing a plan for a client. This is an independent quality gate — do not assume your self-check caught everything.

## CRITICAL INSTRUCTIONS

1. **Review the plan** using the checklist below, noting PASS or FAIL for each check.
2. **If ANY check fails, FIX IT IMMEDIATELY** — do not ask the user for permission to fix. Silently revise the plan to resolve all failures.
3. **After fixing, re-verify** — run the checklist again on the corrected plan to confirm all checks now pass.
4. **Present the CORRECTED plan** — output the complete, clean, final version of the meal plan with all fixes applied. Do not show the review process, do not show before/after comparisons, do not show your working. Present ONLY the clean corrected plan.
5. **At the end, provide a brief change log** — a short bullet list of what you changed and why (e.g., "Reduced rice from 100g to 80g dry to bring carbs within 10% of target").
6. **Remind the user about JSON conversion** — after presenting the corrected plan, tell the user: "When you're happy with this plan, send me the JSON conversion prompt and I'll convert it for import into JSON.fit."
7. **USE WEB SEARCH** - If you have web search available, use it during the review to verify grocery pricing, confirm product availability, and check nutritional claims against real data.
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
Use these evidence-based principles (not all macros need the same daily precision):
- **Protein**: Aim for consistent daily intake as muscle protein synthesis is a daily process. Daily consistency matters more than weekly averaging for protein.
- **Calories**: Focus on ${periodLabel} average for energy balance while allowing reasonable daily variation. Total energy balance drives weight change over time.
- **Carbs & Fat**: Target ${periodLabel} averages with flexible daily variation. Day-to-day variation in carbs and fat is normal and can align with activity levels.
- **Fiber**: Prioritize daily consistency as gut microbiome responds to consistent fiber intake. Daily intake supports sustained gut health benefits.
- **Review approach**: Check if protein is reasonably consistent daily, if ${periodLabel.toLowerCase()} calorie averages align with goals, if carbs/fat averages meet targets with natural daily variation, and if fiber intake supports gut health.
- **Optimization**: Adjust portion sizes as needed (modify carb sources, swap proteins, adjust fat sources). For protein, focus on daily consistency. For carbs/fat, balance ${periodLabel.toLowerCase()} averages. For fiber, maintain daily adequacy.

### 2. Budget Compliance
${budgetData?.budgetMax ? 
  `- **Budget target**: The user set a range of ${budgetData?.budgetMin ? getCurrencySymbol(budgetData?.countryCode || 'US') + budgetData.budgetMin + '–' : ''}${getCurrencySymbol(budgetData?.countryCode || 'US')}${budgetData.budgetMax}/week. Aim to stay within this range.
- **If over budget**: Try swapping premium ingredients for budget alternatives, adjusting quantities, or switching convenience items for cheaper equivalents. If the plan still exceeds the range after optimisation, PASS but clearly flag the overspend in the plan notes — explain why (e.g., "High calorie target + convenience-only constraint makes sub-$200 difficult") and suggest specific changes the user could make to bring costs down in future weeks.
- **FAIL only if** the budget is exceeded AND no acknowledgement or explanation is provided. The AI must never silently ignore a budget overspend.` 
  : 
  '- Grocery list total should align with the user\'s budget attitude. Flag if the total seems unreasonable for the user\'s stated preferences.'}
Check if the plan respects budget constraints.

### 3. Meal Prep Style Alignment
Verify the plan matches the user's planning style preference.

### 4. Dietary Restrictions & Preferences
Check compliance with dietary requirements.

### 5. Cooking Feasibility
${(() => {
  const skillConfidence = budgetData?.skillConfidence || 3;
  const timeInvestment = budgetData?.timeInvestment || 3;
  
  let cookingFeasibilityCheck = '';
  
  if (skillConfidence <= 1) {
    cookingFeasibilityCheck = `- **CRITICAL for Kitchen Beginner**: Walk through every recipe. Each one must be assembly-only: open, combine, microwave. Maximum 4-5 ingredients.
- **FAIL if** any recipe requires: cooking raw meat, chopping/peeling vegetables, using a stovetop, using an oven, timing multiple components, or more than 5 minutes total.
- **FAIL if** any recipe uses ingredients that aren't pre-cooked, tinned, frozen, pre-washed, or ready-to-eat (whole fruits and pre-washed produce count as ready-to-eat).
- **FIX**: Replace with convenience alternatives — use pre-cooked proteins, ready-to-eat carbohydrates, and minimal-prep vegetables.`;
  } else if (skillConfidence <= 2) {
    cookingFeasibilityCheck = `- Recipes should use simple techniques only (air fryer, rice cooker, basic pan). Raw meat is acceptable with exact temperatures and times.
- **FAIL if** recipes require advanced techniques, complex sauces from scratch, or managing multiple simultaneous components.
- **FIX**: Simplify techniques, add safety instructions, or swap for convenience alternatives.`;
  } else {
    cookingFeasibilityCheck = `Assess if the plan is practical for the user's stated skill level and time preferences.`;
  }
  
  // Add time-specific checks
  if (timeInvestment <= 1) {
    cookingFeasibilityCheck += `\n- **TIME CHECK**: Every individual meal must be completable in under 5 minutes including heating. FAIL if any meal exceeds this.`;
  } else if (timeInvestment <= 2) {
    cookingFeasibilityCheck += `\n- **TIME CHECK**: No meal should exceed 20 minutes total time.`;
  }
  
  return cookingFeasibilityCheck;
})()}

### 6. Location & Ingredient Availability
Verify ingredients are accessible.

${sleepComplianceSection}

### 8. Practical Implementation
Assess overall plan practicality.

### 9. Nutritional Quality & Balance
Evaluate nutritional completeness.

### 10. Grocery List Completeness & Accuracy
Verify the grocery list is complete and correct.

### 11. Meal Prep Session Completeness & Skill Alignment

- **Structure check**: Does the prep session match the user's skill level?
  - Skill 1 (Beginner): Session must be "assembly & portioning" only. Zero cooking steps. Equipment is only containers/bags/bowls/spoons. Total time under 20 minutes. Must include a separate mid-week restock session for perishable items.
  - Skill 2 + Time 1-2: Simple prep only. No stovetop/oven. Under 1 hour total. One task at a time.
  - Skill 3+: Standard batch cook session is appropriate.
- **FAIL if** a Beginner user's prep session includes any cooking, heating, chopping, or kitchen equipment beyond containers.
- **FAIL if** a Beginner user's prep session has no mid-week restock session and includes items that won't last 7 days (rotisserie chicken, salad bags, opened tins).
- **Step validity**: Every step in the prep session must reference items that actually appear in the meal plan. No orphaned prep steps.
- **Storage accuracy**: Verify safe storage durations using standard food safety guidelines:
  - Cooked proteins: typically 3-4 days refrigerated
  - Assembled items with dairy/liquid: typically 3-4 days refrigerated  
  - Dry assembled items: typically 5-7 days when stored properly
  - Opened canned/packaged items: typically 2-3 days when transferred to sealed containers
  - Pre-washed produce: typically 3-5 days after opening
- **FAIL if** any storage duration exceeds safe limits.
- **Check — Prep style compliance**: Cross-reference the user's planning style against the actual prep session content. If the prompt includes GRAB-AND-GO PREP, verify lunches are assembled as complete meals in containers (not just portioned ingredients). If the prompt includes MODERATE PREP, verify lunches are at least partially pre-assembled (e.g., cold components combined into a single container per day). If a meal contains components that can't be pre-assembled (e.g., microwave rice pouches, tins that expire in 2 days), the prep session must explicitly acknowledge this and minimise meal-time steps to the fewest possible actions. FAIL if the prep session ignores the stated prep style entirely.${planDuration > 7 ? `
- **Multi-week plans**: For plans longer than 7 days, verify EACH prep session is complete and covers its respective days. Verify shopping trips align with prep sessions and perishables aren't bought too early.` : ''}
- **FIX**: Regenerate the prep session using the correct skill tier structure. Add missing restock items. Correct storage durations.

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

The JSON structure includes dailyMeals with date-keyed objects, grocery_list with categories and items, meal_prep_sessions with instructions, and metadata.

**MEAL PLAN NAME:**
- The "name" field should be a short, clean title focused on the goal (e.g., "High Protein Bulk Plan", "Weight Loss Meal Plan", "Lean Gains Plan").
- Do NOT include dates, date ranges, skill level, or duration in the name — the app displays these separately in the UI.
- Keep it under 30 characters if possible.

**MEAL PREP SESSIONS FORMAT:**
- Use \`meal_prep_sessions\` (plural) as an array of session objects, NOT a single \`meal_prep_session\` object.
- Each session should be a separate object in the array with its own session_name, instructions, equipment_needed, storage_guidelines, etc.
- If the meal plan has a mid-week restock or second prep day, make it a separate session object in the array.
- Example: A 7-day plan with a mid-week restock should have 2 sessions in the array.

**COVERS FIELD REQUIREMENT:**
- The \`covers\` field MUST be clean and concise - maximum 6 words
- Use format: "X meals across Y days" or "Days 1-3" or "All week"
- NEVER include verbose explanations, timings, or specific meal details
- Examples:
  • Good: "21 meals across 7 days"
  • Good: "Days 1-4"  
  • Good: "All week"
  • Bad: "All 7 days across all 4 meals. Chicken Batch 1 covers Days 1-4 lunch. Mid-week restock on Wednesday covers Days 5-7."

**RECOMMENDED DATE REQUIREMENT:**
- Each meal prep session MUST include a \`recommended_date\` field in YYYY-MM-DD format
- Calculate the actual date based on the meal plan start date and when the prep should be done
- For multiple prep sessions, use different dates (e.g., Sunday prep + Wednesday restock)
- Examples:
  • If plan starts 2026-03-12 and prep is "Sunday before": recommended_date: "2026-03-09"
  • If plan starts 2026-03-12 and mid-week restock is "Wednesday": recommended_date: "2026-03-14"

Start the conversion now and create the JSON file.`;
};

// ================================
// HELPER FUNCTIONS
// ================================

const getCurrencySymbol = (countryCode: string): string => {
  const currencyMap: Record<string, string> = {
    'US': '$',
    'CA': 'CAD$',
    'AU': 'AU$',
    'NZ': 'NZ$',
    'GB': '£',
    'IE': '€',
    'DE': '€',
    'FR': '€',
    'ES': '€',
    'IT': '€',
    'NL': '€',
    'BE': '€',
  };
  return currencyMap[countryCode] || '$';
};

const getMealStructure = (mealsPerDay: number, proteinTarget: number): string => {
  switch (mealsPerDay) {
    case 2:
      return `MEAL STRUCTURE (2 main meals):
- Meal 1: breakfast (substantial meal)
- Meal 2: dinner (substantial meal)
- Distribute daily calories roughly evenly across both meals (flexibility is fine)
- Distribute ${proteinTarget}g protein appropriately across both meals`;
    
    case 3:
      return `MEAL STRUCTURE (3 main meals):
- Meal 1: breakfast (substantial meal)
- Meal 2: lunch (substantial meal)  
- Meal 3: dinner (substantial meal)
- Distribute daily calories roughly evenly across meals (flexibility is fine - aim for balanced portions)
- Distribute ${proteinTarget}g protein appropriately across all meals`;
    
    case 4:
      return `MEAL STRUCTURE (4 eating occasions):
- Meal 1: breakfast (substantial meal)
- Meal 2: lunch (substantial meal)  
- Meal 3: dinner (substantial meal)
- Meal 4: Choose based on user's snacking preference:
  • If user likes substantial meals: 4th main meal like "supper" or "second lunch" (similar size to other meals, type: "dinner" or "lunch")
  • If user prefers lighter eating: snack between meals (much smaller than meals, type: "snack")
- Distribute daily calories appropriately across all eating occasions (flexibility is fine)
- Distribute ${proteinTarget}g protein appropriately, with main meals carrying most protein`;
    
    case 5:
      return `MEAL STRUCTURE (5 eating occasions):
Choose structure based on user's snacking preference:

**OPTION A - If user prefers substantial meals (e.g., "I don't snack"):**
- Meal 1: breakfast (substantial meal, type: "breakfast")
- Meal 2: brunch (substantial meal, type: "lunch") 
- Meal 3: lunch (substantial meal, type: "lunch")
- Meal 4: dinner (substantial meal, type: "dinner")
- Meal 5: supper (substantial meal, type: "dinner")
- Distribute daily calories roughly evenly across all 5 meals (flexibility is fine)
- All meals are substantial with balanced macros

**OPTION B - If user enjoys snacking:**
- Meal 1: breakfast (substantial meal, type: "breakfast")
- Snack 1: mid-morning (light snack, type: "snack")
- Meal 2: lunch (substantial meal, type: "lunch")
- Snack 2: afternoon (light snack, type: "snack")
- Meal 3: dinner (substantial meal, type: "dinner")
- Distribute calories with main meals being substantial and snacks being lighter (flexibility is fine)
- Main meals provide most protein, snacks are lighter contributions`;
    
    case 6:
      return `MEAL STRUCTURE (6 eating occasions):
Choose structure based on user's snacking preference:

**OPTION A - If user prefers substantial meals (e.g., "I don't snack"):**
- Meal 1: breakfast (substantial meal, type: "breakfast")
- Meal 2: brunch (substantial meal, type: "lunch")
- Meal 3: lunch (substantial meal, type: "lunch") 
- Meal 4: afternoon meal (substantial meal, type: "lunch")
- Meal 5: dinner (substantial meal, type: "dinner")
- Meal 6: supper (substantial meal, type: "dinner")
- Distribute daily calories roughly evenly across all 6 meals (flexibility is fine)
- All 6 meals are substantial with balanced macros

**OPTION B - If user enjoys snacking:**
- Meal 1: breakfast (substantial meal, type: "breakfast")
- Snack 1: mid-morning (light snack, type: "snack")
- Meal 2: lunch (substantial meal, type: "lunch")
- Snack 2: afternoon (light snack, type: "snack")
- Meal 3: dinner (substantial meal, type: "dinner")
- Snack 3: evening (light snack, type: "snack", respect bedtime timing)
- Distribute calories with main meals being substantial and snacks being lighter (flexibility is fine)
- Main meals provide most protein, snacks are lighter contributions`;
    
    default: // fallback to 3
      return `MEAL STRUCTURE (3 main meals):
- Meal 1: breakfast (substantial meal)
- Meal 2: lunch (substantial meal)
- Meal 3: dinner (substantial meal)
- Distribute daily calories roughly evenly across meals (flexibility is fine - aim for balanced portions)
- Distribute ${proteinTarget}g protein appropriately across all meals`;
  }
};

const getSnackingGuidance = (snackingStyle: string, mealsPerDay: number): string => {
  const style = snackingStyle?.toLowerCase() || 'occasional snacker';
  
  if (style.includes("don't snack") || style.includes("i don't snack")) {
    return `- MINIMAL SNACKING: User prefers not to snack. For 4+ eating occasions, treat them as main meals rather than snacks.
- Focus on making meals substantial and satisfying. Use names like "brunch", "supper", "second lunch" for 4th+ meals.
- Only add light snacks if gaps between meals exceed 5-6 hours for practical hunger management.`;
  }
  
  if (style.includes('love snacking') || style.includes('frequent')) {
    return `- SNACK-FRIENDLY: User enjoys snacking frequently. Include appropriate snacks between meals.
- Make snacks nutritious and balanced (combine protein + carbs/fat when possible).
- Examples: Greek yogurt with berries, apple with almond butter, hummus with vegetables, mixed nuts with fruit.`;
  }
  
  if (style.includes('need healthy snacks')) {
    return `- HEALTHY FOCUS: User wants nutritious snack options that support their health goals.
- Prioritize whole food snacks with good nutritional density.
- Examples: vegetables with healthy dips, fruit with protein, nuts and seeds, homemade energy balls.`;
  }
  
  if (style.includes('sweet tooth')) {
    return `- SWEET PREFERENCES: User enjoys sweet snacks - provide healthier sweet options.
- Examples: fruit with yogurt, dark chocolate with nuts, homemade fruit smoothies, dates stuffed with nut butter.
- Balance sweetness with protein/fiber to avoid energy crashes.`;
  }
  
  if (style.includes('savory')) {
    return `- SAVORY PREFERENCES: User prefers savory snack options over sweet ones.
- Examples: vegetable sticks with hummus, nuts and seeds, cheese with crackers, olives, roasted chickpeas.`;
  }
  
  // Default for "occasional snacker" or unrecognized styles
  return `- MODERATE SNACKING: Include 1-2 moderate snacks if meal timing creates gaps longer than 4-5 hours.
- Keep snacks balanced and proportionate to overall daily calorie needs.
- Examples: mixed nuts, fruit with yogurt, vegetable sticks with protein-rich dips.`;
};

const getProteinDistributionGuidance = (mealsPerDay: number, proteinTarget: number): string => {
  if (mealsPerDay <= 3) {
    return `Distribute protein effectively across meals, aiming for ${Math.round(proteinTarget / mealsPerDay)}g per meal on average. Each meal should include a substantial protein source to optimize muscle protein synthesis.`;
  } else {
    const avgMainMeal = Math.round(proteinTarget * 0.3);
    const avgSnack = Math.round(proteinTarget * 0.1);
    return `Distribute protein strategically: main meals should average ~${avgMainMeal}g protein, snacks ~${avgSnack}g protein. Adjust based on meal timing, food preferences, and individual response while hitting the daily total.`;
  }
};

const getMealPrepStyleText = (style: number, skillConfidence?: number, timeInvestment?: number): string => {
  // Override if skill/time make traditional meal prep impossible
  if (skillConfidence !== undefined && skillConfidence <= 1) {
    return 'Assembly Only — no cooking ability, pre-cooked and convenience items only';
  }
  if (timeInvestment !== undefined && timeInvestment <= 1) {
    return 'Speed Assembly — under 5 minutes per meal, microwave and assembly only';
  }
  if (skillConfidence !== undefined && skillConfidence <= 2 && timeInvestment !== undefined && timeInvestment <= 2) {
    return 'Simple Prep — basic techniques only, quick meals, minimal complexity';
  }

  // Standard planning style text (existing logic)
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

const getSkillTimeHardConstraints = (budgetData: any): string => {
  const skillConfidence = budgetData?.skillConfidence;
  const timeInvestment = budgetData?.timeInvestment;
  const planningStyle = budgetData?.planningStyle;
  
  let constraints = '';
  
  if (skillConfidence <= 1) {
    constraints += `\n- **Skill priority**: Kitchen Beginner level works best with zero cooking skills. Avoid raw meat preparation, knife work, and stovetop use to match user comfort level.`;
  }
  
  if (timeInvestment <= 1) {
    constraints += `\n- **Time priority**: Speed Cook preference targets maximum 5 minutes total per meal including heating. Focus on ultra-quick assembly and minimal preparation.`;
  }
  
  if (skillConfidence <= 1 && timeInvestment <= 1) {
    constraints += `\n- **Important combination**: Beginner + Speed Cook combination works best with assembly-only meals. Traditional meal prep doesn't align with this user's preferences and skill level.`;
  }
  
  if (skillConfidence <= 1 && planningStyle <= 2) {
    constraints += `\n- **Meal prep guidance**: Beginner skill + meal prep style works best with assembly-only prep sessions. Focus on no-cook preparation methods.`;
  }
  
  return constraints;
};

const buildBudgetSection = (budgetData: any): string => {
  const currency = getCurrencySymbol(budgetData?.countryCode || 'US');
  const attitude = budgetData?.weeklyBudget || 'keep_reasonable';
  const budgetMin = budgetData?.budgetMin;
  const budgetMax = budgetData?.budgetMax;
  const budgetSkipped = budgetData?.budgetSkipped;
  const city = budgetData?.city || 'your city';
  const country = budgetData?.country || 'your country';

  if (budgetMin && budgetMax) {
    // Scenario 1: Full range provided
    return `- Budget: ${currency}${budgetMin}–${currency}${budgetMax} per week
- Budget attitude: ${attitude}
- TARGET: Aim to keep grocery costs within ${currency}${budgetMin}–${currency}${budgetMax}. If higher-priority constraints (macros, dietary needs) make this impossible, explain the trade-off and provide the most cost-effective options possible.`;
    
  } else if (budgetMax && !budgetMin) {
    // Scenario 2: Maximum only (budget ceiling)
    return `- Budget: Up to ${currency}${budgetMax} per week
- Budget attitude: ${attitude}
- TARGET: Strongly aim to keep grocery costs under ${currency}${budgetMax}. If nutritional requirements make this challenging, prioritize the most cost-effective options and explain any budget considerations.`;
    
  } else if (budgetMin && !budgetMax) {
    // Scenario 3: Minimum only (quality floor)
    return `- Budget: At least ${currency}${budgetMin} per week (willing to spend for quality)
- Budget attitude: ${attitude}
- The user has set a quality floor, not a ceiling. Feel free to use premium ingredients — the user prioritizes quality over savings.`;
    
  } else {
    // Scenario 4: Skipped or no range — fall back to attitude only
    return `- Budget attitude: ${attitude}
- Budget guidance: No specific dollar range provided. Use the budget attitude above to guide ingredient choices. Estimate a realistic weekly grocery cost for ${city}, ${country} and state it in the grocery list summary.`;
  }
};

// Legacy function for backward compatibility - now uses buildBudgetSection
const getBudgetConstraintText = (budgetData: any): string => {
  const currency = getCurrencySymbol(budgetData?.countryCode || 'US');
  const attitude = budgetData?.weeklyBudget || 'keep_reasonable';
  const budgetMin = budgetData?.budgetMin;
  const budgetMax = budgetData?.budgetMax;

  if (budgetMin && budgetMax) {
    return `Stay within ${currency}${budgetMin}-${budgetMax}/week`;
  } else if (budgetMax) {
    return `Stay within ${currency}${budgetMax}/week`;
  } else {
    return `${attitude} priority`;
  }
};

const getBudgetGuidanceText = (budgetData: any): string => {
  const budgetMin = budgetData?.budgetMin;
  const budgetMax = budgetData?.budgetMax;
  const budgetSkipped = budgetData?.budgetSkipped;
  const city = budgetData?.city;
  const country = budgetData?.country;

  // If user skipped budget range input, use standard guidance
  if (budgetSkipped || (!budgetMin && !budgetMax)) {
    return `Based on the budget attitude above, estimate a realistic weekly grocery cost range in local currency for ${city}, ${country} and keep the plan within that range. State your estimate in the grocery list summary.`;
  }

  // If both min and max are provided
  if (budgetMin && budgetMax) {
    return `User has specified a budget range of $${budgetMin}-$${budgetMax} per week. Plan must keep grocery costs within this range. State the final total in the grocery list and confirm it fits the specified budget.`;
  }

  // If only max is provided
  if (budgetMax && !budgetMin) {
    return `User has set a maximum budget of $${budgetMax} per week. This is an absolute ceiling - grocery costs must not exceed this amount. State the final total in the grocery list and confirm it's under the limit.`;
  }

  // If only min is provided
  if (budgetMin && !budgetMax) {
    return `User wants to invest at least $${budgetMin} per week in food quality. Don't compromise on quality below this level. Estimate a realistic total cost starting from this minimum investment and state it in the grocery list.`;
  }

  // Fallback
  return `Based on the budget attitude, estimate a realistic weekly grocery cost range in local currency for ${city}, ${country} and keep the plan within that range. State your estimate in the grocery list summary.`;
};

const getBudgetLevelDescription = (budgetLevel: string, skillConfidence?: number, timeInvestment?: number): string => {
  const descriptions: { [key: string]: string } = {
    'critical': `**Absolute minimum spend.** Use the cheapest protein sources available (eggs, tinned legumes, bulk frozen chicken, dry lentils). No convenience products unless the user's skill level makes them essential. Store brands mandatory. No supplements unless essential. Every ingredient must justify its cost. The model should estimate the lowest realistic weekly cost achievable while still meeting nutritional targets.`,
    
    'important': `**Actively minimise costs.** Prefer store-brand products, cheaper protein sources (eggs, tinned fish, legumes, frozen chicken), frozen vegetables over fresh where cheaper. Limit convenience products — prefer cooking from scratch when the user's skill level allows it. Bulk buying where practical. The model should estimate a realistic weekly cost and actively work to bring it below average for someone with this calorie target and location.`,
    
    'keep_reasonable': `**Balanced approach to cost and quality.** Standard supermarket products, cost-effective cuts of meat and fish, and store-brand where quality is equivalent. Convenience products are acceptable when the user's skill/time level requires them. Avoid premium/organic unless similarly priced. The model should estimate a realistic weekly cost based on the user's calorie target, location, and cooking skill level, and keep the plan within a reasonable range for someone in their situation.`,
    
    'not_a_concern': `**No cost constraints on ingredient selection.** Optimise for quality, convenience, and nutrition. Premium products, convenience items, and specialty ingredients are all fine.`
  };
  
  let description = descriptions[budgetLevel] || descriptions['keep_reasonable'];
  
  // Add general instruction for all budget levels
  description += `

**Based on the user's calorie target, location, cooking skill level, and cost attitude, estimate a realistic weekly grocery cost range for this specific plan. State this estimate in the grocery list summary. Do not use preset budget tiers or dollar ranges — calculate what is realistic for THIS user's situation.**`;
  
  // Add special guidance for low skill/time + tight budget combination
  if ((budgetLevel === 'critical' || budgetLevel === 'important') && 
      ((skillConfidence && skillConfidence <= 2) || (timeInvestment && timeInvestment <= 2))) {
    description += `

**CRITICAL NOTE for Budget + Simplicity Combination:**
This user needs cheap AND simple meals. This is a hard combination — convenience products are expensive but this user can't cook from scratch. Prioritise ingredients that are both affordable and require no cooking: tinned legumes, eggs (if equipment allows boiling), canned fish, peanut butter, oats, frozen vegetables, and store-brand products. Acknowledge to the user if the plan costs more than expected due to the convenience-cost trade-off.`;
  }
  
  return description;
};

const getMealPrepRequirementsText = (planningStyle: number, skillConfidence?: number, timeInvestment?: number): string => {
  
  // OVERRIDE: If user can't cook or needs ultra-fast meals, 
  // traditional meal prep doesn't apply regardless of planningStyle
  if (skillConfidence !== undefined && skillConfidence <= 1) {
    return `No traditional batch cooking — this user cannot cook from scratch.
  • "Meal prep" means: portioning snacks into daily servings, buying pre-cooked items, assembling ready-made components into grab-and-go containers, etc.
  • Assembly-only prep: open packets, combine in containers, refrigerate, etc.
  • Total prep session should be under 20 minutes for the entire week
  • All items should be pre-cooked, tinned, or ready-to-eat`;
  }
  
  if (timeInvestment !== undefined && timeInvestment <= 1) {
    return `Minimal prep — every meal must be under 5 minutes including heating.
  • If any "batch prep" is used, it should be assembly only (no cooking): portioning, combining, refrigerating
  • Prep session under 20 minutes for the entire week
  • Microwave reheating is the only acceptable heating method for prepped meals
  • Pre-cooked and convenience products are the default, not a shortcut`;
  }
  
  if (skillConfidence !== undefined && skillConfidence <= 2 && timeInvestment !== undefined && timeInvestment <= 2) {
    return `Simple batch prep only — keep it basic.
  • Simple batch items only: rice cooker rice, air fryer chicken with salt/pepper, boiled eggs
  • Maximum 1 hour total prep for the week
  • No complex sauces, marinades, or multi-step preparations
  • Pre-made sauces and convenience products are preferred`;
  }
  
  // Standard planningStyle-based text (existing logic)
  if (planningStyle <= 2) {
    return `I want to meal prep!
  • Give me 3-4 repeated meals max, not 21 different ones
  • Focus on batch cooking 1-2 proteins for the week
  • Same breakfast for multiple days is fine`;
  } else if (planningStyle >= 4) {
    return `I prefer fresh, different meals each day
  • Minimal meal prep, focus on quick daily cooking
  • Different meals every day`;
  } else {
    return `Moderate meal prep - balanced approach
  • Some repeated meals, some variety
  • 1-2 batch cooked items, but change up sides and seasonings
  • 5-6 different meals max across the week`;
  }
};

// ================================
// STATIC SECTIONS
// ================================

const getGroceryListRequirements = (store: string, planDuration: number = 7): string => {
  const durationText = planDuration <= 7 ? `the full ${planDuration}-day plan` : 'the full plan period';
  const additionalGuidance = getGroceryListGuidance(planDuration);
  
  return `

---

## GROCERY LIST REQUIREMENTS

**IMPORTANT:** Your meal plan should include a detailed grocery list structured by category. This grocery list will be imported into the app for shopping, so accuracy matters.

For each grocery item include:
- **Item name** - Specific product name (e.g., "${store} Lean Beef Mince" not just "beef")
- **Quantity** - Exact amount needed for ${durationText}
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

Include a **total estimated cost** and **currency** for the full grocery list.${additionalGuidance ? '\n\n' + additionalGuidance : ''}`;
};

const getMealPrepSessionRequirements = (planDuration: number = 7, skillConfidence?: number, timeInvestment?: number, planningStyle?: number): string => {
  const prepGuidance = getMealPrepSessionGuidance(planDuration);
  
  // Tier 1: Assembly Only (skill ≤1, or skill ≤2 + time ≤1)
  if (skillConfidence !== undefined && skillConfidence <= 1) {
    return `
---

## MEAL PREP SESSION REQUIREMENTS

**IMPORTANT:** Your meal plan should include a structured weekly assembly guide. This will be displayed in the app as a step-by-step prep walkthrough.

${prepGuidance}

**This user CANNOT cook. The prep session is assembly and portioning only.**

Include:
- **Session name** — Use "Weekly Assembly & Portioning" (not "Meal Prep" or "Batch Cook")
- **Total time** — Must be under 20 minutes for the entire week. No separate "cook time" — there is no cooking.
- **Coverage** — What days/meals the assembly covers
- **Recommended timing** — When to do it (e.g., "Same day as grocery shop — unpack and portion immediately")
- **Equipment needed** — ONLY list: containers with lids, zip-lock bags, a bowl, a spoon. No cooking equipment.
- **Step-by-step instructions** — Clear, ordered steps. Every step must be one of: unpack, portion, combine, stir, store, etc. No step should involve cooking, heating, chopping, or any kitchen skill. Include a time estimate per step (e.g., "Portion chicken — 3 min").
  Suggested step structure:
  1. Unpack & sort (fridge vs pantry)
  2. Portion proteins (e.g., shred rotisserie chicken into containers)
  3. Portion snacks (e.g., divide nuts into daily bags)
  4. Assemble make-ahead items (combining dry ingredients for grab-and-go convenience)
  5. Organize fridge by meal type
  etc.
- **Make-ahead assembly rule** — For items requiring moisture/liquid, combine DRY components during the weekly prep session. Add liquid/wet ingredients the night before consumption to prevent texture degradation. This ensures optimal texture and freshness.
- **Opened tinned items rule** — If a recipe uses half a tin (e.g., half a tin of baked beans), the prep instructions should tell the user to transfer the remaining half to a sealed container, label it, and refrigerate immediately. Use the remainder the next day — do not store opened tinned items for more than 2 days.
- **Mid-week restock session** — If perishable items won't last 7 days, describe a SEPARATE meal prep session for the mid-week restock. This should have its own name (e.g., "Mid-Week Restock & Assembly"), its own timing, equipment list, and step-by-step instructions. Don't bundle the restock as a final step inside the first prep session — it happens on a different day and should be treated as a distinct session.
- **Storage guide** — Simple list: item name, container type, fridge or pantry, use-by day. Follow standard food safety guidelines:
  - Cooked proteins: 3-4 days refrigerated
  - Assembled items with dairy/liquid: 3-4 days refrigerated
  - Dry assembled items: 5-7 days when stored properly  
  - Opened canned/packaged items: 2-3 days in sealed containers
  - Pre-washed produce: 3-5 days after opening
  - Dry portioned items: 1-2 weeks in pantry when stored properly${(() => {
    const prepApproach = (planningStyle !== undefined && planningStyle <= 2)
      ? `\n\n**GRAB-AND-GO PREP**: This user selected "Dedicated Meal Prepper" — they want to open the fridge, grab a container, microwave it, and eat. The prep session must assemble COMPLETE meals into individual containers, not just portion ingredients. At meal time, the only steps should be: grab container, microwave 2 minutes, eat. If a meal doesn't reheat well (e.g., wraps go soggy), note it as an exception that gets assembled fresh at meal time in under 2 minutes.`
      : (planningStyle !== undefined && planningStyle >= 4)
      ? `\n\n**MINIMAL PREP**: This user prefers deciding at meal time. The prep session should only portion long-life ingredients (nuts, dry oats). All meal assembly happens fresh at meal time using convenience products.`
      : `\n\n**MODERATE PREP**: Portion and assemble some meals fully into containers, leave others for quick assembly at meal time. Prioritise assembling lunches fully into grab-and-go containers and leave dinners for fresh assembly using convenience items.`;
    return prepApproach;
  })()}`;
  }

  // Tier 2: Speed-focused minimal prep (time ≤1, any skill)
  if (timeInvestment !== undefined && timeInvestment <= 1) {
    return `
---

## MEAL PREP SESSION REQUIREMENTS

**IMPORTANT:** Your meal plan should include a structured meal prep session guide. This will be displayed in the app as a step-by-step prep walkthrough.

${prepGuidance}

**SPEED CONSTRAINT: Total prep must be under 20 minutes for the entire week.**

Include:
- **Session name** — e.g., "Quick Weekly Prep"
- **Active time** — Hands-on time only (must be under 20 minutes)
- **Passive time** — Any unattended time (e.g., rice cooker running). Separate from active time.
- **Total time** — Combined, but the user only needs to be present for active time
- **Coverage** — What days/meals the prep covers
- **Recommended timing** — When to do it
- **Equipment needed** — List only what's actually used. Prefer microwave and rice cooker over stovetop/oven for speed.
- **Step-by-step instructions** — Ordered for efficiency. Start passive items first (rice cooker), do active tasks while waiting. Include time estimate per step.
- **Storage guidelines** — How long each prepped item lasts in fridge vs freezer${(() => {
    const prepApproach = (planningStyle !== undefined && planningStyle <= 2)
      ? `\n\n**GRAB-AND-GO PREP**: This user selected "Dedicated Meal Prepper" — they want to open the fridge, grab a container, microwave it, and eat. The prep session must assemble COMPLETE meals into individual containers, not just portion ingredients. At meal time, the only steps should be: grab container, microwave 2 minutes, eat. If a meal doesn't reheat well (e.g., wraps go soggy), note it as an exception that gets assembled fresh at meal time in under 2 minutes.`
      : (planningStyle !== undefined && planningStyle >= 4)
      ? `\n\n**MINIMAL PREP**: This user prefers deciding at meal time. The prep session should only portion long-life ingredients (nuts, dry oats). All meal assembly happens fresh at meal time using convenience products.`
      : `\n\n**MODERATE PREP**: Portion and assemble some meals fully into containers, leave others for quick assembly at meal time. Prioritise assembling lunches fully into grab-and-go containers and leave dinners for fresh assembly using convenience items.`;
    return prepApproach;
  })()}`;
  }

  // Tier 3: Simplified prep (skill ≤2 + time ≤2)
  if (skillConfidence !== undefined && skillConfidence <= 2 && timeInvestment !== undefined && timeInvestment <= 2) {
    return `
---

## MEAL PREP SESSION REQUIREMENTS

**IMPORTANT:** Your meal plan should include a structured meal prep session guide. This will be displayed in the app as a step-by-step prep walkthrough.

${prepGuidance}

**SIMPLIFIED PREP: Keep it simple and basic. Maximum 1 hour total. No complex techniques.**

Include:
- **Session name** — e.g., "Weekly Prep Session"
- **Prep time** — Active hands-on time
- **Cook time** — Passive cooking time (rice cooker, microwave only — no stovetop timing)
- **Total time** — Combined (must be under 1 hour)
- **Coverage** — What days/meals the prep covers
- **Recommended timing** — When to do it
- **Equipment needed** — Only rice cooker, microwave, and containers. No stovetop or oven.
- **Step-by-step instructions** — One task at a time. Never require timing multiple components simultaneously. Include time estimate per step.
- **Storage guidelines** — How long each prepped item lasts in fridge vs freezer. Include safe storage durations.${(() => {
    const prepApproach = (planningStyle !== undefined && planningStyle <= 2)
      ? `\n\n**GRAB-AND-GO PREP**: This user selected "Dedicated Meal Prepper" — they want to open the fridge, grab a container, microwave it, and eat. The prep session must assemble COMPLETE meals into individual containers, not just portion ingredients. At meal time, the only steps should be: grab container, microwave 2 minutes, eat. If a meal doesn't reheat well (e.g., wraps go soggy), note it as an exception that gets assembled fresh at meal time in under 2 minutes.`
      : (planningStyle !== undefined && planningStyle >= 4)
      ? `\n\n**MINIMAL PREP**: This user prefers deciding at meal time. The prep session should only portion long-life ingredients (nuts, dry oats). All meal assembly happens fresh at meal time using convenience products.`
      : `\n\n**MODERATE PREP**: Portion and assemble some meals fully into containers, leave others for quick assembly at meal time. Prioritise assembling lunches fully into grab-and-go containers and leave dinners for fresh assembly using convenience items.`;
    return prepApproach;
  })()}`;
  }

  // Tier 4: Standard/Advanced prep (skill 3+ or time 3+)
  return `
---

## MEAL PREP SESSION REQUIREMENTS

**IMPORTANT:** Your meal plan should include a structured meal prep session guide. This will be displayed in the app as a step-by-step prep walkthrough.

${prepGuidance}

Include:
- **Session name** — e.g., "Sunday Meal Prep" or "Weekly Batch Cook"
- **Prep time and cook time** — Separate active prep vs passive cooking time
- **Total time** — Combined duration
- **Coverage** — What days/meals the prep covers (e.g., "${planDuration} days of lunches and dinners")
- **Recommended timing** — When to do the prep (e.g., "Sunday afternoon")
- **Equipment needed** — List of equipment required for the prep session
- **Step-by-step instructions** — Clear, ordered instructions for the full prep session. Order for efficiency: start slow items first (oven, rice cooker), do active prep while those run.
- **Storage guidelines** — How long each prepped item lasts in fridge vs freezer${(() => {
    const prepApproach = (planningStyle !== undefined && planningStyle <= 2)
      ? `\n\n**GRAB-AND-GO PREP**: This user selected "Dedicated Meal Prepper" — they want to open the fridge, grab a container, microwave it, and eat. The prep session must assemble COMPLETE meals into individual containers, not just portion ingredients. At meal time, the only steps should be: grab container, microwave 2 minutes, eat. If a meal doesn't reheat well (e.g., wraps go soggy), note it as an exception that gets assembled fresh at meal time in under 2 minutes.`
      : (planningStyle !== undefined && planningStyle >= 4)
      ? `\n\n**MINIMAL PREP**: This user prefers deciding at meal time. The prep session should only portion long-life ingredients (nuts, dry oats). All meal assembly happens fresh at meal time using convenience products.`
      : `\n\n**MODERATE PREP**: Portion and assemble some meals fully into containers, leave others for quick assembly at meal time. Prioritise assembling lunches fully into grab-and-go containers and leave dinners for fresh assembly using convenience items.`;
    return prepApproach;
  })()}`;
};

const getMealPrepSessionGuidance = (planDuration: number): string => {
  if (planDuration <= 5) {
    return `Include a single meal prep session covering the full ${planDuration}-day plan.`;
  } else if (planDuration <= 7) {
    return `Include a single meal prep session (e.g., "Sunday Meal Prep") covering the full week.`;
  } else if (planDuration <= 14) {
    return `Include TWO meal prep sessions:
  - Session 1: Covers days 1-7 (do this before the plan starts)
  - Session 2: Covers days 8-${planDuration} (do this on day 6 or 7)
  Each session should have its own instructions, equipment list, and storage guidelines.`;
  } else {
    return `Include meal prep sessions for every 7-day block:
  - Session 1: Days 1-7
  - Session 2: Days 8-14
  ${planDuration > 14 ? `- Session 3: Days 15-${Math.min(21, planDuration)}` : ''}
  ${planDuration > 21 ? `- Session 4: Days 22-${planDuration}` : ''}
  Plan grocery shopping to align with each prep session — don't buy 4 weeks of perishables at once.`;
  }
};

const getGroceryListGuidance = (planDuration: number): string => {
  const baseGuidance = `**CRITICAL PRICING RULE**: Price every grocery item at the ACTUAL PACK SIZE the user must buy at the store, not the portion used in recipes. If a recipe uses 90g cheese but the smallest pack is 250g, price the 250g pack. If a recipe uses 200ml cream but the carton is 300ml, price the 300ml carton. The grocery total should reflect what the user will actually spend at the register.
- Use conservative price estimates — round UP, not down. It's better to overestimate by 10% than underestimate by 20%.
- After calculating the grocery total, add a 10% buffer to account for price variation and rounding. State the total as a range (e.g., "$160–$180") rather than a single number.`;

  if (planDuration <= 7) {
    return baseGuidance;
  } else {
    return `${baseGuidance}

**MULTI-WEEK SHOPPING NOTE:** This is a ${planDuration}-day plan. Split the grocery list into ${Math.ceil(planDuration / 7)} shopping trips:
  - Shopping trip 1: Everything needed for days 1-7 (buy before plan starts)
  - Shopping trip 2: Fresh/perishable items for days 8-${Math.min(14, planDuration)} (buy on day 6-7)
  ${planDuration > 14 ? `- Shopping trip 3: Fresh items for days 15-${planDuration} (buy on day 13-14)` : ''}
  Pantry staples and frozen items can be bought in trip 1. Fresh produce, dairy, and fresh meat should be split across trips.`;
  }
};

const getDiversityRequirements = (nutritionData: any, budgetData: any): string => {
  const nutrientVariety = nutritionData?.nutrientVariety || 'moderate';
  const restrictions = nutritionData?.restrictions || [];
  const supplements = nutritionData?.supplements || [];
  const allergies = budgetData?.allergies || [];
  const avoidFoods = budgetData?.avoidFoods || [];
  
  let diversityText = '';
  
  // 1. Fish/Omega-3 conditional requirement
  const hasSeafoodAllergy = allergies.some((allergy: string) => 
    ['Fish', 'Shellfish'].includes(allergy)
  );
  const avoidsSeafood = avoidFoods.includes('Seafood');
  const shellfishFree = restrictions.includes('shellfish_free');
  const hasOmega3Supplement = supplements.includes('omega3');
  
  const seafoodExcluded = hasSeafoodAllergy || avoidsSeafood || shellfishFree;
  
  if (!seafoodExcluded && (nutrientVariety === 'moderate' || nutrientVariety === 'high')) {
    diversityText += `
- **Omega-3 considerations**: Include good sources of EPA/DHA omega-3 fatty acids when planning seafood meals. Choose omega-3 rich options when they align with user preferences.`;
  } else if (seafoodExcluded) {
    diversityText += `
- **Omega-3 compensation**: User has excluded fish/seafood. Include alternative omega-3 sources (such as walnuts, flaxseed, chia seeds) to provide ALA omega-3 fatty acids.`;
    
    if (hasOmega3Supplement) {
      diversityText += ` User supplements with omega-3 capsules, so dietary omega-3 is less critical but still include ALA sources where natural.`;
    } else {
      diversityText += ` Consider noting in the plan that an omega-3 fish oil supplement would benefit this user since they avoid seafood.`;
    }
  }
  
  // 2. Legume conditional requirement
  const hasSoyAllergy = allergies.includes('Soy');
  const customLegumeAvoidance = avoidFoods.some((food: string) => 
    ['legumes', 'beans', 'lentils', 'chickpeas', 'black beans', 'edamame'].some(legume => 
      food.toLowerCase().includes(legume)
    )
  );
  
  const legumesExcluded = hasSoyAllergy || customLegumeAvoidance;
  
  if (!legumesExcluded && (nutrientVariety === 'moderate' || nutrientVariety === 'high')) {
    diversityText += `
- **Fiber and plant protein diversity**: Include legumes and other fiber-rich plant proteins when they complement the meal plan and user preferences.`;
  } else if (legumesExcluded || nutrientVariety === 'low') {
    diversityText += `
- **Fiber compensation**: Legumes are excluded or variety is set to low. Ensure fiber target is still met through other sources (oats, chia seeds, vegetables, whole grains).`;
  }
  
  // 3. Nutrient variety scaling
  if (nutrientVariety === 'high') {
    diversityText += `
- **High variety enforcement**: All 6 micronutrient categories are HARD requirements (dark leafy greens, cruciferous vegetables, vitamin C sources, omega-3 sources, legumes, whole grains). FAIL the review if 2+ categories are missed.`;
  } else if (nutrientVariety === 'moderate') {
    diversityText += `
- **Moderate variety targets**: The 6 micronutrient categories are soft targets. Flag misses but don't FAIL the review unless 3+ categories are missed.
**IMPORTANT: The "soft target" exemption applies to micronutrient diversity categories. Ingredient variety should be reasonable for the plan duration and user context, but prioritize meeting macro targets, dietary restrictions, and user preferences over arbitrary ingredient counts.**`;
  } else if (nutrientVariety === 'low') {
    diversityText += `
- **Simplified approach**: Only enforce protein source diversity (3+ sources) and minimum fiber. Skip micronutrient category checks entirely — user prefers simplicity over variety.`;
  }
  
  return diversityText;
};

const getVarietyRequirements = (budgetData: any, skillConfidence?: number, timeInvestment?: number): string => {
  const varietySeeking = budgetData?.varietySeeking || 3;
  const planningStyle = budgetData?.planningStyle || 3;
  
  // OVERRIDE: Cap effective variety when skill/time constraints are severe
  let effectiveVarietySeeking = varietySeeking;
  
  if (skillConfidence !== undefined && skillConfidence <= 1) {
    // Kitchen Beginner: Force low variety regardless of preference
    effectiveVarietySeeking = Math.min(varietySeeking, 2);
  } else if (timeInvestment !== undefined && timeInvestment <= 1) {
    // Speed Cook: Force low variety due to time constraints
    effectiveVarietySeeking = Math.min(varietySeeking, 2);
  } else if (skillConfidence !== undefined && skillConfidence <= 2 && timeInvestment !== undefined && timeInvestment <= 2) {
    // Both low skill AND low time: Cap at moderate variety
    effectiveVarietySeeking = Math.min(varietySeeking, 3);
  }
  
  let varietyText = '\n\n## VARIETY REQUIREMENTS\n';
  
  // Add override explanation if variety was capped
  if (effectiveVarietySeeking < varietySeeking) {
    varietyText += `
**VARIETY OVERRIDE**: User selected ${getVarietySeekingText(varietySeeking)}, but skill/time constraints require simpler approach. Using effective variety level ${effectiveVarietySeeking} instead.\n`;
  }
  
  // Generate variety targets based on effective variety seeking value
  if (effectiveVarietySeeking === 1) {
    varietyText += `
- **Routine Eater approach**: 3-4 unique meal templates for the week is ideal.
- **Consistency focus**: Same breakfast daily is encouraged. Same lunch daily is acceptable.
- **Efficiency priority**: Prioritise meal prep simplicity and shopping list efficiency over variety.
- **Simple structure**: No meal slot needs more than 1 option.`;
  } else if (effectiveVarietySeeking === 2) {
    varietyText += `
- **Mostly Consistent approach**: 4-5 unique meal templates for the week.
- **Controlled rotation**: Same breakfast daily is fine. Lunch or dinner should have at least 2 rotating options.
- **Comfort focus**: Repetition is acceptable — focus on a small set of meals the user won't get bored of.`;
  } else if (effectiveVarietySeeking === 3) {
    varietyText += `
- **Moderate Variety approach**: 5-6 unique meal templates for the week.
- **Balanced rotation**: At least 2 different options for each main meal slot (lunch and dinner).
- **Quality focus**: Breakfast can repeat daily but should be a genuinely enjoyable meal, not just fuel.`;
  } else if (effectiveVarietySeeking === 4) {
    varietyText += `
- **Variety Seeker approach**: 6-8 unique meal templates for the week.
- **Active rotation**: No meal slot should be identical more than 4 days out of 7.
- **Strategic variety**: Use A/B day rotation patterns to create variety within a batch-cook structure.
- **Protein rotation**: Rotate protein sources across the week — avoid the same protein at lunch and dinner on the same day.`;
  } else if (effectiveVarietySeeking === 5) {
    varietyText += `
- **Adventure Eater approach**: 8-10 unique meal templates for the week.
- **Maximum variety**: Every day should feel noticeably different.
- **Culinary diversity**: Include diverse cuisines and cooking styles across the week.
- **Experience priority**: Prioritise variety and eating experience over meal prep convenience.
- **Minimal repetition**: No meal should repeat more than 3 times in the week.`;
  }
  
  // Cross-reference with planning style
  if (effectiveVarietySeeking >= 4 && planningStyle <= 2) {
    varietyText += `
- **Variety + Meal Prep Strategy**: Achieve variety through ingredient rotation within batch-cooked bases. For example, cook one large batch of protein and rice, then vary the sauces, vegetables, and toppings across days. This gives perceived variety without multiplying prep effort.`;
  }
  
  if (effectiveVarietySeeking <= 2 && planningStyle >= 4) {
    varietyText += `
- **Simple + Spontaneous Strategy**: Keep the recipe set small and simple. The user prefers consistency and doesn't want to plan ahead, so meals should require minimal ingredients and be cookable from a short staple list without batch prep.`;
  }
  
  return varietyText;
};

const getSkillRequirements = (budgetData: any): string => {
  const skillConfidence = budgetData?.skillConfidence || 3;
  
  let skillText = '\n\n## SKILL-APPROPRIATE REQUIREMENTS\n';
  
  if (skillConfidence === 1) {
    skillText += `
**INGREDIENT STYLE for Kitchen Beginner:**
- **Convenience priority**: Strongly prefer pre-made, ready-to-eat, and convenience products that require minimal to no preparation. Choose items that are pre-cooked, pre-washed, pre-sliced, or ready-to-eat.
- **Zero prep ingredients**: Avoid ingredients that require cooking skills or food safety knowledge (no raw meat, no stovetop cooking, no grains from scratch). But whole fruits, pre-washed salads, and frozen vegetables require zero skill — include them freely.
- **Assembly meals**: Focus on simple combinations of ready-made components. A complete meal can be assembled by opening containers, microwaving pre-cooked items, and combining them together.

**INSTRUCTIONS for Kitchen Beginner:**
- **Basic techniques only**: Use only basic techniques: microwave, open tin/packet, stir, pour.
- **No knife work**: No knife skills required. Prefer vegetables and fruits that can be eaten whole, come pre-washed, or are frozen pre-cut.
- **Simple combinations**: Maximum 4-5 ingredients per meal including the convenience products.
- **Single-tasking**: Never require timing multiple components simultaneously.
- **Ultra-quick**: Each meal should be achievable in under 5 minutes with zero cooking skill.`;
  } else if (skillConfidence === 2) {
    skillText += `
**INGREDIENT STYLE for Cautious Cook:**
- **Mixed approach**: Balance convenience products with simple cooking tasks. Use ready-made items where complex, cook simple items where manageable.
- **Simple raw preparation**: Raw ingredients are acceptable but only for straightforward preparations with clear cooking methods and safety guidelines.
- **Sauce shortcuts**: Prefer ready-made sauces, marinades, and flavor bases over complex from-scratch preparations.

**INSTRUCTIONS for Cautious Cook:**
- **Detailed guidance**: Clear step-by-step with exact temperatures, exact times, and visual doneness cues.
- **Moderate complexity**: Up to 6-7 ingredients per recipe.
- **Safety focus**: Include safety notes: 'chicken is done when no pink remains and juices run clear' or 'internal temp 75°C'.`;
  } else if (skillConfidence === 3) {
    skillText += `
**INGREDIENT STYLE for Comfortable Cook:**
- **Standard ingredients**: Standard home cooking ingredients. Raw proteins, dry grains, fresh vegetables that need prep.
- **Multi-step capability**: Can handle multi-step recipes and cooking two things simultaneously.
- **Basic homemade**: Homemade sauces and marinades from basic ingredients are fine.

**INSTRUCTIONS for Comfortable Cook:**
- **Moderate detail**: Moderately detailed instructions. Up to 10 ingredients per recipe.
- **Standard techniques**: Standard cooking techniques: sautéing, roasting, steaming, stir-frying.`;
  } else if (skillConfidence === 4) {
    skillText += `
**INGREDIENT STYLE for Confident Cook:**
- **No restrictions**: No restrictions on ingredients. Can use anything from whole spices to specialty items.
- **Complex execution**: Can handle complex flavour building, multi-component meals, and batch cooking efficiently.

**INSTRUCTIONS for Confident Cook:**
- **Concise guidance**: Concise instructions. Technique names are sufficient without excessive detail.`;
  } else if (skillConfidence === 5) {
    skillText += `
**INGREDIENT STYLE for Kitchen Experimenter:**
- **Ambitious ingredients**: Suggest ambitious ingredients and creative combinations. Unusual grains, fermented foods, specialty proteins, global ingredients.
- **Discovery focus**: The user enjoys discovering new ingredients.

**INSTRUCTIONS for Kitchen Experimenter:**
- **Brief instructions**: Brief instructions — the user knows what 'deglaze with stock' means.
- **Advanced techniques**: Feel free to include more complex techniques: braising, making dressings from scratch, toasting spices.`;
  }
  
  return skillText;
};

const getTimeRequirements = (budgetData: any): string => {
  const timeInvestment = budgetData?.timeInvestment || 3;
  const skillConfidence = budgetData?.skillConfidence || 3;
  
  let timeText = '\n\n## TIME INVESTMENT REQUIREMENTS\n';
  
  if (timeInvestment === 1) {
    timeText += `
- **Speed Cook approach**: Maximum 5 minutes total per meal including any heating.
- **Zero-cook priority**: Prioritise meals that require no cooking - only assembly, reheating, or simple preparation steps.
- **Ultra-fast batch prep**: If batch prep is used, the session should be under 20 minutes and produce the entire week's meals.
- **Microwave focus**: Microwave reheating is the primary cooking method for prepped meals.
- **Convenience default**: Pre-cooked and convenience products should be the default choice. Favor ready-made components that just need reheating or simple assembly.`;
  } else if (timeInvestment === 2) {
    timeText += `
- **Quick Meals approach**: Maximum 10 minutes active prep per meal. Total time under 20 minutes.
- **One-pan focus**: Simple one-pan or one-tray recipes preferred. Air fryer dump-and-cook is ideal.
- **Efficient batch prep**: Batch prep session under 1 hour.
- **Smart convenience**: Mix of convenience products and simple cooking.`;
  } else if (timeInvestment === 3) {
    timeText += `
- **Moderate Cook approach**: Up to 15 minutes active prep. Total time up to 30 minutes per recipe.
- **Multi-step cooking**: Multi-step recipes are fine. Batch prep up to 1.5 hours.
- **Standard ingredients**: Standard ingredients — no need for convenience shortcuts unless they're genuinely better.`;
  } else if (timeInvestment === 4) {
    timeText += `
- **Thorough Cook approach**: Up to 20 minutes active prep. Total time up to 45 minutes.
- **Complex techniques**: Recipes can involve simmering, marinating, and multi-stage cooking.
- **Extended batch prep**: Batch prep up to 2 hours.`;
  } else if (timeInvestment === 5) {
    timeText += `
- **Slow Food Lover approach**: No time constraints. Include slow-cooked, braised, or marinated options.
- **Process enjoyment**: The user enjoys the cooking process — longer recipes are a feature, not a burden.
- **Extended sessions**: Batch prep can be a full afternoon session.`;
  }
  
  // Cross-referencing skill and time
  if (skillConfidence <= 2 && timeInvestment <= 2) {
    timeText += `
- **Simplest Possible Strategy**: This user needs the simplest possible meals. Focus on quick assembly of ready-made components that create complete, balanced meals. Every meal should be achievable by someone who has never cooked before, in under 10 minutes. Do NOT suggest recipes that require seasoning raw meat, cooking on a stovetop, or managing multiple components. Pre-cooked and convenience products are not shortcuts — they ARE the plan.`;
  }
  
  if (skillConfidence >= 4 && timeInvestment >= 4) {
    timeText += `
- **Culinary Excellence Strategy**: This user is a capable, enthusiastic cook. Recipes should reward their time and skill with genuinely delicious, restaurant-quality results. Don't simplify for the sake of it — a 45-minute braised dish that tastes incredible is better than a 15-minute basic bowl.`;
  }
  
  return timeText;
};

const getSkillTimeVerificationChecks = (budgetData: any): string => {
  const skillConfidence = budgetData?.skillConfidence || 3;
  const timeInvestment = budgetData?.timeInvestment || 3;
  const planningStyle = budgetData?.planningStyle || 3;
  
  let checks = '';
  
  // Critical skill/time combination checks
  if (skillConfidence <= 1 && timeInvestment <= 1) {
    checks += `\n   - **CRITICAL CONFLICT CHECK**: User is Kitchen Beginner (${skillConfidence}) + Speed Cook (${timeInvestment}). FAIL if ANY recipe requires cooking, knife work, or takes more than 5 minutes total.`;
  } else if (skillConfidence <= 1 && planningStyle <= 2) {
    checks += `\n   - **BEGINNER + MEAL PREP CHECK**: User is Kitchen Beginner but wants meal prep. FAIL if "meal prep" involves any actual cooking. Should be assembly-only prep.`;
  } else if (timeInvestment <= 1 && planningStyle <= 2) {
    checks += `\n   - **SPEED + MEAL PREP CHECK**: User wants Speed Cook + meal prep. FAIL if prep session involves cooking. Should be portion/assembly prep only.`;
  }
  
  if (skillConfidence <= 2 && timeInvestment <= 2) {
    checks += `\n   - **LOW SKILL/TIME CHECK**: User has limited skill (${skillConfidence}) and time (${timeInvestment}). FAIL if recipes are too complex for this combination.`;
  }
  
  return checks;
};

const getVerificationSteps = (mealsPerDay: number = 3, proteinTarget: number = 150, planDuration: number = 7, nutritionData?: any, budgetData?: any): string => {
  const periodLabel = planDuration <= 7 ? 'plan-period' : 'weekly';
  const periodNote = planDuration < 7 
    ? `(averaged across all ${planDuration} days)` 
    : planDuration === 7 
      ? '(averaged across the full 7-day plan)' 
      : `(calculate rolling 7-day averages across the ${planDuration}-day plan)`;
      
  const diversityRequirements = nutritionData && budgetData ? getDiversityRequirements(nutritionData, budgetData) : '';
  
  // Add skill/time combination checks
  const skillTimeChecks = budgetData ? getSkillTimeVerificationChecks(budgetData) : '';
  return `

---

## VERIFICATION STEPS

Before presenting the meal plan, complete these checks:

1. **Macro guidance principles** — Different macros require different consistency approaches based on research:
   - **Protein**: Maintain consistent daily intake as muscle protein synthesis is a daily process. Daily consistency provides better results than weekly averaging.
   - **Calories**: Target ${periodLabel}-average for energy balance goals ${periodNote}. Moderate daily variation is acceptable as total energy balance drives results. Keep daily variations reasonable to support consistent energy levels.
   - **Carbs & Fat**: Focus on ${periodLabel}-averages with natural daily flexibility. Day-to-day variation in carbs and fat is normal and can be beneficial when aligned with activity levels and meal preferences.
   - **Fiber**: Emphasize daily adequacy as gut microbiome responds to consistent fiber intake. Daily consistency supports sustained gut health benefits better than sporadic high intake.

2. **Protein distribution** — Check that protein is spread across meals, not loaded into one. ${getProteinDistributionGuidance(mealsPerDay, proteinTarget)}

3. **Cooking time alignment** — Verify that actual cooking times match the user's time investment preference.

4. **Meal prep coherence** — If the user's planning style is 1-2 (meal prep focused), verify batch-cooked items are actually reused across multiple meals.

5. **Budget reasonableness** — Mentally estimate the grocery cost and verify it matches the specified budget level.

6. **Equipment check** — Confirm every recipe can be made with the user's listed cooking equipment.

7. **Dietary restriction compliance** — Scan every ingredient across every meal to confirm zero allergens or avoided foods appear.

8. **Ingredient diversity audit** — Ensure reasonable variety across protein sources, vegetables, carbohydrate sources, and fruits. Prioritize nutritional completeness while respecting user preferences, dietary restrictions, and plan duration.

${diversityRequirements}

9. **Conditional scaling compliance** — Verify recipes match user's preferences:
   ${budgetData?.timeInvestment === 1 ? '- **Time limit**: No recipe should exceed 5 minutes total time' : ''}
   ${budgetData?.timeInvestment === 2 ? '- **Time limit**: No recipe should exceed 20 minutes total time' : ''}
   ${budgetData?.skillConfidence === 1 ? '- **Skill limit**: No recipe should require knife work, raw meat preparation, or stovetop cooking' : ''}
   ${budgetData?.skillConfidence === 2 ? '- **Skill limit**: Include safety temperatures and exact timing for any raw meat preparation' : ''}
   ${budgetData?.varietySeeking === 1 ? '- **Simplicity preference**: User prefers limited variety - focus on repeating successful meal patterns' : ''}
   ${budgetData?.varietySeeking === 5 ? '- **Variety preference**: User enjoys diverse meals - include different cuisines and ingredients when possible' : ''}
${skillTimeChecks}

10. **Fiber target check** — Sum daily fiber for each day and fix if any day falls below 80% of target.

11. **Meal timing gap check** — Verify no gap longer than 5 hours between meals during waking hours.

12. **Grocery list completeness** — Verify the grocery list includes every ingredient from every meal with correct total quantities.

13. **Grocery list cross-check** — Walk through each recipe ingredient and confirm it appears in the grocery list.

14. **Grocery cost accuracy** — Verify every item is priced at the actual pack size available at the specified store, not the portion used. Sum all item prices and confirm the total matches the stated cost. If the sum doesn't match, fix it. Present the total as a range with a 10% buffer to account for price variation.

15. **Fiber distribution check** — Ensure fiber is reasonably distributed throughout the day to support digestive tolerance. If one meal contains excessive fiber that might cause discomfort, consider spreading fiber sources across multiple meals for better digestive adaptation.

16. **Meal prep session completeness** — Verify the meal prep guide covers all batch-cooked items mentioned in the recipes.

17. **Food safety frequency check** — No single food item should appear at a frequency that exceeds established safe weekly consumption guidelines. If any ingredient is used excessively, reduce its frequency and substitute with a nutritionally equivalent alternative that maintains the same skill/time level.

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

**Do NOT automatically convert to JSON** - I need to review the plan first. After presenting the plan and receiving my feedback, tell me: "When you're happy with the plan, send me the review prompt to run a final quality check before JSON conversion."`;
};