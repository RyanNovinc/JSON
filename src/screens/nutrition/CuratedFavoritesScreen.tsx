// src/screens/nutrition/CuratedFavoritesScreen.tsx
//
// "Foods you like" — REDESIGN.
//
// Visual direction: photo-forward gallery, calm, premium, hungry-making.
// Inspired by the "Drink up." vibe (big imagery, demoted metadata, lots of
// breathing room, one bright CTA).
//
// MENTAL MODEL (post-reframe):
//   Selection no longer means "build a library the AI picks from." It means
//   "these are the meals you'll eat this week." 1 pick per slot is a valid,
//   respected choice — that meal is eaten every day for that slot. More picks
//   = more variety. The count IS the variety dial.
//
// What changed (UX):
// - Slot strips → ONE active tab at a time (Breakfast / Lunch / Dinner /
//   Snacks / exotic-as-needed). The visible tab set is driven by the user's
//   questionnaire answers (mealsPerDay, snackFrequency) so the screen mirrors
//   THEIR eating structure, not a generic four-shelf catalogue.
// - Collapsing header: title + subtitle scroll AWAY; the tab strip pins so
//   slot-switching stays one tap. Maximises photography at full scroll.
// - Cards: 3:4 photo-poster with name only. No macro grid, no kcal, no
//   effort badge in browse. Macros / cook-time live in the plate panel that
//   already opens on tap.
// - Lean-threshold mechanic is GONE. Amber "add 2 more" labels: gone. The
//   "Pick N more for breakfast" floating Save state: gone. One pick is a
//   complete answer, not a deficiency. The tab dot is now binary — cyan if
//   the slot has any picks, dim if empty — and that is purely informational.
// - Filter bar: collapsed into a single horizontal chip row.
// - Save flow: tapping Save opens a confirm sheet that reads the user's week
//   back to them in plain language ("Banana Bulk, every morning. 3 lunches on
//   rotation. ..."). They confirm the plan ("Looks good") or go back to edit
//   ("Keep editing"). This is the moment the consequence of one-pick-per-slot
//   becomes real — deliberate users confirm with certainty; accidental picks
//   get noticed before commit.
//
// What is UNCHANGED (logic — single source of truth preserved):
// - SHELF_SLOTS / EXOTIC_SLOTS / mealsForSlots / isMealPicked are imported
//   and called exactly as before.
// - coreShelfStatus / exoticShelfStatus are still called for the `picked`
//   count (which drives the binary tab dot). Their `status` and `needed`
//   fields are now unused by this screen — they remain available in the data
//   layer for other consumers.
// - Selection model (Set<string> of slug or `${slug}:${plateId}`),
//   loadCuratedFavorites / saveCuratedFavorites payload (slugs, cuisines,
//   avoid, likedDishes), plate-panel flip behaviour, multi-plate semantics.
// - The cuisines field is still written back from its loaded value so the
//   prompt-builder contract is untouched.

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Animated,
  Easing,
  Platform,
  Modal,
  // RN core TouchableOpacity, aliased. Used specifically for the ⓘ button on
  // the card. Gesture-handler's TouchableOpacity has a long-standing bug
  // (issues #675, #1163) where absolutely-positioned instances fail to render
  // reliably — the button shows up blank or not at all. Native RN's
  // TouchableOpacity works fine with absolute positioning. Both libraries'
  // touchables can coexist in the same tree.
  TouchableOpacity as RNTouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { CURATED_MEALS } from '../../data/curated_meals';
import { CuratedMeal } from '../../types/curated_meals';
import { getMealImage } from '../../assets/mealImages';
import {
  loadCuratedFavorites,
  saveCuratedFavorites,
} from '../../utils/curatedFavoritesStorage';
import { loadNutritionAnswers } from '../../utils/nutritionQuestionnaireStorage';
import {
  CoreShelf,
  MealSlot,
  TimeBucket,
  FilterState,
  SHELF_SLOTS,
  EXOTIC_SLOTS,
  emptyFilter,
  isMealPicked,
  coreShelfStatus,
  exoticShelfStatus,
  mealsForSlots,
} from '../../utils/curatedShelves';

type NavProp = StackNavigationProp<any>;

// Optional params: when this screen is reached mid-questionnaire the answers
// so far are passed through. mealsPerDay + snackFrequency drive the tab set.
type ParamList = {
  CuratedFavorites:
    | {
        answersSoFar?: {
          mealsPerDay?: number;
          snackFrequency?: string;
          dessertFrequency?: string;
          [k: string]: any;
        };
      }
    | undefined;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Grid: two columns, generous gutter, tall posters.
const GRID_H_PADDING = 18;
const GRID_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_H_PADDING * 2 - GRID_GAP) / 2;

// Header collapse mechanics
const TITLE_BLOCK_HEIGHT = 96; // serif title + subtitle
const TAB_BAR_HEIGHT = 46;

const isMultiPlate = (m: CuratedMeal) => (m.plates?.length ?? 0) > 1;
const plateKey = (slug: string, plateId: string) => `${slug}:${plateId}`;

// =============================================================================
// Tab model — derived from the questionnaire answers
// =============================================================================
//
// A "tab" is either a core shelf ('breakfast' | 'lunch' | 'dinner' | 'snacks')
// or an exotic slot ('brunch', 'pre_workout', etc.). The visible set is built
// from mealsPerDay (how many meal tabs) + snackFrequency (snacks tab y/n).

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

// Order in which exotic slots fill in when the user eats more than 3 meals.
// Conservative ordering — common cases first, gym slots last.
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

/**
 * Build the tab list from the user's questionnaire answers.
 *
 * Rules:
 * - 1 meal  → Dinner
 * - 2 meals → Lunch, Dinner
 * - 3 meals → Breakfast, Lunch, Dinner
 * - 4 meals → 3 core + 1 exotic (first available from EXOTIC_FILL_ORDER)
 * - 5 meals → 3 core + 2 exotic
 * - 6 meals → 3 core + 3 exotic
 * - Snacks appended iff snackFrequency is '1', '2', or 'ai_decide'.
 *
 * If no answers are present (e.g. accessed outside the questionnaire), default
 * to all four core shelves so the screen still works as a standalone editor.
 */
