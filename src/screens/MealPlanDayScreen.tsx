import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NUTRITION_STORAGE_KEYS } from '../types/nutrition';

type MealPlanDayScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MealPlanDay'>;
type MealPlanDayScreenRouteProp = RouteProp<RootStackParamList, 'MealPlanDay'>;

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

interface MealCardProps {
  meal: Meal;
  onPress: () => void;
  onLongPress: () => void;
  themeColor: string;
  mealIcon: string;
  mealColor: string;
  isCompleted: boolean;
}

function MealCard({ meal, onPress, onLongPress, themeColor, mealIcon, mealColor, isCompleted }: MealCardProps) {
  const totalTime = meal.total_time || (meal.prep_time || 0) + (meal.cook_time || 0);
  
  return (
    <TouchableOpacity 
      style={[
        styles.mealCard, 
        { borderLeftColor: mealColor },
        isCompleted && styles.mealCardCompleted
      ]}
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.mealHeader}>
        <View style={styles.mealTitleRow}>
          <View style={[styles.mealIconContainer, { backgroundColor: mealColor + '20' }]}>
            <Ionicons name={mealIcon as any} size={20} color={mealColor} />
          </View>
          <View style={styles.mealTitleContainer}>
            <Text style={styles.mealName}>{meal.meal_name}</Text>
            <View style={styles.mealSubInfo}>
              <Text style={[styles.mealType, { color: mealColor }]}>
                {meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}
              </Text>
              {meal.recommended_time && (
                <Text style={styles.mealTime}> • {meal.recommended_time}</Text>
              )}
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          {isCompleted && (
            <View style={[styles.completedBadge, { backgroundColor: '#22c55e' }]}>
              <Ionicons name="checkmark" size={16} color="#ffffff" />
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color={themeColor} />
        </View>
      </View>

      {/* Calories and Macros in one clean row */}
      <View style={styles.nutritionRow}>
        {meal.calories && (
          <Text style={[styles.caloriesText, { color: mealColor }]}>{meal.calories} cal</Text>
        )}
        {meal.macros && (
          <View style={styles.macrosInline}>
            <Text style={styles.macroInlineText}>P: {Math.round(meal.macros.protein)}g</Text>
            <Text style={styles.macroInlineText}>C: {Math.round(meal.macros.carbs)}g</Text>
            <Text style={styles.macroInlineText}>F: {Math.round(meal.macros.fat)}g</Text>
          </View>
        )}
      </View>

    </TouchableOpacity>
  );
}

export default function MealPlanDayScreen() {
  const navigation = useNavigation<MealPlanDayScreenNavigationProp>();
  const route = useRoute<MealPlanDayScreenRouteProp>();
  const { themeColor } = useTheme();
  const { markMealCompleted, isMealCompleted, getDailyCompletionProgress, getFavoriteMeals } = useMealPlanning();

  const { day, weekNumber, mealPlanName, dayIndex, calculatedDayName } = route.params;
  const [allMeals, setAllMeals] = useState(day.meals || []);
  const meals = allMeals;

  // Function to load current day's meals from storage
  // Helper function to convert day_name to a proper date string
  const parseDayNameToDate = (dayName: string): string | null => {
    try {
      // Parse "Friday 20 Feb" format
      const parts = dayName.split(' ');
      if (parts.length >= 3) {
        const dayNumber = parseInt(parts[1]);
        const monthStr = parts[2];
        
        // Map month abbreviations to numbers
        const monthMap: { [key: string]: number } = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        
        const monthIndex = monthMap[monthStr];
        if (monthIndex !== undefined) {
          // Assume current year (since meal plans are typically for current period)
          const currentYear = new Date().getFullYear();
          const date = new Date(currentYear, monthIndex, dayNumber);
          return date.toISOString().split('T')[0];
        }
      }
      return null;
    } catch (error) {
      console.error('Error parsing day name to date:', error);
      return null;
    }
  };

  const loadCurrentDayMeals = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const mealPlanData = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN);
      
      console.log('🔍 Debug loadCurrentDayMeals - today:', today);
      console.log('🔍 Debug loadCurrentDayMeals - day.date:', day.date);
      console.log('🔍 Debug loadCurrentDayMeals - day.day_name:', day.day_name);
      console.log('🚨 CRITICAL: Are we viewing today or a different day?');
      console.log('🚨 CRITICAL: day object:', JSON.stringify(day, null, 2));
      
      if (mealPlanData) {
        const currentMealPlan = JSON.parse(mealPlanData);
        console.log('🔍 Debug - currentMealPlan.data?.days length:', currentMealPlan.data?.days?.length);
        
        // CRITICAL FIX: Only look for manually added meals if we're actually viewing TODAY
        // Don't contaminate historical days with today's manually added meals!
        
        // Start with original meals for this specific day (deleted meals are already removed from the data)
        const originalMeals = day.meals || [];
        
        // Get the viewing date
        const currentViewingDate = day.date || parseDayNameToDate(day.day_name);
        
        console.log('🔍 Original day meals:', originalMeals.length);
        console.log('🎯 Currently viewing day date:', currentViewingDate);
        console.log('🎯 Parsed from day_name:', day.day_name, '->', currentViewingDate);
        
        // Look for manually added meals for THIS viewing day
        if (currentViewingDate) {
          console.log('✅ Looking for manually added meals for viewing date:', currentViewingDate);
          
          const viewingData = currentMealPlan.data?.days?.find(d => {
            console.log('🔍 Checking day in storage:', d.date, 'vs viewing date:', currentViewingDate);
            return d.date === currentViewingDate;
          });
          
          console.log('🔍 Debug - viewingData found:', !!viewingData);
          console.log('🔍 Debug - viewingData meals count:', viewingData?.meals?.length || 0);
          
          if (viewingData?.meals && viewingData.date === currentViewingDate) {
            const manualMealsForViewingDay = viewingData.meals.filter(meal => {
              const isManual = meal.isManuallyAdded === true;
              const isForThisDay = meal.addedDate === currentViewingDate || !meal.addedDate;
              console.log(`🔍 Meal "${meal.meal_name}": isManual=${isManual}, addedDate="${meal.addedDate}", isForThisDay=${isForThisDay}`);
              return isManual && isForThisDay;
            });
            
            if (manualMealsForViewingDay.length > 0) {
              // Convert manually added meals to the display format while preserving the isManuallyAdded flag
              const convertedManualMeals = manualMealsForViewingDay.map(meal => ({
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
                isManuallyAdded: true // CRITICAL: Preserve this flag for delete functionality
              }));
              
              const combinedMeals = [...originalMeals, ...convertedManualMeals];
              console.log('🔍 Original meals:', originalMeals.length);
              console.log('🔍 Manual meals for viewing day:', manualMealsForViewingDay.length);
              console.log('🔍 Converted manual meals with isManuallyAdded flag:', convertedManualMeals.length);
              console.log('🔍 Combined meals:', combinedMeals.length);
              
              // Debug: Log each meal with its isManuallyAdded status
              combinedMeals.forEach((meal, index) => {
                console.log(`🔍 Meal ${index}: "${meal.meal_name}" - isManuallyAdded: ${(meal as any).isManuallyAdded}`);
              });
              
              setAllMeals(combinedMeals);
              console.log('🔄 Updated meals display with viewing day\'s manual meals:', combinedMeals.length);
            } else {
              console.log('⚠️ No manual meals found for viewing day');
              setAllMeals(originalMeals);
              console.log('🔄 Showing original meals only:', originalMeals.length);
            }
          } else {
            console.log('⚠️ No viewing day data found in storage');
            setAllMeals(originalMeals);
            console.log('🔄 Showing original meals only:', originalMeals.length);
          }
        } else {
          console.log('🚫 No viewing date available - showing original meals only');
          setAllMeals(originalMeals);
          console.log('🔄 Showing original meals only:', originalMeals.length);
        }
        
        // The main logic above already handles manually added meals correctly
        // No need for additional fallback logic that was causing cross-day contamination
      } else {
        console.log('⚠️ No meal plan data found in storage');
        // Fallback to original meals
        const originalMeals = day.meals || [];
        setAllMeals(originalMeals);
      }
    } catch (error) {
      console.error('❌ Error loading current day meals:', error);
      // Fallback to original meals on error
      const originalMeals = day.meals || [];
      setAllMeals(originalMeals);
    }
  }, [day.date, day.meals, day.day_name]);

  // Load meals when screen focuses
  React.useEffect(() => {
    loadCurrentDayMeals();
  }, [loadCurrentDayMeals]);

  // Add meal modal state
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [addMealType, setAddMealType] = useState<'manual' | 'favorite' | null>(null);
  const [selectedFavoriteMeal, setSelectedFavoriteMeal] = useState<any>(null);
  const [newMealName, setNewMealName] = useState('');
  const [newMealTime, setNewMealTime] = useState('');
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('PM');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [newMealCalories, setNewMealCalories] = useState('');
  const [newMealProtein, setNewMealProtein] = useState('');
  const [newMealCarbs, setNewMealCarbs] = useState('');
  const [newMealFat, setNewMealFat] = useState('');
  
  // Get favorite meals and meal planning functions
  const favoriteMeals = getFavoriteMeals();
  const mealPlanningContext = useMealPlanning();
  const { saveMealPlan, currentMealPlan } = mealPlanningContext;

  // Function to add a meal to the current viewing day's timeline
  const addMealToToday = async (meal: any, time: string) => {
    try {
      console.log('🚀 Adding meal to viewing day:', meal?.name, 'at', time);
      
      // Load the current meal plan from storage directly
      const mealPlanData = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN);
      if (!mealPlanData) {
        Alert.alert('Error', 'No meal plan found. Please generate a meal plan first.');
        return false;
      }
      
      const currentMealPlan = JSON.parse(mealPlanData);
      console.log('📊 Loaded meal plan from storage');
      
      // Create a new meal object with updated time
      const newMeal = {
        ...meal,
        id: `${meal.id}_added_${Date.now()}`,
        time: time,
        isManuallyAdded: true
      };

      // Use the VIEWING day's date, not today's date
      const viewingDate = day.date || parseDayNameToDate(day.day_name) || new Date().toISOString().split('T')[0];
      console.log('📅 Adding meal to viewing date:', viewingDate);
      console.log('📅 Parsed from day_name:', day.day_name, '->', parseDayNameToDate(day.day_name));
      
      // Find the viewing day's meal plan day or create it
      const updatedDays = [...(currentMealPlan.days || [])];
      let viewingDayIndex = updatedDays.findIndex(day => day.date === viewingDate);
      
      if (viewingDayIndex === -1) {
        console.log('➕ Creating new day for viewing date');
        // Create new day if it doesn't exist
        const newDay = {
          date: viewingDate,
          meals: [newMeal],
          totalCalories: meal.nutritionInfo?.calories || 0,
          totalMacros: {
            protein: meal.nutritionInfo?.protein || 0,
            carbs: meal.nutritionInfo?.carbs || 0,
            fat: meal.nutritionInfo?.fat || 0
          }
        };
        updatedDays.push(newDay);
      } else {
        console.log('📝 Adding to existing viewing day');
        // Add to existing day
        updatedDays[viewingDayIndex] = {
          ...updatedDays[viewingDayIndex],
          meals: [...(updatedDays[viewingDayIndex].meals || []), newMeal],
          totalCalories: (updatedDays[viewingDayIndex].totalCalories || 0) + (meal.nutritionInfo?.calories || 0),
          totalMacros: {
            protein: (updatedDays[viewingDayIndex].totalMacros?.protein || 0) + (meal.nutritionInfo?.protein || 0),
            carbs: (updatedDays[viewingDayIndex].totalMacros?.carbs || 0) + (meal.nutritionInfo?.carbs || 0),
            fat: (updatedDays[viewingDayIndex].totalMacros?.fat || 0) + (meal.nutritionInfo?.fat || 0)
          }
        };
      }

      // Update the meal plan in both formats
      const updatedMealPlan = {
        ...currentMealPlan,
        days: updatedDays
      };

      // Create the meal in timeline format
      const newMealForDataFormat = {
        meal_name: meal.name,
        meal_type: meal.type || 'lunch',
        time: time,
        recommended_time: time, // This is what the timeline displays
        calories: meal.nutritionInfo?.calories || 0,
        macros: {
          protein: meal.nutritionInfo?.protein || 0,
          carbs: meal.nutritionInfo?.carbs || 0,
          fat: meal.nutritionInfo?.fat || 0,
          fiber: meal.nutritionInfo?.fiber || 0
        },
        ingredients: meal.ingredients || [],
        instructions: meal.instructions || [],
        isManuallyAdded: true,
        addedDate: viewingDate // Explicitly track the target date
      };

      // ONLY work with data.days format - create deep copies to avoid shared references
      if (!currentMealPlan.data) {
        currentMealPlan.data = { days: [] };
      }
      
      if (!currentMealPlan.data.days) {
        currentMealPlan.data.days = [];
      }

      // Create a DEEP copy of data.days to avoid any shared references
      const updatedDataDays = currentMealPlan.data.days.map(day => ({
        ...day,
        meals: day.meals ? [...day.meals] : [] // Deep copy the meals array too
      }));
      
      console.log('🔍 DEBUG: Looking for viewing date in data.days...');
      console.log('🔍 DEBUG: Viewing date is:', viewingDate);
      console.log('🔍 DEBUG: Available days:');
      updatedDataDays.forEach((day, index) => {
        console.log(`🔍 DEBUG: Day ${index}: date="${day.date}", day_name="${day.day_name}"`);
      });
      
      // Find viewing day with EXACT date matching
      let viewingDataIndex = updatedDataDays.findIndex(day => {
        console.log(`🔍 DEBUG: Comparing day.date "${day.date}" === viewingDate "${viewingDate}": ${day.date === viewingDate}`);
        return day.date === viewingDate; // Must be exact match - no fallbacks
      });
      
      console.log('🔍 DEBUG: viewingDataIndex:', viewingDataIndex);

      if (viewingDataIndex === -1) {
        // Create new day entry specifically for viewing date
        console.log('➕ Creating NEW day specifically for viewing date');
        const newDataDay = {
          date: viewingDate, // Exact date format
          day_name: `Manual Meals ${viewingDate}`, // Clear identifier
          meals: [newMealForDataFormat]
        };
        updatedDataDays.push(newDataDay);
        console.log('✅ Created brand new day entry for viewing date');
      } else {
        // Add meal ONLY to the found viewing day
        console.log('📝 Adding meal ONLY to existing viewing day');
        updatedDataDays[viewingDataIndex].meals.push(newMealForDataFormat);
        console.log(`✅ Added meal to day ${viewingDataIndex} - total meals now: ${updatedDataDays[viewingDataIndex].meals.length}`);
      }

      // Update ONLY the data.days format 
      updatedMealPlan.data = {
        ...currentMealPlan.data,
        days: updatedDataDays
      };
      
      console.log('📋 Final meal plan structure created with targeted day update');

      // Save back to storage
      await AsyncStorage.setItem(
        NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN,
        JSON.stringify(updatedMealPlan)
      );
      
      // Also save using the context method to update the state
      await saveMealPlan(updatedMealPlan);
      
      console.log('✅ Meal added to viewing day\'s timeline successfully!');
      console.log('🔄 Context state should now be updated');
      console.log('📋 Added meal with recommended_time:', time);
      
      // Refresh the meal display to show the newly added meal
      console.log('🔄 Refreshing meal display...');
      await loadCurrentDayMeals();
      console.log('✅ Meal display refreshed');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to add meal to timeline:', error);
      Alert.alert('Error', 'Failed to add meal to timeline');
      return false;
    }
  };


  // Generate a date string for this day using the same logic as other screens
  const getDayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const getDayDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate the date for this specific day using the same logic as MealPlanDaysScreen
    const dayDate = new Date(today);
    
    if (weekNumber === 1) {
      // Week 1: Start from today
      dayDate.setDate(today.getDate() + dayIndex);
    } else {
      // Week 2+: Calculate based on week start offset
      const currentDayOfWeek = today.getDay();
      const week1Days = currentDayOfWeek === 0 ? 1 : 8 - currentDayOfWeek;
      
      // Calculate start date of this week
      let weekStartOffset = week1Days; // Days after today that Week 2 starts
      for (let i = 2; i < weekNumber; i++) {
        weekStartOffset += 7; // Add 7 days for each full week
      }
      
      dayDate.setDate(today.getDate() + weekStartOffset + dayIndex);
    }
    
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    };
    return dayDate.toLocaleDateString('en-US', options);
  };

  const dayDateString = getDayDateString();

  // Generate a unique ID for meals since the current interface doesn't have one
  const generateMealId = (meal: Meal, globalIndex: number) => {
    // Use a combination of meal name, type, and index for uniqueness
    const cleanName = meal.meal_name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `${cleanName}_${meal.meal_type}_${globalIndex}`;
  };

  // Function to delete any meal (manual or original)
  const deleteMealFromDay = async (meal: Meal, index: number) => {
    try {
      console.log('🗑️ Attempting to delete meal:', meal.meal_name);
      const isManuallyAdded = (meal as any).isManuallyAdded === true;
      
      if (isManuallyAdded) {
        // Handle manually added meals - remove from storage
        console.log('🗑️ Deleting manually added meal from storage');
        
        // Load the current meal plan from storage
        const mealPlanData = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN);
        if (!mealPlanData) {
          Alert.alert('Error', 'No meal plan found.');
          return false;
        }
        
        const currentMealPlan = JSON.parse(mealPlanData);
        
        // Get the viewing date
        const currentViewingDate = day.date || parseDayNameToDate(day.day_name) || new Date().toISOString().split('T')[0];
        console.log('🗑️ Deleting from viewing date:', currentViewingDate);
        
        // Find the day in data.days format
        if (!currentMealPlan.data?.days) {
          console.log('⚠️ No data.days found');
          return false;
        }
        
        const updatedDataDays = currentMealPlan.data.days.map(day => ({
          ...day,
          meals: day.meals ? [...day.meals] : []
        }));
        
        const viewingDataIndex = updatedDataDays.findIndex(day => day.date === currentViewingDate);
        
        if (viewingDataIndex === -1) {
          console.log('⚠️ No day found for deletion');
          Alert.alert('Error', 'Could not find the day to delete from.');
          return false;
        }
        
        // Filter out the manually added meal
        const originalMealsLength = updatedDataDays[viewingDataIndex].meals.length;
        updatedDataDays[viewingDataIndex].meals = updatedDataDays[viewingDataIndex].meals.filter(m => {
          const isMatch = m.meal_name === meal.meal_name && 
                         m.isManuallyAdded === true && 
                         m.recommended_time === meal.recommended_time;
          if (isMatch) {
            console.log('🗑️ Found matching manually added meal to delete:', m.meal_name, 'at', m.recommended_time);
          }
          return !isMatch;
        });
        
        const newMealsLength = updatedDataDays[viewingDataIndex].meals.length;
        
        if (originalMealsLength === newMealsLength) {
          console.log('⚠️ No meal was deleted - no match found');
          Alert.alert('Error', 'Could not find the meal to delete.');
          return false;
        }
        
        console.log(`🗑️ Successfully removed manually added meal. Meals count: ${originalMealsLength} -> ${newMealsLength}`);
        
        // Update the meal plan
        const updatedMealPlan = {
          ...currentMealPlan,
          data: {
            ...currentMealPlan.data,
            days: updatedDataDays
          }
        };
        
        // Save to storage
        await AsyncStorage.setItem(
          NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN,
          JSON.stringify(updatedMealPlan)
        );
        
        // Update context
        await saveMealPlan(updatedMealPlan);
        
        console.log('✅ Manually added meal deleted successfully!');
        
      } else {
        // Handle original meal plan meals - actually remove them from the data structure
        console.log('🗑️ Permanently deleting original meal plan meal from data structure');
        
        // Load the current meal plan from storage
        const mealPlanData = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN);
        if (!mealPlanData) {
          Alert.alert('Error', 'No meal plan found.');
          return false;
        }
        
        const currentMealPlan = JSON.parse(mealPlanData);
        
        // Get the viewing date to find the correct day in the original data structure
        const currentViewingDate = day.date || parseDayNameToDate(day.day_name);
        console.log('🗑️ Deleting meal from original data structure for date:', currentViewingDate);
        
        // The meal being displayed comes from day.meals (the original week data structure)
        // We need to remove it from ALL possible data structures to ensure it's gone everywhere
        
        let mealFound = false;
        
        // Remove from the data.weeks structure (this is where the original data comes from)
        if (currentMealPlan.data?.weeks) {
          currentMealPlan.data.weeks.forEach(week => {
            week.days?.forEach(weekDay => {
              if (weekDay.meals) {
                const originalLength = weekDay.meals.length;
                weekDay.meals = weekDay.meals.filter(m => {
                  const shouldRemove = m.meal_name === meal.meal_name && 
                                     m.recommended_time === meal.recommended_time;
                  if (shouldRemove) {
                    mealFound = true;
                    console.log('🗑️ Removed meal from weeks structure:', m.meal_name, 'from day:', weekDay.day_name);
                  }
                  return !shouldRemove;
                });
                
                if (weekDay.meals.length !== originalLength) {
                  console.log(`🗑️ Day ${weekDay.day_name}: meals count ${originalLength} -> ${weekDay.meals.length}`);
                }
              }
            });
          });
        }
        
        // Also remove from data.days if it exists  
        if (currentMealPlan.data?.days) {
          currentMealPlan.data.days.forEach(dataDay => {
            if (dataDay.meals) {
              const originalLength = dataDay.meals.length;
              dataDay.meals = dataDay.meals.filter(m => {
                const shouldRemove = m.meal_name === meal.meal_name && 
                                   m.recommended_time === meal.recommended_time;
                if (shouldRemove) {
                  mealFound = true;
                  console.log('🗑️ Removed meal from days structure:', m.meal_name);
                }
                return !shouldRemove;
              });
              
              if (dataDay.meals.length !== originalLength) {
                console.log(`🗑️ Data day: meals count ${originalLength} -> ${dataDay.meals.length}`);
              }
            }
          });
        }
        
        if (!mealFound) {
          console.log('⚠️ WARNING: Meal was not found in any data structure! This might cause it to reappear.');
          console.log('🔍 Looking for meal:', meal.meal_name, 'with time:', meal.recommended_time);
        }
        
        // Save to storage
        await AsyncStorage.setItem(
          NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN,
          JSON.stringify(currentMealPlan)
        );
        
        // Update context
        await saveMealPlan(currentMealPlan);
        
        console.log('✅ Original meal permanently deleted from data structure!');
        
        // Immediately update the display by removing the meal from current state
        const updatedMeals = allMeals.filter(m => 
          !(m.meal_name === meal.meal_name && m.recommended_time === meal.recommended_time)
        );
        setAllMeals(updatedMeals);
        console.log(`🔄 Immediate display update: ${allMeals.length} -> ${updatedMeals.length} meals`);
        
        // Also refresh from storage to ensure consistency
        await loadCurrentDayMeals();
      }
      
      Alert.alert('Success', 'Meal deleted successfully!');
      return true;
      
    } catch (error) {
      console.error('❌ Error deleting meal:', error);
      Alert.alert('Error', 'Failed to delete meal. Please try again.');
      return false;
    }
  };

  // Handle long press to show options
  const handleMealLongPress = async (meal: Meal, index: number) => {
    const mealId = generateMealId(meal, index);
    const isCurrentlyCompleted = isMealCompleted(mealId, dayDateString);
    const isManuallyAdded = (meal as any).isManuallyAdded === true;
    
    console.log('Long press:', { 
      mealName: meal.meal_name, 
      mealId, 
      index, 
      dayDateString, 
      isCurrentlyCompleted,
      isManuallyAdded,
      fullMeal: meal
    });
    
    console.log('🔍 DEBUG: Checking meal for delete option');
    console.log('🔍 DEBUG: meal.isManuallyAdded =', (meal as any).isManuallyAdded);
    console.log('🔍 DEBUG: typeof meal.isManuallyAdded =', typeof (meal as any).isManuallyAdded);
    console.log('🔍 DEBUG: Will show delete option?', isManuallyAdded);
    
    // Show action sheet with options
    const options = [];
    
    // Always show completion toggle
    options.push(isCurrentlyCompleted ? 'Mark as Incomplete' : 'Mark as Complete');
    
    // Show delete option for all meals
    options.push('Delete Meal');
    
    options.push('Cancel');
    
    Alert.alert(
      meal.meal_name,
      'Choose an action:',
      options.map((option, optionIndex) => ({
        text: option,
        style: option === 'Cancel' ? 'cancel' : option === 'Delete Meal' ? 'destructive' : 'default',
        onPress: async () => {
          if (option === 'Cancel') {
            return;
          } else if (option === 'Delete Meal') {
            // Show confirmation dialog
            Alert.alert(
              'Delete Meal',
              `Are you sure you want to delete "${meal.meal_name}"?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Delete', 
                  style: 'destructive',
                  onPress: () => deleteMealFromDay(meal, index)
                }
              ]
            );
          } else {
            // Toggle completion
            try {
              await markMealCompleted(mealId, dayDateString, !isCurrentlyCompleted);
              console.log('Meal completion updated successfully');
            } catch (error) {
              console.error('Failed to toggle meal completion:', error);
            }
          }
        }
      }))
    );
  };

  // Calculate daily totals
  const dailyTotals = meals.reduce((totals, meal) => {
    return {
      calories: totals.calories + (meal.calories || 0),
      protein: totals.protein + (meal.macros?.protein || 0),
      carbs: totals.carbs + (meal.macros?.carbs || 0),
      fat: totals.fat + (meal.macros?.fat || 0),
      fiber: totals.fiber + (meal.macros?.fiber || 0),
      prepTime: totals.prepTime + (meal.total_time || meal.prep_time || 0),
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, prepTime: 0 });

  // Calculate completion progress
  const completedMealsCount = meals.filter((meal, index) => {
    const mealId = generateMealId(meal, index);
    const isCompleted = isMealCompleted(mealId, dayDateString);
    console.log('Progress check:', { 
      mealName: meal.meal_name, 
      mealId, 
      index, 
      isCompleted 
    });
    return isCompleted;
  }).length;
  
  // Calculate nutrition from completed meals only
  const completedNutrition = meals.reduce((totals, meal, index) => {
    const mealId = generateMealId(meal, index);
    const isCompleted = isMealCompleted(mealId, dayDateString);
    
    if (isCompleted) {
      return {
        calories: totals.calories + (meal.calories || 0),
        protein: totals.protein + (meal.macros?.protein || 0),
        carbs: totals.carbs + (meal.macros?.carbs || 0),
        fat: totals.fat + (meal.macros?.fat || 0),
      };
    }
    return totals;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  
  const progressPercentage = meals.length > 0 ? (completedMealsCount / meals.length) * 100 : 0;
  
  console.log('Progress summary:', {
    completedMealsCount,
    totalMeals: meals.length,
    progressPercentage
  });

  const getMealIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return 'sunny';
      case 'lunch': return 'partly-sunny';
      case 'dinner': return 'moon';
      case 'snack': return 'nutrition';
      default: return 'restaurant';
    }
  };

  const getMealColor = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return '#f59e0b';
      case 'lunch': return '#06b6d4';
      case 'dinner': return '#8b5cf6';
      case 'snack': return '#10b981';
      default: return '#71717a';
    }
  };

  const handleMealPress = (meal: Meal) => {
    navigation.navigate('MealPlanMealDetail', {
      meal,
      dayName: calculatedDayName,
      weekNumber,
      mealPlanName,
    });
  };

  // Helper function to convert time string to minutes for sorting
  const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    try {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      
      let totalMinutes;
      if (period === 'AM') {
        if (hours === 12) {
          totalMinutes = minutes; // 12:XX AM = XX minutes after midnight
        } else {
          totalMinutes = hours * 60 + minutes;
        }
      } else { // PM
        if (hours === 12) {
          totalMinutes = 12 * 60 + minutes; // 12:XX PM = 720 + XX minutes
        } else {
          totalMinutes = (hours + 12) * 60 + minutes; // 1-11 PM = add 12 hours
        }
      }
      
      console.log(`⏰ Time conversion: ${timeStr} = ${totalMinutes} minutes`);
      return totalMinutes;
    } catch {
      return 0;
    }
  };

  // Sort meals chronologically by recommended_time, fallback to meal type order
  const mealTypeOrder = { 'breakfast': 0, 'snack': 1, 'lunch': 2, 'dinner': 3 };
  const sortedMeals = meals.sort((a, b) => {
    const timeA = a.recommended_time ? timeToMinutes(a.recommended_time) : mealTypeOrder[a.meal_type] * 360; // 6-hour gaps as fallback
    const timeB = b.recommended_time ? timeToMinutes(b.recommended_time) : mealTypeOrder[b.meal_type] * 360;
    
    console.log(`⏰ Sorting: ${a.meal_name} (${a.recommended_time || 'no time'}) = ${timeA} minutes`);
    console.log(`⏰ Sorting: ${b.meal_name} (${b.recommended_time || 'no time'}) = ${timeB} minutes`);
    console.log(`⏰ Comparison: ${a.meal_name} vs ${b.meal_name} = ${timeA - timeB}`);
    
    return timeA - timeB;
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Compact Header */}
        <View style={styles.compactHeader}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.dayTitle}>{calculatedDayName.split(',')[0]}</Text>
            <Text style={styles.dateSubtitle}>{getDayDate().split(' ').slice(1).join(' ')}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setShowAddMealModal(true)} 
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
        {/* Compact Progress Card */}
        <View style={styles.section}>
          <View style={[styles.modernProgressCard, { borderColor: `${themeColor}20` }]}>
            {/* Progress Header */}
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.modernProgressTitle}>Today's Progress</Text>
                <Text style={styles.modernProgressSubtitle}>
                  {completedMealsCount} of {meals.length} meals completed
                </Text>
              </View>
              <View style={[styles.percentageCircle, { borderColor: themeColor }]}>
                <Text style={[styles.percentageText, { color: themeColor }]}>
                  {Math.round(progressPercentage)}%
                </Text>
              </View>
            </View>
            
            {/* Modern Progress Bar */}
            <View style={styles.modernProgressBarContainer}>
              <View style={[
                styles.modernProgressBar, 
                { 
                  width: `${progressPercentage}%`, 
                  backgroundColor: themeColor,
                  shadowColor: themeColor
                }
              ]} />
            </View>
            
            {/* Remaining Nutrition Grid */}
            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: '#ef4444' }]}>
                  {Math.max(0, Math.round(dailyTotals.protein - completedNutrition.protein))}g
                </Text>
                <Text style={styles.nutritionLabel}>Protein</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: '#3b82f6' }]}>
                  {Math.max(0, Math.round(dailyTotals.carbs - completedNutrition.carbs))}g
                </Text>
                <Text style={styles.nutritionLabel}>Carbs</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: '#f59e0b' }]}>
                  {Math.max(0, Math.round(dailyTotals.fat - completedNutrition.fat))}g
                </Text>
                <Text style={styles.nutritionLabel}>Fat</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: '#22c55e' }]}>
                  {Math.max(0, Math.round(dailyTotals.calories - completedNutrition.calories))}
                </Text>
                <Text style={styles.nutritionLabel}>Calories</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sequential Meals Timeline */}
        <View style={styles.mealSection}>
          <View style={styles.mealSectionHeader}>
            <Ionicons name="time" size={20} color={themeColor} />
            <Text style={[styles.mealSectionTitle, { color: themeColor }]}>Your Daily Timeline</Text>
            <Text style={styles.mealCount}>{meals.length} meal{meals.length > 1 ? 's' : ''}</Text>
          </View>
          
          {sortedMeals.map((meal, index) => {
            const mealId = generateMealId(meal, index);
            const isCompleted = isMealCompleted(mealId, dayDateString);
            
            return (
              <MealCard
                key={index}
                meal={meal}
                onPress={() => handleMealPress(meal)}
                onLongPress={() => handleMealLongPress(meal, index)}
                themeColor={themeColor}
                mealIcon={getMealIcon(meal.meal_type)}
                mealColor={getMealColor(meal.meal_type)}
                isCompleted={isCompleted}
              />
            );
          })}
        </View>

        {meals.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={64} color="#3f3f46" />
            <Text style={styles.emptyTitle}>No Meals Planned</Text>
            <Text style={styles.emptyDescription}>
              This day doesn't have any meals configured.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Meal Modal */}
      <Modal
        visible={showAddMealModal}
        transparent={false}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowAddMealModal(false)}
      >
        <View style={styles.modalScreen}>
          {/* Navigation Header */}
          <View style={styles.navHeader}>
            <TouchableOpacity 
              onPress={() => {
                setShowAddMealModal(false);
                setAddMealType(null);
                setSelectedFavoriteMeal(null);
                setNewMealName('');
                setNewMealTime('');
                setSelectedHour(12);
                setSelectedMinute(0);
                setSelectedPeriod('PM');
                setShowTimePicker(false);
                setNewMealCalories('');
                setNewMealProtein('');
                setNewMealCarbs('');
                setNewMealFat('');
              }}
              style={styles.navBackButton}
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Add Meal</Text>
            <View style={styles.navSpacer} />
          </View>

          <ScrollView 
            style={styles.scrollContent}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {!addMealType ? (
              /* Meal Type Selection */
              <View style={styles.mealTypeSelection}>
                <Text style={styles.selectionTitle}>What would you like to add?</Text>
                
                <TouchableOpacity
                  style={styles.mealTypeOption}
                  onPress={() => setAddMealType('manual')}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionIconContainer}>
                    <Ionicons name="create-outline" size={32} color={themeColor} />
                  </View>
                  <Text style={styles.optionTitle}>Manual Meal</Text>
                  <Text style={styles.optionDescription}>
                    Create a custom meal with your own details
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.mealTypeOption}
                  onPress={() => {
                    if (favoriteMeals.length === 0) {
                      Alert.alert('No Favorites', 'You haven\'t favorited any meals yet. Favorite meals from your meal plans to use them here!');
                    } else {
                      setAddMealType('favorite');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionIconContainer}>
                    <Ionicons name="heart-outline" size={32} color="#ef4444" />
                  </View>
                  <Text style={styles.optionTitle}>From Favorites</Text>
                  <Text style={styles.optionDescription}>
                    Add a meal from your saved favorites
                  </Text>
                </TouchableOpacity>
              </View>
            ) : addMealType === 'favorite' ? (
              /* Favorites Selection */
              <View style={styles.favoritesSelection}>
                <Text style={styles.formTitle}>Choose from Favorites</Text>
                
                <ScrollView showsVerticalScrollIndicator={false}>
                  {favoriteMeals.map((favorite, index) => {
                    console.log('🍽️ Favorite meal data:', JSON.stringify(favorite, null, 2));
                    return (
                    <TouchableOpacity
                      key={favorite.mealId}
                      style={[
                        styles.favoriteMealCard,
                        selectedFavoriteMeal?.mealId === favorite.mealId && styles.selectedMealCard
                      ]}
                      onPress={() => {
                        console.log('🎯 Meal card tapped:', favorite.meal?.name || favorite.meal?.meal_name);
                        setSelectedFavoriteMeal(favorite);
                        console.log('✅ Selected favorite meal set');
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.mealCardHeader}>
                        <Text style={styles.favoriteMealName}>
                          {favorite.meal?.meal_name || favorite.meal?.name || 'Unknown Meal'}
                        </Text>
                        <View style={styles.mealMetrics}>
                          <Text style={styles.calorieText}>
                            {favorite.meal?.calories || favorite.meal?.nutritionInfo?.calories || 0} cal
                          </Text>
                          {selectedFavoriteMeal?.mealId === favorite.mealId && (
                            <Ionicons name="checkmark-circle" size={20} color={themeColor} />
                          )}
                        </View>
                      </View>
                      
                      {(favorite.meal?.macros || favorite.meal?.nutritionInfo) && (
                        <View style={styles.macroRow}>
                          <Text style={styles.macroItem}>
                            P: {favorite.meal?.macros?.protein || favorite.meal?.nutritionInfo?.protein || 0}g
                          </Text>
                          <Text style={styles.macroItem}>
                            C: {favorite.meal?.macros?.carbs || favorite.meal?.nutritionInfo?.carbs || 0}g
                          </Text>
                          <Text style={styles.macroItem}>
                            F: {favorite.meal?.macros?.fat || favorite.meal?.nutritionInfo?.fat || 0}g
                          </Text>
                        </View>
                      )}
                      
                      <View style={styles.mealStats}>
                        <Text style={styles.statText}>Added {new Date(favorite.addedAt).toLocaleDateString()}</Text>
                      </View>
                    </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                
                {selectedFavoriteMeal && (
                  <View style={styles.timeSelectionSection}>
                    <Text style={styles.fieldLabel}>When will you eat this? *</Text>
                    <TouchableOpacity
                      style={styles.timePickerButton}
                      onPress={() => setShowTimePicker(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="time-outline" size={20} color={themeColor} />
                      <Text style={styles.timePickerButtonText}>{newMealTime || 'Select Time'}</Text>
                      <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity 
                  key={`favorite-button-${selectedFavoriteMeal?.mealId || 'none'}-${newMealTime || 'none'}`}
                  style={[
                    styles.addMealButton,
                    { 
                      backgroundColor: themeColor,
                      opacity: (!selectedFavoriteMeal || !newMealTime.trim()) ? 0.5 : 1.0
                    }
                  ]}
                  onPressIn={() => {
                    console.log('🔍 Button state - Selected meal:', selectedFavoriteMeal?.meal?.name || 'NONE');
                    console.log('🔍 Button state - Time:', newMealTime || 'NONE');
                    console.log('🔍 Button opacity should be:', (!selectedFavoriteMeal || !newMealTime.trim()) ? 0.5 : 1.0);
                  }}
                  onPress={async () => {
                    if (selectedFavoriteMeal && newMealTime.trim()) {
                      const success = await addMealToToday(selectedFavoriteMeal.meal, newMealTime);
                      if (success) {
                        Alert.alert('Success', `Added "${selectedFavoriteMeal.meal.name}" to your timeline!`);
                        setShowAddMealModal(false);
                        setAddMealType(null);
                        setSelectedFavoriteMeal(null);
                        setNewMealTime('');
                        setSelectedHour(12);
                        setSelectedMinute(0);
                        setSelectedPeriod('PM');
                        setShowTimePicker(false);
                      }
                    }
                  }}
                  disabled={!selectedFavoriteMeal || !newMealTime.trim()}
                  activeOpacity={0.8}
                >
                  <Ionicons name="heart" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.addMealButtonText}>Add Favorite</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Manual Meal Form */
              <View style={styles.mealForm}>
                <Text style={styles.formTitle}>Add Manual Meal</Text>
                
                {/* Meal Name */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Meal Name *</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g., Protein Shake, Chicken Salad"
                    placeholderTextColor="#6b7280"
                    value={newMealName}
                    onChangeText={setNewMealName}
                    autoCapitalize="words"
                  />
                </View>

                {/* Time Picker */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Time *</Text>
                  <TouchableOpacity
                    style={styles.timePickerButton}
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="time-outline" size={20} color={themeColor} />
                    <Text style={styles.timePickerButtonText}>{newMealTime || 'Select Time'}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                  </TouchableOpacity>
                </View>

                {/* Calories */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Calories *</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g., 300"
                    placeholderTextColor="#6b7280"
                    value={newMealCalories}
                    onChangeText={setNewMealCalories}
                    keyboardType="numeric"
                  />
                </View>

                {/* Macros Row */}
                <View style={styles.macrosRow}>
                  <View style={styles.macroField}>
                    <Text style={styles.fieldLabel}>Protein (g)</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="25"
                      placeholderTextColor="#6b7280"
                      value={newMealProtein}
                      onChangeText={setNewMealProtein}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.macroField}>
                    <Text style={styles.fieldLabel}>Carbs (g)</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="30"
                      placeholderTextColor="#6b7280"
                      value={newMealCarbs}
                      onChangeText={setNewMealCarbs}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.macroField}>
                    <Text style={styles.fieldLabel}>Fat (g)</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="10"
                      placeholderTextColor="#6b7280"
                      value={newMealFat}
                      onChangeText={setNewMealFat}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Add Button */}
                <TouchableOpacity 
                  style={[
                    styles.addMealButton,
                    { backgroundColor: themeColor },
                    (!newMealName.trim() || !newMealTime.trim() || !newMealCalories.trim()) && styles.addMealButtonDisabled
                  ]}
                  onPress={() => {
                    if (newMealName.trim() && newMealTime.trim() && newMealCalories.trim()) {
                      Alert.alert('Success', 'Manual meal added successfully!');
                      setShowAddMealModal(false);
                      setAddMealType(null);
                      setNewMealName('');
                      setNewMealTime('');
                      setSelectedHour(12);
                setSelectedMinute(0);
                setSelectedPeriod('PM');
                      setShowTimePicker(false);
                      setNewMealCalories('');
                      setNewMealProtein('');
                      setNewMealCarbs('');
                      setNewMealFat('');
                    }
                  }}
                  disabled={!newMealName.trim() || !newMealTime.trim() || !newMealCalories.trim()}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.addMealButtonText}>Add Meal</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Custom Time Picker Modal */}
        <Modal
          visible={showTimePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.timePickerOverlay}>
            <View style={styles.timePickerModal}>
              <View style={styles.timePickerHeader}>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(false)}
                  style={styles.timePickerCancel}
                >
                  <Text style={styles.timePickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.timePickerTitle}>Select Time</Text>
                <TouchableOpacity
                  onPress={() => {
                    const time = `${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`;
                    console.log('⏰ Time picker - Setting time to:', time);
                    setNewMealTime(time);
                    console.log('⏰ newMealTime should now be:', time);
                    setShowTimePicker(false);
                  }}
                  style={styles.timePickerDone}
                >
                  <Text style={styles.timePickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.timePickerContent}>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedHour}
                    onValueChange={(value) => setSelectedHour(value)}
                    style={styles.timePicker}
                    itemStyle={styles.timePickerItem}
                  >
                    {[...Array(12)].map((_, i) => (
                      <Picker.Item key={i + 1} label={String(i + 1)} value={i + 1} color="#ffffff" />
                    ))}
                  </Picker>
                  
                  <Picker
                    selectedValue={selectedMinute}
                    onValueChange={(value) => setSelectedMinute(value)}
                    style={styles.timePicker}
                    itemStyle={styles.timePickerItem}
                  >
                    {[...Array(60)].map((_, i) => (
                      <Picker.Item key={i} label={String(i).padStart(2, '0')} value={i} color="#ffffff" />
                    ))}
                  </Picker>
                  
                  <Picker
                    selectedValue={selectedPeriod}
                    onValueChange={(value) => setSelectedPeriod(value)}
                    style={styles.timePicker}
                    itemStyle={styles.timePickerItem}
                  >
                    <Picker.Item label="AM" value="AM" color="#ffffff" />
                    <Picker.Item label="PM" value="PM" color="#ffffff" />
                  </Picker>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  scrollContent: {
    flex: 1,
  },
  
  // Compact Header
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1f',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  dateSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Section Styling
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  
  // Compact Progress Card
  compactProgressCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  progressSubtitle: {
    fontSize: 13,
    color: '#a1a1aa',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#27272a',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  compactMacrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  compactMacro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactMacroText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#d4d4d8',
  },
  caloriesSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  caloriesMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  caloriesValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  caloriesLabel: {
    fontSize: 14,
    color: '#71717a',
    marginLeft: 4,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  bottomStats: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  bottomStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomStatText: {
    fontSize: 12,
    color: '#71717a',
  },
  mealSection: {
    marginBottom: 20,
  },
  mealSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  mealSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  mealCount: {
    fontSize: 12,
    color: '#71717a',
    marginLeft: 'auto',
  },
  mealCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mealCardCompleted: {
    opacity: 0.7,
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    borderColor: '#22c55e',
    borderWidth: 1,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mealIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mealTitleContainer: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  mealSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  mealType: {
    fontSize: 12,
    fontWeight: '500',
  },
  mealTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717a',
  },
  timingReason: {
    fontSize: 11,
    color: '#a1a1aa',
    fontStyle: 'italic',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 39, 42, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#d4d4d8',
  },
  macrosBar: {
    marginBottom: 8,
  },
  macrosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  macroChip: {
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
    fontSize: 11,
    fontWeight: '500',
    color: '#a1a1aa',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  tag: {
    backgroundColor: 'rgba(113, 113, 122, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#a1a1aa',
  },
  moreTagsText: {
    fontSize: 10,
    color: '#71717a',
    fontStyle: 'italic',
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

  // New simplified nutrition styles
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  caloriesText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f59e0b',
  },
  macrosInline: {
    flexDirection: 'row',
    gap: 12,
  },
  macroInlineText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a1a1aa',
  },

  // Modern Progress Card Styles
  modernProgressCard: {
    backgroundColor: 'rgba(24, 24, 27, 0.8)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modernProgressTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  modernProgressSubtitle: {
    fontSize: 15,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  percentageCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  modernProgressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 24,
  },
  modernProgressBar: {
    height: '100%',
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutritionItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#71717a',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Add Meal Modal Styles
  modalScreen: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  navBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  navSpacer: {
    width: 44,
  },
  scrollContent: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  
  // Meal Type Selection
  mealTypeSelection: {
    paddingTop: 20,
  },
  selectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 32,
    textAlign: 'center',
  },
  mealTypeOption: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  optionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1f1f23',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Manual Meal Form
  mealForm: {
    paddingTop: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 32,
    textAlign: 'center',
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 8,
  },
  inputField: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f9fafb',
    minHeight: 48,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  macroField: {
    flex: 1,
  },
  addMealButton: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addMealButtonDisabled: {
    opacity: 0.5,
  },
  addMealButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  
  // Favorites Selection Styles
  favoritesSelection: {
    paddingTop: 20,
  },
  favoriteMealCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  selectedMealCard: {
    borderWidth: 2,
    backgroundColor: '#1a1a1f',
  },
  mealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  favoriteMealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  mealMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calorieText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  macroRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  macroItem: {
    fontSize: 12,
    color: '#9ca3af',
  },
  mealStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    fontSize: 11,
    color: '#6b7280',
  },
  timeSelectionSection: {
    marginTop: 20,
    marginBottom: 24,
  },
  
  // Time Picker Styles
  timePickerContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerButtonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  pickerButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedPicker: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
  },
  pickerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d1d5db',
  },
  periodButton: {
    minWidth: 48,
    paddingHorizontal: 16,
  },
  selectedTimeDisplay: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  selectedTimeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  
  // Time Picker Button Styles
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 12,
  },
  timePickerButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  
  // Custom Time Picker Modal Styles
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerModal: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    width: '90%',
    maxWidth: 350,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  timePickerCancel: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  timePickerCancelText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  timePickerDone: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  timePickerDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  timePickerContent: {
    padding: 20,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timePicker: {
    flex: 1,
    backgroundColor: '#27272a',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  timePickerItem: {
    fontSize: 18,
    color: '#ffffff',
  },
});