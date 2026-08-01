/**
 * CookScreen — JSON.fit "Cook" tab (replaces the freed Library tab).
 *
 * ROUND TWO (this revision):
 *   - Title sits as CLOSE TO THE TOP as the hardware allows: anchored at
 *     safe-area top + 8. insets.top is what keeps it clear of notches,
 *     Dynamic Islands and Android punch-hole cameras on every device — never
 *     hardcode a status bar height. The block is inset 70pt each side so it
 *     never collides with the category pill (left) or the saved heart
 *     (right), which share the same band.
 *   - Double tap is now a TOGGLE: like, then double tap again to unlike.
 *     (Instagram/TikTok deliberately make double tap like-only; since our
 *     pause lives on single tap, accidental unlikes are unlikely enough to
 *     allow the toggle.)
 *   - Like/unlike animations modelled on the two canonical patterns:
 *     LIKE = Instagram's big overlay heart (spring in with a random slight
 *     tilt, hold, drift up and fade) + Twitter's celebration burst (an
 *     expanding ring that dissolves into particle dots). UNLIKE gets the
 *     conventional quiet exit: an outline heart that deflates and drops —
 *     celebration in, no ceremony out. The saved chip pulses on both.
 *   - Filter sheet redesigned: grabber handle, category as a grid of icon
 *     tiles with per-category meal counts (structure that says something),
 *     Show me as icon chips beneath with LIVE counts scoped to the selected
 *     category — so "Mains · Under 10 min" is knowable before tapping.
 *   - Macro numbers ROLL to their new values (~380ms ease-out count-up)
 *     whenever the plate, variant, or portions change — on the base card's
 *     macro line, the panel hero's calories, and the macro gauges' gram
 *     values. The stacked composition bar is GONE after device feedback (a
 *     kcal-scaled length stopped short of its container and read as broken):
 *     macros now render as three per-macro GAUGE rows on one shared gram
 *     scale — the largest gram value across every plate of the meal — so a
 *     partial fill reads as "room on the scale" and all three gauges move
 *     visibly on every plate switch. See useCountUp / CountText / MacroRows.
 *   - Tab bar HIDE-ON-PLAY (flagged, TAB_BAR_HIDE_ON_PLAY): once the active
 *     card's footage has played untouched for ~1.8s the overlaid bar fades
 *     away; pausing, the panel opening/closing, landing on a card without
 *     footage, reaching the end card, or leaving the screen brings it back.
 *     One screen-level coordinator writes cookTabBarOpacity (panel state +
 *     play state), so the two hiding reasons can't fight. Flip the flag to
 *     false for the always-visible convention the major feeds use.
 *   - New SMOOTHIES category. RESOLVED against NutritionHomeScreen: that
 *     screen's shelves derive from `cuisine`, with four leaf cuisines
 *     ('breakfast' / 'snack' / 'dessert' / 'smoothie') and Mains defined as
 *     everything else (the savoury dishes spread across australian, indian,
 *     mexican, italian, thai, …). Cook's categories now use the SAME rule
 *     (see matchesCategory), so the Cook filter and the Nutrition shelves
 *     can never disagree about where a meal lives. This also means one meal
 *     belongs to exactly one category, matching the Nutrition tab.
 *
 * PREVIOUS ROUND (kept):
 *   - Top title + macro line, no scrim, text-shadow legibility, site-hero
 *     stat treatment (bold numbers, muted units, middots)
 *   - Saved-state heart chip top right — a TAPPABLE save toggle (same toggle
 *     as a double tap; the chip pulse is its confirmation, no overlay heart
 *     for a button press). Its displayed state still under-reports on a
 *     fresh launch until hydration lands (see savedSlugs TODO). The
 *     "Double tap to save" hint pill is gone — with a visible save button
 *     the hidden gesture no longer needs a nudge.
 *   - Single tap waits DOUBLE_TAP_MS before pausing so a double tap never
 *     touches playback
 *   - Sound ON by default (Shorts/Reels convention);
 *     Audio.setAudioModeAsync playsInSilentModeIOS required on iOS. Because
 *     that bypasses the hardware silent switch, the card carries a feed-wide
 *     mute chip under the save chip — the only in-app way to silence it.
 *     The mode is applied IN FULL (FEED_AUDIO_MODE) and re-applied on focus,
 *     because the expo-av mode store is one global that TimerContext also
 *     writes; a partial mode inherits whatever ran last, which made mixing
 *     vs ducking with the user's music depend on session history.
 *   - Playback is gated on ONE value (screenActive): viewport position, screen
 *     focus, app state, and whether the panel or filter sheet is covering the
 *     feed. Anything that should stop audio belongs in that gate.
 *   - Panel: solid near-black surface, inset rounded plate hero below the
 *     notch, spring open/close, edge tab rides the panel, synced dim fade
 *   - Tab bar fades with the panel via the exported cookTabBarOpacity
 *
 * VIDEO PHASE 1: recipe videos stream from S3 and own the base card's media
 * layer. No files ship in the binary — MEAL_VIDEOS maps a meal slug to a URL.
 * Playback uses expo-av (already a dependency, so no EAS rebuild).
 *
 * THIN COVERAGE (the current reality: 1 video, 81 meals). A meal with no entry
 * falls back to its still from the image registry — contained, not covered,
 * so the whole dish is visible — drifting under a slow Ken Burns so the card
 * reads as a feed rather than a paused one. Cards WITH
 * footage carry a small play glyph; cards without carry nothing at all. The
 * filter sheet gains a "Has video" intent whose count is live, so the tab can
 * be honest about coverage without printing an apology on every other card.
 * All three are load-bearing only while coverage is thin — see the TODO on
 * VIDEOS_FIRST for the point at which this whole scaffold comes out.
 *
 * Current design:
 *   - Base layer: video (or drifting still, or tone) + top-anchored meal name
 *     + macro line
 *     (the selected plate's macros × portions). Nothing else — no buttons.
 *   - The side panel (swipe left or the edge tab) is the detail surface:
 *     inset plate-carousel hero card (arrows + tappable dots; arrows, not
 *     swipe — horizontal swipe stays reserved for the panel), coloured
 *     proportional macro bar, icon method cards, easy vs from-scratch
 *     variant toggle (persisted via variantChoices), portions stepper
 *     scaling calories AND amounts, and the composed ingredient list.
 *   - View full recipe is the panel's ONLY primary action; the funnel is
 *     Cook feed → RecipeDetail → its own start-cooking flow. Share is the
 *     one secondary action. Double tap likes/unlikes.
 *   - While the panel is open the pager is locked (scrollEnabled false).
 *   - Cooking steps deliberately never render here — RecipeDetail/cook mode
 *     is the destination.
 *   - Category pill (top left) opens the filter sheet (category + intent)
 *   - Explicit end-of-category card; never a silent loop
 *
 * Data: CURATED_MEALS from src/data/curated_meals. Categories derive from
 * `cuisine` (see matchesCategory), mirroring NutritionHomeScreen's shelves.
 * Defaults when the user hasn't chosen: plate = id 'standard' else
 * plates[0]; sauce variant = persisted choice, else is_default, else first;
 * method = methods[0].
 *
 * Navigator requirements (not this file's job):
 *   1. Overlay the tab bar on this route instead of hiding it:
 *        tabBarStyle: {
 *          position: 'absolute',
 *          backgroundColor: 'rgba(12,12,12,0.62)',
 *          borderTopWidth: 0,
 *        }
 *   2. CustomTabBar imports { cookTabBarOpacity } from this file and, when
 *      the focused route is Cook, wraps its bar in
 *        <Animated.View style={{ opacity: cookTabBarOpacity }}>
 *      That one line is the whole fade-with-panel behaviour. The value is
 *      reset to 1 on blur so leaving Cook with the panel open never strands
 *      the bar invisible on other tabs.
 * The footage still fills the whole window behind the bar. This screen reads
 * the overlaid bar's height via BottomTabBarHeightContext and falls back to
 * the raw bottom inset when rendered outside a tab navigator (e.g. a
 * standalone test shell), so both environments lay out correctly.
 *
 * Remaining integration seams are marked TODO(repo):
 */

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityActionEvent,
  Animated,
  AppState,
  AppStateStatus,
  Easing,
  FlatList,
  Image,
  ImageSourcePropType,
  ListRenderItemInfo,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  useWindowDimensions,
  View,
  ViewToken,
} from 'react-native';
import {
  Audio,
  AVPlaybackStatus,
  InterruptionModeAndroid,
  InterruptionModeIOS,
  ResizeMode,
  Video,
} from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
/* The raw context, not useBottomTabBarHeight(): the hook throws when no tab
 * navigator is above us (the standalone test shell), the context just returns
 * undefined. */
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { CuratedMeal, MealSlug } from '../types/curated_meals';
import { CURATED_MEALS } from '../data/curated_meals';
import { getMealImage } from '../assets/mealImages';
import { INGREDIENTS } from '../data/ingredients';
import { clampCookPortions } from '../utils/cookPortions';
import { displayIngredient } from '../utils/ingredientScaling';
import { getVariantChoices, setVariantChoice } from '../utils/variantChoices';
import { resolveBaseIngredients } from '../utils/resolveMealIngredients';
import { computePlateMacros } from '../utils/computeMacros';
import { RecipeFavorites } from '../utils/recipeFavorites';
import {
  VIDEO_BASE,
  fetchVideoTableIfStale,
  loadCachedVideoTable,
  sameVideoTable,
  type MealVideo,
  type VideoTable,
} from '../services/videoManifest';

/* Cook is a tab screen, but every destination it pushes (CookMode,
 * RecipeDetail, …) lives on the root stack, which the tab navigator is nested
 * in — so type against the root stack's param list. Type-only import, so no
 * runtime import cycle with AppNavigator (which imports this screen). */
type CookScreenNav = StackNavigationProp<RootStackParamList>;

/* Structural aliases via indexed access, so this file only depends on the
 * CuratedMeal name itself — whatever the sub-types are called in
 * types/curated_meals, this compiles as long as the fields match. */
type MealPlate = CuratedMeal['plates'][number];
type MealMethod = NonNullable<CuratedMeal['methods']>[number];
type MealIngredient = NonNullable<CuratedMeal['base_ingredients']>[number];

/* ────────────────────────────────────────────────────────────────────────────
 * Tab bar coordination
 *
 * CustomTabBar consumes this (see the navigator requirement in the header).
 * 1 = bar fully visible, 0 = hidden. This screen animates it when the side
 * panel opens/closes and hard-resets it to 1 on blur.
 * ──────────────────────────────────────────────────────────────────────────── */

export const cookTabBarOpacity = new Animated.Value(1);

/* ────────────────────────────────────────────────────────────────────────────
 * Video catalogue
 *
 * The whole video "database" for now: slug → hosted URL. Files live in S3
 * (ap-southeast-2, public read) and stream over HTTP range requests. Each MP4
 * is 720p vertical H.264 with the moov atom at the front (-movflags
 * +faststart), which is what lets playback start before the file finishes
 * downloading. Nothing is bundled.
 *
 * Adding a video no longer touches this file at all: encode, upload the mp4
 * and its poster, add two lines to manifest.json in the same S3 prefix, done.
 * No build, no submission, no review. The table below is only the fallback
 * for when that manifest cannot be reached — see services/videoManifest.
 *
 * TODO(repo): once this passes a handful of entries, move it out of the app
 * entirely — a videos.json in the same bucket, fetched on launch and cached,
 * so new footage ships without an app release.
 * ──────────────────────────────────────────────────────────────────────────── */

/* VIDEO_BASE and MealVideo now live in services/videoManifest, so the bucket
 * is named in exactly one place and the wire format and the screen cannot
 * drift apart. */

/* Keyed by MealSlug, not string: the table is hand-edited every time footage
 * lands, and a typo'd key is otherwise invisible — the meal just silently
 * keeps its tone card and nobody notices until someone goes looking for the
 * video on device. Partial because coverage is (and will long remain) a small
 * subset of the catalogue.
 *
 * THIS TABLE IS NOW THE FLOOR, NOT THE WHOLE TRUTH. The live list comes from
 * manifest.json on S3 (services/videoManifest), which is merged OVER this one
 * so that uploading footage costs no release. Entries here are what the app
 * falls back to when the manifest cannot be fetched or parsed — a cold install
 * on a plane still plays whatever shipped in the binary. Keep butter_chicken
 * here for exactly that reason; there is no need to add future videos to it.
 *
 * HEADS UP — this annotation does NOT currently catch a typo. MealSlug ends
 * in `| (string & {})` (types/curated_meals.ts:90, a deliberate escape hatch
 * for test fixtures and future slugs), which makes the union absorb every
 * string, so Record<MealSlug, …> accepts any key. Verified: a deliberately
 * misspelled key compiles clean. The annotation is kept because it documents
 * intent and starts biting for free the day that union is tightened, but
 * until then a typo is only catchable by a test asserting every key of this
 * table exists in CURATED_MEALS. */
