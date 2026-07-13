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
 * --- Changes in this version -------------------------------------------------
 *  1. Keyboard "Log set" accessory bar (self-rendered, iOS + Android):
 *     completes the focused set and auto-advances to the next set's weight
 *     field so users can blast through sets without dismissing the keyboard.
 *  2. PREV column + prefilled (greyed) inputs showing last session's numbers,
 *     loaded per-exercise from WorkoutStorage.getExerciseHistory.
 *  3. History promoted to a top-level cyan icon in the header.
 *  4. Header overflow replaced with a vertical dropdown menu (icon + label).
 *  5. Finish button now opens the existing FinishWorkoutModal (the summary),
 *     and a computed PR (best est. 1RM this session vs. history) is passed in.
 *  6. Tapping an "Up Next" exercise now smooth-scrolls back to the top so the
 *     sets table is in view (no more manual scroll-up after switching).
 *  7. Empty weight/reps fields render blank instead of "0" so a fresh program
 *     no longer reads as a prescribed 0kg.
 *  8. Image-cycling fix: cycling teardown now lives only in the cleanup return,
 *     so switching to an already-loaded exercise keeps the start/end animation.
 * ----------------------------------------------------------------------------
 */

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Easing,
  ActivityIndicator,
  Dimensions,
  Pressable,
  Alert,
  Image,
  Modal,
  Platform,
  Keyboard,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutStorage, WorkoutHistory, ExercisePreference } from '../utils/storage';
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
  rest?: number | string;
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

  /** Optional: custom action handlers */
  onOpenNotes?: (exerciseIndex: number) => void;
  onOpenHistory?: (exerciseIndex: number) => void;
  onOpenSettings?: (exerciseIndex: number) => void;

  /** Exercise alternatives functionality */
  onExerciseSelect: (exerciseIndex: number, selectedExerciseIndex: number) => void;
  onSetExercisePreference: (exerciseIndex: number, primaryExercise: string, alternatives: string[], selectedAlternative: string) => void;
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
const SCREEN_WIDTH = Dimensions.get('window').width;

// ── Card height arithmetic ──────────────────────────────────────────
// The pager stage is only as tall as the current card, so its height changes by up to
// four set rows between exercises. We animate it, which means we need each card's height
// BEFORE it renders — a measured height (onLayout) would be a frame behind and visibly
// lag the drag. So it is computed, and every term below is a pinned style constant.
// If any of these drift from styles.*, the stage will glide and then jump at the end.
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

const COMPOUND_HINTS = [
  'bench', 'squat', 'deadlift', 'press', 'row', 'pull-up', 'pullup',
  'chin-up', 'chinup', 'clean', 'snatch', 'lunge', 'rdl',
];

const isCompound = (name: string) => {
  const n = (name || '').toLowerCase();
  return COMPOUND_HINTS.some((k) => n.includes(k));
};

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

// ──────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────

