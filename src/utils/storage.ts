import AsyncStorage from '@react-native-async-storage/async-storage';
import RobustStorage from './robustStorage';

export interface WorkoutRoutine {
  id: string;
  name: string;
  days: number;
  blocks: number;
  data?: any;
  programId?: string; // optional link to a Program for mesocycle tracking
  mesocycleNumber?: number; // which mesocycle this routine belongs to
  fingerprint?: string; // content fingerprint for duplicate detection
  createdAt?: number; // timestamp for sorting/organization
}

export interface MealPlan {
  id: string;
  name: string;
  duration: number; // days
  meals: number; // total meals count
  data?: any; // the full JSON structure
  fingerprint?: string; // content fingerprint for duplicate detection
  createdAt?: number; // timestamp for sorting/organization
}

export interface WorkoutHistory {
  id: string;
  routineName: string;
  dayName: string;
  exerciseName: string;
  date: string;
  sets: {
    setNumber: number;
    weight: string;
    reps: string;
    completed: boolean;
    unit?: 'kg' | 'lbs';
    drops?: {
      weight: string;
      reps: string;
      completed?: boolean;
      unit?: 'kg' | 'lbs';
    }[];
  }[];
}

export interface FeedbackEntry {
  id: string;
  feedback: 'positive' | 'negative';
  timestamp: string;
  programId?: string;
  details?: string;
}

export interface ExercisePreference {
  programId: string;
  blockName: string;
  primaryExercise: string; // The original exercise that was programmed
  preferredExercise: string; // The user's preferred alternative
}

export interface NutritionQuestionnaireResults {
  formData: {
    goal: string;
    rate: string;
    gender: string;
    age: string;
    height: string;
    weight: string;
    heightUnit: string;
    weightUnit: string;
    activityLevel: string;
    jobType: string;
  };
  macroResults: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
    bmr: number;
    tdee: number;
    weeklyWeightChange: number;
  };
  completedAt: string;
}

export interface NutritionCompletionStatus {
  nutritionGoals: boolean;
  budgetCooking: boolean;
  sleepOptimization: boolean;
  favoriteMeals: boolean;
  fridgePantry: boolean;
}

export interface BudgetCookingQuestionnaireResults {
  formData: {
    weeklyBudget: string;
    country: string;
    countryCode: string;
    city: string;
    groceryStore: string;
    planningStyle: number;
    cookingEnjoyment: number;
    timeInvestment: number;
    varietySeeking: number;
    skillConfidence: number;
    mealsPerDay: number;
    snackingStyle: string;
    eatingChallenges: string[];
    allergies: string[];
    avoidFoods: string[];
  };
  completedAt: string;
}

export interface SleepOptimizationResults {
  formData: {
    bedtime: string;
    wakeTime: string;
    optimizationLevel: 'standard' | 'sleep_focused' | 'minimal' | 'moderate' | 'maximum';
  };
  completedAt: string;
}

const STORAGE_KEYS = {
  ROUTINES: 'workout_routines',
  MY_ROUTINES: 'my_workout_routines',
  MEAL_PLANS: 'meal_plans',
  HISTORY: 'workout_history',
  CURRENT_WORKOUT: 'current_workout_progress',
  FEEDBACK: 'import_feedback',
  EXERCISE_PREFERENCES: 'exercise_preferences',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  THEME_PREFERENCE: 'theme_preference',
  NUTRITION_QUESTIONNAIRE: 'nutrition_questionnaire_results',
  NUTRITION_COMPLETION_STATUS: 'nutrition_completion_status',
  BUDGET_COOKING_QUESTIONNAIRE: 'budget_cooking_questionnaire_results',
  FRIDGE_PANTRY_QUESTIONNAIRE: 'fridge_pantry_questionnaire_results',
  SLEEP_OPTIMIZATION: 'sleep_optimization_results',
  EQUIPMENT_PREFERENCES: 'equipment_preferences_questionnaire_results',
  FITNESS_GOALS: 'fitness_goals_questionnaire_results',
  FAVORITE_EXERCISES: 'favorite_exercises_results',
  WEIGHT_HISTORY: 'weight_tracking_history',
};

