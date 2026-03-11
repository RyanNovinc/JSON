// ================================
// DYNAMIC MEAL PLANNING PROMPT SYSTEM
// ================================
// Replaces hardcoded prompts with dynamic templates based on user questionnaire data

import { WorkoutStorage } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ================================
// TYPE DEFINITIONS
// ================================

export interface MealPlanPromptData {
  // From Nutrition Questionnaire
  nutritionTargets: {
    dailyCalories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    mealsPerDay: number;
    planDuration: number;
    snackingStyle: string;
    goal: string;
    goalRate: string;
  };
  
  // From Personal Info (Nutrition Questionnaire)
  personalInfo: {
    gender: string;
    age: number;
    activityLevel: string;
    jobType: string;
  };
  
  // From Dietary Requirements (Budget & Cooking Questionnaire)
  dietaryRequirements: {
    allergies: string[];
    avoidFoods: string[];
    eatingChallenges: string[];
  };
  
  // From Budget & Cooking Questionnaire
  cookingPreferences: {
    mealPrepStyle: string;
    cookingTimePreference: string;
    varietyPreference: string;
    cookingSkill: string;
    cookingAttitude: string;
  };
  
  // From Budget & Cooking Questionnaire
  equipment: string[];
  
  // From Budget & Cooking Questionnaire
  locationBudget: {
    locationCity: string;
    locationCountry: string;
    preferredStore: string;
    budgetLevel: string;
    customBudgetAmount?: string;
  };
  
  // From Sleep Optimization (Optional)
  sleepOptimization?: {
    enabled: boolean;
    sleepTime: string;
    wakeTime: string;
    optimizationLevel: string;
  };
  
  // From Nutrition Questionnaire
  nutrientVarietyPriority?: string;
  
  // From Meal Preferences (Budget & Cooking)
  mealPreferences: {
    mode: string; // 'ai_suggest' | 'include_favorites' 
    specificMeals?: any[];
    customRequests?: string;
  };
  
  // From Fridge & Pantry (Optional)
  pantryInventory?: {
    enabled: boolean;
    items?: any[];
  };
}

// ================================
// TEMPLATE BUILDERS
// ================================

export const buildNutritionTargetsSection = (data: MealPlanPromptData): string => {
  const fiberRange = `${data.nutritionTargets.fiberG - 5}–${data.nutritionTargets.fiberG + 5}g range`;
  
  return `NUTRITION TARGETS:
- Daily calories: ${data.nutritionTargets.dailyCalories}
- Protein: ${data.nutritionTargets.proteinG}g | Carbs: ${data.nutritionTargets.carbsG}g | Fat: ${data.nutritionTargets.fatG}g
- Daily fiber target: ${data.nutritionTargets.fiberG}g (aim for ${fiberRange})
- ${data.nutritionTargets.mealsPerDay} meals per day
- Plan duration: ${data.nutritionTargets.planDuration} days
- Snacking style: ${data.nutritionTargets.snackingStyle}
- Goal: ${data.nutritionTargets.goal} at ${data.nutritionTargets.goalRate} rate`;
};

export const buildPersonalInfoSection = (data: MealPlanPromptData): string => {
  return `PERSONAL INFO:
- Gender: ${data.personalInfo.gender}
- Age: ${data.personalInfo.age}
- Activity level: ${data.personalInfo.activityLevel}
- Job type: ${data.personalInfo.jobType}`;
};

export const buildDietaryRequirementsSection = (data: MealPlanPromptData): string => {
  const allergiesText = data.dietaryRequirements.allergies.length > 0 
    ? data.dietaryRequirements.allergies.join(', ') 
    : 'None';
    
  const avoidFoodsText = data.dietaryRequirements.avoidFoods.length > 0 
    ? data.dietaryRequirements.avoidFoods.join(', ') 
    : 'None';
    
  const eatingChallengesText = data.dietaryRequirements.eatingChallenges.length > 0 
    ? data.dietaryRequirements.eatingChallenges.join(', ') 
    : 'None';

  return `DIETARY REQUIREMENTS:
- Allergies: ${allergiesText}
- Avoid foods: ${avoidFoodsText}
- Eating challenges: ${eatingChallengesText}`;
};

export const buildNutrientVarietySection = (data: MealPlanPromptData): string => {
  if (!data.nutrientVarietyPriority || data.nutrientVarietyPriority === 'not_specified') {
    return `NUTRIENT VARIETY PRIORITY:
**NOT SPECIFIED** - Use standard approach to nutrient variety balanced with other preferences`;
  }
  
  const varietyMap: { [key: string]: string } = {
    'high': `**VERY IMPORTANT** - I want maximum nutrient variety and diversity. Please:
  • Include a wide range of different vegetables, fruits, protein sources, and whole grains
  • Vary nutrients across meals (different vitamins, minerals, antioxidants)
  • Use colorful ingredients (aim for different colors each day)
  • Include both common and less common nutrient-dense foods
  • Consider seasonal produce for peak nutrient content`,
    
    'moderate': `**MODERATELY IMPORTANT** - I want some nutrient variety with convenience. Please:
  • Include variety but balance with practicality and meal prep efficiency
  • Focus on nutrient-dense staples with some diverse additions
  • Vary protein sources and include different vegetables
  • Don't sacrifice convenience for minor nutrient differences`,
    
    'low': `**LESS IMPORTANT** - I prefer simple, consistent meals over nutrient variety. Please:
  • Focus on nutritionally complete but simple ingredient combinations
  • Repeat successful nutrient-dense staples frequently
  • Prioritize convenience and familiarity over exotic variety
  • Use proven combinations rather than experimenting with diverse ingredients`
  };
  
  return `NUTRIENT VARIETY PRIORITY:
${varietyMap[data.nutrientVarietyPriority] || varietyMap['moderate']}`;
};

