import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
  Animated,
  Modal,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/AppNavigator';
import { WorkoutStorage, WorkoutHistory, ExercisePreference } from '../utils/storage';
import { TimerNotifications, SOUND_OPTIONS, TimerSettings } from '../utils/timerNotifications';
import { useActiveWorkout } from '../contexts/ActiveWorkoutContext';
import { useTheme } from '../contexts/ThemeContext';
import { useWeightUnit } from '../contexts/WeightUnitContext';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

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
  superset_group?: string;
  previous?: { weight: number; reps: number };
}

interface DropSet {
  weight: string;
  reps: string;
  completed?: boolean;
  unit?: 'kg' | 'lbs'; // Store unit for completed drop sets
}

interface SetData {
  exercise: string;
  setNumber: number;
  weight: string;
  reps: string;
  completed: boolean;
  selectedExerciseIndex: number; // 0 = primary, 1+ = alternatives
  unit?: 'kg' | 'lbs'; // Store unit for completed sets
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
  onSetExercisePreference: (exerciseIndex: number, primaryExercise: string, alternatives: string[], selectedAlternative: string) => void;
  exercisePreferences: { [exerciseName: string]: string };
  onInteractionAttempt?: () => void;
  isLinkedToNext?: boolean;
  isLinkedToPrev?: boolean;
  themeColor: string;
  getExerciseUnit: (exerciseIndex: number) => 'kg' | 'lbs';
  setExerciseUnit: (exerciseIndex: number, unit: 'kg' | 'lbs') => void;
  setGlobalUnit: (unit: 'kg' | 'lbs') => void;
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
  onSetExercisePreference,
  exercisePreferences,
  onInteractionAttempt,
  isLinkedToNext,
  isLinkedToPrev,
  themeColor,
  getExerciseUnit,
  setExerciseUnit,
  setGlobalUnit
}: ExerciseCardProps) {
  
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [expandedDropSets, setExpandedDropSets] = useState<Set<number>>(new Set());
  
  // Separate animations for each connection type
  const topConnection = React.useRef(new Animated.Value(0)).current;
  const bottomConnection = React.useRef(new Animated.Value(0)).current;
  
  // Animate each connection independently for smooth transitions
  React.useEffect(() => {
    Animated.timing(topConnection, {
      toValue: isLinkedToPrev ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isLinkedToPrev, topConnection]);

  React.useEffect(() => {
    Animated.timing(bottomConnection, {
      toValue: isLinkedToNext ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isLinkedToNext, bottomConnection]);
  
  const currentUnit = getExerciseUnit(exerciseIndex);
  
  // Use weekly reps if available, otherwise fall back to regular reps
  const targetReps = (exercise.reps_weekly?.[currentWeek.toString()] || exercise.reps || '').replace(/\s*\(.*?\)/, '');
  
  // Ensure targetReps is always a string
  const targetRepsString = typeof targetReps === 'string' ? targetReps : String(targetReps);
  const selectedIndex = setsData.length > 0 ? setsData[0].selectedExerciseIndex : 0;
  
  // Create array of all available exercises (primary + alternatives)
  const alternativeNames = (exercise.alternatives || []).map(alt => 
    typeof alt === 'string' ? alt : alt.exercise
  );
  const allExercises = [exercise.exercise, ...alternativeNames];
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
  
  // Create superset border style - base style only
  const getBaseBorderStyle = () => {
    return isLinkedToNext || isLinkedToPrev ? styles.exerciseCardSupersetBase : styles.exerciseCard;
  };

  // Track if we should show overlay (including during fade-out)
  const [shouldShowOverlay, setShouldShowOverlay] = useState(false);
  
  React.useEffect(() => {
    const hasConnection = isLinkedToNext || isLinkedToPrev;
    if (hasConnection) {
      setShouldShowOverlay(true);
    } else {
      // Delay hiding overlay to allow fade-out animation to complete
      const timeout = setTimeout(() => setShouldShowOverlay(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isLinkedToNext, isLinkedToPrev]);

  // Render smooth transitioning border overlay
  const renderTaperingBorder = () => {
    if (!shouldShowOverlay) return null;
    
    return (
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }
        ]}
        pointerEvents="none"
      >
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: 4,
                  borderWidth: 2,
                  backgroundColor: 'transparent',
                }
              ]}
            />
          }
        >
          <Animated.View style={StyleSheet.absoluteFill}>
            {/* Top connection layer */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { opacity: topConnection }
              ]}
            >
              <LinearGradient
                style={StyleSheet.absoluteFill}
                colors={[themeColor, themeColor + '80', themeColor + '20', themeColor + '00']}
                locations={[0, 0.4, 0.8, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
            </Animated.View>
            
            {/* Bottom connection layer */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { opacity: bottomConnection }
              ]}
            >
              <LinearGradient
                style={StyleSheet.absoluteFill}
                colors={[themeColor + '00', themeColor + '20', themeColor + '80', themeColor]}
                locations={[0, 0.2, 0.6, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
            </Animated.View>
          </Animated.View>
        </MaskedView>
      </Animated.View>
    );
  };

  return (
    <View style={getBaseBorderStyle()}>
      {renderTaperingBorder()}
      <View style={styles.exerciseHeader}>
        {/* Left side - Exercise name and dropdown */}
        <View style={styles.exerciseNameSection}>
          <TouchableOpacity 
            style={styles.exerciseNameButton}
            onPress={() => allExercises.length > 1 && setShowExerciseSelector(!showExerciseSelector)}
            activeOpacity={allExercises.length > 1 ? 0.7 : 1}
          >
            <Text style={styles.exerciseName} numberOfLines={2}>
              {currentExerciseName}{allExercises.length > 1 && ' *'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Right side - Action buttons */}
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.unitToggleButton}
            onPress={() => setExerciseUnit(exerciseIndex, currentUnit === 'kg' ? 'lbs' : 'kg')}
            onLongPress={() => setGlobalUnit(currentUnit === 'kg' ? 'lbs' : 'kg')}
            activeOpacity={0.7}
          >
            <Text style={[styles.unitToggleText, { color: themeColor }]}>{currentUnit}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onNotesPress(exerciseIndex, currentExerciseName)}
            activeOpacity={0.7}
          >
            <Ionicons name={notes ? "document-text" : "document-text-outline"} size={18} color={themeColor} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onHistoryPress(currentExerciseName)}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={18} color={themeColor} />
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
                index === selectedIndex && [styles.exerciseOptionSelected, { backgroundColor: themeColor + '20' }],
                index === allExercises.length - 1 && styles.exerciseOptionLast
              ]}
              onPress={() => {
                onExerciseSelect(exerciseIndex, index);
                setShowExerciseSelector(false);
              }}
              onLongPress={() => {
                const alternativeNames = (exercise.alternatives || []).map(alt => 
                  typeof alt === 'string' ? alt : alt.exercise
                );
                onSetExercisePreference(exerciseIndex, exercise.exercise, alternativeNames, exerciseName);
                setShowExerciseSelector(false);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.exerciseOptionTextContainer}>
                {(() => {
                  // Show star for preferred exercise if set, otherwise show for primary (index 0)
                  const preferredExercise = exercisePreferences[exercise.exercise];
                  const showStar = preferredExercise ? exerciseName === preferredExercise : index === 0;
                  
                  return showStar ? (
                    <Ionicons 
                      name="star" 
                      size={14} 
                      color={index === selectedIndex ? themeColor : "#71717a"} 
                      style={styles.primaryIcon}
                    />
                  ) : null;
                })()}
                <Text style={[
                  styles.exerciseOptionText,
                  index === selectedIndex && [styles.exerciseOptionTextSelected, { color: themeColor }]
                ]}>
                  {exerciseName}
                </Text>
              </View>
              {index === selectedIndex && (
                <Ionicons name="checkmark" size={16} color={themeColor} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      {/* Separator line */}
      <View style={styles.headerSeparator} />
      
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
              
              <View style={styles.weightInputContainer}>
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
                <Text style={styles.unitLabel}>{setData.completed && setData.unit ? setData.unit : currentUnit}</Text>
              </View>
              
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
                placeholder={getCurrentWeekReps(targetRepsString).split('-')[0]}
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
                  color={setData.completed ? "#22c55e" : (!setData.weight || !setData.reps) ? "#52525b" : themeColor}
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
                  setData.isDropSet && [styles.dropSetButtonActive, { color: themeColor }]
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
                    <View style={[styles.dropRow, { borderLeftColor: themeColor }]}>
                      <Text style={styles.dropLabel}>Drop {dropIndex + 1}</Text>
                      
                      <View style={styles.dropWeightInputContainer}>
                        <TextInput
                          style={[styles.input, styles.dropWeightInput]}
                          value={drop.weight}
                          onChangeText={(value) => updateDropSet(setIndex, dropIndex, 'weight', value)}
                          placeholder={getDropSuggestion(setIndex, dropIndex, 'weight')}
                          placeholderTextColor="#52525b"
                          keyboardType="decimal-pad"
                          editable={!drop.completed}
                        />
                        <Text style={styles.unitLabel}>{drop.completed && drop.unit ? drop.unit : currentUnit}</Text>
                      </View>
                      
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
                            color={drop.completed ? "#22c55e" : (!drop.weight || !drop.reps) ? "#52525b" : themeColor}
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
                    <Ionicons name="add-circle-outline" size={20} color={themeColor} />
                    <Text style={[styles.addDropText, { color: themeColor }]}>Add Drop</Text>
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

// Animated Superset Link Button Component
interface SupersetLinkButtonProps {
  isActive: boolean;
  themeColor: string;
  onPress: () => void;
}

function SupersetLinkButton({ isActive, themeColor, onPress }: SupersetLinkButtonProps) {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isActive ? 1 : 0,
      duration: 300,
      useNativeDriver: false, // Need to animate borderColor
    }).start();
  }, [isActive, animatedValue]);

  const animatedBorderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', themeColor]
  });

  const animatedScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1]
  });

  // Use static color based on isActive instead of animated color for Ionicons
  const iconColor = isActive ? themeColor : '#71717a';

  return (
    <Animated.View
      style={[
        styles.supersetLinkButton,
        {
          borderColor: animatedBorderColor,
          transform: [{ scale: animatedScale }]
        }
      ]}
    >
      <TouchableOpacity onPress={onPress} style={styles.supersetLinkButtonTouchable}>
        <Ionicons 
          name="link" 
          size={16} 
          color={iconColor}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

// Animated Superset Label Component
interface SupersetLabelProps {
  isActive: boolean;
  themeColor: string;
}

function SupersetLabel({ isActive, themeColor }: SupersetLabelProps) {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isActive ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isActive, animatedValue]);

  const animatedStyle = {
    opacity: animatedValue,
    transform: [
      {
        scale: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1],
        }),
      },
    ],
  };

  return (
    <Animated.View style={animatedStyle}>
      <Text style={[styles.supersetLabel, { color: themeColor }]}>SUPERSET</Text>
    </Animated.View>
  );
}

