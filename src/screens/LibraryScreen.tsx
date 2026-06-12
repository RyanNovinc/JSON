import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutStorage, WorkoutRoutine, MealPlan } from '../utils/storage';
import RecipeFavorites from '../utils/recipeFavorites';
import { CURATED_MEALS } from '../data/curated_meals';
import { CuratedMeal } from '../types/curated_meals';
import { getMealImage } from '../assets/mealImages';

type Segment = 'workouts' | 'meals' | 'recipes';

// Mirrors the formatter in RecipeDetailScreen so the two screens agree:
// 5 → "5m", 45 → "45m", 60 → "1h", 90 → "1h 30m", 510 → "8h 30m".
function formatTime(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

// Collapse a list so each logical item appears once. Saved workouts / meal
// plans can end up with two entries sharing the same id (e.g. a plan re-added
// through an older save path). Duplicate ids crash the list with a
// "two children with the same key" React error AND make items bleed between
// tabs as React reconciles non-unique keys. De-duping here is a defensive
// guard so the same plan only ever renders once regardless of what storage
// hands back.
function dedupeByKey<T>(arr: T[], keyFn: (x: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const k = keyFn(item);
    if (!k || seen.has(k)) return seen.has(k) ? false : (seen.add(k), true);
    seen.add(k);
    return true;
  });
}

// Pulls the headline summary for a favourite recipe card. Reads from the
// FIRST plate + FIRST method, exactly like NutritionHomeScreen.getCardSummary
// and RecipeDetailScreen — macros live on plates[0].plate_macros, NOT on the
// meal object, and time is methods[0].time_total_minutes.
function getRecipeSummary(meal: CuratedMeal): {
  name: string;
  cuisine: string;
  kcal: number;
  protein: number;
  totalMinutes: number;
} {
  const firstPlate = meal.plates?.[0];
  const firstMethod = meal.methods?.[0];
  return {
    name: firstPlate?.display_name || meal.display_name,
    cuisine: meal.cuisine ?? '',
    kcal: firstPlate?.plate_macros?.kcal ?? 0,
    protein: firstPlate?.plate_macros?.protein_g ?? 0,
    totalMinutes: firstMethod?.time_total_minutes ?? 0,
  };
}

// Week-span helper: "1-4" → 4, "5" → 1. Same parsing as HomeScreen's
// resolveBlockPosition, so the Library and the hero badge always agree.
const spanOfWeeks = (w: any): number => {
  const s = String(w ?? '1');
  if (s.includes('-')) {
    const [lo, hi] = s.split('-').map((x: string) => parseInt(x, 10));
    return Number.isFinite(lo) && Number.isFinite(hi) && hi >= lo ? hi - lo + 1 : 1;
  }
  return 1;
};

// Average daily kcal + protein across a saved plan. Handles all three shapes a
// saved plan can take: SimplifiedMealPlan (data.dailyMeals, keyed by date),
// legacy data.days[], and legacy data.weeks[0].days[]. Keeps the Library card
// in lockstep with MealPlanPreviewScreen, which reads the same shapes — a
// saved plan stores dailyMeals, so the old days-only version always returned
// null here and the card showed "—".
const getPlanDailyAverages = (plan: MealPlan): { kcal: number; protein: number } | null => {
  const data: any = plan.data;
  let days: any[] | null = null;

  if (data?.dailyMeals && typeof data.dailyMeals === 'object') {
    days = Object.values(data.dailyMeals);
  } else if (data?.days?.length) {
    days = data.days;
  } else if (data?.weeks?.[0]?.days?.length) {
    days = data.weeks[0].days;
  }
  if (!days) return null;

  let kcal = 0;
  let protein = 0;
  let n = 0;
  for (const day of days) {
    if (!day?.meals?.length) continue;
    kcal += day.meals.reduce((t: number, m: any) => t + (m.calories || 0), 0);
    protein += day.meals.reduce((t: number, m: any) => t + (m.macros?.protein || 0), 0);
    n++;
  }
  if (n === 0 || kcal === 0) return null;
  return { kcal: Math.round(kcal / n / 10) * 10, protein: Math.round(protein / n) };
};

