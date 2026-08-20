export interface UserNutritionProfile {
  id: string;
  goals?: NutritionGoals;
  macros?: MacroTargets;
  schedule?: MealSchedule;
  budget?: FoodBudget;
  preferences?: FoodPreferences;
  location?: UserLocation;
  inventory?: FoodInventory[];
  weightTracking?: WeightEntry[];
  createdAt: string;
  updatedAt: string;
  // Flat questionnaire fields (optional — written by NutritionQuestionnaireScreen)
  goal?: 'lose_weight' | 'gain_weight' | 'maintain';
  targetRatePercentage?: number;
  targetRate?: number;
  age?: number;
  gender?: 'male' | 'female' | 'prefer_not_to_say';
  height?: number;
  currentWeight?: number;
  weight?: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'heavy' | 'extreme';
  workoutFrequency?: number;
  dietType?: 'balanced' | 'high_protein' | 'low_carb' | 'keto' | 'custom';
  mealsPerDay?: number;
  dietaryRestrictions?: string[];
  supplements?: string[];
  nutrientVariety?: 'high' | 'moderate' | 'low';
  macroTargets?: MacroTargets;
  targets?: MacroTargets;
}

export interface NutritionGoals {
  primaryGoal: 'weight_loss' | 'weight_gain' | 'muscle_gain' | 'maintenance' | 'performance';
  targetWeight?: number;
  timeframe?: number; // weeks
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

export interface MacroTargets {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  autoAdjust: boolean; // adjust based on weight changes
}

export interface MealSchedule {
  wakeTime: string; // "07:00"
  bedTime: string; // "23:00"
  mainMealsPerDay: number; // 2-7
  snacksPerDay: number; // 0-3
  mealTimes: string[]; // ["07:30", "13:00", "19:00"]
}

export interface FoodBudget {
  weeklyAmount: number;
  currency: string;
  includesEatingOut: boolean;
}

export interface FoodPreferences {
  cookingLevel: 'minimal' | 'basic' | 'intermediate' | 'advanced';
  prepTime: 'quick' | 'moderate' | 'extended'; // <15min, 15-45min, 45min+
  varietyTolerance: 'low' | 'medium' | 'high'; // same meals vs variety
  mealPrepFriendly: boolean;
  dietaryRestrictions: DietaryRestriction[];
  dislikedFoods: string[];
  favoriteIngredients: string[];
  micronutrientPreferences?: MicronutrientPreferences;
}

export interface DietaryRestriction {
  type: 'vegetarian' | 'vegan' | 'gluten_free' | 'dairy_free' | 'keto' | 'paleo' | 'halal' | 'kosher' | 'other';
  customDescription?: string;
}

export interface MicronutrientPreferences {
  // Known deficiencies or areas of focus
  knownDeficiencies: ('iron' | 'b12' | 'vitamin_d' | 'calcium' | 'magnesium' | 'zinc' | 'folate' | 'none')[];
  
  // Current supplements (to avoid double-dosing via food)
  currentSupplements: string[];
  
  // Health conditions affecting nutrition needs
  healthConditions: ('anemia' | 'osteoporosis' | 'diabetes' | 'hypertension' | 'pregnancy' | 'breastfeeding' | 'none')[];
  
  // Energy patterns (indicates B-vitamin/iron status)
  energyLevels: 'consistently_low' | 'afternoon_crash' | 'morning_sluggish' | 'good';
  
  // Sun exposure (affects vitamin D synthesis)
  sunExposure: 'minimal' | 'moderate' | 'high';
  
  // Special life stage
  lifeStage: 'standard' | 'pregnancy' | 'breastfeeding' | 'menopause' | 'elderly';
  
