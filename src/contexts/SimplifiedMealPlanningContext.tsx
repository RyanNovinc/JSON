import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SimplifiedMealPlan,
  SimplifiedMealPlanDay,
  SimplifiedMeal,
  NUTRITION_STORAGE_KEYS,
} from '../types/nutrition';

// =============================================================================
// NEW SIMPLIFIED ARCHITECTURE - SINGLE SOURCE OF TRUTH
// =============================================================================

interface SimplifiedMealPlanningContextType {
  // State
  currentPlan: SimplifiedMealPlan | null;
  isLoading: boolean;
  
  // Core operations (simple and reliable)
  loadMealPlan: () => Promise<void>;
  saveMealPlan: (plan: SimplifiedMealPlan) => Promise<void>;
  
  // Date-based meal operations (no day name confusion)
  getMealsForDate: (date: string) => SimplifiedMeal[];
  addMealToDate: (date: string, meal: Omit<SimplifiedMeal, 'id'>) => Promise<boolean>;
  deleteMealFromDate: (date: string, mealId: string) => Promise<boolean>;
  updateMeal: (date: string, mealId: string, updates: Partial<SimplifiedMeal>) => Promise<boolean>;
  
  // Utility functions
  createNewPlan: (name: string, startDate: string, durationDays: number) => SimplifiedMealPlan;
  migrateLegacyPlan: (legacyPlan: any) => Promise<boolean>;
}

const SimplifiedMealPlanningContext = createContext<SimplifiedMealPlanningContextType | undefined>(undefined);

interface SimplifiedMealPlanningProviderProps {
  children: ReactNode;
}

