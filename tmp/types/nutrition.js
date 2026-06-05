"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NUTRITION_STORAGE_KEYS = void 0;
// Storage Keys
exports.NUTRITION_STORAGE_KEYS = {
    USER_PROFILE: '@nutrition_user_profile',
    CURRENT_MEAL_PLAN: '@nutrition_current_plan',
    MEAL_HISTORY: '@nutrition_meal_history',
    FAVORITE_MEALS: '@nutrition_favorites',
    WEIGHT_ENTRIES: '@nutrition_weight_entries',
    MEAL_RATINGS: '@nutrition_meal_ratings',
    COMPLETED_MEALS: '@nutrition_completed_meals',
    // NEW SIMPLIFIED ARCHITECTURE - Multiple Plans Support
    SIMPLIFIED_MEAL_PLANS: '@nutrition_simplified_plans',
    CURRENT_PLAN_ID: '@nutrition_current_plan_id',
    // Legacy single plan support
    SIMPLIFIED_MEAL_PLAN: '@nutrition_simplified_plan',
};
