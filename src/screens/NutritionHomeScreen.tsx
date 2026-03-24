import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Share,
  Platform,
  Modal,
  Image,
  Animated,
  Dimensions,
  TextInput,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useAppMode } from '../contexts/AppModeContext';
import { useSimplifiedMealPlanning } from '../contexts/SimplifiedMealPlanningContext';
import { MigrationHelper } from '../utils/migrationHelper';
import { WorkoutStorage, NutritionCompletionStatus, MealPlan } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NUTRITION_STORAGE_KEYS, SimplifiedMealPlan } from '../types/nutrition';
import { NutritionFeatureGate, IfNutritionPro, IfNutritionFree } from '../components/NutritionFeatureGate';
import { PremiumFeature } from '../utils/premiumFeatures';

type NutritionNavigationProp = StackNavigationProp<RootStackParamList, 'NutritionHome'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper function to convert SimplifiedMealPlan to legacy MealPlan format for UI compatibility
const convertToLegacyFormat = (simplifiedPlan: SimplifiedMealPlan): MealPlan => {
  // Convert dailyMeals object to days array format
  const days = Object.entries(simplifiedPlan.dailyMeals).map(([date, dayData], index) => ({
    day_name: dayData.dayName,
    day_number: index + 1,
    date: date,
    meals: dayData.meals.map(meal => ({
      meal_name: meal.name,
      meal_type: meal.type,
      calories: meal.calories,
      macros: meal.macros,
      ingredients: meal.ingredients,
      instructions: meal.instructions,
      recommended_time: meal.time,
      prep_time: 0,
      cook_time: 0,
      total_time: 0,
      servings: 1,
      tags: meal.tags || [],
      notes: '',
      weekly_meal_coverage: []
    }))
  }));

  // Calculate total macros across all days to get proper macro targets
  let totalMacros = { protein: 0, carbs: 0, fat: 0, calories: 0 };
  let totalDays = 0;
  
  Object.values(simplifiedPlan.dailyMeals).forEach((day: any) => {
    if (day.meals && day.meals.length > 0) {
      const dayMacros = day.meals.reduce((dayTotal: any, meal: any) => ({
        protein: dayTotal.protein + (meal.macros?.protein || 0),
        carbs: dayTotal.carbs + (meal.macros?.carbs || 0),
        fat: dayTotal.fat + (meal.macros?.fat || 0),
        calories: dayTotal.calories + (meal.calories || 0)
      }), { protein: 0, carbs: 0, fat: 0, calories: 0 });
      
      totalMacros.protein += dayMacros.protein;
      totalMacros.carbs += dayMacros.carbs;
      totalMacros.fat += dayMacros.fat;
      totalMacros.calories += dayMacros.calories;
      totalDays++;
    }
  });
  
  // Calculate average daily macros
  if (totalDays > 0) {
    totalMacros.protein /= totalDays;
    totalMacros.carbs /= totalDays;
    totalMacros.fat /= totalDays;
    totalMacros.calories /= totalDays;
  }
  
  // Calculate macro percentages and apply our rounding fix
  let macroTargets = undefined;
  if (totalMacros.calories > 0) {
    const proteinPct = (totalMacros.protein * 4 / totalMacros.calories) * 100;
    const carbsPct = (totalMacros.carbs * 4 / totalMacros.calories) * 100;
    const fatPct = (totalMacros.fat * 9 / totalMacros.calories) * 100;
    
    // Apply our rounding fix here during conversion
    const [roundedProtein, roundedCarbs, roundedFat] = roundPercentagesToTotal([proteinPct, carbsPct, fatPct]);
    
    macroTargets = {
      protein_pct: roundedProtein,
      carbs_pct: roundedCarbs,
      fat_pct: roundedFat
    };
  }

  return {
    id: simplifiedPlan.id,
    name: simplifiedPlan.name,
    duration: Object.keys(simplifiedPlan.dailyMeals).length,
    meals: Object.values(simplifiedPlan.dailyMeals).reduce((total: number, day: any) => total + day.meals.length, 0),
    fingerprint: simplifiedPlan.id, // Use the SimplifiedMealPlan ID as fingerprint
    data: {
      days: days,
      // Include metadata for macro calculations
      estimated_cost: simplifiedPlan.metadata.totalCost || 0,
      // Add the properly rounded macro targets so our fix applies
      macro_targets: macroTargets
    }
  };
};

// Helper function to round percentages using largest remainder method
// Ensures that the sum always equals exactly 100%
const roundPercentagesToTotal = (percentages: number[], targetTotal: number = 100): number[] => {
  // Calculate the floor values and their remainders
  const floors = percentages.map(p => Math.floor(p));
  const remainders = percentages.map((p, i) => p - floors[i]);
  
  // Calculate how many additional points we need to distribute
  const currentSum = floors.reduce((sum, floor) => sum + floor, 0);
  const pointsToDistribute = targetTotal - currentSum;
  
  // Sort remainders by size (largest first) and keep track of original indices
  const remainderWithIndex = remainders
    .map((remainder, index) => ({ remainder, index }))
    .sort((a, b) => b.remainder - a.remainder);
  
  // Distribute the remaining points to values with largest remainders
  const result = [...floors];
  for (let i = 0; i < pointsToDistribute && i < remainderWithIndex.length; i++) {
    result[remainderWithIndex[i].index]++;
  }
  
  return result;
};

