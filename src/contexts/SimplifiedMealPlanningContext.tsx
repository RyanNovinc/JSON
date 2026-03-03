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
  mealPlans: SimplifiedMealPlan[];
  currentPlan: SimplifiedMealPlan | null;
  isLoading: boolean;
  
  // Core operations (multiple meal plans support)
  loadMealPlans: () => Promise<void>;
  saveMealPlan: (plan: SimplifiedMealPlan) => Promise<void>;
  setCurrentPlan: (planId: string | null) => Promise<void>;
  deleteMealPlan: (planId: string) => Promise<void>;
  
  // Legacy operations (for backward compatibility)
  loadMealPlan: () => Promise<void>;
  clearMealPlan: () => Promise<void>;
  
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
    mealPlans: [] as SimplifiedMealPlan[],
    currentPlan: null as SimplifiedMealPlan | null,
    isLoading: true,
  });

  // =============================================================================
  // CORE DATA OPERATIONS - Simple and Reliable
  // =============================================================================

  const loadMealPlans = async (): Promise<void> => {
    try {
      console.log('📥 SimplifiedContext: Loading meal plans...');
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Load all meal plans
      const storedPlans = await AsyncStorage.getItem(
        NUTRITION_STORAGE_KEYS.SIMPLIFIED_MEAL_PLANS
      );
      
      // Load current plan ID
      const currentPlanId = await AsyncStorage.getItem(
        NUTRITION_STORAGE_KEYS.CURRENT_PLAN_ID
      );
      
      let plans: SimplifiedMealPlan[] = [];
      let currentPlan: SimplifiedMealPlan | null = null;
      
      if (storedPlans) {
        plans = JSON.parse(storedPlans) as SimplifiedMealPlan[];
        console.log(`✅ SimplifiedContext: Loaded ${plans.length} meal plans`);
        
        // Find current plan
        if (currentPlanId && plans.length > 0) {
          currentPlan = plans.find(p => p.id === currentPlanId) || plans[0];
        } else if (plans.length > 0) {
          currentPlan = plans[0]; // Default to first plan
        }
      } else {
        // Migration: check for legacy single plan
        const legacyData = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.SIMPLIFIED_MEAL_PLAN);
        if (legacyData) {
          const legacyPlan = JSON.parse(legacyData) as SimplifiedMealPlan;
          plans = [legacyPlan];
          currentPlan = legacyPlan;
          // Save in new format
          await AsyncStorage.setItem(NUTRITION_STORAGE_KEYS.SIMPLIFIED_MEAL_PLANS, JSON.stringify(plans));
          await AsyncStorage.setItem(NUTRITION_STORAGE_KEYS.CURRENT_PLAN_ID, legacyPlan.id);
          console.log('🔄 SimplifiedContext: Migrated legacy plan to new format');
        }
      }
      
      setState(prev => ({ 
        ...prev, 
        mealPlans: plans,
        currentPlan,
        isLoading: false 
      }));
      
      if (currentPlan) {
        console.log(`✅ SimplifiedContext: Current plan: "${currentPlan.name}"`);
      }
    } catch (error) {
      console.error('❌ SimplifiedContext: Failed to load meal plans:', error);
      setState(prev => ({ 
        ...prev, 
        mealPlans: [],
        currentPlan: null, 
        isLoading: false 
      }));
    }
  };

  // Legacy single plan loading (for backward compatibility)
  const loadMealPlan = async (): Promise<void> => {
    await loadMealPlans();
  };

  const saveMealPlan = async (plan: SimplifiedMealPlan): Promise<void> => {
    try {
      console.log(`💾 SimplifiedContext: Saving plan "${plan.name}"...`);
      
      // Update or add plan to the list
      let updatedPlans = [...state.mealPlans];
      const existingIndex = updatedPlans.findIndex(p => p.id === plan.id);
      
      if (existingIndex >= 0) {
        updatedPlans[existingIndex] = plan;
        console.log('✅ SimplifiedContext: Updated existing plan');
      } else {
        updatedPlans.push(plan);
        console.log('✅ SimplifiedContext: Added new plan');
      }
      
      // Save all plans
      await AsyncStorage.setItem(
        NUTRITION_STORAGE_KEYS.SIMPLIFIED_MEAL_PLANS,
        JSON.stringify(updatedPlans)
      );
      
      // Set as current plan and save current plan ID
      await AsyncStorage.setItem(NUTRITION_STORAGE_KEYS.CURRENT_PLAN_ID, plan.id);
      
      setState(prev => ({ 
        ...prev, 
        mealPlans: updatedPlans,
        currentPlan: plan 
      }));
      
      console.log('✅ SimplifiedContext: Plan saved successfully');
    } catch (error) {
      console.error('❌ SimplifiedContext: Failed to save meal plan:', error);
      throw error;
    }
  };

  const setCurrentPlan = async (planId: string | null): Promise<void> => {
    try {
      let newCurrentPlan: SimplifiedMealPlan | null = null;
      
      if (planId && state.mealPlans.length > 0) {
        newCurrentPlan = state.mealPlans.find(p => p.id === planId) || null;
      }
      
      // Save current plan ID
      if (planId) {
        await AsyncStorage.setItem(NUTRITION_STORAGE_KEYS.CURRENT_PLAN_ID, planId);
      } else {
        await AsyncStorage.removeItem(NUTRITION_STORAGE_KEYS.CURRENT_PLAN_ID);
      }
      
      setState(prev => ({ ...prev, currentPlan: newCurrentPlan }));
      console.log(`✅ SimplifiedContext: Switched to plan: ${newCurrentPlan?.name || 'none'}`);
    } catch (error) {
      console.error('❌ SimplifiedContext: Failed to set current plan:', error);
    }
  };

  const deleteMealPlan = async (planId: string): Promise<void> => {
    try {
      const updatedPlans = state.mealPlans.filter(p => p.id !== planId);
      
      // Save updated plans
      await AsyncStorage.setItem(
        NUTRITION_STORAGE_KEYS.SIMPLIFIED_MEAL_PLANS,
        JSON.stringify(updatedPlans)
      );
      
      // Update current plan if deleted
      let newCurrentPlan = state.currentPlan;
      if (state.currentPlan?.id === planId) {
        newCurrentPlan = updatedPlans.length > 0 ? updatedPlans[0] : null;
        await setCurrentPlan(newCurrentPlan?.id || null);
      }
      
      setState(prev => ({ 
        ...prev, 
        mealPlans: updatedPlans,
        currentPlan: newCurrentPlan
      }));
      
      console.log(`✅ SimplifiedContext: Deleted plan "${planId}"`);
    } catch (error) {
      console.error('❌ SimplifiedContext: Failed to delete meal plan:', error);
    }
  };

  // Legacy clear function (for backward compatibility)
  const clearMealPlan = async (): Promise<void> => {
    if (state.currentPlan) {
      await deleteMealPlan(state.currentPlan.id);
    }
  };

  // =============================================================================
  // MEAL OPERATIONS - Date-based, No Confusion
  // =============================================================================

  const getMealsForDate = (date: string): SimplifiedMeal[] => {
    console.log(`🔍 SimplifiedContext: getMealsForDate called with date: ${date}`);
    
    if (!state.currentPlan) {
      console.log(`⚠️ SimplifiedContext: No plan loaded, returning empty meals for ${date}`);
      return [];
    }

    console.log(`📋 SimplifiedContext: Current plan loaded:`, {
      planId: state.currentPlan.id,
      planName: state.currentPlan.name,
      totalDailyMealsKeys: Object.keys(state.currentPlan.dailyMeals).length,
      availableDates: Object.keys(state.currentPlan.dailyMeals),
      requestedDate: date
    });

    const dayData = state.currentPlan.dailyMeals[date];
    if (!dayData) {
      console.log(`❌ SimplifiedContext: No meals found for ${date}`);
      console.log(`🔍 Available dates in plan:`, Object.keys(state.currentPlan.dailyMeals));
      console.log(`🔍 Date comparison:`, {
        requestedDate: date,
        availableDates: Object.keys(state.currentPlan.dailyMeals),
        exactMatch: Object.keys(state.currentPlan.dailyMeals).includes(date),
        similarDates: Object.keys(state.currentPlan.dailyMeals).filter(d => d.includes(date.split('-')[2]) || date.includes(d.split('-')[2]))
      });
      return [];
    }

    console.log(`✅ SimplifiedContext: Found day data for ${date}:`, {
      dayName: dayData.dayName,
      mealCount: dayData.meals.length
    });
    
    // Debug: Log meal data structure
    dayData.meals.forEach((meal, index) => {
      console.log(`🔍 Meal ${index}:`, {
        id: meal.id,
        name: meal.name,
        type: meal.type,
        time: meal.time,
        hasName: meal.name !== undefined,
        hasType: meal.type !== undefined,
        calories: meal.calories
      });
    });
    
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
      console.log('📊 SimplifiedContext: Legacy plan structure:', Object.keys(legacyPlan));
      
      const simplifiedPlan: SimplifiedMealPlan = {
        id: legacyPlan.id || `migrated_${Date.now()}`,
        name: legacyPlan.plan_name || legacyPlan.name || 'Migrated Meal Plan',
        startDate: legacyPlan.startDate || new Date().toISOString().split('T')[0],
        endDate: legacyPlan.endDate || new Date().toISOString().split('T')[0],
        dailyMeals: {},
        metadata: {
          generatedAt: legacyPlan.generatedAt || new Date().toISOString(),
          totalCost: legacyPlan.totalCost || legacyPlan.estimated_cost || 0,
          duration: legacyPlan.duration || legacyPlan.duration_days || 7,
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

  // Load plans on mount
  useEffect(() => {
    loadMealPlans();
  }, []);

  // =============================================================================
  // CONTEXT VALUE - Clean and Simple
  // =============================================================================

  const contextValue: SimplifiedMealPlanningContextType = {
    mealPlans: state.mealPlans,
    currentPlan: state.currentPlan,
    isLoading: state.isLoading,
    loadMealPlans,
    saveMealPlan,
    setCurrentPlan,
    deleteMealPlan,
    loadMealPlan,
    clearMealPlan,
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