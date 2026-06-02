import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Share,
  Modal,
  Animated,
  Dimensions,
  TextInput,
  ScrollView,
  Pressable,
  RefreshControl,
  TouchableOpacity as RNTouchable,
  Image,
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

// Base label for the "mains" shelf (the savoury main dishes — australian,
// indian, mexican, italian, thai). Change this in one place if you'd rather
// call it "Dinner" or "Slow cooker".
const MAINS_TITLE = 'Mains';

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
// HELPERS — for the category feed cards
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
// DAYPART FLOAT — decides which single category shelf floats to the top of
// the feed and what contextual eyebrow + title it gets, based on the device's
// LOCAL time (works for users in any timezone). Everything else stays in a
// fixed order below it so muscle memory is preserved.
// ============================================================================
type DaypartFloat = { key: string; eyebrow: string; title: string };

function getDaypart(): DaypartFloat {
  const h = new Date().getHours();
  if (h < 5)  return { key: 'desserts',  eyebrow: 'WINDING DOWN', title: 'Something sweet' };
  if (h < 11) return { key: 'breakfast', eyebrow: 'GOOD MORNING', title: 'Start your day' };
  if (h < 15) return { key: 'mains',     eyebrow: 'MIDDAY',       title: 'Lunch ideas' };
  if (h < 17) return { key: 'snacks',    eyebrow: 'AFTERNOON',    title: 'Afternoon fuel' };
  if (h < 21) return { key: 'mains',     eyebrow: 'GOOD EVENING', title: 'Dinner tonight' };
  return            { key: 'desserts',  eyebrow: 'WINDING DOWN', title: 'Something sweet' };
}

