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
import { resolveNutritionAnswers } from '../../utils/nutritionQuestionnaireStorage';
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
        const saved = await resolveNutritionAnswers();
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