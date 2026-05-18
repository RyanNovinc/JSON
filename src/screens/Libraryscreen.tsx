import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { TouchableOpacity as GHTouchable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutStorage, WorkoutRoutine, MealPlan } from '../utils/storage';

type Segment = 'workouts' | 'meals';

/**
 * LibraryScreen — your saved workouts and meal plans.
 *
 * Cards now use the mini stat grid pattern (matches WorkoutPreviewScreen
 * and the JSON.fit share page):
 *   - Title at top
 *   - Hairline divider
 *   - 3-column grid with cyan numbers + gray labels
 *
 * Tap workout → WorkoutPreviewScreen
 * Tap meal plan → MealPlanDays / MealPlanWeeks based on shape
 * Long-press → confirm remove from library
 */
export default function LibraryScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const [segment, setSegment] = useState<Segment>('workouts');
  const [savedWorkouts, setSavedWorkouts] = useState<WorkoutRoutine[]>([]);
  const [savedMeals, setSavedMeals] = useState<MealPlan[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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

  // Tap a saved workout → preview screen
  const openWorkout = (routine: WorkoutRoutine) => {
    navigation.navigate('WorkoutPreview' as any, { routine });
  };

  // Tap a saved meal plan → appropriate view based on data shape
  const openMealPlan = (plan: MealPlan) => {
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
    if (plan.data?.weeks && plan.data.weeks.length === 1) {
      navigation.navigate('MealPlanDays' as any, {
        week: plan.data.weeks[0],
        mealPlanName: plan.name,
      });
      return;
    }
    navigation.navigate('MealPlanDays' as any, {
      planId: plan.id,
      planName: plan.name,
    });
  };

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

  // ===== Compute weeks label for a routine (e.g. "4wk" from "1-4") =====
  const getWeeksLabel = (routine: WorkoutRoutine): string => {
    const blocks = routine.data?.blocks;
    if (!Array.isArray(blocks) || blocks.length === 0) return '—';
    const w = blocks[0].weeks;
    if (typeof w === 'string') {
      const match = w.match(/(\d+)-?(\d+)?/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : start;
        return `${end - start + 1}wk`;
      }
    }
    return '—';
  };

  const items = segment === 'workouts' ? savedWorkouts : savedMeals;
  const hasItems = items.length > 0;
  const workoutsActive = segment === 'workouts';
  const mealsActive = segment === 'meals';

  return (
    <View style={styles.container}>
      <View style={[styles.titleBar, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.title}>Library</Text>
      </View>

      {/* ============================================================
          Underline tabs (kept as-is)
          ============================================================ */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          onPress={() => setSegment('workouts')}
          activeOpacity={0.7}
          style={[
            styles.tab,
            { borderBottomColor: workoutsActive ? themeColor : 'transparent' },
          ]}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: workoutsActive ? '600' : '500',
              color: workoutsActive ? '#ffffff' : '#71717a',
              textAlign: 'center',
            }}
          >
            Workouts
            <Text
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: workoutsActive ? '#a1a1aa' : '#52525b',
              }}
            >
              {'  '}{savedWorkouts.length}
            </Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSegment('meals')}
          activeOpacity={0.7}
          style={[
            styles.tab,
            { borderBottomColor: mealsActive ? themeColor : 'transparent' },
          ]}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: mealsActive ? '600' : '500',
              color: mealsActive ? '#ffffff' : '#71717a',
              textAlign: 'center',
            }}
          >
            Meal plans
            <Text
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: mealsActive ? '#a1a1aa' : '#52525b',
              }}
            >
              {'  '}{savedMeals.length}
            </Text>
          </Text>
        </TouchableOpacity>
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
            savedWorkouts.map(routine => {
              const weeksLabel = getWeeksLabel(routine);
              const blocksCount = routine.blocks || routine.data?.blocks?.length || 0;
              return (
                <GHTouchable
                  key={routine.id}
                  style={styles.statCard}
                  activeOpacity={0.85}
                  onPress={() => openWorkout(routine)}
                  onLongPress={() => removeWorkout(routine)}
                  delayLongPress={600}
                >
                  <Text style={styles.cardTitle} numberOfLines={1}>{routine.name}</Text>
                  <View style={styles.miniStatGrid}>
                    <View style={styles.miniStatCell}>
                      <Text style={[styles.miniStatValue, { color: themeColor }]}>
                        {routine.days || '—'}
                      </Text>
                      <Text style={styles.miniStatLabel}>days/wk</Text>
                    </View>
                    <View style={styles.miniStatDivider} />
                    <View style={styles.miniStatCell}>
                      <Text style={[styles.miniStatValue, { color: themeColor }]}>
                        {weeksLabel}
                      </Text>
                      <Text style={styles.miniStatLabel}>program</Text>
                    </View>
                    <View style={styles.miniStatDivider} />
                    <View style={styles.miniStatCell}>
                      <Text style={[styles.miniStatValue, { color: themeColor }]}>
                        {blocksCount || '—'}
                      </Text>
                      <Text style={styles.miniStatLabel}>
                        {blocksCount === 1 ? 'block' : 'blocks'}
                      </Text>
                    </View>
                  </View>
                </GHTouchable>
              );
            })
          ) : (
            savedMeals.map(plan => {
              const duration = plan.duration || 0;
              const mealsCount = plan.meals || 0;
              // Try to extract daily kcal target if available
              const kcalTarget = plan.data?.target_calories || plan.data?.daily_calories || null;
              return (
                <GHTouchable
                  key={plan.id}
                  style={styles.statCard}
                  activeOpacity={0.85}
                  onPress={() => openMealPlan(plan)}
                  onLongPress={() => removeMealPlan(plan)}
                  delayLongPress={600}
                >
                  <Text style={styles.cardTitle} numberOfLines={1}>{plan.name}</Text>
                  <View style={styles.miniStatGrid}>
                    <View style={styles.miniStatCell}>
                      <Text style={[styles.miniStatValue, { color: themeColor }]}>
                        {duration || '—'}
                      </Text>
                      <Text style={styles.miniStatLabel}>
                        {duration === 1 ? 'day' : 'days'}
                      </Text>
                    </View>
                    <View style={styles.miniStatDivider} />
                    <View style={styles.miniStatCell}>
                      <Text style={[styles.miniStatValue, { color: themeColor }]}>
                        {mealsCount || '—'}
                      </Text>
                      <Text style={styles.miniStatLabel}>meals</Text>
                    </View>
                    <View style={styles.miniStatDivider} />
                    <View style={styles.miniStatCell}>
                      <Text style={[styles.miniStatValue, { color: themeColor }]}>
                        {kcalTarget ? Math.round(kcalTarget).toLocaleString() : '—'}
                      </Text>
                      <Text style={styles.miniStatLabel}>kcal/day</Text>
                    </View>
                  </View>
                </GHTouchable>
              );
            })
          )
        ) : (
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
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.4,
  },

  // ===== Underline tab row =====
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    borderBottomWidth: 2,
    marginBottom: -StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 48,
  },
  emptyScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },

  // ===== Stat card (replaces the old itemCard) =====
  statCard: {
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 14,
  },

  // ===== Mini stat grid (inside each card) =====
  miniStatGrid: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  miniStatCell: {
    flex: 1,
    alignItems: 'center',
  },
  miniStatDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#27272a',
    marginVertical: 2,
  },
  miniStatValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  miniStatLabel: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 4,
    letterSpacing: 0.2,
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