/**
 * LibraryScreen — your saved workouts, meal plans, and favourite recipes.
 *
 * Workout / meal-plan cards use the mini stat grid pattern (matches
 * WorkoutPreviewScreen and the JSON.fit share page):
 *   - Title at top, ••• remove top-right
 *   - Hairline divider
 *   - 3-column grid with cyan numbers + gray labels
 *
 * Meal-plan stats are computed from the plan's actual days (avg kcal/day and
 * protein/day) — the old target_calories field never existed on real plans,
 * so that cell was a permanent "—". Workout "program" is the week count
 * summed across ALL blocks, matching the hero card's WEEK N OF M badge.
 *
 * Recipe cards use a compact thumbnail row (photo · name · meta · heart) since
 * favourites is a retrieval surface — density beats big imagery here.
 *
 * Tap workout → WorkoutPreviewScreen
 * Tap meal plan → MealPlanDays / MealPlanWeeks based on shape
 * Tap recipe → RecipeDetail
 * ••• or long-press workout/meal → confirm remove. Recipe heart → instant un-save.
 */
export default function LibraryScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const [segment, setSegment] = useState<Segment>('workouts');
  const [savedWorkouts, setSavedWorkouts] = useState<WorkoutRoutine[]>([]);
  const [savedMeals, setSavedMeals] = useState<MealPlan[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<CuratedMeal[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadSaved = useCallback(async () => {
    try {
      const [workouts, meals, recipeSlugs] = await Promise.all([
        WorkoutStorage.loadMyRoutines(),
        WorkoutStorage.loadMealPlans(),
        RecipeFavorites.loadFavoriteSlugs(),
      ]);

      // De-dupe on fingerprint||id so a plan that exists twice in storage only
      // renders once (and never collides on a React key).
      setSavedWorkouts(
        dedupeByKey(
          Array.isArray(workouts) ? workouts : [],
          (r) => r.fingerprint || r.id || ''
        )
      );
      setSavedMeals(
        dedupeByKey(
          Array.isArray(meals) ? meals : [],
          (p) => p.fingerprint || p.id || ''
        )
      );

      // Resolve slugs → meals at render time (single source of truth), drop
      // any slug that no longer maps to a meal, then de-dupe by slug.
      const recipes = recipeSlugs
        .map((slug) => (CURATED_MEALS as any)[slug] as CuratedMeal | undefined)
        .filter(Boolean) as CuratedMeal[];
      setSavedRecipes(dedupeByKey(recipes, (r) => r.slug));
    } catch (error) {
      console.error('Failed to load library:', error);
      setSavedWorkouts([]);
      setSavedMeals([]);
      setSavedRecipes([]);
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

  // Tap a saved meal plan → summary/preview screen (mirrors workouts).
  // The full plan views (MealPlanDays / MealPlanWeeks) are still reached from
  // NutritionHomeScreen for the active plan; from the Library we show a
  // summary + import CTA instead of dropping straight into the full plan.
  const openMealPlan = (plan: MealPlan) => {
    navigation.navigate('MealPlanPreview' as any, { plan });
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

  // Recipe un-save: optimistic — drop from local state immediately, persist in
  // the background, reload to re-sync if the write fails.
  const removeRecipe = async (recipe: CuratedMeal) => {
    setSavedRecipes((prev) => prev.filter((r) => r.slug !== recipe.slug));
    try {
      await RecipeFavorites.removeRecipeFavorite(recipe.slug);
    } catch (error) {
      console.error('Failed to remove recipe:', error);
      await loadSaved();
    }
  };

  // RecipeDetail expects { mealSlug: string } — NOT the whole meal object.
  const openRecipe = (recipe: CuratedMeal) => {
    navigation.navigate('RecipeDetail' as any, { mealSlug: recipe.slug });
  };

  // ===== Program weeks label — summed across ALL blocks (e.g. "12wk"), so
  // it agrees with the home hero's WEEK N OF M badge. =====
  const getWeeksLabel = (routine: WorkoutRoutine): string => {
    const blocks = routine.data?.blocks;
    if (!Array.isArray(blocks) || blocks.length === 0) return '—';
    const total = blocks.reduce((t: number, b: any) => t + spanOfWeeks(b?.weeks), 0);
    return total > 0 ? `${total}wk` : '—';
  };

  const items =
    segment === 'workouts' ? savedWorkouts : segment === 'meals' ? savedMeals : savedRecipes;
  const hasItems = items.length > 0;
  const workoutsActive = segment === 'workouts';
  const mealsActive = segment === 'meals';
  const recipesActive = segment === 'recipes';

  return (
    <View style={styles.container}>
      <View style={[styles.titleBar, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.title}>Library</Text>
      </View>

      {/* ============================================================
          Underline tabs
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

        <TouchableOpacity
          onPress={() => setSegment('recipes')}
          activeOpacity={0.7}
          style={[
            styles.tab,
            { borderBottomColor: recipesActive ? themeColor : 'transparent' },
          ]}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: recipesActive ? '600' : '500',
              color: recipesActive ? '#ffffff' : '#71717a',
              textAlign: 'center',
            }}
          >
            Recipes
            <Text
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: recipesActive ? '#a1a1aa' : '#52525b',
              }}
            >
              {'  '}{savedRecipes.length}
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
            savedWorkouts.map((routine, index) => {
              const weeksLabel = getWeeksLabel(routine);
              const blocksCount = routine.blocks || routine.data?.blocks?.length || 0;
              return (
                <View key={`workout-${routine.id}-${index}`} style={styles.statCard}>
                  {/* Visible remove affordance — same confirm Alert the
                      long-press triggers. Long-press still works. */}
                  <TouchableOpacity
                    style={styles.cardMenuBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      removeWorkout(routine);
                    }}
                    hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${routine.name} from library`}
                  >
                    <Ionicons name="ellipsis-horizontal" size={16} color="#a1a1aa" />
                  </TouchableOpacity>

                  <Pressable
                    onPress={() => openWorkout(routine)}
                    onLongPress={() => removeWorkout(routine)}
                    delayLongPress={600}
                  >
                  <View style={styles.cardTitleRow}>
                    <Ionicons name="barbell" size={17} color={themeColor} />
                    <Text style={styles.cardTitle} numberOfLines={1}>{routine.name}</Text>
                  </View>
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
                  </Pressable>
                </View>
              );
            })
          ) : segment === 'meals' ? (
            savedMeals.map((plan, index) => {
              const duration = plan.duration || 0;
              // Real numbers from the plan's actual days — the old
              // target_calories field never existed on saved plans, so the
              // kcal cell was a permanent "—".
              const averages = getPlanDailyAverages(plan);
              return (
                <View key={`meal-${plan.id}-${index}`} style={styles.statCard}>
                  <TouchableOpacity
                    style={styles.cardMenuBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      removeMealPlan(plan);
                    }}
                    hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${plan.name} from library`}
                  >
                    <Ionicons name="ellipsis-horizontal" size={16} color="#a1a1aa" />
                  </TouchableOpacity>

                  <Pressable
                    onPress={() => openMealPlan(plan)}
                    onLongPress={() => removeMealPlan(plan)}
                    delayLongPress={600}
                  >
                  <View style={styles.cardTitleRow}>
                    <Ionicons name="restaurant" size={17} color={themeColor} />
                    <Text style={styles.cardTitle} numberOfLines={1}>{plan.name}</Text>
                  </View>
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
                        {averages ? averages.kcal.toLocaleString() : '—'}
                      </Text>
                      <Text style={styles.miniStatLabel}>kcal/day</Text>
                    </View>
                    <View style={styles.miniStatDivider} />
                    <View style={styles.miniStatCell}>
                      <Text style={[styles.miniStatValue, { color: themeColor }]}>
                        {averages ? `${averages.protein}g` : '—'}
                      </Text>
                      <Text style={styles.miniStatLabel}>protein/day</Text>
                    </View>
                  </View>
                  </Pressable>
                </View>
              );
            })
          ) : (
            // ================= RECIPES — thumbnail rows =================
            savedRecipes.map((recipe, index) => {
              const { name, cuisine, kcal, protein, totalMinutes } = getRecipeSummary(recipe);
              const imageSource = getMealImage(recipe.image_filename);
              return (
                <TouchableOpacity
                  key={`recipe-${recipe.slug}-${index}`}
                  style={styles.recipeRow}
                  activeOpacity={0.85}
                  onPress={() => openRecipe(recipe)}
                >
                  <View style={styles.recipeImage}>
                    {imageSource ? (
                      <Image
                        source={imageSource}
                        style={styles.recipeImageSrc}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.recipeImagePlaceholder}>
                        <Ionicons name="restaurant-outline" size={22} color="#52525b" />
                      </View>
                    )}
                  </View>

                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeName} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={styles.recipeMeta} numberOfLines={1}>
                      {cuisine ? `${cuisine} · ` : ''}{formatTime(totalMinutes)}
                      {kcal ? ` · ${kcal} kcal` : ''} · {protein}g protein
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.heartButton}
                    onPress={() => removeRecipe(recipe)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${name} from favourites`}
                  >
                    <Ionicons name="heart" size={20} color={themeColor} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )
        ) : (
          <View style={styles.emptyHero}>
            <View style={[styles.emptyIcon, { borderColor: themeColor }]}>
              <Ionicons
                name={segment === 'workouts' ? 'barbell-outline' : segment === 'meals' ? 'restaurant-outline' : 'heart-outline'}
                size={36}
                color={themeColor}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {segment === 'workouts'
                ? 'No saved workouts yet'
                : segment === 'meals'
                  ? 'No saved meal plans yet'
                  : 'No saved recipes yet'}
            </Text>
            <Text style={styles.emptyBody}>
              {segment === 'workouts'
                ? 'Tap the ••• menu on any workout and choose "Save to Collection" to find it here later.'
                : segment === 'meals'
                  ? 'Tap the ••• menu on any meal plan and choose "Save to My Meals" to find it here later.'
                  : 'Tap the ♡ on any recipe to save it here for quick access.'}
            </Text>
            {segment === 'recipes' && (
              <TouchableOpacity
                style={[styles.emptyButton, { borderColor: themeColor }]}
                onPress={() => navigation.navigate('Nutrition' as any)}
              >
                <Text style={[styles.emptyButtonText, { color: themeColor }]}>
                  Browse recipes
                </Text>
              </TouchableOpacity>
            )}
          </View>
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

  // ===== Stat card (workouts + meal plans) =====
  // Surface unified with the rest of the app (#18181b / #27272a) — the old
  // #141416 / #232327 pair was the only place those values appeared.
  statCard: {
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginBottom: 12,
    position: 'relative',
  },
  cardMenuBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingRight: 28,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
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
    fontSize: 17,
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

  // ===== Recipe thumbnail row =====
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    gap: 12,
  },
  recipeImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0a0a0b',
    flexShrink: 0,
  },
  recipeImageSrc: {
    width: '100%',
    height: '100%',
  },
  recipeImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeInfo: {
    flex: 1,
    minWidth: 0,
  },
  recipeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  recipeMeta: {
    fontSize: 12,
    color: '#71717a',
  },
  heartButton: {
    padding: 4,
    flexShrink: 0,
  },

  // Empty button for recipes
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});