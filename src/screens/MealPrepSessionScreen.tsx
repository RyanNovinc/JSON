import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageSourcePropType,
  Animated,
  Easing,
  AccessibilityInfo,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useSimplifiedMealPlanning } from '../contexts/SimplifiedMealPlanningContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';
import {
  buildPrepSession,
  buildPrepSessionWithFreshness,
  PrepGroup,
  MakeFreshItem,
  PrepSession,
  PrepSessionWithFreshness,
  PrepSessionItem,
} from '../utils/buildPrepSession';
import { clampCookPortions } from '../utils/cookPortions';
import { isSeasoning, isDiscrete } from '../utils/ingredientScaling';
import { getMealImage } from '../assets/mealImages';
import { CURATED_MEALS } from '../data/curated_meals';
import { INGREDIENTS } from '../data/ingredients';

type MealPrepNav = StackNavigationProp<RootStackParamList, 'MealPrepSession'>;

// ============================================================================
// FOCUS MODE, poster edition. One task on screen as a full-photo poster card —
// and the BANKED state gets the exact same poster treatment (badge + eyebrow
// swap), so a completed dish looks as good as a pending one.
//
// The LOBBY (the first face of this screen) is poster-stacked too: each dish is
// a wide photo card rather than a 36px thumb in a list, the made-fresh items
// collapse to a single tappable row instead of a wall of names, and the content
// runs all the way down to the CTA so the screen never reads half empty.
//
// Chrome: X exits the session; a pinned bottom bar carries all interaction in
// thumb reach — [‹ previous dish] [Let's go / Undo] [next dish ›]. The arrows
// walk strict QUEUE ORDER (left = the dish before this one, right = the one
// after), matching what arrows visually promise; segments remain tappable for
// jumps. Completing a batch (PrepMode's Batch done or the mark-done link)
// shows a short celebration beat before the next dish.
//
// All scheduling logic (buildWorklist, plate merging, passive-first ordering,
// per-plan done persistence) is unchanged.
// ============================================================================

