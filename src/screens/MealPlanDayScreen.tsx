import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Pressable,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {Picker} from '@react-native-picker/picker';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useSimplifiedMealPlanning } from '../contexts/SimplifiedMealPlanningContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NUTRITION_STORAGE_KEYS, SimplifiedMeal, SimplifiedMealPlanDay } from '../types/nutrition';
import { buildFreshnessIndex } from '../utils/buildPrepSession';
import RecipeFavorites from '../utils/recipeFavorites';
import { CURATED_MEALS } from '../data/curated_meals';
import { getMealImage } from '../assets/mealImages';

type MealPlanDayScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MealPlanDay'>;
type MealPlanDayScreenRouteProp = RouteProp<RootStackParamList, 'MealPlanDay'>;

// Use SimplifiedMeal from types instead of custom Meal interface
type Meal = SimplifiedMeal;

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const MUTED = '#8a8a90';
const FAINT = '#6a6a70';

// Resolve a meal photo from whatever field the curated record uses.
const getMealImageUri = (meal: any): string | null =>
  meal?.photo_url || meal?.image || meal?.imageUrl || meal?.image_url || meal?.photo || meal?.imageURL || meal?.img || meal?.thumbnail || null;

interface MealCardProps {
  meal: SimplifiedMeal;
  onPress: () => void;
  onLongPress: () => void;
  onToggleComplete: () => void;
  themeColor: string;
  mealIcon: string;
  mealColor: string;
  isCompleted: boolean;
  freshnessIndex: Map<string, Set<string>>;
  currentDate: string;
}

