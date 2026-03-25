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
    
    // Format rate to avoid floating point precision issues
    const displayRate = nutritionData.rate ? parseFloat(String(nutritionData.rate)).toFixed(2) : 'moderate';
    
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
- Goal: ${nutritionData.goal || 'maintain'} at ${displayRate} rate

**MEAL PLAN REQUIREMENTS:**
1. **BUDGET CONSTRAINT** - ${getBudgetConstraintText(budgetData)}
2. **MEAL PREP FOCUSED** - ${getMealPrepStyleText(budgetData.planningStyle, budgetData.skillConfidence, budgetData.timeInvestment)}
3. **INCLUDE DETAILED GROCERY LIST** - Organize by categories (Proteins, Dairy, Produce, etc.) with exact quantities, units, and estimated prices from ${store} in ${city}, ${country}
4. **SPECIFIC DATES** - Start the meal plan on ${getCurrentDate()} and use actual calendar dates
5. **SHOW CALCULATIONS** - For each meal, briefly explain how you arrived at the calorie/macro numbers

${getVarietyRequirements(budgetData, budgetData.skillConfidence, budgetData.timeInvestment)}${getSkillRequirements(budgetData)}${getTimeRequirements(budgetData)}

${getMealStructure(budgetData.mealsPerDay || 3, macroResults.protein || 150)}

**Snacking style:** ${getSnackingGuidance(budgetData.snackingStyle)}

**KEY RULE FOR JSON OUTPUT:** Use ONLY these meal types: breakfast, lunch, dinner, snack. If you have multiple snacks, they all use type "snack" — differentiate them by name (e.g., "Morning Protein Snack", "Afternoon Energy Snack").

PERSONAL INFO:
- Gender: ${nutritionData.gender === 'prefer_not_to_say' ? 'Prefer not to say' : nutritionData.gender || 'Not specified'}
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

Every meal plan should include vegetables and fruit daily and rotate protein sources across the week. These are baseline expectations for any nutritionally complete plan — don't skip entire food groups or rely on a single protein source all week. Prioritise the user's macro targets and preferences, but flag it if the plan is significantly lacking in any major food group.

${getDiversityRequirements(nutritionData, budgetData)}`;

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
  • Space meals evenly across the eating window. The sleep buffer (first meal and last meal timing above) is a hard constraint — do not move meals outside the eating window to achieve wider spacing. If the number of meals makes gaps shorter than 3 hours, acknowledge this trade-off in the plan notes and distribute meals as evenly as possible. Never schedule two meals less than 2 hours apart.
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
    // Calculate intersection of beginner-safe equipment and user's actual equipment
    const beginnerSafeEquipment = ['microwave', 'blender', 'rice cooker'];
    const userEquipment = budgetData.cookingEquipment || [];
    const allowedEquipment = beginnerSafeEquipment.filter(eq => 
      userEquipment.some(userEq => userEq.toLowerCase().includes(eq.toLowerCase()))
    );
    const equipmentList = allowedEquipment.length > 0 ? allowedEquipment.join(', ') : 'microwave only';
    
    return `\n- **SKILL OVERRIDE**: Despite the equipment list above, this Kitchen Beginner should ONLY use: ${equipmentList}. Do NOT suggest recipes requiring equipment beyond this list — the user owns other equipment but the plan should not require it at this skill level.`;
  } else if (skillConfidence <= 2 && timeInvestment <= 2) {
    // Check what simplified equipment the user actually has
    const simplifiedEquipment = ['microwave', 'rice cooker', 'air fryer', 'blender'];
    const userEquipment = budgetData.cookingEquipment || [];
    const allowedEquipment = simplifiedEquipment.filter(eq => 
      userEquipment.some(userEq => userEq.toLowerCase().includes(eq.toLowerCase()))
    );
    const equipmentList = allowedEquipment.length > 0 ? allowedEquipment.join(', ') : 'microwave only';
    
    return `\n- **SIMPLIFIED USE**: For this user's skill/time level, prefer ${equipmentList}. Stovetop is acceptable only for very simple tasks (boiling water, heating a pan with oil). Oven use should be limited to simple tray bakes.`;
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
    prompt += getVerificationSteps(budgetData.planDuration || 7);
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
- **Skill/time compliance** — all meals must match the skill and time constraints from the generation prompt.
- **Equipment compliance** — all recipes must use only the equipment listed in the generation prompt.
- **No draft content** — the output must contain zero working, iteration, or revision commentary.`;
    
    const sleepComplianceSection = sleepData?.bedtime && sleepData?.wakeTime ? (() => {
      const optimizationLevel = sleepData.optimizationLevel || 'minimal';
      const lastMealBuffer = optimizationLevel === 'maximum' ? '4+' : optimizationLevel === 'moderate' ? '3' : '2';
      const firstMealWindow = optimizationLevel === 'maximum' ? '0.5-1' : optimizationLevel === 'moderate' ? '0.5-1.5' : '2';
      
      return `### 7. Sleep Optimization Compliance
