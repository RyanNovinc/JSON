import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { TouchableOpacity as GHTouchable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { MealPlan } from '../utils/storage';
import { useSimplifiedMealPlanning } from '../contexts/SimplifiedMealPlanningContext';
import { CURATED_MEALS } from '../data/curated_meals';
import { getMealImage } from '../assets/mealImages';

/**
 * MealPlanPreviewScreen — opens when a user taps a saved meal plan in Library.
 *
 * Revamped layout (v2) — photo-forward, fewer taps:
 *   - Hero mosaic: up to 4 unique meal photos as a full-bleed grid at the top,
 *     with a flat scrim holding the overline ("SAVED MEAL PLAN · N DAYS") and
 *     the plan title. Replaces the old pill + centered title + filmstrip.
 *   - Floating back button pinned over the hero (stays put while scrolling).
 *   - Borderless 3-stat strip: kcal/day · protein/day · meals/day. The day
 *     count lives in the overline now, freeing the third stat slot.
 *   - Day chips replace the accordion. One `selectedDay` index instead of an
 *     `openDays` Set — every day is one tap and meals are always visible.
 *   - Meal rows show macro CHIPS: protein tinted in themeColor (the number
 *     our avatar scans for), carbs/fat neutral.
 *   - Sticky "Use this plan" CTA unchanged.
 *
 * Example mode (isExample route param): same screen, two changes only —
 * overline reads "EXAMPLE PLAN" and the CTA reads "Build my own plan" and
 * routes into the meal questionnaire instead of saving. There is NO save path
 * in example mode, so a previewed example can never land in the user's plan
 * list (open it with 0 plans or 50, it changes nothing). Real Library previews
 * pass no flag and behave exactly as before.
 *
 * Empty-data gate: if no days resolve, the hero/stats/chips are suppressed
 * entirely (no broken mosaic of fallback icons) — plain header + empty state
 * + CTA only.
 *
 * A Library-saved meal plan stores the ORIGINAL SimplifiedMealPlan as its
 * `data` field (see NutritionHomeScreen.handleToggleSaveMealPlan), so meals
 * keep their curated_meal_slug + plate_id — exactly what we need to resolve
 * photos. Image resolution mirrors MealPlanDayScreen.MealCard: direct
 * image_filename / photo_url first, else hydrate from CURATED_MEALS via the
 * slug + plate, then getMealImage() for the local asset.
 *
 * Also understands the two legacy shapes (data.days[] / data.weeks[0].days[])
 * so it never renders blank, and falls back to a type icon when a meal has no
 * resolvable photo.
 *
 * Import = saveMealPlan(data): upserts by id (no dupe) AND sets the plan as
 * current in one shot. migrateLegacyPlan(plan) is the fallback for any plan
 * whose data isn't already a SimplifiedMealPlan.
 */

type RouteParams = {
  MealPlanPreview: { plan: MealPlan; isExample?: boolean };
};

type PreviewMeal = {
  key: string;
  name: string;
  type: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: string[];
  imgLocal: any | null; // local require() from getMealImage
  imgUri: string | null; // remote URL fallback
  imgKey: string | null; // for de-duping the hero mosaic
};
type PreviewDay = {
  key: string;
  label: string;
  meals: PreviewMeal[];
};

// Fallback icon when a meal has no photo.
const iconForType = (t: string): any => {
  const k = (t || '').toLowerCase().replace(/\s+/g, '_');
  switch (k) {
    case 'breakfast':
    case 'brunch':
      return 'sunny-outline';
    case 'lunch':
    case 'second_lunch':
      return 'restaurant-outline';
    case 'dinner':
    case 'early_dinner':
      return 'moon-outline';
    case 'dessert':
      return 'ice-cream-outline';
    case 'pre_workout':
      return 'fitness-outline';
    case 'post_workout':
      return 'barbell-outline';
    case 'snack':
    case 'morning_snack':
    case 'afternoon_snack':
    case 'evening_snack':
      return 'nutrition-outline';
    default:
      return 'restaurant-outline';
  }
};

// Resolve a meal photo. Same chain as MealPlanDayScreen.MealCard.
const resolveMealImage = (
  m: any
): { local: any | null; uri: string | null; key: string | null } => {
  let imageFilename: string | null = m?.image_filename || null;
  let uri: string | null =
    m?.photo_url || m?.image || m?.imageUrl || m?.image_url || m?.photo || null;
  let key: string | null = imageFilename || uri || null;

  if (!imageFilename && !uri) {
    const slug = m?.curated_meal_slug || m?.slug || null;
    const cm = slug ? (CURATED_MEALS as any)[slug] : null;
    if (cm) {
      const plates = Array.isArray(cm.plates) ? cm.plates : [];
      const plateId = m?.plate_id || null;
      const plate =
        (plateId && plates.find((p: any) => p?.id === plateId)) || plates[0] || null;
      imageFilename = plate?.image_filename || cm.image_filename || null;
      uri = cm.photo_url || uri;
      key = (slug ? `${slug}:${plate?.id || ''}` : null) || imageFilename || uri;
    }
  }

  return { local: imageFilename ? getMealImage(imageFilename) : null, uri, key };
};

// Pull macros + photo off a meal regardless of which shape it came in as.
const readMeal = (m: any, dayKey: string, i: number): PreviewMeal => {
  const img = resolveMealImage(m);
  return {
    key: `${dayKey}-${i}`,
    name: m?.name || m?.meal_name || 'Meal',
    type: String(m?.type || m?.meal_type || '').replace(/_/g, ' '),
    time: m?.time || m?.recommended_time || '',
    calories: m?.calories || 0,
    protein: Math.round(m?.macros?.protein ?? 0),
    carbs: Math.round(m?.macros?.carbs ?? 0),
    fat: Math.round(m?.macros?.fat ?? 0),
    tags: Array.isArray(m?.tags) ? m.tags : [],
    imgLocal: img.local,
    imgUri: img.uri,
    imgKey: img.key,
  };
};

// Normalize a plan's data into an ordered list of days. Handles:
//   1. SimplifiedMealPlan  → data.dailyMeals (object keyed by date)
//   2. Legacy days         → data.days[]
//   3. Legacy weeks        → data.weeks[].days[]
const normalizeDays = (data: any): PreviewDay[] => {
  if (!data) return [];

  if (data.dailyMeals && typeof data.dailyMeals === 'object') {
    return Object.keys(data.dailyMeals)
      .sort()
      .map((dateKey, i) => {
        const d = data.dailyMeals[dateKey] || {};
        const meals = Array.isArray(d.meals) ? d.meals : [];
        return {
          key: dateKey,
          label: d.dayName || `Day ${i + 1}`,
          meals: meals.map((m: any, mi: number) => readMeal(m, dateKey, mi)),
        };
      });
  }

  const legacyDays: any[] = Array.isArray(data.days)
    ? data.days
    : Array.isArray(data.weeks)
    ? data.weeks.flatMap((w: any) => (Array.isArray(w?.days) ? w.days : []))
    : [];

  return legacyDays.map((d: any, i: number) => {
    const meals = Array.isArray(d?.meals) ? d.meals : [];
    const key = `day-${i}`;
    return {
      key,
      label: d?.day_name || d?.dayName || `Day ${i + 1}`,
      meals: meals.map((m: any, mi: number) => readMeal(m, key, mi)),
    };
  });
};

// Small reusable photo tile that picks local require → remote uri → icon.
function MealPhoto({
  meal,
  style,
  iconSize,
}: {
  meal: PreviewMeal;
  style: any;
  iconSize: number;
}) {
  if (meal.imgLocal) {
    return <Image source={meal.imgLocal} style={style} resizeMode="cover" />;
  }
  if (meal.imgUri) {
    return <Image source={{ uri: meal.imgUri }} style={style} resizeMode="cover" />;
  }
  return (
    <View style={[style, styles.photoFallback]}>
      <Ionicons name={iconForType(meal.type)} size={iconSize} color="#52525b" />
    </View>
  );
}

export default function MealPlanPreviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'MealPlanPreview'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const { saveMealPlan, migrateLegacyPlan } = useSimplifiedMealPlanning();

  const { plan, isExample } = route.params;
  const data = plan.data || {};

  const planName: string = data.name || plan.name || 'Untitled Plan';

  const days = useMemo(() => normalizeDays(data), [data]);
  const hasDays = days.length > 0;

  // Daily averages across days that have meals.
  const averages = useMemo(() => {
    let kcal = 0;
    let protein = 0;
    let mealCount = 0;
    let n = 0;
    for (const day of days) {
      if (!day.meals.length) continue;
      kcal += day.meals.reduce((t, m) => t + (m.calories || 0), 0);
      protein += day.meals.reduce((t, m) => t + (m.protein || 0), 0);
      mealCount += day.meals.length;
      n++;
    }
    if (n === 0 || kcal === 0) return null;
    return {
      kcal: Math.round(kcal / n / 10) * 10,
      protein: Math.round(protein / n),
      meals: Math.round(mealCount / n),
    };
  }, [days]);

  const dayCount = days.length || plan.duration || 0;

  // Hero mosaic: unique meal photos from across the whole plan (max 4).
  const heroMeals = useMemo(() => {
    const out: PreviewMeal[] = [];
    const seen = new Set<string>();
    for (const day of days) {
      for (const meal of day.meals) {
        if (!meal.imgLocal && !meal.imgUri) continue;
        const k = meal.imgKey || meal.name;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(meal);
        if (out.length >= 4) return out;
      }
    }
    return out;
  }, [days]);

  // Gate: only show the hero when there are real days AND real photos —
  // otherwise we'd render a broken-looking mosaic of fallback icons.
  const showHero = hasDays && heroMeals.length > 0;

  // Selected day — first day with meals by default.
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const idx = days.findIndex((d) => d.meals.length > 0);
    return idx >= 0 ? idx : 0;
  });
  const activeDay: PreviewDay | null = days[selectedDay] ?? days[0] ?? null;

  const overline = `${isExample ? 'EXAMPLE PLAN' : 'SAVED MEAL PLAN'}${
    dayCount ? ` · ${dayCount} ${dayCount === 1 ? 'DAY' : 'DAYS'}` : ''
  }`;

  const handleImport = () => {
    Alert.alert(
      'Use this meal plan?',
      `"${planName}" will become your active meal plan. You can still find it here in Library.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use this plan',
          onPress: async () => {
            try {
              if (data && data.dailyMeals && data.id) {
                await saveMealPlan(data);
              } else if (data && (data.days || data.weeks)) {
                await migrateLegacyPlan(plan);
              } else {
                throw new Error('Meal plan has no usable data');
              }
              navigation.navigate('Main', { screen: 'Nutrition' });
            } catch (error) {
              console.error('Failed to set active meal plan:', error);
              Alert.alert('Error', 'Could not set as active. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Example mode: send them into the meal questionnaire to build a calibrated
  // plan rather than adopting this fixed sample. (Swap 'N1Goal' for the
  // onboarding contract screen once that's built.) No save happens here.
  const handleBuildOwn = () => {
    navigation.navigate('N1Goal');
  };

  // Adaptive mosaic for 1–4 photos. gap:2 keeps the photo-grid feel.
  const renderMosaic = () => {
    const p = heroMeals;
    const tile = (meal: PreviewMeal) => (
      <View key={meal.key} style={styles.heroTile}>
        <MealPhoto meal={meal} style={styles.heroTileImg} iconSize={26} />
      </View>
    );
    if (p.length === 1) {
      return <View style={styles.heroGrid}>{tile(p[0])}</View>;
    }
    if (p.length === 2) {
      return (
        <View style={styles.heroGrid}>
          <View style={styles.heroRow}>
            {tile(p[0])}
            {tile(p[1])}
          </View>
        </View>
      );
    }
    if (p.length === 3) {
      return (
        <View style={styles.heroGrid}>
          <View style={styles.heroRow}>{tile(p[0])}</View>
          <View style={styles.heroRow}>
            {tile(p[1])}
            {tile(p[2])}
          </View>
        </View>
      );
    }
    return (
      <View style={styles.heroGrid}>
        <View style={styles.heroRow}>
          {tile(p[0])}
          {tile(p[1])}
        </View>
        <View style={styles.heroRow}>
          {tile(p[2])}
          {tile(p[3])}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero mosaic with scrim title, OR plain header ─────────── */}
        {showHero ? (
          <View style={styles.hero}>
            {renderMosaic()}
            <View style={styles.heroOverlay}>
              <View style={styles.heroScrimSoft} />
              <View style={styles.heroScrim}>
                <Text style={[styles.overline, { color: themeColor }]}>{overline}</Text>
                <Text style={styles.title} numberOfLines={2}>
                  {planName}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.plainHeader, { paddingTop: insets.top + 56 }]}>
            <Text style={[styles.overline, { color: themeColor }]}>{overline}</Text>
            <Text style={styles.title} numberOfLines={2}>
              {planName}
            </Text>
          </View>
        )}

        {hasDays && (
          <>
            {/* ── Stat strip: kcal/day · protein/day · meals/day ─────── */}
            <View style={styles.statRow}>
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: themeColor }]}>
                  {averages ? averages.kcal.toLocaleString() : '—'}
                </Text>
                <Text style={styles.statLabel}>kcal / day</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: themeColor }]}>
                  {averages ? `${averages.protein}g` : '—'}
                </Text>
                <Text style={styles.statLabel}>protein / day</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: themeColor }]}>
                  {averages ? averages.meals : '—'}
                </Text>
                <Text style={styles.statLabel}>meals / day</Text>
              </View>
            </View>

            {/* ── Day chips (or a static label for single-day plans) ─── */}
            {days.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsScroll}
                contentContainerStyle={styles.chipsRow}
              >
                {days.map((day, i) => {
                  const selected = i === selectedDay;
                  const empty = day.meals.length === 0;
                  return (
                    <TouchableOpacity
                      key={day.key}
                      style={[
                        styles.dayChip,
                        selected && {
                          backgroundColor: themeColor,
                          borderColor: themeColor,
                        },
                        empty && !selected && styles.dayChipEmpty,
                      ]}
                      onPress={() => setSelectedDay(i)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          selected && styles.dayChipTextSelected,
                        ]}
                      >
                        {day.label.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              activeDay && (
                <View style={styles.singleDayRow}>
                  <Text style={[styles.singleDayLabel, { color: themeColor }]}>
                    {activeDay.label.toUpperCase()}
                  </Text>
                  <Text style={styles.singleDayMeta}>
                    {activeDay.meals.length} meal
                    {activeDay.meals.length === 1 ? '' : 's'}
                  </Text>
                </View>
              )
            )}

            {/* ── Selected day's meals ───────────────────────────────── */}
            <View style={styles.mealList}>
              {activeDay && activeDay.meals.length > 0 ? (
                activeDay.meals.map((meal, mi) => {
                  const isLast = mi === activeDay.meals.length - 1;
                  const hasMacros = meal.protein > 0 || meal.carbs > 0 || meal.fat > 0;
                  return (
                    <View
                      key={meal.key}
                      style={[styles.mealRow, isLast && { borderBottomWidth: 0 }]}
                    >
                      <View style={styles.mealThumb}>
                        <MealPhoto meal={meal} style={styles.mealThumbImg} iconSize={20} />
                      </View>
                      <View style={styles.mealInfo}>
                        {(!!meal.type || !!meal.time) && (
                          <Text style={styles.mealMeta} numberOfLines={1}>
                            {meal.type.toUpperCase()}
                            {meal.type && meal.time ? ' · ' : ''}
                            {meal.time}
                          </Text>
                        )}
                        <Text style={styles.mealName} numberOfLines={1}>
                          {meal.name}
                        </Text>
                        <View style={styles.macroRow}>
                          {meal.calories > 0 && (
                            <Text style={styles.macroKcal}>{meal.calories} kcal</Text>
                          )}
                          {hasMacros && (
                            <>
                              <View
                                style={[
                                  styles.macroChip,
                                  { backgroundColor: themeColor + '20' },
                                ]}
                              >
                                <Text style={[styles.macroChipText, { color: themeColor }]}>
                                  P {meal.protein}
                                </Text>
                              </View>
                              <View style={[styles.macroChip, styles.macroChipNeutral]}>
                                <Text style={[styles.macroChipText, styles.macroChipTextNeutral]}>
                                  C {meal.carbs}
                                </Text>
                              </View>
                              <View style={[styles.macroChip, styles.macroChipNeutral]}>
                                <Text style={[styles.macroChipText, styles.macroChipTextNeutral]}>
                                  F {meal.fat}
                                </Text>
                              </View>
                            </>
                          )}
                          {meal.calories === 0 && !hasMacros && (
                            <Text style={styles.macroKcal}>—</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyDayBlock}>
                  <Ionicons name="cafe-outline" size={22} color="#52525b" />
                  <Text style={styles.emptyDayText}>No meals planned for this day.</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* ── Empty state if nothing resolved ───────────────────────── */}
        {!hasDays && (
          <View style={styles.emptyDataBlock}>
            <Ionicons name="alert-circle-outline" size={32} color="#71717a" />
            <Text style={styles.emptyDataText}>
              This plan doesn't have detailed day data. You can still use it.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating back button — pinned over the hero, above the scroll */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 4 }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={22} color="#ffffff" />
      </TouchableOpacity>

      {/* Sticky CTA */}
      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 12 }]}>
        <GHTouchable
          style={[styles.ctaButton, { backgroundColor: themeColor }]}
          onPress={isExample ? handleBuildOwn : handleImport}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaButtonText}>
            {isExample ? 'Build my own plan' : 'Use this plan'}
          </Text>
        </GHTouchable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    // No horizontal padding here — the hero is full-bleed.
    // Inner sections carry their own paddingHorizontal.
  },

  // Floating back button
  backBtn: {
    position: 'absolute',
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero mosaic
  hero: {
    height: 300,
    backgroundColor: '#131316',
  },
  heroGrid: {
    flex: 1,
    gap: 2,
  },
  heroRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 2,
  },
  heroTile: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#131316',
  },
  heroTileImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Two flat layers fake a soft gradient without expo-linear-gradient.
  heroScrimSoft: {
    height: 26,
    backgroundColor: 'rgba(10, 10, 11, 0.45)',
  },
  heroScrim: {
    backgroundColor: 'rgba(10, 10, 11, 0.82)',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
  },

  // Plain header (no resolvable photos / no day data)
  plainHeader: {
    paddingHorizontal: 18,
    paddingBottom: 8,
  },

  // Overline + title (shared by hero scrim and plain header)
  overline: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },

  // Stat strip
  statRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#27272a',
    alignSelf: 'stretch',
    marginVertical: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 4,
    letterSpacing: 0.3,
  },

  // Day chips
  chipsScroll: {
    flexGrow: 0,
  },
  chipsRow: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    backgroundColor: '#131316',
  },
  dayChipEmpty: {
    opacity: 0.4,
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#a1a1aa',
  },
  dayChipTextSelected: {
    color: '#0a0a0b',
  },

  // Single-day label (chips would be pointless for one day)
  singleDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  singleDayLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    flex: 1,
  },
  singleDayMeta: {
    fontSize: 11,
    color: '#71717a',
    letterSpacing: 0.3,
  },

  // Meal rows
  mealList: {
    paddingHorizontal: 18,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1c1c20',
  },
  mealThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#131316',
    flexShrink: 0,
  },
  mealThumbImg: {
    width: '100%',
    height: '100%',
  },
  photoFallback: {
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealInfo: {
    flex: 1,
    minWidth: 0,
  },
  mealMeta: {
    fontSize: 9,
    fontWeight: '700',
    color: '#5f5f68',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 5,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroKcal: {
    fontSize: 12,
    color: '#a1a1aa',
    marginRight: 2,
  },
  macroChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  macroChipNeutral: {
    backgroundColor: '#1e1e22',
  },
  macroChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  macroChipTextNeutral: {
    color: '#a1a1aa',
  },

  // Empty selected day
  emptyDayBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  emptyDayText: {
    fontSize: 13,
    color: '#71717a',
  },

  // Empty data state
  emptyDataBlock: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyDataText: {
    fontSize: 13,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 19,
  },

  // Sticky CTA
  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(10, 10, 11, 0.95)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  ctaButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a0a0b',
  },
});