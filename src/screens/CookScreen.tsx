/**
 * CookScreen — JSON.fit "Cook" tab (replaces the freed Library tab).
 *
 * Phase 1: stills only. Video mounts later behind VIDEO_ENABLED without
 * layout changes; the hero still stays mounted underneath the video surface.
 *
 * Approved design (mockup: cook_screen_clean_centered_macros):
 *   - Full-bleed media, one card per viewport, vertical snap paging, no peek
 *   - Base layer shows only: centered meal name, centered macro line, Cook this
 *   - Everything else (serves, method, effort tags, Save / Add / Share / Mute)
 *     lives in a side panel revealed by swiping left or tapping the edge tab
 *   - Horizontal swipe is reserved for the panel. Vertical swipe navigates.
 *   - Single tap: play/pause on video cards only. Double tap: save.
 *   - Category pill (top left) opens the filter sheet (category + intent)
 *   - Explicit end-of-category card; never a silent loop
 *
 * Navigator requirement (not this file's job): hide the tab bar on this route
 * (tabBarStyle: { display: 'none' }) so the pager owns the full screen.
 *
 * Every point that must plug into existing app code is marked TODO(repo):
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityActionEvent,
  Animated,
  FlatList,
  Image,
  ListRenderItemInfo,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

/* Cook is a tab screen, but every destination it pushes (CookMode, …) lives on
 * the root stack, which the tab navigator is nested in — so type against the
 * root stack's param list. Type-only import, so no runtime import cycle with
 * AppNavigator (which imports this screen). */
type CookScreenNav = StackNavigationProp<RootStackParamList>;

/* ────────────────────────────────────────────────────────────────────────────
 * Types and data seams
 * ──────────────────────────────────────────────────────────────────────────── */

export type MealCategory = 'breakfast' | 'mains' | 'snacks' | 'dessert';

/** TODO(repo): replace with the real meal type from src/data/curated_meals.ts
 *  and delete this local definition. Field names below are a best guess from
 *  the build brief; align them with meals.json when wiring. */
export interface CuratedMeal {
  slug: string;
  name: string;
  category: MealCategory;
  serves: number;
  /** Display name of the default cooking method, e.g. 'Stovetop'. */
  defaultMethod: string;
  /** Equipment ids for the default method, e.g. ['stovetop']. */
  equipmentRequired: string[];
  /** Smallest image variant that survives full-screen display.
   *  TODO(repo): reuse whatever variant helper the plate pages ship. */
  heroStill: string;
  /** Present once vertical footage exists for this meal. */
  videoUrl?: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** TODO(repo): derive via the shared ingredientCount helper instead. */
  ingredientCount: number;
  activeMinutes: number;
  scaleMin: number;
  scaleMax: number;
}

/** TODO(repo): import { CURATED_MEALS } from '../data/curated_meals' and
 *  delete SAMPLE_MEALS. These three exist only so the file runs standalone. */