export class WorkoutStorage {
  // Routine management
  static async saveRoutines(routines: WorkoutRoutine[]): Promise<void> {
    try {
      const routinesJson = JSON.stringify(routines);
      
      // Try robust storage first
      let saveSuccess = await RobustStorage.setItem(STORAGE_KEYS.ROUTINES, routinesJson, true);
      
      if (!saveSuccess) {
        console.warn('RobustStorage failed, retrying with regular AsyncStorage...');
        
        // Retry with regular AsyncStorage
        await AsyncStorage.setItem(STORAGE_KEYS.ROUTINES, routinesJson);
        
        // Verify the save worked by reading it back
        const verification = await AsyncStorage.getItem(STORAGE_KEYS.ROUTINES);
        if (verification !== routinesJson) {
          throw new Error('Storage verification failed - data may not have been saved correctly');
        }
        
        console.log('✅ Routines saved successfully with AsyncStorage fallback');
      } else {
        console.log('✅ Routines saved successfully with RobustStorage');
      }
    } catch (error) {
      console.error('❌ Critical error: Failed to save routines:', error);
      throw error; // Re-throw to let caller handle the error
    }
  }

  static async loadRoutines(): Promise<WorkoutRoutine[]> {
    try {
      console.log('🔄 [STORAGE] Attempting to load routines...');
      const robustData = await RobustStorage.getItem(STORAGE_KEYS.ROUTINES, true);
      console.log('🔄 [STORAGE] RobustStorage result:', robustData ? 'Has data' : 'No data');
      
      const fallbackData = await AsyncStorage.getItem(STORAGE_KEYS.ROUTINES);
      console.log('🔄 [STORAGE] AsyncStorage fallback result:', fallbackData ? 'Has data' : 'No data');
      
      const data = robustData || fallbackData;
      console.log('🔄 [STORAGE] Final data to parse:', data ? 'Has data' : 'No data');
      
      if (!data) {
        console.log('🔄 [STORAGE] No routine data found, returning empty array');
        return [];
      }
      
      const result = JSON.parse(data);
      
      // Validate the parsed data structure
      if (!Array.isArray(result)) {
        console.warn('⚠️ [STORAGE] Routine data is not an array, resetting to empty');
        await this.saveRoutines([]); // Reset corrupted data
        return [];
      }
      
      // Validate each routine has required fields
      const validRoutines = result.filter(routine => {
        if (!routine || typeof routine !== 'object') {
          console.warn('⚠️ [STORAGE] Invalid routine found, skipping:', routine);
          return false;
        }
        return true;
      });
      
      if (validRoutines.length !== result.length) {
        console.warn(`⚠️ [STORAGE] Found ${result.length - validRoutines.length} corrupted routines, saving clean data`);
        await this.saveRoutines(validRoutines);
      }
      
      console.log('🔄 [STORAGE] Parsed routines count:', validRoutines.length);
      return validRoutines;
    } catch (error) {
      console.error('❌ [STORAGE] Failed to load routines, resetting data:', error);
      // Reset corrupted data to prevent future crashes
      try {
        await this.saveRoutines([]);
      } catch (resetError) {
        console.error('❌ [STORAGE] Failed to reset corrupted routine data:', resetError);
      }
      return [];
    }
  }

