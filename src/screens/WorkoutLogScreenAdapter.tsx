import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WorkoutLogScreen from './WorkoutLogScreen';
import type { Exercise, SetData } from './WorkoutLogScreen';
import { useTheme } from '../contexts/ThemeContext';
import { useWeightUnit } from '../contexts/WeightUnitContext';
import { useTimer } from '../contexts/TimerContext';
import { useActiveWorkout } from '../contexts/ActiveWorkoutContext';
import { resolveExerciseImagePair } from '../utils/exerciseImages';
import { WorkoutStorage } from '../utils/storage';
import RobustStorage from '../utils/robustStorage';

// This adapter connects the new beautiful WorkoutLogScreen with your existing app navigation and data structures

export default function WorkoutLogScreenAdapter() {
  const navigation = useNavigation();
  const route = useRoute();
  const { themeColor, isPinkTheme } = useTheme();
  const { globalUnit } = useWeightUnit();
  const { startTimer } = useTimer();
  const { activeWorkout, setActiveWorkout } = useActiveWorkout();
  
  // Extract data from your existing route params
  const { day, blockName, currentWeek, block } = route.params || {};
  
  // State for the new component interface
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allSetsData, setAllSetsData] = useState<SetData[][]>([]);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [workoutDuration, setWorkoutDuration] = useState(0); // in seconds
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isFinishingWorkout, setIsFinishingWorkout] = useState(false);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  
  // Exercise alternatives state
  const [exercisePreferences, setExercisePreferences] = useState<{ [exerciseName: string]: string }>({});
  
  // Local exercises state for superset modifications
  const [exercises, setExercises] = useState<Exercise[]>([]);

  // Load exercise preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const saved = await AsyncStorage.getItem('exercisePreferences');
        if (saved) {
          setExercisePreferences(JSON.parse(saved));
        }
      } catch (error) {
        console.log('Could not load exercise preferences:', error);
      }
    };
    loadPreferences();
  }, []);
  
  
  // Initialize exercises from route params
  useEffect(() => {
    if (day?.exercises && exercises.length === 0) {
      const transformedExercises = (day.exercises || []).map((exercise: any, index: number) => ({
        id: `${exercise.exercise}-${index}`,
        exercise: exercise.exercise,
        name: exercise.exercise,
        sets: exercise.sets_weekly?.[currentWeek?.toString()] || exercise.sets || 3,
        reps: exercise.reps_weekly?.[currentWeek?.toString()] || exercise.reps || "8-12",
        rest: exercise.rest,
        notes: exercise.notes,
        primaryMuscles: Array.isArray(exercise.primaryMuscles) ? exercise.primaryMuscles : [],
        secondaryMuscles: Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : [],
        reps_weekly: exercise.reps_weekly,
        rir_weekly: exercise.rir_weekly,
        superset_group: exercise.superset_group, // Preserve existing superset data
        alternatives: Array.isArray(exercise.alternatives) ? 
          exercise.alternatives
            .filter(alt => alt && (typeof alt === 'string' || (typeof alt === 'object' && alt.exercise)))
            .map(alt => typeof alt === 'string' ? alt : alt.exercise) : [],
      }));
      setExercises(transformedExercises);
    }
  }, [day?.exercises, currentWeek]);


  // Initialize sets data and load saved progress
  useEffect(() => {
    const loadSavedData = async () => {
      const savedWorkout = await WorkoutStorage.loadCurrentWorkout(day?.day_name || '', blockName);
      
      if (savedWorkout && savedWorkout.allSetsData) {
        setAllSetsData(savedWorkout.allSetsData);
        
        // Restore workout timer state if it was active
        if (savedWorkout.workoutStartTime) {
          const startTime = new Date(savedWorkout.workoutStartTime);
          setWorkoutStartTime(startTime);
          setWorkoutDuration(savedWorkout.workoutDuration || 0); // Restore saved duration
          setWorkoutStarted(true);
        } else {
          
          // Check if there's an active workout context for this screen that has a timer (matching old screen logic)
          if (activeWorkout) {
            const currentWorkoutMatches = activeWorkout.routeParams?.day?.day_name === day?.day_name &&
                                         activeWorkout.routeParams?.blockName === blockName;
            const contextHasTimer = activeWorkout.duration > 0;
            
            
            if (currentWorkoutMatches && contextHasTimer && !workoutCompleted) {
              // Calculate what the start time should be based on current duration
              const estimatedStartTime = new Date(Date.now() - (activeWorkout.duration * 1000));
              setWorkoutStartTime(estimatedStartTime);
              setWorkoutDuration(activeWorkout.duration); // Initialize duration to match context
              setWorkoutStarted(true);
            } else {
              setWorkoutStartTime(null);
              setWorkoutStarted(false);
            }
          } else {
            setWorkoutStartTime(null);
            setWorkoutStarted(false);
          }
        }
      } else {
        const initialSetsData = exercises.map((exercise) => {
          const setsCount = exercise.sets;
          return Array(setsCount).fill(null).map(() => ({
            weight: '',
            reps: '',
            completed: false,
            selectedExerciseIndex: 0,
            exerciseData: {},
          }));
        });
        setAllSetsData(initialSetsData);
      }
      setDataLoaded(true);
    };
    
    if (exercises.length > 0) {
      loadSavedData();
    }
  }, [exercises.length, day?.day_name, blockName]);

  // Auto-save workout progress when sets data or workout state changes
  useEffect(() => {
    const saveWorkoutProgress = async () => {
      const progressData = {
        day,
        blockName,
        allSetsData,
        exerciseNotes: {}, // TODO: Add notes support if needed
        workoutStartTime,
        workoutDuration,
        timestamp: Date.now(),
      };
      await WorkoutStorage.saveCurrentWorkout(progressData);
    };

    // Save if data is loaded AND (we have sets data OR we have a workout start time)
    // This ensures timer state is saved even before any sets are entered
    if (dataLoaded && (allSetsData.length > 0 || workoutStartTime)) {
      saveWorkoutProgress();
    } else {
    }
  }, [allSetsData, workoutStartTime, dataLoaded, day, blockName]);

  // Update workout start time when first set is logged
  useEffect(() => {
    const hasSetsWithData = allSetsData.some(exerciseSets => 
      exerciseSets.some(set => set.weight !== '' || set.reps !== '')
    );
    
    
    // Only create a new timer if data is loaded, we don't have a start time, and there are sets with data
    // This prevents overwriting restored timer data during the loading process
    // Also don't auto-start if workout was already completed
    if (!workoutStartTime && hasSetsWithData && dataLoaded && !workoutCompleted) {
      setWorkoutStartTime(new Date());
      setWorkoutStarted(true);
    }
  }, [allSetsData, workoutStartTime, dataLoaded]);

  // Workout duration timer - updates based on start time (matching old screen)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    
    if (workoutStartTime) {
      // Update duration every second based on elapsed time
      const updateDuration = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - workoutStartTime.getTime()) / 1000);
        setWorkoutDuration(elapsed);
      };
      
      // Update immediately
      updateDuration();
      
      // Then update every second
      interval = setInterval(updateDuration, 1000);
    } else {
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [workoutStartTime]);

  // Update active workout context when workout timer state changes (matching old screen)
  useEffect(() => {
    // Skip context updates during workout completion to prevent re-starting timer
    if (isFinishingWorkout) {
      console.log('⏱️ [TIMER-DEBUG] Skipping activeWorkout update - finishing workout');
      return;
    }
    
    if (workoutStartTime) {
      const contextData = {
        dayName: day?.day_name || '',
        blockName: blockName || '',
        duration: workoutDuration,
        routeParams: { day, blockName, currentWeek, block, routineName: block?.routineName }
      };
      console.log('⏱️ [TIMER-DEBUG] Setting activeWorkout context:', contextData);
      setActiveWorkout(contextData);
    } else {
      console.log('⏱️ [TIMER-DEBUG] workoutStartTime is null, NOT clearing activeWorkout (only clear on explicit finish)');
    }
    // Don't clear the active workout when workoutStartTime is null
    // Only clear it when explicitly finishing the workout
  }, [workoutStartTime, workoutDuration, day?.day_name, blockName, currentWeek, block, isFinishingWorkout]);

  // Epley formula for 1RM calculation (preserving decimal precision)
  const calculate1RM = (weight: number, reps: number): number => {
    if (reps <= 0 || weight <= 0) return 0;
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
  };

  // Handler functions that adapt to your existing app logic
  const handleSetUpdate = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => {
    setAllSetsData(prev => {
      const newData = [...prev];
      if (!newData[exerciseIndex]) {
        newData[exerciseIndex] = [];
      }
      if (!newData[exerciseIndex][setIndex]) {
        newData[exerciseIndex][setIndex] = { weight: '', reps: '', completed: false, selectedExerciseIndex: 0, exerciseData: {} };
      }
      newData[exerciseIndex][setIndex] = {
        ...newData[exerciseIndex][setIndex],
        [field]: value,
      };
      return newData;
    });
  };

  const handleSetComplete = async (exerciseIndex: number, setIndex: number) => {
    const newData = [...allSetsData];
    const wasCompleted = newData[exerciseIndex]?.[setIndex]?.completed || false;
    
    if (!newData[exerciseIndex]?.[setIndex]) return;
    
    // Toggle completion state
    newData[exerciseIndex][setIndex] = {
      ...newData[exerciseIndex][setIndex],
      completed: !wasCompleted,
    };
    
    setAllSetsData(newData);
    
    // Save to history when set is completed (not when uncompleted)
    if (!wasCompleted && newData[exerciseIndex][setIndex].weight && newData[exerciseIndex][setIndex].reps) {
      await saveSetToHistory(exerciseIndex, setIndex, newData[exerciseIndex][setIndex]);
      
      // Start rest timer for completed set
      const exercise = exercises[exerciseIndex];
      
      if (exercise?.rest) {
        const restSeconds = typeof exercise.rest === 'string' ? parseInt(exercise.rest) : exercise.rest;
        if (restSeconds && restSeconds > 0) {
          startTimer(restSeconds, exerciseIndex, setIndex, themeColor);
        } else {
        }
      } else {
      }
    }
  };

  const handleSetAdd = (exerciseIndex: number) => {
    setAllSetsData(prev => {
      const newData = [...prev];
      if (!newData[exerciseIndex]) {
        newData[exerciseIndex] = [];
      }
      newData[exerciseIndex].push({
        weight: '',
        reps: '',
        completed: false,
        selectedExerciseIndex: 0,
        exerciseData: {},
      });
      return newData;
    });
  };

  const handleSetRemove = (exerciseIndex: number, setIndex: number) => {
    setAllSetsData(prev => {
      const newData = [...prev];
      if (newData[exerciseIndex]) {
        newData[exerciseIndex].splice(setIndex, 1);
      }
      return newData;
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleStartWorkout = () => {
    setWorkoutStarted(true);
    if (!workoutStartTime) {
      setWorkoutStartTime(new Date());
    }
  };

  const shakeStartButton = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleSetTapWhenNotStarted = () => {
    if (!workoutStarted) {
      shakeStartButton();
    }
  };

  // Exercise alternatives handlers
  const handleExerciseSelect = (exerciseIndex: number, selectedExerciseIndex: number) => {
    setAllSetsData(prev => {
      const newData = [...prev];
      const currentSelection = newData[exerciseIndex][0]?.selectedExerciseIndex || 0;
      
      // Only update if selection actually changed
      if (currentSelection !== selectedExerciseIndex) {
        const exercise = exercises[exerciseIndex];
        const alternativeNames = (exercise.alternatives || [])
          .filter(alt => alt && (typeof alt === 'string' || (typeof alt === 'object' && alt.exercise)))
          .map(alt => typeof alt === 'string' ? alt : alt.exercise);
        const allExercises = [exercise.exercise, ...alternativeNames];
        const newExerciseName = allExercises[selectedExerciseIndex] || exercise.exercise;
        
        // Update exercise selection for all sets of this exercise
        for (let i = 0; i < newData[exerciseIndex].length; i++) {
          const setData = newData[exerciseIndex][i];
          
          // Store current data before switching
          if (!setData.exerciseData) setData.exerciseData = {};
          setData.exerciseData[currentSelection] = {
            weight: setData.weight,
            reps: setData.reps,
            completed: setData.completed,
          };
          
          // Update selected exercise index
          setData.selectedExerciseIndex = selectedExerciseIndex;
          
          // Restore previous data for this exercise if it exists
          if (setData.exerciseData[selectedExerciseIndex]) {
            setData.weight = setData.exerciseData[selectedExerciseIndex].weight;
            setData.reps = setData.exerciseData[selectedExerciseIndex].reps;
            setData.completed = setData.exerciseData[selectedExerciseIndex].completed;
          } else {
            // First time selecting this exercise - start fresh
            setData.weight = '';
            setData.reps = '';
            setData.completed = false;
          }
        }
      }
      
      return newData;
    });
  };

  const handleSetExercisePreference = (exerciseIndex: number, primaryExercise: string, alternatives: string[], selectedAlternative: string) => {
    console.log(`🔧 [ADAPTER] Setting preference for ${primaryExercise} to "${selectedAlternative}"`);
    
    setExercisePreferences(prev => {
      const newPrefs = { ...prev };
      
      if (selectedAlternative === '' || selectedAlternative === primaryExercise) {
        // Clear the preference (back to original)
        delete newPrefs[primaryExercise];
        console.log(`🔧 [ADAPTER] Cleared preference for ${primaryExercise}`);
      } else {
        // Set the preference to the alternative
        newPrefs[primaryExercise] = selectedAlternative;
        console.log(`🔧 [ADAPTER] Set preference for ${primaryExercise} to ${selectedAlternative}`);
      }
      
      // Save to AsyncStorage
      AsyncStorage.setItem('exercisePreferences', JSON.stringify(newPrefs));
      
      return newPrefs;
    });
  };

  const handleSuperset = (exerciseIndex1: number, exerciseIndex2: number, action: 'link' | 'unlink') => {
    console.log(`🔗 [SUPERSET] ${action} exercises ${exerciseIndex1} and ${exerciseIndex2}`);
    
    setExercises(prevExercises => {
      const updatedExercises = [...prevExercises];
      
      if (action === 'link') {
        // Generate a unique superset group ID
        const supersetGroupId = `superset_${Date.now()}`;
        
        // Link both exercises to the same superset group
        updatedExercises[exerciseIndex1] = {
          ...updatedExercises[exerciseIndex1],
          superset_group: supersetGroupId
        };
        updatedExercises[exerciseIndex2] = {
          ...updatedExercises[exerciseIndex2],
          superset_group: supersetGroupId
        };
        
        console.log(`🔗 [SUPERSET] Linked exercises to group: ${supersetGroupId}`);
      } else {
        // Unlink - remove superset_group from both exercises
        updatedExercises[exerciseIndex1] = {
          ...updatedExercises[exerciseIndex1],
          superset_group: undefined
        };
        updatedExercises[exerciseIndex2] = {
          ...updatedExercises[exerciseIndex2],
          superset_group: undefined
        };
        
        console.log(`🔗 [SUPERSET] Unlinked exercises`);
      }
      
      return updatedExercises;
    });
  };

  const handleConfirmFinish = async () => {
    console.log('🏁 FINISH WORKOUT: User confirmed workout completion');
    console.log('🏁 FINISH WORKOUT: currentWeek =', currentWeek, 'blockName =', blockName);
    
    // Set flags to prevent useEffect from re-setting ActiveWorkout and auto-starting
    setIsFinishingWorkout(true);
    setWorkoutCompleted(true);
    
    // Clear workout timer state FIRST to prevent useEffect from re-setting ActiveWorkout
    setWorkoutStartTime(null);
    
    // Clear active workout context (matching old screen order)  
    console.log('🏁 FINISH WORKOUT: Clearing active workout context');
    setActiveWorkout(null);
    
    // Mark workout as completed using ROBUST STORAGE (matching old screen logic)
    try {
      const weekString = (currentWeek || 1).toString();
      const workoutKey = `${day?.day_name || 'unknown'}_week${weekString}`;
      const completedKey = `completed_${blockName}_week${weekString}`;
      
      console.log('🎯 [COMPLETION] Starting ROBUST completion save process...');
      console.log('🎯 [COMPLETION] Completed key:', completedKey);
      console.log('🎯 [COMPLETION] Workout key:', workoutKey);
      
      // Run health check before critical operation
      const healthCheck = await RobustStorage.healthCheck();
      console.log('🎯 [COMPLETION] Storage health check:', healthCheck);
      
      // Get existing completions using robust storage
      const completed = await RobustStorage.getItem(completedKey, true);
      let completedSet = new Set();
      
      if (completed) {
        try {
          const parsedCompleted = JSON.parse(completed);
          // Ensure it's an array before creating Set
          if (Array.isArray(parsedCompleted)) {
            // Filter out any objects that may have corrupted the data - keep only strings
            const cleanedCompleted = parsedCompleted.filter(item => typeof item === 'string');
            console.log('🎯 [COMPLETION] Cleaned completion data: removed', parsedCompleted.length - cleanedCompleted.length, 'non-string items');
            completedSet = new Set(cleanedCompleted);
          } else {
            console.warn('🎯 [COMPLETION] ⚠️ Completed data is not an array, starting fresh:', parsedCompleted);
          }
        } catch (parseError) {
          console.error('🎯 [COMPLETION] ❌ Error parsing completed data:', parseError);
          // Start with empty set if parsing fails
        }
      }
      
      completedSet.add(workoutKey);
      
      const completedData = JSON.stringify(Array.from(completedSet));
      console.log('🎯 [COMPLETION] Data to save:', completedData);
      
      // Save using robust storage with redundancy
      const saveSuccess = await RobustStorage.setItem(completedKey, completedData, true);
      console.log('🎯 [COMPLETION] ROBUST save result:', saveSuccess ? '✅ SUCCESS' : '❌ FAILED');
      
      if (!saveSuccess) {
        console.error('🎯 [COMPLETION] ❌ CRITICAL: ROBUST save failed! Trying emergency fallback...');
        
        // Emergency fallback: try saving with multiple different key formats
        const emergencyKeys = [
          `${completedKey}_emergency`,
          `workout_completion_${blockName.replace(/[^a-zA-Z0-9]/g, '_')}_week${weekString}`,
          `completion_backup_${Date.now()}`
        ];
        
        for (const emergencyKey of emergencyKeys) {
          try {
            await AsyncStorage.setItem(emergencyKey, completedData);
            console.log(`🎯 [COMPLETION] ✅ Emergency save succeeded with key: ${emergencyKey}`);
            break;
          } catch (emergencyError) {
            console.error(`🎯 [COMPLETION] ❌ Emergency save failed for ${emergencyKey}:`, emergencyError);
          }
        }
      }
      
      // Immediate verification
      const verification = await RobustStorage.getItem(completedKey, true);
      const verificationSuccess = verification === completedData;
      console.log('🎯 [COMPLETION] Immediate verification:', verificationSuccess ? '✅ SUCCESS' : '❌ FAILED');
      
      if (!verificationSuccess) {
        console.error('🎯 [COMPLETION] ❌ CRITICAL: Data verification failed immediately after save!');
      }
      
      // Save completion stats (matching old screen logic)
      const statsKey = `completionStats_${blockName}_week${weekString}`;
      const existingStats = await AsyncStorage.getItem(statsKey);
      const statsMap = existingStats ? new Map(JSON.parse(existingStats)) : new Map();
      
      // Calculate stats from current workout
      const calculateTotalVolume = () => {
        let totalVolume = 0;
        allSetsData.forEach((exerciseSets) => {
          exerciseSets.forEach((setData) => {
            if (setData.completed && setData.weight && setData.reps) {
              const weight = parseFloat(setData.weight) || 0;
              const reps = parseInt(setData.reps) || 0;
              totalVolume += weight * reps;
            }
          });
        });
        return Math.round(totalVolume * 10) / 10; // Round to 1 decimal
      };

      const stats = {
        duration: Math.round(workoutDuration / 60), // Convert to minutes
        totalVolume: calculateTotalVolume(),
        date: new Date().toISOString(),
      };
      
      statsMap.set(workoutKey, stats);
      await AsyncStorage.setItem(statsKey, JSON.stringify(Array.from(statsMap)));
      console.log('🎯 [COMPLETION] Saved completion stats:', stats);
      
    } catch (error) {
      console.error('🏁 FINISH WORKOUT: Error marking workout as completed:', error);
    }
    
    // Clear saved workout data since workout is complete
    await WorkoutStorage.clearCurrentWorkout(day?.day_name, blockName);
    setWorkoutStarted(false);
    setWorkoutDuration(0);
    
    // Navigate back to dashboard
    console.log('🏁 FINISH WORKOUT: Navigating back to dashboard...');
    console.log('🧭 [NAVIGATION] About to call navigation.goBack()');
    console.log('🧭 [NAVIGATION] Navigation object:', navigation);
    console.log('🧭 [NAVIGATION] Can go back:', navigation.canGoBack());
    try {
      navigation.goBack();
      console.log('🧭 [NAVIGATION] ✅ navigation.goBack() called successfully');
    } catch (error) {
      console.error('🧭 [NAVIGATION] ❌ Error calling navigation.goBack():', error);
    } finally {
      // Always reset the finishing flag
      setIsFinishingWorkout(false);
    }
  };

  // Wrapper for the new screen that expects synchronous function
  const handleFinishWorkout = () => {
    // Fire and forget the async completion logic
    handleConfirmFinish().catch(error => {
      console.error('🏁 FINISH WORKOUT: Error in completion:', error);
    });
  };

  // Optional handlers - implement these based on your app's features
  const handleOpenNotes = (exerciseIndex: number) => {
    // Navigate to exercise notes screen
  };

  const handleOpenHistory = (exerciseIndex: number) => {
    // Navigate to exercise history screen
  };

  const handleOpenSettings = (exerciseIndex: number) => {
    // Navigate to exercise settings screen
  };

  // Save set to workout history
  const saveSetToHistory = async (exerciseIndex: number, setIndex: number, setData: SetData) => {
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Get the exercise name
    const exercise = exercises[exerciseIndex];
    const exerciseName = exercise?.exercise || exercise?.name || 'Unknown Exercise';
    
    
    // Load existing history
    const history = await WorkoutStorage.loadWorkoutHistory();
    
    // Find existing entry for this exercise on this date
    const existingEntryIndex = history.findIndex(entry => 
      entry.exerciseName === exerciseName && 
      entry.date === currentDate &&
      entry.dayName === day?.day_name
    );
    
    const newSet = {
      setNumber: setIndex + 1, // Convert 0-based index to 1-based set number
      weight: setData.weight,
      reps: setData.reps,
      completed: setData.completed,
      unit: globalUnit,
    };
    
    if (existingEntryIndex >= 0) {
      // Update existing entry - replace or add the set
      const existingSetIndex = history[existingEntryIndex].sets.findIndex(
        set => set.setNumber === (setIndex + 1)
      );
      
      if (existingSetIndex >= 0) {
        // Replace existing set
        history[existingEntryIndex].sets[existingSetIndex] = newSet;
      } else {
        // Add new set to existing entry
        history[existingEntryIndex].sets.push(newSet);
      }
    } else {
      // Create new history entry
      const historyEntry = {
        id: `${exerciseName}-${currentDate}-${Date.now()}`, // Unique ID
        routineName: blockName || 'Workout',
        exerciseName,
        date: currentDate,
        dayName: day?.day_name || 'Workout',
        sets: [newSet],
      };
      history.push(historyEntry);
    }
    
    // Save updated history
    await WorkoutStorage.saveWorkoutHistory(history);
  };

  // Create themed image resolver
  const themedResolveExerciseImagePair = async (exercise: Exercise) => {
    const theme = isPinkTheme ? 'pink' : 'blue';
    return resolveExerciseImagePair(exercise, theme);
  };


  return (
    <>
      <WorkoutLogScreen
      exercises={exercises}
      currentIndex={currentIndex}
      onIndexChange={setCurrentIndex}
      allSetsData={allSetsData}
      workoutStarted={workoutStarted}
      workoutStartTime={workoutStartTime}
      onSetUpdate={handleSetUpdate}
      onSetComplete={handleSetComplete}
      onSetAdd={handleSetAdd}
      onSetRemove={handleSetRemove}
      onBack={handleBack}
      onStartWorkout={handleStartWorkout}
      onFinishWorkout={handleFinishWorkout}
      onOpenNotes={handleOpenNotes}
      onOpenHistory={handleOpenHistory}
      onOpenSettings={handleOpenSettings}
      onExerciseSelect={handleExerciseSelect}
      onSetExercisePreference={handleSetExercisePreference}
      onSuperset={handleSuperset}
      exercisePreferences={exercisePreferences}
      themeColor={themeColor}
      globalUnit={globalUnit}
      currentWeek={currentWeek || 1}
      calculate1RM={calculate1RM}
      resolveExerciseImagePair={themedResolveExerciseImagePair}
      shakeAnimation={shakeAnimation}
      onSetTapWhenNotStarted={handleSetTapWhenNotStarted}
    />
    
    </>
  );
}