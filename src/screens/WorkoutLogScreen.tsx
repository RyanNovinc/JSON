/**
 * WorkoutLogScreen.tsx
 *
 * Focused exercise view with sticky top + scrollable upcoming list.
 *
 * Layout (top to bottom):
 *  - Header: back button, action icons (chart / refresh / more)
 *  - SUSPENSION (sticky/fixed area):
 *      - Exercise media (240px image)
 *      - Title + 1RM badge
 *      - Muscle tags (subtle)
 *      - Sets table (current exercise)
 *  - SCROLLABLE list (independent scroll):
 *      - "Up Next" header
 *      - Mini cards for remaining exercises (tappable to swap focus)
 *  - Bottom bar: timer + finish workout button
 *
 * State preserved across exercise swaps via parent props (this is a presentational
 * component; the parent owns sets data, completion, weight/reps, etc).
 *
 * Designed to match existing JSON.fit aesthetic:
 *   - bg #000, surfaces #0a0a0f / #111116
 *   - cyan accent (theme color, defaults to #22d3ee)
 *   - DM Mono for numbers, Outfit for text
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
  ActivityIndicator,
  Dimensions,
  Pressable,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutStorage, WorkoutHistory, ExercisePreference } from '../utils/storage';
import { useTimer } from '../contexts/TimerContext';
// Import the actual old working screen from Git history
import WorkoutLogScreenOld from './WorkoutLogScreenOld';
// Import existing modals and components
import { TimerModal } from '../components/TimerModal';
import { ExerciseHistoryModal } from '../../ExerciseHistoryScreen';
import FinishWorkoutModal from './FinishWorkoutModal';
import RepSchemeModal from '../components/RepSchemeModal';
import ExerciseNotesModal, { NoteEntry } from '../components/ExerciseNotesModal';
import WorkoutHeatmapModal from '../components/WorkoutHeatmapModal';

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

  const currentExercise = exercises[currentIndex];
  const currentSets = allSetsData[currentIndex] || [];

  // Calculate current exercise alternatives
  const selectedIndex = currentSets.length > 0 ? currentSets[0].selectedExerciseIndex || 0 : 0;
  const alternativeNames = (currentExercise?.alternatives || [])
    .filter(alt => alt && typeof alt === 'string')
    .map(alt => String(alt));
  const allExercises = [currentExercise?.exercise || 'Exercise', ...alternativeNames];
  const currentExerciseName = allExercises[selectedIndex] || currentExercise?.exercise || currentExercise?.name || 'Exercise';

  // Create effective current exercise (primary or selected alternative) - memoized to prevent infinite loops
  const effectiveCurrentExercise = useMemo(() => {
    return selectedIndex === 0 ? currentExercise : {
      ...currentExercise,
      exercise: currentExerciseName,
      name: currentExerciseName,
      // Note: We keep the same reps_weekly, rir_weekly, etc. as alternatives typically follow the same progression
    };
  }, [selectedIndex, currentExercise, currentExerciseName]);


  // Cross-fade animation when swapping focused exercise
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Image cache (in-memory; pair with AsyncStorage in production)
  const [imageCache, setImageCache] = useState<Record<string, string | null>>({});
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({});
  
  // Image cycling for exercise animations (start/end positions)
  const [imagePairs, setImagePairs] = useState<Record<string, {start: any, end: any}>>({});
  const [currentImagePhase, setCurrentImagePhase] = useState<'start' | 'end'>('start');
  const cyclingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Finish workout confirmation modal
  const [showFinishModal, setShowFinishModal] = useState(false);
  
  // Superset selection modal
  const [showSupersetModal, setShowSupersetModal] = useState(false);
  const [supersetSourceIndex, setSupersetSourceIndex] = useState<number | null>(null);

  // Rest timer logic
  const startRestTimer = (exerciseIndex: number, setIndex: number) => {
    const exercise = exercises[exerciseIndex];
    if (exercise?.rest) {
      const restSeconds = typeof exercise.rest === 'string' ? parseInt(exercise.rest) : exercise.rest;
      if (restSeconds && restSeconds > 0) {
        // Start countdown timer for rest period
        startTimer(restSeconds, exerciseIndex, setIndex, themeColor);
      }
    }
  };

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
  
  // State to show old view from Git history
  const [showOldView, setShowOldView] = useState(false);
  
  // Workout Heatmap Modal state
  const [showWorkoutHeatmap, setShowWorkoutHeatmap] = useState(false);
  
  // Exercise selector dropdown state
  const [showExerciseSelector, setShowExerciseSelector] = useState<number | null>(null);
  
  // Workout History Modal state
  const [showWorkoutHistory, setShowWorkoutHistory] = useState<{
    exerciseName: string;
    exerciseIndex: number;
  } | null>(null);
  
  // Timer context
  const { timer, startTimer, showModal: showTimerModal } = useTimer();

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

  // Handle finish workout button press
  const handleFinishWorkoutPress = () => {
    setShowFinishModal(true);
  };

  // Confirm finish workout
  const confirmFinishWorkout = () => {
    setShowFinishModal(false);
    onFinishWorkout();
  };

  const handleExerciseLongPress = (exerciseIndex: number) => {
    setSupersetSourceIndex(exerciseIndex);
    setShowSupersetModal(true);
  };

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
        // Use setTimeout to ensure this runs after any cleanup effects
        setTimeout(() => {
          startImageCycling(key, cachedImagePair);
        }, 50);
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
    // Clear any existing interval
    if (cyclingIntervalRef.current) {
      clearInterval(cyclingIntervalRef.current);
    }
    
    cyclingIntervalRef.current = setInterval(() => {
      setCurrentImagePhase((prevPhase) => {
        const newPhase = prevPhase === 'start' ? 'end' : 'start';
        
        // Update the image cache with the new phase
        const newImage = newPhase === 'start' ? imagePair.start : imagePair.end;
        
        setImageCache((prev) => {
          return { ...prev, [fullKey]: newImage };
        });
        
        return newPhase;
      });
    }, 1000); // Cycle every 1 second
  }, []);



  // Cleanup cycling when component unmounts or exercise changes (but NOT theme changes)
  useEffect(() => {
    const exerciseName = effectiveCurrentExercise?.exercise || effectiveCurrentExercise?.name || '';
    
    // Clear any existing cycling interval ONLY if exercise actually changed
    if (cyclingIntervalRef.current) {
      clearInterval(cyclingIntervalRef.current);
    }
    
    // Reset cycling phase for new exercise
    setCurrentImagePhase('start');
    
    return () => {
      if (cyclingIntervalRef.current) {
        clearInterval(cyclingIntervalRef.current);
      }
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

  // Navigation functions for swipe gestures
  const goToNextExercise = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < exercises.length) {
      swapFocus(nextIndex);
    }
  }, [currentIndex, exercises.length, swapFocus]);

  const goToPreviousExercise = useCallback(() => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      swapFocus(prevIndex);
    }
  }, [currentIndex, swapFocus]);

  // Swipe gesture configuration
  const swipeGesture = Gesture.Pan()
    .minDistance(30)
    .onEnd((event) => {
      const { velocityX, translationX, translationY } = event;
      const swipeThreshold = 50;
      const velocityThreshold = 500;
      
      // Only respond to horizontal swipes (ignore vertical scrolling)
      const horizontalDistance = Math.abs(translationX);
      const verticalDistance = Math.abs(translationY);
      
      // If the gesture is more vertical than horizontal, ignore it
      if (verticalDistance > horizontalDistance) {
        return;
      }
      
      // Swipe right-to-left (go to next exercise)
      if (translationX < -swipeThreshold || velocityX < -velocityThreshold) {
        goToNextExercise();
      }
      // Swipe left-to-right (go to previous exercise)  
      else if (translationX > swipeThreshold || velocityX > velocityThreshold) {
        goToPreviousExercise();
      }
    })
    .simultaneousWithExternalGesture();

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

  // Compute progress per exercise (used in mini cards)
  const exerciseProgress = useMemo(() => {
    return exercises.map((_, idx) => {
      const sets = allSetsData[idx] || [];
      const completed = sets.filter((s) => s.completed).length;
      return { completed, total: sets.length };
    });
  }, [exercises, allSetsData]);

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
                        {set.weight}{globalUnit} × {set.reps}
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

  // Show old workout view from Git history
  if (showOldView) {
    return <WorkoutLogScreenOld />;
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
          const weight = parseFloat(set.weight) || 0;
          const reps = parseInt(set.reps) || 0;
          const oneRM = weight > 0 && reps > 0 ? calculate1RM(weight, reps) : 0;
          console.log(`🧮 1RM calc: ${weight}kg × ${reps}reps = ${oneRM} (formatted: ${oneRM > 0 ? (oneRM + 0.0).toFixed(1) : null})`);
          return {
            weight: set.weight,
            reps: set.reps,
            rir: oneRM > 0 ? (oneRM + 0.0).toFixed(1) : null, // Force 1 decimal place for all values
          };
        })
      })),
    onClose: () => setShowWorkoutHistory(null),
    themeColor,
    globalUnit,
  } : null;

  return (
    <>
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.root}>

      {/* ── SCROLLABLE CONTENT ──────────────────────────── */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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

          {/* ── HEADER BUTTONS OVERLAID ON IMAGE ──────────────────────── */}
          <View style={styles.overlayHeader}>
            <TouchableOpacity
              onPress={onBack}
              style={styles.overlayBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>

            <View style={styles.overlayHeaderActions}>
              <TouchableOpacity
                onPress={() => setShowOldView(true)}
                style={styles.overlayBtn}
              >
                <Ionicons name="list" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleExerciseNotesPress(currentIndex)}
                style={styles.overlayBtn}
              >
                <Ionicons name="document-text-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleNotesPress(currentIndex)}
                style={styles.overlayBtn}
              >
                <Ionicons name="barbell-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowWorkoutHeatmap(true)}
                style={styles.overlayBtn}
              >
                <Ionicons name="body-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  // Use the effective exercise name (including alternatives)
                  const exerciseName = effectiveCurrentExercise.exercise;
                  setShowWorkoutHistory({ exerciseName, exerciseIndex: currentIndex });
                }}
                style={styles.overlayBtn}
              >
                <Ionicons name="time-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.focusArea, { opacity: fadeAnim }]}
          onLongPress={() => handleExerciseLongPress(currentIndex)}
          activeOpacity={1}
          delayLongPress={600}
        >
          {/* Exercise title and info */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <TouchableOpacity
                style={styles.titleButton}
                onPress={() => allExercises.length > 1 && setShowExerciseSelector(showExerciseSelector === currentIndex ? null : currentIndex)}
                activeOpacity={allExercises.length > 1 ? 0.7 : 1}
              >
                <Text style={styles.title} numberOfLines={2}>
                  {currentExerciseName}
                </Text>
                {allExercises.length > 1 && (
                  <Ionicons name="chevron-down" size={18} color={themeColor} style={{ marginLeft: 8 }} />
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
            <View style={styles.exerciseSelector}>
              {allExercises.map((exerciseName, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.exerciseOption,
                    index === selectedIndex && [styles.exerciseOptionSelected, { backgroundColor: themeColor + '20' }],
                    index === allExercises.length - 1 && styles.exerciseOptionLast
                  ]}
                  onPress={() => {
                    console.log(`🔧 [EXERCISE-SELECT] Selecting: ${exerciseName} for ${currentExercise.exercise} (index: ${index})`);
                    // Update the visual selection
                    onExerciseSelect(currentIndex, index);
                    // Handle preference saving
                    const alternativeNames = (currentExercise.alternatives || [])
                      .filter(alt => alt && typeof alt === 'string')
                      .map(alt => String(alt));
                    
                    if (index === 0) {
                      // Going back to original exercise - clear the preference
                      console.log(`🔧 [EXERCISE-SELECT] Clearing preference for ${currentExercise.exercise}`);
                      onSetExercisePreference(currentIndex, currentExercise.exercise, alternativeNames, '');
                    } else {
                      // Selecting an alternative
                      console.log(`🔧 [EXERCISE-SELECT] Setting preference for ${currentExercise.exercise} to ${exerciseName}`);
                      onSetExercisePreference(currentIndex, currentExercise.exercise, alternativeNames, exerciseName);
                    }
                    setShowExerciseSelector(null);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.exerciseOptionTextContainer}>
                    <View style={styles.exerciseOptionTextRow}>
                      <Text style={[
                        styles.exerciseOptionText,
                        index === selectedIndex && { color: themeColor }
                      ]}>
                        {exerciseName}
                      </Text>
                      {(() => {
                        // Show star for preferred exercise if set, otherwise show for primary (index 0)
                        const preferredExercise = exercisePreferences[currentExercise.exercise];
                        const showStar = preferredExercise ? exerciseName === preferredExercise : index === 0;
                        return showStar && (
                          <Ionicons 
                            name="star" 
                            size={14} 
                            color={themeColor} 
                            style={{ marginLeft: 6 }}
                          />
                        );
                      })()}
                    </View>
                    {index === 0 && (
                      <Text style={styles.exerciseOptionSubtext}>Primary</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
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
            onUpdate={onSetUpdate}
            onComplete={onSetComplete}
            onAdd={onSetAdd}
            onRemove={onSetRemove}
            onSetTapWhenNotStarted={onSetTapWhenNotStarted}
          />
        </TouchableOpacity>

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
                  onPress={() => swapFocus(idx)}
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

      {/* ── BOTTOM BAR ─────────────────────────────────────────── */}
      <View style={styles.bottomBar}>
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
          onPress={workoutStarted ? onFinishWorkout : onStartWorkout}
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
    </View>
    </GestureDetector>

    {/* Existing Timer Modal */}
    <TimerModal />

    {/* Exercise History Modal */}
    {historyModalProps && <ExerciseHistoryModal {...historyModalProps} />}

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

    {/* Enhanced Finish Workout Modal */}
    <FinishWorkoutModal
      visible={showFinishModal}
      onCancel={() => setShowFinishModal(false)}
      onConfirm={confirmFinishWorkout}
      allSetsData={allSetsData}
      durationSeconds={workoutDuration}
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
function parseTargetReps(repsString: string): string[] {
  if (!repsString) return [];
  
  // Handle comma-separated format like "6, 6, 5, 5"
  if (repsString.includes(',')) {
    return repsString.split(',').map(rep => rep.trim());
  }
  
  // Handle single rep scheme like "8-12" or "10" - return empty array for now
  // since we don't know how many sets there will be
  return [];
}

interface SetsTableProps {
  exerciseIndex: number;
  sets: SetData[];
  unit: string;
  themeColor: string;
  workoutStarted: boolean;
  exercise: Exercise; // For accessing weekly reps
  currentWeek: number; // For determining which week's reps to use
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
}

function SetsTable({
  exerciseIndex,
  sets,
  unit,
  themeColor,
  workoutStarted,
  exercise,
  currentWeek,
  onUpdate,
  onComplete,
  onAdd,
  onRemove,
  onSetTapWhenNotStarted,
}: SetsTableProps) {
  // Parse target reps for this week
  const weeklyReps = exercise.reps_weekly?.[String(currentWeek)] || exercise.reps;
  const targetRepsArray = weeklyReps ? parseTargetReps(String(weeklyReps)) : [];
  
  return (
    <View style={styles.setsTable}>
      {/* Header row */}
      <View style={styles.setsHeader}>
        <Text style={[styles.setsHeaderCell, { width: 36 }]}>SET</Text>
        <Text style={[styles.setsHeaderCell, { flex: 1 }]}>{unit.toUpperCase()}</Text>
        <Text style={[styles.setsHeaderCell, { flex: 1 }]}>REPS</Text>
        <Text style={[styles.setsHeaderCell, { width: 36, textAlign: 'center' }]}>
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
          isLastSet={i === sets.length - 1}
          onUpdate={(field, val) => onUpdate(exerciseIndex, i, field, val)}
          onComplete={() => onComplete(exerciseIndex, i)}
          onLongPress={() => {
            Alert.alert(
              'Delete Set',
              `Remove set ${i + 1}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Delete', 
                  style: 'destructive',
                  onPress: () => onRemove(exerciseIndex, i)
                }
              ]
            );
          }}
          onSetTapWhenNotStarted={onSetTapWhenNotStarted}
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
  isLastSet: boolean; // Whether this is the last set in the array
  onUpdate: (field: 'weight' | 'reps', val: string) => void;
  onComplete: () => void;
  onLongPress: () => void;
  onSetTapWhenNotStarted?: () => void;
}

function SetRow({
  set,
  index,
  themeColor,
  workoutStarted,
  targetReps,
  isLastSet,
  onUpdate,
  onComplete,
  onLongPress,
  onSetTapWhenNotStarted,
}: SetRowProps) {
  const completed = set.completed;
  return (
    <View style={[styles.setRow, completed && styles.setRowCompleted]}>
        <Pressable 
          onLongPress={onLongPress}
          delayLongPress={500}
          style={{ width: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <View style={{ alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Text style={[styles.setNum]}>{index + 1}</Text>
            {isLastSet && (
              <Text style={{ 
                position: 'absolute',
                left: -18,
                color: '#55555f', 
                fontSize: 16, 
                fontFamily: 'DMMono-Regular'
              }}>
                ×
              </Text>
            )}
          </View>
        </Pressable>

        <TextInput
          style={[styles.setInput, { flex: 1 }]}
          value={set.weight}
          onChangeText={(v) => onUpdate('weight', v)}
          onPressIn={() => {
            if (!workoutStarted && onSetTapWhenNotStarted) {
              onSetTapWhenNotStarted();
            }
          }}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor="#3a3a44"
          editable={workoutStarted && !completed}
        />

        <TextInput
          style={[styles.setInput, { flex: 1 }]}
          value={set.reps}
          onChangeText={(v) => onUpdate('reps', v)}
          onPressIn={() => {
            if (!workoutStarted && onSetTapWhenNotStarted) {
              onSetTapWhenNotStarted();
            }
          }}
          keyboardType="number-pad"
          placeholder={targetReps || "0"}
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
          style={{ width: 36, alignItems: 'center', paddingVertical: 8 }}
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
}

function ExerciseMiniCard({
  exercise,
  progress,
  themeColor,
  isActive = false,
  onPress,
}: ExerciseMiniCardProps) {
  const allDone = progress.total > 0 && progress.completed === progress.total;
  return (
    <TouchableOpacity
      style={[
        styles.miniCard, 
        allDone && styles.miniCardDone,
        isActive && styles.miniCardActive
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.miniIcon}>
        <Ionicons
          name={allDone ? 'checkmark-circle' : isActive ? 'play-circle' : 'barbell-outline'}
          size={20}
          color={allDone ? themeColor : isActive ? themeColor : '#9898a4'}
        />
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.miniTitleRow}>
          <Text style={[
            styles.miniTitle, 
            allDone && styles.miniTitleDone,
            isActive && styles.miniTitleActive
          ]}>
            {exercise.exercise || exercise.name || 'Exercise'}
          </Text>
          {isActive && (
            <View style={[styles.currentBadge, { backgroundColor: themeColor }]}>
              <Text style={styles.currentBadgeText}>CURRENT</Text>
            </View>
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
  if (!visible || sourceExerciseIndex === null) return null;

  const sourceExercise = exercises[sourceExerciseIndex];
  const adjacentOptions = [];

  // Add previous exercise option
  if (sourceExerciseIndex > 0) {
    adjacentOptions.push({
      index: sourceExerciseIndex - 1,
      exercise: exercises[sourceExerciseIndex - 1],
      position: 'above' as const,
    });
  }

  // Add next exercise option
  if (sourceExerciseIndex < exercises.length - 1) {
    adjacentOptions.push({
      index: sourceExerciseIndex + 1,
      exercise: exercises[sourceExerciseIndex + 1],
      position: 'below' as const,
    });
  }

  const handleSelection = (targetIndex: number) => {
    // Check if exercises are already linked
    const sourceSuperset = sourceExercise?.superset_group;
    const targetSuperset = exercises[targetIndex]?.superset_group;
    const areLinked = sourceSuperset && targetSuperset && sourceSuperset === targetSuperset;
    
    onSuperset(
      sourceExerciseIndex,
      targetIndex,
      areLinked ? 'unlink' : 'link'
    );
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalBackdrop} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity 
          style={[styles.supersetModal, { borderColor: themeColor + '40' }]}
          activeOpacity={1}
        >
          <Text style={styles.supersetModalTitle}>Create Superset</Text>
          <Text style={styles.supersetModalSubtitle}>
            Link "{sourceExercise?.exercise}" with:
          </Text>
          
          {adjacentOptions.map((option) => {
            const sourceSuperset = sourceExercise?.superset_group;
            const targetSuperset = option.exercise?.superset_group;
            const areLinked = sourceSuperset && targetSuperset && sourceSuperset === targetSuperset;
            
            return (
              <TouchableOpacity
                key={option.index}
                style={[
                  styles.supersetOption,
                  areLinked && { backgroundColor: themeColor + '20', borderColor: themeColor }
                ]}
                onPress={() => handleSelection(option.index)}
              >
                <View style={styles.supersetOptionContent}>
                  <Ionicons 
                    name={areLinked ? "link" : "add"} 
                    size={20} 
                    color={areLinked ? themeColor : '#9898a4'} 
                  />
                  <Text style={[
                    styles.supersetOptionText,
                    areLinked && { color: themeColor }
                  ]}>
                    {option.exercise?.exercise} ({option.position})
                  </Text>
                </View>
                <Text style={styles.supersetOptionAction}>
                  {areLinked ? 'UNLINK' : 'LINK'}
                </Text>
              </TouchableOpacity>
            );
          })}
          
          {adjacentOptions.length === 0 && (
            <Text style={styles.supersetNoOptions}>
              No adjacent exercises available for superset
            </Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
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
  },
  muscles: {
    color: '#55555f',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'DMMono-Regular',
    letterSpacing: 0.2,
  },

  // ── 1RM badge ─────────────────────────────────
  oneRMBadge: {
    alignItems: 'flex-end',
  },
  oneRMLabel: {
    color: '#55555f',
    fontSize: 10,
    letterSpacing: 1.5,
    fontFamily: 'DMMono-Regular',
  },
  oneRMValue: {
    fontSize: 16,
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
    letterSpacing: 1.2,
    fontFamily: 'DMMono-Medium',
    marginRight: 10,
  },
  prescriptionText: {
    color: '#9898a4',
    fontSize: 12,
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
  setNum: {
    color: '#9898a4',
    fontSize: 16,
    fontFamily: 'DMMono-Medium',
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
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  addSetText: {
    color: '#9898a4',
    fontSize: 13,
    marginLeft: 6,
    fontFamily: 'DMMono-Regular',
    letterSpacing: 0.4,
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
  exerciseSelector: {
    backgroundColor: '#0a0a0f',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginTop: 12,
    overflow: 'hidden',
  },
  exerciseOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  exerciseOptionLast: {
    borderBottomWidth: 0,
  },
  exerciseOptionSelected: {
    borderLeftWidth: 3,
  },
  exerciseOptionTextContainer: {
    flex: 1,
  },
  exerciseOptionTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseOptionText: {
    color: '#f0f0f2',
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Outfit-Medium',
    flex: 1,
  },
  exerciseOptionSubtext: {
    color: '#9898a4',
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'DMMono-Regular',
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  supersetModal: {
    backgroundColor: '#0a0a0f',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    minWidth: 300,
    maxWidth: 350,
  },
  supersetModalTitle: {
    color: '#f0f0f2',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  supersetModalSubtitle: {
    color: '#9898a4',
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    marginBottom: 20,
    textAlign: 'center',
  },
  supersetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#18181b',
    marginBottom: 8,
  },
  supersetOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  supersetOptionText: {
    color: '#f0f0f2',
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
    marginLeft: 12,
    flex: 1,
  },
  supersetOptionAction: {
    color: '#9898a4',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    fontFamily: 'DMMono-Medium',
  },
  supersetNoOptions: {
    color: '#55555f',
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },

});
