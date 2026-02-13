export interface UserNutritionProfile {
  id: string;
  goals: NutritionGoals;
  macros: MacroTargets;
  schedule: MealSchedule;
  budget: FoodBudget;
  preferences: FoodPreferences;
  location: UserLocation;
  inventory: FoodInventory[];
  weightTracking: WeightEntry[];
  createdAt: string;
  updatedAt: string;
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

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Ingredient {
  id: string;
  name: string;
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
  WEIGHT_ENTRIES: '@nutrition_weight_entries',
  MEAL_RATINGS: '@nutrition_meal_ratings',
  COMPLETED_MEALS: '@nutrition_completed_meals',
} as const;

// Utility Types
export interface NutritionState {
  userProfile: UserNutritionProfile | null;
  currentMealPlan: MealPlan | null;
  favoriteMeals: FavoriteMeal[];
  mealHistory: MealHistory[];
  weightEntries: WeightEntry[];
  completedMeals: Record<string, boolean>; // key format: "date:mealId"
  isLoading: boolean;
  hasCompletedQuestionnaire: boolean;
}

export interface MealPlanFilters {
  mealTypes: MealType[];
  maxPrepTime?: number;
  maxCookTime?: number;
  difficulty: ('easy' | 'medium' | 'hard')[];
  tags: MealTag[];
  minRating?: number;
}