import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
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
  recommended_time?: string;
  timing_reason?: string;
  macros?: { protein: number; carbs: number; fat: number; fiber?: number };
  ingredients: Array<{ item: string; amount: string; unit: string; notes?: string }>;
  instructions: string[];
  notes?: string;
  tags?: string[];
}

interface Day {
  day_name: string;
  day_number: number;
  meals: Meal[];
}

// =============================================================================
// Design language — matches the rest of the app (near-black canvas, Georgia
// serif display, demoted metadata, themeColor accent). Mirrors the tokens used
// in CuratedFavoritesScreen so the two screens read as one product.
// =============================================================================
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const CANVAS = '#0a0a0b';
const SURFACE = '#141417';
const SURFACE_HAIRLINE = 'rgba(63,63,70,0.3)';
const MACRO_PROTEIN = '#ef4444';

// A day's relationship to the "active" day, which drives its visual weight.
//  - 'active'  : the highlighted card (today if in range, else day 1)
//  - 'past'    : a day before today (only used when today is in range) — dimmed
//  - 'normal'  : everything else
type DayState = 'active' | 'past' | 'normal';

// =============================================================================
// DayCard — the heart of the screen. One card per day. The active day is
// elevated (accent border + pill); past days recede; the rest sit calm. Each
// card previews the day's meals by name and shows accurate calorie + protein
// totals. (The old, always-zero progress bar is gone.)
// =============================================================================
interface DayCardProps {
  dayName: string;
  dayDate: string;
  dayState: DayState;
  activeLabel: string | null; // 'TODAY' | 'DAY 1' | null
  meals: any[];
  themeColor: string;
  onPress: () => void;
  onLongPress: () => void;
}

