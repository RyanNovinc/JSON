/**
 * WorkoutLogScreen.tsx
 *
 * Focused exercise view with scrollable upcoming list.
 *
 * Layout (top to bottom):
 *  - Image header with overlaid controls:
 *      - back button (left)
 *      - History icon + "more" (⋯) menu (right)
 *  - Title + 1RM badge
 *  - Muscle tags (subtle)
 *  - Prescription banner
 *  - Sets table (SET · PREV · KG · REPS · ✓)
 *  - "Up Next" list of remaining exercises (tappable to swap focus)
 *  - Bottom bar: rest timer + start/finish button
 *
 * State preserved across exercise swaps via parent props (this is a presentational
 * component; the parent owns sets data, completion, weight/reps, etc).
 *
 * Designed to match existing JSON.fit aesthetic:
 *   - bg #000, surfaces #0a0a0f / #111116
 *   - cyan accent (theme color, defaults to #22d3ee)
 *   - DM Mono for numbers, Outfit for text
 *
 * ── PAGER ARCHITECTURE (the commit-flash fix) ────────────────────────────────
 *
 * The old pager positioned the live card at translateX = dragX and reset dragX to 0
 * in the swipe's completion callback, one tick before onIndexChange's setState could
 * land. That ordering painted the OLD exercise centred, on top of the correct peek,
 * for a frame or more. Every patch that tried to reorder those writes was fighting a
 * race between an Animated setValue (synchronous) and a React 19 concurrent commit
 * (scheduled), and the race cannot be reliably won. So it is now unrepresentable:
 *
 *  1. ONE absolute page position. `pagePos` is an Animated.Value in page units
 *     (0 = first exercise, 2.4 = mid-drag between the third and fourth). It moves
 *     monotonically as you page and is NEVER reset or rebased. This is the same
 *     principle the tick indicator already used, applied to the cards themselves.
 *
 *  2. Derived card transforms. Card N sits at (N - pagePos) * SCREEN_WIDTH, built
 *     as an interpolation of pagePos. A card's position depends only on its own
 *     index and pagePos; neither moves when currentIndex commits.
 *
 *  3. Three always-mounted cards, keyed by index: prev / current / next. On commit
 *     the centred card KEEPS its React instance and native views (same key), so its
 *     image never remounts and its content never changes. The only things a commit
 *     does are mount the new far neighbour off screen, unmount the old far
 *     neighbour off screen, and swap the `interactive` flag. None of that is
 *     visible, so it does not matter how late React flushes the setState.
 *
 *  4. Early commit. onIndexChange fires at gesture END, while the settle animation
 *     runs. Because positions are derived, the commit's timing is irrelevant to
 *     what is painted, and committing early means the next flick always finds its
 *     neighbour already mounted (rapid flick-flick-flick works).
 *
 *  5. NO layout animation. The stage's layout height is fixed at the tallest card
 *     in the workout (so an incoming neighbour can never be clipped), and the
 *     Up Next list is positioned by a translateY interpolated from the same
 *     native value that drives the card transforms. Height is a layout property
 *     and can never be native-driven; animating it put the list's motion on the
 *     JS thread, where the commit render made it skip frames against the
 *     natively driven cards. Now the list and the cards are interpolations of
 *     ONE value on ONE thread, pixel-locked by construction. The trade: constant
 *     scroll length per workout, so shorter exercises leave extra scrollable
 *     black beneath the list, which reads as padding in this UI.
 *
 *  6. ONE card implementation. The live card and the swipe previews used to be two
 *     parallel component trees (SetsTable/SetRow vs ExercisePagePreview), and every
 *     place they drifted became a pop-on-commit bug: the missing Add set button,
 *     the missing "×" delete mark, the chevron jumping lines, numbers shifting 2px.
 *     There is now a single ExerciseCard rendered three times with an `interactive`
 *     flag; the drift class is dead by construction.
 *
 *  7. Index changes that do not come from a swipe (superset auto-advance, Up Next
 *     taps) reuse the same machinery: adjacent changes slide pagePos, distant taps
 *     fade the cards out, snap pagePos and index together behind opacity 0, and
 *     fade back in after the commit lands.
 *
 * Also in this revision:
 *  8. Up Next and the neighbour cards resolve the selected alternative from
 *     allSetsData's selectedExerciseIndex, the same source the live card uses,
 *     instead of exercisePreferences. Two sources of truth landing from two async
 *     reads was ANOTHER way a card could change content across a commit. The
 *     adapter now seeds selectedExerciseIndex from saved preferences when
 *     initialising a fresh workout, so allSetsData is the single display truth.
 *  9. Adapter-supplied handlers are wrapped in identity-stable trampolines (latest
 *     ref pattern) so ExerciseCard can be React.memo'd; without this, the adapter's
 *     once-a-second duration tick would re-render all three cards forever.
 * 10. Smoothness pass (the feel of the swipe itself):
 *      - Card transforms moved to a NATIVE-driven twin of pagePos (`cardPos`), so
 *        the settle runs on the UI thread and survives JS-thread hiccups. Height
 *        stays on the JS-driven pagePos, because layout properties cannot be
 *        native-driven; under load the height may trail the cards by a frame,
 *        which is invisible next to a transform stutter.
 *      - Release animations are velocity-seeded springs. A fixed-duration timing
 *        restarts the card on its own curve regardless of how fast the finger was
 *        moving at release, and that velocity discontinuity reads as roughness
 *        even at a steady frame rate.
 *      - The gesture is memoised, so the once-a-second duration re-render can no
 *        longer rebuild and re-attach the handler config mid-drag.
 *      - Image cycling holds its frame while a drag or settle is in flight, so a
 *        1s phase flip cannot land a card re-render in the middle of a gesture.
 *      - Neighbour cards are rasterised on Android (renderToHardwareTextureAndroid),
 *        so translating them is a texture move rather than a subtree redraw.
 * 11. Up Next no longer flashes on focus change: the background / border / title
 *     colour cross-fades and the instant play-circle icon overlay are gone. The
 *     CURRENT badge is the sole selection indicator, travelling with a native
 *     fade + scale, so a commit does zero JS-driven animation work in the list.
 * 12. Scroll depth on the hero image: pulling down inflates it IN PLACE (iOS
 *     bounce only; Android offsets never go negative), scrolling away makes it
 *     lag at half speed, grow slightly, and recede into the black. Driven by a
 *     NATIVELY mapped scroll position (Animated.event, useNativeDriver), so
 *     scrolling costs the JS thread nothing; render transforms only, so the
 *     image box and the CARD_* height arithmetic are untouched. The pull side
 *     deliberately has no translate: these are contained illustrations, not
 *     cover-cropped photos, and translating up clipped the subject's head.
 * 13. Up Next motion moved onto the native driver (supersedes the height half of
 *     point 10). The stage height froze at the tallest card and the list is now
 *     pulled up by a translateY derived from cardPos, so the list rides the exact
 *     spring the cards ride, on the UI thread, and tracks the finger mid-drag.
 *     pagePos survives purely as the JS mirror twin for mid-settle grabs.
 * 14. Two Android commit artifacts fixed (removes the rasterisation bullet from
 *     point 10): (a) renderToHardwareTextureAndroid is gone from the neighbour
 *     wrappers — the bilinear-sampled texture during the slide versus live
 *     rendering after the flip read as the sets table changing size at commit,
 *     and the layer churn stepped on the Up Next badge fade; (b) TextInput
 *     `editable` no longer flips with `interactive` (pointerEvents already makes
 *     neighbours inert), because Android's setInputType path resets the typeface
 *     and made the digits shimmer at commit.
 * 15. Swipes that BEGIN on a weight/reps field now work on Android. A native
 *     EditText wins Android's touch negotiation and starves the pager's pan
 *     (RNGH issue #668; iOS unaffected), so each input carries a focus-gated
 *     invisible Pressable: unfocused touches never reach the native field (pans
 *     work; a tap focuses programmatically), and once focused the overlay
 *     unmounts so all native editing behaviour is intact. Only delta: the first
 *     tap on an unfocused field places the cursor at the end.
 * ────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  Pressable,
  Modal,
  Platform,
  Keyboard,
} from 'react-native';
// expo-image, not RN's Image. RN's offers exactly two behaviours when `source` changes and
// both are broken for a pager: keyed, it remounts the native view, which has no decoded bitmap
// and paints BLANK; unkeyed, it retains the view and keeps painting the PREVIOUS source's
// bitmap until the new one decodes. expo-image's recyclingKey is the third option: it resets
// the view to blank the moment the identity changes, so it can never show a stale frame, and
// prefetching means there is nothing to wait for. With the index-keyed always-mounted cards a
// slot never changes exercise in practice, but recyclingKey stays as belt and braces for any
// future list reorder.
import { Image } from 'expo-image';
import { Asset } from 'expo-asset';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkoutStorage, WorkoutHistory } from '../utils/storage';
import { useTimer } from '../contexts/TimerContext';
// Import existing modals and components
import { TimerModal } from '../components/TimerModal';
import { ExerciseHistoryModal } from '../../ExerciseHistoryScreen';
import FinishWorkoutModal from './FinishWorkoutModal';
import RepSchemeModal from '../components/RepSchemeModal';
import ExerciseNotesModal, { NoteEntry } from '../components/ExerciseNotesModal';
import WorkoutHeatmapModal from '../components/WorkoutHeatmapModal';
import DeleteSetModal from '../components/DeleteSetModal';
import OneRMProgressionModal from '../components/OneRMProgressionModal';
import HowItWorksModal from '../components/HowItWorksModal';
import CountdownOverlay from '../components/CountdownOverlay';
import PRToast, { PRToastData } from '../components/PRToast';
import {
  detectPersonalBest,
  summarisePriorHistory,
  PriorBests,
  PRKind,
} from '../utils/prDetection';
import { useRestTimerDisplay } from '../utils/useRestTimerDisplay';
import { Analytics } from '../services/analytics';

// ── Types ─────────────────────────────────────────────────────────

export interface SetData {
  weight: string;
  reps: string;
  completed: boolean;
  selectedExerciseIndex: number; // 0 = primary, 1+ = alternatives
  // Store data for each exercise variant separately
  exerciseData?: {
    [exerciseIndex: number]: {
      weight: string;
      reps: string;
      completed: boolean;
    };
  };
}

export interface Exercise {
  id?: string;
  /** Canonical exercise name (e.g. "Barbell Bench Press") */
  exercise: string;
  /** Optional fallback display name */
  name?: string;
  sets: number;
  reps: string | number;
  notes?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  /** Weekly progressions, e.g. { 1: "8, 7, 6", 2: "7, 6, 5" } */
  reps_weekly?: Record<string, string>;
  rir_weekly?: Record<string, string>;
  /** Superset grouping - exercises with same superset_group are performed together */
  superset_group?: string;
  /** Optional image URL — if not provided, we'll attempt fetch / fallback */
  imageUrl?: string;
  /** Array of alternative exercise names */
  alternatives?: string[];
}

/** Last-session reference for a single set: keyed by setNumber, includes stored unit */
type PreviousSets = Record<number, { weight: string; reps: string; unit?: 'kg' | 'lbs' }>;

export interface WorkoutLogScreenProps {
  exercises: Exercise[];
  /**
   * False until BOTH of the parent's async reads have landed (sets data and exercise
   * preferences). Until then the card must paint nothing: allSetsData carries the saved
   * alternative, so rendering early shows the PRIMARY exercise's title, image, muscles and a
   * missing 1RM badge, then flips the lot when storage answers. Defaults true so any other
   * caller is unaffected.
   */
  contentReady?: boolean;
  /** Index of the currently focused exercise */
  currentIndex: number;
  onIndexChange: (index: number) => void;

  /** Sets data per exercise — outer array indexed by exerciseIndex */
  allSetsData: SetData[][];
  workoutStarted: boolean;
  /** When the workout was started (for duration calculation) */
  workoutStartTime?: Date | null;
  onSetUpdate: (
    exerciseIndex: number,
    setIndex: number,
    field: 'weight' | 'reps',
    value: string,
  ) => void;
  onSetComplete: (exerciseIndex: number, setIndex: number) => void;
  onSetAdd: (exerciseIndex: number) => void;
  onSetRemove: (exerciseIndex: number, setIndex: number) => void;

  /** Workout-level handlers */
  onBack: () => void;
  onStartWorkout: () => void;
  onFinishWorkout: () => void;

  /** Optional: custom action handlers (kept for interface compatibility; unused here) */
  onOpenNotes?: (exerciseIndex: number) => void;
  onOpenHistory?: (exerciseIndex: number) => void;
  onOpenSettings?: (exerciseIndex: number) => void;

  /** Exercise alternatives functionality */
  onExerciseSelect: (exerciseIndex: number, selectedExerciseIndex: number) => void;
  onSetExercisePreference: (exerciseIndex: number, primaryExercise: string, alternatives: string[], selectedAlternative: string) => void;
  /**
   * WRITE PATH ONLY now. Which alternative is DISPLAYED is resolved everywhere from
   * allSetsData's selectedExerciseIndex (the adapter seeds it from these saved
   * preferences on a fresh workout). Reading preferences for display while the card
   * read sets data gave two sources of truth that could land from storage at
   * different times, and the swipe peeks resolving from one while the live card
   * resolved from the other was itself a content flash across commit.
   */
  exercisePreferences: { [exerciseName: string]: string };
  /** Superset management */
  onSuperset: (exerciseIndex1: number, exerciseIndex2: number, action: 'link' | 'unlink') => void;

  /** Theming */
  themeColor?: string; // default '#22d3ee'
  globalUnit?: 'kg' | 'lbs'; // default 'kg'
  currentWeek?: number; // 1-indexed
  /** Epley-style 1RM calculator: returns 1RM in same unit */
  calculate1RM?: (weight: number, reps: number) => number;

  /** Optional async resolver: given an exercise, returns a remote image URL */
  resolveExerciseImage?: (exercise: Exercise) => Promise<string | null>;
  /** Optional async resolver: given an exercise, returns both start and end images for cycling */
  resolveExerciseImagePair?: (exercise: Exercise) => Promise<{start: any, end: any} | null>;
  /** Shake animation for start button when user taps sets before starting workout */
  shakeAnimation?: Animated.Value;
  /** Handler called when user taps sets before starting workout */
  onSetTapWhenNotStarted?: () => void;
}

// ── Constants ─────────────────────────────────────────────────────

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const DEFAULT_THEME = '#22d3ee';

// Overtime is deliberately AMBER, not red. Running past a rest is completely normal, and
// red reads as an error the user caused. Warm enough to notice against the muted grey it
// replaces, calm enough not to nag.
const OVERTIME_COLOR = '#f0a33c';

// ── Personal-best detection ────────────────────────────────────────
// The logic lives in src/utils/prDetection.ts, pure and tested. It was inline here and got
// three separate things wrong on device before being extracted, all of them assumptions
// about the history format that were never checked. See that file's header.

/**
 * Distinct prior WORKOUTS an exercise needs before it can produce a record.
 *
 * Sessions, not stored entries: history holds one entry per SET, so four entries can be a
 * single workout. Counting entries was one of the three original bugs, which is why this
 * is named for sessions and the counting happens in prDetection.
 *
 * One is enough. The case being guarded against is the very first session, where there is
 * nothing to beat and every working set would fire — a firework show that teaches people
 * to ignore the toast. Beating your first session is a real improvement and should count.
 */
const PR_MIN_PRIOR_SESSIONS = 1;

/**
 * How much better a set has to be. A bare `>` fires on a 0.1kg estimated gain, which is
 * inside the noise of the Epley formula rather than evidence of anything.
 */
const PR_MIN_IMPROVEMENT = 1.01;

/**
 * Float slack for "is this bigger than what was already announced this session".
 *
 * The 1.01 margin above is measured against your ALL-TIME record, so crossing into record
 * territory has to be worth something. Once you are past it, every further climb inside the
 * same session is worth announcing even if it is small, because you are visibly building.
 * This only exists to stop an identical repeat set re-firing: estimated 1RMs are computed,
 * not measured, so the same numbers can land a hair above the stored value. A hundredth of a
 * kilo is far below anything a plate can express.
 */
const PR_REANNOUNCE_EPSILON = 0.01;
const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * Stable empties, so a card slot with no data yet receives the SAME array/object
 * identity every render. ExerciseCard is memoised on shallow prop equality; a fresh
 * [] literal per render would defeat it.
 */
const EMPTY_SETS: SetData[] = [];
const EMPTY_PREVIOUS: PreviousSets = {};
const noopRegisterRef = (_ref: TextInput | null) => {};
const noopFocusField = (_field: 'weight' | 'reps') => {};

// ── Card height arithmetic ──────────────────────────────────────────
// The pager stage is only as tall as the page position says, and its height changes by
// up to four set rows between exercises. It is animated (an interpolation of pagePos),
// which means we need each card's height BEFORE it renders — a measured height
// (onLayout) would be a frame behind and visibly lag the drag. So it is computed, and
// every term below is a pinned style constant. If any of these drift from styles.*,
// the stage will glide and then jump at the end.
const CARD_IMAGE_H = (SCREEN_WIDTH * 9) / 16; // styles.imageContainer aspectRatio 16/9
const CARD_TITLE_LINE_H = 26;                 // styles.title.lineHeight
const CARD_MUSCLES_H = 4 + 16;                // styles.muscles marginTop + lineHeight
const CARD_ONE_RM_H = 14 + 2 + 20;            // oneRMLabel.lineHeight + oneRMValue marginTop + lineHeight
const CARD_TITLE_ROW_MB = 6;                  // styles.titleRow.marginBottom
const CARD_PRESCRIPTION_H = 8 + 1 + 8 + 16 + 8 + 1 + 12; // mt + border + pt + text + pb + border + mb
const CARD_SETS_HEADER_H = 14 + 6 + 1 + 4;    // text lineHeight + paddingBottom + border + marginBottom
const CARD_SET_ROW_H = 44 + 4 * 2;            // setInput.minHeight (== setCheckCell.height) + setRow paddingVertical
const CARD_ADD_SET_H = 42 + 4;                // styles.addSetBtn height + marginTop
const CARD_FOCUS_PB = 8;                      // styles.focusArea.paddingBottom (there is no paddingTop)

// Progress-tick geometry. Must match styles.progressTicks — the highlight's position is
// computed from these rather than measured, so it can move on the drag's first frame.
const TICKS_ROW_INSET = 14; // styles.progressTicks left/right
const TICK_GAP = 5;         // styles.progressTicks gap

// Width the title must leave for the alternatives chevron: the 18px icon + its 8px margin.
//
// In ROW mode the chevron is a sibling, so it takes this space out of the title's width
// automatically. In COLUMN mode it is inline INSIDE the Text, so nothing reserved it — the
// title got the full column. That difference was a feedback loop: a name that fits in `col`
// but not in `col - 26` measured as 2 lines in row mode, which switched it to column mode,
// where it fit on 1 line, which switched it back to row... forever. Reserving the same width
// in both modes makes the wrap a pure function of the string, so it cannot depend on the
// mode it produces.
//
// That reserve is still only an APPROXIMATION of what row mode actually takes, though: it
// assumes an Ionicons chevron-down at size 18 lays out exactly 18px wide. Icon-font advance
// widths are not guaranteed to be one em, and the result is rounded to device pixels, so at
// another screen density or font scale the two modes can still hand the Text widths that
// differ by a fraction of a point — enough to flip a name whose wrap point falls between
// them. The reserve alone therefore cannot close the loop; the hidden measurement Text in
// ExerciseCard (see "MEASUREMENT vs DISPLAY" there) is what actually closes it. What remains
// for this constant is the purely cosmetic job of keeping column mode's inline chevron from
// sitting flush against the column edge.
const TITLE_CHEVRON_RESERVE = 18 + 8;

// What the HIDDEN measurement Text reserves. Deliberately two points more than
// TITLE_CHEVRON_RESERVE. Do not merge these two back into one constant on the grounds that
// they are nearly the same number — they are answering different questions, and only one of
// them is allowed to be wrong in only one direction.
//
// The measurement Text and the visible row-mode title no longer feed back on each other, but
// their widths are still only approximately equal: the measurement subtracts this flat
// reserve, while the visible row-mode Text gets the column minus the chevron's REAL laid-out
// width plus its 8px margin. Nothing guarantees that real width is 18 (see above).
//
// The error is not symmetric, so the tie must not be split:
//
//   reserve too LITTLE  the measurement under-reads. It says 1 line, the visible title wraps
//                       to 2, cardHeights under-counts that card by CARD_TITLE_LINE_H — and
//                       if that card is the tallest in the workout, stageMaxHeight is short
//                       by the same amount and pagerStage's overflow:'hidden' CLIPS the
//                       bottom of the Add set row.
//   reserve too MUCH    the measurement over-reads. The card is computed taller than it
//                       renders; the stage is fixed at the max anyway, so the surplus is a
//                       few px of black under the Up Next list. Nobody can see it.
//
// One outcome is a visible bug and the other is invisible, so err high. Two points is enough
// to absorb the icon-font advance and device-pixel rounding this is guarding against, and
// small enough that it cannot on its own push a name onto a second line it would not
// otherwise reach.
const TITLE_MEASURE_RESERVE = TITLE_CHEVRON_RESERVE + 2;

// How many times one (index, name) may change its mind about wrapping before we stop
// trusting the measurement and pin the value. A settled title never changes its mind; one or
// two changes are normal as a font finishes loading. Anything past this is a
// measure→layout→measure loop that will not converge on its own, so we latch instead of
// letting it resize the pager stage forever. See handleTitleMeasured.
const TITLE_MEASURE_FLIP_BUDGET = 3;

// ── Default Epley if not supplied ──────────────────────────────────
const defaultCalc1RM = (weight: number, reps: number): number => {
  if (!weight || !reps || reps < 1) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
};

// ── Unit conversion helpers ─────────────────────────────────────────
// Component receives globalUnit as a prop, so these live here rather than
// pulling the full context hook a second time.
function toKg(weight: number, unit: 'kg' | 'lbs'): number {
  return unit === 'lbs' ? weight * 0.453592 : weight;
}
function fromKg(kg: number, unit: 'kg' | 'lbs'): number {
  return unit === 'lbs' ? kg / 0.453592 : kg;
}
function convertWeight(weight: number, from: 'kg' | 'lbs', to: 'kg' | 'lbs'): number {
  if (from === to) return weight;
  return from === 'kg'
    ? Math.round(weight * 2.20462 * 10) / 10
    : Math.round(weight / 2.20462 * 10) / 10;
}

