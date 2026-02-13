import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WorkoutRoutine {
  id: string;
  name: string;
  days: number;
  blocks: number;
  data?: any;
}

export interface MealPlan {
  id: string;
  name: string;
  duration: number; // days
  meals: number; // total meals count
  data?: any; // the full JSON structure
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
    optimizationLevel: 'minimal' | 'moderate' | 'maximum';
  };
  completedAt: string;
}

const STORAGE_KEYS = {
  ROUTINES: 'workout_routines',
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
};

export class WorkoutStorage {
  // Routine management
  static async saveRoutines(routines: WorkoutRoutine[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(routines));
    } catch (error) {
      console.error('Failed to save routines:', error);
    }
  }

  static async loadRoutines(): Promise<WorkoutRoutine[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ROUTINES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load routines:', error);
      return [];
    }
  }

  static async addRoutine(routine: WorkoutRoutine): Promise<void> {
    const routines = await this.loadRoutines();
    routines.push(routine);
    await this.saveRoutines(routines);
  }

  static async removeRoutine(routineId: string): Promise<void> {
    const routines = await this.loadRoutines();
    const filtered = routines.filter(r => r.id !== routineId);
    await this.saveRoutines(filtered);
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
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load meal plans:', error);
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
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load workout history:', error);
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
      if (dayName && blockName) {
        const workoutKey = `${STORAGE_KEYS.CURRENT_WORKOUT}_${dayName}_${blockName}`;
        const data = await AsyncStorage.getItem(workoutKey);
        return data ? JSON.parse(data) : null;
      } else {
        // Fallback to old key for backwards compatibility
        const data = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_WORKOUT);
        return data ? JSON.parse(data) : null;
      }
    } catch (error) {
      console.error('Failed to load current workout:', error);
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
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load exercise preferences:', error);
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
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load nutrition results:', error);
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
      return data ? JSON.parse(data) : {
        nutritionGoals: false,
        budgetCooking: false,
        sleepOptimization: false,
        fridgePantry: false,
        favoriteMeals: false,
      };
    } catch (error) {
      console.error('Failed to load nutrition completion status:', error);
      return {
        nutritionGoals: false,
        budgetCooking: false,
        sleepOptimization: false,
        fridgePantry: false,
        favoriteMeals: false,
      };
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
}