export const buildSleepOptimizedSection = (data: MealPlanPromptData): string => {
  if (!data.sleepOptimization?.enabled) {
    return '';
  }
  
  const getOptimizationGuidelines = (level: string): string => {
    const guidelines: { [key: string]: string } = {
      'minimal': '• First meal: Within 2 hours of wake time\n  • Last meal: 2 hours before bedtime\n  • 12-hour eating window',
      'moderate': '• First meal: 30-90 minutes after wake time\n  • Last meal: 3 hours before bedtime\n  • 8-10 hour eating window',
      'maximum': '• First meal: 30-60 minutes after wake time\n  • Last meal: 4+ hours before bedtime\n  • 8-hour early eating window'
    };
    
    return guidelines[level] || guidelines['moderate'];
  };
  
  return `**SLEEP-OPTIMIZED MEAL TIMING REQUIREMENTS:**
Based on my completed Sleep Optimization questionnaire:
- Sleep schedule: ${data.sleepOptimization.sleepTime} - ${data.sleepOptimization.wakeTime}
- Optimization level: ${data.sleepOptimization.optimizationLevel}
- CRITICAL: Calculate and provide specific meal times for each day based on these sleep parameters:
  ${getOptimizationGuidelines(data.sleepOptimization.optimizationLevel)}
- PROVIDE SPECIFIC TIMES: For each meal in your plan, specify the recommended time (e.g., "7:45 AM", "12:30 PM", "6:00 PM") and briefly explain why that timing supports better sleep and metabolism`;
};

export const buildFridgePantrySection = (data: MealPlanPromptData): string => {
  if (!data.pantryInventory?.enabled || !data.pantryInventory?.items?.length) {
    return `FRIDGE & PANTRY INVENTORY:
- No fridge/pantry inventory provided or user chose not to include existing ingredients`;
  }
  
  const itemsList = data.pantryInventory.items.map((item: any) => {
    const expiryInfo = item.expiryDate ? ` (expires ${new Date(item.expiryDate).toLocaleDateString()})` : '';
    const quantity = item.quantity && item.unit ? ` - ${item.quantity} ${item.unit}` : '';
    const notes = item.notes ? ` (${item.notes})` : '';
    return `• ${item.name}${quantity}${expiryInfo}${notes} [${item.location}]`;
  }).join('\n');
  
  return `FRIDGE & PANTRY INVENTORY:
**IMPORTANT: I have ingredients at home that I want to use in my meal plan**
- Usage preference: Use these ingredients when they naturally fit into optimal meal plans

Available ingredients:
${itemsList}

**CRITICAL: Use these ingredients when they naturally fit into optimal meal plans, but don't force them if they don't work well.**`;
};

export const buildMealPreferencesSection = (data: MealPlanPromptData): string => {
  if (data.mealPreferences.mode === 'include_favorites' && data.mealPreferences.specificMeals?.length) {
    const selectedMealsText = data.mealPreferences.specificMeals.map(meal => 
      `  • ${meal.name}${meal.ingredients?.length ? ` - ${meal.ingredients.slice(0, 5).map((ing: any) => ing.name).join(', ')}${meal.ingredients.length > 5 ? '...' : ''}` : ''}`
    ).join('\n\n');
    
    const customRequestsText = data.mealPreferences.customRequests 
      ? `\n- Custom requests: ${data.mealPreferences.customRequests}`
      : '';
    
    return `MEAL PREFERENCES:
- User wants to include their favorite meals in the plan
${selectedMealsText}${customRequestsText}`;
  }
  
  return `MEAL PREFERENCES:
- User wants AI to suggest all meals based on their profile and preferences`;
};

export const buildCookingPreferencesSection = (data: MealPlanPromptData): string => {
  return `COOKING PREFERENCES:
- ${data.cookingPreferences.mealPrepStyle}
- ${data.cookingPreferences.cookingTimePreference}
- ${data.cookingPreferences.varietyPreference}
- ${data.cookingPreferences.cookingSkill}
- ${data.cookingPreferences.cookingAttitude}`;
};

export const buildCookingEquipmentSection = (data: MealPlanPromptData): string => {
  const equipmentText = data.equipment.length > 0 
    ? `Available equipment: ${data.equipment.join(', ')}
- IMPORTANT: Only suggest meals that can be made with the above equipment. Do not suggest oven recipes if no oven available, etc.`
    : 'No cooking equipment specified - assume basic stovetop and microwave access';
    
  return `AVAILABLE COOKING EQUIPMENT:
- ${equipmentText}`;
};

export const buildLocationBudgetSection = (data: MealPlanPromptData): string => {
  const getBudgetLevelDescription = (budgetLevel: string, customAmount?: string): string => {
    const descriptions: { [key: string]: string } = {
      'custom': `Custom Budget - $${customAmount || '0'}/week`,
      'very_tight': 'Very Tight Budget - Every dollar counts, prioritize affordability over all other factors',
      'budget_conscious': 'Budget Conscious - Value and cost-effectiveness are important considerations',
      'moderate': 'Moderate Spending - Balanced approach to cost and quality, some flexibility for variety',
      'comfortable': 'Comfortable Budget - Quality and convenience valued over strict cost savings',
      'generous': 'Generous Budget - Cost is not a primary constraint, quality and variety prioritized'
    };
    
    return descriptions[budgetLevel] || descriptions['moderate'];
  };
  
  const budgetGuidance = data.locationBudget.budgetLevel === 'custom' 
    ? '' 
    : `\n- Budget guidance: Based on the budget level above, estimate a realistic weekly grocery cost range in local currency for ${data.locationBudget.locationCity}, ${data.locationBudget.locationCountry} and keep the plan within that range. State your estimate in the grocery list summary.`;

  return `LOCATION & BUDGET:
- Location: ${data.locationBudget.locationCity}, ${data.locationBudget.locationCountry}
- Shop at: ${data.locationBudget.preferredStore}
- Focus on ingredients commonly available at ${data.locationBudget.locationCountry} supermarkets
- Budget level: ${getBudgetLevelDescription(data.locationBudget.budgetLevel, data.locationBudget.customBudgetAmount)}${budgetGuidance}`;
};