// ── Muscle groups for alternative exercises ─────────────────────────
// Module scope: both the card and the parent-level derivations use it, and it
// depends on nothing but its inputs.
function getExerciseMuscles(
  exerciseName: string,
  fallbackPrimary: string[],
  fallbackSecondary: string[],
): { primary: string[]; secondary: string[] } {
  const name = exerciseName.toLowerCase();

  // Common exercise muscle mappings
  if (name.includes('bench press')) {
    return { primary: ['Chest'], secondary: ['Triceps', 'Front Delts'] };
  } else if (name.includes('incline') && name.includes('press')) {
    return { primary: ['Upper Chest'], secondary: ['Front Delts', 'Triceps'] };
  } else if (name.includes('decline') && name.includes('press')) {
    return { primary: ['Lower Chest'], secondary: ['Triceps', 'Front Delts'] };
  } else if (name.includes('dumbbell press') && !name.includes('shoulder')) {
    return { primary: ['Chest'], secondary: ['Triceps', 'Front Delts'] };
  } else if (name.includes('flye') || name.includes('fly')) {
    return { primary: ['Chest'], secondary: ['Front Delts'] };
  } else if (name.includes('overhead press') || name.includes('shoulder press') || name.includes('military press')) {
    return { primary: ['Shoulders'], secondary: ['Triceps', 'Upper Chest'] };
  } else if (name.includes('lateral raise') || name.includes('side raise')) {
    return { primary: ['Side Delts'], secondary: [] };
  } else if (name.includes('rear delt') || (name.includes('reverse') && name.includes('fly'))) {
    return { primary: ['Rear Delts'], secondary: ['Rhomboids'] };
  } else if (name.includes('row') && !name.includes('upright')) {
    return { primary: ['Lats', 'Middle Traps'], secondary: ['Rear Delts', 'Rhomboids', 'Biceps'] };
  } else if (name.includes('pulldown') || name.includes('pull-up') || name.includes('pullup')) {
    return { primary: ['Lats'], secondary: ['Biceps', 'Middle Traps', 'Rear Delts'] };
  } else if (name.includes('squat')) {
    return { primary: ['Quads'], secondary: ['Glutes', 'Hamstrings'] };
  } else if (name.includes('deadlift')) {
    if (name.includes('romanian') || name.includes('rdl')) {
      return { primary: ['Hamstrings', 'Glutes'], secondary: ['Lower Back', 'Traps'] };
    } else {
      return { primary: ['Hamstrings', 'Glutes', 'Quads'], secondary: ['Lower Back', 'Traps', 'Lats'] };
    }
  } else if (name.includes('lunge')) {
    return { primary: ['Quads'], secondary: ['Glutes', 'Hamstrings'] };
  } else if (name.includes('bicep') || name.includes('curl')) {
    return { primary: ['Biceps'], secondary: ['Forearms'] };
  } else if (name.includes('tricep') || (name.includes('extension') && !name.includes('leg'))) {
    return { primary: ['Triceps'], secondary: [] };
  } else if (name.includes('calf')) {
    return { primary: ['Calves'], secondary: [] };
  } else if (name.includes('leg press')) {
    return { primary: ['Quads'], secondary: ['Glutes', 'Hamstrings'] };
  } else if (name.includes('leg curl')) {
    return { primary: ['Hamstrings'], secondary: [] };
  } else if (name.includes('leg extension')) {
    return { primary: ['Quads'], secondary: [] };
  }

  // Default fallback to the exercise's own declared muscles if no mapping found
  return { primary: fallbackPrimary, secondary: fallbackSecondary };
}

// ── Effective-exercise resolution (single source of truth) ─────────
// Which variant an exercise slot shows lives in allSetsData: sets[0].selectedExerciseIndex,
// 0 for the primary and 1+ for an entry in `alternatives`. EVERY consumer of "what is this
// slot called / what does it look like" goes through this one helper: the live card, the
// neighbour cards, the Up Next list, and the parent-level derivations for the pinned header
// and modals. That is what guarantees a card cannot change its content across a commit:
// there is no second source for it to disagree with.
function resolveEffectiveExercise(exercise: Exercise, sets: SetData[]): {
  selectedIndex: number;
  alternativeNames: string[];
  allNames: string[];
  name: string;
  effective: Exercise;
} {
  const selectedIndex = sets.length > 0 ? sets[0].selectedExerciseIndex || 0 : 0;
  const alternativeNames = (exercise?.alternatives || [])
    .filter((alt) => alt && typeof alt === 'string')
    .map((alt) => String(alt));
  const allNames = [exercise?.exercise || 'Exercise', ...alternativeNames];
  const name = allNames[selectedIndex] || exercise?.exercise || exercise?.name || 'Exercise';

  let effective = exercise;
  if (selectedIndex !== 0 && exercise) {
    const muscles = getExerciseMuscles(
      name,
      exercise.primaryMuscles || [],
      exercise.secondaryMuscles || [],
    );
    effective = {
      ...exercise,
      exercise: name,
      name,
      primaryMuscles: muscles.primary,
      secondaryMuscles: muscles.secondary,
      // Same reps_weekly, rir_weekly, etc: alternatives follow the same progression.
    };
  }

  return { selectedIndex, alternativeNames, allNames, name, effective };
}

// Helper function to parse target reps from weekly format
// Converts "6, 6, 5, 5" or "8-12" to array of rep targets
function parseTargetReps(repsString: string, setCount: number): string[] {
  if (!repsString) return [];

  // Handle comma-separated format like "6, 6, 5, 5" — one target per set
  if (repsString.includes(',')) {
    return repsString.split(',').map(rep => rep.trim());
  }

  // A single scheme like "8-12" or "10" is prescribed for every set
  const scheme = repsString.trim();
  return scheme ? Array(setCount).fill(scheme) : [];
}

/** Shown under PREV when last session's set carried no weight at all. */
const PREV_NO_WEIGHT = '—';

/**
 * PREV shows last session's load, which is stored in whatever unit it was logged
 * in — convert it to the unit on screen. Trailing zeros are dropped so a clean
 * 60kg reads as "60", not "60.0", in a 60px-wide cell.
 *
 * Weight is optional: bodyweight work is logged with reps and no load, and stores
 * as ''. That must render blank, not as a fabricated 0 — "0 × 10" reads as a real
 * measurement the user never took. Note this is "did not parse", not "is falsy":
 * a 0 the user actually typed is a genuine reading and still renders as 0.
 */
function formatPrevWeight(
  previous: { weight: string; unit?: 'kg' | 'lbs' },
  globalUnit: 'kg' | 'lbs',
): string {
  const raw = parseFloat(previous.weight);
  if (!Number.isFinite(raw)) return PREV_NO_WEIGHT;

  const converted = convertWeight(raw, previous.unit ?? globalUnit, globalUnit);
  return String(Number(converted.toFixed(1)));
}

/**
 * Per-set estimated 1RM anchors from last session, in kg, indexed by THIS session's
 * set index (0-based). One anchor per row rather than one for the whole exercise.
 *
 * Set 3 measures against last session's set 3, not against last session's best set.
 * The best set is almost always set 1, when the lifter was fresh, so anchoring every
 * row to it quietly over-suggests through the back half of the exercise. Matching
 * set-for-set carries last session's own fatigue curve into the suggestion for free,
 * with no fatigue model to tune. It also makes the two halves of the calculation
 * agree: target reps were already per set (parseTargetReps), so a whole-exercise
 * anchor was measuring a per-set target against a session-wide reference.
 *
 * Warmups are not modelled. Nothing in the data marks a set as a warmup, so a logged
 * light first set becomes set 1's anchor and reads light. The old max-based anchor
 * hid that by accident; matching set-for-set surfaces it honestly.
 *
 * Fallback when this week runs longer than last week: the last usable anchor carries
 * forward rather than the row going blank. Set 5 is at least as fatigued as set 4, so
 * set 4's anchor is a defensible floor, and a blank cell below a column of ghosts
 * reads as broken rather than as honest. Leading gaps stay 0 — there is nothing
 * earlier to carry — and 0 at any index means that row falls through to the
 * prescription ghost.
 *
 * Each set converts through its own stored unit (missing unit = the unit on screen,
 * same rule as formatPrevWeight) so a kg session read on an lbs screen still compares
 * truthfully.
 */
function previousOneRMKgBySet(
  previousSets: PreviousSets,
  setCount: number,
  globalUnit: 'kg' | 'lbs',
  calculate1RM: (w: number, r: number) => number,
): number[] {
  const anchors: number[] = [];
  let carried = 0; // last usable anchor, carried into longer weeks and interior gaps
  for (let i = 0; i < setCount; i++) {
    const p = previousSets[i + 1]; // PreviousSets is keyed by 1-based setNumber
    if (p) {
      const w = parseFloat(p.weight);
      const r = parseInt(p.reps, 10);
      if (Number.isFinite(w) && Number.isFinite(r) && w > 0 && r > 0) {
        carried = calculate1RM(toKg(w, p.unit ?? globalUnit), r);
      }
    }
    anchors.push(carried);
  }
  return anchors;
}

/**
 * The load that lines up a target rep count with a reference 1RM, in kg. Uses
 * calculate1RM(1, reps) as the rep multiplier, which is exact for any estimator
 * linear in weight (Epley, Brzycki, and every common formula are). 0 = no answer.
 */
function weightForRepsAgainstOneRM(
  targetReps: number,
  oneRMKg: number,
  calculate1RM: (w: number, r: number) => number,
): number {
  if (!(targetReps > 0) || !(oneRMKg > 0)) return 0;
  const multiplier = calculate1RM(1, targetReps);
  if (!(multiplier > 0)) return 0;
  return oneRMKg / multiplier;
}

/**
 * Round a suggested load to something loadable in the display unit — nearest
 * 2.5 kg or nearest 5 lbs — formatted like PREV (trailing zeros dropped).
 * '' when rounding lands on zero: a bar you can't load isn't a suggestion.
 */
function formatSuggestedWeight(weightKg: number, unit: 'kg' | 'lbs'): string {
  if (!(weightKg > 0)) return '';
  const inUnit = fromKg(weightKg, unit);
  const step = unit === 'lbs' ? 5 : 2.5;
  const rounded = Math.round(inUnit / step) * step;
  if (rounded <= 0) return '';
  return String(Number(rounded.toFixed(1)));
}

/** One { completed, total } per exercise index. Single source of the done-state rule. */
function computeExerciseProgress(
  exercises: Exercise[],
  allSetsData: SetData[][],
): { completed: number; total: number }[] {
  return exercises.map((_, idx) => {
    const sets = allSetsData[idx] || [];
    const completed = sets.filter((s) => s.completed).length;
    return { completed, total: sets.length };
  });
}

