import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { CURATED_MEALS } from '../data/curated_meals';
import { CuratedMeal, CuisineType } from '../types/curated_meals';
import { getMealImage } from '../assets/mealImages';

type MealsLibraryNavigationProp = StackNavigationProp<RootStackParamList, 'MealsLibrary'>;
type MealsLibraryRouteProp = RouteProp<RootStackParamList, 'MealsLibrary'>;

// ============================================================================
// LAYOUT MATH
// ============================================================================
// Responsive grid: the CARD width is held roughly constant and the COLUMN COUNT
// grows with the screen, rather than the old approach of fixing 2 columns and
// capping content width at 700. That cap kept card size sane but left a 13"
// iPad using only ~68% of its width, with the last third empty — a phone layout
// stranded on a tablet.
//
// scrollContent padding 16 each side; inter-card gap 10.
// Columns = as many ~320pt cards as fit, never fewer than 2:
//    iPhone   390pt -> 2 columns, ~174pt cards (unchanged from before)
//    iPad     1032pt -> 3 columns, ~326pt cards
//    iPad LS  1376pt -> 4 columns, ~328pt cards
// Card width then divides the full available width, so nothing is left empty.
const GRID_HORIZONTAL_PADDING = 16;
const GRID_GAP = 10;
const TARGET_CARD_WIDTH = 320;
const MIN_COLUMNS = 2;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Same shape as NutritionHomeScreen.getCardSummary, but exposes both active
 * and total time. Active time is what matters for the meta line — pulled
 * pork's 8 hour slow-cook is mostly hands-off and the user just needs to
 * know they spend 30 minutes actually working.
 */
function getCardSummary(meal: CuratedMeal) {
  const firstPlate = meal.plates?.[0];
  const firstMethod = meal.methods?.[0];

  return {
    kcal: firstPlate?.plate_macros?.kcal ?? 0,
    protein: firstPlate?.plate_macros?.protein_g ?? 0,
    carbs: firstPlate?.plate_macros?.carbs_g ?? 0,
    fat: firstPlate?.plate_macros?.fat_g ?? 0,
    activeMinutes: firstMethod?.time_active_minutes ?? 0,
    totalMinutes: firstMethod?.time_total_minutes ?? 0,
  };
}

