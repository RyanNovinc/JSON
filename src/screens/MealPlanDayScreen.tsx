import React, { useState, useCallback, useEffect } from 'react';
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
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useSimplifiedMealPlanning } from '../contexts/SimplifiedMealPlanningContext';
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
  const { 
    getMealsForDate, 
    deleteMealFromDate, 
    addMealToDate,
    migrateLegacyPlan,
    currentPlan 
  } = useSimplifiedMealPlanning();

  const { day, weekNumber, mealPlanName, dayIndex, calculatedDayName, calculatedDateString } = route.params;
  const [allMeals, setAllMeals] = useState(day.meals || []);
  const [isMigrated, setIsMigrated] = useState(false);
  const meals = allMeals;

  // Auto-migrate legacy data on component mount
  useEffect(() => {
    const handleMigration = async () => {
      try {
        if (!currentPlan && !isMigrated) {
          console.log('🔄 MealPlanDay: No simplified plan found, checking for legacy data');
          const legacyData = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN);
          
          if (legacyData) {
            console.log('🔄 MealPlanDay: Found legacy data, starting migration');
            const legacyPlan = JSON.parse(legacyData);
            const success = await migrateLegacyPlan(legacyPlan);
            
            if (success) {
              console.log('✅ MealPlanDay: Migration completed successfully');
            } else {
              console.log('❌ MealPlanDay: Migration failed');
            }
          }
          setIsMigrated(true);
        }
      } catch (error) {
        console.error('❌ MealPlanDay migration error:', error);
        setIsMigrated(true);
      }
    };

    handleMigration();
  }, [currentPlan, migrateLegacyPlan, isMigrated]);

  // Load meals when migration is complete or plan is available
  useEffect(() => {
    if (isMigrated || currentPlan) {
      loadCurrentDayMeals();
    }
  }, [isMigrated, currentPlan]);

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

  const loadCurrentDayMeals = useCallback(() => {
    try {
      console.log('🔍 Loading meals for day via context');
      
      // Get the viewing date - prioritize calculatedDateString from navigation
      const currentViewingDate = calculatedDateString || day.date || parseDayNameToDate(day.day_name);
      console.log(`📅 Loading: Using date ${currentViewingDate} (calculated: ${calculatedDateString}, day.date: ${day.date})`);
      
      if (!currentViewingDate) {
        console.log('⚠️ No viewing date available, using original meals');
        setAllMeals(day.meals || []);
        return;
      }
      
      // Use simplified context to get meals for this date
      const mealsForDay = getMealsForDate(currentViewingDate);
      console.log('🔍 Simplified Context returned meals:', mealsForDay.length);
      
      // Always use context data - simplified system is reliable
      setAllMeals(mealsForDay);
      console.log('✅ Screen: Using simplified context meals directly');
    } catch (error) {
      console.error('❌ Error loading meals from context:', error);
      // Fallback to original meals on error
      setAllMeals(day.meals || []);
    }
  }, [day.date, day.day_name, getMealsForDate]); // Removed day.meals dependency to prevent stale data

  // Load meals when screen mounts
  React.useEffect(() => {
    loadCurrentDayMeals();
  }, [loadCurrentDayMeals]);

  // Reload meals when screen comes into focus (ensures data consistency)
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Screen focused, reloading meals for consistency');
      loadCurrentDayMeals();
    }, [loadCurrentDayMeals])
  );

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
  
  // Action sheet and delete modal states
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<{ meal: Meal; index: number; mealId: string; isCompleted: boolean } | null>(null);
  
  // Note: Favorite meals functionality can be added later if needed
  // For now we focus on the core deletion functionality

  // Simplified meal addition using context
  const addMealToToday = async (meal: any, time: string) => {
    try {
      console.log('🚀 Adding meal via context:', meal?.name, 'at', time);
      
      // Get the viewing date
      const viewingDate = day.date || parseDayNameToDate(day.day_name);
      
      if (!viewingDate) {
        Alert.alert('Error', 'Could not determine the day date for adding meal.');
        return false;
      }
      
      // Use simplified context method for addition
      const success = await addMealToDate(viewingDate, {
        name: meal.name || meal.meal_name,
        type: meal.type || meal.meal_type || 'snack',
        time: time,
        calories: meal.calories || 0,
        macros: meal.macros || { protein: 0, carbs: 0, fat: 0 },
        ingredients: meal.ingredients || [],
        instructions: meal.instructions || [],
        tags: meal.tags || [],
        isOriginal: false,
      });
      
      if (success) {
        console.log('✅ Meal added successfully via context');
        // Reload meals to reflect changes
        loadCurrentDayMeals();
        return true;
      } else {
        Alert.alert('Error', 'Failed to add meal to timeline');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Failed to add meal via context:', error);
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

  // Simplified meal deletion using context
  const deleteMealFromDay = async (meal: Meal, index: number) => {
    try {
      console.log('🗑️ Attempting to delete meal via context:', meal.meal_name);
      
      // Get the viewing date - prioritize calculatedDateString from navigation
      const currentViewingDate = calculatedDateString || day.date || parseDayNameToDate(day.day_name);
      console.log(`📅 Loading: Using date ${currentViewingDate} (calculated: ${calculatedDateString}, day.date: ${day.date})`);
      
      if (!currentViewingDate) {
        Alert.alert('Error', 'Could not determine the day date for deletion.');
        return false;
      }
      
      // Use simplified context method for deletion
      // First we need to find the meal ID from the simplified context
      const simplifiedMeals = getMealsForDate(currentViewingDate);
      const targetMeal = simplifiedMeals.find(m => 
        m.name === meal.meal_name && m.time === meal.recommended_time
      );
      
      if (!targetMeal) {
        console.log('⚠️ Meal not found in simplified context, may need migration');
        Alert.alert('Error', 'Meal not found. Please try refreshing the screen.');
        return false;
      }
      
      const success = await deleteMealFromDate(currentViewingDate, targetMeal.id);
      
      if (success) {
        // Reload meals to reflect changes
        loadCurrentDayMeals();
        return true;
      } else {
        Alert.alert('Error', 'Failed to delete meal. Please try again.');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error deleting meal via context:', error);
      Alert.alert('Error', 'Failed to delete meal. Please try again.');
      return false;
    }
  };

  // Handle long press to show custom action sheet
  const handleMealLongPress = async (meal: Meal, index: number) => {
    const mealId = generateMealId(meal, index);
    const isCurrentlyCompleted = isMealCompleted(mealId, dayDateString);
    
    console.log('Long press:', { 
      mealName: meal.meal_name, 
      mealId, 
      index, 
      dayDateString, 
      isCurrentlyCompleted,
      fullMeal: meal
    });
    
    // Set selected meal data and show custom action sheet
    setSelectedMeal({ meal, index, mealId, isCompleted: isCurrentlyCompleted });
    setShowActionSheet(true);
  };

  // Handle action sheet actions
  const handleActionSheetAction = async (action: 'complete' | 'delete' | 'cancel') => {
    if (!selectedMeal) return;

    setShowActionSheet(false);

    if (action === 'cancel') {
      setSelectedMeal(null);
      return;
    }

    if (action === 'complete') {
      // Toggle completion
      try {
        await markMealCompleted(selectedMeal.mealId, dayDateString, !selectedMeal.isCompleted);
        console.log('Meal completion updated successfully');
      } catch (error) {
        console.error('Failed to toggle meal completion:', error);
      }
      setSelectedMeal(null);
    } else if (action === 'delete') {
      // Show delete confirmation modal
      setShowDeleteModal(true);
    }
  };

  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (selectedMeal) {
      console.log('🔄 Screen: Starting deletion process...');
      const success = await deleteMealFromDay(selectedMeal.meal, selectedMeal.index);
      console.log('🔄 Screen: Deletion result:', success);
      
      setShowDeleteModal(false);
      setSelectedMeal(null);
      
      // CRITICAL FIX: Force immediate UI update
      if (success) {
        console.log('🔄 Screen: Forcing immediate meal reload...');
        
        // Get the viewing date - prioritize calculatedDateString from navigation
        const currentViewingDate = calculatedDateString || day.date || parseDayNameToDate(day.day_name);
        console.log(`📅 Reload: Using date ${currentViewingDate} (calculated: ${calculatedDateString}, day.date: ${day.date})`);
        if (currentViewingDate) {
          // Use simplified context for force reload
          const updatedMeals = getMealsForDate(currentViewingDate);
          console.log('🔄 Screen: Simplified context returned updated meals:', updatedMeals.length);
          
          // Always use simplified context data
          setAllMeals(updatedMeals);
          console.log('✅ Screen: Forced UI update complete with simplified context');
        }
      }
    }
  };

  // Handle cancel delete
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    // Keep selectedMeal for action sheet return
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

      {/* Custom Action Sheet */}
      <Modal
        visible={showActionSheet}
        transparent={true}
        animationType="slide"
        onRequestClose={() => handleActionSheetAction('cancel')}
      >
        <View style={styles.actionSheetOverlay}>
          <TouchableOpacity 
            style={styles.actionSheetBackdrop}
            activeOpacity={1}
            onPress={() => handleActionSheetAction('cancel')}
          />
          <View style={styles.actionSheetContainer}>
            {/* Header */}
            <View style={styles.actionSheetHeader}>
              <Text style={styles.actionSheetTitle}>
                {selectedMeal?.meal.meal_name}
              </Text>
              <Text style={styles.actionSheetSubtitle}>
                Choose an action:
              </Text>
            </View>
            
            {/* Actions */}
            <TouchableOpacity 
              style={styles.actionSheetButton}
              onPress={() => handleActionSheetAction('complete')}
            >
              <Ionicons 
                name={selectedMeal?.isCompleted ? "checkmark-circle" : "checkmark-circle-outline"} 
                size={24} 
                color="#10b981" 
              />
              <Text style={styles.actionSheetButtonText}>
                {selectedMeal?.isCompleted ? 'Mark as Incomplete' : 'Mark as Complete'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionSheetButton}
              onPress={() => handleActionSheetAction('delete')}
            >
              <Ionicons name="trash-outline" size={24} color="#ef4444" />
              <Text style={[styles.actionSheetButtonText, { color: '#ef4444' }]}>
                Delete Meal
              </Text>
            </TouchableOpacity>
            
            {/* Cancel Button */}
            <TouchableOpacity 
              style={styles.actionSheetCancelButton}
              onPress={() => handleActionSheetAction('cancel')}
            >
              <Text style={styles.actionSheetCancelText}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            {/* Icon */}
            <View style={styles.deleteIconContainer}>
              <Ionicons name="trash-outline" size={32} color="#ef4444" />
            </View>
            
            {/* Title */}
            <Text style={styles.deleteModalTitle}>
              Delete Meal
            </Text>
            
            {/* Meal Name */}
            <Text style={styles.deleteModalMealName}>
              {selectedMeal?.meal.meal_name}
            </Text>
            
            {/* Description */}
            <Text style={styles.deleteModalDescription}>
              Are you sure you want to delete this meal? This action cannot be undone.
            </Text>
            
            {/* Buttons */}
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity 
                style={[styles.deleteModalButton, styles.deleteModalCancelButton]}
                onPress={handleCancelDelete}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.deleteModalButton, styles.deleteModalConfirmButton]}
                onPress={handleConfirmDelete}
              >
                <Text style={styles.deleteModalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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

  // Action Sheet Styles
  actionSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  actionSheetBackdrop: {
    flex: 1,
  },
  actionSheetContainer: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  actionSheetHeader: {
    alignItems: 'center',
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    marginBottom: 20,
  },
  actionSheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  actionSheetSubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  actionSheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#27272a',
    borderRadius: 16,
    marginBottom: 12,
    gap: 16,
  },
  actionSheetButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  actionSheetCancelButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  actionSheetCancelText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Delete Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteModalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
  },
  deleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  deleteModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalMealName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  deleteModalDescription: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  deleteModalCancelButton: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#404040',
  },
  deleteModalConfirmButton: {
    backgroundColor: '#ef4444',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});