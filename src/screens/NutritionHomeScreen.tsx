import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Share,
  Modal,
  Image,
  Animated,
  Dimensions,
  TextInput,
  ScrollView,
  Pressable,
  RefreshControl,
  TouchableOpacity as RNTouchable,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useSimplifiedMealPlanning } from '../contexts/SimplifiedMealPlanningContext';
import { WorkoutStorage, NutritionCompletionStatus, MealPlan } from '../utils/storage';
import { SimplifiedMealPlan } from '../types/nutrition';
import { createShare, ShareError } from '../services/shareService';
import { CURATED_MEALS } from '../data/curated_meals';
import { CuratedMeal } from '../types/curated_meals';
import { getMealImage } from '../assets/mealImages';

type NutritionNavigationProp = StackNavigationProp<RootStackParamList, 'NutritionHome'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// HELPERS — preserved verbatim from the original file. These are pure
// functions and have been tested in production.
// ============================================================================

// Convert SimplifiedMealPlan to legacy MealPlan format for UI compatibility.
// Builds the days array, calculates total macros across all days, then derives
// macro target percentages using largest-remainder rounding so they sum to 100.
const convertToLegacyFormat = (simplifiedPlan: SimplifiedMealPlan): MealPlan => {
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

  if (totalDays > 0) {
    totalMacros.protein /= totalDays;
    totalMacros.carbs /= totalDays;
    totalMacros.fat /= totalDays;
    totalMacros.calories /= totalDays;
  }

  let macroTargets = undefined;
  if (totalMacros.calories > 0) {
    const proteinPct = (totalMacros.protein * 4 / totalMacros.calories) * 100;
    const carbsPct = (totalMacros.carbs * 4 / totalMacros.calories) * 100;
    const fatPct = (totalMacros.fat * 9 / totalMacros.calories) * 100;

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
    fingerprint: simplifiedPlan.id,
    data: {
      days: days,
      estimated_cost: simplifiedPlan.metadata.totalCost || 0,
      macro_targets: macroTargets
    }
  };
};

// Largest-remainder rounding so percentages always sum to exactly 100.
const roundPercentagesToTotal = (percentages: number[], targetTotal: number = 100): number[] => {
  const floors = percentages.map(p => Math.floor(p));
  const remainders = percentages.map((p, i) => p - floors[i]);

  const currentSum = floors.reduce((sum, floor) => sum + floor, 0);
  const pointsToDistribute = targetTotal - currentSum;

  const remainderWithIndex = remainders
    .map((remainder, index) => ({ remainder, index }))
    .sort((a, b) => b.remainder - a.remainder);

  const result = [...floors];
  for (let i = 0; i < pointsToDistribute && i < remainderWithIndex.length; i++) {
    result[remainderWithIndex[i].index]++;
  }

  return result;
};

// Display string like "30P/45C/25F" for a plan. Tries plan-level macro_targets
// first, falls back to computing from the first day's meals, then to old
// weeks-structure for backwards compatibility.
const getMacroSplitDisplay = (plan: MealPlan) => {
  if (plan.macroSplit) return plan.macroSplit;

  const macroTargets = plan.data?.macro_targets;
  if (macroTargets) {
    const protein = macroTargets.protein_pct || macroTargets.protein || 0;
    const carbs = macroTargets.carbs_pct || macroTargets.carbs || 0;
    const fat = macroTargets.fat_pct || macroTargets.fat || 0;

    const [roundedProtein, roundedCarbs, roundedFat] = roundPercentagesToTotal([protein, carbs, fat]);
    return `${roundedProtein}P/${roundedCarbs}C/${roundedFat}F`;
  }

  if (plan.data?.days && plan.data.days.length > 0) {
    const firstDay = plan.data.days[0];
    if (firstDay?.meals && firstDay.meals.length > 0) {
      const totalMacros = firstDay.meals.reduce((total, meal) => ({
        protein: total.protein + (meal.macros?.protein || 0),
        carbs: total.carbs + (meal.macros?.carbs || 0),
        fat: total.fat + (meal.macros?.fat || 0),
        calories: total.calories + (meal.calories || 0)
      }), { protein: 0, carbs: 0, fat: 0, calories: 0 });

      if (totalMacros.calories > 0) {
        const proteinPct = (totalMacros.protein * 4 / totalMacros.calories) * 100;
        const carbsPct = (totalMacros.carbs * 4 / totalMacros.calories) * 100;
        const fatPct = (totalMacros.fat * 9 / totalMacros.calories) * 100;

        const [roundedProtein, roundedCarbs, roundedFat] = roundPercentagesToTotal([proteinPct, carbsPct, fatPct]);
        return `${roundedProtein}P/${roundedCarbs}C/${roundedFat}F`;
      }
    }
  }

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
          const proteinPct = (totalMacros.protein * 4 / totalMacros.calories) * 100;
          const carbsPct = (totalMacros.carbs * 4 / totalMacros.calories) * 100;
          const fatPct = (totalMacros.fat * 9 / totalMacros.calories) * 100;

          const [roundedProtein, roundedCarbs, roundedFat] = roundPercentagesToTotal([proteinPct, carbsPct, fatPct]);
          return `${roundedProtein}P/${roundedCarbs}C/${roundedFat}F`;
        }
      }
    }
  }

  return '';
};

