import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';
import { useSimplifiedMealPlanning } from '../contexts/SimplifiedMealPlanningContext';

type MealPlanDaysScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MealPlanDays'>;
type MealPlanDaysScreenRouteProp = RouteProp<RootStackParamList, 'MealPlanDays'>;

interface Meal {
  meal_name: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  prep_time?: number;
  cook_time?: number;
  total_time?: number;
  servings?: number;
  calories?: number;
  recommended_time?: string; // e.g., "7:45 AM", "12:30 PM"
  timing_reason?: string; // e.g., "Within your optimal morning window"
  macros?: {
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
  ingredients: Array<{
    item: string;
    amount: string;
    unit: string;
    notes?: string;
  }>;
  instructions: string[];
  notes?: string;
  tags?: string[];
}

interface Day {
  day_name: string;
  day_number: number;
  meals: Meal[];
}

interface DayCardProps {
  day: Day;
  onPress: () => void;
  onLongPress?: () => void;
  themeColor: string;
  isCompleted?: boolean;
  dayDate?: string;
  dayName?: string;
  isToday?: boolean;
  mealPlanning: any; // Add meal planning context
  dayIndex: number; // Add dayIndex to map to current plan
  currentPlan: any; // Add current plan to get live meal data
}

function DayCard({ day, onPress, onLongPress, themeColor, isCompleted, dayDate, dayName, isToday, mealPlanning, dayIndex, currentPlan }: DayCardProps) {
  // Get live meal data from current plan instead of legacy day.meals
  const getCurrentDayMeals = () => {
    if (!currentPlan || typeof dayIndex !== 'number') {
      console.log(`⚠️ DayCard: No current plan or invalid dayIndex (${dayIndex})`);
      return [];
    }
    
    const availableDates = Object.keys(currentPlan.dailyMeals).sort();
    if (dayIndex >= 0 && dayIndex < availableDates.length) {
      const dateKey = availableDates[dayIndex];
      const dayData = currentPlan.dailyMeals[dateKey];
      console.log(`📊 DayCard: Day ${dayIndex} (${dateKey}) has ${dayData?.meals?.length || 0} meals`);
      return dayData?.meals || [];
    }
    
    console.log(`⚠️ DayCard: dayIndex ${dayIndex} out of range (0-${availableDates.length-1})`);
    return [];
  };

  const currentDayMeals = getCurrentDayMeals();
  const mealCount = currentDayMeals.length;

  // For now, disable meal completion tracking and just show as not completed
  const completedMealsCount = 0; // Simplified - all meals show as not completed
  
  const progressPercentage = mealCount > 0 ? (completedMealsCount / mealCount) * 100 : 0;
  
  // Calculate totals from live meal data
  const calculateTotalsFromCurrentMeals = () => {
    if (currentDayMeals.length === 0) {
      return {
        calories: 0,
        macros: { protein: 0, carbs: 0, fat: 0, fiber: 0 }
      };
    }

    const totals = currentDayMeals.reduce((acc, meal) => {
      const calories = meal.nutrition?.calories || meal.calories || 0;
      const nutrition = meal.nutrition || meal.macros || {};
      
      return {
        calories: acc.calories + calories,
        macros: {
          protein: acc.macros.protein + (nutrition.protein || 0),
          carbs: acc.macros.carbs + (nutrition.carbs || nutrition.carbohydrates || 0),
          fat: acc.macros.fat + (nutrition.fat || 0),
          fiber: acc.macros.fiber + (nutrition.fiber || 0),
        }
      };
    }, { calories: 0, macros: { protein: 0, carbs: 0, fat: 0, fiber: 0 } });

    return totals;
  };

  const currentTotals = calculateTotalsFromCurrentMeals();
  const totalCalories = currentTotals.calories;
  const totalMacros = currentTotals.macros;

  // Only hide day cards with no meals if they're old legacy days
  // New empty days should always be shown so users can add meals to them
  if (mealCount === 0 && !currentPlan) {
    console.log(`📊 DayCard: Skipping render for legacy day ${dayIndex} - no meals found`);
    return null;
  }

  if (mealCount === 0) {
    console.log(`📊 DayCard: Rendering empty day ${dayIndex} - ready for meals to be added`);
  }
  
  console.log(`📊 DayCard: Proceeding to render day ${dayIndex} with ${mealCount} meals`);

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { 
          borderLeftColor: isToday ? themeColor : '#3f3f46',
          backgroundColor: '#18181b' 
        }
      ]} 
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={800}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={styles.dayName}>
            {dayName || day.day_name}
            {dayDate && <Text style={styles.dayDate}> • {dayDate}</Text>}
          </Text>
          {isToday && (
            <View style={[
              styles.mealBadge, 
              { backgroundColor: themeColor + '20' }
            ]}>
              <Text style={[
                styles.mealText, 
                { color: themeColor }
              ]}>
                TODAY
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <Ionicons 
            name="chevron-forward" 
            size={24} 
            color={isToday ? themeColor : "#6b7280"} 
          />
        </View>
      </View>
      
      <View style={styles.cardBody}>
        {/* Progress Tracking - Always show */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Meal Progress</Text>
            <Text style={styles.progressText}>
              {completedMealsCount}/{mealCount} completed
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
          </View>
        </View>

        {/* Macros Preview - Always show */}
        <View style={styles.macrosPreview}>
          <Text style={styles.macrosTitle}>Daily Macros</Text>
          <View style={styles.macrosRow}>
            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.macroText}>P: {Math.round(totalMacros.protein)}g</Text>
            </View>
            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: '#3b82f6' }]} />
              <Text style={styles.macroText}>C: {Math.round(totalMacros.carbs)}g</Text>
            </View>
            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.macroText}>F: {Math.round(totalMacros.fat)}g</Text>
            </View>
            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.macroText}>{Math.round(totalCalories)} cal</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MealPlanDaysScreen() {
  const navigation = useNavigation<MealPlanDaysScreenNavigationProp>();
  const route = useRoute<MealPlanDaysScreenRouteProp>();
  const { themeColor } = useTheme();
  const mealPlanning = useMealPlanning();
  const { currentPlan, deleteMealFromDate, saveMealPlan } = useSimplifiedMealPlanning();

  const { week, mealPlanName, mealPrepSession, allMealPrepSessions, groceryList } = route.params;
  
  // Get current grocery list from context to reflect any updates (deletions, additions)
  // First check SimplifiedMealPlan (currentPlan), then legacy meal plan, then fallback
  const currentGroceryList = currentPlan?.grocery_list || mealPlanning.currentMealPlan?.data?.grocery_list || groceryList;
  
  // Generate grocery list from SimplifiedMealPlan if legacy grocery list doesn't exist
  const generateGroceryListFromCurrentPlan = () => {
    console.log('🚀 GENERATING GROCERY LIST FROM SIMPLIFIED MEAL PLAN');
    if (!currentPlan) {
      console.log('❌ No current plan available');
      return null;
    }
    
    const ingredients = new Map<string, { amount: string; unit: string; count: number }>();
    
    // Collect all ingredients from all days
    Object.values(currentPlan.dailyMeals).forEach((day: any) => {
      day.meals.forEach((meal: any) => {
        console.log(`🔍 Meal: ${meal.name}, ingredients:`, meal.ingredients);
        meal.ingredients?.forEach((ingredient: any, index: number) => {
          console.log(`📝 Ingredient ${index}:`, ingredient);
          
          // Try multiple possible name fields
          const key = ingredient.name || ingredient.item || ingredient.ingredient || ingredient.food;
          
          if (key) {
            if (ingredients.has(key)) {
              const existing = ingredients.get(key)!;
              existing.count += 1;
            } else {
              ingredients.set(key, {
                amount: ingredient.amount || ingredient.quantity || '1',
                unit: ingredient.unit || ingredient.measurement || '',
                count: 1
              });
            }
          } else {
            console.warn('⚠️ Ingredient missing name field:', ingredient);
          }
        });
      });
    });
    
    console.log('🛒 Collected ingredients map:', ingredients);
    
    if (ingredients.size === 0) return null;
    
    // Group ingredients by category
    const categorizedIngredients = new Map<string, Array<{name: string; data: any; index: number}>>();
    
    Array.from(ingredients.entries()).forEach(([name, data], index) => {
      // Simple categorization based on ingredient name
      let category = 'Other';
      const nameLower = name.toLowerCase();
      
      if (nameLower.includes('chicken') || nameLower.includes('beef') || nameLower.includes('pork') || 
          nameLower.includes('fish') || nameLower.includes('turkey') || nameLower.includes('salmon') ||
          nameLower.includes('shrimp') || nameLower.includes('tofu') || nameLower.includes('eggs')) {
        category = 'Protein';
      } else if (nameLower.includes('milk') || nameLower.includes('cheese') || nameLower.includes('yogurt') || 
                 nameLower.includes('butter') || nameLower.includes('cream')) {
        category = 'Dairy';
      } else if (nameLower.includes('rice') || nameLower.includes('bread') || nameLower.includes('pasta') || 
                 nameLower.includes('quinoa') || nameLower.includes('oats') || nameLower.includes('flour')) {
        category = 'Grains';
      } else if (nameLower.includes('broccoli') || nameLower.includes('spinach') || nameLower.includes('carrot') || 
                 nameLower.includes('onion') || nameLower.includes('tomato') || nameLower.includes('pepper') ||
                 nameLower.includes('lettuce') || nameLower.includes('cucumber') || nameLower.includes('celery')) {
        category = 'Vegetables';
      } else if (nameLower.includes('apple') || nameLower.includes('banana') || nameLower.includes('berry') || 
                 nameLower.includes('orange') || nameLower.includes('lemon') || nameLower.includes('lime')) {
        category = 'Fruits';
      } else if (nameLower.includes('oil') || nameLower.includes('salt') || nameLower.includes('pepper') || 
                 nameLower.includes('garlic') || nameLower.includes('herb') || nameLower.includes('spice') ||
                 nameLower.includes('vanilla') || nameLower.includes('cinnamon')) {
        category = 'Pantry';
      }
      
      if (!categorizedIngredients.has(category)) {
        categorizedIngredients.set(category, []);
      }
      categorizedIngredients.get(category)!.push({name, data, index});
    });

    const categories = Array.from(categorizedIngredients.entries()).map(([categoryName, items], catIndex) => ({
      name: categoryName,
      items: items.map(({name, data, index}, itemIndex) => ({
        id: `generated_${catIndex}_${itemIndex}_${name.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name, // This is the actual ingredient name
        amount: data.count > 1 ? `${data.amount} (x${data.count})` : data.amount,
        unit: data.unit || '',
        estimated_price: 0 // No price available when generating from ingredients
      }))
    }));
    
    console.log('📦 Generated categories:', categories);

    return {
      categories
    };
  };
  
  // Generate meal prep session from SimplifiedMealPlan
  const generateMealPrepFromCurrentPlan = () => {
    console.log('🍽️ GENERATING MEAL PREP FROM SIMPLIFIED MEAL PLAN');
    if (!currentPlan) {
      console.log('❌ No current plan available for meal prep');
      return null;
    }
    
    const allMeals: any[] = [];
    const uniqueMeals = new Map<string, any>();
    
    Object.values(currentPlan.dailyMeals).forEach((day: any, dayIndex: number) => {
      console.log(`📅 Day ${dayIndex}: ${day.meals?.length || 0} meals`);
      if (day.meals) {
        day.meals.forEach((meal: any) => {
          allMeals.push(meal);
          // Only add unique meal recipes (same name = same recipe)
          if (!uniqueMeals.has(meal.name)) {
            uniqueMeals.set(meal.name, meal);
          }
        });
      }
    });
    
    const uniqueMealsArray = Array.from(uniqueMeals.values());
    console.log(`🍳 Total meals collected: ${allMeals.length}`);
    console.log(`🔄 Unique recipes found: ${uniqueMealsArray.length}`);
    console.log(`📝 Unique meal names:`, uniqueMealsArray.map(m => m.name));
    
    if (uniqueMealsArray.length === 0) {
      console.log('❌ No meals found for meal prep generation');
      return null;
    }
    
    // Smart prep time estimation based on meal complexity
    const estimateMealTime = (meal: any) => {
      const instructions = meal.instructions || [];
      const tags = meal.tags || [];
      
      // Quick meals (no-cook, protein shakes)
      if (tags.includes('no-cook') || tags.includes('quick')) {
        return { prepTime: 5, cookTime: 0 };
      }
      
      // Air fryer meals
      if (tags.includes('air-fryer')) {
        return { prepTime: 10, cookTime: 20 };
      }
      
      // Sheet pan meals
      if (tags.includes('sheet-pan')) {
        return { prepTime: 15, cookTime: 25 };
      }
      
      // Complex meals with many steps
      if (instructions.length > 8) {
        return { prepTime: 20, cookTime: 30 };
      }
      
      // Medium complexity
      if (instructions.length > 5) {
        return { prepTime: 15, cookTime: 20 };
      }
      
      // Simple meals
      return { prepTime: 10, cookTime: 15 };
    };

    const totalPrepTime = uniqueMealsArray.reduce((total, meal, index) => {
      const estimated = estimateMealTime(meal);
      const prepTime = meal.prep_time || meal.prepTime || estimated.prepTime;
      const cookTime = meal.cook_time || meal.cookTime || estimated.cookTime;
      console.log(`🔥 Unique Meal ${index} (${meal.name}): prep=${prepTime}, cook=${cookTime} (estimated: ${estimated.prepTime}+${estimated.cookTime})`);
      return total + prepTime + cookTime;
    }, 0);
    
    console.log(`⏱️ Total prep time calculated: ${totalPrepTime} minutes`);
    
    // Split into 2 logical sessions - more inclusive filtering
    const mainPrepMeals = uniqueMealsArray.filter(meal => {
      const tags = meal.tags || [];
      const instructions = (meal.instructions || []).join(' ').toLowerCase();
      const mealType = (meal.type || '').toLowerCase();
      
      // Main prep: complex meals that benefit from batch cooking
      return (
        tags.includes('batch-cook') || 
        tags.includes('meal-prep') ||
        tags.includes('air-fryer') ||
        instructions.includes('oven') ||
        instructions.includes('bake') ||
        mealType === 'dinner' ||
        (meal.instructions && meal.instructions.length > 6) // Complex recipes
      );
    });
    
    const quickPrepMeals = uniqueMealsArray.filter(meal => {
      const tags = meal.tags || [];
      const instructions = (meal.instructions || []).join(' ').toLowerCase();
      const mealType = (meal.type || '').toLowerCase();
      
      // Quick prep: simple meals, snacks, breakfast items
      return (
        tags.includes('no-cook') || 
        tags.includes('quick') ||
        tags.includes('sheet-pan') ||
        mealType === 'snack' ||
        mealType === 'breakfast' ||
        instructions.includes('microwave') ||
        instructions.includes('blend') ||
        (meal.instructions && meal.instructions.length <= 3) // Simple recipes
      );
    });
    
    // If both categories are empty, distribute meals evenly
    let finalMainPrepMeals = mainPrepMeals;
    let finalQuickPrepMeals = quickPrepMeals;
    
    if (mainPrepMeals.length === 0 && quickPrepMeals.length === 0) {
      const halfPoint = Math.ceil(uniqueMealsArray.length / 2);
      finalMainPrepMeals = uniqueMealsArray.slice(0, halfPoint);
      finalQuickPrepMeals = uniqueMealsArray.slice(halfPoint);
    } else if (mainPrepMeals.length === 0) {
      // Move half of quick meals to main prep
      const halfPoint = Math.ceil(quickPrepMeals.length / 2);
      finalMainPrepMeals = quickPrepMeals.slice(0, halfPoint);
      finalQuickPrepMeals = quickPrepMeals.slice(halfPoint);
    } else if (quickPrepMeals.length === 0) {
      // Move half of main meals to quick prep  
      const halfPoint = Math.ceil(mainPrepMeals.length / 2);
      finalQuickPrepMeals = mainPrepMeals.slice(halfPoint);
      finalMainPrepMeals = mainPrepMeals.slice(0, halfPoint);
    }
    
    const mainPrepTime = finalMainPrepMeals.reduce((total, meal) => {
      const estimated = estimateMealTime(meal);
      return total + (estimated.prepTime + estimated.cookTime);
    }, 0);
    
    const quickPrepTime = finalQuickPrepMeals.reduce((total, meal) => {
      const estimated = estimateMealTime(meal);
      return total + (estimated.prepTime + estimated.cookTime);
    }, 0);
    
    console.log(`📊 Final Main prep meals: ${finalMainPrepMeals.length}, time: ${mainPrepTime} min`);
    console.log(`📝 Final Main prep meal names:`, finalMainPrepMeals.map(m => m.name));
    console.log(`📊 Final Quick prep meals: ${finalQuickPrepMeals.length}, time: ${quickPrepTime} min`);
    console.log(`📝 Final Quick prep meal names:`, finalQuickPrepMeals.map(m => m.name));
    
    const mealPrepSessions = [];
    
    // Helper function to get the next occurrence of a specific day
    const getNextDayDate = (targetDay: number) => {
      const today = new Date();
      const todayDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      let daysUntilTarget = (targetDay - todayDay + 7) % 7;
      if (daysUntilTarget === 0 && today.getHours() >= 18) {
        // If it's already past 6 PM today and we're looking for today, get next week
        daysUntilTarget = 7;
      }
      
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysUntilTarget);
      
      return {
        date: targetDate,
        dateString: targetDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric' 
        })
      };
    };
    
    // Session 1: Sunday Main Prep (batch-cook, meal-prep, air-fryer, oven meals)
    if (finalMainPrepMeals.length > 0) {
      const sundayInfo = getNextDayDate(0); // 0 = Sunday
      
      mealPrepSessions.push({
        id: 'sunday_main_prep',
        session_name: 'Sunday Main Prep',
        session_number: 1,
        name: 'Sunday Main Prep',
        prep_time: Math.round(mainPrepTime * 0.4),
        cook_time: Math.round(mainPrepTime * 0.6),
        total_time: mainPrepTime,
        covers: finalMainPrepMeals.length > 0 ? `${finalMainPrepMeals.length} main prep meals: ${finalMainPrepMeals.map(m => m.name).slice(0, 3).join(', ')}${finalMainPrepMeals.length > 3 ? '...' : ''}` : 'Main proteins and batch items',
        recommended_timing: "Sunday morning - allows time for cooking proteins",
        recommended_date: sundayInfo.dateString,
        equipment_needed: (() => {
          const equipment = new Set<string>();
          finalMainPrepMeals.forEach(meal => {
            const instructions = (meal.instructions || []).join(' ').toLowerCase();
            const tags = meal.tags || [];
            
            if (tags.includes('air-fryer') || instructions.includes('air fryer')) equipment.add('Air fryer');
            if (instructions.includes('oven') || instructions.includes('bake')) equipment.add('Oven');
            if (instructions.includes('baking tray')) equipment.add('Baking tray');
            if (instructions.includes('slice') || instructions.includes('chop')) equipment.add('Sharp knife & cutting board');
            equipment.add('Meal prep containers');
          });
          return Array.from(equipment);
        })(),
        instructions: [],
        storage_guidelines: {
          proteins: "Refrigerate cooked proteins for up to 4 days",
          grains: "Store cooked rice/oats in refrigerator for up to 5 days", 
          vegetables: "Keep roasted vegetables fresh for 3-4 days refrigerated"
        },
        prep_meals: finalMainPrepMeals.map((meal, index) => {
          const estimated = estimateMealTime(meal);
          const prepTime = meal.prep_time || meal.prepTime || estimated.prepTime;
          const cookTime = meal.cook_time || meal.cookTime || estimated.cookTime;
          
          return {
            meal_name: meal.name,
            meal_type: meal.type || meal.meal_type || 'meal',
            prep_time: prepTime,
            cook_time: cookTime,
            total_time: prepTime + cookTime,
            servings: 1,
            calories: meal.calories || 0,
            macros: meal.macros || { protein: 0, carbs: 0, fat: 0, fiber: 0 },
            ingredients: meal.ingredients || [],
            instructions: meal.instructions || [],
            meal_prep_notes: `Batch cook this ${meal.type || 'meal'} for multiple days`,
            tags: meal.tags || []
          };
        })
      });
    }
    
    // Session 2: Wednesday Mini Prep (no-cook, quick, sheet-pan meals)  
    if (finalQuickPrepMeals.length > 0) {
      const wednesdayInfo = getNextDayDate(3); // 3 = Wednesday
      
      mealPrepSessions.push({
        id: 'wednesday_mini_prep',
        session_name: 'Wednesday Mini Prep',
        session_number: 2,
        name: 'Wednesday Mini Prep',
        prep_time: Math.round(quickPrepTime * 0.6),
        cook_time: Math.round(quickPrepTime * 0.4),
        total_time: quickPrepTime,
        covers: finalQuickPrepMeals.length > 0 ? `${finalQuickPrepMeals.length} quick prep meals: ${finalQuickPrepMeals.map(m => m.name).slice(0, 3).join(', ')}${finalQuickPrepMeals.length > 3 ? '...' : ''}` : 'Fresh items and quick meals',
        recommended_timing: "Wednesday evening - refresh for end of week",
        recommended_date: wednesdayInfo.dateString,
        equipment_needed: (() => {
          const equipment = new Set<string>();
          finalQuickPrepMeals.forEach(meal => {
            const instructions = (meal.instructions || []).join(' ').toLowerCase();
            
            if (instructions.includes('microwave')) equipment.add('Microwave');
            if (instructions.includes('shaker')) equipment.add('Protein shaker bottle');
            if (instructions.includes('bowl')) equipment.add('Mixing bowls');
            if (instructions.includes('slice') || instructions.includes('chop')) equipment.add('Sharp knife & cutting board');
          });
          equipment.add('Fresh storage containers');
          return Array.from(equipment);
        })(),
        instructions: [],
        storage_guidelines: {
          proteins: "Refrigerate fresh proteins for up to 3 days",
          vegetables: "Keep cut vegetables fresh for 2-3 days refrigerated",
          assembled_meals: "Consume within 1-2 days for best freshness"
        },
        prep_meals: finalQuickPrepMeals.map((meal, index) => {
          const estimated = estimateMealTime(meal);
          const prepTime = meal.prep_time || meal.prepTime || estimated.prepTime;
          const cookTime = meal.cook_time || meal.cookTime || estimated.cookTime;
          
          return {
            meal_name: meal.name,
            meal_type: meal.type || meal.meal_type || 'meal',
            prep_time: prepTime,
            cook_time: cookTime,
            total_time: prepTime + cookTime,
            servings: 1,
            calories: meal.calories || 0,
            macros: meal.macros || { protein: 0, carbs: 0, fat: 0, fiber: 0 },
            ingredients: meal.ingredients || [],
            instructions: meal.instructions || [],
            meal_prep_notes: `Fresh prep for end of week consumption`,
            tags: meal.tags || []
          };
        })
      });
    }
    
    // If no meals match either category, create one session with all meals
    if (mealPrepSessions.length === 0) {
      const fallbackSundayInfo = getNextDayDate(0); // 0 = Sunday
      
      mealPrepSessions.push({
        id: 'weekly_meal_prep',
        session_name: 'Weekly Meal Prep',
        session_number: 1,
        name: 'Weekly Meal Prep',
        prep_time: Math.round(totalPrepTime * 0.4),
        cook_time: Math.round(totalPrepTime * 0.6),
        total_time: totalPrepTime,
        covers: `${uniqueMealsArray.length} recipes for 7 days`,
        recommended_timing: "Sunday morning or evening for best results",
        recommended_date: fallbackSundayInfo.dateString,
        equipment_needed: (() => {
          const equipment = new Set<string>();
          uniqueMealsArray.forEach(meal => {
            const instructions = (meal.instructions || []).join(' ').toLowerCase();
            const tags = meal.tags || [];
            
            if (tags.includes('air-fryer') || instructions.includes('air fryer')) equipment.add('Air fryer');
            if (instructions.includes('oven') || instructions.includes('bake')) equipment.add('Oven');
            if (instructions.includes('microwave')) equipment.add('Microwave');
            if (instructions.includes('shaker')) equipment.add('Protein shaker bottle');
            if (instructions.includes('bowl')) equipment.add('Mixing bowls');
            if (instructions.includes('baking tray')) equipment.add('Baking tray');
            if (instructions.includes('slice') || instructions.includes('chop')) equipment.add('Sharp knife & cutting board');
            if (meal.type !== 'snack') equipment.add('Meal prep containers');
          });
          return Array.from(equipment);
        })(),
        instructions: [],
        storage_guidelines: {
          proteins: "Refrigerate cooked proteins for up to 4 days",
          grains: "Store cooked rice/oats in refrigerator for up to 5 days", 
          vegetables: "Keep cut vegetables fresh for 3-4 days refrigerated"
        },
        prep_meals: uniqueMealsArray.map((meal, index) => {
          const estimated = estimateMealTime(meal);
          const prepTime = meal.prep_time || meal.prepTime || estimated.prepTime;
          const cookTime = meal.cook_time || meal.cookTime || estimated.cookTime;
          
          return {
            meal_name: meal.name,
            meal_type: meal.type || meal.meal_type || 'meal',
            prep_time: prepTime,
            cook_time: cookTime,
            total_time: prepTime + cookTime,
            servings: 1,
            calories: meal.calories || 0,
            macros: meal.macros || { protein: 0, carbs: 0, fat: 0, fiber: 0 },
            ingredients: meal.ingredients || [],
            instructions: meal.instructions || [],
            meal_prep_notes: `This ${meal.type || 'meal'} can be prepped ahead for convenience`,
            tags: meal.tags || []
          };
        })
      });
    }
    
    console.log('✅ Generated meal prep sessions:', mealPrepSessions);
    return mealPrepSessions;
  };
  
  // Use legacy data if available, otherwise generate from SimplifiedMealPlan
  const effectiveGroceryList = currentGroceryList || generateGroceryListFromCurrentPlan();
  
  // Priority order for meal prep sessions:
  // 1. Use imported meal_prep_sessions array from currentPlan (new multi-session format)
  // 2. Use imported meal_prep_session from currentPlan (legacy single session, wrap in array)
  // 3. Use legacy allMealPrepSessions from route params
  // 4. Generate from current plan as fallback
  let effectiveMealPrepSessions = allMealPrepSessions;
  
  // Check for new multi-session format first
  if (currentPlan?.meal_prep_sessions && currentPlan.meal_prep_sessions.length > 0) {
    console.log('🎯 Using imported meal_prep_sessions array from JSON with multiple sessions');
    effectiveMealPrepSessions = currentPlan.meal_prep_sessions;
  }
  // Check for legacy single session format
  else if (currentPlan?.meal_prep_session) {
    console.log('🎯 Using imported meal_prep_session from JSON (legacy single session, wrapped in array)');
    effectiveMealPrepSessions = [currentPlan.meal_prep_session];
  } 
  // Fall back to route params or generated sessions
  else if (!effectiveMealPrepSessions || effectiveMealPrepSessions.length === 0) {
    console.log('🔥 No imported meal prep sessions, generating from current plan...');
    effectiveMealPrepSessions = generateMealPrepFromCurrentPlan();
    console.log('🔥 Generated meal prep sessions:', effectiveMealPrepSessions);
  } else {
    console.log('🔥 Using legacy meal prep sessions from route params:', effectiveMealPrepSessions);
  }
  
  // Debug logging
  console.log('🔍 MealPrepSessions Debug:', {
    allMealPrepSessions: !!allMealPrepSessions,
    allMealPrepSessionsLength: allMealPrepSessions?.length,
    effectiveMealPrepSessions: !!effectiveMealPrepSessions,
    effectiveMealPrepSessionsLength: effectiveMealPrepSessions?.length,
    currentPlan: !!currentPlan,
    hasDailyMeals: currentPlan ? Object.keys(currentPlan.dailyMeals).length : 0,
    firstSession: effectiveMealPrepSessions?.[0]
  });
  
  // Calculate total cost from actual grocery items (source of truth)
  const calculateGroceryTotal = (groceryData: any) => {
    if (!groceryData?.categories) return 0;
    
    let total = 0;
    groceryData.categories.forEach((category: any) => {
      if (category.items) {
        category.items.forEach((item: any) => {
          total += item.estimated_price || 0;
        });
      }
    });
    return total;
  };
  
  const actualGroceryTotal = calculateGroceryTotal(effectiveGroceryList);
  
  // Helper function to group days by their prep session
  const groupDaysByPrepSession = () => {
    // For legacy format (single session) or when no allMealPrepSessions, show all days ungrouped
    if (!allMealPrepSessions || allMealPrepSessions.length === 0) {
      // Use days from current plan instead of legacy week.days
      const allDays = days.map((day, dayIndex) => ({ day, dayIndex }));
      console.log(`📋 Grouping ${allDays.length} days from current plan instead of legacy week.days`);
      return [{ session: null, days: allDays }];
    }

    console.log('🔍 Grouping days by prep session');
    console.log('allMealPrepSessions:', allMealPrepSessions);
    console.log('week.days:', week.days);

    const groups = [];
    const usedDayIndices = new Set();
    
    allMealPrepSessions.forEach(session => {
      console.log(`🔧 Processing session:`, session.session_name, 'covers_days:', session.covers_days);
      
      const sessionDays = [];
      const sessionDayNames = session.covers_days || [];
      
      days?.forEach((day, dayIndex) => {
        const dayName = day.day_name.split(' ')[0]; // Extract day name (e.g., "Monday" from "Monday 16 Feb")
        console.log(`🔧 Checking day ${dayName} against session days:`, sessionDayNames);
        
        if (sessionDayNames.some(sessionDay => sessionDay.toLowerCase().includes(dayName.toLowerCase()))) {
          sessionDays.push({ day, dayIndex });
          usedDayIndices.add(dayIndex);
          console.log(`✅ Day ${dayName} matched session ${session.session_name}`);
        }
      });
      
      if (sessionDays.length > 0) {
        groups.push({
          session,
          days: sessionDays
        });
      }
    });
    
    // Add any unmatched days to a general group
    const unmatchedDays = [];
    days?.forEach((day, dayIndex) => {
      if (!usedDayIndices.has(dayIndex)) {
        unmatchedDays.push({ day, dayIndex });
      }
    });
    
    if (unmatchedDays.length > 0) {
      groups.push({
        session: null,
        days: unmatchedDays
      });
    }
    
    console.log('🔧 Final groups:', groups);
    return groups;
  };

  // State for tracking meal prep completion
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  
  // State for date picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Create days array from current meal plan instead of legacy week.days
  const createDaysFromCurrentPlan = () => {
    if (!currentPlan) {
      console.log('⚠️ No current plan available, falling back to legacy week.days');
      return week.days || [];
    }

    const availableDates = Object.keys(currentPlan.dailyMeals).sort();
    console.log(`📅 Creating days from ${availableDates.length} available dates in current plan:`, availableDates);
    
    return availableDates.map((date, index) => {
      const dayData = currentPlan.dailyMeals[date];
      
      // Convert SimplifiedMeals to legacy Meal format for compatibility with existing UI
      const convertedMeals = dayData.meals.map((meal, mealIndex) => ({
        meal_name: meal.name,
        meal_type: meal.type as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        calories: meal.nutrition?.calories || 0,
        macros: {
          protein: meal.nutrition?.protein || 0,
          carbs: meal.nutrition?.carbs || meal.nutrition?.carbohydrates || 0,
          fat: meal.nutrition?.fat || 0,
          fiber: meal.nutrition?.fiber || 0,
        },
        ingredients: meal.ingredients || [],
        instructions: meal.instructions || [],
        prep_time: meal.prepTime,
        cook_time: meal.cookTime,
        total_time: meal.totalTime,
        servings: meal.servings,
        recommended_time: meal.time,
        notes: meal.notes,
        tags: meal.tags,
      }));

      return {
        day_name: dayData.dayName || new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
        day_number: index + 1,
        meals: convertedMeals,
        daily_totals: dayData.dailyTotals,
      } as Day;
    });
  };

  const days: Day[] = createDaysFromCurrentPlan();

  const dayGroups = groupDaysByPrepSession();
  
  // Debug: Log the meal prep session and calorie data
  console.log('🔍 MealPlanDaysScreen received data:');
  console.log('Week data:', week);
  console.log('Week days count:', week?.days?.length);
  console.log('First day calories:', week?.days?.[0]?.daily_totals?.calories);
  console.log('First meal calories:', week?.days?.[0]?.meals?.[0]?.calories);
  console.log('DEBUG: mealPrepSession:', mealPrepSession);
  console.log('DEBUG: allMealPrepSessions:', allMealPrepSessions);
  console.log('DEBUG: allMealPrepSessions length:', allMealPrepSessions?.length);
  console.log('DEBUG: dayGroups:', dayGroups);
  console.log('DEBUG: dayGroups length:', dayGroups?.length);
  
  // Load completed meals when component mounts
  useEffect(() => {
    if (mealPrepSession?.prep_meals) {
      // TODO: Load from AsyncStorage
      const loadCompletedMeals = async () => {
        try {
          // const stored = await AsyncStorage.getItem(`prep_meals_${mealPrepSession.session_name}`);
          // if (stored) {
          //   setCompletedTasks(new Set(JSON.parse(stored)));
          // }
        } catch (error) {
          console.error('Failed to load completed meals:', error);
        }
      };
      loadCompletedMeals();
    }
  }, [mealPrepSession]);

  // Calculate the meal plan start date - starts from today (same as MealPlanWeeksScreen)
  const getMealPlanStartDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const getDayDate = (dayIndex: number) => {
    if (currentPlan) {
      // Use actual dates from the meal plan
      const availableDates = Object.keys(currentPlan.dailyMeals).sort();
      if (dayIndex >= 0 && dayIndex < availableDates.length) {
        const dateString = availableDates[dayIndex];
        const date = new Date(dateString);
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const day = date.getDate();
        return `${month} ${day}`;
      }
    }
    
    // Fallback to legacy calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(today);
    
    if (week.week_number === 1) {
      dayDate.setDate(today.getDate() + dayIndex);
    } else {
      const currentDayOfWeek = today.getDay();
      const week1Days = currentDayOfWeek === 0 ? 1 : 8 - currentDayOfWeek;
      let weekStartOffset = week1Days;
      for (let i = 2; i < week.week_number; i++) {
        weekStartOffset += 7;
      }
      dayDate.setDate(today.getDate() + weekStartOffset + dayIndex);
    }
    
    const month = dayDate.toLocaleDateString('en-US', { month: 'short' });
    const day = dayDate.getDate();
    return `${month} ${day}`;
  };

  const getDayName = (dayIndex: number) => {
    if (currentPlan) {
      // Use actual dates from the meal plan
      const availableDates = Object.keys(currentPlan.dailyMeals).sort();
      if (dayIndex >= 0 && dayIndex < availableDates.length) {
        const dateString = availableDates[dayIndex];
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'long' });
      }
    }
    
    // Fallback to legacy calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(today);
    
    if (week.week_number === 1) {
      dayDate.setDate(today.getDate() + dayIndex);
    } else {
      const currentDayOfWeek = today.getDay();
      const week1Days = currentDayOfWeek === 0 ? 1 : 8 - currentDayOfWeek;
      let weekStartOffset = week1Days;
      for (let i = 2; i < week.week_number; i++) {
        weekStartOffset += 7;
      }
      dayDate.setDate(today.getDate() + weekStartOffset + dayIndex);
    }
    
    return dayDate.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const isToday = (dayIndex: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (currentPlan) {
      // Use actual dates from the meal plan
      const availableDates = Object.keys(currentPlan.dailyMeals).sort();
      if (dayIndex >= 0 && dayIndex < availableDates.length) {
        const dateString = availableDates[dayIndex];
        const date = new Date(dateString);
        date.setHours(0, 0, 0, 0);
        return today.toDateString() === date.toDateString();
      }
    }
    
    // Fallback to legacy calculation
    const dayDate = new Date(today);
    
    if (week.week_number === 1) {
      dayDate.setDate(today.getDate() + dayIndex);
    } else {
      const currentDayOfWeek = today.getDay();
      const week1Days = currentDayOfWeek === 0 ? 1 : 8 - currentDayOfWeek;
      let weekStartOffset = week1Days;
      for (let i = 2; i < week.week_number; i++) {
        weekStartOffset += 7;
      }
      dayDate.setDate(today.getDate() + weekStartOffset + dayIndex);
    }
    
    return today.toDateString() === dayDate.toDateString();
  };

  const handleDayPress = (day: Day, index: number) => {
    let calculatedDateString: string;
    
    if (currentPlan) {
      // Use actual date from meal plan
      const availableDates = Object.keys(currentPlan.dailyMeals).sort();
      if (index >= 0 && index < availableDates.length) {
        calculatedDateString = availableDates[index];
      } else {
        console.warn(`⚠️ Day index ${index} out of range`);
        calculatedDateString = new Date().toISOString().split('T')[0];
      }
    } else {
      // Fallback to legacy calculation
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const calculatedDate = new Date(today);
      
      if (week.week_number === 1) {
        calculatedDate.setDate(today.getDate() + index);
      } else {
        const currentDayOfWeek = today.getDay();
        const week1Days = currentDayOfWeek === 0 ? 1 : 8 - currentDayOfWeek;
        let weekStartOffset = week1Days;
        for (let i = 2; i < week.week_number; i++) {
          weekStartOffset += 7;
        }
        calculatedDate.setDate(today.getDate() + weekStartOffset + index);
      }
      calculatedDateString = calculatedDate.toISOString().split('T')[0];
    }
    
    // Create an enhanced day object with the proper date
    const enhancedDay = {
      ...day,
      date: calculatedDateString,
      calculatedDate: new Date(calculatedDateString),
    };
    
    console.log(`📅 Navigation: Passing calculated date ${calculatedDateString} for day ${index}`);
    
    navigation.navigate('MealPlanDay', {
      day: enhancedDay,
      weekNumber: week.week_number,
      mealPlanName,
      dayIndex: index,
      calculatedDayName: getDayName(index),
      calculatedDateString,
    });
  };

  // Day deletion function 
  const handleDayLongPress = (day: Day, dayIndex: number) => {
    Alert.alert(
      'Delete Day',
      `Are you sure you want to delete all meals from ${getDayName(dayIndex)}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteDayMeals(day, dayIndex),
        },
      ],
    );
  };

  // Function to add a new day to the meal plan
  const handleAddDay = () => {
    // Show date picker directly - no intermediate alert
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow);
    setShowDatePicker(true);
  };

  const addNewDay = async (dateToAdd: Date) => {
    try {
      if (!currentPlan) {
        Alert.alert('Error', 'No meal plan loaded');
        return;
      }

      // Create date string more reliably to avoid timezone issues
      const year = dateToAdd.getFullYear();
      const month = String(dateToAdd.getMonth() + 1).padStart(2, '0');
      const day = String(dateToAdd.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      console.log(`➕ Adding new day: ${dateString}`);
      console.log(`📋 Current plan keys before:`, Object.keys(currentPlan.dailyMeals));

      // Check if date already exists
      if (currentPlan.dailyMeals[dateString]) {
        console.log(`⚠️ Date ${dateString} already exists in meal plan`);
        console.log(`📅 Existing dates:`, Object.keys(currentPlan.dailyMeals));
        Alert.alert('Date Already Exists', `A day for ${dateString} (${dateToAdd.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}) already exists in your meal plan.`);
        return;
      }

      console.log(`✅ Date ${dateString} is available - proceeding with creation`);

      // Calculate the day name for the new date
      const dayName = dateToAdd.toLocaleDateString('en-US', { weekday: 'long' });

      // Add the new empty day to the meal plan
      const updatedPlan = {
        ...currentPlan,
        dailyMeals: {
          ...currentPlan.dailyMeals,
          [dateString]: {
            date: dateString,
            dayName: dayName,
            meals: [],
            dailyTotals: {
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              fiber: 0,
            },
          },
        },
      };

      console.log(`📋 Updated plan keys after:`, Object.keys(updatedPlan.dailyMeals));

      // Save the updated plan using the context method
      await saveMealPlan(updatedPlan);
      
      console.log(`✅ Successfully saved plan with new day`);
      
      Alert.alert('Success', `Added new day: ${dateToAdd.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`);
      
    } catch (error) {
      console.error('❌ Error adding new day:', error);
      Alert.alert('Error', 'Failed to add new day');
    }
  };

  // Handle date picker change
  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed') {
      return;
    }

    if (date) {
      if (Platform.OS === 'android') {
        // On Android, immediately add the day
        addNewDay(date);
      } else {
        // On iOS, store the selected date
        setSelectedDate(date);
      }
    }
  };

  // Handle iOS date picker confirmation
  const handleDateConfirm = () => {
    setShowDatePicker(false);
    addNewDay(selectedDate);
  };

  // Function to delete all meals from a specific day
  const deleteDayMeals = async (day: Day, dayIndex: number) => {
    try {
      if (!currentPlan) {
        Alert.alert('Error', 'No meal plan loaded');
        return;
      }

      // Use the same dayIndex mapping approach as the individual day screen
      const availableDates = Object.keys(currentPlan.dailyMeals).sort();
      let dateKey: string;
      
      if (dayIndex >= 0 && dayIndex < availableDates.length) {
        // Map dayIndex to actual plan dates (same as MealPlanDayScreen)
        dateKey = availableDates[dayIndex];
        console.log(`🗑️ Deletion: Mapped dayIndex ${dayIndex} to plan date ${dateKey}`);
      } else {
        console.log(`🗑️ Deletion: dayIndex ${dayIndex} out of range (0-${availableDates.length-1})`);
        Alert.alert('Error', `Invalid day index: ${dayIndex}`);
        return;
      }
      
      console.log(`🗑️ Available dates in plan:`, availableDates);
      console.log(`🗑️ Target date:`, dateKey);

      // Delete the entire day from the meal plan (regardless of meal count)
      const updatedPlan = {
        ...currentPlan,
        dailyMeals: {
          ...currentPlan.dailyMeals
        }
      };

      // Remove the day completely
      delete updatedPlan.dailyMeals[dateKey];

      console.log(`🗑️ Removing day ${dateKey} from meal plan`);
      console.log(`📋 Plan keys before deletion:`, Object.keys(currentPlan.dailyMeals));
      console.log(`📋 Plan keys after deletion:`, Object.keys(updatedPlan.dailyMeals));

      // Save the updated plan
      await saveMealPlan(updatedPlan);
      
      Alert.alert('Success', `Deleted ${getDayName(dayIndex)} from your meal plan`);
      
      console.log(`✅ Successfully deleted day ${dateKey}`);
    } catch (error) {
      console.error('❌ Error deleting day meals:', error);
      Alert.alert('Error', 'Failed to delete day meals');
    }
  };

  const renderDay = ({ item: day, index }: { item: Day; index: number }) => {
    return (
      <DayCard
        day={day}
        onPress={() => handleDayPress(day, index)}
        onLongPress={() => handleDayLongPress(day, index)}
        themeColor={themeColor}
        isCompleted={false} // TODO: Track completion status
        dayDate={getDayDate(index)}
        dayName={getDayName(index)}
        isToday={isToday(index)}
        mealPlanning={mealPlanning}
        dayIndex={index}
        currentPlan={currentPlan}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{mealPlanName}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {days.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="restaurant-outline" size={64} color="#3f3f46" />
          <Text style={styles.emptyTitle}>No Days Found</Text>
          <Text style={styles.emptyDescription}>
            This week doesn't have any days configured.
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Grocery List Section */}
          {effectiveGroceryList && (
            <View style={styles.grocerySection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Shopping List</Text>
              </View>
              <TouchableOpacity 
                style={[styles.groceryCardImproved, { backgroundColor: `${themeColor}08` }]}
                onPress={() => navigation.navigate('GroceryList', { groceryList: effectiveGroceryList })}
                activeOpacity={0.8}
              >
                <View style={styles.groceryIconContainer}>
                  <LinearGradient
                    colors={[themeColor, `${themeColor}CC`]}
                    style={styles.groceryIcon}
                  >
                    <Ionicons name="bag" size={24} color="#ffffff" />
                  </LinearGradient>
                </View>
                <View style={styles.groceryContentImproved}>
                  <View style={styles.groceryAmountRow}>
                    <Text style={styles.groceryAmount}>${actualGroceryTotal.toFixed(2)}</Text>
                    <Text style={styles.groceryLabel}>grocery trip</Text>
                  </View>
                  <Text style={styles.grocerySubtext}>
                    Tap to see your shopping list
                  </Text>
                </View>
                <View style={styles.groceryArrowContainer}>
                  <Ionicons name="chevron-forward" size={22} color={themeColor} />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Prep Sessions Section */}
          {(() => {
            console.log('🧪 Meal prep rendering check:', {
              effectiveMealPrepSessions: !!effectiveMealPrepSessions,
              isArray: Array.isArray(effectiveMealPrepSessions),
              length: effectiveMealPrepSessions?.length,
              firstSession: effectiveMealPrepSessions?.[0]
            });
            return (effectiveMealPrepSessions && effectiveMealPrepSessions.length > 0);
          })() ? (
            <View style={styles.prepSessionsSection}>
              <Text style={styles.sectionTitle}>Meal Prep</Text>
              <Text style={styles.sectionSubtitle}>Your cooking schedule made simple</Text>
              
              {effectiveMealPrepSessions.map((session, index) => (
                <TouchableOpacity 
                  key={session.session_number || index}
                  style={[styles.prepCardImproved, { backgroundColor: `${themeColor}06` }]}
                  onPress={() => {
                    navigation.navigate('MealPrepSession', {
                      mealPrepSession: session,
                      sessionIndex: index,
                      allSessions: effectiveMealPrepSessions,
                    });
                  }}
                >
                  <View style={styles.prepIconContainer}>
                    <LinearGradient
                      colors={[themeColor, `${themeColor}DD`]}
                      style={styles.prepIcon}
                    >
                      <Ionicons 
                        name={index === 0 ? "restaurant" : "leaf"} 
                        size={20} 
                        color="#ffffff" 
                      />
                    </LinearGradient>
                  </View>
                  
                  <View style={styles.prepContentImproved}>
                    <View style={styles.prepHeaderImproved}>
                      <View style={styles.prepTitleRow}>
                        <Text style={styles.prepTitleImproved}>
                          {effectiveMealPrepSessions.length > 1 ? `Prep ${index + 1}` : 'Meal Prep'}
                        </Text>
                        <View style={[styles.prepTimeBadge, { backgroundColor: `${themeColor}20` }]}>
                          <Ionicons name="time" size={14} color={themeColor} />
                          <Text style={[styles.prepTimeBadgeText, { color: themeColor }]}>
                            {session.total_time} min
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.prepDateSection}>
                      <Text style={styles.prepDateText}>
                        {session.recommended_date}
                      </Text>
                      {session.recommended_timing && (
                        <Text style={styles.prepTimingText}>
                          {session.recommended_timing}
                        </Text>
                      )}
                    </View>
                    
                    <Text style={styles.prepMealsText}>
                      {session.covers || 'Meal prep recipes'}
                    </Text>
                  </View>
                  
                  <View style={styles.prepArrowContainer}>
                    <Ionicons name="chevron-forward" size={22} color={themeColor} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : mealPrepSession ? (
            <View style={styles.prepSessionsSection}>
              <TouchableOpacity 
                style={[styles.mealPrepCard, { backgroundColor: `${themeColor}10`, marginBottom: 24 }]}
                onPress={() => {
                  navigation.navigate('MealPrepSession', {
                    mealPrepSession: mealPrepSession
                  });
                }}
              >
                <View style={styles.mealPrepContent}>
                  <View style={[styles.mealPrepIcon, { backgroundColor: themeColor }]}>
                    <Ionicons name="restaurant" size={20} color="#ffffff" />
                  </View>
                  <View style={styles.mealPrepText}>
                    <Text style={styles.mealPrepTitle}>Weekly Meal Prep</Text>
                    <Text style={styles.mealPrepSubtitle}>
                      {mealPrepSession.total_time} min • {mealPrepSession.prep_meals?.length || 0} recipes
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={themeColor} />
                </View>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Daily Meal Plans Section */}
          {days.length > 0 && (
            <View style={styles.daysSection}>
              <Text style={styles.sectionTitle}>Your Week</Text>
              <Text style={styles.sectionSubtitle}>Daily meal plans and progress</Text>
            </View>
          )}

          {/* Days Grouped by Prep Session */}
          {dayGroups.map((group, groupIndex) => (
            <View key={groupIndex} style={styles.dayGroup}>
              {/* Only show group header if there are multiple sessions */}
              {group.session && allMealPrepSessions && allMealPrepSessions.length > 1 && (
                <View style={styles.dayGroupHeader}>
                  <View style={styles.dayGroupLine} />
                  <Text style={styles.dayGroupTitle}>
                    From Prep {allMealPrepSessions?.findIndex(s => s.session_number === group.session.session_number) + 1} ({group.session.prep_day})
                  </Text>
                  <View style={styles.dayGroupLine} />
                </View>
              )}
              
              {group.days.map(({ day, dayIndex }) => (
                <DayCard
                  key={`${week.week_number}-${dayIndex !== undefined ? dayIndex : group.days.findIndex(d => d.day === day)}`}
                  day={day}
                  onPress={() => handleDayPress(day, dayIndex !== undefined ? dayIndex : group.days.findIndex(d => d.day === day))}
                  onLongPress={() => handleDayLongPress(day, dayIndex !== undefined ? dayIndex : group.days.findIndex(d => d.day === day))}
                  themeColor={themeColor}
                  isCompleted={false}
                  dayDate={getDayDate(dayIndex !== undefined ? dayIndex : group.days.findIndex(d => d.day === day))}
                  dayName={getDayName(dayIndex !== undefined ? dayIndex : group.days.findIndex(d => d.day === day))}
                  isToday={isToday(dayIndex !== undefined ? dayIndex : group.days.findIndex(d => d.day === day))}
                  mealPlanning={mealPlanning}
                  dayIndex={dayIndex !== undefined ? dayIndex : group.days.findIndex(d => d.day === day)}
                  currentPlan={currentPlan}
                />
              ))}
            </View>
          ))}

          {/* Add Day Button - Inside ScrollView */}
          <View style={styles.addDayContainer}>
            <TouchableOpacity 
              style={[styles.addDayButton, { borderColor: themeColor }]}
              onPress={handleAddDay}
              activeOpacity={0.7}
            >
              <View style={styles.addDayContent}>
                <Ionicons name="add-circle-outline" size={20} color={themeColor} />
                <Text style={[styles.addDayText, { color: themeColor }]}>
                  Add Day
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Date Picker */}
      {showDatePicker && (
        <View>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
          {Platform.OS === 'ios' && (
            <View style={styles.datePickerButtons}>
              <TouchableOpacity
                style={[styles.datePickerButton, styles.cancelButton]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.datePickerButton, { backgroundColor: themeColor }]}
                onPress={handleDateConfirm}
              >
                <Text style={styles.confirmButtonText}>Add Day</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1f',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 44,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  grocerySection: {
    marginBottom: 32,
  },
  sectionHeaderRow: {
    marginBottom: 16,
  },
  groceryCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  groceryCardFriendly: {
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(24, 24, 27, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(63, 63, 70, 0.3)',
  },
  groceryCardImproved: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 24, 27, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(63, 63, 70, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  groceryIconContainer: {
    marginRight: 16,
  },
  groceryIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  groceryContentImproved: {
    flex: 1,
  },
  groceryAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  groceryAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1,
    marginRight: 8,
  },
  groceryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  grocerySubtext: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
  },
  groceryArrowContainer: {
    marginLeft: 12,
    padding: 4,
  },
  groceryFriendlyContent: {
    flex: 1,
  },
  groceryFriendlyMain: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  groceryFriendlySubtext: {
    fontSize: 15,
    color: '#71717a',
    fontWeight: '500',
  },
  groceryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  groceryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(113, 113, 122, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  groceryInfo: {
    flex: 1,
  },
  groceryTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  grocerySubtext: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  groceryProgress: {
    alignItems: 'flex-end',
  },
  groceryProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717a',
  },
  groceryCategoryPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  groceryCategoryName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
  },
  groceryItemsCount: {
    fontSize: 13,
    color: '#71717a',
  },
  prepSessionsSection: {
    marginBottom: 32,
  },
  daysSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: -0.8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    marginBottom: 20,
    fontWeight: '500',
  },
  dayGroup: {
    marginBottom: 24,
  },
  dayGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  dayGroupLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#3f3f46',
  },
  dayGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a1a1aa',
    marginHorizontal: 16,
  },
  mealPrepCoverage: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  cardTitle: {
    flex: 1,
  },
  dayName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  dayDate: {
    fontSize: 14,
    fontWeight: '400',
    color: '#71717a',
  },
  mealBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mealText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#22c55e',
    letterSpacing: 0.5,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  macrosPreview: {
    backgroundColor: 'rgba(39, 39, 42, 0.5)',
    borderRadius: 8,
    padding: 12,
  },
  macrosTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a1a1aa',
    marginBottom: 8,
  },
  macrosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#d4d4d8',
  },
  progressSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(39, 39, 42, 0.5)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  progressText: {
    fontSize: 11,
    color: '#71717a',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(39, 39, 42, 0.8)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 20,
  },
  mealPrepContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  mealPrepCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mealPrepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealPrepTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mealPrepName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  
  // Meal Prep Styles
  mealPrepContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealPrepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  mealPrepText: {
    flex: 1,
  },
  mealPrepSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  prepCardFriendly: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  prepCardImproved: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    backgroundColor: 'rgba(24, 24, 27, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(63, 63, 70, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  prepIconContainer: {
    marginRight: 16,
    marginTop: 2,
  },
  prepIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  prepContentImproved: {
    flex: 1,
  },
  prepHeaderImproved: {
    marginBottom: 12,
  },
  prepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prepTitleImproved: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.6,
    flex: 1,
  },
  prepTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  prepTimeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  prepDateSection: {
    marginBottom: 12,
  },
  prepDateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  prepTimingText: {
    fontSize: 13,
    color: '#a1a1aa',
    fontWeight: '500',
    lineHeight: 18,
  },
  prepMealsText: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
    lineHeight: 20,
  },
  prepArrowContainer: {
    marginLeft: 12,
    marginTop: 8,
    padding: 4,
  },
  prepFriendlyContent: {
    flex: 1,
  },
  prepFriendlyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  prepFriendlyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  prepFriendlyTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  prepFriendlyWhen: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    marginTop: 4,
  },
  prepFriendlyTiming: {
    fontSize: 13,
    color: '#a1a1aa',
    fontWeight: '500',
    marginBottom: 6,
  },
  prepFriendlyDays: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
    lineHeight: 20,
  },

  // Add Day Button Styles
  addDayContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 34, // Extra padding for safe area
  },
  addDayButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addDayText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },

  // Date Picker Styles
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#18181b',
  },
  datePickerButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  cancelButtonText: {
    color: '#a1a1aa',
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export { DayCard };