const SAMPLE_MEALS: CuratedMeal[] = [
  {
    slug: 'garlic-butter-chicken-rice',
    name: 'Garlic butter chicken and rice',
    category: 'mains',
    serves: 2,
    defaultMethod: 'Stovetop',
    equipmentRequired: ['stovetop'],
    heroStill: '',
    videoUrl: undefined,
    kcal: 620,
    protein: 48,
    carbs: 58,
    fat: 20,
    ingredientCount: 9,
    activeMinutes: 25,
    scaleMin: 0.5,
    scaleMax: 2,
  },
  {
    slug: 'one-pan-salmon-traybake',
    name: 'One-pan salmon traybake',
    category: 'mains',
    serves: 2,
    defaultMethod: 'Oven',
    equipmentRequired: ['oven'],
    heroStill: '',
    kcal: 580,
    protein: 41,
    carbs: 32,
    fat: 30,
    ingredientCount: 8,
    activeMinutes: 30,
    scaleMin: 0.5,
    scaleMax: 2,
  },
  {
    slug: 'beef-stir-fry',
    name: 'Beef stir fry',
    category: 'mains',
    serves: 2,
    defaultMethod: 'Stovetop',
    equipmentRequired: ['stovetop'],
    heroStill: '',
    kcal: 540,
    protein: 42,
    carbs: 44,
    fat: 19,
    ingredientCount: 12,
    activeMinutes: 18,
    scaleMin: 0.5,
    scaleMax: 2,
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * Constants
 * ──────────────────────────────────────────────────────────────────────────── */

/** Capability flag. Flip only once a video library ships (needs approval:
 *  a video library is a native dependency → EAS rebuild on both platforms). */
const VIDEO_ENABLED = false;

const PRELOAD_AHEAD_IOS = 2;
const PRELOAD_AHEAD_ANDROID = 1;
const PRELOAD_AHEAD =
  Platform.OS === 'ios' ? PRELOAD_AHEAD_IOS : PRELOAD_AHEAD_ANDROID;

/** Must be module-level, not an inline literal: FlatList captures this once and
 *  throws "Changing viewabilityConfig on the fly is not supported" if the
 *  identity changes between renders. */
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

/** TODO(repo): these three mirror the picker screen's helpers. Move the
 *  originals into a shared module and import them in both screens. */
const INGREDIENT_WARN_AT = 11;
const QUICK_MAX_ACTIVE_MINUTES = 10;
const HEAT_EQUIPMENT = ['stovetop', 'oven', 'slow_cooker', 'microwave'];

const PANEL_WIDTH = 248;
const SWIPE_TRIGGER_DX = 48;
const DOUBLE_TAP_MS = 300;

const CATEGORIES: MealCategory[] = ['breakfast', 'mains', 'snacks', 'dessert'];
const CATEGORY_LABEL: Record<MealCategory, string> = {
  breakfast: 'Breakfast',
  mains: 'Mains',
  snacks: 'Snacks',
  dessert: 'Dessert',
};

type IntentFilter = 'fits' | 'quick' | 'nocook' | 'few';
const INTENT_LABEL: Record<IntentFilter, string> = {
  fits: 'Fits your day',
  quick: 'Under 10 min',
  nocook: 'No cook',
  few: '5 ingredients or fewer',
};

/** TODO(repo): swap for the app's theme tokens. */
const C = {
  bg: '#161615',
  text: '#F5F3EE',
  sub: '#C9C7C2',
  faint: '#8A8880',
  overlay: 'rgba(20,20,20,0.5)',
  panel: 'rgba(18,18,17,0.94)',
  hairline: '#33332F',
  outline: '#3A3A38',
  cta: '#E8E6E1',
  ctaText: '#161615',
  saved: '#F0997B',
  savedOutline: '#5A4038',
  amber: '#FAD9A0',
  amberBg: 'rgba(120,74,10,0.75)',
};

/* ────────────────────────────────────────────────────────────────────────────
 * App service seams
 * ──────────────────────────────────────────────────────────────────────────── */

/** TODO(repo): replace with the shared analytics helper that feeds the
 *  self-hosted S3/Lambda pipeline. Event names below are the contract. */
function track(event: string, props?: Record<string, unknown>): void {
  if (__DEV__) {
    console.log('[cook-analytics]', event, props ?? {});
  }
}

/** TODO(repo): derive from the GoalsProfile data layer — today's remaining
 *  calories and protein. Must return null when there is no active plan or no
 *  logged intake yet; null hides the "Fits your day" option entirely. */
function useRemainingToday(): { kcal: number; protein: number } | null {
  return null;
}

/** A meal "fits your day" when some legal scale factor lands it inside the
 *  remaining calories AND protein. Feasibility: the largest factor that fits
 *  both budgets must still be at or above the meal's scaleMin.
 *  TODO(repo): confirm this predicate against GoalsProfile semantics. */
function fitsRemaining(
  meal: CuratedMeal,
  remaining: { kcal: number; protein: number },
): boolean {
  const maxFactor = Math.min(
    remaining.kcal / meal.kcal,
    remaining.protein / meal.protein,
  );
  return maxFactor >= meal.scaleMin;
}

/** TODO(repo): reuse the picker screen's No-cook helper once shared. */
function isNoCook(meal: CuratedMeal): boolean {
  return !meal.equipmentRequired.some((e) => HEAT_EQUIPMENT.includes(e));
}

/** Global mute for video cards. Per-card mute is deliberately not a thing.
 *  TODO(repo): persist across sessions via the app's storage util. */
const mutedGlobal = { value: true };

/* ────────────────────────────────────────────────────────────────────────────
 * Row model
 * ──────────────────────────────────────────────────────────────────────────── */

type Row =
  | { kind: 'meal'; meal: CuratedMeal }
  | { kind: 'end'; count: number; empty: boolean };

/* ────────────────────────────────────────────────────────────────────────────
 * Screen
 * ──────────────────────────────────────────────────────────────────────────── */

export default function CookScreen(): React.JSX.Element {
  const { height: cardHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<CookScreenNav>();

  const remaining = useRemainingToday();

  const [category, setCategory] = useState<MealCategory | null>('mains');
  const [intent, setIntent] = useState<IntentFilter | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [savedSlugs, setSavedSlugs] = useState<ReadonlySet<string>>(new Set());
  const [hintDismissed, setHintDismissed] = useState(false);

  const listRef = useRef<FlatList<Row>>(null);
  const lastIndexRef = useRef(0);
  const dwellRef = useRef<{ slug: string; since: number } | null>(null);

  const meals = SAMPLE_MEALS; // TODO(repo): CURATED_MEALS

  const filtered = useMemo(() => {
    return meals.filter((m) => {
      if (category && m.category !== category) return false;
      switch (intent) {
        case 'fits':
          return remaining ? fitsRemaining(m, remaining) : true;
        case 'quick':
          return m.activeMinutes <= QUICK_MAX_ACTIVE_MINUTES;
        case 'nocook':
          return isNoCook(m);
        case 'few':
          return m.ingredientCount <= 5;
        default:
          return true;
      }
    });
  }, [meals, category, intent, remaining]);

  const rows = useMemo<Row[]>(() => {
    const mealRows: Row[] = filtered.map((meal) => ({ kind: 'meal', meal }));
    mealRows.push({
      kind: 'end',
      count: filtered.length,
      empty: filtered.length === 0,
    });
    return mealRows;
  }, [filtered]);

  /* Filter changes swap the dataset in place and reset to index 0. */
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    lastIndexRef.current = 0;
  }, [category, intent]);

  /* Screen view + dwell flush on blur. */
  useFocusEffect(
    useCallback(() => {
      track('cook_screen_view', { category, intent });
      return () => flushDwell();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const flushDwell = useCallback(() => {
    const d = dwellRef.current;
    if (d) {
      track('cook_card_dwell', {
        slug: d.slug,
        ms: Date.now() - d.since,
      });
      dwellRef.current = null;
    }
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const visible = viewableItems.find(
        (v) => v.isViewable && (v.item as Row).kind === 'meal',
      );
      if (!visible) return;
      const row = visible.item as Extract<Row, { kind: 'meal' }>;
      const index = visible.index ?? 0;

      flushDwell();
      dwellRef.current = { slug: row.meal.slug, since: Date.now() };
      track('cook_card_impression', { slug: row.meal.slug, index });

      /* Preload ahead of the scroll direction only. */
      const direction = index >= lastIndexRef.current ? 1 : -1;
      lastIndexRef.current = index;
      for (let i = 1; i <= PRELOAD_AHEAD; i += 1) {
        const next = rowsRef.current[index + direction * i];
        if (next && next.kind === 'meal' && next.meal.heroStill) {
          Image.prefetch(next.meal.heroStill).catch(() => undefined);
        }
      }
    },
  ).current;

  /* onViewableItemsChanged must stay referentially stable; read rows via ref. */
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const enterCookMode = useCallback(
    (meal: CuratedMeal) => {
      track('cook_action', { action: 'cook', slug: meal.slug });
      flushDwell();
      /* The feed has no plate/method picker, so enter on the defaults — index 0
       * for both, the same pair RecipeDetail starts on. scaleFactor is omitted
       * rather than passed as 1: CookMode already defaults it to 1. */
      navigation.navigate('CookMode', {
        mealSlug: meal.slug,
        plateIndex: 0,
        methodIndex: 0,
      });
    },
    [navigation, flushDwell],
  );

  const toggleSave = useCallback((meal: CuratedMeal) => {
    setSavedSlugs((prev) => {
      const next = new Set(prev);
      const saving = !next.has(meal.slug);
      if (saving) next.add(meal.slug);
      else next.delete(meal.slug);
      track('cook_action', {
        action: saving ? 'save' : 'unsave',
        slug: meal.slug,
      });
      /* TODO(repo): write through to the per-screen Saved destination. */
      return next;
    });
    setHintDismissed(true);
  }, []);

  const addToPlan = useCallback((meal: CuratedMeal) => {
    track('cook_action', { action: 'add_to_plan', slug: meal.slug });
    /* TODO(repo): call the plan mutation the picker screen uses. */
  }, []);

  const shareMeal = useCallback((meal: CuratedMeal) => {
    track('cook_action', { action: 'share', slug: meal.slug });
    Share.share({ message: `${meal.name} — JSON.fit` }).catch(() => undefined);
  }, []);

  const selectCategory = useCallback((next: MealCategory | null) => {
    setCategory(next);
    track('cook_chip_select', { row: 'category', chip: next ?? 'all' });
  }, []);

  const selectIntent = useCallback((next: IntentFilter | null) => {
    setIntent(next);
    track('cook_chip_select', { row: 'intent', chip: next ?? 'none' });
  }, []);

  const goToAdjacentCategory = useCallback(() => {
    const current = category ?? 'breakfast';
    const next = CATEGORIES[(CATEGORIES.indexOf(current) + 1) % CATEGORIES.length];
    selectCategory(next);
  }, [category, selectCategory]);

  const scrollToIndex = useCallback((index: number) => {
    listRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Row>) => {
      if (item.kind === 'end') {
        return (
          <EndCard
            height={cardHeight}
            count={item.count}
            empty={item.empty}
            categoryLabel={category ? CATEGORY_LABEL[category] : 'meals'}
            nextLabel={
              CATEGORY_LABEL[
                CATEGORIES[
                  (CATEGORIES.indexOf(category ?? 'breakfast') + 1) %
                    CATEGORIES.length
                ]
              ]
            }
            onNextCategory={goToAdjacentCategory}
            onClearFilters={() => {
              selectIntent(null);
              selectCategory(null);
            }}
          />
        );
      }
      return (
        <MealCard
          meal={item.meal}
          index={index}
          height={cardHeight}
          bottomInset={insets.bottom}
          topInset={insets.top}
          saved={savedSlugs.has(item.meal.slug)}
          showHint={index === 0 && !hintDismissed}
          onCook={enterCookMode}
          onToggleSave={toggleSave}
          onAddToPlan={addToPlan}
          onShare={shareMeal}
          onPrev={() => scrollToIndex(Math.max(0, index - 1))}
          onNext={() => scrollToIndex(index + 1)}
        />
      );
    },
    [
      cardHeight,
      insets.bottom,
      insets.top,
      savedSlugs,
      hintDismissed,
      category,
      enterCookMode,
      toggleSave,
      addToPlan,
      shareMeal,
      goToAdjacentCategory,
      selectCategory,
      selectIntent,
      scrollToIndex,
    ],
  );

  return (
    <View style={[styles.screen, { backgroundColor: C.bg }]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <FlatList
        ref={listRef}
        data={rows}
        renderItem={renderItem}
        keyExtractor={(row) => (row.kind === 'meal' ? row.meal.slug : '__end__')}
        /* Every row is exactly one screen tall, so the layout is known up front
         * — this keeps scrollToIndex synchronous and the snap exact. */
        getItemLayout={(_, index) => ({
          length: cardHeight,
          offset: cardHeight * index,
          index,
        })}
        pagingEnabled
        snapToInterval={cardHeight}
        decelerationRate="fast"
        disableIntervalMomentum
        showsVerticalScrollIndicator={false}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
      />

      {/* Category pill — the only persistent chrome on the video. */}
      <Pressable
        onPress={() => setSheetOpen(true)}
        style={[styles.categoryPill, { top: insets.top + 10 }]}
        accessibilityRole="button"
        accessibilityLabel={`Filters. Showing ${
          category ? CATEGORY_LABEL[category] : 'all meals'
        }${intent ? `, ${INTENT_LABEL[intent]}` : ''}`}
      >
        <Text style={styles.categoryPillText}>
          {category ? CATEGORY_LABEL[category] : 'All meals'}
          {intent ? ` · ${INTENT_LABEL[intent]}` : ''}
        </Text>
        <Text style={styles.categoryPillChevron}>⌄</Text>
      </Pressable>

      <FilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        category={category}
        intent={intent}
        showFits={remaining !== null}
        onSelectCategory={selectCategory}
        onSelectIntent={selectIntent}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Meal card
 * ──────────────────────────────────────────────────────────────────────────── */

interface MealCardProps {
  meal: CuratedMeal;
  index: number;
  height: number;
  topInset: number;
  bottomInset: number;
  saved: boolean;
  showHint: boolean;
  onCook: (meal: CuratedMeal) => void;
  onToggleSave: (meal: CuratedMeal) => void;
  onAddToPlan: (meal: CuratedMeal) => void;
  onShare: (meal: CuratedMeal) => void;
  onPrev: () => void;
  onNext: () => void;
}

function MealCard(props: MealCardProps): React.JSX.Element {
  const {
    meal,
    height,
    topInset,
    bottomInset,
    saved,
    showHint,
    onCook,
    onToggleSave,
    onAddToPlan,
    onShare,
    onPrev,
    onNext,
  } = props;

  const [panelOpen, setPanelOpen] = useState(false);
  const panelX = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const heartScale = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef(0);

  const setPanel = useCallback(
    (open: boolean) => {
      setPanelOpen(open);
      Animated.timing(panelX, {
        toValue: open ? 0 : PANEL_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }).start();
      if (open) track('cook_panel_open', { slug: meal.slug });
    },
    [panelX, meal.slug],
  );

  /* Horizontal swipe opens/closes the panel. Claims the gesture only on a
   * clearly horizontal move so vertical paging is never contested. */
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderRelease: (_e, g) => {
        if (g.dx <= -SWIPE_TRIGGER_DX) setPanelRef.current(true);
        else if (g.dx >= SWIPE_TRIGGER_DX) setPanelRef.current(false);
      },
    }),
  ).current;
  const setPanelRef = useRef(setPanel);
  setPanelRef.current = setPanel;

  const popHeart = useCallback(() => {
    heartScale.setValue(0);
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 24,
        bounciness: 12,
      }),
      Animated.timing(heartScale, {
        toValue: 0,
        duration: 260,
        delay: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heartScale]);

  /* Single tap: play/pause on video cards only, nothing on stills.
   * Double tap: save, with the heart confirmation. */
  const onMediaPress = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      if (!saved) onToggleSave(meal);
      popHeart();
      return;
    }
    lastTapRef.current = now;
    if (VIDEO_ENABLED && meal.videoUrl) {
      /* TODO(video): toggle play/pause on the mounted player. */
    }
  }, [meal, saved, onToggleSave, popHeart]);

  const onA11yAction = useCallback(
    (e: AccessibilityActionEvent) => {
      if (e.nativeEvent.actionName === 'increment') onNext();
      if (e.nativeEvent.actionName === 'decrement') onPrev();
    },
    [onNext, onPrev],
  );

  return (
    <View
      style={{ height }}
      {...pan.panHandlers}
      accessible
      accessibilityLabel={`${meal.name}. ${meal.kcal} calories, ${meal.protein} grams protein, ${meal.carbs} carbs, ${meal.fat} fat.`}
      accessibilityActions={[
        { name: 'increment', label: 'Next meal' },
        { name: 'decrement', label: 'Previous meal' },
      ]}
      onAccessibilityAction={onA11yAction}
    >
      <CardMedia meal={meal} onPress={onMediaPress} />

      {/* Bottom scrim over the lower third only. Dependency-free stand-in for
          a real gradient; TODO(repo): swap to the app's gradient approach if
          one already ships (never a new native dependency for this). */}
      <View pointerEvents="none" style={styles.scrim}>
        {SCRIM_STEPS.map((opacity, i) => (
          <View
            key={i}
            style={{ flex: 1, backgroundColor: `rgba(8,8,8,${opacity})` }}
          />
        ))}
      </View>

      {/* Double-tap confirmation heart. */}
      <Animated.Text
        style={[
          styles.heartPop,
          { opacity: heartScale, transform: [{ scale: heartScale }] },
        ]}
      >
        ♥
      </Animated.Text>

      {/* First-run gesture hint (research: hidden gestures need a nudge). */}
      {showHint ? (
        <View pointerEvents="none" style={styles.hintPill}>
          <Text style={styles.hintText}>Double tap to save</Text>
        </View>
      ) : null}

      {/* Centered name + macro line. */}
      <View
        pointerEvents="none"
        style={[styles.titleBlock, { bottom: bottomInset + 96 }]}
      >
        <Text style={styles.title} numberOfLines={2}>
          {meal.name}
        </Text>
        <View style={styles.macroRow}>
          <Text style={styles.macroStrong}>{meal.kcal} kcal</Text>
          <Text style={styles.macro}>P {meal.protein}</Text>
          <Text style={styles.macro}>C {meal.carbs}</Text>
          <Text style={styles.macro}>F {meal.fat}</Text>
        </View>
      </View>

      {/* Cook this — the one persistent action; the metric depends on it. */}
      <View
        style={[styles.ctaWrap, { bottom: bottomInset + 28 }]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => onCook(meal)}
          style={styles.cta}
          accessibilityRole="button"
          accessibilityLabel={`Cook ${meal.name}`}
        >
          <Text style={styles.ctaText}>Cook this</Text>
        </Pressable>
      </View>

      {/* Edge tab: visible affordance for the swipe-in panel. */}
      <Pressable
        onPress={() => setPanel(true)}
        style={styles.edgeTab}
        accessibilityRole="button"
        accessibilityLabel="Show details and actions"
      >
        <Text style={styles.edgeTabChevron}>‹</Text>
      </Pressable>

      {/* Tap-to-dismiss layer while the panel is open. */}
      {panelOpen ? (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setPanel(false)}
          accessibilityRole="button"
          accessibilityLabel="Hide details and actions"
        />
      ) : null}

      {/* Side panel: serves, method, effort tags, secondary actions. */}
      <Animated.View
        style={[
          styles.panel,
          {
            width: PANEL_WIDTH,
            paddingTop: topInset + 44,
            paddingBottom: bottomInset + 20,
            transform: [{ translateX: panelX }],
          },
        ]}
      >
        <Pressable
          onPress={() => setPanel(false)}
          style={styles.panelClose}
          accessibilityRole="button"
          accessibilityLabel="Hide panel"
        >
          <Text style={styles.panelCloseChevron}>›</Text>
        </Pressable>

        <Text style={styles.panelMeta}>
          Serves {meal.serves} · {meal.defaultMethod}
        </Text>

        <View style={styles.panelDivider} />
        <EffortTags meal={meal} />

        <View style={{ flex: 1 }} />

        <PanelAction
          label={saved ? 'Saved' : 'Save'}
          active={saved}
          onPress={() => onToggleSave(meal)}
        />
        <PanelAction label="Add to plan" onPress={() => onAddToPlan(meal)} />
        <PanelAction label="Share" onPress={() => onShare(meal)} />
        {VIDEO_ENABLED && meal.videoUrl ? <MuteAction slug={meal.slug} /> : null}
      </Animated.View>
    </View>
  );
}