// ============================================================================
// NEW HELPERS — for the Meals/Smoothies sections
// ============================================================================

/**
 * Picks the "headline" macros and time to show on a meal feed card.
 * Strategy: use first plate's macros and first method's total_minutes.
 * The first plate is the canonical representation; users can see all
 * plate variants when they tap into RecipeDetailScreen.
 */
function getCardSummary(meal: CuratedMeal): {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  totalMinutes: number;
} {
  const firstPlate = meal.plates?.[0];
  const firstMethod = meal.methods?.[0];

  return {
    kcal: firstPlate?.plate_macros?.kcal ?? 0,
    protein: firstPlate?.plate_macros?.protein_g ?? 0,
    carbs: firstPlate?.plate_macros?.carbs_g ?? 0,
    fat: firstPlate?.plate_macros?.fat_g ?? 0,
    totalMinutes: firstMethod?.time_total_minutes ?? 0,
  };
}

/**
 * Format minutes as a short human-readable string for the card chip.
 * 5  → "5m"
 * 45 → "45m"
 * 60 → "1h"
 * 90 → "1h 30m"
 * 480 → "8h"
 */
function formatTime(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

// ============================================================================
// COMPONENT
// ============================================================================
export default function NutritionHomeScreen({ route }: any) {
  const navigation = useNavigation<NutritionNavigationProp>();
  const insets = useSafeAreaInsets();
  const { isPinkTheme, themeColor, themeColorLight } = useTheme();
  const { mealPlans, currentPlan, setCurrentPlan, deleteMealPlan, saveMealPlan } = useSimplifiedMealPlanning();

  // Convert SimplifiedMealPlans to legacy format for UI compatibility (unchanged).
  const convertedMealPlans = mealPlans.map(plan => convertToLegacyFormat(plan));

  // The "active" plan that drives the hero card. Prefer the user-selected
  // currentPlan if there is one, otherwise fall back to the first plan.
  const currentPlanLegacy =
    (currentPlan && convertedMealPlans.find(p => p.id === currentPlan.id)) ||
    convertedMealPlans[0] ||
    null;
  const otherPlans = convertedMealPlans.filter(p => p.id !== currentPlanLegacy?.id);

  // ===== Curated meals — split by cuisine =====
  // Memoised because the source is a constant import; no point reconstituting
  // the arrays on every render.
  const { mealsList, smoothiesList } = useMemo(() => {
    const all = Object.values(CURATED_MEALS);
    return {
      mealsList: all.filter(m => m.cuisine !== 'smoothie'),
      smoothiesList: all.filter(m => m.cuisine === 'smoothie'),
    };
  }, []);

  // ===== State =====
  const [shareModal, setShareModal] = useState<{
    visible: boolean;
    plan: MealPlan | null;
    qrCode?: string;
    shareUrl?: string;
    isGenerating?: boolean;
  }>({
    visible: false,
    plan: null,
    qrCode: undefined,
    shareUrl: undefined,
    isGenerating: false,
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
  const [savedMealPlans, setSavedMealPlans] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const [completionStatus, setCompletionStatus] = useState<NutritionCompletionStatus>({
    nutritionGoals: false,
    budgetCooking: false,
    sleepOptimization: false,
    fridgePantry: false,
    favoriteMeals: false,
  });

  // ===== Effects / loaders =====
  const loadCompletionStatus = async () => {
    try {
      const status = await WorkoutStorage.loadNutritionCompletionStatus();
      setCompletionStatus(status);
    } catch (error) {
      console.error('Failed to load completion status:', error);
    }
  };

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
      // refresh handled via MealPlanningContext
    }
  }, [route?.params?.refresh]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCompletionStatus();
      await loadSavedMealPlansState();
    } finally {
      setRefreshing(false);
    }
  }, []);

  // ===== Action sheet handlers =====
  const handleActionRequest = (plan: MealPlan) => {
    setDeleteModal({ visible: true, plan });
  };

  // Opens share modal from inside the action sheet — same wiring pattern
  // as HomeScreen.tsx: dismiss the sheet, wait 200ms for animation, then
  // call handleExport which generates the QR + universal link.
  const handleShareFromActionSheet = (plan: MealPlan) => {
    setDeleteModal({ visible: false, plan: null });
    setTimeout(() => {
      handleExport(plan);
    }, 200);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.plan) return;

    try {
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

  // ===== Plan switching / navigation — preserved verbatim from original =====
  const handleMealPlanSwitch = async (plan: MealPlan) => {
    const originalPlan = mealPlans.find(p => p.name === plan.name);
    if (originalPlan && originalPlan.id !== currentPlan?.id) {
      await setCurrentPlan(originalPlan.id);
      console.log(`🔄 Switched to meal plan: ${originalPlan.name}`);
    }
  };

  const handleMealPlanNavigation = (plan: MealPlan) => {
    console.log('🍽️ Navigating to meal plan (no scaling):', plan.name);

    handleMealPlanSwitch(plan);

    if (plan.data?.days) {
      const week = {
        week_number: 1,
        days: plan.data.days
      };

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

    if (!plan.data?.weeks) return;

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

    navigation.navigate('MealPlanWeeks' as any, { mealPlan: plan });
  };

  // Jump to today's day-of-week within the meal plan.
  // Uses the existing cleanMealPlanNavigation utility — same logic that was
  // already in the file, just now wired up to the new primary CTA.
  const handleJumpToToday = (plan: MealPlan) => {
    try {
      const {
        findBestTodayDate,
        navigateToMealDay,
        navigateToMealPlanDays
      } = require('../utils/cleanMealPlanNavigation');

      const bestTodayDate = findBestTodayDate(currentPlan);

      if (bestTodayDate) {
        navigateToMealDay(navigation, bestTodayDate, {
          id: currentPlan?.id || plan.id || 'unknown',
          name: plan.name
        });
      } else {
        navigateToMealPlanDays(navigation, {
          id: currentPlan?.id || plan.id || 'unknown',
          name: plan.name
        });
      }
    } catch (error) {
      console.error('❌ Today button navigation failed:', error);
      navigation.navigate('MealPlanDays' as any, {
        planId: currentPlan?.id || plan.id || 'unknown',
        planName: plan.name
      });
    }
  };

  // ===== Save / unsave to "My Meals" — preserved verbatim =====
  const isPlanSaved = (plan: MealPlan): boolean => {
    const planId = plan.fingerprint || plan.id;
    return savedMealPlans.has(planId);
  };

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
        await WorkoutStorage.removeMealPlan(planId);
        setSavedMealPlans(prev => {
          const newSet = new Set(prev);
          newSet.delete(planId);
          return newSet;
        });
        console.log('❌ Meal plan removed from My Meals');
      } else {
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

  // ===== Sharing — universal link + QR + send link — preserved verbatim =====
  const createUniversalLink = async (mealPlanData: any): Promise<string | null> => {
    try {
      const shareResult = await createShare({
        mealPlanData: mealPlanData
      });
      return shareResult.shareUrl || null;
    } catch (error) {
      console.error('Failed to create universal link:', error);
      return null;
    }
  };

  const handleExport = async (plan: MealPlan) => {
    setShareModal({
      visible: true,
      plan,
      qrCode: undefined,
      shareUrl: undefined,
      isGenerating: true
    });

    try {
      if (!currentPlan) {
        console.error('❌ No current plan to export');
        setShareModal(prev => ({ ...prev, isGenerating: false }));
        return;
      }

      const mealPlanToShare = {
        ...currentPlan,
        exported_with_customizations: true,
        export_timestamp: new Date().toISOString(),
        export_note: "This export includes all customizations: manually added meals and permanently deleted meals"
      };

      const shareUrl = await createUniversalLink(mealPlanToShare);

      if (shareUrl) {
        setShareModal(prev => ({
          ...prev,
          qrCode: shareUrl,
          shareUrl,
          isGenerating: false
        }));
      } else {
        setShareModal(prev => ({ ...prev, isGenerating: false }));
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      setShareModal(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const handleShare = async (action: 'copy' | 'share' | 'copyUrl') => {
    if (!shareModal.plan) return;

    try {
      if (action === 'copyUrl' && shareModal.shareUrl) {
        await Clipboard.setStringAsync(shareModal.shareUrl);
        setShareModal({ ...shareModal, visible: false });
        setTimeout(() => {
          setSuccessModal(true);
        }, 100);
        return;
      }

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

      const mealPlanData = JSON.stringify(mealPlanToExport, null, 2);

      if (action === 'copy') {
        await Clipboard.setStringAsync(mealPlanData);
        setShareModal({ ...shareModal, visible: false });
        setTimeout(() => {
          setSuccessModal(true);
        }, 100);
      } else {
        const shareContent = shareModal.shareUrl
          ? `Check out this meal plan: ${shareModal.plan.name}\n\n${shareModal.shareUrl}`
          : `Check out this meal plan: ${shareModal.plan.name}\n\n${mealPlanData}`;

        await Share.share({
          message: shareContent,
          title: shareModal.plan.name,
        });
        setShareModal({ ...shareModal, visible: false });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      setShareModal({ ...shareModal, visible: false });
    }
  };

  const openCreateFlow = () => {
    navigation.getParent()?.navigate('CreateFlow' as never);
  };

  // ============================================================================
  // NEW HANDLERS — for meals/smoothies feed
  // ============================================================================

  // Tap a meal/smoothie card — for now just console.log. RecipeDetailScreen
  // navigation will be wired up in the next iteration.
  const handleMealCardPress = (meal: CuratedMeal) => {
    navigation.navigate('RecipeDetail' as any, { mealSlug: meal.slug });
  };

  // "See all" link — same console.log pattern, MealsLibraryScreen comes later.
  const handleSeeAllPress = (category: 'meals' | 'smoothies') => {
    console.log('📚 See all:', category);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  /**
   * Renders a single horizontal scroll card for the meals or smoothies feed.
   * Hero image with title overlay, footer chip row with time and protein.
   * Width is fixed at 200px to give a clean snap-feel as user scrolls.
   */
  const renderFeedCard = (meal: CuratedMeal) => {
    const { kcal, protein, carbs, fat, totalMinutes } = getCardSummary(meal);
    const imageSource = getMealImage(meal.image_filename);

    return (
      <TouchableOpacity
        key={meal.slug}
        style={styles.feedCard}
        activeOpacity={0.85}
        onPress={() => handleMealCardPress(meal)}
      >
        {/* Hero image — no overlay, photo stays clean */}
        <View style={styles.feedCardImageWrap}>
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.feedCardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.feedCardImage, styles.feedCardImagePlaceholder]}>
              <Ionicons name="restaurant-outline" size={28} color="#52525b" />
            </View>
          )}
        </View>

        {/* Body — title, then time/kcal, then 3-column macro grid */}
        <View style={styles.feedCardBody}>
          <Text style={styles.feedCardTitle} numberOfLines={2}>
            {meal.plates?.[0]?.display_name || meal.display_name}
          </Text>
          <Text style={styles.feedCardMeta}>
            {formatTime(totalMinutes)} · {kcal} kcal
          </Text>

          <View style={styles.feedCardMacroGrid}>
            <View style={styles.feedCardMacroCell}>
              <Text style={[styles.feedCardMacroValue, { color: themeColor }]}>
                {protein}g
              </Text>
              <Text style={styles.feedCardMacroLabel}>PROTEIN</Text>
            </View>
            <View style={styles.feedCardMacroDivider} />
            <View style={styles.feedCardMacroCell}>
              <Text style={styles.feedCardMacroValueMuted}>{carbs}g</Text>
              <Text style={styles.feedCardMacroLabel}>CARBS</Text>
            </View>
            <View style={styles.feedCardMacroDivider} />
            <View style={styles.feedCardMacroCell}>
              <Text style={styles.feedCardMacroValueMuted}>{fat}g</Text>
              <Text style={styles.feedCardMacroLabel}>FAT</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Title bar */}
      <View style={[styles.titleBar, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.title}>Nutrition</Text>
      </View>

      <Animated.View
        style={[
          styles.animatedContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {convertedMealPlans.length === 0 ? (
          // ============================================================
          // EMPTY STATE — no meal plans yet
          // Hero is replaced with "Plan your meals" prompt, but Meals
          // and Smoothies sections still appear below so users can
          // discover recipes without having a plan.
          // ============================================================
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} colors={[themeColor]} />
            }
          >
            <View style={styles.emptyHero}>
              <View style={[styles.emptyHeroIcon, { backgroundColor: themeColor, shadowColor: themeColor }]}>
                <Ionicons name="restaurant" size={36} color="#0a0a0b" />
              </View>
              <Text style={styles.emptyHeroTitle}>Plan your meals</Text>
              <Text style={styles.emptyHeroBody}>
                Answer a few questions. We'll send a prompt to your AI. Import the meal plan it sends back.
              </Text>
              <TouchableOpacity
                style={[styles.emptyHeroButton, { backgroundColor: themeColor, shadowColor: themeColor }]}
                onPress={openCreateFlow}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyHeroButtonText}>Get started</Text>
                <Ionicons name="arrow-forward" size={16} color="#0a0a0b" />
              </TouchableOpacity>
            </View>

            {/* Meals + Smoothies sections, even without a plan */}
            {renderMealsSection()}
            {renderSmoothiesSection()}
          </ScrollView>
        ) : (
          // ============================================================
          // POPULATED STATE — hero card + meals/smoothies + other plans
          // ============================================================
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} colors={[themeColor]} />
            }
          >
            {currentPlanLegacy && (
              <View style={[styles.heroCard, { borderColor: themeColor, shadowColor: themeColor }]}>
                {/* ••• menu — opens action sheet (Share, Save, Rename, Remove) */}
                <RNTouchable
                  style={styles.heroMenuBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleActionRequest(currentPlanLegacy);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel="More options"
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color="#a1a1aa" />
                </RNTouchable>

                <Pressable
                  onPress={() => handleMealPlanNavigation(currentPlanLegacy)}
                  onLongPress={() => handleActionRequest(currentPlanLegacy)}
                  delayLongPress={600}
                >
                  <Text style={[styles.heroEyebrow, { color: themeColor }]}>CURRENT PLAN</Text>
                  <Text style={[styles.heroTitleText, { textShadowColor: themeColorLight }]} numberOfLines={2}>
                    {currentPlanLegacy.name}
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    {currentPlanLegacy.duration} {currentPlanLegacy.duration === 1 ? 'day' : 'days'}
                    {getMacroSplitDisplay(currentPlanLegacy) ? ` • ${getMacroSplitDisplay(currentPlanLegacy)}` : ''}
                  </Text>
                </Pressable>

                {/* Primary: full-width "Start today's meals" button.
                    Routes through handleJumpToToday → cleanMealPlanNavigation
                    → finds today's day-of-week in the plan and navigates to it. */}
                <TouchableOpacity
                  style={[styles.heroTodayBtn, { backgroundColor: themeColor, shadowColor: themeColor }]}
                  onPress={() => handleJumpToToday(currentPlanLegacy)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Start today's meals"
                >
                  <Ionicons name="restaurant" size={16} color="#0a0a0b" />
                  <Text style={styles.heroTodayText}>Start today's meals</Text>
                </TouchableOpacity>

                {/* Secondary: subtle text link to full plan view */}
                <TouchableOpacity
                  style={styles.heroPlanLink}
                  onPress={() => handleMealPlanNavigation(currentPlanLegacy)}
                  activeOpacity={0.6}
                  accessibilityRole="button"
                  accessibilityLabel="View full plan"
                >
                  <Text style={[styles.heroPlanLinkText, { color: themeColor }]}>View full plan</Text>
                  <Ionicons name="chevron-forward" size={13} color={themeColor} />
                </TouchableOpacity>
              </View>
            )}

            {/* ====================================================== */}
            {/* NEW: Meals + Smoothies horizontal scroll sections      */}
            {/* ====================================================== */}
            {renderMealsSection()}
            {renderSmoothiesSection()}

            {otherPlans.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Other plans</Text>
                </View>
                {otherPlans.map(plan => (
                  <TouchableOpacity
                    key={plan.id}
                    style={styles.smallPlanCard}
                    activeOpacity={0.8}
                    onPress={() => handleMealPlanNavigation(plan)}
                    onLongPress={() => handleActionRequest(plan)}
                    delayLongPress={600}
                  >
                    <View style={styles.smallPlanContent}>
                      <Text style={styles.smallPlanTitle} numberOfLines={1}>{plan.name}</Text>
                      <Text style={styles.smallPlanSub}>
                        {plan.duration} days{getMacroSplitDisplay(plan) ? ` • ${getMacroSplitDisplay(plan)}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#71717a" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

          </ScrollView>
        )}
      </Animated.View>

      {/* ============================================================ */}
      {/* MODALS — all preserved verbatim from original                 */}
      {/* ============================================================ */}

      {/* Action Sheet — Share at top, then Save, Rename, Remove */}
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
            <View style={styles.handleBar} />

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

            <View style={styles.actionPlanInfo}>
              <Text style={styles.actionPlanName} numberOfLines={2}>
                {deleteModal.plan?.name}
              </Text>
              <Text style={styles.actionPlanDetails}>
                {deleteModal.plan?.duration} days
                {deleteModal.plan && getMacroSplitDisplay(deleteModal.plan) ? ` • ${getMacroSplitDisplay(deleteModal.plan)}` : ''}
              </Text>
            </View>

            <View style={styles.modernActionButtons}>
              {/* SHARE — opens the existing QR / send link modal */}
              <TouchableOpacity
                style={[styles.shareActionInSheet, { backgroundColor: themeColor, shadowColor: themeColor }]}
                onPress={() => deleteModal.plan && handleShareFromActionSheet(deleteModal.plan)}
                activeOpacity={0.85}
              >
                <Ionicons name="share-outline" size={18} color="#0a0a0b" />
                <Text style={styles.shareActionInSheetText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveActionButton,
                  (() => {
                    if (!deleteModal.plan) return false;
                    const originalPlan = mealPlans.find(p => p.name === deleteModal.plan?.name);
                    const planId = originalPlan?.fingerprint || originalPlan?.id;
                    return planId && savedMealPlans.has(planId) ? styles.removeActionButton : false;
                  })()
                ].filter(Boolean)}
                onPress={() => {
                  if (deleteModal.plan) {
                    handleToggleSaveMealPlan(deleteModal.plan);
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={(() => {
                    if (!deleteModal.plan) return "heart";
                    const originalPlan = mealPlans.find(p => p.name === deleteModal.plan?.name);
                    const planId = originalPlan?.fingerprint || originalPlan?.id;
                    return planId && savedMealPlans.has(planId) ? "heart-dislike" : "heart";
                  })()}
                  size={18}
                  color="#ffffff"
                />
                <Text style={styles.saveActionText}>
                  {(() => {
                    if (!deleteModal.plan) return 'Save to My Meals';
                    const originalPlan = mealPlans.find(p => p.name === deleteModal.plan?.name);
                    const planId = originalPlan?.fingerprint || originalPlan?.id;
                    return planId && savedMealPlans.has(planId) ? 'Remove from My Meals' : 'Save to My Meals';
                  })()}
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

      {/* Share Modal — QR code + send link */}
      <Modal
        visible={shareModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShareModal({ visible: false, plan: null, qrCode: undefined, shareUrl: undefined, isGenerating: false })}
      >
        <View style={styles.newShareOverlay}>
          <TouchableOpacity
            style={styles.newShareBackdrop}
            activeOpacity={1}
            onPress={() => setShareModal({ visible: false, plan: null, qrCode: undefined, shareUrl: undefined, isGenerating: false })}
          />

          <View style={[styles.newShareModal, { borderColor: themeColor }]}>
            <View style={styles.newShareHeader}>
              <TouchableOpacity
                style={styles.newShareClose}
                onPress={() => setShareModal({ visible: false, plan: null, qrCode: undefined, shareUrl: undefined, isGenerating: false })}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <Image
              source={isPinkTheme ?
                require('./../../lucid-origin_Two_athletic_women_enjoying_a_healthy_meal_together_in_a_modern_kitchen_one_pass-0.jpg') :
                require('./../../lucid-origin_Two_athletic_men_enjoying_a_healthy_meal_together_in_a_modern_kitchen_one_passin-0.jpg')
              }
              style={styles.newShareImage}
              resizeMode="cover"
            />

            <View style={styles.newShareContent}>
              <Text style={[styles.newShareTitle, { color: themeColor }]}>
                {shareModal.plan?.name?.toUpperCase()}
              </Text>

              {shareModal.isGenerating ? (
                <View style={styles.qrCodeContainer}>
                  <View style={styles.qrCodePlaceholder}>
                    <Ionicons name="refresh" size={32} color={themeColor} />
                    <Text style={styles.qrCodeLoadingText}>Generating QR code...</Text>
                  </View>
                </View>
              ) : shareModal.qrCode ? (
                <View style={styles.qrCodeContainer}>
                  <View style={styles.qrCodeWrapper}>
                    <QRCode
                      value={shareModal.qrCode}
                      size={240}
                      backgroundColor="white"
                      color="black"
                    />
                  </View>
                </View>
              ) : null}

              {shareModal.qrCode && (
                <TouchableOpacity
                  style={[styles.sendLinkButton, { backgroundColor: themeColor }]}
                  onPress={() => handleShare('share')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share" size={20} color="#0a0a0b" />
                  <Text style={styles.sendLinkText}>SEND LINK</Text>
                </TouchableOpacity>
              )}

              {shareModal.qrCode && (
                <Text style={styles.linkExpiryText}>Link expires in 7 days</Text>
              )}
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
            <Text style={styles.successMessage}>Meal plan copied to clipboard</Text>

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

  /**
   * Section: Meals horizontal scroll row.
   * Defined as inner function so it has access to themeColor, mealsList, and handlers.
   */
  function renderMealsSection() {
    if (mealsList.length === 0) return null;
    return (
      <View style={styles.feedSection}>
        <View style={styles.feedSectionHeader}>
          <Text style={styles.feedSectionTitle}>Meals</Text>
          <TouchableOpacity
            onPress={() => handleSeeAllPress('meals')}
            activeOpacity={0.6}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Text style={[styles.feedSectionSeeAll, { color: themeColor }]}>
              See all {mealsList.length} ›
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.feedScrollContent}
        >
          {mealsList.map(renderFeedCard)}
        </ScrollView>
      </View>
    );
  }

  function renderSmoothiesSection() {
    if (smoothiesList.length === 0) return null;
    return (
      <View style={styles.feedSection}>
        <View style={styles.feedSectionHeader}>
          <Text style={styles.feedSectionTitle}>Smoothies</Text>
          <TouchableOpacity
            onPress={() => handleSeeAllPress('smoothies')}
            activeOpacity={0.6}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Text style={[styles.feedSectionSeeAll, { color: themeColor }]}>
              See all {smoothiesList.length} ›
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.feedScrollContent}
        >
          {smoothiesList.map(renderFeedCard)}
        </ScrollView>
      </View>
    );
  }
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  animatedContainer: {
    flex: 1,
  },

  // Title bar
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.4,
  },
  titleAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll feed
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 32,
  },

  // Section grouping (for "Other plans" — old style)
  section: { marginBottom: 20, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a1a1aa',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Hero card
  heroCard: {
    backgroundColor: '#18181b',
    borderRadius: 18,
    borderWidth: 2,
    padding: 20,
    marginBottom: 24,
    marginHorizontal: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  heroMenuBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  heroTitleText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 32,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    paddingRight: 40,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#a1a1aa',
    marginTop: 4,
  },
  heroTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 18,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  heroTodayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0a0a0b',
    letterSpacing: 0.2,
  },
  heroPlanLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 12,
    paddingBottom: 2,
  },
  heroPlanLinkText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Small plan card (other plans)
  smallPlanCard: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  smallPlanContent: { flex: 1 },
  smallPlanTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  smallPlanSub: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
  },

  // ===== NEW: feed section + cards =====
  feedSection: {
    marginBottom: 24,
  },
  feedSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  feedSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  feedSectionSeeAll: {
    fontSize: 12,
    fontWeight: '500',
  },
  feedScrollContent: {
    paddingHorizontal: 16,
    paddingRight: 24,
  },
  feedCard: {
    width: 280,
    backgroundColor: '#18181b',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    marginRight: 12,
  },
  feedCardImageWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#0a0a0b',
  },
  feedCardImage: {
    width: '100%',
    height: '100%',
  },
  feedCardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27272a',
  },
  feedCardBody: {
    padding: 14,
  },
  feedCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 19,
    letterSpacing: -0.2,
    marginBottom: 4,
    minHeight: 38,
  },
  feedCardMeta: {
    fontSize: 11,
    color: '#71717a',
    marginBottom: 12,
  },
  feedCardMacroGrid: {
    flexDirection: 'row',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  feedCardMacroCell: {
    flex: 1,
    alignItems: 'center',
  },
  feedCardMacroDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#27272a',
    marginVertical: 2,
  },
  feedCardMacroValue: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 17,
    letterSpacing: -0.3,
  },
  feedCardMacroValueMuted: {
    fontSize: 15,
    fontWeight: '600',
    color: '#d4d4d8',
    lineHeight: 17,
    letterSpacing: -0.3,
  },
  feedCardMacroLabel: {
    fontSize: 9,
    color: '#71717a',
    marginTop: 3,
    letterSpacing: 0.4,
  },

  // Empty state
  emptyHero: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyHeroIcon: {
    width: 84,
    height: 84,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 14,
  },
  emptyHeroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyHeroBody: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyHeroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  emptyHeroButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0a0a0b',
  },

  // Modal shared
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  // Action sheet
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  actionModalBackdrop: { flex: 1 },
  actionSheet: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 20,
    maxHeight: '85%',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#22d3ee',
    marginHorizontal: 4,
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
  modernActionButtons: {
    flexDirection: 'column',
    gap: 14,
    width: '100%',
  },

  // Share button inside action sheet (cyan, primary)
  shareActionInSheet: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  shareActionInSheetText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
    letterSpacing: 0.2,
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
    shadowOffset: { width: 0, height: 2 },
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  renameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteConfirmButton: {
    width: '100%',
    backgroundColor: '#ef4444',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
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
  deleteCancelText: {
    color: '#a1a1aa',
    fontSize: 17,
    fontWeight: '600',
  },

  // Share modal
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
  sendLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
    gap: 12,
  },
  sendLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  linkExpiryText: {
    fontSize: 12,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 24,
  },

  // QR
  qrCodeContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  qrCodeWrapper: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrCodePlaceholder: {
    width: 272,
    height: 272,
    backgroundColor: '#27272a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3f3f46',
  },
  qrCodeLoadingText: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },

  // Rename modal
  renameContainer: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#27272a',
    padding: 28,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 4 },
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
    marginBottom: 20,
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
    shadowOffset: { width: 0, height: 2 },
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

  // Success
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
});