export const buildMealPrepRequirementsSection = (data: MealPlanPromptData): string => {
  // This is derived from cooking preferences - we'll need to map the planning style number to text
  // Based on the BudgetCookingQuestionnaireScreen, planningStyle is 1-5 scale
  
  return `**MEAL PREP REQUIREMENTS** (based on my planning style):
- ${data.cookingPreferences.mealPrepStyle}`;
};

// ================================
// STATIC SECTIONS (unchanged)
// ================================

export const HEADER_SECTION = `I'm using a nutrition planning app called JSON.fit and need help creating a personalized meal plan.
**QUICK CREATION INSTRUCTIONS:**
1. **STANDARD KNOWLEDGE** - Use your existing knowledge base for common foods and recipes
2. **ESTIMATED PRICING** - Use typical pricing patterns for {store} in {country}`;

export const MEAL_PLAN_REQUIREMENTS_HEADER = (data: MealPlanPromptData): string => {
  const getCurrentDate = (): string => {
    const today = new Date();
    const startDate = new Date(today.getTime() + (24 * 60 * 60 * 1000)); // Start tomorrow
    return startDate.toLocaleDateString('en-AU', { weekday: 'long', month: 'short', day: 'numeric' });
  };
  
  return `**MEAL PLAN REQUIREMENTS:**
1. **BUDGET CONSTRAINT** - ${data.locationBudget.budgetLevel === 'custom' ? `Target weekly grocery budget: $${data.locationBudget.customBudgetAmount}` : data.locationBudget.budgetLevel + ' budget category'}
2. **MEAL PREP FOCUSED** - ${data.cookingPreferences.mealPrepStyle}
3. **INCLUDE DETAILED GROCERY LIST** - Organize by categories (Proteins, Dairy, Produce, etc.) with exact quantities, units, and estimated prices from ${data.locationBudget.preferredStore}
4. **SPECIFIC DATES** - Start the meal plan on tomorrow's date and use actual calendar dates
5. **SHOW CALCULATIONS** - For each meal, briefly explain how you arrived at the calorie/macro numbers`;
};

