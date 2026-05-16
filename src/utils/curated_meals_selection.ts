import { CuratedMeal, CookingMethod, UserCookingPreferences } from '../types/curated_meals';

/**
 * Intent for meal selection affects filtering and ranking behavior.
 * - 'user_requested': User explicitly asked for this meal. Equipment is required,
 *   but skill/time become preferences that affect ranking, not hard filters.
 * - 'ai_suggested': AI is choosing this meal. Skill and time become hard filters -
 *   user never sees meals they couldn't realistically make.
 */
export type SelectionIntent = 'user_requested' | 'ai_suggested';

/**
 * Result of selecting a cooking method for a user.
 * exceeds_skill and exceeds_time indicate when the chosen method goes beyond
 * the user's stated comfort level. These flags will only be true when
 * intent === 'user_requested'; under 'ai_suggested', exceeding methods are
 * filtered out entirely, so both flags will always be false.
 * UI can use these flags to show a gentle "this is more involved than your usual style" note.
 */
export type SelectionResult = {
  method: CookingMethod;
  exceeds_skill: boolean;
  exceeds_time: boolean;
};

/**
 * Maps timeInvestment (1-5) to maximum active cooking time in minutes.
 * This is active time only, not total elapsed time - a slow-cooker recipe
 * with 5 min active + 4 hours passive is within comfort for a Speed Cook user.
 */
export function getTimeInvestmentCeiling(timeInvestment: 1 | 2 | 3 | 4 | 5): number {
  switch (timeInvestment) {
    case 1: return 5;      // Speed Cook
    case 2: return 20;     // Quick Meals
    case 3: return 30;     // Moderate Cook
    case 4: return 45;     // Thorough Cook
    case 5: return Number.POSITIVE_INFINITY; // Slow Food Lover
  }
}

/**
 * Helper: Check if user has all required equipment for a method
 */
function hasRequiredEquipment(method: CookingMethod, userEquipment: UserCookingPreferences['cooking_equipment']): boolean {
  return method.equipment_required.every(equip => userEquipment.includes(equip));
}

/**
 * Helper: Check if method is within user's comfort zone
 */
function isWithinComfort(method: CookingMethod, user: UserCookingPreferences): boolean {
  const timeCeiling = getTimeInvestmentCeiling(user.time_investment);
  return method.skill_min <= user.skill_confidence && 
         method.time_active_minutes <= timeCeiling;
}

/**
 * Helper: Check if method uses meal-prep friendly equipment
 */
function isMealPrepMethod(method: CookingMethod): 'slow_cooker' | 'pressure_cooker' | null {
  if (method.equipment_required.includes('slow_cooker')) return 'slow_cooker';
  if (method.equipment_required.includes('pressure_cooker')) return 'pressure_cooker';
  return null;
}

/**
 * Selects the best cooking method for a user based on their preferences and the selection intent.
 * 
 * Algorithm:
 * 1. Equipment filter (hard requirement, both intents): Only methods where user has all required equipment
 * 2. Comfort filter (intent-dependent):
 *    - ai_suggested: Drop methods exceeding skill or time comfort
 *    - user_requested: Keep all methods that pass equipment
 * 3. If no methods survive, return null
 * 4. Rank surviving methods by:
 *    a. Comfort fit beats exceeding comfort
 *    b. Meal prepper preference (planningStyle <= 2 prefers slow_cooker > pressure_cooker)
 *    c. Lowest active time
 *    d. Shortcut beats scratch
 *    e. First in array (stable tiebreak)
 * 5. Build result with exceeds flags
 */
export function selectMethodForUser(
  meal: CuratedMeal,
  user: UserCookingPreferences,
  options: { intent: SelectionIntent }
): SelectionResult | null {
  // Step 1: Equipment filter (hard requirement)
  let viableMethods = meal.methods.filter(method => 
    hasRequiredEquipment(method, user.cooking_equipment)
  );

  // Step 2: Comfort filter (intent-dependent)
  if (options.intent === 'ai_suggested') {
    const timeCeiling = getTimeInvestmentCeiling(user.time_investment);
    viableMethods = viableMethods.filter(method =>
      method.skill_min <= user.skill_confidence &&
      method.time_active_minutes <= timeCeiling
    );
  }
  // For user_requested, we keep all equipment-viable methods

  // Step 3: If no methods survive, return null
  if (viableMethods.length === 0) {
    return null;
  }

  // Step 4: Rank the surviving methods
  // We'll use a comparison function for sorting
  const isMealPrepper = user.planning_style <= 2;
  
  viableMethods.sort((a, b) => {
    // 4a. Comfort fit beats exceeding comfort
    const aWithinComfort = isWithinComfort(a, user);
    const bWithinComfort = isWithinComfort(b, user);
    if (aWithinComfort && !bWithinComfort) return -1;
    if (!aWithinComfort && bWithinComfort) return 1;

    // 4b. Meal prepper preference (only if planning_style <= 2)
    if (isMealPrepper) {
      const aMealPrep = isMealPrepMethod(a);
      const bMealPrep = isMealPrepMethod(b);
      
      // slow_cooker > pressure_cooker > other
      if (aMealPrep === 'slow_cooker' && bMealPrep !== 'slow_cooker') return -1;
      if (bMealPrep === 'slow_cooker' && aMealPrep !== 'slow_cooker') return 1;
      if (aMealPrep === 'pressure_cooker' && !bMealPrep) return -1;
      if (bMealPrep === 'pressure_cooker' && !aMealPrep) return 1;
    }

    // 4c. Lowest active time wins
    if (a.time_active_minutes < b.time_active_minutes) return -1;
    if (b.time_active_minutes < a.time_active_minutes) return 1;

    // 4d. Shortcut beats scratch
    if (a.shortcut_level === 'shortcut' && b.shortcut_level === 'scratch') return -1;
    if (b.shortcut_level === 'shortcut' && a.shortcut_level === 'scratch') return 1;

    // 4e. Stable tiebreak - first in array wins (already in order)
    return 0;
  });

  // Step 5: Build the result
  const chosenMethod = viableMethods[0];
  const timeCeiling = getTimeInvestmentCeiling(user.time_investment);
  
  return {
    method: chosenMethod,
    exceeds_skill: chosenMethod.skill_min > user.skill_confidence,
    exceeds_time: chosenMethod.time_active_minutes > timeCeiling
  };
}