function DayCard({ dayName, dayDate, dayState, activeLabel, meals, themeColor, onPress, onLongPress }: DayCardProps) {
  const isActive = dayState === 'active';
  const isPast = dayState === 'past';

  const { totalCalories, totalProtein, mealNames } = useMemo(() => {
    const totals = meals.reduce(
      (acc, meal) => {
        const calories = meal.nutrition?.calories || meal.calories || 0;
        const nutrition = meal.nutrition || meal.macros || {};
        return { calories: acc.calories + calories, protein: acc.protein + (nutrition.protein || 0) };
      },
      { calories: 0, protein: 0 }
    );
    return {
      totalCalories: Math.round(totals.calories),
      totalProtein: Math.round(totals.protein),
      mealNames: meals.map((m) => m.name || m.meal_name).filter(Boolean),
    };
  }, [meals]);

  const isEmpty = meals.length === 0;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isActive && { borderColor: themeColor, borderWidth: 1.5, backgroundColor: `${themeColor}0C` },
        isPast && styles.cardPast,
      ]}
      activeOpacity={0.85}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={600}
    >
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardHeaderLeft}>
          {isActive && activeLabel && (
            <View style={[styles.activePill, { backgroundColor: themeColor }]}>
              <Text style={styles.activePillText}>{activeLabel}</Text>
            </View>
          )}
          <Text
            style={[
              styles.cardDayName,
              isActive && { color: '#ffffff' },
              isPast && styles.cardDayNamePast,
            ]}
          >
            {dayName}
          </Text>
          <Text style={styles.cardDayDate}>{dayDate}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={isActive ? themeColor : '#52525b'} />
      </View>

      {isEmpty ? (
        <Text style={styles.cardEmptyHint}>No meals yet — tap to add</Text>
      ) : (
        <>
          <Text style={styles.cardMealList} numberOfLines={2}>
            {mealNames.join('  ·  ')}
          </Text>
          <View style={styles.cardStatsRow}>
            <Text style={styles.cardKcal}>
              {totalCalories.toLocaleString()}
              <Text style={styles.cardKcalUnit}> cal</Text>
            </Text>
            <View style={styles.cardDivider} />
            <View style={styles.cardMacro}>
              <View style={[styles.cardMacroDot, { backgroundColor: MACRO_PROTEIN }]} />
              <Text style={styles.cardMacroText}>{totalProtein}g protein</Text>
            </View>
            <View style={styles.cardMealCount}>
              <Ionicons name="restaurant-outline" size={13} color="#71717a" />
              <Text style={styles.cardMealCountText}>{meals.length}</Text>
            </View>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

// =============================================================================
// ToolRow — full-width list row for the weekly tools (Shopping List, Meal
// Prep). Reads as a deliberate, substantial list item rather than a squished
// half-width tile.
// =============================================================================
interface ToolRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  meta: string;
  themeColor: string;
  onPress: () => void;
}

function ToolRow({ icon, label, meta, themeColor, onPress }: ToolRowProps) {
  return (
    <TouchableOpacity style={styles.toolRow} activeOpacity={0.85} onPress={onPress}>
      <LinearGradient colors={[themeColor, `${themeColor}CC`]} style={styles.toolIcon}>
        <Ionicons name={icon} size={20} color="#ffffff" />
      </LinearGradient>
      <View style={styles.toolTextWrap}>
        <Text style={styles.toolLabel}>{label}</Text>
        <Text style={styles.toolMeta} numberOfLines={1}>{meta}</Text>
      </View>
      <Ionicons name="chevron-forward" size={19} color="#52525b" />
    </TouchableOpacity>
  );
}

export default function MealPlanDaysScreen() {
  const navigation = useNavigation<MealPlanDaysScreenNavigationProp>();
  const route = useRoute<MealPlanDaysScreenRouteProp>();
  const { themeColor } = useTheme();
  const mealPlanning = useMealPlanning();
  const { currentPlan, saveMealPlan } = useSimplifiedMealPlanning();

  const { week = { week_number: 1, days: [] }, mealPlanName, allMealPrepSessions, groceryList } = route.params;

  // -------------------------------------------------------------------------
  // Grocery list resolution
  // -------------------------------------------------------------------------
  const currentGroceryList = currentPlan?.grocery_list || mealPlanning.currentMealPlan?.data?.grocery_list || groceryList;

  const generateGroceryListFromCurrentPlan = () => {
    if (!currentPlan) return null;
    const ingredients = new Map<string, { amount: string; unit: string; count: number }>();
    Object.values(currentPlan.dailyMeals).forEach((day: any) => {
      day.meals.forEach((meal: any) => {
        meal.ingredients?.forEach((ingredient: any) => {
          const key = ingredient.name || ingredient.item || ingredient.ingredient || ingredient.food;
          if (key) {
            if (ingredients.has(key)) ingredients.get(key)!.count += 1;
            else ingredients.set(key, { amount: ingredient.amount || ingredient.quantity || '1', unit: ingredient.unit || ingredient.measurement || '', count: 1 });
          }
        });
      });
    });
    if (ingredients.size === 0) return null;
    const categorizedIngredients = new Map<string, Array<{ name: string; data: any }>>();
    Array.from(ingredients.entries()).forEach(([name, data]) => {
      let category = 'Other';
      const n = name.toLowerCase();
      if (['chicken', 'beef', 'pork', 'fish', 'turkey', 'salmon', 'shrimp', 'tofu', 'eggs'].some((k) => n.includes(k))) category = 'Protein';
      else if (['milk', 'cheese', 'yogurt', 'butter', 'cream'].some((k) => n.includes(k))) category = 'Dairy';
      else if (['rice', 'bread', 'pasta', 'quinoa', 'oats', 'flour'].some((k) => n.includes(k))) category = 'Grains';
      else if (['broccoli', 'spinach', 'carrot', 'onion', 'tomato', 'pepper', 'lettuce', 'cucumber', 'celery'].some((k) => n.includes(k))) category = 'Vegetables';
      else if (['apple', 'banana', 'berry', 'orange', 'lemon', 'lime'].some((k) => n.includes(k))) category = 'Fruits';
      else if (['oil', 'salt', 'pepper', 'garlic', 'herb', 'spice', 'vanilla', 'cinnamon'].some((k) => n.includes(k))) category = 'Pantry';
      if (!categorizedIngredients.has(category)) categorizedIngredients.set(category, []);
      categorizedIngredients.get(category)!.push({ name, data });
    });
    const categories = Array.from(categorizedIngredients.entries()).map(([categoryName, items], catIndex) => ({
      name: categoryName,
      items: items.map(({ name, data }, itemIndex) => ({
        id: `generated_${catIndex}_${itemIndex}_${name.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name,
        amount: data.count > 1 ? `${data.amount} (x${data.count})` : data.amount,
        unit: data.unit || '',
        estimated_price: 0,
      })),
    }));
    return { categories };
  };

  // -------------------------------------------------------------------------
  // Meal prep session resolution
  // -------------------------------------------------------------------------
  const generateMealPrepFromCurrentPlan = () => {
    if (!currentPlan) return null;
    const uniqueMeals = new Map<string, any>();
    Object.values(currentPlan.dailyMeals).forEach((day: any) => {
      day.meals?.forEach((meal: any) => {
        if (!uniqueMeals.has(meal.name)) uniqueMeals.set(meal.name, meal);
      });
    });
    const uniqueMealsArray = Array.from(uniqueMeals.values());
    if (uniqueMealsArray.length === 0) return null;

    const estimateMealTime = (meal: any) => {
      const instructions = meal.instructions || [];
      const tags = meal.tags || [];
      if (tags.includes('no-cook') || tags.includes('quick')) return { prepTime: 5, cookTime: 0 };
      if (tags.includes('air-fryer')) return { prepTime: 10, cookTime: 20 };
      if (tags.includes('sheet-pan')) return { prepTime: 15, cookTime: 25 };
      if (instructions.length > 8) return { prepTime: 20, cookTime: 30 };
      if (instructions.length > 5) return { prepTime: 15, cookTime: 20 };
      return { prepTime: 10, cookTime: 15 };
    };

    const totalPrepTime = uniqueMealsArray.reduce((total, meal) => {
      const e = estimateMealTime(meal);
      return total + (meal.prep_time || meal.prepTime || e.prepTime) + (meal.cook_time || meal.cookTime || e.cookTime);
    }, 0);

    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + (((0 - today.getDay() + 7) % 7) || 7));

    return [
      {
        id: 'weekly_meal_prep',
        session_name: 'Weekly Meal Prep',
        session_number: 1,
        name: 'Weekly Meal Prep',
        prep_time: Math.round(totalPrepTime * 0.4),
        cook_time: Math.round(totalPrepTime * 0.6),
        total_time: totalPrepTime,
        covers: `${uniqueMealsArray.length} recipes for the week`,
        recommended_timing: 'Sunday morning or evening for best results',
        recommended_date: sunday.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
        equipment_needed: [],
        instructions: [],
        storage_guidelines: {},
        prep_meals: uniqueMealsArray.map((meal) => {
          const e = estimateMealTime(meal);
          const prepTime = meal.prep_time || meal.prepTime || e.prepTime;
          const cookTime = meal.cook_time || meal.cookTime || e.cookTime;
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
            tags: meal.tags || [],
          };
        }),
      },
    ];
  };

  const effectiveGroceryList = currentGroceryList || generateGroceryListFromCurrentPlan();

  let effectiveMealPrepSessions = allMealPrepSessions;
  if (currentPlan?.meal_prep_sessions && currentPlan.meal_prep_sessions.length > 0) effectiveMealPrepSessions = currentPlan.meal_prep_sessions;
  else if (currentPlan?.meal_prep_session) effectiveMealPrepSessions = [currentPlan.meal_prep_session];
  else if (!effectiveMealPrepSessions || effectiveMealPrepSessions.length === 0) effectiveMealPrepSessions = generateMealPrepFromCurrentPlan();

  const actualGroceryTotal = useMemo(() => {
    if (!effectiveGroceryList?.categories) return 0;
    let total = 0;
    effectiveGroceryList.categories.forEach((c: any) => c.items?.forEach((i: any) => { total += i.estimated_price || 0; }));
    return total;
  }, [effectiveGroceryList]);

  const groceryItemCount = useMemo(() => {
    if (!effectiveGroceryList?.categories) return 0;
    return effectiveGroceryList.categories.reduce((sum: number, c: any) => sum + (c.items?.length || 0), 0);
  }, [effectiveGroceryList]);

  // Recipe count for the meal-prep row — count prep_meals across sessions, and
  // fall back to the plan's unique meals so it never shows a misleading "0".
  const prepRecipeCount = useMemo(() => {
    if (effectiveMealPrepSessions && effectiveMealPrepSessions.length) {
      const counted = effectiveMealPrepSessions.reduce((sum: number, s: any) => sum + (s.prep_meals?.length || 0), 0);
      if (counted > 0) return counted;
    }
    if (currentPlan) {
      const names = new Set<string>();
      Object.values(currentPlan.dailyMeals).forEach((d: any) => d.meals?.forEach((m: any) => names.add(m.name)));
      return names.size;
    }
    return 0;
  }, [effectiveMealPrepSessions, currentPlan]);

  // -------------------------------------------------------------------------
  // Days
  // -------------------------------------------------------------------------
  const days: Day[] = useMemo(() => {
    if (!currentPlan) return week?.days || [];
    const availableDates = Object.keys(currentPlan.dailyMeals).sort();
    return availableDates.map((date, index) => {
      const dayData = currentPlan.dailyMeals[date];
      const convertedMeals = dayData.meals.map((meal: any) => ({
        meal_name: meal.name,
        meal_type: meal.type,
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
      } as Day;
    });
  }, [currentPlan, week]);

  const orderedDates = useMemo(
    () => (currentPlan ? Object.keys(currentPlan.dailyMeals).sort() : []),
    [currentPlan]
  );

  const rawMealsForIndex = (dayIndex: number): any[] => {
    if (!currentPlan) return days[dayIndex]?.meals || [];
    return currentPlan.dailyMeals[orderedDates[dayIndex]]?.meals || [];
  };

  const dateForIndex = (dayIndex: number): Date => {
    if (currentPlan && dayIndex >= 0 && dayIndex < orderedDates.length) {
      return new Date(orderedDates[dayIndex]);
    }
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + dayIndex);
    return d;
  };

  const getDayName = (dayIndex: number) => dateForIndex(dayIndex).toLocaleDateString('en-US', { weekday: 'long' });
  const getDayDate = (dayIndex: number) => {
    const d = dateForIndex(dayIndex);
    return `${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getDate()}`;
  };

  // -------------------------------------------------------------------------
  // Active-day logic (rule B):
  //  - If today falls within the plan, that day is 'active' (label TODAY);
  //    days before it are 'past' (dimmed); the rest are 'normal'.
  //  - If the whole plan is in the past or future, day 1 is 'active'
  //    (label DAY 1) and NOTHING is dimmed — so the screen never looks dead.
  // -------------------------------------------------------------------------
  const { activeIndex, activeLabel, todayInRange } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let found = -1;
    for (let i = 0; i < days.length; i++) {
      const d = dateForIndex(i);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() === today.getTime()) { found = i; break; }
    }
    if (found >= 0) return { activeIndex: found, activeLabel: 'TODAY', todayInRange: true };
    return { activeIndex: days.length > 0 ? 0 : -1, activeLabel: 'DAY 1', todayInRange: false };
  }, [days, orderedDates, currentPlan]);

  const getDayState = (dayIndex: number): DayState => {
    if (dayIndex === activeIndex) return 'active';
    if (todayInRange && dayIndex < activeIndex) return 'past';
    return 'normal';
  };

  // -------------------------------------------------------------------------
  // Date picker (add day + shift start)
  // -------------------------------------------------------------------------
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [datePickerMode, setDatePickerMode] = useState<'add' | 'shift'>('add');

  const handleAddDay = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow);
    setDatePickerMode('add');
    setShowDatePicker(true);
  };

  const handleShiftStart = () => {
    if (orderedDates.length > 0) setSelectedDate(new Date(orderedDates[0]));
    setDatePickerMode('shift');
    setShowDatePicker(true);
  };

  const addNewDay = async (dateToAdd: Date) => {
    try {
      if (!currentPlan) return Alert.alert('Error', 'No meal plan loaded');
      const year = dateToAdd.getFullYear();
      const month = String(dateToAdd.getMonth() + 1).padStart(2, '0');
      const day = String(dateToAdd.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      if (currentPlan.dailyMeals[dateString]) {
        return Alert.alert('Date Already Exists', `A day for ${dateToAdd.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} already exists.`);
      }
      const updatedPlan = {
        ...currentPlan,
        dailyMeals: {
          ...currentPlan.dailyMeals,
          [dateString]: {
            date: dateString,
            dayName: dateToAdd.toLocaleDateString('en-US', { weekday: 'long' }),
            meals: [],
            dailyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
          },
        },
      };
      await saveMealPlan(updatedPlan);
      Alert.alert('Success', `Added ${dateToAdd.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`);
    } catch (error) {
      console.error('Error adding new day:', error);
      Alert.alert('Error', 'Failed to add new day');
    }
  };

  // Shift the whole plan so day 1 lands on the chosen date — order and meal
  // contents preserved, only the date keys move.
  const shiftStartDate = async (newStart: Date) => {
    try {
      if (!currentPlan || orderedDates.length === 0) return;
      const start = new Date(newStart);
      start.setHours(0, 0, 0, 0);
      const newDailyMeals: Record<string, any> = {};
      orderedDates.forEach((oldDate, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        newDailyMeals[key] = {
          ...currentPlan.dailyMeals[oldDate],
          date: key,
          dayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
        };
      });
      await saveMealPlan({ ...currentPlan, dailyMeals: newDailyMeals });
      Alert.alert('Start date updated', `Day 1 now begins ${start.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}.`);
    } catch (error) {
      console.error('Error shifting start date:', error);
      Alert.alert('Error', 'Failed to update start date');
    }
  };

  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'dismissed') return;
      if (date) { datePickerMode === 'add' ? addNewDay(date) : shiftStartDate(date); }
      return;
    }
    if (date) setSelectedDate(date);
  };

  const handleDateConfirm = () => {
    setShowDatePicker(false);
    datePickerMode === 'add' ? addNewDay(selectedDate) : shiftStartDate(selectedDate);
  };

  const deleteDayMeals = async (dayIndex: number) => {
    try {
      if (!currentPlan) return Alert.alert('Error', 'No meal plan loaded');
      if (dayIndex < 0 || dayIndex >= orderedDates.length) return Alert.alert('Error', `Invalid day index: ${dayIndex}`);
      const dateKey = orderedDates[dayIndex];
      const updatedPlan = { ...currentPlan, dailyMeals: { ...currentPlan.dailyMeals } };
      delete updatedPlan.dailyMeals[dateKey];
      await saveMealPlan(updatedPlan);
      Alert.alert('Success', `Deleted ${getDayName(dayIndex)} from your meal plan`);
    } catch (error) {
      console.error('Error deleting day meals:', error);
      Alert.alert('Error', 'Failed to delete day meals');
    }
  };

  const handleDayLongPress = (dayIndex: number) => {
    Alert.alert('Delete Day', `Delete all meals from ${getDayName(dayIndex)}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDayMeals(dayIndex) },
    ]);
  };

  const handleDayPress = (day: Day, index: number) => {
    const calculatedDateString = currentPlan && index >= 0 && index < orderedDates.length
      ? orderedDates[index]
      : dateForIndex(index).toISOString().split('T')[0];
    navigation.navigate('MealPlanDay', {
      day: { ...day, date: calculatedDateString, calculatedDate: new Date(calculatedDateString) },
      weekNumber: week?.week_number || 1,
      mealPlanName,
      dayIndex: index,
      calculatedDayName: getDayName(index),
      calculatedDateString,
    });
  };

  const startDateLabel = useMemo(() => {
    if (orderedDates.length > 0) {
      const d = new Date(orderedDates[0]);
      return `${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getDate()}`;
    }
    return null;
  }, [orderedDates]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {days.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="restaurant-outline" size={56} color="#3f3f46" />
          <Text style={styles.emptyTitle}>No days yet</Text>
          <Text style={styles.emptyDescription}>Add a day to start building this plan.</Text>
          <TouchableOpacity style={[styles.emptyAddButton, { borderColor: themeColor }]} onPress={handleAddDay} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color={themeColor} />
            <Text style={[styles.emptyAddText, { color: themeColor }]}>Add a day</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={3}>{mealPlanName || 'Your meal plan'}</Text>
            <View style={styles.subtitleRow}>
              <Text style={styles.subtitle}>
                {days.length} {days.length === 1 ? 'day' : 'days'}{startDateLabel ? ` · from ${startDateLabel}` : ''}
              </Text>
              {startDateLabel && (
                <TouchableOpacity onPress={handleShiftStart} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.changeStartLink, { color: themeColor }]}>Change start</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Weekly tools — full-width stacked rows */}
          {(effectiveGroceryList || (effectiveMealPrepSessions && effectiveMealPrepSessions.length > 0)) && (
            <View style={styles.toolsWrap}>
              {effectiveGroceryList && (
                <ToolRow
                  icon="bag-handle"
                  label="Shopping list"
                  meta={`${effectiveGroceryList?.currency || '$'}${actualGroceryTotal.toFixed(0)} · ${groceryItemCount} item${groceryItemCount === 1 ? '' : 's'}`}
                  themeColor={themeColor}
                  onPress={() => navigation.navigate('GroceryList', { groceryList: effectiveGroceryList })}
                />
              )}
              {effectiveMealPrepSessions && effectiveMealPrepSessions.length > 0 && (
                <ToolRow
                  icon="restaurant"
                  label="Meal prep"
                  meta={
                    effectiveMealPrepSessions.length > 1
                      ? `${effectiveMealPrepSessions.length} sessions · ${prepRecipeCount} recipe${prepRecipeCount === 1 ? '' : 's'}`
                      : `${effectiveMealPrepSessions[0].total_time} min · ${prepRecipeCount} recipe${prepRecipeCount === 1 ? '' : 's'}`
                  }
                  themeColor={themeColor}
                  onPress={() => navigation.navigate('MealPrepSession', {
                    mealPrepSession: effectiveMealPrepSessions[0],
                    sessionIndex: 0,
                    allSessions: effectiveMealPrepSessions,
                  })}
                />
              )}
            </View>
          )}

          {/* Days */}
          <Text style={styles.daysHeader}>The week</Text>
          {days.map((day, index) => (
            <DayCard
              key={index}
              dayName={getDayName(index)}
              dayDate={getDayDate(index)}
              dayState={getDayState(index)}
              activeLabel={index === activeIndex ? activeLabel : null}
              meals={rawMealsForIndex(index)}
              themeColor={themeColor}
              onPress={() => handleDayPress(day, index)}
              onLongPress={() => handleDayLongPress(index)}
            />
          ))}

          <TouchableOpacity style={[styles.addDayButton, { borderColor: `${themeColor}66` }]} onPress={handleAddDay} activeOpacity={0.7}>
            <Ionicons name="add" size={18} color={themeColor} />
            <Text style={[styles.addDayText, { color: themeColor }]}>Add a day</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Date picker sheet — proper container, visible Cancel / confirm buttons */}
      {showDatePicker && (
        <View style={styles.datePickerSheet}>
          <Text style={styles.datePickerTitle}>
            {datePickerMode === 'add' ? 'Pick a date to add' : 'When should day 1 begin?'}
          </Text>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={datePickerMode === 'add' ? new Date() : undefined}
            {...(Platform.OS === 'ios' ? { themeVariant: 'dark', textColor: '#ffffff' } : {})}
          />
          {Platform.OS === 'ios' && (
            <View style={styles.datePickerButtons}>
              <TouchableOpacity style={[styles.datePickerButton, { backgroundColor: themeColor }]} onPress={handleDateConfirm} activeOpacity={0.85}>
                <Text style={styles.confirmButtonText}>{datePickerMode === 'add' ? 'Add day' : 'Update start date'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.datePickerButton, styles.cancelButton]} onPress={() => setShowDatePicker(false)} activeOpacity={0.8}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CANVAS },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 48 },
  backButton: { padding: 6 },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 40 },

  titleBlock: { paddingTop: 4, paddingBottom: 24 },
  title: { fontFamily: SERIF, fontSize: 30, fontWeight: '400', color: '#ffffff', letterSpacing: -0.5, lineHeight: 36 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  subtitle: { fontSize: 14, color: '#71717a', fontWeight: '500' },
  changeStartLink: { fontSize: 14, fontWeight: '600' },

  toolsWrap: { marginBottom: 30, gap: 11 },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SURFACE_HAIRLINE,
  },
  toolIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toolTextWrap: { flex: 1 },
  toolLabel: { fontSize: 15, color: '#ffffff', fontWeight: '600' },
  toolMeta: { fontSize: 13, color: '#71717a', marginTop: 2 },

  daysHeader: { fontFamily: SERIF, fontSize: 20, fontWeight: '400', color: '#ffffff', letterSpacing: -0.3, marginBottom: 14 },

  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SURFACE_HAIRLINE,
  },
  cardPast: { opacity: 0.5 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, flex: 1 },
  activePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  activePillText: { fontSize: 10, fontWeight: '800', color: '#0a0a0b', letterSpacing: 0.6 },
  cardDayName: { fontSize: 17, fontWeight: '700', color: '#e4e4e7', letterSpacing: -0.2 },
  cardDayNamePast: { color: '#a1a1aa' },
  cardDayDate: { fontSize: 14, color: '#71717a', fontWeight: '500' },
  cardEmptyHint: { fontSize: 13, color: '#52525b', marginTop: 12, fontStyle: 'italic' },
  cardMealList: { fontSize: 14, color: '#a1a1aa', lineHeight: 20, marginTop: 12, marginBottom: 14 },
  cardStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardKcal: { fontSize: 15, fontWeight: '700', color: '#ffffff', letterSpacing: -0.3 },
  cardKcalUnit: { fontSize: 12, fontWeight: '500', color: '#71717a' },
  cardDivider: { width: StyleSheet.hairlineWidth, height: 16, backgroundColor: '#3f3f46' },
  cardMacro: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardMacroDot: { width: 7, height: 7, borderRadius: 3.5 },
  cardMacroText: { fontSize: 13, color: '#d4d4d8', fontWeight: '500' },
  cardMealCount: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  cardMealCountText: { fontSize: 13, color: '#71717a', fontWeight: '500' },

  addDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  addDayText: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontFamily: SERIF, fontSize: 24, fontWeight: '400', color: '#ffffff', marginTop: 16 },
  emptyDescription: { fontSize: 14, color: '#71717a', textAlign: 'center', marginTop: 4, marginBottom: 24 },
  emptyAddButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 22 },
  emptyAddText: { fontSize: 15, fontWeight: '600' },

  datePickerSheet: {
    backgroundColor: '#141417',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SURFACE_HAIRLINE,
    paddingTop: 18,
    paddingBottom: 34,
  },
  datePickerTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', textAlign: 'center', marginBottom: 4 },
  datePickerButtons: { flexDirection: 'column', gap: 10, paddingHorizontal: 18, paddingTop: 8 },
  datePickerButton: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: '#27272a' },
  cancelButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  confirmButtonText: { color: '#06181c', fontWeight: '700', fontSize: 16 },
});

export { DayCard };