export const SimplifiedMealPlanningProvider: React.FC<SimplifiedMealPlanningProviderProps> = ({ children }) => {
  const [state, setState] = useState({
    currentPlan: null as SimplifiedMealPlan | null,
    isLoading: true,
  });

  // =============================================================================
  // CORE DATA OPERATIONS - Simple and Reliable
  // =============================================================================

  const loadMealPlan = async (): Promise<void> => {
    try {
      console.log('📂 SimplifiedContext: Loading meal plan...');
      setState(prev => ({ ...prev, isLoading: true }));
      
      const data = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.SIMPLIFIED_MEAL_PLAN);
      
      if (data) {
        const plan = JSON.parse(data) as SimplifiedMealPlan;
        setState(prev => ({ ...prev, currentPlan: plan, isLoading: false }));
        console.log(`✅ SimplifiedContext: Loaded plan "${plan.name}" with ${Object.keys(plan.dailyMeals).length} days`);
      } else {
        console.log('📝 SimplifiedContext: No meal plan found');
        setState(prev => ({ ...prev, currentPlan: null, isLoading: false }));
      }
    } catch (error) {
      console.error('❌ SimplifiedContext: Failed to load meal plan:', error);
      setState(prev => ({ ...prev, currentPlan: null, isLoading: false }));
    }
  };

  const saveMealPlan = async (plan: SimplifiedMealPlan): Promise<void> => {
    try {
      console.log(`💾 SimplifiedContext: Saving plan "${plan.name}"...`);
      
      await AsyncStorage.setItem(
        NUTRITION_STORAGE_KEYS.SIMPLIFIED_MEAL_PLAN,
        JSON.stringify(plan)
      );
      
      setState(prev => ({ ...prev, currentPlan: plan }));
      console.log('✅ SimplifiedContext: Plan saved successfully');
    } catch (error) {
      console.error('❌ SimplifiedContext: Failed to save meal plan:', error);
      throw error;
    }
  };

  // =============================================================================
  // MEAL OPERATIONS - Date-based, No Confusion
  // =============================================================================

  const getMealsForDate = (date: string): SimplifiedMeal[] => {
    if (!state.currentPlan) {
      console.log(`⚠️ SimplifiedContext: No plan loaded, returning empty meals for ${date}`);
      return [];
    }

    const dayData = state.currentPlan.dailyMeals[date];
    if (!dayData) {
      console.log(`📅 SimplifiedContext: No meals found for ${date}`);
      return [];
    }

    console.log(`🍽️ SimplifiedContext: Found ${dayData.meals.length} meals for ${date}`);
    return [...dayData.meals]; // Return copy to prevent mutations
  };

  const addMealToDate = async (date: string, meal: Omit<SimplifiedMeal, 'id'>): Promise<boolean> => {
    try {
      if (!state.currentPlan) {
        console.log('⚠️ SimplifiedContext: No plan loaded, cannot add meal');
        return false;
      }

      console.log(`➕ SimplifiedContext: Adding meal "${meal.name}" to ${date}`);

      // Create updated plan
      const updatedPlan = { ...state.currentPlan };
      
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
      updatedPlan.dailyMeals[date] = {
        ...updatedPlan.dailyMeals[date],
        meals: [...updatedPlan.dailyMeals[date].meals, newMeal],
      };

      // Save updated plan
      await saveMealPlan(updatedPlan);
      
      console.log(`✅ SimplifiedContext: Added meal "${meal.name}" with ID ${mealId} to ${date}`);
      return true;
    } catch (error) {
      console.error('❌ SimplifiedContext: Failed to add meal:', error);
      return false;
    }
  };

  const deleteMealFromDate = async (date: string, mealId: string): Promise<boolean> => {
    try {
      if (!state.currentPlan) {
        console.log('⚠️ SimplifiedContext: No plan loaded, cannot delete meal');
        return false;
      }

      console.log(`🗑️ SimplifiedContext: Deleting meal ID ${mealId} from ${date}`);

      const dayData = state.currentPlan.dailyMeals[date];
      if (!dayData) {
        console.log(`⚠️ SimplifiedContext: No day found for ${date}`);
        return false;
      }

      const mealIndex = dayData.meals.findIndex(meal => meal.id === mealId);
      if (mealIndex === -1) {
        console.log(`⚠️ SimplifiedContext: Meal ID ${mealId} not found on ${date}`);
        return false;
      }

      const mealToDelete = dayData.meals[mealIndex];
      console.log(`🎯 SimplifiedContext: Found meal "${mealToDelete.name}" at index ${mealIndex}`);

      // Create updated plan
      const updatedPlan = { ...state.currentPlan };
      
      // Remove meal from the specific day only
      const updatedMeals = dayData.meals.filter(meal => meal.id !== mealId);
      
      updatedPlan.dailyMeals[date] = {
        ...dayData,
        meals: updatedMeals,
      };

      // Save updated plan
      await saveMealPlan(updatedPlan);
      
      console.log(`✅ SimplifiedContext: Deleted "${mealToDelete.name}" from ${date}. Meals: ${dayData.meals.length} → ${updatedMeals.length}`);
      return true;
    } catch (error) {
      console.error('❌ SimplifiedContext: Failed to delete meal:', error);
      return false;
    }
  };

  const updateMeal = async (date: string, mealId: string, updates: Partial<SimplifiedMeal>): Promise<boolean> => {
    try {
      if (!state.currentPlan) {
        console.log('⚠️ SimplifiedContext: No plan loaded, cannot update meal');
        return false;
      }

      console.log(`📝 SimplifiedContext: Updating meal ID ${mealId} on ${date}`);

      const dayData = state.currentPlan.dailyMeals[date];
      if (!dayData) {
        console.log(`⚠️ SimplifiedContext: No day found for ${date}`);
        return false;
      }

      const mealIndex = dayData.meals.findIndex(meal => meal.id === mealId);
      if (mealIndex === -1) {
        console.log(`⚠️ SimplifiedContext: Meal ID ${mealId} not found on ${date}`);
        return false;
      }

      // Create updated plan
      const updatedPlan = { ...state.currentPlan };
      
      // Update the specific meal
      const updatedMeal = {
        ...dayData.meals[mealIndex],
        ...updates,
        id: mealId, // Preserve original ID
      };

      const updatedMeals = [...dayData.meals];
      updatedMeals[mealIndex] = updatedMeal;

      updatedPlan.dailyMeals[date] = {
        ...dayData,
        meals: updatedMeals,
      };

      // Save updated plan
      await saveMealPlan(updatedPlan);
      
      console.log(`✅ SimplifiedContext: Updated meal "${updatedMeal.name}" on ${date}`);
      return true;
    } catch (error) {
      console.error('❌ SimplifiedContext: Failed to update meal:', error);
      return false;
    }
  };

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  const createNewPlan = (name: string, startDate: string, durationDays: number): SimplifiedMealPlan => {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays - 1);

    return {
      id: `plan_${Date.now()}`,
      name,
      startDate,
      endDate: endDate.toISOString().split('T')[0],
      dailyMeals: {},
      metadata: {
        generatedAt: new Date().toISOString(),
        totalCost: 0,
        duration: durationDays,
      },
    };
  };

  const migrateLegacyPlan = async (legacyPlan: any): Promise<boolean> => {
    try {
      console.log('🔄 SimplifiedContext: Migrating legacy meal plan...');
      
      const simplifiedPlan: SimplifiedMealPlan = {
        id: legacyPlan.id || `migrated_${Date.now()}`,
        name: legacyPlan.name || 'Migrated Meal Plan',
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
                  id: `migrated_${Date.now()}_${dayOffset}_${mealIndex}`,
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
                  id: `migrated_manual_${Date.now()}_${mealIndex}`,
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

      await saveMealPlan(simplifiedPlan);
      console.log(`✅ SimplifiedContext: Migrated legacy plan with ${Object.keys(simplifiedPlan.dailyMeals).length} days`);
      return true;
    } catch (error) {
      console.error('❌ SimplifiedContext: Failed to migrate legacy plan:', error);
      return false;
    }
  };

  // Load plan on mount
  useEffect(() => {
    loadMealPlan();
  }, []);

  // =============================================================================
  // CONTEXT VALUE - Clean and Simple
  // =============================================================================

  const contextValue: SimplifiedMealPlanningContextType = {
    currentPlan: state.currentPlan,
    isLoading: state.isLoading,
    loadMealPlan,
    saveMealPlan,
    getMealsForDate,
    addMealToDate,
    deleteMealFromDate,
    updateMeal,
    createNewPlan,
    migrateLegacyPlan,
  };

  return (
    <SimplifiedMealPlanningContext.Provider value={contextValue}>
      {children}
    </SimplifiedMealPlanningContext.Provider>
  );
};

// =============================================================================
// HOOK - Simple to Use
// =============================================================================

export const useSimplifiedMealPlanning = () => {
  const context = useContext(SimplifiedMealPlanningContext);
  if (context === undefined) {
    throw new Error('useSimplifiedMealPlanning must be used within a SimplifiedMealPlanningProvider');
  }
  return context;
};

export default SimplifiedMealPlanningContext;