function formatActiveTime(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

// Cuisine label mapping — keys match CuisineType, values are display strings.
// 'breakfast' and 'mediterranean' aren't in current data but kept for future-proofing.
const CUISINE_LABELS: Record<CuisineType, string> = {
  australian: 'Australian',
  mediterranean: 'Mediterranean',
  asian: 'Asian',
  indian: 'Indian',
  mexican: 'Mexican',
  breakfast: 'Breakfast',
  italian: 'Italian',
  smoothie: 'Smoothie',
  thai: 'Thai',
  snack: 'Snack',
  dessert: 'Dessert',
};

type SortMode = 'name' | 'calories' | 'protein' | 'active_time';

const SORT_LABELS: Record<SortMode, string> = {
  name: 'Name',
  calories: 'Calories',
  protein: 'Protein',
  active_time: 'Active time',
};

const SORT_ORDER: SortMode[] = ['name', 'calories', 'protein', 'active_time'];

// ============================================================================
// COMPONENT
// ============================================================================

export default function MealsLibraryScreen() {
  const navigation = useNavigation<MealsLibraryNavigationProp>();
  const route = useRoute<MealsLibraryRouteProp>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { columns, cardWidth } = useMemo(() => {
    const available = windowWidth - GRID_HORIZONTAL_PADDING * 2;
    const cols = Math.max(
      MIN_COLUMNS,
      Math.floor((available + GRID_GAP) / (TARGET_CARD_WIDTH + GRID_GAP)),
    );
    return { columns: cols, cardWidth: (available - GRID_GAP * (cols - 1)) / cols };
  }, [windowWidth]);

  // Get filtering parameters from route
  const { cuisine: routeCuisine, title: routeTitle } = route.params || {};
  
  // Check if we're showing a specific category view (no filters needed for single-category views)
  // Hide filters when showing any specific category (dessert, breakfast, snack, smoothie, mains, etc.)
  // Only keep filters for the default "all meals" view (no routeCuisine or 'all')
  const isSpecificCategory = routeCuisine && routeCuisine !== 'all';
  const shouldHideFilters = isSpecificCategory;

  // Filter meals based on route params, or default to all non-smoothie meals
  const allMeals = useMemo(() => {
    let meals = Object.values(CURATED_MEALS);
    
    // Handle special case of 'mains' - savoury main dishes (excluding leaf categories)
    if (routeCuisine === 'mains') {
      const LEAF = new Set(['breakfast', 'snack', 'dessert', 'smoothie']);
      meals = meals.filter(m => !LEAF.has(m.cuisine));
    } else if (routeCuisine && routeCuisine !== 'all') {
      // Filter by specific cuisine
      meals = meals.filter(m => m.cuisine === routeCuisine);
    } else {
      // Default: all non-smoothie meals
      meals = meals.filter(m => m.cuisine !== 'smoothie');
    }
    
    return meals;
  }, [routeCuisine]);

  // Derive cuisine chips from actual data. Stable order: alpha sort.
  // This way the chip row stays in sync as meals are added.
  const availableCuisines = useMemo(() => {
    const cuisines = new Set(allMeals.map(m => m.cuisine));
    return Array.from(cuisines).sort() as CuisineType[];
  }, [allMeals]);

  // State - set initial cuisine based on route params
  const [activeCuisine, setActiveCuisine] = useState<CuisineType | 'all'>(
    routeCuisine && routeCuisine !== 'all' ? routeCuisine as CuisineType : 'all'
  );
  const [sortMode, setSortMode] = useState<SortMode>('name');

  // Apply filter then sort
  const displayedMeals = useMemo(() => {
    // If showing a specific category (e.g. mains, dessert), allMeals is already filtered
    // Only apply additional filtering for the default "all meals" view
    const filtered = isSpecificCategory 
      ? allMeals
      : (activeCuisine === 'all'
          ? allMeals
          : allMeals.filter(m => m.cuisine === activeCuisine));

    const sorted = [...filtered];
    switch (sortMode) {
      case 'name':
        sorted.sort((a, b) =>
          (a.plates[0]?.display_name || a.display_name).localeCompare(
            b.plates[0]?.display_name || b.display_name
          )
        );
        break;
      case 'calories':
        // Descending — bulkers want to see the highest first
        sorted.sort(
          (a, b) =>
            (b.plates[0]?.plate_macros?.kcal ?? 0) -
            (a.plates[0]?.plate_macros?.kcal ?? 0)
        );
        break;
      case 'protein':
        sorted.sort(
          (a, b) =>
            (b.plates[0]?.plate_macros?.protein_g ?? 0) -
            (a.plates[0]?.plate_macros?.protein_g ?? 0)
        );
        break;
      case 'active_time':
        // Ascending — quickest first, more useful default
        sorted.sort(
          (a, b) =>
            (a.methods[0]?.time_active_minutes ?? 0) -
            (b.methods[0]?.time_active_minutes ?? 0)
        );
        break;
    }
    return sorted;
  }, [allMeals, activeCuisine, sortMode, isSpecificCategory]);

  // ===== Handlers =====

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleMealPress = useCallback(
    (meal: CuratedMeal) => {
      navigation.navigate('RecipeDetail', { mealSlug: meal.slug });
    },
    [navigation]
  );

  // Cycle through sort modes on icon tap.
  // Could be a bottom sheet but a single tap-to-cycle is much simpler
  // and the label below the icon tells you the current mode.
  const handleSortPress = useCallback(() => {
    const currentIdx = SORT_ORDER.indexOf(sortMode);
    const nextIdx = (currentIdx + 1) % SORT_ORDER.length;
    setSortMode(SORT_ORDER[nextIdx]);
  }, [sortMode]);

  // ===== Render =====

  const renderCard = useCallback(
    ({ item: meal }: { item: CuratedMeal }) => {
      const { kcal, protein, carbs, fat, activeMinutes } = getCardSummary(meal);
      const imageSource = getMealImage(meal.plates?.[0]?.image_filename ?? meal.image_filename);

      return (
        <TouchableOpacity
          style={[styles.card, { width: cardWidth }]}
          activeOpacity={0.85}
          onPress={() => handleMealPress(meal)}
        >
          <View style={styles.cardImageWrap}>
            {imageSource ? (
              <Image 
                source={imageSource} 
                style={styles.cardImage} 
                resizeMode="cover"
                fadeDuration={200}
                loadingIndicatorSource={{ uri: 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==' }}
              />
            ) : (
              <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                <Ionicons name="restaurant-outline" size={24} color="#52525b" />
              </View>
            )}
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {meal.plates?.[0]?.display_name || meal.display_name}
            </Text>
            <Text style={styles.cardMeta}>
              {formatActiveTime(activeMinutes)} active · {kcal} kcal
            </Text>

            <View style={styles.macroGrid}>
              <View style={styles.macroCell}>
                <Text style={[styles.macroValue, { color: themeColor }]}>{protein}g</Text>
                <Text style={styles.macroLabel}>PROT</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroCell}>
                <Text style={styles.macroValueMuted}>{carbs}g</Text>
                <Text style={styles.macroLabel}>CARB</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroCell}>
                <Text style={styles.macroValueMuted}>{fat}g</Text>
                <Text style={styles.macroLabel}>FAT</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [handleMealPress, themeColor, cardWidth]
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <View style={styles.container}>
      {/* ====================================================================
          NAV HEADER — back button on left, title centred, sort button on right.
          Sort button shows current mode below the icon so the user always knows
          what they're sorted by without opening a menu.
      ==================================================================== */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.headerSide}
          activeOpacity={0.7}
          onPress={handleBack}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={themeColor} />
          <Text style={[styles.headerBackText, { color: themeColor }]}>Nutrition</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{routeTitle || 'Meals'}</Text>
          <Text style={styles.headerSubtitle}>{displayedMeals.length} recipes</Text>
        </View>

        {!shouldHideFilters ? (
          <TouchableOpacity
            style={[styles.headerSide, styles.headerSortBtn]}
            activeOpacity={0.7}
            onPress={handleSortPress}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${SORT_LABELS[sortMode]}. Tap to change.`}
          >
            <Ionicons name="swap-vertical" size={20} color="#d4d4d8" />
            <Text style={styles.headerSortLabel} numberOfLines={1}>
              {SORT_LABELS[sortMode]}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSide} />
        )}
      </View>

      {/* ====================================================================
          FILTER CHIPS — cuisine chips derived from the data. "All" is always
          the first chip and is active by default. Chips are horizontally
          scrollable so adding more cuisines doesn't break the layout.
          Hidden for category views (mains, desserts, breakfast, snacks, smoothies) since filters aren't needed.
      ==================================================================== */}
      {!shouldHideFilters && (
        <View style={styles.chipRowWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRowContent}
        >
          {/* "All" chip */}
          <TouchableOpacity
            style={[
              styles.chip,
              activeCuisine === 'all' && [styles.chipActive, { backgroundColor: themeColor }],
            ]}
            activeOpacity={0.7}
            onPress={() => setActiveCuisine('all')}
          >
            <Text
              style={[
                styles.chipText,
                activeCuisine === 'all' && styles.chipTextActive,
              ]}
            >
              All · {allMeals.length}
            </Text>
          </TouchableOpacity>

          {availableCuisines.map(cuisine => {
            const count = allMeals.filter(m => m.cuisine === cuisine).length;
            const isActive = activeCuisine === cuisine;
            return (
              <TouchableOpacity
                key={cuisine}
                style={[
                  styles.chip,
                  isActive && [styles.chipActive, { backgroundColor: themeColor }],
                ]}
                activeOpacity={0.7}
                onPress={() => setActiveCuisine(cuisine)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {CUISINE_LABELS[cuisine]} · {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      )}

      {/* ====================================================================
          GRID — 2 columns, FlatList for windowing.
          Empty state if a filter yields nothing (rare with current data, but
          will matter when meals grow).
      ==================================================================== */}
      {displayedMeals.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="restaurant-outline" size={48} color="#3f3f46" />
          <Text style={styles.emptyTitle}>No meals match</Text>
          <Text style={styles.emptyBody}>Try a different cuisine filter.</Text>
        </View>
      ) : (
        <FlatList
          data={displayedMeals}
          renderItem={renderCard}
          keyExtractor={item => item.slug}
          // FlatList cannot change numColumns on an existing instance, so the
          // key forces a remount when the device rotates between 3 and 4 columns.
          key={`grid-${columns}`}
          numColumns={columns}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[
            styles.gridContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          // Performance — optimized for smooth scrolling
          initialNumToRender={6}
          removeClippedSubviews={true}
          maxToRenderPerBatch={4}
          updateCellsBatchingPeriod={100}
          windowSize={10}
        />
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
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
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f1f23',
  },
  headerSide: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 88,
    height: 36,
  },
  headerBackText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: -2,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 1,
  },
  headerSortBtn: {
    justifyContent: 'flex-end',
    gap: 4,
  },
  headerSortLabel: {
    fontSize: 12,
    color: '#d4d4d8',
    fontWeight: '500',
    maxWidth: 70,
  },

  // ===== Filter chips =====
  chipRowWrap: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f1f23',
  },
  chipRowContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  chipActive: {
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#d4d4d8',
  },
  chipTextActive: {
    color: '#0a0a0b',
    fontWeight: '600',
  },

  // ===== Grid =====
  gridContent: {
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
    paddingTop: 14,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  // ===== Card =====
  card: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
  },
  cardImageWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#0a0a0b',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27272a',
  },
  cardBody: {
    padding: 11,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 17,
    letterSpacing: -0.2,
    minHeight: 34,
  },
  cardMeta: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 4,
    marginBottom: 9,
  },
  macroGrid: {
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  macroCell: {
    flex: 1,
    alignItems: 'center',
  },
  macroDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#27272a',
    marginVertical: 2,
  },
  macroValue: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 15,
    letterSpacing: -0.3,
  },
  macroValueMuted: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d4d4d8',
    lineHeight: 15,
    letterSpacing: -0.3,
  },
  macroLabel: {
    fontSize: 8,
    color: '#71717a',
    marginTop: 2,
    letterSpacing: 0.4,
  },

  // ===== Empty state =====
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
  },
  emptyBody: {
    fontSize: 13,
    color: '#71717a',
    marginTop: 6,
    textAlign: 'center',
  },
});