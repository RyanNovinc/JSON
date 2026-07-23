# JSON.fit — meal / nutrition data layer handoff

**Part 5 of 5.** Read all 5 parts in order: bundle-01.md, bundle-02.md, bundle-03.md, bundle-04.md, bundle-05.md.

Generated read-only from branch `feature/file-import`. Order: type definitions → ingredient
database → meal data → runtime consumers → UI.

**Secrets:** every file was scanned for API keys, tokens and secrets before inclusion.
No secrets were found in any bundled file, so nothing was redacted.

**Read this first — three facts that will otherwise mislead you:**
1. An ingredient table exists (`src/data/ingredients.ts`, 195 rows) but it carries **no macros and
   no unit→gram conversions**. It is a shopping/dietary registry, not a nutrition database. Macros
   exist **only** as `plate_macros` precomputed per meal in `curated_meals.ts`.
2. `src/utils/ingredientScaling.ts` **deliberately ignores** the per-row
   `scaling: 'scales' | 'fixed' | 'flex'` field (see its header comment). Scaling is uniform across
   the plate. `flex_ingredient_id` is read **only** by the boot validator.
3. `CURATED_MEALS` is a static ES import — it is **compiled into the app bundle**, not fetched from
   json.fit at runtime.

---

---

# 5. UI (cont.)

## FILE: src/screens/NutritionHomeScreen.tsx  (2953 lines)

```tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Share,
  Animated,
  TextInput,
  ScrollView,
  Pressable,
  RefreshControl,
  TouchableOpacity as RNTouchable,
} from 'react-native';
import { Image } from 'expo-image';
import { TouchableOpacity } from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// This screen keeps its RNGH TouchableOpacity: unlike the other swept files, it sits INSIDE
// ModeTransitionContainer's PanGestureHandler (the Workout<->Nutrition swipe), where RNGH
// touchables have a plausible tap-vs-swipe rationale. So it gets AppModal (which re-roots the
// GestureHandlerRootView inside the modal) rather than an import swap — mirroring HomeScreen.
import AppModal from '../components/AppModal';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useSimplifiedMealPlanning } from '../contexts/SimplifiedMealPlanningContext';
import { WorkoutStorage, NutritionCompletionStatus, MealPlan } from '../utils/storage';
import { SimplifiedMealPlan } from '../types/nutrition';
import { createShare, ShareError } from '../services/shareService';
import ExamplePlanCard from '../onboarding/ExamplePlanCard';
import { startNutritionFlow } from '../utils/questionnaireRouting';
import { CURATED_MEALS } from '../data/curated_meals';
import { CuratedMeal } from '../types/curated_meals';
import { getMealImage } from '../assets/mealImages';

type NutritionNavigationProp = StackNavigationProp<RootStackParamList>;

// Base label for the "mains" shelf (the savoury main dishes — australian,
// indian, mexican, italian, thai). Change this in one place if you'd rather
// call it "Dinner" or "Slow cooker".
const MAINS_TITLE = 'Mains';

// Title for the single activity-driven shelf. This shelf is NOT derived from
// `cuisine` (a meal only has one cuisine); it's derived from TAGS, so the same
// meal can appear here *and* on its cuisine shelf (e.g. a whey-banana smoothie
// shows in both Smoothies and here). It merges pre- and post-workout meals into
// one shelf — each card carries a PRE / POST badge (see renderFeedCard) so the
// shelf stays the exact same height as every other category shelf. See
// `mealHasTag` / `getWorkoutTagLabel` below.
const AROUND_WORKOUT_TITLE = 'Around your workout';

// ============================================================================
// HELPERS — preserved verbatim from the original file. These are pure
// functions and have been tested in production.
// ============================================================================

// Convert SimplifiedMealPlan to legacy MealPlan format for UI compatibility.
// Builds the days array, calculates total macros across all days, then derives
// macro target percentages using largest-remainder rounding so they sum to 100.
const convertToLegacyFormat = (simplifiedPlan: SimplifiedMealPlan): MealPlan => {
  const days = Object.entries(simplifiedPlan.dailyMeals).map(([date, dayData], index) => ({
    day_name: dayData.dayName,
    day_number: index + 1,
    date: date,
    meals: dayData.meals.map(meal => ({
      meal_name: meal.name,
      meal_type: meal.type,
      calories: meal.calories,
      macros: meal.macros,
      ingredients: meal.ingredients,
      instructions: meal.instructions,
      recommended_time: meal.time,
      prep_time: 0,
      cook_time: 0,
      total_time: 0,
      servings: 1,
      tags: meal.tags || [],
      notes: '',
      weekly_meal_coverage: []
    }))
  }));

  let totalMacros = { protein: 0, carbs: 0, fat: 0, calories: 0 };
  let totalDays = 0;

  Object.values(simplifiedPlan.dailyMeals).forEach((day: any) => {
    if (day.meals && day.meals.length > 0) {
      const dayMacros = day.meals.reduce((dayTotal: any, meal: any) => ({
        protein: dayTotal.protein + (meal.macros?.protein || 0),
        carbs: dayTotal.carbs + (meal.macros?.carbs || 0),
        fat: dayTotal.fat + (meal.macros?.fat || 0),
        calories: dayTotal.calories + (meal.calories || 0)
      }), { protein: 0, carbs: 0, fat: 0, calories: 0 });

      totalMacros.protein += dayMacros.protein;
      totalMacros.carbs += dayMacros.carbs;
      totalMacros.fat += dayMacros.fat;
      totalMacros.calories += dayMacros.calories;
      totalDays++;
    }
  });

  if (totalDays > 0) {
    totalMacros.protein /= totalDays;
    totalMacros.carbs /= totalDays;
    totalMacros.fat /= totalDays;
    totalMacros.calories /= totalDays;
  }

  let macroTargets = undefined;
  if (totalMacros.calories > 0) {
    const proteinPct = (totalMacros.protein * 4 / totalMacros.calories) * 100;
    const carbsPct = (totalMacros.carbs * 4 / totalMacros.calories) * 100;
    const fatPct = (totalMacros.fat * 9 / totalMacros.calories) * 100;

    const [roundedProtein, roundedCarbs, roundedFat] = roundPercentagesToTotal([proteinPct, carbsPct, fatPct]);

    macroTargets = {
      protein_pct: roundedProtein,
      carbs_pct: roundedCarbs,
      fat_pct: roundedFat
    };
  }

  return {
    id: simplifiedPlan.id,
    name: simplifiedPlan.name,
    duration: Object.keys(simplifiedPlan.dailyMeals).length,
    meals: Object.values(simplifiedPlan.dailyMeals).reduce((total: number, day: any) => total + day.meals.length, 0),
    fingerprint: simplifiedPlan.id,
    data: {
      days: days,
      estimated_cost: simplifiedPlan.metadata.totalCost || 0,
      macro_targets: macroTargets
    }
  };
};

// Largest-remainder rounding so percentages always sum to exactly 100.
const roundPercentagesToTotal = (percentages: number[], targetTotal: number = 100): number[] => {
  const floors = percentages.map(p => Math.floor(p));
  const remainders = percentages.map((p, i) => p - floors[i]);

  const currentSum = floors.reduce((sum, floor) => sum + floor, 0);
  const pointsToDistribute = targetTotal - currentSum;

  const remainderWithIndex = remainders
    .map((remainder, index) => ({ remainder, index }))
    .sort((a, b) => b.remainder - a.remainder);

  const result = [...floors];
  for (let i = 0; i < pointsToDistribute && i < remainderWithIndex.length; i++) {
    result[remainderWithIndex[i].index]++;
  }

  return result;
};

// ---------------------------------------------------------------------------
// Hero-card helpers — today filmstrip, day progress, daily averages.
// All pure functions; the component wires them up via useMemo below.
// ---------------------------------------------------------------------------

/** Local date as YYYY-MM-DD (device timezone — NOT toISOString, which is UTC). */
const localTodayISO = (): string => {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "7:45 AM" → minutes since midnight, for sorting today's meals. Unparseable → end of day. */
const clockToMinutes = (s?: string): number => {
  if (!s) return 24 * 60;
  const m = s.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return 24 * 60;
  let h = parseInt(m[1], 10) % 12;
  if ((m[3] || '').toUpperCase() === 'PM') h += 12;
  return h * 60 + parseInt(m[2], 10);
};

/** Average daily kcal + protein across the plan (legacy shape; weeks fallback). */
const getPlanDailyAverages = (plan: MealPlan): { kcal: number; protein: number } | null => {
  const days: any[] | null = plan.data?.days?.length
    ? plan.data.days
    : (plan.data as any)?.weeks?.[0]?.days?.length
    ? (plan.data as any).weeks[0].days
    : null;
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

/** One thumbnail's worth of info for the hero filmstrip. */
interface HeroStripMeal {
  key: string;
  name: string;
  image: any | null; // resolved via getMealImage for curated refs; null = monogram tile
}

/**
 * Resolve "today" against the ORIGINAL SimplifiedMealPlan. The legacy
 * conversion drops curated_meal_slug / plate_id, and those are exactly what
 * give the filmstrip its images — so this reads the unconverted plan.
 * Day matching: exact date key → today's weekday name (so a finished plan
 * still previews a sensible day) → day 1.
 */
const getHeroToday = (
  original: SimplifiedMealPlan | undefined,
  curatedBySlug: Map<string, CuratedMeal>
): { dayIndex: number; totalDays: number; stripLabel: string; meals: HeroStripMeal[] } | null => {
  if (!original?.dailyMeals) return null;
  const keys = Object.keys(original.dailyMeals).sort();
  if (keys.length === 0) return null;

  const todayISO = localTodayISO();
  const todayName = WEEKDAY_NAMES[new Date().getDay()];

  let matched: 'date' | 'weekday' | 'first' = 'date';
  let key = keys.find((k) => k === todayISO);
  if (!key) {
    key = keys.find((k) => ((original.dailyMeals as any)[k]?.dayName || '') === todayName);
    matched = key ? 'weekday' : 'first';
  }
  if (!key) key = keys[0];

  const dayIndex = keys.indexOf(key);
  const day: any = (original.dailyMeals as any)[key];
  const meals: HeroStripMeal[] = [...(day?.meals || [])]
    .sort((a: any, b: any) => clockToMinutes(a.time) - clockToMinutes(b.time))
    .map((m: any, i: number): HeroStripMeal => {
      const curated = m.curated_meal_slug ? curatedBySlug.get(m.curated_meal_slug) : undefined;
      const plate: any = curated?.plates?.find((p: any) => p.id === m.plate_id) ?? curated?.plates?.[0];
      const filename = plate?.image_filename ?? curated?.image_filename;
      return {
        key: `${key}_${i}`,
        name: curated ? plate?.display_name || curated.display_name : m.name || 'Meal',
        image: filename ? getMealImage(filename) : null,
      };
    });

  const stripLabel =
    matched === 'date'
      ? `TODAY · ${(day?.dayName || todayName).toUpperCase()}`
      : matched === 'weekday'
      ? (day?.dayName || todayName).toUpperCase()
      : `DAY 1${day?.dayName ? ` · ${String(day.dayName).toUpperCase()}` : ''}`;

  return { dayIndex, totalDays: keys.length, stripLabel, meals };
};

// Display string like "30P/45C/25F" for a plan. Tries plan-level macro_targets
// first, falls back to computing from the first day's meals, then to old
// weeks-structure for backwards compatibility.
const getMacroSplitDisplay = (plan: MealPlan) => {
  if (plan.macroSplit) return plan.macroSplit;

  const macroTargets = plan.data?.macro_targets;
  if (macroTargets) {
    const protein = macroTargets.protein_pct || macroTargets.protein || 0;
    const carbs = macroTargets.carbs_pct || macroTargets.carbs || 0;
    const fat = macroTargets.fat_pct || macroTargets.fat || 0;

    const [roundedProtein, roundedCarbs, roundedFat] = roundPercentagesToTotal([protein, carbs, fat]);
    return `${roundedProtein}P/${roundedCarbs}C/${roundedFat}F`;
  }

  if (plan.data?.days && plan.data.days.length > 0) {
    const firstDay = plan.data.days[0];
    if (firstDay?.meals && firstDay.meals.length > 0) {
      const totalMacros = firstDay.meals.reduce((total, meal) => ({
        protein: total.protein + (meal.macros?.protein || 0),
        carbs: total.carbs + (meal.macros?.carbs || 0),
        fat: total.fat + (meal.macros?.fat || 0),
        calories: total.calories + (meal.calories || 0)
      }), { protein: 0, carbs: 0, fat: 0, calories: 0 });

      if (totalMacros.calories > 0) {
        const proteinPct = (totalMacros.protein * 4 / totalMacros.calories) * 100;
        const carbsPct = (totalMacros.carbs * 4 / totalMacros.calories) * 100;
        const fatPct = (totalMacros.fat * 9 / totalMacros.calories) * 100;

        const [roundedProtein, roundedCarbs, roundedFat] = roundPercentagesToTotal([proteinPct, carbsPct, fatPct]);
        return `${roundedProtein}P/${roundedCarbs}C/${roundedFat}F`;
      }
    }
  }

  if (plan.data?.weeks && plan.data.weeks.length > 0) {
    const firstWeek = plan.data.weeks[0];
    if (firstWeek?.days && firstWeek.days.length > 0) {
      const firstDay = firstWeek.days[0];
      if (firstDay?.meals && firstDay.meals.length > 0) {
        const totalMacros = firstDay.meals.reduce((total, meal) => ({
          protein: total.protein + (meal.macros?.protein || 0),
          carbs: total.carbs + (meal.macros?.carbs || 0),
          fat: total.fat + (meal.macros?.fat || 0),
          calories: total.calories + (meal.calories || 0)
        }), { protein: 0, carbs: 0, fat: 0, calories: 0 });

        if (totalMacros.calories > 0) {
          const proteinPct = (totalMacros.protein * 4 / totalMacros.calories) * 100;
          const carbsPct = (totalMacros.carbs * 4 / totalMacros.calories) * 100;
          const fatPct = (totalMacros.fat * 9 / totalMacros.calories) * 100;

          const [roundedProtein, roundedCarbs, roundedFat] = roundPercentagesToTotal([proteinPct, carbsPct, fatPct]);
          return `${roundedProtein}P/${roundedCarbs}C/${roundedFat}F`;
        }
      }
    }
  }

  return '';
};

// ============================================================================
// HELPERS — for the category feed cards
// ============================================================================

/**
 * Picks the "headline" macros and time to show on a meal feed card.
 * Strategy: use first plate's macros and first method's total_minutes.
 * The first plate is the canonical representation; users can see all
 * plate variants when they tap into RecipeDetailScreen.
 */
function getCardSummary(meal: CuratedMeal): {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  totalMinutes: number;
} {
  const firstPlate = meal.plates?.[0];
  const firstMethod = meal.methods?.[0];

  return {
    kcal: firstPlate?.plate_macros?.kcal ?? 0,
    protein: firstPlate?.plate_macros?.protein_g ?? 0,
    carbs: firstPlate?.plate_macros?.carbs_g ?? 0,
    fat: firstPlate?.plate_macros?.fat_g ?? 0,
    totalMinutes: firstMethod?.time_total_minutes ?? 0,
  };
}

/**
 * Format minutes as a short human-readable string for the card chip.
 * 5  → "5m"
 * 45 → "45m"
 * 60 → "1h"
 * 90 → "1h 30m"
 * 480 → "8h"
 */
function formatTime(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

// ============================================================================
// HELPERS — tag matching for the activity-driven shelves
// ============================================================================

/**
 * Normalise a tag so casing/separators don't matter:
 *   "Pre-Workout" → "preworkout"
 *   "pre_workout" → "preworkout"
 *   "pre workout" → "preworkout"
 * This means you can tag a meal in the data file however you like and it will
 * still land on the right shelf.
 */
function normalizeTag(s: string): string {
  return String(s).toLowerCase().replace(/[\s_-]+/g, '');
}

/**
 * Returns true if a curated meal carries the given tag.
 *
 * IMPORTANT: this reads `meal.tags` (an array of strings). To make the
 * Pre-workout / Post-workout shelves populate, tag the relevant meals in
 * your data file, e.g.:
 *
 *   tags: ['pre-workout']           // or 'post-workout'
 *
 * A meal can carry both tags. If your CuratedMeal type stores tags somewhere
 * other than the root (e.g. per-plate), this is the single place to adjust.
 */
function mealHasTag(meal: CuratedMeal, tag: string): boolean {
  const target = normalizeTag(tag);
  const tags = (meal as any).tags;
  if (Array.isArray(tags)) {
    return tags.some((t: any) => normalizeTag(t) === target);
  }
  return false;
}

/**
 * Short badge label for the "Around your workout" shelf cards.
 * Returns 'PRE', 'POST', or null. If a meal somehow carries both tags it's
 * shown as PRE (deterministic — pre comes first chronologically). Only the
 * workout shelf passes showWorkoutBadge, so this never affects other shelves.
 */
function getWorkoutTagLabel(meal: CuratedMeal): 'PRE' | 'POST' | null {
  if (mealHasTag(meal, 'pre-workout')) return 'PRE';
  if (mealHasTag(meal, 'post-workout')) return 'POST';
  return null;
}

// ============================================================================
// DAYPART FLOAT — decides which single category shelf floats to the top of
// the feed and what contextual eyebrow + title it gets, based on the device's
// LOCAL time (works for users in any timezone). Everything else stays in a
// fixed order below it so muscle memory is preserved.
//
// NOTE: the daypart float only ever points at a food-time shelf (mains /
// breakfast / snacks / desserts). The Pre-workout / Post-workout shelves are
// activity-driven, not time-driven, so they're never floated — they keep their
// fixed position in the list below.
// ============================================================================
type DaypartFloat = { key: string; eyebrow: string; title: string };

function getDaypart(): DaypartFloat {
  const h = new Date().getHours();
  if (h < 5)  return { key: 'desserts',  eyebrow: 'WINDING DOWN', title: 'Something sweet' };
  if (h < 11) return { key: 'breakfast', eyebrow: 'GOOD MORNING', title: 'Start your day' };
  if (h < 15) return { key: 'mains',     eyebrow: 'MIDDAY',       title: 'Lunch ideas' };
  if (h < 17) return { key: 'snacks',    eyebrow: 'AFTERNOON',    title: 'Afternoon fuel' };
  if (h < 21) return { key: 'mains',     eyebrow: 'GOOD EVENING', title: 'Dinner tonight' };
  return            { key: 'desserts',  eyebrow: 'WINDING DOWN', title: 'Something sweet' };
}

// A single home-screen category shelf.
type HomeCategorySection = {
  key: string;
  title: string;
  cuisine: string; // route param for CategoryLibrary ('mains' / 'workout' are sentinels)
  meals: CuratedMeal[];
  showWorkoutBadge?: boolean; // only the "Around your workout" shelf sets this
};

// ============================================================================
// COMPONENT
// ============================================================================
export default function NutritionHomeScreen({ route }: any) {
  const navigation = useNavigation<NutritionNavigationProp>();
  const insets = useSafeAreaInsets();
  const { isPinkTheme, themeColor, themeColorLight, colors } = useTheme();
  const { mealPlans, currentPlan, setCurrentPlan, deleteMealPlan, saveMealPlan } = useSimplifiedMealPlanning();

  // Convert SimplifiedMealPlans to legacy format for UI compatibility (unchanged).
  const convertedMealPlans = mealPlans.map(plan => convertToLegacyFormat(plan));

  // The "active" plan that drives the hero card. Prefer the user-selected
  // currentPlan if there is one, otherwise fall back to the first plan.
  const currentPlanLegacy =
    (currentPlan && convertedMealPlans.find(p => p.id === currentPlan.id)) ||
    convertedMealPlans[0] ||
    null;
  const otherPlans = convertedMealPlans.filter(p => p.id !== currentPlanLegacy?.id);

  // ===== Hero card derived data (filmstrip / day progress / daily averages) =====
  const curatedBySlug = useMemo(() => {
    const map = new Map<string, CuratedMeal>();
    Object.values(CURATED_MEALS).forEach((m) => map.set(m.slug, m));
    return map;
  }, []);

  // The legacy conversion drops curated_meal_slug — read the ORIGINAL plan.
  const heroOriginal = currentPlanLegacy
    ? mealPlans.find((p) => p.id === currentPlanLegacy.id) ||
      mealPlans.find((p) => p.name === currentPlanLegacy.name)
    : undefined;
  const heroToday = useMemo(
    () => getHeroToday(heroOriginal, curatedBySlug),
    [heroOriginal, curatedBySlug]
  );
  const heroAverages = currentPlanLegacy ? getPlanDailyAverages(currentPlanLegacy) : null;

  // ===== Curated meals — split into category groups =====
  // Memoised because the source is a constant import; no point reconstituting
  // the arrays on every render. Categories are derived from the `cuisine`
  // field. "mains" is everything that isn't one of the four leaf categories
  // (breakfast / snack / dessert / smoothie) — i.e. the savoury main dishes
  // scattered across australian, indian, mexican, italian, thai.
  //
  // aroundWorkout is the exception: it's derived from TAGS, not cuisine, so it
  // can overlap with any cuisine shelf. It merges pre- and post-workout meals
  // into one deduped list (pre first), each badged PRE / POST at render time.
  const { mains, breakfast, snacks, desserts, smoothies, aroundWorkout } = useMemo(() => {
    const all = Object.values(CURATED_MEALS);

    const breakfast = all.filter(m => m.cuisine === 'breakfast');
    const snacks = all.filter(m => m.cuisine === 'snack');
    const desserts = all.filter(m => m.cuisine === 'dessert');

    // Custom order for smoothies based on preference (preserved from original).
    const smoothieOrder = [
      'cookies_gains',
      'brekkie_grow',
      'mango_mass',
      'strawberry_stack',
      'king_kong_chocolate',
      'raspberry_rip',
      'energy_lift_heavy',
      'dirty_eden',
      'mornin_muscle',
      'choc_muscle_maxx',
      'strawbrekkie_beast',
      'banana_bulk'
    ];

    const allSmoothies = all.filter(m => m.cuisine === 'smoothie');
    const orderedSmoothies = smoothieOrder
      .map(slug => allSmoothies.find(s => s.slug === slug))
      .filter(Boolean) as CuratedMeal[];
    // Defensive: append any smoothie not named in the order list so new
    // smoothies never silently vanish from the shelf. (No effect on current
    // data — all 12 are listed above.)
    const orderedSlugs = new Set(orderedSmoothies.map(s => s.slug));
    const smoothies = [
      ...orderedSmoothies,
      ...allSmoothies.filter(s => !orderedSlugs.has(s.slug)),
    ];

    // Mains = anything not in the four leaf categories, in a curated order.
    const LEAF = new Set(['breakfast', 'snack', 'dessert', 'smoothie']);
    const allMains = all.filter(m => !LEAF.has(m.cuisine));
    const mainsOrder = [
      'massaman',
      'bolognese',
      'pulled_pork',
      'lamb_shanks',
      'beef_stew',
      'chilli_con_carne',
    ];
    const orderedMains = mainsOrder
      .map(slug => allMains.find(m => m.slug === slug))
      .filter(Boolean) as CuratedMeal[];
    const orderedMainsSlugs = new Set(orderedMains.map(m => m.slug));
    const mains = [
      ...orderedMains,
      ...allMains.filter(m => !orderedMainsSlugs.has(m.slug)),
    ];

    // Activity-driven shelf — tag-based, can overlap with any cuisine.
    // Merge pre- and post-workout meals into ONE shelf (pre first), deduped by
    // slug so a meal tagged for both timings only appears once. Each card is
    // badged PRE / POST in renderFeedCard. Stays empty — and therefore hidden,
    // see renderCategorySection's <3 guard — until you tag meals 'pre-workout'
    // / 'post-workout' in the data file.
    const preWorkout = all.filter(m => mealHasTag(m, 'pre-workout'));
    const postWorkout = all.filter(m => mealHasTag(m, 'post-workout'));
    const seenWorkout = new Set<string>();
    const aroundWorkout = [...preWorkout, ...postWorkout].filter(m => {
      if (seenWorkout.has(m.slug)) return false;
      seenWorkout.add(m.slug);
      return true;
    });

    return { mains, breakfast, snacks, desserts, smoothies, aroundWorkout };
  }, []);

  // Decide the daypart float for this render (cheap; reads local time).
  const daypart = getDaypart();

  // Fixed shelf order. The daypart-floated shelf is hoisted to the front;
  // everything else keeps this relative order so the screen never reshuffles
  // beyond that single top slot.
  //
  // The "Around your workout" shelf sits just under Mains — high in the list
  // because it's the highest-intent shelf for a training-focused user. It's a
  // single shelf (not two) so it keeps the exact same height/rhythm as every
  // other category. Reorder this array freely — nothing else depends on order.
  const categorySections: HomeCategorySection[] = [
    { key: 'mains',     title: MAINS_TITLE,           cuisine: 'mains',     meals: mains },
    { key: 'workout',   title: AROUND_WORKOUT_TITLE,  cuisine: 'workout',   meals: aroundWorkout, showWorkoutBadge: true },
    { key: 'breakfast', title: 'Breakfast',           cuisine: 'breakfast', meals: breakfast },
    { key: 'snacks',    title: 'Snacks',              cuisine: 'snack',     meals: snacks },
    { key: 'desserts',    title: 'Desserts',         cuisine: 'dessert',      meals: desserts },
    { key: 'smoothies',   title: 'Smoothies',        cuisine: 'smoothie',     meals: smoothies },
  ];

  const orderedSections: HomeCategorySection[] = (() => {
    const floated = categorySections.find(s => s.key === daypart.key);
    if (!floated) return categorySections;
    return [floated, ...categorySections.filter(s => s.key !== daypart.key)];
  })();

  // ===== State =====
  const [shareModal, setShareModal] = useState<{
    visible: boolean;
    plan: MealPlan | null;
    qrCode?: string;
    shareUrl?: string;
    isGenerating?: boolean;
  }>({
    visible: false,
    plan: null,
    qrCode: undefined,
    shareUrl: undefined,
    isGenerating: false,
  });
  const [successModal, setSuccessModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ visible: boolean; plan: MealPlan | null }>({
    visible: false,
    plan: null,
  });
  const [renameModal, setRenameModal] = useState<{ visible: boolean; plan: MealPlan | null; newName: string }>({
    visible: false,
    plan: null,
    newName: '',
  });
  const [savedMealPlans, setSavedMealPlans] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const [completionStatus, setCompletionStatus] = useState<NutritionCompletionStatus>({
    nutritionGoals: false,
    budgetCooking: false,
    sleepOptimization: false,
    fridgePantry: false,
    favoriteMeals: false,
  });

  // ===== Effects / loaders =====
  const loadCompletionStatus = async () => {
    try {
      const status = await WorkoutStorage.loadNutritionCompletionStatus();
      setCompletionStatus(status);
    } catch (error) {
      console.error('Failed to load completion status:', error);
    }
  };

  const loadSavedMealPlansState = async () => {
    try {
      const existingMealPlans = await WorkoutStorage.loadMealPlans();
      const savedIds = new Set(existingMealPlans.map(plan => plan.fingerprint || plan.id));
      setSavedMealPlans(savedIds);
    } catch (error) {
      console.error('Failed to load saved meal plans state:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCompletionStatus();
      loadSavedMealPlansState();
    }, [])
  );

  useEffect(() => {
    if (route?.params?.refresh) {
      // refresh handled via MealPlanningContext
    }
  }, [route?.params?.refresh]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCompletionStatus();
      await loadSavedMealPlansState();
    } finally {
      setRefreshing(false);
    }
  }, []);

  // ===== Action sheet handlers =====
  const handleActionRequest = (plan: MealPlan) => {
    setDeleteModal({ visible: true, plan });
  };

  // Opens share modal from inside the action sheet — same wiring pattern
  // as HomeScreen.tsx: dismiss the sheet, wait 200ms for animation, then
  // call handleExport which generates the QR + universal link.
  const handleShareFromActionSheet = (plan: MealPlan) => {
    setDeleteModal({ visible: false, plan: null });
    setTimeout(() => {
      handleExport(plan);
    }, 200);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.plan) return;

    try {
      const originalPlan = mealPlans.find(p => p.name === deleteModal.plan?.name);
      if (originalPlan) {
        await deleteMealPlan(originalPlan.id);
      }
      setDeleteModal({ visible: false, plan: null });
    } catch (error) {
      console.error('Failed to delete meal plan:', error);
    }
  };

  const handleRenameRequest = (plan: MealPlan) => {
    setDeleteModal({ visible: false, plan: null });
    setRenameModal({ visible: true, plan, newName: plan.name });
  };

  const handleRenameConfirm = async () => {
    const { plan, newName } = renameModal;
    if (!plan || !newName.trim()) return;

    try {
      const originalPlan = mealPlans.find(p => p.name === plan.name);
      if (originalPlan) {
        const updatedPlan = { ...originalPlan, name: newName.trim() };
        await saveMealPlan(updatedPlan);
      }
      setRenameModal({ visible: false, plan: null, newName: '' });
    } catch (error) {
      console.error('Failed to rename meal plan:', error);
      Alert.alert('Error', 'Failed to rename meal plan. Please try again.');
    }
  };

  // ===== Plan switching / navigation — preserved verbatim from original =====
  const handleMealPlanSwitch = async (plan: MealPlan) => {
    const originalPlan = mealPlans.find(p => p.name === plan.name);
    if (originalPlan && originalPlan.id !== currentPlan?.id) {
      await setCurrentPlan(originalPlan.id);
      console.log(`🔄 Switched to meal plan: ${originalPlan.name}`);
    }
  };

  const handleMealPlanNavigation = (plan: MealPlan, opts?: { openGrocery?: boolean }) => {
    console.log('🍽️ Navigating to meal plan (no scaling):', plan.name);

    handleMealPlanSwitch(plan);

    if (plan.data?.days) {
      const week = {
        week_number: 1,
        days: plan.data.days
      };

      let mealPrepSession = null;
      if (plan.data.weekly_meal_prep) {
        mealPrepSession = {
          session_name: `${plan.name} - Weekly Meal Prep`,
          session_number: 1,
          prep_day: 'Sunday evening',
          total_time: plan.data.weekly_meal_prep.total_prep_time || 90,
          prep_time: Math.floor((plan.data.weekly_meal_prep.total_prep_time || 90) / 3),
          cook_time: Math.floor((plan.data.weekly_meal_prep.total_prep_time || 90) * 2 / 3),
          total_prep_time: plan.data.weekly_meal_prep.total_prep_time || 90,
          covers: `${plan.duration} days`,
          covers_days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          recommended_timing: 'Sunday evening',
          instructions: plan.data.weekly_meal_prep.prep_session_guide?.map(step =>
            `${step.title}: ${step.description}`
          ) || [],
          prep_meals: plan.data.days && plan.data.days[0]?.meals ?
            plan.data.days[0].meals.map(meal => ({
              meal_name: meal.meal_name,
              meal_type: meal.meal_type,
              prep_time: meal.prep_time || 0,
              cook_time: meal.cook_time || 0,
              total_time: meal.total_time || 0,
              servings: meal.servings || 1,
              calories: meal.calories || 0,
              macros: meal.macros || { protein: 0, carbs: 0, fat: 0, fiber: 0 },
              ingredients: meal.ingredients?.map(ing => ({
                item: ing.item,
                amount: ing.amount,
                unit: ing.unit,
                scalable: true,
                notes: ing.notes || ''
              })) || [],
              instructions: meal.instructions || [],
              meal_prep_notes: meal.notes || '',
              base_servings: meal.servings || 1,
              weekly_meal_coverage: meal.weekly_meal_coverage || []
            })) : [],
          equipment_needed: ['Large pot', 'Baking tray', 'Microwave-safe containers'],
          ingredients: [],
          storage_guidelines: {
            proteins: 'Refrigerate cooked proteins for up to 4 days, freeze for longer storage',
            grains: 'Store cooked grains in airtight containers in refrigerator for up to 5 days',
            vegetables: 'Store prepared vegetables in refrigerator, add frozen vegetables raw to containers'
          }
        };
      }

      navigation.navigate('MealPlanDays' as any, {
        week,
        mealPlanName: plan.name,
        mealPrepSession,
        allMealPrepSessions: plan.data?.meal_prep_sessions || (mealPrepSession ? [mealPrepSession] : []),
        groceryList: plan.data?.grocery_list,
        // Optional hint for MealPlanDays: when set, open/scroll to the
        // grocery list section. A no-op until that screen reads it.
        ...(opts?.openGrocery ? { openGrocery: true } : {}),
      });
      return;
    }

    if (!plan.data?.weeks) return;

    if (plan.duration <= 7 || plan.data.weeks.length === 1) {
      const week = plan.data.weeks[0];
      navigation.navigate('MealPlanDays' as any, {
        week,
        mealPlanName: plan.name,
        mealPrepSession: plan.data.meal_prep_session,
        allMealPrepSessions: plan.data?.meal_prep_sessions || [],
        groceryList: plan.data?.grocery_list,
        ...(opts?.openGrocery ? { openGrocery: true } : {}),
      });
      return;
    }

    navigation.navigate('MealPlanWeeks' as any, { mealPlan: plan });
  };

  // Jump to today's day-of-week within the meal plan.
  // Uses the existing cleanMealPlanNavigation utility — same logic that was
  // already in the file, just now wired up to the new primary CTA.
  //
  // CHANGED: now takes the plan it should operate on and switches to it first,
  // so that the secondary plan cards' "Start today's meals" button jumps to
  // *that* plan's today, not whatever the current hero plan is.
  const handleJumpToToday = (plan: MealPlan) => {
    try {
      // Make sure the tapped plan becomes the active plan before we resolve
      // "today" against it — otherwise findBestTodayDate reads currentPlan,
      // which may still be the hero plan.
      handleMealPlanSwitch(plan);

      const {
        findBestTodayDate,
        navigateToMealDay,
        navigateToMealPlanDays
      } = require('../utils/cleanMealPlanNavigation');

      // Prefer the original SimplifiedMealPlan that matches this card, so the
      // navigation utility resolves against the correct plan's days.
      const originalPlan = mealPlans.find(p => p.name === plan.name);
      const resolvePlan = originalPlan || currentPlan;

      const bestTodayDate = findBestTodayDate(resolvePlan);

      if (bestTodayDate) {
        navigateToMealDay(navigation, bestTodayDate, {
          id: originalPlan?.id || currentPlan?.id || plan.id || 'unknown',
          name: plan.name
        });
      } else {
        navigateToMealPlanDays(navigation, {
          id: originalPlan?.id || currentPlan?.id || plan.id || 'unknown',
          name: plan.name
        });
      }
    } catch (error) {
      console.error('❌ Today button navigation failed:', error);
      navigation.navigate('MealPlanDays' as any, {
        planId: currentPlan?.id || plan.id || 'unknown',
        planName: plan.name
      });
    }
  };

  // ===== Save / unsave to "My Meals" — preserved verbatim =====
  const isPlanSaved = (plan: MealPlan): boolean => {
    const planId = plan.fingerprint || plan.id;
    return savedMealPlans.has(planId);
  };

  const handleToggleSaveMealPlan = async (plan: MealPlan) => {
    try {
      const originalPlan = mealPlans.find(p => p.name === plan.name);
      if (!originalPlan) {
        Alert.alert('Error', 'Could not find meal plan.');
        return;
      }

      const planId = originalPlan.fingerprint || originalPlan.id;
      const isCurrentlySaved = savedMealPlans.has(planId);

      console.log('💾 Save meal plan button pressed:', originalPlan.name, 'Currently saved:', isCurrentlySaved);

      if (isCurrentlySaved) {
        await WorkoutStorage.removeMealPlan(planId);
        setSavedMealPlans(prev => {
          const newSet = new Set(prev);
          newSet.delete(planId);
          return newSet;
        });
        console.log('❌ Meal plan removed from My Meals');
      } else {
        const transformedMealPlan = {
          id: originalPlan.id,
          name: originalPlan.name,
          duration: Object.keys(originalPlan.dailyMeals).length,
          meals: Object.values(originalPlan.dailyMeals).reduce((total, day: any) => total + day.meals.length, 0),
          data: originalPlan,
          fingerprint: originalPlan.fingerprint || originalPlan.id,
          createdAt: Date.now(),
        };

        await WorkoutStorage.addMealPlan(transformedMealPlan);
        setSavedMealPlans(prev => new Set([...prev, transformedMealPlan.fingerprint]));
        console.log('✅ Meal plan saved successfully');
      }
    } catch (error) {
      console.error('Failed to toggle meal plan save:', error);
      Alert.alert('Error', 'Failed to update meal plan. Please try again.');
    }
  };

  // ===== Sharing — universal link + QR + send link — preserved verbatim =====
  const createUniversalLink = async (mealPlanData: any): Promise<string | null> => {
    try {
      const shareResult = await createShare({
        mealPlanData: mealPlanData
      });
      return shareResult.shareUrl || null;
    } catch (error) {
      console.error('Failed to create universal link:', error);
      return null;
    }
  };

  const handleExport = async (plan: MealPlan) => {
    setShareModal({
      visible: true,
      plan,
      qrCode: undefined,
      shareUrl: undefined,
      isGenerating: true
    });

    try {
      // CHANGED: was hard-coded to currentPlan. Now resolves the original
      // SimplifiedMealPlan matching the tapped card so that sharing a
      // secondary plan exports that plan, not the hero plan.
      const originalPlan = mealPlans.find(p => p.name === plan.name) || currentPlan;

      if (!originalPlan) {
        console.error('❌ No plan to export');
        setShareModal(prev => ({ ...prev, isGenerating: false }));
        return;
      }

      const mealPlanToShare = {
        ...originalPlan,
        exported_with_customizations: true,
        export_timestamp: new Date().toISOString(),
        export_note: "This export includes all customizations: manually added meals and permanently deleted meals"
      };

      const shareUrl = await createUniversalLink(mealPlanToShare);

      if (shareUrl) {
        setShareModal(prev => ({
          ...prev,
          qrCode: shareUrl,
          shareUrl,
          isGenerating: false
        }));
      } else {
        setShareModal(prev => ({ ...prev, isGenerating: false }));
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      setShareModal(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const handleShare = async (action: 'copy' | 'share' | 'copyUrl') => {
    if (!shareModal.plan) return;

    try {
      if (action === 'copyUrl' && shareModal.shareUrl) {
        await Clipboard.setStringAsync(shareModal.shareUrl);
        setShareModal({ ...shareModal, visible: false });
        setTimeout(() => {
          setSuccessModal(true);
        }, 100);
        return;
      }

      console.log('📤 Exporting SimplifiedMealPlan with all customizations');

      // CHANGED: resolve the original plan that matches the share modal's plan
      // rather than always exporting currentPlan.
      const originalPlan = mealPlans.find(p => p.name === shareModal.plan?.name) || currentPlan;

      if (!originalPlan) {
        console.error('❌ No plan to export');
        return;
      }

      const mealPlanToExport = {
        ...originalPlan,
        exported_with_customizations: true,
        export_timestamp: new Date().toISOString(),
        export_note: "This export includes all customizations: manually added meals and permanently deleted meals"
      };

      const mealPlanData = JSON.stringify(mealPlanToExport, null, 2);

      if (action === 'copy') {
        await Clipboard.setStringAsync(mealPlanData);
        setShareModal({ ...shareModal, visible: false });
        setTimeout(() => {
          setSuccessModal(true);
        }, 100);
      } else {
        const shareContent = shareModal.shareUrl
          ? `Check out this meal plan: ${shareModal.plan.name}\n\n${shareModal.shareUrl}`
          : `Check out this meal plan: ${shareModal.plan.name}\n\n${mealPlanData}`;

        await Share.share({
          message: shareContent,
          title: shareModal.plan.name,
        });
        setShareModal({ ...shareModal, visible: false });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      setShareModal({ ...shareModal, visible: false });
    }
  };

  const openCreateFlow = async () => {
    await startNutritionFlow(navigation);
  };

  // ============================================================================
  // HANDLERS — for the category feed
  // ============================================================================

  const handleMealCardPress = (meal: CuratedMeal) => {
    navigation.navigate('RecipeDetail' as any, { mealSlug: meal.slug });
  };

  // CHANGED: now param-driven. Every category's "See all" routes into a single
  // generic CategoryLibrary screen, pre-filtered by cuisine. 'mains' is a
  // sentinel meaning "all savoury mains" (any cuisine except breakfast / snack
  // / dessert / smoothie) — the CategoryLibrary screen interprets it.
  //
  // The activity shelf passes 'workout' as a sentinel too, but it's a TAG
  // filter rather than a cuisine filter. The MealsLibrary screen must
  // special-case 'workout' and show any meal carrying a 'pre-workout' OR
  // 'post-workout' tag (using the same normalizeTag logic) instead of filtering
  // by cuisine.
  //
  // NOTE: 'CategoryLibrary' must be registered in AppNavigator and accept
  // { cuisine, title } params. The legacy MealsLibrary / SmoothiesLibrary
  // screens are left intact in the navigator but are no longer routed to here.
  const handleSeeAllPress = (cuisine: string, title: string) => {
    navigation.navigate('MealsLibrary' as any, { cuisine, title });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  /**
   * Renders a single horizontal scroll card for any category feed.
   * Hero image with title overlay, footer chip row with time and macros.
   * Width is fixed at 280px to give a clean snap-feel as user scrolls.
   *
   * showWorkoutBadge: only the "Around your workout" shelf passes true. When
   * set, a small PRE / POST pill is overlaid on the image (top-left). Every
   * other shelf calls this without the flag, so no other shelf shows a badge —
   * even if a meal happens to carry a workout tag.
   */
  const renderFeedCard = (meal: CuratedMeal, showWorkoutBadge: boolean = false) => {
    const { kcal, protein, carbs, fat, totalMinutes } = getCardSummary(meal);
    const imageSource = getMealImage(meal.plates?.[0]?.image_filename ?? meal.image_filename);
    const workoutLabel = showWorkoutBadge ? getWorkoutTagLabel(meal) : null;

    return (
      <TouchableOpacity
        key={meal.slug}
        style={styles.feedCard}
        activeOpacity={0.85}
        onPress={() => handleMealCardPress(meal)}
      >
        <View style={styles.feedCardImageWrap}>
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.feedCardImage}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View style={[styles.feedCardImage, styles.feedCardImagePlaceholder]}>
              <Ionicons name="restaurant-outline" size={28} color="#52525b" />
            </View>
          )}

          {/* PRE / POST badge — overlaid on the image so it adds zero vertical
              space and the workout shelf stays the same height as the others.
              Accent uses themeColor so it tracks the active theme (incl. pink). */}
          {workoutLabel && (
            <View style={styles.feedCardBadge}>
              <View style={[styles.feedCardBadgeDot, { backgroundColor: themeColor }]} />
              <Text style={[styles.feedCardBadgeText, { color: themeColor }]}>
                {workoutLabel}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.feedCardBody}>
          <Text style={styles.feedCardTitle} numberOfLines={2}>
            {meal.plates?.[0]?.display_name || meal.display_name}
          </Text>
          <Text style={styles.feedCardMeta}>
            {formatTime(totalMinutes)} · {kcal} kcal
          </Text>

          <View style={styles.feedCardMacroGrid}>
            <View style={styles.feedCardMacroCell}>
              <Text style={[styles.feedCardMacroValue, { color: themeColor }]}>
                {protein}g
              </Text>
              <Text style={styles.feedCardMacroLabel}>PROTEIN</Text>
            </View>
            <View style={styles.feedCardMacroDivider} />
            <View style={styles.feedCardMacroCell}>
              <Text style={styles.feedCardMacroValueMuted}>{carbs}g</Text>
              <Text style={styles.feedCardMacroLabel}>CARBS</Text>
            </View>
            <View style={styles.feedCardMacroDivider} />
            <View style={styles.feedCardMacroCell}>
              <Text style={styles.feedCardMacroValueMuted}>{fat}g</Text>
              <Text style={styles.feedCardMacroLabel}>FAT</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Renders a "See more" card at the end of the horizontal scroll.
   *
   * Design: same card dimensions as a real meal card. The image area is
   * replaced with a 2x2 grid of thumbnails previewing what's in the library
   * — specifically the meals the user hasn't scrolled past yet (positions 6-9
   * of the source list). This sells the library: "here's the kind of variety
   * you'll find in there", rather than showing the same images already on
   * screen.
   *
   * The macro grid slot is replaced with a row containing the title and a
   * circular arrow button. No fake macro data — the slot is explicitly a CTA.
   *
   * CHANGED: now takes the section it belongs to (so it can route the correct
   * cuisine + title) instead of a hard-coded 'meals' | 'smoothies' literal.
   */
  const renderSeeMoreCard = (
    section: HomeCategorySection,
    previewMeals: CuratedMeal[],
    totalCount: number
  ) => {
    // We expect exactly 4 thumbnails. Pad with whatever's available if the
    // source has fewer than 4 unseen meals (unlikely with current data, but
    // defensive — meals could shrink in dev).
    const thumbs = previewMeals.slice(0, 4);
    const isSmoothie = section.cuisine === 'smoothie';

    return (
      <TouchableOpacity
        key="see-more"
        style={styles.feedCard}
        activeOpacity={0.85}
        onPress={() => handleSeeAllPress(section.cuisine, section.title)}
        accessibilityRole="button"
        accessibilityLabel={`See all ${totalCount} ${section.title}`}
      >
        {/* Thumbnail preview grid — fills the same 16:9 slot a hero image
            would occupy. 2x2 cells with a 1px gap between them. */}
        <View style={styles.seeMoreImageWrap}>
          <View style={styles.seeMoreGrid}>
            {thumbs.map((meal, idx) => {
              const imageSource = getMealImage(meal.plates?.[0]?.image_filename ?? meal.image_filename);
              return (
                <View
                  key={meal.slug}
                  style={[
                    styles.seeMoreThumb,
                    // Positional borders so the 2x2 grid has clean 1px gutters
                    // without using gap (which doesn't render cleanly on iOS for
                    // absolute-positioned image children).
                    idx === 1 && styles.seeMoreThumbRight,
                    idx === 2 && styles.seeMoreThumbBottom,
                    idx === 3 && styles.seeMoreThumbBottomRight,
                  ]}
                >
                  {imageSource ? (
                    <Image
                      source={imageSource}
                      style={styles.seeMoreThumbImage}
                      contentFit="cover"
                      transition={100}
                    />
                  ) : (
                    <View style={styles.seeMoreThumbPlaceholder}>
                      <Ionicons
                        name={isSmoothie ? 'cafe-outline' : 'restaurant-outline'}
                        size={16}
                        color="#52525b"
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Body — title + chevron, no macro grid. Same height as a real
            card body so the row keeps its rhythm. */}
        <View style={styles.feedCardBody}>
          <View style={styles.seeMoreBodyRow}>
            <View style={styles.seeMoreBodyText}>
              <Text style={styles.feedCardTitle} numberOfLines={2}>
                See all {section.title}
              </Text>
              <Text style={styles.feedCardMeta}>{totalCount} recipes</Text>
            </View>
            <View style={[styles.seeMoreArrow, { backgroundColor: themeColor }]}>
              <Ionicons name="arrow-forward" size={16} color="#0a0a0b" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {convertedMealPlans.length === 0 ? (
          // ============================================================
          // EMPTY STATE — no meal plans yet
          // Hero is replaced with "Plan your meals" prompt, but the
          // category sections still appear below so users can discover
          // recipes without having a plan.
          // ============================================================
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} colors={[themeColor]} />
            }
          >
            <Text style={styles.title}>Nutrition</Text>
            <ExamplePlanCard />

            {/* Category sections, even without a plan */}
            {renderAllSections()}
          </ScrollView>
        ) : (
          // ============================================================
          // POPULATED STATE — hero card + category feed + other plans
          // ============================================================
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} colors={[themeColor]} />
            }
          >
            <Text style={styles.title}>Nutrition</Text>

            <View style={styles.sectionHeaderActionRow}>
              <Text style={styles.sectionLabel}>YOUR PLANS</Text>
              <TouchableOpacity
                onPress={openCreateFlow}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Create a new meal plan"
              >
                <Text style={[styles.sectionAction, { color: themeColor }]}>+ New plan</Text>
              </TouchableOpacity>
            </View>

            {currentPlanLegacy && (
              <View style={[styles.heroCard, { borderColor: themeColor, shadowColor: themeColor }]}>
                {/* ••• menu — opens action sheet (Share, Save, Rename, Remove) */}
                <RNTouchable
                  style={styles.heroMenuBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleActionRequest(currentPlanLegacy);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel="More options"
                >
                  <Ionicons name="ellipsis-horizontal" size={18} color="#a1a1aa" />
                </RNTouchable>

                <Pressable
                  onPress={() => handleMealPlanNavigation(currentPlanLegacy)}
                  onLongPress={() => handleActionRequest(currentPlanLegacy)}
                  delayLongPress={600}
                >
                  <View style={styles.heroEyebrowRow}>
                    <Text style={[styles.heroEyebrow, { color: themeColor }]}>CURRENT PLAN</Text>
                    {heroToday && (
                      <View style={styles.heroDayBadge}>
                        <Text style={styles.heroDayBadgeText}>
                          DAY {heroToday.dayIndex + 1} OF {heroToday.totalDays}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.heroTitleText} numberOfLines={2}>
                    {currentPlanLegacy.name}
                  </Text>
                  {heroAverages ? (
                    <Text style={styles.heroSubtitle}>
                      <Text style={styles.heroSubtitleStrong}>
                        {heroAverages.kcal.toLocaleString()} kcal
                      </Text>
                      {' · '}
                      <Text style={styles.heroSubtitleStrong}>{heroAverages.protein}g protein</Text>
                      {' per day'}
                    </Text>
                  ) : (
                    <Text style={styles.heroSubtitle}>
                      {currentPlanLegacy.duration} {currentPlanLegacy.duration === 1 ? 'day' : 'days'}
                      {getMacroSplitDisplay(currentPlanLegacy) ? ` • ${getMacroSplitDisplay(currentPlanLegacy)}` : ''}
                    </Text>
                  )}
                </Pressable>

                {/* TODAY filmstrip — today's meals as photo thumbnails, resolved
                    from the plan's curated references. Invented meals get a
                    monogram tile; overflow collapses into a "+N" tile. Tapping
                    anywhere on the strip is the same as the Start button. */}
                {heroToday && heroToday.meals.length > 0 && (
                  <Pressable onPress={() => handleJumpToToday(currentPlanLegacy)}>
                    <Text style={styles.heroStripLabel}>{heroToday.stripLabel}</Text>
                    <View style={styles.heroStrip}>
                      {heroToday.meals.slice(0, 4).map((m) => (
                        <View key={m.key} style={styles.heroThumb}>
                          {m.image ? (
                            <Image
                              source={m.image}
                              style={styles.heroThumbImg}
                              contentFit="cover"
                              transition={120}
                            />
                          ) : (
                            <View style={styles.heroThumbMono}>
                              <Text style={styles.heroThumbMonoText}>
                                {(m.name || '?').slice(0, 1).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <View style={styles.heroThumbNameWrap}>
                            <Text style={styles.heroThumbName} numberOfLines={1}>
                              {m.name}
                            </Text>
                          </View>
                        </View>
                      ))}
                      {heroToday.meals.length > 4 && (
                        <View style={[styles.heroThumb, styles.heroThumbMore]}>
                          <Text style={styles.heroThumbMoreCount}>
                            +{heroToday.meals.length - 4}
                          </Text>
                          <Text style={styles.heroThumbMoreLabel}>MORE</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.heroProgressTrack}>
                      <View
                        style={[
                          styles.heroProgressFill,
                          {
                            backgroundColor: themeColor,
                            width: `${Math.round(((heroToday.dayIndex + 1) / heroToday.totalDays) * 100)}%`,
                          },
                        ]}
                      />
                    </View>
                  </Pressable>
                )}

                {/* Primary: full-width "Start today's meals" button.
                    Routes through handleJumpToToday → cleanMealPlanNavigation
                    → finds today's day-of-week in the plan and navigates to it. */}
                <TouchableOpacity
                  style={[styles.heroTodayBtn, { backgroundColor: themeColor, shadowColor: themeColor }]}
                  onPress={() => handleJumpToToday(currentPlanLegacy)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Start today's meals"
                >
                  <Ionicons name="restaurant" size={14} color="#0a0a0b" />
                  <Text style={styles.heroTodayText}>Start today's meals</Text>
                </TouchableOpacity>

                {/* Footer links: full plan + grocery list (people open this
                    screen standing in the supermarket — the list shouldn't be
                    two taps deep). */}
                <View style={styles.heroLinksRow}>
                  <TouchableOpacity
                    style={styles.heroLinkBtn}
                    onPress={() => handleMealPlanNavigation(currentPlanLegacy)}
                    activeOpacity={0.6}
                    accessibilityRole="button"
                    accessibilityLabel="View full plan"
                  >
                    <Text style={[styles.heroPlanLinkText, { color: themeColor }]}>View full plan</Text>
                    <Ionicons name="chevron-forward" size={13} color={themeColor} />
                  </TouchableOpacity>
                  <View style={styles.heroLinkSep} />
                  <TouchableOpacity
                    style={styles.heroLinkBtn}
                    onPress={() => {
                      const groceryList = heroOriginal?.grocery_list;
                      if (groceryList) {
                        navigation.navigate('GroceryList' as any, { groceryList });
                      } else {
                        handleMealPlanNavigation(currentPlanLegacy);
                      }
                    }}
                    activeOpacity={0.6}
                    accessibilityRole="button"
                    accessibilityLabel="Open grocery list"
                  >
                    <Ionicons name="cart-outline" size={13} color={themeColor} />
                    <Text style={[styles.heroPlanLinkText, { color: themeColor }]}>Grocery list</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ====================================================== */}
            {/* OTHER PLANS — greyed-out secondary plan cards,          */}
            {/* mirroring HomeScreen.tsx's planCardSecondary treatment. */}
            {/* Each card has: ••• menu, tappable title/subtitle, and a  */}
            {/* "Start today's meals" button.                           */}
            {/* ====================================================== */}
            {otherPlans.map((plan) => {
              const macroSplit = getMacroSplitDisplay(plan);
              const averages = getPlanDailyAverages(plan);
              return (
                <View key={plan.id} style={styles.planRow}>
                  <RNTouchable
                    style={styles.planRowMenuBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleActionRequest(plan);
                    }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel="More options"
                  >
                    <Ionicons name="ellipsis-horizontal" size={15} color="#a1a1aa" />
                  </RNTouchable>

                  <Pressable
                    style={styles.planRowInfo}
                    onPress={() => handleMealPlanNavigation(plan)}
                    onLongPress={() => handleActionRequest(plan)}
                    delayLongPress={600}
                  >
                    <Text style={styles.planRowTitle} numberOfLines={1}>
                      {plan.name}
                    </Text>
                    <Text style={styles.planRowSub} numberOfLines={1}>
                      {plan.duration} {plan.duration === 1 ? 'day' : 'days'}
                      {averages
                        ? ` · ${averages.kcal.toLocaleString()} kcal · ${averages.protein}g protein`
                        : macroSplit
                        ? ` · ${macroSplit}`
                        : ''}
                    </Text>
                  </Pressable>

                  <TouchableOpacity
                    style={styles.planRowGo}
                    onPress={() => handleJumpToToday(plan)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Start today's meals"
                  >
                    <Ionicons name="restaurant" size={15} color="#d4d4d8" />
                  </TouchableOpacity>
                </View>
              );
            })}

            {/* ====================================================== */}
            {/* Category horizontal scroll sections (daypart-floated)  */}
            {/* ====================================================== */}
            {renderAllSections()}

          </ScrollView>
        )}
      </Animated.View>

      {/* ============================================================ */}
      {/* MODALS                                                        */}
      {/* ============================================================ */}

      {/* Action Sheet — option-3 header-card layout */}
      <AppModal
        visible={deleteModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModal({ visible: false, plan: null })}
      >
        <View style={styles.actionModalOverlay}>
          <RNTouchable
            style={styles.actionModalBackdrop}
            activeOpacity={1}
            onPress={() => setDeleteModal({ visible: false, plan: null })}
          />

          <View style={[styles.actionSheet, { borderColor: themeColor, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.handleBar} />

            {(() => {
              const originalPlan = mealPlans.find(p => p.name === deleteModal.plan?.name);
              const planId = originalPlan?.fingerprint || originalPlan?.id;
              const isSaved = !!(planId && savedMealPlans.has(planId));
              return (
                <>
                  {/* Header: thumbnail + title + close */}
                  <View style={styles.actionHeaderRow}>
                    <View style={styles.actionThumb}>
                      <Ionicons name="restaurant" size={26} color={themeColor} />
                    </View>
                    <View style={styles.actionHeaderText}>
                      <Text style={styles.actionPlanName} numberOfLines={2}>
                        {deleteModal.plan?.name}
                      </Text>
                      <Text style={styles.actionPlanDetails}>
                        {deleteModal.plan?.duration} {deleteModal.plan?.duration === 1 ? 'day' : 'days'}
                        {deleteModal.plan && getMacroSplitDisplay(deleteModal.plan) ? ` · ${getMacroSplitDisplay(deleteModal.plan)}` : ''}
                      </Text>
                    </View>
                    <RNTouchable
                      style={styles.actionCloseButton}
                      onPress={() => setDeleteModal({ visible: false, plan: null })}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    >
                      <Ionicons name="close" size={22} color="#71717a" />
                    </RNTouchable>
                  </View>

                  {/* Primary CTA: Share */}
                  <RNTouchable
                    style={[styles.shareCtaButton, { backgroundColor: themeColor, shadowColor: themeColor }]}
                    onPress={() => deleteModal.plan && handleShareFromActionSheet(deleteModal.plan)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="share-outline" size={18} color="#0a0a0b" />
                    <Text style={styles.shareCtaText}>Share plan</Text>
                  </RNTouchable>

                  {/* Secondary tile row: Save / Rename / Remove */}
                  <View style={styles.tileRow}>
                    <RNTouchable
                      style={[
                        styles.actionTile,
                        isSaved && {
                          backgroundColor: themeColor + '1A',
                          borderColor: themeColor + '66',
                        },
                      ]}
                      onPress={() => {
                        if (deleteModal.plan) {
                          handleToggleSaveMealPlan(deleteModal.plan);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isSaved ? 'heart-dislike' : 'heart'}
                        size={19}
                        color={isSaved ? themeColor : '#d4d4d8'}
                      />
                      <Text style={[styles.actionTileText, isSaved && { color: themeColor }]}>
                        {isSaved ? 'Saved' : 'Save'}
                      </Text>
                    </RNTouchable>

                    <RNTouchable
                      style={styles.actionTile}
                      onPress={() => deleteModal.plan && handleRenameRequest(deleteModal.plan)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={19} color="#d4d4d8" />
                      <Text style={styles.actionTileText}>Rename</Text>
                    </RNTouchable>

                    <RNTouchable
                      style={styles.actionTileDanger}
                      onPress={handleDeleteConfirm}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={19} color="#f87171" />
                      <Text style={styles.actionTileDangerText}>Remove</Text>
                    </RNTouchable>
                  </View>

                  {/* Cancel */}
                  <RNTouchable
                    style={styles.actionCancel}
                    onPress={() => setDeleteModal({ visible: false, plan: null })}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.actionCancelText}>Cancel</Text>
                  </RNTouchable>
                </>
              );
            })()}
          </View>
        </View>
      </AppModal>

      {/* Share Modal — QR code + send link */}
      <AppModal
        visible={shareModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShareModal({ visible: false, plan: null, qrCode: undefined, shareUrl: undefined, isGenerating: false })}
      >
        <View style={styles.newShareOverlay}>
          <TouchableOpacity
            style={styles.newShareBackdrop}
            activeOpacity={1}
            onPress={() => setShareModal({ visible: false, plan: null, qrCode: undefined, shareUrl: undefined, isGenerating: false })}
          />

          <View style={[styles.newShareModal, { borderColor: themeColor, shadowColor: themeColor }]}>
            <View style={styles.newShareHeader}>
              <TouchableOpacity
                style={styles.newShareClose}
                onPress={() => setShareModal({ visible: false, plan: null, qrCode: undefined, shareUrl: undefined, isGenerating: false })}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <Image
              source={isPinkTheme ?
                require('./../../lucid-origin_Two_athletic_women_enjoying_a_healthy_meal_together_in_a_modern_kitchen_one_pass-0.jpg') :
                require('./../../lucid-origin_Two_athletic_men_enjoying_a_healthy_meal_together_in_a_modern_kitchen_one_passin-0.jpg')
              }
              style={styles.newShareImage}
              contentFit="cover"
            />

            <View style={styles.newShareContent}>
              <Text style={[styles.newShareTitle, { color: themeColor }]}>
                {shareModal.plan?.name?.toUpperCase()}
              </Text>

              {shareModal.isGenerating ? (
                <View style={styles.qrCodeContainer}>
                  <View style={styles.qrCodePlaceholder}>
                    <Ionicons name="refresh" size={32} color={themeColor} />
                    <Text style={styles.qrCodeLoadingText}>Generating QR code...</Text>
                  </View>
                </View>
              ) : shareModal.qrCode ? (
                <View style={styles.qrCodeContainer}>
                  <View style={styles.qrCodeWrapper}>
                    <QRCode
                      value={shareModal.qrCode}
                      size={240}
                      backgroundColor="white"
                      color="black"
                    />
                  </View>
                </View>
              ) : null}

              {shareModal.qrCode && (
                <TouchableOpacity
                  style={[styles.sendLinkButton, { backgroundColor: themeColor }]}
                  onPress={() => handleShare('share')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share" size={20} color="#0a0a0b" />
                  <Text style={styles.sendLinkText}>SEND LINK</Text>
                </TouchableOpacity>
              )}

              {shareModal.qrCode && (
                <Text style={styles.linkExpiryText}>Link expires in 7 days</Text>
              )}
            </View>
          </View>
        </View>
      </AppModal>

      {/* Rename Modal */}
      <AppModal
        visible={renameModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRenameModal({ visible: false, plan: null, newName: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.renameContainer, { shadowColor: themeColor }]}>
            <View style={styles.renameIconContainer}>
              <Ionicons name="create-outline" size={32} color={themeColor} />
            </View>

            <Text style={styles.renameTitle}>Rename Meal Plan</Text>

            <View style={styles.renameInputContainer}>
              <TextInput
                style={styles.renameInput}
                value={renameModal.newName}
                onChangeText={(text) => setRenameModal(prev => ({ ...prev, newName: text }))}
                placeholder="Enter new name"
                placeholderTextColor="#71717a"
                autoFocus={true}
                selectTextOnFocus={true}
              />
            </View>

            <View style={styles.renameButtons}>
              <TouchableOpacity
                style={styles.renameCancelButton}
                onPress={() => setRenameModal({ visible: false, plan: null, newName: '' })}
                activeOpacity={0.7}
              >
                <Text style={styles.renameCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.renameConfirmButton, { backgroundColor: themeColor }]}
                onPress={handleRenameConfirm}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark" size={18} color="#0a0a0b" />
                <Text style={styles.renameConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </AppModal>

      {/* Success Modal */}
      <AppModal
        visible={successModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>Copied!</Text>
            <Text style={styles.successMessage}>Meal plan copied to clipboard</Text>

            <TouchableOpacity
              style={[styles.successButton, { backgroundColor: themeColor }]}
              onPress={() => setSuccessModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppModal>
    </View>
  );

  /**
   * Renders one category shelf. Skips categories with fewer than 3 meals so a
   * sparse shelf never looks broken. The first shelf in `orderedSections` is
   * the daypart-floated one and gets a contextual eyebrow + title; every other
   * shelf shows its plain category title.
   *
   * NOTE: this <3 guard is what makes the Pre-workout / Post-workout shelves
   * safe to ship before any meals are tagged — an empty/sparse tag set simply
   * means the shelf doesn't render.
   */
  function renderCategorySection(section: HomeCategorySection, isFloated: boolean) {
    if (!section.meals || section.meals.length < 3) return null;

    const displayed = section.meals.slice(0, 5);
    const showSeeMoreCard = section.meals.length > 5;
    // Preview thumbnails come from positions 5-8 (zero-indexed) — i.e. the
    // four meals immediately after what's already on screen. Falls back to
    // earlier meals if the list is shorter than 9.
    const previewThumbs = section.meals.slice(5, 9);
    const headerTitle = isFloated ? daypart.title : section.title;

    return (
      <View key={section.key} style={styles.feedSection}>
        {isFloated && (
          <Text style={[styles.feedSectionEyebrow, { color: themeColor }]}>
            {daypart.eyebrow}
          </Text>
        )}
        <View style={styles.feedSectionHeader}>
          <Text style={styles.feedSectionTitle}>{headerTitle}</Text>
          <TouchableOpacity
            onPress={() => handleSeeAllPress(section.cuisine, section.title)}
            activeOpacity={0.6}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Text style={[styles.feedSectionSeeAll, { color: themeColor }]}>
              See all {section.meals.length} ›
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.feedScrollContent}
        >
          {displayed.map(meal => renderFeedCard(meal, section.showWorkoutBadge))}
          {showSeeMoreCard && renderSeeMoreCard(section, previewThumbs, section.meals.length)}
        </ScrollView>
      </View>
    );
  }

  /**
   * Renders every category shelf in daypart order. The floated category sits
   * at index 0 (see `orderedSections`), so the eyebrow is shown only there.
   */
  function renderAllSections() {
    return orderedSections.map((section, idx) =>
      renderCategorySection(section, idx === 0 && section.key === daypart.key)
    );
  }
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  animatedContainer: {
    flex: 1,
  },

  // Title bar
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.4,
    marginBottom: 16,
  },
  titleAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll feed
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },

  // ===== "YOUR PLANS" section label — mirrors HomeScreen.tsx =====
  sectionHeaderRow: {
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717a',
    letterSpacing: 1.2,
  },

  // ===== "YOUR PLANS" row with the + New plan action =====
  sectionHeaderActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ===== Hero additions: day badge, filmstrip, progress, footer links =====
  heroEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    paddingRight: 30,
  },
  heroDayBadge: {
    backgroundColor: '#1c1c21',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  heroDayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#a1a1aa',
  },
  heroSubtitleStrong: {
    color: '#d4d4d8',
    fontWeight: '600',
  },
  heroStripLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: '#52525b',
    marginBottom: 7,
  },
  heroStrip: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 13,
  },
  heroThumb: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#222227',
    position: 'relative',
  },
  heroThumbImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroThumbMono: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroThumbMonoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#52525b',
  },
  heroThumbNameWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.62)',
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  heroThumbName: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#e9e9ec',
  },
  heroThumbMore: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#3f3f46',
  },
  heroThumbMoreCount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#d4d4d8',
  },
  heroThumbMoreLabel: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: '#52525b',
    marginTop: 1,
  },
  heroProgressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: '#1f1f24',
    overflow: 'hidden',
    marginBottom: 15,
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  heroLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingTop: 13,
    paddingBottom: 2,
  },
  heroLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroLinkSep: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#3f3f46',
  },

  // ===== Compact secondary plan rows =====
  planRow: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    borderColor: '#27272a',
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
  },
  planRowInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 20,
  },
  planRowTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  planRowSub: {
    color: '#71717a',
    fontSize: 12,
  },
  planRowGo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3f3f46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRowMenuBtn: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  // Section grouping (for "Other plans" — old style)
  // FIX: removed paddingHorizontal: 16. scrollContent already pads, so this was doubling up.
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a1a1aa',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // ==========================================================================
  // Hero / current plan card — now matches HomeScreen.tsx planCardPrimary
  // exactly (same radius, padding, title size, pill button, link styling).
  // The only intentional differences are the icon glyph (restaurant vs play)
  // and the button label.
  // ==========================================================================
  heroCard: {
    backgroundColor: '#000',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 12,
    position: 'relative',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  heroMenuBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  heroTitleText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
    paddingRight: 30,
  },
  heroSubtitle: {
    color: '#71717a',
    fontSize: 13,
    marginBottom: 16,
  },
  heroTodayBtn: {
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  heroTodayText: {
    color: '#0a0a0b',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  heroPlanLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 14,
    paddingBottom: 2,
  },
  heroPlanLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ===== Secondary plan card — mirrors HomeScreen.tsx planCardSecondary =====
  // Greyed-out card for additional (non-current) meal plans. Same visual
  // treatment as the exercise screen so multiple plans read as a stack:
  // bold hero card on top, muted secondary cards beneath.
  planCardSecondary: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    borderColor: '#27272a',
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
    position: 'relative',
  },
  planTitleSecondary: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
    paddingRight: 30,
  },
  planSubtitleSecondary: {
    color: '#71717a',
    fontSize: 12,
    marginBottom: 10,
  },
  planStartBtnSecondary: {
    height: 40,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3f3f46',
  },
  planStartBtnSecondaryText: {
    color: '#d4d4d8',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  planMenuBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  // Small plan card (other plans) — DEPRECATED, kept for reference only.
  // Replaced by planCardSecondary above to match HomeScreen.tsx.
  smallPlanCard: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  smallPlanContent: { flex: 1 },
  smallPlanTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  smallPlanSub: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
  },

  // ===== feed section + cards =====
  // FIX: added marginHorizontal: -16 to break out of scrollContent's 16px
  // padding. Same trick HomeScreen uses for bulkingScroll so horizontal-
  // scrolling cards can slide off the right edge cleanly.
  feedSection: {
    marginBottom: 24,
    marginHorizontal: -16,
    marginTop: 12,
  },
  // Contextual daypart eyebrow above the floated shelf's title. Padded to line
  // up with the header row (which re-adds the 16px that feedSection removes).
  feedSectionEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingHorizontal: 16,
    marginBottom: 3,
  },
  feedSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  feedSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  feedSectionSeeAll: {
    fontSize: 12,
    fontWeight: '500',
  },
  feedScrollContent: {
    paddingHorizontal: 16,
    paddingRight: 24,
  },
  feedCard: {
    width: 280,
    backgroundColor: '#18181b',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    marginRight: 12,
  },
  feedCardImageWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#0a0a0b',
    position: 'relative',
  },
  feedCardImage: {
    width: '100%',
    height: '100%',
  },
  feedCardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27272a',
  },
  // PRE / POST badge — neutral dark pill so it reads on any food photo; the
  // dot + text take themeColor inline. Overlaid top-left, adds no card height.
  feedCardBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(10,10,11,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  feedCardBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  feedCardBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  feedCardBody: {
    padding: 14,
  },
  feedCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 19,
    letterSpacing: -0.2,
    marginBottom: 4,
    minHeight: 38,
  },
  feedCardMeta: {
    fontSize: 11,
    color: '#71717a',
    marginBottom: 12,
  },
  feedCardMacroGrid: {
    flexDirection: 'row',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  feedCardMacroCell: {
    flex: 1,
    alignItems: 'center',
  },
  feedCardMacroDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#27272a',
    marginVertical: 2,
  },
  feedCardMacroValue: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 17,
    letterSpacing: -0.3,
  },
  feedCardMacroValueMuted: {
    fontSize: 15,
    fontWeight: '600',
    color: '#d4d4d8',
    lineHeight: 17,
    letterSpacing: -0.3,
  },
  feedCardMacroLabel: {
    fontSize: 9,
    color: '#71717a',
    marginTop: 3,
    letterSpacing: 0.4,
  },

  // ===== See more card (Option B — thumbnail grid preview) =====
  // The wrap reuses the same 16:9 slot a hero image would occupy, but
  // contains a 2x2 grid of thumbnails of unseen meals. Background colour
  // matches what shows through the 1px gutters between cells.
  seeMoreImageWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#27272a',
  },
  seeMoreGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // Each thumbnail cell is exactly 50% wide and 50% tall. The 0.5px borders
  // on the right cell and bottom row create the gutters between cells without
  // needing flex gap (which is finicky for image children on older RN).
  seeMoreThumb: {
    width: '50%',
    height: '50%',
    overflow: 'hidden',
  },
  seeMoreThumbRight: {
    borderLeftWidth: 1,
    borderLeftColor: '#27272a',
  },
  seeMoreThumbBottom: {
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  seeMoreThumbBottomRight: {
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    borderLeftWidth: 1,
    borderLeftColor: '#27272a',
  },
  seeMoreThumbImage: {
    width: '100%',
    height: '100%',
  },
  seeMoreThumbPlaceholder: {
    flex: 1,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Card body becomes a single row instead of stacked title + meta + macros.
  // Title and meta on the left, circular arrow button on the right.
  seeMoreBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 104, // matches a real card body: title (38) + meta (~25) +
                    // macro grid (~41). Keeps see-more card the same height
                    // as neighbouring meal cards in the row.
  },
  seeMoreBodyText: {
    flex: 1,
  },
  seeMoreArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  // CHANGED: replaced the old free-floating `emptyHero` block with a dashed,
  // tinted hero card to match HomeScreen.tsx's `emptyHeroCard` treatment.
  // borderColor / backgroundColor are applied inline at the call site using
  // themeColor (themeColor + '59' border, themeColor + '14' background).
  emptyHeroCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 22,
    marginBottom: 8,
    alignItems: 'center',
  },
  emptyHeroIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 14,
  },
  emptyHeroTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyHeroBody: {
    fontSize: 13,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  emptyHeroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  emptyHeroButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a0a0b',
  },

  // Modal shared
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  // ==========================================================================
  // Action sheet (Meal Plan Options) — option-3 header-card layout
  // ==========================================================================
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  actionModalBackdrop: { flex: 1 },
  actionSheet: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '85%',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    marginHorizontal: 4,
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#52525b',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 22,
  },
  actionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 22,
  },
  actionThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionHeaderText: { flex: 1 },
  actionPlanName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  actionPlanDetails: {
    color: '#71717a',
    fontSize: 13,
  },
  actionCloseButton: {
    alignSelf: 'flex-start',
    padding: 2,
  },

  shareCtaButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  shareCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0a0a0b',
    letterSpacing: 0.2,
  },

  tileRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  actionTile: {
    flex: 1,
    minHeight: 68,
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3f3f46',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionTileText: {
    color: '#d4d4d8',
    fontSize: 12,
    fontWeight: '500',
  },
  actionTileDanger: {
    flex: 1,
    minHeight: 68,
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionTileDangerText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '500',
  },

  actionCancel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  actionCancelText: {
    color: '#71717a',
    fontSize: 15,
    fontWeight: '500',
  },

  // Share modal
  newShareOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  newShareBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  newShareModal: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 2,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  newShareHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 16,
    paddingTop: 16,
    zIndex: 100,
  },
  newShareClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newShareImage: {
    width: '100%',
    height: 180,
  },
  newShareContent: {
    padding: 24,
    alignItems: 'center',
  },
  newShareTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  sendLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
    gap: 12,
  },
  sendLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  linkExpiryText: {
    fontSize: 12,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 24,
  },

  // QR
  qrCodeContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  qrCodeWrapper: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrCodePlaceholder: {
    width: 272,
    height: 272,
    backgroundColor: '#27272a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3f3f46',
  },
  qrCodeLoadingText: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },

  // Rename modal
  renameContainer: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#27272a',
    padding: 28,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  renameIconContainer: {
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderRadius: 50,
    padding: 16,
    marginBottom: 20,
  },
  renameTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  renameInputContainer: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 4,
    width: '100%',
    marginBottom: 28,
  },
  renameInput: {
    fontSize: 16,
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  renameButtons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  renameCancelButton: {
    flex: 1,
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3f3f46',
    minHeight: 50,
  },
  renameConfirmButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  renameCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  renameConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },

  // Success
  successContainer: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 32,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 24,
  },
  successButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    minWidth: 80,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
    textAlign: 'center',
  },
});
```

