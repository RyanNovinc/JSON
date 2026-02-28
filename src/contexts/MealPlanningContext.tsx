import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateMockMealPlan, getMealRecommendations, generateGoalBasedMeals } from '../utils/mockMealGeneration';
import {
  UserNutritionProfile,
  MealPlan,
  FavoriteMeal,
  MealHistory,
  WeightEntry,
  MealRating,
  NutritionState,
  NUTRITION_STORAGE_KEYS,
  Meal,
  GroceryList,
  MealPlanRequest,
} from '../types/nutrition';

interface MealPlanningContextType extends NutritionState {
  // Profile Management
  saveUserProfile: (profile: UserNutritionProfile) => Promise<void>;
  updateUserProfile: (updates: Partial<UserNutritionProfile>) => Promise<void>;
  
  // Meal Plan Management
  generateMealPlan: (request: MealPlanRequest) => Promise<void>;
  saveMealPlan: (mealPlan: MealPlan) => Promise<void>;
  clearCurrentMealPlan: () => Promise<void>;
  getMealPlan: (date: string) => MealPlan | null;
  
  // Favorites Management
  addToFavorites: (meal: Meal) => Promise<void>;
  removeFromFavorites: (mealId: string) => Promise<void>;
  getFavoriteMeals: () => FavoriteMeal[];
  
  // Rating System
  rateMeal: (mealId: string, rating: number, feedback?: string) => Promise<void>;
  getMealRating: (mealId: string) => MealRating | null;
  
  // Weight Tracking
  addWeightEntry: (entry: WeightEntry) => Promise<void>;
  getLatestWeight: () => WeightEntry | null;
  updateMacrosBasedOnWeight: () => Promise<void>;
  
  // Meal History
  addMealToHistory: (mealId: string, modifications?: string) => Promise<void>;
  getMealHistory: () => MealHistory[];
  
  // Meal Completion
  markMealCompleted: (mealId: string, date: string, completed: boolean) => Promise<void>;
  isMealCompleted: (mealId: string, date: string) => boolean;
  getDailyCompletionProgress: (date: string) => { completed: number; total: number };
  
  // Grocery List
  getGroceryList: () => GroceryList | null;
  updateGroceryItem: (itemId: string, purchased: boolean) => Promise<void>;
  addGroceryItem: (item: Omit<GroceryItem, 'id'>) => Promise<void>;
  
  // Utility Functions
  clearAllData: () => Promise<void>;
  hasCompletedSetup: () => boolean;
  refreshData: () => Promise<void>;
}

const MealPlanningContext = createContext<MealPlanningContextType | undefined>(undefined);

interface MealPlanningProviderProps {
  children: ReactNode;
}