Verify meal timing aligns with sleep schedule (${sleepData.wakeTime} - ${sleepData.bedtime}, ${sleepData.optimizationLevel} optimization):

Last meal must finish at least ${lastMealBuffer} hours before ${sleepData.bedtime}.
First meal within ${firstMealWindow} hours of ${sleepData.wakeTime}.
Meals evenly spaced across eating window. No gap >5 hours. Gaps under 2.5 hours are acceptable if caused by meal count vs eating window constraints — flag the trade-off but do not FAIL.
FAIL if last meal timing violates the buffer. FIX by moving dinner earlier and adding a snack if needed.`;
    })() : 
'### 7. Sleep Optimization Compliance\nN/A — sleep optimization not enabled. Check meals are spaced 3-5 hours apart.';
    
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

- **Nutrition/Budget**: Adjust portions, swap ingredients, rebalance meals.
- **Equipment/Skills**: Replace recipes with alternatives matching constraints.
- **Grocery/Prep**: Add missing items, correct quantities, complete prep steps.
- **Format**: Remove all working/draft content, resolve table mismatches.

## Review Checklist

Work through each check. For each, state PASS or FAIL with a brief note. If FAIL, describe the fix you are applying.

### 1. Nutrition Target Verification
Verify the plan meets the hard constraint thresholds listed above. Check protein daily consistency, calorie/carb/fat weekly averages, and daily fiber adequacy. Adjust portion sizes if any threshold is missed.

### 2. Budget Compliance
${budgetData?.budgetMax ? 
  `- **Target**: ${budgetData?.budgetMin ? getCurrencySymbol(budgetData?.countryCode || 'US') + budgetData.budgetMin + '–' : ''}${getCurrencySymbol(budgetData?.countryCode || 'US')}${budgetData.budgetMax}/week. If over, swap for budget alternatives or flag overspend with explanation.` 
  : 
  '- Verify grocery total aligns with budget attitude.'}
Check if the plan respects budget constraints.

### 3. Meal Prep Style Alignment
Verify the plan matches the user's planning style preference.

### 4. Dietary Restrictions & Preferences
Check compliance with dietary requirements.

### 5. Cooking Feasibility
Verify every recipe is feasible for the user's stated skill level (${budgetData?.skillConfidence || 3}/5) and time preference (${budgetData?.timeInvestment || 3}/5). FAIL if any recipe exceeds the skill/time constraints from the generation prompt.${budgetData?.skillConfidence <= 1 ? ' Kitchen Beginner: every recipe must be assembly-only, max 5 minutes, no cooking.' : ''}${budgetData?.timeInvestment <= 1 ? ' Speed Cook: every meal must be under 5 minutes including heating.' : ''}

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

- **Structure & Steps**: Verify prep session matches skill tier, includes all meal plan items, follows prep style (grab-and-go vs moderate), and includes mid-week restock if needed for perishables.
- **Storage & Safety**: Check all storage durations meet food safety guidelines.${planDuration > 7 ? `
- **Multi-week plans**: Verify each prep session covers its days and shopping aligns with prep timing.` : ''}

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
3. Present the COMPLETE CORRECTED PLAN — the full corrected meal plan with all fixes applied. Present the complete plan, not a diff or partial update.
4. End with: "When you're happy with this plan, send me the JSON conversion prompt and I'll convert it for import into JSON.fit."`;
    
  } catch (error) {
    console.error('Error generating dynamic meal plan review prompt:', error);
    throw error;
  }
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

Meal 1: breakfast | Meal 2: lunch | Meal 3: dinner
Meal 4: If user doesn't snack, make it a substantial 4th meal (type "dinner" or "lunch"). If user snacks, make it a lighter snack (type "snack").
Distribute ${proteinTarget}g protein across all meals, main meals carrying most
Distribute calories appropriately (flexibility is fine)`;
    
    case 5:
      return `MEAL STRUCTURE (5 eating occasions):

If user doesn't snack: 5 substantial meals — breakfast, brunch (type "lunch"), lunch, dinner, supper (type "dinner")
If user snacks: 3 main meals (breakfast, lunch, dinner) + 2 snacks between them (type "snack")
Distribute ${proteinTarget}g protein across all meals, main meals carrying most
Distribute calories appropriately (flexibility is fine)`;
    
    case 6:
      return `MEAL STRUCTURE (6 eating occasions):