## FILE: src/screens/SmoothiesLibraryScreen.tsx  (348 lines)

```tsx
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
const GRID_HORIZONTAL_PADDING = 16;
const GRID_GAP = 10;
const MAX_GRID_CONTENT_WIDTH = 700;

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
  const cardWidth = useMemo(() => {
    const contentWidth = Math.min(windowWidth, MAX_GRID_CONTENT_WIDTH);
    return (contentWidth - GRID_HORIZONTAL_PADDING * 2 - GRID_GAP) / 2;
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
        numColumns={2}
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
```

## FILE: src/screens/nutrition/CuratedFavoritesScreen.tsx  (1947 lines)

```tsx
// src/screens/nutrition/CuratedFavoritesScreen.tsx
//
// "Foods you like" — WeekStrip build.
//
// MENTAL MODEL (locked):
//   Picks are the meals the user will eat this week. One pick per slot is a
//   complete, respected answer (it repeats daily). More picks = rotation.
//   Empty slot = delegation ("we'll choose for you"), never "skip".
//   Macros are handled invisibly at plan-generation time — with ONE narrow
//   exception: a hard-infeasible basket gets a single heads-up row in the
//   confirm sheet, with certified one-tap fixes. Never while picking, never
//   blocking, never red.
//
// What changed vs the previous shipped file:
// - NEW WeekStrip HUD pinned above Save: live preview of the active slot
//   (7 circles for daily slots, cluster for snacks/dessert) + one sentence.
//   The subtitle shrinks to one line; the strip now teaches the model.
// - Tap toggles the MEAL: no picks → picks the hero plate (the one in the
//   photo); any picks — one plate or five — → clears them all in one tap.
//   A full-width FOOTER BAR on multi-plate cards is the door to the
//   PlateSheet and reads plate state ("2 ways ›" / "Berry & Yoghurt Bowl ›"
//   / "2 of 2 ways ›"). The old inline PlatePanel (hero image + macro strip
//   + horizontal mini-cards injected into the grid) is gone — plate choice
//   is a bottom sheet with full-width rows: thumbnail, name, kcal/protein,
//   treat + "in the photo" tags, big tap targets, all plates visible at
//   once, no grid reflow.
// - buildSkipSentence DELETED. The confirm sheet now shows a row for EVERY
//   tab — picked rows mirror the strip; empty rows read as delegation
//   ("We'll pick your lunches for you.").
// - Confirm sheet runs the feasibility engine (src/utils/mealFeasibility).
//   Infeasible → quiet "Heads-up" row + up to 3 certified fix cards
//   (tap = real pick, verdict recomputes live) + primary button relabels
//   "Save anyway". Feasible / engine unavailable → identical to before.
// - Taste section UI REMOVED. avoid/likedDishes are loaded and written back
//   unchanged (same pass-through pattern as cuisines) so the storage payload
//   and prompt-builder contract are untouched.
// - Header "N selected" count removed; per-slot meaning lives in the strip.
// - Filter chips: All / Quick / No-cook / Big batch (produces_servings > 1).
//   The equipment-flavoured "Oven" chip is gone.
// - Tab dot stays binary but is now ring (empty) vs filled (has picks) —
//   shape + colour, colourblind-safe.
// - Questionnaire-step mode: pass fromQuestionnaire: true to run this screen
//   as the step between N9 and the summary — back chevron hidden, top-right
//   "Choose for me" skip shown. N9 wiring snippet documented above ParamList.
// - V2 SLOT-SCOPED PICKS: selection keys are `${slot}|${key}` — the tab you
//   pick on IS the slot. Lunch picks no longer mirror into Dinner (nor
//   dessert into Snacks); the Brunch-dot eligibility quirk dies with it.
//   Storage writes picks[] plus a base-slug legacy mirror so the live prompt
//   builder keeps working; legacy slug-only saves hydrate into every
//   eligible tab once. Lunch↔dinner stay interchangeable at SCHEDULING time
//   (engine borrow group + prompt rule) — that's a different layer.
//
// Contracts preserved: SHELF_SLOTS / EXOTIC_SLOTS / mealsForSlots /
// loadCuratedFavorites / saveCuratedFavorites payload (slugs, cuisines,
// avoid, likedDishes), selection key format (slug or `slug:plateId`),
// MealDetail navigation from the ⓘ button.
//
// TODO(ryan): resolveTargets() below sniffs computeMacros()'s return shape
// tolerantly because the exact MacroResults field names weren't in front of
// me. Replace the key-sniffing with the real fields and delete the comment.

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Modal,
  Alert,
  // RN core TouchableOpacity, aliased. Used for the ⓘ badge and the card
  // footer bar. Gesture-handler's TouchableOpacity has two layout quirks:
  // absolutely-positioned instances fail to render reliably (issues #675,
  // #1163), and it does NOT propagate flex sizing — its native wrapper sizes
  // to content, so a flex:1 child inside it collapses to zero height. Size
  // children of RNGH touchables intrinsically (explicit height/aspectRatio).
  TouchableOpacity as RNTouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppModal from '../../components/AppModal';
import { useTheme } from '../../contexts/ThemeContext';
import { CURATED_MEALS } from '../../data/curated_meals';
import { CuratedMeal } from '../../types/curated_meals';
import { getMealImage } from '../../assets/mealImages';
import {
  loadCuratedFavoritesV2,
  saveCuratedFavoritesV2,
  CuratedFavoritesV2,
  SlotPick,
  PlanSlot,
} from '../../utils/curatedFavoritesStorage';
import { loadNutritionAnswers } from '../../utils/nutritionQuestionnaireStorage';
import { computeMacros } from '../../utils/nutritionMacros';
import {
  CoreShelf,
  MealSlot,
  SHELF_SLOTS,
  emptyFilter,
  mealsForSlots,
} from '../../utils/curatedShelves';
import {
  assessBasket,
  BasketVerdict,
  CertifiedFix,
  SlotSpec,
  Targets,
} from '../../utils/mealFeasibility';
import { Analytics } from '../../services/analytics';

type NavProp = StackNavigationProp<any>;

// FLOW MODES
// 1) Standalone editor (default): pushed from the summary's "Foods you like"
//    card. Back chevron shows; Save → goBack() returns to the summary.
// 2) Questionnaire step (fromQuestionnaire: true): N9's completion path
//    resets the stack so the summary sits UNDERNEATH this screen — wiring
//    for N9PlanLengthScreen (replace its existing reset to NutritionSummary):
//
//      navigation.dispatch(
//        CommonActions.reset({
//          index: 1,
//          routes: [
//            { name: 'NutritionSummary' },
//            {
//              name: 'CuratedFavorites',
//              params: { fromQuestionnaire: true, answersSoFar: finalAnswers },
//            },
//          ],
//        })
//      );
//
//    In this mode the back chevron is hidden (it would imply returning to
//    N9, which the reset made impossible) and a top-right "Choose for me"
//    skip shows instead — delegation as a first-class exit. Both Save
//    ("Looks good") and the skip land on the summary via goBack(). The skip
//    deliberately lives top-right rather than as an enabled bottom CTA: a
//    big enabled bottom button at landing invites tapping through without
//    ever looking at the food, and the entire point of this step is the
//    encounter. Save stays pick-gated; the skip is the zero-pick exit.
type ParamList = {
  CuratedFavorites:
    | {
        fromQuestionnaire?: boolean;
        answersSoFar?: {
          mealsPerDay?: number;
          snackFrequency?: string;
          dessertFrequency?: string;
          allergies?: string[];
          [k: string]: any;
        };
      }
    | undefined;
};

// Content width is capped so cards don't stretch to unreasonable sizes on
// tablets/resized windows — see cardWidth in the component below.
const GRID_H_PADDING = 18;
const GRID_GAP = 12;
const MAX_GRID_CONTENT_WIDTH = 700;
const FOOTER_HEIGHT = 34;

const TITLE_BLOCK_HEIGHT = 78; // serif title + one-line subtitle
const TAB_BAR_HEIGHT = 46;
const STRIP_HEIGHT = 78; // week strip block inside the footer

const isMultiPlate = (m: CuratedMeal) => (m.plates?.length ?? 0) > 1;
const plateKey = (slug: string, plateId: string) => `${slug}:${plateId}`;

/** Footer-bar label: door to the plates + readout of which way you're set to. */
function plateFooterLabel(meal: CuratedMeal, selected: Set<string>): string {
  const picked = (meal.plates ?? []).filter((p: any) =>
    selected.has(plateKey(meal.slug, p.id))
  );
  if (picked.length === 0) return `${meal.plates.length} ways`;
  if (picked.length === 1) return (picked[0] as any).display_name;
  return `${picked.length} of ${meal.plates.length} ways`;
}

// =============================================================================
// Tab model — unchanged derivation from questionnaire answers
// =============================================================================

type TabKey =
  | { kind: 'core'; shelf: CoreShelf }
  | { kind: 'exotic'; slot: MealSlot };

const SHELF_LABEL: Record<CoreShelf, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
  dessert: 'Dessert',
};
const SLOT_LABEL: Partial<Record<MealSlot, string>> = {
  brunch: 'Brunch',
  second_lunch: 'Second lunch',
  early_dinner: 'Early dinner',
  morning_snack: 'Morning snack',
  afternoon_snack: 'Afternoon snack',
  evening_snack: 'Evening snack',
  pre_workout: 'Pre-workout',
  post_workout: 'Post-workout',
};

const EXOTIC_FILL_ORDER: MealSlot[] = [
  'brunch',
  'second_lunch',
  'early_dinner',
  'pre_workout',
  'post_workout',
];

function tabLabel(t: TabKey): string {
  if (t.kind === 'core') return SHELF_LABEL[t.shelf];
  return SLOT_LABEL[t.slot] ?? String(t.slot);
}
function tabId(t: TabKey): string {
  return t.kind === 'core' ? `core:${t.shelf}` : `exotic:${t.slot}`;
}

/** Canonical PlanSlot for a tab — the scope picks are stored under, and the
 *  SlotSpec.id the feasibility engine matches scoped keys against. */
function tabSlot(t: TabKey): PlanSlot {
  if (t.kind === 'core') return (t.shelf === 'snacks' ? 'snack' : t.shelf) as PlanSlot;
  return t.slot as PlanSlot;
}

/** Selection-state keys are slot-scoped: `${slot}|${slug}` or
 *  `${slot}|${slug}:${plateId}`. Same format the engine consumes. */
const scopeKey = (slot: PlanSlot, key: string) => `${slot}|${key}`;
function unscopeKey(scoped: string): { slot: PlanSlot; key: string } {
  const i = scoped.indexOf('|');
  return { slot: scoped.slice(0, i) as PlanSlot, key: scoped.slice(i + 1) };
}

function buildTabs(
  mealsPerDay: number | undefined,
  snackFrequency: string | undefined,
  dessertFrequency: string | undefined,
  allMeals: CuratedMeal[]
): TabKey[] {
  if (mealsPerDay == null) {
    const tabs: TabKey[] = [
      { kind: 'core', shelf: 'breakfast' },
      { kind: 'core', shelf: 'lunch' },
      { kind: 'core', shelf: 'dinner' },
    ];
    if (snackFrequency !== '0') tabs.push({ kind: 'core', shelf: 'snacks' });
    return tabs;
  }
  const coreByCount: Record<number, CoreShelf[]> = {
    1: ['dinner'],
    2: ['lunch', 'dinner'],
    3: ['breakfast', 'lunch', 'dinner'],
    4: ['breakfast', 'lunch', 'dinner'],
    5: ['breakfast', 'lunch', 'dinner'],
    6: ['breakfast', 'lunch', 'dinner'],
  };
  const coreShelves = coreByCount[mealsPerDay] ?? ['breakfast', 'lunch', 'dinner'];
  const tabs: TabKey[] = coreShelves.map((shelf) => ({ kind: 'core', shelf }));

  const extraNeeded = Math.max(0, mealsPerDay - 3);
  if (extraNeeded > 0) {
    let added = 0;
    for (const slot of EXOTIC_FILL_ORDER) {
      if (added >= extraNeeded) break;
      const eligible = mealsForSlots([slot], allMeals, emptyFilter(), 'default');
      if (eligible.length > 0) {
        tabs.push({ kind: 'exotic', slot });
        added += 1;
      }
    }
  }
  if (snackFrequency && snackFrequency !== '0') {
    tabs.push({ kind: 'core', shelf: 'snacks' });
  }
  if (dessertFrequency && dessertFrequency !== '0') {
    tabs.push({ kind: 'core', shelf: 'dessert' });
  }
  return tabs;
}

function slotsForTab(tab: TabKey): MealSlot[] {
  return tab.kind === 'core' ? SHELF_SLOTS[tab.shelf] : [tab.slot];
}

// 'daily' slots speak in rotation ("every morning"); 'mix' slots speak in
// mix-ins. Dessert at every_night is behaviourally daily.
type TabRhythm = 'daily' | 'mix';
function tabRhythm(tab: TabKey, dessertFrequency?: string): TabRhythm {
  if (tab.kind === 'core' && tab.shelf === 'snacks') return 'mix';
  if (tab.kind === 'core' && tab.shelf === 'dessert')
    return dessertFrequency === 'every_night' ? 'daily' : 'mix';
  if (
    tab.kind === 'exotic' &&
    (tab.slot === 'morning_snack' ||
      tab.slot === 'afternoon_snack' ||
      tab.slot === 'evening_snack')
  )
    return 'mix';
  return 'daily';
}

function singularWhen(tab: TabKey): string {
  if (tab.kind === 'core') {
    switch (tab.shelf) {
      case 'breakfast': return 'every morning';
      case 'lunch':     return 'every lunchtime';
      case 'dinner':    return 'every evening';
      case 'snacks':    return 'your go-to snack';
      case 'dessert':   return 'your dessert';
    }
    return 'every day';
  }
  switch (tab.slot) {
    case 'brunch':          return 'every late morning';
    case 'second_lunch':    return 'every afternoon';
    case 'early_dinner':    return 'every early evening';
    case 'morning_snack':   return 'your morning snack';
    case 'afternoon_snack': return 'your afternoon snack';
    case 'evening_snack':   return 'your evening snack';
    case 'pre_workout':     return 'before every workout';
    case 'post_workout':    return 'after every workout';
    default:                return 'every day';
  }
}

function tabNoun(tab: TabKey): string {
  if (tab.kind === 'core') {
    switch (tab.shelf) {
      case 'breakfast': return 'breakfasts';
      case 'lunch':     return 'lunches';
      case 'dinner':    return 'dinners';
      case 'snacks':    return 'snacks';
      case 'dessert':   return 'desserts';
    }
  }
  return `${tabLabel(tab).toLowerCase()} options`;
}

// =============================================================================
// Pick units — ordered picks for a tab, with images for the strip
// =============================================================================

interface PickUnit {
  slug: string;
  name: string;
  imageFilename?: string;
}

function unitsForTab(
  tab: TabKey,
  allMeals: CuratedMeal[],
  selected: Set<string>
): PickUnit[] {
  // Membership is the tab's OWN scoped picks — a lunch pick says nothing
  // about dinner. (Eligibility still defines the shelf, not the picks.)
  const slot = tabSlot(tab);
  const eligible = mealsForSlots(slotsForTab(tab), allMeals, emptyFilter(), 'default');
  const units: PickUnit[] = [];
  for (const meal of eligible) {
    if (selected.has(scopeKey(slot, meal.slug))) {
      units.push({
        slug: meal.slug,
        name: meal.display_name,
        imageFilename: meal.image_filename,
      });
    }
    for (const plate of meal.plates ?? []) {
      if (selected.has(scopeKey(slot, plateKey(meal.slug, (plate as any).id)))) {
        units.push({
          slug: meal.slug,
          name: meal.display_name,
          imageFilename: (plate as any).image_filename ?? meal.image_filename,
        });
      }
    }
  }
  return units;
}

// One sentence per tab. The strip and the confirm sheet share these so the
// sheet never says anything the user hasn't already watched form.
function slotSentence(
  tab: TabKey,
  units: PickUnit[],
  dessertFrequency: string | undefined,
  inSheet: boolean
): string {
  const n = units.length;
  const rhythm = tabRhythm(tab, dessertFrequency);
  const noun = tabNoun(tab);
  const isDessert = tab.kind === 'core' && tab.shelf === 'dessert';
  const isSnacks =
    (tab.kind === 'core' && tab.shelf === 'snacks') ||
    (tab.kind === 'exotic' &&
      (tab.slot === 'morning_snack' ||
        tab.slot === 'afternoon_snack' ||
        tab.slot === 'evening_snack'));

  if (n === 0) {
    if (inSheet) {
      if (isDessert) return "We'll keep dessert covered for you.";
      return `We'll pick your ${noun} for you.`;
    }
    if (isDessert)
      return "Dessert's covered either way — pick favourites to make it yours.";
    return `We'll choose your ${noun} — pick anything to take over.`;
  }
  if (n === 1) {
    if (isSnacks || isDessert) return `${units[0].name}, ${singularWhen(tab)}.`;
    if (isDessert && rhythm === 'daily') return `${units[0].name}, every night.`;
    return `${units[0].name}, ${singularWhen(tab)}.`;
  }
  const allSameSlug = units.every((u) => u.slug === units[0].slug);
  if (allSameSlug) {
    return rhythm === 'daily'
      ? `${units[0].name}, ${n} ways — we'll rotate them.`
      : `${units[0].name}, ${n} ways — we'll mix them in.`;
  }
  if (rhythm === 'daily')
    return `${n} ${noun} on rotation — we'll set the order.`;
  return `${n} ${noun} to mix in.`;
}