const SCRIM_STEPS = [0.08, 0.2, 0.34, 0.5, 0.66, 0.82];

/* ────────────────────────────────────────────────────────────────────────────
 * Media layer — the still stays mounted underneath any future video surface,
 * so the Android still→video transition never shows a black frame.
 * ──────────────────────────────────────────────────────────────────────────── */

function CardMedia(props: {
  meal: CuratedMeal;
  onPress: () => void;
}): React.JSX.Element {
  const { meal, onPress } = props;
  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={onPress}>
      {meal.heroStill ? (
        <Image
          source={{ uri: meal.heroStill }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          fadeDuration={0}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: fallbackTone(meal.slug) },
          ]}
        />
      )}
      {/* TODO(video): when VIDEO_ENABLED, mount the video surface HERE, above
          the Image and absolutely filled, once ready — never unmount the still. */}
    </Pressable>
  );
}

/** Deterministic placeholder tone until real hero stills are wired. */
function fallbackTone(slug: string): string {
  const tones = ['#26221C', '#1E2823', '#2D211C', '#241F1D', '#22282A'];
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return tones[hash % tones.length];
}

/* ────────────────────────────────────────────────────────────────────────────
 * Panel pieces
 * ──────────────────────────────────────────────────────────────────────────── */

function EffortTags(props: { meal: CuratedMeal }): React.JSX.Element {
  const { meal } = props;
  const warn = meal.ingredientCount >= INGREDIENT_WARN_AT;
  return (
    <View
      style={styles.effortWrap}
      accessible
      accessibilityLabel={`${meal.ingredientCount} ingredients, ${meal.activeMinutes} minutes hands on`}
    >
      <View style={[styles.effortTag, warn && styles.effortTagWarn]}>
        <Text style={[styles.effortText, warn && styles.effortTextWarn]}>
          {meal.ingredientCount} ingredients
        </Text>
      </View>
      <View style={styles.effortTag}>
        <Text style={styles.effortText}>{meal.activeMinutes} min hands on</Text>
      </View>
    </View>
  );
}

