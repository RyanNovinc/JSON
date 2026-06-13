import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageSourcePropType,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
import { getMealImage } from '../assets/mealImages';
import { CURATED_MEALS } from '../data/curated_meals';

type MealPrepNav = StackNavigationProp<RootStackParamList, 'MealPrepSession'>;

// ============================================================================
// The screen is a *guided worklist*, not a catalog. The user is never asked to
// decide what to do next — they're handed one active task at a time, in the
// order that finishes the whole session fastest. All the intelligence lives in
// buildWorklist(): everything else just renders the front of that queue.
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

function storageLine(storage?: { fridge_days?: number; freeze_months?: number }): string | null {
  if (!storage) return null;
  const parts: string[] = [];
  if (typeof storage.fridge_days === 'number' && storage.fridge_days > 0) {
    parts.push(`Fridge ${storage.fridge_days}d`);
  }
  if (typeof storage.freeze_months === 'number' && storage.freeze_months > 0) {
    parts.push(`Freezer ${storage.freeze_months}mo`);
  }
  return parts.length ? parts.join('  ·  ') : null;
}

function humanizeEquipment(e: string): string {
  return String(e).replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// Prep-ahead copy. A prep-ahead meal is "cook the storable part now, finish one
// fresh thing at mealtime" — meatballs + sauce store, spaghetti is boiled fresh.
// That split is NOT reliably encoded in the recipe steps: for many partial meals
// the day-of element lives inside the method, not plate.additional_instructions,
// so there's no structured boundary to derive. We therefore render two SHORT
// authored fields, surfaced by buildPrepSession (plate meal_prep overrides meal):
//   prepAheadSummary  e.g. "Turkey meatballs + tomato sauce"
//   dayOfSummary      e.g. "Boil fresh spaghetti"
// No derivation from steps, no `prep_note` — both reintroduce long/ambiguous
// prose. A meal without summaries falls back to a clean generic label.
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
// they have no place on prep day. This function is pure and could move into
// buildPrepSession.ts (the order is a deterministic property of the plan); it
// lives here for now to keep the prep-session builder untouched.
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
    // way (lamb kofta bowl + wrap both "salad, sauce, warm rice/wrap"); label
    // each by plate name when they differ (schnitzel plate vs roll vs parma).
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
// Make-fresh row — quiet, names-only. Not in the queue; shown as a heads-up.
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

// ============================================================================
// Up-next row — a name, a one-word treatment tag, and the wall-clock time.
// Tappable so a user who wants to work out of order isn't trapped by the queue.
// ============================================================================
function UpNextRow({
  item,
  onOpen,
  opacity,
}: {
  item: WorkItem;
  onOpen: (g: PrepGroup, servings: number) => void;
  opacity: number;
}) {
  const tag = item.setAndForget ? 'set & forget' : item.strategy === 'prep' ? 'prep ahead' : 'hands-on';
  return (
    <TouchableOpacity
      style={[styles.upNextRow, { opacity }]}
      activeOpacity={0.6}
      onPress={() => onOpen(item.group, item.cookServings)}
    >
      {item.image ? (
        <Image source={item.image} style={styles.upNextThumb} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.upNextThumb, styles.thumbPlaceholder]}>
          <Ionicons name="image-outline" size={16} color="#52525b" />
        </View>
      )}
      <View style={styles.upNextTextCol}>
        <Text style={styles.upNextName} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.upNextTag}>{tag}</Text>
      </View>
      <Text style={styles.upNextTime}>{formatTime(item.total)}</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// Done row — struck through, tappable to restore (un-complete).