If user doesn't snack: 6 substantial meals — breakfast, brunch, lunch, afternoon meal, dinner, supper (use types "breakfast"/"lunch"/"dinner" as appropriate)
If user snacks: 3 main meals + 3 snacks between them (type "snack", respect bedtime timing for evening snack)
Distribute ${proteinTarget}g protein across all meals, main meals carrying most
Distribute calories appropriately (flexibility is fine)`;
    
    default: // fallback to 3
      return `MEAL STRUCTURE (3 main meals):
- Meal 1: breakfast (substantial meal)
- Meal 2: lunch (substantial meal)
- Meal 3: dinner (substantial meal)
- Distribute daily calories roughly evenly across meals (flexibility is fine - aim for balanced portions)
- Distribute ${proteinTarget}g protein appropriately across all meals`;
  }
};

const getSnackingGuidance = (snackingStyle: string): string => {
  const style = snackingStyle?.toLowerCase() || 'occasional snacker';
  
  if (style.includes("don't snack") || style.includes("i don't snack")) {
    return `MINIMAL SNACKING: User prefers not to snack. For 4+ eating occasions, treat extra slots as substantial meals. Only add light snacks if gaps exceed 5-6 hours.`;
  }
  
  if (style.includes('love snacking') || style.includes('frequent')) {
    return `SNACK-FRIENDLY: User enjoys frequent snacking. Make snacks nutritious — combine protein + carbs/fat. Examples: Greek yogurt with berries, apple with almond butter, hummus with vegetables.`;
  }
  
  if (style.includes('need healthy snacks')) {
    return `HEALTHY FOCUS: Prioritize whole food snacks with good nutritional density. Examples: vegetables with dips, fruit with protein, nuts and seeds.`;
  }
  
  if (style.includes('sweet tooth')) {
    return `SWEET PREFERENCES: Provide healthier sweet options. Examples: fruit with yogurt, dark chocolate with nuts, dates with nut butter. Balance sweetness with protein/fiber.`;
  }
  
  if (style.includes('savory')) {
    return `SAVORY PREFERENCES: User prefers savory snacks. Examples: vegetable sticks with hummus, nuts and seeds, cheese with crackers, roasted chickpeas.`;
  }
  
  // Default for "occasional snacker" or unrecognized styles
  return `MODERATE SNACKING: Include 1-2 moderate snacks if gaps exceed 4-5 hours. Keep snacks balanced and proportionate to daily needs.`;
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



const getMealPrepRequirementsText = (planningStyle: number, skillConfidence?: number, timeInvestment?: number): string => {
  
  // OVERRIDE: If user can't cook or needs ultra-fast meals, 
  // traditional meal prep doesn't apply regardless of planningStyle
  if (skillConfidence !== undefined && skillConfidence <= 1) {
    return `No batch cooking — assembly and portioning only (see Skill Requirements above).
  • Prep means: portioning snacks, combining ready-made components into containers
  • Total prep session under 20 minutes for the week`;
  }
  
  if (timeInvestment !== undefined && timeInvestment <= 1) {
    return `Minimal prep — every meal under 5 minutes (see Time Requirements above).
  • Any batch prep is assembly only: portioning, combining, refrigerating
  • Prep session under 20 minutes for the week`;
  }
  
  if (skillConfidence !== undefined && skillConfidence <= 2 && timeInvestment !== undefined && timeInvestment <= 2) {
    return `Simple batch prep only (see Skill and Time Requirements above).
  • Simple items: rice cooker rice, air fryer chicken, boiled eggs
  • Maximum 1 hour total prep for the week
  • Pre-made sauces and convenience products preferred`;
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

Include a **total estimated cost** and **currency** for the full grocery list.

**SUPPLEMENT EXCEPTION:** Protein powder and other supplements are not expected to be available at the user's nominated grocery store. List them in a separate 'Supplements' category with a realistic price from a common supplement retailer (e.g., Chemist Warehouse, Bulk Nutrients). Do not treat external sourcing as a problem — most people buy supplements separately from their grocery shop.${additionalGuidance ? '\n\n' + additionalGuidance : ''}`;
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

**Assembly and portioning only — see Skill Requirements above for full constraints.**

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
- **Storage guide** — Simple list: item name, container type, fridge or pantry, use-by day. Follow standard food safety storage durations for all stored items. Flag any item stored beyond safe limits.