function PanelAction(props: {
  label: string;
  active?: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const { label, active, onPress } = props;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.panelAction, active && styles.panelActionActive]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text
        style={[styles.panelActionText, active && styles.panelActionTextActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function MuteAction(props: { slug: string }): React.JSX.Element {
  const [muted, setMuted] = useState(mutedGlobal.value);
  return (
    <PanelAction
      label={muted ? 'Unmute' : 'Mute'}
      onPress={() => {
        mutedGlobal.value = !mutedGlobal.value;
        setMuted(mutedGlobal.value);
        track('cook_action', {
          action: mutedGlobal.value ? 'mute' : 'unmute',
          slug: props.slug,
        });
      }}
    />
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * End-of-category card — explicit close, never a silent loop.
 * ──────────────────────────────────────────────────────────────────────────── */

function EndCard(props: {
  height: number;
  count: number;
  empty: boolean;
  categoryLabel: string;
  nextLabel: string;
  onNextCategory: () => void;
  onClearFilters: () => void;
}): React.JSX.Element {
  const { height, count, empty, categoryLabel, nextLabel } = props;
  return (
    <View style={[styles.endCard, { height }]}>
      {empty ? (
        <>
          <Text style={styles.endTitle}>No meals match this combination</Text>
          <Pressable
            onPress={props.onClearFilters}
            style={styles.endButton}
            accessibilityRole="button"
          >
            <Text style={styles.endButtonText}>Clear filters</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.endTitle}>
            That's all {count} {categoryLabel.toLowerCase()} here
          </Text>
          <Pressable
            onPress={props.onNextCategory}
            style={styles.endButton}
            accessibilityRole="button"
          >
            <Text style={styles.endButtonText}>
              Browse {nextLabel.toLowerCase()}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Filter sheet — category and intent, single-select per row, combinable.
 * ──────────────────────────────────────────────────────────────────────────── */

function FilterSheet(props: {
  visible: boolean;
  onClose: () => void;
  category: MealCategory | null;
  intent: IntentFilter | null;
  showFits: boolean;
  onSelectCategory: (c: MealCategory | null) => void;
  onSelectIntent: (i: IntentFilter | null) => void;
  bottomInset: number;
}): React.JSX.Element {
  const {
    visible,
    onClose,
    category,
    intent,
    showFits,
    onSelectCategory,
    onSelectIntent,
    bottomInset,
  } = props;

  const intents: IntentFilter[] = (
    ['fits', 'quick', 'nocook', 'few'] as IntentFilter[]
  ).filter((i) => i !== 'fits' || showFits);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: bottomInset + 20 }]}>
        <Text style={styles.sheetHeading}>Meal type</Text>
        <View style={styles.chipRow}>
          <SheetChip
            label="All"
            active={category === null}
            onPress={() => onSelectCategory(null)}
          />
          {CATEGORIES.map((c) => (
            <SheetChip
              key={c}
              label={CATEGORY_LABEL[c]}
              active={category === c}
              onPress={() => onSelectCategory(category === c ? null : c)}
            />
          ))}
        </View>

        <Text style={styles.sheetHeading}>Show me</Text>
        <View style={styles.chipRow}>
          {intents.map((i) => (
            <SheetChip
              key={i}
              label={INTENT_LABEL[i]}
              active={intent === i}
              onPress={() => onSelectIntent(intent === i ? null : i)}
            />
          ))}
        </View>

        <Pressable
          onPress={onClose}
          style={styles.sheetDone}
          accessibilityRole="button"
        >
          <Text style={styles.sheetDoneText}>Done</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function SheetChip(props: {
  label: string;
  active: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const { label, active, onPress } = props;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Styles
 * ──────────────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  screen: { flex: 1 },

  categoryPill: {
    position: 'absolute',
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.overlay,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 5,
  },
  categoryPillText: { color: C.text, fontSize: 12, fontWeight: '500' },
  categoryPillChevron: { color: C.sub, fontSize: 12, marginTop: -2 },

  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '30%',
  },

  heartPop: {
    position: 'absolute',
    alignSelf: 'center',
    top: '38%',
    fontSize: 76,
    color: '#FFFFFF',
    pointerEvents: 'none',
  },

  hintPill: {
    position: 'absolute',
    alignSelf: 'center',
    top: '52%',
    backgroundColor: 'rgba(20,20,20,0.55)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  hintText: { color: C.text, fontSize: 12 },

  titleBlock: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  title: {
    color: C.text,
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
  },
  macroRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  macroStrong: { color: C.text, fontSize: 12, fontWeight: '500' },
  macro: { color: C.sub, fontSize: 12 },

  ctaWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  cta: {
    height: 40,
    paddingHorizontal: 26,
    borderRadius: 20,
    backgroundColor: C.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: C.ctaText, fontSize: 14, fontWeight: '500' },

  edgeTab: {
    position: 'absolute',
    right: 0,
    top: '46%',
    width: 24,
    height: 58,
    backgroundColor: C.overlay,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  edgeTabChevron: { color: C.sub, fontSize: 18, marginTop: -2 },

  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: C.panel,
    paddingHorizontal: 16,
  },
  panelClose: {
    position: 'absolute',
    top: 14,
    left: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelCloseChevron: { color: C.sub, fontSize: 18, marginTop: -2 },
  panelMeta: { color: C.faint, fontSize: 13 },
  panelDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.hairline,
    marginVertical: 12,
  },

  effortWrap: { gap: 6 },
  effortTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(22,22,22,0.6)',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  effortTagWarn: { backgroundColor: C.amberBg },
  effortText: { color: C.cta, fontSize: 12 },
  effortTextWarn: { color: C.amber },

  panelAction: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.outline,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  panelActionActive: { borderColor: C.savedOutline },
  panelActionText: { color: C.cta, fontSize: 13 },
  panelActionTextActive: { color: C.saved },

  endCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
    backgroundColor: '#1C1C1B',
  },
  endTitle: { color: C.sub, fontSize: 14, textAlign: 'center' },
  endButton: {
    borderWidth: 1,
    borderColor: C.outline,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  endButtonText: { color: C.cta, fontSize: 13 },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#1D1D1C',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  sheetHeading: {
    color: C.faint,
    fontSize: 12,
    marginBottom: 10,
    marginTop: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    borderWidth: 1,
    borderColor: C.outline,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: C.cta, borderColor: C.cta },
  chipText: { color: C.sub, fontSize: 12 },
  chipTextActive: { color: C.ctaText, fontWeight: '500' },

  sheetDone: {
    height: 42,
    borderRadius: 12,
    backgroundColor: C.cta,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  sheetDoneText: { color: C.ctaText, fontSize: 14, fontWeight: '500' },
});