const MEAL_VIDEOS: Partial<Record<MealSlug, MealVideo>> = {
  butter_chicken: {
    video: `${VIDEO_BASE}/butter_chicken.mp4`,
    poster: `${VIDEO_BASE}/butter_chicken.jpg`,
  },
  /* Encoded and ready to upload:
   * mango_mass:                 { video: `${VIDEO_BASE}/mango_mass.mp4` },
   * turkey_meatballs_spaghetti: { video: `${VIDEO_BASE}/turkey_meatballs_spaghetti.mp4` }, */
};

/* Module-scope overlay rather than context or a prop: mealVideo() is called
 * from memo bodies, from a referentially-stable viewability callback and from
 * deep inside the card, and threading a table through all of those would be a
 * far bigger change than the feature warrants. The cost is that mutating it is
 * invisible to React, so every read site is paired with videoTableVersion in
 * its dependency array and the screen bumps that counter when — and only
 * when — it is safe to reorder. */
let REMOTE_VIDEOS: VideoTable = {};

function setRemoteVideos(table: VideoTable): void {
  REMOTE_VIDEOS = table;
}

function remoteVideos(): VideoTable {
  return REMOTE_VIDEOS;
}

/** Remote first, bundled second. The remote table can add a meal or replace a
 *  bundled entry, but a meal absent from the manifest keeps whatever shipped,
 *  so a manifest that loses an entry can never take footage away. */
function mealVideo(slug: MealSlug): MealVideo | undefined {
  return REMOTE_VIDEOS[slug] ?? MEAL_VIDEOS[slug];
}

/* ────────────────────────────────────────────────────────────────────────────
 * Constants
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The audio mode this feed needs, declared IN FULL.
 *
 * Every key is listed on purpose. expo-av's setAudioModeAsync fills any key
 * you omit from the last full mode it saw (_populateMissingKeys against
 * getCurrentAudioMode, src/Audio.ts:9-20), NOT from expo-av's own defaults —
 * and that cache is one global, last-writer-wins, with three writers in this
 * app: here, CookTimerContext, and TimerContext's COUNTDOWN_AUDIO_MODE.
 *
 * This screen previously passed { playsInSilentModeIOS: true } alone, which
 * made its behaviour depend on session history: open Cook first after launch
 * and interruptionModeIOS inherited expo-av's default of MixWithOthers, so an
 * unmuted recipe video played ON TOP of the user's music at full volume. Do a
 * workout first and TimerContext had already cached DuckOthers, so the music
 * ducked instead. Same build, same user, different behaviour.
 *
 * These values are deliberately identical to TimerContext's
 * COUNTDOWN_AUDIO_MODE, so whichever writes last, the result is the same.
 * Read the long comment above that constant before changing anything here —
 * it traces the expo-av 16.0.8 internals this depends on, and it names the
 * shared-module refactor that would delete both copies.
 *
 * TODO(repo): that refactor. One exported mode constant consumed by
 * TimerContext, CookTimerContext and this screen makes the invariant true at
 * the source instead of defending it in three places. Left undone here
 * because it reaches into two other features' files.
 *
 * staysActiveInBackground: false is asserted rather than inherited. It is what
 * makes expo-av stop playback natively when the app backgrounds, and nothing
 * previously stated that dependency.
 */
const FEED_AUDIO_MODE = {
  allowsRecordingIOS: false,
  staysActiveInBackground: false,
  interruptionModeIOS: InterruptionModeIOS.DuckOthers,
  playsInSilentModeIOS: true,
  shouldDuckAndroid: true,
  interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
  playThroughEarpieceAndroid: false,
} as const;

/** Video is live. Kept as a flag so playback can be killed from one place if
 *  streaming misbehaves in the wild. */
const VIDEO_ENABLED = true;

/** Meals with footage sort to the front of every filtered list. With a handful
 *  of videos against 81 meals, burying them behind 30 photo cards would mean
 *  nobody ever sees one. Remove this once coverage is broad.
 *  TODO(repo): at ~20 videos, drop this partition, the play-glyph marker and
 *  the 'video' intent together — once footage is the norm, marking it is
 *  noise and pinning it to the front distorts the feed. */
const VIDEOS_FIRST = true;

const PRELOAD_AHEAD_IOS = 2;
const PRELOAD_AHEAD_ANDROID = 1;
const PRELOAD_AHEAD =
  Platform.OS === 'ios' ? PRELOAD_AHEAD_IOS : PRELOAD_AHEAD_ANDROID;

/** Must be module-level, not an inline literal: FlatList captures this once and
 *  throws "Changing viewabilityConfig on the fly is not supported" if the
 *  identity changes between renders. */
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

/** TODO(repo): these two mirror the picker screen's helpers. Move the
 *  originals into a shared module and import them in both screens; the
 *  composed ingredient count below should reconcile with the picker's
 *  ingredientCount helper. */
const INGREDIENT_WARN_AT = 11;
const QUICK_MAX_ACTIVE_MINUTES = 10;
const HEAT_EQUIPMENT = ['stovetop', 'oven', 'slow_cooker', 'microwave'];

const PANEL_WIDTH = 280;
const SWIPE_TRIGGER_DX = 48;
const DOUBLE_TAP_MS = 300;

/** Horizontal inset of the title block. The title sits on its own band below
 *  the pill/chip row, so this is plain side margin, not collision dodging. */
const TITLE_SIDE_INSET = 20;

/** Tab bar hide-on-play. When true, the overlaid tab bar fades out once the
 *  active card's video has played untouched for the grace period, and comes
 *  straight back when the person pauses (the "chrome on pause" video-player
 *  convention), lands on a card without footage, opens/closes the panel, or
 *  leaves the screen. The grace period stops the bar vanishing the instant a
 *  card arrives, which read as jumpy. Shipped as a flag because the major
 *  feeds (TikTok/Reels/Shorts) deliberately keep their bars up for
 *  wayfinding — flip to false to fall back to always-visible. */
const TAB_BAR_HIDE_ON_PLAY = true;
const TAB_BAR_HIDE_DELAY_MS = 1800;

export type CookCategory =
  | 'breakfast'
  | 'mains'
  | 'smoothies'
  | 'snacks'
  | 'dessert';

const CATEGORIES: CookCategory[] = [
  'breakfast',
  'mains',
  'smoothies',
  'snacks',
  'dessert',
];
const CATEGORY_LABEL: Record<CookCategory, string> = {
  breakfast: 'Breakfast',
  mains: 'Mains',
  smoothies: 'Smoothies',
  snacks: 'Snacks',
  dessert: 'Dessert',
};
const CATEGORY_ICON: Record<CookCategory, keyof typeof Ionicons.glyphMap> = {
  breakfast: 'sunny-outline',
  mains: 'restaurant-outline',
  smoothies: 'cafe-outline',
  snacks: 'nutrition-outline',
  dessert: 'ice-cream-outline',
};

/** Categories derive from `cuisine`, EXACTLY mirroring NutritionHomeScreen's
 *  shelves: the four leaf cuisines map 1:1 onto chips, and Mains is
 *  everything else — the savoury dishes spread across australian, indian,
 *  mexican, italian, thai, and any cuisine added later. One shared rule
 *  means the Cook filter and the Nutrition shelves can never disagree about
 *  where a meal lives, and each meal belongs to exactly one category.
 *  TODO(repo): NutritionHomeScreen hardcodes the same LEAF set — extract
 *  this to a shared util (e.g. src/utils/mealCategories) and import it in
 *  both screens so a fifth leaf cuisine can't drift them apart. */
const LEAF_CUISINES = new Set(['breakfast', 'snack', 'dessert', 'smoothie']);
const CATEGORY_CUISINE: Record<Exclude<CookCategory, 'mains'>, string> = {
  breakfast: 'breakfast',
  smoothies: 'smoothie',
  snacks: 'snack',
  dessert: 'dessert',
};

function matchesCategory(meal: CuratedMeal, category: CookCategory): boolean {
  if (category === 'mains') return !LEAF_CUISINES.has(meal.cuisine);
  return meal.cuisine === CATEGORY_CUISINE[category];
}

type IntentFilter = 'fits' | 'quick' | 'nocook' | 'few' | 'saved' | 'video';
const INTENT_LABEL: Record<IntentFilter, string> = {
  fits: 'Fits your day',
  quick: 'Under 10 min',
  nocook: 'No cook',
  few: '5 ingredients or fewer',
  saved: 'Saved',
  video: 'Has video',
};
const INTENT_ICON: Record<IntentFilter, keyof typeof Ionicons.glyphMap> = {
  fits: 'today-outline',
  quick: 'timer-outline',
  nocook: 'snow-outline',
  few: 'list-outline',
  saved: 'heart-outline',
  video: 'play-circle-outline',
};

/** TODO(repo): swap for the app's theme tokens. */
const C = {
  bg: '#161615',
  text: '#F5F3EE',
  sub: '#C9C7C2',
  faint: '#8A8880',
  overlay: 'rgba(20,20,20,0.5)',
  /* Solid near-black, not translucent grey: the food photography is shot on
   * black, so the panel surface has to sit in the same register or every
   * image edge shows. */
  panel: '#111110',
  panelEdge: '#26261F',
  heroBacking: '#0C0C0B',
  hairline: '#33332F',
  outline: '#3A3A38',
  cta: '#E8E6E1',
  ctaText: '#161615',
  saved: '#F0997B',
  savedOutline: '#5A4038',
  amber: '#FAD9A0',
  selectedBg: 'rgba(232,230,225,0.06)',
};

/** Macro bar colours — protein green, carbs amber, fat coral. Distinct on
 *  the dark theme and readable at 8pt bar height.
 *  TODO(repo): swap for the app's canonical macro colours if the nutrition
 *  screens define them. */
const MACRO_COLORS = {
  protein: '#6FCF97',
  carbs: '#F2C94C',
  fat: '#EB7A5A',
};

/* ────────────────────────────────────────────────────────────────────────────
 * Data helpers — defaults and composition
 * ──────────────────────────────────────────────────────────────────────────── */

/** Meal-planning ADJUSTERS, not browsable meals. These four exist in the
 *  catalogue as near-pure macro dials the plan generator bolts onto a day to
 *  close a carb/fibre gap (see the ADJUSTERS table in utils/mealPlanPromptV2)
 *  — a serving of rice, a potato, a handful of berries, some steamed veg.
 *  They are legitimate rows for a meal plan, a shopping list, and the
 *  Foods-you-like picker, so they stay in CURATED_MEALS and stay on the
 *  Nutrition shelves. But this feed gives every entry a full-screen
 *  "Cook this" card, and a full-screen card for Berries is not a recipe.
 *  Scoped to this screen ON PURPOSE: no is_adjuster flag in the data, and no
 *  change to curatedShelves / NutritionHomeScreen, both of which want them.
 *  The MealSlug annotation is documentation only — see the note on
 *  MEAL_VIDEOS above for why it cannot fail the build. A renamed slug here
 *  silently un-hides a card, so this list needs test cover. */
const ADJUSTER_SLUGS: ReadonlySet<MealSlug> = new Set<MealSlug>([
  'steamed_rice',
  'steamed_mixed_veg',
  'baked_potato',
  'berries',
]);

const MEALS: CuratedMeal[] = Object.values(CURATED_MEALS).filter(
  (m) => !ADJUSTER_SLUGS.has(m.slug),
);

/** Default plate: the 'standard' plate when present, else the first. Index is
 *  what CookMode's plateIndex expects. */
function defaultPlateIndex(meal: CuratedMeal): number {
  const i = meal.plates.findIndex((p) => p.id === 'standard');
  return i >= 0 ? i : 0;
}

/** Default sauce variant: is_default when flagged, else the first. The panel
 *  starts here; the easy/from-scratch toggle moves off it. */
function defaultVariant(meal: CuratedMeal) {
  const variants = meal.sauce_variants;
  if (!variants || variants.length === 0) return undefined;
  return variants.find((v) => v.is_default) ?? variants[0];
}

function defaultVariantIndex(meal: CuratedMeal): number {
  const variants = meal.sauce_variants;
  if (!variants || variants.length === 0) return 0;
  const i = variants.findIndex((v) => v.is_default);
  return i >= 0 ? i : 0;
}

function defaultMethod(meal: CuratedMeal): MealMethod | undefined {
  return meal.methods?.[0];
}

/** Active minutes advertised on the default experience: the default method's
 *  active time, else the default plate's assembly time (no-method meals like
 *  smoothies), else 0. */
function activeMinutes(meal: CuratedMeal): number {
  const method = defaultMethod(meal);
  if (method) return method.time_active_minutes;
  const plate = meal.plates[defaultPlateIndex(meal)];
  return plate.assembly_time_minutes ?? 0;
}

