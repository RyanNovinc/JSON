import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';
import { useSimplifiedMealPlanning } from '../contexts/SimplifiedMealPlanningContext';
import { buildPrepSession } from '../utils/buildPrepSession';

type Nav = StackNavigationProp<RootStackParamList, 'MealPlanDays'>;
type Rt = RouteProp<RootStackParamList, 'MealPlanDays'>;

interface Day {
  day_name: string;
  day_number: number;
  meals: any[];
}

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const CANVAS = '#0a0a0b';
const MUTED = '#7a7a80';
const FAINT = '#6a6a70';

const parseTimeToMinutes = (t?: string): number | null => {
  if (!t || typeof t !== 'string') return null;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3] ? m[3].toLowerCase() : null;
  if (ap === 'pm' && h !== 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
};

export default function MealPlanDaysScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { themeColor } = useTheme();
  const mealPlanning = useMealPlanning();
  const { currentPlan, saveMealPlan } = useSimplifiedMealPlanning();

  const { week = { week_number: 1, days: [] }, mealPlanName, groceryList } = route.params;

  // ---- Grocery resolution -------------------------------------------------
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
    const cat = new Map<string, { name: string; data: any }[]>();
    Array.from(ingredients.entries()).forEach(([name, data]) => {
      let category = 'Other';
      const n = name.toLowerCase();
      if (['chicken', 'beef', 'pork', 'fish', 'turkey', 'salmon', 'shrimp', 'tofu', 'eggs'].some((k) => n.includes(k))) category = 'Protein';
      else if (['milk', 'cheese', 'yogurt', 'butter', 'cream'].some((k) => n.includes(k))) category = 'Dairy';
      else if (['rice', 'bread', 'pasta', 'quinoa', 'oats', 'flour'].some((k) => n.includes(k))) category = 'Grains';
      else if (['broccoli', 'spinach', 'carrot', 'onion', 'tomato', 'pepper', 'lettuce', 'cucumber', 'celery'].some((k) => n.includes(k))) category = 'Vegetables';
      else if (['apple', 'banana', 'berry', 'orange', 'lemon', 'lime'].some((k) => n.includes(k))) category = 'Fruits';
      else if (['oil', 'salt', 'pepper', 'garlic', 'herb', 'spice', 'vanilla', 'cinnamon'].some((k) => n.includes(k))) category = 'Pantry';
      if (!cat.has(category)) cat.set(category, []);
      cat.get(category)!.push({ name, data });
    });
    return {
      categories: Array.from(cat.entries()).map(([categoryName, items], ci) => ({
        name: categoryName,
        items: items.map(({ name, data }, ii) => ({
          id: `generated_${ci}_${ii}_${name.replace(/[^a-zA-Z0-9]/g, '_')}`,
          name,
          amount: data.count > 1 ? `${data.amount} (x${data.count})` : data.amount,
          unit: data.unit || '',
          estimated_price: 0,
        })),
      })),
    };
  };

  const effectiveGroceryList = currentGroceryList || generateGroceryListFromCurrentPlan();

  // Prep session is derived deterministically from the plan (the same projection
  // the Meal Prep screen renders), not from stale AI-emitted meal_prep_sessions
  // or the route param. Badge figures come straight off its totals.
  const prepSession = useMemo(() => (currentPlan ? buildPrepSession(currentPlan) : null), [currentPlan]);
  const prepMealCount = prepSession?.totals.mealCount ?? 0;
  const prepActiveMinutes = prepSession?.totals.activeMinutes ?? 0;

  const actualGroceryTotal = useMemo(() => {
    if (!effectiveGroceryList?.categories) return 0;
    let total = 0;
    effectiveGroceryList.categories.forEach((c: any) => c.items?.forEach((i: any) => { total += i.estimated_price || 0; }));
    return total;
  }, [effectiveGroceryList]);

  const groceryItemCount = useMemo(() => {
    if (!effectiveGroceryList?.categories) return 0;
    return effectiveGroceryList.categories.reduce((s: number, c: any) => s + (c.items?.length || 0), 0);
  }, [effectiveGroceryList]);

  const hasGrocery = !!effectiveGroceryList;
  // Button shows whenever there's a plan — the Meal Prep screen handles the
  // all-fresh and legacy (no curated meals) cases itself.
  const hasPrep = !!currentPlan;
  const currency = (effectiveGroceryList as any)?.currency || '$';

  const setupTasks = (currentPlan as any)?.setupTasks as { shopping?: boolean; prep?: boolean } | undefined;
  const shoppingDone = !!setupTasks?.shopping;
  const prepDone = !!setupTasks?.prep;

  // ---- Days + dates -------------------------------------------------------
  const orderedDates = useMemo(() => (currentPlan ? Object.keys(currentPlan.dailyMeals).sort() : []), [currentPlan]);

  const days: Day[] = useMemo(() => {
    if (!currentPlan) return week?.days || [];
    return orderedDates.map((date, index) => {
      const dayData = currentPlan.dailyMeals[date];
      return {
        day_name: dayData.dayName || new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
        day_number: index + 1,
        meals: dayData.meals || [],
      } as Day;
    });
  }, [currentPlan, week, orderedDates]);

  const rawMealsForIndex = (i: number): any[] => {
    if (!currentPlan) return days[i]?.meals || [];
    return currentPlan.dailyMeals[orderedDates[i]]?.meals || [];
  };

  const dateForIndex = (i: number): Date => {
    if (currentPlan && i >= 0 && i < orderedDates.length) return new Date(orderedDates[i]);
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d;
  };

  const { activeIndex, todayInRange } = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 0; i < days.length; i++) {
      const d = dateForIndex(i); d.setHours(0, 0, 0, 0);
      if (d.getTime() === today.getTime()) return { activeIndex: i, todayInRange: true };
    }
    return { activeIndex: 0, todayInRange: false };
  }, [days, orderedDates, currentPlan]);

  const [viewIndex, setViewIndex] = useState(activeIndex);
  useEffect(() => { setViewIndex(activeIndex); }, [activeIndex]);

  const goToDay = (i: number) => {
    if (i < 0 || i >= days.length) return;
    setViewIndex(i);
  };

  // ---- Shift start --------------------------------------------------------
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const handleShiftStart = () => {
    if (orderedDates.length > 0) setSelectedDate(new Date(orderedDates[0]));
    setShowDatePicker(true);
  };

  const shiftStartDate = async (newStart: Date) => {
    try {
      if (!currentPlan || orderedDates.length === 0) return;
      const start = new Date(newStart); start.setHours(0, 0, 0, 0);
      const next: Record<string, any> = {};
      orderedDates.forEach((oldDate, i) => {
        const d = new Date(start); d.setDate(start.getDate() + i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        next[key] = { ...currentPlan.dailyMeals[oldDate], date: key, dayName: d.toLocaleDateString('en-US', { weekday: 'long' }) };
      });
      await saveMealPlan({ ...currentPlan, dailyMeals: next });
      Alert.alert('Start date updated', `Day 1 now begins ${start.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}.`);
    } catch (e) { console.error(e); Alert.alert('Error', 'Failed to update start date'); }
  };

  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') { setShowDatePicker(false); if (event.type === 'dismissed') return; if (date) shiftStartDate(date); return; }
    if (date) setSelectedDate(date);
  };
  const handleDateConfirm = () => { setShowDatePicker(false); shiftStartDate(selectedDate); };

  const deleteDayMeals = async (i: number) => {
    try {
      if (!currentPlan) return;
      if (i < 0 || i >= orderedDates.length) return;
      const dateKey = orderedDates[i];
      const updated = { ...currentPlan, dailyMeals: { ...currentPlan.dailyMeals } };
      delete updated.dailyMeals[dateKey];
      await saveMealPlan(updated);
      if (viewIndex >= orderedDates.length - 1) setViewIndex(Math.max(0, orderedDates.length - 2));
      Alert.alert('Deleted', `Removed ${dateForIndex(i).toLocaleDateString('en-US', { weekday: 'long' })}.`);
    } catch (e) { console.error(e); }
  };

  const handleDayLongPress = (i: number) => {
    Alert.alert('Delete day', `Delete all meals from ${dateForIndex(i).toLocaleDateString('en-US', { weekday: 'long' })}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDayMeals(i) },
    ]);
  };

  const openDay = (i: number) => {
    const day = days[i]; if (!day) return;
    const ds = currentPlan && i >= 0 && i < orderedDates.length ? orderedDates[i] : dateForIndex(i).toISOString().split('T')[0];
    navigation.navigate('MealPlanDay', {
      day: { ...day, date: ds, calculatedDate: new Date(ds) },
      weekNumber: week?.week_number || 1,
      mealPlanName,
      dayIndex: i,
      calculatedDayName: dateForIndex(i).toLocaleDateString('en-US', { weekday: 'long' }),
      calculatedDateString: ds,
    });
  };

  const rangeLabel = useMemo(() => {
    if (orderedDates.length === 0) return null;
    const first = new Date(orderedDates[0]);
    const last = new Date(orderedDates[orderedDates.length - 1]);
    const fmt = (d: Date) => `${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getDate()}`;
    if (orderedDates.length === 1) return fmt(first);
    return `${fmt(first)} – ${fmt(last)}`;
  }, [orderedDates]);

  const openGrocery = () => {
    if (effectiveGroceryList) navigation.navigate('GroceryList', { groceryList: effectiveGroceryList });
    else Alert.alert('Shopping list', 'No shopping list available for this plan yet.');
  };
  const openPrep = () => {
    if (hasPrep) navigation.navigate('MealPrepSession');
    else Alert.alert('Meal prep', 'No meal prep available for this plan yet.');
  };

  // ---- Empty plan ---------------------------------------------------------
  if (days.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={26} color="#ffffff" />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No days yet</Text>
          <Text style={styles.emptyDescription}>This plan has no days.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Viewed day ---------------------------------------------------------
  const meals = rawMealsForIndex(viewIndex);
  const isTodayView = todayInRange && viewIndex === activeIndex;
  const viewDate = dateForIndex(viewIndex);
  const totalCalories = Math.round(meals.reduce((s, m) => s + (m.nutrition?.calories || m.calories || 0), 0));
  const totalProtein = Math.round(meals.reduce((s, m) => s + ((m.nutrition || m.macros || {}).protein || 0), 0));

  let upNextIdx = -1;
  if (isTodayView) {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    for (let i = 0; i < meals.length; i++) {
      const tm = parseTimeToMinutes(meals[i].time || meals[i].recommended_time);
      if (tm != null && tm >= nowMin) { upNextIdx = i; break; }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={26} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShiftStart} style={styles.headerDate} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}>
            <Text style={[styles.headerDateText, { color: themeColor }]}>{rangeLabel || `${days.length} days`}</Text>
            <Text style={[styles.headerDateChev, { color: themeColor }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Plan title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={3}>{mealPlanName || 'Your meal plan'}</Text>
        </View>

        {/* Weekday rail — spread evenly across the width when the days fit;
            fall back to a scroll only if there are too many to fit. */}
        {(() => {
          const chips = days.map((_, i) => {
            const d = dateForIndex(i);
            const wd = d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
            const isViewing = i === viewIndex;
            const isTodayChip = todayInRange && i === activeIndex;
            return (
              <TouchableOpacity key={i} style={styles.chip} activeOpacity={0.7} onPress={() => goToDay(i)}>
                <Text style={[styles.chipWd, isViewing && { color: themeColor }]}>{wd}</Text>
                <View style={[styles.chipDay, isViewing && { backgroundColor: themeColor }]}>
                  <Text style={[styles.chipDayText, isViewing && { color: '#06262b', fontWeight: '600' }]}>{d.getDate()}</Text>
                </View>
                <View style={[styles.chipDot, isTodayChip && !isViewing && { backgroundColor: themeColor }]} />
              </TouchableOpacity>
            );
          });
          return (
            <View style={styles.railWrap}>
              {days.length <= 8 ? (
                <View style={styles.railRow}>{chips}</View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railContent}>{chips}</ScrollView>
              )}
            </View>
          );
        })()}

        {/* DAY CARD — menu style. Whole day boxed in one outlined card. */}
        <TouchableOpacity 
          activeOpacity={0.85} 
          onPress={() => openDay(viewIndex)}
          onLongPress={() => handleDayLongPress(viewIndex)} 
          delayLongPress={600} 
          style={styles.dayCard}
        >
          <View style={styles.dayCardHead}>
            <Text style={[styles.dayOverline, { color: isTodayView ? themeColor : MUTED }]}>{isTodayView ? 'Today · ' : ''}Day {viewIndex + 1}</Text>
            <Text style={styles.dayHeadline}>{viewDate.toLocaleDateString('en-US', { weekday: 'long' })}</Text>
            <Text style={styles.daySubline}>
              <Text style={styles.daySublineNum}>{totalProtein}g</Text> protein · {totalCalories.toLocaleString()} kcal
            </Text>
          </View>

          {meals.length === 0 ? (
            <Text style={styles.cardEmpty}>No meals yet for this day.</Text>
          ) : (
            <View style={styles.mealList}>
              {meals.map((m: any, i: number) => {
                const name = m.name || m.meal_name || 'Meal';
                const time = m.time || m.recommended_time;
                const slot = m.type || m.meal_type;
                const isUpNext = i === upNextIdx;
                const isLast = i === meals.length - 1;
                const sub = [time, isUpNext ? 'up next' : slot].filter(Boolean).join(' · ');
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.7}
                    onPress={() => openDay(viewIndex)}
                    style={[styles.mealRow, isLast && styles.mealRowLast, isUpNext && { backgroundColor: `${themeColor}0D`, borderLeftColor: themeColor }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.mealName, isUpNext && { color: '#ffffff' }]}>{name}</Text>
                      {!!sub && <Text style={[styles.mealMeta, isUpNext && { color: themeColor }]}>{sub}</Text>}
                    </View>
                    <Text style={[styles.mealChev, isUpNext && { color: themeColor }]}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </TouchableOpacity>

        {/* THIS WEEK — "the bill": understated serif line items. */}
        {(hasGrocery || hasPrep) && (
          <>
            <Text style={styles.sectionLabel}>This week · one-off setup</Text>
            <View style={styles.billWrap}>
              {hasGrocery && (
                <TouchableOpacity style={[styles.billItem, shoppingDone && styles.billItemDone]} activeOpacity={0.7} onPress={openGrocery}>
                  <View style={styles.billRow}>
                    <Text style={[styles.billName, shoppingDone && styles.billNameDone]}>Shopping list</Text>
                    <View style={styles.leader} />
                    <Text style={styles.billFigure}>{currency}{currency.length > 1 ? ' ' : ''}{actualGroceryTotal.toFixed(0)}</Text>
                    <Text style={styles.billChev}>›</Text>
                  </View>
                  <Text style={styles.billMeta}>{shoppingDone ? 'Done · ' : ''}{groceryItemCount} {groceryItemCount === 1 ? 'item' : 'items'}</Text>
                </TouchableOpacity>
              )}
              {hasPrep && (
                <TouchableOpacity style={[styles.billItem, prepDone && styles.billItemDone]} activeOpacity={0.7} onPress={openPrep}>
                  <View style={styles.billRow}>
                    <Text style={[styles.billName, prepDone && styles.billNameDone]}>Meal prep</Text>
                    <View style={styles.leader} />
                    <Text style={styles.billFigure}>{prepActiveMinutes > 0 ? `${prepActiveMinutes} min` : (prepMealCount > 0 ? `${prepMealCount}` : '')}</Text>
                    <Text style={styles.billChev}>›</Text>
                  </View>
                  <Text style={styles.billMeta}>{prepMealCount > 0 ? `${prepDone ? 'Done · ' : ''}${prepMealCount} ${prepMealCount === 1 ? 'meal' : 'meals'}` : 'Tap to view'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {showDatePicker && (
        <DatePickerSheet value={selectedDate} themeColor={themeColor} onChange={onDateChange} onCancel={() => setShowDatePicker(false)} onConfirm={handleDateConfirm} />
      )}
    </SafeAreaView>
  );
}

function DatePickerSheet({ value, themeColor, onChange, onCancel, onConfirm }: {
  value: Date;
  themeColor: string;
  onChange: (e: any, d?: Date) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.datePickerSheet, { paddingBottom: insets.bottom + 18 }]}>
      <Text style={styles.datePickerTitle}>When should day 1 begin?</Text>
      <DateTimePicker
        value={value}
        mode="date"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        onChange={onChange}
        {...(Platform.OS === 'ios' ? { themeVariant: 'dark', textColor: '#ffffff' } : {})}
      />
      {Platform.OS === 'ios' && (
        <View style={styles.datePickerButtons}>
          <TouchableOpacity style={[styles.datePickerButton, { backgroundColor: themeColor }]} onPress={onConfirm} activeOpacity={0.85}>
            <Text style={styles.confirmButtonText}>Update start date</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.datePickerButton, styles.cancelButton]} onPress={onCancel} activeOpacity={0.8}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CANVAS },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 44 },
  backButton: { padding: 6 },
  headerDate: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  headerDateText: { fontSize: 11, letterSpacing: 2, fontWeight: '600', textTransform: 'uppercase' },
  headerDateChev: { fontSize: 14, fontWeight: '400' },

  titleBlock: { paddingHorizontal: 20, paddingTop: 2, paddingBottom: 12 },
  title: { fontFamily: SERIF, fontSize: 26, fontWeight: '400', color: '#ffffff', letterSpacing: -0.4, lineHeight: 31 },

  // Weekday rail
  railWrap: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#141417', marginTop: 6 },
  railRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10 },
  railContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 4 },
  chip: { alignItems: 'center', gap: 5 },
  chipWd: { fontSize: 11, color: FAINT },
  chipDay: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chipDayText: { fontSize: 14, color: '#cfcfd4' },
  chipDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'transparent' },

  // Day card (menu style)
  dayCard: { marginHorizontal: 16, marginTop: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)', borderRadius: 20, backgroundColor: '#0c0c10', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 4 },
  dayCardHead: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1a1a1e', paddingBottom: 15 },
  dayOverline: { fontSize: 10, letterSpacing: 2, fontWeight: '600', textTransform: 'uppercase' },
  dayHeadline: { fontFamily: SERIF, fontStyle: 'italic', fontSize: 30, color: '#ffffff', marginTop: 5 },
  daySubline: { fontSize: 12, color: MUTED, marginTop: 9, letterSpacing: 0.3 },
  daySublineNum: { fontFamily: SERIF, fontSize: 16, color: '#ffffff' },

  cardEmpty: { fontSize: 14, color: MUTED, paddingVertical: 20, textAlign: 'center' },
  mealList: { paddingTop: 2 },
  mealRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14, marginHorizontal: -18, paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#18181c', borderLeftWidth: 2, borderLeftColor: 'transparent' },
  mealRowLast: { borderBottomWidth: 0 },
  mealName: { fontFamily: SERIF, fontSize: 16, color: '#e8e8ea' },
  mealMeta: { fontSize: 10, letterSpacing: 1, color: MUTED, textTransform: 'uppercase', marginTop: 4 },
  mealChev: { fontFamily: SERIF, fontSize: 18, color: '#5a5a60', marginLeft: 10 },

  // THIS WEEK — the bill
  sectionLabel: { fontSize: 10, letterSpacing: 2, color: FAINT, fontWeight: '600', textTransform: 'uppercase', paddingHorizontal: 22, marginTop: 26, marginBottom: 6 },
  billWrap: { paddingHorizontal: 22 },
  billItem: { paddingBottom: 8 },
  billItemDone: { opacity: 0.5 },
  billRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 14 },
  billName: { fontFamily: SERIF, fontSize: 16, color: '#e8e8ea' },
  billNameDone: { textDecorationLine: 'line-through', color: MUTED },
  leader: { flex: 1, borderBottomWidth: 1, borderColor: '#2a2a30', borderStyle: 'dashed', marginHorizontal: 10 },
  billFigure: { fontFamily: SERIF, fontSize: 16, color: '#ffffff' },
  billChev: { fontSize: 16, color: '#4a4a50', marginLeft: 10 },
  billMeta: { fontSize: 10, letterSpacing: 1, color: FAINT, textTransform: 'uppercase', marginTop: 3 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontFamily: SERIF, fontSize: 24, fontWeight: '400', color: '#ffffff', marginTop: 16 },
  emptyDescription: { fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 4 },

  datePickerSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#141417', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#1e1e22', paddingTop: 18, paddingBottom: 34 },
  datePickerTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', textAlign: 'center', marginBottom: 4 },
  datePickerButtons: { flexDirection: 'column', gap: 10, paddingHorizontal: 18, paddingTop: 8 },
  datePickerButton: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: '#27272a' },
  cancelButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  confirmButtonText: { color: '#06181c', fontWeight: '700', fontSize: 16 },
});