  // Digestive considerations (affects nutrient absorption)
  digestiveIssues: ('frequent_bloating' | 'poor_absorption' | 'ibs' | 'none')[];
}

export interface UserLocation {
  country: string;
  city: string;
  currency: string;
}

export interface FoodInventory {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expirationDate: string;
  category: FoodCategory;
  estimatedCost: number;
}

export type FoodCategory = 'protein' | 'dairy' | 'grains' | 'vegetables' | 'fruits' | 'pantry' | 'spices' | 'frozen' | 'other';

export interface WeightEntry {
  date: string;
  weight: number;
  unit: 'kg' | 'lbs';
  notes?: string;
}

// Meal Planning Types
export interface MealPlan {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  days: MealPlanDay[];
  groceryList: GroceryList;
  totalCost: number;
  generatedAt: string;
  macroSplit?: string;
  // Legacy API response wrapper — the server wraps plan content in a `data`
  // envelope with weeks/days/deletedMeals sub-keys.
  data?: {
    weeks?: any[];
    days?: any[];
    deletedMeals?: any[];
    [key: string]: any;
  };
}

// NEW SIMPLIFIED ARCHITECTURE
export interface SimplifiedMealPlan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  fingerprint?: string;
  dailyMeals: Record<string, SimplifiedMealPlanDay>; // key: "2024-02-20"
  days?: any[]; // Legacy root-level days array used by import screen
  data?: { days?: any[]; weeks?: any[]; deletedMeals?: any[] }; // Legacy import format
  metadata: {
    generatedAt: string;
    totalCost?: number;       // Legacy
    totalCost_low?: number;   // New
    totalCost_high?: number;  // New
    duration: number;
  };
  // Optional legacy fields for grocery lists and meal prep
  grocery_list?: {
    total_estimated_cost?: number;        // Legacy single value
    total_estimated_cost_low?: number;    // New: lower bound
    total_estimated_cost_high?: number;   // New: upper bound with 10% buffer
    currency: string;
    categories: {
      category_name: string;
      items: {
        item_name: string;
        quantity: string;
        unit: string;
        estimated_price: number;
        notes: string;
        is_purchased: boolean;
      }[];
    }[];
  };
  weekly_meal_prep?: {
    total_prep_time: number;
    unique_recipes: number;
    batch_proteins?: string[];
    prep_session_guide: {
      step: number;
      title: string;
      description: string;
      time_required: number;
    }[];
  };
  // Multiple meal prep sessions support (new format)
  meal_prep_sessions?: {
    session_name: string;
    prep_time: number;
    cook_time: number;
    total_time: number;
    covers: string;
    recommended_timing: string;
    recommended_date?: string;
    equipment_needed: string[];
    instructions: string[];
    storage_guidelines: Record<string, string>;
    ingredients?: {
      item: string;
      amount: string;
      unit: string;
      scalable: boolean;
      notes: string;
    }[];
    prep_meals?: {
      meal_name: string;
      meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      prep_time: number;
      cook_time: number;
      total_time: number;
      servings: number;
      calories: number;
      macros: {
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
      };
      ingredients: {
        item: string;
        amount: string;
        unit: string;
        notes: string;
      }[];
      instructions: string[];
      meal_prep_notes: string;
    }[];
  }[];
  // Legacy meal prep session structure (still used by MealPrepSessionScreen for backward compatibility)
  meal_prep_session?: {
    session_name: string;
    prep_time: number;
    cook_time: number; 
    total_time: number;
    covers: string;
    recommended_timing: string;
    recommended_date?: string;
    equipment_needed: string[];
    instructions: string[];
    storage_guidelines: {
      proteins: string;
      grains: string;
      vegetables: string;
    };
    ingredients?: {
      item: string;
      amount: string;
      unit: string;
      scalable: boolean;
      notes: string;
    }[];
    prep_meals?: {
      meal_name: string;
      meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      prep_time: number;
      cook_time: number;
      total_time: number;
      servings: number;
      calories: number;
      macros: {
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
      };
      ingredients: {
        item: string;
        amount: string;
        unit: string;
        notes: string;
      }[];
      instructions: string[];
      meal_prep_notes: string;
      weekly_meal_coverage?: {
        day: string;
        meal_type: string;
      }[];
    }[];
  };
}

export interface SimplifiedMealPlanDay {
  date: string; // "2024-02-20"
  dayName: string; // "Monday"
  meals: SimplifiedMeal[];
}

export interface SimplifiedMeal {
  id: string;
  name: string;
  type: MealType;
  time: string; // "7:45 AM"
  calories: number;
  macros: MacroBreakdown;
  ingredients: Ingredient[];
  instructions: CookingInstruction[];
  tags: MealTag[];
  isOriginal: boolean; // true if from generated plan, false if manually added
  addedAt?: string; // timestamp when added (for manual meals)
  // Curated-meal reference fields. Present when this meal maps to a curated
  // catalogue entry; absent for invented or manually-logged meals. slug +
  // plate_id resolve the recipe / prep classification from CURATED_MEALS,
  // scale_factor scales its macros, and the photo fields carry the meal image.
  curated_meal_slug?: string;
  plate_id?: string;
  scale_factor?: number;
  photo_url?: string;
  image_filename?: string;
}

export interface MealPlanDay {
  date: string;
  meals: Meal[];
  totalCalories: number;
  totalMacros: MacroBreakdown;
}

