// src/screens/nutrition/MealDetailScreen.tsx
//
// Meal preview presented as an iOS modal sheet (presentation: 'formSheet').
//
// Why this exists as a screen, not a component:
//   We tried building this as a custom bottom sheet using @gorhom/bottom-sheet,
//   which works but requires Reanimated + worklets + a native rebuild. The
//   animation problems we hit (animates first time, snaps thereafter) were a
//   known library bug worked around with awkward imperative refs.
//
//   Using a native-stack screen with presentation: 'formSheet' delegates the
//   entire sheet experience to UIKit — real iOS animation, real spring
//   physics, real drag-to-dismiss with momentum, real backdrop behaviour. No
//   JS animation code. No Reanimated. No babel plugin. No native rebuild.
//   This is what the Photos / Messages / Settings apps use for their sheets.
//
// To register this screen, add to your native-stack navigator:
//     <Stack.Screen
//       name="MealDetail"
//       component={MealDetailScreen}
//       options={{
//         presentation: 'formSheet',
//         headerShown: false,
//         sheetGrabberVisible: true,
//         sheetCornerRadius: 24,
//       }}
//     />
//
// Selection state changes (Add to my week / Remove) are persisted
// immediately via saveCuratedFavorites so the parent screen reflects them
// when the sheet dismisses. The parent already reloads favorites on mount.

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { CURATED_MEALS } from '../../data/curated_meals';
import { INGREDIENTS } from '../../data/ingredients';
import { CuratedMeal, Plate, CookingMethod } from '../../types/curated_meals';
import { resolveBaseIngredients } from '../../utils/resolveMealIngredients';
import { getMealImage } from '../../assets/mealImages';
import {
  loadCuratedFavorites,
  saveCuratedFavorites,
} from '../../utils/curatedFavoritesStorage';

// ---- helpers ---------------------------------------------------------------

function getIngredientName(ingredientId: string): string {
  const ing = (INGREDIENTS as any)[ingredientId];
  return ing?.display_name ?? ingredientId;
}

function formatTotalTime(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return `${hours}h`;
  return `${hours}h ${rem}m`;
}

function methodSummary(method: CookingMethod): string {
  const time = formatTotalTime(method.time_total_minutes);
  const id = method.id.toLowerCase();
  if (id.includes('slow_cooker')) return `${time} · slow cooker, hands-off`;
  if (id.includes('pressure_cooker') || id.includes('instant_pot'))
    return `${time} · pressure cooker`;
  if (id.includes('oven')) return `${time} · oven`;
  if (id.includes('blender') || id.includes('smoothie'))
    return `${time} · blender`;
  if (id.includes('stovetop') || id.includes('pan')) return `${time} · stovetop`;
  if (id.includes('jar') || id.includes('shortcut'))
    return `${time} · quick prep`;
  return time;
}

const isMultiPlate = (m: CuratedMeal) => (m.plates?.length ?? 0) > 1;
const plateKey = (slug: string, plateId: string) => `${slug}:${plateId}`;

// ---- route params ----------------------------------------------------------

type ParamList = {
  MealDetail: { slug: string };
};

// =============================================================================
// Screen
// =============================================================================

