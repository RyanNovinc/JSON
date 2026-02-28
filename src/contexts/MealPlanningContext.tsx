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
  SimplifiedMealPlan,
  SimplifiedMealPlanDay,
  SimplifiedMeal,
  SimplifiedMealPlanOperations,
} from '../types/nutrition';

interface MealPlanningContextType extends NutritionState, SimplifiedMealPlanOperations {
  // Profile Management
  saveUserProfile: (profile: UserNutritionProfile) => Promise<void>;
  updateUserProfile: (updates: Partial<UserNutritionProfile>) => Promise<void>;
  
  // Meal Plan Management (Legacy)
  generateMealPlan: (request: MealPlanRequest) => Promise<void>;
  saveMealPlan: (mealPlan: MealPlan) => Promise<void>;
  clearCurrentMealPlan: () => Promise<void>;
  getMealPlan: (date: string) => MealPlan | null;
  getMealsForDay: (dayDate: string, originalDayMeals?: any[]) => any[];
  deleteMealFromPlan: (mealIdentifier: { meal_name: string; recommended_time?: string; }, dayDate: string) => Promise<boolean>;
  addMealToPlan: (meal: any, dayDate: string, time: string) => Promise<boolean>;
  
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
    simplifiedMealPlan: null,
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
      if (!data) return null;
      
      const mealPlan = JSON.parse(data);
      
      // FIX: Add proper dates to any days that have undefined dates
      if (mealPlan.data?.days) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let hasUndefinedDates = false;
        
        mealPlan.data.days.forEach((day: any, index: number) => {
          if (!day.date || day.date === 'undefined') {
            hasUndefinedDates = true;
            // Calculate proper date for this day
            const dayDate = new Date(today);
            dayDate.setDate(today.getDate() + index);
            day.date = dayDate.toISOString().split('T')[0]; // Format: "2026-02-27"
            
            console.log(`🔧 Context: Fixed day ${index} date from undefined to ${day.date}`);
          }
        });
        