/** No-cook: no method at all, or the default method needs no heat appliance.
 *
 *  equipment_required is OPTIONAL on CookingMethod and is genuinely absent on
 *  17 catalogue meals — dereferencing it unguarded threw
 *  "Cannot read properties of undefined (reading 'some')" during render for
 *  every category containing one (All / Snacks / Dessert), because
 *  intentCounts below runs this over the whole category on every render, not
 *  just when the No-cook chip is selected. strictNullChecks is off in this
 *  project, so the compiler never flagged it.
 *
 *  A method that declares no equipment declares no heat, so absent is treated
 *  as the empty list — same answer the field would give if authored as [].
 *
 *  Exported ONLY so utils/__tests__/cookFeedGuards.test.ts can run the real
 *  predicate over the whole catalogue as a regression guard for that crash.
 *  Nothing in the app imports it; the screen's other helpers stay private. */
export function isNoCook(meal: CuratedMeal): boolean {
  const method = defaultMethod(meal);
  if (!method) return true;
  const equipment = method.equipment_required ?? [];
  return !equipment.some((e) => HEAT_EQUIPMENT.includes(e));
}

/** One row of the composed list. producesServings is what displayIngredient
 *  must divide by: the meal's batch size for base and variant rows, but 1 for
 *  plate rows, which are stored per-serving already (per the wiring report —
 *  the old code divided burger buns by the batch size). */
interface IngredientRow {
  ingredient: MealIngredient;
  producesServings: number;
}

/** The composed ingredient list for a plate: the app's own resolver for the
 *  base recipe (legacy meals carry ingredients on the method; template meals
 *  surface base + the selected sauce variant) + the plate's additions. Base
 *  rows are batch-sized; plate rows are stored per-serving — exactly what
 *  RecipeDetail's IngredientRow contract expects. */
function composedIngredients(
  meal: CuratedMeal,
  plate: MealPlate,
  methodId: string,
  variantId?: string,
): IngredientRow[] {
  const batch = meal.produces_servings;
  return [
    ...resolveBaseIngredients(meal, { methodId, variantId }).map(
      (ingredient) => ({ ingredient, producesServings: batch }),
    ),
    ...(plate.additional_ingredients ?? []).map((ingredient) => ({
      ingredient,
      producesServings: 1,
    })),
  ];
}

function composedIngredientCount(meal: CuratedMeal): number {
  return composedIngredients(
    meal,
    meal.plates[defaultPlateIndex(meal)],
    defaultMethod(meal)?.id ?? '',
    defaultVariant(meal)?.id,
  ).length;
}

/** Real name from the ingredients table, with a prettified id as the miss
 *  fallback (RecipeDetail falls back to the raw id; prettified is kinder). */