// ---------------------------------------------------------------------------
// Time formatting — mirrors RecipeDetailScreen.formatTime.
// ---------------------------------------------------------------------------
function formatTime(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

// Prep day is a day. Naming it in the eyebrow roots the session in the here and
// now instead of reading like a generic section header.
function todayLabel(): string {
  try {
    return new Date().toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase();
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Prep-ahead copy. The poster no longer renders these (PrepMode does), but the
// worklist still carries them for PrepMode and any future use.
// ---------------------------------------------------------------------------
function prepNowText(g: PrepGroup): string {
  const v = g.prepAheadSummary?.trim();
  return v && v.length > 0 ? v : 'Prep the components ahead';
}
function dayOfText(g: PrepGroup): string {
  const v = g.dayOfSummary?.trim();
  return v && v.length > 0 ? v : 'Finish fresh at mealtime';
}

// ============================================================================
// Scheduling
// ----------------------------------------------------------------------------
// A WorkItem is a cook-ahead or prep-ahead batch the user has to actively get
// going. make-fresh items never enter the queue — they're cooked to order, so
// they have no place on prep day.
//
// Ordering model — minimise makespan for ONE cook:
//   passive = total − hands-on  ("set it and walk away" time)
//   A single cook is the bottleneck; their active work serialises while passive
//   cooks run unattended. So the makespan floor is the LONGEST single cook, and
//   you hit it by starting the longest-passive items first and spending their
//   idle hours on the quick active jobs. Hence: sort by passive desc.
// ============================================================================

type Strategy = 'cook' | 'prep';

// A WorkItem is one task in the queue. Crucially it can span MULTIPLE plates of
// the same meal: the cook/prep work is shared (you grill all the koftas once,
// then split them into a bowl and a wrap), so those plates collapse into a
// single task here. The per-plate day-of finishes are kept as `dayOfLines`.
interface WorkItem {
  group: PrepGroup; // representative plate — storage, slug, recipe nav
  image: ImageSourcePropType | null; // meal photo (representative plate)
  doneKey: string; // dedupe key for done-state (slug-scoped when merged)
  strategy: Strategy;
  title: string; // meal-level name when merged, else the specific plate name
  cookServings: number; // summed across merged plates
  coverage: number; // meals covered, summed across merged plates
  prepAheadSummary?: string; // shared prep-now copy ('prep' only)
  dayOfLines: string[]; // day-of finishes ('prep' only); 1 line, or 1-per-plate
  total: number; // wall-clock minutes for ONE cook (not summed)
  handsOn: number; // active minutes for ONE cook (falls back to total)
  handsOnKnown: boolean;
  passive: number; // max(0, total − hands-on)
  setAndForget: boolean; // mostly unattended → "start it and walk away"
}

// PrepGroup is assumed to carry per-batch active minutes as `activeMinutes`.
// If buildPrepSession names that field differently, change THIS LINE ONLY and
// everything downstream (ordering, copy, finish estimate) follows.
function readHandsOn(group: PrepGroup): number | null {
  const raw = (group as unknown as { activeMinutes?: number }).activeMinutes;
  return typeof raw === 'number' && raw > 0 ? raw : null;
}

// The one-line character note on a lobby poster. "set & forget" gets its own
// chip; everything else says plainly how much of the clock you're chained to.
function paceNote(item: WorkItem): string {
  if (item.handsOnKnown && item.passive >= 8) {
    return `${formatTime(item.passive)} unattended`;
  }
  return 'hands on the whole time';
}

// Meal photo, resolved the same way the rest of the app does: look up the
// curated meal by slug, prefer the specific plate's image_filename, fall back
// to the meal-level one, then hand the filename to getMealImage(). Mirrors
// renderFeedCard in NutritionHomeScreen. Returns null only if nothing resolves,
// so a missing asset degrades to a neutral block instead of a broken image.
function mealImageSource(group: PrepGroup): ImageSourcePropType | null {
  const meal = Object.values(CURATED_MEALS).find(
    (m: any) => m.slug === group.slug
  ) as any;
  if (!meal) return null;
  const plate = meal.plates?.find((p: any) => p.id === group.plateId);
  const fromPlate = plate?.image_filename ? getMealImage(plate.image_filename) : null;
  const fromMeal = meal.image_filename ? getMealImage(meal.image_filename) : null;
  return fromPlate ?? fromMeal ?? null;
}

function humanizeSlug(slug: string): string {
  return slug
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function ingredientName(id: string): string {
  const entry = (INGREDIENTS as any)[id];
  if (entry?.display_name) return entry.display_name as string;
  return id.split('_').filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------
// Summary carousel: an endless slow drift of the cooked dishes' photos —
// tilted alternately, check-badged, glow behind, edges fading out. The
// sequence is rendered TWICE and translated by exactly one sequence-width,
// so the loop has no visible restart. Short queues are padded by repetition
// to keep the band dense (invisible in a loop). Respects the system
// reduce-motion setting: cards still show, the drift just doesn't run.
// ---------------------------------------------------------------------------
const CAROUSEL_CARD = 86;
const CAROUSEL_GAP = 14;

function DishCarousel({ items, themeColor }: { items: WorkItem[]; themeColor: string }) {
  let base = items;
  while (base.length > 0 && base.length < 4) base = base.concat(items);
  const seqWidth = base.length * (CAROUSEL_CARD + CAROUSEL_GAP);
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled || reduced || seqWidth === 0) return;
      drift.setValue(0);
      anim = Animated.loop(
        Animated.timing(drift, {
          toValue: -seqWidth,
          duration: (seqWidth / (CAROUSEL_CARD + CAROUSEL_GAP)) * 4400, // ~4.4s per card
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      anim.start();
    });
    return () => {
      cancelled = true;
      if (anim) anim.stop();
    };
  }, [drift, seqWidth]);

  if (base.length === 0) return null;

  return (
    <View style={styles.carouselWrap}>
      <View style={[styles.carouselGlow, { backgroundColor: `${themeColor}12` }]} />
      <Animated.View
        style={[styles.carouselTrack, { transform: [{ translateX: drift }] }]}
      >
        {[...base, ...base].map((item, i) => (
          <View
            key={`${item.doneKey}-${i}`}
            style={[
              styles.carouselCard,
              {
                marginRight: CAROUSEL_GAP,
                marginTop: i % 2 === 0 ? 0 : -10,
                transform: [{ rotate: i % 2 === 0 ? '-4deg' : '4deg' }],
              },
            ]}
          >
            {item.image ? (
              <Image source={item.image} style={styles.carouselImage} contentFit="cover" />
            ) : (
              <View style={[styles.carouselImage, styles.thumbPlaceholder]}>
                <Ionicons name="image-outline" size={18} color="#52525b" />
              </View>
            )}
            <View style={[styles.carouselBadge, { backgroundColor: themeColor }]}>
              <Ionicons name="checkmark" size={11} color="#000" />
            </View>
          </View>
        ))}
      </Animated.View>
      <LinearGradient
        colors={['#000000', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.carouselFade, { left: 0 }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.carouselFade, { right: 0 }]}
        pointerEvents="none"
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Ingredients view: every ingredient a set of dishes calls for, summed and
// scaled to each dish's serving count. Assumes each dish's DEFAULT variant and
// first method (the exact per-dish list, for the method actually chosen,
// appears on PrepMode's gather screen). Seasonings (tsp/tbsp) are collected as
// names only — you season per recipe, and summing "1/2 tsp cumin" across three
// dishes is noise. Pot-level batch aromatics (sub-1-per-serving discrete
// items) contribute their batch amount, mirroring displayIngredient's rule.
// ---------------------------------------------------------------------------
interface NeedRef {
  slug: string;
  servings: number;
}

function buildNeedList(refs: NeedRef[]): {
  rows: { name: string; qty: string }[];
  seasonings: string[];
} {
  const totals = new Map<string, { raw: number; unit: string }>();
  const seasonings = new Set<string>();
  for (const ref of refs) {
    const meal = Object.values(CURATED_MEALS).find(
      (m: any) => m.slug === ref.slug
    ) as any;
    if (!meal) continue;
    const produces =
      typeof meal.produces_servings === 'number' && meal.produces_servings > 0
        ? meal.produces_servings
        : 1;
    const variants = meal.sauce_variants ?? null;
    const variant =
      variants && variants.length > 0
        ? variants.find((v: any) => v.is_default) ?? variants[0]
        : null;
    const method = meal.methods?.[0] ?? null;
    const rows = [
      ...(meal.base_ingredients ?? []),
      ...(variant?.ingredients ?? []),
      ...(method?.ingredients ?? []),
    ] as { ingredient_id: string; base_amount: number; unit: string }[];
    for (const row of rows) {
      if (isSeasoning(row.unit)) {
        seasonings.add(ingredientName(row.ingredient_id));
        continue;
      }
      const perServing = row.base_amount / produces;
      const add =
        isDiscrete(row.unit) && produces > 1 && perServing < 1
          ? row.base_amount // pot-level batch aromatic: one batch's worth
          : perServing * ref.servings;
      const prev = totals.get(row.ingredient_id);
      if (prev) prev.raw += add;
      else totals.set(row.ingredient_id, { raw: add, unit: row.unit });
    }
  }
  const rows = [...totals.entries()]
    .map(([id, t]) => {
      let qty: string;
      if (t.unit === 'kg' || t.unit === 'l') {
        qty = `${`${Math.round(t.raw * 100) / 100}`.replace(/\.?0+$/, '')} ${t.unit}`;
      } else if (isDiscrete(t.unit)) {
        const n = Math.max(1, Math.round(t.raw));
        qty =
          t.unit === 'cloves'
            ? `${n} clove${n === 1 ? '' : 's'}`
            : t.unit === 'bulb'
            ? `${n} bulb${n === 1 ? '' : 's'}`
            : `${n}`;
      } else {
        qty = `${Math.round(t.raw)} ${t.unit}`;
      }
      return { name: ingredientName(id), qty };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return { rows, seasonings: [...seasonings].sort() };
}

// Per-plate view, before plates of the same meal are merged into one task.
interface RawItem {
  group: PrepGroup;
  strategy: Strategy;
  total: number;
  handsOn: number;
  handsOnKnown: boolean;
}

function toRaw(group: PrepGroup, strategy: Strategy): RawItem {
  const total = group.sortMinutes ?? 0;
  const rawHandsOn = readHandsOn(group);
  const handsOnKnown = rawHandsOn != null;
  const handsOn = handsOnKnown ? Math.min(rawHandsOn as number, total) : total;
  return { group, strategy, total, handsOn, handsOnKnown };
}

function buildWorklist(session: PrepSession): WorkItem[] {
  const raw: RawItem[] = [
    ...session.cookAhead.map((g) => toRaw(g, 'cook')),
    ...session.prepAhead.map((g) => toRaw(g, 'prep')),
  ];

  // Consolidate plates of the SAME meal. buildPrepSession groups by slug+plate,
  // so a meal on two plates yields two near-identical prep tasks — telling the
  // user to cook the same thing twice and double-counting its active minutes in
  // the finish estimate. Merge by strategy+slug: sum servings/coverage, take ONE
  // cook's time (not the sum), and keep each plate's distinct day-of finish.
  const buckets = new Map<string, RawItem[]>();
  for (const item of raw) {
    const k = `${item.strategy}:${item.group.slug}`;
    const arr = buckets.get(k);
    if (arr) arr.push(item);
    else buckets.set(k, [item]);
  }

  const items: WorkItem[] = [];
  for (const [bucketKey, plates] of buckets) {
    const rep = plates[0];
    const merged = plates.length > 1;

    const total = plates.reduce((m, i) => Math.max(m, i.total), 0);
    const handsOnKnown = plates.every((i) => i.handsOnKnown);
    // One cook, not N — the longest single batch's active time, never the sum.
    const handsOn = plates.reduce((m, i) => Math.max(m, i.handsOn), 0);
    const passive = Math.max(0, total - handsOn);
    const setAndForget = handsOnKnown && passive >= 20 && passive >= total * 0.5;

    const cookServings = plates.reduce((s, i) => s + (i.group.cookServings ?? 0), 0);
    const coverage = plates.reduce((s, i) => s + (i.group.occurrences ?? 0), 0);

    // Day-of finishes: collapse to one line when every plate finishes the same
    // way; label each by plate name when they differ.
    let dayOfLines: string[] = [];
    if (rep.strategy === 'prep') {
      const seen = new Set<string>();
      const uniq: { label: string; summary: string }[] = [];
      for (const i of plates) {
        const summary = dayOfText(i.group);
        if (!seen.has(summary)) {
          seen.add(summary);
          uniq.push({ label: i.group.displayName, summary });
        }
      }
      dayOfLines =
        uniq.length <= 1
          ? uniq.map((u) => u.summary)
          : uniq.map((u) => `${u.label}: ${u.summary}`);
    }

    items.push({
      group: rep.group,
      image: mealImageSource(rep.group),
      doneKey: merged ? bucketKey : rep.group.key,
      strategy: rep.strategy,
      title: merged ? humanizeSlug(rep.group.slug) : rep.group.displayName,
      cookServings,
      coverage,
      prepAheadSummary: rep.strategy === 'prep' ? prepNowText(rep.group) : undefined,
      dayOfLines,
      total,
      handsOn,
      handsOnKnown,
      passive,
      setAndForget,
    });
  }

  // Longest passive first; tie-break on total time, then on coverage so the
  // batch feeding the most meals wins an otherwise-even race.
  items.sort((a, b) => b.passive - a.passive || b.total - a.total || b.coverage - a.coverage);
  return items;
}

// ============================================================================
// Segment strip — one tappable segment per queue item, in queue order:
// filled = done, outlined = the focused task, dim = still to do.
// ============================================================================
function SegmentStrip({
  queue,
  doneKeys,
  currentKey,
  themeColor,
  onSelect,
}: {
  queue: WorkItem[];
  doneKeys: Record<string, boolean>;
  currentKey: string | null;
  themeColor: string;
  onSelect: (key: string) => void;
}) {
  return (
    <View style={styles.strip}>
      {queue.map((item) => {
        const done = !!doneKeys[item.doneKey];
        const isCurrent = item.doneKey === currentKey;
        return (
          <TouchableOpacity
            key={item.doneKey}
            style={styles.stripTouch}
            activeOpacity={0.6}
            onPress={() => onSelect(item.doneKey)}
            accessibilityLabel={`${item.title}${done ? ', done' : isCurrent ? ', current task' : ''}`}
          >
            <View
              style={[
                styles.stripSeg,
                done
                  ? { backgroundColor: themeColor }
                  : isCurrent
                  ? { backgroundColor: '#18181b', borderWidth: 1, borderColor: themeColor }
                  : { backgroundColor: '#27272a' },
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ============================================================================
// Make-fresh row — quiet, names-only. Never queued; shown only on the finale.
// ============================================================================
function MakeFreshRow({ item }: { item: MakeFreshItem }) {
  return (
    <View style={styles.freshRow}>
      <View style={styles.freshTextCol}>
        <Text style={styles.freshName} numberOfLines={1}>
          {item.displayName}
        </Text>
        {item.reason ? (
          <Text style={styles.freshReason} numberOfLines={1}>
            {item.reason}
          </Text>
        ) : null}
      </View>
      {item.occurrences > 1 ? <Text style={styles.freshMeta}>×{item.occurrences}</Text> : null}
    </View>
  );
}

function MakeFreshCard({
  makeFresh,
  blurb,
}: {
  makeFresh: MakeFreshItem[];
  blurb: string;
}) {
  return (
    <View style={styles.freshCardBlock}>
      <Text style={styles.eyebrowMuted}>MADE FRESH AT MEALTIME</Text>
      <Text style={styles.sectionBlurb}>{blurb}</Text>
      <View style={styles.freshCard}>
        {makeFresh.map((item, idx) => (
          <View key={item.key}>
            {idx > 0 ? <View style={styles.freshDivider} /> : null}
            <MakeFreshRow item={item} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// Lobby dish poster — a wide photo card per dish. The photo runs full-bleed
// under a left-to-right scrim so the text always sits on near-solid ink while
// the food still reads on the left third.
// ============================================================================
function DishPoster({
  item,
  done,
  themeColor,
  onPress,
}: {
  item: WorkItem;
  done: boolean;
  themeColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.dishPoster, done && styles.dishPosterDone]}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityLabel={`${item.title}, ${item.coverage} ${
        item.coverage === 1 ? 'meal' : 'meals'
      }${done ? ', done' : ''}`}
    >
      {item.image ? (
        <Image
          source={item.image}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={160}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.thumbPlaceholder]}>
          <Ionicons name="image-outline" size={22} color="#52525b" />
        </View>
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'rgba(6,6,8,0.72)', 'rgba(6,6,8,0.95)']}
        locations={[0, 0.34, 0.62]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.dishPosterContent}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dishPosterName} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.dishMetaRow}>
            <Text style={[styles.dishMeals, { color: themeColor }]}>
              {item.coverage} {item.coverage === 1 ? 'meal' : 'meals'}
            </Text>
            <View style={styles.metaDot} />
            {item.setAndForget ? (
              <View style={styles.dishChip}>
                <Ionicons name="flame" size={10} color="#e0c98a" />
                <Text style={styles.dishChipText}>set &amp; forget</Text>
              </View>
            ) : (
              <Text style={styles.dishNote} numberOfLines={1}>
                {paceNote(item)}
              </Text>
            )}
          </View>
        </View>
        {done ? (
          <View style={[styles.dishDoneBadge, { backgroundColor: themeColor }]}>
            <Ionicons name="checkmark" size={14} color="#000" />
          </View>
        ) : (
          <Text style={styles.dishTime}>{formatTime(item.total)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// Screen
// ============================================================================
export default function MealPrepSessionScreen() {
  const navigation = useNavigation<MealPrepNav>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const { currentPlan } = useSimplifiedMealPlanning();
  // The grocery list lives on the legacy MealPlanningContext (same source
  // GroceryListScreen reads), not on the simplified plan this screen runs on.
  const { currentMealPlan } = useMealPlanning();

  const session: PrepSession | null = useMemo(
    () => (currentPlan ? buildPrepSession(currentPlan) : null),
    [currentPlan]
  );

  const freshnessSession: PrepSessionWithFreshness | null = useMemo(
    () => (currentPlan ? buildPrepSessionWithFreshness(currentPlan) : null),
    [currentPlan]
  );

  const queue: WorkItem[] = useMemo(
    () => (session && !session.totals.isLegacyPlan ? buildWorklist(session) : []),
    [session]
  );

  // Per-item completion, scoped to this plan. Stored as an array of done keys
  // under @mealprep_done_<planId>; loaded into a lookup map on mount and
  // re-read on every focus (PrepMode writes the same key on Batch done).
  const storageKey = currentPlan ? `@mealprep_done_${currentPlan.id}` : null;
  const [doneKeys, setDoneKeys] = useState<Record<string, boolean>>({});

  // Manual focus override. null = "front of the remaining queue" (the default,
  // and what reopening mid-week lands on). Set by the nav arrows or a strip
  // segment; cleared when a task completes so the screen auto-advances.
  const [focusKey, setFocusKey] = useState<string | null>(null);

  // Lobby-first: the screen opens on the session overview; Start/Continue
  // enters the focus flow, and the focus X returns HERE rather than exiting.
  const [inFocus, setInFocus] = useState(false);
  const [showNeed, setShowNeed] = useState(false);

  // The win, stamped onto the dish you just finished. `celebration` holds that
  // dish while its poster sits OVER the next one; the stamp springs in, holds,
  // then the whole layer cross-fades away to reveal what's next. ~1.2s total,
  // and nothing is blocked while it plays — the bottom bar underneath is live.
  const [celebration, setCelebration] = useState<WorkItem | null>(null);
  const celebAnim = useRef<Animated.CompositeAnimation | null>(null);
  const celebScale = useRef(new Animated.Value(0.3)).current;
  const celebFade = useRef(new Animated.Value(1)).current;

  // Refs for detecting EXTERNAL completions (PrepMode's Batch done) on focus:
  // compare the freshly-read done set with the last one we knew about.
  const doneKeysRef = useRef<Record<string, boolean>>({});
  const doneLoadedRef = useRef(false);

  useEffect(() => {
    doneKeysRef.current = doneKeys;
  }, [doneKeys]);

  const startCelebration = useCallback(
    (item: WorkItem) => {
      if (celebAnim.current) celebAnim.current.stop();
      setCelebration(item);
      celebScale.setValue(0.3);
      celebFade.setValue(1);
      // ~700ms end to end. The stamp reads at a glance, so the beat only has to
      // register that it happened — anything longer is the user waiting.
      celebAnim.current = Animated.sequence([
        // Stamp snaps in. Stiff spring: lands rather than settles.
        Animated.spring(celebScale, {
          toValue: 1,
          friction: 6,
          tension: 260,
          useNativeDriver: true,
        }),
        // Just enough of a beat to see it land.
        Animated.delay(170),
        // The finished dish gives way to the next one.
        Animated.timing(celebFade, {
          toValue: 0,
          duration: 230,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]);
      celebAnim.current.start(({ finished }) => {
        if (finished) setCelebration(null);
      });
    },
    [celebScale, celebFade]
  );

  useEffect(
    () => () => {
      if (celebAnim.current) celebAnim.current.stop();
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    setFocusKey(null);
    setInFocus(false);
    setShowNeed(false);
    doneLoadedRef.current = false;
    (async () => {
      if (!storageKey) {
        setDoneKeys({});
        return;
      }
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        const arr: string[] = raw ? JSON.parse(raw) : [];
        if (!cancelled) {
          const map: Record<string, boolean> = {};
          for (const k of arr) map[k] = true;
          setDoneKeys(map);
          doneKeysRef.current = map;
          doneLoadedRef.current = true;
        }
      } catch {
        if (!cancelled) setDoneKeys({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  // Reload done-state whenever the screen regains focus. A key that's newly
  // done and wasn't marked here means PrepMode finished a batch — celebrate it.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!storageKey) return;
        try {
          const raw = await AsyncStorage.getItem(storageKey);
          const arr: string[] = raw ? JSON.parse(raw) : [];
          if (cancelled) return;
          const map: Record<string, boolean> = {};
          for (const k of arr) map[k] = true;
          if (doneLoadedRef.current) {
            const fresh = Object.keys(map).find((k) => !doneKeysRef.current[k]);
            if (fresh) {
              const item = queue.find((i) => i.doneKey === fresh);
              // Stamping needs a next dish to reveal underneath. If that was
              // the last one, skip it — the screen goes to the summary.
              const anyLeft = queue.some((i) => !map[i.doneKey]);
              if (item && anyLeft) startCelebration(item);
            }
          }
          setDoneKeys(map);
          doneKeysRef.current = map;
          doneLoadedRef.current = true;
        } catch {
          // keep whatever we had
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [storageKey, queue, startCelebration])
  );

  const toggleDone = useCallback(
    (key: string) => {
      setDoneKeys((prev) => {
        const next = { ...prev };
        if (next[key]) {
          delete next[key];
        } else {
          next[key] = true;
        }
        if (storageKey) {
          AsyncStorage.setItem(storageKey, JSON.stringify(Object.keys(next))).catch(() => {});
        }
        return next;
      });
    },
    [storageKey]
  );

  // Deep-link into the recipe at the batch's serving count (used from the
  // banked view's link). Clamp on the send side too via the shared util.
  const openRecipe = useCallback(
    (group: PrepGroup, servings?: number) => {
      navigation.navigate('RecipeDetail', {
        mealSlug: group.slug,
        plateId: group.plateId,
        servings: clampCookPortions(servings ?? group.cookServings),
      });
    },
    [navigation]
  );

  // The "technical level": walk this task's prep-day steps in PrepMode, which
  // marks the task done itself on Batch done. Focus is cleared first so the
  // return (via the focus reload above) lands on the next undone task.
  const openPrepMode = useCallback(
    (item: WorkItem) => {
      if (!currentPlan) return;
      setFocusKey(null);
      navigation.navigate('PrepMode', {
        mealSlug: item.group.slug,
        plateId: item.group.plateId,
        servings: clampCookPortions(item.cookServings),
        planId: currentPlan.id,
        doneKey: item.doneKey,
        title: item.title,
      });
    },
    [navigation, currentPlan]
  );

  const openGroceryList = useCallback(() => {
    // Mirror MealPlanDaysScreen's working "Shopping list" link. The real source
    // is the simplified plan's own grocery_list (priced + already categorised);
    // fall back to the legacy context, then to no param.
    const groceryList =
      (currentPlan as any)?.grocery_list ||
      (currentMealPlan as any)?.data?.grocery_list ||
      null;
    navigation.navigate('GroceryList', groceryList ? { groceryList } : {});
  }, [navigation, currentPlan, currentMealPlan]);

  // ----- Derived session state ---------------------------------------------
  const remaining = useMemo(
    () => queue.filter((i) => !doneKeys[i.doneKey]),
    [queue, doneKeys]
  );

  const doneCount = queue.length - remaining.length;
  const totalCount = queue.length;

  // The one task on screen: an explicit focus if set (and still in the plan),
  // otherwise the front of the remaining queue. A focused DONE task renders
  // as the banked poster with Undo — that's how un-completing works.
  const focused = useMemo(
    () => (focusKey ? queue.find((i) => i.doneKey === focusKey) ?? null : null),
    [focusKey, queue]
  );
  const current: WorkItem | null = focused ?? remaining[0] ?? null;
  const currentIsDone = !!(current && doneKeys[current.doneKey]);

  // Position = which task the screen is showing, by queue order, so it always
  // matches the outlined/selected segment.
  const currentIdx = current ? queue.findIndex((i) => i.doneKey === current.doneKey) : -1;
  const position = currentIdx >= 0 ? currentIdx + 1 : totalCount;

  // Bottom-bar arrows walk strict queue order, whatever each dish's done-state
  // (a done neighbour shows its banked poster).
  const prevTask = currentIdx > 0 ? queue[currentIdx - 1] : null;
  const nextTask =
    currentIdx >= 0 && currentIdx < queue.length - 1 ? queue[currentIdx + 1] : null;

  // Ingredients view data: prep = what's still to cook today; fresh = what the
  // week's make-fresh meals will need (one serving per plan occurrence —
  // plan scaling is ignored here, this is a gather list not a macro panel).
  const needList = useMemo(
    () =>
      buildNeedList(
        remaining.map((i) => ({ slug: i.group.slug, servings: i.cookServings }))
      ),
    [remaining]
  );
  const freshNeed = useMemo(() => {
    const fresh = session?.makeFresh ?? [];
    const linked = fresh.filter((f) => f.linked && f.slug);
    const unlinked = fresh.filter((f) => !f.linked || !f.slug);
    return {
      ...buildNeedList(
        linked.map((f) => ({
          slug: f.slug as string,
          servings: Math.max(1, f.occurrences ?? 1),
        }))
      ),
      unlinked: unlinked.map(
        (f) => `${f.displayName}${f.occurrences > 1 ? ` ×${f.occurrences}` : ''}`
      ),
    };
  }, [session]);
  const freshMealCount = useMemo(
    () => (session?.makeFresh ?? []).reduce((s, i) => s + (i.occurrences ?? 1), 0),
    [session]
  );

  // A three-name taste of the make-fresh list for the lobby's single fresh row.
  // The full list lives one tap away in the Ingredients view.
  const freshPreview = useMemo(() => {
    const items = session?.makeFresh ?? [];
    const shown = items
      .slice(0, 3)
      .map((f) => `${f.displayName}${f.occurrences > 1 ? ` ×${f.occurrences}` : ''}`);
    const rest = items.length - shown.length;
    return rest > 0 ? `${shown.join(' · ')} · ${rest} more` : shown.join(' · ');
  }, [session]);

  // The payoff metric: meals ready to eat, not tasks ticked.
  const bankedTotal = useMemo(() => queue.reduce((s, i) => s + i.coverage, 0), [queue]);
  const bankedDone = useMemo(
    () => queue.reduce((s, i) => s + (doneKeys[i.doneKey] ? i.coverage : 0), 0),
    [queue, doneKeys]
  );

  // Finish estimate over what's LEFT, so it counts down as tasks complete.
  const remainingMakespan = useMemo(() => {
    if (remaining.length === 0) return null;
    if (!remaining.every((i) => i.handsOnKnown)) return null;
    const sumHandsOn = remaining.reduce((s, i) => s + i.handsOn, 0);
    const maxTotal = remaining.reduce((m, i) => Math.max(m, i.total), 0);
    return Math.max(maxTotal, sumHandsOn);
  }, [remaining]);

  const timeLeftLine =
    remaining.length === 0
      ? null
      : remainingMakespan != null
      ? `~${formatTime(remainingMakespan)} left`
      : `longest cook ~${formatTime(remaining.reduce((m, i) => Math.max(m, i.total), 0))}`;

  // Whole-session work estimate, for the finale's stats line.
  const fullMakespan = useMemo(() => {
    if (queue.length === 0) return null;
    if (!queue.every((i) => i.handsOnKnown)) return null;
    const sumHandsOn = queue.reduce((s, i) => s + i.handsOn, 0);
    const maxTotal = queue.reduce((m, i) => Math.max(m, i.total), 0);
    return Math.max(maxTotal, sumHandsOn);
  }, [queue]);

  const markCurrentDone = useCallback(() => {
    if (!current) return;
    toggleDone(current.doneKey);
    setFocusKey(null);
    // Nothing to reveal if this was the last one: straight to the summary.
    if (remaining.length > 1) startCelebration(current);
  }, [current, remaining.length, toggleDone, startCelebration]);

  const undoCurrent = useCallback(() => {
    if (!current) return;
    toggleDone(current.doneKey);
    // Keep focus so the user stays on the task they just restored.
    setFocusKey(current.doneKey);
  }, [current, toggleDone]);

  // Restart the whole session from the all-done summary: confirm, then clear
  // every done key so the lobby flips back to "Start prepping".
  const restartSession = useCallback(() => {
    Alert.alert(
      'Restart this prep?',
      'All dishes will be set back to not done.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart',
          style: 'destructive',
          onPress: () => {
            setDoneKeys({});
            doneKeysRef.current = {};
            setFocusKey(null);
            if (storageKey) {
              AsyncStorage.setItem(storageKey, JSON.stringify([])).catch(() => {});
            }
          },
        },
      ]
    );
  }, [storageKey]);

  // With the standalone finale gone, focus mode has nothing to show once the
  // queue is finished: after the last celebration (or when entering with
  // everything done and nothing focused), land on the lobby — now the merged
  // summary screen.
  useEffect(() => {
    if (inFocus && remaining.length === 0 && !focused && !celebration) {
      setInFocus(false);
    }
  }, [inFocus, remaining.length, focused, celebration]);

  // ----- Headers -------------------------------------------------------------
  const plainHeader = (
    <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity style={styles.backBtn} hitSlop={10} onPress={() => navigation.goBack()}>
        <Ionicons name="close" size={20} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.topBarTitle}>Meal Prep</Text>
      <View style={styles.backBtn} />
    </View>
  );

  // The X in focus mode returns to the LOBBY (the lobby's own X exits). Task
  // movement lives in the bottom bar and the strip segments, so nothing up
  // here can be misread as "back one meal".
  const stripHeader = (
    <View style={{ paddingTop: insets.top + 8 }}>
      <View style={styles.stripBar}>
        <TouchableOpacity
          style={styles.backBtn}
          hitSlop={10}
          onPress={() => {
            setInFocus(false);
            setFocusKey(null);
          }}
        >
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
        <SegmentStrip
          queue={queue}
          doneKeys={doneKeys}
          currentKey={current ? current.doneKey : null}
          themeColor={themeColor}
          onSelect={(key) => setFocusKey(key)}
        />
        <Text style={styles.stripCount}>
          {position}/{totalCount}
        </Text>
      </View>
      <Text style={styles.headerMetric}>
        {bankedDone} of {bankedTotal} meals banked
        {timeLeftLine ? ` · ${timeLeftLine}` : ''}
      </Text>
    </View>
  );

  // ----- Empty / legacy guards ----------------------------------------------
  if (!session) {
    return (
      <View style={styles.container}>
        {plainHeader}
        <View style={styles.emptyWrap}>
          <Ionicons name="restaurant-outline" size={28} color="#3f3f46" />
          <Text style={styles.emptyText}>No active meal plan yet.</Text>
          <Text style={styles.emptySub}>
            Generate a plan and your prep session will appear here.
          </Text>
        </View>
      </View>
    );
  }

  if (session.totals.isLegacyPlan) {
    return (
      <View style={styles.container}>
        {plainHeader}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          <View style={styles.titleBlock}>
            <Text style={[styles.eyebrow, { color: themeColor }]}>MEAL PREP</Text>
            <Text style={styles.payoffSub}>Prep guidance isn't available for this plan.</Text>
          </View>
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={18} color="#71717a" />
            <Text style={styles.noticeText}>
              This plan predates prep support. Regenerate it to get a guided prep session.
            </Text>
          </View>
          <TouchableOpacity style={styles.groceryLink} activeOpacity={0.7} onPress={openGroceryList}>
            <Ionicons name="cart-outline" size={16} color={themeColor} />
            <Text style={[styles.groceryLinkText, { color: themeColor }]}>View grocery list</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const { totals, makeFresh } = session;

  // ----- Everything-is-fresh plan: no queue at all --------------------------
  if (totalCount === 0) {
    return (
      <View style={styles.container}>
        {plainHeader}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          <View style={styles.titleBlock}>
            <Text style={[styles.eyebrow, { color: themeColor }]}>MEAL PREP</Text>
            <Text style={styles.payoffSub}>
              Nothing to batch ahead — everything on this plan is made fresh.
            </Text>
          </View>
          {makeFresh.length > 0 ? (
            <MakeFreshCard
              makeFresh={makeFresh}
              blurb="Cook these on the day — no prep session needed."
            />
          ) : null}
          <TouchableOpacity style={styles.groceryLink} activeOpacity={0.7} onPress={openGroceryList}>
            <Ionicons name="cart-outline" size={16} color={themeColor} />
            <Text style={[styles.groceryLinkText, { color: themeColor }]}>View grocery list</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ----- Lobby: the session overview, always the first face of the screen ---
  if (!inFocus) {
    // Basket tap: the ingredients view — meal prep vs make fresh, with the
    // shopping list still reachable at the bottom.
    if (showNeed) {
      return (
        <View style={styles.container}>
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              style={styles.backBtn}
              hitSlop={10}
              onPress={() => setShowNeed(false)}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>Ingredients</Text>
            <View style={styles.backBtn} />
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
          >
            {needList.rows.length > 0 || needList.seasonings.length > 0 ? (
              <View style={styles.needBlock}>
                <Text style={[styles.needSectionEyebrow, { color: themeColor }]}>
                  FOR MEAL PREP · TODAY
                </Text>
                <View style={styles.needList}>
                  {needList.rows.map((row, i) => (
                    <View key={row.name}>
                      {i > 0 ? <View style={styles.freshDivider} /> : null}
                      <View style={styles.needRow}>
                        <Text style={styles.needName} numberOfLines={1}>
                          {row.name}
                        </Text>
                        <Text style={styles.needQty}>{row.qty}</Text>
                      </View>
                    </View>
                  ))}
                  {needList.seasonings.length > 0 ? (
                    <Text style={styles.needSeasonings}>
                      Plus pantry: {needList.seasonings.join(', ')}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {freshNeed.rows.length > 0 ||
            freshNeed.seasonings.length > 0 ||
            freshNeed.unlinked.length > 0 ? (
              <View style={styles.needBlock}>
                <Text style={styles.needSectionEyebrowMuted}>
                  FOR MAKE FRESH · DURING THE WEEK
                </Text>
                <View style={styles.needList}>
                  {freshNeed.rows.map((row, i) => (
                    <View key={row.name}>
                      {i > 0 ? <View style={styles.freshDivider} /> : null}
                      <View style={styles.needRow}>
                        <Text style={styles.needName} numberOfLines={1}>
                          {row.name}
                        </Text>
                        <Text style={styles.needQty}>{row.qty}</Text>
                      </View>
                    </View>
                  ))}
                  {freshNeed.seasonings.length > 0 ? (
                    <Text style={styles.needSeasonings}>
                      Plus pantry: {freshNeed.seasonings.join(', ')}
                    </Text>
                  ) : null}
                  {freshNeed.unlinked.length > 0 ? (
                    <Text style={styles.needSeasonings}>
                      Also: {freshNeed.unlinked.join(' · ')}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.groceryLink}
              activeOpacity={0.7}
              onPress={openGroceryList}
            >
              <Ionicons name="cart-outline" size={16} color={themeColor} />
              <Text style={[styles.groceryLinkText, { color: themeColor }]}>
                Open shopping list
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    const allDone = remaining.length === 0;
    const startedAlready = doneCount > 0;
    const longestRemaining = remaining.reduce((m, i) => Math.max(m, i.total), 0);
    const startToFinish = remainingMakespan != null ? remainingMakespan : longestRemaining;
    const anyPassive = remaining.some((i) => i.setAndForget);
    const workLine =
      allDone
        ? null
        : remainingMakespan != null
        ? `~${formatTime(remainingMakespan)} ${startedAlready ? 'to finish' : 'of work'}`
        : `longest cook ~${formatTime(longestRemaining)}`;
    const dayLabel = todayLabel();

    return (
      <View style={styles.container}>
        <View style={[styles.lobbyBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.backBtn} hitSlop={10} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} hitSlop={10} onPress={() => setShowNeed(true)}>
            <Ionicons name="basket-outline" size={20} color="#a1a1aa" />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
        >
          <View style={styles.lobbyHead}>
            <Text style={[styles.eyebrow, { color: themeColor }]}>
              {allDone
                ? 'MEAL PREP · DONE ✓'
                : dayLabel
                ? `MEAL PREP · ${dayLabel}`
                : 'MEAL PREP'}
            </Text>
            {allDone ? (
              <Text style={styles.lobbyTitle}>Your fridge is stocked</Text>
            ) : startedAlready ? (
              <>
                <Text style={styles.lobbyTitle}>
                  {bankedDone} of {bankedTotal}
                  {'\n'}meals banked
                </Text>
                <Text style={styles.lobbySub}>
                  {doneCount} of {totalCount} dishes done{workLine ? ` · ${workLine}` : ''}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.lobbyTitle}>
                  {totalCount} {totalCount === 1 ? 'dish' : 'dishes'},
                  {'\n'}
                  {bankedTotal} meals banked
                </Text>
                <Text style={styles.lobbySub}>
                  One cook, about {formatTime(startToFinish)} start to finish.
                  {anyPassive ? ' Most of that time it cooks on its own.' : ''}
                </Text>
              </>
            )}
          </View>

          {/* All done: the celebration lives here — carousel + stat chips */}
          {allDone ? (
            <>
              <DishCarousel items={queue} themeColor={themeColor} />
              <View style={styles.statRow}>
                <View style={styles.statChip}>
                  <Text style={styles.statValue}>{bankedTotal}</Text>
                  <Text style={styles.statLabel}>MEALS BANKED</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={styles.statValue}>{totalCount}</Text>
                  <Text style={styles.statLabel}>{totalCount === 1 ? 'DISH' : 'DISHES'}</Text>
                </View>
                {fullMakespan != null ? (
                  <View style={styles.statChip}>
                    <Text style={styles.statValue}>{formatTime(fullMakespan)}</Text>
                    <Text style={styles.statLabel}>OF COOKING</Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}

          {/* The dishes. Mid-session they're posters; on the summary the
              compact rows sit under the carousel so the photos aren't shown
              twice at full size. Tap either to jump straight to that dish. */}
          {allDone ? (
            <View style={styles.lobbyList}>
              {queue.map((item, idx) => (
                <View key={item.doneKey}>
                  {idx > 0 ? <View style={styles.freshDivider} /> : null}
                  <TouchableOpacity
                    style={styles.lobbyRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      setFocusKey(item.doneKey);
                      setInFocus(true);
                    }}
                  >
                    <View style={styles.lobbyThumbWrap}>
                      {item.image ? (
                        <Image source={item.image} style={styles.lobbyThumb} contentFit="cover" />
                      ) : (
                        <View style={[styles.lobbyThumb, styles.thumbPlaceholder]}>
                          <Ionicons name="image-outline" size={14} color="#52525b" />
                        </View>
                      )}
                      <View style={[styles.lobbyBadge, { backgroundColor: themeColor }]}>
                        <Ionicons name="checkmark" size={9} color="#000" />
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lobbyRowName} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>
                    <Text style={styles.lobbyRowTime}>
                      {item.coverage} {item.coverage === 1 ? 'meal' : 'meals'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.dishStack}>
              {queue.map((item) => (
                <DishPoster
                  key={item.doneKey}
                  item={item}
                  done={!!doneKeys[item.doneKey]}
                  themeColor={themeColor}
                  onPress={() => {
                    setFocusKey(item.doneKey);
                    setInFocus(true);
                  }}
                />
              ))}
            </View>
          )}

          {/* Pushes the fresh row to the bottom on short queues, collapses to
              nothing once the dishes fill the screen. */}
          {allDone ? null : <View style={styles.flexSpacer} />}

          {/* Made fresh — pills once the session's done, one tappable row
              before. The row opens the same Ingredients view as the basket. */}
          {makeFresh.length > 0 ? (
            allDone ? (
              <View style={styles.finaleFreshBlock}>
                <Text style={styles.needSectionEyebrowMuted}>
                  FRESH THIS WEEK · NO PREP NEEDED
                </Text>
                <View style={styles.pillWrap}>
                  {makeFresh.map((item) => (
                    <View key={item.key} style={styles.pill}>
                      <Text style={styles.pillText} numberOfLines={1}>
                        {item.displayName}
                      </Text>
                      {item.occurrences > 1 ? (
                        <Text style={styles.pillCount}>×{item.occurrences}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.freshStrip}
                activeOpacity={0.75}
                onPress={() => setShowNeed(true)}
              >
                <View style={styles.freshStripIcon}>
                  <Ionicons name="leaf-outline" size={16} color="#a1a1aa" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.freshStripTitle}>
                    {freshMealCount} more {freshMealCount === 1 ? 'meal needs' : 'meals need'} no
                    prep
                  </Text>
                  <Text style={styles.freshStripSub} numberOfLines={1}>
                    {freshPreview}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color="#3f3f46" />
              </TouchableOpacity>
            )
          ) : null}

          {/* All done: the way back to the start of the session */}
          {allDone ? (
            <TouchableOpacity
              style={styles.restartBtn}
              activeOpacity={0.7}
              onPress={restartSession}
            >
              <Ionicons name="refresh-outline" size={15} color="#a1a1aa" />
              <Text style={styles.restartBtnText}>Restart this prep</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
        {allDone ? null : (
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 14 }]}>
            <TouchableOpacity
              style={[styles.ctaBtn, { backgroundColor: themeColor }]}
              activeOpacity={0.85}
              onPress={() => {
                setFocusKey(null);
                setInFocus(true);
              }}
            >
              <Text style={styles.ctaBtnText} numberOfLines={1}>
                {startedAlready ? 'Continue' : 'Start prepping'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#000" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // Focus mode has two faces now: the active poster and, over the top of it
  // for ~1.2s, the poster of the dish you just banked with a stamp on it. The
  // bottom bar stays live underneath the whole time.
  const showBottomBar = !!current;

  return (
    <View style={styles.container}>
      {stripHeader}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingBottom: showBottomBar ? 16 : insets.bottom + 40,
        }}
      >
        {current ? (
          // ---- The poster. Banked dishes get the SAME poster, with a badge
          //      and swapped copy — a finished dish should look just as good.
          <>
            <View style={styles.posterCard}>
              {current.image ? (
                <Image
                  source={current.image}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={200}
                  priority="high"
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.thumbPlaceholder]}>
                  <Ionicons name="image-outline" size={32} color="#52525b" />
                </View>
              )}
              {currentIsDone ? (
                <View style={[styles.bankedBadge, { backgroundColor: themeColor }]}>
                  <Ionicons name="checkmark" size={18} color="#000" />
                </View>
              ) : null}
              <LinearGradient
                colors={['transparent', 'rgba(11,11,13,0.55)', 'rgba(11,11,13,0.94)']}
                locations={[0, 0.55, 1]}
                style={styles.posterOverlay}
              >
                <Text style={[styles.posterEyebrow, { color: themeColor }]}>
                  {currentIsDone ? 'BANKED' : 'PREP NOW'}
                </Text>
                <Text style={styles.posterTitle} numberOfLines={2}>
                  {current.title}
                </Text>
                <Text style={styles.posterMeta}>
                  {currentIsDone
                    ? `${current.coverage} ${
                        current.coverage === 1 ? 'meal' : 'meals'
                      } ready to eat · nice work`
                    : `${current.cookServings} ${
                        current.cookServings === 1 ? 'serving' : 'servings'
                      } · feeds ${current.coverage} ${
                        current.coverage === 1 ? 'meal' : 'meals'
                      }${
                        current.handsOnKnown
                          ? ` · ${formatTime(current.handsOn)} of work`
                          : ` · ${formatTime(current.total)}`
                      }`}
                </Text>
                {!currentIsDone && current.setAndForget ? (
                  <View style={[styles.posterChip, { backgroundColor: `${themeColor}1f` }]}>
                    <Ionicons name="flame" size={12} color={themeColor} />
                    <Text style={[styles.posterChipText, { color: themeColor }]}>
                      set &amp; forget — {formatTime(current.passive)} on its own
                    </Text>
                  </View>
                ) : !currentIsDone && current.strategy === 'prep' ? (
                  <View style={styles.posterChipMuted}>
                    <Ionicons name="leaf-outline" size={12} color="#a1a1aa" />
                    <Text style={styles.posterChipMutedText}>finish fresh on the day</Text>
                  </View>
                ) : null}
              </LinearGradient>

              {/* ---- The dish you just finished, sitting over the next one.
                   Fades out to reveal it. pointerEvents none so the poster and
                   the bar underneath stay tappable the whole way through. ---- */}
              {celebration ? (
                <Animated.View
                  style={[StyleSheet.absoluteFill, { opacity: celebFade }]}
                  pointerEvents="none"
                >
                  {celebration.image ? (
                    <Image
                      source={celebration.image}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[StyleSheet.absoluteFill, styles.thumbPlaceholder]} />
                  )}
                  <View style={styles.stampVeil}>
                    <Animated.View
                      style={[
                        styles.stampCircle,
                        { backgroundColor: themeColor, transform: [{ scale: celebScale }] },
                      ]}
                    >
                      <Ionicons name="checkmark" size={42} color="#000" />
                    </Animated.View>
                    <Text style={styles.stampTitle} numberOfLines={2}>
                      {celebration.title} banked
                    </Text>
                    <Text style={[styles.stampGain, { color: themeColor }]}>
                      +{celebration.coverage}{' '}
                      {celebration.coverage === 1 ? 'meal' : 'meals'} ready to eat
                    </Text>
                  </View>
                </Animated.View>
              ) : null}
            </View>

            {currentIsDone ? (
              <TouchableOpacity
                hitSlop={8}
                onPress={() => openRecipe(current.group, current.cookServings)}
              >
                <Text style={styles.underCardLink}>View recipe</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity hitSlop={8} onPress={markCurrentDone}>
                <Text style={styles.underCardLink}>Already made it? Mark done</Text>
              </TouchableOpacity>
            )}
            {!currentIsDone && !nextTask && makeFresh.length > 0 ? (
              <Text style={styles.lastOneNote}>
                Last one · then {makeFresh.length} made fresh
              </Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {/* ---- Pinned bottom bar: [‹ prev] [Let's go / Undo] [next ›].
           Arrows move through the queue in order; the middle button is the
           action for THIS dish. All of it in thumb reach. ---- */}
      {showBottomBar && current ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 14 }]}>
          <TouchableOpacity
            style={[styles.navBtn, !prevTask && styles.navBtnDisabled]}
            activeOpacity={0.7}
            disabled={!prevTask}
            onPress={() => prevTask && setFocusKey(prevTask.doneKey)}
          >
            <Ionicons name="chevron-back" size={18} color={prevTask ? '#fff' : '#3f3f46'} />
          </TouchableOpacity>

          {currentIsDone ? (
            <TouchableOpacity
              style={styles.undoBtn}
              activeOpacity={0.8}
              onPress={undoCurrent}
            >
              <Ionicons name="arrow-undo-outline" size={15} color="#fff" />
              <Text style={styles.undoBtnText}>Undo</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.ctaBtn, { backgroundColor: themeColor }]}
              activeOpacity={0.85}
              onPress={() => openPrepMode(current)}
            >
              <Text style={styles.ctaBtnText}>Let's go</Text>
              <Ionicons name="arrow-forward" size={16} color="#000" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.navBtn, !nextTask && styles.navBtnDisabled]}
            activeOpacity={0.7}
            disabled={!nextTask}
            onPress={() => nextTask && setFocusKey(nextTask.doneKey)}
          >
            <Ionicons name="chevron-forward" size={18} color={nextTask ? '#fff' : '#3f3f46'} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f1f23',
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },

  // Strip header
  stripBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 2,
    gap: 6,
  },
  strip: { flex: 1, flexDirection: 'row', gap: 4, alignItems: 'center' },
  stripTouch: { flex: 1, paddingVertical: 10 },
  stripSeg: { height: 4, borderRadius: 2 },
  stripCount: { color: '#71717a', fontSize: 11, width: 34, textAlign: 'right' },
  headerMetric: {
    color: '#52525b',
    fontSize: 11,
    textAlign: 'right',
    paddingHorizontal: 18,
    paddingBottom: 6,
  },

  titleBlock: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 6 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  eyebrowMuted: { color: '#71717a', fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  sectionBlurb: { color: '#52525b', fontSize: 11, lineHeight: 15, marginTop: 4, marginBottom: 10 },
  payoffSub: { color: '#a1a1aa', fontSize: 13, lineHeight: 18, marginTop: 6 },

  // Poster card (shared by PREP NOW and BANKED states)
  posterCard: {
    marginHorizontal: 14,
    marginTop: 10,
    height: 340,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#18181b',
    justifyContent: 'flex-end',
  },
  posterOverlay: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 48,
  },
  posterEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  posterTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.5,
    marginTop: 6,
  },
  posterMeta: { color: '#a1a1aa', fontSize: 12, marginTop: 7 },
  posterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 10,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  posterChipText: { fontSize: 11, fontWeight: '500' },
  posterChipMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 10,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  posterChipMutedText: { color: '#a1a1aa', fontSize: 11 },
  bankedBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#202023' },

  underCardLink: {
    color: '#52525b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 13,
    textDecorationLine: 'underline',
  },
  lastOneNote: { color: '#3f3f46', fontSize: 11, textAlign: 'center', marginTop: 10 },

  // Lobby
  lobbyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 2,
  },
  lobbyHead: { paddingHorizontal: 18, paddingTop: 10 },
  lobbyTitle: {
    color: '#fff',
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '640' as any,
    letterSpacing: -0.8,
    marginTop: 9,
  },
  lobbySub: { color: '#9a9aa3', fontSize: 12.5, lineHeight: 18, marginTop: 9 },

  // Lobby dish posters
  dishStack: { marginHorizontal: 16, marginTop: 18, gap: 9 },
  dishPoster: {
    height: 86,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#18181b',
    justifyContent: 'center',
  },
  dishPosterDone: { opacity: 0.5 },
  dishPosterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 118,
    paddingRight: 15,
  },
  dishPosterName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  dishMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 },
  dishMeals: { fontSize: 11.5, fontWeight: '600' },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#4a4a52' },
  dishChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(224,201,138,0.14)',
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  dishChipText: { color: '#e0c98a', fontSize: 10, fontWeight: '600' },
  dishNote: { color: '#9a9aa3', fontSize: 11.5, flexShrink: 1 },
  dishTime: {
    color: '#c9c9d0',
    fontSize: 11.5,
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  dishDoneBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexSpacer: { flex: 1, minHeight: 16 },

  // Made-fresh strip (active lobby)
  freshStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#0f0f12',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  freshStripIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freshStripTitle: { color: '#e7e7ea', fontSize: 13, fontWeight: '600' },
  freshStripSub: { color: '#5f5f68', fontSize: 11, marginTop: 3 },

  // Lobby list (all-done summary)
  lobbyList: {
    marginHorizontal: 14,
    marginTop: 16,
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 15,
    paddingHorizontal: 12,
  },
  lobbyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 10,
  },
  lobbyThumbWrap: { width: 36, height: 36 },
  lobbyThumb: { width: 36, height: 36, borderRadius: 9 },
  lobbyBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#18181b',
  },
  lobbyRowName: { color: '#fff', fontSize: 13, fontWeight: '500' },
  lobbyRowTime: { color: '#3f3f46', fontSize: 11 },

  needBlock: { marginHorizontal: 14, marginTop: 16 },
  needSectionEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  needSectionEyebrowMuted: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  needList: {
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingBottom: 6,
    marginTop: 4,
  },
  needRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 9,
  },
  needName: { flex: 1, color: '#d1d5db', fontSize: 13 },
  needQty: { color: '#a1a1aa', fontSize: 13 },
  needSeasonings: { color: '#52525b', fontSize: 11, lineHeight: 16, paddingVertical: 8 },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1f1f23',
    backgroundColor: '#000',
  },
  navBtn: {
    width: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3f3f46',
    paddingVertical: 15,
  },
  navBtnDisabled: { borderColor: '#1f1f23' },
  ctaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 13,
    paddingVertical: 15,
  },
  ctaBtnText: { color: '#000', fontSize: 15, fontWeight: '600', flexShrink: 1 },
  undoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 13,
    paddingVertical: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3f3f46',
  },
  undoBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },

  // Banked stamp (overlays the poster of the dish just finished)
  stampVeil: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    backgroundColor: 'rgba(6,7,6,0.55)',
  },
  stampCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginTop: 16,
  },
  stampGain: { fontSize: 13, fontWeight: '600', marginTop: 6 },

  // Summary carousel
  carouselWrap: {
    height: 120,
    marginTop: 16,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  carouselGlow: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 12,
    bottom: 8,
    borderRadius: 120,
  },
  carouselTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 7,
  },
  carouselCard: {
    width: CAROUSEL_CARD,
    height: CAROUSEL_CARD,
    borderRadius: 16,
    backgroundColor: '#18181b',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  carouselBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  carouselFade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 34,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 14,
    marginTop: 16,
  },
  statChip: {
    flex: 1,
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 13,
    alignItems: 'center',
    paddingVertical: 11,
  },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '600' },
  statLabel: { color: '#71717a', fontSize: 8, fontWeight: '600', letterSpacing: 0.8, marginTop: 3 },
  finaleFreshBlock: { marginHorizontal: 14, marginTop: 18 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: { color: '#d1d5db', fontSize: 11 },
  pillCount: { color: '#52525b', fontSize: 10 },
  restartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginHorizontal: 14,
    marginTop: 20,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    paddingVertical: 13,
  },
  restartBtnText: { color: '#a1a1aa', fontSize: 13, fontWeight: '500' },

  // Make fresh (finale + fresh-only plan)
  freshCardBlock: { paddingHorizontal: 18, marginTop: 18 },
  freshCard: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  freshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  freshTextCol: { flex: 1, paddingRight: 10 },
  freshName: { color: '#d1d5db', fontSize: 13 },
  freshReason: { color: '#52525b', fontSize: 10, marginTop: 2 },
  freshMeta: { color: '#71717a', fontSize: 12 },
  freshDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#1f1f23' },

  // Notice (legacy)
  noticeCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginHorizontal: 18,
    backgroundColor: '#18181b',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    padding: 14,
    marginBottom: 18,
  },
  noticeText: { flex: 1, color: '#a1a1aa', fontSize: 13, lineHeight: 18 },

  // Grocery link
  groceryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
  },
  groceryLinkText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },

  // Empty
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyText: { color: '#d1d5db', fontSize: 15, fontWeight: '600' },
  emptySub: { color: '#52525b', fontSize: 12, textAlign: 'center', lineHeight: 17 },
});