// =============================================================================
// WeekStrip — the live consequence preview, pinned above Save
// =============================================================================

function WeekStrip({
  tab,
  units,
  dessertFrequency,
  themeColor,
}: {
  tab: TabKey;
  units: PickUnit[];
  dessertFrequency?: string;
  themeColor: string;
}) {
  const rhythm = tabRhythm(tab, dessertFrequency);
  const scale = useRef(new Animated.Value(1)).current;
  const hash = units.map((u) => u.name).join('|');

  useEffect(() => {
    scale.setValue(1);
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.05, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  const renderDot = (unit: PickUnit | null, i: number, size: number, overlap: boolean) => {
    const img = unit ? getMealImage(unit.imageFilename) : null;
    return (
      <View
        key={i}
        style={[
          styles.stripDot,
          { width: size, height: size, borderRadius: size / 2 },
          overlap && i > 0 && { marginLeft: -size * 0.28 },
          unit
            ? { borderStyle: 'solid', borderColor: '#26262b', backgroundColor: '#1c1c1f', overflow: 'hidden' }
            : { borderStyle: 'dashed', borderColor: '#3f3f46' },
        ]}
      >
        {unit && img ? (
          <Image source={img} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : unit ? (
          <Ionicons name="restaurant-outline" size={size * 0.5} color="#71717a" />
        ) : null}
      </View>
    );
  };

  let dots: React.ReactNode;
  if (rhythm === 'daily') {
    dots = (
      <View style={styles.stripDots}>
        {Array.from({ length: 7 }).map((_, i) =>
          renderDot(units.length ? units[i % units.length] : null, i, 27, false)
        )}
      </View>
    );
  } else {
    const shown = units.length ? units.slice(0, 5) : [null, null, null];
    dots = (
      <View style={styles.stripDots}>
        {shown.map((u, i) => renderDot(u, i, 27, true))}
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      {dots}
      <Text style={styles.stripLine} numberOfLines={2}>
        {slotSentence(tab, units, dessertFrequency, false)}
      </Text>
    </Animated.View>
  );
}

// =============================================================================
// MealCard — photo poster. Tap toggles (hero plate on multi-plate meals).
// =============================================================================

interface MealCardProps {
  meal: CuratedMeal;
  width: number;
  selected: Set<string>;
  themeColor: string;
  onPress: () => void;
  onWaysPress: () => void;
  onInfoPress: () => void;
}

const MealCard = React.memo(function MealCard({
  meal,
  width,
  selected,
  themeColor,
  onPress,
  onWaysPress,
  onInfoPress,
}: MealCardProps) {
  const imageSource = getMealImage(meal.image_filename ?? meal.plates?.[0]?.image_filename);
  const multi = isMultiPlate(meal);
  const height = Math.round((width * 4) / 3);

  let picks = 0;
  const prefix = meal.slug + ':';
  if (selected.has(meal.slug)) picks += 1;
  selected.forEach((k) => {
    if (k.startsWith(prefix)) picks += 1;
  });
  const isSel = picks > 0;

  return (
    <View style={[styles.card, { width, height }]}>
      <TouchableOpacity
        style={styles.cardTapArea}
        activeOpacity={0.88}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: isSel }}
        accessibilityLabel={meal.display_name}
        accessibilityHint={
          isSel
            ? 'Tap to clear all picks for this meal'
            : multi
            ? 'Tap to pick the plate shown in the photo'
            : 'Tap to pick'
        }
      >
        <View
          style={[
            styles.cardImageWrap,
            { height: height - (multi ? FOOTER_HEIGHT : 0) },
          ]}
        >
          {imageSource ? (
            <Image source={imageSource} style={styles.cardImage} contentFit="cover" transition={200} />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
              <Ionicons name="restaurant-outline" size={28} color="#52525b" />
            </View>
          )}

          {isSel && <View style={styles.selectedScrim} pointerEvents="none" />}

          <View
            style={[
              styles.checkBadge,
              isSel
                ? { backgroundColor: themeColor, borderColor: themeColor }
                : {
                    backgroundColor: 'rgba(10,10,11,0.45)',
                    borderColor: 'rgba(255,255,255,0.35)',
                  },
            ]}
            pointerEvents="none"
          >
            {isSel ? (
              multi && picks > 1 ? (
                <Text style={styles.badgeCount}>{picks}</Text>
              ) : (
                <Ionicons name="checkmark" size={15} color="#0a0a0b" />
              )
            ) : null}
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>
            {meal.display_name}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Footer bar — the door to the plates, and a readout of which way
          you're set to. Its own zone, so a near-miss never clears picks. */}
      {multi && (
        <RNTouchableOpacity
          style={styles.cardFooter}
          onPress={onWaysPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${plateFooterLabel(meal, selected)}. Choose plates for ${meal.display_name}`}
        >
          <Text style={styles.footLabel} numberOfLines={1}>
            {plateFooterLabel(meal, selected)}
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#8b8b94" />
        </RNTouchableOpacity>
      )}

      <RNTouchableOpacity
        style={styles.infoBadge}
        onPress={onInfoPress}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`More about ${meal.display_name}`}
      >
        <Ionicons name="information-circle-outline" size={20} color="#ffffff" />
      </RNTouchableOpacity>
    </View>
  );
});

// =============================================================================
// BottomSheet shell — shared spring/backdrop for PlateSheet + ConfirmSheet
// =============================================================================

function BottomSheet({
  open,
  onClose,
  children,
  paddingBottom,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  paddingBottom: number;
}) {
  const [rendered, setRendered] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      setRendered(true);
      requestAnimationFrame(() => {
        Animated.spring(anim, { toValue: 1, tension: 65, friction: 11, useNativeDriver: true }).start();
      });
    } else if (rendered) {
      Animated.spring(anim, { toValue: 0, tension: 90, friction: 12, useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) setRendered(false);
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anim]);

  return (
    <AppModal visible={rendered} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.sheetBackdrop, { opacity: anim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Dismiss"
          accessibilityRole="button"
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheetWrap,
          {
            transform: [
              { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) },
            ],
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={[styles.sheet, { paddingBottom }]}>
          <View style={styles.sheetGrabber} />
          {children}
        </View>
      </Animated.View>
    </AppModal>
  );
}

// =============================================================================
// PlateSheet — redesigned plate picker
// =============================================================================
//
// What was wrong with the old inline panel: it duplicated the card you just
// tapped (hero image + macro strip), reflowed the whole grid when it opened,
// hid plates 3+ behind a horizontal scroll of 140px cards, and mixed "meal
// detail" with "plate choice" (detail now lives in MealDetail). This sheet
// has ONE job — which ways? — with every plate visible as a full-width row.

function PlateSheet({
  meal,
  selected,
  themeColor,
  open,
  onClose,
  onTogglePlate,
  paddingBottom,
}: {
  meal: CuratedMeal | null;
  selected: Set<string>;
  themeColor: string;
  open: boolean;
  onClose: () => void;
  onTogglePlate: (slug: string, plateId: string) => void;
  paddingBottom: number;
}) {
  return (
    <BottomSheet open={open && !!meal} onClose={onClose} paddingBottom={paddingBottom}>
      {meal && (
        <>
          <Text style={styles.sheetTitle}>{meal.display_name}</Text>
          <Text style={styles.plateSheetSub}>
            How would you eat it? Pick one or a few — a few ways keeps one batch interesting.
          </Text>
          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
            {(meal.plates ?? []).map((plate: any, idx: number) => {
              const key = plateKey(meal.slug, plate.id);
              const on = selected.has(key);
              const img =
                getMealImage(plate.image_filename) || getMealImage(meal.image_filename);
              const pm: any = plate.plate_macros ?? {};
              const meta = `${pm.kcal ?? 0} cal · ${pm.protein_g ?? 0}g protein`;
              return (
                <TouchableOpacity
                  key={plate.id}
                  style={styles.plateRow}
                  activeOpacity={0.8}
                  onPress={() => onTogglePlate(meal.slug, plate.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${plate.display_name}, ${meta}`}
                >
                  <View style={styles.plateThumbWrap}>
                    {img ? (
                      <Image source={img} style={styles.plateThumb} contentFit="cover" transition={120} />
                    ) : (
                      <View style={[styles.plateThumb, styles.cardImagePlaceholder]}>
                        <Ionicons name="restaurant-outline" size={18} color="#52525b" />
                      </View>
                    )}
                  </View>
                  <View style={styles.plateRowBody}>
                    <View style={styles.plateRowNameLine}>
                      <Text style={styles.plateRowName} numberOfLines={1}>
                        {plate.display_name}
                      </Text>
                      {plate.is_stunt_plate && (
                        <View style={styles.treatPill}>
                          <Text style={styles.treatPillText}>treat</Text>
                        </View>
                      )}
                      {idx === 0 && (
                        <View style={styles.heroPill}>
                          <Text style={styles.heroPillText}>in the photo</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.plateRowMeta}>{meta}</Text>
                  </View>
                  <View
                    style={[
                      styles.plateRowCheck,
                      on
                        ? { backgroundColor: themeColor, borderColor: themeColor }
                        : { borderColor: '#3f3f46' },
                    ]}
                  >
                    {on && <Ionicons name="checkmark" size={14} color="#0a0a0b" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onClose}
            style={[styles.confirmBtn, { backgroundColor: themeColor, marginTop: 8 }]}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={styles.confirmBtnText}>Done</Text>
          </TouchableOpacity>
        </>
      )}
    </BottomSheet>
  );
}

// =============================================================================
// Heads-up copy — templated by the worst failure
// =============================================================================

function headsUpSentence(verdict: BasketVerdict): string {
  const f = verdict.failures[0];
  const hasFixes = verdict.fixes.length > 0;
  if (!f) return '';
  if (verdict.unfixableBySingleAdd) {
    return "Your picks make a light week on their own — we'll lean on shakes and simple sides and get each day as close as we can.";
  }
  if (f.direction === 'floor') {
    const axis = f.axis === 'protein' ? 'protein' : f.axis === 'fiber' ? 'fibre' : 'calories';
    return `Even scaled up and topped up, these picks can't reach your daily ${axis}. ${
      hasFixes ? 'Any one of these fixes it' : 'One complementary pick fixes it'
    } — or save anyway and we'll get each day as close as we can.`;
  }
  const axis = f.axis === 'fat' ? 'fat' : f.axis === 'carbs' ? 'carbs' : 'calories';
  return `These picks run over your ${axis} target, and we can only add food, never take it away — but one lighter option in the rotation balances it. ${
    hasFixes ? 'Any of these works' : 'Add one'
  }, or save anyway and we'll keep the week as close as we can.`;
}

// =============================================================================
// Screen
// =============================================================================

export default function CuratedFavoritesScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<ParamList, 'CuratedFavorites'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = useMemo(() => {
    const contentWidth = Math.min(windowWidth, MAX_GRID_CONTENT_WIDTH);
    return (contentWidth - GRID_H_PADDING * 2 - GRID_GAP) / 2;
  }, [windowWidth]);

  const allMeals = useMemo(() => Object.values(CURATED_MEALS) as CuratedMeal[], []);

  // ---- answers (route params during questionnaire; storage when standalone) ----
  const paramAnswers = route.params?.answersSoFar;
  const fromQuestionnaire = route.params?.fromQuestionnaire ?? false;
  const [loadedAnswers, setLoadedAnswers] = useState<any | null>(null);

  useEffect(() => {
    if (paramAnswers) {
      setLoadedAnswers(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadNutritionAnswers();
        if (!cancelled && saved) setLoadedAnswers(saved);
      } catch (err) {
        console.warn('[CuratedFavorites] Failed to load saved answers:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paramAnswers]);

  const effectiveAnswers: any = paramAnswers ?? loadedAnswers ?? {};
  const mealsPerDay = effectiveAnswers.mealsPerDay;
  const snackFrequency = effectiveAnswers.snackFrequency;
  const dessertFrequency = effectiveAnswers.dessertFrequency;

  const tabs = useMemo(
    () => buildTabs(mealsPerDay, snackFrequency, dessertFrequency, allMeals),
    [mealsPerDay, snackFrequency, dessertFrequency, allMeals]
  );

  // ---- persisted state ----
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadedFav, setLoadedFav] = useState<CuratedFavoritesV2 | null>(null);
  // Pass-through fields: the taste-section UI is gone, but the storage payload
  // keeps its shape. Loaded values are written back untouched (same pattern as
  // cuisines).
  const [loadedCuisines, setLoadedCuisines] = useState<string[]>([]);
  const [loadedAvoid, setLoadedAvoid] = useState<string[]>([]);
  const [loadedDishes, setLoadedDishes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ---- transient UI state ----
  const [activeTabId, setActiveTabId] = useState<string>(() =>
    tabs[0] ? tabId(tabs[0]) : ''
  );
  type QuickFilter = 'all' | 'quick' | 'no_cook' | 'batch';
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [plateSheetSlug, setPlateSheetSlug] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView | null>(null);
  const saveBarAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fav = await loadCuratedFavoritesV2();
      if (!cancelled) {
        setLoadedFav(fav);
        setLoadedCuisines(fav.cuisines);
        setLoadedAvoid(fav.avoid);
        setLoadedDishes(fav.likedDishes);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate the scoped selection once tabs are known. V2 picks map straight
  // in (including picks for slots the current structure doesn't show — they
  // stay invisible but survive a round-trip). Mirror-only slugs — legacy
  // data, or slugs added via the V1 API with no slot context — hydrate into
  // every eligible tab once; the user prunes from there.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !loadedFav || tabs.length === 0) return;
    hydratedRef.current = true;
    const next = new Set<string>();
    const pickedSlugs = new Set<string>();
    for (const p of loadedFav.picks) {
      pickedSlugs.add(p.slug);
      next.add(
        scopeKey(p.slot, p.plate_id ? plateKey(p.slug, p.plate_id) : p.slug)
      );
    }
    for (const slug of loadedFav.slugs) {
      if (pickedSlugs.has(slug)) continue;
      for (const t of tabs) {
        const eligible = mealsForSlots(
          slotsForTab(t),
          allMeals,
          emptyFilter(),
          'default'
        );
        if (eligible.some((m) => m.slug === slug)) {
          next.add(scopeKey(tabSlot(t), slug));
        }
      }
    }
    if (next.size > 0) setSelected(next);
  }, [loadedFav, tabs, allMeals]);

  useEffect(() => {
    if (!tabs.length) return;
    if (!tabs.some((t) => tabId(t) === activeTabId)) {
      setActiveTabId(tabId(tabs[0]));
    }
  }, [tabs, activeTabId]);

  // ---- derived: active tab (needed by the toggles — picks are scoped to it) ----
  const activeTab = useMemo<TabKey | null>(
    () => tabs.find((t) => tabId(t) === activeTabId) ?? tabs[0] ?? null,
    [tabs, activeTabId]
  );
  const activeSlot: PlanSlot | null = activeTab ? tabSlot(activeTab) : null;

  // ---- selection toggles (all writes are scoped: the tab you're on IS the slot) ----
  const toggleKey = useCallback((slot: PlanSlot, key: string) => {
    const scoped = scopeKey(slot, key);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(scoped)) next.delete(scoped);
      else next.add(scoped);
      return next;
    });
  }, []);

  const togglePlate = useCallback(
    (slot: PlanSlot, slug: string, plateId: string) =>
      toggleKey(slot, plateKey(slug, plateId)),
    [toggleKey]
  );

  // Picks for this meal IN THE ACTIVE TAB only — clearing lunch butter
  // chicken never touches a dinner butter chicken pick.
  const mealPickKeys = useCallback(
    (meal: CuratedMeal): string[] => {
      if (!activeSlot) return [];
      const exact = scopeKey(activeSlot, meal.slug);
      const prefix = scopeKey(activeSlot, meal.slug + ':');
      return Array.from(selected).filter(
        (k) => k === exact || k.startsWith(prefix)
      );
    },
    [selected, activeSlot]
  );

  // Tap toggles the MEAL. Empty → pick the hero plate (the one in the
  // photo). Anything picked — one plate or five — → clear it all in one tap.
  // Plate refinement lives behind the footer bar; the card is never the way
  // you get stuck.
  const onCardPress = useCallback(
    (meal: CuratedMeal) => {
      if (!activeSlot) return;
      const keys = mealPickKeys(meal);
      if (keys.length > 0) {
        setSelected((prev) => {
          const next = new Set(prev);
          keys.forEach((k) => next.delete(k));
          return next;
        });
      } else if (isMultiPlate(meal)) {
        togglePlate(activeSlot, meal.slug, (meal.plates[0] as any).id);
      } else {
        toggleKey(activeSlot, meal.slug);
      }
    },
    [activeSlot, mealPickKeys, togglePlate, toggleKey]
  );

  const applyQuickFilter = useCallback(
    (meals: CuratedMeal[], qf: QuickFilter): CuratedMeal[] => {
      if (qf === 'all') return meals;
      if (qf === 'quick')
        return meals.filter((m) => {
          const t = (m as any).methods?.[0]?.time_total_minutes ?? 0;
          return t > 0 && t <= 15;
        });
      if (qf === 'no_cook')
        return meals.filter(
          (m) => ((m as any).methods?.[0]?.time_total_minutes ?? 0) === 0
        );
      return meals.filter((m) => ((m as any).produces_servings ?? 1) > 1);
    },
    []
  );

  const activeMeals = useMemo(() => {
    if (!activeTab) return [] as CuratedMeal[];
    const baseMeals = mealsForSlots(slotsForTab(activeTab), allMeals, emptyFilter(), 'default');
    return applyQuickFilter(baseMeals, quickFilter);
  }, [activeTab, allMeals, quickFilter, applyQuickFilter]);

  const unitsByTabId = useMemo(() => {
    const map = new Map<string, PickUnit[]>();
    for (const t of tabs) map.set(tabId(t), unitsForTab(t, allMeals, selected));
    return map;
  }, [tabs, allMeals, selected]);

  const activeUnits = activeTab ? unitsByTabId.get(tabId(activeTab)) ?? [] : [];
  const hasAnyPicks = [...unitsByTabId.values()].some((u) => u.length > 0);

  // Unscoped view of the ACTIVE tab's picks. MealCard, PlateSheet and the
  // footer label consume plain keys and stay slot-agnostic — scoping lives
  // entirely in this component's read/write layer.
  const viewSelected = useMemo(() => {
    const out = new Set<string>();
    if (!activeSlot) return out;
    const pre = activeSlot + '|';
    for (const k of selected) {
      if (k.startsWith(pre)) out.add(k.slice(pre.length));
    }
    return out;
  }, [selected, activeSlot]);

  // ---- targets + feasibility ----
  // TODO(ryan): replace key-sniffing with the real MacroResults field names.
  const targets = useMemo<Targets | null>(() => {
    try {
      const r: any = computeMacros(effectiveAnswers);
      if (!r) return null;
      const kcal = r.calories ?? r.targetCalories ?? r.kcal ?? r.dailyCalories;
      const protein = r.protein ?? r.proteinTarget ?? r.protein_g ?? r.proteinGrams;
      if (!kcal || !protein) return null;
      return {
        kcal,
        protein_g: protein,
        carbs_g: r.carbs ?? r.carbsTarget ?? r.carbs_g,
        fat_g: r.fat ?? r.fatTarget ?? r.fat_g,
        fiber_g: r.fiber ?? r.fiberTarget ?? r.fiber_g ?? Math.round((kcal * 14) / 1000),
      };
    } catch {
      return null; // no targets → feasibility check silently skipped
    }
  }, [effectiveAnswers]);

  const slotSpecs = useMemo<SlotSpec[]>(() => {
    const snackPerDay =
      snackFrequency === '2' ? 2
      : snackFrequency === '3+' ? 3
      : snackFrequency === 'ai_decide' ? (targets && targets.kcal >= 2800 ? 2 : 1)
      : 1;
    const dessertWeekly =
      dessertFrequency === 'every_night' ? 7
      : dessertFrequency === 'most_nights' ? 5
      : dessertFrequency === 'few_per_week' ? 3
      : dessertFrequency === 'once_per_week' ? 1
      : dessertFrequency === 'ai_decide' ? 3
      : 0;
    return tabs.map((t) => {
      const isSnacks = t.kind === 'core' && t.shelf === 'snacks';
      const isDessert = t.kind === 'core' && t.shelf === 'dessert';
      const isMain =
        t.kind === 'core' && (t.shelf === 'lunch' || t.shelf === 'dinner');
      return {
        // tabSlot, not tabId: the engine matches scoped keys (`slot|key`)
        // against SlotSpec.id, and CertifiedFix.slot round-trips through it.
        id: tabSlot(t),
        label: tabLabel(t),
        mealSlots: slotsForTab(t),
        perDay: isSnacks ? snackPerDay : 1,
        weeklyOccurrences: isSnacks ? snackPerDay * 7 : isDessert ? dessertWeekly : 7,
        borrowGroup: isMain ? ('main' as const) : undefined,
      };
    });
  }, [tabs, snackFrequency, dessertFrequency, targets]);

  const [verdict, setVerdict] = useState<BasketVerdict | null>(null);

  // Assess when the sheet opens, and re-assess live while it's open (so a
  // tapped fix card resolves the heads-up in place).
  useEffect(() => {
    if (!confirmOpen) return;
    if (!targets) {
      setVerdict(null);
      return;
    }
    setVerdict(
      assessBasket({
        slots: slotSpecs,
        selectedKeys: Array.from(selected),
        allMeals,
        targets,
        allergies: effectiveAnswers.allergies,
        avoid: loadedAvoid,
      })
    );
  }, [confirmOpen, selected, slotSpecs, targets, allMeals, effectiveAnswers.allergies, loadedAvoid]);

  const infeasible = !!verdict && !verdict.feasible;

  useEffect(() => {
    Animated.timing(saveBarAnim, {
      toValue: confirmOpen || plateSheetSlug ? 0 : 1,
      duration: confirmOpen || plateSheetSlug ? 180 : 240,
      easing: confirmOpen || plateSheetSlug ? Easing.in(Easing.cubic) : Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [confirmOpen, plateSheetSlug, saveBarAnim]);

  // ---- header collapse ----
  const titleOpacity = scrollY.interpolate({
    inputRange: [0, TITLE_BLOCK_HEIGHT * 0.4, TITLE_BLOCK_HEIGHT],
    outputRange: [1, 0.3, 0],
    extrapolate: 'clamp',
  });
  const titleTranslateY = scrollY.interpolate({
    inputRange: [0, TITLE_BLOCK_HEIGHT],
    outputRange: [0, -TITLE_BLOCK_HEIGHT * 0.4],
    extrapolate: 'clamp',
  });
  const titleHeight = scrollY.interpolate({
    inputRange: [0, TITLE_BLOCK_HEIGHT],
    outputRange: [TITLE_BLOCK_HEIGHT, 0],
    extrapolate: 'clamp',
  });

  // ---- save flow ----
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleReset = useCallback(() => {
    if (saving) return;
    Alert.alert(
      'Start fresh?',
      'This clears every pick across all tabs.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all',
          style: 'destructive',
          onPress: () => {
            setSelected(new Set());
            setPlateSheetSlug(null);
          },
        },
      ]
    );
  }, [saving]);

  const openConfirm = useCallback(() => {
    if (!hasAnyPicks || saving) return;
    setConfirmOpen(true);
  }, [hasAnyPicks, saving]);

  const handleConfirm = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Decompose scoped keys into slot picks. The storage layer derives the
      // legacy base-slug mirror itself, so the live prompt builder keeps
      // reading clean bare slugs until the builder rebuild ships.
      const picks: SlotPick[] = Array.from(selected).map((scoped) => {
        const { slot, key } = unscopeKey(scoped);
        const ci = key.indexOf(':');
        return ci === -1
          ? { slot, slug: key }
          : { slot, slug: key.slice(0, ci), plate_id: key.slice(ci + 1) };
      });
      await saveCuratedFavoritesV2({
        picks,
        cuisines: loadedCuisines,
        avoid: loadedAvoid,
        likedDishes: loadedDishes,
      });
      setConfirmOpen(false);
      navigation.goBack();
    } catch (e) {
      console.error('save curated favorites failed', e);
      setSaving(false);
    }
  }, [saving, selected, loadedCuisines, loadedAvoid, loadedDishes, navigation]);

  // ---- render ----

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={themeColor} />
        </View>
      </View>
    );
  }

  const plateSheetMeal = allMeals.find((m) => m.slug === plateSheetSlug) ?? null;

  const rows: CuratedMeal[][] = [];
  for (let i = 0; i < activeMeals.length; i += 2) {
    rows.push(activeMeals.slice(i, i + 2));
  }

  const sheetPaddingBottom = Math.max(insets.bottom, 14) + 10;

  return (
    <View style={styles.container}>
      {/* ===== Fixed header ===== */}
      <View style={[styles.headerLayer, { paddingTop: insets.top }]} pointerEvents="box-none">
        <View style={styles.topRow}>
          {fromQuestionnaire ? (
            <View />
          ) : (
            <TouchableOpacity
              onPress={handleBack}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={26} color={themeColor} />
            </TouchableOpacity>
          )}
          {fromQuestionnaire ? (
            <TouchableOpacity
              onPress={handleBack}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Choose for me. Skip picking and let the app choose your meals"
            >
              <Text style={[styles.skipText, { color: themeColor }]}>
                Choose for me
              </Text>
            </TouchableOpacity>
          ) : hasAnyPicks ? (
            <TouchableOpacity
              onPress={handleReset}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Reset. Clear all your picks and start fresh"
            >
              <Text style={[styles.skipText, { color: '#a1a1aa' }]}>Reset</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
        </View>

        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
            height: titleHeight,
            overflow: 'hidden',
          }}
        >
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Foods you like</Text>
            <Text style={styles.subtitle}>
              {fromQuestionnaire
                ? "Last step — pick what you'll eat this week."
                : "Pick what you'll eat this week."}
            </Text>
          </View>
        </Animated.View>

        <View style={styles.tabBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarContent}
            keyboardShouldPersistTaps="handled"
          >
            {tabs.map((tab) => {
              const id = tabId(tab);
              const active = id === activeTabId;
              const hasPicks = (unitsByTabId.get(id) ?? []).length > 0;
              return (
                <TouchableOpacity
                  key={id}
                  activeOpacity={0.75}
                  onPress={() => {
                    setActiveTabId(id);
                    setPlateSheetSlug(null);
                    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
                  }}
                  style={styles.tabBtn}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${tabLabel(tab)}${hasPicks ? ', has picks' : ''}`}
                >
                  <View
                    style={[
                      styles.tabInner,
                      active && { borderBottomColor: themeColor, borderBottomWidth: 2 },
                    ]}
                  >
                    <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                      {tabLabel(tab)}
                    </Text>
                    {/* Ring (empty) vs filled (has picks): shape + colour. */}
                    <View
                      style={[
                        styles.tabDot,
                        hasPicks
                          ? { backgroundColor: themeColor, borderColor: themeColor }
                          : { backgroundColor: 'transparent', borderColor: '#3f3f46' },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* ===== Scrolling content ===== */}
      <Animated.ScrollView
        ref={scrollViewRef as any}
        contentContainerStyle={{
          paddingTop: insets.top + 44 + TITLE_BLOCK_HEIGHT + TAB_BAR_HEIGHT,
          paddingBottom: 200 + STRIP_HEIGHT,
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        keyboardShouldPersistTaps="handled"
      >
        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          keyboardShouldPersistTaps="handled"
        >
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'quick', label: 'Quick' },
              { key: 'no_cook', label: 'No-cook' },
              { key: 'batch', label: 'Big batch' },
            ] as { key: QuickFilter; label: string }[]
          ).map((opt) => {
            const on = quickFilter === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                activeOpacity={0.75}
                onPress={() => setQuickFilter(opt.key)}
                style={[styles.chip, on && [styles.chipActive, { backgroundColor: '#fafafa' }]]}
              >
                <Text style={[styles.chipText, on && styles.chipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Grid */}
        {activeMeals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={28} color="#3f3f46" />
            <Text style={styles.emptyStateText}>No matches with this filter.</Text>
            <TouchableOpacity onPress={() => setQuickFilter('all')} style={styles.emptyStateAction}>
              <Text style={[styles.emptyStateActionText, { color: themeColor }]}>Clear filter</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {rows.map((pair, ri) => (
              <View key={`r${ri}`} style={styles.gridRow}>
                {pair.map((m) => (
                  <MealCard
                    key={m.slug}
                    meal={m}
                    width={cardWidth}
                    selected={viewSelected}
                    themeColor={themeColor}
                    onPress={() => onCardPress(m)}
                    onWaysPress={() => setPlateSheetSlug(m.slug)}
                    onInfoPress={() => {
                      Analytics.track('curated_meal_viewed', { meal_id: m.slug });
                      navigation.navigate('MealDetail', { slug: m.slug });
                    }}
                  />
                ))}
                {pair.length === 1 && <View style={{ width: cardWidth }} />}
              </View>
            ))}
          </View>
        )}
      </Animated.ScrollView>

      {/* ===== Footer: WeekStrip + Save ===== */}
      <Animated.View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 14) },
          {
            opacity: saveBarAnim,
            transform: [
              {
                translateY: saveBarAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }),
              },
            ],
          },
        ]}
        pointerEvents={confirmOpen || plateSheetSlug ? 'none' : 'box-none'}
      >
        {activeTab && (
          <View style={styles.stripBlock}>
            <WeekStrip
              tab={activeTab}
              units={activeUnits}
              dessertFrequency={dessertFrequency}
              themeColor={themeColor}
            />
          </View>
        )}
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!hasAnyPicks || saving}
          onPress={openConfirm}
          style={[styles.saveBtn, hasAnyPicks ? { backgroundColor: themeColor } : styles.saveBtnBlocked]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !hasAnyPicks }}
          accessibilityLabel="Save"
        >
          <Text style={hasAnyPicks ? styles.saveBtnText : styles.saveBtnBlockedText}>Save</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ===== Plate sheet ===== */}
      <PlateSheet
        meal={plateSheetMeal}
        selected={viewSelected}
        themeColor={themeColor}
        open={!!plateSheetSlug}
        onClose={() => setPlateSheetSlug(null)}
        onTogglePlate={(slug, plateId) => {
          if (activeSlot) togglePlate(activeSlot, slug, plateId);
        }}
        paddingBottom={sheetPaddingBottom}
      />

      {/* ===== Confirm sheet ===== */}
      <BottomSheet
        open={confirmOpen}
        onClose={() => !saving && setConfirmOpen(false)}
        paddingBottom={sheetPaddingBottom}
      >
        <Text style={styles.sheetTitle}>Your week, then.</Text>

        <View style={styles.sheetRecap}>
          {tabs.map((tab) => {
            const units = unitsByTabId.get(tabId(tab)) ?? [];
            const rhythm = tabRhythm(tab, dessertFrequency);
            const mini =
              rhythm === 'daily'
                ? Array.from({ length: 7 }).map((_, i) =>
                    units.length ? units[i % units.length] : null
                  )
                : units.length
                ? units.slice(0, 5)
                : [null, null, null];
            return (
              <View key={tabId(tab)} style={styles.recapRow}>
                <Text style={styles.recapLabel}>{tabLabel(tab)}</Text>
                <View style={{ flex: 1 }}>
                  <View style={[styles.miniDots, rhythm === 'mix' && { gap: 0 }]}>
                    {mini.map((u, i) => {
                      const img = u ? getMealImage(u.imageFilename) : null;
                      return (
                        <View
                          key={i}
                          style={[
                            styles.miniDot,
                            rhythm === 'mix' && i > 0 && { marginLeft: -5 },
                            u
                              ? { borderStyle: 'solid', borderColor: '#26262b', backgroundColor: '#1c1c1f', overflow: 'hidden' }
                              : { borderStyle: 'dashed', borderColor: '#3f3f46' },
                          ]}
                        >
                          {u && img ? (
                            <Image source={img} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                  <Text style={styles.recapSentence}>
                    {slotSentence(tab, units, dessertFrequency, true)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Heads-up — only on hard infeasibility. Same row grammar, slightly
            brighter text, no icon, no red, never blocks. */}
        {infeasible && verdict && (
          <>
            <View style={styles.headsUpRow}>
              <Text style={styles.recapLabel}>Heads-up</Text>
              <Text style={styles.headsUpText}>{headsUpSentence(verdict)}</Text>
            </View>
            {verdict.fixes.length > 0 && (
              <View style={styles.fixRow}>
                {verdict.fixes.map((fix: CertifiedFix) => {
                  const img = getMealImage(fix.imageFilename);
                  return (
                    <TouchableOpacity
                      key={`${fix.slug}:${fix.plateId}`}
                      style={styles.fixCard}
                      activeOpacity={0.8}
                      onPress={() => togglePlate(fix.slot as PlanSlot, fix.slug, fix.plateId)}
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${fix.name} to ${fix.slotLabel}`}
                    >
                      <View style={styles.fixThumbWrap}>
                        {img ? (
                          <Image source={img} style={styles.fixThumb} contentFit="cover" />
                        ) : (
                          <View style={[styles.fixThumb, styles.cardImagePlaceholder]}>
                            <Ionicons name="restaurant-outline" size={16} color="#52525b" />
                          </View>
                        )}
                      </View>
                      <Text style={styles.fixName} numberOfLines={2}>
                        {fix.name}
                      </Text>
                      <Text style={styles.fixSlot}>{fix.slotLabel}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        <TouchableOpacity
          activeOpacity={0.88}
          disabled={saving}
          onPress={handleConfirm}
          style={[styles.confirmBtn, { backgroundColor: themeColor }]}
          accessibilityRole="button"
          accessibilityLabel={infeasible ? 'Save anyway' : 'Looks good, confirm'}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#0a0a0b" />
          ) : (
            <Text style={styles.confirmBtnText}>{infeasible ? 'Save anyway' : 'Looks good'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.75}
          disabled={saving}
          onPress={() => setConfirmOpen(false)}
          style={styles.editBtn}
          accessibilityRole="button"
          accessibilityLabel="Keep editing"
        >
          <Text style={styles.editBtnText}>Keep editing</Text>
        </TouchableOpacity>
      </BottomSheet>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: '#0a0a0b',
    zIndex: 10,
  },
  topRow: {
    height: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipText: { fontSize: 14, fontWeight: '500', letterSpacing: -0.1 },

  titleBlock: {
    paddingHorizontal: GRID_H_PADDING,
    paddingTop: 6,
    paddingBottom: 12,
  },
  title: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontSize: 32,
    fontWeight: '400',
    color: '#ffffff',
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#71717a',
    lineHeight: 20,
  },

  tabBar: {
    height: TAB_BAR_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1c1c1f',
  },
  tabBarContent: {
    paddingHorizontal: GRID_H_PADDING,
    gap: 22,
    alignItems: 'flex-end',
    height: TAB_BAR_HEIGHT,
  },
  tabBtn: { paddingTop: 8 },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 14, color: '#71717a', fontWeight: '500', letterSpacing: -0.1 },
  tabLabelActive: { color: '#ffffff', fontWeight: '600' },
  tabDot: { width: 7, height: 7, borderRadius: 3.5, borderWidth: 1.5 },

  filterRow: {
    paddingHorizontal: GRID_H_PADDING,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 8,
  },
  chip: {
    backgroundColor: '#16161a',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipActive: { borderColor: 'transparent' },
  chipText: { fontSize: 13, color: '#d4d4d8', fontWeight: '500' },
  chipTextActive: { color: '#0a0a0b', fontWeight: '600' },

  grid: { paddingHorizontal: GRID_H_PADDING },
  gridRow: { flexDirection: 'row', gap: GRID_GAP, marginBottom: GRID_GAP },

  card: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#16161a',
    position: 'relative',
    flexDirection: 'column',
  },
  cardTapArea: { width: '100%' },
  cardImageWrap: {
    width: '100%',
    backgroundColor: '#0a0a0b',
    position: 'relative',
  },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1c1f',
  },
  selectedScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,11,0.20)',
  },
  checkBadge: {
    position: 'absolute',
    top: 11,
    right: 11,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCount: { fontSize: 12, fontWeight: '700', color: '#0a0a0b' },
  cardFooter: {
    height: FOOTER_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#26262b',
    backgroundColor: '#1c1c20',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  footLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e4e4e7',
    flexShrink: 1,
    marginRight: 6,
  },
  cardTitle: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 19,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  infoBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(10,10,11,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
  },

  emptyState: {
    paddingVertical: 60,
    paddingHorizontal: GRID_H_PADDING,
    alignItems: 'center',
    gap: 10,
  },
  emptyStateText: { fontSize: 13, color: '#71717a' },
  emptyStateAction: { paddingVertical: 8, paddingHorizontal: 16 },
  emptyStateActionText: { fontSize: 13, fontWeight: '600' },

  // ===== Footer: strip + Save =====
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: GRID_H_PADDING,
    paddingTop: 12,
    backgroundColor: '#0c0c0f',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1f1f23',
  },
  stripBlock: { marginBottom: 12, minHeight: STRIP_HEIGHT - 24 },
  stripDots: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  stripDot: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripLine: { fontSize: 13, color: '#d4d4d8', lineHeight: 18 },

  saveBtn: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  saveBtnBlocked: {
    backgroundColor: '#16161a',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
  },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#0a0a0b' },
  saveBtnBlockedText: { fontSize: 14, fontWeight: '500', color: '#a1a1aa', letterSpacing: -0.1 },

  // ===== Sheets (shared shell) =====
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: {
    backgroundColor: '#0d0d10',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1f1f23',
  },
  sheetGrabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#27272a',
    alignSelf: 'center',
    marginBottom: 18,
  },
  sheetTitle: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontSize: 28,
    fontWeight: '400',
    color: '#ffffff',
    letterSpacing: -0.5,
    lineHeight: 32,
    marginBottom: 14,
  },

  // ===== Plate sheet =====
  plateSheetSub: { fontSize: 13, color: '#8b8b94', lineHeight: 18, marginBottom: 14 },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1c1c1f',
  },
  plateThumbWrap: { width: 56, height: 56, borderRadius: 12, overflow: 'hidden' },
  plateThumb: { width: '100%', height: '100%' },
  plateRowBody: { flex: 1 },
  plateRowNameLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  plateRowName: { fontSize: 14, fontWeight: '600', color: '#ffffff', letterSpacing: -0.2, flexShrink: 1 },
  plateRowMeta: { fontSize: 12, color: '#8b8b94', marginTop: 3 },
  treatPill: {
    backgroundColor: 'rgba(212,83,126,0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  treatPillText: { fontSize: 9, color: '#0a0a0b', fontWeight: '700' },
  heroPill: {
    backgroundColor: '#1f1f23',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  heroPillText: { fontSize: 9, color: '#a1a1aa', fontWeight: '600' },
  plateRowCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ===== Confirm sheet =====
  sheetRecap: {
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f1f23',
    marginBottom: 14,
    gap: 13,
  },
  recapRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  recapLabel: {
    width: 72,
    fontSize: 11,
    color: '#6b6b74',
    fontWeight: '600',
    paddingTop: 2,
  },
  miniDots: { flexDirection: 'row', gap: 3, marginBottom: 4 },
  miniDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1 },
  recapSentence: { fontSize: 13.5, color: '#e4e4e7', lineHeight: 19, letterSpacing: -0.1 },

  headsUpRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  headsUpText: { flex: 1, fontSize: 13.5, color: '#f4f4f5', lineHeight: 19.5, letterSpacing: -0.1 },
  fixRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  fixCard: {
    flex: 1,
    backgroundColor: '#16161a',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2a2a2e',
    borderRadius: 12,
    padding: 10,
  },
  fixThumbWrap: { width: '100%', aspectRatio: 1.6, borderRadius: 8, overflow: 'hidden', marginBottom: 7 },
  fixThumb: { width: '100%', height: '100%' },
  fixName: { fontSize: 12, fontWeight: '600', color: '#ffffff', lineHeight: 15, letterSpacing: -0.2 },
  fixSlot: { fontSize: 11, color: '#8b8b94', marginTop: 3 },

  confirmBtn: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  confirmBtnText: { fontSize: 16, fontWeight: '600', color: '#0a0a0b' },
  editBtn: { height: 46, alignItems: 'center', justifyContent: 'center' },
  editBtnText: { fontSize: 14, color: '#a1a1aa', fontWeight: '500', letterSpacing: -0.1 },
});
```

## FILE: src/screens/LibraryScreen.tsx  (825 lines)

```tsx
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
```

## FILE: src/components/GoalsProfileSummaryCard.tsx  (176 lines)

```tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { loadGoalsProfile } from '../utils/goalsProfileStorage';
import { derivePhase } from '../utils/goalsProfile';
import type { GoalsProfile, DerivedPhase, TrainingState } from '../utils/goalsProfile';