function ingredientDisplayName(ingredientId: string): string {
  const known = INGREDIENTS[ingredientId as keyof typeof INGREDIENTS];
  if (known?.display_name) return known.display_name;
  const words = ingredientId.split('_').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/* ── INTEGRATION STATUS ─────────────────────────────────────────────────────
 * Wired to the real app utilities per the repo report:
 *   getMealImage (src/assets/mealImages, keyed by image_filename, returns
 *   require refs), INGREDIENTS, displayIngredient (object args; plate rows
 *   pass producesServings 1), clampCookPortions (1–20), and the async
 *   getVariantChoices/setVariantChoice persistence.
 * Still local on purpose: methodIcon (RecipeDetail's getMethodIcon is
 * module-private — TODO(repo): extract it to a shared util and delete this),
 * plus the analytics, GoalsProfile, and saved-meals hydration seams below.
 * ────────────────────────────────────────────────────────────────────────── */

/** Plate-first image resolution, matching RecipeDetail: the registry returns
 *  a require() module ref, so it goes straight into <Image source>. */
function resolveMealImage(filename?: string): ImageSourcePropType | null {
  return (getMealImage(filename) as ImageSourcePropType | undefined) ?? null;
}

/** Mirrors RecipeDetail's module-private getMethodIcon (substring chain) so
 *  both screens show identical iconography.
 *  TODO(repo): extract that function to a shared util and delete this copy. */
function methodIcon(methodId: string): keyof typeof Ionicons.glyphMap {
  const id = methodId.toLowerCase();
  if (id.includes('slow_cooker')) return 'time-outline';
  if (id.includes('pressure_cooker') || id.includes('instant_pot')) {
    return 'flash-outline';
  }
  if (id.includes('oven')) return 'bonfire-outline';
  if (id.includes('jar') || id.includes('shortcut')) return 'flask-outline';
  if (id.includes('blender') || id.includes('smoothie')) return 'cafe-outline';
  if (id.includes('stovetop') || id.includes('pan') || id.includes('fry')) {
    return 'flame-outline';
  }
  return 'restaurant-outline';
}

/** Amount string via the app's own scaler, so rounding and unit rules match
 *  RecipeDetail exactly (including its handling of fixed-scaling rows). */
function portionAmount(row: IngredientRow, portions: number): string {
  return displayIngredient({
    baseAmount: row.ingredient.base_amount,
    unit: row.ingredient.unit,
    producesServings: row.producesServings,
    portions,
  });
}

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

/** Slack on the min_scale comparison below. maxFactor is a quotient, so a
 *  budget of exactly (plate × min_scale) does not reliably reproduce
 *  min_scale: pulled_pork (772 kcal, 47.9g protein, min_scale 0.7) comes back
 *  as 0.6999999999999998 and failed its own boundary. A scale-factor
 *  difference of 1e-9 is far below anything the portions stepper or the macro
 *  rounding can express, so this only ever absorbs float error. */
const SCALE_EPSILON = 1e-9;

/** A meal "fits your day" when some legal scale factor lands its DEFAULT
 *  plate inside the remaining calories AND protein: the largest factor that
 *  fits both budgets must still be at or above min_scale.
 *  TODO(repo): confirm this predicate against GoalsProfile semantics. */
function fitsRemaining(
  meal: CuratedMeal,
  remaining: { kcal: number; protein: number },
): boolean {
  const macros = meal.plates[defaultPlateIndex(meal)].plate_macros;
  const maxFactor = Math.min(
    remaining.kcal / macros.kcal,
    remaining.protein / macros.protein_g,
  );
  return maxFactor >= meal.min_scale - SCALE_EPSILON;
}

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
  /* Height of the translucent tab bar overlaid on this route (it already
   * includes the bottom safe area). undefined outside a tab navigator, so
   * fall back to clearing the raw inset. Cards stay full-window height —
   * the bar floats over the footage, content just anchors above it. */
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const bottomClearance = Math.max(tabBarHeight, insets.bottom);
  const navigation = useNavigation<CookScreenNav>();

  const remaining = useRemainingToday();

  const [category, setCategory] = useState<CookCategory | null>('mains');
  const [intent, setIntent] = useState<IntentFilter | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  /* Measured, not assumed: the pill's height depends on the font, and the
   * title band on every card is positioned directly below it. */
  const [pillHeight, setPillHeight] = useState(0);
  /* Saved meals. TODAY: only this session's double-tap likes land here, so
   * the heart indicator and the Saved filter under-report on a fresh launch.
   * Nutrition-side picture (per NutritionHomeScreen): favourite MEALS are the
   * RecipeFavorites per-plate store, surfaced via the Saved pill →
   * SavedNutrition screen (saved meal PLANS are a separate WorkoutStorage
   * concept — not this). So the write path here is already correct; what's
   * missing is read: TODO(repo): hydrate on focus from RecipeFavorites once
   * its list-all API is known (a meal counts as saved when ANY of its plates
   * is favourited — SavedNutrition's definition). isPlateFavorite-only would
   * mean ~200 per-plate reads on mount, so wire the list call instead. */
  const [savedSlugs, setSavedSlugs] = useState<ReadonlySet<string>>(new Set());
  /* Which card is on screen. Only that card's video plays; everything else is
   * paused, so scrolling never leaves audio or decoders running behind you. */
  const [activeIndex, setActiveIndex] = useState(0);
  /* Bumped whenever the remote video table is swapped in. Nothing reads its
   * value — it exists purely to invalidate the memos below, since mealVideo()
   * reads module scope that React cannot observe. */
  const [videoTableVersion, setVideoTableVersion] = useState(0);

  /* Declared up here with the state it drives, not down with the fetch: the
   * stable-ref mirror further below assigns it DURING render, so it has to
   * exist by then. */
  const pendingVideosRef = useRef<VideoTable | null>(null);

  const applyPendingVideos = useCallback(() => {
    const pending = pendingVideosRef.current;
    if (!pending) return;
    pendingVideosRef.current = null;
    setRemoteVideos(pending);
    setVideoTableVersion((v) => v + 1);
  }, []);
  /* Feed-wide mute, deliberately NOT per card: muting is a statement about the
   * room you are in, not about one recipe, so it has to survive scrolling. On
   * iOS the hardware silent switch is bypassed by design (playsInSilentModeIOS
   * — sound is the point of a recipe feed), which makes this the only in-app
   * way to shut the feed up. Session-only; nothing persists it. */
  const [muted, setMuted] = useState(false);
  /* Reads `muted` directly rather than using the updater form: an updater must
   * stay pure, and this call site has a tracking event attached. */
  const toggleMute = useCallback(() => {
    track('cook_action', { action: muted ? 'unmute' : 'mute' });
    setMuted(!muted);
  }, [muted]);
  /* True while any card's panel is open. Locks the pager: no paging under an
   * open panel, and the panel's own ScrollView gets vertical gestures
   * uncontested (the on-device unscrollable-ingredients bug). */
  const [panelLocked, setPanelLocked] = useState(false);
  /* Whether the ACTIVE card is currently playing footage. Cards report up;
   * a deactivating card reports false via its effect cleanup. */
  const [activePlaying, setActivePlaying] = useState(false);
  const handlePlayingChange = useCallback((playing: boolean) => {
    setActivePlaying(playing);
  }, []);

  /* The ONE writer for the tab bar's opacity: hidden while a panel is open,
   * and (behind TAB_BAR_HIDE_ON_PLAY) once the active card's video has been
   * playing for the grace period. Pausing, closing the panel, or landing on
   * a card without footage brings it straight back. */
  const [barHidden, setBarHidden] = useState(false);
  useEffect(() => {
    if (panelLocked) {
      setBarHidden(true);
      return undefined;
    }
    if (TAB_BAR_HIDE_ON_PLAY && activePlaying) {
      const t = setTimeout(() => setBarHidden(true), TAB_BAR_HIDE_DELAY_MS);
      return () => clearTimeout(t);
    }
    setBarHidden(false);
    return undefined;
  }, [panelLocked, activePlaying]);
  useEffect(() => {
    Animated.timing(cookTabBarOpacity, {
      toValue: barHidden ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [barHidden]);
  /* Persisted jar/scratch choices (slug → variantId), loaded once. Cards
   * initialise from this and write through setVariantChoice on selection,
   * matching RecipeDetail's persistence. */
  const [variantChoices, setVariantChoicesState] = useState<Record<
    string,
    string
  > | null>(null);
  useEffect(() => {
    let alive = true;
    getVariantChoices()
      .then((c) => {
        if (alive) setVariantChoicesState(c);
      })
      .catch(() => {
        if (alive) setVariantChoicesState({});
      });
    return () => {
      alive = false;
    };
  }, []);

  /* Playback gate. Scroll position alone is not enough: a card that is still
   * the active index keeps its video (and its AUDIO) running when you switch
   * tabs or background the app. Focus and app state are the other two halves —
   * 'inactive' (iOS app switcher, incoming call) counts as backgrounded, since
   * audible playback under the switcher is the same bug. */
  const isFocused = useIsFocused();
  const [appActive, setAppActive] = useState(
    () => AppState.currentState === 'active',
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      setAppActive(next === 'active');
    });
    return () => sub.remove();
  }, []);
  /* ...and neither is foreground alone. An open side panel or filter sheet
   * covers the feed with something the person is reading, and a raw RN Modal
   * is not a navigation event — useIsFocused stays true underneath it — so
   * both have to be folded in here rather than gated separately. One gate, so
   * there is exactly one answer to "should this card be playing". */
  const screenActive = isFocused && appActive && !panelLocked && !sheetOpen;

  /* Sound is ON by default (Shorts/Reels convention). Without this audio
   * mode, iOS devices with the ringer switch on silent play video with no
   * sound at all, which reads as broken rather than muted.
   *
   * Applied on focus, not once on mount: the mode store is global and
   * last-writer-wins, and TimerContext rewrites it before every countdown
   * beep. A mount-only call would be silently overwritten by the first rest
   * timer of the session and never restored. Re-applying on focus makes
   * Cook's behaviour independent of what else ran first. */
  useEffect(() => {
    if (!isFocused) return;
    /* Spread, never the constant itself — expo-av's _populateMissingKeys
     * MUTATES the object it is handed, so passing FEED_AUDIO_MODE directly
     * would let it write into shared module state. */
    Audio.setAudioModeAsync({ ...FEED_AUDIO_MODE }).catch((e) => {
      /* Not swallowed: if this rejects, video plays with NO sound at all on a
       * silent-switched iPhone, and the screen looks broken with no clue why. */
      if (__DEV__) console.warn('[cook] setAudioModeAsync failed', e);
      track('cook_audio_mode_error');
    });
  }, [isFocused]);

  const listRef = useRef<FlatList<Row>>(null);
  const lastIndexRef = useRef(0);
  const dwellRef = useRef<{ slug: string; since: number } | null>(null);

  /* Per-category meal counts for the filter sheet tiles. Static data, so
   * computed once. */
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: MEALS.length };
    for (const c of CATEGORIES) {
      counts[c] = MEALS.filter((m) => matchesCategory(m, c)).length;
    }
    return counts as Record<'all' | CookCategory, number>;
  }, []);

  /* Per-intent counts for the Show me chips, scoped to the SELECTED category
   * so the numbers answer the actual question ("how many quick mains?"),
   * updating live as the category changes. */
  const intentCounts = useMemo<Record<IntentFilter, number>>(() => {
    const base = MEALS.filter((m) => !category || matchesCategory(m, category));
    return {
      fits: remaining
        ? base.filter((m) => fitsRemaining(m, remaining)).length
        : 0,
      quick: base.filter((m) => activeMinutes(m) <= QUICK_MAX_ACTIVE_MINUTES)
        .length,
      nocook: base.filter(isNoCook).length,
      few: base.filter((m) => composedIngredientCount(m) <= 5).length,
      saved: base.filter((m) => savedSlugs.has(m.slug)).length,
      /* Deliberately a live count and not a promise: it reads 1 today and
       * climbs on its own as slugs land in MEAL_VIDEOS, so the chip never
       * advertises footage that hasn't been uploaded. */
      video: base.filter((m) => !!mealVideo(m.slug)).length,
    };
    /* videoTableVersion is intentionally an unused dependency: mealVideo()
     * reads a module-scope overlay, so this is the only thing tying the count
     * to the manifest arriving. */
  }, [category, remaining, savedSlugs, videoTableVersion]);

  const filtered = useMemo(() => {
    const list = MEALS.filter((m) => {
      if (category && !matchesCategory(m, category)) return false;
      switch (intent) {
        case 'fits':
          return remaining ? fitsRemaining(m, remaining) : true;
        case 'quick':
          return activeMinutes(m) <= QUICK_MAX_ACTIVE_MINUTES;
        case 'nocook':
          return isNoCook(m);
        case 'few':
          return composedIngredientCount(m) <= 5;
        case 'saved':
          return savedSlugs.has(m.slug);
        case 'video':
          return !!mealVideo(m.slug);
        default:
          return true;
      }
    });
    if (!VIDEOS_FIRST) return list;
    /* Stable partition, not a sort: everything with footage keeps its relative
     * order at the front, everything else keeps its order behind. */
    const withVideo = list.filter((m) => mealVideo(m.slug));
    if (withVideo.length === 0) return list;
    return [...withVideo, ...list.filter((m) => !mealVideo(m.slug))];
    /* See the note on intentCounts: videoTableVersion is what makes VIDEOS_FIRST
     * re-partition once new footage is known about. */
  }, [category, intent, remaining, savedSlugs, videoTableVersion]);

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
    setActiveIndex(0);
  }, [category, intent]);

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

  /* Screen view + dwell flush on blur. category/intent live in refs so the
   * event reports the CURRENT filters without this effect re-running (and
   * re-firing the view event) every time a chip changes. */
  const categoryRef = useRef(category);
  categoryRef.current = category;
  const intentRef = useRef(intent);
  intentRef.current = intent;

  useFocusEffect(
    useCallback(() => {
      track('cook_screen_view', {
        category: categoryRef.current,
        intent: intentRef.current,
      });
      return () => {
        flushDwell();
        /* Never strand the tab bar hidden on other tabs if the user leaves
         * Cook while a panel is open. */
        cookTabBarOpacity.setValue(1);
      };
    }, [flushDwell]),
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const visible = viewableItems.find(
        (v) => v.isViewable && (v.item as Row).kind === 'meal',
      );
      if (!visible) {
        /* Only the end card is on screen: deactivate everything so the last
         * video (and its audio) stops instead of playing on underneath the
         * end card — and the tab bar comes back. Guard against transient
         * empty callbacks. */
        if (viewableItems.some((v) => v.isViewable)) {
          flushDwellRef.current();
          setActiveIndex(-1);
        }
        return;
      }
      const row = visible.item as Extract<Row, { kind: 'meal' }>;
      const index = visible.index ?? 0;

      /* setState from useState is stable, so capturing it in this once-created
       * ref callback is safe. */
      setActiveIndex(index);
      activeIndexRef.current = index;
      /* Back at the top: a reorder here cannot move a card out from under the
       * user, so this is the moment to swap in a manifest that arrived while
       * they were scrolling. */
      if (index === 0) applyPendingVideosRef.current();

      flushDwellRef.current();
      dwellRef.current = { slug: row.meal.slug, since: Date.now() };
      track('cook_card_impression', { slug: row.meal.slug, index });

      /* Preload ahead of the scroll direction only. */
      const direction = index >= lastIndexRef.current ? 1 : -1;
      lastIndexRef.current = index;
      for (let i = 1; i <= PRELOAD_AHEAD; i += 1) {
        const next = rowsRef.current[index + direction * i];
        if (next && next.kind === 'meal') {
          const poster = mealVideo(next.meal.slug)?.poster;
          if (poster) Image.prefetch(poster).catch(() => undefined);
        }
      }
    },
  ).current;

  /* onViewableItemsChanged must stay referentially stable; read through refs. */
  const activeIndexRef = useRef(0);
  const applyPendingVideosRef = useRef(applyPendingVideos);
  applyPendingVideosRef.current = applyPendingVideos;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const flushDwellRef = useRef(flushDwell);
  flushDwellRef.current = flushDwell;

  /* View full recipe is the screen's conversion action — the funnel runs
   * Cook feed → RecipeDetail → its own start-cooking flow. Dwell flushes here
   * because this is where the person leaves the feed. Portions carry through
   * as servings so RecipeDetail opens at the amount configured here; the
   * jar/scratch choice carries via the shared variantChoices persistence. */
  const openRecipe = useCallback(
    (meal: CuratedMeal, plate: MealPlate, portions: number) => {
      track('cook_action', {
        action: 'view_recipe',
        slug: meal.slug,
        plateId: plate.id,
        portions,
      });
      flushDwell();
      navigation.navigate('RecipeDetail', {
        mealSlug: meal.slug,
        plateId: plate.id,
        servings: portions,
      });
    },
    [navigation, flushDwell],
  );

  /* Double-tap like/unlike — a TRUE TOGGLE now that double tap is also the
   * unsave affordance. Writes through to the same per-plate favourites
   * RecipeDetail's heart uses.
   * NOTE: favourites are per plate while the feed's saved state is per meal;
   * unliking toggles the CURRENTLY SELECTED plate, which can differ from the
   * plate originally liked. TODO(repo): resolve alongside the Nutrition
   * saved-meals linkage. */
  const toggleSave = useCallback((meal: CuratedMeal, plateId: string) => {
    setSavedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(meal.slug)) next.delete(meal.slug);
      else next.add(meal.slug);
      return next;
    });
    track('cook_action', { action: 'toggle_save', slug: meal.slug, plateId });
    RecipeFavorites.togglePlateFavorite(meal.slug, plateId).catch(
      () => undefined,
    );
  }, []);

  /* Same share payload as RecipeDetail: the static per-plate page with a real
   * og: card, URL in the iOS url field, appended for Android. */
  const shareMeal = useCallback((meal: CuratedMeal, plate: MealPlate) => {
    track('cook_action', { action: 'share', slug: meal.slug, plateId: plate.id });
    const url = `https://json.fit/r/${meal.slug}/${plate.id}/`;
    const caption = `${plate.display_name} — ${Math.round(plate.plate_macros.kcal)} cal, ${Math.round(plate.plate_macros.protein_g)}g protein`;
    Share.share(
      Platform.OS === 'ios'
        ? { message: caption, url }
        : { message: `${caption}\n\n${url}` },
    ).catch(() => undefined);
  }, []);

  /* Both setters flush any pending manifest first. Changing a filter rebuilds
   * the list from scratch, so a reorder is free here — and folding it into the
   * setters rather than wrapping them means every caller gets it, including
   * "clear filters" and the swipe-to-adjacent-category shortcut. */
  const selectCategory = useCallback(
    (next: CookCategory | null) => {
      applyPendingVideos();
      setCategory(next);
      track('cook_chip_select', { row: 'category', chip: next ?? 'all' });
    },
    [applyPendingVideos],
  );

  const selectIntent = useCallback(
    (next: IntentFilter | null) => {
      applyPendingVideos();
      setIntent(next);
      track('cook_chip_select', { row: 'intent', chip: next ?? 'none' });
    },
    [applyPendingVideos],
  );

  /* ──────────────────────────────────────────────────────────────────────
   * Remote video manifest
   *
   * Two-stage on purpose. The CACHED table is applied immediately: it is what
   * the last launch already saw, so applying it before the first card is on
   * screen reorders nothing the user has looked at. The NETWORK table is held
   * back, because VIDEOS_FIRST partitions the feed and the "Has video" chip
   * counts off the same lookup — swapping it in mid-scroll would slide the
   * list under the user's thumb while they are reading a card.
   *
   * Pending work is flushed only at a point where a reorder is invisible:
   * sitting on the first card, or changing a filter, which rebuilds the list
   * from scratch anyway.
   * ────────────────────────────────────────────────────────────────────── */
  /* Cache only. The network fetch lives in the focus effect below, which also
   * fires on mount — keeping both in here would mean two fetches racing on
   * every cold start. */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const cached = await loadCachedVideoTable();
      if (cancelled || !cached) return;
      if (sameVideoTable(cached, remoteVideos())) return;
      /* Applied straight away rather than staged: this is what the last launch
       * already showed, so there is nothing on screen for it to disturb. */
      setRemoteVideos(cached);
      setVideoTableVersion((v) => v + 1);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* Refetch on focus, throttled to once every 30 minutes inside the service.
   * Fires on mount too, so this is also the cold-start fetch.
   *
   * Focus rather than mount-only because the Cook screen can stay mounted for
   * days inside the tab navigator. Without this, someone who never fully quits
   * the app would keep whatever manifest they had at install and never see new
   * footage at all. */
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        const fresh = await fetchVideoTableIfStale();
        /* Null means either a failed fetch or a throttled one. Both are
         * handled identically: keep whatever is loaded — cached, or the
         * bundled floor — and try again on the next focus. */
        if (cancelled || !fresh) return;
        if (sameVideoTable(fresh, remoteVideos())) return;

        pendingVideosRef.current = fresh;
        /* Almost always true on a cold launch, so in practice the manifest is
         * live before the user has scrolled anywhere. Mid-session it usually
         * is not, and the pending table waits for the top of the feed or the
         * next filter change. */
        if (activeIndexRef.current === 0) applyPendingVideos();
      })();

      return () => {
        cancelled = true;
      };
    }, [applyPendingVideos]),
  );



  const goToAdjacentCategory = useCallback(() => {
    const current = category ?? 'breakfast';
    const next =
      CATEGORIES[(CATEGORIES.indexOf(current) + 1) % CATEGORIES.length];
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
          bottomClearance={bottomClearance}
          topInset={insets.top}
          pillHeight={pillHeight}
          isActive={index === activeIndex && screenActive}
          isCardVisible={index === activeIndex}
          muted={muted}
          onToggleMute={toggleMute}
          saved={savedSlugs.has(item.meal.slug)}
          preferredVariantId={variantChoices?.[item.meal.slug]}
          onPlayingChange={handlePlayingChange}
          onPanelToggle={setPanelLocked}
          onOpenRecipe={openRecipe}
          onToggleSave={toggleSave}
          onShare={shareMeal}
          onPrev={() => scrollToIndex(Math.max(0, index - 1))}
          onNext={() => scrollToIndex(index + 1)}
        />
      );
    },
    [
      cardHeight,
      bottomClearance,
      insets.top,
      pillHeight,
      activeIndex,
      screenActive,
      muted,
      toggleMute,
      savedSlugs,
      variantChoices,
      category,
      handlePlayingChange,
      openRecipe,
      toggleSave,
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
        scrollEnabled={!panelLocked}
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

      {/* Category pill — persistent chrome, top left. */}
      <Pressable
        onPress={() => setSheetOpen(true)}
        style={[styles.categoryPill, { top: insets.top + 8 }]}
        onLayout={(e) => setPillHeight(e.nativeEvent.layout.height)}
        accessibilityRole="button"
        accessibilityLabel={`Filters. Showing ${
          category ? CATEGORY_LABEL[category] : 'all meals'
        }${intent ? `, ${INTENT_LABEL[intent]}` : ''}`}
      >
        <Text
          style={styles.categoryPillText}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
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
        counts={categoryCounts}
        intentCounts={intentCounts}
        showFits={remaining !== null}
        onSelectCategory={selectCategory}
        onSelectIntent={selectIntent}
        /* Deliberately insets.bottom, not bottomClearance: Modal renders above
         * the tab bar, so the sheet only needs to clear the home indicator. */
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
  /** Measured height of the screen-level category pill (onLayout, not
   *  assumed). The title band sits directly below the pill/chip row. */
  pillHeight: number;
  /** How much every bottom-anchored element must clear: the overlaid tab bar
   *  height when inside the tab navigator, else the bottom safe area inset. */
  bottomClearance: number;
  /** This card should be playing: it fills the viewport AND the screen is
   *  focused AND the app is foregrounded. Everything else stays paused. */
  isActive: boolean;
  /** Scroll position ONLY — this card fills the viewport, regardless of focus
   *  or app state. Distinct from isActive so that leaving the tab doesn't get
   *  mistaken for scrolling away and silently clear a manual pause. */
  isCardVisible: boolean;
  /** Feed-wide mute. Owned by the screen, not the card, so it survives
   *  scrolling between cards. */
  muted: boolean;
  onToggleMute: () => void;
  saved: boolean;
  /** Persisted variant choice for this meal (slug → variantId), if any. */
  preferredVariantId?: string;
  /** Reports whether this card is actively playing footage (only called
   *  while active; deactivation reports false via effect cleanup). */
  onPlayingChange: (playing: boolean) => void;
  onPanelToggle: (open: boolean) => void;
  onOpenRecipe: (meal: CuratedMeal, plate: MealPlate, portions: number) => void;
  onToggleSave: (meal: CuratedMeal, plateId: string) => void;
  onShare: (meal: CuratedMeal, plate: MealPlate) => void;
  onPrev: () => void;
  onNext: () => void;
}