// Helper function to get macro split display
const getMacroSplitDisplay = (plan: MealPlan) => {
  if (plan.macroSplit) return plan.macroSplit;
  
  // Try different data structures - plan level macro targets
  const macroTargets = plan.data?.macro_targets;
  if (macroTargets) {
    const protein = macroTargets.protein_pct || macroTargets.protein || 0;
    const carbs = macroTargets.carbs_pct || macroTargets.carbs || 0;
    const fat = macroTargets.fat_pct || macroTargets.fat || 0;
    
    // Apply largest remainder rounding to ensure sum equals 100%
    const [roundedProtein, roundedCarbs, roundedFat] = roundPercentagesToTotal([protein, carbs, fat]);
    return `${roundedProtein}P/${roundedCarbs}C/${roundedFat}F`;
  }
  
  // Calculate from daily meals if plan-level targets not available
  if (plan.data?.days && plan.data.days.length > 0) {
    // Get the first day's total macros as a representative sample
    const firstDay = plan.data.days[0];
    if (firstDay?.meals && firstDay.meals.length > 0) {
      const totalMacros = firstDay.meals.reduce((total, meal) => ({
        protein: total.protein + (meal.macros?.protein || 0),
        carbs: total.carbs + (meal.macros?.carbs || 0),
        fat: total.fat + (meal.macros?.fat || 0),
        calories: total.calories + (meal.calories || 0)
      }), { protein: 0, carbs: 0, fat: 0, calories: 0 });
      
      if (totalMacros.calories > 0) {
        // Calculate percentages (before rounding)
        const proteinPct = (totalMacros.protein * 4 / totalMacros.calories) * 100;
        const carbsPct = (totalMacros.carbs * 4 / totalMacros.calories) * 100;
        const fatPct = (totalMacros.fat * 9 / totalMacros.calories) * 100;
        
        // Apply largest remainder rounding to ensure sum equals 100%
        const [roundedProtein, roundedCarbs, roundedFat] = roundPercentagesToTotal([proteinPct, carbsPct, fatPct]);
        return `${roundedProtein}P/${roundedCarbs}C/${roundedFat}F`;
      }
    }
  }
  
  // Try old weeks structure
  if (plan.data?.weeks && plan.data.weeks.length > 0) {
    const firstWeek = plan.data.weeks[0];
    if (firstWeek?.days && firstWeek.days.length > 0) {
      const firstDay = firstWeek.days[0];
      if (firstDay?.meals && firstDay.meals.length > 0) {
        const totalMacros = firstDay.meals.reduce((total, meal) => ({
          protein: total.protein + (meal.macros?.protein || 0),
          carbs: total.carbs + (meal.macros?.carbs || 0),
          fat: total.fat + (meal.macros?.fat || 0),
          calories: total.calories + (meal.calories || 0)
        }), { protein: 0, carbs: 0, fat: 0, calories: 0 });
        
        if (totalMacros.calories > 0) {
          // Calculate percentages (before rounding)
          const proteinPct = (totalMacros.protein * 4 / totalMacros.calories) * 100;
          const carbsPct = (totalMacros.carbs * 4 / totalMacros.calories) * 100;
          const fatPct = (totalMacros.fat * 9 / totalMacros.calories) * 100;
          
          // Apply largest remainder rounding to ensure sum equals 100%
          const [roundedProtein, roundedCarbs, roundedFat] = roundPercentagesToTotal([proteinPct, carbsPct, fatPct]);
          return `${roundedProtein}P/${roundedCarbs}C/${roundedFat}F`;
        }
      }
    }
  }
  
  return ''; // Return empty string instead of 'planned'
};

