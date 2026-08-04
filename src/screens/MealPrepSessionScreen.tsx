import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageSourcePropType,
  Animated,
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

  // Celebration beat shown after a batch completes, before the next dish.
  const [celebration, setCelebration] = useState<WorkItem | null>(null);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebScale = useRef(new Animated.Value(0.4)).current;

  // Refs for detecting EXTERNAL completions (PrepMode's Batch done) on focus:
  // compare the freshly-read done set with the last one we knew about.
  const doneKeysRef = useRef<Record<string, boolean>>({});
  const doneLoadedRef = useRef(false);

  useEffect(() => {
    doneKeysRef.current = doneKeys;
  }, [doneKeys]);

  const dismissCelebration = useCallback(() => {
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    celebrationTimer.current = null;
    setCelebration(null);
  }, []);

  const startCelebration = useCallback(
    (item: WorkItem) => {
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
      setCelebration(item);
      celebScale.setValue(0.4);
      Animated.spring(celebScale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }).start();
      // The beat holds ~2.5s, then the next dish takes over. Tapping skips it.
      celebrationTimer.current = setTimeout(() => setCelebration(null), 2500);
    },
    [celebScale]
  );

  useEffect(
    () => () => {
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
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
              if (item) startCelebration(item);
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

  const markCurrentDone = useCallback(() => {
    if (!current) return;
    toggleDone(current.doneKey);
    setFocusKey(null);
    startCelebration(current);
  }, [current, toggleDone, startCelebration]);

  const undoCurrent = useCallback(() => {
    if (!current) return;
    toggleDone(current.doneKey);
    // Keep focus so the user stays on the task they just restored.
    setFocusKey(current.doneKey);
  }, [current, toggleDone]);

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
    const workLine =
      allDone
        ? null
        : remainingMakespan != null
        ? `~${formatTime(remainingMakespan)} ${startedAlready ? 'to finish' : 'of work'}`
        : `longest cook ~${formatTime(
            remaining.reduce((m, i) => Math.max(m, i.total), 0)
          )}`;
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
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          <View style={styles.lobbyHead}>
            <Text style={[styles.eyebrow, { color: themeColor }]}>MEAL PREP</Text>
            <Text style={styles.lobbyTitle}>
              {allDone
                ? `All ${bankedTotal} meals banked`
                : startedAlready
                ? `${bankedDone} of ${bankedTotal} meals banked`
                : `${totalCount} ${totalCount === 1 ? 'dish' : 'dishes'} → ${bankedTotal} meals`}
            </Text>
            <Text style={styles.lobbySub}>
              {startedAlready
                ? `${doneCount} of ${totalCount} dishes done${workLine ? ` · ${workLine}` : ''}`
                : `${workLine ?? ''}${
                    freshMealCount > 0
                      ? `${workLine ? ' · ' : ''}${freshMealCount} more made fresh in the week`
                      : ''
                  }`}
            </Text>
          </View>

          {/* Dish list — tap any row to jump straight to that dish */}
          <View style={styles.lobbyList}>
            {queue.map((item, idx) => {
              const done = !!doneKeys[item.doneKey];
              return (
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
                    {done ? (
                      <View style={styles.lobbyCheckWrap}>
                        <Ionicons name="checkmark-circle" size={20} color={themeColor} />
                      </View>
                    ) : item.image ? (
                      <Image source={item.image} style={styles.lobbyThumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.lobbyThumb, styles.thumbPlaceholder]}>
                        <Ionicons name="image-outline" size={14} color="#52525b" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.lobbyRowName, done && styles.lobbyRowNameDone]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {!done ? (
                        <Text style={styles.lobbyRowSub} numberOfLines={1}>
                          {item.coverage} {item.coverage === 1 ? 'meal' : 'meals'}
                          {item.setAndForget ? ' · set & forget' : ''}
                        </Text>
                      ) : null}
                    </View>
                    {!done ? (
                      <Text style={styles.lobbyRowTime}>{formatTime(item.total)}</Text>
                    ) : null}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Made fresh — context only, cooked on the day */}
          {makeFresh.length > 0 ? (
            <View style={styles.lobbyFreshBlock}>
              <Text style={styles.lobbyFreshEyebrow}>MADE FRESH · NOT TODAY</Text>
              <Text style={styles.lobbyFreshText}>
                {makeFresh
                  .map(
                    (f) => `${f.displayName}${f.occurrences > 1 ? ` ×${f.occurrences}` : ''}`
                  )
                  .join(' · ')}
              </Text>
            </View>
          ) : null}
        </ScrollView>
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
              {allDone
                ? 'View summary'
                : startedAlready
                ? `Continue — ${remaining[0].title} is next`
                : 'Start prepping'}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ----- Finale: everything batched is done ---------------------------------
  const showFinale = remaining.length === 0 && !focused && !celebration;
  const showBottomBar = !showFinale && !celebration && !!current;

  return (
    <View style={styles.container}>
      {stripHeader}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingBottom: showBottomBar ? 16 : insets.bottom + 40,
        }}
      >
        {showFinale ? (
          <>
            <View style={styles.completeBlock}>
              <Ionicons name="checkmark-done-circle-outline" size={30} color={themeColor} />
              <Text style={styles.completeTitle}>All prepped.</Text>
              <Text style={styles.completeSub}>
                {bankedTotal} {bankedTotal === 1 ? 'meal' : 'meals'} banked for the week.
              </Text>
            </View>
            {makeFresh.length > 0 ? (
              <MakeFreshCard
                makeFresh={makeFresh}
                blurb="Nothing else to prep — cook these on the day."
              />
            ) : null}
            <TouchableOpacity
              style={styles.groceryLink}
              activeOpacity={0.7}
              onPress={openGroceryList}
            >
              <Ionicons name="cart-outline" size={16} color={themeColor} />
              <Text style={[styles.groceryLinkText, { color: themeColor }]}>View grocery list</Text>
            </TouchableOpacity>
          </>
        ) : celebration ? (
          // ---- The win. Holds ~2.5s, or tap anything to move on. ----
          <TouchableOpacity activeOpacity={1} onPress={dismissCelebration}>
            <View style={styles.celebrateBlock}>
              <Animated.View
                style={[
                  styles.celebrateCheck,
                  {
                    backgroundColor: `${themeColor}24`,
                    transform: [{ scale: celebScale }],
                  },
                ]}
              >
                <Ionicons name="checkmark" size={32} color={themeColor} />
              </Animated.View>
              <Text style={styles.celebrateTitle}>{celebration.title} banked</Text>
              <Text style={[styles.celebrateGain, { color: themeColor }]}>
                +{celebration.coverage} {celebration.coverage === 1 ? 'meal' : 'meals'} ready to eat
              </Text>
              <Text style={styles.celebrateSub}>
                {doneCount} down · {remaining.length} to go
                {timeLeftLine ? ` · ${timeLeftLine}` : ''}
              </Text>
            </View>
            {remaining[0] ? (
              <TouchableOpacity
                style={styles.nextUpCard}
                activeOpacity={0.75}
                onPress={dismissCelebration}
              >
                {remaining[0].image ? (
                  <Image source={remaining[0].image} style={styles.nextUpThumb} contentFit="cover" />
                ) : (
                  <View style={[styles.nextUpThumb, styles.thumbPlaceholder]}>
                    <Ionicons name="image-outline" size={16} color="#52525b" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.nextUpEyebrow}>UP NEXT</Text>
                  <Text style={styles.nextUpTitle} numberOfLines={1}>
                    {remaining[0].title} ·{' '}
                    {remaining[0].handsOnKnown
                      ? formatTime(remaining[0].handsOn)
                      : formatTime(remaining[0].total)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color="#3f3f46" />
              </TouchableOpacity>
            ) : (
              <Text style={styles.celebrateWrap}>That's everything — wrapping up…</Text>
            )}
          </TouchableOpacity>
        ) : current ? (
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
    fontSize: 23,
    fontWeight: '600',
    letterSpacing: -0.5,
    marginTop: 7,
  },
  lobbySub: { color: '#71717a', fontSize: 12, marginTop: 6 },
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
  lobbyThumb: { width: 36, height: 36, borderRadius: 9 },
  lobbyCheckWrap: { width: 36, alignItems: 'center' },
  lobbyRowName: { color: '#fff', fontSize: 13, fontWeight: '500' },
  lobbyRowNameDone: { color: '#52525b', textDecorationLine: 'line-through', fontWeight: '400' },
  lobbyRowSub: { color: '#52525b', fontSize: 10, marginTop: 2 },
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
  lobbyFreshBlock: {
    marginHorizontal: 18,
    marginTop: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#27272a',
    paddingLeft: 11,
  },
  lobbyFreshEyebrow: { color: '#52525b', fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  lobbyFreshText: { color: '#71717a', fontSize: 11, lineHeight: 16, marginTop: 5 },

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
  ctaBtnText: { color: '#000', fontSize: 15, fontWeight: '600' },
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

  // Celebration
  celebrateBlock: {
    alignItems: 'center',
    paddingTop: 46,
    paddingHorizontal: 24,
  },
  celebrateCheck: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrateTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.4,
    marginTop: 14,
    textAlign: 'center',
  },
  celebrateGain: { fontSize: 14, fontWeight: '500', marginTop: 6 },
  celebrateSub: { color: '#71717a', fontSize: 12, marginTop: 10 },
  celebrateWrap: { color: '#3f3f46', fontSize: 11, textAlign: 'center', marginTop: 40 },
  nextUpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginHorizontal: 14,
    marginTop: 40,
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    padding: 12,
  },
  nextUpThumb: { width: 40, height: 40, borderRadius: 10 },
  nextUpEyebrow: { color: '#52525b', fontSize: 10, fontWeight: '600', letterSpacing: 1.2 },
  nextUpTitle: { color: '#fff', fontSize: 14, fontWeight: '500', marginTop: 3 },

  // Finale
  completeBlock: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 26,
    paddingBottom: 8,
    paddingHorizontal: 18,
  },
  completeTitle: { color: '#fff', fontSize: 17, fontWeight: '600', marginTop: 2 },
  completeSub: { color: '#a1a1aa', fontSize: 12, textAlign: 'center' },

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