// A single home-screen category shelf.
type HomeCategorySection = {
  key: string;
  title: string;
  cuisine: string; // route param for CategoryLibrary ('mains' is a sentinel)
  meals: CuratedMeal[];
};

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

  // ===== Curated meals — split into category groups =====
  // Memoised because the source is a constant import; no point reconstituting
  // the arrays on every render. Categories are derived from the `cuisine`
  // field. "mains" is everything that isn't one of the four leaf categories
  // (breakfast / snack / dessert / smoothie) — i.e. the savoury main dishes
  // scattered across australian, indian, mexican, italian, thai.
  const { mains, breakfast, snacks, desserts, smoothies } = useMemo(() => {
    const all = Object.values(CURATED_MEALS);

    const breakfast = all.filter(m => m.cuisine === 'breakfast');
    const snacks = all.filter(m => m.cuisine === 'snack');
    const desserts = all.filter(m => m.cuisine === 'dessert');

    // Custom order for smoothies based on preference (preserved from original).
    const smoothieOrder = [
      'cookies_gains',
      'brekkie_grow',
      'mango_mass',
      'strawberry_stack',
      'king_kong_chocolate',
      'raspberry_rip',
      'energy_lift_heavy',
      'dirty_eden',
      'mornin_muscle',
      'choc_muscle_maxx',
      'strawbrekkie_beast',
      'banana_bulk'
    ];

    const allSmoothies = all.filter(m => m.cuisine === 'smoothie');
    const orderedSmoothies = smoothieOrder
      .map(slug => allSmoothies.find(s => s.slug === slug))
      .filter(Boolean) as CuratedMeal[];
    // Defensive: append any smoothie not named in the order list so new
    // smoothies never silently vanish from the shelf. (No effect on current
    // data — all 12 are listed above.)
    const orderedSlugs = new Set(orderedSmoothies.map(s => s.slug));
    const smoothies = [
      ...orderedSmoothies,
      ...allSmoothies.filter(s => !orderedSlugs.has(s.slug)),
    ];

    // Mains = anything not in the four leaf categories.
    const LEAF = new Set(['breakfast', 'snack', 'dessert', 'smoothie']);
    const mains = all.filter(m => !LEAF.has(m.cuisine));

    return { mains, breakfast, snacks, desserts, smoothies };
  }, []);

  // Decide the daypart float for this render (cheap; reads local time).
  const daypart = getDaypart();

  // Fixed shelf order. The daypart-floated shelf is hoisted to the front;
  // everything else keeps this relative order so the screen never reshuffles
  // beyond that single top slot.
  const categorySections: HomeCategorySection[] = [
    { key: 'mains',      title: MAINS_TITLE,  cuisine: 'mains',     meals: mains },
    { key: 'breakfast',  title: 'Breakfast',  cuisine: 'breakfast', meals: breakfast },
    { key: 'snacks',     title: 'Snacks',     cuisine: 'snack',     meals: snacks },
    { key: 'desserts',   title: 'Desserts',   cuisine: 'dessert',   meals: desserts },
    { key: 'smoothies',  title: 'Smoothies',  cuisine: 'smoothie',  meals: smoothies },
  ];

  const orderedSections: HomeCategorySection[] = (() => {
    const floated = categorySections.find(s => s.key === daypart.key);
    if (!floated) return categorySections;
    return [floated, ...categorySections.filter(s => s.key !== daypart.key)];
  })();

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
  //
  // CHANGED: now takes the plan it should operate on and switches to it first,
  // so that the secondary plan cards' "Start today's meals" button jumps to
  // *that* plan's today, not whatever the current hero plan is.
  const handleJumpToToday = (plan: MealPlan) => {
    try {
      // Make sure the tapped plan becomes the active plan before we resolve
      // "today" against it — otherwise findBestTodayDate reads currentPlan,
      // which may still be the hero plan.
      handleMealPlanSwitch(plan);

      const {
        findBestTodayDate,
        navigateToMealDay,
        navigateToMealPlanDays
      } = require('../utils/cleanMealPlanNavigation');

      // Prefer the original SimplifiedMealPlan that matches this card, so the
      // navigation utility resolves against the correct plan's days.
      const originalPlan = mealPlans.find(p => p.name === plan.name);
      const resolvePlan = originalPlan || currentPlan;

      const bestTodayDate = findBestTodayDate(resolvePlan);

      if (bestTodayDate) {
        navigateToMealDay(navigation, bestTodayDate, {
          id: originalPlan?.id || currentPlan?.id || plan.id || 'unknown',
          name: plan.name
        });
      } else {
        navigateToMealPlanDays(navigation, {
          id: originalPlan?.id || currentPlan?.id || plan.id || 'unknown',
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
      // CHANGED: was hard-coded to currentPlan. Now resolves the original
      // SimplifiedMealPlan matching the tapped card so that sharing a
      // secondary plan exports that plan, not the hero plan.
      const originalPlan = mealPlans.find(p => p.name === plan.name) || currentPlan;

      if (!originalPlan) {
        console.error('❌ No plan to export');
        setShareModal(prev => ({ ...prev, isGenerating: false }));
        return;
      }

      const mealPlanToShare = {
        ...originalPlan,
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

      // CHANGED: resolve the original plan that matches the share modal's plan
      // rather than always exporting currentPlan.
      const originalPlan = mealPlans.find(p => p.name === shareModal.plan?.name) || currentPlan;

      if (!originalPlan) {
        console.error('❌ No plan to export');
        return;
      }

      const mealPlanToExport = {
        ...originalPlan,
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
  // HANDLERS — for the category feed
  // ============================================================================

  const handleMealCardPress = (meal: CuratedMeal) => {
    navigation.navigate('RecipeDetail' as any, { mealSlug: meal.slug });
  };

  // CHANGED: now param-driven. Every category's "See all" routes into a single
  // generic CategoryLibrary screen, pre-filtered by cuisine. 'mains' is a
  // sentinel meaning "all savoury mains" (any cuisine except breakfast / snack
  // / dessert / smoothie) — the CategoryLibrary screen interprets it.
  //
  // NOTE: 'CategoryLibrary' must be registered in AppNavigator and accept
  // { cuisine, title } params. The legacy MealsLibrary / SmoothiesLibrary
  // screens are left intact in the navigator but are no longer routed to here.
  const handleSeeAllPress = (cuisine: string, title: string) => {
    navigation.navigate('CategoryLibrary' as any, { cuisine, title });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  /**
   * Renders a single horizontal scroll card for any category feed.
   * Hero image with title overlay, footer chip row with time and macros.
   * Width is fixed at 280px to give a clean snap-feel as user scrolls.
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

  /**
   * Renders a "See more" card at the end of the horizontal scroll.
   *
   * Design: same card dimensions as a real meal card. The image area is
   * replaced with a 2x2 grid of thumbnails previewing what's in the library
   * — specifically the meals the user hasn't scrolled past yet (positions 6-9
   * of the source list). This sells the library: "here's the kind of variety
   * you'll find in there", rather than showing the same images already on
   * screen.
   *
   * The macro grid slot is replaced with a row containing the title and a
   * circular arrow button. No fake macro data — the slot is explicitly a CTA.
   *
   * CHANGED: now takes the section it belongs to (so it can route the correct
   * cuisine + title) instead of a hard-coded 'meals' | 'smoothies' literal.
   */
  const renderSeeMoreCard = (
    section: HomeCategorySection,
    previewMeals: CuratedMeal[],
    totalCount: number
  ) => {
    // We expect exactly 4 thumbnails. Pad with whatever's available if the
    // source has fewer than 4 unseen meals (unlikely with current data, but
    // defensive — meals could shrink in dev).
    const thumbs = previewMeals.slice(0, 4);
    const isSmoothie = section.cuisine === 'smoothie';

    return (
      <TouchableOpacity
        key="see-more"
        style={styles.feedCard}
        activeOpacity={0.85}
        onPress={() => handleSeeAllPress(section.cuisine, section.title)}
        accessibilityRole="button"
        accessibilityLabel={`See all ${totalCount} ${section.title}`}
      >
        {/* Thumbnail preview grid — fills the same 16:9 slot a hero image
            would occupy. 2x2 cells with a 1px gap between them. */}
        <View style={styles.seeMoreImageWrap}>
          <View style={styles.seeMoreGrid}>
            {thumbs.map((meal, idx) => {
              const imageSource = getMealImage(meal.image_filename);
              return (
                <View
                  key={meal.slug}
                  style={[
                    styles.seeMoreThumb,
                    // Positional borders so the 2x2 grid has clean 1px gutters
                    // without using gap (which doesn't render cleanly on iOS for
                    // absolute-positioned image children).
                    idx === 1 && styles.seeMoreThumbRight,
                    idx === 2 && styles.seeMoreThumbBottom,
                    idx === 3 && styles.seeMoreThumbBottomRight,
                  ]}
                >
                  {imageSource ? (
                    <Image
                      source={imageSource}
                      style={styles.seeMoreThumbImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.seeMoreThumbPlaceholder}>
                      <Ionicons
                        name={isSmoothie ? 'cafe-outline' : 'restaurant-outline'}
                        size={16}
                        color="#52525b"
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Body — title + chevron, no macro grid. Same height as a real
            card body so the row keeps its rhythm. */}
        <View style={styles.feedCardBody}>
          <View style={styles.seeMoreBodyRow}>
            <View style={styles.seeMoreBodyText}>
              <Text style={styles.feedCardTitle} numberOfLines={2}>
                See all {section.title}
              </Text>
              <Text style={styles.feedCardMeta}>{totalCount} recipes</Text>
            </View>
            <View style={[styles.seeMoreArrow, { backgroundColor: themeColor }]}>
              <Ionicons name="arrow-forward" size={16} color="#0a0a0b" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
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
        {convertedMealPlans.length === 0 ? (
          // ============================================================
          // EMPTY STATE — no meal plans yet
          // Hero is replaced with "Plan your meals" prompt, but the
          // category sections still appear below so users can discover
          // recipes without having a plan.
          // ============================================================
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} colors={[themeColor]} />
            }
          >
            <Text style={styles.title}>Nutrition</Text>
            <View
              style={[
                styles.emptyHeroCard,
                {
                  borderColor: themeColor + '59',
                  backgroundColor: themeColor + '14',
                },
              ]}
            >
              <View
                style={[
                  styles.emptyHeroIcon,
                  { backgroundColor: themeColor, shadowColor: themeColor },
                ]}
              >
                <Ionicons name="restaurant" size={26} color="#0a0a0b" />
              </View>
              <Text style={styles.emptyHeroTitle}>Plan your meals</Text>
              <Text style={styles.emptyHeroBody}>
                A custom meal plan built around your goals — completely free.
              </Text>
              <TouchableOpacity
                style={[styles.emptyHeroButton, { backgroundColor: themeColor, shadowColor: themeColor }]}
                onPress={openCreateFlow}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyHeroButtonText}>Get started</Text>
                <Ionicons name="arrow-forward" size={15} color="#0a0a0b" />
              </TouchableOpacity>
            </View>

            {/* Category sections, even without a plan */}
            {renderAllSections()}
          </ScrollView>
        ) : (
          // ============================================================
          // POPULATED STATE — hero card + category feed + other plans
          // ============================================================
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} colors={[themeColor]} />
            }
          >
            <Text style={styles.title}>Nutrition</Text>

            {/* Section label only shown when there's more than one plan —
                mirrors HomeScreen's "YOUR PLANS" header behaviour. */}
            {convertedMealPlans.length > 1 && (
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>YOUR PLANS</Text>
              </View>
            )}

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
            {/* OTHER PLANS — greyed-out secondary plan cards,          */}
            {/* mirroring HomeScreen.tsx's planCardSecondary treatment. */}
            {/* Each card has: ••• menu, tappable title/subtitle, and a  */}
            {/* "Start today's meals" button.                           */}
            {/* ====================================================== */}
            {otherPlans.map((plan) => {
              const originalPlan = mealPlans.find(p => p.name === plan.name);
              const planId = originalPlan?.fingerprint || originalPlan?.id || plan.id;
              const macroSplit = getMacroSplitDisplay(plan);
              return (
                <View key={plan.id} style={styles.planCardSecondary}>
                  <RNTouchable
                    style={styles.planMenuBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleActionRequest(plan);
                    }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel="More options"
                  >
                    <Ionicons name="ellipsis-horizontal" size={16} color="#a1a1aa" />
                  </RNTouchable>

                  <Pressable
                    onPress={() => handleMealPlanNavigation(plan)}
                    onLongPress={() => handleActionRequest(plan)}
                    delayLongPress={600}
                  >
                    <Text style={styles.planTitleSecondary} numberOfLines={2}>
                      {plan.name}
                    </Text>
                    <Text style={styles.planSubtitleSecondary}>
                      {plan.duration} {plan.duration === 1 ? 'day' : 'days'}
                      {macroSplit ? ` · ${macroSplit}` : ''}
                    </Text>
                  </Pressable>

                  <TouchableOpacity
                    style={styles.planStartBtnSecondary}
                    onPress={() => handleJumpToToday(plan)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Start today's meals"
                  >
                    <Ionicons name="restaurant" size={13} color="#d4d4d8" />
                    <Text style={styles.planStartBtnSecondaryText}>Start today's meals</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            {/* ====================================================== */}
            {/* Category horizontal scroll sections (daypart-floated)  */}
            {/* ====================================================== */}
            {renderAllSections()}

          </ScrollView>
        )}
      </Animated.View>

      {/* ============================================================ */}
      {/* MODALS                                                        */}
      {/* ============================================================ */}

      {/* Action Sheet — option-3 header-card layout */}
      <Modal
        visible={deleteModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModal({ visible: false, plan: null })}
      >
        <View style={styles.actionModalOverlay}>
          <RNTouchable
            style={styles.actionModalBackdrop}
            activeOpacity={1}
            onPress={() => setDeleteModal({ visible: false, plan: null })}
          />

          <View style={[styles.actionSheet, { borderColor: themeColor, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.handleBar} />

            {(() => {
              const originalPlan = mealPlans.find(p => p.name === deleteModal.plan?.name);
              const planId = originalPlan?.fingerprint || originalPlan?.id;
              const isSaved = !!(planId && savedMealPlans.has(planId));
              return (
                <>
                  {/* Header: thumbnail + title + close */}
                  <View style={styles.actionHeaderRow}>
                    <View style={styles.actionThumb}>
                      <Ionicons name="restaurant" size={26} color={themeColor} />
                    </View>
                    <View style={styles.actionHeaderText}>
                      <Text style={styles.actionPlanName} numberOfLines={2}>
                        {deleteModal.plan?.name}
                      </Text>
                      <Text style={styles.actionPlanDetails}>
                        {deleteModal.plan?.duration} {deleteModal.plan?.duration === 1 ? 'day' : 'days'}
                        {deleteModal.plan && getMacroSplitDisplay(deleteModal.plan) ? ` · ${getMacroSplitDisplay(deleteModal.plan)}` : ''}
                      </Text>
                    </View>
                    <RNTouchable
                      style={styles.actionCloseButton}
                      onPress={() => setDeleteModal({ visible: false, plan: null })}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    >
                      <Ionicons name="close" size={22} color="#71717a" />
                    </RNTouchable>
                  </View>

                  {/* Primary CTA: Share */}
                  <RNTouchable
                    style={[styles.shareCtaButton, { backgroundColor: themeColor, shadowColor: themeColor }]}
                    onPress={() => deleteModal.plan && handleShareFromActionSheet(deleteModal.plan)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="share-outline" size={18} color="#0a0a0b" />
                    <Text style={styles.shareCtaText}>Share plan</Text>
                  </RNTouchable>

                  {/* Secondary tile row: Save / Rename / Remove */}
                  <View style={styles.tileRow}>
                    <RNTouchable
                      style={[
                        styles.actionTile,
                        isSaved && {
                          backgroundColor: themeColor + '1A',
                          borderColor: themeColor + '66',
                        },
                      ]}
                      onPress={() => {
                        if (deleteModal.plan) {
                          handleToggleSaveMealPlan(deleteModal.plan);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isSaved ? 'heart-dislike' : 'heart'}
                        size={19}
                        color={isSaved ? themeColor : '#d4d4d8'}
                      />
                      <Text style={[styles.actionTileText, isSaved && { color: themeColor }]}>
                        {isSaved ? 'Saved' : 'Save'}
                      </Text>
                    </RNTouchable>

                    <RNTouchable
                      style={styles.actionTile}
                      onPress={() => deleteModal.plan && handleRenameRequest(deleteModal.plan)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={19} color="#d4d4d8" />
                      <Text style={styles.actionTileText}>Rename</Text>
                    </RNTouchable>

                    <RNTouchable
                      style={styles.actionTileDanger}
                      onPress={handleDeleteConfirm}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={19} color="#f87171" />
                      <Text style={styles.actionTileDangerText}>Remove</Text>
                    </RNTouchable>
                  </View>

                  {/* Cancel */}
                  <RNTouchable
                    style={styles.actionCancel}
                    onPress={() => setDeleteModal({ visible: false, plan: null })}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.actionCancelText}>Cancel</Text>
                  </RNTouchable>
                </>
              );
            })()}
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
   * Renders one category shelf. Skips categories with fewer than 3 meals so a
   * sparse shelf never looks broken. The first shelf in `orderedSections` is
   * the daypart-floated one and gets a contextual eyebrow + title; every other
   * shelf shows its plain category title.
   */
  function renderCategorySection(section: HomeCategorySection, isFloated: boolean) {
    if (!section.meals || section.meals.length < 3) return null;

    const displayed = section.meals.slice(0, 5);
    const showSeeMoreCard = section.meals.length > 5;
    // Preview thumbnails come from positions 5-8 (zero-indexed) — i.e. the
    // four meals immediately after what's already on screen. Falls back to
    // earlier meals if the list is shorter than 9.
    const previewThumbs = section.meals.slice(5, 9);
    const headerTitle = isFloated ? daypart.title : section.title;

    return (
      <View key={section.key} style={styles.feedSection}>
        {isFloated && (
          <Text style={[styles.feedSectionEyebrow, { color: themeColor }]}>
            {daypart.eyebrow}
          </Text>
        )}
        <View style={styles.feedSectionHeader}>
          <Text style={styles.feedSectionTitle}>{headerTitle}</Text>
          <TouchableOpacity
            onPress={() => handleSeeAllPress(section.cuisine, section.title)}
            activeOpacity={0.6}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Text style={[styles.feedSectionSeeAll, { color: themeColor }]}>
              See all {section.meals.length} ›
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.feedScrollContent}
        >
          {displayed.map(renderFeedCard)}
          {showSeeMoreCard && renderSeeMoreCard(section, previewThumbs, section.meals.length)}
        </ScrollView>
      </View>
    );
  }

  /**
   * Renders every category shelf in daypart order. The floated category sits
   * at index 0 (see `orderedSections`), so the eyebrow is shown only there.
   */
  function renderAllSections() {
    return orderedSections.map((section, idx) =>
      renderCategorySection(section, idx === 0 && section.key === daypart.key)
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
    marginBottom: 16,
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },

  // ===== "YOUR PLANS" section label — mirrors HomeScreen.tsx =====
  sectionHeaderRow: {
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717a',
    letterSpacing: 1.2,
  },

  // Section grouping (for "Other plans" — old style)
  // FIX: removed paddingHorizontal: 16. scrollContent already pads, so this was doubling up.
  section: { marginBottom: 20 },
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
  // FIX: removed marginHorizontal: 16. scrollContent's paddingHorizontal: 16
  // was already providing the gutter; adding marginHorizontal here doubled it
  // to 32px, which is what made the card look squished vs HomeScreen.
  // SPACING FIX: marginBottom bumped 12 → 28 to give breathing room before
  // the "Meals" heading (was sitting too close to the hero card border).
  heroCard: {
    backgroundColor: '#000',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 12,
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
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 34,
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

  // ===== Secondary plan card — mirrors HomeScreen.tsx planCardSecondary =====
  // Greyed-out card for additional (non-current) meal plans. Same visual
  // treatment as the exercise screen so multiple plans read as a stack:
  // bold hero card on top, muted secondary cards beneath.
  planCardSecondary: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    borderColor: '#27272a',
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
    position: 'relative',
  },
  planTitleSecondary: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
    paddingRight: 30,
  },
  planSubtitleSecondary: {
    color: '#71717a',
    fontSize: 12,
    marginBottom: 10,
  },
  planStartBtnSecondary: {
    height: 40,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3f3f46',
  },
  planStartBtnSecondaryText: {
    color: '#d4d4d8',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  planMenuBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  // Small plan card (other plans) — DEPRECATED, kept for reference only.
  // Replaced by planCardSecondary above to match HomeScreen.tsx.
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

  // ===== feed section + cards =====
  // FIX: added marginHorizontal: -16 to break out of scrollContent's 16px
  // padding. Same trick HomeScreen uses for bulkingScroll so horizontal-
  // scrolling cards can slide off the right edge cleanly.
  feedSection: {
    marginBottom: 24,
    marginHorizontal: -16,
    marginTop: 12,
  },
  // Contextual daypart eyebrow above the floated shelf's title. Padded to line
  // up with the header row (which re-adds the 16px that feedSection removes).
  feedSectionEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingHorizontal: 16,
    marginBottom: 3,
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

  // ===== See more card (Option B — thumbnail grid preview) =====
  // The wrap reuses the same 16:9 slot a hero image would occupy, but
  // contains a 2x2 grid of thumbnails of unseen meals. Background colour
  // matches what shows through the 1px gutters between cells.
  seeMoreImageWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#27272a',
  },
  seeMoreGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // Each thumbnail cell is exactly 50% wide and 50% tall. The 0.5px borders
  // on the right cell and bottom row create the gutters between cells without
  // needing flex gap (which is finicky for image children on older RN).
  seeMoreThumb: {
    width: '50%',
    height: '50%',
    overflow: 'hidden',
  },
  seeMoreThumbRight: {
    borderLeftWidth: 1,
    borderLeftColor: '#27272a',
  },
  seeMoreThumbBottom: {
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  seeMoreThumbBottomRight: {
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    borderLeftWidth: 1,
    borderLeftColor: '#27272a',
  },
  seeMoreThumbImage: {
    width: '100%',
    height: '100%',
  },
  seeMoreThumbPlaceholder: {
    flex: 1,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Card body becomes a single row instead of stacked title + meta + macros.
  // Title and meta on the left, circular arrow button on the right.
  seeMoreBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 104, // matches a real card body: title (38) + meta (~25) +
                    // macro grid (~41). Keeps see-more card the same height
                    // as neighbouring meal cards in the row.
  },
  seeMoreBodyText: {
    flex: 1,
  },
  seeMoreArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  // CHANGED: replaced the old free-floating `emptyHero` block with a dashed,
  // tinted hero card to match HomeScreen.tsx's `emptyHeroCard` treatment.
  // borderColor / backgroundColor are applied inline at the call site using
  // themeColor (themeColor + '59' border, themeColor + '14' background).
  emptyHeroCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 22,
    marginBottom: 8,
    alignItems: 'center',
  },
  emptyHeroIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 14,
  },
  emptyHeroTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyHeroBody: {
    fontSize: 13,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  emptyHeroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  emptyHeroButtonText: {
    fontSize: 14,
    fontWeight: '700',
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

  // ==========================================================================
  // Action sheet (Meal Plan Options) — option-3 header-card layout
  // ==========================================================================
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  actionModalBackdrop: { flex: 1 },
  actionSheet: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
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
    height: 5,
    backgroundColor: '#52525b',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 22,
  },
  actionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 22,
  },
  actionThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionHeaderText: { flex: 1 },
  actionPlanName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  actionPlanDetails: {
    color: '#71717a',
    fontSize: 13,
  },
  actionCloseButton: {
    alignSelf: 'flex-start',
    padding: 2,
  },

  shareCtaButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  shareCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0a0a0b',
    letterSpacing: 0.2,
  },

  tileRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  actionTile: {
    flex: 1,
    minHeight: 68,
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3f3f46',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionTileText: {
    color: '#d4d4d8',
    fontSize: 12,
    fontWeight: '500',
  },
  actionTileDanger: {
    flex: 1,
    minHeight: 68,
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionTileDangerText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '500',
  },

  actionCancel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  actionCancelText: {
    color: '#71717a',
    fontSize: 15,
    fontWeight: '500',
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