function buildTabs(
  mealsPerDay: number | undefined,
  snackFrequency: string | undefined,
  dessertFrequency: string | undefined,
  allMeals: CuratedMeal[]
): TabKey[] {
  // Fallback: behave like the old four-shelf board.
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

  // Exotic fill (only if the user picked more than 3 meals)
  const extraNeeded = Math.max(0, mealsPerDay - 3);
  if (extraNeeded > 0) {
    let added = 0;
    for (const slot of EXOTIC_FILL_ORDER) {
      if (added >= extraNeeded) break;
      // Only add an exotic slot if at least one curated meal is eligible for it,
      // otherwise the tab would be empty.
      const eligible = mealsForSlots([slot], allMeals, emptyFilter(), 'default');
      if (eligible.length > 0) {
        tabs.push({ kind: 'exotic', slot });
        added += 1;
      }
    }
  }

  // Snacks tab
  if (snackFrequency && snackFrequency !== '0') {
    tabs.push({ kind: 'core', shelf: 'snacks' });
  }

  // Dessert tab — appears whenever the user wants any dessert frequency.
  // Cadence (every_night / most_nights / few_per_week / ai_decide) doesn't
  // affect whether the tab shows, only how the prompt builder uses the value.
  if (dessertFrequency && dessertFrequency !== '0') {
    tabs.push({ kind: 'core', shelf: 'dessert' });
  }

  return tabs;
}

// Per-tab status — delegates entirely to the existing logic.
// Note: post-reframe we only consume `picked` (for the binary tab dot).
// `status` and `needed` are returned by the data layer but unused here.
function statusForTab(
  tab: TabKey,
  allMeals: CuratedMeal[],
  selected: Set<string>
): { status: 'empty' | 'lean' | 'ready'; needed: number; picked: number } {
  if (tab.kind === 'core') {
    const slots = SHELF_SLOTS[tab.shelf];
    const meals = mealsForSlots(slots, allMeals, emptyFilter(), 'default');
    return coreShelfStatus(tab.shelf, meals, selected);
  }
  const meals = mealsForSlots([tab.slot], allMeals, emptyFilter(), 'default');
  return exoticShelfStatus(meals, selected);
}

// =============================================================================
// Week recap — turn picks into the friendly read-back lines used by the
// confirm sheet. One line per tab that has at least one pick. Empty slots are
// silent (no "no snacks" line).
// =============================================================================

type RecapLine = { label: string; sentence: string };

/** Time-of-day phrase used when a slot has exactly one pick. */
function singularWhen(tab: TabKey): string {
  if (tab.kind === 'core') {
    switch (tab.shelf) {
      case 'breakfast': return 'every morning';
      case 'lunch':     return 'every lunchtime';
      case 'dinner':    return 'every evening';
      case 'snacks':    return 'as a snack';
      case 'dessert':   return 'as your dessert';
    }
    return 'every day'; // unreachable, satisfies the type-checker
  }
  switch (tab.slot) {
    case 'brunch':           return 'every late morning';
    case 'second_lunch':     return 'every afternoon';
    case 'early_dinner':     return 'every early evening';
    case 'morning_snack':    return 'every morning, as a snack';
    case 'afternoon_snack':  return 'every afternoon, as a snack';
    case 'evening_snack':    return 'every evening, as a snack';
    case 'pre_workout':      return 'before every workout';
    case 'post_workout':     return 'after every workout';
    default:                 return 'every day';
  }
}

/** Plural noun + tail used when a slot has 2+ picks. */
function pluralPhrase(tab: TabKey, n: number): string {
  // Desserts get "to mix in" treatment — they're optional and rotational,
  // not a slot the user expects to fill every day.
  if (tab.kind === 'core' && tab.shelf === 'dessert') {
    return `${n} desserts to mix in`;
  }
  // Snacks are not strictly daily — "to mix in" is gentler than "on rotation".
  if (tab.kind === 'core' && tab.shelf === 'snacks') {
    return `${n} snacks to mix in`;
  }
  if (
    tab.kind === 'exotic' &&
    (tab.slot === 'morning_snack' ||
      tab.slot === 'afternoon_snack' ||
      tab.slot === 'evening_snack')
  ) {
    return `${n} snacks to mix in`;
  }
  if (tab.kind === 'core') {
    const noun =
      tab.shelf === 'breakfast' ? 'breakfasts'
      : tab.shelf === 'lunch'   ? 'lunches'
      : tab.shelf === 'dinner'  ? 'dinners'
      : 'meals'; // unreachable: snacks + dessert handled above
    return `${n} ${noun} on rotation`;
  }
  // Exotic non-snack slots get a slot-named rotation.
  const noun = (SLOT_LABEL[tab.slot] ?? String(tab.slot)).toLowerCase();
  return `${n} ${noun} options on rotation`;
}

/**
 * Resolve `selected` (mix of bare slugs and `slug:plateId` keys) into the
 * display names of the meals that are picked for a given tab. We count each
 * plate-key as its own pick (e.g. pulled-pork:bowl and pulled-pork:taco both
 * count) — but for single-pick phrasing we display the parent meal's name to
 * avoid awkwardness ("Pulled pork bowl, every lunchtime" is fine; needing the
 * plate name only matters when we're naming a single specific dish).
 */
function pickedNamesForTab(
  tab: TabKey,
  allMeals: CuratedMeal[],
  selected: Set<string>
): { count: number; firstName: string | null } {
  const slots = tab.kind === 'core' ? SHELF_SLOTS[tab.shelf] : [tab.slot];
  const eligible = mealsForSlots(slots, allMeals, emptyFilter(), 'default');

  let count = 0;
  let firstName: string | null = null;
  for (const meal of eligible) {
    let mealPicks = 0;
    if (selected.has(meal.slug)) mealPicks += 1;
    const prefix = meal.slug + ':';
    selected.forEach((k) => { if (k.startsWith(prefix)) mealPicks += 1; });
    if (mealPicks > 0) {
      count += mealPicks;
      if (firstName == null) firstName = meal.display_name;
    }
  }
  return { count, firstName };
}

