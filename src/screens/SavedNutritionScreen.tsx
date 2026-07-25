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
import { WorkoutStorage, MealPlan } from '../utils/storage';
import RecipeFavorites from '../utils/recipeFavorites';
import { CURATED_MEALS } from '../data/curated_meals';
import { CuratedMeal } from '../types/curated_meals';
import { getMealImage } from '../assets/mealImages';
import SavedSegmentedControl from '../components/SavedSegmentedControl';
import {
  dedupeByKey,
  formatTime,
  getRecipeSummary,
  getPlanDailyAverages,
} from '../utils/savedItems';

type Segment = 'meals' | 'plans';

/**
 * SavedNutritionScreen — the Nutrition tab's saved content, reached from the
 * "Saved" pill in NutritionHomeScreen's title row.
 *
 * Both segments were lifted out of the old Library tab unchanged:
 *   - Meals: favourited curated recipes (RecipeFavorites → CURATED_MEALS),
 *     compact thumbnail rows. Heart un-saves instantly (optimistic).
 *   - Plans: saved meal plans, mini stat grid card. Tap → MealPlanPreview,
 *     ••• or long-press → confirm remove.
 *
 * Registered inside NutritionThemeProvider in AppNavigator, so useTheme() here
 * resolves to the green accent (gotcha 3 — a root-stack nutrition screen loses
 * green otherwise).
 */
export default function SavedNutritionScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const [segment, setSegment] = useState<Segment>('meals');
  const [savedRecipes, setSavedRecipes] = useState<CuratedMeal[]>([]);
  const [savedPlans, setSavedPlans] = useState<MealPlan[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadSaved = useCallback(async () => {
    try {
      const [recipeSlugs, plans] = await Promise.all([
        RecipeFavorites.loadFavoriteSlugs(),
        WorkoutStorage.loadMealPlans(),
      ]);

      // Resolve slugs → meals at render time (single source of truth), drop
      // any slug that no longer maps to a meal, then de-dupe by slug.
      const recipes = recipeSlugs
        .map((slug) => (CURATED_MEALS as any)[slug] as CuratedMeal | undefined)
        .filter(Boolean) as CuratedMeal[];
      setSavedRecipes(dedupeByKey(recipes, (r) => r.slug));

      // De-dupe on fingerprint||id so a plan that exists twice in storage only
      // renders once (and never collides on a React key).
      setSavedPlans(
        dedupeByKey(Array.isArray(plans) ? plans : [], (p) => p.fingerprint || p.id || '')
      );
    } catch (error) {
      console.error('Failed to load saved nutrition:', error);
      setSavedRecipes([]);
      setSavedPlans([]);
    }
  }, []);

  // Reload on focus so hearts stay in sync with NutritionHomeScreen when the
  // user navigates back and forth.
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

  // RecipeDetail expects { mealSlug: string } — NOT the whole meal object.
  const openRecipe = (recipe: CuratedMeal) => {
    navigation.navigate('RecipeDetail' as any, { mealSlug: recipe.slug });
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

  // Tap a saved meal plan → summary/preview screen (mirrors workouts). The
  // full plan views (MealPlanDays / MealPlanWeeks) are still reached from
  // NutritionHomeScreen for the active plan; here we show a summary + import
  // CTA instead of dropping straight into the full plan.
  const openMealPlan = (plan: MealPlan) => {
    navigation.navigate('MealPlanPreview' as any, { plan });
  };

  const removeMealPlan = (plan: MealPlan) => {
    Alert.alert(
      'Remove from saved?',
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

  const hasItems = segment === 'meals' ? savedRecipes.length > 0 : savedPlans.length > 0;

  return (
    <View style={styles.container}>
      {/* Header — back chevron + title */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved</Text>
        {/* Balances the back button so the title stays optically centred */}
        <View style={styles.headerSpacer} />
      </View>

      <SavedSegmentedControl
        segments={[
          { key: 'meals', label: 'Meals', count: savedRecipes.length },
          { key: 'plans', label: 'Plans', count: savedPlans.length },
        ]}
        value={segment}
        onChange={(key) => setSegment(key as Segment)}
      />

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
        {!hasItems ? (
          <View style={styles.emptyHero}>
            <View style={[styles.emptyIcon, { borderColor: themeColor }]}>
              <Ionicons
                name={segment === 'meals' ? 'heart-outline' : 'restaurant-outline'}
                size={36}
                color={themeColor}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {segment === 'meals' ? 'No saved meals yet' : 'No saved meal plans yet'}
            </Text>
            <Text style={styles.emptyBody}>
              {segment === 'meals'
                ? 'Tap the heart on any meal to save it here.'
                : 'Tap the ••• on any meal plan and choose Save to keep it here.'}
            </Text>
            {segment === 'meals' && (
              <TouchableOpacity
                style={[styles.emptyButton, { borderColor: themeColor }]}
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
              >
                <Text style={[styles.emptyButtonText, { color: themeColor }]}>
                  Browse meals
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : segment === 'meals' ? (
          // ================= MEALS — thumbnail rows =================
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
        ) : (
          // ================= PLANS — mini stat grid cards =================
          savedPlans.map((plan, index) => {
            const duration = plan.duration || 0;
            // Real numbers from the plan's actual days — the old
            // target_calories field never existed on saved plans, so the kcal
            // cell was a permanent "—".
            const averages = getPlanDailyAverages(plan);
            return (
              <View key={`plan-${plan.id}-${index}`} style={styles.statCard}>
                <TouchableOpacity
                  style={styles.cardMenuBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    removeMealPlan(plan);
                  }}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${plan.name} from saved`}
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

  // ===== Header =====
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 48,
  },
  emptyScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },

  // ===== Stat card (meal plans) =====
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

  // ===== Empty state =====
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