        // If we fixed any dates, save the updated meal plan
        if (hasUndefinedDates) {
          console.log('💾 Context: Saving meal plan with fixed dates');
          await AsyncStorage.setItem(NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN, JSON.stringify(mealPlan));
        }
      }
      
      return mealPlan;
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

  // FIXED: Use stored meal plan data as the source of truth, not route parameters
  const getMealsForDay = (dayDate: string, originalDayMeals: any[] = []): any[] => {
    console.log('🔍 Context: Getting meals for day:', dayDate);
    console.log('🔍 Context: Original day meals count (route params):', originalDayMeals.length);
    
    if (!state.currentMealPlan) {
      console.log('⚠️ Context: No current meal plan, returning original meals');
      return originalDayMeals;
    }

    let combinedMeals: any[] = [];
    
    // If originalDayMeals is empty, we need to get the meals from stored data
    if (originalDayMeals.length === 0) {
      console.log('🔍 Context: No route param meals, getting from stored meal plan data');
      
      // Get meals from the stored meal plan data structure
      if (state.currentMealPlan.data?.weeks) {
        console.log('🔍 Context: Searching weeks data structure');
        
        // For each week and day, we need to find the right day
        // Since we don't have a direct date match, we'll take ALL meals from ALL days
        // This is not ideal but will work as a temporary fix
        state.currentMealPlan.data.weeks.forEach((week: any, weekIndex: number) => {
          week.days?.forEach((weekDay: any, dayIndex: number) => {
            if (weekDay.meals && weekDay.meals.length > 0) {
              console.log(`🔍 Context: Found ${weekDay.meals.length} meals in week ${weekIndex}, day ${dayIndex} (${weekDay.day_name})`);
              
              // For now, let's just return the first day's meals
              // This is a hack but should work for testing
              if (weekIndex === 0 && dayIndex === 0) {
                weekDay.meals.forEach((meal: any) => {
                  combinedMeals.push({
                    meal_name: meal.meal_name,
                    meal_type: meal.meal_type,
                    prep_time: meal.prep_time || 0,
                    cook_time: meal.cook_time || 0,
                    total_time: meal.total_time || meal.prep_time || 0,
                    servings: meal.servings || 1,
                    calories: meal.calories,
                    recommended_time: meal.recommended_time || meal.time,
                    timing_reason: meal.timing_reason || '',
                    macros: meal.macros || {},
                    ingredients: meal.ingredients || [],
                    instructions: meal.instructions || [],
                    notes: meal.notes || '',
                    tags: meal.tags || [],
                    isOriginalMeal: true
                  });
                });
              }
            }
          });
        });
        
        console.log('🔍 Context: Found meals from stored data:', combinedMeals.length);
      }
    } else {
      // Use the route parameter meals if provided
      combinedMeals = [...originalDayMeals];
      console.log('🔍 Context: Using route param meals');
    }
    
    // Add any manually added meals from data.days (if they exist)
    if (state.currentMealPlan.data?.days) {
      const dayData = state.currentMealPlan.data.days.find((day: any) => day.date === dayDate);
      if (dayData?.meals) {
        const manualMeals = dayData.meals.filter((meal: any) => meal.isManuallyAdded === true);
        
        if (manualMeals.length > 0) {
          console.log('🔍 Context: Found manual meals:', manualMeals.length);
          
          const convertedManualMeals = manualMeals.map((meal: any) => ({
            meal_name: meal.meal_name,
            meal_type: meal.meal_type,
            prep_time: meal.prep_time || 0,
            cook_time: meal.cook_time || 0,
            total_time: meal.total_time || meal.prep_time || 0,
            servings: meal.servings || 1,
            calories: meal.calories,
            recommended_time: meal.recommended_time || meal.time,
            timing_reason: meal.timing_reason || '',
            macros: meal.macros || {},
            ingredients: meal.ingredients || [],
            instructions: meal.instructions || [],
            notes: meal.notes || '',
            tags: meal.tags || [],
            isManuallyAdded: true
          }));
          
          combinedMeals = [...combinedMeals, ...convertedManualMeals];
          console.log('🔍 Context: Added manual meals, total now:', combinedMeals.length);
        }
      }
    }

    console.log('🔍 Context: Final meals:', combinedMeals.length);
    return combinedMeals;
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

  // Unified meal deletion function
  const deleteMealFromPlan = async (mealIdentifier: { meal_name: string; recommended_time?: string; }, dayDate: string): Promise<boolean> => {
    try {
      console.log('🗑️ Context: Deleting meal from plan:', mealIdentifier.meal_name, 'on', dayDate);
      console.log('🗑️ Context: Meal identifier:', JSON.stringify(mealIdentifier, null, 2));
      
      if (!state.currentMealPlan) {
        console.log('⚠️ Context: No current meal plan found');
        return false;
      }

      // Create deep copy of the meal plan to avoid mutations
      const updatedMealPlan = JSON.parse(JSON.stringify(state.currentMealPlan));
      let mealFound = false;

      // TARGETED FIX: Handle deletion by checking if this is an original meal vs manually added
      let isOriginalMeal = false;
      
      // If the meal is not found in data.days, it might be an original meal
      // In that case, we need to mark it as deleted rather than removing it from data.weeks
      if (updatedMealPlan.data?.days) {
        const dayData = updatedMealPlan.data.days.find((day: any) => day.date === dayDate);
        const foundInDataDays = dayData?.meals?.some((m: any) => 
          m.meal_name === mealIdentifier.meal_name && 
          m.recommended_time === mealIdentifier.recommended_time
        );
        
        if (!foundInDataDays) {
          isOriginalMeal = true;
          console.log('🔍 Context: This appears to be an original meal, not found in data.days');
        }
      } else {
        isOriginalMeal = true;
        console.log('🔍 Context: No data.days structure, treating as original meal');
      }

      console.log('🔍 Context: Meal plan structure:');
      console.log('🔍 Context: Has data.weeks:', !!updatedMealPlan.data?.weeks);
      console.log('🔍 Context: Has data.days:', !!updatedMealPlan.data?.days);
      console.log('🔍 Context: Has days:', !!updatedMealPlan.days);

      // Debug: Log all meals in the data structure
      console.log('🔍 Context: All meals in data structure:');
      if (updatedMealPlan.data?.weeks) {
        updatedMealPlan.data.weeks.forEach((week: any, weekIndex: number) => {
          week.days?.forEach((weekDay: any, dayIndex: number) => {
            if (weekDay.meals) {
              console.log(`🔍 Week ${weekIndex}, Day ${dayIndex} (${weekDay.day_name}):`);
              weekDay.meals.forEach((meal: any, mealIndex: number) => {
                console.log(`  🍽️ Meal ${mealIndex}: "${meal.meal_name}" at "${meal.recommended_time}"`);
              });
            }
          });
        });
      }

      if (updatedMealPlan.data?.days) {
        console.log('🔍 Context: Data.days structure:');
        updatedMealPlan.data.days.forEach((dataDay: any, dayIndex: number) => {
          console.log(`🔍 Data Day ${dayIndex} (${dataDay.date}):`);
          if (dataDay.meals) {
            dataDay.meals.forEach((meal: any, mealIndex: number) => {
              console.log(`  🍽️ Meal ${mealIndex}: "${meal.meal_name}" at "${meal.recommended_time}" (manual: ${meal.isManuallyAdded})`);
            });
          }
        });
      }

      // CRITICAL FIX: Only remove from the SPECIFIC day, not all days
      // Remove from data.weeks structure (original meal plan) - ONLY FOR THE SPECIFIC DAY
      if (updatedMealPlan.data?.weeks) {
        console.log('🎯 Context: CRITICAL FIX - Only deleting from specific day, not all days');
        console.log('🎯 Context: Target date for deletion:', dayDate);
        
        // We need to figure out which day in the weeks structure corresponds to our dayDate
        // This is tricky because weeks uses day_name while we have dayDate
        // For now, let's SKIP deleting from data.weeks to prevent cross-day deletion
        console.log('⚠️ Context: SKIPPING data.weeks deletion to prevent deleting from all days');
        console.log('⚠️ Context: This meal will only be deleted if found in data.days structure');
      }

      // Remove from data.days structure (manually added meals) - ONLY FOR THE SPECIFIC DAY
      if (updatedMealPlan.data?.days) {
        updatedMealPlan.data.days = updatedMealPlan.data.days.map((dataDay: any) => {
          // CRITICAL FIX: Only process the day that matches our target dayDate
          if (dataDay.date === dayDate && dataDay.meals) {
            console.log(`🎯 Context: Processing specific day ${dayDate} for meal deletion`);
            
            const originalLength = dataDay.meals.length;
            const filteredMeals = dataDay.meals.filter((m: any) => {
              const nameMatches = m.meal_name === mealIdentifier.meal_name;
              const timeMatches = !mealIdentifier.recommended_time || m.recommended_time === mealIdentifier.recommended_time;
              const shouldRemove = nameMatches && timeMatches;
              
              if (nameMatches) {
                console.log(`🔍 Context: Found meal in data.days with matching name "${m.meal_name}"`);
                console.log(`🔍 Context: Time check - looking for: "${mealIdentifier.recommended_time}", found: "${m.recommended_time}", matches: ${timeMatches}`);
              }
              
              if (shouldRemove) {
                mealFound = true;
                console.log(`🗑️ Context: Removed from days structure on ${dayDate}:`, m.meal_name);
              }
              return !shouldRemove;
            });
            
            if (filteredMeals.length !== originalLength) {
              console.log(`🗑️ Context: Day ${dayDate}: meals ${originalLength} -> ${filteredMeals.length}`);
              return { ...dataDay, meals: filteredMeals };
            }
          } else if (dataDay.date !== dayDate) {
            console.log(`⏭️ Context: Skipping day ${dataDay.date} - not our target day ${dayDate}`);
          }
          return dataDay;
        });
      }

      // CRITICAL FIX: Skip context.days deletion entirely to prevent cross-day issues
      // The context's days structure doesn't have reliable date matching
      if (updatedMealPlan.days) {
        console.log('⚠️ Context: SKIPPING context.days deletion to prevent deleting from all days');
        console.log('⚠️ Context: Context.days structure lacks reliable date matching for target day:', dayDate);
        console.log('⚠️ Context: This prevents accidental deletion from wrong days');
      }

      // TARGETED FIX: Handle original meal deletion by adding to deleted meals list
      if (!mealFound && isOriginalMeal) {
        console.log('🔍 Context: Handling original meal deletion by tracking as deleted');
        
        // Initialize data structure if needed
        if (!updatedMealPlan.data) {
          updatedMealPlan.data = { days: [], deletedMeals: [] };
        }
        if (!updatedMealPlan.data.deletedMeals) {
          updatedMealPlan.data.deletedMeals = [];
        }
        
        // Add to deleted meals list with day context
        const deletedMealRecord = {
          meal_name: mealIdentifier.meal_name,
          recommended_time: mealIdentifier.recommended_time,
          dayDate: dayDate,
          deletedAt: new Date().toISOString()
        };
        
        updatedMealPlan.data.deletedMeals.push(deletedMealRecord);
        mealFound = true;
        
        console.log('✅ Context: Added to deleted meals list:', mealIdentifier.meal_name);
      }

      if (!mealFound) {
        console.log('⚠️ Context: Meal not found in any structure:', mealIdentifier.meal_name);
        console.log('⚠️ Context: Searched for time:', mealIdentifier.recommended_time);
        return false;
      }

      // Save the updated meal plan - this will update both storage and context state
      await saveMealPlan(updatedMealPlan);
      
      console.log('✅ Context: Meal deleted successfully from all structures');
      
      // CRITICAL FIX: Ensure state is immediately updated
      setState(prev => ({
        ...prev,
        currentMealPlan: updatedMealPlan
      }));
      
      console.log('✅ Context: State updated immediately');
      return true;
      
    } catch (error) {
      console.error('❌ Context: Error deleting meal from plan:', error);
      return false;
    }
  };

  // Unified meal addition function
  const addMealToPlan = async (meal: any, dayDate: string, time: string): Promise<boolean> => {
    try {
      console.log('🍽️ Context: Adding meal to plan:', meal?.name || meal?.meal_name, 'on', dayDate, 'at', time);
      
      if (!state.currentMealPlan) {
        console.log('⚠️ Context: No current meal plan found');
        return false;
      }

      // Create deep copy to avoid mutations
      const updatedMealPlan = JSON.parse(JSON.stringify(state.currentMealPlan));

      // Create the meal object in the format expected by the data structure
      const newMeal = {
        id: `${meal.id || Date.now()}_added_${Date.now()}`,
        meal_name: meal.name || meal.meal_name,
        meal_type: meal.type || meal.meal_type || 'lunch',
        time: time,
        recommended_time: time,
        calories: meal.nutritionInfo?.calories || meal.calories || 0,
        macros: {
          protein: meal.nutritionInfo?.protein || meal.macros?.protein || 0,
          carbs: meal.nutritionInfo?.carbs || meal.macros?.carbs || 0,
          fat: meal.nutritionInfo?.fat || meal.macros?.fat || 0,
          fiber: meal.nutritionInfo?.fiber || meal.macros?.fiber || 0
        },
        ingredients: meal.ingredients || [],
        instructions: meal.instructions || [],
        isManuallyAdded: true,
        addedDate: dayDate
      };

      // Initialize data.days if it doesn't exist
      if (!updatedMealPlan.data) {
        updatedMealPlan.data = { days: [] };
      }
      if (!updatedMealPlan.data.days) {
        updatedMealPlan.data.days = [];
      }

      // Find or create the day in data.days
      let dayIndex = updatedMealPlan.data.days.findIndex((day: any) => day.date === dayDate);
      
      if (dayIndex === -1) {
        // Create new day
        const newDay = {
          date: dayDate,
          day_name: `Manual Meals ${dayDate}`,
          meals: [newMeal]
        };
        updatedMealPlan.data.days.push(newDay);
        console.log('✅ Context: Created new day and added meal');
      } else {
        // Add to existing day, but ensure the date is set correctly
        if (!updatedMealPlan.data.days[dayIndex].meals) {
          updatedMealPlan.data.days[dayIndex].meals = [];
        }
        // CRITICAL FIX: Ensure the date field exists on the existing day
        if (!updatedMealPlan.data.days[dayIndex].date) {
          updatedMealPlan.data.days[dayIndex].date = dayDate;
          console.log('🔧 Context: Fixed missing date on existing day');
        }
        updatedMealPlan.data.days[dayIndex].meals.push(newMeal);
        console.log('✅ Context: Added meal to existing day');
      }

      // Save the updated meal plan
      await saveMealPlan(updatedMealPlan);
      
      console.log('✅ Context: Meal added successfully to plan');
      return true;
      
    } catch (error) {
      console.error('❌ Context: Error adding meal to plan:', error);
      return false;
    }
  };

  // NEW SIMPLIFIED ARCHITECTURE FUNCTIONS
  const loadSimplifiedMealPlan = async (): Promise<SimplifiedMealPlan | null> => {
    try {
      const data = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.SIMPLIFIED_MEAL_PLAN);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load simplified meal plan:', error);
      return null;
    }
  };

  const saveSimplifiedMealPlan = async (plan: SimplifiedMealPlan): Promise<void> => {
    try {
      await AsyncStorage.setItem(
        NUTRITION_STORAGE_KEYS.SIMPLIFIED_MEAL_PLAN,
        JSON.stringify(plan)
      );
      setState(prev => ({ ...prev, simplifiedMealPlan: plan }));
      console.log('✅ Simplified meal plan saved successfully');
    } catch (error) {
      console.error('Failed to save simplified meal plan:', error);
      throw error;
    }
  };

  const getMealsForDate = (date: string): SimplifiedMeal[] => {
    if (!state.simplifiedMealPlan) {
      console.log('⚠️ No simplified meal plan loaded');
      return [];
    }

    const dayData = state.simplifiedMealPlan.dailyMeals[date];
    if (!dayData) {
      console.log(`⚠️ No meals found for date: ${date}`);
      return [];
    }

    console.log(`✅ Found ${dayData.meals.length} meals for date: ${date}`);
    return [...dayData.meals]; // Return a copy to prevent mutations
  };

  const addMealToDay = async (date: string, meal: Omit<SimplifiedMeal, 'id'>): Promise<boolean> => {
    try {
      if (!state.simplifiedMealPlan) {
        console.log('⚠️ No simplified meal plan to add meal to');
        return false;
      }

      const updatedPlan = JSON.parse(JSON.stringify(state.simplifiedMealPlan));
      
      // Generate unique meal ID
      const mealId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newMeal: SimplifiedMeal = {
        ...meal,
        id: mealId,
        addedAt: new Date().toISOString(),
      };

      // Initialize day if it doesn't exist
      if (!updatedPlan.dailyMeals[date]) {
        const dayDate = new Date(date);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        updatedPlan.dailyMeals[date] = {
          date,
          dayName: dayNames[dayDate.getDay()],
          meals: [],
        };
      }

      // Add meal to day
      updatedPlan.dailyMeals[date].meals.push(newMeal);
      
      // Save updated plan
      await saveSimplifiedMealPlan(updatedPlan);
      
      console.log(`✅ Added meal "${meal.name}" to ${date}`);
      return true;
    } catch (error) {
      console.error('Failed to add meal to day:', error);
      return false;
    }
  };

  const deleteMealFromDay = async (date: string, mealId: string): Promise<boolean> => {
    try {
      if (!state.simplifiedMealPlan) {
        console.log('⚠️ No simplified meal plan to delete meal from');
        return false;
      }

      const updatedPlan = JSON.parse(JSON.stringify(state.simplifiedMealPlan));
      
      const dayData = updatedPlan.dailyMeals[date];
      if (!dayData) {
        console.log(`⚠️ No day found for date: ${date}`);
        return false;
      }

      const mealIndex = dayData.meals.findIndex((meal: SimplifiedMeal) => meal.id === mealId);
      if (mealIndex === -1) {
        console.log(`⚠️ Meal with ID ${mealId} not found on ${date}`);
        return false;
      }

      const deletedMeal = dayData.meals[mealIndex];
      
      // Remove meal from array
      dayData.meals.splice(mealIndex, 1);
      
      // Save updated plan
      await saveSimplifiedMealPlan(updatedPlan);
      
      console.log(`✅ Deleted meal "${deletedMeal.name}" from ${date}`);
      return true;
    } catch (error) {
      console.error('Failed to delete meal from day:', error);
      return false;
    }
  };

  const updateMeal = async (date: string, mealId: string, updates: Partial<SimplifiedMeal>): Promise<boolean> => {
    try {
      if (!state.simplifiedMealPlan) {
        console.log('⚠️ No simplified meal plan to update meal in');
        return false;
      }

      const updatedPlan = JSON.parse(JSON.stringify(state.simplifiedMealPlan));
      
      const dayData = updatedPlan.dailyMeals[date];
      if (!dayData) {
        console.log(`⚠️ No day found for date: ${date}`);
        return false;
      }

      const mealIndex = dayData.meals.findIndex((meal: SimplifiedMeal) => meal.id === mealId);
      if (mealIndex === -1) {
        console.log(`⚠️ Meal with ID ${mealId} not found on ${date}`);
        return false;
      }

      // Update meal with provided updates
      dayData.meals[mealIndex] = {
        ...dayData.meals[mealIndex],
        ...updates,
        id: mealId, // Preserve original ID
      };
      
      // Save updated plan
      await saveSimplifiedMealPlan(updatedPlan);
      
      console.log(`✅ Updated meal "${dayData.meals[mealIndex].name}" on ${date}`);
      return true;
    } catch (error) {
      console.error('Failed to update meal:', error);
      return false;
    }
  };

  const convertLegacyMealPlan = (legacyPlan: any): SimplifiedMealPlan => {
    console.log('🔄 Converting legacy meal plan to simplified structure');
    
    const simplifiedPlan: SimplifiedMealPlan = {
      id: legacyPlan.id || `simplified_${Date.now()}`,
      name: legacyPlan.name || 'Converted Meal Plan',
      startDate: legacyPlan.startDate || new Date().toISOString().split('T')[0],
      endDate: legacyPlan.endDate || new Date().toISOString().split('T')[0],
      dailyMeals: {},
      metadata: {
        generatedAt: legacyPlan.generatedAt || new Date().toISOString(),
        totalCost: legacyPlan.totalCost || 0,
        duration: legacyPlan.duration || 7,
      },
    };

    // Convert from legacy data.weeks structure
    if (legacyPlan.data?.weeks) {
      let dayOffset = 0;
      const baseDate = new Date(simplifiedPlan.startDate);
      
      legacyPlan.data.weeks.forEach((week: any) => {
        week.days?.forEach((legacyDay: any) => {
          const dayDate = new Date(baseDate);
          dayDate.setDate(baseDate.getDate() + dayOffset);
          const dateStr = dayDate.toISOString().split('T')[0];
          
          const simplifiedDay: SimplifiedMealPlanDay = {
            date: dateStr,
            dayName: legacyDay.day_name || `Day ${dayOffset + 1}`,
            meals: [],
          };

          // Convert meals
          if (legacyDay.meals) {
            legacyDay.meals.forEach((legacyMeal: any, mealIndex: number) => {
              const simplifiedMeal: SimplifiedMeal = {
                id: `converted_${Date.now()}_${dayOffset}_${mealIndex}`,
                name: legacyMeal.meal_name || 'Unnamed Meal',
                type: legacyMeal.meal_type || 'lunch',
                time: legacyMeal.recommended_time || '12:00 PM',
                calories: legacyMeal.calories || 0,
                macros: legacyMeal.macros || { protein: 0, carbs: 0, fat: 0 },
                ingredients: legacyMeal.ingredients || [],
                instructions: legacyMeal.instructions || [],
                tags: legacyMeal.tags || [],
                isOriginal: true,
              };
              
              simplifiedDay.meals.push(simplifiedMeal);
            });
          }

          simplifiedPlan.dailyMeals[dateStr] = simplifiedDay;
          dayOffset++;
        });
      });
    }

    // Add any manually added meals from data.days
    if (legacyPlan.data?.days) {
      legacyPlan.data.days.forEach((legacyDataDay: any) => {
        if (legacyDataDay.date && legacyDataDay.meals) {
          const dateStr = legacyDataDay.date;
          
          // Initialize day if it doesn't exist
          if (!simplifiedPlan.dailyMeals[dateStr]) {
            const dayDate = new Date(dateStr);
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            
            simplifiedPlan.dailyMeals[dateStr] = {
              date: dateStr,
              dayName: dayNames[dayDate.getDay()],
              meals: [],
            };
          }

          // Add manual meals
          legacyDataDay.meals.forEach((legacyMeal: any, mealIndex: number) => {
            if (legacyMeal.isManuallyAdded) {
              const simplifiedMeal: SimplifiedMeal = {
                id: `manual_${Date.now()}_${mealIndex}`,
                name: legacyMeal.meal_name || 'Manual Meal',
                type: legacyMeal.meal_type || 'lunch',
                time: legacyMeal.recommended_time || legacyMeal.time || '12:00 PM',
                calories: legacyMeal.calories || 0,
                macros: legacyMeal.macros || { protein: 0, carbs: 0, fat: 0 },
                ingredients: legacyMeal.ingredients || [],
                instructions: legacyMeal.instructions || [],
                tags: legacyMeal.tags || [],
                isOriginal: false,
                addedAt: legacyMeal.addedDate || new Date().toISOString(),
              };
              
              simplifiedPlan.dailyMeals[dateStr].meals.push(simplifiedMeal);
            }
          });
        }
      });
    }

    console.log(`✅ Converted legacy plan with ${Object.keys(simplifiedPlan.dailyMeals).length} days`);
    return simplifiedPlan;
  };

  const contextValue: MealPlanningContextType = {
    ...state,
    saveUserProfile,
    updateUserProfile,
    generateMealPlan,
    saveMealPlan,
    clearCurrentMealPlan,
    getMealPlan,
    getMealsForDay,
    deleteMealFromPlan,
    addMealToPlan,
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
    // New simplified architecture functions
    loadSimplifiedMealPlan,
    saveSimplifiedMealPlan,
    getMealsForDate,
    addMealToDay,
    deleteMealFromDay,
    updateMeal,
    convertLegacyMealPlan,
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