export default function WorkoutLogScreen(props: WorkoutLogScreenProps) {
  const {
    exercises,
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
    onOpenNotes,
    onOpenHistory,
    onOpenSettings,
    onExerciseSelect,
    onSetExercisePreference,
    exercisePreferences,
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

  const currentExercise = exercises[currentIndex];
  const currentSets = allSetsData[currentIndex] || [];

  // Calculate current exercise alternatives
  const selectedIndex = currentSets.length > 0 ? currentSets[0].selectedExerciseIndex || 0 : 0;
  const alternativeNames = (currentExercise?.alternatives || [])
    .filter(alt => alt && typeof alt === 'string')
    .map(alt => String(alt));
  const allExercises = [currentExercise?.exercise || 'Exercise', ...alternativeNames];
  const currentExerciseName = allExercises[selectedIndex] || currentExercise?.exercise || currentExercise?.name || 'Exercise';

  // Helper function to get muscle groups for specific exercises
  const getExerciseMuscles = useCallback((exerciseName: string): { primary: string[], secondary: string[] } => {
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

    // Default fallback to original exercise muscles if no mapping found
    return {
      primary: currentExercise?.primaryMuscles || [],
      secondary: currentExercise?.secondaryMuscles || []
    };
  }, [currentExercise]);

  // Create effective current exercise (primary or selected alternative) - memoized to prevent infinite loops
  const effectiveCurrentExercise = useMemo(() => {
    if (selectedIndex === 0) {
      return currentExercise;
    }

    // For alternatives, get specific muscle groups for the exercise
    const muscles = getExerciseMuscles(currentExerciseName);

    return {
      ...currentExercise,
      exercise: currentExerciseName,
      name: currentExerciseName,
      primaryMuscles: muscles.primary,
      secondaryMuscles: muscles.secondary,
      // Note: We keep the same reps_weekly, rir_weekly, etc. as alternatives typically follow the same progression
    };
  }, [selectedIndex, currentExercise, currentExerciseName, getExerciseMuscles]);


  // Cross-fade animation when swapping focused exercise (used for tap-to-swap)
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Ref to the main scroll view so tapping/swapping an exercise can snap back to the top
  const scrollRef = useRef<ScrollView>(null);

  // Guards against the finish action firing twice (double tap / re-entry).
  // On a real device a second fire can pop one screen too many; the simulator's
  // timing usually hides it, which is why the two behave differently.
  const finishingRef = useRef(false);

  // ── Swipe pager: finger-tracked translate + peeking neighbours ──
  // dragX follows the finger during a horizontal pan; peek offsets place the
  // previous/next exercise just off either edge so they slide in as you drag.
  const dragX = useRef(new Animated.Value(0)).current;
  const peekLeftX = useRef(Animated.subtract(dragX, SCREEN_WIDTH)).current;
  const peekRightX = useRef(Animated.add(dragX, SCREEN_WIDTH)).current;

  // The progress bar's sliding highlight, in TICK UNITS (0 = first tick, fractional while
  // dragging). It is a value of its own rather than an interpolation of dragX for two
  // reasons. First, dragX can never be native-driven — it feeds the stage's `height`
  // (cd2049c), which the native driver cannot animate, and one value cannot be both. A
  // translateX, though, IS a native-driver property, and the JS thread is already carrying
  // the height. Second, holding an ABSOLUTE position means the interpolation never depends
  // on currentIndex, so committing a swipe needs no rebase — and therefore cannot paint a
  // frame at the old tick while the new config crosses the bridge.
  const indicatorPage = useRef(new Animated.Value(0)).current;
  // True only while an active horizontal drag is in progress, so neighbour
  // previews are mounted only during a swipe (idle render stays unchanged).
  const [isPaging, setIsPaging] = useState(false);

  // ── Header dropdown menu animation (panel + staggered rows) ──────
  const menuAnim = useRef(new Animated.Value(0)).current; // panel opacity/scale
  const menuRowAnims = useRef([
    new Animated.Value(0), // Muscle map
    new Animated.Value(0), // Rep scheme
    new Animated.Value(0), // 1RM progress
    new Animated.Value(0), // Notes
    new Animated.Value(0), // How it works
  ]).current;

  // Dropdown arrow rotation animation (for the exercise-alternatives selector)
  const arrowRotation = useRef(new Animated.Value(0)).current;

  // Exercise alternatives dropdown animation
  const dropdownOpacity = useRef(new Animated.Value(0)).current;
  const dropdownScale = useRef(new Animated.Value(0.95)).current;

  // Image cache (in-memory; pair with AsyncStorage in production)
  const [imageCache, setImageCache] = useState<Record<string, string | null>>({});
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({});

  // Image cycling for exercise animations (start/end positions)
  const [imagePairs, setImagePairs] = useState<Record<string, {start: any, end: any}>>({});
  const [currentImagePhase, setCurrentImagePhase] = useState<'start' | 'end'>('start');
  const cyclingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentCyclingKeyRef = useRef<string | null>(null);

  // Finish workout confirmation / summary modal
  const [showFinishModal, setShowFinishModal] = useState(false);

  // Superset selection modal
  const [showSupersetModal, setShowSupersetModal] = useState(false);
  const [supersetSourceIndex, setSupersetSourceIndex] = useState<number | null>(null);

  // ── Keyboard "Log set" accessory state ───────────────────────────
  // Which set/field currently owns the keyboard (always within current exercise).
  const [focusedSet, setFocusedSet] = useState<{ setIndex: number; field: 'weight' | 'reps' } | null>(null);
  // Weight inputs of the current exercise, keyed by set index, so "Log set"
  // can advance focus to the next set's weight field.
  const weightInputRefs = useRef<Record<number, TextInput | null>>({});
  const registerWeightRef = useCallback((setIndex: number, ref: TextInput | null) => {
    weightInputRefs.current[setIndex] = ref;
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

  // ── Previous-session reference + full history (for PREV column + PRs) ──
  const [previousByExercise, setPreviousByExercise] = useState<Record<string, PreviousSets>>({});
  const [historyByExercise, setHistoryByExercise] = useState<Record<string, WorkoutHistory[]>>({});

  // Format timer display for rest timer badge
  const getRestTimerDisplay = (): string => {
    if (!timer) return '0:00';

    if (timer.isCountUp) {
      // Count up mode - show elapsed time
      const elapsed = timer.timeElapsed;
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      // Countdown mode - show remaining time
      const remaining = Math.max(0, timer.targetTime - timer.timeElapsed);
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  // History, Notes, Settings state
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [exerciseHistory, setExerciseHistory] = useState<WorkoutHistory[]>([]);
  const [showNotes, setShowNotes] = useState<{ exerciseName: string; exerciseIndex: number } | null>(null);
  const [showExerciseNotes, setShowExerciseNotes] = useState<{ exerciseName: string; exerciseIndex: number } | null>(null);
  const [exerciseNotes, setExerciseNotes] = useState<{ [exerciseIndex: number]: NoteEntry[] }>({});
  const [exerciseInSettings, setExerciseInSettings] = useState<number | null>(null);

  // Header dropdown menu open state
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  // Delete set modal state
  const [showDeleteSetModal, setShowDeleteSetModal] = useState<{ exerciseIndex: number; setIndex: number } | null>(null);

  // Workout Heatmap Modal state
  const [showWorkoutHeatmap, setShowWorkoutHeatmap] = useState(false);

  // "How it works" education modal state
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Exercise selector dropdown state
  const [showExerciseSelector, setShowExerciseSelector] = useState<number | null>(null);
  const [isMultiLine, setIsMultiLine] = useState<Map<number, boolean>>(new Map());

  // Record whether an exercise's title wraps. The live card and the peek previews both
  // report it, so a neighbour's height is known BEFORE it slides in rather than only
  // once it becomes current. No-ops when unchanged, so it cannot churn renders mid-drag.
  const handleTitleMeasured = useCallback((idx: number, multi: boolean) => {
    setIsMultiLine((prev) => {
      if (prev.get(idx) === multi) return prev;
      const next = new Map(prev);
      next.set(idx, multi);
      return next;
    });
  }, []);

  // ── Pager stage height ───────────────────────────────────────────
  // Every exercise's card height, computed (not measured) so the stage can start
  // resizing on the first frame of a drag. See the CARD_* constants.
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

  const currentCardH = cardHeights[currentIndex] ?? 0;

  // The stage's height at rest. Animated on its own only when the CURRENT card changes
  // shape (a set added or removed); during a drag the delta below does the work.
  const stageBaseH = useRef(new Animated.Value(currentCardH)).current;
  const stageHeightReady = useRef(false);

  useEffect(() => {
    if (!currentCardH) return;
    if (!stageHeightReady.current) {
      // First real measurement — snap, don't animate, or the card unfolds on mount.
      stageHeightReady.current = true;
      stageBaseH.setValue(currentCardH);
      return;
    }
    Animated.timing(stageBaseH, {
      toValue: currentCardH,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // height is not a native-driver prop
    }).start();
  }, [currentCardH, stageBaseH]);

  // Keep the highlight on the current exercise when the index changes WITHOUT a swipe —
  // tapping an Up Next card, or a superset auto-advance. After a committed swipe this is a
  // no-op: the gesture already animated it to exactly this value.
  const indicatorReady = useRef(false);
  useEffect(() => {
    if (!indicatorReady.current) {
      // Restoring a workout can start on a later exercise; land there, don't fly there.
      indicatorReady.current = true;
      indicatorPage.setValue(currentIndex);
      return;
    }
    Animated.timing(indicatorPage, {
      toValue: currentIndex,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true, // translateX — unlike height, this can leave the JS thread
    }).start();
  }, [currentIndex, indicatorPage]);

  // Grow/shrink the stage in step with the finger, so a taller neighbour is never clipped
  // by pagerStage's overflow:'hidden' as it slides in. At the ends of the list there is no
  // neighbour, so the delta is 0 and the height holds still through the rubber-band.
  const stageHeight = useMemo(() => {
    const prevH = cardHeights[currentIndex - 1];
    const nextH = cardHeights[currentIndex + 1];
    return Animated.add(
      stageBaseH,
      dragX.interpolate({
        inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
        outputRange: [
          (nextH ?? currentCardH) - currentCardH, // dragging left: next slides in
          0,
          (prevH ?? currentCardH) - currentCardH, // dragging right: prev slides in
        ],
        extrapolate: 'clamp',
      }),
    );
  }, [cardHeights, currentIndex, currentCardH, stageBaseH, dragX]);

  // Header dropdown staggered animation effect
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

  // Dropdown arrow rotation and alternatives animation effect
  useEffect(() => {
    if (showExerciseSelector !== null) {
      // Opening: animate arrow rotation and dropdown appearance
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
      // Closing: animate arrow rotation and dropdown disappearance
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
  }, [showExerciseSelector]);

  // Mini card images cache (separate from main exercise images) - using state to trigger re-renders when loaded
  const [miniCardImages, setMiniCardImages] = useState<Map<string, {start: any, end: any} | null>>(new Map());

  // Pre-load all mini card images when component mounts or theme changes
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
      };

      loadAllImages();
    }
  }, [exercises, resolveExerciseImagePair, themeColor]);

  // ── Load previous-session data for every exercise (+ alternatives) ──
  // Used both by the PREV column (most recent session) and by PR detection
  // (best estimated 1RM across all history).
  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      const prevMap: Record<string, PreviousSets> = {};
      const histMap: Record<string, WorkoutHistory[]> = {};

      for (const ex of exercises) {
        const names = [
          ex.exercise || ex.name || '',
          ...((ex.alternatives || []).filter((a) => a && typeof a === 'string').map(String)),
        ];

        for (const name of names) {
          if (!name || histMap[name]) continue; // skip blanks / already-loaded
          try {
            const hist = await WorkoutStorage.getExerciseHistory(name);
            histMap[name] = hist;

            // Most recent prior session → set-by-set reference
            const sorted = [...hist].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            );
            const latest = sorted[0];
            if (latest) {
              const setsMap: PreviousSets = {};
              latest.sets.forEach((s) => {
                setsMap[s.setNumber] = { weight: s.weight, reps: s.reps, unit: s.unit };
              });
              prevMap[name] = setsMap;
            }
          } catch (error) {
            // Non-fatal — just no reference for this exercise
          }
        }
      }

      if (!cancelled) {
        setPreviousByExercise(prevMap);
        setHistoryByExercise(histMap);
      }
    };

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [exercises]);

  // Workout History Modal state
  const [showWorkoutHistory, setShowWorkoutHistory] = useState<{
    exerciseName: string;
    exerciseIndex: number;
  } | null>(null);

  // 1RM Progression Modal state
  const [show1RMProgression, setShow1RMProgression] = useState<{
    exerciseName: string;
    exerciseIndex: number;
  } | null>(null);


  // Timer context
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

  // Calculate workout duration for display on finish button
  const [workoutDuration, setWorkoutDuration] = useState(0);

  // Update workout duration in real-time
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

  const handleExerciseLongPress = (exerciseIndex: number) => {
    setSupersetSourceIndex(exerciseIndex);
    setShowSupersetModal(true);
  };

  // Open full history for the current exercise (top-level header icon)
  const openHistoryForCurrent = () => {
    setHeaderMenuOpen(false);
    setShowWorkoutHistory({
      exerciseName: effectiveCurrentExercise.exercise,
      exerciseIndex: currentIndex,
    });
  };

  // ── Prescribed reps for the current exercise ─────────────────────
  // Same derivation SetsTable uses for the greyed placeholder, lifted here so
  // both completion paths can commit it. Reuses parseTargetReps (hoisted below).
  const currentTargetReps = useMemo(() => {
    const weeklyReps =
      effectiveCurrentExercise?.reps_weekly?.[String(currentWeek)] ?? effectiveCurrentExercise?.reps;
    return weeklyReps ? parseTargetReps(String(weeklyReps), currentSets.length) : [];
  }, [effectiveCurrentExercise, currentWeek, currentSets.length]);

  // A set completed with blank reps is marked done but silently skips history,
  // the rest timer and the superset transition (the adapter gates all three on
  // `weight && reps`). The user saw the prescription as a placeholder and assumed
  // it was logged, so commit it for them — but only when it is unambiguous.
  const [pendingCompletion, setPendingCompletion] = useState<{ exerciseIndex: number; setIndex: number } | null>(null);

  const completeSet = useCallback((exerciseIndex: number, setIndex: number) => {
    const set = allSetsData[exerciseIndex]?.[setIndex];

    // Un-completing, no set, or reps the user actually typed: never autofill.
    if (!set || set.completed || set.reps?.trim()) {
      onSetComplete(exerciseIndex, setIndex);
      return;
    }

    // Only the focused exercise has a target array in scope.
    const target = exerciseIndex === currentIndex ? currentTargetReps[setIndex]?.trim() : undefined;

    // Defensive: a user-imported program can prescribe a range ("8-12"). We will
    // not guess which end the user hit — leave reps blank rather than invent one.
    if (!target || !/^\d+$/.test(target) || parseInt(target, 10) <= 0) {
      onSetComplete(exerciseIndex, setIndex);
      return;
    }

    // Write the reps, then defer completion — see the effect below for why.
    onSetUpdate(exerciseIndex, setIndex, 'reps', target);
    setPendingCompletion({ exerciseIndex, setIndex });
  }, [allSetsData, currentIndex, currentTargetReps, onSetUpdate, onSetComplete]);

  // The adapter's handleSetComplete reads `allSetsData` from its render closure
  // rather than via a functional update, so completing in the same tick as the
  // reps write would read reps:'' — skipping history/timer/superset — and its
  // own setAllSetsData would then clobber the value we just wrote. Waiting for
  // the updated `allSetsData` prop to arrive means the onSetComplete we call is
  // the one closing over the state that already contains the reps.
  useEffect(() => {
    if (!pendingCompletion) return;
    const { exerciseIndex, setIndex } = pendingCompletion;
    const set = allSetsData[exerciseIndex]?.[setIndex];

    if (!set || set.completed) {
      setPendingCompletion(null);
      return;
    }
    if (!set.reps) return; // autofill not visible yet — wait for the next render

    setPendingCompletion(null);
    onSetComplete(exerciseIndex, setIndex);
  }, [pendingCompletion, allSetsData, onSetComplete]);

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

  // Previous-session reference for whatever set currently owns the keyboard
  const accessoryPrev = focusedSet
    ? (previousByExercise[effectiveCurrentExercise.exercise] || {})[focusedSet.setIndex + 1]
    : null;

  const accessoryVisible = focusedSet !== null && keyboardHeight > 0;
  const accessoryBottom = Platform.OS === 'ios' ? keyboardHeight : 0;

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




  // Resolve image for current exercise (lazy, cached)
  useEffect(() => {
    if (!effectiveCurrentExercise) {
      return;
    }

    const key = `${effectiveCurrentExercise.exercise || effectiveCurrentExercise.name || ''}-${themeColor}`;

    // Don't try to reload if we already tried and failed (null means we tried and failed)
    if (key in imageCache) {
      // Even though images are cached, we need to restart cycling for the new color theme
      const cachedImagePair = imagePairs[key];
      if (cachedImagePair && cachedImagePair.start && cachedImagePair.end) {
        // Start cycling immediately (the startImageCycling function now prevents duplicates)
        startImageCycling(key, cachedImagePair);
      }

      return; // already resolved (or null)
    }

    if (effectiveCurrentExercise.imageUrl) {
      setImageCache((c) => ({ ...c, [key]: effectiveCurrentExercise.imageUrl! }));
      return;
    }

    // Try the new image pair resolver first (for cycling animations)
    if (resolveExerciseImagePair) {
      setImageLoading((s) => ({ ...s, [key]: true }));

      resolveExerciseImagePair(effectiveCurrentExercise)
        .then((imagePair) => {
          if (imagePair && imagePair.start && imagePair.end) {
            // Store both images for cycling
            setImagePairs((prev) => ({ ...prev, [key]: imagePair }));
            // Start with the 'start' image in the cache
            setImageCache((c) => ({ ...c, [key]: imagePair.start }));
            // Start cycling between start and end every 1 second
            startImageCycling(key, imagePair);
          } else {
            setImageCache((c) => ({ ...c, [key]: null }));
          }
        })
        .catch((error) => {
          setImageCache((c) => ({ ...c, [key]: null }));
        })
        .finally(() => {
          setImageLoading((s) => ({ ...s, [key]: false }));
        });
      return;
    }

    // Fallback to single image resolver
    if (!resolveExerciseImage) {
      setImageCache((c) => ({ ...c, [key]: null }));
      return;
    }

    setImageLoading((s) => ({ ...s, [key]: true }));

    resolveExerciseImage(effectiveCurrentExercise)
      .then((url) => {
        setImageCache((c) => ({ ...c, [key]: url }));
      })
      .catch((error) => {
        setImageCache((c) => ({ ...c, [key]: null }));
      })
      .finally(() => {
        setImageLoading((s) => ({ ...s, [key]: false }));
      });
  }, [effectiveCurrentExercise, resolveExerciseImage, resolveExerciseImagePair, themeColor]);

  // Image cycling function
  const startImageCycling = useCallback((fullKey: string, imagePair: {start: any, end: any}) => {
    // Only start cycling if this is a new exercise (prevent duplicate intervals)
    if (currentCyclingKeyRef.current === fullKey) {
      return; // Already cycling this exercise
    }

    // Clear any existing interval
    if (cyclingIntervalRef.current) {
      clearInterval(cyclingIntervalRef.current);
      cyclingIntervalRef.current = null;
    }

    // Set the new cycling key
    currentCyclingKeyRef.current = fullKey;

    // Reset to start phase
    setCurrentImagePhase('start');
    setImageCache(prev => ({ ...prev, [fullKey]: imagePair.start }));

    // Start the cycling interval
    cyclingIntervalRef.current = setInterval(() => {
      // Check if we're still supposed to be cycling this exercise
      if (currentCyclingKeyRef.current !== fullKey) {
        if (cyclingIntervalRef.current) {
          clearInterval(cyclingIntervalRef.current);
          cyclingIntervalRef.current = null;
        }
        return;
      }

      setCurrentImagePhase((prevPhase) => {
        const newPhase = prevPhase === 'start' ? 'end' : 'start';
        const newImage = newPhase === 'start' ? imagePair.start : imagePair.end;

        // Batch the state updates
        setImageCache((prev) => ({ ...prev, [fullKey]: newImage }));

        return newPhase;
      });
    }, 1000); // Cycle every 1 second
  }, []);



  // Cleanup cycling when component unmounts or exercise changes
  useEffect(() => {
    // Reset keyboard focus tracking + weight input refs (set counts differ per exercise)
    weightInputRefs.current = {};
    setFocusedSet(null);

    // Cycling teardown lives ONLY in the cleanup return below. React runs every
    // effect's cleanup before any effect body, so this stops the previous
    // exercise's cycling *before* the image-resolve effect (declared earlier)
    // starts the new one. Tearing it down in the body too would run *after* that
    // effect and kill the cycling we just started, leaving a static image.
    return () => {
      if (cyclingIntervalRef.current) {
        clearInterval(cyclingIntervalRef.current);
        cyclingIntervalRef.current = null;
      }
      currentCyclingKeyRef.current = null;
    };
  }, [currentIndex, selectedIndex]); // Reset when exercise or alternative changes

  // Cross-fade on exercise swap
  const swapFocus = useCallback(
    (newIndex: number) => {
      if (newIndex === currentIndex) return;
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        onIndexChange(newIndex);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start();
      });
    },
    [currentIndex, onIndexChange, fadeAnim],
  );

  // Swipe gesture: tracks the finger, snaps on threshold or velocity.
  // activeOffsetX/failOffsetY ensure it only claims clearly-horizontal drags,
  // so vertical scrolling (Up Next) and taps into inputs still work.
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-12, 12])
    .onStart(() => {
      Keyboard.dismiss();
      setFocusedSet(null);
      setIsPaging(true);
    })
    .onUpdate((event) => {
      let tx = event.translationX;
      // Rubber-band resistance at the ends of the list
      if (
        (currentIndex === 0 && tx > 0) ||
        (currentIndex === exercises.length - 1 && tx < 0)
      ) {
        tx *= 0.35;
      }
      dragX.setValue(tx);

      // Drift the progress highlight with the finger. One screen-width of travel moves it
      // exactly one tick. Clamped to the neighbours that actually exist, so at either end
      // of the list there is nowhere to go and the indicator holds still through the
      // rubber-band.
      const lo = Math.max(0, currentIndex - 1);
      const hi = Math.min(exercises.length - 1, currentIndex + 1);
      const page = currentIndex - tx / SCREEN_WIDTH;
      indicatorPage.setValue(Math.min(hi, Math.max(lo, page)));
    })
    .onEnd((event) => {
      const W = SCREEN_WIDTH;
      const threshold = W * 0.22; // ~22% of the screen, matches the prototype
      const tx = event.translationX;
      const vx = event.velocityX;

      const goNext = (tx <= -threshold || vx < -800) && currentIndex < exercises.length - 1;
      const goPrev = (tx >= threshold || vx > 800) && currentIndex > 0;

      if (goNext || goPrev) {
        const target = goNext ? currentIndex + 1 : currentIndex - 1;

        // Carry the highlight the rest of the way, in step with the card. Native-driven:
        // translateX is a native-driver property, and the JS thread is already busy with
        // the stage height. It holds an absolute tick position, so when currentIndex swaps
        // below there is nothing to rebase — it is already exactly where it belongs.
        Animated.timing(indicatorPage, {
          toValue: target,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();

        // Finish sliding the card off, then swap content under it and reset.
        Animated.timing(dragX, {
          toValue: goNext ? -W : W,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start(() => {
          // The 180ms ease-out above already carried the stage height all the way to the
          // target card's height (dragX hit ±W, so the interpolation is at its end stop).
          // Hand it over synchronously: zero the drag first so the delta collapses, then
          // rebase. Both land in the same tick, so no intermediate height is ever painted
          // and there is nothing left to animate.
          dragX.setValue(0);
          stageBaseH.setValue(cardHeights[target] ?? currentCardH);
          onIndexChange(target);
          setIsPaging(false);
          Analytics.track('exercise_swiped', { direction: goNext ? 'next' : 'prev' });
        });
      } else {
        // Didn't pass the threshold — spring back to centre. The highlight springs home on
        // the same curve, so it returns in step with the card rather than lagging it.
        Animated.spring(indicatorPage, {
          toValue: currentIndex,
          friction: 9,
          tension: 70,
          useNativeDriver: true,
        }).start();

        Animated.spring(dragX, {
          toValue: 0,
          friction: 9,
          tension: 70,
          useNativeDriver: false,
        }).start(() => setIsPaging(false));
      }
    });

  // Handler functions for buttons
  const handleHistoryPress = async (exerciseIndex: number) => {
    // Use the effective exercise name (including alternatives)
    const exerciseName = exerciseIndex === currentIndex ? effectiveCurrentExercise.exercise : exercises[exerciseIndex].exercise;
    const history = await WorkoutStorage.getExerciseHistory(exerciseName);
    setExerciseHistory(history);
    setShowHistory(exerciseName);
  };

  const handleNotesPress = (exerciseIndex: number) => {
    // Use the effective exercise name (including alternatives)
    const exerciseName = exerciseIndex === currentIndex ? effectiveCurrentExercise.exercise : exercises[exerciseIndex].exercise;
    setShowNotes({ exerciseName, exerciseIndex });
  };

  const handleExerciseNotesPress = (exerciseIndex: number) => {
    // Use the effective exercise name (including alternatives)
    const exerciseName = exerciseIndex === currentIndex ? effectiveCurrentExercise.exercise : exercises[exerciseIndex].exercise;
    setShowExerciseNotes({ exerciseName, exerciseIndex });
  };

  const handleExerciseSettings = (exerciseIndex: number) => {
    setExerciseInSettings(exerciseInSettings === exerciseIndex ? null : exerciseIndex);
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

  // Compute progress per exercise (used in mini cards and the image progress ticks)
  const exerciseProgress = useMemo(
    () => computeExerciseProgress(exercises, allSetsData),
    [exercises, allSetsData],
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
      let bestHistKg = 0;
      (historyByExercise[name] || []).forEach((h) =>
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
  }, [exercises, allSetsData, historyByExercise, calculate1RM]);

  // Header dropdown menu items (History lives top-level now, so it's not here)
  const headerMenuItems: { label: string; icon: any; onPress: () => void }[] = [
    { label: 'Muscle map', icon: 'body-outline', onPress: () => setShowWorkoutHeatmap(true) },
    { label: 'Rep scheme', icon: 'repeat-outline', onPress: () => handleNotesPress(currentIndex) },
    {
      label: '1RM progress',
      icon: 'trending-up-outline',
      onPress: () =>
        setShow1RMProgression({ exerciseName: effectiveCurrentExercise.exercise, exerciseIndex: currentIndex }),
    },
    { label: 'Notes', icon: 'document-text-outline', onPress: () => handleExerciseNotesPress(currentIndex) },
    { label: 'How it works', icon: 'help-circle-outline', onPress: () => setShowHowItWorks(true) },
  ];

  // ── Render ────────────────────────────────────────────────────────

  if (!effectiveCurrentExercise) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No exercise loaded</Text>
        </View>
      </SafeAreaView>
    );
  }

  const exKey = `${effectiveCurrentExercise.exercise || effectiveCurrentExercise.name || ''}-${themeColor}`;
  const exImage = imageCache[exKey];
  const exImageLoading = imageLoading[exKey];

  // History view for a specific exercise
  if (showHistory) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowHistory(null)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{showHistory} History</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>Previous Workouts</Text>

            {exerciseHistory.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No previous workouts</Text>
                <Text style={styles.emptyText}>
                  Your workout history will appear here after you complete sets
                </Text>
              </View>
            ) : (
              exerciseHistory.map((workout, index) => (
                <View key={workout.id} style={styles.historyEntry}>
                  <Text style={styles.historyDate}>
                    {new Date(workout.date).toLocaleDateString()} • {workout.dayName}
                  </Text>
                  {workout.sets.map((set, setIndex) => (
                    <View key={setIndex} style={styles.historySet}>
                      <Text style={styles.historySetNumber}>
                        {set.setNumber}
                      </Text>
                      <Text style={styles.historyDetails}>
                        {convertWeight(parseFloat(set.weight) || 0, set.unit ?? globalUnit, globalUnit).toFixed(1)}{globalUnit} × {set.reps}
                      </Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }


  // Workout History Modal - rendered alongside main content
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

  // PREV reference for the current exercise's sets table
  const currentPreviousSets = previousByExercise[effectiveCurrentExercise.exercise] || {};


  return (
    <>
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.root}>

      {/* ── SCROLLABLE CONTENT ──────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── PAGED EXERCISE STAGE (image + focus area travel together) ──
            Height is animated: it tracks the drag so a taller neighbour grows the stage
            as it slides in (no clipping), and everything below — the Up Next list —
            glides instead of snapping when the swipe commits. */}
        <Animated.View style={[styles.pagerStage, { height: stageHeight }]}>
          {/* Previous-exercise peek (slides in from the left edge) */}
          {isPaging && currentIndex > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[styles.pagerPeek, { transform: [{ translateX: peekLeftX }] }]}
            >
              <ExercisePagePreview
                index={currentIndex - 1}
                exercises={exercises}
                allSetsData={allSetsData}
                exercisePreferences={exercisePreferences}
                previousByExercise={previousByExercise}
                miniCardImages={miniCardImages}
                themeColor={themeColor}
                globalUnit={globalUnit}
                currentWeek={currentWeek}
                calculate1RM={calculate1RM}
                onTitleMeasured={handleTitleMeasured}
                isMultiLine={!!isMultiLine.get(currentIndex - 1)}
              />
            </Animated.View>
          )}

          {/* Next-exercise peek (slides in from the right edge) */}
          {isPaging && currentIndex < exercises.length - 1 && (
            <Animated.View
              pointerEvents="none"
              style={[styles.pagerPeek, { transform: [{ translateX: peekRightX }] }]}
            >
              <ExercisePagePreview
                index={currentIndex + 1}
                exercises={exercises}
                allSetsData={allSetsData}
                exercisePreferences={exercisePreferences}
                previousByExercise={previousByExercise}
                miniCardImages={miniCardImages}
                themeColor={themeColor}
                globalUnit={globalUnit}
                currentWeek={currentWeek}
                calculate1RM={calculate1RM}
                onTitleMeasured={handleTitleMeasured}
                isMultiLine={!!isMultiLine.get(currentIndex + 1)}
              />
            </Animated.View>
          )}

          {/* Live centre card — follows the finger via dragX */}
          <Animated.View style={{ transform: [{ translateX: dragX }] }}>
        {/* ── SCROLLABLE IMAGE ──────────────────────── */}
        <View style={styles.imageContainer}>
          {/* Full screen media */}
          <View style={styles.fullScreenMediaContainer}>
            {(() => {
              if (exImage) {
                return (
                  <Image
                    key={exKey}
                    source={typeof exImage === 'string' ? { uri: exImage } : exImage}
                    style={styles.fullScreenImage}
                    resizeMode="contain"
                    onLoad={() => {}}
                    onError={(error) => {}}
                  />
                );
              } else if (exImageLoading) {
                return (
                  <View style={styles.fullScreenPlaceholder}>
                    <ActivityIndicator color={themeColor} size="large" />
                  </View>
                );
              } else {
                return (
                  <View style={styles.fullScreenPlaceholder}>
                    <Ionicons name="barbell-outline" size={60} color="#3a3a44" />
                    <Text style={styles.mediaPlaceholderText}>No preview</Text>
                  </View>
                );
              }
            })()}
            {/* Dark overlay for text legibility */}
            <View style={styles.imageOverlay} />
          </View>

          {/* Header controls are NOT here — they belong to the screen, not the exercise,
              so they are pinned in pagerStage below and hold still during a swipe. */}
        </View>

        <TouchableOpacity
          style={[styles.focusArea, { opacity: fadeAnim }]}
          onLongPress={() => handleExerciseLongPress(currentIndex)}
          activeOpacity={1}
          delayLongPress={600}
        >
          {/* Exercise title and info */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1, marginRight: 16, minWidth: 0 }}>
              <TouchableOpacity
                style={[styles.titleButton, isMultiLine.get(currentIndex) && styles.titleButtonMultiline]}
                onPress={() => allExercises.length > 1 && setShowExerciseSelector(showExerciseSelector === currentIndex ? null : currentIndex)}
                activeOpacity={allExercises.length > 1 ? 0.7 : 1}
              >
                <Text
                  style={styles.title}
                  numberOfLines={2}
                  onTextLayout={(event) =>
                    handleTitleMeasured(currentIndex, event.nativeEvent.lines.length > 1)
                  }
                >
                  {currentExerciseName}
                  {allExercises.length > 1 && isMultiLine.get(currentIndex) && (
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
                        <Ionicons
                          name="chevron-down"
                          size={18}
                          color={themeColor}
                        />
                      </Animated.View>
                    </Text>
                  )}
                </Text>
                {allExercises.length > 1 && !isMultiLine.get(currentIndex) && (
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
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={themeColor}
                    />
                  </Animated.View>
                )}
              </TouchableOpacity>
              {!!(effectiveCurrentExercise.primaryMuscles?.length ||
                effectiveCurrentExercise.secondaryMuscles?.length) && (
                <Text style={styles.muscles}>
                  {[
                    ...(effectiveCurrentExercise.primaryMuscles || []),
                    ...(effectiveCurrentExercise.secondaryMuscles || []),
                  ].join(' · ')}
                </Text>
              )}
            </View>
            <OneRMBadge
              sets={currentSets}
              themeColor={themeColor}
              calculate1RM={calculate1RM}
              unit={globalUnit}
            />
          </View>

          {/* Exercise selector dropdown */}
          {showExerciseSelector === currentIndex && allExercises.length > 1 && (
            <Animated.View
              style={[
                styles.exerciseSelector,
                {
                  opacity: dropdownOpacity,
                  transform: [
                    {
                      scaleY: dropdownScale,
                    },
                    {
                      scaleX: dropdownScale,
                    },
                  ],
                },
              ]}
            >
              {allExercises.map((exerciseName, index) => {
                const preferredExercise = exercisePreferences[currentExercise.exercise];
                const isSelected = index === selectedIndex;
                const isPrimary = index === 0;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.exerciseOption,
                      isSelected && [styles.exerciseOptionSelected, { borderLeftColor: themeColor }]
                    ]}
                    onPress={() => {
                      // Update the visual selection
                      onExerciseSelect(currentIndex, index);
                      // Handle preference saving
                      const alternativeNames = (currentExercise.alternatives || [])
                        .filter(alt => alt && typeof alt === 'string')
                        .map(alt => String(alt));

                      if (index === 0) {
                        // Going back to original exercise - clear the preference
                        onSetExercisePreference(currentIndex, currentExercise.exercise, alternativeNames, '');
                      } else {
                        // Selecting an alternative
                        onSetExercisePreference(currentIndex, currentExercise.exercise, alternativeNames, exerciseName);
                      }
                      setShowExerciseSelector(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.exerciseOptionContent}>
                      <Text style={[
                        styles.exerciseOptionText,
                        isSelected && { color: themeColor }
                      ]}>
                        {exerciseName}
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
            exercise={effectiveCurrentExercise}
            currentWeek={currentWeek}
            themeColor={themeColor}
          />

          {/* Sets table */}
          <SetsTable
            exerciseIndex={currentIndex}
            sets={currentSets}
            unit={globalUnit}
            themeColor={themeColor}
            workoutStarted={workoutStarted}
            exercise={effectiveCurrentExercise}
            currentWeek={currentWeek}
            previousSets={currentPreviousSets}
            onUpdate={onSetUpdate}
            onComplete={completeSet}
            onAdd={onSetAdd}
            onRemove={onSetRemove}
            onSetTapWhenNotStarted={onSetTapWhenNotStarted}
            onFocusField={(setIndex, field) => setFocusedSet({ setIndex, field })}
            registerWeightRef={registerWeightRef}
            onShowDeleteModal={(exerciseIndex, setIndex) => {
              setShowDeleteSetModal({ exerciseIndex, setIndex });
            }}
          />
        </TouchableOpacity>
          </Animated.View>

          {/* Workout progress — the ONE bar in the tree.
              It describes the workout, not the exercise, so it is a sibling of the
              animated card rather than a child of it: the cards slide underneath while
              this holds still. Declared after the card, so it paints above every pager
              layer; the box mirrors imageContainer's 16:9 so the ticks land on exactly
              the same pixels they did when they lived inside the image. */}
          <View style={styles.pinnedTicksLayer} pointerEvents="none">
            <ExerciseProgressTicks
              progress={exerciseProgress}
              indicatorPage={indicatorPage}
              themeColor={themeColor}
            />
          </View>

          {/* ── HEADER BUTTONS — pinned, the ONE header in the tree ─────────────
              These belong to the screen, not the exercise, so like the ticks they are a
              sibling of the animated card and dragX never touches them.

              box-none, not none: the buttons must stay tappable, but the bar spans the
              full width of the image, so an `auto` container would eat every horizontal
              pan that began in the empty space between the buttons and kill the swipe in
              a strip across the top of the image. box-none lets touches through except
              where they land on an actual button. overlayHeaderActions needs it too — its
              8px gap is part of its box. */}
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

        {/* ── UPCOMING LIST ──────────────────────────────── */}
        <View style={styles.upcomingSection}>
          <Text style={styles.upcomingHeader}>UP NEXT</Text>
          {exercises.map((ex, idx) => {
            const progress = exerciseProgress[idx];
            const isActive = idx === currentIndex;

            // Get the effective exercise name (considering selected alternatives)
            // Use exercise name as key instead of index
            const primaryExerciseName = ex.exercise || ex.name || '';
            const selectedAlternative = exercisePreferences[primaryExerciseName];
            let effectiveExercise = ex;

            if (selectedAlternative && ex.alternatives && ex.alternatives.includes(selectedAlternative)) {
              effectiveExercise = {
                ...ex,
                exercise: selectedAlternative,
                name: selectedAlternative,
              };
            }

            // Check if this exercise is part of a superset
            const isPartOfSuperset = ex.superset_group && ex.superset_group.trim() !== '';
            const nextExercise = exercises[idx + 1];
            const isLastInSuperset = !nextExercise || nextExercise.superset_group !== ex.superset_group;
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
                  exercise={effectiveExercise}
                  progress={progress}
                  themeColor={themeColor}
                  isActive={isActive}
                  onPress={() => {
                    scrollRef.current?.scrollTo({ y: 0, animated: true });
                    swapFocus(idx);
                  }}
                  onLongPress={() => handleExerciseLongPress(idx)}
                  exerciseImages={miniCardImages.get(effectiveExercise.exercise || effectiveExercise.name || '') || null}
                />

                {/* Show appropriate UI between exercises */}
                {hasNextExercise && (
                  <>
                    {/* Show superset connector if linked */}
                    {isLinkedToNext && (
                      <SupersetConnector themeColor={themeColor} />
                    )}

                  </>
                )}
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>

      {/* ── HEADER DROPDOWN MENU (overlays, stays fixed) ───────────── */}
      {headerMenuOpen && (
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setHeaderMenuOpen(false)}
        />
      )}
      {headerMenuOpen && (
        <Animated.View
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
      )}

      {/* ── BOTTOM BAR ─────────────────────────────────────────── */}
      {!accessoryVisible && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity
            style={styles.timerBadge}
            onPress={showTimerModal}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={16} color="#9898a4" />
            <Text style={styles.timerText}>{getRestTimerDisplay()}</Text>
          </TouchableOpacity>

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

          {/* A finished countdown leaves `timer` non-null with isRunning/isPaused
              both false, so truthiness alone would strand a dead 0:00 here. */}
          {timer && (timer.isRunning || timer.isPaused) ? (
            <TouchableOpacity
              style={styles.accessoryTimer}
              onPress={showTimerModal}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="time-outline" size={15} color={themeColor} />
              <Text style={[styles.accessoryTimerText, { color: themeColor }]}>
                {getRestTimerDisplay()}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.accessoryHint} numberOfLines={1}>
              {accessoryPrev ? `last: ${formatPrevWeight(accessoryPrev, globalUnit)} × ${accessoryPrev.reps}` : ''}
            </Text>
          )}

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
    </View>
    </GestureDetector>

    {/* Existing Timer Modal */}
    <TimerModal />

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
}

function OneRMBadge({ sets, themeColor, unit, calculate1RM }: OneRMBadgeProps) {
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

  if (oneRM <= 0) return null;
  return (
    <View style={styles.oneRMBadge}>
      <Text style={styles.oneRMLabel}>1RM</Text>
      <Text style={[styles.oneRMValue, { color: themeColor }]}>
        {oneRM.toFixed(1)} {unit}
      </Text>
    </View>
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

// Helper function to parse target reps from weekly format
// Converts "6, 6, 5, 5" or "8-12" to array of rep targets
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

interface SetsTableProps {
  exerciseIndex: number;
  sets: SetData[];
  unit: 'kg' | 'lbs';
  themeColor: string;
  workoutStarted: boolean;
  exercise: Exercise; // For accessing weekly reps
  currentWeek: number; // For determining which week's reps to use
  previousSets: PreviousSets; // Last session's reference, keyed by setNumber
  onUpdate: (
    exerciseIndex: number,
    setIndex: number,
    field: 'weight' | 'reps',
    value: string,
  ) => void;
  onComplete: (exerciseIndex: number, setIndex: number) => void;
  onAdd: (exerciseIndex: number) => void;
  onRemove: (exerciseIndex: number, setIndex: number) => void;
  onSetTapWhenNotStarted?: () => void;
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
  exercise,
  currentWeek,
  previousSets,
  onUpdate,
  onComplete,
  onAdd,
  onRemove,
  onSetTapWhenNotStarted,
  onFocusField,
  registerWeightRef,
  onShowDeleteModal,
}: SetsTableProps) {
  // Parse target reps for this week
  const weeklyReps = exercise.reps_weekly?.[String(currentWeek)] || exercise.reps;
  const targetRepsArray = weeklyReps ? parseTargetReps(String(weeklyReps), sets.length) : [];

  return (
    <View style={styles.setsTable}>
      {/* Header row */}
      <View style={styles.setsHeader}>
        <Text style={[styles.setsHeaderCell, { width: 30 }]}>SET</Text>
        <Text style={[styles.setsHeaderCell, { width: 60 }]}>PREV</Text>
        <Text style={[styles.setsHeaderCell, { flex: 1, textAlign: 'center' }]}>{unit.toUpperCase()}</Text>
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
          targetReps={targetRepsArray[i] || undefined}
          previous={previousSets[i + 1]}
          isLastSet={i === sets.length - 1}
          onUpdate={(field, val) => onUpdate(exerciseIndex, i, field, val)}
          onComplete={() => onComplete(exerciseIndex, i)}
          onLongPress={() => {
            onShowDeleteModal(exerciseIndex, i);
          }}
          onSetTapWhenNotStarted={onSetTapWhenNotStarted}
          onFocusField={(field) => onFocusField(i, field)}
          registerWeightRef={(ref) => registerWeightRef(i, ref)}
          globalUnit={unit}
        />
      ))}

      {/* Add set */}
      <TouchableOpacity
        style={styles.addSetBtn}
        onPress={() => onAdd(exerciseIndex)}
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
  targetReps?: string; // Target reps for this specific set
  previous?: { weight: string; reps: string; unit?: 'kg' | 'lbs' }; // Last session's numbers for this set
  isLastSet: boolean; // Whether this is the last set in the array
  onUpdate: (field: 'weight' | 'reps', val: string) => void;
  onComplete: () => void;
  onLongPress: () => void;
  onSetTapWhenNotStarted?: () => void;
  onFocusField: (field: 'weight' | 'reps') => void;
  registerWeightRef: (ref: TextInput | null) => void;
  globalUnit: 'kg' | 'lbs'; // Added for unit indicator
}

function SetRow({
  set,
  index,
  themeColor,
  workoutStarted,
  targetReps,
  previous,
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
  return (
    <View style={[styles.setRow, completed && styles.setRowCompleted]}>
        <Pressable
          onLongPress={onLongPress}
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
        <TextInput
          ref={(r) => registerWeightRef(r)}
          style={[styles.setInput, { flex: 1 }]}
          value={set.weight}
          onChangeText={(v) => onUpdate('weight', v)}
          onFocus={() => onFocusField('weight')}
          onPressIn={() => {
            if (!workoutStarted && onSetTapWhenNotStarted) {
              onSetTapWhenNotStarted();
            }
          }}
          keyboardType="decimal-pad"
          // No ghost weight — last session's load is already one column left,
          // under PREV. The plan prescribes reps, not load, so there is no
          // target to suggest here.
          placeholder=""
          placeholderTextColor="#3a3a44"
          editable={workoutStarted && !completed}
        />

        <TextInput
          style={[styles.setInput, { flex: 1 }]}
          value={set.reps}
          onChangeText={(v) => onUpdate('reps', v)}
          onFocus={() => onFocusField('reps')}
          onPressIn={() => {
            if (!workoutStarted && onSetTapWhenNotStarted) {
              onSetTapWhenNotStarted();
            }
          }}
          keyboardType="number-pad"
          // The rep target is the prescription for this week — the ghost text
          // should say what to hit, not what was hit last time. Last session's
          // reps are still one column to the left, under PREV.
          placeholder={targetReps || previous?.reps || ''}
          placeholderTextColor="#3a3a44"
          editable={workoutStarted && !completed}
        />

        <TouchableOpacity
          onPress={workoutStarted ? onComplete : undefined}
          onPressIn={() => {
            if (!workoutStarted && onSetTapWhenNotStarted) {
              onSetTapWhenNotStarted();
            }
          }}
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

interface ExerciseMiniCardProps {
  exercise: Exercise;
  progress: { completed: number; total: number };
  themeColor: string;
  isActive?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  exerciseImages?: {start: any, end: any} | null;
}

const ExerciseMiniCard = React.memo(function ExerciseMiniCard({
  exercise,
  progress,
  themeColor,
  isActive = false,
  onPress,
  onLongPress,
  exerciseImages,
}: ExerciseMiniCardProps) {
  const allDone = progress.total > 0 && progress.completed === progress.total;

  // The CURRENT badge used to blink in and out the instant currentIndex changed. Fade and
  // scale it instead, so it arrives with the rest of the gesture.
  //
  // The animated value lives INSIDE the card, keyed off the isActive prop, so no new prop
  // is threaded down and React.memo still holds: a commit re-renders only the two cards
  // whose isActive actually flipped, not all N.
  //
  // Native-driven — opacity and transform both qualify, and the JS thread is already
  // carrying the stage height.
  const badgeAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  // Keep the badge mounted through its exit, or there is nothing left to fade. Mounting it
  // permanently is not an option: currentBadge has real width, and an invisible one would
  // squeeze every inactive card's title.
  const [badgeMounted, setBadgeMounted] = useState(isActive);

  // The active card's background, border and title colour used to flip instantly. Cross-fade
  // them instead, so the outgoing card relaxes out of its active state as the incoming one
  // settles into it.
  //
  // JS-driven, and it has to be: backgroundColor, borderColor and colour are NOT
  // native-driver properties. That is acceptable here because this runs only on COMMIT, not
  // during the drag — by the time it starts the finger is up — and only the two cards whose
  // isActive flipped animate, not all N. That is also why this keys off isActive rather than
  // interpolating dragX: doing the latter would drive every row in the list on every frame.
  const activeAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

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

    Animated.timing(activeAnim, {
      toValue: isActive ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // colour properties cannot leave the JS thread
    }).start();
  }, [isActive, badgeAnim, activeAnim]);

  return (
    <AnimatedTouchableOpacity
      style={[
        styles.miniCard,
        allDone && styles.miniCardDone,
        {
          // Interpolated rather than swapped, so the state cross-fades. End values match
          // styles.miniCard and styles.miniCardActive exactly.
          borderColor: activeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)'],
          }),
          backgroundColor: activeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['#0a0a0f', 'rgba(255,255,255,0.02)'],
          }),
        },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={600}
      activeOpacity={0.75}
    >
      <View style={styles.miniIcon}>
        {exerciseImages?.start ? (
          <Image
            source={exerciseImages.start}
            style={styles.miniExerciseImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons
            name={allDone ? 'checkmark-circle' : isActive ? 'play-circle' : 'barbell-outline'}
            size={20}
            color={allDone ? themeColor : isActive ? themeColor : '#9898a4'}
          />
        )}
        {/* Status overlay for completed/active states when image is shown */}
        {exerciseImages?.start && (allDone || isActive) && (
          <View style={styles.miniIconOverlay}>
            <Ionicons
              name={allDone ? 'checkmark-circle' : 'play-circle'}
              size={16}
              color={themeColor}
            />
          </View>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.miniTitleRow}>
          <Animated.Text
            style={[
              styles.miniTitle,
              allDone && styles.miniTitleDone,
              {
                color: activeAnim.interpolate({
                  inputRange: [0, 1],
                  // Resting colour depends on whether the exercise is finished; the active
                  // colour is the same either way.
                  outputRange: [allDone ? '#9898a4' : '#f0f0f2', '#ffffff'],
                }),
              },
            ]}
          >
            {exercise.exercise || exercise.name || 'Exercise'}
          </Animated.Text>
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
    </AnimatedTouchableOpacity>
  );
});

// ── Exercise Page Preview (read-only, used by the swipe peek layers) ──
// A lightweight, non-interactive copy of the image header + focus area for a
// neighbour exercise, so the card sliding in during a swipe looks complete.
// Only the live centre card runs image cycling / inputs; this never does.

interface ExercisePagePreviewProps {
  /** Reports whether this exercise's title wraps, so its card height is known before it lands. */
  onTitleMeasured?: (index: number, multi: boolean) => void;
  /** Whether this exercise's title wraps. Drives the same two-mode layout as the live card. */
  isMultiLine?: boolean;
  index: number;
  exercises: Exercise[];
  allSetsData: SetData[][];
  exercisePreferences: { [exerciseName: string]: string };
  previousByExercise: Record<string, PreviousSets>;
  miniCardImages: Map<string, { start: any; end: any } | null>;
  themeColor: string;
  globalUnit: 'kg' | 'lbs';
  currentWeek: number;
  calculate1RM: (w: number, r: number) => number;
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
 * Rendered ONCE, pinned in pagerStage outside the animated layers. The bar describes the
 * workout rather than any one exercise, so it holds still while the cards slide beneath it.
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

function ExercisePagePreview({
  index,
  exercises,
  allSetsData,
  exercisePreferences,
  previousByExercise,
  miniCardImages,
  themeColor,
  globalUnit,
  currentWeek,
  calculate1RM,
  onTitleMeasured,
  isMultiLine,
}: ExercisePagePreviewProps) {
  const ex = exercises[index];
  if (!ex) return null;

  // Resolve the effective exercise (preferred alternative if one is set)
  const primaryName = ex.exercise || ex.name || '';
  const pref = exercisePreferences[primaryName];
  let eff: Exercise = ex;
  if (pref && ex.alternatives && ex.alternatives.includes(pref)) {
    eff = { ...ex, exercise: pref, name: pref };
  }
  const name = eff.exercise || eff.name || 'Exercise';
  const sets = allSetsData[index] || [];
  const previousSets = previousByExercise[name] || {};
  const img = miniCardImages.get(name)?.start || null;

  // The live card shows a chevron beside the title when the exercise has alternatives
  // (its `allExercises.length > 1`). Mirror that, or it pops in on commit — and because
  // the chevron shares the title's row, its absence also let the title claim ~26px more
  // width, so a long name could reflow the instant the card settled.
  const hasAlternatives =
    (ex.alternatives || []).filter((a) => a && typeof a === 'string').length > 0;

  return (
    <View>
      {/* Image header */}
      <View style={styles.imageContainer}>
        <View style={styles.fullScreenMediaContainer}>
          {img ? (
            <Image source={img} style={styles.fullScreenImage} resizeMode="contain" />
          ) : (
            <View style={styles.fullScreenPlaceholder}>
              <Ionicons name="barbell-outline" size={60} color="#3a3a44" />
              <Text style={styles.mediaPlaceholderText}>No preview</Text>
            </View>
          )}
          <View style={styles.imageOverlay} />
        </View>

        {/* Neither the progress ticks nor the header controls live here. Both are pinned
            once in pagerStage, outside every animated layer, and hold still while these
            peek cards slide beneath them. The fake header this used to render existed
            only to mask the real one sliding away — with the real one pinned, a duplicate
            would now show through as a double image. */}
      </View>

      {/* Focus area */}
      <View style={styles.focusArea}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1, marginRight: 16, minWidth: 0 }}>
            {/* Mirrors the live title EXACTLY, but with Views: nothing here is tappable.
                The live card has two modes — a single-line title lays out as a row with the
                chevron beside it, while a wrapping title switches to a column and moves the
                chevron INLINE, to the end of the second line. Implementing only the row mode
                is what made the chevron jump lines the moment a long title committed, and it
                also gave the two different text widths (col vs col - 26), so they could wrap
                in different places. */}
            <View style={[styles.titleButton, isMultiLine && styles.titleButtonMultiline]}>
              <Text
                style={styles.title}
                numberOfLines={2}
                onTextLayout={(e) => onTitleMeasured?.(index, e.nativeEvent.lines.length > 1)}
              >
                {name}
                {hasAlternatives && isMultiLine && (
                  <Text style={styles.inlineArrow}>
                    {' '}
                    <View>
                      <Ionicons name="chevron-down" size={18} color={themeColor} />
                    </View>
                  </Text>
                )}
              </Text>
              {hasAlternatives && !isMultiLine && (
                <View style={{ marginLeft: 8 }}>
                  <Ionicons name="chevron-down" size={18} color={themeColor} />
                </View>
              )}
            </View>
            {!!(eff.primaryMuscles?.length || eff.secondaryMuscles?.length) && (
              <Text style={styles.muscles}>
                {[...(eff.primaryMuscles || []), ...(eff.secondaryMuscles || [])].join(' · ')}
              </Text>
            )}
          </View>
          <OneRMBadge sets={sets} themeColor={themeColor} calculate1RM={calculate1RM} unit={globalUnit} />
        </View>

        <PrescriptionBanner exercise={eff} currentWeek={currentWeek} themeColor={themeColor} />

        <PreviewSetsTable
          sets={sets}
          exercise={eff}
          currentWeek={currentWeek}
          unit={globalUnit}
          themeColor={themeColor}
          previousSets={previousSets}
        />
      </View>
    </View>
  );
}

interface PreviewSetsTableProps {
  sets: SetData[];
  exercise: Exercise;
  currentWeek: number;
  unit: 'kg' | 'lbs';
  themeColor: string;
  previousSets: PreviousSets;
}

function PreviewSetsTable({
  sets,
  exercise,
  currentWeek,
  unit,
  themeColor,
  previousSets,
}: PreviewSetsTableProps) {
  const weeklyReps = exercise.reps_weekly?.[String(currentWeek)] || exercise.reps;
  const targetRepsArray = weeklyReps ? parseTargetReps(String(weeklyReps), sets.length) : [];

  return (
    <View style={styles.setsTable}>
      <View style={styles.setsHeader}>
        <Text style={[styles.setsHeaderCell, { width: 30 }]}>SET</Text>
        <Text style={[styles.setsHeaderCell, { width: 60 }]}>PREV</Text>
        <Text style={[styles.setsHeaderCell, { flex: 1, textAlign: 'center' }]}>{unit.toUpperCase()}</Text>
        <Text style={[styles.setsHeaderCell, { flex: 1, textAlign: 'center' }]}>REPS</Text>
        <Text style={[styles.setsHeaderCell, { width: 34, textAlign: 'center' }]}>✓</Text>
      </View>

      {sets.map((s, i) => {
        const prev = previousSets[i + 1];
        const wTxt = s.weight || '';
        const rTxt = s.reps || targetRepsArray[i] || '';
        const isLastSet = i === sets.length - 1;
        return (
          <View key={i} style={[styles.setRow, s.completed && styles.setRowCompleted]}>
            <View style={styles.setNumCell}>
              <View style={styles.setNumInner}>
                <Text style={styles.setNum}>{i + 1}</Text>
                {/* The live row draws this on the last set; without it, it popped in on commit */}
                {isLastSet && <Text style={styles.setRowLastMark}>×</Text>}
              </View>
            </View>
            <View style={styles.prevCellBox}>
              <Text style={styles.prevCell} numberOfLines={1}>
                {prev ? `${formatPrevWeight(prev, unit)} × ${prev.reps}` : '—'}
              </Text>
            </View>
            {/* Direct children of the row, exactly like the live TextInputs. The extra
                wrapper these used to sit in was a second box in the flex chain that the
                live row does not have. */}
            <View style={[styles.setInput, { flex: 1 }]}>
              <Text style={[styles.previewCellText, { color: s.weight ? '#f0f0f2' : '#3a3a44' }]}>{wTxt}</Text>
            </View>
            <View style={[styles.setInput, { flex: 1 }]}>
              <Text style={[styles.previewCellText, { color: s.reps ? '#f0f0f2' : '#3a3a44' }]}>{rTxt}</Text>
            </View>
            <View style={styles.setCheckCell}>
              <Ionicons
                name={s.completed ? 'checkmark-circle' : 'ellipse-outline'}
                size={26}
                color={s.completed ? themeColor : '#3a3a44'}
              />
            </View>
          </View>
        );
      })}

      {/* "Add set" — a plain View, not a TouchableOpacity: the peek layer is read-only.
          Its absence was the loudest pop, and the costliest: the button occupies real
          height, so the whole preview card was short and everything below it jumped on
          commit. Same styles as the live button, so the geometry is identical. */}
      <View style={styles.addSetBtn}>
        <Ionicons name="add" size={18} color="#9898a4" />
        <Text style={styles.addSetText}>Add set</Text>
      </View>
    </View>
  );
}

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
// Helpers
// ──────────────────────────────────────────────────────────────────

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
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
    overflow: 'hidden', // clips the peeking neighbours to the screen edge
  },
  // Pinned progress bar: a sibling of the animated card, so the swipe's dragX never
  // touches it. Mirrors imageContainer's box (top of the stage, 16:9) so the ticks
  // inside it land at the same screen position they did when they lived in the image.
  // Sits inside pagerStage's bounds, so overflow: 'hidden' does not clip it.
  pinnedTicksLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    aspectRatio: 16 / 9,
    zIndex: 20,
  },
  pagerPeek: {
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
  // ── Shared set-row cell geometry ───────────────────────────────
  // SetRow (live) and PreviewSetsTable (swipe peek) MUST lay out identically, or the
  // card visibly shifts the instant a swipe commits. These live in one place so the
  // two cannot drift apart again.
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
    // A TextInput centres its own text in the box; a Text inside a View does not — it
    // sits against the top padding. PreviewSetsTable reuses this style on a View, so
    // without this its numbers rendered a few px higher than the live ones and visibly
    // jumped on commit. No-op on the TextInput itself (it has no flex children).
    justifyContent: 'center',
  },
  previewCellText: {
    fontFamily: 'DMMono-Medium',
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
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
  accessoryHint: {
    flex: 1,
    textAlign: 'center',
    color: '#55555f',
    fontSize: 12,
    fontFamily: 'DMMono-Regular',
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
  miniCardActive: {
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
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
  miniTitleActive: {
    color: '#ffffff',
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

  // ── History View Styles ──────────────
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