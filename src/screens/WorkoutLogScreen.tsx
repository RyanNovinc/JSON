import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
  Animated,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/AppNavigator';
import { WorkoutStorage, WorkoutHistory } from '../utils/storage';
import { TimerNotifications, SOUND_OPTIONS, TimerSettings } from '../utils/timerNotifications';
import { useActiveWorkout } from '../contexts/ActiveWorkoutContext';

// Parse rep scheme into structured format
function parseRepScheme(reps: string): { type: 'weekly' | 'pyramid' | 'straight', values: string[] } {
  // Check if it's a weekly progression format
  if (reps.includes('Week')) {
    const weekPattern = /Week \d+: ([\d-]+)/g;
    const ranges: string[] = [];
    let match;
    while ((match = weekPattern.exec(reps)) !== null) {
      ranges.push(match[1]);
    }
    return { type: 'weekly', values: ranges };
  }
  
  // Check if it's a pyramid format like "12-10-8"
  if (/^\d+-\d+-\d+/.test(reps)) {
    return { type: 'pyramid', values: reps.split('-') };
  }
  
  // Check if it's already formatted with colons (weekly progression)
  if (reps.includes(':')) {
    return { type: 'weekly', values: reps.split(':') };
  }
  
  // Single rep range or number
  return { type: 'straight', values: [reps] };
}

// Get the current week's reps from a weekly progression
function getCurrentWeekReps(reps: string, weekNumber: number = 1): string {
  const scheme = parseRepScheme(reps);
  
  if (scheme.type === 'weekly' && scheme.values.length > 0) {
    // Return the reps for the current week (or first week if not specified)
    const weekIndex = Math.min(weekNumber - 1, scheme.values.length - 1);
    return scheme.values[weekIndex];
  }
  
  // For non-weekly schemes, just return the original
  return reps;
}

type WorkoutLogScreenNavigationProp = StackNavigationProp<RootStackParamList, 'WorkoutLog'>;
type WorkoutLogScreenRouteProp = RouteProp<RootStackParamList, 'WorkoutLog'>;

interface Exercise {
  exercise: string;
  sets: number;
  reps: string;
  reps_weekly?: {
    [key: string]: string;
  };
  rest?: number;
  restQuick?: number;
  notes?: string;
  alternatives?: string[];
  previous?: { weight: number; reps: number };
}

interface DropSet {
  weight: string;
  reps: string;
  completed?: boolean;
}

interface SetData {
  exercise: string;
  setNumber: number;
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
      isDropSet?: boolean;
      drops?: DropSet[];
    };
  };
  isDropSet?: boolean;
  drops?: DropSet[];
}

interface ExerciseNotes {
  [exerciseIndex: number]: string;
}

interface ExerciseCardProps {
  exercise: Exercise;
  exerciseIndex: number;
  currentWeek: number;
  setsData: SetData[];
  notes: string;
  workoutStarted: boolean;
  onSetUpdate: (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => void;
  onSetComplete: (exerciseIndex: number, setIndex: number) => void;
  onDropSetComplete: (exerciseIndex: number, setIndex: number, dropIndex: number) => void;
  onHistoryPress: (exerciseName: string) => void;
  onExerciseSelect: (exerciseIndex: number, selectedExerciseIndex: number) => void;
  onNotesPress: (exerciseIndex: number, exerciseName: string) => void;
  onInteractionAttempt?: () => void;
  isLinkedToNext?: boolean;
  isLinkedToPrev?: boolean;
}

function ExerciseCard({ 
  exercise, 
  exerciseIndex, 
  currentWeek,
  setsData,
  notes,
  workoutStarted,
  onSetUpdate, 
  onSetComplete,
  onDropSetComplete,
  onHistoryPress,
  onExerciseSelect,
  onNotesPress,
  onInteractionAttempt,
  isLinkedToNext,
  isLinkedToPrev
}: ExerciseCardProps) {
  
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [expandedDropSets, setExpandedDropSets] = useState<Set<number>>(new Set());
  
  // Use weekly reps if available, otherwise fall back to regular reps
  const targetReps = exercise.reps_weekly?.[currentWeek.toString()] || exercise.reps;
  const selectedIndex = setsData.length > 0 ? setsData[0].selectedExerciseIndex : 0;
  
  // Create array of all available exercises (primary + alternatives)
  const allExercises = [exercise.exercise, ...(exercise.alternatives || [])];
  const currentExerciseName = allExercises[selectedIndex] || exercise.exercise;

  const toggleDropSet = (setIndex: number) => {
    const newData = [...setsData];
    newData[setIndex].isDropSet = !newData[setIndex].isDropSet;
    
    if (newData[setIndex].isDropSet) {
      // Initialize with empty drop set (suggestions will show as placeholders)
      newData[setIndex].drops = [{ weight: '', reps: '' }];
      setExpandedDropSets(new Set([...expandedDropSets, setIndex]));
    } else {
      // Remove drop sets
      delete newData[setIndex].drops;
      const newExpanded = new Set(expandedDropSets);
      newExpanded.delete(setIndex);
      setExpandedDropSets(newExpanded);
    }
    
    onSetUpdate(exerciseIndex, setIndex, 'weight', newData[setIndex].weight); // Trigger update
  };

  const addDropSet = (setIndex: number) => {
    const newData = [...setsData];
    if (!newData[setIndex].drops) {
      newData[setIndex].drops = [];
    }
    
    // Add empty drop set (suggestions will show as placeholders)
    newData[setIndex].drops.push({ 
      weight: '', 
      reps: '' 
    });
    onSetUpdate(exerciseIndex, setIndex, 'weight', newData[setIndex].weight); // Trigger update
  };
  
  const getDropSuggestion = (setIndex: number, dropIndex: number, field: 'weight' | 'reps'): string => {
    const setData = setsData[setIndex];
    if (!setData) return '0';
    
    if (dropIndex === 0) {
      // First drop - base it on the main set
      const mainWeight = parseFloat(setData.weight);
      const mainReps = parseInt(setData.reps);
      
      if (mainWeight && mainReps) {
        if (field === 'weight') {
          return Math.round(mainWeight * 0.8).toString();
        } else {
          return (mainReps + 2).toString();
        }
      }
    } else {
      // Subsequent drops - base on previous drop
      const prevDrop = setData.drops?.[dropIndex - 1];
      if (prevDrop) {
        const prevWeight = parseFloat(prevDrop.weight);
        const prevReps = parseInt(prevDrop.reps);
        
        if (prevWeight && prevReps) {
          if (field === 'weight') {
            return Math.round(prevWeight * 0.85).toString();
          } else {
            return (prevReps + 2).toString();
          }
        }
      }
    }
    
    return '0';
  };

  const removeDropSet = (setIndex: number, dropIndex: number) => {
    const newData = [...setsData];
    if (newData[setIndex].drops) {
      newData[setIndex].drops.splice(dropIndex, 1);
      // If no drops left, disable drop set mode
      if (newData[setIndex].drops.length === 0) {
        newData[setIndex].isDropSet = false;
        delete newData[setIndex].drops;
        const newExpanded = new Set(expandedDropSets);
        newExpanded.delete(setIndex);
        setExpandedDropSets(newExpanded);
      }
      onSetUpdate(exerciseIndex, setIndex, 'weight', newData[setIndex].weight); // Trigger update
    }
  };

  const updateDropSet = (setIndex: number, dropIndex: number, field: 'weight' | 'reps', value: string) => {
    // Validate input - only allow numbers and decimal point for weight
    let sanitizedValue = value;
    if (field === 'weight') {
      // Allow numbers and one decimal point
      sanitizedValue = value.replace(/[^0-9.]/g, '');
      // Ensure only one decimal point
      const parts = sanitizedValue.split('.');
      if (parts.length > 2) {
        sanitizedValue = parts[0] + '.' + parts.slice(1).join('');
      }
    } else {
      // For reps, only allow whole numbers
      sanitizedValue = value.replace(/[^0-9]/g, '');
    }
    
    const newData = [...setsData];
    if (newData[setIndex].drops && newData[setIndex].drops[dropIndex]) {
      newData[setIndex].drops[dropIndex][field] = sanitizedValue;
      onSetUpdate(exerciseIndex, setIndex, 'weight', newData[setIndex].weight); // Trigger update
    }
  };
  
  const completeDropSet = (setIndex: number, dropIndex: number) => {
    onDropSetComplete(exerciseIndex, setIndex, dropIndex);
  };
  
  return (
    <View style={[
      styles.exerciseCard,
      (isLinkedToNext || isLinkedToPrev) && styles.exerciseCardLinked
    ]}>
      <View style={styles.exerciseHeader}>
        <TouchableOpacity 
          style={styles.exerciseNameContainer}
          onPress={() => allExercises.length > 1 && setShowExerciseSelector(!showExerciseSelector)}
          activeOpacity={allExercises.length > 1 ? 0.7 : 1}
        >
          <Text style={styles.exerciseName}>{currentExerciseName}</Text>
          {allExercises.length > 1 && (
            <Ionicons 
              name={showExerciseSelector ? "chevron-up" : "chevron-down"} 
              size={18} 
              color="#22d3ee" 
              style={styles.dropdownIcon}
            />
          )}
        </TouchableOpacity>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.historyButton}
            onPress={() => onNotesPress(exerciseIndex, currentExerciseName)}
            activeOpacity={0.7}
          >
            <Ionicons name={notes ? "document-text" : "document-text-outline"} size={20} color="#22d3ee" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.historyButton}
            onPress={() => onHistoryPress(currentExerciseName)}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={20} color="#22d3ee" />
          </TouchableOpacity>
        </View>
      </View>
      