export interface Meal {
  id: string;
  type: MealType;
  name: string;
  description: string;
  time: string;
  ingredients: Ingredient[];
  instructions: CookingInstruction[];
  nutritionInfo: NutritionInfo;
  difficulty: 'easy' | 'medium' | 'hard';
  prepTime: number; // minutes
  cookTime: number; // minutes
  servings: number;
  youtubeSearchQuery?: string;
  youtubeVideoId?: string;
  tags: MealTag[];
  rating?: MealRating;
  isFavorite: boolean;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'morning_snack' | 'afternoon_snack' | 'evening_snack' | 'pre_workout' | 'post_workout' | 'second_lunch' | 'early_dinner' | 'brunch';

export interface Ingredient {
  id: string;
  name: string;
  item?: string; // Legacy field name used in older data formats
  amount: number;
  unit: string;
  category: FoodCategory;
  estimatedCost: number;
  isOptional: boolean;
}

export interface CookingInstruction {
  step: number;
  instruction: string;
  duration?: number; // minutes
  temperature?: number; // celsius
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number; // mg
}

export interface MacroBreakdown {
  protein: number;
  carbs: number;
  fat: number;
}

export type MealTag = 'easy' | 'delicious' | 'meal_prep' | 'quick' | 'budget_friendly' | 'high_protein' | 'low_carb' | 'vegetarian' | 'vegan' | 'gluten_free';

export interface MealRating {
  userId: string;
  mealId: string;
  rating: number; // 1-5 stars
  feedback?: string;
  tags: MealTag[];
  createdAt: string;
}

// Grocery List Types
export interface GroceryList {
  id: string;
  mealPlanId: string;
  items: GroceryItem[];
  totalCost: number;
  currency: string;
  generatedAt: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  category: FoodCategory;
  amount: number;
  unit: string;
  estimatedCost: number;
  isPurchased: boolean;
  isFromInventory: boolean; // if user already has this item
  expirationDate?: string;
  notes?: string;
}

// Favorites and History Types
export interface FavoriteMeal {
  mealId: string;
  meal: Meal;
  addedAt: string;
  timesCooked: number;
  lastCookedAt?: string;
}

export interface MealHistory {
  id: string;
  mealId: string;
  cookedAt: string;
  rating?: number;
  feedback?: string;
  modifications?: string;
}

// API/Generation Types
export interface MealPlanRequest {
  userProfile: UserNutritionProfile;
  startDate: string;
  durationWeeks: number;
  useFavorites: boolean;
  favoriteIds?: string[];
  avoidRecentMeals: boolean;
}

export interface MealGenerationSettings {
  varietyLevel: 'low' | 'medium' | 'high';
  budgetPriority: boolean;
  useInventoryFirst: boolean;
  mealPrepFocus: boolean;
  quickMealsOnly: boolean;
}

// Storage Keys
export const NUTRITION_STORAGE_KEYS = {
  USER_PROFILE: '@nutrition_user_profile',
  CURRENT_MEAL_PLAN: '@nutrition_current_plan',
  MEAL_HISTORY: '@nutrition_meal_history',
  FAVORITE_MEALS: '@nutrition_favorites',
  /**
   * DEAD KEY, kept on purpose. Nothing writes it and nothing reads it since
   * 19 Aug 2026 — see NutritionState above. The constant survives so the key
   * stays documented rather than becoming an unexplained orphan on the devices
   * of anyone who installed before then; `clearAllData` sweeps it by
   * enumeration. Do not add a new writer.
   */
  WEIGHT_ENTRIES: '@nutrition_weight_entries',
  MEAL_RATINGS: '@nutrition_meal_ratings',
  COMPLETED_MEALS: '@nutrition_completed_meals',
  // NEW SIMPLIFIED ARCHITECTURE - Multiple Plans Support
  SIMPLIFIED_MEAL_PLANS: '@nutrition_simplified_plans',
  CURRENT_PLAN_ID: '@nutrition_current_plan_id',
  // Legacy single plan support
  SIMPLIFIED_MEAL_PLAN: '@nutrition_simplified_plan',
  RESULTS: 'nutrition_questionnaire_results',
} as const;

// Utility Types
export interface NutritionState {
  userProfile: UserNutritionProfile | null;
  currentMealPlan: MealPlan | null;
  favoriteMeals: FavoriteMeal[];
  mealHistory: MealHistory[];
  // weightEntries REMOVED 19 Aug 2026. It backed `@nutrition_weight_entries`,
  // a third weight store that no screen wrote to and no component read — it was
  // parsed into memory on every launch and ignored. The real series is
  // `weight_tracking_history`, written through recordWeightEntry in
  // utils/weightHistory.ts, which is what the charts and phase-transition
  // detection read.
  completedMeals: Record<string, boolean>; // key format: "date:mealId"
  isLoading: boolean;
  hasCompletedQuestionnaire: boolean;
  // NEW SIMPLIFIED ARCHITECTURE
  simplifiedMealPlan: SimplifiedMealPlan | null;
}

// NEW SIMPLIFIED CONTEXT OPERATIONS
export interface SimplifiedMealPlanOperations {
  // Core data operations
  loadSimplifiedMealPlan: () => Promise<SimplifiedMealPlan | null>;
  saveSimplifiedMealPlan: (plan: SimplifiedMealPlan) => Promise<void>;
  
  // Day operations
  getMealsForDate: (date: string) => SimplifiedMeal[];
  
  // Meal operations
  addMealToDay: (date: string, meal: Omit<SimplifiedMeal, 'id'>) => Promise<boolean>;
  deleteMealFromDay: (date: string, mealId: string) => Promise<boolean>;
  updateMeal: (date: string, mealId: string, updates: Partial<SimplifiedMeal>) => Promise<boolean>;
  
  // Migration utilities
  convertLegacyMealPlan: (legacyPlan: any) => SimplifiedMealPlan;
}

export interface MealPlanFilters {
  mealTypes: MealType[];
  maxPrepTime?: number;
  maxCookTime?: number;
  difficulty: ('easy' | 'medium' | 'hard')[];
  tags: MealTag[];
  minRating?: number;
}