**ASSEMBLY PREP APPROACH**: All prep is assembly and portioning only. Assemble complete meals into individual grab-and-go containers where possible. At meal time, the only steps should be: grab container, microwave if needed, eat. For items that degrade when pre-assembled (e.g., items that go soggy), note them as exceptions that get assembled fresh at meal time in under 2 minutes.`;
  }

  // Tier 2: Speed-focused minimal prep (time ≤1, any skill)
  if (timeInvestment !== undefined && timeInvestment <= 1) {
    return `
---

## MEAL PREP SESSION REQUIREMENTS

**IMPORTANT:** Your meal plan should include a structured meal prep session guide. This will be displayed in the app as a step-by-step prep walkthrough.

${prepGuidance}

**Speed constraints — see Time Requirements above for full constraints.**

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
- **Simple combinations**: Keep meals simple. Complexity is determined by technique and steps, not ingredient count — a 7-ingredient dump-and-stir overnight oats is easier than a 3-ingredient stovetop meal.
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
- **Simplest Possible Strategy**: Skill and time are both low. Every meal must be achievable in under 10 minutes by someone who has never cooked. Apply the ingredient and technique constraints from the Skill Requirements section strictly.`;
  }
  
  if (skillConfidence >= 4 && timeInvestment >= 4) {
    timeText += `
- **Culinary Excellence Strategy**: This user is a capable, enthusiastic cook. Recipes should reward their time and skill with genuinely delicious, restaurant-quality results. Don't simplify for the sake of it — a 45-minute braised dish that tastes incredible is better than a 15-minute basic bowl.`;
  }
  
  return timeText;
};


const getVerificationSteps = (planDuration: number = 7): string => {
  const periodLabel = planDuration <= 7 ? 'plan-period' : 'weekly';
  const periodNote = planDuration < 7 
    ? `(averaged across all ${planDuration} days)` 
    : planDuration === 7 
      ? '(averaged across the full 7-day plan)' 
      : `(calculate rolling 7-day averages across the ${planDuration}-day plan)`;
  return `

---

## VERIFICATION STEPS

Before presenting the meal plan, complete these checks:

1. **Macro tolerance check** — verify these thresholds:

Protein: within ±10% of target DAILY
Calories: within ±5% of target as ${periodLabel} average ${periodNote}
Carbs & Fat: within ±10% of target as ${periodLabel} average ${periodNote}
Fiber: ≥80% of target DAILY
Adjust portion sizes and recheck if any day or average is outside tolerance.

2. **Protein distribution** — verify protein is spread across meals (no single meal exceeds 50% of daily target).

3. **Cooking time** — verify actual cook times match user's time investment preference.

4. **Meal prep coherence** — if planning style is 1-2, verify batch items are reused across multiple meals.

5. **Budget** — verify grocery cost aligns with specified budget constraints.

6. **Equipment** — confirm every recipe uses only the user's listed equipment.

7. **Dietary restrictions** — scan every ingredient across every meal for allergens or avoided foods.

8. **Ingredient diversity** — verify reasonable variety across protein sources, vegetables, and carbs. Meet diversity requirements specified earlier in the prompt.

9. **Skill/time constraints** — verify recipes match user's skill and time limits. Check for any violations of specified preferences.

10. **Fiber** — verify daily fiber ≥80% of target. Fix if any day falls below.

11. **Meal timing gaps** — meals evenly spaced across the eating window. No gap >5 hours. If any gap is under 2.5 hours, PASS but flag the trade-off in plan notes (the user's meal count and sleep optimization create a tight eating window).

12. **Grocery completeness** — every recipe ingredient appears in the grocery list with correct total quantities.

13. **Grocery cross-check** — walk through each recipe and confirm ingredients appear in grocery list.

14. **Grocery pricing** — every item priced at actual pack size (not portion used). Sum all item prices and verify they match the stated total. FAIL if the total is presented as a single number — it MUST be a range with a 10% buffer (e.g., '$165–$182'). Fix by calculating: lower bound = sum of items, upper bound = lower bound × 1.10.

15. **Fiber distribution** — fiber spread across the day, not concentrated in one meal.

16. **Meal prep completeness** — prep guide covers all batch-cooked items from recipes.

17. **Food safety frequency** — no single food exceeds safe weekly consumption guidelines.

If any check fails, fix the plan before presenting. Do not present a plan with known issues — revise and recheck.`;
};

const getFormatRequirements = (): string => {
  return `

FORMAT:

Present the plan directly in chat with clear formatting (headers, bullets, tables as needed)
Include grocery list (by category with quantities/prices) and meal prep session (step-by-step with storage guidelines)
Present ONLY the final plan — no working, drafts, or iteration commentary
Focus on practical meals matching my planning preferences.`;
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