export const GROCERY_LIST_REQUIREMENTS = (data: MealPlanPromptData): string => {
  return `
---

## GROCERY LIST REQUIREMENTS

**IMPORTANT:** Your meal plan MUST include a detailed grocery list structured by category. This grocery list will be imported into the app for shopping, so accuracy matters.

For each grocery item include:
- **Item name** - Specific product name (e.g., "${data.locationBudget.preferredStore} Lean Beef Mince" not just "beef")
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

export const MEAL_PREP_SESSION_REQUIREMENTS = `
---

## MEAL PREP SESSION REQUIREMENTS

**IMPORTANT:** Your meal plan MUST include a structured meal prep session guide. This will be displayed in the app as a step-by-step prep walkthrough.

Include:
- **Session name** - e.g., "Sunday Meal Prep" or "Weekly Batch Cook"
- **Prep time and cook time** - Separate active prep vs passive cooking time
- **Total time** - Combined duration
- **Coverage** - What days/meals the prep covers - MUST be concise (max 6 words): "21 meals across 7 days" or "Days 1-4" or "All week"
- **Recommended timing** - When to do the prep (e.g., "Sunday afternoon")
- **Recommended date** - Actual calendar date in YYYY-MM-DD format when the prep should be done
- **Equipment needed** - List of equipment required for the prep session
- **Step-by-step instructions** - Clear, ordered instructions for the full prep session
- **Storage guidelines** - How long each prepped item lasts in fridge vs freezer`;

export const VERIFICATION_STEPS = `
---

## VERIFICATION STEPS

Before presenting the meal plan, complete these checks:

1. **Macro tolerance rules** — Not all macros need the same daily precision. Use these evidence-based rules:
   - **Protein**: Must be within 10% of target on EVERY individual day. Muscle protein synthesis is a daily process — consistent protein intake matters.
   - **Calories**: Weekly average must be within 5% of target. Individual days can vary up to ±10%. For weight gain, total weekly energy balance drives results.
   - **Carbs & Fat**: Weekly average must be within 10% of target. Individual days can flex more freely (±15%). Day-to-day variation in carbs and fat is normal and even beneficial if it aligns with activity levels.
   - **Fiber**: Must hit at least 80% of the daily target (e.g., 33.6g if target is 42g) on EVERY day. Gut health benefits require daily consistency.
   For each day, sum calories, protein, carbs, fat, and fiber across all meals. Check individual days against the daily rules (protein, fiber) and calculate weekly averages for the weekly rules (calories, carbs, fat). If any rule is violated, adjust portion sizes or swap ingredients before presenting.

2. **Protein distribution** — Check that protein is spread across meals, not loaded into one. Each meal should have a meaningful protein source (minimum 15-20g per main meal). Snacks can be lower.

3. **Cooking time alignment** — Verify that actual cooking times match the user's time investment preference. If they said "5-minute meals only," no recipe should require 30+ minutes. If they said "meal prep focused," verify that batch-cooked items are actually reused across multiple meals.

4. **Meal prep coherence** — If the user's planning style is 1-2 (meal prep focused), verify:
   - No more than 4-6 unique recipes for the entire plan duration
   - Batch-cooked proteins appear in multiple meals
   - Meals repeat across days as expected
   If the user's planning style is 4-5 (daily cooking), verify meals are mostly different each day.

5. **Budget reasonableness** — Mentally estimate the grocery cost. If the user specified a tight budget, verify no premium ingredients (e.g., salmon, avocado, specialty items) appear frequently. If comfortable/generous budget, more variety is fine.

6. **Equipment check** — Confirm every recipe can be made with the user's listed cooking equipment. No oven recipes if no oven. No blender recipes if no blender.

7. **Dietary restriction compliance** — Scan every ingredient across every meal. Confirm zero allergens or avoided foods appear anywhere in the plan, including hidden ingredients (e.g., soy sauce contains gluten, pesto contains nuts).

8. **Ingredient diversity audit** — Count across the entire plan:
   - Unique primary protein sources: MINIMUM 3. FAIL if fewer.
   - Unique vegetables: MINIMUM 6 different vegetables. FAIL if fewer.
   - Unique carb sources: MINIMUM 3. FAIL if fewer.
   - Unique fruits (if included): MINIMUM 3. FAIL if fewer.
   If any count fails, swap ingredients to meet minimums before presenting.

9. **Fiber target check** — Sum daily fiber for each day. If any day falls below 80% of the stated fiber target, add high-fiber swaps (e.g., white rice → brown rice, add legumes, increase vegetable portions, add seeds to breakfast). Fix before presenting.

10. **Meal timing gap check** — Verify no gap longer than 5 hours between meals during waking hours. If sleep data was provided, verify the last meal is at least 2 hours before stated bedtime. Add a snack or shift timing if gaps are too long.

11. **Grocery list completeness** — Verify the grocery list includes every ingredient from every meal with correct total quantities across all days.

12. **Grocery list cross-check** — Walk through each recipe ingredient and confirm it appears in the grocery list with the right total quantity for the week. Flag any missing items.

13. **Meal prep session completeness** — Verify the meal prep guide covers all batch-cooked items mentioned in the recipes and that storage times are realistic.

If any check fails, fix the plan before presenting. Do not present a plan with known issues — revise and recheck.

---`;

export const FORMAT_REQUIREMENTS = `

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

export const FEEDBACK_WORKFLOW = `

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

// ================================
// DATA LOADING AND MAPPING
// ================================

const mapNutritionData = (nutritionResults: any): Partial<MealPlanPromptData> => {
  const formData = nutritionResults?.formData || {};
  const macroResults = nutritionResults?.macroResults || {};
  
  // Calculate fiber target from calories (same logic as in current system)
  const fiberTarget = macroResults.calories 
    ? Math.min(45, Math.max(25, Math.round((macroResults.calories / 1000) * 14)))
    : 30;
  
  return {
    nutritionTargets: {
      dailyCalories: macroResults.calories || 2000,
      proteinG: macroResults.protein || 0,
      carbsG: macroResults.carbs || 0,
      fatG: macroResults.fat || 0,
      fiberG: fiberTarget,
      mealsPerDay: 3, // Default, will be overridden by budget cooking data
      planDuration: 7, // Default, will be overridden by budget cooking data
      snackingStyle: 'Occasional snacker', // Default, will be overridden by budget cooking data
      goal: formData.goal || 'maintain',
      goalRate: formData.rate || 'maintain'
    },
    personalInfo: {
      gender: formData.gender || 'Not specified',
      age: parseInt(formData.age) || 0,
      activityLevel: formData.activityLevel || 'moderate',
      jobType: formData.jobType || 'Not specified'
    },
    nutrientVarietyPriority: 'not_specified' // Will be set from user profile if available
  };
};

const mapBudgetCookingData = (budgetResults: any): Partial<MealPlanPromptData> => {
  const formData = budgetResults?.formData || {};
  
  // Map numeric scales to descriptive text
  const getPlanningStyleText = (style: number): string => {
    const styles: { [key: number]: string } = {
      1: 'User wants to meal prep everything - batch cook all proteins, same meals multiple days, cook once per week',
      2: 'User wants to meal prep as much as possible - batch cook proteins, repeat meals multiple days, minimize daily cooking',
      3: 'User likes some meal prep but also some fresh cooking - batch cook 1-2 items but vary the rest',
      4: 'User prefers mostly fresh cooking - minimal meal prep, enjoys cooking most meals daily',
      5: 'User prefers cooking fresh meals daily - no meal prep, enjoys daily cooking variety and spontaneous meal choices'
    };
    return styles[style] || styles[3];
  };
  
  const getTimeInvestmentText = (investment: number): string => {
    const investments: { [key: number]: string } = {
      1: 'User wants 5-minute meals only - microwave meals, no-cook options, absolute minimal prep work',
      2: 'User wants quick, simple meals - 10-15 minutes cooking time, minimal prep work, one-pot meals',
      3: 'User prefers moderate cooking times - 20-30 minute meals are ideal, comfortable with some prep',
      4: 'User enjoys spending time cooking - comfortable with 45-60 minute recipes and more involved preparations',
      5: 'User loves long cooking sessions - happy spending 2+ hours, enjoys complex multi-step recipes'
    };
    return investments[investment] || investments[3];
  };
  
  const getVarietySeekingText = (seeking: number): string => {
    const varieties: { [key: number]: string } = {
      1: 'User loves routine and repetition - identical meals all week is perfect, finds comfort in consistency',
      2: 'User is fine eating the same meals repeatedly - can have identical breakfast for a week, enjoys routine',
      3: 'User likes moderate variety - okay with some repeated meals but wants some different options too',
      4: 'User seeks variety but some repetition is okay - wants different meals most days but some repeats are fine',
      5: 'User needs variety and gets bored easily - wants completely different meals every day, craves new experiences'
    };
    return varieties[seeking] || varieties[3];
  };
  
  const getSkillConfidenceText = (confidence: number): string => {
    const skills: { [key: number]: string } = {
      1: 'User is a complete kitchen beginner - stick to very basic techniques, pre-made components, familiar ingredients only',
      2: 'User is a cautious cook - stick to simple techniques, avoid complex recipes, use familiar ingredients',
      3: 'User has moderate cooking skills - can handle most standard recipes but avoid overly complex techniques',
      4: 'User is a confident cook - comfortable with most recipes, willing to try new techniques and ingredients',
      5: 'User loves experimenting in the kitchen - excited by complex recipes, new techniques, and unusual ingredients'
    };
    return skills[confidence] || skills[3];
  };
  
  const getCookingEnjoymentText = (enjoyment: number): string => {
    const enjoyments: { [key: number]: string } = {
      1: 'User avoids cooking whenever possible - prioritize convenience, takeout alternatives, minimal cleanup',
      2: 'User sees cooking as a chore - prioritize convenience, minimal cleanup, simple preparation methods',
      3: 'User has a neutral attitude toward cooking - willing to cook but values efficiency and practicality',
      4: 'User enjoys cooking - finds it relaxing, comfortable with more involved recipes and techniques',
      5: 'User is passionate about cooking - loves the process, excited by complex recipes, cooking is a favorite hobby'
    };
    return enjoyments[enjoyment] || enjoyments[3];
  };
  
  return {
    nutritionTargets: {
      mealsPerDay: formData.mealsPerDay || 3,
      planDuration: formData.planDuration || 7,
      snackingStyle: formData.snackingStyle || 'Occasional snacker',
      // Other fields will be merged from nutrition data
      dailyCalories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, goal: '', goalRate: ''
    },
    dietaryRequirements: {
      allergies: formData.allergies || [],
      avoidFoods: formData.avoidFoods || [],
      eatingChallenges: formData.eatingChallenges || []
    },
    cookingPreferences: {
      mealPrepStyle: getPlanningStyleText(formData.planningStyle),
      cookingTimePreference: getTimeInvestmentText(formData.timeInvestment),
      varietyPreference: getVarietySeekingText(formData.varietySeeking),
      cookingSkill: getSkillConfidenceText(formData.skillConfidence),
      cookingAttitude: getCookingEnjoymentText(formData.cookingEnjoyment)
    },
    equipment: formData.cookingEquipment || [],
    locationBudget: {
      locationCity: formData.city || 'Not specified',
      locationCountry: formData.country || 'Not specified',
      preferredStore: formData.groceryStore || 'Local supermarket',
      budgetLevel: formData.weeklyBudget || 'moderate',
      customBudgetAmount: formData.customBudgetAmount
    },
    mealPreferences: {
      mode: formData.mealPreferences || 'ai_suggest',
      specificMeals: formData.selectedFavorites || [],
      customRequests: formData.customMealRequests
    }
  };
};

const mapSleepData = (sleepResults: any): Partial<MealPlanPromptData> => {
  if (!sleepResults?.formData) {
    return { sleepOptimization: { enabled: false, sleepTime: '', wakeTime: '', optimizationLevel: '' } };
  }
  
  const formData = sleepResults.formData;
  return {
    sleepOptimization: {
      enabled: true,
      sleepTime: formData.bedtime || '',
      wakeTime: formData.wakeTime || '',
      optimizationLevel: formData.optimizationLevel || 'moderate'
    }
  };
};

const mapFridgePantryData = (fridgeResults: any): Partial<MealPlanPromptData> => {
  if (!fridgeResults?.formData?.ingredients?.length || !fridgeResults?.formData?.wantToUseExistingIngredients) {
    return { pantryInventory: { enabled: false, items: [] } };
  }
  
  return {
    pantryInventory: {
      enabled: true,
      items: fridgeResults.formData.ingredients
    }
  };
};

// ================================
// MAIN PROMPT ASSEMBLY FUNCTION
// ================================

export const assembleDynamicMealPlanningPrompt = async (): Promise<string> => {
  try {
    // Load all questionnaire data
    const nutritionResults = await WorkoutStorage.loadNutritionResults();
    const budgetCookingResults = await WorkoutStorage.loadBudgetCookingResults();
    const sleepResults = await WorkoutStorage.loadSleepOptimizationResults();
    const fridgePantryResults = await WorkoutStorage.loadFridgePantryResults();
    
    // Load user profile for nutrient variety preference
    const userProfileData = await AsyncStorage.getItem('@nutrition_user_profile');
    const userProfile = userProfileData ? JSON.parse(userProfileData) : null;
    
    if (!nutritionResults || !budgetCookingResults) {
      throw new Error('Please complete the Nutrition Goals and Budget & Cooking questionnaires first.');
    }
    
    // Map all data to our unified structure
    let promptData: MealPlanPromptData = {
      nutritionTargets: {
        dailyCalories: 2000,
        proteinG: 150,
        carbsG: 200,
        fatG: 67,
        fiberG: 30,
        mealsPerDay: 3,
        planDuration: 7,
        snackingStyle: 'Occasional snacker',
        goal: 'maintain',
        goalRate: 'maintain'
      },
      personalInfo: {
        gender: 'Not specified',
        age: 30,
        activityLevel: 'moderate',
        jobType: 'Not specified'
      },
      dietaryRequirements: {
        allergies: [],
        avoidFoods: [],
        eatingChallenges: []
      },
      cookingPreferences: {
        mealPrepStyle: 'User likes some meal prep but also some fresh cooking',
        cookingTimePreference: 'User prefers moderate cooking times',
        varietyPreference: 'User likes moderate variety',
        cookingSkill: 'User has moderate cooking skills',
        cookingAttitude: 'User has a neutral attitude toward cooking'
      },
      equipment: [],
      locationBudget: {
        locationCity: 'Not specified',
        locationCountry: 'Not specified',
        preferredStore: 'Local supermarket',
        budgetLevel: 'moderate'
      },
      mealPreferences: {
        mode: 'ai_suggest'
      },
      sleepOptimization: {
        enabled: false,
        sleepTime: '',
        wakeTime: '',
        optimizationLevel: ''
      },
      pantryInventory: {
        enabled: false,
        items: []
      }
    };
    
    // Merge all the data
    const nutritionData = mapNutritionData(nutritionResults);
    const budgetData = mapBudgetCookingData(budgetCookingResults);
    const sleepData = mapSleepData(sleepResults);
    const pantryData = mapFridgePantryData(fridgePantryResults);
    
    // Merge nutrition targets
    promptData.nutritionTargets = { ...promptData.nutritionTargets, ...nutritionData.nutritionTargets, ...budgetData.nutritionTargets };
    
    // Set other sections
    promptData.personalInfo = { ...promptData.personalInfo, ...nutritionData.personalInfo };
    promptData.dietaryRequirements = { ...promptData.dietaryRequirements, ...budgetData.dietaryRequirements };
    promptData.cookingPreferences = { ...promptData.cookingPreferences, ...budgetData.cookingPreferences };
    promptData.equipment = budgetData.equipment || [];
    promptData.locationBudget = { ...promptData.locationBudget, ...budgetData.locationBudget };
    promptData.mealPreferences = { ...promptData.mealPreferences, ...budgetData.mealPreferences };
    promptData.sleepOptimization = { ...promptData.sleepOptimization, ...sleepData.sleepOptimization };
    promptData.pantryInventory = { ...promptData.pantryInventory, ...pantryData.pantryInventory };
    
    // Set nutrient variety from user profile if available
    if (userProfile?.nutrientVariety) {
      promptData.nutrientVarietyPriority = userProfile.nutrientVariety;
    }
    
    // Build the complete prompt
    let prompt = '';
    
    // Header
    prompt += HEADER_SECTION
      .replace('{store}', promptData.locationBudget.preferredStore)
      .replace('{country}', promptData.locationBudget.locationCountry);
    
    // Requirements header
    prompt += '\n' + MEAL_PLAN_REQUIREMENTS_HEADER(promptData);
    
    // Main sections
    prompt += '\n\n' + buildNutritionTargetsSection(promptData);
    prompt += '\n\n' + buildPersonalInfoSection(promptData);
    prompt += '\n\n' + buildDietaryRequirementsSection(promptData);
    prompt += '\n\n' + buildNutrientVarietySection(promptData);
    prompt += buildSleepOptimizedSection(promptData); // Conditional section
    prompt += '\n\n' + buildFridgePantrySection(promptData);
    prompt += '\n\n' + buildMealPreferencesSection(promptData);
    prompt += '\n\n' + buildCookingPreferencesSection(promptData);
    prompt += '\n\n' + buildCookingEquipmentSection(promptData);
    prompt += '\n\n' + buildLocationBudgetSection(promptData);
    prompt += '\n\n' + buildMealPrepRequirementsSection(promptData);
    
    // Add the detailed requirements and output sections
    const getCurrentDate = (): string => {
      const today = new Date();
      const startDate = new Date(today.getTime() + (24 * 60 * 60 * 1000)); // Start tomorrow
      return startDate.toLocaleDateString('en-AU', { weekday: 'long', month: 'short', day: 'numeric' });
    };
    
    const sleepTimingText = promptData.sleepOptimization?.enabled 
      ? '4. **INCLUDES SPECIFIC MEAL TIMES - For each meal, provide the exact recommended time (e.g., "Breakfast: 7:45 AM", "Dinner: 6:00 PM") based on my sleep schedule and optimization level**'
      : '4. **INCLUDES GENERAL MEAL TIMING - Provide suggested meal times**';
      
    const sleepRationaleText = promptData.sleepOptimization?.enabled 
      ? '\n10. **PROVIDES MEAL TIMING RATIONALE** - Explain why each meal time optimizes sleep and circadian health'
      : '';
    
    prompt += `\n\nPlease create a detailed ${promptData.nutritionTargets.planDuration}-day meal plan that:
1. **STARTS on ${getCurrentDate()}** and uses actual calendar dates
2. **MATCHES my meal prep personality** - don't give me 21 meals if I'm a "Weekly Planner"
3. **SHOWS NUTRITION CALCULATIONS** - briefly explain how you got the calories/macros for each meal
${sleepTimingText}
5. **INCLUDES DETAILED RECIPES** - For each meal provide:
   - Complete ingredients list with exact quantities and units
   - Step-by-step cooking instructions (minimum 3-5 steps per recipe)
   - Prep time and cook time for each meal
   - Serving size information
6. **INCLUDES STRUCTURED MEAL PREP PLAN** - exactly what to prep, how much, and what containers to use
7. Uses ingredients available at ${promptData.locationBudget.preferredStore} in ${promptData.locationBudget.locationCountry}
8. Accounts for my dietary restrictions and cooking skill level
9. Hits macro targets using the tolerance rules below (protein daily, others weekly average)${sleepRationaleText}`;
    
    // Static sections
    prompt += GROCERY_LIST_REQUIREMENTS(promptData);
    prompt += MEAL_PREP_SESSION_REQUIREMENTS;
    prompt += VERIFICATION_STEPS;
    prompt += FORMAT_REQUIREMENTS;
    prompt += FEEDBACK_WORKFLOW;
    
    return prompt;
    
  } catch (error) {
    console.error('Error generating dynamic meal planning prompt:', error);
    throw error;
  }
};

// ================================
// PROMPT 2: DYNAMIC REVIEW PROMPT
// ================================

export const assembleDynamicMealPlanReviewPrompt = async (): Promise<string> => {
  try {
    // Load questionnaire data to get user's targets
    const nutritionResults = await WorkoutStorage.loadNutritionResults();
    const sleepResults = await WorkoutStorage.loadSleepOptimizationResults();
    const budgetCookingResults = await WorkoutStorage.loadBudgetCookingResults();
    
    const macroResults = nutritionResults?.macroResults || {};
    const sleepData = sleepResults?.formData;
    const equipmentData = budgetCookingResults?.formData?.cookingEquipment || [];
    
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
Check if the plan respects budget constraints:
- Grocery list total aligns with stated budget level (very tight, moderate, comfortable, etc.)
- Ingredient choices match budget category (budget-conscious vs premium items)
- Portion sizes are realistic for the stated budget
- No unnecessarily expensive ingredients for tight budgets
- **FAIL if** grocery costs significantly exceed stated budget or include inappropriate premium items for budget level
- **FIX**: Swap expensive ingredients, reduce premium protein frequency, or adjust the stated budget range to match reality (with explanation).

### 3. Meal Prep Style Alignment
Verify the plan matches the user's planning style preference:
- Weekly Planners (1-2): Should have 3-4 repeated meals max, batch cooking focus, detailed prep instructions
- Moderate Planners (3): Should have 5-6 different meals, some batch elements, balanced approach
- Daily Cookers (4-5): Should have mostly different meals, minimal batch cooking, fresh preparation focus
- Meal variety and prep instructions match stated preference level
- **FAIL if** meal variety/prep style doesn't align with user's stated planning preference
- **FIX**: Add or remove recipe variety, adjust batch cooking scope.

### 4. Dietary Restrictions & Preferences
Check compliance with dietary requirements:
- All listed allergies completely avoided in every meal
- All "avoid foods" list respected throughout the plan
- Eating challenges addressed appropriately
- Favorite meals incorporated if requested
- Custom meal requests fulfilled if specified
- **FAIL if** any restricted foods appear or preferences ignored
- **FIX**: Remove offending ingredients, replace with safe alternatives.

### 5. Cooking Feasibility
Assess if the plan is practical for the user:
- Cooking times align with user's time investment preference (5-min vs 2+ hours)
- Recipe complexity matches stated skill confidence level
- Only uses available cooking equipment (no oven recipes if no oven, etc.)
- Ingredient preparation difficulty appropriate for skill level
- Total daily cooking time realistic for lifestyle
- **FAIL if** recipes are too complex for skill level or equipment constraints violated
- **FIX**: Replace recipes requiring unavailable equipment. Simplify complex recipes. Ensure every recipe uses ONLY the listed equipment.

### 6. Location & Ingredient Availability
Verify ingredients are accessible:
- All ingredients commonly available at the specified grocery store in the specified country
- Seasonal ingredient considerations appropriate for location
- No exotic ingredients that would be hard to find
- Ingredient names and units match local standards
- **FAIL if** ingredients would be difficult to source at specified location/store
- **FIX**: Replace hard-to-find ingredients with common alternatives from the specified store.

### 7. Sleep Optimization Compliance (if applicable)
${sleepData ? `If sleep optimization was requested, check meal timing:
- Meal times align with specified sleep schedule (${sleepData.bedtime} - ${sleepData.wakeTime})
- Eating window matches optimization level (${sleepData.optimizationLevel})
- Last meal timing respects bedtime constraints (2-4+ hours before bed)
- First meal timing aligns with wake time preferences
- **FAIL if** meal timing conflicts with sleep optimization requirements
- **FIX**: Shift meal times to fit the specified eating window. Recalculate all gaps and verify.` : 'Sleep optimization not enabled - skip this check.'}

### 8. Practical Implementation
Assess overall plan practicality:
- Shopping list is well-organized and complete
- Meal prep instructions are clear and actionable
- Storage and reheating guidance provided where needed
- Recipe instructions are detailed enough (minimum 3-5 steps)
- Serving sizes and portions are realistic
- **FAIL if** plan lacks practical implementation details or has unclear instructions
- **FIX**: Add missing details, expand thin recipes to minimum 3-5 steps, add storage/reheating notes.

### 9. Nutritional Quality & Balance
Beyond macro targets, evaluate nutritional completeness:
- **Protein diversity**: At least 3 different primary protein sources across the plan. FAIL if only 1-2.
- **Vegetable diversity**: At least 6 different vegetables across the plan. FAIL if fewer.
- **Vegetable volume**: At least 300g non-starchy vegetables per day. FAIL if consistently under.
- **Carb diversity**: At least 3 different carb sources across the plan. FAIL if only 1-2.
- **Micronutrient coverage**: Across the full week, check for at least one serving each of: dark leafy greens, cruciferous vegetables, a vitamin C source, an omega-3 source, legumes/beans, and whole grains. FAIL if 3+ categories are completely absent.
- (Note: Fiber is checked in Check #1 under macro tolerance rules.)
- **FAIL if** 2+ of the above sub-checks fail
- **FIX**: Swap ingredients to add diversity, increase vegetable portions, add missing food groups.

### 10. Grocery List Completeness & Accuracy
Verify the grocery list is complete and correct:
- **Every ingredient** from every recipe across all 7 days appears in the grocery list
- **Quantities are totalled correctly** — e.g., if 4 meals use 200g chicken each, the list shows 800g
- **Prices are realistic** for the specified store and location
- **Categories are logical** — items are in the right shopping section
- **No phantom items** — nothing in the grocery list that isn't used in any recipe
- **Notes are helpful** — storage tips, usage notes, substitution suggestions
- Cross-check: Pick 3 random ingredients from recipes and verify they appear in the grocery list with correct quantities
- **FAIL if** 3+ ingredients are missing from the grocery list or quantities are significantly wrong
- **FIX**: Add missing items, correct quantities, remove phantom items, fix prices.

### 11. Meal Prep Session Completeness
Verify the meal prep guide is functional:
- **All batch-cooked items** from the recipes are covered in the prep session
- **Step-by-step instructions** are clear and logically ordered
- **Equipment list** matches what's actually needed for the prep
- **Storage guidelines** are included with realistic fridge/freezer times
- **Time estimates** are realistic (prep time + cook time = total time)
- **Coverage statement** is concise (max 6 words): "21 meals across 7 days" format
- **Recommended date** is included in YYYY-MM-DD format for each prep session
- **FAIL if** meal prep session is missing, incomplete, or doesn't match the actual recipes
- **FIX**: Add missing prep steps, correct equipment list, add storage guidelines, fix time estimates.

### 12. Overall Coherence
Final assessment of plan quality:
- All meals work together as a cohesive weekly plan
- No conflicting instructions or impossible logistics
- Plan feels realistic and sustainable for the described lifestyle
- Cost estimates seem reasonable and well-researched
- Plan addresses the user's primary nutrition goals effectively
- Grocery list, meal prep session, and daily meals all reference the same ingredients consistently
- **No draft working, iterations, or revision commentary** — only clean final content
- **FAIL if** plan has internal contradictions or feels unrealistic overall
- **FIX**: Remove all draft content, resolve contradictions, ensure all sections reference the same data.

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

// ================================
// PROMPT 3: STATIC JSON CONVERSION PROMPT
// ================================
// This prompt is entirely static - no dynamic content needed

export const getJsonConversionPrompt = (): string => {
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
    "recommended_date": "YYYY-MM-DD",
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
\`\`\`

# Field Requirements

## Core Meal Data

| Field | Required | Format | Notes |
|-------|----------|--------|-------|
| **id** | Yes | String | Unique identifier for the meal plan |
| **name** | Yes | String | Descriptive name (e.g., "7-Day Weight Gain Plan") |
| **startDate** | Yes | YYYY-MM-DD | Must match first day in dailyMeals |
| **endDate** | Yes | YYYY-MM-DD | Must match last day in dailyMeals |
| **dailyMeals** | Yes | Object | Date-keyed meals (see below) |

## Daily Meal Structure

| Field | Required | Format | Notes |
|-------|----------|--------|-------|
| **date** | Yes | YYYY-MM-DD | Must match the object key |
| **dayName** | Yes | String | "Monday", "Tuesday", etc. |
| **meals** | Yes | Array | All meals for this day |

## Individual Meal Structure

| Field | Required | Format | Notes |
|-------|----------|--------|-------|
| **id** | Yes | String | Unique meal identifier |
| **name** | Yes | String | Meal name |
| **type** | Yes | Enum | "breakfast", "lunch", "dinner", "snack" |
| **time** | Yes | String | "7:45 AM", "12:30 PM" format |
| **calories** | Yes | Number | Total calories for this meal |
| **macros.protein** | Yes | Number | Protein in grams |
| **macros.carbs** | Yes | Number | Carbohydrates in grams |
| **macros.fat** | Yes | Number | Fat in grams |
| **macros.fiber** | Yes | Number | Fiber in grams |
| **ingredients** | Yes | Array | All ingredients with amounts |
| **instructions** | Yes | Array | Step-by-step cooking instructions |
| **tags** | No | Array | Tags like ["high_protein", "meal_prep"] |
| **isOriginal** | Yes | Boolean | Always true for generated meals |
| **addedAt** | Yes | String | ISO timestamp when meal was created |

## Ingredient Structure

| Field | Required | Format | Notes |
|-------|----------|--------|-------|
| **item** | Yes | String | Ingredient name |
| **amount** | Yes | String | Quantity as text (e.g., "200", "1/2 cup") |
| **unit** | Yes | String | Unit of measurement |
| **notes** | No | String | Preparation notes, substitutions |

## Grocery List Structure

| Field | Required | Format | Notes |
|-------|----------|--------|-------|
| **total_estimated_cost** | Yes | Number | Sum of all item prices |
| **currency** | Yes | String | Currency code (e.g., "AUD", "USD") |
| **categories** | Yes | Array | Grouped grocery items |
| **category_name** | Yes | String | Category like "Meat & Seafood" |
| **items** | Yes | Array | Items in this category |
| **item_name** | Yes | String | Product name |
| **quantity** | Yes | String | Total amount needed |
| **unit** | Yes | String | Unit of measurement |
| **estimated_price** | Yes | Number | Price in local currency |
| **notes** | No | String | Usage notes, storage tips |
| **is_purchased** | Yes | Boolean | Always false (user will check off) |

## Meal Prep Session Structure

| Field | Required | Format | Notes |
|-------|----------|--------|-------|
| **session_name** | Yes | String | e.g., "Sunday Meal Prep" |
| **prep_time** | Yes | Number | Active prep time in minutes |
| **cook_time** | Yes | Number | Passive cooking time in minutes |
| **total_time** | Yes | Number | prep_time + cook_time |
| **covers** | Yes | String | Concise description (max 6 words): "21 meals across 7 days" format |
| **recommended_timing** | Yes | String | When to do the prep |
| **recommended_date** | Yes | String | Calendar date in YYYY-MM-DD format |
| **equipment_needed** | Yes | Array | Required equipment |
| **instructions** | Yes | Array | Step-by-step prep instructions |
| **storage_guidelines** | Yes | Object | How long items last |

# CRITICAL CONVERSION RULES

## Date Handling
- Use YYYY-MM-DD format consistently
- Ensure dailyMeals keys match the date field within each day
- Calculate startDate and endDate from the meal plan dates

## ID Generation
- meal plan id: use timestamp-based unique ID
- meal ids: use format "meal_YYYYMMDD_breakfast" etc.

## Nutrition Accuracy
- Each meal's macros must match the recipe calculations
- Double-check that ingredient amounts support the stated macros
- Fiber should be calculated and included for every meal

## Grocery List Totaling
- Sum ingredient quantities across all meals for the week
- Group by logical shopping categories
- Ensure estimated prices are realistic for the specified store/country
- Remove duplicates and consolidate similar items

## Time Formatting
- Use 12-hour format with AM/PM (e.g., "7:45 AM")
- Be consistent across all meal times

## Array vs String Handling
- ingredients: array of objects
- instructions: array of strings
- tags: array of strings
- equipment_needed: array of strings

# EXAMPLE CONVERSION

If the meal plan mentions "200g chicken breast" in 3 different meals, the grocery list should show "600g" total chicken breast, not three separate 200g entries.

If the meal plan says "Cook rice according to package instructions", convert this to specific steps like:
\`\`\`json
"instructions": [
  "Rinse 1 cup jasmine rice until water runs clear",
  "Add rice and 1.5 cups water to pot and bring to boil",
  "Reduce heat to low, cover, and simmer for 18 minutes",
  "Let stand 5 minutes, then fluff with fork"
]
\`\`\`

# OUTPUT REQUIREMENTS

1. **Create the file first** - don't output to chat
2. **Complete structure** - include all required fields
3. **Validate structure** - ensure JSON is valid
4. **Provide download link** when finished

Start the conversion now and create the JSON file.`;
};