export default function WorkoutLogScreen() {
  const navigation = useNavigation<WorkoutLogScreenNavigationProp>();
  const route = useRoute<WorkoutLogScreenRouteProp>();
  const { themeColor } = useTheme();
  const { globalUnit, getExerciseUnit, setExerciseUnit, setGlobalUnit, formatWeight, convertWeight } = useWeightUnit();
  const { day, blockName, currentWeek: passedWeek, block, routineName } = route.params;
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
  const [showDeloadInfo, setShowDeloadInfo] = useState(false);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [timerSettings, setTimerSettings] = useState<TimerSettings>(TimerNotifications.defaultSettings);
  const [timerMinimized, setTimerMinimized] = useState(true); // Start minimized by default
  
  // Exercise preference states
  const [showPreferenceDialog, setShowPreferenceDialog] = useState<{
    exerciseIndex: number;
    primaryExercise: string;
    alternatives: string[];
    selectedAlternative: string;
  } | null>(null);
  const [exercisePreferences, setExercisePreferences] = useState<{ [exerciseName: string]: string }>({});
  const [preferenceModalScale] = useState(new Animated.Value(0));
  const [preferenceModalOpacity] = useState(new Animated.Value(0));
  
  // Workout session timer
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [workoutDuration, setWorkoutDuration] = useState(0); // in seconds
  
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
  
  // Auto-detect supersets from superset_group field on component mount
  useEffect(() => {
    const detectSupersets = () => {
      const links = new Set<number>();
      const supersetGroups: { [group: string]: number[] } = {};
      
      // Group exercises by their superset_group
      day.exercises.forEach((exercise, index) => {
        if (exercise.superset_group) {
          if (!supersetGroups[exercise.superset_group]) {
            supersetGroups[exercise.superset_group] = [];
          }
          supersetGroups[exercise.superset_group].push(index);
        }
      });
      
      // Create links for consecutive exercises in the same superset group
      Object.values(supersetGroups).forEach(group => {
        if (group.length > 1) {
          // Sort the group to ensure proper order
          group.sort((a, b) => a - b);
          // Link each exercise to the next one in the group (except the last)
          for (let i = 0; i < group.length - 1; i++) {
            links.add(group[i]);
          }
        }
      });
      
      setSupersetLinks(links);
    };
    
    detectSupersets();
  }, [day.exercises]);
  
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
      // Use weekly sets if available, otherwise fall back to regular sets
      const currentSets = exercise.sets_weekly?.[currentWeek.toString()] || exercise.sets;
      return Array.from({ length: currentSets }, (_, index) => ({
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
  }, [day, currentWeek]);

  // Update exercise selections based on preferences
  useEffect(() => {
    if (Object.keys(exercisePreferences).length > 0 && allSetsData.length > 0) {
      const updatedData = allSetsData.map((exerciseSets, exerciseIndex) => {
        const exercise = day.exercises[exerciseIndex];
        const preferredExercise = exercisePreferences[exercise.exercise];
        
        if (preferredExercise && exercise.alternatives) {
          const alternativeNames = exercise.alternatives.map(alt => 
            typeof alt === 'string' ? alt : alt.exercise
          );
          const allExercises = [exercise.exercise, ...alternativeNames];
          const preferredIndex = allExercises.indexOf(preferredExercise);
          
          if (preferredIndex !== -1) {
            // Update all sets for this exercise to use the preferred exercise
            return exerciseSets.map(setData => ({
              ...setData,
              selectedExerciseIndex: preferredIndex
            }));
          }
        }
        return exerciseSets;
      });
      
      setAllSetsData(updatedData);
    }
  }, [exercisePreferences, day.exercises]);
  
  // Workout duration timer - updates based on start time instead of setInterval
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
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [workoutStartTime]);
  
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
    
    // Get the current exercise name based on selected exercise index
    const exercise = day.exercises[exerciseIndex];
    const alternativeNames = (exercise.alternatives || []).map(alt => 
      typeof alt === 'string' ? alt : alt.exercise
    );
    const allExercises = [exercise.exercise, ...alternativeNames];
    const selectedIndex = setData.selectedExerciseIndex || 0;
    const currentExerciseName = allExercises[selectedIndex] || exercise.exercise;
    
    console.log('Saving set for exercise:', currentExerciseName, 'weight:', setData.weight, 'reps:', setData.reps, 'unit:', getExerciseUnit(exerciseIndex));
    
    // Load existing history
    const history = await WorkoutStorage.loadWorkoutHistory();
    
    // Find existing entry for this exercise on this date
    const existingEntryIndex = history.findIndex(entry => 
      entry.exerciseName === currentExerciseName && 
      entry.date === currentDate &&
      entry.dayName === day.day_name
    );
    
    const currentUnit = getExerciseUnit(exerciseIndex);
    const newSet = {
      setNumber: setData.setNumber,
      weight: setData.weight,
      reps: setData.reps,
      completed: setData.completed,
      unit: currentUnit,
      drops: setData.isDropSet && setData.drops ? setData.drops.map(drop => ({
        weight: drop.weight,
        reps: drop.reps,
        completed: drop.completed || false,
        unit: currentUnit,
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
    console.log('Set saved to history successfully:', {
      exercise: currentExerciseName,
      setNumber: setData.setNumber,
      weight: setData.weight,
      reps: setData.reps,
      unit: currentUnit
    });
  };
  
  const handleSetComplete = async (exerciseIndex: number, setIndex: number) => {
    const newData = [...allSetsData];
    const wasCompleted = newData[exerciseIndex][setIndex].completed;
    newData[exerciseIndex][setIndex].completed = !wasCompleted;
    
    // When completing a set, store the current unit so it doesn't change later
    if (!wasCompleted) {
      newData[exerciseIndex][setIndex].unit = getExerciseUnit(exerciseIndex);
    }
    
    setAllSetsData(newData);
    
    console.log('Set completion toggled:', {
      exerciseIndex,
      setIndex,
      wasCompleted,
      nowCompleted: !wasCompleted,
      weight: newData[exerciseIndex][setIndex].weight,
      reps: newData[exerciseIndex][setIndex].reps
    });
    
    // Save to history immediately when set is completed
    if (!wasCompleted && newData[exerciseIndex][setIndex].weight && newData[exerciseIndex][setIndex].reps) {
      console.log('Attempting to save set to history...');
      await saveSetToHistory(exerciseIndex, setIndex, newData[exerciseIndex][setIndex]);
    } else {
      console.log('Set not saved to history:', {
        wasAlreadyCompleted: wasCompleted,
        hasWeight: !!newData[exerciseIndex][setIndex].weight,
        hasReps: !!newData[exerciseIndex][setIndex].reps
      });
    }
    
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
      
      // When completing a drop set, store the current unit so it doesn't change later
      if (!wasCompleted) {
        newData[exerciseIndex][setIndex].drops[dropIndex].unit = getExerciseUnit(exerciseIndex);
      }
      
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

  // Function to handle setting exercise preference
  const handleSetExercisePreference = (exerciseIndex: number, primaryExercise: string, alternatives: string[], selectedAlternative: string) => {
    setShowPreferenceDialog({
      exerciseIndex,
      primaryExercise,
      alternatives,
      selectedAlternative
    });
    
    // Animate modal entrance
    preferenceModalScale.setValue(0.7);
    preferenceModalOpacity.setValue(0);
    
    Animated.parallel([
      Animated.spring(preferenceModalScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(preferenceModalOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Function to load exercise preferences for this block
  const loadExercisePreferences = async () => {
    if (!routineName) return;
    
    const prefs: { [exerciseName: string]: string } = {};
    
    // Load preferences for each exercise in the day
    for (const exercise of day.exercises) {
      const preferredExercise = await WorkoutStorage.getExercisePreference(
        routineName, 
        blockName, 
        exercise.exercise
      );
      if (preferredExercise) {
        prefs[exercise.exercise] = preferredExercise;
      }
    }
    
    setExercisePreferences(prefs);
  };

  // Function to confirm exercise preference setting
  const confirmExercisePreference = async () => {
    if (!showPreferenceDialog || !routineName) return;

    const preference: ExercisePreference = {
      programId: routineName,
      blockName,
      primaryExercise: showPreferenceDialog.primaryExercise,
      preferredExercise: showPreferenceDialog.selectedAlternative
    };

    await WorkoutStorage.saveExercisePreference(preference);

    // Update local preferences state
    setExercisePreferences(prev => ({
      ...prev,
      [showPreferenceDialog.primaryExercise]: showPreferenceDialog.selectedAlternative
    }));

    // Update the current exercise selection
    const allExercises = [showPreferenceDialog.primaryExercise, ...showPreferenceDialog.alternatives];
    const selectedIndex = allExercises.indexOf(showPreferenceDialog.selectedAlternative);
    handleExerciseSelect(showPreferenceDialog.exerciseIndex, selectedIndex);

    // Animate modal exit
    Animated.parallel([
      Animated.spring(preferenceModalScale, {
        toValue: 0.7,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(preferenceModalOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowPreferenceDialog(null);
    });
  };

  // Function to cancel preference dialog with animation
  const cancelExercisePreference = () => {
    Animated.parallel([
      Animated.spring(preferenceModalScale, {
        toValue: 0.7,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(preferenceModalOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowPreferenceDialog(null);
    });
  };
  
  const handleExerciseSelect = (exerciseIndex: number, selectedExerciseIndex: number) => {
    const newData = [...allSetsData];
    const currentSelection = newData[exerciseIndex][0].selectedExerciseIndex;
    
    // Only update if selection actually changed
    if (currentSelection !== selectedExerciseIndex) {
      const exercise = day.exercises[exerciseIndex];
      const alternativeNames = (exercise.alternatives || []).map(alt => 
        typeof alt === 'string' ? alt : alt.exercise
      );
      const allExercises = [exercise.exercise, ...alternativeNames];
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
    
    // Duration will be automatically calculated by the useEffect based on start time
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
          // Calculate volume: weight × reps (convert all weights to kg for consistent volume calculation)
          const weight = parseFloat(setData.weight) || 0;
          const weightInKg = convertWeight(weight, getExerciseUnit(exerciseIndex), 'kg');
          const reps = parseInt(setData.reps) || 0;
          totalVolume += weightInKg * reps;
          
          // Add drop sets to volume calculation (only completed ones)
          if (setData.isDropSet && setData.drops) {
            setData.drops.forEach(drop => {
              if (drop.completed && drop.weight && drop.reps) {
                const dropWeight = parseFloat(drop.weight) || 0;
                const dropWeightInKg = convertWeight(dropWeight, getExerciseUnit(exerciseIndex), 'kg');
                const dropReps = parseInt(drop.reps) || 0;
                totalVolume += dropWeightInKg * dropReps;
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
      
      // Clear workout timer by resetting start time
      setWorkoutStartTime(null);
      
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
      
      // Sets are now saved immediately when completed, so no need to save them again here
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
        const alternativeNames = (exercise.alternatives || []).map(alt => 
          typeof alt === 'string' ? alt : alt.exercise
        );
        const allExercises = [exercise.exercise, ...alternativeNames];
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

  // No cleanup needed - timer is based on workoutStartTime

  // Load saved progress and timer settings on mount
  useEffect(() => {
    const loadSavedData = async () => {
      // Load exercise preferences
      await loadExercisePreferences();
      
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
          
          // Duration will be automatically calculated by the useEffect based on start time
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
                          {set.weight}{set.unit || globalUnit} × {set.reps}
                          {set.drops && set.drops.length > 0 && (
                            <Text style={[styles.dropIndicator, { color: themeColor }]}> + {set.drops.length} drops</Text>
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
                                {drop.weight}{drop.unit || globalUnit} × {drop.reps}
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
    const targetReps = exercise.reps || '';
    const targetSets = exercise.sets || 0;
    
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
                    const exercise = day.exercises[showNotes.exerciseIndex];
                    const hasWeeklyReps = exercise.reps_weekly && Object.keys(exercise.reps_weekly).length > 0;
                    
                    // If exercise has weekly progression, show weekly format
                    if (hasWeeklyReps) {
                      return (
                        <View style={styles.weeklyScheme}>
                          {Object.entries(exercise.reps_weekly).map(([week, reps]) => (
                            <View key={week} style={[
                              styles.weekBlock,
                              parseInt(week) === currentWeek && [styles.activeWeekBlock, { backgroundColor: themeColor }]
                            ]}>
                              <Text style={[
                                styles.weekLabel,
                                parseInt(week) === currentWeek && styles.activeWeekLabel
                              ]}>Week {week}</Text>
                              <Text style={[
                                styles.weekReps,
                                { color: themeColor },
                                parseInt(week) === currentWeek && styles.activeWeekReps
                              ]}>{reps.replace(/\s*\(.*?\)/, '')}</Text>
                            </View>
                          ))}
                        </View>
                      );
                    }
                    
                    // Fallback to original parsing for non-weekly exercises
                    const scheme = parseRepScheme(targetRepsString);
                    
                    if (scheme.type === 'weekly') {
                      return (
                        <View style={styles.weeklyScheme}>
                          {scheme.values.map((reps, index) => (
                            <View key={index} style={styles.weekBlock}>
                              <Text style={styles.weekLabel}>Week {index + 1}</Text>
                              <Text style={[styles.weekReps, { color: themeColor }]}>{reps}</Text>
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
                              <Text style={[styles.setReps, { color: themeColor }]}>{reps}</Text>
                            </View>
                          ))}
                        </View>
                      );
                    } else {
                      return (
                        <View style={styles.straightScheme}>
                          <Text style={[styles.repSchemeText, { color: themeColor }]}>{targetRepsString}</Text>
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
          {/* Header */}
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
              {(() => {
                // Parse the block weeks to get total week count
                const weeksRange = block.weeks || '1-4';
                const totalWeeks = weeksRange.includes('-') 
                  ? parseInt(weeksRange.split('-')[1]) - parseInt(weeksRange.split('-')[0]) + 1
                  : 1;
                
                // Check if current week is a deload week
                const isDeloadWeek = block.deload_weeks?.includes(currentWeek) || false;
                const weekDisplay = `WEEK ${currentWeek} / ${totalWeeks}`;
                const deloadLabel = isDeloadWeek ? ' — DELOAD' : '';
                
                return (
                  <Text style={[styles.weekLabel, { color: themeColor }]}>
                    {weekDisplay}
                    {isDeloadWeek && <Text style={[styles.deloadLabel, { color: themeColor }]}>{deloadLabel}</Text>}
                  </Text>
                );
              })()}
              {workoutStartTime && (
                <Text style={[styles.workoutDuration, { color: themeColor }]}>{formatDuration(workoutDuration)}</Text>
              )}
            </View>
            <View style={styles.headerButtons}>
              {/* Deload Info Button */}
          {block.deload_weeks?.includes(currentWeek) && (
            <TouchableOpacity 
              style={[styles.deloadHeaderButton, { borderColor: themeColor }]}
              onPress={() => {
                const deloadGuidance = block.deload_guidance;
                const previousWeek = currentWeek - 1;
                
                let message = '';
                if (deloadGuidance) {
                  message = `Use ${deloadGuidance.weight_percentage}% of your Week ${previousWeek} weight.\n\nRep Range: ${deloadGuidance.rep_range}\n\n${deloadGuidance.notes}`;
                } else {
                  // Fallback to generic advice if no deload_guidance is provided
                  message = `Use 40-60% of your Week ${previousWeek} weight (50% is most common).\n\nExample: If you used 100kg for ${previousWeek === 3 ? '6-8' : 'your'} reps in Week ${previousWeek}, use 50kg for 12 reps this week.`;
                }
                
                Alert.alert(
                  'Deload Week Info',
                  message,
                  [{ text: 'OK' }]
                );
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="information-circle-outline" size={20} color={themeColor} />
            </TouchableOpacity>
          )}
          
          <Animated.View style={{ transform: [{ translateX: shakeAnimation }] }}>
            <TouchableOpacity 
              style={styles.finishButton}
              onPress={workoutStartTime ? handleFinishWorkout : handleStartWorkout}
              activeOpacity={0.7}
            >
              <Text style={[styles.finishButtonText, { color: themeColor }]}>
                {workoutStartTime ? 'Finish' : 'Start'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
          
          {/* Exercise content */}
          {day.exercises.map((exercise: Exercise, index: number) => (
            <React.Fragment key={index}>
              <View style={index === 0 ? { marginTop: 24 } : {}}>
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
                onSetExercisePreference={handleSetExercisePreference}
                exercisePreferences={exercisePreferences}
                onInteractionAttempt={handleInteractionAttempt}
                isLinkedToNext={supersetLinks.has(index)}
                isLinkedToPrev={supersetLinks.has(index - 1)}
                themeColor={themeColor}
                getExerciseUnit={getExerciseUnit}
                setExerciseUnit={setExerciseUnit}
                setGlobalUnit={setGlobalUnit}
              />
              
              {/* Superset linking button between exercises */}
              {index < day.exercises.length - 1 && (
                <View style={styles.supersetLinkContainer}>
                  <SupersetLinkButton 
                    isActive={supersetLinks.has(index)}
                    themeColor={themeColor}
                    onPress={() => toggleSupersetLink(index)}
                  />
                  <SupersetLabel isActive={supersetLinks.has(index)} themeColor={themeColor} />
                </View>
              )}
              </View>
            </React.Fragment>
          ))}
          

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
      
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
          <Ionicons name="timer-outline" size={20} color={themeColor} />
          <Text style={[styles.startTimerText, { color: themeColor }]}>Start Timer</Text>
        </TouchableOpacity>
      ) : null}

      {activeTimer && !timerMinimized && (
        <TouchableOpacity 
          style={styles.timerOverlay}
          activeOpacity={1}
          onPress={() => setTimerMinimized(true)}
        >
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
                      style={[styles.toggle, timerSettings.soundEnabled && [styles.toggleOn, { backgroundColor: themeColor }]]}
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
                          style={[styles.optionButton, timerSettings.selectedSound === option.id && [styles.optionSelected, { backgroundColor: themeColor + '20', borderColor: themeColor }]]}
                          onPress={async () => {
                            const newSettings = { ...timerSettings, selectedSound: option.id };
                            setTimerSettings(newSettings);
                            await TimerNotifications.saveSettings(newSettings);
                          }}
                          onLongPress={async () => {
                            await TimerNotifications.playSound(option.id, timerSettings.volume);
                          }}
                        >
                          <Text style={[styles.optionText, timerSettings.selectedSound === option.id && [styles.optionTextSelected, { color: themeColor }]]}>
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
                      style={[styles.toggle, timerSettings.hapticEnabled && [styles.toggleOn, { backgroundColor: themeColor }]]}
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
                          style={[styles.optionButton, timerSettings.hapticPattern === pattern && [styles.optionSelected, { backgroundColor: themeColor + '20', borderColor: themeColor }]]}
                          onPress={async () => {
                            const newSettings = { ...timerSettings, hapticPattern: pattern as any };
                            setTimerSettings(newSettings);
                            await TimerNotifications.saveSettings(newSettings);
                          }}
                          onLongPress={async () => {
                            await TimerNotifications.triggerHaptic(pattern as any);
                          }}
                        >
                          <Text style={[styles.optionText, timerSettings.hapticPattern === pattern && [styles.optionTextSelected, { color: themeColor }]]}>
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
                <Ionicons name="checkmark-circle" size={72} color={themeColor} />
                <Text style={[styles.completedTitle, { color: themeColor }]}>Rest Complete!</Text>
                <Text style={styles.completedSubtitle}>Ready for your next set</Text>
                
                {/* Completion Actions */}
                <View style={styles.completionActions}>
                  <TouchableOpacity 
                    style={[styles.completionButton, { backgroundColor: themeColor }]}
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
                        <Text style={[styles.mainTimeAdjustText, { color: themeColor }]}>-15</Text>
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
                        <Text style={[styles.mainTimeAdjustText, { color: themeColor }]}>+15</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Primary Action - Play/Pause Button */}
                <TouchableOpacity 
                  style={[styles.primaryActionButton, { backgroundColor: themeColor, shadowColor: themeColor }]}
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
        </TouchableOpacity>
      )}


      {/* Start Workout Confirmation Modal */}
      <Modal
        visible={showStartModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStartModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <Ionicons name="play-circle" size={48} color={themeColor} />
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
                style={[styles.confirmModalButton, styles.confirmModalConfirmButton, { backgroundColor: themeColor }]}
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
            <Ionicons name="information-circle" size={48} color={themeColor} />
            <Text style={styles.reminderModalTitle}>Start Your Workout</Text>
            <Text style={styles.reminderModalMessage}>
              You need to start your workout session first to begin logging exercises.
            </Text>
            
            <TouchableOpacity
              style={[styles.reminderModalPrimaryButton, { backgroundColor: themeColor }]}
              onPress={() => {
                setShowStartReminderModal(false);
                confirmStartWorkout();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.reminderModalPrimaryButtonText}>Start Workout</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.reminderModalSecondaryLink}
              onPress={() => setShowStartReminderModal(false)}
              activeOpacity={0.6}
            >
              <Text style={styles.reminderModalSecondaryLinkText}>Maybe Later</Text>
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
            <View style={[styles.completionIconContainer, { backgroundColor: themeColor + '1A' }]}>
              <Ionicons name="fitness" size={32} color={themeColor} />
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
                  <Text style={[styles.volumeUnit, { color: themeColor }]}>{globalUnit}</Text>
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
                style={[styles.completionModalButton, styles.completionModalFinishButton, { backgroundColor: themeColor }]}
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

      {/* Exercise Preference Dialog */}
      <Modal
        visible={!!showPreferenceDialog}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowPreferenceDialog(null)}
      >
        <Animated.View style={[styles.preferenceModalOverlay, { opacity: preferenceModalOpacity }]}>
          <Animated.View style={[
            styles.preferenceModalContainer, 
            { 
              shadowColor: themeColor,
              transform: [{ scale: preferenceModalScale }]
            }
          ]}>
            {/* Header */}
            <View style={styles.preferenceModalHeader}>
              <View style={[styles.preferenceModalIconContainer, { backgroundColor: themeColor + '15' }]}>
                <Ionicons name="star" size={24} color={themeColor} />
              </View>
              <TouchableOpacity 
                style={styles.preferenceModalClose}
                onPress={cancelExercisePreference}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#71717a" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.preferenceModalContent}>
              <Text style={styles.preferenceModalTitle}>Set as Preferred</Text>
              
              <View style={styles.preferenceModalExerciseCard}>
                <Text style={styles.preferenceModalExerciseName}>
                  {showPreferenceDialog?.selectedAlternative}
                </Text>
                <View style={[styles.preferenceModalBadge, { backgroundColor: themeColor + '15' }]}>
                  <Text style={[styles.preferenceModalBadgeText, { color: themeColor }]}>
                    Block Default
                  </Text>
                </View>
              </View>

              <Text style={styles.preferenceModalDescription}>
                This exercise will automatically be selected whenever 
                <Text style={[styles.preferenceModalHighlight, { color: themeColor }]}>
                  {' '}{showPreferenceDialog?.primaryExercise}{' '}
                </Text>
                appears in this block.
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.preferenceModalActions}>
              <TouchableOpacity 
                style={[styles.preferenceModalButton, styles.preferenceModalCancelButton]}
                onPress={cancelExercisePreference}
                activeOpacity={0.8}
              >
                <Text style={styles.preferenceModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.preferenceModalButton, styles.preferenceModalConfirmButton, { backgroundColor: themeColor }]}
                onPress={confirmExercisePreference}
                activeOpacity={0.9}
              >
                <Ionicons name="star" size={16} color="#0a0a0b" style={{ marginRight: 6 }} />
                <Text style={styles.preferenceModalConfirmText}>Set Preferred</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Deload Info Modal */}
      <Modal
        visible={showDeloadInfo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeloadInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={styles.deloadInfoModal}>
            <View style={styles.deloadInfoHeader}>
              <Text style={styles.deloadInfoTitle}>💡 Deload Week</Text>
              <TouchableOpacity 
                style={styles.deloadInfoClose}
                onPress={() => setShowDeloadInfo(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#71717a" />
              </TouchableOpacity>
            </View>
            
            {(() => {
              const deloadGuidance = block.deload_guidance;
              const previousWeek = currentWeek - 1;
              
              if (deloadGuidance) {
                return (
                  <>
                    <Text style={styles.deloadInfoText}>
                      Use {deloadGuidance.weight_percentage}% of your Week {previousWeek} weight.
                    </Text>
                    
                    <Text style={styles.deloadInfoText}>
                      Rep Range: {deloadGuidance.rep_range}
                    </Text>
                    
                    <Text style={styles.deloadInfoExample}>
                      {deloadGuidance.notes}
                    </Text>
                  </>
                );
              } else {
                // Fallback to generic advice
                return (
                  <>
                    <Text style={styles.deloadInfoText}>
                      Use 40-60% of your Week {previousWeek} weight (50% is most common).
                    </Text>
                    
                    <Text style={styles.deloadInfoExample}>
                      Example: If you used 100kg for 6-8 reps in Week {previousWeek}, use 50kg for 12 reps this week.
                    </Text>
                  </>
                );
              }
            })()}
          </Animated.View>
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
    marginTop: 2,
  },
  weekLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  deloadLabel: {
    fontWeight: '700',
  },
  deloadHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  deloadHeaderButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  deloadInfoButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1000,
  },
  deloadInfoButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  deloadInfoModal: {
    backgroundColor: '#1f1f23',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  deloadInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  deloadInfoTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f9fafb',
  },
  deloadInfoClose: {
    padding: 4,
  },
  deloadInfoText: {
    fontSize: 16,
    color: '#d1d5db',
    lineHeight: 24,
    marginBottom: 16,
  },
  deloadInfoExample: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  finishButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
    alignItems: 'flex-start',
    marginBottom: 12,
    minHeight: 48,
  },
  exerciseNameSection: {
    flex: 1,
    marginRight: 12,
    alignItems: 'flex-start',
  },
  exerciseNameButton: {
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 26,
    marginRight: 6,
    letterSpacing: -0.3,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  dropdownIcon: {
    marginTop: 3,
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
    // backgroundColor will be set inline
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
    fontWeight: '600',
  },
  historyButton: {
    padding: 4,
    marginLeft: 8,
  },
  actionButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#27272a',
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
  activeWeekBlock: {
    // backgroundColor will be set inline
  },
  weekLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717a',
    marginBottom: 4,
  },
  activeWeekLabel: {
    color: '#000000',
  },
  weekReps: {
    fontSize: 20,
    fontWeight: '700',
  },
  activeWeekReps: {
    color: '#000000',
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
  headerSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 12,
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
    width: 60,
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
    marginRight: 8,
    padding: 4,
    minWidth: 32,
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
    // color will be set inline
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
    width: 50,
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
    fontWeight: '600',
  },
  historyDropSets: {
    marginLeft: 28,
    marginTop: 4,
    paddingLeft: 8,
    borderLeftWidth: 2,
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
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
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
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
    // backgroundColor will be set inline
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
    // backgroundColor and borderColor will be set inline
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  optionTextSelected: {
    // color will be set inline
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
    shadowOffset: { width: 0, height: 2 },
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  startTimerText: {
    fontSize: 15,
    fontWeight: '600',
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: '700',
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
    // backgroundColor will be set inline
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
  confirmModalDescription: {
    fontSize: 15,
    color: '#e4e4e7',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  confirmModalNote: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  // New preference modal styles
  preferenceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  preferenceModalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    width: '100%',
    maxWidth: 380,
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 25,
  },
  preferenceModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  preferenceModalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferenceModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferenceModalContent: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  preferenceModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'left',
  },
  preferenceModalExerciseCard: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preferenceModalExerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  preferenceModalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 12,
  },
  preferenceModalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  preferenceModalDescription: {
    fontSize: 15,
    color: '#a1a1aa',
    lineHeight: 22,
    marginBottom: 24,
  },
  preferenceModalHighlight: {
    fontWeight: '600',
  },
  preferenceModalActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
    gap: 12,
  },
  preferenceModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  preferenceModalCancelButton: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  preferenceModalConfirmButton: {
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  preferenceModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  preferenceModalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
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
  reminderModalPrimaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 24,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  reminderModalPrimaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0a0a0b',
    textAlign: 'center',
  },
  reminderModalSecondaryLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  reminderModalSecondaryLinkText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#71717a',
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
    // backgroundColor will be set inline
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
    // borderColor will be set inline
  },
  supersetLinkButtonTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supersetLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  exerciseCardLinked: {
    borderWidth: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    backgroundColor: '#1a1a1d',
  },
  exerciseCardSupersetBase: {
    backgroundColor: '#18181b',
    borderRadius: 4,
    borderWidth: 0, // No border - gradient overlay handles it
    borderColor: 'transparent',
    padding: 16,
    marginBottom: 16,
    shadowOpacity: 0, // No uniform shadow - gradient glow handles it
    elevation: 0,
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  dropWeightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitLabel: {
    fontSize: 12,
    color: '#52525b',
    marginLeft: 2,
    minWidth: 20,
  },
  unitToggleButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    minWidth: 40,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitToggleText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});