/**
 * GoalsProfileSummaryCard — shared between the workout and nutrition plan
 * summaries. Surfaces GoalsProfile's current stats, goal, and derived
 * phase where plans are reviewed, with a single edit affordance into the
 * Goals & Stats screen (the only place these values are actually edited —
 * this card never writes anything itself).
 *
 * Reloads via loadGoalsProfile() on every focus, so it always reflects
 * the freshest saved values (e.g. right after editing weight on the
 * Phase-B "still accurate?" confirm step, or from Goals & Stats itself).
 */

const PHASE_LABELS: Record<DerivedPhase, string> = {
  cut: 'Cut',
  recomp: 'Recomp',
  lean_bulk: 'Lean bulk',
  bulk: 'Bulk',
  maintain: 'Maintain',
};

const TRAINING_STATE_LABELS: Record<TrainingState, string> = {
  new: 'New to training',
  consistent: 'Consistent',
  returning: 'Returning',
  advanced: 'Advanced',
};

function fmtWeight(kg: number): string {
  return `${Math.round(kg * 10) / 10} kg`;
}

export default function GoalsProfileSummaryCard() {
  const navigation = useNavigation<any>();
  const { themeColor } = useTheme();
  const [profile, setProfile] = useState<GoalsProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadGoalsProfile().then((p) => {
        if (!cancelled) setProfile(p);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  // Summary screens are only reachable once a profile exists — but stay
  // defensive rather than crash if this ever renders before one does.
  if (!profile) return null;

  const phase = derivePhase(profile);

  const currentLine = `${fmtWeight(profile.currentWeightKg)}${
    profile.currentBodyFatPct != null ? ` · ${profile.currentBodyFatPct}% BF` : ''
  }`;
  const goalLine =
    profile.goalWeightKg != null
      ? `${fmtWeight(profile.goalWeightKg)}${
          profile.goalBodyFatPct != null ? ` · ${profile.goalBodyFatPct}% BF` : ''
        }`
      : 'Not set';

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: themeColor }]}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('GoalsStats')}
      accessibilityRole="button"
      accessibilityLabel="Edit goals and stats"
    >
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Goals &amp; stats</Text>
        <View style={[styles.phaseBadge, { backgroundColor: `${themeColor}24` }]}>
          <Text style={[styles.phaseBadgeText, { color: themeColor }]}>
            {PHASE_LABELS[phase]}
          </Text>
        </View>
      </View>

      <View style={styles.rows}>
        <View style={styles.rowItem}>
          <Text style={styles.rowLabel}>Training</Text>
          <Text style={styles.rowValue}>
            {TRAINING_STATE_LABELS[profile.trainingState] ?? profile.trainingState}
          </Text>
        </View>
        <View style={styles.rowItem}>
          <Text style={styles.rowLabel}>Current</Text>
          <Text style={styles.rowValue}>{currentLine}</Text>
        </View>
        <View style={styles.rowItem}>
          <Text style={styles.rowLabel}>Goal</Text>
          <Text style={styles.rowValue}>{goalLine}</Text>
        </View>
      </View>

      <View style={styles.editHint}>
        <Ionicons name="create-outline" size={12} color="#71717a" />
        <Text style={styles.editHintText}>Tap to edit</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#131316',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a1a1aa',
    letterSpacing: 0.3,
  },
  phaseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  phaseBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  rows: {
    flexDirection: 'row',
  },
  rowItem: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  editHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 14,
  },
  editHintText: {
    fontSize: 11,
    color: '#71717a',
  },
});

```