export default function MealDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ParamList, 'MealDetail'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const meal: CuratedMeal | undefined = (CURATED_MEALS as Record<
    string,
    CuratedMeal
  >)[route.params.slug];

  // We load + mutate the favorites payload locally so Add/Remove persist
  // immediately and the parent reflects them on its next focus/reload.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [avoid, setAvoid] = useState<string[]>([]);
  const [likedDishes, setLikedDishes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [plateIndex, setPlateIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fav = await loadCuratedFavorites();
      if (!cancelled) {
        setSelected(new Set(fav.slugs));
        setCuisines(fav.cuisines);
        setAvoid(fav.avoid);
        setLikedDishes(fav.likedDishes);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ingredientNames = useMemo(() => {
    if (!meal) return [] as string[];
    const m = meal.methods[0];
    if (!m) return [] as string[];
    const p = meal.plates[plateIndex] ?? meal.plates[0];
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (id: string) => {
      const name = getIngredientName(id);
      const key = name.toLowerCase();
      if (!seen.has(key)) { seen.add(key); out.push(name); }
    };
    // Base recipe via the single resolver path: legacy → method.ingredients;
    // template (butter_chicken) → base + default variant (methods carry []).
    resolveBaseIngredients(meal, { methodId: m.id }).forEach((ing) => push(ing.ingredient_id));
    p?.additional_ingredients.forEach((ing) => push(ing.ingredient_id));
    return out;
  }, [meal, plateIndex]);

  // ---- meal not found ----
  if (!meal) {
    return (
      <View style={[styles.sheet, styles.center]}>
        <Text style={styles.notFound}>Meal not found.</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.notFoundBtn}
        >
          <Text style={styles.notFoundBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const plate: Plate | undefined =
    meal.plates[plateIndex] ?? meal.plates[0];
  const method: CookingMethod | undefined = meal.methods[0];
  const macros = plate?.plate_macros;
  const multi = isMultiPlate(meal);

  const targetKey = multi && plate ? plateKey(meal.slug, plate.id) : meal.slug;
  const isPicked = selected.has(targetKey);

  const heroSrc =
    (plate?.image_filename && getMealImage(plate.image_filename)) ||
    getMealImage(meal.image_filename);


  // ---- mutation handlers ----
  // Toggle, persist immediately, then dismiss the sheet. The parent's
  // useFocusEffect (or its existing reload on mount) will pick up the change.
  const toggleAndDismiss = async () => {
    const next = new Set(selected);
    if (next.has(targetKey)) next.delete(targetKey);
    else next.add(targetKey);
    setSelected(next);
    try {
      await saveCuratedFavorites({
        slugs: Array.from(next),
        cuisines,
        avoid,
        likedDishes,
      });
    } catch (e) {
      console.error('toggle save failed', e);
    }
    navigation.goBack();
  };

  if (loading || !method) {
    // Brief — favorites load is local AsyncStorage, sub-frame typically.
    // Render a blank sheet to avoid layout pop.
    return <View style={styles.sheet} />;
  }

  return (
    <View style={styles.sheet}>
      {/* Close (×) — top-right. Native sheets also dismiss via swipe-down,
          but an explicit close button is the standard for accessibility. */}
      <TouchableOpacity
        style={[styles.closeBtn, { top: insets.top > 0 ? 14 : 18 }]}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 14, right: 14, bottom: 14, left: 14 }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Ionicons name="close" size={20} color="#a1a1aa" />
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        {/* Hero */}
        <View style={styles.heroWrap}>
          {heroSrc ? (
            <Image
              source={heroSrc}
              style={styles.hero}
              contentFit="cover"
              transition={200}
              priority="high"
            />
          ) : (
            <View style={[styles.hero, styles.heroPlaceholder]}>
              <Ionicons name="restaurant-outline" size={32} color="#52525b" />
            </View>
          )}
        </View>

        {/* Title + cuisine */}
        <Text style={styles.title}>
          {plate?.display_name ?? meal.display_name}
        </Text>
        {meal.cuisine && <Text style={styles.cuisine}>{meal.cuisine}</Text>}

        {/* Plate switcher (multi-plate only) */}
        {multi && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.plateRow}
            keyboardShouldPersistTaps="handled"
          >
            {meal.plates.map((p, i) => {
              const on = i === plateIndex;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setPlateIndex(i)}
                  activeOpacity={0.75}
                  style={[
                    styles.platePill,
                    on && {
                      backgroundColor: themeColor,
                      borderColor: themeColor,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text
                    style={[
                      styles.platePillText,
                      on && { color: '#0a0a0b', fontWeight: '600' },
                    ]}
                  >
                    {p.display_name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Macro strip */}
        {macros && (
          <View style={styles.macroStrip}>
            <View style={styles.macroCell}>
              <Text style={styles.macroLabel}>CAL</Text>
              <Text style={styles.macroValue}>{macros.kcal}</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroCell}>
              <Text style={styles.macroLabel}>PROTEIN</Text>
              <Text style={styles.macroValue}>
                {macros.protein_g}
                <Text style={styles.macroUnit}>g</Text>
              </Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroCell}>
              <Text style={styles.macroLabel}>CARBS</Text>
              <Text style={styles.macroValue}>
                {macros.carbs_g}
                <Text style={styles.macroUnit}>g</Text>
              </Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroCell}>
              <Text style={styles.macroLabel}>FAT</Text>
              <Text style={styles.macroValue}>
                {macros.fat_g}
                <Text style={styles.macroUnit}>g</Text>
              </Text>
            </View>
          </View>
        )}

        {/* Method / time */}
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color="#71717a" />
          <Text style={styles.metaText}>{methodSummary(method)}</Text>
        </View>

        {/* Description */}
        {plate?.description && (
          <Text style={styles.description}>{plate.description}</Text>
        )}

        {/* Ingredients */}
        {ingredientNames.length > 0 && (
          <View style={styles.ingBlock}>
            <Text style={styles.sectionLabel}>WHAT'S IN IT</Text>
            <Text style={styles.ingList}>
              {ingredientNames.join(' · ')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky CTA */}
      <View
        style={[
          styles.ctaWrap,
          { paddingBottom: Math.max(insets.bottom, 14) + 10 },
        ]}
      >
        {isPicked ? (
          <>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => navigation.goBack()}
              style={[styles.cta, { backgroundColor: themeColor }]}
              accessibilityRole="button"
              accessibilityLabel="Done"
            >
              <Text style={styles.ctaText}>Done</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={toggleAndDismiss}
              style={styles.removeLink}
              accessibilityRole="button"
              accessibilityLabel="Remove from week"
            >
              <Text style={styles.removeText}>Remove from week</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={toggleAndDismiss}
            style={[styles.cta, { backgroundColor: themeColor }]}
            accessibilityRole="button"
            accessibilityLabel="Add to my week"
          >
            <Text style={styles.ctaText}>Add to my week</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: '#0d0d10',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  notFound: { fontSize: 15, color: '#a1a1aa', marginBottom: 14 },
  notFoundBtn: { paddingVertical: 10, paddingHorizontal: 18 },
  notFoundBtnText: { fontSize: 14, color: '#22d3ee', fontWeight: '500' },

  closeBtn: {
    position: 'absolute',
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },

  heroWrap: {
    marginHorizontal: 18,
    marginTop: 18,
    aspectRatio: 16 / 10,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0a0a0b',
    marginBottom: 16,
  },
  hero: { width: '100%', height: '100%' },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1c1f',
  },

  title: {
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'Georgia',
    }),
    fontSize: 26,
    fontWeight: '400',
    color: '#ffffff',
    letterSpacing: -0.5,
    lineHeight: 30,
    paddingHorizontal: 18,
  },
  cuisine: {
    fontSize: 12,
    color: '#71717a',
    letterSpacing: 0.5,
    textTransform: 'capitalize',
    paddingHorizontal: 18,
    marginTop: 4,
  },

  plateRow: {
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 8,
  },
  platePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#16161a',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
  },
  platePillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#d4d4d8',
  },

  macroStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    marginHorizontal: 18,
    marginTop: 16,
    marginBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f1f23',
  },
  macroCell: { flex: 1, alignItems: 'center' },
  macroDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: '#1f1f23',
  },
  macroLabel: {
    fontSize: 9,
    color: '#71717a',
    letterSpacing: 0.6,
    fontWeight: '600',
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 17,
    color: '#ffffff',
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  macroUnit: { fontSize: 11, color: '#a1a1aa', fontWeight: '500' },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  metaText: { fontSize: 12, color: '#a1a1aa' },

  description: {
    fontSize: 14,
    color: '#d4d4d8',
    lineHeight: 21,
    letterSpacing: -0.1,
    paddingHorizontal: 18,
    marginBottom: 18,
  },

  ingBlock: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 10,
    color: '#71717a',
    letterSpacing: 0.7,
    fontWeight: '700',
    marginBottom: 6,
  },
  ingList: {
    fontSize: 13,
    color: '#a1a1aa',
    lineHeight: 21,
    letterSpacing: -0.05,
  },

  ctaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 14,
    backgroundColor: '#0d0d10',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1f1f23',
  },
  cta: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0a0a0b',
    letterSpacing: -0.1,
  },
  removeLink: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  removeText: {
    fontSize: 13,
    color: '#71717a',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
});