function MealPlanCard({ plan, onExport, onPress, onLongPress }: { 
  plan: MealPlan; 
  onExport: () => void;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { themeColor } = useTheme();
  
  return (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.8} 
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={800}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>{plan.name}</Text>
          <Text style={styles.cardSubtitle}>
            {plan.duration} days{getMacroSplitDisplay(plan) ? ` • ${getMacroSplitDisplay(plan)}` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={onExport} style={styles.exportButton}>
          <Ionicons name="share-outline" size={22} color={themeColor} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// No scaling - meal plans are used exactly as designed

export default function NutritionHomeScreen({ route, transitionProgress }: any) {
  const navigation = useNavigation<NutritionNavigationProp>();
  const { isPinkTheme, setIsPinkTheme, themeColor, themeColorLight } = useTheme();
  const { appMode, setAppMode, isTrainingMode, isNutritionMode, isTransitioning, setIsTransitioning } = useAppMode();
  const { mealPlans, currentPlan, setCurrentPlan, deleteMealPlan, saveMealPlan } = useSimplifiedMealPlanning();
  
  // For compatibility with existing code
  const userProfile = null; // TODO: Will need to handle user profile separately
  const clearCurrentMealPlan = async () => {
    if (currentPlan) {
      await deleteMealPlan(currentPlan.id);
    }
  };
  
  // Convert SimplifiedMealPlans to legacy format for UI compatibility
  const convertedMealPlans = mealPlans.map(plan => convertToLegacyFormat(plan));
  
  const [shareModal, setShareModal] = useState<{ visible: boolean; plan: MealPlan | null }>({
    visible: false,
    plan: null,
  });
  const [successModal, setSuccessModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ visible: boolean; plan: MealPlan | null }>({
    visible: false,
    plan: null,
  });
  const [renameModal, setRenameModal] = useState<{ visible: boolean; plan: MealPlan | null; newName: string }>({
    visible: false,
    plan: null,
    newName: '',
  });
  const [preferencesModal, setPreferencesModal] = useState(false);
  const [aiPromptCopied, setAiPromptCopied] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const [savedMealPlans, setSavedMealPlans] = useState<Set<string>>(new Set());
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Completion status loaded from storage
  const [completionStatus, setCompletionStatus] = useState<NutritionCompletionStatus>({
    nutritionGoals: false,
    budgetCooking: false,
    sleepOptimization: false,
    fridgePantry: false,
    favoriteMeals: false,
  });

  // Load completion status on component mount and when screen is focused

  const loadCompletionStatus = async () => {
    try {
      const status = await WorkoutStorage.loadNutritionCompletionStatus();
      setCompletionStatus(status);
    } catch (error) {
      console.error('Failed to load completion status:', error);
    }
  };

  // Load saved meal plans state
  const loadSavedMealPlansState = async () => {
    try {
      const existingMealPlans = await WorkoutStorage.loadMealPlans();
      const savedIds = new Set(existingMealPlans.map(plan => plan.fingerprint || plan.id));
      setSavedMealPlans(savedIds);
    } catch (error) {
      console.error('Failed to load saved meal plans state:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCompletionStatus();
      loadSavedMealPlansState();
    }, [])
  );

  useEffect(() => {
    if (route?.params?.refresh) {
      // Refresh happens automatically via MealPlanningContext
    }
  }, [route?.params?.refresh]);

  const handleActionRequest = (plan: MealPlan) => {
    setDeleteModal({ visible: true, plan });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.plan) return;
    
    try {
      // Find the original SimplifiedMealPlan ID from the converted plan
      const originalPlan = mealPlans.find(p => p.name === deleteModal.plan?.name);
      if (originalPlan) {
        await deleteMealPlan(originalPlan.id);
      }
      setDeleteModal({ visible: false, plan: null });
    } catch (error) {
      console.error('Failed to delete meal plan:', error);
    }
  };

  const handleRenameRequest = (plan: MealPlan) => {
    setDeleteModal({ visible: false, plan: null });
    setRenameModal({ visible: true, plan, newName: plan.name });
  };

  const handleRenameConfirm = async () => {
    const { plan, newName } = renameModal;
    if (!plan || !newName.trim()) return;
    
    try {
      // Find the original SimplifiedMealPlan from the converted plan
      const originalPlan = mealPlans.find(p => p.name === plan.name);
      if (originalPlan) {
        const updatedPlan = { ...originalPlan, name: newName.trim() };
        await saveMealPlan(updatedPlan);
      }
      setRenameModal({ visible: false, plan: null, newName: '' });
    } catch (error) {
      console.error('Failed to rename meal plan:', error);
      Alert.alert('Error', 'Failed to rename meal plan. Please try again.');
    }
  };

  const handleMealPlanSwitch = async (plan: MealPlan) => {
    // Find the original SimplifiedMealPlan and switch to it
    const originalPlan = mealPlans.find(p => p.name === plan.name);
    if (originalPlan && originalPlan.id !== currentPlan?.id) {
      await setCurrentPlan(originalPlan.id);
      console.log(`🔄 Switched to meal plan: ${originalPlan.name}`);
    }
  };

  const handleMealPlanNavigation = (plan: MealPlan) => {
    console.log('🍽️ Navigating to meal plan (no scaling):', plan.name);
    
    // First switch to this meal plan if it's not current
    handleMealPlanSwitch(plan);

    // Handle new days structure (JSON.fit format)
    if (plan.data?.days) {
      // Create a mock week object to maintain compatibility with existing navigation
      const week = {
        week_number: 1,
        days: plan.data.days
      };
      
      // For now, just create a basic single session from legacy data
      let mealPrepSession = null;
      if (plan.data.weekly_meal_prep) {
        mealPrepSession = {
          session_name: `${plan.name} - Weekly Meal Prep`,
          session_number: 1,
          prep_day: 'Sunday evening',
          total_time: plan.data.weekly_meal_prep.total_prep_time || 90,
          prep_time: Math.floor((plan.data.weekly_meal_prep.total_prep_time || 90) / 3),
          cook_time: Math.floor((plan.data.weekly_meal_prep.total_prep_time || 90) * 2 / 3),
          total_prep_time: plan.data.weekly_meal_prep.total_prep_time || 90,
          covers: `${plan.duration} days`,
          covers_days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          recommended_timing: 'Sunday evening',
          instructions: plan.data.weekly_meal_prep.prep_session_guide?.map(step => 
            `${step.title}: ${step.description}`
          ) || [],
          prep_meals: plan.data.days && plan.data.days[0]?.meals ? 
            plan.data.days[0].meals.map(meal => ({
              meal_name: meal.meal_name,
              meal_type: meal.meal_type,
              prep_time: meal.prep_time || 0,
              cook_time: meal.cook_time || 0,
              total_time: meal.total_time || 0,
              servings: meal.servings || 1,
              calories: meal.calories || 0,
              macros: meal.macros || { protein: 0, carbs: 0, fat: 0, fiber: 0 },
              ingredients: meal.ingredients?.map(ing => ({
                item: ing.item,
                amount: ing.amount,
                unit: ing.unit,
                scalable: true,
                notes: ing.notes || ''
              })) || [],
              instructions: meal.instructions || [],
              meal_prep_notes: meal.notes || '',
              base_servings: meal.servings || 1,
              weekly_meal_coverage: meal.weekly_meal_coverage || []
            })) : [],
          equipment_needed: ['Large pot', 'Baking tray', 'Microwave-safe containers'],
          ingredients: [],
          storage_guidelines: {
            proteins: 'Refrigerate cooked proteins for up to 4 days, freeze for longer storage',
            grains: 'Store cooked grains in airtight containers in refrigerator for up to 5 days',
            vegetables: 'Store prepared vegetables in refrigerator, add frozen vegetables raw to containers'
          }
        };
      }
      
      navigation.navigate('MealPlanDays' as any, {
        week,
        mealPlanName: plan.name,
        mealPrepSession,
        allMealPrepSessions: plan.data?.meal_prep_sessions || (mealPrepSession ? [mealPrepSession] : []),
        groceryList: plan.data?.grocery_list,
      });
      return;
    }

    // Handle old weeks structure (existing logic)
    if (!plan.data?.weeks) return;

    // For 7-day meal plans (or single week), navigate directly to days
    if (plan.duration <= 7 || plan.data.weeks.length === 1) {
      const week = plan.data.weeks[0];
      navigation.navigate('MealPlanDays' as any, {
        week,
        mealPlanName: plan.name,
        mealPrepSession: plan.data.meal_prep_session,
        allMealPrepSessions: plan.data?.meal_prep_sessions || [],
        groceryList: plan.data?.grocery_list,
      });
      return;
    }

    // For multi-week plans, navigate to weeks view
    navigation.navigate('MealPlanWeeks' as any, { mealPlan: plan });
  };

  const handleJumpToToday = (plan: MealPlan) => {
    try {
      // Use clean navigation utilities
      const { 
        findBestTodayDate, 
        navigateToMealDay, 
        navigateToMealPlanDays 
      } = require('../utils/cleanMealPlanNavigation');

      // Find the best date for "today"
      const bestTodayDate = findBestTodayDate(currentPlan);
      
      if (bestTodayDate) {
        // Navigate directly to the day
        navigateToMealDay(navigation, bestTodayDate, {
          id: currentPlan.id || plan.id || 'unknown',
          name: plan.name
        });
      } else {
        // Navigate to plan overview
        navigateToMealPlanDays(navigation, {
          id: currentPlan.id || plan.id || 'unknown',
          name: plan.name
        });
      }
    } catch (error) {
      console.error('❌ Today button navigation failed:', error);
      // Fallback to plan overview
      navigation.navigate('MealPlanDays' as any, {
        planId: currentPlan.id || plan.id || 'unknown',
        planName: plan.name
      });
    }
  };

  const handleTrainingTransition = () => {
    if (isTransitioning) return;
    
    // Just switch the app mode, the container will handle the animation
    setAppMode('training');
  };


  // Check if plan is already saved
  const isPlanSaved = (plan: MealPlan): boolean => {
    const planId = plan.fingerprint || plan.id;
    return savedMealPlans.has(planId);
  };

  // Toggle save/unsave meal plan
  const handleToggleSaveMealPlan = async (plan: MealPlan) => {
    try {
      const originalPlan = mealPlans.find(p => p.name === plan.name);
      if (!originalPlan) {
        Alert.alert('Error', 'Could not find meal plan.');
        return;
      }

      const planId = originalPlan.fingerprint || originalPlan.id;
      const isCurrentlySaved = savedMealPlans.has(planId);
      
      console.log('💾 Save meal plan button pressed:', originalPlan.name, 'Currently saved:', isCurrentlySaved);
      
      if (isCurrentlySaved) {
        // Unsave the meal plan
        await WorkoutStorage.removeMealPlan(planId);
        setSavedMealPlans(prev => {
          const newSet = new Set(prev);
          newSet.delete(planId);
          return newSet;
        });
        console.log('❌ Meal plan removed from My Meals');
      } else {
        // Save the meal plan
        const transformedMealPlan = {
          id: originalPlan.id,
          name: originalPlan.name,
          duration: Object.keys(originalPlan.dailyMeals).length,
          meals: Object.values(originalPlan.dailyMeals).reduce((total, day: any) => total + day.meals.length, 0),
          data: originalPlan,
          fingerprint: originalPlan.fingerprint || originalPlan.id,
          createdAt: Date.now(),
        };

        await WorkoutStorage.addMealPlan(transformedMealPlan);
        setSavedMealPlans(prev => new Set([...prev, transformedMealPlan.fingerprint]));
        console.log('✅ Meal plan saved successfully');
      }
      
    } catch (error) {
      console.error('Failed to toggle meal plan save:', error);
      Alert.alert('Error', 'Failed to update meal plan. Please try again.');
    }
  };

  // Legacy function for compatibility (can be removed later)
  const handleSaveMealPlan = handleToggleSaveMealPlan;

  const handleExport = (plan: MealPlan) => {
    setShareModal({ visible: true, plan });
  };

  const handleShare = async (action: 'copy' | 'share') => {
    if (!shareModal.plan) return;

    try {
      // Export the current SimplifiedMealPlan directly (no conversion needed)
      console.log('📤 Exporting SimplifiedMealPlan with all customizations');
      
      if (!currentPlan) {
        console.error('❌ No current plan to export');
        return;
      }

      const mealPlanToExport = {
        ...currentPlan,
        exported_with_customizations: true,
        export_timestamp: new Date().toISOString(),
        export_note: "This export includes all customizations: manually added meals and permanently deleted meals"
      };
      
      console.log('📤 Ready to export SimplifiedMealPlan:', {
        id: mealPlanToExport.id,
        name: mealPlanToExport.name,
        dailyMealsCount: Object.keys(mealPlanToExport.dailyMeals).length
      });
      
      const mealPlanData = JSON.stringify(mealPlanToExport, null, 2);
      
      if (action === 'copy') {
        await Clipboard.setStringAsync(mealPlanData);
        setShareModal({ visible: false, plan: null });
        setTimeout(() => {
          setSuccessModal(true);
        }, 100);
      } else {
        await Share.share({
          message: `Check out this meal plan: ${shareModal.plan.name}\n\n${mealPlanData}`,
          title: shareModal.plan.name,
        });
        setShareModal({ visible: false, plan: null });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      setShareModal({ visible: false, plan: null });
    }
  };

  const renderContent = () => {
    if (convertedMealPlans.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="restaurant-outline" size={80} color="#3f3f46" />
          <Text style={styles.emptyTitle}>No Meal Plans Yet</Text>
          <Text style={styles.emptyDescription}>
            Import a custom JSON meal plan or choose one of the sample plans.
          </Text>
        </View>
      );
    }

    if (convertedMealPlans.length === 1) {
      // Hero layout for single meal plan (matching workout screen)
      const plan = convertedMealPlans[0];
      return (
        <View style={styles.heroContainer}>
          <TouchableOpacity
            style={[styles.heroCard, { borderColor: themeColor, shadowColor: themeColor }]}
            activeOpacity={0.8}
            onPress={() => handleMealPlanNavigation(plan)}
            onLongPress={() => handleActionRequest(plan)}
            delayLongPress={800}
          >

            <View style={styles.heroContent}>
              <Text style={[styles.heroTitle, { textShadowColor: themeColorLight }]}>{plan.name}</Text>
              <Text style={styles.heroSubtitle}>
                {plan.duration} days{getMacroSplitDisplay(plan) ? ` • ${getMacroSplitDisplay(plan)}` : ''} planned
              </Text>
              <Text style={[styles.heroDescription, { color: themeColor }]}>
                Tap to view your meal plan
              </Text>
            </View>
            
            <View style={styles.heroActions}>
              <TouchableOpacity
                style={styles.heroActionButton}
                onPress={() => handleExport(plan)}
                activeOpacity={0.7}
              >
                <Ionicons name="share-outline" size={24} color={themeColor} />
                <Text style={[styles.heroActionText, { color: themeColor }]}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroSecondaryButton}
                onPress={() => handleJumpToToday(plan)}
                activeOpacity={0.7}
              >
                <Ionicons name="today-outline" size={18} color="#71717a" />
                <Text style={styles.heroSecondaryText}>Today</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    if (convertedMealPlans.length === 2) {
      // Two plans - split screen vertically
      return (
        <View style={styles.dualVerticalContainer}>
          {convertedMealPlans.map((plan, index) => (
            <View key={plan.id} style={styles.dualVerticalHeroContainer}>
              <TouchableOpacity
                style={[styles.dualVerticalCard, { borderColor: themeColor, shadowColor: themeColor }]}
                activeOpacity={0.8}
                onPress={() => handleMealPlanNavigation(plan)}
                onLongPress={() => handleActionRequest(plan)}
                delayLongPress={800}
              >
                <View style={styles.dualVerticalContent}>
                  <Text style={[styles.dualVerticalTitle, { textShadowColor: themeColorLight }]}>{plan.name}</Text>
                  <Text style={styles.dualVerticalSubtitle}>
                    {plan.duration} days{getMacroSplitDisplay(plan) ? ` • ${getMacroSplitDisplay(plan)}` : ''} planned
                  </Text>
                  <Text style={[styles.dualVerticalDescription, { color: themeColor }]}>
                    Tap to view your meal plan
                  </Text>
                  

                  <View style={styles.dualVerticalActions}>
                    <TouchableOpacity
                      style={styles.dualVerticalShareButton}
                      onPress={() => handleExport(plan)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="share-outline" size={20} color={themeColor} />
                      <Text style={[styles.dualVerticalShareText, { color: themeColor }]}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dualVerticalSecondaryButton}
                      onPress={() => handleJumpToToday(plan)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="today-outline" size={16} color="#71717a" />
                      <Text style={styles.dualVerticalSecondaryText}>Today</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      );
    }

    if (convertedMealPlans.length === 3) {
      // Three plans - compact grid layout (matching workout screen)
      return (
        <View style={styles.tripleContainer}>
          {convertedMealPlans.map((plan, index) => (
            <View key={plan.id} style={styles.tripleCardContainer}>
              <TouchableOpacity
                style={[styles.tripleCard, { borderColor: themeColor, shadowColor: themeColor }]}
                activeOpacity={0.8}
                onPress={() => handleMealPlanNavigation(plan)}
                onLongPress={() => handleActionRequest(plan)}
                delayLongPress={800}
              >
                <View style={styles.tripleContent}>
                  <Text style={[styles.tripleTitle, { textShadowColor: themeColorLight }]} numberOfLines={2}>
                    {plan.name}
                  </Text>
                  <Text style={styles.tripleSubtitle}>
                    {plan.duration} days • {getMacroSplitDisplay(plan)}
                  </Text>
                  <Text style={[styles.tripleDescription, { color: themeColor }]}>
                    Tap to view
                  </Text>
                </View>
                
                <View style={styles.tripleActions}>
                  <TouchableOpacity
                    style={styles.tripleActionButton}
                    onPress={() => handleJumpToToday(plan)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="today-outline" size={20} color={themeColor} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      );
    }

    if (convertedMealPlans.length === 4) {
      // Four plans - vertical stack layout (matching workout screen)
      return (
        <View style={styles.quadContainer}>
          {convertedMealPlans.map((plan, index) => (
            <View key={plan.id} style={styles.quadCardContainer}>
              <TouchableOpacity
                style={[styles.quadCard, { borderColor: themeColor, shadowColor: themeColor }]}
                activeOpacity={0.8}
                onPress={() => handleMealPlanNavigation(plan)}
                onLongPress={() => handleActionRequest(plan)}
                delayLongPress={800}
              >
                <View style={styles.quadContent}>
                  <Text style={[styles.quadTitle, { textShadowColor: themeColorLight }]} numberOfLines={2}>
                    {plan.name}
                  </Text>
                  <Text style={styles.quadSubtitle}>
                    {plan.duration} days • {getMacroSplitDisplay(plan)}
                  </Text>
                  <Text style={[styles.quadDescription, { color: themeColor }]}>
                    Tap to view
                  </Text>
                </View>
                
                <View style={styles.quadButtonsContainer}>
                  <TouchableOpacity
                    style={styles.quadShareButton}
                    onPress={() => handleExport(plan)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="share-outline" size={18} color={themeColor} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quadShareButton}
                    onPress={() => handleJumpToToday(plan)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="today-outline" size={18} color={themeColor} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      );
    }

    // Multiple plans - scrollable list
    return (
      <FlatList
        data={convertedMealPlans}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.heroListContainer}
        renderItem={({ item: plan }) => (
          <View style={styles.heroContainer}>
            <TouchableOpacity
              style={[styles.heroCard, { borderColor: themeColor, shadowColor: themeColor }]}
              activeOpacity={0.8}
              onPress={() => handleMealPlanNavigation(plan)}
              onLongPress={() => handleActionRequest(plan)}
              delayLongPress={800}
            >
              <View style={styles.heroContent}>
                <Text style={[styles.heroTitle, { textShadowColor: themeColorLight }]}>{plan.name}</Text>
                <Text style={styles.heroSubtitle}>
                  {plan.duration} days{getMacroSplitDisplay(plan) ? ` • ${getMacroSplitDisplay(plan)}` : ''} planned
                </Text>
                <Text style={[styles.heroDescription, { color: themeColor }]}>
                  Tap to view your meal plan
                </Text>
              </View>
              

              <View style={styles.heroActions}>
                <TouchableOpacity
                  style={styles.heroActionButton}
                  onPress={() => handleExport(plan)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-outline" size={24} color={themeColor} />
                  <Text style={[styles.heroActionText, { color: themeColor }]}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.heroSecondaryButton}
                  onPress={() => handleJumpToToday(plan)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="today-outline" size={18} color="#71717a" />
                  <Text style={styles.heroSecondaryText}>Today</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        )}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {renderContent()}
      </Animated.View>

      {/* Calendar Button - Bottom Left */}
      <View style={[styles.calendarButton, { backgroundColor: themeColor }]}>
        <TouchableOpacity
          style={styles.buttonInner}
          onPress={() => navigation.navigate('NutritionDashboard' as any)}
          activeOpacity={0.9}
        >
          <Ionicons name="clipboard-outline" size={24} color="#0a0a0b" />
        </TouchableOpacity>
      </View>

      {/* Weight Tracker Button - Bottom Center */}
      <View style={[styles.weightButton, { backgroundColor: themeColor }]}>
        <TouchableOpacity
          style={styles.buttonInner}
          onPress={() => navigation.navigate('WeightTracker' as any)}
          activeOpacity={0.9}
        >
          <Ionicons name="scale-outline" size={24} color="#0a0a0b" />
        </TouchableOpacity>
      </View>

      {/* App Mode Toggle - Centered at Top */}
      <View style={styles.centralToggleContainer}>
        <TouchableOpacity
          style={[
            styles.centralModeToggle, 
            isTrainingMode && { backgroundColor: themeColor, borderColor: themeColor }
          ]}
          onPress={handleTrainingTransition}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="barbell" 
            size={20} 
            color={isTrainingMode ? "#0a0a0b" : themeColor} 
          />
          <Text style={[
            styles.centralToggleText,
            { color: isTrainingMode ? "#0a0a0b" : themeColor }
          ]}>
            Workouts
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.centralModeToggle, 
            isNutritionMode && { backgroundColor: themeColor, borderColor: themeColor }
          ]}
          onPress={() => {}} // Already in nutrition mode
          activeOpacity={0.8}
        >
          <Ionicons 
            name="restaurant" 
            size={20} 
            color={isNutritionMode ? "#0a0a0b" : themeColor} 
          />
          <Text style={[
            styles.centralToggleText,
            { color: isNutritionMode ? "#0a0a0b" : themeColor }
          ]}>
            Nutrition
          </Text>
        </TouchableOpacity>
      </View>

      {/* Gender Theme Toggle - Top Right */}
      <TouchableOpacity
        style={styles.genderToggle}
        onPress={() => setIsPinkTheme(!isPinkTheme)}
        activeOpacity={0.8}
      >
        <Ionicons 
          name={isPinkTheme ? "woman" : "man"} 
          size={24} 
          color={themeColor} 
        />
      </TouchableOpacity>


      {/* Add Meal Plan FAB - Bottom Right */}
      <NutritionFeatureGate
        featureName="nutrition planning"
        onUpgradePress={() => navigation.navigate('Payment' as any)}
        fallback={
          <View style={[styles.fab, { backgroundColor: '#3f3f46' }]}>
            <TouchableOpacity
              style={styles.buttonInner}
              onPress={() => navigation.navigate('Payment' as any)}
              activeOpacity={0.9}
            >
              <View style={styles.lockedFabContent}>
                <Ionicons name="lock-closed" size={20} color="#a1a1aa" />
                <Text style={styles.lockedFabText}>$9.99</Text>
              </View>
            </TouchableOpacity>
          </View>
        }
      >
        <View style={[styles.fab, { backgroundColor: themeColor }]}>
          <TouchableOpacity
            style={styles.buttonInner}
            onPress={() => navigation.navigate('ImportMealPlan' as any)}
            activeOpacity={0.9}
          >
            <Ionicons name="add" size={28} color="#0a0a0b" />
          </TouchableOpacity>
        </View>
      </NutritionFeatureGate>

      {/* Action Modal */}
      <Modal
        visible={deleteModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModal({ visible: false, plan: null })}
      >
        <View style={styles.actionModalOverlay}>
          <TouchableOpacity 
            style={styles.actionModalBackdrop}
            activeOpacity={1}
            onPress={() => setDeleteModal({ visible: false, plan: null })}
          />
          
          <View style={[styles.actionSheet, { borderColor: themeColor }]}>
            {/* Handle Bar */}
            <View style={styles.handleBar} />
            
            {/* Header */}
            <View style={styles.actionHeader}>
              <Text style={styles.actionTitle}>Meal Plan Options</Text>
              <TouchableOpacity
                style={styles.actionCloseButton}
                onPress={() => setDeleteModal({ visible: false, plan: null })}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#a1a1aa" />
              </TouchableOpacity>
            </View>
            
            {/* Plan Info */}
            <View style={styles.actionPlanInfo}>
              <Text style={styles.actionPlanName} numberOfLines={2}>
                {deleteModal.plan?.name}
              </Text>
              <Text style={styles.actionPlanDetails}>
                {deleteModal.plan?.duration} days{deleteModal.plan && getMacroSplitDisplay(deleteModal.plan) ? ` • ${getMacroSplitDisplay(deleteModal.plan)}` : ''}
              </Text>
            </View>
            
            <View style={styles.modernActionButtons}>
              {/* Save to My Meals Button */}
              <TouchableOpacity
                style={[
                  styles.saveActionButton,
                  deleteModal.plan && savedMealPlans.has(deleteModal.plan.fingerprint || deleteModal.plan.id) && styles.removeActionButton
                ]}
                onPress={() => {
                  console.log('🔥 Save button pressed, modal plan:', deleteModal.plan?.name);
                  if (deleteModal.plan) {
                    handleToggleSaveMealPlan(deleteModal.plan);
                  } else {
                    console.log('❌ No plan in modal');
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={deleteModal.plan && savedMealPlans.has(deleteModal.plan.fingerprint || deleteModal.plan.id) ? "heart-dislike" : "heart"} 
                  size={18} 
                  color="#ffffff" 
                />
                <Text style={styles.saveActionText}>
                  {deleteModal.plan && savedMealPlans.has(deleteModal.plan.fingerprint || deleteModal.plan.id) ? 'Remove from My Meals' : 'Save to My Meals'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.renameButton}
                onPress={() => deleteModal.plan && handleRenameRequest(deleteModal.plan)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={18} color="#ffffff" />
                <Text style={styles.renameText}>Rename</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={handleDeleteConfirm}
                activeOpacity={0.7}
              >
                <Ionicons name="trash" size={18} color="#ffffff" />
                <Text style={styles.deleteConfirmText}>Remove</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => setDeleteModal({ visible: false, plan: null })}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Share Modal */}
      <Modal
        visible={shareModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShareModal({ visible: false, plan: null })}
      >
        <View style={styles.newShareOverlay}>
          <TouchableOpacity 
            style={styles.newShareBackdrop}
            activeOpacity={1}
            onPress={() => setShareModal({ visible: false, plan: null })}
          />
          
          <View style={[styles.newShareModal, { borderColor: themeColor }]}>
            {/* Close Button */}
            <View style={styles.newShareHeader}>
              <TouchableOpacity
                style={styles.newShareClose}
                onPress={() => setShareModal({ visible: false, plan: null })}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            {/* Image */}
            <Image 
              source={isPinkTheme ? 
                require('./../../lucid-origin_Two_athletic_women_enjoying_a_healthy_meal_together_in_a_modern_kitchen_one_pass-0.jpg') :
                require('./../../lucid-origin_Two_athletic_men_enjoying_a_healthy_meal_together_in_a_modern_kitchen_one_passin-0.jpg')
              }
              style={styles.newShareImage}
              resizeMode="cover"
            />
            
            {/* Content */}
            <View style={styles.newShareContent}>
              <Text style={[styles.newShareTitle, { color: themeColor }]}>
                {shareModal.plan?.name?.toUpperCase()}
              </Text>
              <Text style={styles.newShareSubtitle}>Share your meal plan</Text>
              
              {/* Action Buttons */}
              <View style={styles.shareActionButtons}>
                <TouchableOpacity
                  style={[styles.shareActionPrimary, { backgroundColor: themeColor }]}
                  onPress={() => handleShare('copy')}
                  activeOpacity={0.9}
                >
                  <View style={styles.shareButtonContent}>
                    <Ionicons name="copy" size={22} color="#0a0a0b" />
                    <View style={styles.shareButtonText}>
                      <Text style={styles.shareButtonTitle}>COPY MEAL PLAN</Text>
                      <Text style={styles.shareButtonSubtitle}>JSON to clipboard</Text>
                    </View>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.shareActionSecondary}
                  onPress={() => handleShare('share')}
                  activeOpacity={0.9}
                >
                  <View style={styles.shareButtonContent}>
                    <Ionicons name="share-social" size={22} color="#22d3ee" />
                    <View style={styles.shareButtonText}>
                      <Text style={[styles.shareButtonTitle, { color: '#ffffff' }]}>SHARE</Text>
                      <Text style={[styles.shareButtonSubtitle, { color: '#a1a1aa' }]}>Send to others</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rename Modal */}
      <Modal
        visible={renameModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRenameModal({ visible: false, plan: null, newName: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.renameContainer}>
            <View style={styles.renameIconContainer}>
              <Ionicons name="create-outline" size={32} color={themeColor} />
            </View>
            
            <Text style={styles.renameTitle}>Rename Meal Plan</Text>
            
            <View style={styles.renameInputContainer}>
              <TextInput
                style={styles.renameInput}
                value={renameModal.newName}
                onChangeText={(text) => setRenameModal(prev => ({ ...prev, newName: text }))}
                placeholder="Enter new name"
                placeholderTextColor="#71717a"
                autoFocus={true}
                selectTextOnFocus={true}
              />
            </View>
            
            <View style={styles.renameButtons}>
              <TouchableOpacity
                style={styles.renameCancelButton}
                onPress={() => setRenameModal({ visible: false, plan: null, newName: '' })}
                activeOpacity={0.7}
              >
                <Text style={styles.renameCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.renameConfirmButton, { backgroundColor: themeColor }]}
                onPress={handleRenameConfirm}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark" size={18} color="#0a0a0b" />
                <Text style={styles.renameConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={successModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>Copied!</Text>
            <Text style={styles.successMessage}>Meal plan JSON copied to clipboard</Text>
            
            <TouchableOpacity
              style={[styles.successButton, { backgroundColor: themeColor }]}
              onPress={() => setSuccessModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  animatedContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 24,
  },
  aiPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
    marginBottom: 16,
  },
  aiPromptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
    marginLeft: 8,
  },
  aiPromptHelp: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  questionnaireTasks: {
    marginTop: 32,
    width: '100%',
  },
  taskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1a1a1b',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  taskButtonCompleted: {
    backgroundColor: 'rgba(116, 222, 151, 0.1)',
    borderColor: 'rgba(116, 222, 151, 0.3)',
  },
  taskButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 12,
  },
  heroContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroListContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  heroCard: {
    position: 'relative',
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#22d3ee',
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    minHeight: 320,
    justifyContent: 'center',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    shadowColor: '#22d3ee',
    position: 'relative',
  },
  heroContent: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 42,
    textShadowColor: '#22d3ee40',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroDescription: {
    fontSize: 16,
    color: '#22d3ee',
    textAlign: 'center',
    fontWeight: '500',
  },
  heroActions: {
    width: '100%',
    alignItems: 'center',
  },
  heartIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  heroActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  heroActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22d3ee',
  },
  heroSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 8,
  },
  heroSecondaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#71717a',
  },
  dualVerticalContainer: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 100,
    paddingHorizontal: 16,
    gap: 16,
    justifyContent: 'space-evenly',
  },
  dualVerticalHeroContainer: {
    height: '45%',
    width: '100%',
  },
  dualVerticalCard: {
    position: 'relative',
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#22d3ee',
    padding: 32,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22d3ee',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dualVerticalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  dualVerticalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: '#22d3ee',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 2,
  },
  dualVerticalSubtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    marginBottom: 16,
    textAlign: 'center',
  },
  dualVerticalDescription: {
    fontSize: 14,
    color: '#22d3ee',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  dualVerticalActions: {
    alignItems: 'center',
  },
  dualVerticalShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
  },
  dualVerticalShareText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dualVerticalSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
    marginTop: 8,
  },
  dualVerticalSecondaryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717a',
  },
  tripleContainer: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 100,
    paddingHorizontal: 16,
    gap: 12,
    justifyContent: 'space-evenly',
  },
  tripleCardContainer: {
    height: '30%',
    width: '100%',
  },
  tripleCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#22d3ee',
    padding: 20,
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#22d3ee',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tripleContent: {
    flex: 1,
  },
  tripleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 4,
  },
  tripleSubtitle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  tripleDescription: {
    fontSize: 11,
    fontWeight: '500',
  },
  tripleActions: {
    marginLeft: 12,
  },
  tripleActionButton: {
    padding: 8,
  },
  quadContainer: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 100,
    paddingHorizontal: 16,
    gap: 10,
    justifyContent: 'space-evenly',
  },
  quadCardContainer: {
    height: '22%',
    width: '100%',
  },
  quadCard: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#22d3ee',
    padding: 16,
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#22d3ee',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  quadContent: {
    flex: 1,
  },
  quadTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 3,
  },
  quadSubtitle: {
    fontSize: 11,
    color: '#888',
    marginBottom: 3,
  },
  quadDescription: {
    fontSize: 10,
    fontWeight: '500',
  },
  quadButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  quadShareButton: {
    padding: 8,
  },
  floatingImportButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  actionModalBackdrop: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  actionSheet: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 20,
    maxHeight: '80%',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#27272a',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#52525b',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  actionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  actionCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionPlanInfo: {
    backgroundColor: '#27272a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  actionPlanName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionPlanDetails: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
  },
  deleteIconContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 50,
    padding: 16,
    marginBottom: 20,
  },
  deleteTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  deletePlanInfo: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  deletePlanName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  deletePlanDetails: {
    fontSize: 13,
    color: '#a1a1aa',
    textAlign: 'center',
  },
  deleteMessage: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernActionButtons: {
    flexDirection: 'column',
    gap: 16,
    width: '100%',
  },
  saveActionButton: {
    width: '100%',
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#10b981',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  removeActionButton: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
  },
  saveActionText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  deleteCancelButton: {
    width: '100%',
    backgroundColor: '#27272a',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#3f3f46',
  },
  renameButton: {
    width: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#22d3ee',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteConfirmButton: {
    width: '100%',
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteCancelText: {
    color: '#a1a1aa',
    fontSize: 17,
    fontWeight: '600',
  },
  renameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  deleteConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Rename Modal Styles
  renameContainer: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#27272a',
    padding: 28,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  renameIconContainer: {
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderRadius: 50,
    padding: 16,
    marginBottom: 20,
  },
  renameTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  renameInputContainer: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 4,
    width: '100%',
    marginBottom: 28,
  },
  renameInput: {
    fontSize: 16,
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  renameButtons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  renameCancelButton: {
    flex: 1,
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3f3f46',
    minHeight: 50,
  },
  renameConfirmButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  renameCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  renameConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  // Card component styles
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  exportButton: {
    padding: 8,
  },
  // Button styles to match HomeScreen
  calendarButton: {
    position: 'absolute',
    left: 16,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#22d3ee',
  },
  weightButton: {
    position: 'absolute',
    left: '50%',
    marginLeft: -28, // Half of width to center
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#22d3ee',
  },
  buttonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#22d3ee',
  },
  lockedFabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedFabText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#a1a1aa',
    marginTop: 2,
  },
  genderToggle: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  // Central mode toggle styles
  centralToggleContainer: {
    position: 'absolute',
    top: 54,
    left: '50%',
    marginLeft: -120, // Half of the total width (240px / 2)
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#27272a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  centralModeToggle: {
    width: 112,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  centralToggleText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // Share modal styles
  newShareOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  newShareBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  newShareModal: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 2,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  newShareHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 16,
    paddingTop: 16,
    zIndex: 100,
  },
  newShareClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newShareImage: {
    width: '100%',
    height: 180,
  },
  newShareContent: {
    padding: 24,
    alignItems: 'center',
  },
  newShareTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  newShareSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 24,
  },
  shareActionButtons: {
    width: '100%',
    gap: 16,
  },
  shareActionPrimary: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  shareActionSecondary: {
    width: '100%',
    backgroundColor: '#27272a',
    borderWidth: 2,
    borderColor: '#3f3f46',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  shareButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16,
  },
  shareButtonText: {
    flex: 1,
    alignItems: 'flex-start',
  },
  shareButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a0a0b',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  shareButtonSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(10, 10, 11, 0.7)',
    letterSpacing: 0.2,
  },
  successContainer: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 32,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 24,
  },
  successButton: {
    backgroundColor: '#22d3ee',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    minWidth: 80,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
    textAlign: 'center',
  },
  // Empty state styles
  emptyActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    width: '100%',
    justifyContent: 'center',
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'transparent',
    flex: 1,
    justifyContent: 'center',
    maxWidth: 160,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: '600',
  },

});