/** Top-level: build the ordered list of recap lines for the confirm sheet. */
function buildRecap(
  tabs: TabKey[],
  allMeals: CuratedMeal[],
  selected: Set<string>
): RecapLine[] {
  const lines: RecapLine[] = [];
  for (const tab of tabs) {
    const { count, firstName } = pickedNamesForTab(tab, allMeals, selected);
    if (count === 0) continue; // empty slots are silent
    const label = tabLabel(tab).toUpperCase();
    const sentence =
      count === 1 && firstName
        ? `${firstName}, ${singularWhen(tab)}`
        : pluralPhrase(tab, count);
    lines.push({ label, sentence });
  }
  return lines;
}

/**
 * Build the soft skip-warning sentence shown in the confirm sheet when the
 * user has empty tabs. Phrased as a question so it lands as a check-in rather
 * than a warning. Returns null when nothing is empty.
 *
 * Examples:
 *   1 empty (lunch)            → "You'll skip lunch this week — sound right?"
 *   2 empty (lunch + snacks)   → "You'll skip lunch and snacks this week — sound right?"
 *   3+ empty (b + l + d)       → "You'll skip breakfast, lunch and dinner — sound right?"
 */
function buildSkipSentence(emptyTabs: TabKey[]): string | null {
  if (emptyTabs.length === 0) return null;
  const names = emptyTabs.map((t) => tabLabel(t).toLowerCase());
  let joined: string;
  if (names.length === 1) {
    joined = names[0];
  } else if (names.length === 2) {
    joined = `${names[0]} and ${names[1]}`;
  } else {
    joined = `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }
  // For 1–2 empty slots: "this week" reads naturally. For 3+ it would sound
  // odd ("skip breakfast, lunch and dinner this week"), so drop the qualifier.
  const tail = emptyTabs.length <= 2 ? ' this week' : '';
  return `You'll skip ${joined}${tail} — sound right?`;
}

// =============================================================================
// Filter chips — one row only. Time bucket + a "no-cook" shortcut.
// (Equipment as a separate row is gone; surface it later via a sheet if needed.)
// =============================================================================

type QuickFilter = 'all' | 'quick' | 'no_cook' | 'oven';

function applyQuickFilter(meals: CuratedMeal[], qf: QuickFilter): CuratedMeal[] {
  if (qf === 'all') return meals;
  if (qf === 'quick') {
    return meals.filter((m) => {
      const t = m.methods?.[0]?.time_total_minutes ?? 0;
      return t > 0 && t <= 15;
    });
  }
  if (qf === 'no_cook') {
    return meals.filter((m) => {
      const t = m.methods?.[0]?.time_total_minutes ?? 0;
      return t === 0;
    });
  }
  if (qf === 'oven') {
    return meals.filter((m) =>
      (m.methods?.[0]?.equipment ?? []).some((e: string) =>
        ['oven', 'air_fryer', 'slow_cooker'].includes(e)
      )
    );
  }
  return meals;
}

// =============================================================================
// MealCard — photo-poster. Name only.
// =============================================================================

interface MealCardProps {
  meal: CuratedMeal;
  width: number;
  selected: Set<string>;
  isOpen: boolean;
  themeColor: string;
  onPress: () => void;
  onInfoPress: () => void;
}

const MealCard = React.memo(function MealCard({
  meal,
  width,
  selected,
  isOpen,
  themeColor,
  onPress,
  onInfoPress,
}: MealCardProps) {
  const imageSource = getMealImage(meal.image_filename);
  const multi = isMultiPlate(meal);

  // pick count for this meal across all plate-keys
  let picks = 0;
  const prefix = meal.slug + ':';
  if (selected.has(meal.slug)) picks += 1;
  selected.forEach((k) => {
    if (k.startsWith(prefix)) picks += 1;
  });
  const isSel = picks > 0;

  return (
    <View style={[styles.card, { width }]}>
      {/* Image + overlays. Wrapped in a touchable that fills the whole card. */}
      <TouchableOpacity
        style={styles.cardTapArea}
        activeOpacity={0.88}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{
          selected: isSel,
          expanded: multi ? isOpen : undefined,
        }}
        accessibilityLabel={meal.display_name}
      >
        <View style={styles.cardImageWrap}>
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.cardImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
              <Ionicons name="restaurant-outline" size={28} color="#52525b" />
            </View>
          )}

          {/* Selection scrim — lifts the check on selected cards, very subtle. */}
          {isSel && <View style={styles.selectedScrim} pointerEvents="none" />}

          {/* Selection ring (top-right). Hidden while this meal's panel is open. */}
          {!isOpen && (
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
                multi ? (
                  <Text style={styles.badgeCount}>{picks}</Text>
                ) : (
                  <Ionicons name="checkmark" size={15} color="#0a0a0b" />
                )
              ) : null}
            </View>
          )}

          {/* "N ways" hint for multi-plate meals (bottom-left, very small) */}
          {multi && (
            <View style={styles.waysTag} pointerEvents="none">
              <Text style={styles.waysTagText}>
                {isOpen ? 'Close' : `${meal.plates.length} ways`}
              </Text>
            </View>
          )}

          {/* Title sits OVER the image, bottom-left, like the reference */}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {meal.display_name}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Info button — sibling of the card-tap surface (NOT a child).
          Uses RN core TouchableOpacity (RNTouchableOpacity) rather than the
          gesture-handler version. Gesture-handler's TouchableOpacity has a
          long-standing bug (issues #675, #1163) where absolutely-positioned
          instances silently fail to render. RN core's works fine with absolute
          positioning and composes alongside the gesture-handler card-tap
          surface as siblings. */}
      <RNTouchableOpacity
        style={styles.infoBadge}
        onPress={onInfoPress}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`More about ${meal.display_name}`}
      >
        <Ionicons
          name="information-circle-outline"
          size={20}
          color="#ffffff"
        />
      </RNTouchableOpacity>
    </View>
  );
});

