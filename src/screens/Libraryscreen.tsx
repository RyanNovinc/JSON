import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutStorage, WorkoutRoutine, MealPlan } from '../utils/storage';

type Segment = 'workouts' | 'meals';

/**
 * LibraryScreen — "your saved stuff" home.
 *
 * Two segments:
 *   - Workouts: saved routines from WorkoutStorage.loadMyRoutines()
 *   - Meal plans: saved meal plans from WorkoutStorage.loadMealPlans()
 *
 * Items are saved via the heart button in the action sheet on each plan's
 * home card. This screen is the place to find them again.
 *
 * Tap behavior:
 *   - Workout → navigates to Blocks screen (same as Workouts hero card)
 *   - Meal plan → navigates to MealPlanDays/MealPlanWeeks (depends on shape)
 *
 * Long-press a saved item → confirm "Remove from library?"
 */
export default function LibraryScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { themeColor, themeColorLight } = useTheme();

  const [segment, setSegment] = useState<Segment>('workouts');
  const [savedWorkouts, setSavedWorkouts] = useState<WorkoutRoutine[]>([]);
  const [savedMeals, setSavedMeals] = useState<MealPlan[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // ===== Loaders =====
  const loadSaved = useCallback(async () => {
    try {
      const [workouts, meals] = await Promise.all([
        WorkoutStorage.loadMyRoutines(),
        WorkoutStorage.loadMealPlans(),
      ]);
      setSavedWorkouts(Array.isArray(workouts) ? workouts : []);
      setSavedMeals(Array.isArray(meals) ? meals : []);
    } catch (error) {
      console.error('Failed to load library:', error);
      setSavedWorkouts([]);
      setSavedMeals([]);
    }
  }, []);

  // Reload every time the tab is focused — if user saved something on
  // Workouts/Nutrition and switches here, we want to see the new item.
  useFocusEffect(
    useCallback(() => {
      loadSaved();
    }, [loadSaved])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadSaved();
    } finally {
      setRefreshing(false);
    }
  }, [loadSaved]);

  // ===== Navigation =====
  const openWorkout = (routine: WorkoutRoutine) => {
    navigation.navigate('Blocks' as any, { routine });
  };

  const openMealPlan = (plan: MealPlan) => {
    // Match the meal plan navigation logic used elsewhere — if there's a
    // single week or short duration, go straight to MealPlanDays. Otherwise
    // open the weeks view.
    if (plan.data?.days) {
      const week = { week_number: 1, days: plan.data.days };
      navigation.navigate('MealPlanDays' as any, {
        week,
        mealPlanName: plan.name,
      });
      return;
    }
    if (plan.data?.weeks && plan.data.weeks.length > 1) {
      navigation.navigate('MealPlanWeeks' as any, { mealPlan: plan });
      return;
    }
    // Fallback for single-week plans
    if (plan.data?.weeks && plan.data.weeks.length === 1) {
      navigation.navigate('MealPlanDays' as any, {
        week: plan.data.weeks[0],
        mealPlanName: plan.name,
      });
      return;
    }
    // Last-resort fallback
    navigation.navigate('MealPlanDays' as any, {
      planId: plan.id,
      planName: plan.name,
    });
  };

  // ===== Remove from library =====
  const removeWorkout = (routine: WorkoutRoutine) => {
    Alert.alert(
      'Remove from library?',
      `"${routine.name}" will be removed from your saved workouts. Your current workout plan won't be affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const id = routine.fingerprint || routine.id;
              await WorkoutStorage.removeMyRoutine(id);
              await loadSaved();
            } catch (error) {
              console.error('Failed to remove workout:', error);
              Alert.alert('Error', 'Could not remove. Please try again.');
            }
          },
        },
      ]
    );
  };

  const removeMealPlan = (plan: MealPlan) => {
    Alert.alert(
      'Remove from library?',
      `"${plan.name}" will be removed from your saved meal plans. Your current meal plan won't be affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const id = plan.fingerprint || plan.id;
              await WorkoutStorage.removeMealPlan(id);
              await loadSaved();
            } catch (error) {
              console.error('Failed to remove meal plan:', error);
              Alert.alert('Error', 'Could not remove. Please try again.');
            }
          },
        },
      ]
    );
  };

  const items = segment === 'workouts' ? savedWorkouts : savedMeals;
  const hasItems = items.length > 0;

  return (
    <View style={styles.container}>
      {/* Title bar */}
      <View style={[styles.titleBar, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.title}>Library</Text>
      </View>

      {/* Segmented control */}
      <View style={styles.segmentContainer}>
        <View style={styles.segmentTrack}>
          <TouchableOpacity
            style={[
              styles.segmentItem,
              segment === 'workouts' && [styles.segmentItemActive, { backgroundColor: themeColor }],
            ]}
            onPress={() => setSegment('workouts')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="barbell-outline"
              size={14}
              color={segment === 'workouts' ? '#0a0a0b' : '#a1a1aa'}
            />
            <Text
              style={[
                styles.segmentLabel,
                segment === 'workouts' && styles.segmentLabelActive,
              ]}
            >
              Workouts
            </Text>
            {savedWorkouts.length > 0 && (
              <View
                style={[
                  styles.segmentBadge,
                  segment === 'workouts'
                    ? { backgroundColor: 'rgba(10,10,11,0.2)' }
                    : { backgroundColor: '#27272a' },
                ]}
              >
                <Text
                  style={[
                    styles.segmentBadgeText,
                    { color: segment === 'workouts' ? '#0a0a0b' : '#a1a1aa' },
                  ]}
                >
                  {savedWorkouts.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentItem,
              segment === 'meals' && [styles.segmentItemActive, { backgroundColor: themeColor }],
            ]}
            onPress={() => setSegment('meals')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="restaurant-outline"
              size={14}
              color={segment === 'meals' ? '#0a0a0b' : '#a1a1aa'}
            />
            <Text
              style={[
                styles.segmentLabel,
                segment === 'meals' && styles.segmentLabelActive,
              ]}
            >
              Meal plans
            </Text>
            {savedMeals.length > 0 && (
              <View
                style={[
                  styles.segmentBadge,
                  segment === 'meals'
                    ? { backgroundColor: 'rgba(10,10,11,0.2)' }
                    : { backgroundColor: '#27272a' },
                ]}
              >
                <Text
                  style={[
                    styles.segmentBadgeText,
                    { color: segment === 'meals' ? '#0a0a0b' : '#a1a1aa' },
                  ]}
                >
                  {savedMeals.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={hasItems ? styles.scrollContent : styles.emptyScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColor}
            colors={[themeColor]}
          />
        }
      >
        {hasItems ? (
          segment === 'workouts' ? (
            savedWorkouts.map(routine => (
              <TouchableOpacity
                key={routine.id}
                style={styles.itemCard}
                activeOpacity={0.8}
                onPress={() => openWorkout(routine)}
                onLongPress={() => removeWorkout(routine)}
                delayLongPress={600}
              >
                <View style={[styles.itemIcon, { backgroundColor: 'rgba(34, 211, 238, 0.1)' }]}>
                  <Ionicons name="barbell" size={18} color={themeColor} />
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{routine.name}</Text>
                  <Text style={styles.itemSub}>
                    {routine.days} days/week • {routine.blocks} {routine.blocks === 1 ? 'block' : 'blocks'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#71717a" />
              </TouchableOpacity>
            ))
          ) : (
            savedMeals.map(plan => (
              <TouchableOpacity
                key={plan.id}
                style={styles.itemCard}
                activeOpacity={0.8}
                onPress={() => openMealPlan(plan)}
                onLongPress={() => removeMealPlan(plan)}
                delayLongPress={600}
              >
                <View style={[styles.itemIcon, { backgroundColor: 'rgba(34, 211, 238, 0.1)' }]}>
                  <Ionicons name="restaurant" size={18} color={themeColor} />
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{plan.name}</Text>
                  <Text style={styles.itemSub}>
                    {plan.duration} {plan.duration === 1 ? 'day' : 'days'}
                    {plan.meals ? ` • ${plan.meals} meals` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#71717a" />
              </TouchableOpacity>
            ))
          )
        ) : (
          // EMPTY STATE
          <View style={styles.emptyHero}>
            <View style={[styles.emptyIcon, { borderColor: themeColor }]}>
              <Ionicons
                name={segment === 'workouts' ? 'barbell-outline' : 'restaurant-outline'}
                size={36}
                color={themeColor}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {segment === 'workouts' ? 'No saved workouts yet' : 'No saved meal plans yet'}
            </Text>
            <Text style={styles.emptyBody}>
              {segment === 'workouts'
                ? 'Tap the ••• menu on any workout and choose "Save to Collection" to find it here later.'
                : 'Tap the ••• menu on any meal plan and choose "Save to My Meals" to find it here later.'}
            </Text>
          </View>
        )}

        {hasItems && (
          <Text style={styles.hint}>
            Long-press an item to remove it from your library
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },

  // Title bar
  titleBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.4,
  },

  // Segmented control
  segmentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  segmentItemActive: {
    // backgroundColor applied inline (themeColor)
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  segmentLabelActive: {
    color: '#0a0a0b',
  },
  segmentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  segmentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 48,
  },
  emptyScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },

  // Item card
  itemCard: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  itemSub: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
  },

  // Empty state
  emptyHero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 24,
    borderWidth: 2,
    backgroundColor: 'rgba(34, 211, 238, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyBody: {
    fontSize: 13,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },

  // Hint
  hint: {
    fontSize: 11,
    color: '#52525b',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});