      {showExerciseSelector && allExercises.length > 1 && (
        <View style={styles.exerciseSelector}>
          {allExercises.map((exerciseName, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.exerciseOption,
                index === selectedIndex && styles.exerciseOptionSelected,
                index === allExercises.length - 1 && styles.exerciseOptionLast
              ]}
              onPress={() => {
                onExerciseSelect(exerciseIndex, index);
                setShowExerciseSelector(false);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.exerciseOptionTextContainer}>
                {index === 0 && (
                  <Ionicons 
                    name="star" 
                    size={14} 
                    color={index === selectedIndex ? "#22d3ee" : "#71717a"} 
                    style={styles.primaryIcon}
                  />
                )}
                <Text style={[
                  styles.exerciseOptionText,
                  index === selectedIndex && styles.exerciseOptionTextSelected
                ]}>
                  {exerciseName}
                </Text>
              </View>
              {index === selectedIndex && (
                <Ionicons name="checkmark" size={16} color="#22d3ee" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      <View style={styles.setsContainer}>
        {setsData.map((setData, setIndex) => (
          <View key={setIndex}>
            <View 
              style={[
                styles.setRow,
                setData.completed && styles.setRowCompleted
              ]}
            >
              <Text style={styles.setNumber}>{setIndex + 1}</Text>
              
              <TextInput
                style={[
                  styles.input, 
                  styles.weightInput,
                  !workoutStarted && styles.inputDisabled
                ]}
                value={setData.weight}
                onChangeText={(value) => {
                  if (!workoutStarted) {
                    onInteractionAttempt && onInteractionAttempt();
                    return;
                  }
                  onSetUpdate(exerciseIndex, setIndex, 'weight', value);
                }}
                onFocus={() => {
                  if (!workoutStarted) {
                    onInteractionAttempt && onInteractionAttempt();
                  }
                }}
                placeholder={exercise.previous?.weight.toString() || '0'}
                placeholderTextColor="#52525b"
                keyboardType="decimal-pad"
                editable={!setData.completed}
              />
              
              <Text style={styles.separator}>×</Text>
              
              <TextInput
                style={[
                  styles.input, 
                  styles.repsInput,
                  !workoutStarted && styles.inputDisabled
                ]}
                value={setData.reps}
                onChangeText={(value) => {
                  if (!workoutStarted) {
                    onInteractionAttempt && onInteractionAttempt();
                    return;
                  }
                  onSetUpdate(exerciseIndex, setIndex, 'reps', value);
                }}
                onFocus={() => {
                  if (!workoutStarted) {
                    onInteractionAttempt && onInteractionAttempt();
                  }
                }}
                placeholder={getCurrentWeekReps(targetReps).split('-')[0]}
                placeholderTextColor="#52525b"
                keyboardType="number-pad"
                editable={!setData.completed}
              />
              
              <TouchableOpacity
                style={[
                  styles.checkButton,
                  setData.completed && styles.checkButtonCompleted,
                  !workoutStarted && styles.checkButtonDisabled
                ]}
                onPress={() => {
                  if (!workoutStarted) {
                    onInteractionAttempt && onInteractionAttempt();
                    return;
                  }
                  onSetComplete(exerciseIndex, setIndex);
                }}
                disabled={!setData.weight || !setData.reps}
              >
                <Ionicons 
                  name={setData.completed ? "checkmark-circle" : "checkmark-circle-outline"} 
                  size={24} 
                  color={setData.completed ? "#22c55e" : (!setData.weight || !setData.reps) ? "#52525b" : "#22d3ee"}
                />
              </TouchableOpacity>
              
              {/* Drop set button after check */}
              <TouchableOpacity
                style={styles.dropSetButton}
                onPress={() => {
                  if (!workoutStarted) {
                    onInteractionAttempt && onInteractionAttempt();
                    return;
                  }
                  toggleDropSet(setIndex);
                }}
              >
                <Text style={[
                  styles.dropSetButtonText,
                  setData.isDropSet && styles.dropSetButtonActive
                ]}>
                  DROP
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Drop sets */}
            {setData.isDropSet && setData.drops && (
              <View style={styles.dropSetsContainer}>
                {setData.drops.map((drop, dropIndex) => (
                  <View key={dropIndex} style={styles.dropRowContainer}>
                    {!setData.completed && (
                      <TouchableOpacity
                        style={styles.dropDeleteButton}
                        onPress={() => removeDropSet(setIndex, dropIndex)}
                      >
                        <Ionicons name="close-circle" size={18} color="#52525b" />
                      </TouchableOpacity>
                    )}
                    <View style={styles.dropRow}>
                      <Text style={styles.dropLabel}>Drop {dropIndex + 1}</Text>
                      
                      <TextInput
                        style={[styles.input, styles.dropWeightInput]}
                        value={drop.weight}
                        onChangeText={(value) => updateDropSet(setIndex, dropIndex, 'weight', value)}
                        placeholder={getDropSuggestion(setIndex, dropIndex, 'weight')}
                        placeholderTextColor="#52525b"
                        keyboardType="decimal-pad"
                        editable={!drop.completed}
                      />
                      
                      <Text style={styles.separator}>×</Text>
                      
                      <TextInput
                        style={[styles.input, styles.dropRepsInput]}
                        value={drop.reps}
                        onChangeText={(value) => updateDropSet(setIndex, dropIndex, 'reps', value)}
                        placeholder={getDropSuggestion(setIndex, dropIndex, 'reps')}
                        placeholderTextColor="#52525b"
                        keyboardType="number-pad"
                        editable={!drop.completed}
                      />
                      
                      {/* Check button for drop sets - only show if main set is completed */}
                      {setData.completed ? (
                        <TouchableOpacity
                          style={[
                            styles.dropCheckButton,
                            drop.completed && styles.checkButtonCompleted
                          ]}
                          onPress={() => completeDropSet(setIndex, dropIndex)}
                          disabled={!drop.weight || !drop.reps}
                        >
                          <Ionicons 
                            name={drop.completed ? "checkmark-circle" : "checkmark-circle-outline"} 
                            size={20} 
                            color={drop.completed ? "#22c55e" : (!drop.weight || !drop.reps) ? "#52525b" : "#22d3ee"}
                          />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.dropCheckSpace} />
                      )}
                    </View>
                  </View>
                ))}
                
                {/* Add drop button */}
                {!setData.completed && (
                  <TouchableOpacity 
                    style={styles.addDropButton}
                    onPress={() => addDropSet(setIndex)}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#22d3ee" />
                    <Text style={styles.addDropText}>Add Drop</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function WorkoutLogScreen() {
  const navigation = useNavigation<WorkoutLogScreenNavigationProp>();
  const route = useRoute<WorkoutLogScreenRouteProp>();
  const { day, blockName, currentWeek: passedWeek } = route.params;
  const { setActiveWorkout } = useActiveWorkout();
  
  // Calculate currentWeek - use passed week or get from storage
  const [currentWeek, setCurrentWeek] = useState<number>(passedWeek || 1);
  
  // Load current week from storage if not passed
  useEffect(() => {
    const loadCurrentWeek = async () => {
      if (!passedWeek) {
        const savedWeek = await AsyncStorage.getItem(`currentWeek_${blockName}`);
        if (savedWeek) {
          setCurrentWeek(parseInt(savedWeek));
        }
      }
    };
    loadCurrentWeek();
  }, [passedWeek, blockName]);
  
  // Initialize sets data for all exercises
  const [allSetsData, setAllSetsData] = useState<SetData[][]>([]);
  const [exerciseNotes, setExerciseNotes] = useState<ExerciseNotes>({});
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [exerciseHistory, setExerciseHistory] = useState<WorkoutHistory[]>([]);
  const [showNotes, setShowNotes] = useState<{ exerciseName: string; exerciseIndex: number } | null>(null);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [timerSettings, setTimerSettings] = useState<TimerSettings>(TimerNotifications.defaultSettings);
  const [timerMinimized, setTimerMinimized] = useState(true); // Start minimized by default
  
  // Workout session timer
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [workoutDuration, setWorkoutDuration] = useState(0); // in seconds
  const [workoutInterval, setWorkoutInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Workout start requirement state
  const [interactionAttempts, setInteractionAttempts] = useState(0);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showStartReminderModal, setShowStartReminderModal] = useState(false);
  const [shakeAnimation] = useState(new Animated.Value(0));
  
  // Workout completion state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [workoutStats, setWorkoutStats] = useState<{
    duration: string;
    totalVolume: number;
    completedSets: number;
    totalSets: number;
    exercisesCompleted: number;
    totalExercises: number;
  } | null>(null);

  // Superset linking state
  const [supersetLinks, setSupersetLinks] = useState<Set<number>>(new Set());
  
  // Rest timer state - now tracks both countdown and stopwatch separately
  const [activeTimer, setActiveTimer] = useState<{
    exerciseIndex: number;
    setIndex: number;
    timeLeft: number;
    originalDuration: number;
    isRunning: boolean;
    isQuickMode: boolean;
    completed: boolean;
    stopwatchTime?: number; // Separate stopwatch time
    countdownTime?: number; // Preserve countdown time when switching
    countdownRunning?: boolean; // Track if countdown was running
  } | null>(null);
  
  useEffect(() => {
    const initialData = day.exercises.map(exercise => {
      return Array.from({ length: exercise.sets }, (_, index) => ({
        exercise: exercise.exercise, // This will be the primary exercise name
        setNumber: index + 1,
        weight: '',
        reps: '',
        completed: false,
        selectedExerciseIndex: 0, // Start with primary exercise
        exerciseData: {}, // Initialize storage for each exercise variant
      }));
    });
    setAllSetsData(initialData);
    
    // Initialize notes from JSON if they exist
    const initialNotes: ExerciseNotes = {};
    day.exercises.forEach((exercise, index) => {
      if (exercise.notes) {
        initialNotes[index] = exercise.notes;
      }
    });
    if (Object.keys(initialNotes).length > 0) {
      setExerciseNotes(initialNotes);
    }
  }, [day]);
  
  // Timer countdown effect - handles both countdown and stopwatch
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeTimer?.isRunning) {
      interval = setInterval(() => {
        setActiveTimer(prev => {
          if (!prev) return null;
          
          // Update the appropriate timer based on current mode
          if (timerSettings.countUp) {
            // Stopwatch mode - count up (decrease timeLeft from 3600)
            return { ...prev, timeLeft: prev.timeLeft - 1 };
          } else {
            // Countdown mode
            const newTimeLeft = prev.timeLeft - 1;
            
            // Also update the background countdown if it exists
            if (prev.countdownRunning) {
              return { 
                ...prev, 
                timeLeft: newTimeLeft,
                countdownTime: newTimeLeft 
              };
            }
            
            return { ...prev, timeLeft: newTimeLeft };
          }
        });
      }, 1000);
    }
    
    // Check for countdown completion
    if (activeTimer?.timeLeft === 0 && !timerSettings.countUp && !activeTimer?.completed) {
      // Timer finished - play notification and mark as completed (only for count-down mode)
      TimerNotifications.playTimerComplete();
      setActiveTimer(prev => 
        prev ? { ...prev, isRunning: false, completed: true, countdownRunning: false } : null
      );
    }
    
    // Continue countdown in background if switching to stopwatch
    if (activeTimer?.countdownRunning && timerSettings.countUp && activeTimer.countdownTime && activeTimer.countdownTime > 0) {
      const bgInterval = setInterval(() => {
        setActiveTimer(prev => {
          if (!prev || !prev.countdownRunning) {
            clearInterval(bgInterval);
            return prev;
          }
          
          const newCountdownTime = (prev.countdownTime || 0) - 1;
          
          if (newCountdownTime <= 0) {
            // Background countdown finished
            TimerNotifications.playTimerComplete();
            clearInterval(bgInterval);
            return { ...prev, countdownTime: 0, countdownRunning: false };
          }
          
          return { ...prev, countdownTime: newCountdownTime };
        });
      }, 1000);
      
      return () => {
        clearInterval(interval);
        clearInterval(bgInterval);
      };
    }
    
    return () => clearInterval(interval);
  }, [activeTimer?.isRunning, activeTimer?.timeLeft, activeTimer?.countdownRunning, timerSettings.countUp]);
  
  const handleSetUpdate = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => {
    // Validate input - only allow numbers and decimal point for weight
    let sanitizedValue = value;
    if (field === 'weight') {
      // Allow numbers and one decimal point
      sanitizedValue = value.replace(/[^0-9.]/g, '');
      // Ensure only one decimal point
      const parts = sanitizedValue.split('.');
      if (parts.length > 2) {
        sanitizedValue = parts[0] + '.' + parts.slice(1).join('');
      }
    } else {
      // For reps, only allow whole numbers
      sanitizedValue = value.replace(/[^0-9]/g, '');
    }
    
    const newData = [...allSetsData];
    newData[exerciseIndex][setIndex][field] = sanitizedValue;
    setAllSetsData(newData);
  };

  const saveSetToHistory = async (exerciseIndex: number, setIndex: number, setData: SetData) => {
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    console.log('Saving set to history with date:', currentDate);
    
    // Use the exercise name directly from setData since it's now properly updated
    const currentExerciseName = setData.exercise;
    
    // Load existing history
    const history = await WorkoutStorage.loadWorkoutHistory();
    
    // Find existing entry for this exercise on this date
    const existingEntryIndex = history.findIndex(entry => 
      entry.exerciseName === currentExerciseName && 
      entry.date === currentDate &&
      entry.dayName === day.day_name
    );
    
    const newSet = {
      setNumber: setData.setNumber,
      weight: setData.weight,
      reps: setData.reps,
      completed: setData.completed,
      drops: setData.isDropSet && setData.drops ? setData.drops.map(drop => ({
        weight: drop.weight,
        reps: drop.reps,
        completed: drop.completed || false,
      })) : undefined,
    };
    
    if (existingEntryIndex >= 0) {
      // Update existing entry - replace or add the set
      const existingSetIndex = history[existingEntryIndex].sets.findIndex(
        set => set.setNumber === setData.setNumber
      );
      
      if (existingSetIndex >= 0) {
        // Replace existing set
        history[existingEntryIndex].sets[existingSetIndex] = newSet;
      } else {
        // Add new set to existing entry
        history[existingEntryIndex].sets.push(newSet);
        // Sort sets by set number
        history[existingEntryIndex].sets.sort((a, b) => a.setNumber - b.setNumber);
      }
    } else {
      // Create new entry
      const historyEntry: WorkoutHistory = {
        id: `${currentDate}-${currentExerciseName}-${Date.now()}`,
        routineName: `${blockName}`,
        dayName: day.day_name,
        exerciseName: currentExerciseName,
        date: currentDate,
        sets: [newSet],
      };
      history.push(historyEntry);
    }
    
    // Save updated history
    await WorkoutStorage.saveWorkoutHistory(history);
  };
  
  const handleSetComplete = async (exerciseIndex: number, setIndex: number) => {
    const newData = [...allSetsData];
    const wasCompleted = newData[exerciseIndex][setIndex].completed;
    newData[exerciseIndex][setIndex].completed = !wasCompleted;
    setAllSetsData(newData);
    
    // Don't save to history here - it will be saved when workout is finished
    // This prevents duplicate entries
    
    // Start rest timer when completing a set (not when uncompleting)
    const isLinkedToNext = supersetLinks.has(exerciseIndex);
    const isLinkedToPrev = supersetLinks.has(exerciseIndex - 1);
    
    if (!wasCompleted && setIndex < day.exercises[exerciseIndex].sets - 1) {
      if (isLinkedToNext) {
        // First exercise in superset - 3 second transition timer
        const initialTimeLeft = timerSettings.countUp ? 3600 : 3;
        const originalDuration = timerSettings.countUp ? 0 : 3;
        
        setActiveTimer({
          exerciseIndex,
          setIndex: setIndex + 1, // Next set
          timeLeft: initialTimeLeft,
          originalDuration: originalDuration,
          isRunning: true,
          isQuickMode: false,
          completed: false,
        });
      } else if (!isLinkedToNext || isLinkedToPrev) {
        // Regular exercise or last exercise in superset - normal rest
        const exercise = day.exercises[exerciseIndex];
        const optimalRest = exercise.rest || 120;
        const quickRest = exercise.restQuick || Math.max(60, Math.floor(optimalRest * 0.6));
        
        // For count-up mode (stopwatch), start with a large timeLeft value
        const initialTimeLeft = timerSettings.countUp ? 3600 : optimalRest; // 1 hour max for stopwatch
        const originalDuration = timerSettings.countUp ? 0 : optimalRest; // Stopwatch starts from 0
        
        setActiveTimer({
          exerciseIndex,
          setIndex: setIndex + 1, // Next set
          timeLeft: initialTimeLeft,
          originalDuration: originalDuration,
          isRunning: true,
          isQuickMode: false,
          completed: false,
        });
      }
      // Keep timer minimized by default
      // setTimerMinimized(false); // Removed - keep it minimized
    }
  };
  
  const handleTimerToggle = () => {
    setActiveTimer(prev => 
      prev ? { ...prev, isRunning: !prev.isRunning } : null
    );
  };
  
  const handleTimerModeSwitch = () => {
    if (!activeTimer) return;
    
    // Don't allow mode switching in count-up (stopwatch) mode
    if (timerSettings.countUp) return;
    
    const exercise = day.exercises[activeTimer.exerciseIndex];
    const optimalRest = exercise.rest || 120;
    const quickRest = exercise.restQuick || Math.max(60, Math.floor(optimalRest * 0.6));
    
    setActiveTimer(prev => 
      prev ? {
        ...prev,
        isQuickMode: !prev.isQuickMode,
        timeLeft: !prev.isQuickMode ? quickRest : optimalRest,
        originalDuration: !prev.isQuickMode ? quickRest : optimalRest,
        completed: false,
      } : null
    );
  };
  
  const handleTimerStop = () => {
    setTimerMinimized(true);
    setShowTimerSettings(false);
  };
  
  const handleDropSetComplete = async (exerciseIndex: number, setIndex: number, dropIndex: number) => {
    const newData = [...allSetsData];
    if (newData[exerciseIndex][setIndex].drops && newData[exerciseIndex][setIndex].drops[dropIndex]) {
      const wasCompleted = newData[exerciseIndex][setIndex].drops[dropIndex].completed;
      newData[exerciseIndex][setIndex].drops[dropIndex].completed = !wasCompleted;
      setAllSetsData(newData);
      
      // No rest timer for drop sets - they're done immediately one after another
      // Just save progress
      await saveProgress();
    }
  };

  const getDisplayTime = (timer: typeof activeTimer) => {
    if (!timer) return { minutes: 0, seconds: 0, isOvertime: false };
    
    const displayTime = timerSettings.countUp 
      ? 3600 - timer.timeLeft  // For stopwatch: starts at 3600, counts down internally, display shows elapsed time
      : timer.timeLeft;
    
    return {
      minutes: Math.floor(Math.abs(displayTime) / 60),
      seconds: Math.abs(displayTime) % 60,
      isOvertime: false  // No overtime concept for stopwatch
    };
  };
  
  const handleExerciseSelect = (exerciseIndex: number, selectedExerciseIndex: number) => {
    const newData = [...allSetsData];
    const currentSelection = newData[exerciseIndex][0].selectedExerciseIndex;
    
    // Only update if selection actually changed
    if (currentSelection !== selectedExerciseIndex) {
      const exercise = day.exercises[exerciseIndex];
      const allExercises = [exercise.exercise, ...(exercise.alternatives || [])];
      const newExerciseName = allExercises[selectedExerciseIndex] || exercise.exercise;
      
      // Update exercise selection for all sets of this exercise
      for (let i = 0; i < newData[exerciseIndex].length; i++) {
        const setData = newData[exerciseIndex][i];
        
        // Save current data before switching
        if (!setData.exerciseData) {
          setData.exerciseData = {};
        }
        setData.exerciseData[currentSelection] = {
          weight: setData.weight,
          reps: setData.reps,
          completed: setData.completed,
          isDropSet: setData.isDropSet,
          drops: setData.drops ? [...setData.drops] : undefined, // Deep copy drops
        };
        
        // Update to new exercise
        setData.selectedExerciseIndex = selectedExerciseIndex;
        setData.exercise = newExerciseName;
        
        // Restore previous data for this exercise if it exists
        if (setData.exerciseData[selectedExerciseIndex]) {
          setData.weight = setData.exerciseData[selectedExerciseIndex].weight;
          setData.reps = setData.exerciseData[selectedExerciseIndex].reps;
          setData.completed = setData.exerciseData[selectedExerciseIndex].completed;
          setData.isDropSet = setData.exerciseData[selectedExerciseIndex].isDropSet;
          setData.drops = setData.exerciseData[selectedExerciseIndex].drops ? [...setData.exerciseData[selectedExerciseIndex].drops] : undefined;
        } else {
          // First time selecting this exercise - start fresh
          setData.weight = '';
          setData.reps = '';
          setData.completed = false;
          setData.isDropSet = false;
          setData.drops = undefined;
        }
      }
      
      setAllSetsData(newData);
    }
  };
  
  const shakeStartButton = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleInteractionAttempt = () => {
    console.log('Interaction attempt - workout started:', !!workoutStartTime);
    if (workoutStartTime) return; // Already started, allow interaction
    
    const newAttempts = interactionAttempts + 1;
    setInteractionAttempts(newAttempts);
    console.log('Attempt count:', newAttempts);
    
    if (newAttempts >= 3) {
      console.log('Showing reminder modal');
      setShowStartReminderModal(true);
      setInteractionAttempts(0); // Reset counter
    } else {
      console.log('Shaking start button');
      shakeStartButton();
    }
  };

  const handleStartWorkout = () => {
    setShowStartModal(true);
  };

  const confirmStartWorkout = () => {
    setShowStartModal(false);
    const now = new Date();
    setWorkoutStartTime(now);
    setWorkoutDuration(0);
    setInteractionAttempts(0); // Reset attempts
    
    // Start the workout timer
    const interval = setInterval(() => {
      setWorkoutDuration(prev => prev + 1);
    }, 1000);
    setWorkoutInterval(interval);
    
    // Context will be updated by useEffect below
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateWorkoutStats = () => {
    let totalVolume = 0;
    let completedSets = 0;
    let totalSets = 0;
    let exercisesCompleted = 0;
    
    allSetsData.forEach((exerciseSets, exerciseIndex) => {
      let exerciseHasCompletedSets = false;
      
      exerciseSets.forEach(setData => {
        totalSets++;
        if (setData.completed && setData.weight && setData.reps) {
          completedSets++;
          exerciseHasCompletedSets = true;
          // Calculate volume: weight × reps
          const weight = parseFloat(setData.weight) || 0;
          const reps = parseInt(setData.reps) || 0;
          totalVolume += weight * reps;
          
          // Add drop sets to volume calculation (only completed ones)
          if (setData.isDropSet && setData.drops) {
            setData.drops.forEach(drop => {
              if (drop.completed && drop.weight && drop.reps) {
                const dropWeight = parseFloat(drop.weight) || 0;
                const dropReps = parseInt(drop.reps) || 0;
                totalVolume += dropWeight * dropReps;
              }
            });
          }
        }
      });
      
      if (exerciseHasCompletedSets) {
        exercisesCompleted++;
      }
    });
    
    const duration = formatDuration(workoutDuration);
    
    return {
      duration,
      totalVolume: Math.round(totalVolume * 10) / 10, // Round to 1 decimal
      completedSets,
      totalSets,
      exercisesCompleted,
      totalExercises: day.exercises.length
    };
  };
  
  const handleFinishWorkout = () => {
    const stats = calculateWorkoutStats();
    setWorkoutStats(stats);
    setShowCompletionModal(true);
  };
  
  const confirmFinishWorkout = async () => {
    try {
      console.log('Starting confirmFinishWorkout...');
      console.log('blockName:', blockName);
      console.log('day.day_name:', day.day_name);
      
      // Clear workout timer
      if (workoutInterval) {
        clearInterval(workoutInterval);
        setWorkoutInterval(null);
      }
      
      // Clear active workout from context
      setActiveWorkout(null);
      
      // Save completion stats for the DaysScreen
      const stats = calculateWorkoutStats();
      console.log('Calculated stats:', stats);
      
      const weekString = currentWeek.toString();
      const workoutKey = `${day.day_name}_week${weekString}`;
      console.log('Saving for workoutKey:', workoutKey, 'blockName:', blockName, 'currentWeek:', weekString);
      
      // Save that this workout is completed
      const completedKey = `completed_${blockName}_week${weekString}`;
      const completed = await AsyncStorage.getItem(completedKey);
      const completedSet = completed ? new Set(JSON.parse(completed)) : new Set();
      completedSet.add(workoutKey);
      await AsyncStorage.setItem(completedKey, JSON.stringify(Array.from(completedSet)));
      console.log('Saved completed workouts:', Array.from(completedSet));
      
      // Save the completion stats
      const statsKey = `completionStats_${blockName}_week${weekString}`;
      const existingStats = await AsyncStorage.getItem(statsKey);
      const statsMap = existingStats ? new Map(JSON.parse(existingStats)) : new Map();
      statsMap.set(workoutKey, {
        duration: Math.round(workoutDuration / 60), // Convert to minutes
        totalVolume: stats.totalVolume,
        date: new Date().toISOString(),
      });
      await AsyncStorage.setItem(statsKey, JSON.stringify(Array.from(statsMap)));
      console.log('Saved completion stats for key:', statsKey);
      
      await saveWorkoutToHistory();
      await WorkoutStorage.clearCurrentWorkout(day.day_name, blockName); // Clear any saved progress
      
      console.log('Navigation back to DaysScreen...');
      navigation.goBack();
    } catch (error) {
      console.error('Error in confirmFinishWorkout:', error);
      console.error('Error stack:', error.stack);
    }
  };

  const saveWorkoutToHistory = async () => {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    console.log('Saving workout to history with date:', currentDate);
    console.log('Current time details:', {
      fullDate: now,
      iso: now.toISOString(),
      dateString: now.toDateString(),
      localDate: now.toLocaleDateString()
    });
    
    // Save each exercise's completed sets to history
    for (let exerciseIndex = 0; exerciseIndex < day.exercises.length; exerciseIndex++) {
      const exercise = day.exercises[exerciseIndex];
      const setsData = allSetsData[exerciseIndex] || [];
      const completedSets = setsData.filter(set => set.completed);
      
      if (completedSets.length > 0) {
        console.log(`Saving exercise ${exercise.exercise} with ${completedSets.length} completed sets`);
        // Get the current exercise name (primary or alternative)
        const allExercises = [exercise.exercise, ...(exercise.alternatives || [])];
        const selectedIndex = setsData[0]?.selectedExerciseIndex || 0;
        const currentExerciseName = allExercises[selectedIndex] || exercise.exercise;
        
        const historyEntry: WorkoutHistory = {
          id: `${currentDate}-${exerciseIndex}-${Date.now()}`,
          routineName: `${blockName}`,
          dayName: day.day_name,
          exerciseName: currentExerciseName,
          date: currentDate,
          sets: completedSets.map(set => ({
            setNumber: set.setNumber,
            weight: set.weight,
            reps: set.reps,
            completed: set.completed,
          })),
        };
        
        console.log('Saving workout entry with date:', currentDate, 'for exercise:', currentExerciseName);
        await WorkoutStorage.addWorkoutEntry(historyEntry);
      } else {
        console.log(`Skipping exercise ${exercise.exercise} - no completed sets`);
      }
    }
  };
  
  const handleBack = () => {
    navigation.goBack();
  };

  const handleHistoryPress = async (exerciseName: string) => {
    const history = await WorkoutStorage.getExerciseHistory(exerciseName);
    setExerciseHistory(history);
    setShowHistory(exerciseName);
  };

  const handleNotesPress = (exerciseIndex: number, exerciseName: string) => {
    setShowNotes({ exerciseName, exerciseIndex });
  };

  const handleNotesUpdate = (exerciseIndex: number, notes: string) => {
    setExerciseNotes(prev => ({
      ...prev,
      [exerciseIndex]: notes
    }));
  };

  const toggleSupersetLink = (exerciseIndex: number) => {
    setSupersetLinks(prev => {
      const newLinks = new Set(prev);
      if (newLinks.has(exerciseIndex)) {
        newLinks.delete(exerciseIndex);
      } else {
        newLinks.add(exerciseIndex);
      }
      return newLinks;
    });
  };

  // Auto-save workout progress
  const saveWorkoutProgress = async () => {
    const progressData = {
      day,
      blockName,
      allSetsData,
      exerciseNotes,
      workoutStartTime,
      workoutDuration,
      timestamp: Date.now(),
    };
    await WorkoutStorage.saveCurrentWorkout(progressData);
  };

  // Auto-save when sets data, notes, or workout state changes
  useEffect(() => {
    if (allSetsData.length > 0) {
      saveWorkoutProgress();
    }
  }, [allSetsData, exerciseNotes, workoutStartTime, workoutDuration]);

  // Cleanup workout timer on unmount
  useEffect(() => {
    return () => {
      if (workoutInterval) {
        clearInterval(workoutInterval);
      }
    };
  }, [workoutInterval]);

  // Load saved progress and timer settings on mount
  useEffect(() => {
    const loadSavedData = async () => {
      // Load workout progress
      const savedWorkout = await WorkoutStorage.loadCurrentWorkout(day.day_name, blockName);
      if (savedWorkout && 
          savedWorkout.day?.day_name === day.day_name && 
          savedWorkout.blockName === blockName) {
        setAllSetsData(savedWorkout.allSetsData);
        if (savedWorkout.exerciseNotes) {
          setExerciseNotes(savedWorkout.exerciseNotes);
        }
        
        // Restore workout timer state if it was active
        if (savedWorkout.workoutStartTime) {
          const startTime = new Date(savedWorkout.workoutStartTime);
          setWorkoutStartTime(startTime);
          
          // Calculate elapsed time since the workout was saved
          const now = Date.now();
          const savedAt = savedWorkout.savedAt || now;
          const elapsedSinceSave = Math.floor((now - savedAt) / 1000);
          const totalElapsed = savedWorkout.workoutDuration + elapsedSinceSave;
          setWorkoutDuration(totalElapsed);
          
          // Start the timer again
          const interval = setInterval(() => {
            setWorkoutDuration(prev => {
              const newDuration = prev + 1;
              // Duration updates will be handled by the effect below
              return newDuration;
            });
          }, 1000);
          setWorkoutInterval(interval);
          
          // Context will be updated by useEffect below
        }
      }
      
      // Load timer settings
      const settings = await TimerNotifications.loadSettings();
      setTimerSettings(settings);
    };
    
    loadSavedData();
  }, []);

  // Clear stale active workout on mount if no workout is started
  useEffect(() => {
    if (!workoutStartTime) {
      console.log('Clearing any stale active workout');
      setActiveWorkout(null);
    }
  }, []);

  // Update active workout context when workout timer state changes
  useEffect(() => {
    if (workoutStartTime) {
      setActiveWorkout({
        dayName: day.day_name,
        blockName,
        duration: workoutDuration,
        routeParams: { day, blockName, currentWeek }
      });
    }
    // Don't clear the active workout when workoutStartTime is null
    // Only clear it when explicitly finishing the workout
  }, [workoutStartTime, workoutDuration, day.day_name, blockName]);
  
  // History view for a specific exercise
  if (showHistory) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setShowHistory(null)}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>{showHistory} History</Text>
          <View style={styles.finishButton} />
        </View>
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>Previous Workouts</Text>
            
            {exerciseHistory.length === 0 ? (
              <View style={styles.emptyHistoryState}>
                <Text style={styles.emptyHistoryText}>No previous workouts</Text>
                <Text style={styles.emptyHistorySubtext}>
                  Your workout history will appear here after you complete sets
                </Text>
              </View>
            ) : (
              exerciseHistory.map((workout, index) => (
                <View key={workout.id} style={styles.historyWorkout}>
                  <Text style={styles.historyDate}>
                    {new Date(workout.date).toLocaleDateString()} • {workout.dayName}
                  </Text>
                  {workout.sets.map((set, setIndex) => (
                    <View key={setIndex}>
                      <View style={styles.historySet}>
                        <Text style={styles.historySetNumber}>
                          {set.setNumber}
                        </Text>
                        <Text style={styles.historySetData}>
                          {set.weight}kg × {set.reps}
                          {set.drops && set.drops.length > 0 && (
                            <Text style={styles.dropIndicator}> + {set.drops.length} drops</Text>
                          )}
                        </Text>
                      </View>
                      {set.drops && set.drops.length > 0 && (
                        <View style={styles.historyDropSets}>
                          {set.drops.map((drop, dropIndex) => (
                            <View key={dropIndex} style={styles.historyDropSet}>
                              <Text style={styles.historyDropLabel}>
                                Drop {dropIndex + 1}
                              </Text>
                              <Text style={styles.historyDropData}>
                                {drop.weight}kg × {drop.reps}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
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

  // Notes view for a specific exercise
  if (showNotes) {
    const exerciseIndex = showNotes.exerciseIndex;
    const exercise = day.exercises[exerciseIndex];
    const targetReps = exercise.reps;
    const targetSets = exercise.sets;
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setShowNotes(null)}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>{showNotes.exerciseName}</Text>
          <View style={styles.finishButton} />
        </View>
        
        <KeyboardAvoidingView 
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.notesModalContainer}>
              {/* Rep Scheme Section */}
              <View style={styles.repSchemeCard}>
                <Text style={styles.repSchemeLabel}>Target Rep Scheme</Text>
                <View style={styles.repSchemeInfo}>
                  {(() => {
                    const scheme = parseRepScheme(targetReps);
                    
                    if (scheme.type === 'weekly') {
                      return (
                        <View style={styles.weeklyScheme}>
                          {scheme.values.map((reps, index) => (
                            <View key={index} style={styles.weekBlock}>
                              <Text style={styles.weekLabel}>Week {index + 1}</Text>
                              <Text style={styles.weekReps}>{reps}</Text>
                            </View>
                          ))}
                        </View>
                      );
                    } else if (scheme.type === 'pyramid') {
                      return (
                        <View style={styles.pyramidScheme}>
                          {scheme.values.map((reps, index) => (
                            <View key={index} style={styles.setBlock}>
                              <Text style={styles.setLabel}>Set {index + 1}</Text>
                              <Text style={styles.setReps}>{reps}</Text>
                            </View>
                          ))}
                        </View>
                      );
                    } else {
                      return (
                        <View style={styles.straightScheme}>
                          <Text style={styles.repSchemeText}>{targetReps}</Text>
                          <View style={styles.repeatIndicator}>
                            <Ionicons name="repeat" size={16} color="#71717a" />
                            <Text style={styles.repeatText}>× {targetSets} sets</Text>
                          </View>
                        </View>
                      );
                    }
                  })()}
                  {exercise.notes && (
                    <Text style={styles.repSchemeNotes}>{exercise.notes}</Text>
                  )}
                </View>
              </View>

              {/* User Notes Section */}
              <Text style={styles.notesModalLabel}>Personal Notes</Text>
              <TextInput
                style={styles.notesModalInput}
                value={exerciseNotes[exerciseIndex] || ''}
                onChangeText={(text) => handleNotesUpdate(exerciseIndex, text)}
                placeholder="e.g., Week 1: used 50kg, felt easy\nWeek 2: increase to 55kg\nFocus on slow negatives"
                placeholderTextColor="#52525b"
                multiline
                autoFocus
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{day.day_name}</Text>
          {workoutStartTime && (
            <Text style={styles.workoutDuration}>{formatDuration(workoutDuration)}</Text>
          )}
        </View>
        <Animated.View style={{ transform: [{ translateX: shakeAnimation }] }}>
          <TouchableOpacity 
            style={styles.finishButton}
            onPress={workoutStartTime ? handleFinishWorkout : handleStartWorkout}
            activeOpacity={0.7}
          >
            <Text style={styles.finishButtonText}>
              {workoutStartTime ? 'Finish' : 'Start'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
      
      <KeyboardAvoidingView 
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {day.exercises.map((exercise: Exercise, index: number) => (
            <React.Fragment key={index}>
              <ExerciseCard
                exercise={exercise}
                exerciseIndex={index}
                currentWeek={currentWeek}
                setsData={allSetsData[index] || []}
                notes={exerciseNotes[index] || ''}
                workoutStarted={!!workoutStartTime}
                onSetUpdate={handleSetUpdate}
                onSetComplete={handleSetComplete}
                onDropSetComplete={handleDropSetComplete}
                onHistoryPress={handleHistoryPress}
                onExerciseSelect={handleExerciseSelect}
                onNotesPress={handleNotesPress}
                onInteractionAttempt={handleInteractionAttempt}
                isLinkedToNext={supersetLinks.has(index)}
                isLinkedToPrev={supersetLinks.has(index - 1)}
              />
              
              {/* Superset linking button between exercises */}
              {index < day.exercises.length - 1 && (
                <View style={styles.supersetLinkContainer}>
                  <TouchableOpacity
                    style={[
                      styles.supersetLinkButton,
                      supersetLinks.has(index) && styles.supersetLinkButtonActive
                    ]}
                    onPress={() => toggleSupersetLink(index)}
                  >
                    <Ionicons 
                      name={supersetLinks.has(index) ? "link" : "add"} 
                      size={16} 
                      color={supersetLinks.has(index) ? "#22d3ee" : "#71717a"} 
                    />
                  </TouchableOpacity>
                  {supersetLinks.has(index) && (
                    <Text style={styles.supersetLabel}>SUPERSET</Text>
                  )}
                </View>
              )}
            </React.Fragment>
          ))}
          
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
      
      {activeTimer && !timerMinimized && (
        <View style={styles.timerOverlay}>
          <View style={styles.timerCard}>
            {/* Header */}
            <View style={styles.timerHeader}>
              <Text style={styles.timerTitle}>Rest Timer</Text>
              <View style={styles.timerHeaderButtons}>
                <TouchableOpacity 
                  onPress={() => setShowTimerSettings(!showTimerSettings)}
                  style={styles.timerIconButton}
                >
                  <Ionicons name="settings-outline" size={20} color="#71717a" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleTimerStop}
                  style={styles.timerIconButton}
                >
                  <Ionicons name="remove" size={20} color="#71717a" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Timer Display or Settings */}
            {showTimerSettings ? (
              <ScrollView style={styles.settingsScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.settingsContainer}>
                  <Text style={styles.settingsTitle}>Notifications</Text>
                  
                  {/* Sound Toggle */}
                  <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>Sound</Text>
                    <TouchableOpacity
                      style={[styles.toggle, timerSettings.soundEnabled && styles.toggleOn]}
                      onPress={async () => {
                        const newSettings = { ...timerSettings, soundEnabled: !timerSettings.soundEnabled };
                        setTimerSettings(newSettings);
                        await TimerNotifications.saveSettings(newSettings);
                      }}
                    >
                      <View style={[styles.toggleKnob, timerSettings.soundEnabled && styles.toggleKnobOn]} />
                    </TouchableOpacity>
                  </View>

                  {/* Sound Options */}
                  {timerSettings.soundEnabled && (
                    <View style={styles.optionsGrid}>
                      {SOUND_OPTIONS.map((option) => (
                        <TouchableOpacity
                          key={option.id}
                          style={[styles.optionButton, timerSettings.selectedSound === option.id && styles.optionSelected]}
                          onPress={async () => {
                            const newSettings = { ...timerSettings, selectedSound: option.id };
                            setTimerSettings(newSettings);
                            await TimerNotifications.saveSettings(newSettings);
                          }}
                          onLongPress={async () => {
                            await TimerNotifications.playSound(option.id, timerSettings.volume);
                          }}
                        >
                          <Text style={[styles.optionText, timerSettings.selectedSound === option.id && styles.optionTextSelected]}>
                            {option.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Haptic Toggle */}
                  <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>Haptic</Text>
                    <TouchableOpacity
                      style={[styles.toggle, timerSettings.hapticEnabled && styles.toggleOn]}
                      onPress={async () => {
                        const newSettings = { ...timerSettings, hapticEnabled: !timerSettings.hapticEnabled };
                        setTimerSettings(newSettings);
                        await TimerNotifications.saveSettings(newSettings);
                      }}
                    >
                      <View style={[styles.toggleKnob, timerSettings.hapticEnabled && styles.toggleKnobOn]} />
                    </TouchableOpacity>
                  </View>

                  {/* Haptic Options */}
                  {timerSettings.hapticEnabled && (
                    <View style={styles.optionsGrid}>
                      {['light', 'medium', 'heavy'].map((pattern) => (
                        <TouchableOpacity
                          key={pattern}
                          style={[styles.optionButton, timerSettings.hapticPattern === pattern && styles.optionSelected]}
                          onPress={async () => {
                            const newSettings = { ...timerSettings, hapticPattern: pattern as any };
                            setTimerSettings(newSettings);
                            await TimerNotifications.saveSettings(newSettings);
                          }}
                          onLongPress={async () => {
                            await TimerNotifications.triggerHaptic(pattern as any);
                          }}
                        >
                          <Text style={[styles.optionText, timerSettings.hapticPattern === pattern && styles.optionTextSelected]}>
                            {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>
            ) : activeTimer.completed ? (
              <View style={styles.timerDisplay}>
                {/* Timer Completed Screen */}
                <Ionicons name="checkmark-circle" size={72} color="#22d3ee" />
                <Text style={styles.completedTitle}>Rest Complete!</Text>
                <Text style={styles.completedSubtitle}>Ready for your next set</Text>
                
                {/* Completion Actions */}
                <View style={styles.completionActions}>
                  <TouchableOpacity 
                    style={styles.completionButton}
                    onPress={() => {
                      // Reset and start a new timer
                      const exercise = day.exercises[activeTimer.exerciseIndex];
                      const optimalRest = exercise.rest || 120;
                      const quickRest = exercise.restQuick || Math.max(60, Math.floor(optimalRest * 0.6));
                      const resetTime = activeTimer.isQuickMode ? quickRest : optimalRest;
                      
                      setActiveTimer(prev => prev ? {
                        ...prev,
                        timeLeft: resetTime,
                        originalDuration: resetTime,
                        isRunning: true,
                        completed: false
                      } : null);
                    }}
                  >
                    <Ionicons name="refresh" size={16} color="#0a0a0b" />
                    <Text style={styles.completionButtonText}>Rest Again</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.dismissButton}
                    onPress={() => setTimerMinimized(true)}
                  >
                    <Text style={styles.dismissButtonText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.timerDisplay}>
                {/* Timer Countdown - Main Focus */}
                <View style={styles.timerMainDisplay}>
                  <View style={styles.timerRow}>
                    {!timerSettings.countUp && (
                      <TouchableOpacity 
                        style={styles.mainTimeAdjustButton}
                        onPress={() => {
                          setActiveTimer(prev => prev ? {
                            ...prev,
                            timeLeft: Math.max(0, prev.timeLeft - 15)
                          } : null);
                        }}
                      >
                        <Text style={styles.mainTimeAdjustText}>-15</Text>
                      </TouchableOpacity>
                    )}
                    
                    <View style={styles.timerCenterDisplay}>
                      <Text style={styles.timerCountdown}>
                        {getDisplayTime(activeTimer).minutes}:{getDisplayTime(activeTimer).seconds.toString().padStart(2, '0')}
                      </Text>
                      <Text style={styles.timerMode}>
                        {timerSettings.countUp ? 'Stopwatch' : `${activeTimer.isQuickMode ? 'Quick' : 'Optimal'} Rest`}
                      </Text>
                    </View>
                    
                    {!timerSettings.countUp && (
                      <TouchableOpacity 
                        style={styles.mainTimeAdjustButton}
                        onPress={() => {
                          setActiveTimer(prev => prev ? {
                            ...prev,
                            timeLeft: prev.timeLeft + 15
                          } : null);
                        }}
                      >
                        <Text style={styles.mainTimeAdjustText}>+15</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Primary Action - Play/Pause Button */}
                <TouchableOpacity 
                  style={styles.primaryActionButton}
                  onPress={handleTimerToggle}
                >
                  <Ionicons name={activeTimer.isRunning ? "pause" : "play"} size={28} color="#0a0a0b" />
                </TouchableOpacity>

                {/* Secondary Controls Row */}
                <View style={styles.secondaryControls}>
                  <TouchableOpacity 
                    style={styles.secondaryButton}
                    onPress={() => {
                      if (!activeTimer) return;
                      
                      if (timerSettings.countUp) {
                        // Reset stopwatch to 0:00
                        setActiveTimer(prev => prev ? {
                          ...prev,
                          timeLeft: 3600,
                          isRunning: false,
                          completed: false
                        } : null);
                      } else {
                        // Reset countdown to original time
                        const exercise = day.exercises[activeTimer.exerciseIndex];
                        const optimalRest = exercise.rest || 120;
                        const quickRest = exercise.restQuick || Math.max(60, Math.floor(optimalRest * 0.6));
                        const resetTime = activeTimer.isQuickMode ? quickRest : optimalRest;
                        
                        setActiveTimer(prev => prev ? {
                          ...prev,
                          timeLeft: resetTime,
                          originalDuration: resetTime,
                          isRunning: false,
                          completed: false
                        } : null);
                      }
                    }}
                  >
                    <Ionicons name="refresh" size={18} color="#71717a" />
                    <Text style={styles.secondaryButtonText}>Reset</Text>
                  </TouchableOpacity>

                  {!timerSettings.countUp && (
                    <TouchableOpacity 
                      style={styles.secondaryButton}
                      onPress={handleTimerModeSwitch}
                    >
                      <Ionicons name={activeTimer.isQuickMode ? "flash" : "fitness"} size={18} color="#71717a" />
                      <Text style={styles.secondaryButtonText}>{activeTimer.isQuickMode ? 'Quick' : 'Optimal'}</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity 
                    style={styles.secondaryButton}
                    onPress={async () => {
                      const newSettings = { ...timerSettings, countUp: !timerSettings.countUp };
                      setTimerSettings(newSettings);
                      await TimerNotifications.saveSettings(newSettings);
                      
                      // Preserve countdown state when switching modes
                      if (activeTimer) {
                        if (newSettings.countUp) {
                          // Switching TO stopwatch - preserve countdown state
                          setActiveTimer(prev => prev ? {
                            ...prev,
                            countdownTime: prev.timeLeft, // Save current countdown time
                            countdownRunning: prev.isRunning, // Save if it was running
                            timeLeft: prev.stopwatchTime || 3600, // Use saved stopwatch time or start fresh
                            originalDuration: 0,
                            isRunning: false, // Start stopwatch paused
                            completed: false
                          } : null);
                        } else {
                          // Switching TO countdown - restore countdown state
                          setActiveTimer(prev => prev ? {
                            ...prev,
                            stopwatchTime: prev.timeLeft, // Save current stopwatch time
                            timeLeft: prev.countdownTime || prev.originalDuration, // Restore countdown time
                            isRunning: prev.countdownRunning || false, // Restore running state
                            completed: false
                          } : null);
                        }
                      }
                    }}
                  >
                    <Ionicons name={timerSettings.countUp ? "arrow-up" : "arrow-down"} size={18} color="#71717a" />
                    <Text style={styles.secondaryButtonText}>{timerSettings.countUp ? 'Count Up' : 'Count Down'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Minimized Timer or Start Timer Button */}
      {activeTimer && timerMinimized ? (
        <TouchableOpacity 
          style={styles.minimizedTimer}
          onPress={() => setTimerMinimized(false)}
        >
          <Text style={styles.minimizedTimerText}>
            {getDisplayTime(activeTimer).minutes}:{getDisplayTime(activeTimer).seconds.toString().padStart(2, '0')}
          </Text>
        </TouchableOpacity>
      ) : !activeTimer ? (
        <TouchableOpacity 
          style={styles.startTimerButton}
          onPress={() => {
            // Start a manual timer
            const defaultRest = 120; // Default 2 minutes
            setActiveTimer({
              exerciseIndex: 0,
              setIndex: 0,
              timeLeft: timerSettings.countUp ? 3600 : defaultRest,
              originalDuration: timerSettings.countUp ? 0 : defaultRest,
              isRunning: false,
              isQuickMode: false,
              completed: false,
            });
            setTimerMinimized(false); // Open full screen instead of minimized
          }}
        >
          <Ionicons name="timer-outline" size={20} color="#22d3ee" />
          <Text style={styles.startTimerText}>Start Timer</Text>
        </TouchableOpacity>
      ) : null}

      {/* Start Workout Confirmation Modal */}
      <Modal
        visible={showStartModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStartModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <Ionicons name="play-circle" size={48} color="#22d3ee" />
            <Text style={styles.confirmModalTitle}>Begin Workout?</Text>
            <Text style={styles.confirmModalMessage}>
              Start "{day.day_name}" workout session?
            </Text>
            
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalCancelButton]}
                onPress={() => setShowStartModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalConfirmButton]}
                onPress={confirmStartWorkout}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmModalConfirmText}>Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Start Reminder Modal */}
      <Modal
        visible={showStartReminderModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStartReminderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reminderModalContainer}>
            <Ionicons name="information-circle" size={48} color="#22d3ee" />
            <Text style={styles.reminderModalTitle}>Start Your Workout</Text>
            <Text style={styles.reminderModalMessage}>
              Please tap "Start" to begin your workout session before logging exercises.
            </Text>
            
            <TouchableOpacity
              style={styles.reminderModalButton}
              onPress={() => setShowStartReminderModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.reminderModalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Workout Completion Summary Modal */}
      <Modal
        visible={showCompletionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.completionModalContainer}>
            <View style={styles.completionIconContainer}>
              <Ionicons name="fitness" size={32} color="#22d3ee" />
            </View>
            <Text style={styles.completionModalTitle}>Session Complete</Text>
            <Text style={styles.completionModalSubtitle}>{day.day_name}</Text>
            
            {workoutStats && (
              <View style={styles.summaryContainer}>
                <View style={styles.durationContainer}>
                  <Text style={styles.durationLabel}>Session Duration</Text>
                  <Text style={styles.durationValue}>{workoutStats.duration}</Text>
                </View>
                
                <View style={styles.volumeCard}>
                  <Text style={styles.volumeLabel}>Total Volume</Text>
                  <Text style={styles.volumeValue}>{workoutStats.totalVolume}</Text>
                  <Text style={styles.volumeUnit}>kg</Text>
                </View>
              </View>
            )}
            
            <View style={styles.completionModalButtons}>
              <TouchableOpacity
                style={[styles.completionModalButton, styles.completionModalContinueButton]}
                onPress={() => setShowCompletionModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.completionModalContinueText}>Continue Session</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.completionModalButton, styles.completionModalFinishButton]}
                onPress={() => {
                  setShowCompletionModal(false);
                  confirmFinishWorkout();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.completionModalFinishText}>Save & Exit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  workoutDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22d3ee',
    marginTop: 2,
  },
  finishButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22d3ee',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  exerciseCard: {
    backgroundColor: '#18181b',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  dropdownIcon: {
    marginLeft: 8,
  },
  exerciseSelector: {
    backgroundColor: '#27272a',
    borderRadius: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  exerciseOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3f3f46',
  },
  exerciseOptionSelected: {
    backgroundColor: '#22d3ee20',
  },
  exerciseOptionLast: {
    borderBottomWidth: 0,
  },
  exerciseOptionTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  primaryIcon: {
    marginRight: 8,
  },
  exerciseOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    flex: 1,
  },
  exerciseOptionTextSelected: {
    color: '#22d3ee',
    fontWeight: '600',
  },
  historyButton: {
    padding: 4,
    marginLeft: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesModalContainer: {
    flex: 1,
  },
  repSchemeCard: {
    backgroundColor: '#18181b',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    marginBottom: 24,
  },
  repSchemeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717a',
    marginBottom: 8,
  },
  repSchemeInfo: {
    gap: 8,
  },
  repSchemeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#22d3ee',
  },
  repSchemeNotes: {
    fontSize: 14,
    color: '#a1a1aa',
    fontStyle: 'italic',
    marginTop: 4,
  },
  weeklyScheme: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  weekBlock: {
    backgroundColor: '#0a0a0b',
    borderRadius: 8,
    padding: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  weekLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717a',
    marginBottom: 4,
  },
  weekReps: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22d3ee',
  },
  pyramidScheme: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  setBlock: {
    backgroundColor: '#0a0a0b',
    borderRadius: 8,
    padding: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  setLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717a',
    marginBottom: 4,
  },
  setReps: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22d3ee',
  },
  straightScheme: {
    alignItems: 'center',
  },
  repeatIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  repeatText: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
  },
  notesModalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
    marginBottom: 8,
  },
  notesModalHint: {
    fontSize: 14,
    color: '#52525b',
    marginBottom: 16,
  },
  notesModalInput: {
    backgroundColor: '#18181b',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    minHeight: 200,
  },
  setsContainer: {
    marginTop: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 4,
    borderRadius: 4,
    backgroundColor: '#0a0a0b',
  },
  setRowCompleted: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#22c55e20',
  },
  setNumber: {
    width: 24,
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#27272a',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
  },
  weightInput: {
    width: 70,
    marginLeft: 12,
  },
  repsInput: {
    width: 50,
  },
  inputDisabled: {
    opacity: 0.5,
    backgroundColor: '#18181b',
  },
  separator: {
    fontSize: 16,
    color: '#52525b',
    marginHorizontal: 8,
  },
  checkButton: {
    marginLeft: 12,
    padding: 4,
  },
  checkButtonCompleted: {
    opacity: 0.8,
  },
  checkButtonDisabled: {
    opacity: 0.4,
  },
  dropSetButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
    borderRadius: 4,
    backgroundColor: '#18181b',
  },
  dropSetButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#52525b',
    letterSpacing: 0.5,
  },
  dropSetButtonActive: {
    color: '#22d3ee',
  },
  dropSetsContainer: {
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 8,
  },
  dropRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dropRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginLeft: 8,
    borderRadius: 4,
    backgroundColor: '#0a0a0b',
    borderLeftWidth: 2,
    borderLeftColor: '#22d3ee',
  },
  dropIndent: {
    width: 24,
  },
  dropLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#52525b',
    marginRight: 12,
  },
  dropWeightInput: {
    width: 60,
    marginRight: 8,
  },
  dropRepsInput: {
    width: 60,
    marginLeft: 8,
  },
  dropCheckSpace: {
    width: 40,
  },
  dropCheckButton: {
    marginLeft: 8,
    padding: 2,
  },
  dropDeleteButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDropButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#27272a',
    borderStyle: 'dashed',
    gap: 6,
  },
  addDropText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#22d3ee',
  },
  bottomSpacer: {
    height: 50,
  },
  historyContainer: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
    marginBottom: 16,
  },
  historyWorkout: {
    backgroundColor: '#18181b',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717a',
    marginBottom: 8,
  },
  historySet: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  historySetNumber: {
    width: 20,
    fontSize: 14,
    color: '#52525b',
  },
  historySetData: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 8,
  },
  dropIndicator: {
    fontSize: 12,
    color: '#22d3ee',
    fontWeight: '600',
  },
  historyDropSets: {
    marginLeft: 28,
    marginTop: 4,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#22d3ee',
  },
  historyDropSet: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  historyDropLabel: {
    fontSize: 12,
    color: '#52525b',
    fontWeight: '600',
    minWidth: 60,
  },
  historyDropData: {
    fontSize: 12,
    color: '#71717a',
    marginLeft: 8,
  },
  emptyHistoryState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyHistoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
    marginBottom: 8,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#52525b',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  // New Timer Overlay
  timerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  timerCard: {
    backgroundColor: '#18181b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    overflow: 'hidden',
    maxHeight: 400,
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  timerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  timerHeaderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  timerIconButton: {
    padding: 8,
  },
  
  // Timer Display
  timerDisplay: {
    padding: 24,
    alignItems: 'center',
  },
  timerMainDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  timerCenterDisplay: {
    alignItems: 'center',
  },
  mainTimeAdjustButton: {
    backgroundColor: '#27272a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mainTimeAdjustText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22d3ee',
  },
  timerCountdown: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  timerMode: {
    fontSize: 16,
    color: '#71717a',
    fontWeight: '500',
  },
  primaryActionButton: {
    backgroundColor: '#22d3ee',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#22d3ee',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  secondaryControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    minWidth: 90,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717a',
  },
  
  // Settings
  settingsScroll: {
    maxHeight: 280,
  },
  settingsContainer: {
    padding: 20,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  toggle: {
    width: 50,
    height: 28,
    backgroundColor: '#27272a',
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: '#22d3ee',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    backgroundColor: '#71717a',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  toggleKnobOn: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-end',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#27272a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  optionSelected: {
    backgroundColor: '#22d3ee20',
    borderColor: '#22d3ee',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  optionTextSelected: {
    color: '#22d3ee',
  },
  minimizedTimer: {
    position: 'absolute',
    bottom: 34,
    alignSelf: 'center',
    backgroundColor: '#18181b',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  minimizedTimerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  startTimerButton: {
    position: 'absolute',
    bottom: 34,
    alignSelf: 'center',
    backgroundColor: '#18181b',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  startTimerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#22d3ee',
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#22d3ee',
    marginTop: 16,
    marginBottom: 8,
  },
  completedSubtitle: {
    fontSize: 16,
    color: '#71717a',
    marginBottom: 32,
  },
  completionActions: {
    flexDirection: 'row',
    gap: 16,
  },
  completionButton: {
    backgroundColor: '#22d3ee',
    borderRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  dismissButton: {
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  confirmModalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 32,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  confirmModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  confirmModalMessage: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmModalButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  confirmModalCancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  confirmModalConfirmButton: {
    backgroundColor: '#22d3ee',
  },
  confirmModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
  },
  confirmModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  reminderModalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 32,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  reminderModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 16,
  },
  reminderModalMessage: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  reminderModalButton: {
    backgroundColor: '#22d3ee',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 80,
  },
  reminderModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
    textAlign: 'center',
  },
  completionModalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 40,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  completionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22d3ee20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  completionModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  completionModalSubtitle: {
    fontSize: 16,
    color: '#71717a',
    marginBottom: 32,
    textAlign: 'center',
    fontWeight: '500',
  },
  summaryContainer: {
    width: '100%',
    marginBottom: 32,
    gap: 20,
  },
  durationContainer: {
    alignItems: 'center',
  },
  durationLabel: {
    fontSize: 12,
    color: '#71717a',
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  durationValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  volumeCard: {
    backgroundColor: '#0a0a0b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  volumeLabel: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  volumeValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 52,
    marginBottom: 4,
  },
  volumeUnit: {
    fontSize: 18,
    fontWeight: '500',
    color: '#22d3ee',
  },
  completionModalButtons: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
  },
  completionModalButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionModalContinueButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  completionModalFinishButton: {
    backgroundColor: '#22d3ee',
  },
  completionModalContinueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
    textAlign: 'center',
  },
  completionModalFinishText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
    textAlign: 'center',
  },
  
  // Superset linking styles
  supersetLinkContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: 16,
  },
  supersetLinkButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  supersetLinkButtonActive: {
    backgroundColor: '#164e63',
    borderColor: '#22d3ee',
  },
  supersetLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#22d3ee',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  exerciseCardLinked: {
    borderColor: '#22d3ee',
    borderWidth: 2,
    shadowColor: '#22d3ee',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    backgroundColor: '#1a1a1d',
  },
});