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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { CURATED_MEALS } from '../data/curated_meals';
import { CuratedMeal } from '../types/curated_meals';
import { getMealImage } from '../assets/mealImages';

type SmoothiesLibraryNavigationProp = StackNavigationProp<
  RootStackParamList,
  'SmoothiesLibrary'
>;

// Content width is capped so cards don't stretch to unreasonable sizes on
// tablets/resized windows — see cardWidth in the component below.
// Responsive: hold the card near TARGET_CARD_WIDTH and let the column count
// grow with the screen, instead of fixing 2 columns and capping content width.
// The old cap kept card size sane but left a 13" iPad using ~68% of its width.
// Driven by available width rather than a Platform.isPad check, so an iPad in
// Split View correctly falls back to the phone's 2-column layout.
//    iPhone 393pt -> 2 cols · iPad 1032pt -> 3 cols · iPad landscape -> 4 cols
const GRID_HORIZONTAL_PADDING = 16;
const GRID_GAP = 10;
const TARGET_CARD_WIDTH = 320;
const MIN_COLUMNS = 2;

// ============================================================================
// HELPERS
// ============================================================================

function getCardSummary(meal: CuratedMeal) {
  const firstPlate = meal.plates?.[0];
  return {
    kcal: firstPlate?.plate_macros?.kcal ?? 0,
    protein: firstPlate?.plate_macros?.protein_g ?? 0,
    carbs: firstPlate?.plate_macros?.carbs_g ?? 0,
    fat: firstPlate?.plate_macros?.fat_g ?? 0,
  };
}

// Simplified smoothies screen - no filters needed since it's a small set

// ============================================================================
// COMPONENT
// ============================================================================

export default function SmoothiesLibraryScreen() {
  const navigation = useNavigation<SmoothiesLibraryNavigationProp>();
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

  const allSmoothies = useMemo(
    () => Object.values(CURATED_MEALS).filter(m => m.cuisine === 'smoothie'),
    []
  );

  // ===== Handlers =====

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSmoothiePress = useCallback(
    (smoothie: CuratedMeal) => {
      navigation.navigate('RecipeDetail', { mealSlug: smoothie.slug });
    },
    [navigation]
  );

  // ===== Render =====

  const renderCard = useCallback(
    ({ item: smoothie }: { item: CuratedMeal }) => {
      const { kcal, protein, carbs, fat } = getCardSummary(smoothie);
      const imageSource = getMealImage(smoothie.image_filename);

      return (
        <TouchableOpacity
          style={[styles.card, { width: cardWidth }]}
          activeOpacity={0.85}
          onPress={() => handleSmoothiePress(smoothie)}
        >
          <View style={styles.cardImageWrap}>
            {imageSource ? (
              <Image 
                source={imageSource} 
                style={styles.cardImage} 
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                <Ionicons name="cafe-outline" size={24} color="#52525b" />
              </View>
            )}
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {smoothie.plates?.[0]?.display_name || smoothie.display_name}
            </Text>
            {/* Smoothies don't need active-time labelling — they're all 4-5 min.
                Just show calories which is the differentiating factor. */}
            <Text style={styles.cardMeta}>{kcal} kcal · 5m blend</Text>

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
    [handleSmoothiePress, themeColor, cardWidth]
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <View style={styles.container}>
      {/* ====================================================================
          NAV HEADER — no sort button here since smoothies are a small set
          and re-ordering doesn't add much. Keeps the header symmetrical.
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
          <Text style={styles.headerTitle}>Smoothies</Text>
          <Text style={styles.headerSubtitle}>{allSmoothies.length} recipes</Text>
        </View>

        {/* Empty right slot — keeps the title perfectly centred. */}
        <View style={styles.headerSide} />
      </View>


      {/* ====================================================================
          GRID
      ==================================================================== */}
      <FlatList
        data={allSmoothies}
        renderItem={renderCard}
        keyExtractor={item => item.slug}
        // FlatList cannot change numColumns on a live instance — the key forces
        // a remount when rotation moves us between 3 and 4 columns.
        key={`grid-${columns}`}
        numColumns={columns}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[
          styles.gridContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews
      />
    </View>
  );
}

// ============================================================================
// STYLES — identical to MealsLibraryScreen for visual consistency. Both
// screens should feel like the same component with different data. If you
// want to DRY this up, extract a shared LibraryScreen component, but inline
// duplication is easier to tweak per-screen during the design polish phase.
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