// ============================================================================
function DoneRow({
  item,
  onToggle,
}: {
  item: WorkItem;
  onToggle: (key: string) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.doneRow}
      activeOpacity={0.6}
      onPress={() => onToggle(item.doneKey)}
    >
      <Ionicons name="checkmark-circle" size={16} color="#52525b" />
      <Text style={styles.doneName} numberOfLines={1}>
        {item.title}
      </Text>
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
  // under @mealprep_done_<planId>; loaded into a lookup map on mount.
  const storageKey = currentPlan ? `@mealprep_done_${currentPlan.id}` : null;
  const [doneKeys, setDoneKeys] = useState<Record<string, boolean>>({});
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
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
        }
      } catch {
        if (!cancelled) setDoneKeys({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

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

  // Deep-link into the cook flow at the batch's serving count. Clamp on the
  // send side too (RecipeDetail clamps on receive) via the shared util.
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

  const openGroceryList = useCallback(() => {
    // Mirror MealPlanDaysScreen's working "Shopping list" link. The real source
    // is the simplified plan's own grocery_list (priced + already categorised);
    // fall back to the legacy context, then to no param. This passes the exact
    // same object that screen does, so GroceryListScreen renders it identically.
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
  const completed = useMemo(
    () => queue.filter((i) => doneKeys[i.doneKey]),
    [queue, doneKeys]
  );

  const current = remaining[0] ?? null;
  const upNext = remaining.slice(1, 4);
  const restCount = Math.max(0, remaining.length - 1 - upNext.length);

  const doneCount = completed.length;
  const totalCount = queue.length;
  const progress = totalCount > 0 ? doneCount / totalCount : 0;

  // Finish estimate only makes sense when hands-on is known for every item.
  const handsOnKnown = queue.length > 0 && queue.every((i) => i.handsOnKnown);
  const makespan = useMemo(() => {
    if (!handsOnKnown) return null;
    const sumHandsOn = queue.reduce((s, i) => s + i.handsOn, 0);
    const maxTotal = queue.reduce((m, i) => Math.max(m, i.total), 0);
    return Math.max(maxTotal, sumHandsOn);
  }, [queue, handsOnKnown]);

  const header = (
    <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity style={styles.backBtn} hitSlop={10} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.topBarTitle}>Meal Prep</Text>
      <View style={styles.backBtn} />
    </View>
  );

  // ----- Empty / legacy guards ----------------------------------------------
  if (!session) {
    return (
      <View style={styles.container}>
        {header}
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
        {header}
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
  const allDone = totalCount > 0 && remaining.length === 0;

  return (
    <View style={styles.container}>
      {header}
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* ---- Progress + finish estimate ---- */}
        <View style={styles.titleBlock}>
          <View style={styles.progressTopRow}>
            <Text style={styles.eyebrowMuted}>PREP SESSION</Text>
            <Text style={styles.progressCount}>
              {doneCount} of {totalCount} done
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(progress * 100)}%`, backgroundColor: themeColor },
              ]}
            />
          </View>
          <Text style={styles.progressSub}>
            {makespan != null
              ? `Done in ~${formatTime(makespan)}`
              : `Longest cook ~${formatTime(queue.reduce((m, i) => Math.max(m, i.total), 0))}`}
            {' · '}
            <Text style={{ color: themeColor }}>ordered to finish fastest</Text>
          </Text>
        </View>

        {/* ---- Session complete ---- */}
        {allDone ? (
          <View style={styles.completeCard}>
            <Ionicons name="checkmark-done-circle-outline" size={26} color={themeColor} />
            <Text style={styles.completeTitle}>All prepped.</Text>
            <Text style={styles.completeSub}>
              {totals.mealCount} {totals.mealCount === 1 ? 'meal' : 'meals'} ready for the week.
            </Text>
          </View>
        ) : null}

        {/* ---- DO NOW ---- */}
        {current ? (
          <View style={styles.nowCard}>
            {current.image ? (
              <Image source={current.image} style={styles.nowImage} contentFit="cover" transition={200} priority="high" />
            ) : (
              <View style={[styles.nowImage, styles.thumbPlaceholder]}>
                <Ionicons name="image-outline" size={28} color="#52525b" />
              </View>
            )}
            <View style={styles.nowBody}>
            <View style={styles.nowHeader}>
              <Text style={[styles.nowEyebrow, { color: themeColor }]}>DO NOW</Text>
              <Text style={styles.nowStrategy}>
                {current.strategy === 'prep' ? 'PREP AHEAD' : 'COOK AHEAD'}
              </Text>
            </View>

            <Text style={styles.nowTitle}>{current.title}</Text>

            {/* Prep-ahead is two actions at two times: headline the shared
                prep-now job, then the day-of finish(es) — one line when every
                plate finishes the same way, one per plate when they differ.
                Cook-ahead gets a single adaptive treatment line instead. */}
            {current.strategy === 'prep' ? (
              <View style={styles.splitBlock}>
                <View style={styles.splitRow}>
                  <Text style={[styles.splitLabel, { color: themeColor }]}>PREP NOW</Text>
                  <Text style={styles.splitText} numberOfLines={2}>
                    {current.prepAheadSummary}
                  </Text>
                </View>
                {(current.dayOfLines.length > 0
                  ? current.dayOfLines
                  : ['Finish fresh at mealtime']
                ).map((line, idx) => (
                  <View style={styles.splitRow} key={idx}>
                    <Text style={styles.splitLabelMuted}>{idx === 0 ? 'DAY-OF' : ''}</Text>
                    <Text style={styles.splitTextMuted} numberOfLines={2}>
                      {line}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.nowInstruction}>
                {current.setAndForget
                  ? `Start it now, then walk away — it cooks for ${formatTime(
                      current.passive
                    )} on its own.`
                  : current.handsOnKnown
                  ? `Stays hands-on — about ${formatTime(current.handsOn)} of work.`
                  : 'Get this going next.'}
              </Text>
            )}

            <Text style={styles.nowMeta}>
              {current.strategy === 'prep' ? 'Prep' : 'Cook'} {current.cookServings}{' '}
              {current.cookServings === 1 ? 'serving' : 'servings'} · covers{' '}
              {current.coverage} {current.coverage === 1 ? 'meal' : 'meals'} ·{' '}
              {current.strategy === 'prep' && current.handsOnKnown
                ? `~${formatTime(current.handsOn)} now`
                : formatTime(current.total)}
            </Text>

            {storageLine(current.group.storage) ? (
              <Text style={styles.nowStorage}>{storageLine(current.group.storage)}</Text>
            ) : null}

            {/* Freezer note from freshness data */}
            {(() => {
              const freshnessItem = freshnessSession?.items.find(
                item => item.curated_meal_slug === current.group.slug && item.plate_id === current.group.plateId
              );
              return freshnessItem?.freshness?.freeze_note ? (
                <View style={styles.freezerNote}>
                  <Ionicons name="snow-outline" size={14} color="#3b82f6" />
                  <Text style={styles.freezerNoteText}>{freshnessItem.freshness.freeze_note}</Text>
                </View>
              ) : null;
            })()}

            <View style={styles.nowActions}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: themeColor }]}
                activeOpacity={0.85}
                onPress={() => toggleDone(current.doneKey)}
              >
                <Ionicons name="checkmark" size={16} color="#000" />
                <Text style={styles.primaryBtnText}>
                  {current.strategy === 'prep' ? 'Mark prep done' : 'Mark done'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                activeOpacity={0.7}
                onPress={() => openRecipe(current.group, current.cookServings)}
              >
                <Text style={styles.secondaryBtnText}>Recipe</Text>
                <Ionicons name="chevron-forward" size={15} color="#fff" />
              </TouchableOpacity>
            </View>
            </View>
          </View>
        ) : null}

        {/* ---- UP NEXT ---- */}
        {upNext.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.eyebrowMuted}>UP NEXT</Text>
            {upNext.map((item, idx) => (
              <UpNextRow
                key={item.doneKey}
                item={item}
                onOpen={openRecipe}
                opacity={[0.85, 0.62, 0.45][idx] ?? 0.4}
              />
            ))}
            {restCount > 0 ? (
              <Text style={styles.restNote}>
                {restCount} more · then {makeFresh.length}{' '}
                {makeFresh.length === 1 ? 'make-fresh item' : 'make-fresh items'}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* ---- DONE (collapsible) ---- */}
        {doneCount > 0 ? (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.doneHeader}
              activeOpacity={0.7}
              onPress={() => setShowDone((s) => !s)}
            >
              <Text style={styles.eyebrowMuted}>DONE · {doneCount}</Text>
              <Ionicons
                name={showDone ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#3f3f46"
              />
            </TouchableOpacity>
            {showDone ? (
              <View style={styles.doneList}>
                {completed.map((item) => (
                  <DoneRow key={item.doneKey} item={item} onToggle={toggleDone} />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ---- MAKE FRESH — heads-up only, never queued ---- */}
        {makeFresh.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.eyebrowMuted}>MAKE FRESH</Text>
            <Text style={styles.sectionBlurb}>Cook these to order — not part of the prep run.</Text>
            <View style={styles.freshCard}>
              {makeFresh.map((item, idx) => (
                <View key={item.key}>
                  {idx > 0 ? <View style={styles.freshDivider} /> : null}
                  <MakeFreshRow item={item} />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ---- Equipment — quiet, lowest priority ---- */}
        {totals.equipment.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.eyebrowMuted}>EQUIPMENT</Text>
            <View style={styles.chipRow}>
              {totals.equipment.map((e) => (
                <View key={String(e)} style={styles.chip}>
                  <Text style={styles.chipText}>{humanizeEquipment(e)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ---- Grocery list ---- */}
        <TouchableOpacity style={styles.groceryLink} activeOpacity={0.7} onPress={openGroceryList}>
          <Ionicons name="cart-outline" size={16} color={themeColor} />
          <Text style={[styles.groceryLinkText, { color: themeColor }]}>View grocery list</Text>
        </TouchableOpacity>
      </ScrollView>
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

  titleBlock: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 6 },
  progressTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressCount: { color: '#71717a', fontSize: 11 },
  progressTrack: { height: 6, borderRadius: 4, backgroundColor: '#27272a', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressSub: { color: '#71717a', fontSize: 12, marginTop: 9 },
  payoffSub: { color: '#a1a1aa', fontSize: 13, lineHeight: 18, marginTop: 6 },

  section: { paddingHorizontal: 18, marginTop: 22 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  eyebrowMuted: { color: '#71717a', fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  sectionBlurb: { color: '#52525b', fontSize: 11, lineHeight: 15, marginTop: 4, marginBottom: 10 },

  // DO NOW card
  nowCard: {
    marginHorizontal: 18,
    marginTop: 16,
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    overflow: 'hidden',
  },
  nowImage: { width: '100%', height: 120, backgroundColor: '#202023' },
  nowBody: { padding: 16 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  nowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nowEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  nowStrategy: { color: '#52525b', fontSize: 11, fontWeight: '600', letterSpacing: 0.6 },
  nowTitle: { color: '#fff', fontSize: 20, fontWeight: '600', letterSpacing: -0.4, marginTop: 11 },
  nowInstruction: { color: '#fff', fontSize: 13, lineHeight: 19, marginTop: 9 },
  nowMeta: { color: '#a1a1aa', fontSize: 12, marginTop: 13 },
  nowStorage: { color: '#52525b', fontSize: 11, letterSpacing: 0.3, marginTop: 8 },
  freezerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingLeft: 2,
  },
  freezerNoteText: {
    flex: 1,
    color: '#3b82f6',
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.2,
  },

  // Prep-ahead now/day-of split
  splitBlock: {
    marginTop: 14,
    borderLeftWidth: 2,
    borderLeftColor: '#27272a',
    paddingLeft: 12,
    gap: 9,
  },
  splitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  splitLabel: { width: 58, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginTop: 1 },
  splitLabelMuted: {
    width: 58,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#52525b',
    marginTop: 1,
  },
  splitText: { flex: 1, color: '#fff', fontSize: 13, lineHeight: 18 },
  splitTextMuted: { flex: 1, color: '#71717a', fontSize: 12, lineHeight: 17 },

  nowActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
  },
  primaryBtnText: { color: '#000', fontSize: 14, fontWeight: '600' },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
  },
  secondaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },

  // Up next
  upNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f1f23',
  },
  upNextThumb: { width: 42, height: 42, borderRadius: 8, backgroundColor: '#202023' },
  upNextTextCol: { flex: 1, paddingRight: 10 },
  upNextName: { color: '#d4d4d8', fontSize: 14, fontWeight: '500' },
  upNextTag: { color: '#52525b', fontSize: 11, marginTop: 2, textTransform: 'lowercase' },
  upNextTime: { color: '#71717a', fontSize: 12 },
  restNote: { color: '#52525b', fontSize: 11, paddingTop: 10 },

  // Done
  doneHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  doneList: { marginTop: 8 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 },
  doneName: {
    flex: 1,
    color: '#52525b',
    fontSize: 13,
    textDecorationLine: 'line-through',
  },

  // Complete
  completeCard: {
    marginHorizontal: 18,
    marginTop: 16,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    paddingVertical: 22,
    paddingHorizontal: 18,
  },
  completeTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 2 },
  completeSub: { color: '#a1a1aa', fontSize: 12, textAlign: 'center' },

  // Make fresh
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

  // Equipment
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    backgroundColor: 'transparent',
  },
  chipText: { color: '#a1a1aa', fontSize: 11, textTransform: 'capitalize' },

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