/** Six particle dots for the like burst, precomputed unit vectors. */
const PARTICLE_ANGLES = [0, 60, 120, 180, 240, 300].map((deg) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: Math.cos(rad), y: Math.sin(rad) };
});

function MealCard(props: MealCardProps): React.JSX.Element {
  const {
    meal,
    height,
    topInset,
    pillHeight,
    bottomClearance,
    isActive,
    isCardVisible,
    muted,
    onToggleMute,
    saved,
    preferredVariantId,
    onPlayingChange,
    onPanelToggle,
    onOpenRecipe,
    onToggleSave,
    onShare,
    onPrev,
    onNext,
  } = props;

  /* The card's chooser state. Defaults advertise the standard experience;
   * the panel edits them. */
  const [plateIndex, setPlateIndex] = useState(() => defaultPlateIndex(meal));
  const [methodIndex, setMethodIndex] = useState(0);
  const [variantIndex, setVariantIndex] = useState(() =>
    defaultVariantIndex(meal),
  );
  const [portions, setPortions] = useState(1);
  /* Manual pause via single tap. Orthogonal to isActive (viewport + focus +
   * app state) — a card plays only when it's active AND not hand-paused. */
  const [paused, setPaused] = useState(false);
  const plate = meal.plates[plateIndex] ?? meal.plates[0];
  const selectedVariant = meal.sauce_variants?.[variantIndex];
  const currentMethod = meal.methods?.[methodIndex];
  const isDefaultVariant = !selectedVariant || !!selectedVariant.is_default;
  const video = mealVideo(meal.slug);
  /* The frozen plate_macros ARE the default variant's numbers (RecipeDetail's
   * contract), so the default path stays frozen; a non-default variant is
   * computed live via the same computePlateMacros RecipeDetail uses, rounded
   * app-style. */
  const macros = useMemo(() => {
    if (isDefaultVariant || !currentMethod) return plate.plate_macros;
    const round1 = (n: number) => Math.round(n * 10) / 10;
    const m = computePlateMacros(meal, plate, currentMethod, selectedVariant?.id);
    return {
      kcal: Math.round(m.kcal),
      protein_g: round1(m.protein_g),
      carbs_g: round1(m.carbs_g),
      fat_g: round1(m.fat_g),
      fiber_g: round1(m.fiber_g),
    };
  }, [isDefaultVariant, currentMethod, meal, plate, selectedVariant]);
  /* Largest single gram value across every plate of the meal — the ONE
   * shared scale all three macro gauges fill against, so rows stay
   * comparable with each other and the reference never moves as you flip
   * plates. Frozen plate_macros are close enough as the reference even when
   * a non-default variant recomputes live. */
  const maxPlateGrams = useMemo(
    () =>
      Math.max(
        ...meal.plates.flatMap((p) => [
          p.plate_macros.protein_g,
          p.plate_macros.carbs_g,
          p.plate_macros.fat_g,
        ]),
      ),
    [meal],
  );
  const extraActive = selectedVariant?.extra_active_minutes ?? 0;
  const extraTotal = selectedVariant?.extra_total_minutes ?? 0;

  /* Scrolling away clears a manual pause, so coming back to a card doesn't
   * strand it paused with no visible affordance to resume. Keyed on
   * isCardVisible, NOT isActive: leaving the tab or backgrounding the app also
   * drops isActive, and resetting on those would silently resume a card the
   * user hand-paused. A hand-pause survives a tab switch; only scrolling away
   * clears it. */
  useEffect(() => {
    if (!isCardVisible && paused) setPaused(false);
  }, [isCardVisible, paused]);

  /* Report play state up while this is the active card. Deactivation reports
   * false via the cleanup — React runs all cleanups before all effects in a
   * commit, so the handoff between an outgoing and incoming card always
   * lands in the right order. NOTE: a stream that errors into the tone
   * fallback still reports as playing — acceptable rounding. */
  const playing = VIDEO_ENABLED && !!video && !paused;
  useEffect(() => {
    if (!isActive) return undefined;
    onPlayingChange(playing);
    return () => onPlayingChange(false);
  }, [isActive, playing, onPlayingChange]);

  /* The persisted choice loads async, so it can land after mount. Adopt it
   * until the user touches the toggle themselves. */
  const variantTouchedRef = useRef(false);
  useEffect(() => {
    if (variantTouchedRef.current || !preferredVariantId) return;
    const variants = meal.sauce_variants;
    if (!variants) return;
    const i = variants.findIndex((v) => v.id === preferredVariantId);
    if (i >= 0) setVariantIndex(i);
  }, [preferredVariantId, meal.sauce_variants]);

  const selectVariant = useCallback(
    (index: number) => {
      variantTouchedRef.current = true;
      setVariantIndex(index);
      const v = meal.sauce_variants?.[index];
      if (v) {
        track('cook_action', {
          action: 'variant',
          slug: meal.slug,
          variantId: v.id,
        });
        setVariantChoice(meal.slug, v.id).catch(() => undefined);
      }
    },
    [meal],
  );

  const [panelOpen, setPanelOpen] = useState(false);
  const panelX = useRef(new Animated.Value(PANEL_WIDTH)).current;

  /* ── Like / unlike animation values ───────────────────────────────────── */
  /* LIKE: big heart springs in with a random slight tilt, holds, drifts up
   * and fades (Instagram), while a ring + six particle dots burst outward
   * (Twitter's celebration). UNLIKE: an outline heart deflates and drops —
   * quiet by convention. The saved chip pulses on both. */
  const likeProg = useRef(new Animated.Value(0)).current;
  const ringProg = useRef(new Animated.Value(0)).current;
  const unlikeProg = useRef(new Animated.Value(0)).current;
  const chipScale = useRef(new Animated.Value(1)).current;
  const [likeTilt, setLikeTilt] = useState('0deg');

  const pulseChip = useCallback(() => {
    chipScale.setValue(1);
    Animated.sequence([
      Animated.spring(chipScale, {
        toValue: 1.35,
        useNativeDriver: true,
        speed: 30,
        bounciness: 10,
      }),
      Animated.timing(chipScale, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();
  }, [chipScale]);

  const playLike = useCallback(() => {
    setLikeTilt(`${Math.round(Math.random() * 16 - 8)}deg`);
    unlikeProg.setValue(0);
    likeProg.setValue(0);
    ringProg.setValue(0);
    Animated.parallel([
      Animated.timing(likeProg, {
        toValue: 1,
        duration: 720,
        useNativeDriver: true,
      }),
      Animated.timing(ringProg, {
        toValue: 1,
        duration: 460,
        useNativeDriver: true,
      }),
    ]).start();
    pulseChip();
  }, [likeProg, ringProg, unlikeProg, pulseChip]);

  const playUnlike = useCallback(() => {
    likeProg.setValue(0);
    ringProg.setValue(0);
    unlikeProg.setValue(0);
    Animated.timing(unlikeProg, {
      toValue: 1,
      duration: 480,
      useNativeDriver: true,
    }).start();
    pulseChip();
  }, [likeProg, ringProg, unlikeProg, pulseChip]);

  /* Heart chip tap — the same toggle as a double tap. A button press is
   * confirmed by the button itself (the chip pulse), not the big overlay
   * heart; that's how like buttons behave everywhere. */
  const onChipPress = useCallback(() => {
    onToggleSave(meal, plate.id);
    pulseChip();
  }, [meal, plate, onToggleSave, pulseChip]);

  const likeScale = likeProg.interpolate({
    inputRange: [0, 0.18, 0.32, 0.78, 1],
    outputRange: [0.3, 1.16, 1, 1, 0.72],
  });
  const likeOpacity = likeProg.interpolate({
    inputRange: [0, 0.1, 0.72, 1],
    outputRange: [0, 1, 1, 0],
  });
  const likeY = likeProg.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [0, 0, -20],
  });
  const ringScale = ringProg.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 1.65],
  });
  const ringOpacity = ringProg.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 0.55, 0],
  });
  const unlikeScale = unlikeProg.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0.95, 1, 0.55],
  });
  const unlikeOpacity = unlikeProg.interpolate({
    inputRange: [0, 0.12, 0.72, 1],
    outputRange: [0, 1, 0.9, 0],
  });
  const unlikeY = unlikeProg.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 22],
  });

  /* The video dims softly under the open panel, in sync with the slide.
   * The dim layer doubles as the tap-to-dismiss surface. */
  const dimOpacity = useRef(
    panelX.interpolate({
      inputRange: [0, PANEL_WIDTH],
      outputRange: [0.35, 0],
    }),
  ).current;

  /* The edge tab rides the SAME animated value as the panel, so it slides
   * with the panel edge instead of jumping between two fixed positions. */
  const edgeTabShift = useRef(Animated.subtract(panelX, PANEL_WIDTH)).current;

  const setPanel = useCallback(
    (open: boolean) => {
      setPanelOpen(open);
      onPanelToggle(open);
      Animated.spring(panelX, {
        toValue: open ? 0 : PANEL_WIDTH,
        useNativeDriver: true,
        stiffness: 260,
        damping: 28,
        mass: 0.9,
      }).start();
      /* Tab bar visibility is coordinated at the SCREEN level (one writer):
       * onPanelToggle → panelLocked drives the fade, alongside play state. */
      if (open) track('cook_panel_open', { slug: meal.slug });
    },
    [panelX, meal.slug, onPanelToggle],
  );

  /* A card can unmount with its panel still open: the category pill is screen
   * chrome rendered ABOVE the card's dim layer, so it stays tappable, and a
   * filter change swaps the dataset out from under an open panel. Nothing else
   * ever reports the panel closed in that case, which used to strand
   * panelLocked true — pager locked, tab bar faded out. Now that panelLocked
   * also gates playback, stranding it would silence the feed permanently, so
   * this cleanup is load-bearing rather than tidiness. */
  const panelOpenRef = useRef(panelOpen);
  panelOpenRef.current = panelOpen;
  useEffect(
    () => () => {
      if (panelOpenRef.current) onPanelToggle(false);
    },
    [onPanelToggle],
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

  /* Tap model: a single tap WAITS one double-tap window before acting, so a
   * double tap likes/unlikes without ever toggling playback (the second tap
   * cancels the pending pause). The ~300ms delay before pause is the
   * standard price every double-tap-to-like feed pays. */
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    },
    [],
  );

  const onMediaPress = useCallback(() => {
    if (singleTapTimer.current) {
      /* Second tap inside the window: this is a double tap. Cancel the
       * pending pause and toggle the like. */
      clearTimeout(singleTapTimer.current);
      singleTapTimer.current = null;
      if (saved) playUnlike();
      else playLike();
      onToggleSave(meal, plate.id);
      return;
    }
    singleTapTimer.current = setTimeout(() => {
      singleTapTimer.current = null;
      /* Confirmed single tap: play/pause on video cards, nothing on tone
       * cards. */
      if (VIDEO_ENABLED && video) setPaused((p) => !p);
    }, DOUBLE_TAP_MS);
  }, [meal, plate, saved, onToggleSave, playLike, playUnlike, video]);

  const onA11yAction = useCallback(
    (e: AccessibilityActionEvent) => {
      if (e.nativeEvent.actionName === 'increment') onNext();
      if (e.nativeEvent.actionName === 'decrement') onPrev();
    },
    [onNext, onPrev],
  );

  return (
    /* NOTE: `accessible` deliberately does NOT go on this root View. Setting it
     * here collapses the whole card into a single element for VoiceOver and
     * makes the panel's buttons unfocusable. The card's summary label and the
     * next/previous actions live on the title block instead, which has no
     * focusable children. */
    <View style={{ height }} {...pan.panHandlers}>
      <CardMedia
        meal={meal}
        video={video}
        shouldPlay={isActive && !paused}
        animateStill={isActive && !panelOpen}
        muted={muted}
        onPress={onMediaPress}
      />

      {/* Like burst: ring + particles + big tilted heart. */}
      <View pointerEvents="none" style={styles.fxLayer}>
        <Animated.View
          style={[
            styles.fxRing,
            { opacity: ringOpacity, transform: [{ scale: ringScale }] },
          ]}
        />
        {PARTICLE_ANGLES.map((v, i) => (
          <Animated.View
            key={i}
            style={[
              styles.fxParticle,
              {
                backgroundColor: i % 2 === 0 ? C.saved : C.amber,
                opacity: ringOpacity,
                transform: [
                  {
                    translateX: ringProg.interpolate({
                      inputRange: [0, 1],
                      outputRange: [v.x * 18, v.x * 58],
                    }),
                  },
                  {
                    translateY: ringProg.interpolate({
                      inputRange: [0, 1],
                      outputRange: [v.y * 18, v.y * 58],
                    }),
                  },
                  {
                    scale: ringProg.interpolate({
                      inputRange: [0, 0.2, 1],
                      outputRange: [0, 1, 0.1],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
        <Animated.View
          style={{
            opacity: likeOpacity,
            transform: [
              { translateY: likeY },
              { rotate: likeTilt },
              { scale: likeScale },
            ],
          }}
        >
          <Ionicons name="heart" size={84} color="#FFFFFF" />
        </Animated.View>
        {/* Unlike: quiet deflate-and-drop of the outline heart. */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.fxCenter,
            {
              opacity: unlikeOpacity,
              transform: [{ translateY: unlikeY }, { scale: unlikeScale }],
            },
          ]}
        >
          <Ionicons name="heart-outline" size={72} color={C.text} />
        </Animated.View>
      </View>

      {/* Saved-state heart, top right — a real save button now: tapping it
          toggles the like exactly like a double tap, with the chip's own
          pulse as confirmation. Still under-reports on a fresh launch until
          hydration (see savedSlugs TODO). */}
      <Animated.View
        style={[
          styles.savedChip,
          { top: topInset + 8, transform: [{ scale: chipScale }] },
        ]}
      >
        <Pressable
          onPress={onChipPress}
          hitSlop={8}
          style={styles.savedChipPress}
          accessibilityRole="button"
          accessibilityState={{ selected: saved }}
          accessibilityLabel={saved ? 'Remove from saved' : 'Save'}
        >
          <Ionicons
            name={saved ? 'heart' : 'heart-outline'}
            size={16}
            color={saved ? C.saved : C.text}
          />
        </Pressable>
      </Animated.View>

      {/* Mute toggle, directly under the save chip. On the BASE card rather
          than in the panel: the feed plays with the panel shut, so a control
          hidden behind a swipe cannot be the answer to "make it stop". Only
          rendered for cards that actually have footage — a tone-only card has
          no audio to mute. Toggling it is feed-wide, not per card. */}
      {VIDEO_ENABLED && video ? (
        <View style={[styles.muteChip, { top: topInset + 46 }]}>
          <Pressable
            onPress={onToggleMute}
            hitSlop={8}
            style={styles.savedChipPress}
            accessibilityRole="button"
            accessibilityState={{ selected: muted }}
            accessibilityLabel={muted ? 'Unmute videos' : 'Mute videos'}
          >
            <Ionicons
              name={muted ? 'volume-mute' : 'volume-high'}
              size={16}
              color={C.text}
            />
          </Pressable>
        </View>
      ) : null}

      {/* Presence marker, under the mute chip. Marks the cards that DO have
          footage rather than the ones that don't: with coverage at 1 in 81 an
          absence badge would paint 80 cards with an apology, while a play
          glyph on the rare card reads as a bonus. Not a button — tapping the
          media already toggles playback, so this is signage only, and it
          disappears on its own as coverage stops being remarkable. */}
      {VIDEO_ENABLED && video ? (
        <View
          pointerEvents="none"
          style={[styles.videoChip, { top: topInset + 84 }]}
        >
          <Ionicons name="play" size={13} color={C.text} />
        </View>
      ) : null}

      {/* Title + macro line on its own band BELOW the pill/chip row — beside
          it, the growing pill label ("Mains · 5 ingredients or fewer") walks
          straight into the title. Positioned off the pill's MEASURED height,
          so a font change moves the band with it. No scrim — text shadows
          carry legibility over footage. Also the card's accessibility
          summary and the next/previous rotor actions. */}
      <View
        pointerEvents="none"
        style={[styles.titleBlock, { top: topInset + 8 + pillHeight + 10 }]}
        accessible
        accessibilityLabel={`${meal.display_name}. ${Math.round(macros.kcal * portions)} calories, ${Math.round(macros.protein_g * portions)} grams protein, ${Math.round(macros.carbs_g * portions)} carbs, ${Math.round(macros.fat_g * portions)} fat${portions > 1 ? `, ${portions} portions` : ''}.`}
        accessibilityActions={[
          { name: 'increment', label: 'Next meal' },
          { name: 'decrement', label: 'Previous meal' },
        ]}
        onAccessibilityAction={onA11yAction}
      >
        <Text style={styles.title} numberOfLines={2}>
          {meal.display_name}
        </Text>
        {/* Site-hero stat treatment: bold numbers, muted units, middots.
            Numbers ROLL to new values when plate/variant/portions change. */}
        <Text style={styles.macroLine}>
          <CountText
            style={styles.macroNum}
            value={Math.round(macros.kcal * portions)}
          />
          <Text style={styles.macroUnit}> kcal</Text>
          {portions > 1 ? (
            <Text style={styles.macroUnit}> · {portions}×</Text>
          ) : null}
          <Text style={styles.macroUnit}>  ·  </Text>
          <CountText
            style={styles.macroNum}
            value={Math.round(macros.protein_g * portions)}
          />
          <Text style={styles.macroUnit}>P</Text>
          <Text style={styles.macroUnit}>  ·  </Text>
          <CountText
            style={styles.macroNum}
            value={Math.round(macros.carbs_g * portions)}
          />
          <Text style={styles.macroUnit}>C</Text>
          <Text style={styles.macroUnit}>  ·  </Text>
          <CountText
            style={styles.macroNum}
            value={Math.round(macros.fat_g * portions)}
          />
          <Text style={styles.macroUnit}>F</Text>
        </Text>
      </View>

      {/* Dim + tap-to-dismiss, fading in sync with the panel. */}
      <Animated.View
        pointerEvents={panelOpen ? 'auto' : 'none'}
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: '#000', opacity: dimOpacity },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setPanel(false)}
          accessibilityRole="button"
          accessibilityLabel="Hide details and actions"
        />
      </Animated.View>

      {/* Side panel: the chooser. Plate carousel, method and variant
          selection, portions, the composed ingredient list, and View full
          recipe as the primary action. Solid near-black surface so the black
          food photography blends into it. */}
      <Animated.View
        style={[
          styles.panel,
          {
            width: PANEL_WIDTH,
            paddingTop: topInset + 8,
            transform: [{ translateX: panelX }],
          },
        ]}
      >
        {/* Hero: an inset rounded card BELOW the notch — the image never
            sits behind the camera. Name and calories centered over it. */}
        <View style={styles.heroCard}>
          <PlateCarousel
            meal={meal}
            plateIndex={plateIndex}
            portions={portions}
            height={184}
            onSelect={setPlateIndex}
          />
        </View>

        <View
          style={[styles.panelBody, { paddingBottom: bottomClearance + 16 }]}
        >
          <MacroRows
            macros={macros}
            portions={portions}
            maxGrams={maxPlateGrams}
          />

          <ScrollView
            style={styles.panelScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {meal.methods && meal.methods.length > 0 ? (
              <View style={styles.methodRow}>
                {meal.methods.map((m, i) => (
                  <Pressable
                    key={m.id}
                    onPress={() => setMethodIndex(i)}
                    style={[
                      styles.methodCard,
                      i === methodIndex && styles.methodCardSelected,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: i === methodIndex }}
                    accessibilityLabel={`${m.display_name}, ${m.time_active_minutes + extraActive} minutes active`}
                  >
                    <Ionicons
                      name={methodIcon(m.id)}
                      size={16}
                      color={i === methodIndex ? C.cta : C.faint}
                    />
                    <Text style={styles.methodCardName}>{m.display_name}</Text>
                    <Text style={styles.methodCardTime}>
                      {methodTime(m, extraActive, extraTotal)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* Easy vs from-scratch, mirroring RecipeDetail's MAKE IT choice.
                Swaps the variant's ingredients and adds its extra minutes. */}
            {meal.sauce_variants && meal.sauce_variants.length > 1 ? (
              <View style={styles.variantRow}>
                {meal.sauce_variants.map((v, i) => (
                  <Pressable
                    key={v.id}
                    onPress={() => selectVariant(i)}
                    style={[
                      styles.variantOption,
                      i === variantIndex && styles.variantOptionSelected,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: i === variantIndex }}
                    accessibilityLabel={`${v.display_name}${
                      v.extra_active_minutes > 0
                        ? `, adds ${v.extra_active_minutes} minutes`
                        : ''
                    }`}
                  >
                    <Text
                      style={[
                        styles.variantName,
                        i === variantIndex && styles.variantNameSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {v.display_name}
                    </Text>
                    {v.extra_active_minutes > 0 ? (
                      <Text style={styles.variantExtra}>
                        +{v.extra_active_minutes} min
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.panelDivider} />
            <View style={styles.ingredientHeader}>
              <Text style={styles.panelLabel}>INGREDIENTS</Text>
              <View style={styles.stepper}>
                <Text style={styles.stepperLabel}>Portions</Text>
                <Pressable
                  onPress={() => setPortions((p) => clampCookPortions(p - 1))}
                  style={styles.stepperButton}
                  accessibilityRole="button"
                  accessibilityLabel="Fewer portions"
                >
                  <Text style={styles.stepperGlyph}>−</Text>
                </Pressable>
                <Text
                  style={styles.stepperValue}
                  accessibilityLabel={`${portions} portions`}
                >
                  {portions}
                </Text>
                <Pressable
                  onPress={() => setPortions((p) => clampCookPortions(p + 1))}
                  style={styles.stepperButton}
                  accessibilityRole="button"
                  accessibilityLabel="More portions"
                >
                  <Text style={styles.stepperGlyph}>+</Text>
                </Pressable>
              </View>
            </View>
            <IngredientList
              meal={meal}
              plate={plate}
              methodId={currentMethod?.id ?? ''}
              variantId={selectedVariant?.id}
              portions={portions}
            />
          </ScrollView>

          {/* Footer: View full recipe + share. No mute button — sound is on. */}
          <View style={styles.footerRow}>
            <Pressable
              onPress={() => onOpenRecipe(meal, plate, portions)}
              style={styles.recipeCta}
              accessibilityRole="button"
              accessibilityLabel={`View full recipe for ${plate.display_name}`}
            >
              <Text style={styles.recipeCtaText}>View full recipe</Text>
            </Pressable>
            <IconAction
              icon="share-outline"
              label="Share"
              onPress={() => onShare(meal, plate)}
            />
          </View>
        </View>
      </Animated.View>

      {/* Edge tab — rides the panel's motion, flips direction when open.
          Rendered last so it stays above the dismiss layer. */}
      <Animated.View
        style={[
          styles.edgeTabWrap,
          { transform: [{ translateX: edgeTabShift }] },
        ]}
      >
        <Pressable
          onPress={() => setPanel(!panelOpen)}
          style={styles.edgeTab}
          accessibilityRole="button"
          accessibilityLabel={
            panelOpen ? 'Hide details' : 'Show details and actions'
          }
        >
          <Text style={styles.edgeTabChevron}>{panelOpen ? '›' : '‹'}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function methodTime(
  m: MealMethod,
  extraActive: number,
  extraTotal: number,
): string {
  const active = m.time_active_minutes + extraActive;
  const passive = m.time_total_minutes + extraTotal - active;
  if (passive >= 60) {
    return `${active} min + ${Math.round(passive / 60)} h`;
  }
  return `${active} min`;
}

/** The hero: the plate image fills its inset card, with the plate name and
 *  portion-scaled calories over it, arrows and tappable dots for selection.
 *  Arrows rather than swipe — horizontal swipe is reserved for closing the
 *  panel. Falls back to the meal image, then a deterministic tone, when the
 *  plate has no image (plate-level image_filename coverage is patchy in the
 *  data). */
function PlateCarousel(props: {
  meal: CuratedMeal;
  plateIndex: number;
  portions: number;
  height: number;
  onSelect: (index: number) => void;
}): React.JSX.Element {
  const { meal, plateIndex, portions, height, onSelect } = props;
  const plate = meal.plates[plateIndex] ?? meal.plates[0];
  const count = meal.plates.length;
  const kcal = Math.round(plate.plate_macros.kcal * portions);
  const source =
    resolveMealImage(plate.image_filename) ??
    resolveMealImage(meal.image_filename);
  const step = (delta: number) => onSelect((plateIndex + delta + count) % count);

  return (
    <View
      style={[styles.hero, { height }]}
      accessible
      accessibilityLabel={`Plate ${plateIndex + 1} of ${count}: ${plate.display_name}, ${kcal} calories${portions > 1 ? ` for ${portions} portions` : ''}`}
    >
      {source ? (
        <Image
          source={source}
          style={styles.heroMedia}
          resizeMode="cover"
          fadeDuration={0}
        />
      ) : (
        <View
          style={[
            styles.heroMedia,
            { backgroundColor: fallbackTone(`${meal.slug}-${plate.id}`) },
          ]}
        />
      )}
      <View style={styles.carouselScrim} />
      <View style={styles.carouselCaption}>
        <Text style={styles.carouselName} numberOfLines={2}>
          {plate.display_name}
        </Text>
        <Text style={styles.carouselKcal}>
          <CountText style={styles.carouselKcalNum} value={kcal} /> kcal
          {portions > 1 ? ` · ${portions} portions` : ''}
        </Text>
      </View>
      {count > 1 ? (
        <>
          <Pressable
            onPress={() => step(-1)}
            style={[styles.carouselArrow, { left: 8 }]}
            accessibilityRole="button"
            accessibilityLabel="Previous plate"
          >
            <Ionicons name="chevron-back" size={16} color={C.cta} />
          </Pressable>
          <Pressable
            onPress={() => step(1)}
            style={[styles.carouselArrow, { right: 8 }]}
            accessibilityRole="button"
            accessibilityLabel="Next plate"
          >
            <Ionicons name="chevron-forward" size={16} color={C.cta} />
          </Pressable>
          <View style={styles.dotRow}>
            {meal.plates.map((p, i) => (
              <Pressable
                key={p.id}
                onPress={() => onSelect(i)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Plate ${i + 1} of ${count}`}
                style={[styles.dot, i === plateIndex && styles.dotActive]}
              />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

/** Rolls a displayed number from its previous value to `target` with an
 *  ease-out curve. Runs on JS via requestAnimationFrame because text content
 *  can't be driven natively; an interruption restarts from wherever the roll
 *  currently sits, so rapid plate-arrow taps stay smooth instead of
 *  stuttering back to the start. */
function useCountUp(target: number, duration = 380): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  useEffect(() => {
    const from = displayRef.current;
    if (from === target) return undefined;
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (target - from) * eased);
      displayRef.current = v;
      setDisplay(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

/** Text whose number rolls instead of snapping — the macro-change animation
 *  for plate / variant / portion switches. Pass PRE-ROUNDED values so the
 *  roll lands exactly on the displayed number. */
function CountText(props: {
  value: number;
  style?: StyleProp<TextStyle>;
}): React.JSX.Element {
  return <Text style={props.style}>{useCountUp(props.value)}</Text>;
}

/** Macro readout, rethought after device feedback on the stacked bar (a
 *  kcal-scaled composition bar that stopped short of its container looked
 *  broken rather than "smaller plate"): three GAUGE rows — Protein / Carbs /
 *  Fat — each filled against the largest gram value across every plate of
 *  the meal. One shared scale keeps the rows comparable with each other, a
 *  partial fill reads as room on the scale (a familiar gauge pattern), and
 *  since plates differ mainly in AMOUNT rather than ratio, all three gauges
 *  move visibly on every plate switch. Widths animate (~380ms, JS driver —
 *  width is a layout prop; three views, cheap) in step with the rolling
 *  numbers. Portions scale the numbers but not the widths, since both sides
 *  of the ratio scale together. */
function MacroRows(props: {
  macros: CuratedMeal['plates'][number]['plate_macros'];
  portions: number;
  maxGrams: number;
}): React.JSX.Element {
  const { macros, portions, maxGrams } = props;
  return (
    <View
      style={styles.macroRows}
      accessible
      accessibilityLabel={`${Math.round(macros.protein_g * portions)} grams protein, ${Math.round(macros.carbs_g * portions)} carbs, ${Math.round(macros.fat_g * portions)} fat`}
    >
      <MacroGaugeRow
        label="P"
        grams={macros.protein_g}
        color={MACRO_COLORS.protein}
        portions={portions}
        maxGrams={maxGrams}
      />
      <MacroGaugeRow
        label="C"
        grams={macros.carbs_g}
        color={MACRO_COLORS.carbs}
        portions={portions}
        maxGrams={maxGrams}
      />
      <MacroGaugeRow
        label="F"
        grams={macros.fat_g}
        color={MACRO_COLORS.fat}
        portions={portions}
        maxGrams={maxGrams}
      />
    </View>
  );
}

function MacroGaugeRow(props: {
  label: string;
  grams: number;
  color: string;
  portions: number;
  maxGrams: number;
}): React.JSX.Element {
  const { label, grams, color, portions, maxGrams } = props;
  const share = Math.min(1, grams / Math.max(1, maxGrams));
  const anim = useRef(new Animated.Value(share)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: share,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [share, anim]);
  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  return (
    <View style={styles.macroRow}>
      <Text style={styles.macroRowLabel}>{label}</Text>
      <View style={styles.macroRowTrack}>
        <Animated.View
          style={[styles.macroRowFill, { backgroundColor: color, width }]}
        />
      </View>
      <Text style={[styles.macroRowValue, { color }]}>
        <CountText value={Math.round(grams * portions)} />g
      </Text>
    </View>
  );
}

/* Allergens/storage line deliberately removed from the panel per design
 * feedback — that detail lives in RecipeDetail. */

function IngredientList(props: {
  meal: CuratedMeal;
  plate: MealPlate;
  methodId: string;
  variantId?: string;
  portions: number;
}): React.JSX.Element {
  const { meal, plate, methodId, variantId, portions } = props;
  const rows = composedIngredients(meal, plate, methodId, variantId);
  const warn = rows.length >= INGREDIENT_WARN_AT;
  return (
    <View
      accessible
      accessibilityLabel={`${rows.length} ingredients for ${portions} ${portions === 1 ? 'portion' : 'portions'}`}
    >
      {warn ? (
        <Text style={styles.ingredientWarn}>{rows.length} ingredients</Text>
      ) : null}
      {rows.map((row, i) => (
        <View
          key={`${row.ingredient.ingredient_id}-${i}`}
          style={styles.ingredientRow}
        >
          <Text style={styles.ingredientName} numberOfLines={2}>
            {ingredientDisplayName(row.ingredient.ingredient_id)}
          </Text>
          <Text style={styles.ingredientAmount}>
            {portionAmount(row, portions)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Media layer
 *
 * Three layers, bottom to top: deterministic tone, meal still, video. Each is
 * a fallback for the one above it, so nothing ever paints black.
 *
 * The still matters more than it looks. Coverage is 1 video against 81 meals,
 * so the overwhelmingly common card is a meal with no footage — a flat tone
 * there reads as a broken screen rather than a considered one. What it must
 * NOT do is turn Cook into a second NutritionHome: the slow Ken Burns is the
 * whole difference between "a feed that happens to be paused" and "a grid of
 * photos you already have a tab for".
 *
 * Absence is never labelled. No "video coming soon", no placeholder glyph on
 * the 80 cards without footage — presence is marked instead (see the play
 * chip on the card), because a badge repeated 80 times reads as an unfinished
 * app and there is nothing the viewer can do about it either way.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Seconds for one direction of the Ken Burns drift. Slow on purpose: fast
 *  enough that the card is visibly alive next to a video card, slow enough
 *  that it never competes with one. */
const STILL_ZOOM_MS = 14000;
const STILL_ZOOM_TO = 1.045;

function CardMedia(props: {
  meal: CuratedMeal;
  video?: MealVideo;
  shouldPlay: boolean;
  /** Runs the Ken Burns drift. False for off-screen cards and while the side
   *  panel is open — an animation nobody is looking at is just battery. */
  animateStill: boolean;
  muted: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const { meal, video, shouldPlay, animateStill, muted, onPress } = props;
  const [failed, setFailed] = useState(false);
  const showVideo = VIDEO_ENABLED && !!video && !failed;
  /* Registry lookup, never a constructed path: getMealImage is keyed by
   * image_filename and its keys are not disk filenames. */
  const still = resolveMealImage(meal.image_filename);

  const { width: cardWidth } = useWindowDimensions();
  /* Explicit geometry instead of resizeMode: the runtime renders this image
   * as cover no matter what resizeMode says (canary-verified against the
   * live bundle), so the letterbox is built from real numbers it cannot
   * override. Ratio comes from Image.resolveAssetSource per asset, not a
   * hardcoded 941/1672, so a still with different dimensions still lays out
   * correctly. */
  const stillSize = useMemo(() => {
    if (!still) return null;
    const resolved = Image.resolveAssetSource(still);
    if (!resolved?.width || !resolved?.height) return null;
    return {
      width: cardWidth,
      height: cardWidth * (resolved.height / resolved.width),
    };
  }, [still, cardWidth]);

  /* Scale only, no translate: a pan on a cover-fitted image can walk a plate
   * edge into frame on tall aspect ratios. */
  const zoom = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animateStill || !still || showVideo) {
      zoom.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(zoom, {
          toValue: 1,
          duration: STILL_ZOOM_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(zoom, {
          toValue: 0,
          duration: STILL_ZOOM_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animateStill, still, showVideo, zoom]);

  const zoomScale = zoom.interpolate({
    inputRange: [0, 1],
    outputRange: [1, STILL_ZOOM_TO],
  });

  /* Video reveal. The footage is held at opacity 0 until expo-av reports its
   * first loaded status, then faded up — cutting straight from the
   * letterboxed still to full-bleed vertical footage put two very different
   * frames back to back and read as a glitch. Reset when this card instance
   * is recycled onto a different meal, so a scroll never shows the previous
   * meal's last frame at full opacity. */
  const videoOpacity = useRef(new Animated.Value(0)).current;
  const videoRevealed = useRef(false);
  useEffect(() => {
    videoRevealed.current = false;
    videoOpacity.setValue(0);
  }, [meal.slug, videoOpacity]);

  const onPlaybackStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded || videoRevealed.current) return;
      videoRevealed.current = true;
      Animated.timing(videoOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    },
    [videoOpacity],
  );

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={onPress}>
      {/* Backing tone — always mounted, never unmounted. Last fallback, for a
          meal the image registry has no entry for. */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: fallbackTone(meal.slug) },
        ]}
      />

      {/* Pure black under a contained still, replacing the tone. The tone is
          a warm brown/green, so letterboxing a black-background photo onto it
          would draw a visible frame around the dish; on black there is no
          seam at all. */}
      {still && !showVideo ? (
        <View style={[StyleSheet.absoluteFill, styles.stillBacking]} />
      ) : null}

      {/* Meal still — only when the card is NOT showing video. It used to sit
          under the video too, but the letterboxed 16:9 strip flashing before
          the full-bleed footage read as a glitch; error recovery survives the
          unmount because onError flips `failed`, which turns showVideo off
          and brings this whole stack back.
          Letterboxed, not covered. The stills are 16:9 landscape; covering
          one into a 9:19.5 card scales to fill the HEIGHT, which throws
          most of the width off both edges and lands you on a crop of one
          corner of the pan. Sized to the card width at the asset's own
          ratio and centred, the whole dish shows, and because the
          photography is shot on black the letterbox reads as the photo's own
          background rather than as bars. */}
      {still && !showVideo ? (
        <View style={styles.stillFrame}>
          <Animated.Image
            source={still}
            style={[
              stillSize ?? StyleSheet.absoluteFillObject,
              { transform: [{ scale: zoomScale }] },
            ]}
            fadeDuration={0}
          />
        </View>
      ) : null}

      {/* Uniform wash rather than a top gradient: the stepped scrim was
          rejected for its visible seams, and a real gradient would mean a new
          native dependency. Photography is shot on black, so an even 12% is
          invisible on the image and enough for the title's text shadows to
          hold. Lighter than it was: a contained still leaves black around the
          dish, so there is far less bright pixel under the title to fight.
          Skipped over video — footage is already graded darker. */}
      {still && !showVideo ? (
        <View pointerEvents="none" style={styles.stillWash} />
      ) : null}

      {/* Video stack. Bottom to top: black gap filler, frame-zero poster
          (when one has been uploaded), the footage itself. The still stack
          above is unmounted for a video card, so until the first frame lands
          the viewer sees the poster if there is one and plain black
          otherwise — black is the deliberate gap filler, not the still. */}
      {showVideo ? (
        <>
          <View style={[StyleSheet.absoluteFill, styles.stillBacking]} />
          {video?.poster ? (
            <Image
              source={{ uri: video.poster }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              fadeDuration={0}
            />
          ) : null}
          {/* Held at opacity 0 until onPlaybackStatus sees isLoaded, then
              faded up — see the reveal note above. */}
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: videoOpacity }]}
          >
            <Video
              source={{ uri: video!.video }}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.COVER}
              shouldPlay={shouldPlay}
              isLooping
              /* Sound on by default (Shorts/Reels convention), with the mute
               * chip on the card as the in-app control — the screen-level
               * Audio.setAudioModeAsync call deliberately plays past the iOS
               * silent switch, so the hardware rocker alone was not enough. */
              isMuted={muted}
              /* No native controls: the pager owns every gesture on this
               * surface. */
              useNativeControls={false}
              onPlaybackStatusUpdate={onPlaybackStatus}
              onError={() => {
                /* Network blip, bad URL, unsupported file: fall back to the
                 * still (or the tone, if the registry has no entry) rather
                 * than showing a black rectangle. */
                setFailed(true);
                track('cook_video_error', { slug: meal.slug });
              }}
            />
          </Animated.View>
        </>
      ) : null}
    </Pressable>
  );
}

/** Deterministic backing tone. Only reached when the image registry has no
 *  entry for the meal — coverage is currently complete, so this is a guard,
 *  not the common path. */
function fallbackTone(slug: string): string {
  const tones = ['#26221C', '#1E2823', '#2D211C', '#241F1D', '#22282A'];
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return tones[hash % tones.length];
}

/* ────────────────────────────────────────────────────────────────────────────
 * Panel action pieces
 * ──────────────────────────────────────────────────────────────────────────── */

function IconAction(props: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const { icon, label, active, onPress } = props;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.iconAction, active && styles.iconActionActive]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={17} color={active ? C.saved : C.cta} />
    </Pressable>
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
 * Filter sheet — redesigned.
 *
 * Category is a grid of icon tiles with per-category meal counts (the count
 * is real information: it says what's behind each door before you open it).
 * Show me stays as chips beneath. Grabber handle on top. The backdrop FADES
 * while the sheet slides, run by one progress value on a transparent,
 * non-animating Modal; the sheet stays mounted through the exit animation.
 * ──────────────────────────────────────────────────────────────────────────── */

const SHEET_SLIDE_DISTANCE = 420;

function FilterSheet(props: {
  visible: boolean;
  onClose: () => void;
  category: CookCategory | null;
  intent: IntentFilter | null;
  counts: Record<'all' | CookCategory, number>;
  intentCounts: Record<IntentFilter, number>;
  showFits: boolean;
  onSelectCategory: (c: CookCategory | null) => void;
  onSelectIntent: (i: IntentFilter | null) => void;
  bottomInset: number;
}): React.JSX.Element | null {
  const {
    visible,
    onClose,
    category,
    intent,
    counts,
    intentCounts,
    showFits,
    onSelectCategory,
    onSelectIntent,
    bottomInset,
  } = props;

  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 210,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 170,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, progress]);

  const sheetY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_SLIDE_DISTANCE, 0],
  });

  /* 'video' sits last: it's the narrowest filter in the row while coverage is
   * thin, and it has to be reachable without pushing the everyday intents
   * down. Hidden entirely when playback is switched off at VIDEO_ENABLED,
   * since the chip would then filter to a list nothing can play. */
  const intents: IntentFilter[] = (
    ['fits', 'quick', 'nocook', 'few', 'saved', 'video'] as IntentFilter[]
  )
    .filter((i) => i !== 'fits' || showFits)
    .filter((i) => i !== 'video' || VIDEO_ENABLED);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop fades; it never slides. */}
      <Animated.View style={[styles.sheetBackdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            paddingBottom: bottomInset + 20,
            transform: [{ translateY: sheetY }],
          },
        ]}
      >
        <View style={styles.sheetGrabber} />

        <Text style={styles.sheetHeading}>MEAL TYPE</Text>
        <View style={styles.tileGrid}>
          <CategoryTile
            icon="apps-outline"
            label="All meals"
            count={counts.all}
            active={category === null}
            onPress={() => onSelectCategory(null)}
          />
          {CATEGORIES.map((c) => (
            <CategoryTile
              key={c}
              icon={CATEGORY_ICON[c]}
              label={CATEGORY_LABEL[c]}
              count={counts[c]}
              active={category === c}
              onPress={() => onSelectCategory(category === c ? null : c)}
            />
          ))}
        </View>

        <Text style={styles.sheetHeading}>SHOW ME</Text>
        <View style={styles.chipRow}>
          {intents.map((i) => (
            <IntentChip
              key={i}
              icon={INTENT_ICON[i]}
              label={INTENT_LABEL[i]}
              count={intentCounts[i]}
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
      </Animated.View>
    </Modal>
  );
}

function CategoryTile(props: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const { icon, label, count, active, onPress } = props;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tile, active && styles.tileActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}, ${count} meals`}
    >
      <Ionicons name={icon} size={17} color={active ? C.cta : C.faint} />
      <View style={styles.tileTextCol}>
        <Text
          style={[styles.tileLabel, active && styles.tileLabelActive]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text style={styles.tileCount}>{count} meals</Text>
      </View>
    </Pressable>
  );
}

/** Show me chip — same visual language as the category tiles (icon + quiet
 *  selected fill, not the old solid-cream flip) plus a live count scoped to
 *  the selected category. */
function IntentChip(props: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const { icon, label, count, active, onPress } = props;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.intentChip, active && styles.intentChipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}, ${count} meals`}
    >
      <Ionicons name={icon} size={13} color={active ? C.cta : C.faint} />
      <Text
        style={[styles.intentChipText, active && styles.intentChipTextActive]}
      >
        {label}
      </Text>
      <Text style={styles.intentChipCount}>{count}</Text>
    </Pressable>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Styles
 * ──────────────────────────────────────────────────────────────────────────── */

const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.55)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 8,
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1 },

  categoryPill: {
    position: 'absolute',
    left: 14,
    /* Capped so a long filter label ("Mains · 5 ingredients or fewer") can
     * never dominate the row; the text truncates, the chevron never does. */
    maxWidth: '60%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.overlay,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 5,
  },
  categoryPillText: {
    color: C.text,
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  categoryPillChevron: { color: C.sub, fontSize: 12, marginTop: -2 },

  savedChip: {
    position: 'absolute',
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedChipPress: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Same plate as savedChip, stacked under it. Kept as its own rule rather
   * than shared: savedChip is wrapped in an Animated.View for the like pulse
   * and this one is not. */
  muteChip: {
    position: 'absolute',
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Quieter plate than savedChip/muteChip: this one is signage, and matching
   * their weight would read as a third button. */
  videoChip: {
    position: 'absolute',
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(20,20,20,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stillBacking: {
    backgroundColor: '#000000',
  },

  /* Centring frame for the explicitly-sized still: see the note in CardMedia. */
  stillFrame: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Flat, full-bleed, no gradient: see the note in CardMedia. */
  stillWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },

  /* Like/unlike effects layer — centered over the media. */
  fxLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fxCenter: { alignItems: 'center', justifyContent: 'center' },
  fxRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: C.saved,
  },
  fxParticle: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  titleBlock: {
    position: 'absolute',
    left: TITLE_SIDE_INSET,
    right: TITLE_SIDE_INSET,
    alignItems: 'center',
  },
  title: {
    color: C.text,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 25,
    ...TEXT_SHADOW,
  },
  macroLine: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
    ...TEXT_SHADOW,
  },
  macroNum: { color: C.text, fontWeight: '700' },
  macroUnit: { color: C.sub, fontWeight: '400' },

  edgeTabWrap: {
    position: 'absolute',
    right: 0,
    top: '46%',
  },
  edgeTab: {
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
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: C.panelEdge,
    overflow: 'hidden',
  },
  panelBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    backgroundColor: C.panel,
  },
  heroCard: {
    marginHorizontal: 12,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: C.heroBacking,
  },
  hero: { width: '100%', overflow: 'hidden', backgroundColor: C.heroBacking },
  heroMedia: { width: '100%', height: '100%' },
  panelScroll: { flex: 1 },
  panelLabel: {
    color: C.faint,
    fontSize: 10,
    letterSpacing: 1.1,
    marginTop: 10,
    marginBottom: 6,
  },
  panelDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.hairline,
    marginTop: 12,
  },

  carouselScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '46%',
    backgroundColor: 'rgba(8,8,8,0.5)',
  },
  carouselCaption: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 26,
    alignItems: 'center',
  },
  carouselName: {
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  carouselKcal: { color: C.sub, fontSize: 11, marginTop: 3 },
  carouselKcalNum: { color: C.text, fontWeight: '700' },
  carouselArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(20,20,20,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { width: 14, backgroundColor: C.cta },

  variantRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  variantOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.hairline,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
  },
  variantOptionSelected: { borderColor: C.cta, backgroundColor: C.selectedBg },
  variantName: { color: C.sub, fontSize: 11 },
  variantNameSelected: { color: C.cta, fontWeight: '500' },
  variantExtra: { color: C.amber, fontSize: 9 },

  macroRows: { marginTop: 5 },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 7,
  },
  macroRowLabel: { color: C.faint, fontSize: 10, width: 10 },
  macroRowTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#1F1F1C',
    overflow: 'hidden',
  },
  /* Gauge fills take MACRO_COLORS inline. TODO(repo): if the nutrition
   * screens already define canonical macro colours, import those instead. */
  macroRowFill: { height: '100%', borderRadius: 3 },
  macroRowValue: {
    fontSize: 10,
    minWidth: 34,
    textAlign: 'right',
    fontWeight: '600',
  },

  methodRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  methodCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.hairline,
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
    gap: 3,
  },
  methodCardSelected: {
    borderColor: C.cta,
    backgroundColor: C.selectedBg,
  },
  methodCardName: { color: C.sub, fontSize: 10 },
  methodCardTime: { color: C.faint, fontSize: 9 },

  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  stepperLabel: { color: C.faint, fontSize: 11, marginRight: 1 },
  stepperButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperGlyph: { color: C.sub, fontSize: 13, lineHeight: 15 },
  stepperValue: {
    color: C.text,
    fontSize: 12,
    minWidth: 12,
    textAlign: 'center',
  },


  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 3,
  },
  ingredientName: { color: C.sub, fontSize: 11, flexShrink: 1 },
  ingredientAmount: { color: C.faint, fontSize: 11 },
  ingredientWarn: { color: C.amber, fontSize: 11, marginBottom: 4 },

  recipeCta: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeCtaText: { color: C.ctaText, fontSize: 13, fontWeight: '500' },
  footerRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  iconAction: {
    width: 40,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActionActive: { borderColor: C.savedOutline },

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

  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1D1D1C',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.outline,
    marginBottom: 6,
  },
  sheetHeading: {
    color: C.faint,
    fontSize: 10,
    letterSpacing: 1.1,
    marginBottom: 10,
    marginTop: 8,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: C.outline,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tileActive: { borderColor: C.cta, backgroundColor: C.selectedBg },
  tileTextCol: { flexShrink: 1 },
  tileLabel: { color: C.sub, fontSize: 12 },
  tileLabelActive: { color: C.cta, fontWeight: '500' },
  tileCount: { color: C.faint, fontSize: 10, marginTop: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  intentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: C.outline,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  intentChipActive: { borderColor: C.cta, backgroundColor: C.selectedBg },
  intentChipText: { color: C.sub, fontSize: 12 },
  intentChipTextActive: { color: C.cta, fontWeight: '500' },
  intentChipCount: { color: C.faint, fontSize: 10, marginLeft: 1 },

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