// =============================================================================
// PlatePanel — preserved behaviour, restyled for calmer palette.
// =============================================================================

interface PlatePanelProps {
  meal: CuratedMeal;
  selected: Set<string>;
  themeColor: string;
  onClose: () => void;
  onTogglePlate: (slug: string, plateId: string) => void;
}

function PlatePanel({
  meal,
  selected,
  themeColor,
  onClose,
  onTogglePlate,
}: PlatePanelProps) {
  const baseImg = getMealImage(meal.image_filename);
  const baseKcal = meal.plates?.[0]?.plate_macros?.kcal ?? 0;
  const baseProtein = meal.plates?.[0]?.plate_macros?.protein_g ?? 0;
  const serves = meal.produces_servings ?? 1;
  const totalMin = meal.methods?.[0]?.time_total_minutes ?? 0;
  const timeLabel =
    totalMin >= 60
      ? `${Math.round(totalMin / 60)}h`
      : totalMin > 0
      ? `${totalMin} min`
      : null;

  return (
    <View style={styles.platePanel}>
      <View style={styles.platePanelHeader}>
        <Text style={styles.platePanelTitle} numberOfLines={1}>
          {meal.display_name}
        </Text>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={20} color="#71717a" />
        </TouchableOpacity>
      </View>

      <View style={styles.heroWrap}>
        {baseImg ? (
          <Image source={baseImg} style={styles.cardImage} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Ionicons name="restaurant-outline" size={32} color="#52525b" />
          </View>
        )}
      </View>

      {/* Demoted macro strip — calm, hairline-divided, in the spirit of "Drink up." */}
      <View style={styles.panelMacroStrip}>
        <View style={styles.panelMacroCell}>
          <Text style={styles.panelMacroLabel}>CAL</Text>
          <Text style={styles.panelMacroValue}>{baseKcal}</Text>
        </View>
        <View style={styles.panelMacroDivider} />
        <View style={styles.panelMacroCell}>
          <Text style={styles.panelMacroLabel}>PROTEIN</Text>
          <Text style={styles.panelMacroValue}>
            {baseProtein}
            <Text style={styles.panelMacroUnit}>g</Text>
          </Text>
        </View>
        {timeLabel && (
          <>
            <View style={styles.panelMacroDivider} />
            <View style={styles.panelMacroCell}>
              <Text style={styles.panelMacroLabel}>TIME</Text>
              <Text style={styles.panelMacroValue}>{timeLabel}</Text>
            </View>
          </>
        )}
        {serves > 1 && (
          <>
            <View style={styles.panelMacroDivider} />
            <View style={styles.panelMacroCell}>
              <Text style={styles.panelMacroLabel}>SERVES</Text>
              <Text style={styles.panelMacroValue}>{serves}</Text>
            </View>
          </>
        )}
      </View>

      {meal.plates && meal.plates.length > 1 && (
        <>
          <Text style={styles.eatLabel}>How would you eat it?</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.plateScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {meal.plates.map((plate) => {
              const key = plateKey(meal.slug, plate.id);
              const on = selected.has(key);
              const plateImg =
                getMealImage(plate.image_filename) ||
                getMealImage(meal.image_filename);
              return (
                <TouchableOpacity
                  key={plate.id}
                  style={[
                    styles.plateCard,
                    on && { borderColor: themeColor, borderWidth: 2 },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => onTogglePlate(meal.slug, plate.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={plate.display_name}
                >
                  <View style={styles.plateImageWrap}>
                    {plateImg ? (
                      <Image
                        source={plateImg}
                        style={styles.cardImage}
                        contentFit="cover"
                        transition={150}
                      />
                    ) : (
                      <View
                        style={[styles.cardImage, styles.cardImagePlaceholder]}
                      >
                        <Ionicons
                          name="restaurant-outline"
                          size={22}
                          color="#52525b"
                        />
                      </View>
                    )}
                    {on && <View style={styles.selectedScrim} pointerEvents="none" />}
                    <View
                      style={[
                        styles.checkBadge,
                        on
                          ? { backgroundColor: themeColor, borderColor: themeColor }
                          : {
                              backgroundColor: 'rgba(10,10,11,0.45)',
                              borderColor: 'rgba(255,255,255,0.35)',
                            },
                      ]}
                      pointerEvents="none"
                    >
                      {on && (
                        <Ionicons name="checkmark" size={15} color="#0a0a0b" />
                      )}
                    </View>
                    {plate.is_stunt_plate && (
                      <View style={styles.stuntTag} pointerEvents="none">
                        <Text style={styles.stuntTagText}>treat</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.plateBody}>
                    <Text style={styles.plateTitle} numberOfLines={2}>
                      {plate.display_name}
                    </Text>
                    <Text style={styles.plateMeta}>
                      {plate.plate_macros?.kcal ?? 0} cal
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}
    </View>
  );
}

// =============================================================================
// Screen
// =============================================================================

export default function CuratedFavoritesScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<ParamList, 'CuratedFavorites'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const allMeals = useMemo(
    () => Object.values(CURATED_MEALS) as CuratedMeal[],
    []
  );

  // Answers can arrive two ways:
  //   1. As route params during the questionnaire flow (synchronous, no async needed)
  //   2. From saved storage when entered standalone (e.g. from summary/edit screens)
  // If route params are absent, fall back to loading from storage so the screen
  // always knows which tabs to show.
  const paramAnswers = route.params?.answersSoFar;
  const [loadedAnswers, setLoadedAnswers] = useState<{
    mealsPerDay?: number;
    snackFrequency?: string;
    dessertFrequency?: string;
  } | null>(null);

  useEffect(() => {
    // Only load from storage if we don't already have params
    if (paramAnswers) {
      setLoadedAnswers(null); // ensure paramAnswers wins
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadNutritionAnswers();
        if (!cancelled && saved) {
          setLoadedAnswers({
            mealsPerDay: saved.mealsPerDay,
            snackFrequency: saved.snackFrequency,
            dessertFrequency: saved.dessertFrequency,
          });
        }
      } catch (err) {
        console.warn('[CuratedFavorites] Failed to load saved answers:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paramAnswers]);

  const effectiveAnswers = paramAnswers ?? loadedAnswers ?? {};
  const mealsPerDay = effectiveAnswers.mealsPerDay;
  const snackFrequency = effectiveAnswers.snackFrequency;
  const dessertFrequency = effectiveAnswers.dessertFrequency;

  const tabs = useMemo(
    () => buildTabs(mealsPerDay, snackFrequency, dessertFrequency, allMeals),
    [mealsPerDay, snackFrequency, dessertFrequency, allMeals]
  );

  // ---- persisted state ----
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [avoidText, setAvoidText] = useState('');
  const [dishesText, setDishesText] = useState('');
  const [loadedCuisines, setLoadedCuisines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ---- transient UI state ----
  const [activeTabId, setActiveTabId] = useState<string>(() =>
    tabs[0] ? tabId(tabs[0]) : ''
  );
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [showTasteSheet, setShowTasteSheet] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView | null>(null);

  // Fades the bottom Save button out while the confirm sheet is open.
  // Without this the screen's Save sits visibly behind the sheet on iOS — the
  // Modal doesn't cover absolutely-positioned siblings that are outside the
  // Modal's tree. The effect tying it to sheet state is further down,
  // after confirmOpen is declared.
  const saveBarAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fav = await loadCuratedFavorites();
      if (!cancelled) {
        setSelected(new Set(fav.slugs));
        setLoadedCuisines(fav.cuisines);
        setAvoidText(fav.avoid.join(', '));
        setDishesText(fav.likedDishes.join(', '));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // If the tab set changes (route params arrive late, etc.) and the active tab
  // is no longer valid, fall back to the first.
  useEffect(() => {
    if (!tabs.length) return;
    if (!tabs.some((t) => tabId(t) === activeTabId)) {
      setActiveTabId(tabId(tabs[0]));
    }
  }, [tabs, activeTabId]);

  // ---- selection toggles ----
  const toggleMeal = useCallback((slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const togglePlate = useCallback((slug: string, plateId: string) => {
    const key = plateKey(slug, plateId);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const onCardPress = useCallback(
    (meal: CuratedMeal) => {
      if (isMultiPlate(meal)) {
        setOpenSlug((cur) => (cur === meal.slug ? null : meal.slug));
      } else {
        toggleMeal(meal.slug);
      }
    },
    [toggleMeal]
  );

  // ---- derived: active tab data ----
  const activeTab = useMemo<TabKey | null>(
    () => tabs.find((t) => tabId(t) === activeTabId) ?? tabs[0] ?? null,
    [tabs, activeTabId]
  );

  const activeMeals = useMemo(() => {
    if (!activeTab) return [] as CuratedMeal[];
    const slots =
      activeTab.kind === 'core' ? SHELF_SLOTS[activeTab.shelf] : [activeTab.slot];
    const baseMeals = mealsForSlots(slots, allMeals, emptyFilter(), 'default');
    return applyQuickFilter(baseMeals, quickFilter);
  }, [activeTab, allMeals, quickFilter]);

  // Per-tab status (used only for the binary `picked > 0` tab dot now).
  const tabStatuses = useMemo(
    () => tabs.map((t) => ({ tab: t, ...statusForTab(t, allMeals, selected) })),
    [tabs, allMeals, selected]
  );

  // Recap lines for the confirm sheet (only slots with picks; one line each).
  const recapLines = useMemo(
    () => buildRecap(tabs, allMeals, selected),
    [tabs, allMeals, selected]
  );

  // Tabs the user said they eat but hasn't picked anything for. The confirm
  // sheet calls these out gently — "You'll skip lunch this week — sound right?"
  // The user can still proceed (some people genuinely skip a meal), but the
  // consequence is named before they commit.
  const emptyTabs = useMemo(
    () => tabStatuses.filter((s) => s.picked === 0).map((s) => s.tab),
    [tabStatuses]
  );

  // Save is enabled as soon as the user has picked anything at all. There's no
  // per-slot minimum; one pick is a complete answer.
  const hasAnyPicks = recapLines.length > 0;

  // Confirm-sheet visibility. Two pieces:
  //  - `confirmOpen`: the logical "should this be shown" toggle.
  //  - `confirmRendered`: whether the Modal is mounted right now. Lags
  //    confirmOpen by the close animation so the sheet animates OUT before
  //    being unmounted (RN's <Modal animationType="none"> unmounts instantly,
  //    which would clip the fade).
  //  - `confirmAnim`: 0 (closed) → 1 (open), driving both backdrop opacity
  //    and sheet translateY independently.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmRendered, setConfirmRendered] = useState(false);
  const confirmAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (confirmOpen) {
      setConfirmRendered(true);
      // Next frame so the Modal mounts at 0 then animates to 1
      requestAnimationFrame(() => {
        // Spring open — same tension/friction as the detail sheet so both
        // sheets feel like one family.
        Animated.spring(confirmAnim, {
          toValue: 1,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }).start();
      });
    } else if (confirmRendered) {
      Animated.spring(confirmAnim, {
        toValue: 0,
        tension: 90,
        friction: 12,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setConfirmRendered(false);
      });
    }
    // confirmRendered intentionally omitted from deps — we drive it from here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmOpen, confirmAnim]);

  // Drive saveBarAnim from confirm sheet state. (Detail view is now a
  // separate navigation screen, so it doesn't compete for the Save button's
  // space — the whole screen is covered by the iOS sheet.)
  useEffect(() => {
    Animated.timing(saveBarAnim, {
      toValue: confirmOpen ? 0 : 1,
      duration: confirmOpen ? 180 : 240,
      easing: confirmOpen ? Easing.in(Easing.cubic) : Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [confirmOpen, saveBarAnim]);

  // ---- header collapse interpolations ----
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

  const splitList = (s: string): string[] =>
    s.split(/[,\n]/).map((x) => x.trim()).filter((x) => x.length > 0);

  // Save button just opens the confirm sheet — the real write happens after
  // the user taps "Looks good".
  const openConfirm = useCallback(() => {
    if (!hasAnyPicks || saving) return;
    setConfirmOpen(true);
  }, [hasAnyPicks, saving]);

  const handleConfirm = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveCuratedFavorites({
        slugs: Array.from(selected),
        cuisines: loadedCuisines,
        avoid: splitList(avoidText),
        likedDishes: splitList(dishesText),
      });
      setConfirmOpen(false);
      navigation.goBack();
    } catch (e) {
      console.error('save curated favorites failed', e);
      setSaving(false);
    }
  }, [saving, selected, loadedCuisines, avoidText, dishesText, navigation]);

  // Subtitle confirms structure and lands the variety dial in one breath.
  // Voice matches the confirm sheet — friendly, confident, the screen talking
  // to the user rather than instructing them. Two parallel sentences:
  //   "{N meals [and snacks]}. Pick one and you'll have it every day. Pick a
  //    few and we'll rotate them for you."
  // Prefix variants:
  //   1 meal              → "One meal a day."
  //   2+ meals, no snacks → "{N} meals a day."
  //   3 + snacks          → "3 meals and snacks."     (no "a day" — reads
  //                                                    cleaner with the
  //                                                    "and snacks" tail)
  const subtitleText = useMemo(() => {
    const tail =
      "Pick one and you'll have it every day. Pick a few and we'll rotate them for you.";

    if (mealsPerDay == null) {
      // No questionnaire context (standalone editor). Skip the count line and
      // go straight to the rule.
      return tail;
    }

    const hasSnacks = !!snackFrequency && snackFrequency !== '0';

    let prefix: string;
    if (mealsPerDay === 1) {
      prefix = hasSnacks ? 'One meal and snacks.' : 'One meal a day.';
    } else {
      prefix = hasSnacks
        ? `${mealsPerDay} meals and snacks.`
        : `${mealsPerDay} meals a day.`;
    }

    return `${prefix} ${tail}`;
  }, [mealsPerDay, snackFrequency]);

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

  const openMeal = activeMeals.find((m) => m.slug === openSlug) || null;

  // Build the grid as rows of two, so the plate panel can be injected
  // immediately under the row that contains the open meal (preserving the
  // original "flip in place" behaviour).
  const rows: CuratedMeal[][] = [];
  for (let i = 0; i < activeMeals.length; i += 2) {
    rows.push(activeMeals.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      {/* ===== Fixed header layer (back chevron + collapsing title block + pinned tab bar) ===== */}
      <View
        style={[styles.headerLayer, { paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        {/* Top row: back + selected count */}
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={26} color={themeColor} />
          </TouchableOpacity>
          {selected.size > 0 ? (
            <Text style={styles.selectedCount}>{selected.size} selected</Text>
          ) : (
            <View />
          )}
        </View>

        {/* Collapsing title block */}
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
            <Text style={styles.subtitle}>{subtitleText}</Text>
          </View>
        </Animated.View>

        {/* Pinned tab strip */}
        <View style={styles.tabBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarContent}
            keyboardShouldPersistTaps="handled"
          >
            {tabStatuses.map(({ tab, picked }) => {
              const id = tabId(tab);
              const active = id === activeTabId;
              const hasPicks = picked > 0;
              const dotColor = hasPicks ? themeColor : '#3f3f46';
              return (
                <TouchableOpacity
                  key={id}
                  activeOpacity={0.75}
                  onPress={() => {
                    setActiveTabId(id);
                    setOpenSlug(null);
                    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
                  }}
                  style={styles.tabBtn}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${tabLabel(tab)}${
                    hasPicks ? ', has picks' : ''
                  }`}
                >
                  <View
                    style={[
                      styles.tabInner,
                      active && {
                        borderBottomColor: themeColor,
                        borderBottomWidth: 2,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabLabel,
                        active && styles.tabLabelActive,
                      ]}
                    >
                      {tabLabel(tab)}
                    </Text>
                    <View
                      style={[styles.tabDot, { backgroundColor: dotColor }]}
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
          paddingTop:
            insets.top + 44 /* top row */ + TITLE_BLOCK_HEIGHT + TAB_BAR_HEIGHT,
          paddingBottom: 180,
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        keyboardShouldPersistTaps="handled"
      >
        {/* Quick filter row — single horizontal scroll, no caps, no equipment matrix. */}
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
              { key: 'oven', label: 'Oven' },
            ] as { key: QuickFilter; label: string }[]
          ).map((opt) => {
            const on = quickFilter === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                activeOpacity={0.75}
                onPress={() => setQuickFilter(opt.key)}
                style={[
                  styles.chip,
                  on && [styles.chipActive, { backgroundColor: '#fafafa' }],
                ]}
              >
                <Text
                  style={[styles.chipText, on && styles.chipTextActive]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Grid */}
        {activeMeals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="restaurant-outline"
              size={28}
              color="#3f3f46"
            />
            <Text style={styles.emptyStateText}>
              No matches with this filter.
            </Text>
            <TouchableOpacity
              onPress={() => setQuickFilter('all')}
              style={styles.emptyStateAction}
            >
              <Text style={[styles.emptyStateActionText, { color: themeColor }]}>
                Clear filter
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {rows.map((pair, ri) => {
              const openInRow = pair.find((m) => m.slug === openSlug);
              return (
                <View key={`r${ri}`}>
                  <View style={styles.gridRow}>
                    {pair.map((m) => (
                      <MealCard
                        key={m.slug}
                        meal={m}
                        width={CARD_WIDTH}
                        selected={selected}
                        isOpen={openSlug === m.slug}
                        themeColor={themeColor}
                        onPress={() => onCardPress(m)}
                        onInfoPress={() => {
                          setOpenSlug(null); // collapse any inline plate panel
                          // Navigate to MealDetail — registered on the stack
                          // with presentation: 'formSheet', so iOS renders it
                          // as a native sheet with real UIKit physics.
                          navigation.navigate(
                            'MealDetail' as never,
                            { slug: m.slug } as never
                          );
                        }}
                      />
                    ))}
                    {pair.length === 1 && <View style={{ width: CARD_WIDTH }} />}
                  </View>
                  {openInRow && (
                    <PlatePanel
                      meal={openInRow}
                      selected={selected}
                      themeColor={themeColor}
                      onClose={() => setOpenSlug(null)}
                      onTogglePlate={togglePlate}
                    />
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Taste-profile entry — tucked at the very bottom, behind a quiet expand. */}
        <View style={styles.tasteSection}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setShowTasteSheet((v) => !v)}
            style={styles.tasteToggle}
          >
            <Text style={styles.tasteToggleText}>
              Other meals you love · foods to avoid
            </Text>
            <Ionicons
              name={showTasteSheet ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#71717a"
            />
          </TouchableOpacity>

          {showTasteSheet && (
            <View style={styles.tasteSheet}>
              <Text style={styles.tasteFieldLabel}>Other meals you love</Text>
              <Text style={styles.tasteHint}>
                Anything not in the library — just name the dish. Separate with
                commas.
              </Text>
              <TextInput
                style={styles.tasteInput}
                value={dishesText}
                onChangeText={setDishesText}
                placeholder="butter chicken, fried rice, lasagne…"
                placeholderTextColor="#52525b"
                multiline
              />
              <Text style={[styles.tasteFieldLabel, { marginTop: 22 }]}>
                Anything to avoid?
              </Text>
              <Text style={styles.tasteHint}>
                Foods you would rather not see.
              </Text>
              <TextInput
                style={styles.tasteInput}
                value={avoidText}
                onChangeText={setAvoidText}
                placeholder="mushrooms, blue cheese, olives…"
                placeholderTextColor="#52525b"
                multiline
              />
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* ===== Bottom CTA — single-state. Live whenever there's any pick. =====
          Wrapped in Animated.View so it fades/slides out of the way when the
          detail sheet opens (otherwise it sits visibly behind the sheet on
          iOS, since the Modal doesn't cover absolutely-positioned siblings). */}
      <Animated.View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 14) },
          {
            opacity: saveBarAnim,
            transform: [
              {
                translateY: saveBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0], // slides down a touch as it fades
                }),
              },
            ],
          },
        ]}
        pointerEvents={confirmOpen ? 'none' : 'box-none'}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!hasAnyPicks || saving}
          onPress={openConfirm}
          style={[
            styles.saveBtn,
            hasAnyPicks
              ? { backgroundColor: themeColor }
              : styles.saveBtnBlocked,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !hasAnyPicks }}
          accessibilityLabel="Save"
        >
          <Text
            style={hasAnyPicks ? styles.saveBtnText : styles.saveBtnBlockedText}
          >
            Save
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ===== Confirm sheet — reads the user's week back to them ===== */}
      {/* animationType="none" because we drive backdrop fade and sheet slide
          independently via confirmAnim — RN's built-in slide animates the
          backdrop along with the sheet, which looks janky. */}
      <Modal
        visible={confirmRendered}
        transparent
        animationType="none"
        onRequestClose={() => !saving && setConfirmOpen(false)}
      >
        {/* Backdrop: fades in/out via opacity */}
        <Animated.View
          style={[
            styles.sheetBackdrop,
            {
              opacity: confirmAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => !saving && setConfirmOpen(false)}
            accessibilityLabel="Dismiss"
            accessibilityRole="button"
          />
        </Animated.View>

        {/* Sheet: slides up from bottom via translateY */}
        <Animated.View
          style={[
            styles.sheetWrap,
            {
              transform: [
                {
                  translateY: confirmAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0], // off-screen → resting
                  }),
                },
              ],
            },
          ]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 14) + 10 },
            ]}
          >
            <View style={styles.sheetGrabber} />
            <Text style={styles.sheetTitle}>Your week, then.</Text>

            <View style={styles.sheetRecap}>
              {recapLines.map((line, i) => (
                <View key={`${line.label}-${i}`} style={styles.recapRow}>
                  <Text style={styles.recapLabel}>{line.label}</Text>
                  <Text style={styles.recapSentence}>{line.sentence}</Text>
                </View>
              ))}
            </View>

            {emptyTabs.length > 0 && (
              <Text style={styles.skipNote}>{buildSkipSentence(emptyTabs)}</Text>
            )}

            <TouchableOpacity
              activeOpacity={0.88}
              disabled={saving}
              onPress={handleConfirm}
              style={[styles.confirmBtn, { backgroundColor: themeColor }]}
              accessibilityRole="button"
              accessibilityLabel="Looks good, confirm"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#0a0a0b" />
              ) : (
                <Text style={styles.confirmBtnText}>Looks good</Text>
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
          </View>
        </Animated.View>
      </Modal>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Fixed header layer sits above the scroll view.
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
  selectedCount: {
    fontSize: 13,
    color: '#52525b',
    fontWeight: '500',
  },

  // Title block (collapses on scroll)
  titleBlock: {
    paddingHorizontal: GRID_H_PADDING,
    paddingTop: 6,
    paddingBottom: 12,
  },
  title: {
    // The reference uses a confident serif. Falls back gracefully on devices
    // without it. (Wire in your custom font here if you ship one.)
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'Georgia',
    }),
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

  // Tab strip — pinned
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
  tabLabel: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  tabLabelActive: { color: '#ffffff', fontWeight: '600' },
  tabDot: { width: 6, height: 6, borderRadius: 3 },

  // Quick filter row
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

  // Grid
  grid: { paddingHorizontal: GRID_H_PADDING },
  gridRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  // Card — photo poster
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#16161a',
    // The card is now a plain View hosting the tap surface + the ⓘ as
    // siblings. `overflow:hidden` ensures the image inside the touchable
    // still clips to the rounded corners.
    position: 'relative',
  },
  // Full-bleed touchable that handles "select / open plate panel" — sibling
  // of the ⓘ button so the two never compete for the same gesture handler.
  cardTapArea: {
    width: '100%',
  },
  cardImageWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
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
  waysTag: {
    position: 'absolute',
    left: 11,
    bottom: 44,
    backgroundColor: 'rgba(10,10,11,0.72)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  waysTagText: { fontSize: 10, color: '#e4e4e7', fontWeight: '600' },
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
    // Soft drop-shadow so the title stays legible over bright food (mango,
    // strawberry, etc.) without dimming the image itself.
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Empty state for an over-aggressive filter
  emptyState: {
    paddingVertical: 60,
    paddingHorizontal: GRID_H_PADDING,
    alignItems: 'center',
    gap: 10,
  },
  emptyStateText: { fontSize: 13, color: '#71717a' },
  emptyStateAction: { paddingVertical: 8, paddingHorizontal: 16 },
  emptyStateActionText: { fontSize: 13, fontWeight: '600' },

  // ===== Plate panel =====
  platePanel: {
    backgroundColor: '#101012',
    borderRadius: 18,
    padding: 14,
    marginBottom: GRID_GAP,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f1f23',
  },
  platePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  platePanelTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  heroWrap: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0a0a0b',
    marginBottom: 12,
  },
  panelMacroStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f1f23',
    marginBottom: 14,
  },
  panelMacroCell: { flex: 1, alignItems: 'center' },
  panelMacroDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: '#1f1f23',
  },
  panelMacroLabel: {
    fontSize: 9,
    color: '#71717a',
    letterSpacing: 0.6,
    fontWeight: '600',
    marginBottom: 4,
  },
  panelMacroValue: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  panelMacroUnit: { fontSize: 11, color: '#a1a1aa', fontWeight: '500' },
  eatLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
    color: '#71717a',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 10,
  },
  plateScrollContent: { gap: GRID_GAP, paddingRight: 4 },
  plateCard: {
    width: 140,
    backgroundColor: '#18181b',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
  },
  plateImageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#0a0a0b',
    position: 'relative',
  },
  plateBody: { padding: 10 },
  plateTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 15,
    letterSpacing: -0.2,
    minHeight: 30,
  },
  plateMeta: { fontSize: 10, color: '#71717a', marginTop: 3 },
  stuntTag: {
    position: 'absolute',
    left: 7,
    bottom: 7,
    backgroundColor: 'rgba(212,83,126,0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  stuntTagText: { fontSize: 9, color: '#0a0a0b', fontWeight: '700' },

  // ===== Taste profile (collapsed by default) =====
  tasteSection: {
    paddingHorizontal: GRID_H_PADDING,
    paddingTop: 28,
  },
  tasteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1f1f23',
  },
  tasteToggleText: {
    fontSize: 13,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  tasteSheet: { paddingTop: 8, paddingBottom: 8 },
  tasteFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: -0.1,
    marginBottom: 3,
  },
  tasteHint: {
    fontSize: 12,
    color: '#71717a',
    lineHeight: 17,
    marginBottom: 10,
  },
  tasteInput: {
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#ffffff',
    minHeight: 48,
    textAlignVertical: 'top',
  },

  // ===== Bottom CTA =====
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: GRID_H_PADDING,
    paddingTop: 14,
  },
  saveBtn: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnBlocked: {
    backgroundColor: '#16161a',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
  },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#0a0a0b' },
  saveBtnBlockedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a1a1aa',
    letterSpacing: -0.1,
  },

  // ===== Confirm sheet =====
  // Bottom-anchored modal: dim backdrop, rounded top, mirrors the dark calm
  // of the rest of the screen. Headline → divider → recap rows → primary →
  // secondary. No subhead — the headline carries warmth, the recap carries
  // information; anything between them is noise.
  //
  // Animation: backdrop fades in via opacity, sheet slides up via translateY,
  // driven independently from confirmAnim. Modal itself uses animationType
  // "none" — the built-in slide animates both layers as one, which makes the
  // backdrop slide up with the sheet (looks broken).
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
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
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'Georgia',
    }),
    fontSize: 28,
    fontWeight: '400',
    color: '#ffffff',
    letterSpacing: -0.5,
    lineHeight: 32,
    marginBottom: 18,
  },
  sheetRecap: {
    paddingVertical: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f1f23',
    marginBottom: 18,
    gap: 14,
  },
  recapRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  recapLabel: {
    width: 78,
    fontSize: 10,
    color: '#52525b',
    letterSpacing: 0.7,
    fontWeight: '700',
  },
  recapSentence: {
    flex: 1,
    fontSize: 14,
    color: '#e4e4e7',
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  // Soft check-in line when the user has empty slots. Dimmer than the recap
  // rows above; phrased as a question, not a warning. Lives between the recap
  // block and the primary action.
  skipNote: {
    fontSize: 13,
    color: '#a1a1aa',
    lineHeight: 19,
    letterSpacing: -0.1,
    marginBottom: 18,
  },
  confirmBtn: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  confirmBtnText: { fontSize: 16, fontWeight: '600', color: '#0a0a0b' },
  editBtn: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    fontSize: 14,
    color: '#a1a1aa',
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // ===== Info button on card (top-left) =====
  // The Ionicons `information-circle-outline` glyph is itself a circle, so the
  // badge here is just a small dark backdrop for legibility on bright food
  // (mango, strawberry). Tap target is expanded via hitSlop in the JSX.
  // zIndex/elevation guarantee it sits above the sibling cardTapArea.
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

});