function MealCard({ meal, onPress, onLongPress, onToggleComplete, themeColor, mealIcon, mealColor, isCompleted, freshnessIndex, currentDate }: MealCardProps) {
  // Resolve the meal photo. Manually-logged meals carry image_filename / photo_url
  // directly. Curated meals (incl. AI-imported plans) carry only curated_meal_slug
  // + plate_id, so hydrate the image from the curated DB: per-plate image_filename
  // first, then the meal-level photo_url. Falls back to the type icon if neither.
  let imageFilename: string | null = (meal as any)?.image_filename || null;
  let uri = getMealImageUri(meal);
  if (!imageFilename && !uri) {
    const slug = (meal as any)?.curated_meal_slug || (meal as any)?.slug || null;
    const cm = slug ? (CURATED_MEALS as any)[slug] : null;
    if (cm) {
      const plates = Array.isArray(cm.plates) ? cm.plates : [];
      const plateId = (meal as any)?.plate_id || null;
      const plate = (plateId && plates.find((p: any) => p?.id === plateId)) || plates[0] || null;
      imageFilename = plate?.image_filename || cm.image_filename || null;
      uri = cm.photo_url || uri;
    }
  }
  const localImg = imageFilename ? getMealImage(imageFilename) : null;
  const cal = (meal.calories && typeof meal.calories === 'number') ? meal.calories : 0;
  const p = Math.round((meal.macros?.protein || meal.nutritionInfo?.protein || 0));
  const c = Math.round((meal.macros?.carbs || meal.nutritionInfo?.carbs || meal.nutritionInfo?.carbohydrates || 0));
  const f = Math.round((meal.macros?.fat || meal.nutritionInfo?.fat || 0));
  const typeLabel = meal.tags?.includes('adjuster') 
    ? 'TOP-UP' 
    : (meal.type || 'snack').replace(/_/g, ' ').toUpperCase();
  const metaText = meal.time ? `${meal.time} · ${typeLabel}` : typeLabel;

  return (
    <View style={styles.mcard}>
      <Pressable style={styles.photoWrap} onPress={onPress} onLongPress={onLongPress}>
        {localImg ? (
          <Image source={localImg} style={styles.photo} resizeMode="cover" />
        ) : uri ? (
          <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.photoFallback}>
            <Ionicons name={mealIcon as any} size={36} color="#3a3a42" />
          </View>
        )}
        {isCompleted && <View style={styles.photoScrim} pointerEvents="none" />}
        <View style={styles.chip}>
          <Text style={styles.chipText}>{metaText}</Text>
        </View>
        <View style={styles.viewHint}>
          <Ionicons name="chevron-forward" size={16} color="#e8e8ea" />
        </View>
      </Pressable>

      <Pressable style={styles.mbody} onPress={onToggleComplete} onLongPress={onLongPress}>
        <Ionicons
          name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
          size={26}
          color={isCompleted ? themeColor : '#5a5a60'}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.mname, isCompleted && styles.mnameDone]} numberOfLines={2}>
            {meal.name || 'Unknown Meal'}
          </Text>
          <View style={styles.subtitleRow}>
            <Text style={[styles.mmacro, isCompleted && styles.mmacroDone]}>{cal} kcal · P{p} C{c} F{f}</Text>
            {(() => {
              // Check if this meal needs "From freezer" chip
              if (meal.curated_meal_slug) {
                const key = `${meal.curated_meal_slug}_${meal.plate_id || 'standard'}`;
                const freezeDates = freshnessIndex.get(key);
                if (freezeDates && freezeDates.has(currentDate)) {
                  return (
                    <View style={styles.freezerChip}>
                      <Ionicons name="snow-outline" size={12} color="#3b82f6" />
                      <Text style={styles.freezerChipText}>From freezer — thaw overnight</Text>
                    </View>
                  );
                }
              }
              return null;
            })()}
          </View>
        </View>
      </Pressable>
    </View>
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
  
  const { getFavoriteMeals } = useMealPlanning();
  const favoriteMeals = getFavoriteMeals();

  // Build freshness index for freezer chips
  const freshnessIndex = useMemo(() => {
    return currentPlan ? buildFreshnessIndex(currentPlan) : new Map();
  }, [currentPlan]);

  // Clean parameter extraction with fallback support
  const cleanParams = route.params as any;
  
  // New clean navigation parameters
  const targetDate = cleanParams.targetDate;
  const planId = cleanParams.planId;
  const planName = cleanParams.planName || cleanParams.mealPlanName;
  const dayName = cleanParams.dayName;
  const displayDate = cleanParams.displayDate;

  // Legacy parameter support (for gradual migration)
  const legacyDay = cleanParams.day;
  const legacyDayIndex = cleanParams.dayIndex;
  const legacyCalculatedDateString = cleanParams.calculatedDateString;
  const legacyCalculatedDayName = cleanParams.calculatedDayName;
  const legacyWeekNumber = cleanParams.weekNumber;
  const legacyMealPlanName = cleanParams.mealPlanName;

  // Determine the actual date to use
  const viewingDate = targetDate || legacyCalculatedDateString || legacyDay?.date;
  
  console.log('🔍 MealPlanDayScreen using clean navigation:', {
    targetDate,
    planName,
    viewingDate,
    hasLegacyParams: !!legacyDay
  });

  const [allMeals, setAllMeals] = useState(legacyDay?.meals || []);
  const [isMigrated, setIsMigrated] = useState(false);
  
  // For display purposes, generate clean display values
  const displayInfo = React.useMemo(() => {
    if (targetDate) {
      // New clean navigation - calculate display from targetDate
      const date = new Date(targetDate + 'T00:00:00.000Z');
      return {
        dayName: dayName || date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
        displayDate: displayDate || date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          timeZone: 'UTC' 
        }),
        planName: planName || 'Meal Plan'
      };
    } else {
      // Legacy fallback
      const legacyDate = legacyCalculatedDateString ? new Date(legacyCalculatedDateString + 'T00:00:00.000Z') : null;
      return {
        dayName: legacyCalculatedDayName || 'Day',
        displayDate: legacyDate ? legacyDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          timeZone: 'UTC' 
        }) : 'Unknown Date',
        planName: legacyMealPlanName || 'Meal Plan'
      };
    }
  }, [targetDate, dayName, displayDate, planName, legacyCalculatedDayName, legacyCalculatedDateString, legacyMealPlanName]);

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

  // Legacy function - no longer needed with clean navigation but kept for compatibility
  const parseDayNameToDate = (dayName?: string): string | null => {
    if (!dayName) return null;
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
      console.log('🔍 MealPlanDayScreen: Loading meals with clean navigation');
      console.log('📅 Target date:', viewingDate);
      
      // Validate viewing date
      if (!viewingDate) {
        console.error('❌ No viewing date available');
        setAllMeals(legacyDay?.meals || []);
        return;
      }
      
      // Use simplified context to get meals for this clean date
      const mealsForDay = getMealsForDate(viewingDate);
      console.log('🔍 Context returned:', mealsForDay.length, 'meals for', viewingDate);
      
      if (mealsForDay.length > 0) {
        console.log('✅ Using context meals');
        setAllMeals(mealsForDay);
      } else {
        console.log('⚠️ No context meals, using legacy fallback');
        setAllMeals(legacyDay?.meals || []);
      }
      
    } catch (error) {
      console.error('❌ Error loading meals:', error);
      setAllMeals(legacyDay?.meals || []);
    }
  }, [getMealsForDate, viewingDate, legacyDay]); // Removed day.meals dependency to prevent stale data

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

  // Load meal completions when viewing date changes
  useEffect(() => {
    if (viewingDate) {
      loadMealCompletions(viewingDate);
    }
  }, [viewingDate]);

  // Add meal modal state
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [addMealType, setAddMealType] = useState<'manual' | 'favorite' | null>(null);
  const [selectedFavoriteMeal, setSelectedFavoriteMeal] = useState<any>(null);
  const [newMealName, setNewMealName] = useState('');
  const [newMealType, setNewMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'custom'>('snack');
  const [customMealType, setCustomMealType] = useState('');
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
  
  // Meal completion tracking
  const [completedMeals, setCompletedMeals] = useState<Record<string, boolean>>({});

  // Favourited recipes (from the Library's recipe-favourites store), loaded
  // when the quick-add sheet opens. Slugs are resolved to curated meals.
  const [favRecipes, setFavRecipes] = useState<any[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  useEffect(() => {
    if (!showAddMealModal) return;
    (async () => {
      try {
        const favs = await RecipeFavorites.loadFavorites();
        const entries = (favs || [])
          .map(({ slug, plateId }) => {
            const meal = (CURATED_MEALS as any)[slug];
            if (!meal || !Array.isArray(meal.plates) || meal.plates.length === 0) return null;
            const plate = (plateId && meal.plates.find((p: any) => p.id === plateId)) || meal.plates[0];
            return { meal, plate, slug, plateId: plate?.id, key: `${slug}::${plate?.id}` };
          })
          .filter(Boolean);
        setFavRecipes(entries as any[]);
      } catch {
        setFavRecipes([]);
      }
    })();
  }, [showAddMealModal]);
  
  // Load and save meal completion state
  const loadMealCompletions = async (date: string) => {
    try {
      const key = `meal_completions_${date}`;
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const completions = JSON.parse(stored);
        setCompletedMeals(completions);
        console.log('✅ Loaded meal completions for', date, ':', Object.keys(completions).length, 'entries');
      } else {
        setCompletedMeals({});
        console.log('📋 No saved meal completions for', date);
      }
    } catch (error) {
      console.error('❌ Failed to load meal completions:', error);
      setCompletedMeals({});
    }
  };

  const saveMealCompletions = async (date: string, completions: Record<string, boolean>) => {
    try {
      const key = `meal_completions_${date}`;
      await AsyncStorage.setItem(key, JSON.stringify(completions));
      console.log('💾 Saved meal completions for', date, ':', Object.keys(completions).length, 'entries');
    } catch (error) {
      console.error('❌ Failed to save meal completions:', error);
    }
  };
  
  // Note: Favorite meals functionality can be added later if needed
  // For now we focus on the core deletion functionality

  // Simplified meal addition using context
  const addMealToToday = async (meal: any, time: string) => {
    try {
      console.log('🚀 Adding meal via context:', meal?.name, 'at', time);
      
      // Get the viewing date using clean navigation
      const currentViewingDate = viewingDate;
      
      if (!viewingDate) {
        Alert.alert('Error', 'Could not determine the day date for adding meal.');
        return false;
      }
      
      // Use simplified context method for addition
      // Handle both direct meal properties and favorite meal structure
      const calories = meal.calories || meal.nutritionInfo?.calories || 0;
      
      // Extract macros properly from nutritionInfo structure
      const macros = meal.macros || {
        protein: meal.nutritionInfo?.protein || 0,
        carbs: meal.nutritionInfo?.carbs || 0,
        fat: meal.nutritionInfo?.fat || 0
      };
      
      console.log('🍽️ Adding meal with nutrition:', {
        name: meal.name,
        calories: calories,
        macros: macros,
        originalMeal: meal
      });
      
      const success = await addMealToDate(viewingDate, {
        name: meal.name,
        type: meal.type || 'snack',
        time: time,
        calories: calories,
        macros: macros,
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

  // Function to clean up invalid date entries
  const cleanupInvalidDates = async () => {
    try {
      if (!currentPlan) return;
      
      console.log('🧹 Cleaning up invalid date entries...');
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const validDates: { [key: string]: SimplifiedMealPlanDay } = {};
      
      // Filter out invalid date entries
      Object.entries(currentPlan.dailyMeals).forEach(([date, dayData]) => {
        if (dateRegex.test(date)) {
          validDates[date] = dayData;
        } else {
          console.log(`🗑️ Removing invalid date entry: ${date}`);
        }
      });
      
      // Update the plan with only valid dates
      const cleanedPlan = {
        ...currentPlan,
        dailyMeals: validDates
      };
      
      // Save the cleaned plan
      await AsyncStorage.setItem(NUTRITION_STORAGE_KEYS.SIMPLIFIED_MEAL_PLAN, JSON.stringify(cleanedPlan));
      
      // Update context state
      const success = await migrateLegacyPlan(cleanedPlan);
      if (success) {
        console.log('✅ Successfully cleaned up invalid date entries');
        Alert.alert('Success', 'Invalid date entries have been cleaned up');
      }
      
    } catch (error) {
      console.error('❌ Error cleaning up invalid dates:', error);
    }
  };

  // Debug function to gather all relevant data
  const generateDebugInfo = async () => {
    const currentViewingDate = viewingDate;
    const contextMeals = getMealsForDate(currentViewingDate);
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      screenInfo: {
        targetDate,
        planName,
        dayName: displayInfo.dayName,
        displayDate: displayInfo.displayDate,
        currentViewingDate,
        hasLegacyParams: !!legacyDay
      },
      mealData: {
        allMealsCount: allMeals.length,
        contextMealsCount: contextMeals.length,
        allMeals: allMeals.map((meal, index) => ({
          index,
          name: meal.name,
          type: meal.type,
          time: meal.time,
          id: meal.id,
          calories: meal.calories,
          hasName: meal.name !== undefined,
          hasType: meal.type !== undefined,
          hasTime: meal.time !== undefined,
          rawMeal: meal
        })),
        contextMeals: contextMeals.map((meal, index) => ({
          index,
          name: meal.name,
          type: meal.type,
          time: meal.time,
          id: meal.id,
          calories: meal.calories,
          hasName: meal.name !== undefined,
          hasType: meal.type !== undefined,
          hasTime: meal.time !== undefined,
          rawMeal: meal
        }))
      },
      planContext: {
        hasPlan: !!currentPlan,
        planId: currentPlan?.id,
        planName: currentPlan?.name,
        dailyMealsKeys: currentPlan ? Object.keys(currentPlan.dailyMeals) : [],
        targetDateExists: currentPlan ? !!currentPlan.dailyMeals[currentViewingDate] : false,
        targetDateMealCount: currentPlan?.dailyMeals[currentViewingDate]?.meals?.length || 0
      },
      routeParams: route.params
    };

    const debugText = JSON.stringify(debugInfo, null, 2);
    
    try {
      await Clipboard.setStringAsync(debugText);
      Alert.alert(
        'Debug Info Copied!',
        'Debug information has been copied to your clipboard. You can now paste it to share.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to copy debug info to clipboard');
    }
  };

  // Generate a unique ID for meals since the current interface doesn't have one
  const generateMealId = (meal: Meal, globalIndex: number) => {
    // Use a combination of meal name, type, and index for uniqueness
    const cleanName = (meal.name || 'unknown_meal').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `${cleanName}_${meal.type || 'unknown'}_${globalIndex}`;
  };

  // Simplified meal deletion using context
  const deleteMealFromDay = async (meal: Meal, index: number) => {
    try {
      console.log('🗑️ Attempting to delete meal via context:', meal.name);
      
      // Use the clean viewing date
      const currentViewingDate = viewingDate;
      
      console.log(`📅 Deletion: Using clean date ${currentViewingDate}`);
      
      if (!currentViewingDate) {
        Alert.alert('Error', 'Could not determine the day date for deletion.');
        return false;
      }
      
      // Use simplified context method for deletion
      // First we need to find the meal ID from the simplified context
      const simplifiedMeals = getMealsForDate(currentViewingDate);
      const targetMeal = simplifiedMeals.find(m => 
        m.name === meal.name && m.time === meal.time
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
    const mealKey = `${index}_${meal.id || meal.name}`;
    const isCurrentlyCompleted = completedMeals[mealKey] || false;
    
    console.log('Long press:', { 
      mealName: meal.name, 
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
  const handleActionSheetAction = async (action: 'complete' | 'edit' | 'delete' | 'cancel') => {
    if (!selectedMeal) return;

    setShowActionSheet(false);

    if (action === 'cancel') {
      setSelectedMeal(null);
      return;
    }

    if (action === 'complete') {
      // Toggle completion
      try {
        if (!viewingDate) {
          console.error('No viewing date available for meal completion');
          return;
        }
        
        const mealKey = `${selectedMeal.index}_${selectedMeal.meal.id || selectedMeal.meal.name}`;
        const newCompletionState = !selectedMeal.isCompleted;
        
        const updatedCompletions = {
          ...completedMeals,
          [mealKey]: newCompletionState
        };
        
        setCompletedMeals(updatedCompletions);
        saveMealCompletions(viewingDate, updatedCompletions);
        
        console.log('✅ Meal completion toggled:', selectedMeal.meal.name, '→', newCompletionState ? 'completed' : 'incomplete');
      } catch (error) {
        console.error('Failed to toggle meal completion:', error);
      }
      setSelectedMeal(null);
    } else if (action === 'edit') {
      // Navigate to edit screen
      try {
        console.log('🔄 Screen: Editing meal...', selectedMeal.meal.name);
        
        // Convert meal to the format expected by ManualMealEntryScreen
        const mealToEdit = {
          id: selectedMeal.meal.id,
          name: selectedMeal.meal.name,
          type: selectedMeal.meal.type,
          time: selectedMeal.meal.time,
          calories: selectedMeal.meal.calories,
          // Include both formats for nutrition data
          protein: selectedMeal.meal.macros?.protein || 0,
          carbs: selectedMeal.meal.macros?.carbs || 0,
          fat: selectedMeal.meal.macros?.fat || 0,
          macros: {
            protein: selectedMeal.meal.macros?.protein || 0,
            carbs: selectedMeal.meal.macros?.carbs || 0,
            fat: selectedMeal.meal.macros?.fat || 0,
          },
          // Include both formats for timing data
          prepTime: selectedMeal.meal.prep_time || 0,
          prep_time: selectedMeal.meal.prep_time || 0,
          cookTime: selectedMeal.meal.cook_time || 0,
          cook_time: selectedMeal.meal.cook_time || 0,
          servings: selectedMeal.meal.servings || 1,
          ingredients: selectedMeal.meal.ingredients || [],
          instructions: selectedMeal.meal.instructions || []
        };
        
        // Navigate to ManualMealEntryScreen with edit data
        navigation.navigate('ManualMealEntry', { 
          editMeal: mealToEdit,
          isEditing: true
        });
        
        setSelectedMeal(null);
      } catch (error) {
        console.error('Failed to navigate to edit screen:', error);
        Alert.alert('Error', 'Failed to open edit screen.');
        setSelectedMeal(null);
      }
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
        
        // Get the viewing date using clean navigation
        const currentViewingDate = viewingDate;
        console.log(`📅 Reload: Using clean date ${currentViewingDate}`);
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

  // Quick toggle meal completion (for checkbox)
  const quickToggleMealCompletion = async (meal: Meal, index: number) => {
    try {
      if (!viewingDate) {
        console.error('No viewing date available for meal completion');
        return;
      }
      
      const mealKey = `${index}_${meal.id || meal.name}`;
      const currentCompletionState = completedMeals[mealKey] || false;
      const newCompletionState = !currentCompletionState;
      
      const updatedCompletions = {
        ...completedMeals,
        [mealKey]: newCompletionState
      };
      
      setCompletedMeals(updatedCompletions);
      saveMealCompletions(viewingDate, updatedCompletions);
      
      console.log('✅ Quick meal completion toggled:', meal.name, '→', newCompletionState ? 'completed' : 'incomplete');
    } catch (error) {
      console.error('Failed to quickly toggle meal completion:', error);
    }
  };

  const closeAddMeal = () => {
    setShowAddMealModal(false);
    setSelectedRecipe(null);
    setNewMealName('');
    setNewMealType('snack');
    setNewMealCalories('');
    setNewMealProtein('');
    setNewMealCarbs('');
    setNewMealFat('');
  };

  // A favourite entry is { meal, plate, slug, plateId, key }; we read macros /
  // name / photo from the specific favourited plate. Falls back gracefully if
  // handed a raw meal (defensive).
  const recipeFields = (r: any) => {
    const meal = r?.meal || r;
    const plate = r?.plate || meal?.plates?.[0];
    const m = plate?.plate_macros || {};
    return {
      slug: meal?.slug,
      plateId: plate?.id,
      key: r?.key || `${meal?.slug}::${plate?.id}`,
      name: plate?.display_name || meal?.display_name || 'Recipe',
      photo: meal?.photo_url || null,
      localName: plate?.image_filename || meal?.image_filename || null,
      kcal: Math.round(m.kcal || 0),
      protein: Math.round(m.protein_g || 0),
      carbs: Math.round(m.carbs_g || 0),
      fat: Math.round(m.fat_g || 0),
    };
  };

  const prefillFromRecipe = (r: any) => {
    const f = recipeFields(r);
    setSelectedRecipe(r);
    setNewMealName(f.name);
    setNewMealCalories(f.kcal ? String(f.kcal) : '');
    setNewMealProtein(f.protein ? String(f.protein) : '');
    setNewMealCarbs(f.carbs ? String(f.carbs) : '');
    setNewMealFat(f.fat ? String(f.fat) : '');
  };

  const logQuickMeal = async () => {
    const cal = parseInt(newMealCalories) || 0;
    const p = parseInt(newMealProtein) || 0;
    const c = parseInt(newMealCarbs) || 0;
    const f = parseInt(newMealFat) || 0;
    if (!cal && !p && !c && !f) return;

    const rf = selectedRecipe ? recipeFields(selectedRecipe) : null;

    // Typed loosely: photo_url/slug aren't on SimplifiedMeal yet, but we attach
    // them so logged-from-recipe meals can show their photo on the day screen.
    const meal: any = {
      name: newMealName.trim() || 'Logged meal',
      type: newMealType === 'custom' ? 'snack' : newMealType,
      time: '',
      calories: cal,
      macros: { protein: p, carbs: c, fat: f },
      ingredients: [],
      instructions: [],
      tags: ['off-plan'],
      isOriginal: false,
      addedAt: new Date().toISOString(),
    };
    if (rf?.photo) meal.photo_url = rf.photo;
    if (rf?.localName) meal.image_filename = rf.localName;
    if (rf?.slug) meal.slug = rf.slug;
    if (rf?.plateId) meal.plate_id = rf.plateId;

    let targetDate = viewingDate;
    if (!targetDate && currentPlan && typeof legacyDayIndex === 'number') {
      const dates = Object.keys(currentPlan.dailyMeals).sort();
      if (legacyDayIndex >= 0 && legacyDayIndex < dates.length) targetDate = dates[legacyDayIndex];
    }

    if (!targetDate) {
      Alert.alert('Error', 'Could not determine the day to log this meal.');
      return;
    }

    const success = await addMealToDate(targetDate, meal);
    if (success) {
      closeAddMeal();
      await loadCurrentDayMeals();
    } else {
      Alert.alert('Error', 'Failed to log meal. Please try again.');
    }
  };

  const canLog = !!(newMealCalories.trim() || newMealProtein.trim() || newMealCarbs.trim() || newMealFat.trim());

  // Calculate daily totals
  const dailyTotals = allMeals.reduce((totals, meal) => {
    return {
      calories: totals.calories + (meal.calories || 0),
      protein: totals.protein + (meal.macros?.protein || 0),
      carbs: totals.carbs + (meal.macros?.carbs || 0),
      fat: totals.fat + (meal.macros?.fat || 0),
      fiber: totals.fiber + (meal.macros?.fiber || 0),
      prepTime: totals.prepTime + (meal.total_time || meal.prep_time || 0),
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, prepTime: 0 });

  // Calculate completion progress (simplified - completion tracking can be added later)
  const completedMealsCount = allMeals.filter((meal, index) => {
    const mealKey = `${index}_${meal.id || meal.name}`;
    const isCompleted = completedMeals[mealKey] || false;
    console.log('Progress check:', { 
      mealName: meal.name, 
      mealKey, 
      index, 
      isCompleted 
    });
    return isCompleted;
  }).length;
  
  // Calculate nutrition from completed meals only (simplified)
  const completedNutrition = allMeals.reduce((totals, meal, index) => {
    const mealKey = `${index}_${meal.id || meal.name}`;
    const isCompleted = completedMeals[mealKey] || false;
    
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
  
  const progressPercentage = allMeals.length > 0 ? (completedMealsCount / allMeals.length) * 100 : 0;
  
  console.log('Progress summary:', {
    completedMealsCount,
    totalMeals: allMeals.length,
    progressPercentage
  });

  const getMealIcon = (mealType: string, isAdjuster?: boolean) => {
    if (isAdjuster) return 'add-circle-outline';
    
    switch (mealType) {
      case 'breakfast': return 'sunny';
      case 'brunch': return 'partly-sunny';
      case 'lunch': return 'restaurant';
      case 'second_lunch': return 'fast-food';
      case 'early_dinner': return 'wine';
      case 'dinner': return 'moon';
      case 'snack': return 'nutrition';
      case 'morning_snack': return 'cafe';
      case 'afternoon_snack': return 'ice-cream';
      case 'evening_snack': return 'pizza';
      case 'pre_workout': return 'fitness';
      case 'post_workout': return 'barbell';
      default: return 'restaurant';
    }
  };

  const getMealColor = (mealType: string, isAdjuster?: boolean) => {
    if (isAdjuster) return '#6b7280'; // Neutral gray for adjusters
    
    switch (mealType) {
      // Main meals - warm to cool progression through the day
      case 'breakfast': return '#f97316'; // Warm orange (morning energy)
      case 'brunch': return '#eab308'; // Golden yellow (late morning)
      case 'lunch': return '#3b82f6'; // Blue (midday focus)
      case 'second_lunch': return '#2563eb'; // Darker blue
      case 'early_dinner': return '#7c3aed'; // Purple (early evening)
      case 'dinner': return '#8b5cf6'; // Lighter purple (evening)
      
      // Snacks - complementary colors between main meals
      case 'snack': return '#10b981'; // Green (general snack)
      case 'morning_snack': return '#f59e0b'; // Amber (between breakfast and lunch)
      case 'afternoon_snack': return '#06b6d4'; // Cyan (between lunch and dinner)
      case 'evening_snack': return '#ec4899'; // Pink (after dinner)
      
      // Special/workout meals
      case 'pre_workout': return '#dc2626'; // Red (energy/intensity)
      case 'post_workout': return '#16a34a'; // Green (recovery)
      
      default: return '#6b7280'; // Gray for unknown types
    }
  };

  const handleMealPress = (meal: Meal) => {
    // Navigate to the nutrition MealDetailScreen for all meals
    navigation.navigate('MealDetail', { meal } as any);
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
  const mealTypeOrder = { 'breakfast': 0, 'snack': 1, 'lunch': 2, 'dinner': 3, 'dessert': 4 };
  const sortedMeals = allMeals.sort((a, b) => {
    const timeA = a.time ? timeToMinutes(a.time) : (mealTypeOrder[a.type] || 0) * 360; // 6-hour gaps as fallback
    const timeB = b.time ? timeToMinutes(b.time) : (mealTypeOrder[b.type] || 0) * 360;
    
    console.log(`⏰ Sorting: ${a.name || 'unnamed'} (${a.time || 'no time'}) = ${timeA} minutes`);
    console.log(`⏰ Sorting: ${b.name || 'unnamed'} (${b.time || 'no time'}) = ${timeB} minutes`);
    console.log(`⏰ Comparison: ${a.name || 'unnamed'} vs ${b.name || 'unnamed'} = ${timeA - timeB}`);
    
    return timeA - timeB;
  });

  // Keep each meal's original index (for completion keys), then split planned
  // meals from off-plan logged extras so they render in separate sections.
  const rows = sortedMeals.map((meal, index) => ({ meal, index }));
  const plannedRows = rows.filter((x) => (x.meal as any).isOriginal !== false);
  const offPlanRows = rows.filter((x) => (x.meal as any).isOriginal === false);
  const plannedDone = plannedRows.filter(({ meal, index }) => completedMeals[`${index}_${(meal as any).id || meal.name}`]).length;
  const plannedPct = plannedRows.length > 0 ? (plannedDone / plannedRows.length) * 100 : 0;

  // Fixed delete-button width: card is min(screenW-56, 340) wide, 26 padding each
  // side, two buttons with a 12 gap. (flex:1 on gesture-handler touchables
  // collapses, hiding the labels.)
  const delBtnW = (Math.min(Dimensions.get('window').width - 56, 340) - 52 - 12) / 2;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={26} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAddMealModal(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="add" size={26} color={themeColor} />
          </TouchableOpacity>
        </View>

        {/* Menu-style header (no outline) */}
        <View style={styles.menuHeader}>
          <Text style={styles.menuOverline}>{displayInfo.displayDate}</Text>
          <Text style={styles.menuDay}>{displayInfo.dayName}</Text>
          <Text style={styles.menuSub}>
            <Text style={styles.menuSubAccent}>{Math.round(completedNutrition.protein)}</Text> / {Math.round(dailyTotals.protein)}g protein · <Text style={styles.menuSubAccent}>{Math.round(completedNutrition.calories).toLocaleString()}</Text> / {Math.round(dailyTotals.calories).toLocaleString()} kcal
          </Text>
          {allMeals.length > 0 && (
            <>
              <View style={styles.hairline} />
              <View style={styles.dayProgressTrack}>
                <View style={[styles.dayProgressFill, { width: `${progressPercentage}%`, backgroundColor: themeColor }]} />
              </View>
              <Text style={styles.loggedText}>{completedMealsCount} of {allMeals.length} eaten</Text>
            </>
          )}
        </View>

        {/* Photo meal timeline (planned) */}
        {plannedRows.length > 0 && (
          <View style={styles.timelineWrap}>
            <Text style={styles.timelineLabel}>Timeline</Text>
            {plannedRows.map(({ meal, index }) => {
              const mealKey = `${index}_${(meal as any).id || meal.name}`;
              const isCompleted = completedMeals[mealKey] || false;
              return (
                <MealCard
                  key={index}
                  meal={meal}
                  onPress={() => handleMealPress(meal)}
                  onLongPress={() => handleMealLongPress(meal, index)}
                  onToggleComplete={() => quickToggleMealCompletion(meal, index)}
                  themeColor={themeColor}
                  mealIcon={getMealIcon(meal.type, meal.tags?.includes('adjuster'))}
                  mealColor={getMealColor(meal.type, meal.tags?.includes('adjuster'))}
                  isCompleted={isCompleted}
                  freshnessIndex={freshnessIndex}
                  currentDate={targetDate}
                />
              );
            })}
          </View>
        )}

        {/* Off-plan / logged extras */}
        {offPlanRows.length > 0 && (
          <View style={styles.timelineWrap}>
            <Text style={styles.timelineLabel}>Off-plan</Text>
            {offPlanRows.map(({ meal, index }) => {
              const mealKey = `${index}_${(meal as any).id || meal.name}`;
              const isCompleted = completedMeals[mealKey] || false;
              return (
                <MealCard
                  key={index}
                  meal={meal}
                  onPress={() => handleMealPress(meal)}
                  onLongPress={() => handleMealLongPress(meal, index)}
                  onToggleComplete={() => quickToggleMealCompletion(meal, index)}
                  themeColor={themeColor}
                  mealIcon={getMealIcon(meal.type, meal.tags?.includes('adjuster'))}
                  mealColor={getMealColor(meal.type, meal.tags?.includes('adjuster'))}
                  isCompleted={isCompleted}
                  freshnessIndex={freshnessIndex}
                  currentDate={targetDate}
                />
              );
            })}
          </View>
        )}

        {allMeals.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={56} color="#3f3f46" />
            <Text style={styles.emptyTitle}>No meals planned</Text>
            <Text style={styles.emptyDescription}>
              This day doesn't have any meals yet. Tap + to add one.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Quick add / log a meal */}
      <Modal
        visible={showAddMealModal}
        transparent={false}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeAddMeal}
      >
        <View style={styles.modalScreen}>
          <View style={styles.qaHeader}>
            <TouchableOpacity onPress={closeAddMeal} style={styles.qaBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={26} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.qaTitle}>Log a meal</Text>
            <View style={{ width: 26 }} />
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView
              style={styles.modalScrollContent}
              contentContainerStyle={styles.qaContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.qaLabel}>What did you eat? <Text style={styles.qaOptional}>(optional)</Text></Text>
              <TextInput
                style={styles.qaField}
                placeholder="e.g. Cafe burrito"
                placeholderTextColor="#5a5a60"
                value={newMealName}
                onChangeText={setNewMealName}
                autoCapitalize="words"
              />

              <Text style={[styles.qaLabel, { marginTop: 18 }]}>Meal</Text>
              {([['breakfast', 'lunch', 'dinner'], ['snack', 'dessert']] as const).map((row, ri) => (
                <View key={ri} style={[styles.qaSegment, ri > 0 && { marginTop: 8 }]}>
                  {row.map((t) => {
                    const active = newMealType === t;
                    const segW = (Dimensions.get('window').width - 46) / row.length;
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[styles.qaSegItem, { width: segW }, active && { backgroundColor: themeColor }]}
                        activeOpacity={0.8}
                        onPress={() => setNewMealType(t)}
                      >
                        <Text style={[styles.qaSegText, active && styles.qaSegTextActive]} numberOfLines={1}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              <Text style={[styles.qaLabel, { marginTop: 18 }]}>Macros</Text>
              <View style={styles.qaMacroRow}>
                <View style={styles.qaMacroCol}>
                  <TextInput style={styles.qaMacroInput} placeholder="0" placeholderTextColor="#5a5a60" value={newMealCalories} onChangeText={setNewMealCalories} keyboardType="numeric" textAlign="center" />
                  <Text style={styles.qaMacroLbl}>Kcal</Text>
                </View>
                <View style={styles.qaMacroCol}>
                  <TextInput style={styles.qaMacroInput} placeholder="0" placeholderTextColor="#5a5a60" value={newMealProtein} onChangeText={setNewMealProtein} keyboardType="numeric" textAlign="center" />
                  <Text style={styles.qaMacroLbl}>Protein</Text>
                </View>
                <View style={styles.qaMacroCol}>
                  <TextInput style={styles.qaMacroInput} placeholder="0" placeholderTextColor="#5a5a60" value={newMealCarbs} onChangeText={setNewMealCarbs} keyboardType="numeric" textAlign="center" />
                  <Text style={styles.qaMacroLbl}>Carbs</Text>
                </View>
                <View style={styles.qaMacroCol}>
                  <TextInput style={styles.qaMacroInput} placeholder="0" placeholderTextColor="#5a5a60" value={newMealFat} onChangeText={setNewMealFat} keyboardType="numeric" textAlign="center" />
                  <Text style={styles.qaMacroLbl}>Fat</Text>
                </View>
              </View>

              {favRecipes.length > 0 && (
                <>
                  <View style={styles.qaDivider}>
                    <View style={styles.qaDivLine} />
                    <Text style={styles.qaDivText}>OR PICK A FAVOURITE</Text>
                    <View style={styles.qaDivLine} />
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.qaFavRow}
                    keyboardShouldPersistTaps="handled"
                  >
                    {favRecipes.map((r) => {
                      const f = recipeFields(r);
                      const selected = selectedRecipe?.key === f.key;
                      const localSrc = f.localName ? getMealImage(f.localName) : null;
                      return (
                        <TouchableOpacity
                          key={f.key}
                          style={[styles.qaFav, selected && { borderColor: themeColor }]}
                          activeOpacity={0.8}
                          onPress={() => prefillFromRecipe(r)}
                        >
                          {localSrc ? (
                            <Image source={localSrc} style={styles.qaFavPhoto} resizeMode="cover" />
                          ) : f.photo ? (
                            <Image source={{ uri: f.photo }} style={styles.qaFavPhoto} resizeMode="cover" />
                          ) : (
                            <View style={styles.qaFavPhotoFallback}>
                              <Ionicons name="restaurant-outline" size={20} color="#52525b" />
                            </View>
                          )}
                          <Text style={[styles.qaFavName, selected && { color: themeColor }]} numberOfLines={1}>{f.name}</Text>
                          <Text style={styles.qaFavKcal}>{f.kcal} kcal · {f.protein}g P</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}
            </ScrollView>

            <View style={styles.qaAction}>
              <TouchableOpacity
                style={[styles.qaBtn, canLog ? { backgroundColor: themeColor } : styles.qaBtnDisabled]}
                onPress={logQuickMeal}
                disabled={!canLog}
                activeOpacity={0.85}
              >
                <Text style={[styles.qaBtnText, !canLog && styles.qaBtnTextDisabled]}>Log it</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={closeAddMeal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
                <Text style={styles.qaCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Custom Action Sheet */}
      <Modal
        visible={showActionSheet}
        transparent={true}
        animationType="fade"
        onRequestClose={() => handleActionSheetAction('cancel')}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => handleActionSheetAction('cancel')}
          />
          <View style={styles.sheetCard}>
            <View style={styles.sheetGrabber} />
            <Text style={styles.sheetTitle} numberOfLines={1}>{selectedMeal?.meal.name}</Text>
            <View style={styles.sheetDivider} />

            <TouchableOpacity style={styles.sheetRow} onPress={() => handleActionSheetAction('complete')} activeOpacity={0.7}>
              <Ionicons name={selectedMeal?.isCompleted ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={themeColor} />
              <Text style={styles.sheetRowText}>{selectedMeal?.isCompleted ? 'Mark as not eaten' : 'Mark as eaten'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.sheetRow, styles.sheetRowLast]} onPress={() => handleActionSheetAction('delete')} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={[styles.sheetRowText, { color: '#ef4444' }]}>Delete meal</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetCancel} onPress={() => handleActionSheetAction('cancel')} activeOpacity={0.7}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
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
        <View style={styles.delOverlay}>
          <View style={styles.delCard}>
            <View style={styles.delIconWrap}>
              <Ionicons name="trash-outline" size={26} color="#ef4444" />
            </View>
            <Text style={styles.delTitle}>Delete meal</Text>
            <Text style={styles.delName} numberOfLines={2}>{selectedMeal?.meal.name}</Text>
            <Text style={styles.delBody}>This removes it from your day. You can't undo this.</Text>
            <View style={styles.delButtons}>
              <TouchableOpacity style={[styles.delCancel, { width: delBtnW }]} onPress={handleCancelDelete} activeOpacity={0.8}>
                <Text style={styles.delCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.delConfirm, { width: delBtnW }]} onPress={handleConfirmDelete} activeOpacity={0.85}>
                <Text style={styles.delConfirmText}>Delete</Text>
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
  scrollPad: {
    paddingBottom: 48,
  },

  // ---- New: top bar ----
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: { padding: 4 },

  // ---- New: menu-style header (no outline) ----
  menuHeader: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 22,
  },
  menuOverline: {
    fontSize: 11,
    letterSpacing: 2.5,
    color: FAINT,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  menuDay: {
    fontFamily: SERIF,
    fontSize: 34,
    fontStyle: 'italic',
    color: '#ffffff',
    textAlign: 'center',
  },
  menuSub: {
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
    marginTop: 10,
  },
  menuSubAccent: {
    fontFamily: SERIF,
    fontSize: 16,
    color: '#dcdce0',
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2a2a30',
    alignSelf: 'stretch',
    marginTop: 18,
    marginBottom: 14,
  },
  dayProgressTrack: {
    height: 4,
    backgroundColor: '#1c1c22',
    borderRadius: 2,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  dayProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  loggedText: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: FAINT,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 9,
  },

  // ---- New: photo meal timeline ----
  timelineWrap: {
    paddingHorizontal: 18,
  },
  timelineLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: FAINT,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  mcard: {
    borderRadius: 18,
    marginBottom: 18,
  },
  mcardDone: {
    opacity: 0.5,
  },
  photoWrap: {
    height: 150,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#121216',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#141416',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8,8,10,0.62)',
  },
  chip: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  viewHint: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 9.5,
    letterSpacing: 1.5,
    color: '#e8e8ea',
    fontWeight: '600',
  },
  check: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#06262b',
    fontSize: 14,
    fontWeight: '700',
  },
  mbody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 11,
    paddingHorizontal: 2,
  },
  checkBtn: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mname: {
    fontFamily: SERIF,
    fontSize: 18,
    color: '#ffffff',
  },
  mnameDone: {
    textDecorationLine: 'line-through',
    color: '#8a8a90',
  },
  mmacroDone: {
    color: '#5a5a60',
  },
  mmacro: {
    fontSize: 12,
    color: MUTED,
    marginTop: 5,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  freezerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  freezerChipText: {
    fontSize: 10,
    color: '#60a5fa',
    fontWeight: '500',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 40,
  },
  emptyTitle: {
    fontFamily: SERIF,
    fontSize: 22,
    color: '#ffffff',
    marginTop: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ---- Quick add / log a meal ----
  qaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#18181c' },
  qaBack: { padding: 4 },
  qaTitle: { fontFamily: SERIF, fontSize: 20, color: '#ffffff' },
  qaContent: { padding: 20, paddingBottom: 40 },
  qaLabel: { fontSize: 10, letterSpacing: 2, color: FAINT, fontWeight: '600', textTransform: 'uppercase', marginBottom: 9 },
  qaOptional: { letterSpacing: 0, textTransform: 'none', color: '#4a4a50' },
  qaFavRow: { paddingRight: 8 },
  qaFav: { width: 140, borderWidth: StyleSheet.hairlineWidth, borderColor: '#26262c', borderRadius: 14, overflow: 'hidden', marginRight: 9 },
  qaFavPhoto: { width: '100%', height: 76 },
  qaFavPhotoFallback: { width: '100%', height: 76, backgroundColor: '#141416', alignItems: 'center', justifyContent: 'center' },
  qaFavName: { fontFamily: SERIF, fontSize: 14, color: '#e8e8ea', paddingHorizontal: 10, paddingTop: 8 },
  qaFavKcal: { fontSize: 11, color: MUTED, paddingHorizontal: 10, paddingBottom: 10, paddingTop: 3 },
  qaDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 18 },
  qaDivLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#222' },
  qaDivText: { fontSize: 10, letterSpacing: 1.5, color: '#5a5a60', fontWeight: '600' },
  qaField: { backgroundColor: '#0e0e12', borderWidth: StyleSheet.hairlineWidth, borderColor: '#26262c', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#f4f4f6', minHeight: 48 },
  qaMacroRow: { flexDirection: 'row', gap: 9 },
  qaSegment: { flexDirection: 'row', backgroundColor: '#0e0e12', borderWidth: StyleSheet.hairlineWidth, borderColor: '#26262c', borderRadius: 13, padding: 3 },
  qaSegItem: { paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  qaSegText: { fontSize: 13, color: '#9a9aa0' },
  qaSegTextActive: { color: '#06262b', fontWeight: '600' },
  qaMacroCol: { flex: 1 },
  qaMacroInput: { backgroundColor: '#0e0e12', borderWidth: StyleSheet.hairlineWidth, borderColor: '#26262c', borderRadius: 12, paddingVertical: 13, fontSize: 15, color: '#f4f4f6', minHeight: 48 },
  qaMacroLbl: { textAlign: 'center', fontSize: 9, letterSpacing: 1, color: FAINT, fontWeight: '600', textTransform: 'uppercase', marginTop: 6 },
  qaAction: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#18181c' },
  qaBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  qaBtnDisabled: { backgroundColor: '#1a1a1e' },
  qaBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  qaBtnTextDisabled: { color: '#5a5a60' },
  qaCancel: { fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 14 },

  // ===== Existing modal / picker / sheet styles (unchanged) =====
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
  modalScrollContent: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
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
  addMealButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
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
  mealTypeSelection: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  mealTypeButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  mealTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
    textTransform: 'capitalize',
  },
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

  // ---- Revamped action sheet ----
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheetBackdrop: { flex: 1 },
  sheetCard: { backgroundColor: '#141416', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, paddingHorizontal: 20, paddingBottom: 36, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#26262c' },
  sheetGrabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: '#2a2a30', marginBottom: 16 },
  sheetTitle: { fontFamily: SERIF, fontSize: 20, color: '#ffffff', textAlign: 'center' },
  sheetDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#222', marginTop: 14, marginBottom: 2 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1c1c20' },
  sheetRowLast: { borderBottomWidth: 0 },
  sheetRowText: { fontSize: 16, color: '#f4f4f6', fontWeight: '500' },
  sheetCancel: { marginTop: 16, paddingVertical: 15, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: '#2a2a30', alignItems: 'center' },
  sheetCancelText: { fontSize: 15, color: MUTED, fontWeight: '600' },

  // ---- Revamped delete confirm ----
  delOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  delCard: { width: '100%', maxWidth: 340, backgroundColor: '#141416', borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: '#26262c', padding: 26, alignItems: 'center' },
  delIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(239,68,68,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  delTitle: { fontFamily: SERIF, fontSize: 21, color: '#ffffff', marginBottom: 6 },
  delName: { fontSize: 15, color: '#ef4444', fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  delBody: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  delButtons: { flexDirection: 'row', gap: 12, width: '100%', justifyContent: 'center' },
  delCancel: { paddingVertical: 14, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, borderColor: '#2a2a30', alignItems: 'center' },
  delCancelText: { fontSize: 15, color: '#cfcfd4', fontWeight: '600' },
  delConfirm: { paddingVertical: 14, borderRadius: 13, backgroundColor: '#ef4444', alignItems: 'center' },
  delConfirmText: { fontSize: 15, color: '#ffffff', fontWeight: '700' },

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