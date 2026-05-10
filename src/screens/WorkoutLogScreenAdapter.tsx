import React, { useState, useEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import WorkoutLogScreen from './WorkoutLogScreen';
import type { Exercise, SetData } from './WorkoutLogScreen';
import { useTheme } from '../contexts/ThemeContext';
import { useWeightUnit } from '../contexts/WeightUnitContext';
import { useTimer } from '../contexts/TimerContext';
import { resolveExerciseImagePair } from '../utils/exerciseImages';
import { WorkoutStorage } from '../utils/storage';

// This adapter connects the new beautiful WorkoutLogScreen with your existing app navigation and data structures

export default function WorkoutLogScreenAdapter() {
  const navigation = useNavigation();
  const route = useRoute();
  const { themeColor, isPinkTheme } = useTheme();
  const { globalUnit } = useWeightUnit();
  
  // Extract data from your existing route params
  const { day, blockName, currentWeek, block } = route.params || {};
  
  // State for the new component interface
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allSetsData, setAllSetsData] = useState<SetData[][]>([]);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Transform your existing exercise data to the new interface
  const exercises: Exercise[] = (day?.exercises || []).map((exercise: any, index: number) => ({
    id: `${exercise.exercise}-${index}`,
    exercise: exercise.exercise,
    name: exercise.exercise,
    sets: exercise.sets_weekly?.[currentWeek?.toString()] || exercise.sets || 3,
    reps: exercise.reps_weekly?.[currentWeek?.toString()] || exercise.reps || "8-12",
    rest: exercise.rest,
    notes: exercise.notes,
    primaryMuscles: exercise.primaryMuscles || [],
    secondaryMuscles: exercise.secondaryMuscles || [],
    reps_weekly: exercise.reps_weekly,
    rir_weekly: exercise.rir_weekly,
    // Add imageUrl if you have exercise images
    // imageUrl: getExerciseImageUrl(exercise.exercise),
  }));

  // Initialize sets data and load saved progress
  useEffect(() => {
    const loadSavedData = async () => {
      console.log('💾 DATA LOADING: Loading workout progress for:', day?.day_name, blockName);
      const savedWorkout = await WorkoutStorage.loadCurrentWorkout(day?.day_name || '', blockName);
      
      if (savedWorkout && savedWorkout.allSetsData) {
        console.log('💾 DATA LOADING: Found saved workout data, restoring...');
        setAllSetsData(savedWorkout.allSetsData);
        setWorkoutStartTime(savedWorkout.workoutStartTime ? new Date(savedWorkout.workoutStartTime) : null);
        setWorkoutStarted(!!savedWorkout.workoutStartTime);
      } else {
        console.log('💾 DATA LOADING: No saved data, initializing fresh sets...');
        const initialSetsData = exercises.map((exercise) => {
          const setsCount = exercise.sets;
          return Array(setsCount).fill(null).map(() => ({
            weight: '',
            reps: '',
            completed: false,
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

  // Auto-save workout progress when sets data changes
  useEffect(() => {
    const saveWorkoutProgress = async () => {
      const progressData = {
        day,
        blockName,
        allSetsData,
        exerciseNotes: {}, // TODO: Add notes support if needed
        workoutStartTime,
        workoutDuration: workoutStartTime ? Math.floor((Date.now() - workoutStartTime.getTime()) / 1000) : 0,
        timestamp: Date.now(),
      };
      console.log('💾 AUTO-SAVE: Saving workout progress...', {
        setsDataLength: allSetsData.length,
        workoutStarted: !!workoutStartTime,
        dataLoaded
      });
      await WorkoutStorage.saveCurrentWorkout(progressData);
    };

    // Only auto-save if data is loaded and we have sets data
    if (dataLoaded && allSetsData.length > 0) {
      console.log('💾 AUTO-SAVE: Triggering save due to sets data change...');
      saveWorkoutProgress();
    }
  }, [allSetsData, workoutStartTime, dataLoaded, day, blockName]);

  // Update workout start time when first set is logged
  useEffect(() => {
    if (!workoutStartTime && allSetsData.some(exerciseSets => 
      exerciseSets.some(set => set.weight !== '' || set.reps !== '')
    )) {
      setWorkoutStartTime(new Date());
    }
  }, [allSetsData, workoutStartTime]);

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
        newData[exerciseIndex][setIndex] = { weight: '', reps: '', completed: false };
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
      console.log('Saving completed set to history...');
      await saveSetToHistory(exerciseIndex, setIndex, newData[exerciseIndex][setIndex]);
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

  const handleFinishWorkout = async () => {
    // Clear saved workout data since workout is complete
    await WorkoutStorage.clearCurrentWorkout(day?.day_name, blockName);
    setWorkoutStarted(false);
    setWorkoutStartTime(null);
    // Navigate to completion screen or back
    navigation.goBack();
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
    console.log('Saving set to history with date:', currentDate);
    
    // Get the exercise name
    const exercise = exercises[exerciseIndex];
    const exerciseName = exercise?.exercise || exercise?.name || 'Unknown Exercise';
    
    console.log('Saving set for exercise:', exerciseName, 'weight:', setData.weight, 'reps:', setData.reps, 'unit:', globalUnit);
    
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
    console.log('Set saved to history successfully:', {
      exercise: exerciseName,
      setNumber: setIndex + 1,
      weight: setData.weight,
      reps: setData.reps,
      unit: globalUnit
    });
  };

  // Create themed image resolver
  const themedResolveExerciseImagePair = async (exercise: Exercise) => {
    const theme = isPinkTheme ? 'pink' : 'blue';
    console.log('🎨 ADAPTER: Using theme:', theme, 'for exercise:', exercise.exercise);
    return resolveExerciseImagePair(exercise, theme);
  };

  console.log('🔌 ADAPTER: Rendering WorkoutLogScreen with exercises:', exercises.map(e => e.exercise));
  console.log('🔌 ADAPTER: Current exercise index:', currentIndex);
  console.log('🔌 ADAPTER: Current exercise:', exercises[currentIndex]);
  console.log('🔌 ADAPTER: isPinkTheme:', isPinkTheme);
  console.log('🔌 ADAPTER: themedResolveExerciseImagePair function:', themedResolveExerciseImagePair);

  return (
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
      themeColor={themeColor}
      globalUnit={globalUnit}
      currentWeek={currentWeek || 1}
      calculate1RM={calculate1RM}
      resolveExerciseImagePair={themedResolveExerciseImagePair}
    />
  );
}