export const MealPlanningProvider: React.FC<MealPlanningProviderProps> = ({ children }) => {
  const [state, setState] = useState<NutritionState>({
    userProfile: null,
    currentMealPlan: null,
    favoriteMeals: [],
    mealHistory: [],
    weightEntries: [],
    completedMeals: {},
    isLoading: true,
    hasCompletedQuestionnaire: false,
  });

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const [
        userProfile,
        currentMealPlan,
        favoriteMeals,
        mealHistory,
        weightEntries,
        mealRatings,
        completedMeals,
      ] = await Promise.all([
        loadUserProfile(),
        loadCurrentMealPlan(),
        loadFavoriteMeals(),
        loadMealHistory(),
        loadWeightEntries(),
        loadMealRatings(),
        loadCompletedMeals(),
      ]);

      setState({
        userProfile,
        currentMealPlan,
        favoriteMeals,
        mealHistory,
        weightEntries,
        completedMeals: completedMeals || {},
        isLoading: false,
        hasCompletedQuestionnaire: !!userProfile,
      });
    } catch (error) {
      console.error('Failed to load nutrition data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const loadUserProfile = async (): Promise<UserNutritionProfile | null> => {
    try {
      const data = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.USER_PROFILE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load user profile:', error);
      return null;
    }
  };

  const loadCurrentMealPlan = async (): Promise<MealPlan | null> => {
    try {
      const data = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load meal plan:', error);
      return null;
    }
  };

  const loadFavoriteMeals = async (): Promise<FavoriteMeal[]> => {
    try {
      const data = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.FAVORITE_MEALS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load favorite meals:', error);
      return [];
    }
  };

  const loadMealHistory = async (): Promise<MealHistory[]> => {
    try {
      const data = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.MEAL_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load meal history:', error);
      return [];
    }
  };

  const loadWeightEntries = async (): Promise<WeightEntry[]> => {
    try {
      const data = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.WEIGHT_ENTRIES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load weight entries:', error);
      return [];
    }
  };

  const loadMealRatings = async (): Promise<MealRating[]> => {
    try {
      const data = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.MEAL_RATINGS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load meal ratings:', error);
      return [];
    }
  };

  const loadCompletedMeals = async (): Promise<Record<string, boolean>> => {
    try {
      const data = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.COMPLETED_MEALS);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to load completed meals:', error);
      return {};
    }
  };

  const saveUserProfile = async (profile: UserNutritionProfile) => {
    try {
      const profileWithTimestamp = {
        ...profile,
        updatedAt: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(
        NUTRITION_STORAGE_KEYS.USER_PROFILE,
        JSON.stringify(profileWithTimestamp)
      );
      
      setState(prev => ({
        ...prev,
        userProfile: profileWithTimestamp,
        hasCompletedQuestionnaire: true,
      }));
    } catch (error) {
      console.error('Failed to save user profile:', error);
      throw error;
    }
  };

  const updateUserProfile = async (updates: Partial<UserNutritionProfile>) => {
    if (!state.userProfile) return;

    const updatedProfile = {
      ...state.userProfile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await saveUserProfile(updatedProfile);
  };

  const generateMealPlan = async (request: MealPlanRequest) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Use enhanced AI-like meal generation
      const mealPlan = generateMockMealPlan(request);
      
      await saveMealPlan(mealPlan);
      
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Failed to generate meal plan:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const saveMealPlan = async (mealPlan: MealPlan) => {
    try {
      await AsyncStorage.setItem(
        NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN,
        JSON.stringify(mealPlan)
      );
      
      setState(prev => ({
        ...prev,
        currentMealPlan: mealPlan,
      }));
    } catch (error) {
      console.error('Failed to save meal plan:', error);
      throw error;
    }
  };

  const clearCurrentMealPlan = async () => {
    try {
      await AsyncStorage.removeItem(NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN);
      
      setState(prev => ({
        ...prev,
        currentMealPlan: null,
      }));
    } catch (error) {
      console.error('Failed to clear current meal plan:', error);
      throw error;
    }
  };

  const getMealPlan = (date: string): MealPlan | null => {
    if (!state.currentMealPlan) return null;
    
    const planDate = new Date(date);
    const planStart = new Date(state.currentMealPlan.startDate);
    const planEnd = new Date(state.currentMealPlan.endDate);
    
    return planDate >= planStart && planDate <= planEnd ? state.currentMealPlan : null;
  };

  const addToFavorites = async (meal: Meal) => {
    try {
      const favorite: FavoriteMeal = {
        mealId: meal.id,
        meal,
        addedAt: new Date().toISOString(),
        timesCooked: 0,
      };

      const updatedFavorites = [...state.favoriteMeals, favorite];
      
      await AsyncStorage.setItem(
        NUTRITION_STORAGE_KEYS.FAVORITE_MEALS,
        JSON.stringify(updatedFavorites)
      );
      
      setState(prev => ({
        ...prev,
        favoriteMeals: updatedFavorites,
      }));
    } catch (error) {
      console.error('Failed to add to favorites:', error);
      throw error;
    }
  };

  const removeFromFavorites = async (mealId: string) => {
    try {
      const updatedFavorites = state.favoriteMeals.filter(fav => fav.mealId !== mealId);
      
      await AsyncStorage.setItem(
        NUTRITION_STORAGE_KEYS.FAVORITE_MEALS,
        JSON.stringify(updatedFavorites)
      );
      
      setState(prev => ({
        ...prev,
        favoriteMeals: updatedFavorites,
      }));
    } catch (error) {
      console.error('Failed to remove from favorites:', error);
      throw error;
    }
  };

  const getFavoriteMeals = (): FavoriteMeal[] => {
    return state.favoriteMeals;
  };

  const rateMeal = async (mealId: string, rating: number, feedback?: string) => {
    try {
      const mealRating: MealRating = {
        userId: state.userProfile?.id || 'unknown',
        mealId,
        rating,
        feedback,
        tags: [], // TODO: Allow user to select tags
        createdAt: new Date().toISOString(),
      };

      const existingRatings = await loadMealRatings();
      const updatedRatings = existingRatings.filter(r => r.mealId !== mealId);
      updatedRatings.push(mealRating);
      
      await AsyncStorage.setItem(
        NUTRITION_STORAGE_KEYS.MEAL_RATINGS,
        JSON.stringify(updatedRatings)
      );
      
      // Update the meal in current plan if it exists
      if (state.currentMealPlan) {
        const updatedPlan = { ...state.currentMealPlan };
        updatedPlan.days.forEach(day => {
          day.meals.forEach(meal => {
            if (meal.id === mealId) {
              meal.rating = mealRating;
            }
          });
        });
        
        setState(prev => ({
          ...prev,
          currentMealPlan: updatedPlan,
        }));
      }
    } catch (error) {
      console.error('Failed to rate meal:', error);
      throw error;
    }
  };

  const getMealRating = (mealId: string): MealRating | null => {
    // TODO: Load from storage if needed
    return null;
  };

  const addWeightEntry = async (entry: WeightEntry) => {
    try {
      const updatedEntries = [...state.weightEntries, entry].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      await AsyncStorage.setItem(
        NUTRITION_STORAGE_KEYS.WEIGHT_ENTRIES,
        JSON.stringify(updatedEntries)
      );
      
      setState(prev => ({
        ...prev,
        weightEntries: updatedEntries,
      }));

      // Auto-adjust macros if enabled
      if (state.userProfile?.macros.autoAdjust) {
        await updateMacrosBasedOnWeight();
      }
    } catch (error) {
      console.error('Failed to add weight entry:', error);
      throw error;
    }
  };

  const getLatestWeight = (): WeightEntry | null => {
    return state.weightEntries.length > 0 ? state.weightEntries[0] : null;
  };

  const updateMacrosBasedOnWeight = async () => {
    try {
      if (!state.userProfile || state.weightEntries.length < 2) return;

      const latest = state.weightEntries[0];
      const previous = state.weightEntries[1];
      const weightChange = latest.weight - previous.weight;

      // Adjust calories based on weight change
      let calorieAdjustment = 0;
      if (Math.abs(weightChange) > 0.5) { // Significant change
        if (state.userProfile.goals.primaryGoal === 'weight_loss' && weightChange > 0) {
          calorieAdjustment = -100; // Reduce calories
        } else if (state.userProfile.goals.primaryGoal === 'weight_gain' && weightChange < 0) {
          calorieAdjustment = 100; // Increase calories
        }
      }

      if (calorieAdjustment !== 0) {
        const updatedMacros = {
          ...state.userProfile.macros,
          calories: state.userProfile.macros.calories + calorieAdjustment,
        };

        await updateUserProfile({ macros: updatedMacros });
      }
    } catch (error) {
      console.error('Failed to update macros based on weight:', error);
    }
  };

  const addMealToHistory = async (mealId: string, modifications?: string) => {
    try {
      const historyEntry: MealHistory = {
        id: Date.now().toString(),
        mealId,
        cookedAt: new Date().toISOString(),
        modifications,
      };

      const updatedHistory = [historyEntry, ...state.mealHistory];
      
      await AsyncStorage.setItem(
        NUTRITION_STORAGE_KEYS.MEAL_HISTORY,
        JSON.stringify(updatedHistory)
      );
      
      setState(prev => ({
        ...prev,
        mealHistory: updatedHistory,
      }));

      // Update favorite meal cooking count
      const favorite = state.favoriteMeals.find(fav => fav.mealId === mealId);
      if (favorite) {
        const updatedFavorites = state.favoriteMeals.map(fav => 
          fav.mealId === mealId 
            ? { ...fav, timesCooked: fav.timesCooked + 1, lastCookedAt: new Date().toISOString() }
            : fav
        );
        
        await AsyncStorage.setItem(
          NUTRITION_STORAGE_KEYS.FAVORITE_MEALS,
          JSON.stringify(updatedFavorites)
        );
        
        setState(prev => ({
          ...prev,
          favoriteMeals: updatedFavorites,
        }));
      }
    } catch (error) {
      console.error('Failed to add meal to history:', error);
      throw error;
    }
  };

  const getMealHistory = (): MealHistory[] => {
    return state.mealHistory;
  };

  const getGroceryList = (): GroceryList | null => {
    return state.currentMealPlan?.groceryList || null;
  };

  const updateGroceryItem = async (itemId: string, purchased: boolean) => {
    try {
      if (!state.currentMealPlan?.groceryList) return;

      const updatedGroceryList = {
        ...state.currentMealPlan.groceryList,
        items: state.currentMealPlan.groceryList.items.map(item =>
          item.id === itemId ? { ...item, isPurchased: purchased } : item
        ),
      };

      const updatedMealPlan = {
        ...state.currentMealPlan,
        groceryList: updatedGroceryList,
      };

      await saveMealPlan(updatedMealPlan);
    } catch (error) {
      console.error('Failed to update grocery item:', error);
      throw error;
    }
  };

  const addGroceryItem = async (itemData: Omit<GroceryItem, 'id'>) => {
    try {
      if (!state.currentMealPlan?.groceryList) return;

      const newItem: GroceryItem = {
        ...itemData,
        id: `manual_${Date.now()}_${itemData.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
      };

      const updatedGroceryList = {
        ...state.currentMealPlan.groceryList,
        items: [...state.currentMealPlan.groceryList.items, newItem],
        totalCost: state.currentMealPlan.groceryList.totalCost + newItem.estimatedCost,
      };

      const updatedMealPlan = {
        ...state.currentMealPlan,
        groceryList: updatedGroceryList,
        totalCost: state.currentMealPlan.totalCost + newItem.estimatedCost,
      };

      await saveMealPlan(updatedMealPlan);
    } catch (error) {
      console.error('Failed to add grocery item:', error);
      throw error;
    }
  };

  const clearAllData = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(NUTRITION_STORAGE_KEYS.USER_PROFILE),
        AsyncStorage.removeItem(NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN),
        AsyncStorage.removeItem(NUTRITION_STORAGE_KEYS.FAVORITE_MEALS),
        AsyncStorage.removeItem(NUTRITION_STORAGE_KEYS.MEAL_HISTORY),
        AsyncStorage.removeItem(NUTRITION_STORAGE_KEYS.WEIGHT_ENTRIES),
        AsyncStorage.removeItem(NUTRITION_STORAGE_KEYS.MEAL_RATINGS),
        AsyncStorage.removeItem(NUTRITION_STORAGE_KEYS.COMPLETED_MEALS),
      ]);
      
      setState({
        userProfile: null,
        currentMealPlan: null,
        favoriteMeals: [],
        mealHistory: [],
        weightEntries: [],
        completedMeals: {},
        isLoading: false,
        hasCompletedQuestionnaire: false,
      });
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  };

  const hasCompletedSetup = (): boolean => {
    return state.hasCompletedQuestionnaire;
  };

  const refreshData = async () => {
    await loadAllData();
  };

  const markMealCompleted = async (mealId: string, date: string, completed: boolean) => {
    try {
      const key = `${date}:${mealId}`;
      const updatedCompletedMeals = { ...state.completedMeals };
      
      if (completed) {
        updatedCompletedMeals[key] = true;
      } else {
        delete updatedCompletedMeals[key];
      }
      
      await AsyncStorage.setItem(
        NUTRITION_STORAGE_KEYS.COMPLETED_MEALS,
        JSON.stringify(updatedCompletedMeals)
      );
      
      setState(prev => ({
        ...prev,
        completedMeals: updatedCompletedMeals,
      }));
    } catch (error) {
      console.error('Failed to mark meal completed:', error);
      throw error;
    }
  };

  const isMealCompleted = (mealId: string, date: string): boolean => {
    const key = `${date}:${mealId}`;
    return !!state.completedMeals[key];
  };

  const getDailyCompletionProgress = (date: string): { completed: number; total: number } => {
    if (!state.currentMealPlan) {
      return { completed: 0, total: 0 };
    }

    // Find the day for the given date
    const targetDate = new Date(date);
    const day = state.currentMealPlan.days.find(d => {
      const dayDate = new Date(d.date);
      return dayDate.toDateString() === targetDate.toDateString();
    });

    if (!day) {
      return { completed: 0, total: 0 };
    }

    const totalMeals = day.meals.length;
    const completedMeals = day.meals.filter(meal => 
      isMealCompleted(meal.id, date)
    ).length;

    return { completed: completedMeals, total: totalMeals };
  };

  const contextValue: MealPlanningContextType = {
    ...state,
    saveUserProfile,
    updateUserProfile,
    generateMealPlan,
    saveMealPlan,
    clearCurrentMealPlan,
    getMealPlan,
    addToFavorites,
    removeFromFavorites,
    getFavoriteMeals,
    rateMeal,
    getMealRating,
    addWeightEntry,
    getLatestWeight,
    updateMacrosBasedOnWeight,
    addMealToHistory,
    getMealHistory,
    markMealCompleted,
    isMealCompleted,
    getDailyCompletionProgress,
    getGroceryList,
    updateGroceryItem,
    addGroceryItem,
    clearAllData,
    hasCompletedSetup,
    refreshData,
  };

  return (
    <MealPlanningContext.Provider value={contextValue}>
      {children}
    </MealPlanningContext.Provider>
  );
};

export const useMealPlanning = (): MealPlanningContextType => {
  const context = useContext(MealPlanningContext);
  if (context === undefined) {
    throw new Error('useMealPlanning must be used within a MealPlanningProvider');
  }
  return context;
};