  static async addRoutine(routine: WorkoutRoutine): Promise<void> {
    try {
      const routines = await this.loadRoutines();
      routines.push(routine);
      await this.saveRoutines(routines);
      console.log(`✅ Successfully added routine: ${routine.name}`);
    } catch (error) {
      console.error(`❌ Failed to add routine with RobustStorage: ${routine.name}`, error);
      
      // FALLBACK: Try simple AsyncStorage directly
      try {
        console.log('🔄 Attempting simple AsyncStorage fallback...');
        const simpleRoutines = await AsyncStorage.getItem(STORAGE_KEYS.ROUTINES);
        const parsed = simpleRoutines ? JSON.parse(simpleRoutines) : [];
        parsed.push(routine);
        await AsyncStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(parsed));
        console.log(`✅ Successfully saved routine with simple storage fallback: ${routine.name}`);
        return;
      } catch (fallbackError) {
        console.error('❌ Even simple storage failed:', fallbackError);
      }
      
      throw new Error(`Failed to save workout routine. Please check your device storage and try again.`);
    }
  }

  static async removeRoutine(routineId: string): Promise<void> {
    const routines = await this.loadRoutines();
    const filtered = routines.filter(r => r.id !== routineId);
    await this.saveRoutines(filtered);
  }

  static async updateRoutine(updatedRoutine: WorkoutRoutine): Promise<void> {
    const routines = await this.loadRoutines();
    const index = routines.findIndex(r => r.id === updatedRoutine.id);
    if (index !== -1) {
      routines[index] = updatedRoutine;
      await this.saveRoutines(routines);
    }
  }

  // My Routines management (saved collection)
  static async saveMyRoutines(routines: WorkoutRoutine[]): Promise<void> {
    try {
      const saveSuccess = await RobustStorage.setItem(STORAGE_KEYS.MY_ROUTINES, JSON.stringify(routines), true);
      if (!saveSuccess) {
        await AsyncStorage.setItem(STORAGE_KEYS.MY_ROUTINES, JSON.stringify(routines));
      }
    } catch (error) {
      console.error('Failed to save my routines:', error);
    }
  }

  static async loadMyRoutines(): Promise<WorkoutRoutine[]> {
    try {
      const data = await RobustStorage.getItem(STORAGE_KEYS.MY_ROUTINES, true) || await AsyncStorage.getItem(STORAGE_KEYS.MY_ROUTINES);
      
      if (!data) {
        console.log('🔄 [STORAGE] No my routines data found, returning empty array');
        return [];
      }
      
      const parsed = JSON.parse(data);
      
      if (!Array.isArray(parsed)) {
        console.warn('⚠️ [STORAGE] My routines data is not an array, resetting to empty');
        await this.saveMyRoutines([]);
        return [];
      }
      
      // Validate each routine
      const validRoutines = parsed.filter(routine => {
        if (!routine || typeof routine !== 'object') {
          console.warn('⚠️ [STORAGE] Invalid my routine found, skipping:', routine);
          return false;
        }
        return true;
      });
      
      if (validRoutines.length !== parsed.length) {
        console.warn(`⚠️ [STORAGE] Found ${parsed.length - validRoutines.length} corrupted my routines, saving clean data`);
        await this.saveMyRoutines(validRoutines);
      }
      
      console.log('🔄 [STORAGE] Loaded my routines count:', validRoutines.length);
      return validRoutines;
    } catch (error) {
      console.error('❌ [STORAGE] Failed to load my routines, resetting data:', error);
      // Reset corrupted data to prevent future crashes
      try {
        await this.saveMyRoutines([]);
      } catch (resetError) {
        console.error('❌ [STORAGE] Failed to reset corrupted my routines data:', resetError);
      }
      return [];
    }
  }

  static async addMyRoutine(routine: WorkoutRoutine): Promise<void> {
    const myRoutines = await this.loadMyRoutines();
    if (!Array.isArray(myRoutines)) {
      console.warn('⚠️ My routines data corrupted in addMyRoutine, creating new array');
      const safeRoutines = [routine];
      await this.saveMyRoutines(safeRoutines);
      return;
    }
    myRoutines.push(routine);
    await this.saveMyRoutines(myRoutines);
  }

  static async removeMyRoutine(routineId: string): Promise<void> {
    const myRoutines = await this.loadMyRoutines();
    if (!Array.isArray(myRoutines)) {
      console.warn('⚠️ My routines data corrupted in removeMyRoutine, resetting to empty array');
      await this.saveMyRoutines([]);
      return;
    }
    const filtered = myRoutines.filter(r => r.id !== routineId && r.fingerprint !== routineId);
    await this.saveMyRoutines(filtered);
  }

  // Meal plan management
  static async saveMealPlans(mealPlans: MealPlan[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MEAL_PLANS, JSON.stringify(mealPlans));
    } catch (error) {
      console.error('Failed to save meal plans:', error);
    }
  }

  static async loadMealPlans(): Promise<MealPlan[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MEAL_PLANS);
      
      if (!data) {
        console.log('🔄 [STORAGE] No meal plans data found, returning empty array');
        return [];
      }
      
      const result = JSON.parse(data);
      
      // Validate the parsed data structure
      if (!Array.isArray(result)) {
        console.warn('⚠️ [STORAGE] Meal plans data is not an array, resetting to empty');
        await this.saveMealPlans([]);
        return [];
      }
      
      // Validate each meal plan has required fields
      const validMealPlans = result.filter(plan => {
        if (!plan || typeof plan !== 'object' || !plan.id || !plan.name) {
          console.warn('⚠️ [STORAGE] Invalid meal plan found, skipping:', plan);
          return false;
        }
        return true;
      });
      
      if (validMealPlans.length !== result.length) {
        console.warn(`⚠️ [STORAGE] Found ${result.length - validMealPlans.length} corrupted meal plans, saving clean data`);
        await this.saveMealPlans(validMealPlans);
      }
      
      console.log('🔄 [STORAGE] Parsed meal plans count:', validMealPlans.length);
      return validMealPlans;
    } catch (error) {
      console.error('❌ [STORAGE] Failed to load meal plans, resetting data:', error);
      // Reset corrupted data to prevent future crashes
      try {
        await this.saveMealPlans([]);
      } catch (resetError) {
        console.error('❌ [STORAGE] Failed to reset corrupted meal plans data:', resetError);
      }
      return [];
    }
  }

  static async addMealPlan(mealPlan: MealPlan): Promise<void> {
    const mealPlans = await this.loadMealPlans();
    mealPlans.push(mealPlan);
    await this.saveMealPlans(mealPlans);
  }

  static async removeMealPlan(mealPlanId: string): Promise<void> {
    const mealPlans = await this.loadMealPlans();
    const filtered = mealPlans.filter(p => p.id !== mealPlanId);
    await this.saveMealPlans(filtered);
  }

  // Workout history management
  static async saveWorkoutHistory(history: WorkoutHistory[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save workout history:', error);
    }
  }

  static async loadWorkoutHistory(): Promise<WorkoutHistory[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
      
      if (!data) {
        console.log('🔄 [STORAGE] No workout history data found, returning empty array');
        return [];
      }
      
      const result = JSON.parse(data);
      
      // Validate the parsed data structure
      if (!Array.isArray(result)) {
        console.warn('⚠️ [STORAGE] Workout history data is not an array, resetting to empty');
        await this.saveWorkoutHistory([]);
        return [];
      }
      
      // Validate each workout entry has required fields
      const validEntries = result.filter(entry => {
        if (!entry || typeof entry !== 'object' || !entry.exerciseName || !entry.date) {
          console.warn('⚠️ [STORAGE] Invalid workout entry found, skipping:', entry);
          return false;
        }
        return true;
      });
      
      if (validEntries.length !== result.length) {
        console.warn(`⚠️ [STORAGE] Found ${result.length - validEntries.length} corrupted workout entries, saving clean data`);
        await this.saveWorkoutHistory(validEntries);
      }
      
      console.log('🔄 [STORAGE] Parsed workout history count:', validEntries.length, 'entries');
      return validEntries;
    } catch (error) {
      console.error('❌ [STORAGE] Failed to load workout history, resetting data:', error);
      // Reset corrupted data to prevent future crashes
      try {
        await this.saveWorkoutHistory([]);
      } catch (resetError) {
        console.error('❌ [STORAGE] Failed to reset corrupted workout history:', resetError);
      }
      return [];
    }
  }

  static async addWorkoutEntry(entry: WorkoutHistory): Promise<void> {
    const history = await this.loadWorkoutHistory();
    history.push(entry);
    await this.saveWorkoutHistory(history);
  }

  static async getExerciseHistory(exerciseName: string): Promise<WorkoutHistory[]> {
    const history = await this.loadWorkoutHistory();
    return history.filter(entry => entry.exerciseName === exerciseName);
  }

  // Current workout progress (for resuming sessions)
  static async saveCurrentWorkout(workoutData: any): Promise<void> {
    try {
      const dataWithTimestamp = {
        ...workoutData,
        savedAt: Date.now()
      };
      const workoutKey = `${STORAGE_KEYS.CURRENT_WORKOUT}_${workoutData.day?.day_name}_${workoutData.blockName}`;
      await AsyncStorage.setItem(workoutKey, JSON.stringify(dataWithTimestamp));
    } catch (error) {
      console.error('Failed to save current workout:', error);
    }
  }

  static async loadCurrentWorkout(dayName?: string, blockName?: string): Promise<any> {
    try {
      let data: string | null = null;
      let workoutKey: string;
      
      if (dayName && blockName) {
        workoutKey = `${STORAGE_KEYS.CURRENT_WORKOUT}_${dayName}_${blockName}`;
        data = await AsyncStorage.getItem(workoutKey);
      }
      
      // Fallback to old key for backwards compatibility
      if (!data) {
        workoutKey = STORAGE_KEYS.CURRENT_WORKOUT;
        data = await AsyncStorage.getItem(workoutKey);
      }
      
      if (!data) {
        console.log('🔄 [STORAGE] No current workout data found');
        return null;
      }
      
      const result = JSON.parse(data);
      
      // Validate the parsed data structure
      if (!result || typeof result !== 'object') {
        console.warn('⚠️ [STORAGE] Current workout data is invalid, removing');
        await AsyncStorage.removeItem(workoutKey);
        return null;
      }
      
      console.log('🔄 [STORAGE] Current workout loaded successfully');
      return result;
    } catch (error) {
      console.error('❌ [STORAGE] Failed to load current workout, removing corrupted data:', error);
      // Clean up corrupted data
      try {
        if (dayName && blockName) {
          await AsyncStorage.removeItem(`${STORAGE_KEYS.CURRENT_WORKOUT}_${dayName}_${blockName}`);
        }
        await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_WORKOUT);
      } catch (cleanupError) {
        console.error('❌ [STORAGE] Failed to cleanup corrupted workout data:', cleanupError);
      }
      return null;
    }
  }

  static async clearCurrentWorkout(dayName?: string, blockName?: string): Promise<void> {
    try {
      if (dayName && blockName) {
        const workoutKey = `${STORAGE_KEYS.CURRENT_WORKOUT}_${dayName}_${blockName}`;
        await AsyncStorage.removeItem(workoutKey);
      } else {
        // Clear old key for backwards compatibility
        await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_WORKOUT);
      }
    } catch (error) {
      console.error('Failed to clear current workout:', error);
    }
  }

  // Feedback management
  static async saveFeedback(feedback: FeedbackEntry): Promise<void> {
    try {
      const existingFeedback = await this.loadFeedback();
      
      // Check if feedback already exists for this program to avoid duplicates
      if (feedback.programId) {
        const existingEntry = existingFeedback.find(f => f.programId === feedback.programId);
        if (existingEntry) {
          return; // Don't save duplicate feedback for same program
        }
      }
      
      existingFeedback.push(feedback);
      await AsyncStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(existingFeedback));
    } catch (error) {
      console.error('Failed to save feedback:', error);
    }
  }

  static async loadFeedback(): Promise<FeedbackEntry[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FEEDBACK);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load feedback:', error);
      return [];
    }
  }

  // TODO: Future enhancement - sync feedback to analytics endpoint
  // static async syncFeedbackToServer(): Promise<void> {
  //   const feedback = await this.loadFeedback();
  //   const unsynced = feedback.filter(f => !f.synced);
  //   
  //   for (const entry of unsynced) {
  //     try {
  //       await fetch('/api/feedback', {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify(entry)
  //       });
  //       entry.synced = true;
  //     } catch (error) {
  //       console.error('Failed to sync feedback entry:', entry.id);
  //     }
  //   }
  //   
  //   await AsyncStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(feedback));
  // }

  static async hasFeedbackForProgram(programId: string): Promise<boolean> {
    try {
      const feedback = await this.loadFeedback();
      return feedback.some(f => f.programId === programId);
    } catch (error) {
      console.error('Failed to check feedback for program:', error);
      return false;
    }
  }

  // Onboarding management
  static async setOnboardingCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
    } catch (error) {
      console.error('Failed to set onboarding completed:', error);
    }
  }

  static async isOnboardingCompleted(): Promise<boolean> {
    try {
      const completed = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      return completed === 'true';
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      return false;
    }
  }

  // Exercise preferences management
  static async saveExercisePreference(preference: ExercisePreference): Promise<void> {
    try {
      const preferences = await this.loadExercisePreferences();
      
      // Safety check: ensure preferences is an array
      if (!Array.isArray(preferences)) {
        console.warn('Exercise preferences is not an array, resetting to empty array');
        const newPreferences = [preference];
        await AsyncStorage.setItem(STORAGE_KEYS.EXERCISE_PREFERENCES, JSON.stringify(newPreferences));
        return;
      }
      
      // Remove existing preference for same program/block/exercise combo
      const filtered = preferences.filter(p => 
        !(p.programId === preference.programId && 
          p.blockName === preference.blockName && 
          p.primaryExercise === preference.primaryExercise)
      );
      
      filtered.push(preference);
      await AsyncStorage.setItem(STORAGE_KEYS.EXERCISE_PREFERENCES, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to save exercise preference:', error);
    }
  }

  static async loadExercisePreferences(): Promise<ExercisePreference[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.EXERCISE_PREFERENCES);
      if (!data) {
        return [];
      }
      
      const parsed = JSON.parse(data);
      
      // Ensure the parsed data is an array
      if (!Array.isArray(parsed)) {
        console.warn('Exercise preferences data is corrupted, resetting to empty array');
        await AsyncStorage.setItem(STORAGE_KEYS.EXERCISE_PREFERENCES, JSON.stringify([]));
        return [];
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to load exercise preferences:', error);
      // If JSON parsing fails, reset the corrupted data
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.EXERCISE_PREFERENCES, JSON.stringify([]));
      } catch (resetError) {
        console.error('Failed to reset corrupted exercise preferences:', resetError);
      }
      return [];
    }
  }

  static async getExercisePreference(
    programId: string, 
    blockName: string, 
    primaryExercise: string
  ): Promise<string | null> {
    try {
      const preferences = await this.loadExercisePreferences();
      // Safety check: ensure preferences is an array
      if (!Array.isArray(preferences)) {
        console.warn('Exercise preferences is not an array, returning null');
        return null;
      }
      const preference = preferences.find(p => 
        p.programId === programId && 
        p.blockName === blockName && 
        p.primaryExercise === primaryExercise
      );
      return preference ? preference.preferredExercise : null;
    } catch (error) {
      console.error('Failed to get exercise preference:', error);
      return null;
    }
  }

  // Theme preference management
  static async saveThemePreference(isPinkTheme: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME_PREFERENCE, JSON.stringify(isPinkTheme));
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }

  static async loadThemePreference(): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.THEME_PREFERENCE);
      return data ? JSON.parse(data) : false; // Default to boy theme (blue)
    } catch (error) {
      console.error('Failed to load theme preference:', error);
      return false; // Default to boy theme (blue)
    }
  }

  // Utility methods
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ROUTINES,
        STORAGE_KEYS.MY_ROUTINES,
        STORAGE_KEYS.MEAL_PLANS,
        STORAGE_KEYS.HISTORY,
        STORAGE_KEYS.CURRENT_WORKOUT,
        STORAGE_KEYS.FEEDBACK,
        STORAGE_KEYS.EXERCISE_PREFERENCES,
        STORAGE_KEYS.ONBOARDING_COMPLETED,
        STORAGE_KEYS.THEME_PREFERENCE,
        STORAGE_KEYS.NUTRITION_QUESTIONNAIRE,
        STORAGE_KEYS.NUTRITION_COMPLETION_STATUS,
        STORAGE_KEYS.BUDGET_COOKING_QUESTIONNAIRE,
        STORAGE_KEYS.FRIDGE_PANTRY_QUESTIONNAIRE,
      ]);
    } catch (error) {
      console.error('Failed to clear all data:', error);
    }
  }

  // Nutrition questionnaire management
  static async saveNutritionResults(results: NutritionQuestionnaireResults): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.NUTRITION_QUESTIONNAIRE, JSON.stringify(results));
      
      // Also update completion status
      const completionStatus = await this.loadNutritionCompletionStatus();
      completionStatus.nutritionGoals = true;
      await this.saveNutritionCompletionStatus(completionStatus);
    } catch (error) {
      console.error('Failed to save nutrition results:', error);
    }
  }

  static async loadNutritionResults(): Promise<NutritionQuestionnaireResults | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.NUTRITION_QUESTIONNAIRE);
      
      if (!data) {
        console.log('🔄 [STORAGE] No nutrition questionnaire data found');
        return null;
      }
      
      const result = JSON.parse(data);
      
      // Validate the parsed data structure
      if (!result || typeof result !== 'object') {
        console.warn('⚠️ [STORAGE] Nutrition results data is invalid, resetting');
        await AsyncStorage.removeItem(STORAGE_KEYS.NUTRITION_QUESTIONNAIRE);
        return null;
      }
      
      console.log('🔄 [STORAGE] Nutrition results loaded successfully');
      return result;
    } catch (error) {
      console.error('❌ [STORAGE] Failed to load nutrition results, resetting:', error);
      // Reset corrupted data
      try {
        await AsyncStorage.removeItem(STORAGE_KEYS.NUTRITION_QUESTIONNAIRE);
      } catch (resetError) {
        console.error('❌ [STORAGE] Failed to reset corrupted nutrition data:', resetError);
      }
      return null;
    }
  }

  static async saveNutritionCompletionStatus(status: NutritionCompletionStatus): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.NUTRITION_COMPLETION_STATUS, JSON.stringify(status));
    } catch (error) {
      console.error('Failed to save nutrition completion status:', error);
    }
  }

  static async loadNutritionCompletionStatus(): Promise<NutritionCompletionStatus> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.NUTRITION_COMPLETION_STATUS);
      
      const defaultStatus: NutritionCompletionStatus = {
        nutritionGoals: false,
        budgetCooking: false,
        sleepOptimization: false,
        fridgePantry: false,
        favoriteMeals: false,
      };
      
      if (!data) {
        console.log('🔄 [STORAGE] No nutrition completion status found, using defaults');
        return defaultStatus;
      }
      
      const result = JSON.parse(data);
      
      // Validate the parsed data structure
      if (!result || typeof result !== 'object') {
        console.warn('⚠️ [STORAGE] Nutrition completion status is invalid, using defaults');
        await this.saveNutritionCompletionStatus(defaultStatus);
        return defaultStatus;
      }
      
      // Ensure all required fields exist with proper boolean values
      const validatedStatus: NutritionCompletionStatus = {
        nutritionGoals: !!result.nutritionGoals,
        budgetCooking: !!result.budgetCooking,
        sleepOptimization: !!result.sleepOptimization,
        fridgePantry: !!result.fridgePantry,
        favoriteMeals: !!result.favoriteMeals,
      };
      
      console.log('🔄 [STORAGE] Nutrition completion status loaded successfully');
      return validatedStatus;
    } catch (error) {
      console.error('❌ [STORAGE] Failed to load nutrition completion status, using defaults:', error);
      const defaultStatus: NutritionCompletionStatus = {
        nutritionGoals: false,
        budgetCooking: false,
        sleepOptimization: false,
        fridgePantry: false,
        favoriteMeals: false,
      };
      
      // Reset corrupted data
      try {
        await this.saveNutritionCompletionStatus(defaultStatus);
      } catch (resetError) {
        console.error('❌ [STORAGE] Failed to reset corrupted nutrition completion status:', resetError);
      }
      
      return defaultStatus;
    }
  }

  // Budget cooking questionnaire management
  static async saveBudgetCookingResults(results: BudgetCookingQuestionnaireResults): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BUDGET_COOKING_QUESTIONNAIRE, JSON.stringify(results));
      
      // Also update completion status
      const completionStatus = await this.loadNutritionCompletionStatus();
      completionStatus.budgetCooking = true;
      await this.saveNutritionCompletionStatus(completionStatus);
    } catch (error) {
      console.error('Failed to save budget cooking results:', error);
    }
  }

  static async loadBudgetCookingResults(): Promise<BudgetCookingQuestionnaireResults | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BUDGET_COOKING_QUESTIONNAIRE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load budget cooking results:', error);
      return null;
    }
  }

  // Sleep optimization questionnaire management
  static async saveSleepOptimizationResults(results: SleepOptimizationResults): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SLEEP_OPTIMIZATION, JSON.stringify(results));
      
      // Also update completion status
      const completionStatus = await this.loadNutritionCompletionStatus();
      completionStatus.sleepOptimization = true;
      await this.saveNutritionCompletionStatus(completionStatus);
    } catch (error) {
      console.error('Failed to save sleep optimization results:', error);
    }
  }

  static async loadSleepOptimizationResults(): Promise<SleepOptimizationResults | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SLEEP_OPTIMIZATION);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load sleep optimization results:', error);
      return null;
    }
  }

  // Fridge pantry questionnaire management
  static async saveFridgePantryResults(results: any): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FRIDGE_PANTRY_QUESTIONNAIRE, JSON.stringify(results));
      
      // Also update completion status
      const completionStatus = await this.loadNutritionCompletionStatus();
      completionStatus.fridgePantry = true;
      await this.saveNutritionCompletionStatus(completionStatus);
    } catch (error) {
      console.error('Failed to save fridge pantry results:', error);
    }
  }

  static async loadFridgePantryResults(): Promise<any | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FRIDGE_PANTRY_QUESTIONNAIRE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load fridge pantry results:', error);
      return null;
    }
  }

  // Workout-specific methods for "Today" button functionality
  static async getActiveBlock(routineId: string): Promise<number | null> {
    try {
      const data = await AsyncStorage.getItem(`activeBlock_${routineId}`);
      return data ? parseInt(data) : null;
    } catch (error) {
      console.error('Failed to get active block:', error);
      return null;
    }
  }

  static async getBookmark(blockName: string): Promise<{ week: number; isBookmarked: boolean } | null> {
    try {
      const data = await AsyncStorage.getItem(`bookmark_${blockName}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get bookmark:', error);
      return null;
    }
  }

  static async getCompletedWorkouts(blockName: string, week: number): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(`completed_${blockName}_week${week}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get completed workouts:', error);
      return [];
    }
  }

  // Clean up corrupted or test completion data
  static async cleanupCorruptedCompletionData(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Find all completion and bookmark keys
      const completionKeys = allKeys.filter(key => 
        key.startsWith('completed_') || 
        key.startsWith('bookmark_') ||
        key.includes('ads') || 
        key.includes('asdads') ||
        key.includes('test')
      );

      if (completionKeys.length > 0) {
        console.log('🧹 Cleaning up corrupted completion data:', completionKeys.length, 'keys');
        await AsyncStorage.multiRemove(completionKeys);
        console.log('✅ Cleanup complete');
      }
    } catch (error) {
      console.error('Failed to cleanup corrupted data:', error);
    }
  }

  // Equipment & Preferences Questionnaire Storage
  static async saveEquipmentPreferencesResults(results: any): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EQUIPMENT_PREFERENCES, JSON.stringify(results));
      console.log('Equipment preferences results saved successfully');
    } catch (error) {
      console.error('Failed to save equipment preferences results:', error);
      throw error;
    }
  }

  static async loadEquipmentPreferencesResults(): Promise<any | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.EQUIPMENT_PREFERENCES);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load equipment preferences results:', error);
      return null;
    }
  }

  // Data recovery and cleanup utilities
  static async performDataRecovery(): Promise<void> {
    console.log('🔧 [STORAGE] Performing data recovery and cleanup...');
    
    try {
      // Test and fix routine data
      const routines = await this.loadRoutines();
      console.log('✅ [STORAGE] Routines data recovered:', routines.length, 'routines');
      
      // Test and fix my routines data
      const myRoutines = await this.loadMyRoutines();
      console.log('✅ [STORAGE] My routines data recovered:', myRoutines.length, 'routines');
      
      // Test and fix meal plans data
      const mealPlans = await this.loadMealPlans();
      console.log('✅ [STORAGE] Meal plans data recovered:', mealPlans.length, 'plans');
      
      // Test and fix nutrition completion status
      const nutritionStatus = await this.loadNutritionCompletionStatus();
      console.log('✅ [STORAGE] Nutrition completion status recovered');
      
      // Test and fix nutrition questionnaire results
      const nutritionResults = await this.loadNutritionResults();
      console.log('✅ [STORAGE] Nutrition results recovered:', nutritionResults ? 'has data' : 'no data');
      
      // Test and fix workout history (critical user progress data)
      const workoutHistory = await this.loadWorkoutHistory();
      console.log('✅ [STORAGE] Workout history recovered:', workoutHistory.length, 'entries');
      
      // Test and fix current workout progress
      const currentWorkout = await this.loadCurrentWorkout();
      console.log('✅ [STORAGE] Current workout recovered:', currentWorkout ? 'has active workout' : 'no active workout');
      
      // Test and fix weight history (critical user progress data)
      const weightHistory = await this.loadWeightHistory();
      console.log('✅ [STORAGE] Weight history recovered:', weightHistory ? weightHistory.length : 0, 'entries');
      
      console.log('🎉 [STORAGE] Data recovery completed successfully');
    } catch (error) {
      console.error('❌ [STORAGE] Data recovery failed:', error);
    }
  }

  // Fitness Goals Questionnaire Storage
  static async saveFitnessGoalsResults(results: any): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FITNESS_GOALS, JSON.stringify(results));
      console.log('Fitness goals results saved successfully');
    } catch (error) {
      console.error('Failed to save fitness goals results:', error);
      throw error;
    }
  }

  static async loadFitnessGoalsResults(): Promise<any | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FITNESS_GOALS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load fitness goals results:', error);
      return null;
    }
  }

  // Favorite Exercises Storage
  static async saveFavoriteExercisesResults(results: any): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_EXERCISES, JSON.stringify(results));
      console.log('Favorite exercises results saved successfully');
    } catch (error) {
      console.error('Failed to save favorite exercises results:', error);
      throw error;
    }
  }

  static async loadFavoriteExercisesResults(): Promise<any | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITE_EXERCISES);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load favorite exercises results:', error);
      return null;
    }
  }

  // Weight History Storage - Critical user progress data
  static async saveWeightHistory(history: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.WEIGHT_HISTORY, JSON.stringify(history));
      console.log('Weight history saved successfully');
    } catch (error) {
      console.error('Failed to save weight history:', error);
      throw error;
    }
  }

  static async loadWeightHistory(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.WEIGHT_HISTORY);
      
      if (!data) {
        console.log('🔄 [STORAGE] No weight history data found, returning empty array');
        return [];
      }
      
      const result = JSON.parse(data);
      
      // Validate the parsed data structure
      if (!Array.isArray(result)) {
        console.warn('⚠️ [STORAGE] Weight history data is not an array, resetting to empty');
        await this.saveWeightHistory([]);
        return [];
      }
      
      // Validate each weight entry has required fields
      const validEntries = result.filter(entry => {
        if (!entry || typeof entry !== 'object' || !entry.weight || !entry.date) {
          console.warn('⚠️ [STORAGE] Invalid weight entry found, skipping:', entry);
          return false;
        }
        return true;
      });
      
      if (validEntries.length !== result.length) {
        console.warn(`⚠️ [STORAGE] Found ${result.length - validEntries.length} corrupted weight entries, saving clean data`);
        await this.saveWeightHistory(validEntries);
      }
      
      console.log('🔄 [STORAGE] Parsed weight history count:', validEntries.length, 'entries');
      return validEntries;
    } catch (error) {
      console.error('❌ [STORAGE] Failed to load weight history, resetting data:', error);
      // Reset corrupted data to prevent future crashes
      try {
        await this.saveWeightHistory([]);
      } catch (resetError) {
        console.error('❌ [STORAGE] Failed to reset corrupted weight history:', resetError);
      }
      return [];
    }
  }
}