function hexA(hex: string, alpha: number): string {
  // Convert #RRGGBB or #RGB to rgba(r,g,b,a)
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ──────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────

export default function WorkoutLogScreen(props: WorkoutLogScreenProps) {
  const {
    exercises,
    contentReady = true,
    currentIndex,
    onIndexChange,
    allSetsData,
    workoutStarted,
    workoutStartTime,
    onSetUpdate,
    onSetComplete,
    onSetAdd,
    onSetRemove,
    onBack,
    onStartWorkout,
    onFinishWorkout,
    onExerciseSelect,
    onSetExercisePreference,
    onSuperset,
    themeColor = DEFAULT_THEME,
    globalUnit = 'kg',
    currentWeek = 1,
    calculate1RM = defaultCalc1RM,
    resolveExerciseImage,
    resolveExerciseImagePair,
    shakeAnimation,
    onSetTapWhenNotStarted,
  } = props;

  const insets = useSafeAreaInsets();
  const exerciseCount = exercises.length;

  // ── Current-exercise derivations ──────────────────────────────────
  // The three cards resolve their own content; these parent-level copies exist for
  // everything OUTSIDE the cards: the pinned History button, the header menu, the
  // modals, the keyboard accessory and the prescribed-reps autofill.
  const currentExercise = exercises[currentIndex];
  const currentSets = allSetsData[currentIndex] || EMPTY_SETS;
  const currentResolved = useMemo(
    () => (currentExercise ? resolveEffectiveExercise(currentExercise, currentSets) : null),
    [currentExercise, currentSets],
  );
  const effectiveCurrentExercise = currentResolved?.effective;
  const currentSelectedIndex = currentResolved?.selectedIndex ?? 0;

  // ── Latest-ref trampolines for adapter handlers ────────────────────
  // The adapter re-renders once a second while the workout timer runs and recreates
  // every handler each time. Passing those straight into a memoised ExerciseCard
  // would defeat the memo, so the cards receive these stable wrappers instead. Each
  // one calls whatever the CURRENT prop is, which preserves the adapter's closure
  // semantics exactly (including handleSetComplete's deliberate render-closure read;
  // see the pendingCompletion machinery further down, which compensates for it).
  const latest = useRef({
    onSetUpdate,
    onSetComplete,
    onSetAdd,
    onSetTapWhenNotStarted,
    onExerciseSelect,
    onSetExercisePreference,
  });
  latest.current = {
    onSetUpdate,
    onSetComplete,
    onSetAdd,
    onSetTapWhenNotStarted,
    onExerciseSelect,
    onSetExercisePreference,
  };

  const stableSetUpdate = useCallback(
    (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) =>
      latest.current.onSetUpdate(exerciseIndex, setIndex, field, value),
    [],
  );
  const stableSetAdd = useCallback(
    (exerciseIndex: number) => latest.current.onSetAdd(exerciseIndex),
    [],
  );
  const stableTapWhenNotStarted = useCallback(
    () => latest.current.onSetTapWhenNotStarted?.(),
    [],
  );
  const stableExerciseSelect = useCallback(
    (exerciseIndex: number, selectedExerciseIndex: number) =>
      latest.current.onExerciseSelect(exerciseIndex, selectedExerciseIndex),
    [],
  );
  const stableSetPreference = useCallback(
    (exerciseIndex: number, primaryExercise: string, alternatives: string[], selectedAlternative: string) =>
      latest.current.onSetExercisePreference(exerciseIndex, primaryExercise, alternatives, selectedAlternative),
    [],
  );

  // ── Pager core: ONE absolute page position, in synchronized twins ──
  // pagePos is the JS-side twin. Since the Up Next list moved onto a native
  // transform (see upNextTranslate below), pagePos drives NOTHING on screen any
  // more: its sole job is feeding the pagePosMirror listener, so a gesture can grab
  // the pager mid-settle without a bridge round-trip from the native value. With no
  // views attached, its spring costs a few arithmetic ops and a ref write per frame.
  // The tick indicator keeps its own native-driven twin (indicatorPage), as before.
  const pagePos = useRef(new Animated.Value(currentIndex)).current;
  // NATIVE-driven twin, carrying EVERYTHING the pager paints: the three card
  // transforms and the Up Next list's translateY. Transforms are native-driver
  // properties, so animations on this value are serialised to native once and run
  // on the UI thread even while JS is busy — which is why the cards and the list
  // can no longer move out of step: they are interpolations of the same value on
  // the same thread. One value cannot serve both drivers (an Animated.Value is
  // permanently claimed by whichever driver animates it first), hence the twins,
  // steered with identical inputs everywhere.
  const cardPos = useRef(new Animated.Value(currentIndex)).current;
  // True while a drag or its settle is in flight. The interactive card's 1s image
  // cycling checks it and holds the frame, so a cycle tick cannot land a re-render
  // in the middle of a gesture.
  const pagerDraggingRef = useRef(false);
  // JS mirror of pagePos's current value, so a gesture can grab the pager MID-SETTLE
  // (rapid flick-flick-flick) and continue from wherever it actually is instead of
  // snapping. A ref assignment per frame; trivial.
  const pagePosMirror = useRef(currentIndex);
  // The index we most recently steered pagePos towards. The currentIndex effect uses
  // it to tell "we initiated this change" (gesture commit, tap) from an external one
  // (superset auto-advance), so it never double-drives an animation.
  const pagePosTarget = useRef(currentIndex);
  const gestureBase = useRef(currentIndex);
  // Opacity over the three cards, used only by distant Up Next jumps: fade out, snap
  // pagePos and index together where ordering cannot paint, fade back in post-commit.
  const cardsFade = useRef(new Animated.Value(1)).current;
  const pendingFadeIn = useRef(false);

  // The progress bar's sliding highlight, in TICK UNITS. Native-driven (translateX is
  // a native-driver property, and the JS thread is already carrying the stage height).
  // It holds an ABSOLUTE tick position for the same reason pagePos holds an absolute
  // page: nothing to rebase at commit, so it cannot paint a frame at the old tick.
  const indicatorPage = useRef(new Animated.Value(currentIndex)).current;

  useEffect(() => {
    const id = pagePos.addListener(({ value }) => {
      pagePosMirror.current = value;
    });
    return () => pagePos.removeListener(id);
  }, [pagePos]);

  // Card N's translateX = (N - cardPos) * SCREEN_WIDTH, as an interpolation with the
  // default 'extend' extrapolation (linear everywhere). Built from the NATIVE twin,
  // so the whole value → interpolation → transform chain lives on the UI thread once
  // the first native animation runs. Cached per index so re-renders reuse the same
  // Animated node instead of re-attaching a fresh one every second.
  const translateCache = useRef(new Map<number, Animated.AnimatedInterpolation<number>>()).current;
  const getCardTranslate = useCallback(
    (n: number) => {
      let t = translateCache.get(n);
      if (!t) {
        t = cardPos.interpolate({
          inputRange: [n, n + 1],
          outputRange: [0, -SCREEN_WIDTH],
        });
        translateCache.set(n, t);
      }
      return t;
    },
    [cardPos, translateCache],
  );

  // ── React to currentIndex changes ──────────────────────────────────
  // Three cases:
  //  1. First real value (a restored workout could in principle start later): SNAP,
  //     don't fly across ticks and cards.
  //  2. We initiated it (gesture commit / tap): pagePos is already at or animating to
  //     this value. Do nothing.
  //  3. External change (the adapter's superset auto-advance is the only live source,
  //     always ±1): slide there. Anything further away snaps; with the neighbours
  //     being the only mounted cards there is nothing to slide across.
  const pagePosReady = useRef(false);
  useEffect(() => {
    if (!pagePosReady.current) {
      pagePosReady.current = true;
      pagePosTarget.current = currentIndex;
      pagePos.setValue(currentIndex);
      cardPos.setValue(currentIndex);
      indicatorPage.setValue(currentIndex);
      return;
    }
    if (pagePosTarget.current === currentIndex) return;
    pagePosTarget.current = currentIndex;

    const distance = Math.abs(currentIndex - pagePosMirror.current);
    if (distance <= 1.5) {
      Animated.timing(pagePos, {
        toValue: currentIndex,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // the JS mirror twin; drives nothing on screen
      }).start();
      Animated.timing(cardPos, {
        toValue: currentIndex,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true, // transforms only; runs on the UI thread
      }).start();
    } else {
      pagePos.setValue(currentIndex);
      cardPos.setValue(currentIndex);
    }
    Animated.timing(indicatorPage, {
      toValue: currentIndex,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [currentIndex, pagePos, cardPos, indicatorPage]);

  // Second half of a distant jump: the fade-in must not start until the commit has
  // landed and the new cards are mounted, or it would reveal a blank stage and then
  // pop. An effect keyed on currentIndex runs after exactly that commit.
  useEffect(() => {
    if (!pendingFadeIn.current) return;
    pendingFadeIn.current = false;
    Animated.timing(cardsFade, {
      toValue: 1,
      duration: 180,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [currentIndex, cardsFade]);

  /**
   * Adjacent navigation (gesture commits reuse this shape inline; taps to a
   * neighbour call it directly). Note the order: steer pagePos, then setState. With
   * derived positions the setState's timing is irrelevant to what is painted, which
   * is the entire architecture.
   */
  const slideTo = useCallback(
    (target: number) => {
      pagePosTarget.current = target;
      Animated.timing(indicatorPage, {
        toValue: target,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      Animated.timing(cardPos, {
        toValue: target,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true, // transforms only; runs on the UI thread
      }).start();
      Animated.timing(pagePos, {
        toValue: target,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // the JS mirror twin; drives nothing on screen
      }).start();
      onIndexChange(target);
    },
    [indicatorPage, cardPos, pagePos, onIndexChange],
  );

  /**
   * Distant navigation (Up Next tap two or more exercises away). The target's card is
   * not mounted, so there is nothing to slide across; instead the cards fade out, the
   * page position and index snap together behind opacity 0 (where their relative
   * ordering cannot paint anything), and the post-commit effect above fades back in.
   * The pinned tick indicator stays visible and slides across the ticks meanwhile.
   */
  const jumpTo = useCallback(
    (target: number) => {
      pagePosTarget.current = target;
      Animated.timing(cardsFade, {
        toValue: 0,
        duration: 120,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        pagePos.setValue(target);
        cardPos.setValue(target);
        Animated.timing(indicatorPage, {
          toValue: target,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
        pendingFadeIn.current = true;
        onIndexChange(target);
      });
    },
    [cardsFade, pagePos, cardPos, indicatorPage, onIndexChange],
  );

  // ── Header dropdown menu animation (panel + staggered rows) ──────
  const menuAnim = useRef(new Animated.Value(0)).current; // panel opacity/scale
  const menuRowAnims = useRef([
    new Animated.Value(0), // Muscle map
    new Animated.Value(0), // Rep scheme
    new Animated.Value(0), // 1RM progress
    new Animated.Value(0), // Notes
    new Animated.Value(0), // How it works
  ]).current;
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  // The panel is PERMANENTLY mounted and hidden purely by its native-driver
  // opacity. Unmounting it (conditionally rendering on open state) hits a known
  // RN native-driver bug: detaching the animated node from a dying view restores
  // the JS-side prop values first, painting the menu at full opacity for one
  // frame — the "flash after close". With no unmount there is no commit after
  // the fade completes, so no frame exists for the restore to paint.
  // See facebook/react-native#26978 (fixed one path) and #38510 (re-render
  // restores persist); oblador/react-native-animatable#148 for the symptom.
  useEffect(() => {
    if (headerMenuOpen) {
      menuRowAnims.forEach((a) => a.setValue(0));
      Animated.parallel([
        Animated.timing(menuAnim, {
          toValue: 1,
          duration: 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        ...menuRowAnims.map((a, i) =>
          Animated.timing(a, {
            toValue: 1,
            duration: 160,
            delay: 40 + i * 45, // top-to-bottom stagger
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ),
      ]).start();
    } else {
      Animated.timing(menuAnim, {
        toValue: 0,
        duration: 130,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [headerMenuOpen]);

  // ── Warm image cache ───────────────────────────────────────────────
  // Every exercise AND every alternative, both start and end frames, resolved and
  // decoded up front while the user is reading the first exercise. The cards read
  // this map for their first frame, so a card sliding in never waits on a resolve.
  const [miniCardImages, setMiniCardImages] = useState<Map<string, {start: any, end: any} | null>>(new Map());

  useEffect(() => {
    if (resolveExerciseImagePair && exercises.length > 0) {
      const loadAllImages = async () => {
        const newImagesMap = new Map<string, {start: any, end: any} | null>();

        const promises = exercises.map(async (exercise) => {
          const exerciseKey = exercise.exercise || exercise.name || '';

          // Load images for the primary exercise
          try {
            const images = await resolveExerciseImagePair(exercise);
            newImagesMap.set(exerciseKey, images);
          } catch (error) {
            newImagesMap.set(exerciseKey, null);
          }

          // Also load images for all alternatives
          if (exercise.alternatives && exercise.alternatives.length > 0) {
            const alternativePromises = exercise.alternatives.map(async (alternative: string) => {
              if (alternative && typeof alternative === 'string') {
                try {
                  const altImages = await resolveExerciseImagePair({ exercise: alternative, name: alternative, sets: 0, reps: 0 });
                  newImagesMap.set(alternative, altImages);
                } catch (error) {
                  newImagesMap.set(alternative, null);
                }
              }
            });
            await Promise.all(alternativePromises);
          }
        });

        await Promise.all(promises);
        setMiniCardImages(newImagesMap);

        // Warm every frame now — both the start AND end frames, since the cycling
        // animation swaps between them, and every alternative, since one can be
        // selected at any time. Piggybacks on the resolve pass above rather than
        // walking the list a second time.
        //
        // Asset.loadAsync, NOT Image.prefetch. expo-image's prefetch takes URL strings;
        // these frames are require()'d bundled modules (see exerciseImages.ts), so
        // prefetch would silently do nothing with them. Asset.loadAsync is the API for
        // bundled assets — it is also what src/utils/imagePreloader.ts uses. Any frame
        // that IS a string URI still goes through prefetch.
        const frames = Array.from(newImagesMap.values())
          .filter((pair): pair is { start: any; end: any } => !!pair)
          .flatMap((pair) => [pair.start, pair.end])
          .filter(Boolean);

        const bundled = frames.filter((f) => typeof f !== 'string');
        const remote = frames.filter((f): f is string => typeof f === 'string');

        await Promise.allSettled([
          bundled.length ? Asset.loadAsync(bundled) : Promise.resolve(),
          remote.length ? Image.prefetch(remote, 'memory-disk') : Promise.resolve(),
        ]);
        console.log(
          `🖼️ [WORKOUT] Warmed ${bundled.length} bundled + ${remote.length} remote exercise frames`,
        );
      };

      loadAllImages();
    }
  }, [exercises, resolveExerciseImagePair, themeColor]);

  // ── Load history for every exercise (+ alternatives) ──────────────
  // Raw storage rows only. Everything that needs "last session" derives it below,
  // from this snapshot, so there is exactly one place where the current session is
  // excluded and one definition of what a session is.
  const [historyByExercise, setHistoryByExercise] = useState<Record<string, WorkoutHistory[]>>({});

  /**
   * Stable dependency for the loader below.
   *
   * `exercises` is a prop, and a parent that rebuilds the array each render hands over a
   * new identity holding the same exercises. Keyed on the array, the loader re-read all of
   * storage on every parent render — including the renders caused by logging a set, which
   * is how today's own sets ended up in the "previous session" reference mid workout.
   * Keyed on the names, it runs when the exercise list actually changes and not otherwise.
   */
  const exercisesRef = useRef(exercises);
  exercisesRef.current = exercises;

  const historyKey = useMemo(
    () =>
      exercises
        .map((ex) =>
          [
            ex.exercise || ex.name || '',
            ...((ex.alternatives || []).filter((a) => a && typeof a === 'string').map(String)),
          ].join('>'),
        )
        .join('|'),
    [exercises],
  );

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      const histMap: Record<string, WorkoutHistory[]> = {};

      for (const ex of exercisesRef.current) {
        const names = [
          ex.exercise || ex.name || '',
          ...((ex.alternatives || []).filter((a) => a && typeof a === 'string').map(String)),
        ];

        for (const name of names) {
          if (!name || histMap[name]) continue; // skip blanks / already-loaded
          try {
            histMap[name] = await WorkoutStorage.getExerciseHistory(name);
          } catch (error) {
            // Non-fatal — just no reference for this exercise
          }
        }
      }

      if (!cancelled) {
        setHistoryByExercise(histMap);

        // One line per exercise, once per screen mount. This is the snapshot the personal
        // best check compares against, and "0 prior sessions" from that check is
        // indistinguishable from a key that never matched — this is what tells them apart.
        // Storage writes one entry per SET (addWorkoutEntry pushes on every completion),
        // so these counts are set counts, not workout counts. prDetection groups them by
        // day to get sessions.
        if (__DEV__) {
          Object.entries(histMap).forEach(([name, entries]) => {
            const dates = entries
              .map((entry) => String(entry.date).slice(0, 10))
              .slice(0, 6)
              .join(', ');
            console.log(
              `📚 [HISTORY-MAP] "${name}": ${entries.length} entr${
                entries.length === 1 ? 'y' : 'ies'
              }${dates ? ` — ${dates}` : ''}`,
            );
          });
        }
      }
    };

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [historyKey]);

  /**
   * The PREV reference: the most recent session STRICTLY BEFORE this one, merged.
   *
   * Two things went wrong with reading it straight off the newest storage row.
   *
   * Today counted as history. `addWorkoutEntry` appends with no date check and
   * `getExerciseHistory` filters by exercise only, so the moment a set was logged the
   * newest row was today's. PREV then showed what the user had just typed, and the
   * suggested weight was measured against the set it was supposed to be suggesting.
   * Every row is now filtered against the session start, the same boundary the personal
   * best check already uses, so a re-read mid workout cannot change the answer.
   *
   * One row is not a session. Nothing merges rows by date, so a session can be spread
   * over several. Taking the newest row alone left most set numbers missing from the map,
   * and a missing set number is a 0 anchor, which renders the suggested weight as blank.
   * All rows sharing the most recent prior date are merged into one map; later rows win a
   * duplicate set number, so a corrected re-log of set 2 beats the original.
   */
  const previousByExercise = useMemo(() => {
    const sessionStart = workoutStartTime
      ? workoutStartTime.getTime()
      : new Date().setHours(0, 0, 0, 0);

    const map: Record<string, PreviousSets> = {};

    Object.entries(historyByExercise).forEach(([name, entries]) => {
      const prior = entries.filter((entry) => {
        const t = new Date(entry.date).getTime();
        return Number.isFinite(t) && t < sessionStart;
      });
      if (prior.length === 0) return;

      // Day-level grouping, not timestamp: a session's rows are written minutes apart.
      const latestDay = prior.reduce(
        (acc, entry) => {
          const day = String(entry.date).slice(0, 10);
          return day > acc ? day : acc;
        },
        String(prior[0].date).slice(0, 10),
      );

      const setsMap: PreviousSets = {};
      prior
        .filter((entry) => String(entry.date).slice(0, 10) === latestDay)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .forEach((entry) => {
          entry.sets.forEach((s) => {
            setsMap[s.setNumber] = { weight: s.weight, reps: s.reps, unit: s.unit };
          });
        });

      if (Object.keys(setsMap).length > 0) map[name] = setsMap;
    });

    return map;
  }, [historyByExercise, workoutStartTime]);

  // ── Timer context ──────────────────────────────────────────────────
  const { timer, stopTimer, showModal: showTimerModal } = useTimer();

  // Keep a ref to the latest stopTimer so the unmount cleanup always calls the
  // current one (avoids a stale closure tearing down the wrong timer).
  const stopTimerRef = useRef(stopTimer);
  stopTimerRef.current = stopTimer;

  // When this screen goes away (finish, back button, swipe-back, or hardware
  // back), kill any running rest timer so it can't keep counting down and
  // buzzing after the workout is over.
  useEffect(() => {
    return () => {
      stopTimerRef.current?.();
    };
  }, []);

  // Rest timer text, plus whether the rest has run past its deadline. Replaces the old
  // local formatter, which clamped at zero and so could only ever report a dead "0:00"
  // once a countdown finished. The hook derives from startTime + targetTime (both
  // PRESERVED in the finished state) and carries its own 1s ticker for the overtime case,
  // because TimerContext's interval stops the moment the countdown ends.
  const restTimer = useRestTimerDisplay();

  // ── Keyboard "Log set" accessory state ───────────────────────────
  // Which set/field currently owns the keyboard (always within current exercise).
  const [focusedSet, setFocusedSet] = useState<{ setIndex: number; field: 'weight' | 'reps' } | null>(null);
  // Weight inputs of the current exercise, keyed by set index, so "Log set"
  // can advance focus to the next set's weight field. Only the INTERACTIVE card
  // registers into this map (the neighbour cards receive a no-op), so a neighbour
  // can never clobber the live card's refs.
  const weightInputRefs = useRef<Record<number, TextInput | null>>({});
  const registerWeightRef = useCallback((setIndex: number, ref: TextInput | null) => {
    weightInputRefs.current[setIndex] = ref;
  }, []);
  const handleFocusField = useCallback((setIndex: number, field: 'weight' | 'reps') => {
    setFocusedSet({ setIndex, field });
  }, []);

  // Keyboard height drives the floating accessory bar's position.
  // iOS: the keyboard overlays the app, so the bar sits at bottom = keyboardHeight.
  // Android: softwareKeyboardLayoutMode "resize" (the Expo default) shrinks the
  // root view already, so bottom = 0 is exactly on top of the keyboard.
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e: any) => {
      setKeyboardHeight(e?.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Reset keyboard focus tracking + weight input refs when the focused exercise
  // (or its selected variant) changes: set counts differ per exercise.
  useEffect(() => {
    weightInputRefs.current = {};
    setFocusedSet(null);
  }, [currentIndex, currentSelectedIndex]);

  // ── Modal state ────────────────────────────────────────────────────
  const [showFinishModal, setShowFinishModal] = useState(false);
  // Explainer for the suggested weight ghost, opened from the info dot in
  // the sets header. Keyboard dismissed first for the same reason as the 1RM modal.
  const [showSuggestionInfo, setShowSuggestionInfo] = useState(false);
  const handleShowSuggestionInfo = useCallback(() => {
    Keyboard.dismiss();
    setShowSuggestionInfo(true);
  }, []);
  // Guards against the finish action firing twice (double tap / re-entry).
  // On a real device a second fire can pop one screen too many; the simulator's
  // timing usually hides it, which is why the two behave differently.
  const finishingRef = useRef(false);

  const [showSupersetModal, setShowSupersetModal] = useState(false);
  const [supersetSourceIndex, setSupersetSourceIndex] = useState<number | null>(null);

  const [exerciseHistory, setExerciseHistory] = useState<WorkoutHistory[]>([]);
  const [showNotes, setShowNotes] = useState<{ exerciseName: string; exerciseIndex: number } | null>(null);
  const [showExerciseNotes, setShowExerciseNotes] = useState<{ exerciseName: string; exerciseIndex: number } | null>(null);
  const [exerciseNotes, setExerciseNotes] = useState<{ [exerciseIndex: number]: NoteEntry[] }>({});
  const [showDeleteSetModal, setShowDeleteSetModal] = useState<{ exerciseIndex: number; setIndex: number } | null>(null);
  const [showWorkoutHeatmap, setShowWorkoutHeatmap] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showWorkoutHistory, setShowWorkoutHistory] = useState<{
    exerciseName: string;
    exerciseIndex: number;
  } | null>(null);
  const [show1RMProgression, setShow1RMProgression] = useState<{
    exerciseName: string;
    exerciseIndex: number;
  } | null>(null);

  // Load history data when showWorkoutHistory changes
  useEffect(() => {
    const loadHistoryData = async () => {
      if (showWorkoutHistory) {
        const history = await WorkoutStorage.getExerciseHistory(showWorkoutHistory.exerciseName);
        setExerciseHistory(history);
      }
    };
    loadHistoryData();
  }, [showWorkoutHistory]);

  // ── Title wrap tracking ────────────────────────────────────────────
  // Record whether an exercise's title wraps. All three mounted cards report it, so a
  // neighbour's height is known BEFORE it slides in rather than only once it becomes
  // current. No-ops when unchanged, so it cannot churn renders mid-drag.
  const [isMultiLine, setIsMultiLine] = useState<Map<number, boolean>>(new Map());

  // Backstop for the measure→layout→measure loop. isMultiLine is the ONLY measured value in
  // this screen's layout (every other height comes from a pinned CARD_* constant) and it is
  // also an input to the layout that produces it, so a card whose two modes disagree about
  // the wrap point can flip forever. The hidden measurement Text in ExerciseCard removes the
  // known cause by making the measurement independent of the mode; this counter is what
  // catches any cause we have not thought of, on a device we do not have.
  //
  // Keyed by `${index}:${name}` rather than index alone: picking a different alternative for
  // the same slot is a genuinely different string with a genuinely different wrap point, and
  // it deserves a fresh budget. Keying that way means it gets one with no manual reset.
  //
  // It counts CHANGES of answer, not measurements. The cards are keyed by exercise index, so
  // one leaves the three-card window and remounts when you swipe back to it, and every
  // remount measures again. Those repeats all agree with each other; only a loop disagrees
  // with itself. Counting raw measurements would let a user who swipes back and forth five
  // times spend the budget on a title that never misbehaved, latch it, and — worse — report
  // an oscillation that never happened, which is the one thing the event must not do.
  const titleFlipCountRef = useRef<Map<string, { last: boolean | null; flips: number }>>(
    new Map(),
  );

  const handleTitleMeasured = useCallback((idx: number, multi: boolean, name: string) => {
    const key = `${idx}:${name}`;
    const record = titleFlipCountRef.current.get(key) ?? { last: null, flips: 0 };
    // The first measurement establishes the baseline and is never a flip.
    if (record.last !== null && record.last !== multi) record.flips += 1;
    record.last = multi;
    titleFlipCountRef.current.set(key, record);

    // Latch on TRUE, not false. Pinning the taller reading costs one line of computed card
    // height that nobody can see — the stage is already fixed at the tallest card in the
    // workout, so a card being 26px shorter than we think just moves the Up Next list down
    // by 26px. Pinning the shorter reading would instead clip a title that really does wrap.
    // Oscillation is visible; a spare line is not.
    let value = multi;
    if (record.flips > TITLE_MEASURE_FLIP_BUDGET) {
      value = true;
      if (record.flips === TITLE_MEASURE_FLIP_BUDGET + 1) {
        // Exactly once per key, on the frame the budget is first exceeded — flips only ever
        // climbs, so this equality can never come round twice. This is the only way to find
        // out remotely whether the loop was ever real and which names trip it; it does not
        // reproduce on any device we own.
        Analytics.track('title_measure_oscillation', { exercise: name, index: idx });
      }
    }

    // Still goes through the unchanged-guard below, latched or not: returning the same Map
    // is what stops the re-render, and stopping the re-render is what stops the next
    // onTextLayout. Forcing the value without this would pin the height but keep spinning.
    setIsMultiLine((prev) => {
      if (prev.get(idx) === value) return prev;
      const next = new Map(prev);
      next.set(idx, value);
      return next;
    });
  }, []);

  // ── Pager stage height ───────────────────────────────────────────
  // Every exercise's card height, computed (not measured) so the Up Next transform's
  // output range and the stage's fixed height are known BEFORE the first frame of a
  // drag. See the CARD_* constants.
  const cardHeights = useMemo(
    () =>
      exercises.map((ex, idx) => {
        const sets = allSetsData[idx] || [];

        const hasMuscles = !!(ex.primaryMuscles?.length || ex.secondaryMuscles?.length);

        // PrescriptionBanner renders null when there is neither a rep scheme nor an RIR
        const reps = ex.reps_weekly?.[String(currentWeek)] ?? ex.reps;
        const rir = ex.rir_weekly?.[String(currentWeek)];
        const hasPrescription = !!(reps || rir);

        // OneRMBadge renders null unless a completed set has a usable weight AND reps,
        // so it can appear mid-workout and change the card's height on its own.
        const hasOneRM = sets.some((s) => {
          if (!s.completed) return false;
          const w = parseFloat(s.weight);
          const r = parseInt(s.reps, 10);
          return !isNaN(w) && !isNaN(r) && w > 0 && r > 0;
        });

        const titleH = CARD_TITLE_LINE_H * (isMultiLine.get(idx) ? 2 : 1);
        const leftColH = titleH + (hasMuscles ? CARD_MUSCLES_H : 0);
        // titleRow is alignItems:'flex-start', so it is as tall as its tallest child —
        // and the 1RM badge is taller than a single-line title.
        const titleRowH = Math.max(leftColH, hasOneRM ? CARD_ONE_RM_H : 0) + CARD_TITLE_ROW_MB;

        const tableH =
          CARD_SETS_HEADER_H + sets.length * CARD_SET_ROW_H + CARD_ADD_SET_H;

        return (
          CARD_IMAGE_H +
          titleRowH +
          (hasPrescription ? CARD_PRESCRIPTION_H : 0) +
          tableH +
          CARD_FOCUS_PB
        );
      }),
    [exercises, allSetsData, currentWeek, isMultiLine],
  );

  // The stage's LAYOUT height: fixed at the tallest card in the workout. It is not
  // animated at all any more. Animating `height` was the last JS-driven motion on
  // this screen: layout properties cannot use the native driver, so every frame of
  // the old height spring needed the JS thread exactly when the commit render was
  // hogging it, and the Up Next list (positioned by that height) visibly skipped
  // frames against the natively driven cards. A box as tall as the tallest card
  // also means an incoming neighbour can never be clipped, by construction.
  // Changes only when set counts or title wraps change, at rest, as a snap.
  const stageMaxHeight = useMemo(
    () => (cardHeights.length ? Math.max(...cardHeights) : 0),
    [cardHeights],
  );

  // What the old animated height actually did visually was position the Up Next
  // list. That job now belongs to a translateY derived from cardPos, the SAME
  // native value the card transforms ride: the list is pulled up into the gap
  // below a shorter card by exactly (cardHeight - stageMaxHeight), interpolated
  // across every exercise. Because list and cards are interpolations of one value
  // on one thread, they are pixel-locked through drags, settles, and rubber-bands;
  // no JS hiccup can move them out of step. The clamp keeps the list still through
  // the end-of-list rubber-band, as the height clamp did before.
  //
  // The trade: the scroll content's layout length is now constant per workout, so
  // on exercises shorter than the tallest one there is extra scrollable black
  // beneath the list (up to the height difference). In this UI that reads as
  // padding. If that ever bothers more than the jank did, revert to interpolating
  // pagePos into the stage height and accept the JS-driven list motion.
  const upNextTranslate = useMemo(() => {
    if (cardHeights.length < 2) return 0;
    const maxH = Math.max(...cardHeights);
    return cardPos.interpolate({
      inputRange: cardHeights.map((_, i) => i),
      outputRange: cardHeights.map((h) => h - maxH), // ≤ 0: pull up into the gap
      extrapolate: 'clamp',
    });
  }, [cardHeights, cardPos]);

  // ── Prescribed reps for the current exercise ─────────────────────
  // Same derivation SetsTable uses for the greyed placeholder, lifted here so
  // both completion paths can commit it.
  const currentTargetReps = useMemo(() => {
    const weeklyReps =
      effectiveCurrentExercise?.reps_weekly?.[String(currentWeek)] ?? effectiveCurrentExercise?.reps;
    return weeklyReps ? parseTargetReps(String(weeklyReps), currentSets.length) : [];
  }, [effectiveCurrentExercise, currentWeek, currentSets.length]);

  /**
   * The suggested load for each set of the FOCUSED exercise, as a display string.
   *
   * Deliberately the same arithmetic as the KG ghost in SetRow, including the loose
   * parseInt on the target: whatever is autofilled on completion has to be the exact
   * number the user was looking at when they tapped. If these two ever diverge the app
   * logs something the user was never shown.
   */
  const currentSuggestedWeights = useMemo(() => {
    const previousSets = currentResolved
      ? previousByExercise[currentResolved.name] || EMPTY_PREVIOUS
      : EMPTY_PREVIOUS;
    const anchors = previousOneRMKgBySet(
      previousSets,
      currentSets.length,
      globalUnit,
      calculate1RM,
    );

    return currentSets.map((_, i) => {
      const target = currentTargetReps[i];
      const targetRepsInt = target ? parseInt(target, 10) : NaN;
      if (!Number.isFinite(targetRepsInt) || targetRepsInt <= 0 || !(anchors[i] > 0)) return '';
      return formatSuggestedWeight(
        weightForRepsAgainstOneRM(targetRepsInt, anchors[i], calculate1RM),
        globalUnit,
      );
    });
  }, [
    currentResolved,
    previousByExercise,
    currentSets,
    currentTargetReps,
    globalUnit,
    calculate1RM,
  ]);

  // A set completed with blank reps is marked done but silently skips history,
  // the rest timer and the superset transition (the adapter gates history on
  // `reps`). The user saw the prescription as a placeholder and assumed it was
  // logged, so commit it for them — but only when it is unambiguous. The same
  // reasoning covers a blank weight: the suggested load was sitting in the field
  // looking like a value, so a tap on the circle logs it.
  const [pendingCompletion, setPendingCompletion] = useState<{
    exerciseIndex: number;
    setIndex: number;
    awaitingReps: boolean;
    awaitingWeight: boolean;
  } | null>(null);

  // Refs so completeSet can be identity-stable for the memoised cards while always
  // reading the latest committed data. Reading refs at call time gives the same
  // values the freshest render closure would have, which is what the old inline
  // useCallback read anyway.
  const allSetsDataRef = useRef(allSetsData);
  allSetsDataRef.current = allSetsData;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const currentTargetRepsRef = useRef(currentTargetReps);
  currentTargetRepsRef.current = currentTargetReps;
  const currentSuggestedWeightsRef = useRef(currentSuggestedWeights);
  currentSuggestedWeightsRef.current = currentSuggestedWeights;

  const completeSet = useCallback((exerciseIndex: number, setIndex: number) => {
    const set = allSetsDataRef.current[exerciseIndex]?.[setIndex];

    // Un-completing or no set: nothing to fill.
    if (!set || set.completed) {
      latest.current.onSetComplete(exerciseIndex, setIndex);
      return;
    }

    // Only the focused exercise has its target reps and suggested loads in scope.
    // Both arrays are indexed by set, so a swipe mid-tap can't cross them over.
    const focused = exerciseIndex === currentIndexRef.current;

    // Reps: a value the user typed always wins.
    // Defensive: a user-imported program can prescribe a range ("8-12"). We will
    // not guess which end the user hit — leave reps blank rather than invent one.
    let awaitingReps = false;
    if (focused && !set.reps?.trim()) {
      const target = currentTargetRepsRef.current[setIndex]?.trim();
      if (target && /^\d+$/.test(target) && parseInt(target, 10) > 0) {
        latest.current.onSetUpdate(exerciseIndex, setIndex, 'reps', target);
        awaitingReps = true;
      }
    }

    // Weight: same rule, one field over. '' means there was no ghost to log —
    // no prior anchor, or bodyweight work with nothing to suggest — and a blank
    // weight is a legitimate log, so completion goes ahead untouched.
    let awaitingWeight = false;
    if (focused && !set.weight?.trim()) {
      const suggested = currentSuggestedWeightsRef.current[setIndex];
      if (suggested) {
        latest.current.onSetUpdate(exerciseIndex, setIndex, 'weight', suggested);
        awaitingWeight = true;
      }
    }

    if (!awaitingReps && !awaitingWeight) {
      latest.current.onSetComplete(exerciseIndex, setIndex);
      return;
    }

    // Wrote something, so defer completion — see the effect below for why.
    setPendingCompletion({ exerciseIndex, setIndex, awaitingReps, awaitingWeight });
  }, []);

  // The adapter's handleSetComplete reads `allSetsData` from its render closure
  // rather than via a functional update, so completing in the same tick as the
  // reps write would read reps:'' — skipping history — and its own setAllSetsData
  // would then clobber the value we just wrote. Waiting for the updated
  // `allSetsData` prop to arrive means the onSetComplete we call is the one
  // closing over the state that already contains the reps.
  useEffect(() => {
    if (!pendingCompletion) return;
    const { exerciseIndex, setIndex, awaitingReps, awaitingWeight } = pendingCompletion;
    const set = allSetsData[exerciseIndex]?.[setIndex];

    if (!set || set.completed) {
      setPendingCompletion(null);
      return;
    }
    // Only wait on the fields this completion actually wrote. Waiting on reps when
    // the weight was the autofilled one would hang forever on a prescribed range.
    if (awaitingReps && !set.reps) return; // autofill not visible yet — next render
    if (awaitingWeight && !set.weight) return;

    setPendingCompletion(null);
    latest.current.onSetComplete(exerciseIndex, setIndex);
  }, [pendingCompletion, allSetsData]);

  // ── "Log set" from the keyboard accessory ────────────────────────
  // Completes the focused set (same as tapping the circle) and advances
  // focus to the next set's weight field; dismisses on the last set.
  const handleLogFocusedSet = () => {
    if (!focusedSet) {
      Keyboard.dismiss();
      return;
    }
    const { setIndex } = focusedSet;
    completeSet(currentIndex, setIndex);

    const nextIndex = setIndex + 1;
    setTimeout(() => {
      const nextRef = weightInputRefs.current[nextIndex];
      if (nextRef) {
        setFocusedSet({ setIndex: nextIndex, field: 'weight' });
        nextRef.focus();
      } else {
        Keyboard.dismiss();
        setFocusedSet(null);
      }
    }, 60);
  };

  // Estimated 1RM for the set being typed RIGHT NOW, so the number is there before the set
  // is logged. Distinct from OneRMBadge, which reports the best COMPLETED set of the session.
  //
  // Null unless both fields hold a positive number: the moment the user types the first digit
  // of a weight the reps are still blank, and a "0.0" flickering into the bar and out again
  // would be worse than nothing. parseFloat('') is NaN, so the isFinite guards cover it.
  //
  // Weight is typed in globalUnit and calculate1RM is unit-agnostic (it just scales its
  // input), so the result is already in globalUnit — the same thing OneRMBadge does.
  const liveOneRM = useMemo(() => {
    if (!focusedSet) return null;

    const set = allSetsData[currentIndex]?.[focusedSet.setIndex];
    if (!set) return null;

    const weight = parseFloat(set.weight);
    const reps = parseInt(set.reps, 10);
    if (!isFinite(weight) || !isFinite(reps) || weight <= 0 || reps <= 0) return null;

    return calculate1RM(weight, reps);
  }, [focusedSet, allSetsData, currentIndex, calculate1RM]);

  const accessoryVisible = focusedSet !== null && keyboardHeight > 0;
  const accessoryBottom = Platform.OS === 'ios' ? keyboardHeight : 0;

  // ── Workout duration (for the finish button) ──────────────────────
  const [workoutDuration, setWorkoutDuration] = useState(0);

  useEffect(() => {
    if (!workoutStartTime) {
      setWorkoutDuration(0);
      return;
    }

    const updateDuration = () => {
      const elapsed = Math.floor((Date.now() - workoutStartTime.getTime()) / 1000);
      setWorkoutDuration(elapsed);
    };

    // Update immediately
    updateDuration();

    // Update every second
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [workoutStartTime]);

  // Format workout duration as MM:SS
  const formatWorkoutDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle finish workout button press → open the summary modal
  const handleFinishWorkoutPress = () => {
    Keyboard.dismiss();
    setFocusedSet(null);
    finishingRef.current = false; // allow a fresh finish each time the modal opens
    setShowFinishModal(true);
  };

  // Confirm finish workout
  const confirmFinishWorkout = () => {
    if (finishingRef.current) return; // ignore repeat taps / re-entry
    finishingRef.current = true;
    stopTimer(); // kill any running rest timer so it can't buzz after completion
    setShowFinishModal(false);
    onFinishWorkout();
  };

  // ── Handlers reachable from the pinned header / menu / cards ──────
  const handleExerciseLongPress = useCallback((exerciseIndex: number) => {
    setSupersetSourceIndex(exerciseIndex);
    setShowSupersetModal(true);
  }, []);

  // Stable card-facing openers (identity-stable so the memoised cards hold)
  const handleOpenOneRM = useCallback((exerciseName: string, exerciseIndex: number) => {
    // The keyboard otherwise stays open and fights the progression modal — dismiss
    // it first, and clear the focused set so the accessory bar goes with it.
    Keyboard.dismiss();
    setFocusedSet(null);
    setShow1RMProgression({ exerciseName, exerciseIndex });
  }, []);
  const handleShowDeleteModal = useCallback((exerciseIndex: number, setIndex: number) => {
    setShowDeleteSetModal({ exerciseIndex, setIndex });
  }, []);

  // Open full history for the current exercise (top-level header icon)
  const openHistoryForCurrent = () => {
    if (!effectiveCurrentExercise) return;
    setHeaderMenuOpen(false);
    setShowWorkoutHistory({
      exerciseName: effectiveCurrentExercise.exercise,
      exerciseIndex: currentIndex,
    });
  };

  const handleNotesPress = () => {
    if (!effectiveCurrentExercise) return;
    setShowNotes({ exerciseName: effectiveCurrentExercise.exercise, exerciseIndex: currentIndex });
  };

  const handleExerciseNotesPress = () => {
    if (!effectiveCurrentExercise) return;
    setShowExerciseNotes({ exerciseName: effectiveCurrentExercise.exercise, exerciseIndex: currentIndex });
  };

  const handleAddNote = (exerciseIndex: number, text: string) => {
    const newNote: NoteEntry = {
      id: Date.now().toString(),
      text,
      createdAt: new Date().toISOString(),
    };
    setExerciseNotes(prev => ({
      ...prev,
      [exerciseIndex]: [newNote, ...(prev[exerciseIndex] || [])],
    }));
  };

  const handleDeleteNote = (exerciseIndex: number, noteId: string) => {
    setExerciseNotes(prev => ({
      ...prev,
      [exerciseIndex]: (prev[exerciseIndex] || []).filter(note => note.id !== noteId),
    }));
  };

  // One path to the 1RM progression modal for the header menu. The badge inside the
  // card goes through handleOpenOneRM with the card's OWN resolved name, so a
  // selected alternative opens ITS progression rather than the primary exercise's.
  //
  // Optional-chained, and it MUST be: exercises starts as [] (the adapter fills it in
  // an effect), so on the first render there is no current exercise, and the render
  // guard sits below the hooks per the rules of hooks.
  const openOneRMProgressionForCurrent = useCallback(() => {
    const exerciseName = effectiveCurrentExercise?.exercise;
    if (!exerciseName) return;
    Keyboard.dismiss();
    setFocusedSet(null);
    setShow1RMProgression({ exerciseName, exerciseIndex: currentIndex });
  }, [effectiveCurrentExercise?.exercise, currentIndex]);

  // ── Up Next derivations ────────────────────────────────────────────
  const scrollRef = useRef<ScrollView>(null);

  // Scroll position, mapped straight from the ScrollView's onScroll on the UI thread
  // (Animated.event with useNativeDriver). It drives the hero image's depth
  // transforms in every card; because the mapping is native, a frame of scrolling
  // never touches the JS thread, and because the value is shared, all three cards
  // agree on the image's depth if a swipe happens mid-scroll.
  const scrollY = useRef(new Animated.Value(0)).current;

  // Compute progress per exercise (used in mini cards and the image progress ticks)
  const exerciseProgress = useMemo(
    () => computeExerciseProgress(exercises, allSetsData),
    [exercises, allSetsData],
  );

  // Finish-button expansion: while sets remain the button is a compact pill and the
  // rest timer takes the width; once everything is logged the full-width button
  // returns. Derived from exerciseProgress so both agree on the done rule. Deleting
  // sets counts too — done means nothing left to log, not a fixed set count.
  const allSetsComplete = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const p of exerciseProgress) {
      total += p.total;
      done += p.completed;
    }
    return total > 0 && done >= total;
  }, [exerciseProgress]);
  const compactFinish = workoutStarted && !allSetsComplete;

  // Which variant each slot shows, from allSetsData — but keyed through a STRING so
  // the derived arrays keep their identity across keystrokes. allSetsData changes on
  // every character typed; the selected indices almost never do, and rebuilding
  // effectiveExercises per keystroke would hand every memoised mini card a fresh
  // `exercise` prop and defeat the whole memo contract.
  const selectedKey = useMemo(
    () => allSetsData.map((sets) => sets?.[0]?.selectedExerciseIndex || 0).join(','),
    [allSetsData],
  );
  const selectedIndices = useMemo(
    () => (selectedKey.length ? selectedKey.split(',').map((v) => parseInt(v, 10) || 0) : []),
    [selectedKey],
  );

  const effectiveExercises = useMemo(
    () =>
      exercises.map((ex, idx) => {
        const sel = selectedIndices[idx] || 0;
        if (sel === 0) return ex;
        const alternativeNames = (ex.alternatives || [])
          .filter((a) => a && typeof a === 'string')
          .map(String);
        const altName = alternativeNames[sel - 1];
        if (!altName) return ex;
        return { ...ex, exercise: altName, name: altName };
      }),
    [exercises, selectedIndices],
  );

  // The row index travels as an argument rather than baked into a closure, so one
  // stable handler serves every card instead of a fresh lambda per row per render.
  // Adjacent taps SLIDE (the neighbour card is already mounted, so it is exactly a
  // swipe commit); distant taps fade-jump, since there is nothing mounted to slide
  // across.
  const handleMiniCardPress = useCallback(
    (idx: number) => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      const cur = currentIndexRef.current;
      if (idx === cur) return;
      if (Math.abs(idx - cur) === 1) {
        slideTo(idx);
      } else {
        jumpTo(idx);
      }
    },
    [slideTo, jumpTo],
  );

  // ── PR detection for the finish summary ──────────────────────────
  // For each exercise, compare the best estimated 1RM this session against
  // its best estimated 1RM in history. The largest improvement becomes the
  // single PR shown in FinishWorkoutModal's `pr` prop.
  const prInfo = useMemo(() => {
    let best: {
      exerciseName: string;
      weight: number;
      reps: number;
      estimatedOneRM: number;
      improvement: number;
    } | null = null;

    exercises.forEach((ex, idx) => {
      const sets = allSetsData[idx] || [];
      const selIdx = sets.length > 0 ? sets[0].selectedExerciseIndex || 0 : 0;
      const altNames = (ex.alternatives || []).filter((a) => a && typeof a === 'string').map(String);
      const names = [ex.exercise || ex.name || 'Exercise', ...altNames];
      const name = names[selIdx] || ex.exercise || '';
      if (!name) return;

      // Best estimated 1RM this session — normalize to kg for cross-unit comparison.
      // Current session sets are always typed in globalUnit.
      let bestSessionKg = 0;
      let bestSet: { weight: number; reps: number } | null = null;
      sets.forEach((s) => {
        if (!s.completed) return;
        const w = parseFloat(s.weight);
        const r = parseInt(s.reps, 10);
        if (!isNaN(w) && !isNaN(r) && w > 0 && r > 0) {
          const e = calculate1RM(toKg(w, globalUnit), r);
          if (e > bestSessionKg) {
            bestSessionKg = e;
            bestSet = { weight: w, reps: r }; // keep original for display
          }
        }
      });
      if (bestSessionKg <= 0 || !bestSet) return;

      // Best estimated 1RM in history — normalize each set to kg using its stored unit.
      // Rows from THIS session are excluded, the same boundary priorBestsByExercise uses.
      // Without that, a mid-workout history re-read put today's sets in the comparison and
      // the session was measured against itself, so bestSessionKg > bestHistKg could never
      // be true and the finish summary silently stopped reporting PRs.
      const prSessionStart = workoutStartTime
        ? workoutStartTime.getTime()
        : new Date().setHours(0, 0, 0, 0);
      let bestHistKg = 0;
      (historyByExercise[name] || [])
        .filter((h) => {
          const t = new Date(h.date).getTime();
          return Number.isFinite(t) && t < prSessionStart;
        })
        .forEach((h) =>
        h.sets.forEach((s) => {
          const w = parseFloat(s.weight);
          const r = parseInt(s.reps, 10);
          const u = s.unit ?? globalUnit;
          if (!isNaN(w) && !isNaN(r) && w > 0 && r > 0) {
            const e = calculate1RM(toKg(w, u), r);
            if (e > bestHistKg) bestHistKg = e;
          }
        }),
      );

      if (bestSessionKg > bestHistKg) {
        const improvementKg = bestSessionKg - bestHistKg;
        if (!best || improvementKg > best.improvement) {
          best = {
            exerciseName: name,
            weight: bestSet.weight,           // original typed value, in globalUnit
            reps: bestSet.reps,
            estimatedOneRM: fromKg(bestSessionKg, globalUnit), // convert back for display
            improvement: improvementKg,
          };
        }
      }
    });

    if (!best) return null;
    return {
      exerciseName: best.exerciseName,
      weight: best.weight,
      reps: best.reps,
      estimatedOneRM: best.estimatedOneRM,
    };
  }, [exercises, allSetsData, historyByExercise, workoutStartTime, calculate1RM, globalUnit]);

  // ── Personal-best detection ──────────────────────────────────────
  // Same arithmetic as prInfo above, which computes the session's single best PR for the
  // finish summary. This is the live version: it fires the moment a set lands rather than
  // at the end, and it fires per exercise rather than picking one winner.
  const [prToast, setPrToast] = useState<PRToastData | null>(null);

  /**
   * The best value already ANNOUNCED this session, per exercise index and per record kind,
   * plus the id counter that keeps two consecutive toasts distinguishable.
   *
   * This replaces an earlier `firedPRRef: Set<number>`, which allowed one toast per
   * exercise per session and then went silent. That was backwards: working up 100, 102,
   * 108 announced the 100 and swallowed the 108, so the set you actually care about — the
   * top one — was the one guaranteed to say nothing. Reported from the gym as "I set a 1RM
   * then set a bigger one and got no popup".
   *
   * Recording the number instead of the exercise keeps warm-ups quiet (they never beat the
   * all-time record, so detection returns nothing) while letting every genuine climb inside
   * a session speak. It also makes un-logging and re-logging a set silent, since the value
   * is already announced. Matches how Hevy's live PR banner behaves.
   *
   * Values are stored as detection produced them: kg for `1rm` and `weight`, a raw count
   * for `reps`. Unit conversion happens at the toast, not here.
   *
   * Refs, not state: writing them must not itself cause a render, and they carry across the
   * effect's many no-op runs.
   */
  const announcedPRRef = useRef<Record<number, Partial<Record<PRKind, number>>>>({});
  const prIdRef = useRef(0);

  /**
   * Each exercise's completed-set fingerprint as of the last check, so the next one can
   * evaluate ONLY what actually changed.
   *
   * Two bugs live in the absence of this. Scanning every exercise means a set logged on
   * exercise 0 can announce a record for exercise 3, which is baffling from the outside:
   * you tap the tick on a deadlift and get told about a lat pulldown. And a workout
   * resumed with sets already completed would fire retroactively for all of them the
   * moment the next set landed, announcing news that is twenty minutes old.
   *
   * Null until the first pass, which deliberately seeds and fires nothing: whatever was
   * already completed when this screen mounted happened before it existed.
   */
  const prevCompletedRef = useRef<string[] | null>(null);

  /**
   * Clear both detection refs when the session identity changes.
   *
   * Refs survive as long as the screen is mounted, which is longer than a workout. Finish
   * one session and start another without this screen unmounting and the announced values
   * carry over: the new workout's first genuine record is measured against the old
   * workout's numbers and stays silent. The stale fingerprint has the mirror problem, since
   * every already-completed set reads as new.
   *
   * Keyed on the start time because that IS the session identity. A null start time means
   * no workout is running, and clearing then is exactly right: whatever comes next starts
   * from nothing.
   *
   * The dependency is the NUMBER, not the Date. `workoutStartTime` is a prop, and a parent
   * that rebuilds it each render would hand over a new object with the same instant. Keyed
   * on object identity, this would then wipe the announced values on every render, and the
   * same record would fire again and again.
   *
   * Setting the fingerprint back to null rather than to the current sets matters. Null makes
   * the next detection pass seed and announce nothing, which is the same treatment a fresh
   * mount gets, so resuming a workout cannot fire retroactively for sets logged before.
   */
  const sessionKey = workoutStartTime ? workoutStartTime.getTime() : 0;
  useEffect(() => {
    announcedPRRef.current = {};
    prevCompletedRef.current = null;
  }, [sessionKey]);

  /**
   * A fingerprint of every COMPLETED set in the workout.
   *
   * This is what the detection effect keys on, instead of allSetsData itself. allSetsData
   * changes on every character typed into a weight or reps field, and running the check
   * there was both pointless and actively harmful: pointless because a completed set is
   * uneditable (`editable={workoutStarted && !completed}`), so nothing that can affect a
   * record changes while typing; harmful because the effect's dev logging then fired on
   * every keystroke, and console.log in React Native dev is a synchronous bridge round
   * trip. Enough of those in a row starve the JS thread badly enough to visibly break
   * image loading elsewhere on the screen.
   *
   * With this, the check runs when a set is logged or un-logged, and at no other time.
   */
  const completedSignature = useMemo(
    () =>
      allSetsData
        .map((sets) =>
          (sets || [])
            .filter((set) => set.completed)
            .map((set) => `${set.weight}x${set.reps}`)
            .join(','),
        )
        .join('|'),
    [allSetsData],
  );

  /**
   * Each exercise's records to beat, reduced to a handful of numbers.
   *
   * Computed ONCE per workout rather than once per logged set. History is stored one entry
   * per set, so a long-standing user has thousands of rows per exercise, and rescanning all
   * of them for every exercise on every completion is how Strong ended up shipping fixes
   * for slow record calculation and background termination on large histories.
   *
   * None of the dependencies move during a workout: the history snapshot is read at mount,
   * the start time is fixed, and the unit and formula are settings. So this runs about once.
   */
  const priorBestsByExercise = useMemo(() => {
    const sessionStart = workoutStartTime
      ? workoutStartTime.getTime()
      : new Date().setHours(0, 0, 0, 0);

    const map: Record<string, PriorBests> = {};
    Object.entries(historyByExercise).forEach(([name, history]) => {
      map[name] = summarisePriorHistory(history, sessionStart, globalUnit, calculate1RM);
    });
    return map;
  }, [historyByExercise, workoutStartTime, globalUnit, calculate1RM]);

  useEffect(() => {
    // Built the same way as completedSignature, but per exercise rather than joined, so a
    // change can be attributed to the exercise it happened on.
    const current = exercises.map((_, idx) =>
      (allSetsDataRef.current[idx] || EMPTY_SETS)
        .filter((set) => set.completed)
        .map((set) => `${set.weight}x${set.reps}`)
        .join(','),
    );
    const previous = prevCompletedRef.current;
    prevCompletedRef.current = current;

    if (!workoutStarted) return;

    // First pass seeds the baseline and announces nothing. See prevCompletedRef.
    if (previous === null) return;

    for (let idx = 0; idx < exercises.length; idx++) {
      // The heart of it: only the exercise whose completed sets just changed is a
      // candidate. Everything else is either unchanged or was already judged.
      if (current[idx] === previous[idx]) continue;

      // Read through the ref: allSetsData is deliberately not a dependency (see
      // completedSignature), so the captured prop could be a render behind.
      const sets = allSetsDataRef.current[idx] || EMPTY_SETS;
      if (sets.length === 0) continue;

      // The resolved name, so a selected alternative is measured against ITS own history.
      const name = effectiveExercises[idx]?.exercise || exercises[idx]?.exercise || '';
      if (!name) continue;

      // Absent means the history read has not landed yet, which is different from an
      // exercise with no history — only the first will ever change.
      const prior = priorBestsByExercise[name];
      if (!prior) continue;

      const result = detectPersonalBest({
        sets,
        prior,
        globalUnit,
        calculate1RM,
        minPriorSessions: PR_MIN_PRIOR_SESSIONS,
        minImprovement: PR_MIN_IMPROVEMENT,
      });

      if (__DEV__) {
        console.log(`🏆 [PR] ${idx} "${name}" — ${result.reason}: ${result.detail}`);
      }

      if (!result.pr) continue;

      // Detection always measures the session's best set against your ALL-TIME record, so
      // once you are in record territory it keeps returning a record for every subsequent
      // set — including ones that only match what was already celebrated. This is the gate
      // that turns that stream into news: say it only if it beats what was already said.
      const announced = announcedPRRef.current[idx] || {};
      const alreadySaid = announced[result.pr.kind];
      if (alreadySaid !== undefined && result.pr.value <= alreadySaid + PR_REANNOUNCE_EPSILON) {
        if (__DEV__) {
          console.log(
            `🏆 [PR] ${idx} "${name}" — suppressed, ${result.pr.value} does not beat announced ${alreadySaid}`,
          );
        }
        continue;
      }

      announcedPRRef.current[idx] = { ...announced, [result.pr.kind]: result.pr.value };
      prIdRef.current += 1;
      setPrToast({
        exerciseName: name,
        kind: result.pr.kind,
        // Reps are a count and must not be run through a weight conversion.
        value:
          result.pr.kind === 'reps' ? result.pr.value : fromKg(result.pr.value, globalUnit),
        improvement:
          result.pr.kind === 'reps'
            ? result.pr.improvement
            : fromKg(result.pr.improvement, globalUnit),
        unit: globalUnit,
        id: prIdRef.current,
      });
      // One at a time: only one set was just logged.
      break;
    }
  }, [
    completedSignature,
    exercises,
    effectiveExercises,
    priorBestsByExercise,
    workoutStarted,
    calculate1RM,
    globalUnit,
  ]);

  const handlePRToastPress = useCallback((exerciseName: string, kind: PRKind) => {
    setPrToast(null);
    // A reps record belongs to a bodyweight exercise, which has no meaningful 1RM
    // progression to show — send those to the session history instead.
    if (kind === 'reps') {
      setShowWorkoutHistory({ exerciseName, exerciseIndex: currentIndexRef.current });
      return;
    }
    setShow1RMProgression({ exerciseName, exerciseIndex: currentIndexRef.current });
  }, []);

  const handlePRToastDismissed = useCallback(() => setPrToast(null), []);

  // ── Swipe gesture ──────────────────────────────────────────────────
  // activeOffsetX/failOffsetY ensure it only claims clearly-horizontal drags, so
  // vertical scrolling (Up Next) and taps into inputs still work.
  //
  // MEMOISED: everything it closes over is a ref, a module constant, or an
  // identity-stable function, so the handler config is built once per workout.
  // Without this, the parent's once-a-second duration re-render rebuilt the Gesture
  // object and re-attached its config every tick, including mid-drag.
  //
  // Commit ordering, and why there is no completion-callback cleanup here: onEnd
  // steers the page values towards the target AND calls onIndexChange in the same
  // breath. Positions are derived from those values alone, so whenever React gets
  // around to flushing that setState, nothing on screen moves — the commit only
  // mounts the new far neighbour off screen and swaps the `interactive` flag.
  // Committing early (rather than in the settle's completion callback) also means a
  // rapid second flick always finds its next neighbour already mounted.
  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-15, 15])
        .failOffsetY([-12, 12])
        .onStart(() => {
          Keyboard.dismiss();
          setFocusedSet(null);
          // Grab the pager wherever it actually is, including mid-settle from a
          // previous flick, and continue from there. stopAnimation runs BEFORE the
          // dragging flag is raised: a stopped spring's completion callback fires
          // synchronously (finished: false) and lowers the flag, so this order is
          // what keeps the flag true for the new drag.
          pagePos.stopAnimation();
          cardPos.stopAnimation();
          indicatorPage.stopAnimation();
          pagerDraggingRef.current = true;
          gestureBase.current = pagePosMirror.current;
        })
        .onUpdate((event) => {
          const base = gestureBase.current;
          const from = Math.round(base);
          const raw = base - event.translationX / SCREEN_WIDTH;

          // Resist beyond the reachable neighbours. At the ends of the list this is
          // the same 0.35 rubber-band as before; mid-list it also resists past ±1
          // page, so a two-screen fling cannot drag into space where no card is
          // mounted.
          const min = Math.max(0, from - 1);
          const max = Math.min(exerciseCount - 1, from + 1);
          let page = raw;
          if (raw < min) page = min + (raw - min) * 0.35;
          else if (raw > max) page = max + (raw - max) * 0.35;

          pagePos.setValue(page);
          cardPos.setValue(page);
          // The indicator holds still through the rubber-band, exactly as before.
          indicatorPage.setValue(Math.min(max, Math.max(min, page)));
        })
        .onEnd((event) => {
          const from = Math.round(gestureBase.current);
          const threshold = SCREEN_WIDTH * 0.22; // ~22% of the screen
          const tx = event.translationX;
          const vx = event.velocityX;

          const goNext = (tx <= -threshold || vx < -800) && from < exerciseCount - 1;
          const goPrev = (tx >= threshold || vx > 800) && from > 0;
          const target = goNext ? from + 1 : goPrev ? from - 1 : from;

          pagePosTarget.current = target;

          // Velocity-carried springs, NOT a fixed-duration timing. A timing restarts
          // the card on its own curve regardless of how fast the finger was moving
          // at release, and that velocity discontinuity is what reads as roughness
          // even at a steady frame rate. Seeding the spring with the release
          // velocity makes the card LEAVE the finger at the finger's speed and
          // decelerate from there. RNGH reports velocityX in px/s; page units are
          // px/SCREEN_WIDTH, and page = base - tx/W, so the sign flips.
          // overshootClamping keeps a hard fling from carrying past the target
          // page, iOS-pager style. stiffness/damping are the two feel knobs: raise
          // stiffness for a snappier settle, raise damping for a softer stop.
          const pageVelocity = -vx / SCREEN_WIDTH;
          const spring = {
            toValue: target,
            velocity: pageVelocity,
            stiffness: 250,
            damping: 30,
            mass: 0.8,
            overshootClamping: true,
            restDisplacementThreshold: 0.005, // ~2px in page units
            restSpeedThreshold: 0.05,
          } as const;

          // One trajectory, three drivers: cardPos carries every visible pager
          // motion on the UI thread (the cards AND the Up Next list, whose
          // transform is derived from it), while the JS mirror twin and the tick
          // highlight follow the identical spring on their own drivers. Whichever
          // branch was taken (commit or spring-back), the release is the same shape.
          Animated.spring(cardPos, { ...spring, useNativeDriver: true }).start(() => {
            pagerDraggingRef.current = false;
          });
          Animated.spring(pagePos, { ...spring, useNativeDriver: false }).start();
          Animated.spring(indicatorPage, { ...spring, useNativeDriver: true }).start();

          if (goNext || goPrev) {
            Analytics.track('exercise_swiped', { direction: goNext ? 'next' : 'prev' });
          }

          // Early commit (or, in the spring-back case, a correction: grabbing a card
          // mid-settle and dragging it back past halfway cancels the commit that
          // flick already made, so the index must follow it home).
          if (target !== currentIndexRef.current) {
            onIndexChange(target);
          }
        }),
    [exerciseCount, onIndexChange, pagePos, cardPos, indicatorPage],
  );

  // ── Render ────────────────────────────────────────────────────────
  // Everything below here is a render-time early return, so it MUST stay beneath
  // every hook — the hooks above run unconditionally on every render, including the
  // ones where we bail.

  if (!effectiveCurrentExercise) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No exercise loaded</Text>
        </View>
      </SafeAreaView>
    );
  }

  // The parent's sets data and preferences are separate async reads. allSetsData is
  // what carries the saved alternative (via selectedExerciseIndex), so painting
  // before it lands shows the PRIMARY exercise — wrong title, wrong image, wrong
  // muscles, no 1RM badge — and then flips all of it when storage answers. Hold on an
  // empty frame instead: a blank frame beats a wrong one, and unlike a spinner it
  // does not announce a wait that is usually imperceptible.
  if (!contentReady) {
    return <SafeAreaView style={styles.root} />;
  }

  // Workout History Modal props - rendered alongside main content
  const historyModalProps = showWorkoutHistory ? {
    visible: true,
    exerciseName: showWorkoutHistory.exerciseName,
    sessions: exerciseHistory
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Newest first
      .map(workout => ({
        date: workout.date,
        workoutLabel: workout.dayName,
        sets: workout.sets.map(set => {
          const rawW = parseFloat(set.weight) || 0;
          const reps = parseInt(set.reps) || 0;
          const setUnit = set.unit ?? globalUnit;
          const weightKg = toKg(rawW, setUnit);
          const oneRMkg = weightKg > 0 && reps > 0 ? calculate1RM(weightKg, reps) : 0;
          return {
            weight: convertWeight(rawW, setUnit, globalUnit).toFixed(1),
            reps: set.reps,
            rir: oneRMkg > 0 ? fromKg(oneRMkg, globalUnit).toFixed(1) : null,
          };
        })
      })),
    onClose: () => setShowWorkoutHistory(null),
    themeColor,
    globalUnit,
  } : null;

  // Header dropdown menu items (History lives top-level, so it's not here)
  const headerMenuItems: { label: string; icon: any; onPress: () => void }[] = [
    { label: 'Muscle map', icon: 'body-outline', onPress: () => setShowWorkoutHeatmap(true) },
    { label: 'Rep scheme', icon: 'repeat-outline', onPress: handleNotesPress },
    { label: '1RM progress', icon: 'trending-up-outline', onPress: openOneRMProgressionForCurrent },
    { label: 'Notes', icon: 'document-text-outline', onPress: handleExerciseNotesPress },
    { label: 'How it works', icon: 'help-circle-outline', onPress: () => setShowHowItWorks(true) },
  ];

  // The three mounted card slots: prev / current / next, bounds-filtered. Keyed by
  // INDEX, which is the crucial property: when currentIndex changes, the slot that is
  // centred keeps its React instance and native views (same key), so a commit cannot
  // remount, blank, or restyle the card the user is looking at.
  const visibleCardIndices = [currentIndex - 1, currentIndex, currentIndex + 1].filter(
    (n) => n >= 0 && n < exercises.length,
  );

  return (
    <>
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.root}>

      {/* ── SCROLLABLE CONTENT ──────────────────────────── */}
      <Animated.ScrollView
        ref={scrollRef}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        // The scroll event is consumed natively and written into scrollY on the UI
        // thread; no JS listener is attached, so scrolling costs the JS thread
        // nothing. throttle 1 so no frame of the mapping is ever missed.
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={1}
        // "handled": with the keyboard open, taps on buttons/checkmarks/inputs fire
        // immediately instead of being swallowed by a keyboard-dismiss first tap.
        // Taps on empty space still dismiss the keyboard as before.
        keyboardShouldPersistTaps="handled"
      >
        {/* ── PAGED EXERCISE STAGE ──
            Sized to the TALLEST card in the workout and never animated, so an
            incoming neighbour can never be clipped. The Up Next section below is
            positioned by a native transform (upNextTranslate) instead of by this
            box's height, so its motion rides the same UI-thread value as the
            cards. */}
        <Animated.View style={[styles.pagerStage, { height: stageMaxHeight }]}>
          {/* The card layer. Faded only by distant Up Next jumps; box-none so the
              cards' own touchables work and empty space still feeds the pan. */}
          <Animated.View
            style={[StyleSheet.absoluteFillObject, { opacity: cardsFade }]}
            pointerEvents="box-none"
          >
            {visibleCardIndices.map((n) => (
              <Animated.View
                key={n}
                style={[styles.pagerCard, { transform: [{ translateX: getCardTranslate(n) }] }]}
                pointerEvents={n === currentIndex ? 'box-none' : 'none'}
                // renderToHardwareTextureAndroid used to live here (neighbours only)
                // and was REMOVED after real-device testing. A rasterised card is
                // composited with bilinear sampling at the fractional pixel offsets
                // of a slide, then re-renders live the instant the flag flips at
                // commit, so the sets table visibly changed crispness and apparent
                // size on Android at exactly that moment; and creating/destroying
                // two card-sized layers landed in the commit frame, stepping on the
                // Up Next badge fade. It also bought almost nothing: translation on
                // Android is a RenderNode property and does not invalidate the
                // subtree, so sliding an un-rasterised card was already cheap.
              >
                <ExerciseCard
                  index={n}
                  exercise={exercises[n]}
                  sets={allSetsData[n] ?? EMPTY_SETS}
                  interactive={n === currentIndex}
                  draggingRef={pagerDraggingRef}
                  scrollY={scrollY}
                  workoutStarted={workoutStarted}
                  themeColor={themeColor}
                  globalUnit={globalUnit}
                  currentWeek={currentWeek}
                  calculate1RM={calculate1RM}
                  previousByExercise={previousByExercise}
                  miniCardImages={miniCardImages}
                  resolveExerciseImagePair={resolveExerciseImagePair}
                  resolveExerciseImage={resolveExerciseImage}
                  isMultiLine={!!isMultiLine.get(n)}
                  onTitleMeasured={handleTitleMeasured}
                  onSetUpdate={stableSetUpdate}
                  onSetComplete={completeSet}
                  onSetAdd={stableSetAdd}
                  onSetTapWhenNotStarted={stableTapWhenNotStarted}
                  onFocusField={handleFocusField}
                  registerWeightRef={registerWeightRef}
                  onShowDeleteModal={handleShowDeleteModal}
                  onExerciseSelect={stableExerciseSelect}
                  onSetExercisePreference={stableSetPreference}
                  onLongPress={handleExerciseLongPress}
                  onOpenOneRM={handleOpenOneRM}
                  onShowSuggestionInfo={handleShowSuggestionInfo}
                />
              </Animated.View>
            ))}
          </Animated.View>

          {/* Workout progress — the ONE bar in the tree.
              It describes the workout, not the exercise, so it is a sibling of the
              card layer rather than a child of it: the cards slide underneath while
              this holds still. The box mirrors imageContainer's 16:9 so the ticks
              land on exactly the same pixels they did when they lived inside the
              image. */}
          <View style={styles.pinnedTicksLayer} pointerEvents="none">
            <ExerciseProgressTicks
              progress={exerciseProgress}
              indicatorPage={indicatorPage}
              themeColor={themeColor}
            />
          </View>

          {/* ── HEADER BUTTONS — pinned, the ONE header in the tree ─────────────
              These belong to the screen, not the exercise, so like the ticks they
              are a sibling of the card layer and pagePos never touches them.

              box-none, not none: the buttons must stay tappable, but the bar spans
              the full width of the image, so an `auto` container would eat every
              horizontal pan that began in the empty space between the buttons and
              kill the swipe in a strip across the top of the image. box-none lets
              touches through except where they land on an actual button.
              overlayHeaderActions needs it too — its 8px gap is part of its box. */}
          <View
            style={[styles.overlayHeader, { paddingTop: insets.top + 12 }]}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              onPress={onBack}
              style={styles.overlayBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>

            <View style={styles.overlayHeaderActions} pointerEvents="box-none">
              {/* History promoted to top-level (most-used action) */}
              <TouchableOpacity
                onPress={openHistoryForCurrent}
                style={[
                  styles.overlayBtn,
                  { backgroundColor: hexA(themeColor, 0.18), borderWidth: 1, borderColor: hexA(themeColor, 0.4) },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="time-outline" size={20} color={themeColor} />
              </TouchableOpacity>

              {/* More menu (vertical dropdown) */}
              <TouchableOpacity
                onPress={() => setHeaderMenuOpen((o) => !o)}
                style={styles.overlayBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
        {/* end paged exercise stage */}

        {/* ── UPCOMING LIST ──
            Pulled up into the gap below a shorter card by the native transform, so
            it moves in lockstep with the cards through drags and settles. */}
        <Animated.View
          style={[styles.upcomingSection, { transform: [{ translateY: upNextTranslate }] }]}
        >
          <Text style={styles.upcomingHeader}>UP NEXT</Text>
          {exercises.map((ex, idx) => {
            const progress = exerciseProgress[idx];
            const isActive = idx === currentIndex;

            // Resolved once in a memo, not rebuilt here: a fresh {...ex} literal per
            // render would give ExerciseMiniCard a new `exercise` prop every time and
            // defeat its memo.
            const effectiveExercise = effectiveExercises[idx] ?? ex;

            const nextExercise = exercises[idx + 1];
            const hasNextExercise = idx < exercises.length - 1;

            // Check if current and next exercise are linked
            const isLinkedToNext = hasNextExercise &&
              ex.superset_group &&
              nextExercise &&
              ex.superset_group === nextExercise.superset_group &&
              ex.superset_group.trim() !== '';

            return (
              <React.Fragment key={ex.id || `${ex.exercise}-${idx}`}>
                <ExerciseMiniCard
                  index={idx}
                  exercise={effectiveExercise}
                  progress={progress}
                  themeColor={themeColor}
                  isActive={isActive}
                  onPress={handleMiniCardPress}
                  onLongPress={handleExerciseLongPress}
                  exerciseImages={miniCardImages.get(effectiveExercise.exercise || effectiveExercise.name || '') || null}
                />

                {/* Show superset connector if linked */}
                {hasNextExercise && isLinkedToNext && (
                  <SupersetConnector themeColor={themeColor} />
                )}
              </React.Fragment>
            );
          })}
        </Animated.View>
      </Animated.ScrollView>

      {/* ── HEADER DROPDOWN MENU (overlays, stays fixed) ───────────── */}
      {/* Backdrop mounts/unmounts freely (it has no animated props); the panel is
          never unmounted — see the comment on the menu-animation effect. */}
      {headerMenuOpen && (
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setHeaderMenuOpen(false)}
        />
      )}
      <Animated.View
        pointerEvents={headerMenuOpen ? 'auto' : 'none'}
        style={[
          styles.headerMenu,
          {
            opacity: menuAnim,
            transform: [
              { scale: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
              { translateY: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
            ],
          },
        ]}
      >
        {headerMenuItems.map((item, i) => (
          <Animated.View
            key={item.label}
            style={{
              opacity: menuRowAnims[i],
              transform: [
                { translateY: menuRowAnims[i].interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
              ],
            }}
          >
            <TouchableOpacity
              style={[styles.headerMenuRow, i < headerMenuItems.length - 1 && styles.headerMenuRowBorder]}
              onPress={() => {
                setHeaderMenuOpen(false);
                item.onPress();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon} size={20} color={themeColor} style={styles.headerMenuIcon} />
              <Text style={styles.headerMenuLabel}>{item.label}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </Animated.View>

      {/* ── BOTTOM BAR ─────────────────────────────────────────── */}
      {!accessoryVisible && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity
            style={[
              styles.timerBadge,
              compactFinish && styles.timerBadgeGrow,
              restTimer.isOvertime && { borderColor: hexA(OVERTIME_COLOR, 0.35) },
            ]}
            onPress={showTimerModal}
            activeOpacity={0.7}
          >
            <Ionicons
              name="time-outline"
              size={compactFinish ? 17 : 16}
              color={
                restTimer.isOvertime
                  ? OVERTIME_COLOR
                  : compactFinish && restTimer.visible
                    ? themeColor
                    : '#9898a4'
              }
            />
            <Text
              style={[
                styles.timerText,
                compactFinish && styles.timerTextGrow,
                restTimer.isOvertime
                  ? { color: OVERTIME_COLOR }
                  : compactFinish && restTimer.visible
                    ? { color: themeColor }
                    : null,
              ]}
            >
              {restTimer.text}
            </Text>
            {compactFinish && restTimer.visible && (
              <Text style={styles.timerRestLabel}>rest</Text>
            )}
          </TouchableOpacity>

          {compactFinish ? (
            // Mid-workout: finishing is not the main action yet, so it recedes to a
            // pill (flag + duration) and the rest timer gets the width. Still fully
            // tappable — nothing is locked away, it just stops shouting.
            <AnimatedTouchableOpacity
              style={[
                styles.compactFinishBtn,
                {
                  backgroundColor: hexA(themeColor, 0.14),
                  borderColor: hexA(themeColor, 0.35),
                  transform: [{ translateX: shakeAnimation || 0 }],
                },
              ]}
              onPress={handleFinishWorkoutPress}
              accessibilityLabel="Finish workout"
            >
              <Ionicons name="flag-outline" size={16} color={themeColor} />
              {workoutStartTime && (
                <Text style={[styles.compactFinishText, { color: themeColor }]}>
                  {formatWorkoutDuration(workoutDuration)}
                </Text>
              )}
            </AnimatedTouchableOpacity>
          ) : (
            <AnimatedTouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: themeColor,
                  transform: [{ translateX: shakeAnimation || 0 }]
                }
              ]}
              onPress={workoutStarted ? handleFinishWorkoutPress : onStartWorkout}
            >
              <View style={styles.primaryBtnContent}>
                <Text style={styles.primaryBtnText}>
                  {workoutStarted ? 'Finish Workout' : 'Start Workout'}
                </Text>
                {workoutStarted && workoutStartTime && (
                  <Text style={styles.workoutDurationText}>
                    {formatWorkoutDuration(workoutDuration)}
                  </Text>
                )}
              </View>
            </AnimatedTouchableOpacity>
          )}
        </View>
      )}

      {/* ── Keyboard accessory: "Log set" bar (iOS + Android) ────── */}
      {accessoryVisible && (
        <View style={[styles.accessoryBar, { bottom: accessoryBottom }]}>
          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              setFocusedSet(null);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.accessoryDone}>Done</Text>
          </TouchableOpacity>

          {/* Centre slot: the rest timer and the live 1RM, which can both show at
              once — you are usually typing the next set while the previous set's
              rest counts down. */}
          <View style={styles.accessoryCenter}>
            {/* Deliberately stays up past zero now: the overtime counter is the reason
                this bar is worth looking at while you type the next set. The old guard
                here existed only to hide a finished countdown's stranded 0:00, and that
                value no longer exists — `visible` excludes the two cases that produced it
                (no timer, and one that never started). */}
            {restTimer.visible && (
              <TouchableOpacity
                style={styles.accessoryTimer}
                onPress={showTimerModal}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="time-outline"
                  size={15}
                  color={restTimer.isOvertime ? OVERTIME_COLOR : themeColor}
                />
                <Text
                  style={[
                    styles.accessoryTimerText,
                    { color: restTimer.isOvertime ? OVERTIME_COLOR : themeColor },
                  ]}
                >
                  {restTimer.text}
                </Text>
              </TouchableOpacity>
            )}

            {liveOneRM !== null && (
              <View style={styles.accessoryOneRM}>
                <Text style={styles.accessoryOneRMLabel}>1RM</Text>
                <Text style={[styles.accessoryOneRMValue, { color: themeColor }]} numberOfLines={1}>
                  {liveOneRM.toFixed(1)} {globalUnit}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.accessoryLogBtn, { backgroundColor: themeColor }]}
            onPress={handleLogFocusedSet}
            activeOpacity={0.85}
          >
            <Text style={styles.accessoryLogText}>Log set</Text>
            <Ionicons name="checkmark" size={16} color="#000" />
          </TouchableOpacity>
        </View>
      )}
      {/* ── 3-2-1-0 COUNTDOWN OVERLAY ──
          Last child of root, so it paints over the bottom bar and the keyboard accessory.
          pointerEvents="none" inside, so it never eats a tap — a rest ending is exactly
          when someone is reaching for the next set. It owns its own clock rather than
          reading timer.timeElapsed, and imports the audio alert's lead so the numbers and
          the beeps count the same four seconds by construction. See the component. */}
      {/* Sits above the bottom bar rather than over the sets table: a record is worth
          announcing, not worth hiding the thing that produced it. */}
      <PRToast
        data={prToast}
        themeColor={themeColor}
        onPress={handlePRToastPress}
        onDismissed={handlePRToastDismissed}
        bottom={insets.bottom + 72}
      />

      <CountdownOverlay themeColor={themeColor} />
    </View>
    </GestureDetector>

    {/* Existing Timer Modal */}
    <TimerModal />

    {/* Ghost-suggestion explainer sheet (info dot beside the unit header) */}
    <Modal
      visible={showSuggestionInfo}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSuggestionInfo(false)}
    >
      <Pressable
        style={styles.suggestionInfoBackdrop}
        onPress={() => setShowSuggestionInfo(false)}
      >
        <Pressable
          style={[styles.suggestionInfoCard, { paddingBottom: insets.bottom + 16 }]}
          onPress={() => {}}
        >
          <Text style={styles.suggestionInfoTitle}>Suggested weight</Text>
          <Text style={styles.suggestionInfoBody}>
            Each set is matched to the same set from last session. We work out how
            strong that set was, then show the weight that hits this week's target
            reps.
          </Text>
          <Text style={styles.suggestionInfoBody}>
            It holds you at the strength you already have, it doesn't add weight for
            you. Feeling stronger? Type in a heavier weight.
          </Text>
          <TouchableOpacity
            style={[
              styles.suggestionInfoBtn,
              { backgroundColor: hexA(themeColor, 0.14), borderColor: hexA(themeColor, 0.35) },
            ]}
            onPress={() => setShowSuggestionInfo(false)}
          >
            <Text style={[styles.suggestionInfoBtnText, { color: themeColor }]}>Got it</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>

    {/* Exercise History Modal */}
    {historyModalProps && <ExerciseHistoryModal {...historyModalProps} />}

    {/* 1RM Progression Modal */}
    {show1RMProgression && (
      <OneRMProgressionModal
        visible={true}
        onClose={() => setShow1RMProgression(null)}
        exerciseName={show1RMProgression.exerciseName}
        themeColor={themeColor}
        globalUnit={globalUnit}
      />
    )}

    {/* Superset Selection Modal */}
    <SupersetSelectionModal
      visible={showSupersetModal}
      onClose={() => {
        setShowSupersetModal(false);
        setSupersetSourceIndex(null);
      }}
      exercises={exercises}
      sourceExerciseIndex={supersetSourceIndex}
      onSuperset={onSuperset}
      themeColor={themeColor}
    />

    {/* Enhanced Finish Workout Modal (the workout summary) */}
    <FinishWorkoutModal
      visible={showFinishModal}
      onCancel={() => setShowFinishModal(false)}
      onConfirm={confirmFinishWorkout}
      allSetsData={allSetsData}
      durationSeconds={workoutDuration}
      pr={prInfo}
      themeColor={themeColor}
      globalUnit={globalUnit}
    />

    {/* Exercise Rep Scheme Modal */}
    {showNotes && (
      <RepSchemeModal
        visible={true}
        onClose={() => setShowNotes(null)}
        exercise={exercises[showNotes.exerciseIndex]}
        exerciseName={showNotes.exerciseName}
        currentWeek={currentWeek}
        themeColor={themeColor}
      />
    )}

    {/* Exercise Notes Modal */}
    {showExerciseNotes && (
      <ExerciseNotesModal
        visible={true}
        onClose={() => setShowExerciseNotes(null)}
        exerciseName={showExerciseNotes.exerciseName}
        exerciseIndex={showExerciseNotes.exerciseIndex}
        notes={exerciseNotes[showExerciseNotes.exerciseIndex] || []}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
        themeColor={themeColor}
      />
    )}

    {/* Workout Heatmap Modal */}
    <WorkoutHeatmapModal
      visible={showWorkoutHeatmap}
      onClose={() => setShowWorkoutHeatmap(false)}
      exercises={exercises}
      themeColor={themeColor}
    />

    {/* "How it works" education modal */}
    <HowItWorksModal
      visible={showHowItWorks}
      onClose={() => setShowHowItWorks(false)}
      themeColor={themeColor}
      topInset={insets.top}
      bottomInset={insets.bottom}
    />

    {/* Delete Set Modal */}
    {showDeleteSetModal && (
      <DeleteSetModal
        visible={true}
        onClose={() => setShowDeleteSetModal(null)}
        onDelete={() => {
          const { exerciseIndex, setIndex } = showDeleteSetModal;
          onSetRemove(exerciseIndex, setIndex);
          setShowDeleteSetModal(null);
        }}
        setNumber={showDeleteSetModal.setIndex + 1}
        themeColor={themeColor}
      />
    )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────

interface OneRMBadgeProps {
  sets: SetData[];
  themeColor: string;
  unit: string;
  calculate1RM: (w: number, r: number) => number;
  /**
   * Opens the progression modal. OPTIONAL, and deliberately so: the neighbour cards
   * render this same badge, and cards sliding past mid-drag must not carry live tap
   * targets. Omit it and the badge is inert, with identical geometry.
   */
  onPress?: () => void;
}

function OneRMBadge({ sets, themeColor, unit, calculate1RM, onPress }: OneRMBadgeProps) {
  // Use the heaviest completed set's 1RM
  const oneRM = useMemo(() => {
    let best = 0;
    for (const s of sets) {
      if (!s.completed) continue;
      const w = parseFloat(s.weight);
      const r = parseInt(s.reps, 10);
      if (!isNaN(w) && !isNaN(r) && w > 0 && r > 0) {
        best = Math.max(best, calculate1RM(w, r));
      }
    }
    return best;
  }, [sets, calculate1RM]);

  // Never renders without a completed set carrying a usable weight and reps, so a visible
  // badge always has a progression to open — there is no empty-tap case to guard.
  if (oneRM <= 0) return null;

  const content = (
    <>
      <Text style={styles.oneRMLabel}>1RM</Text>
      <Text style={[styles.oneRMValue, { color: themeColor }]}>
        {oneRM.toFixed(1)} {unit}
      </Text>
    </>
  );

  if (!onPress) {
    return <View style={styles.oneRMBadge}>{content}</View>;
  }

  return (
    // No chevron or arrow: the affordance is the press feedback, nothing more.
    <TouchableOpacity
      style={styles.oneRMBadge}
      onPress={onPress}
      activeOpacity={0.6}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      {content}
    </TouchableOpacity>
  );
}

interface PrescriptionBannerProps {
  exercise: Exercise;
  currentWeek: number;
  themeColor: string;
}

function PrescriptionBanner({
  exercise,
  currentWeek,
  themeColor,
}: PrescriptionBannerProps) {
  const reps = exercise.reps_weekly?.[String(currentWeek)] || exercise.reps;
  const rir = exercise.rir_weekly?.[String(currentWeek)];

  if (!reps && !rir) return null;

  return (
    <View style={[styles.prescription, { borderColor: hexA(themeColor, 0.25) }]}>
      <Text style={[styles.prescriptionLabel, { color: themeColor }]}>
        Week {currentWeek}
      </Text>
      <Text style={styles.prescriptionText}>
        {exercise.sets} × {reps}
        {rir ? ` · RIR ${rir}` : ''}
      </Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────
// ExerciseCard — THE card, singular.
//
// Rendered three times (prev / current / next) with an `interactive` flag. The old
// pager had a second, parallel implementation for the swipe previews, and every
// place the two drifted became a pop-on-commit bug: a missing Add set button, a
// missing "×" delete mark, a chevron jumping lines, numbers sitting 2px off. Those
// bugs are now impossible, because there is nothing to drift FROM.
//
// Non-interactive cards render the exact same tree (same TextInputs, same button
// heights, same title modes), with inputs uneditable and handlers inert; their
// wrapper additionally gets pointerEvents="none". Only the interactive card runs the
// image cycling, registers keyboard refs, or opens the alternatives dropdown.
// ──────────────────────────────────────────────────────────────────

interface ExerciseCardProps {
  /** This card's exercise index. Constant for the life of the mounted slot. */
  index: number;
  exercise: Exercise;
  sets: SetData[];
  /** True only for the centred, focused card. */
  interactive: boolean;
  /**
   * Shared flag, true while a pager drag or its settle is in flight. Identity-stable
   * (a ref), so it never breaks the card's memo.
   */
  draggingRef: React.MutableRefObject<boolean>;
  /**
   * The screen's scroll position, natively mapped. Drives the hero image's depth
   * transforms. Identity-stable, so it never breaks the card's memo.
   */
  scrollY: Animated.Value;
  workoutStarted: boolean;
  themeColor: string;
  globalUnit: 'kg' | 'lbs';
  currentWeek: number;
  calculate1RM: (w: number, r: number) => number;
  previousByExercise: Record<string, PreviousSets>;
  miniCardImages: Map<string, { start: any; end: any } | null>;
  resolveExerciseImagePair?: (exercise: Exercise) => Promise<{ start: any; end: any } | null>;
  resolveExerciseImage?: (exercise: Exercise) => Promise<string | null>;
  isMultiLine: boolean;
  /**
   * Reports the card's title wrap. `name` is the card's RESOLVED name (the selected
   * alternative, not the primary), so the parent can budget measurements per string
   * rather than per slot.
   */
  onTitleMeasured: (index: number, multi: boolean, name: string) => void;
  onSetUpdate: (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => void;
  onSetComplete: (exerciseIndex: number, setIndex: number) => void;
  onSetAdd: (exerciseIndex: number) => void;
  onSetTapWhenNotStarted: () => void;
  onFocusField: (setIndex: number, field: 'weight' | 'reps') => void;
  registerWeightRef: (setIndex: number, ref: TextInput | null) => void;
  onShowDeleteModal: (exerciseIndex: number, setIndex: number) => void;
  onExerciseSelect: (exerciseIndex: number, selectedExerciseIndex: number) => void;
  onSetExercisePreference: (exerciseIndex: number, primaryExercise: string, alternatives: string[], selectedAlternative: string) => void;
  onLongPress: (exerciseIndex: number) => void;
  onOpenOneRM: (exerciseName: string, exerciseIndex: number) => void;
  onShowSuggestionInfo: () => void;
}

const ExerciseCard = React.memo(function ExerciseCard({
  index,
  exercise,
  sets,
  interactive,
  draggingRef,
  scrollY,
  workoutStarted,
  themeColor,
  globalUnit,
  currentWeek,
  calculate1RM,
  previousByExercise,
  miniCardImages,
  resolveExerciseImagePair,
  resolveExerciseImage,
  isMultiLine,
  onTitleMeasured,
  onSetUpdate,
  onSetComplete,
  onSetAdd,
  onSetTapWhenNotStarted,
  onFocusField,
  registerWeightRef,
  onShowDeleteModal,
  onExerciseSelect,
  onSetExercisePreference,
  onLongPress,
  onOpenOneRM,
  onShowSuggestionInfo,
}: ExerciseCardProps) {
  // Which variant this slot shows, resolved from sets[0].selectedExerciseIndex, the
  // single display source of truth. The neighbour cards go through this exact same
  // line, which is what guarantees the card that slides in during a swipe IS the
  // card that will be interactive after the commit.
  const resolved = useMemo(() => resolveEffectiveExercise(exercise, sets), [exercise, sets]);
  const { selectedIndex, alternativeNames, allNames, name, effective } = resolved;
  const hasAlternatives = allNames.length > 1;

  const previousSets = previousByExercise[name] || EMPTY_PREVIOUS;

  // ── Alternatives dropdown (card-local) ─────────────────────────────
  const [selectorOpen, setSelectorOpen] = useState(false);
  const arrowRotation = useRef(new Animated.Value(0)).current;
  const dropdownOpacity = useRef(new Animated.Value(0)).current;
  const dropdownScale = useRef(new Animated.Value(0.95)).current;

  // Losing focus (swipe away, superset advance) closes the dropdown, the same net
  // behaviour the old index-keyed parent state produced.
  useEffect(() => {
    if (!interactive && selectorOpen) setSelectorOpen(false);
  }, [interactive, selectorOpen]);

  // Dropdown arrow rotation and alternatives animation effect
  useEffect(() => {
    if (selectorOpen) {
      Animated.parallel([
        Animated.timing(arrowRotation, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(dropdownOpacity, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(dropdownScale, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(arrowRotation, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(dropdownOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(dropdownScale, {
          toValue: 0.95,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectorOpen]);

  // ── Image: resolve + warm fallback + cycling ───────────────────────
  // The warm map (preloaded on mount for every exercise AND alternative) supplies the
  // first frame instantly, so a card sliding in never shows a gap while its own
  // resolve is in flight; the resolved pair takes over silently once it lands.
  const warmPair = miniCardImages.get(name) || null;
  const [resolvedPair, setResolvedPair] = useState<{ start: any; end: any } | null>(null);
  // "Not resolved yet" and "resolved, and there is nothing" are different states, and
  // only the second one has earned the barbell placeholder. Before this flag existed
  // the two were indistinguishable and a cold open flashed placeholder → image.
  const [resolveDone, setResolveDone] = useState(false);
  const [phase, setPhase] = useState<'start' | 'end'>('start');

  useEffect(() => {
    let cancelled = false;
    setResolvedPair(null);
    setResolveDone(false);
    setPhase('start');

    if (exercise.imageUrl) {
      setResolvedPair({ start: exercise.imageUrl, end: exercise.imageUrl });
      setResolveDone(true);
      return;
    }

    // Built here from `name` + `exercise` rather than using `effective`, whose
    // identity changes on every keystroke (it derives from `sets`) and would re-run
    // this effect per character typed.
    const resolveTarget: Exercise =
      name === (exercise.exercise || exercise.name)
        ? exercise
        : { ...exercise, exercise: name, name };

    if (resolveExerciseImagePair) {
      resolveExerciseImagePair(resolveTarget)
        .then((pair) => {
          if (!cancelled) setResolvedPair(pair && pair.start && pair.end ? pair : null);
        })
        .catch(() => {
          if (!cancelled) setResolvedPair(null);
        })
        .finally(() => {
          if (!cancelled) setResolveDone(true);
        });
      return () => {
        cancelled = true;
      };
    }

    if (resolveExerciseImage) {
      resolveExerciseImage(resolveTarget)
        .then((url) => {
          if (!cancelled) setResolvedPair(url ? { start: url, end: url } : null);
        })
        .catch(() => {
          if (!cancelled) setResolvedPair(null);
        })
        .finally(() => {
          if (!cancelled) setResolveDone(true);
        });
      return () => {
        cancelled = true;
      };
    }

    setResolveDone(true);
    return undefined;
  }, [name, exercise, resolveExerciseImagePair, resolveExerciseImage]);

  const pair = resolvedPair ?? warmPair;
  const startFrame = pair?.start ?? null;
  const endFrame = pair?.end ?? null;

  // The 1s start/end cycling that animates the exercise. Gated on `interactive`, so
  // exactly one card in the tree ever runs an interval, and losing focus freezes the
  // image where it is (its cleanup clears the interval; the phase resets on the next
  // pass through the non-interactive branch).
  useEffect(() => {
    if (!interactive || !startFrame || !endFrame) {
      setPhase('start');
      return;
    }
    const id = setInterval(() => {
      // Hold the frame while a drag or its settle is in flight: a phase flip is a
      // setState on this card, and a re-render landing mid-gesture competes on the
      // JS thread with the work already carrying the drag and the stage height.
      if (draggingRef.current) return;
      setPhase((p) => (p === 'start' ? 'end' : 'start'));
    }, 1000);
    return () => clearInterval(id);
  }, [interactive, startFrame, endFrame, draggingRef]);

  const frame = phase === 'end' && endFrame ? endFrame : startFrame;

  // ── Scroll depth on the hero image ─────────────────────────────────
  // Three motions, all native-driver properties (transform + opacity), so the whole
  // effect rides the natively mapped scrollY and never touches the JS thread:
  //  - Pull down past the top (iOS bounce; Android offsets never go negative, so
  //    Android simply skips this part): the image inflates IN PLACE, up to 1.35x,
  //    riding the bounce with no translate of its own.
  //  - Scroll away: the image lags at roughly half the scroll speed, grows gently
  //    to 1.08x as it leaves, and recedes to 40% opacity into the black.
  //
  // Why the pull side has NO translate: the canonical stretchy-header recipe
  // (translate up by half the pull + scale hard) assumes cover-cropped photos,
  // where clipping the top just reveals more image. These are CONTAINED
  // illustrations; the whole subject is the picture, and the upward translate was
  // walking the subject's head out of the frame. Geometry of the safe scale: the
  // media layer is the 16:9 frame (height H) with paddingTop 45, and in the worst
  // case (contain fits by height) the drawn top sits exactly at that padded edge,
  // offset H/2 - 45 above centre. A centred scale k lifts it by (k - 1)(H/2 - 45),
  // which reaches the clip edge only at k ≈ (H/2)/(H/2 - 45) ≈ 1.69 on a phone
  // width. 1.35 keeps roughly half the padding as margin at a full-image-height
  // pull. Raise it if you like, but stay under that ceiling.
  //
  // The image BOX never changes size — these are render transforms, not layout —
  // so the CARD_* height arithmetic is untouched. Feel knobs: the 0.45 lag factor,
  // the 1.35 pull stretch (hard ceiling ~1.69), and the 0.4 floor of the fade.
  const imageDepthStyle = useMemo(
    () => ({
      opacity: scrollY.interpolate({
        inputRange: [0, CARD_IMAGE_H * 0.9],
        outputRange: [1, 0.4],
        extrapolate: 'clamp',
      }),
      transform: [
        {
          translateY: scrollY.interpolate({
            inputRange: [-CARD_IMAGE_H, 0, CARD_IMAGE_H],
            outputRange: [0, 0, CARD_IMAGE_H * 0.45],
            extrapolate: 'clamp',
          }),
        },
        {
          scale: scrollY.interpolate({
            inputRange: [-CARD_IMAGE_H, 0, CARD_IMAGE_H],
            outputRange: [1.35, 1, 1.08],
            extrapolate: 'clamp',
          }),
        },
      ],
    }),
    [scrollY],
  );

  return (
    <View>
      {/* ── IMAGE HEADER ─────────────────────────── */}
      <View style={styles.imageContainer}>
        {/* The depth transforms live on the media layer INSIDE the clipping frame:
            imageContainer keeps its fixed 16:9 box, overflow hidden, and bottom
            radius; only the picture (and its scrim) moves within it. */}
        <Animated.View style={[styles.fullScreenMediaContainer, imageDepthStyle]}>
          {frame ? (
            // Deliberately UNKEYED by React: this view must be retained across a
            // variant change and have its `source` swapped, never remounted. A
            // changing React key unmounts the native image view and mounts a fresh
            // one with no decoded bitmap, which paints BLANK; the cycling animation
            // is the proof a source swap on a retained view is smooth (it swaps
            // `source` every second and never flashes).
            //
            // recyclingKey is the expo-image half of that contract: it resets the
            // view to blank the instant the exercise identity changes, so a stale
            // bitmap can never survive, and it does NOT reset on a mere source swap,
            // so cycling still animates on a retained, already-decoded view.
            <Image
              recyclingKey={name}
              source={typeof frame === 'string' ? { uri: frame } : frame}
              style={styles.fullScreenImage}
              contentFit="contain"
              cachePolicy="memory-disk"
              // transition 0, deliberately. This one prop governs BOTH source
              // changes, and the cycling swaps every second: a crossfade there would
              // dissolve the two frames into each other and turn a crisp two-frame
              // motion demo into a mush. Nothing needs it anyway — every frame is
              // prefetched, so a new image is already decoded when it is asked for.
              transition={0}
            />
          ) : resolveDone ? (
            // Resolved, and there is genuinely no picture for this exercise. The
            // only case that has earned the placeholder.
            <View style={styles.fullScreenPlaceholder}>
              <Ionicons name="barbell-outline" size={60} color="#3a3a44" />
              <Text style={styles.mediaPlaceholderText}>No preview</Text>
            </View>
          ) : null
          /* Not resolved yet and no warm frame: hold on an empty frame — no barbell
             claiming there is no image, and no spinner announcing a wait that is
             over in a frame or two. The container carries the surface colour, so
             this reads as the image simply not having arrived, which is the truth. */
          }
          {/* Dark overlay for text legibility */}
          <View style={styles.imageOverlay} />
        </Animated.View>

        {/* Header controls are NOT here — they belong to the screen, not the
            exercise, so they are pinned in pagerStage and hold still during a
            swipe. Rendering a copy per card would show through as a double image. */}
      </View>

      {/* ── FOCUS AREA ───────────────────────────── */}
      <TouchableOpacity
        style={styles.focusArea}
        onLongPress={interactive ? () => onLongPress(index) : undefined}
        activeOpacity={1}
        delayLongPress={600}
      >
        {/* Exercise title and info */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1, marginRight: 16, minWidth: 0 }}>
            {/* ── MEASUREMENT vs DISPLAY ──────────────────────────────────────
                This Text exists ONLY to answer "does `name` wrap?". Do not fold its
                onTextLayout back onto the visible title below, however redundant the
                duplicate string looks — that is the bug this closes.

                isMultiLine is the only measured value in this screen's layout, and it
                is also an input to the layout that produces it: it picks the title's
                mode, and each mode hands the visible Text a DIFFERENT available width
                and a DIFFERENT content to lay out.

                  row mode     the Text is a flex sibling of the chevron, so its width
                               is the column minus the chevron's real measured width
                               plus its 8px margin, and the content is `name` alone
                  column mode  the Text gets the column minus the hardcoded
                               TITLE_CHEVRON_RESERVE, and the content is `name`, a
                               space, and an inline 18px Animated.View

                TITLE_CHEVRON_RESERVE was an attempt to make those two widths equal,
                but it only equalises them if the chevron glyph really does advance
                exactly 18px, which an icon font does not promise and pixel rounding
                can break anyway. Whenever the two widths differ by any amount, a name
                whose wrap point falls between them measures 2 lines in row mode and 1
                line in column mode — and since isMultiLine flows into cardHeights →
                stageMaxHeight → upNextTranslate, every flip resizes the pager stage
                and shoves the Up Next list. The whole screen judders, not just the
                title, and it never settles.

                Measuring here instead breaks the cycle at its source: this Text is
                absolutely positioned so its own width comes from the wrapper and never
                from the mode, it reserves the chevron in BOTH modes, and it never
                contains the inline arrow. Its line count is therefore a pure function
                of the string (and the font), so it cannot depend on the value it
                produces. The visible title below is free to render however it likes.

                Breaking the cycle does not by itself make this width EQUAL to the
                visible row-mode Text's, only independent of it — so the reserve here is
                TITLE_MEASURE_RESERVE, biased a little high on purpose. See that
                constant for why the bias only goes one way.

                It is inert in every other respect: absolute + top/left/right pins it
                out of the flow so it contributes zero height, opacity 0 and no pointer
                events keep it off screen and untouchable, and it is cut out of the
                accessibility tree so a screen reader does not read the name twice. */}
            <Text
              style={[
                styles.title,
                styles.titleMeasure,
                // TITLE_MEASURE_RESERVE, not TITLE_CHEVRON_RESERVE: a measurement that
                // reserves slightly too much is invisible, one that reserves too little
                // clips the card. Read the constant's comment before equalising them.
                hasAlternatives && { paddingRight: TITLE_MEASURE_RESERVE },
              ]}
              numberOfLines={2}
              pointerEvents="none"
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              onTextLayout={(event) =>
                onTitleMeasured(index, event.nativeEvent.lines.length > 1, name)
              }
            >
              {name}
            </Text>
            <TouchableOpacity
              style={[
                styles.titleButton,
                isMultiLine && styles.titleButtonMultiline,
                // Column mode puts the chevron inline, so reserve its width here to
                // match what row mode's sibling chevron takes. See
                // TITLE_CHEVRON_RESERVE. Purely cosmetic now — the wrap decision is
                // made by the measurement Text above, not by this width.
                isMultiLine && hasAlternatives && { paddingRight: TITLE_CHEVRON_RESERVE },
              ]}
              onPress={() => interactive && hasAlternatives && setSelectorOpen((o) => !o)}
              activeOpacity={interactive && hasAlternatives ? 0.7 : 1}
            >
              {/* No onTextLayout here, deliberately — see MEASUREMENT vs DISPLAY above. */}
              <Text style={styles.title} numberOfLines={2}>
                {name}
                {hasAlternatives && isMultiLine && (
                  <Text style={styles.inlineArrow}>
                    {' '}
                    <Animated.View
                      style={{
                        transform: [
                          {
                            rotate: arrowRotation.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '180deg'],
                            }),
                          },
                        ],
                      }}
                    >
                      <Ionicons name="chevron-down" size={18} color={themeColor} />
                    </Animated.View>
                  </Text>
                )}
              </Text>
              {hasAlternatives && !isMultiLine && (
                <Animated.View
                  style={{
                    marginLeft: 8,
                    transform: [
                      {
                        rotate: arrowRotation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '180deg'],
                        }),
                      },
                    ],
                  }}
                >
                  <Ionicons name="chevron-down" size={18} color={themeColor} />
                </Animated.View>
              )}
            </TouchableOpacity>
            {!!(effective.primaryMuscles?.length || effective.secondaryMuscles?.length) && (
              <Text style={styles.muscles}>
                {[
                  ...(effective.primaryMuscles || []),
                  ...(effective.secondaryMuscles || []),
                ].join(' · ')}
              </Text>
            )}
          </View>
          <OneRMBadge
            sets={sets}
            themeColor={themeColor}
            calculate1RM={calculate1RM}
            unit={globalUnit}
            // Neighbour cards get an inert badge with identical geometry.
            onPress={interactive ? () => onOpenOneRM(name, index) : undefined}
          />
        </View>

        {/* Exercise selector dropdown */}
        {interactive && selectorOpen && hasAlternatives && (
          <Animated.View
            style={[
              styles.exerciseSelector,
              {
                opacity: dropdownOpacity,
                transform: [{ scaleY: dropdownScale }, { scaleX: dropdownScale }],
              },
            ]}
          >
            {allNames.map((optionName, optionIndex) => {
              const isSelected = optionIndex === selectedIndex;

              return (
                <TouchableOpacity
                  key={optionIndex}
                  style={[
                    styles.exerciseOption,
                    isSelected && [styles.exerciseOptionSelected, { borderLeftColor: themeColor }],
                  ]}
                  onPress={() => {
                    // Update the visual selection (the single source of truth:
                    // selectedExerciseIndex inside allSetsData)
                    onExerciseSelect(index, optionIndex);
                    // Persist the preference for FUTURE workouts (the adapter seeds
                    // fresh sets data from it)
                    if (optionIndex === 0) {
                      onSetExercisePreference(index, exercise.exercise, alternativeNames, '');
                    } else {
                      onSetExercisePreference(index, exercise.exercise, alternativeNames, optionName);
                    }
                    setSelectorOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.exerciseOptionContent}>
                    <Text style={[styles.exerciseOptionText, isSelected && { color: themeColor }]}>
                      {optionName}
                    </Text>
                    {isSelected && (
                      <View style={[styles.exerciseSelectedDot, { backgroundColor: themeColor }]} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}

        {/* Prescription banner (week + sets × reps + RIR) */}
        <PrescriptionBanner
          exercise={effective}
          currentWeek={currentWeek}
          themeColor={themeColor}
        />

        {/* Sets table */}
        <SetsTable
          exerciseIndex={index}
          sets={sets}
          unit={globalUnit}
          themeColor={themeColor}
          workoutStarted={workoutStarted}
          interactive={interactive}
          exercise={effective}
          currentWeek={currentWeek}
          previousSets={previousSets}
          calculate1RM={calculate1RM}
          onShowSuggestionInfo={onShowSuggestionInfo}
          onUpdate={onSetUpdate}
          onComplete={onSetComplete}
          onAdd={onSetAdd}
          onSetTapWhenNotStarted={onSetTapWhenNotStarted}
          onFocusField={onFocusField}
          registerWeightRef={registerWeightRef}
          onShowDeleteModal={onShowDeleteModal}
        />
      </TouchableOpacity>
    </View>
  );
});
// React.memo with the DEFAULT shallow comparison, which only works because every
// prop is kept identity-stable upstream: the parent's trampolines for adapter
// handlers, EMPTY_SETS for missing slices, and the adapter's immutable sets updates
// (an in-place mutation hands this card the same array object it already has, and no
// comparator can see inside that). The payoff: the adapter's once-a-second duration
// tick re-renders ZERO cards, and a keystroke re-renders exactly one.

interface SetsTableProps {
  exerciseIndex: number;
  sets: SetData[];
  unit: 'kg' | 'lbs';
  themeColor: string;
  workoutStarted: boolean;
  /** False on the neighbour cards: same tree, inert inputs and handlers. */
  interactive: boolean;
  exercise: Exercise; // For accessing weekly reps
  currentWeek: number; // For determining which week's reps to use
  previousSets: PreviousSets; // Last session's reference, keyed by setNumber
  calculate1RM: (w: number, r: number) => number; // For the suggestion ghosts
  onShowSuggestionInfo: () => void; // Info dot beside the unit header
  onUpdate: (
    exerciseIndex: number,
    setIndex: number,
    field: 'weight' | 'reps',
    value: string,
  ) => void;
  onComplete: (exerciseIndex: number, setIndex: number) => void;
  onAdd: (exerciseIndex: number) => void;
  onSetTapWhenNotStarted: () => void;
  onFocusField: (setIndex: number, field: 'weight' | 'reps') => void;
  registerWeightRef: (setIndex: number, ref: TextInput | null) => void;
  onShowDeleteModal: (exerciseIndex: number, setIndex: number) => void;
}

function SetsTable({
  exerciseIndex,
  sets,
  unit,
  themeColor,
  workoutStarted,
  interactive,
  exercise,
  currentWeek,
  previousSets,
  calculate1RM,
  onShowSuggestionInfo,
  onUpdate,
  onComplete,
  onAdd,
  onSetTapWhenNotStarted,
  onFocusField,
  registerWeightRef,
  onShowDeleteModal,
}: SetsTableProps) {
  // Parse target reps for this week
  const weeklyReps = exercise.reps_weekly?.[String(currentWeek)] || exercise.reps;
  const targetRepsArray = weeklyReps ? parseTargetReps(String(weeklyReps), sets.length) : [];

  // One estimated 1RM anchor per row, in kg, matched set-for-set against last
  // session. 0 at an index = no usable reference for that row, which then falls
  // straight through to the prescription ghost.
  const prevOneRMKgBySet = previousOneRMKgBySet(previousSets, sets.length, unit, calculate1RM);

  return (
    <View style={styles.setsTable}>
      {/* Header row */}
      <View style={styles.setsHeader}>
        <Text style={[styles.setsHeaderCell, { width: 30 }]}>SET</Text>
        <Text style={[styles.setsHeaderCell, { width: 60 }]}>PREV</Text>
        {/* The unit header doubles as the entry point to the ghost explainer: the
            info dot sits beside KG/LBS because the weight column is where the
            suggestion lives. Inert on neighbour cards like every other control. */}
        <TouchableOpacity
          style={styles.setsHeaderUnitCell}
          onPress={interactive ? onShowSuggestionInfo : undefined}
          disabled={!interactive}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          accessibilityLabel="What the suggested weight means"
        >
          <Text style={styles.setsHeaderCell}>{unit.toUpperCase()}</Text>
          <Ionicons name="information-circle-outline" size={13} color="#55555f" />
        </TouchableOpacity>
        <Text style={[styles.setsHeaderCell, { flex: 1, textAlign: 'center' }]}>REPS</Text>
        <Text style={[styles.setsHeaderCell, { width: 34, textAlign: 'center' }]}>
          ✓
        </Text>
      </View>

      {/* Rows */}
      {sets.map((s, i) => (
        <SetRow
          key={i}
          set={s}
          index={i}
          themeColor={themeColor}
          workoutStarted={workoutStarted}
          interactive={interactive}
          targetReps={targetRepsArray[i] || undefined}
          previous={previousSets[i + 1]}
          prevOneRMKg={prevOneRMKgBySet[i] || 0}
          calculate1RM={calculate1RM}
          isLastSet={i === sets.length - 1}
          onUpdate={(field, val) => onUpdate(exerciseIndex, i, field, val)}
          onComplete={() => onComplete(exerciseIndex, i)}
          onLongPress={() => onShowDeleteModal(exerciseIndex, i)}
          onSetTapWhenNotStarted={onSetTapWhenNotStarted}
          // Only the INTERACTIVE card registers keyboard refs / focus, or the
          // neighbours would clobber the live card's map (it is keyed by set index
          // alone).
          onFocusField={interactive ? (field) => onFocusField(i, field) : noopFocusField}
          registerWeightRef={interactive ? (ref) => registerWeightRef(i, ref) : noopRegisterRef}
          globalUnit={unit}
        />
      ))}

      {/* Add set. Rendered on every card (it occupies real height, and its absence
          from the old previews was the loudest pop on commit); pressable only on the
          interactive one. */}
      <TouchableOpacity
        style={styles.addSetBtn}
        onPress={interactive ? () => onAdd(exerciseIndex) : undefined}
        disabled={!interactive}
      >
        <Ionicons name="add" size={18} color="#9898a4" />
        <Text style={styles.addSetText}>Add set</Text>
      </TouchableOpacity>
    </View>
  );
}

interface SetRowProps {
  set: SetData;
  index: number;
  themeColor: string;
  workoutStarted: boolean;
  interactive: boolean;
  targetReps?: string; // Target reps for this specific set
  previous?: { weight: string; reps: string; unit?: 'kg' | 'lbs' }; // Last session's numbers for this set
  prevOneRMKg: number; // Estimated 1RM of the MATCHING set last session, in kg. 0 = none
  calculate1RM: (w: number, r: number) => number;
  isLastSet: boolean; // Whether this is the last set in the array
  onUpdate: (field: 'weight' | 'reps', val: string) => void;
  onComplete: () => void;
  onLongPress: () => void;
  onSetTapWhenNotStarted: () => void;
  onFocusField: (field: 'weight' | 'reps') => void;
  registerWeightRef: (ref: TextInput | null) => void;
  globalUnit: 'kg' | 'lbs'; // For the PREV column's unit conversion
}

function SetRow({
  set,
  index,
  themeColor,
  workoutStarted,
  interactive,
  targetReps,
  previous,
  prevOneRMKg,
  calculate1RM,
  isLastSet,
  onUpdate,
  onComplete,
  onLongPress,
  onSetTapWhenNotStarted,
  onFocusField,
  registerWeightRef,
  globalUnit,
}: SetRowProps) {
  const completed = set.completed;

  // The REPS ghost is the week's prescription and nothing else. It used to recalculate
  // against the typed weight, which meant the prescribed number vanished the moment the
  // user started typing — and a weight that was light against the anchor returned the
  // search ceiling, so the cell read "30". The reps for the week are decided by the
  // program; the 1RM arithmetic exists to suggest a WEIGHT, not to renegotiate them.

  // Suggested load for this set: this week's prescribed reps against the matching
  // set's estimated 1RM from last session, shown in the on-screen unit, rounded to
  // plates. Deliberately holds that 1RM flat — the mesocycle already progresses via
  // reps_weekly / rir_weekly, and adding load on top would progress twice. Only a
  // prescription can drive it — suggesting against last session's reps would just
  // echo the PREV column.
  const targetRepsInt = targetReps ? parseInt(targetReps, 10) : NaN;
  const suggestedWeight =
    Number.isFinite(targetRepsInt) && targetRepsInt > 0 && prevOneRMKg > 0
      ? formatSuggestedWeight(
          weightForRepsAgainstOneRM(targetRepsInt, prevOneRMKg, calculate1RM),
          globalUnit,
        )
      : '';
  const handlePressIn = () => {
    if (interactive && !workoutStarted) {
      onSetTapWhenNotStarted();
    }
  };

  // ── Android pan-over-input fix: the focus-gated overlay ────────────
  // A horizontal swipe that BEGINS on a native EditText does not reach the pager's
  // pan on Android: the EditText wins Android's touch negotiation and can disallow
  // parent interception, and RNGH can cancel JS-responder views when the pan
  // activates but not a raw native text field (gesture-handler issue #668; iOS is
  // unaffected because its recognizers cancel touches to any subview). RNGH's own
  // wrapped TextInput is reported in that thread not to fix it. So we route around
  // the negotiation: while a field is NOT focused, an invisible Pressable covers
  // it, the native input never sees the touch, and the pan works exactly as it
  // does over the rest of the card. A tap on the overlay focuses the input
  // programmatically (same keyboard, same onFocus path); once focused the overlay
  // unmounts, so cursor placement, selection, and paste all behave natively while
  // actually editing. The only delta: the FIRST tap on an unfocused field puts the
  // cursor at the end rather than at the tapped character.
  const weightRef = useRef<TextInput | null>(null);
  const repsRef = useRef<TextInput | null>(null);
  const [weightFocused, setWeightFocused] = useState(false);
  const [repsFocused, setRepsFocused] = useState(false);

  const pressUnfocusedField = (field: 'weight' | 'reps') => {
    if (!interactive) return;
    if (!workoutStarted) {
      onSetTapWhenNotStarted();
      return;
    }
    if (completed) return;
    (field === 'weight' ? weightRef : repsRef).current?.focus();
  };

  return (
    <View style={[styles.setRow, completed && styles.setRowCompleted]}>
        <Pressable
          onLongPress={interactive ? onLongPress : undefined}
          delayLongPress={500}
          style={styles.setNumCell}
        >
          <View style={styles.setNumInner}>
            <Text style={[styles.setNum]}>{index + 1}</Text>
            {isLastSet && <Text style={styles.setRowLastMark}>×</Text>}
          </View>
        </Pressable>

        {/* PREV — last session's reference */}
        <View style={styles.prevCellBox}>
          <Text style={styles.prevCell} numberOfLines={1}>
            {previous ? `${formatPrevWeight(previous, globalUnit)} × ${previous.reps}` : '—'}
          </Text>
        </View>

        {/* No per-row unit label — the column header already states kg/lbs, and it
            tracks the toggle. Repeating it on every row cost the weight input width
            for nothing, leaving it narrower than REPS. */}
        {/* editable is deliberately IDENTICAL on the interactive card and the
            neighbours. Flipping it at commit ran Android's setInputType path on
            every input, which resets and re-applies the typeface, and the digits
            visibly changed size for a beat exactly as the swipe landed. What
            actually makes a neighbour inert is its wrapper's pointerEvents="none";
            editable never needed to differ. */}
        <View style={styles.setInputCell}>
          <TextInput
            ref={(r) => {
              weightRef.current = r;
              registerWeightRef(r);
            }}
            style={[styles.setInput, styles.setInputField]}
            value={set.weight}
            onChangeText={(v) => onUpdate('weight', v)}
            onFocus={() => {
              setWeightFocused(true);
              onFocusField('weight');
            }}
            onBlur={() => setWeightFocused(false)}
            onPressIn={handlePressIn}
            keyboardType="decimal-pad"
            // Ghost weight: the load that lines up this week's prescribed reps
            // with last session's estimated 1RM, rounded to a loadable increment.
            placeholder={suggestedWeight}
            placeholderTextColor="#3a3a44"
            editable={workoutStarted && !completed}
          />
          {!weightFocused && (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => pressUnfocusedField('weight')}
            />
          )}
        </View>

        <View style={styles.setInputCell}>
          <TextInput
            ref={(r) => {
              repsRef.current = r;
            }}
            style={[styles.setInput, styles.setInputField]}
            value={set.reps}
            onChangeText={(v) => onUpdate('reps', v)}
            onFocus={() => {
              setRepsFocused(true);
              onFocusField('reps');
            }}
            onBlur={() => setRepsFocused(false)}
            onPressIn={handlePressIn}
            keyboardType="number-pad"
            // Ghost precedence: once a weight is typed, the suggestion says what
            // that load works out to against last session's estimated 1RM (both
            // sides normalised to kg). With no weight yet, this week's prescription
            // shows — what to hit, not what was hit last time. Last session's reps
            // are still one column to the left, under PREV.
            placeholder={targetReps || previous?.reps || ''}
            placeholderTextColor="#3a3a44"
            editable={workoutStarted && !completed}
          />
          {!repsFocused && (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => pressUnfocusedField('reps')}
            />
          )}
        </View>

        <TouchableOpacity
          onPress={interactive && workoutStarted ? onComplete : undefined}
          onPressIn={handlePressIn}
          style={styles.setCheckCell}
        >
          {completed ? (
            <Ionicons name="checkmark-circle" size={26} color={themeColor} />
          ) : (
            <Ionicons name="ellipse-outline" size={26} color="#3a3a44" />
          )}
        </TouchableOpacity>
    </View>
  );
}

/** Completed exercises are present but recede; the current one is the focal point. */
const TICK_COMPLETE_OPACITY = 0.45;

interface ExerciseProgressTicksProps {
  progress: { completed: number; total: number }[];
  /**
   * The highlight's position in TICK UNITS — 0 is the first tick, 2.5 is halfway between
   * the third and fourth. Fractional while the finger is down, so the indicator drifts.
   */
  indicatorPage: Animated.Value;
  themeColor: string;
}

/**
 * One tick per exercise along the bottom edge of the image — where you are and what
 * is done, at a glance, without scrolling to "Up Next".
 *
 * Rendered ONCE, pinned in pagerStage outside the card layer. The bar describes the
 * workout rather than any one exercise, so it holds still while the cards slide
 * beneath it.
 *
 * The ticks themselves are only ever two states — complete (faded accent) or grey. "You
 * are here" is NOT one of them: it is a separate bright bar layered on top, which slides
 * between tick positions with the drag. A completed exercise keeps its dimmed accent
 * underneath; the indicator simply passes over it.
 *
 * Positions are computed, not measured: the ticks are flex:1 with a fixed gap, so tick i
 * begins at i × (tickWidth + gap) and tickWidth falls out of the row's width and the
 * exercise count.
 */
function ExerciseProgressTicks({ progress, indicatorPage, themeColor }: ExerciseProgressTicksProps) {
  const count = progress.length;
  if (count === 0) return null;

  const rowWidth = SCREEN_WIDTH - TICKS_ROW_INSET * 2;
  const tickWidth = (rowWidth - (count - 1) * TICK_GAP) / count;
  const tickStride = tickWidth + TICK_GAP; // centre-to-centre distance between ticks

  return (
    // pointerEvents none — the image's swipe gesture must pass straight through.
    <View style={styles.progressTicks} pointerEvents="none">
      {progress.map((p, i) => {
        const isComplete = p.total > 0 && p.completed === p.total;
        return (
          <View
            key={i}
            style={[
              styles.progressTick,
              isComplete && { backgroundColor: themeColor, opacity: TICK_COMPLETE_OPACITY },
            ]}
          />
        );
      })}

      {/* The travelling highlight. Absolute, so it takes no part in the row's flex layout. */}
      <Animated.View
        style={[
          styles.progressIndicator,
          {
            width: tickWidth,
            backgroundColor: themeColor,
            transform: [{ translateX: Animated.multiply(indicatorPage, tickStride) }],
          },
        ]}
      />
    </View>
  );
}

interface ExerciseMiniCardProps {
  /** This card's row index. Passed back to the handlers so they can stay identity-stable. */
  index: number;
  exercise: Exercise;
  progress: { completed: number; total: number };
  themeColor: string;
  isActive?: boolean;
  onPress: (index: number) => void;
  onLongPress?: (index: number) => void;
  exerciseImages?: {start: any, end: any} | null;
}

const ExerciseMiniCard = React.memo(function ExerciseMiniCard({
  index,
  exercise,
  progress,
  themeColor,
  isActive = false,
  onPress,
  onLongPress,
  exerciseImages,
}: ExerciseMiniCardProps) {
  const allDone = progress.total > 0 && progress.completed === progress.total;

  // The CURRENT badge is the ONE thing on a mini card that changes when focus moves.
  // It used to be accompanied by a background / border / title-colour cross-fade and
  // an instant play-circle overlay on the icon; all of that firing at once on two
  // rows read as the list flashing, and the colour interpolations were JS-driven
  // (colour is not a native-driver property), landing exactly as the settle spring
  // finished. The highlight treatment is gone entirely; the badge alone travels,
  // fade + scale, native-driven, so a commit does zero JS animation work in the list.
  //
  // The animated value lives INSIDE the card, keyed off the isActive prop, so no new
  // prop is threaded down and React.memo still holds: a commit re-renders only the
  // two cards whose isActive actually flipped, not all N.
  const badgeAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  // Keep the badge mounted through its exit, or there is nothing left to fade. Mounting it
  // permanently is not an option: currentBadge has real width, and an invisible one would
  // squeeze every inactive card's title.
  const [badgeMounted, setBadgeMounted] = useState(isActive);

  useEffect(() => {
    if (isActive) setBadgeMounted(true);

    Animated.timing(badgeAnim, {
      toValue: isActive ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !isActive) setBadgeMounted(false);
    });
  }, [isActive, badgeAnim]);

  return (
    <TouchableOpacity
      style={[styles.miniCard, allDone && styles.miniCardDone]}
      onPress={() => onPress(index)}
      onLongPress={onLongPress ? () => onLongPress(index) : undefined}
      delayLongPress={600}
      activeOpacity={0.75}
    >
      <View style={styles.miniIcon}>
        {exerciseImages?.start ? (
          <Image
            // The row is memo'd and its exercise never changes, so this never recycles — the
            // key is here so the view can never be reused across two different exercises if
            // the list is ever reordered.
            recyclingKey={exercise.exercise || exercise.name || ''}
            source={exerciseImages.start}
            style={styles.miniExerciseImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
          />
        ) : (
          <Ionicons
            name={allDone ? 'checkmark-circle' : 'barbell-outline'}
            size={20}
            color={allDone ? themeColor : '#9898a4'}
          />
        )}
        {/* Completion overlay when an image is shown. Deliberately NOT tied to
            isActive: an instant play-circle popping in and out on focus change was
            part of the flash. Selection is the badge's job alone. */}
        {exerciseImages?.start && allDone && (
          <View style={styles.miniIconOverlay}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={themeColor}
            />
          </View>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.miniTitleRow}>
          <Text style={[styles.miniTitle, allDone && styles.miniTitleDone]}>
            {exercise.exercise || exercise.name || 'Exercise'}
          </Text>
          {badgeMounted && (
            <Animated.View
              style={[
                styles.currentBadge,
                {
                  backgroundColor: themeColor,
                  opacity: badgeAnim,
                  transform: [
                    {
                      scale: badgeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.currentBadgeText}>CURRENT</Text>
            </Animated.View>
          )}
        </View>
        <Text style={styles.miniMeta}>
          {exercise.sets} × {exercise.reps}
          {progress.total > 0 ? `  ·  ${progress.completed}/${progress.total} done` : ''}
        </Text>
      </View>

      {/* progress bar */}
      <View style={styles.miniProgressTrack}>
        <View
          style={[
            styles.miniProgressFill,
            {
              width: progress.total
                ? `${(progress.completed / progress.total) * 100}%`
                : '0%',
              backgroundColor: themeColor,
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}, (prev, next) =>
  // Compare `progress` BY VALUE. computeExerciseProgress rebuilds a {completed, total}
  // object for every exercise whenever allSetsData changes, so a shallow compare fails for
  // all N cards the moment any set is edited — even the ones that did not change. Every
  // other prop is compared by identity, which is why they are all kept stable upstream.
  prev.index === next.index &&
  prev.exercise === next.exercise &&
  prev.themeColor === next.themeColor &&
  prev.isActive === next.isActive &&
  prev.onPress === next.onPress &&
  prev.onLongPress === next.onLongPress &&
  prev.exerciseImages === next.exerciseImages &&
  prev.progress.completed === next.progress.completed &&
  prev.progress.total === next.progress.total,
);

// ── Superset Connector Component ──────────────────────────────────

interface SupersetConnectorProps {
  themeColor: string;
}

function SupersetConnector({ themeColor }: SupersetConnectorProps) {
  return (
    <View style={styles.supersetConnector}>
      <View style={styles.supersetLine} />
      <View style={[styles.supersetBadge, { borderColor: themeColor }]}>
        <Ionicons name="link" size={14} color={themeColor} />
        <Text style={[styles.supersetText, { color: themeColor }]}>SUPERSET</Text>
      </View>
      <View style={styles.supersetLine} />
    </View>
  );
}

// ── Superset Selection Modal ──────────────────────────────────────

interface SupersetSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  exercises: Exercise[];
  sourceExerciseIndex: number | null;
  onSuperset: (exerciseIndex1: number, exerciseIndex2: number, action: 'link' | 'unlink') => void;
  themeColor: string;
}

function SupersetSelectionModal({
  visible,
  onClose,
  exercises,
  sourceExerciseIndex,
  onSuperset,
  themeColor,
}: SupersetSelectionModalProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => setIsVisible(false));
    }
  }, [visible]);

  if (!isVisible || sourceExerciseIndex === null) return null;

  const sourceExercise = exercises[sourceExerciseIndex];
  const adjacentOptions = [];

  // Add previous exercise option
  if (sourceExerciseIndex > 0) {
    adjacentOptions.push({
      index: sourceExerciseIndex - 1,
      exercise: exercises[sourceExerciseIndex - 1],
      position: 'above' as const,
      icon: 'chevron-up' as const,
    });
  }

  // Add next exercise option
  if (sourceExerciseIndex < exercises.length - 1) {
    adjacentOptions.push({
      index: sourceExerciseIndex + 1,
      exercise: exercises[sourceExerciseIndex + 1],
      position: 'below' as const,
      icon: 'chevron-down' as const,
    });
  }

  const handleSelection = (targetIndex: number) => {
    // Check if exercises are already linked
    const sourceSuperset = sourceExercise?.superset_group;
    const targetSuperset = exercises[targetIndex]?.superset_group;
    const areLinked = sourceSuperset && targetSuperset && sourceSuperset === targetSuperset;

    // Add haptic feedback
    if (Platform.OS === 'ios') {
      const impactStyle = areLinked ? 'light' : 'medium';
      Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.[impactStyle.charAt(0).toUpperCase() + impactStyle.slice(1)]);
    }

    onSuperset(
      sourceExerciseIndex,
      targetIndex,
      areLinked ? 'unlink' : 'link'
    );
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.modalBackdrop,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.supersetModal,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Header with exercise name */}
          <View style={styles.supersetModalHeader}>
            <View style={[styles.supersetModalIcon, { backgroundColor: themeColor + '20' }]}>
              <Ionicons name="link" size={20} color={themeColor} />
            </View>
            <Text style={styles.supersetModalTitle}>SUPERSET</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.supersetModalClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#55555f" />
            </TouchableOpacity>
          </View>

          {/* Current exercise card */}
          <View style={[styles.supersetCurrentExercise, { borderColor: themeColor + '40' }]}>
            <Text style={styles.supersetCurrentLabel}>SELECTED</Text>
            <Text style={styles.supersetCurrentName}>{sourceExercise?.exercise}</Text>
          </View>

          {/* Link options */}
          <View style={styles.supersetOptions}>
            {adjacentOptions.map((option, index) => {
              const sourceSuperset = sourceExercise?.superset_group;
              const targetSuperset = option.exercise?.superset_group;
              const areLinked = sourceSuperset && targetSuperset && sourceSuperset === targetSuperset;

              return (
                <React.Fragment key={option.index}>
                  {index > 0 && <View style={styles.supersetDivider} />}

                  <TouchableOpacity
                    style={[
                      styles.supersetOption,
                      areLinked && styles.supersetOptionLinked,
                      areLinked && { backgroundColor: themeColor + '10', borderColor: themeColor + '60' }
                    ]}
                    onPress={() => handleSelection(option.index)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.supersetOptionLeft}>
                      <View style={[
                        styles.supersetOptionIcon,
                        { backgroundColor: areLinked ? themeColor + '20' : '#18181b' }
                      ]}>
                        <Ionicons
                          name={option.icon}
                          size={16}
                          color={areLinked ? themeColor : '#55555f'}
                        />
                      </View>

                      <View style={styles.supersetOptionInfo}>
                        <Text style={[
                          styles.supersetOptionLabel,
                          areLinked && { color: themeColor }
                        ]}>
                          {option.position === 'above' ? 'PREVIOUS' : 'NEXT'} EXERCISE
                        </Text>
                        <Text style={[
                          styles.supersetOptionName,
                          areLinked && styles.supersetOptionNameLinked
                        ]}>
                          {option.exercise?.exercise}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.supersetToggleBtn,
                        areLinked ?
                          { backgroundColor: themeColor, borderColor: themeColor } :
                          { backgroundColor: '#0a0a0f', borderColor: 'rgba(255,255,255,0.1)' }
                      ]}
                      onPress={() => handleSelection(option.index)}
                    >
                      <Ionicons
                        name={areLinked ? "link" : "add"}
                        size={16}
                        color={areLinked ? '#000' : '#9898a4'}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}

            {adjacentOptions.length === 0 && (
              <View style={styles.supersetEmptyState}>
                <Ionicons name="information-circle-outline" size={32} color="#55555f" />
                <Text style={styles.supersetNoOptions}>
                  This exercise has no adjacent exercises to link
                </Text>
              </View>
            )}
          </View>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#55555f',
    fontFamily: 'DMMono-Regular',
    fontSize: 14,
  },

  // ── Header ─────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Unified scroll layout ─────────────────────
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140, // Space for bottom bar
  },

  // ── Swipe pager ────────────────────────────────
  pagerStage: {
    width: '100%',
    overflow: 'hidden', // clips the off-screen neighbour cards to the screen edge
  },
  // Pinned progress bar: a sibling of the card layer, so the swipe never touches it.
  // Mirrors imageContainer's box (top of the stage, 16:9) so the ticks inside it land
  // at the same screen position they did when they lived in the image. Sits inside
  // pagerStage's bounds, so overflow: 'hidden' does not clip it.
  pinnedTicksLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    aspectRatio: 16 / 9,
    zIndex: 20,
  },
  // One of the three mounted card slots (prev / current / next). All are absolute and
  // positioned purely by their pagePos-derived translateX; they never overlap, so
  // their sibling order is irrelevant.
  pagerCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },

  // ── Focus area ─────────────────────────────────
  focusArea: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  mediaContainer: {
    aspectRatio: 16/9,
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#0a0a0f',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 14,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    backgroundColor: '#0a0a0f',
  },
  mediaPlaceholderText: {
    color: '#3a3a44',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 8,
    fontFamily: 'DMMono-Regular',
  },
  mediaShade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0)', // expand if you want gradient via expo-linear-gradient
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: {
    color: '#f0f0f2',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontFamily: 'Outfit-Bold',
    lineHeight: 26,
    flexShrink: 1,
  },
  // Layered on top of styles.title for the hidden measurement Text. Absolute so it takes the
  // title column's width without the mode getting a say and without adding any height of its
  // own; invisible so the duplicated name never shows through the real title.
  // See "MEASUREMENT vs DISPLAY" in ExerciseCard before touching either half.
  titleMeasure: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    opacity: 0,
  },
  muscles: {
    color: '#55555f',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
    fontFamily: 'DMMono-Regular',
    letterSpacing: 0.2,
  },

  // ── 1RM badge ─────────────────────────────────
  oneRMBadge: {
    alignItems: 'flex-end',
    minWidth: 80,
    flexShrink: 0,
  },
  oneRMLabel: {
    color: '#55555f',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.5,
    fontFamily: 'DMMono-Regular',
  },
  oneRMValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '500',
    fontFamily: 'DMMono-Medium',
    letterSpacing: -0.2,
    marginTop: 2,
  },

  // ── Prescription banner ───────────────────────
  prescription: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(34,211,238,0.04)',
    marginTop: 8,
    marginBottom: 12,
  },
  prescriptionLabel: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
    fontFamily: 'DMMono-Medium',
    marginRight: 10,
  },
  prescriptionText: {
    color: '#9898a4',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'DMMono-Regular',
    flex: 1,
  },

  // ── Sets table ─────────────────────────────────
  setsTable: {
    backgroundColor: 'transparent',
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginBottom: 4,
  },
  setsHeaderCell: {
    color: '#55555f',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Regular',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  setRowCompleted: {
    opacity: 0.55,
  },
  // ── Set-row cell geometry ───────────────────────────────────────
  // Every cell height in this chain is pinned. The pager's stage height is COMPUTED
  // from these (see CARD_*), so an implicit height that depends on a font's metrics
  // would make the arithmetic drift per platform, and the stage would glide and then
  // jump at the end of a swipe.
  setNumCell: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumInner: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  /** The "×" delete affordance drawn beside the last set's number. Absolute: no reflow. */
  setRowLastMark: {
    position: 'absolute',
    left: -16,
    color: '#55555f',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'DMMono-Regular',
  },
  prevCellBox: {
    width: 60,
    paddingLeft: 2,
  },
  setCheckCell: {
    width: 34,
    // Pinned to match setInput.minHeight. The cell holds a 26px Ionicon, whose line-box
    // height depends on the icon font's metrics — leaving it implicit would make the set
    // row 52px or 54px depending on platform, and the pager height maths must be exact.
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  setNum: {
    color: '#9898a4',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'DMMono-Medium',
  },
  prevCell: {
    color: '#55555f',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'DMMono-Regular',
  },
  setInput: {
    backgroundColor: '#111116',
    color: '#f0f0f2',
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    fontFamily: 'DMMono-Medium',
    textAlign: 'center',
    minHeight: 44,
    // Inert on a TextInput (it centres its own text); retained so any non-input
    // reuse of this style centres its content at exactly the same pixels.
    justifyContent: 'center',
  },
  // The focus-gated overlay (see SetRow) needs a positioned box that matches the
  // input exactly, so the input's horizontal margin moves out to this cell and
  // everything else stays on the input itself. Geometry is unchanged: the row's
  // height still comes from setInput.minHeight, so CARD_SET_ROW_H is untouched.
  setInputCell: {
    flex: 1,
    marginHorizontal: 4,
  },
  setInputField: {
    marginHorizontal: 0,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Pinned for the same reason as setCheckCell: an implicit height here depends on the
    // Ionicon's glyph metrics.
    height: 42,
    paddingVertical: 10,
    marginTop: 4,
  },
  addSetText: {
    color: '#9898a4',
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 6,
    fontFamily: 'DMMono-Regular',
    letterSpacing: 0.4,
  },

  // ── Keyboard accessory bar ─────────────────────
  accessoryBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 400,
    elevation: 400,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#16161c',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  accessoryDone: {
    color: '#9898a4',
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
  },
  // Centre slot: holds the rest timer and the live 1RM, either, both, or neither. flex:1 so
  // Done stays pinned left and Log set right however much is in here.
  accessoryCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  accessoryOneRM: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  accessoryOneRMLabel: {
    color: '#55555f',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
    fontFamily: 'DMMono-Regular',
  },
  accessoryOneRMValue: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMMono-Medium',
    letterSpacing: 0.2,
  },
  accessoryTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  accessoryTimerText: {
    fontSize: 13,
    fontFamily: 'DMMono-Medium',
    letterSpacing: 0.2,
  },
  accessoryLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9,
  },
  accessoryLogText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
  },

  // ── Header dropdown menu ───────────────────────
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 250,
  },
  headerMenu: {
    position: 'absolute',
    top: 96, // status bar (50) + button (40) + gap
    right: 16,
    width: 210,
    backgroundColor: '#0a0a0f',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    zIndex: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 24,
  },
  headerMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  headerMenuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerMenuIcon: {
    width: 24,
    textAlign: 'center',
  },
  headerMenuLabel: {
    color: '#f0f0f2',
    fontSize: 15,
    fontFamily: 'Outfit-Medium',
  },

  // ── Up Next list ───────────────────────────────
  upcomingSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    marginTop: 8,
  },
  upcomingHeader: {
    color: '#55555f',
    fontSize: 10,
    letterSpacing: 1.6,
    fontFamily: 'DMMono-Medium',
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  // ── Mini card ─────────────────────────────────
  miniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0f',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    position: 'relative',
    overflow: 'hidden',
  },
  miniCardDone: {
    opacity: 0.6,
  },
  miniIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#111116',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  miniExerciseImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  miniIconOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 1,
  },
  miniTitle: {
    color: '#f0f0f2',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
  },
  miniTitleDone: {
    textDecorationLine: 'line-through',
    color: '#9898a4',
  },
  miniTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  currentBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    letterSpacing: 0.5,
  },
  miniMeta: {
    color: '#55555f',
    fontSize: 11,
    marginTop: 3,
    fontFamily: 'DMMono-Regular',
  },
  miniProgressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  miniProgressFill: {
    height: '100%',
  },

  // ── Bottom bar ─────────────────────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
    backgroundColor: 'rgba(0,0,0,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0a0a0f',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  timerText: {
    color: '#9898a4',
    fontSize: 13,
    marginLeft: 6,
    fontFamily: 'DMMono-Medium',
  },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    letterSpacing: 0.2,
  },
  workoutDurationText: {
    color: 'rgba(0, 0, 0, 0.5)',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'DMMono-Medium',
    letterSpacing: 0.3,
    minWidth: 45,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  timerBadgeGrow: {
    flex: 1,
  },
  timerTextGrow: {
    fontSize: 15,
  },
  timerRestLabel: {
    fontSize: 12,
    color: '#55555f',
    marginLeft: 'auto',
  },
  compactFinishBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
  },
  compactFinishText: {
    fontSize: 13,
    fontFamily: 'DMMono-Medium',
  },
  setsHeaderUnitCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  suggestionInfoBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  suggestionInfoCard: {
    backgroundColor: '#121218',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  suggestionInfoTitle: {
    fontSize: 15,
    fontFamily: 'Outfit-SemiBold',
    color: '#e8e8ee',
    marginBottom: 8,
  },
  suggestionInfoBody: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Outfit-Regular',
    color: '#9898a4',
    marginBottom: 8,
  },
  suggestionInfoBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  suggestionInfoBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
  },

  // ── History styles (used by ExerciseHistoryModal-adjacent layouts) ──
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
  },
  historyContainer: {
    padding: 16,
  },
  historyTitle: {
    color: '#f0f0f2',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
    marginBottom: 8,
  },
  historySubtitle: {
    color: '#9898a4',
    fontSize: 14,
    fontFamily: 'DMMono-Regular',
    marginBottom: 16,
  },
  historyEntry: {
    backgroundColor: '#0a0a0f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  historyDate: {
    color: '#9898a4',
    fontSize: 12,
    fontFamily: 'DMMono-Regular',
    marginBottom: 8,
  },
  historySet: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  historySetNumber: {
    color: '#9898a4',
    fontSize: 12,
    fontFamily: 'DMMono-Regular',
    width: 30,
  },
  historyDetails: {
    color: '#f0f0f2',
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    flex: 1,
  },
  notesContainer: {
    marginBottom: 24,
  },
  notesInput: {
    backgroundColor: '#0a0a0f',
    borderRadius: 12,
    padding: 16,
    color: '#f0f0f2',
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    minHeight: 200,
    textAlignVertical: 'top',
  },

  // ── Full Screen Image Overlay Styles ──────────────
  imageContainer: {
    aspectRatio: 16/9, // Classic 16:9 aspect ratio
    width: '100%',
    position: 'relative',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden', // Ensures content respects border radius
  },
  fullScreenMediaContainer: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 45, // Shift image down while keeping header buttons at top
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  fullScreenPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0f',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Dark overlay for text legibility
  },
  progressTicks: {
    position: 'absolute',
    bottom: 9,
    // Inset so the row clears the container's 20px bottom corner radius
    left: 14,
    right: 14,
    flexDirection: 'row',
    gap: 5,
    zIndex: 10, // above imageOverlay (undimmed), below overlayHeader's zIndex 100
  },
  progressTick: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#2a2a32',
  },
  // The travelling "you are here" highlight, layered over the ticks. Absolute, so it is
  // outside the row's flex layout and its gap; width and translateX are set at runtime.
  progressIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 3,
    borderRadius: 2,
  },
  overlayHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50, // Account for status bar
    paddingBottom: 16,
    zIndex: 100, // High z-index to stay on top
    backgroundColor: 'transparent',
  },
  overlayHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Settings Modal Styles ──────────────
  settingsContainer: {
    padding: 16,
  },
  settingsExerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f0f0f2',
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: 'Outfit-SemiBold',
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    gap: 12,
  },
  settingsOptionDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  settingsOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#f0f0f2',
    flex: 1,
    fontFamily: 'Outfit-Medium',
  },
  settingsOptionTextDanger: {
    color: '#ef4444',
  },

  // Exercise alternatives
  titleButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleButtonMultiline: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  inlineArrow: {
    color: '#22d3ee',
  },
  exerciseSelector: {
    marginTop: 8,
    gap: 4,
  },
  exerciseOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  exerciseOptionSelected: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  exerciseOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseOptionText: {
    color: '#e0e0e4',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Outfit-Medium',
  },
  exerciseSelectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // ── Superset Connector Styles ──────────────────
  supersetConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  supersetLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  supersetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    gap: 6,
  },
  supersetText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.2,
    fontFamily: 'DMMono-Medium',
  },

  // ── Superset Modal Styles ─────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supersetModal: {
    backgroundColor: '#0a0a0f',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    width: '90%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 25,
  },
  supersetModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  supersetModalIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supersetModalTitle: {
    flex: 1,
    color: '#9898a4',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  supersetModalClose: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supersetCurrentExercise: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#18181b',
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  supersetCurrentLabel: {
    color: '#55555f',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.2,
    fontFamily: 'DMMono-Medium',
    marginBottom: 8,
  },
  supersetCurrentName: {
    color: '#f0f0f2',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
  },
  supersetOptions: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  supersetDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 8,
  },
  supersetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#0a0a0f',
  },
  supersetOptionLinked: {
    borderWidth: 1,
  },
  supersetOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  supersetOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  supersetOptionInfo: {
    flex: 1,
  },
  supersetOptionLabel: {
    color: '#55555f',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    fontFamily: 'DMMono-Medium',
    marginBottom: 4,
  },
  supersetOptionName: {
    color: '#d4d4d8',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Outfit-Medium',
  },
  supersetOptionNameLinked: {
    color: '#f0f0f2',
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
  },
  supersetToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  supersetEmptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  supersetNoOptions: {
    color: '#55555f',
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },


});