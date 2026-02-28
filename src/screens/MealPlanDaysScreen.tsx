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
        {/* Progress Tracking */}
        {mealCount > 0 && (
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
        )}

        {/* Macros Preview */}
        {totalCalories > 0 && (
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
        )}
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
  const currentGroceryList = mealPlanning.currentMealPlan?.data?.grocery_list || groceryList;
  
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
  
  const actualGroceryTotal = calculateGroceryTotal(currentGroceryList);
  
  // Helper function to group days by their prep session
  const groupDaysByPrepSession = () => {
    // For legacy format (single session) or when no allMealPrepSessions, show all days ungrouped
    if (!allMealPrepSessions || allMealPrepSessions.length === 0) {
      const allDays = (week.days || []).map((day, dayIndex) => ({ day, dayIndex }));
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
      
      week.days?.forEach((day, dayIndex) => {
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
    week.days?.forEach((day, dayIndex) => {
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

  const dayGroups = groupDaysByPrepSession();
  
  // State for tracking meal prep completion
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  
  // State for date picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
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
    if (Platform.OS === 'ios') {
      // On iOS, show date picker in alert
      Alert.prompt(
        'Add New Day',
        'Choose a date for the new day:',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Pick Date',
            onPress: () => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              setSelectedDate(tomorrow);
              setShowDatePicker(true);
            },
          },
        ]
      );
    } else {
      // On Android, show date picker directly
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDate(tomorrow);
      setShowDatePicker(true);
    }
  };

  const addNewDay = async (dateToAdd: Date) => {
    try {
      if (!currentPlan) {
        Alert.alert('Error', 'No meal plan loaded');
        return;
      }

      const dateString = dateToAdd.toISOString().split('T')[0];
      console.log(`➕ Adding new day: ${dateString}`);
      console.log(`📋 Current plan keys before:`, Object.keys(currentPlan.dailyMeals));

      // Check if date already exists
      if (currentPlan.dailyMeals[dateString]) {
        Alert.alert('Date Already Exists', `A day for ${dateToAdd.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} already exists in your meal plan.`);
        return;
      }

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

      // Get all meals for this day and delete them one by one
      const dayData = currentPlan.dailyMeals[dateKey];
      if (dayData && dayData.meals.length > 0) {
        const mealIds = dayData.meals.map(meal => meal.id);
        
        let deletedCount = 0;
        for (const mealId of mealIds) {
          const success = await deleteMealFromDate(dateKey, mealId);
          if (success) deletedCount++;
        }

        if (deletedCount > 0) {
          Alert.alert('Success', `Deleted ${deletedCount} meals from ${getDayName(dayIndex)}`);
        } else {
          Alert.alert('Error', 'Failed to delete meals');
        }
      } else {
        Alert.alert('Info', 'This day has no meals to delete');
      }
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
          {currentGroceryList && (
            <View style={styles.grocerySection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Shopping List</Text>
              </View>
              <TouchableOpacity 
                style={[styles.groceryCardFriendly, { backgroundColor: `${themeColor}15` }]}
                onPress={() => navigation.navigate('GroceryList', { groceryList: currentGroceryList })}
                activeOpacity={0.8}
              >
                <View style={styles.groceryFriendlyContent}>
                  <Text style={styles.groceryFriendlyMain}>
                    ${actualGroceryTotal.toFixed(2)} grocery trip
                  </Text>
                  <Text style={styles.groceryFriendlySubtext}>
                    Tap to see your shopping list
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={themeColor} />
              </TouchableOpacity>
            </View>
          )}

          {/* Prep Sessions Section */}
          {(allMealPrepSessions && allMealPrepSessions.length > 0) ? (
            <View style={styles.prepSessionsSection}>
              <Text style={styles.sectionTitle}>Meal Prep</Text>
              <Text style={styles.sectionSubtitle}>Your cooking schedule made simple</Text>
              
              {allMealPrepSessions.map((session, index) => (
                <TouchableOpacity 
                  key={session.session_number || index}
                  style={[styles.prepCardFriendly, { backgroundColor: `${themeColor}10` }]}
                  onPress={() => {
                    navigation.navigate('MealPrepSession', {
                      mealPrepSession: session,
                      sessionIndex: index,
                      allSessions: allMealPrepSessions,
                    });
                  }}
                >
                  <View style={styles.prepFriendlyContent}>
                    <View style={styles.prepFriendlyHeader}>
                      <Text style={styles.prepFriendlyTitle}>
                        {allMealPrepSessions.length > 1 ? `Prep ${index + 1}` : 'Meal Prep'}
                      </Text>
                      <Text style={styles.prepFriendlyTime}>
                        {session.total_time} min
                      </Text>
                    </View>
                    <Text style={styles.prepFriendlyWhen}>
                      {session.prep_day}
                    </Text>
                    <Text style={styles.prepFriendlyDays}>
                      For {session.covers_days?.slice(0, 2).join(' & ')} 
                      {session.covers_days?.length > 2 ? ` +${session.covers_days.length - 2} more days` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={themeColor} />
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
    marginBottom: 6,
    marginTop: 4,
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