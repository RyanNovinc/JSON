import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  Animated,
  Linking,
  SafeAreaView,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { getAIPrompt, MUSCLE_GROUPS, QuestionnaireData, generateProgramSpecs } from '../data/workoutPrompt';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import * as Crypto from 'expo-crypto';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutProgram, Exercise } from '../types/workout';

type ImportScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ImportRoutine'>;

// Interface moved to types/workout.ts - importing from there

export default function ImportRoutineScreen() {
  const navigation = useNavigation<ImportScreenNavigationProp>();
  const { themeColor } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [parsedProgram, setParsedProgram] = useState<WorkoutProgram | null>(null);
  const [accumulatedPrograms, setAccumulatedPrograms] = useState<WorkoutProgram[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showAddMoreMode, setShowAddMoreMode] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [planningPromptCopied, setPlanningPromptCopied] = useState(false);
  const [aiPromptCopied, setAiPromptCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sampleCopied, setSampleCopied] = useState(false);
  const [modalScale] = useState(new Animated.Value(0));
  const [modalOpacity] = useState(new Animated.Value(0));
  const [successScale] = useState(new Animated.Value(0));
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [uploadMode, setUploadMode] = useState(false);

  // Handle schema version migration on component mount
  useEffect(() => {
    handleSchemaMigration();
  }, []);

  // Handle schema version migration - clear old format data
  const handleSchemaMigration = async () => {
    try {
      const schemaVersion = await AsyncStorage.getItem('schemaVersion');
      if (!schemaVersion || schemaVersion !== '2.0') {
        // Clear all potentially incompatible data
        const keysToCheck = [
          'savedWorkoutPrograms',
          'currentWorkoutProgram', 
          'completedWorkouts',
          'workoutHistory',
          'favoriteExercises'
        ];
        
        // Only clear data that exists and might be in old format
        const keysToDelete: string[] = [];
        for (const key of keysToCheck) {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            try {
              const parsed = JSON.parse(data);
              // Check if it's using old exercise format (has alternatives as string array)
              if (key === 'savedWorkoutPrograms' || key === 'currentWorkoutProgram') {
                const hasOldFormat = checkForOldExerciseFormat(parsed);
                if (hasOldFormat) {
                  keysToDelete.push(key);
                }
              }
            } catch {
              // Invalid JSON, safe to delete
              keysToDelete.push(key);
            }
          }
        }
        
        if (keysToDelete.length > 0) {
          await AsyncStorage.multiRemove(keysToDelete);
          console.log('Schema migration: cleared old format data:', keysToDelete);
        }
        
        // Set new schema version
        await AsyncStorage.setItem('schemaVersion', '2.0');
      }
    } catch (error) {
      console.error('Schema migration failed:', error);
    }
  };

  // Check if workout data uses old exercise format
  const checkForOldExerciseFormat = (data: any): boolean => {
    if (!data) return false;
    
    try {
      if (data.blocks) {
        for (const block of data.blocks) {
          if (block.days) {
            for (const day of block.days) {
              if (day.exercises) {
                for (const exercise of day.exercises) {
                  // Old format: alternatives is string array, no type field, no primaryMuscles
                  if (!exercise.type || 
                      (exercise.alternatives && Array.isArray(exercise.alternatives) && 
                       exercise.alternatives.length > 0 && typeof exercise.alternatives[0] === 'string') ||
                      !exercise.primaryMuscles) {
                    return true;
                  }
                }
              }
            }
          }
        }
      }
      return false;
    } catch {
      return true; // If we can't parse it, assume it's old format
    }
  };

  const sampleWorkout = {
    "routine_name": "Quick Start - Push Pull Legs",
    "description": "3-day Push Pull Legs sample to try the app",
    "days_per_week": 3,
    "blocks": [
      {
        "block_name": "Demo Week",
        "weeks": "1",
        "structure": "Push Pull Legs",
        "days": [
          {
            "day_name": "Push",
            "estimated_duration": 45,
            "exercises": [
              {
                "exercise": "Push Up",
                "sets": 3,
                "reps": "8-12",
                "rest": 90,
                "restQuick": 60,
                "notes": "Knee variation if needed",
                "alternatives": ["Incline Push Up", "Dumbbell Bench Press"]
              },
              {
                "exercise": "Overhead Press",
                "sets": 3,
                "reps": "8-10",
                "rest": 120,
                "restQuick": 90,
                "alternatives": ["Dumbbell Shoulder Press", "Machine Shoulder Press"]
              },
              {
                "exercise": "Lateral Raise",
                "sets": 3,
                "reps": "12-15",
                "rest": 60,
                "restQuick": 45,
                "alternatives": ["Cable Lateral Raise", "Machine Lateral Raise"]
              }
            ]
          },
          {
            "day_name": "Pull",
            "estimated_duration": 40,
            "exercises": [
              {
                "exercise": "Assisted Pull Up",
                "sets": 3,
                "reps": "5-10",
                "rest": 120,
                "restQuick": 90,
                "notes": "Use assistance machine or bands",
                "alternatives": ["Lat Pulldown", "Inverted Row"]
              },
              {
                "exercise": "Dumbbell Row",
                "sets": 3,
                "reps": "8-10",
                "rest": 90,
                "restQuick": 60,
                "alternatives": ["Barbell Row", "Cable Row"]
              },
              {
                "exercise": "Dumbbell Curl",
                "sets": 3,
                "reps": "10-12",
                "rest": 60,
                "restQuick": 45,
                "alternatives": ["Barbell Curl", "Cable Curl"]
              }
            ]
          },
          {
            "day_name": "Legs",
            "estimated_duration": 50,
            "exercises": [
              {
                "exercise": "Goblet Squat",
                "sets": 3,
                "reps": "12-15",
                "rest": 90,
                "restQuick": 60,
                "notes": "Hold dumbbell at chest, focus on depth",
                "alternatives": ["Dumbbell Squat", "Leg Press"]
              },
              {
                "exercise": "Dumbbell Romanian Deadlift",
                "sets": 3,
                "reps": "10-12",
                "rest": 90,
                "restQuick": 60,
                "notes": "Keep bar close to body",
                "alternatives": ["Romanian Deadlift", "Good Morning"]
              },
              {
                "exercise": "Dumbbell Calf Raise",
                "sets": 3,
                "reps": "15-20",
                "rest": 60,
                "restQuick": 45,
                "alternatives": ["Standing Calf Raise", "Seated Calf Raise"]
              }
            ]
          }
        ]
      }
    ]
  };

  const handleCopySample = async () => {
    const sampleJson = JSON.stringify(sampleWorkout, null, 2);
    await Clipboard.setStringAsync(sampleJson);
    setSampleCopied(true);
    setTimeout(() => {
      setSampleCopied(false);
    }, 2000);
  };

  // Merge multiple workout programs into one
  const mergePrograms = (programs: WorkoutProgram[]): WorkoutProgram => {
    if (programs.length === 0) {
      throw new Error('No programs to merge');
    }
    
    if (programs.length === 1) {
      return programs[0];
    }

    // Check that all programs have the same days_per_week
    const firstDaysPerWeek = programs[0].days_per_week;
    const incompatibleProgram = programs.find(p => p.days_per_week !== firstDaysPerWeek);
    if (incompatibleProgram) {
      throw new Error(`Cannot combine programs with different training frequencies. Found ${firstDaysPerWeek} days/week and ${incompatibleProgram.days_per_week} days/week.`);
    }

    // Keep the original program name from the first program
    const combinedName = programs[0].routine_name;
    
    // Keep the original description from the first program
    const combinedDescription = programs[0].description || '';

    // Merge all blocks with adjusted week numbers
    const mergedBlocks = [];
    let currentWeekOffset = 0;

    for (const program of programs) {
      for (const block of program.blocks) {
        // Parse week range to understand the structure
        const weekParts = block.weeks.split('-');
        const startWeek = parseInt(weekParts[0]);
        const endWeek = weekParts.length > 1 ? parseInt(weekParts[1]) : startWeek;
        
        // Adjust week numbers by adding the offset
        const newStartWeek = startWeek + currentWeekOffset;
        const newEndWeek = endWeek + currentWeekOffset;
        const newWeeks = weekParts.length > 1 ? `${newStartWeek}-${newEndWeek}` : `${newStartWeek}`;
        
        // Create the merged block
        const mergedBlock = {
          ...block,
          weeks: newWeeks,
          block_name: programs.length > 1 ? `${block.block_name} (Part ${programs.indexOf(program) + 1})` : block.block_name
        };
        
        mergedBlocks.push(mergedBlock);
        
        // Update week offset for next program
        currentWeekOffset += (endWeek - startWeek + 1);
      }
    }

    return {
      id: Date.now().toString() + Math.random().toString(36),
      routine_name: combinedName,
      description: combinedDescription,
      days_per_week: firstDaysPerWeek,
      blocks: mergedBlocks
    };
  };

  // Exercise type validation functions
  const validateMuscles = (muscles: string[], exerciseName: string, type: 'primary' | 'secondary') => {
    if (!Array.isArray(muscles)) {
      throw new Error(`Exercise "${exerciseName}" ${type}Muscles must be an array`);
    }
    muscles.forEach((muscle: any) => {
      if (typeof muscle !== 'string' || !MUSCLE_GROUPS.includes(muscle)) {
        throw new Error(`Exercise "${exerciseName}" has invalid ${type} muscle: "${muscle}". Must be one of: ${MUSCLE_GROUPS.join(', ')}`);
      }
    });
  };

  const validateStrengthExercise = (exercise: any, dayName: string) => {
    if (!exercise.exercise || typeof exercise.exercise !== 'string') {
      throw new Error(`Strength exercise in "${dayName}" missing exercise name`);
    }
    if (typeof exercise.sets !== 'number' || exercise.sets <= 0) {
      throw new Error(`Exercise "${exercise.exercise}" has invalid sets`);
    }
    if (!exercise.reps || typeof exercise.reps !== 'string') {
      throw new Error(`Exercise "${exercise.exercise}" has invalid reps`);
    }
    if (typeof exercise.rest !== 'number' || exercise.rest <= 0) {
      throw new Error(`Exercise "${exercise.exercise}" has invalid rest`);
    }
    
    // Validate required muscle groups
    if (!exercise.primaryMuscles) {
      throw new Error(`Exercise "${exercise.exercise}" missing primaryMuscles`);
    }
    if (!exercise.secondaryMuscles) {
      throw new Error(`Exercise "${exercise.exercise}" missing secondaryMuscles`);
    }
    validateMuscles(exercise.primaryMuscles, exercise.exercise, 'primary');
    validateMuscles(exercise.secondaryMuscles, exercise.exercise, 'secondary');

    // Validate optional fields
    if (exercise.restQuick && (typeof exercise.restQuick !== 'number' || exercise.restQuick <= 0)) {
      throw new Error(`Exercise "${exercise.exercise}" has invalid restQuick`);
    }
    if (exercise.notes && typeof exercise.notes !== 'string') {
      throw new Error(`Exercise "${exercise.exercise}" notes must be a string`);
    }
    if (exercise.reps_weekly) {
      if (typeof exercise.reps_weekly !== 'object' || exercise.reps_weekly === null) {
        throw new Error(`Exercise "${exercise.exercise}" has invalid reps_weekly format`);
      }
      Object.values(exercise.reps_weekly).forEach((reps: any) => {
        if (typeof reps !== 'string') {
          throw new Error(`Exercise "${exercise.exercise}" reps_weekly values must be strings`);
        }
      });
    }
    if (exercise.sets_weekly) {
      if (typeof exercise.sets_weekly !== 'object' || exercise.sets_weekly === null) {
        throw new Error(`Exercise "${exercise.exercise}" has invalid sets_weekly format`);
      }
      Object.values(exercise.sets_weekly).forEach((sets: any) => {
        if (typeof sets !== 'number') {
          throw new Error(`Exercise "${exercise.exercise}" sets_weekly values must be numbers`);
        }
      });
    }
    if (exercise.alternatives) {
      if (!Array.isArray(exercise.alternatives)) {
        throw new Error(`Exercise "${exercise.exercise}" alternatives must be an array`);
      }
      exercise.alternatives.forEach((alt: any, index: number) => {
        if (!alt.exercise || typeof alt.exercise !== 'string') {
          throw new Error(`Alternative ${index + 1} for "${exercise.exercise}" missing exercise name`);
        }
        if (!alt.primaryMuscles) {
          throw new Error(`Alternative "${alt.exercise}" missing primaryMuscles`);
        }
        if (!alt.secondaryMuscles) {
          throw new Error(`Alternative "${alt.exercise}" missing secondaryMuscles`);
        }
        validateMuscles(alt.primaryMuscles, alt.exercise, 'primary');
        validateMuscles(alt.secondaryMuscles, alt.exercise, 'secondary');
      });
    }
  };

  const validateCardioExercise = (exercise: any, dayName: string) => {
    if (!exercise.activity || typeof exercise.activity !== 'string') {
      throw new Error(`Cardio exercise in "${dayName}" missing activity name`);
    }
    if (typeof exercise.duration_minutes !== 'number' || exercise.duration_minutes <= 0) {
      throw new Error(`Cardio "${exercise.activity}" has invalid duration_minutes`);
    }
    if (exercise.distance_value && typeof exercise.distance_value !== 'number') {
      throw new Error(`Cardio "${exercise.activity}" distance_value must be a number`);
    }
    if (exercise.distance_unit && !['km', 'miles'].includes(exercise.distance_unit)) {
      throw new Error(`Cardio "${exercise.activity}" distance_unit must be 'km' or 'miles'`);
    }
  };

  const validateStretchExercise = (exercise: any, dayName: string) => {
    if (!exercise.exercise || typeof exercise.exercise !== 'string') {
      throw new Error(`Stretch exercise in "${dayName}" missing exercise name`);
    }
    if (typeof exercise.hold_seconds !== 'number' || exercise.hold_seconds <= 0) {
      throw new Error(`Stretch "${exercise.exercise}" has invalid hold_seconds`);
    }
    if (typeof exercise.sets !== 'number' || exercise.sets <= 0) {
      throw new Error(`Stretch "${exercise.exercise}" has invalid sets`);
    }
    if (typeof exercise.per_side !== 'boolean') {
      throw new Error(`Stretch "${exercise.exercise}" per_side must be true or false`);
    }
    if (!exercise.primaryMuscles) {
      throw new Error(`Stretch "${exercise.exercise}" missing primaryMuscles`);
    }
    validateMuscles(exercise.primaryMuscles, exercise.exercise, 'primary');
  };

  const validateCircuitExercise = (exercise: any, dayName: string) => {
    if (!exercise.circuit_name || typeof exercise.circuit_name !== 'string') {
      throw new Error(`Circuit exercise in "${dayName}" missing circuit_name`);
    }
    if (typeof exercise.rounds !== 'number' || exercise.rounds <= 0) {
      throw new Error(`Circuit "${exercise.circuit_name}" has invalid rounds`);
    }
    if (typeof exercise.work_seconds !== 'number' || exercise.work_seconds <= 0) {
      throw new Error(`Circuit "${exercise.circuit_name}" has invalid work_seconds`);
    }
    if (typeof exercise.rest_seconds !== 'number' || exercise.rest_seconds < 0) {
      throw new Error(`Circuit "${exercise.circuit_name}" has invalid rest_seconds`);
    }
    if (!Array.isArray(exercise.exercises) || exercise.exercises.length === 0) {
      throw new Error(`Circuit "${exercise.circuit_name}" must have exercises array`);
    }
    exercise.exercises.forEach((ex: any, index: number) => {
      if (!ex.exercise || typeof ex.exercise !== 'string') {
        throw new Error(`Circuit "${exercise.circuit_name}" exercise ${index + 1} missing name`);
      }
    });
  };

  const validateSportExercise = (exercise: any, dayName: string) => {
    if (!exercise.activity || typeof exercise.activity !== 'string') {
      throw new Error(`Sport exercise in "${dayName}" missing activity name`);
    }
    if (exercise.duration_minutes && (typeof exercise.duration_minutes !== 'number' || exercise.duration_minutes <= 0)) {
      throw new Error(`Sport "${exercise.activity}" has invalid duration_minutes`);
    }
  };

  const validateAndParseJSON = (input: string): WorkoutProgram | null => {
    let parsed: any;
    
    // Normalize smart quotes to straight quotes before parsing
    let text = input;
    text = text.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');  // curly double quotes
    text = text.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");  // curly single quotes
    
    // Enhanced JSON parsing with detailed error reporting
    try {
      parsed = JSON.parse(text);
    } catch (jsonError) {
      const error = jsonError as Error;
      let detailedError = 'JSON Parse Error:\n\n';
      
      // Extract position information from error message
      const positionMatch = error.message.match(/position (\d+)/i) || 
                           error.message.match(/at position (\d+)/i) ||
                           error.message.match(/column (\d+)/i);
      
      const lineMatch = error.message.match(/line (\d+)/i);
      
      if (positionMatch || lineMatch) {
        const position = positionMatch ? parseInt(positionMatch[1]) : null;
        const line = lineMatch ? parseInt(lineMatch[1]) : null;
        
        if (position !== null) {
          detailedError += `Error at position ${position}`;
          if (line) detailedError += ` (line ${line})`;
          detailedError += '\n\n';
          
          // Show snippet around error position
          const start = Math.max(0, position - 50);
          const end = Math.min(text.length, position + 50);
          const snippet = text.slice(start, end);
          const errorPos = position - start;
          
          detailedError += 'Context:\n';
          detailedError += `...${snippet.slice(0, errorPos)}⚠️${snippet.slice(errorPos)}...\n\n`;
        }
      }
      
      // Detect specific common issues
      const rawError = error.message.toLowerCase();
      
      if (rawError.includes('unexpected end') || rawError.includes('unterminated')) {
        detailedError += '🔍 Issue: JSON appears truncated or incomplete\n';
        detailedError += '💡 Solution: File may be too large for mobile clipboard. Try:\n';
        detailedError += '• Use a smaller program file\n';
        detailedError += '• Import via computer/simulator\n';
        detailedError += '• Copy in smaller chunks\n';
      } else if (input.includes('\u201c') || input.includes('\u201d') || input.includes('\u2018') || input.includes('\u2019')) {
        detailedError += '🔍 Issue: Smart/curly quotes were detected and auto-fixed\n';
        detailedError += '💡 Note: Quotes were normalized, but there may be other syntax issues\n';
      } else if (rawError.includes('unexpected token')) {
        const tokenMatch = error.message.match(/unexpected token '(.*)'/i) || 
                          error.message.match(/unexpected token (.*) in/i);
        if (tokenMatch) {
          detailedError += `🔍 Issue: Unexpected character "${tokenMatch[1]}"\n`;
          detailedError += '💡 Solution: Remove invalid characters or fix JSON syntax\n';
        }
      } else if (text.trim().startsWith('```')) {
        detailedError += '🔍 Issue: Code block markers found\n';
        detailedError += '💡 Solution: Copy only the JSON content, not the ```json markers\n';
      } else if (!text.trim().startsWith('{')) {
        detailedError += '🔍 Issue: JSON must start with {\n';
        detailedError += '💡 Solution: Copy the complete JSON object\n';
      } else {
        detailedError += '🔍 Issue: JSON syntax error\n';
        detailedError += '💡 Common fixes:\n';
        detailedError += '• Check for missing commas between items\n';
        detailedError += '• Remove trailing commas\n';
        detailedError += '• Ensure all brackets are properly closed\n';
        detailedError += '• Use straight quotes, not curly quotes\n';
      }
      
      detailedError += '\n📋 Raw error: ' + error.message;
      
      setErrorMessage(detailedError);
      return null;
    }
    
    // Continue with existing validation logic
    try {
      
      // Basic validation
      if (!parsed.routine_name || typeof parsed.routine_name !== 'string') {
        throw new Error('Invalid routine name');
      }
      
      if (!parsed.days_per_week || typeof parsed.days_per_week !== 'number') {
        throw new Error('Invalid days per week');
      }
      
      if (!Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
        throw new Error('No training blocks found');
      }
      
      // Validate routine-level optional fields
      if (parsed.description && typeof parsed.description !== 'string') {
        throw new Error('Description must be a string');
      }

      // Validate blocks structure
      parsed.blocks.forEach((block: any, blockIndex: number) => {
        if (!block.block_name || !block.weeks) {
          throw new Error(`Block ${blockIndex + 1} is incomplete`);
        }
        
        // Validate optional block fields
        if (block.structure && typeof block.structure !== 'string') {
          throw new Error(`Block "${block.block_name}" has invalid structure field`);
        }
        
        if (block.deload_weeks) {
          if (!Array.isArray(block.deload_weeks)) {
            throw new Error(`Block "${block.block_name}" has invalid deload_weeks field - must be an array`);
          }
          block.deload_weeks.forEach((week: any) => {
            if (typeof week !== 'number' || week <= 0) {
              throw new Error(`Block "${block.block_name}" has invalid deload_weeks - must contain positive numbers`);
            }
          });
        }
        
        if (!Array.isArray(block.days) || block.days.length === 0) {
          throw new Error(`Block "${block.block_name}" has no training days`);
        }
        
        block.days.forEach((day: any, dayIndex: number) => {
          if (!day.day_name) {
            throw new Error(`Day ${dayIndex + 1} in "${block.block_name}" needs a name`);
          }
          
          // Validate optional day fields
          if (day.estimated_duration && (typeof day.estimated_duration !== 'number' || day.estimated_duration <= 0)) {
            throw new Error(`"${day.day_name}" has invalid estimated_duration`);
          }
          
          if (!Array.isArray(day.exercises) || day.exercises.length === 0) {
            throw new Error(`"${day.day_name}" has no exercises`);
          }
          
          day.exercises.forEach((exercise: any, exerciseIndex: number) => {
            // Validate exercise type is provided
            if (!exercise.type || typeof exercise.type !== 'string') {
              throw new Error(`Exercise ${exerciseIndex + 1} in "${day.day_name}" missing type field`);
            }

            // Validate based on exercise type
            switch (exercise.type) {
              case 'strength':
                validateStrengthExercise(exercise, day.day_name);
                break;
              case 'cardio':
                validateCardioExercise(exercise, day.day_name);
                break;
              case 'stretch':
                validateStretchExercise(exercise, day.day_name);
                break;
              case 'circuit':
                validateCircuitExercise(exercise, day.day_name);
                break;
              case 'sport':
                validateSportExercise(exercise, day.day_name);
                break;
              default:
                throw new Error(`Exercise "${exercise.exercise || exercise.activity || 'unknown'}" in "${day.day_name}" has invalid type: ${exercise.type}`);
            }
          });
        });
      });
      
      return parsed as WorkoutProgram;
    } catch (validationError) {
      const error = validationError as Error;
      const detailedError = `⚠️ Validation Error:\n\n${error.message}\n\n💡 This means your JSON was parsed successfully, but the workout program structure has issues. Please check that all required fields are present and correctly formatted.`;
      
      setErrorMessage(detailedError);
      return null;
    }
  };

  const handlePasteAndImport = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text) {
      Alert.alert('Clipboard Empty', 'Copy your workout program first', [{ text: 'OK' }]);
      return;
    }

    processWorkoutData(text);
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        
        // Read file content
        const response = await fetch(file.uri);
        const text = await response.text();
        
        processWorkoutData(text);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to read file. Please try again.', [{ text: 'OK' }]);
      console.error('File upload error:', error);
    }
  };

  const processWorkoutData = async (text: string) => {
    setIsLoading(true);
    const startTime = Date.now();
    setGenerationStartTime(startTime);
    
    // Simulate processing time for better UX
    setTimeout(() => {
      const program = validateAndParseJSON(text);
      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000; // Convert to seconds
      setGenerationTime(totalTime);
      setIsLoading(false);
      
      if (program) {
        // Generate unique ID for this program import
        const programId = Date.now().toString() + Math.random().toString(36);
        program.id = programId;
        
        // If we're in add more mode, add to existing programs
        // If we're in main import mode, start fresh
        const newAccumulated = showAddMoreMode ? [...accumulatedPrograms, program] : [program];
        setAccumulatedPrograms(newAccumulated);
        
        // Create the merged program for display
        try {
          const mergedProgram = mergePrograms(newAccumulated);
          setParsedProgram(mergedProgram);
          
          // If we're in add more mode, go back to confirmation view
          if (showAddMoreMode) {
            setShowAddMoreMode(false);
          } else {
            setShowConfirmation(true);
            
            // Animate modal entrance with futuristic easing
            Animated.parallel([
              Animated.timing(modalScale, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.timing(modalOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }),
            ]).start();
          }
        } catch (mergeError) {
          const error = mergeError as Error;
          setErrorMessage(`Cannot combine programs: ${error.message}`);
          // Reset accumulated programs on error
          setAccumulatedPrograms([]);
        }
      }
    }, 800);
  };

  const handleConfirmImport = async () => {
    if (parsedProgram) {
      // Success animation
      Animated.sequence([
        Animated.spring(successScale, {
          toValue: 1.2,
          useNativeDriver: true,
        }),
        Animated.spring(successScale, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        // Animate modal exit
        Animated.parallel([
          Animated.timing(modalScale, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(modalOpacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowConfirmation(false);
          modalScale.setValue(0);
          modalOpacity.setValue(0);
          successScale.setValue(0);
          
          // Reset accumulated programs after successful import
          setAccumulatedPrograms([]);
          
          navigation.navigate('Main', { 
            screen: 'Home',
            params: { importedProgram: parsedProgram }
          } as any);
        });
      }, 500);
    }
  };

  const handleAddMoreFiles = () => {
    // Switch to add more mode
    setShowAddMoreMode(true);
  };

  const handleBackToConfirmation = () => {
    // Go back to confirmation view
    setShowAddMoreMode(false);
  };


  const handleModalCancel = () => {
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowConfirmation(false);
      setShowAddMoreMode(false);
      setParsedProgram(null);
      modalScale.setValue(0);
      modalOpacity.setValue(0);
    });
  };

  const loadQuestionnaireData = async (): Promise<QuestionnaireData> => {
    try {
      // Load all questionnaire data from different AsyncStorage keys
      const [
        fitnessGoalsData,
        equipmentPreferencesData,
      ] = await Promise.all([
        AsyncStorage.getItem('fitnessGoalsData'),
        AsyncStorage.getItem('equipmentPreferencesData'),
      ]);

      // Parse the JSON data
      const fitnessGoals = fitnessGoalsData ? JSON.parse(fitnessGoalsData) : {};
      const equipmentPrefs = equipmentPreferencesData ? JSON.parse(equipmentPreferencesData) : {};

      // Consolidate all data into the expected QuestionnaireData format
      const consolidatedData: QuestionnaireData = {
        // From fitnessGoalsData
        primaryGoal: fitnessGoals.primaryGoal,
        secondaryGoals: fitnessGoals.secondaryGoals,
        specificSport: fitnessGoals.specificSport,
        athleticPerformanceDetails: fitnessGoals.athleticPerformanceDetails,
        funSocialDetails: fitnessGoals.funSocialDetails,
        injuryPreventionDetails: fitnessGoals.injuryPreventionDetails,
        flexibilityDetails: fitnessGoals.flexibilityDetails,
        customGoals: fitnessGoals.customGoals,
        totalTrainingDays: fitnessGoals.totalTrainingDays,
        gymTrainingDays: fitnessGoals.gymTrainingDays,
        otherTrainingDays: fitnessGoals.otherTrainingDays,
        customFrequency: fitnessGoals.customFrequency,
        priorityMuscleGroups: fitnessGoals.priorityMuscleGroups,
        customMuscleGroup: fitnessGoals.customMuscleGroup,
        movementLimitations: fitnessGoals.movementLimitations,
        customLimitation: fitnessGoals.customLimitation,
        trainingStylePreference: fitnessGoals.trainingStylePreference,
        customTrainingStyle: fitnessGoals.customTrainingStyle,
        trainingExperience: fitnessGoals.trainingExperience,
        trainingApproach: fitnessGoals.trainingApproach,
        programDuration: fitnessGoals.programDuration,
        customDuration: fitnessGoals.customDuration,
        cardioPreferences: fitnessGoals.cardioPreferences,

        // From equipmentPreferencesData
        selectedEquipment: equipmentPrefs.selectedEquipment,
        specificEquipment: equipmentPrefs.specificEquipment,
        unavailableEquipment: equipmentPrefs.unavailableEquipment,
        workoutDuration: equipmentPrefs.workoutDuration,
        useAISuggestion: equipmentPrefs.useAISuggestion,
        restTimePreference: equipmentPrefs.restTimePreference,
        useAIRestTime: equipmentPrefs.useAIRestTime,
        hasHeartRateMonitor: equipmentPrefs.hasHeartRateMonitor,
        likedExercises: equipmentPrefs.likedExercises,
        dislikedExercises: equipmentPrefs.dislikedExercises,
        exerciseNoteDetail: equipmentPrefs.exerciseNoteDetail,
      };

      // Filter out undefined/null values
      const cleanedData = Object.fromEntries(
        Object.entries(consolidatedData).filter(([key, value]) => value !== undefined && value !== null && value !== '')
      );

      console.log('Consolidated questionnaire data:', cleanedData);
      return cleanedData;
    } catch (error) {
      console.error('Error loading questionnaire data:', error);
      // Return empty object if loading fails
      return {};
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColor} />
        <Text style={styles.loadingText}>Processing routine...</Text>
      </View>
    );
  }

  if (showInstructions) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView 
          style={styles.instructionsScrollView}
          contentContainerStyle={styles.instructionsContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowInstructions(false)} style={styles.backButton}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>How It Works</Text>
              <Text style={styles.headerSubtitle}>3 simple steps to create custom programs</Text>
            </View>
          </View>
            <View style={styles.stepsContainer}>
              <View style={styles.stepCard}>
                <View style={styles.stepCardHeader}>
                  <View style={[styles.stepBadge, { backgroundColor: themeColor }]}>
                    <Text style={styles.stepBadgeText}>1</Text>
                  </View>
                  <Text style={styles.stepCardTitle}>Plan Your Program</Text>
                </View>
                <Text style={styles.stepCardDescription}>
                  Send this prompt to your AI of choice
                </Text>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: themeColor }]}
                  onPress={async () => {
                    const questionnaireData = await loadQuestionnaireData();
                    
                    const notesInstruction = (() => {
                      const detail = questionnaireData?.exerciseNoteDetail || 'brief';
                      if (detail === 'detailed') {
                        return '- Include detailed step-by-step form instructions for EVERY exercise in the notes field';
                      } else if (detail === 'brief') {
                        return '- Include brief coaching cues in the notes field for compound lifts only';
                      } else {
                        return '- Keep notes minimal — only include non-obvious technique tips or specific setup instructions';
                      }
                    })();
                    
                    const planningPrompt = `I'm using a fitness app called JSON.fit that supports multiple exercise types (strength, cardio, stretch, circuit, and sport). I need help designing a personalized workout program.

## INSTRUCTIONS

Review my profile and design a training plan. Show your reasoning — work through split selection, volume distribution, exercise choices, and trade-offs. Before presenting the summary, list every exercise per day with its set count and primary muscle tags, then total weekly volume per muscle group. If any muscle group is below target, revise and recount. Do not present the summary until all targets are met or flagged.

When done, end with a clean summary:

---
## Your Program Plan

**Split:** [split name] — [brief description]
**Sessions:** [estimated session lengths]
**Blocks:** [block structure and deload timing]

| Day | Session | Focus |
|-----|---------|-------|
| 1   | ...     | ...   |
| ... | ...     | ...   |

### Volume Targets
[Volume table — all muscle groups, sets/week, target ranges, status indicators as defined in Quality Check]

### Exercise Selections
For each training day, list every exercise with sets, primary/secondary muscles, and superset pairings. For programs with multiple exercise pools (rotations across blocks), list all pools.

### Secondary Goal Summary
If the profile includes secondary goals with dedicated training days, summarize how those days are structured: what activities, how they progress or rotate, and how they fit with the lifting days.

### Trade-offs (if any)
- [1-3 bullets noting meaningful compromises]

### Recommendation (if applicable)
If the plan has significant limitations, suggest one clear change. Keep it simple — no jargon. Example: "I'd recommend 5 lifting days + 1 cardio day instead of 4+1. This would solve the volume constraints and keep sessions shorter."

Do not suggest combining cardio with lifting sessions. Do not ask the user questions about the plan — they'll tell you what to change.

End with: "Let me know if you want any changes. When you're happy with the plan, you can use it with your JSON import prompt to generate the program files."
---

The profile represents preferences, not hard constraints. If the user's goals would be significantly better served by a different setup (e.g., more training days), recommend that. Respect their choices if confirmed, but don't silently accept a suboptimal setup.

Do NOT generate the full program. Only plan.

## MY PROFILE

**Primary Goal:** Muscle Building (gain lean mass and size)
**Secondary Goals:** Include Cardiovascular Training

**Training Schedule:**
- Total training days per week: 6
- Muscle Building days: 5
- Additional focus days (cardiovascular training): 1

**Training Experience:** Advanced (2+ years, excellent technique, slow progression)
**Training Approach:** Push Hard — target upper end of optimal volume ranges.

**Program Duration:** 1 year (long-term development plan)
**Preferred Cardio Activities:** Treadmill / Indoor Running, Stationary Bike / Cycling, Swimming, Stair Climber / StepMill

**Available Equipment:** Commercial Gym (full equipment access)
**Session Length:** Not specified — use 60-75 minutes as typical for hypertrophy with an advanced lifter.
**Heart Rate Monitor:** Not available
**Rest Time Preference:** Not specified — use evidence-based defaults.
**Exercise Note Detail:** Only non-obvious technique tips or specific setup instructions.

## MUSCLE TAXONOMY

Use ONLY these exact muscle names — no generic terms like "Shoulders", "Back", "Arms", or "Legs":

Chest, Front Delts, Side Delts, Rear Delts, Lats, Upper Back, Traps, Biceps, Triceps, Forearms, Quads, Hamstrings, Glutes, Calves, Core

Use "Core" instead of "Lower Back" for spinal stabilization or erector engagement.

### COMPOUND EXERCISE TAGGING GUIDE

Primary = main driver through full ROM. Secondary = assists but not the main driver.

- Bench press variants: Primary Chest, Triceps
- Incline press variants: Primary Chest, Front Delts | Secondary Triceps
- Row variants: Primary Upper Back, Lats | Secondary Biceps, Rear Delts
- Pull-up / Pulldown: Primary Lats | Secondary Biceps, Upper Back
- Overhead press: Primary Front Delts, Triceps | Secondary Side Delts
- Squat variants: Primary Quads, Glutes
- Leg press / Hack squat: Primary Quads | Secondary Glutes
- Lunge / Split squat: Primary Quads, Glutes
- Hip hinge (RDL, good morning): Primary Hamstrings, Glutes
- Hip thrust: Primary Glutes | Secondary Hamstrings
- Dips: Primary Chest, Triceps
- Calf raise variants: Primary Calves

## PLANNING RULES

1. **Only use available equipment** — do not include exercises the user can't perform with their listed equipment
2. **Stay within session duration** — each session must fit the stated time limit
3. **Rotate secondary goal activities** — if the user has preferred activities (cardio, mobility, sport, etc.), rotate through them. Every preferred activity should appear at least once.
4. **Rotate exercises between blocks** — change exercise variations while keeping movement patterns. Longer programs need more distinct exercise pools to prevent staleness.
5. **Plateau management** — for programs longer than 8 weeks, include guidance for when the lifter stalls on a prescribed progression.
6. **Complete block coverage** — the plan must explicitly cover every block in the program. For each block, specify which exercise pool it uses and list the exercises. Do not use "repeat" or "same as above" — each block must be independently clear so a separate AI can generate it without guessing.
7. **Deload structure** — if appropriate, include deload weeks with a clear approach (e.g., reduced sets, higher rep ranges). The app does not track weight.
8. **Long-term periodization** — for programs longer than 16 weeks, the plan should describe how training evolves across repeated cycles. Don't just rotate exercises — show how rep ranges, volume, or intensity shift over the course of the program.

## QUALITY CHECK

Before presenting the plan, verify volume per muscle group. Count only Primary muscle tags. Format as:

| Muscle Group | Sets/Week | Min | Target | Optimal | Status |
|---|---|---|---|---|---|
| Chest | 16 | 10 | 16-20 | 12-20 | ✅ |
| Calves | 18 | 8 | 16-22 | 12-22 (priority) | ✅ |

**Volume targets by training approach (natural lifters):**

| Approach | Major Muscles | Medium Muscles |
|----------|--------------|----------------|
| Push Hard | 16-20 sets/week | 12-16 sets/week |
| Balanced | 12-16 sets/week | 10-14 sets/week |
| Conservative | 10-12 sets/week | 8-10 sets/week |

Major = Chest, Lats, Upper Back, Quads, Hamstrings, Glutes
Medium = Side Delts, Biceps, Triceps, Calves

Going above 20 sets/week for any muscle group has diminishing returns for natural lifters.

**Priority muscle groups:** Increase toward 16-22 sets/week. Reduce non-priority muscles toward minimums to keep total stress recoverable.

**Exempt muscles (can show 0 direct sets):** Front Delts, Traps, Rear Delts, Forearms — these get sufficient indirect work from compounds. Core may be exempt for short programs but should be included in longer programs.

**Experience-scaled minimums:**

| Level | Major Muscles | Medium Muscles |
|-------|--------------|----------------|
| Beginner | 6-8 sets/week | 6 sets/week |
| Intermediate | 8-10 sets/week | 6-8 sets/week |
| Advanced | 10-12 sets/week | 8-10 sets/week |

**Status indicators:**
- ✅ = within target range
- ⚠️ LOW = below minimum — must fix before presenting
- ⚠️ HIGH = above 20 sets — diminishing returns unless priority muscle
- ℹ️ CONSTRAINED = above minimum but below target due to split/schedule. Must explain in Recommendations.

If any non-exempt muscle is below minimum, revise the plan before presenting. If Push Hard targets aren't met and a practical fix exists (add a superset, swap an exercise), implement it rather than flagging. A Push Hard program where most muscles sit at the floor of their target range is underdelivering — aim for the upper half.

After verifying ranges, check distribution balance — avoid some muscles maxed out while others sit at the floor.`;
                    
                    await Clipboard.setStringAsync(planningPrompt);
                    setPlanningPromptCopied(true);
                    setTimeout(() => {
                      setPlanningPromptCopied(false);
                    }, 2000);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="copy-outline" size={18} color="#0a0a0b" />
                  <Text style={styles.actionButtonText}>
                    {planningPromptCopied ? 'Copied!' : 'Copy Planning Prompt'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.stepCard}>
                <View style={styles.stepCardHeader}>
                  <View style={[styles.stepBadge, { backgroundColor: themeColor }]}>
                    <Text style={styles.stepBadgeText}>2</Text>
                  </View>
                  <Text style={styles.stepCardTitle}>Generate Workout</Text>
                </View>
                <Text style={styles.stepCardDescription}>
                  Send this prompt to convert your plan to a JSON format
                </Text>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: themeColor }]}
                  onPress={async () => {
                    const questionnaireData = await loadQuestionnaireData();
                    const prompt = getAIPrompt(questionnaireData);
                    await Clipboard.setStringAsync(prompt);
                    setAiPromptCopied(true);
                    setTimeout(() => {
                      setAiPromptCopied(false);
                    }, 2000);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sparkles" size={18} color="#0a0a0b" />
                  <Text style={styles.actionButtonText}>
                    {aiPromptCopied ? 'Copied!' : 'Copy AI Prompt'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.stepCard}>
                <View style={styles.stepCardHeader}>
                  <View style={[styles.stepBadge, { backgroundColor: themeColor }]}>
                    <Text style={styles.stepBadgeText}>3</Text>
                  </View>
                  <Text style={styles.stepCardTitle}>Import & Train</Text>
                </View>
                <Text style={styles.stepCardDescription}>
                  Copy the JSON file your AI created and paste it in
                </Text>
              </View>
            </View>
          
          {/* Separator */}
          <View style={styles.sectionSeparator} />
          
          <View style={styles.tutorialSection}>
            <Text style={styles.tutorialSectionTitle}>Need Help?</Text>
            <TouchableOpacity 
              style={[styles.tutorialButton, { backgroundColor: themeColor }]}
              onPress={() => {
                // Open YouTube tutorial
                const url = 'https://youtube.com/shorts/_l6E9sX-9QQ';
                Linking.openURL(url);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={18} color="#ffffff" />
              <Text style={styles.tutorialButtonText}>Watch Tutorial</Text>
              <Text style={styles.tutorialButtonSubtext}>30 seconds</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }


  if (errorMessage) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorHeader}>
          <View style={{ width: 44 }} />
          <TouchableOpacity 
            onPress={() => setErrorMessage(null)} 
            style={styles.closeButton}
          >
            <Ionicons name="close" size={28} color="#71717a" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.errorContent}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Format Error</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          
          <TouchableOpacity
            style={[styles.copyErrorButton, { backgroundColor: themeColor }]}
            onPress={async () => {
              const debugMessage = `I got this error when trying to import my workout: "${errorMessage}". Please fix the JSON and make sure it follows the exact format.`;
              await Clipboard.setStringAsync(debugMessage);
              
              // Just dismiss error - no copied screen needed
              setErrorMessage(null);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="copy-outline" size={20} color="#0a0a0b" />
            <Text style={styles.copyErrorText}>Copy Error for AI</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.closeButtonWrapper}>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#71717a" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Mode toggle - positioned above the main button */}
          <TouchableOpacity 
            style={[styles.modeToggle, { borderColor: themeColor }]}
            onPress={() => setUploadMode(!uploadMode)}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={uploadMode ? "clipboard-outline" : "cloud-upload-outline"} 
              size={20} 
              color={themeColor} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.mainButton, { backgroundColor: themeColor, shadowColor: themeColor }]}
            onPress={uploadMode ? handleFileUpload : handlePasteAndImport}
            activeOpacity={0.9}
          >
            <Ionicons 
              name={uploadMode ? "cloud-upload" : "clipboard"} 
              size={40} 
              color="#0a0a0b" 
            />
            <Text style={styles.mainButtonText}>
              {uploadMode ? "Upload File" : "Paste & Import"}
            </Text>
            <Text style={styles.mainButtonSubtext}>
              {uploadMode ? "Choose JSON file from device" : "Paste your workout JSON"}
            </Text>
          </TouchableOpacity>

          <View style={styles.orSection}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('SampleWorkouts')}
            activeOpacity={0.9}
          >
            <Text style={styles.secondaryButtonText}>Try Sample Programs</Text>
          </TouchableOpacity>

        </View>

        {/* Move help link to bottom of screen */}
        <View style={styles.helpLinkWrapper}>
          <TouchableOpacity 
            style={styles.helpLink}
            onPress={() => setShowInstructions(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.helpLinkText, { color: themeColor }]}>How to create a custom program with AI?</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showConfirmation}
        transparent
        animationType="none"
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            { opacity: modalOpacity }
          ]}
        >
          <Animated.View 
            style={[
              styles.modalContent,
              { 
                transform: [{ scale: modalScale }],
                opacity: modalOpacity,
                borderColor: themeColor,
                shadowColor: themeColor,
              }
            ]}
          >
            {/* Navigation Button */}
            <View style={showAddMoreMode ? styles.backButtonWrapper : styles.closeButtonWrapper}>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={showAddMoreMode ? handleBackToConfirmation : handleModalCancel}
                activeOpacity={0.8}
              >
                <Ionicons name={showAddMoreMode ? "arrow-back" : "close"} size={24} color="#71717a" />
              </TouchableOpacity>
            </View>

            {showAddMoreMode ? (
                // Add More Files Interface
                <>
                  <View style={styles.addMoreHeader}>
                    <Text style={styles.addMoreTitle}>Add More Files</Text>
                    <View style={[styles.programPartsBadge, { backgroundColor: '#10b981' + '1A', borderColor: '#10b981' }]}>
                      <Ionicons name="layers" size={16} color="#10b981" />
                      <Text style={[styles.programPartsText, { color: '#10b981' }]}>
                        {accumulatedPrograms.length} part{accumulatedPrograms.length !== 1 ? 's' : ''} combined
                      </Text>
                    </View>
                  </View>

                  <View style={styles.addMoreContent}>
                    {/* Mode Toggle - positioned above the main button */}
                    <TouchableOpacity 
                      style={[styles.modeToggleInModal, { borderColor: themeColor }]}
                      onPress={() => setUploadMode(!uploadMode)}
                      activeOpacity={0.8}
                    >
                      <Ionicons 
                        name={uploadMode ? "clipboard-outline" : "cloud-upload-outline"} 
                        size={20} 
                        color={themeColor} 
                      />
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.addMoreButton, { backgroundColor: themeColor, shadowColor: themeColor }]}
                      onPress={uploadMode ? handleFileUpload : handlePasteAndImport}
                      activeOpacity={0.9}
                    >
                      <Ionicons 
                        name={uploadMode ? "cloud-upload" : "clipboard"} 
                        size={40} 
                        color="#0a0a0b" 
                      />
                      <Text style={styles.addMoreButtonText}>
                        {uploadMode ? "Upload File" : "Paste & Import"}
                      </Text>
                      <Text style={styles.addMoreButtonSubtext}>
                        {uploadMode ? "Choose JSON file from device" : "Paste your next workout JSON"}
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.addMoreHint}>
                      This will be combined with your existing program
                    </Text>
                  </View>
                </>
              ) : (
                // Confirmation Interface
                <>
                  {/* Header Badge */}
                  <View style={styles.headerBadgeContainer}>
                    {generationTime && (
                      <View style={[styles.headerBadge, { backgroundColor: themeColor + '1A', borderColor: themeColor }]}>
                        <Text style={[styles.badgeText, { color: themeColor }]}>Generated in {generationTime.toFixed(2)}s</Text>
                      </View>
                    )}
                    {accumulatedPrograms.length > 1 && (
                      <View style={[styles.headerBadge, { backgroundColor: '#10b981' + '1A', borderColor: '#10b981', marginTop: 8 }]}>
                        <Text style={[styles.badgeText, { color: '#10b981' }]}>{accumulatedPrograms.length} programs combined</Text>
                      </View>
                    )}
                  </View>

                  {/* Main Content */}
                  <View style={styles.mainContent}>
                    <Text style={styles.title}>Workout Ready</Text>
                    <Text style={styles.routineName}>{parsedProgram?.routine_name}</Text>
                    
                    {/* Program Summary */}
                    <View style={styles.summaryCard}>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Training Days</Text>
                        <Text style={[styles.summaryValue, { color: themeColor }]}>{parsedProgram?.days_per_week} per week</Text>
                      </View>
                      <View style={styles.summaryDivider} />
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Total Duration</Text>
                        <Text style={[styles.summaryValue, { color: themeColor }]}>
                          {parsedProgram?.blocks.reduce((total, block) => {
                            const weeks = block.weeks.includes('-') 
                              ? parseInt(block.weeks.split('-')[1]) - parseInt(block.weeks.split('-')[0]) + 1
                              : parseInt(block.weeks);
                            return total + weeks;
                          }, 0)} weeks
                        </Text>
                      </View>
                      <View style={styles.summaryDivider} />
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Unique Movements</Text>
                        <Text style={[styles.summaryValue, { color: themeColor }]}>
                          {(() => {
                            const uniqueExercises = new Set();
                            parsedProgram?.blocks.forEach(block => 
                              block.days.forEach(day => 
                                day.exercises.forEach(exercise => {
                                  // Get exercise name based on type
                                  const name = exercise.type === 'strength' ? exercise.exercise :
                                              exercise.type === 'cardio' ? exercise.activity :
                                              exercise.type === 'stretch' ? exercise.exercise :
                                              exercise.type === 'circuit' ? exercise.circuit_name :
                                              exercise.type === 'sport' ? exercise.activity : 'Unknown';
                                  uniqueExercises.add(name);
                                })
                              )
                            );
                            return uniqueExercises.size;
                          })()} movements
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Action Buttons */}
                  <View style={styles.actionSection}>
                    <TouchableOpacity
                      style={[styles.createButton, { backgroundColor: themeColor }]}
                      onPress={handleConfirmImport}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.createButtonText}>Start Training</Text>
                    </TouchableOpacity>

                    {accumulatedPrograms.length > 0 && (
                      <TouchableOpacity
                        style={[styles.secondaryActionButton, { borderColor: themeColor, marginTop: 12, marginBottom: 0 }]}
                        onPress={handleAddMoreFiles}
                        activeOpacity={0.9}
                      >
                        <Ionicons name="add-outline" size={20} color={themeColor} />
                        <Text style={[styles.secondaryActionButtonText, { color: themeColor }]}>Add More Files</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#71717a',
  },
  closeButtonWrapper: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  backButtonWrapper: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.1)',
    zIndex: 3,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  modeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 20,
    alignSelf: 'center',
  },
  mainButton: {
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 48,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  mainButtonText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0a0a0b',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  mainButtonSubtext: {
    fontSize: 16,
    color: '#0a0a0b',
    opacity: 0.8,
    marginTop: 8,
  },
  orSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 48,
    width: '100%',
    maxWidth: 200,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#27272a',
  },
  orText: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
    paddingHorizontal: 20,
    letterSpacing: 1,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 32,
    marginBottom: 32,
    minWidth: 240,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e4e4e7',
    letterSpacing: 0.3,
  },
  helpLinkWrapper: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
  },
  helpLink: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  helpLinkText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#71717a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  modalContent: {
    backgroundColor: '#0a0a0b',
    borderRadius: 20,
    borderWidth: 1,
    padding: 0,
    width: '100%',
    maxWidth: 420,
    overflow: 'hidden',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#a1a1aa',
    fontWeight: '400',
    lineHeight: 18,
  },
  headerBadgeContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  headerBadge: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  mainContent: {
    paddingHorizontal: 28,
    paddingVertical: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#a1a1aa',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  routineName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 38,
  },
  summaryCard: {
    backgroundColor: 'rgba(39, 39, 42, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(113, 113, 122, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: '100%',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(113, 113, 122, 0.2)',
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a1a1aa',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionSection: {
    paddingHorizontal: 28,
    paddingBottom: 28,
    paddingTop: 8,
  },
  createButton: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a0a0b',
    letterSpacing: 0.5,
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 2,
    backgroundColor: 'transparent',
    gap: 8,
  },
  secondaryActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  addMoreHeader: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 20,
  },
  addMoreTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  programPartsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  programPartsText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  addMoreContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  modeToggleInModal: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 20,
  },
  addMoreButton: {
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 48,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
    marginBottom: 20,
  },
  addMoreButtonText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0a0a0b',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  addMoreButtonSubtext: {
    fontSize: 16,
    color: '#0a0a0b',
    opacity: 0.8,
    marginTop: 8,
    textAlign: 'center',
  },
  addMoreHint: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  instructionsContainer: {
    flex: 1,
  },
  instructionsScrollView: {
    flex: 1,
  },
  instructionsContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  stepsContainer: {
    gap: 16,
  },
  stepCard: {
    backgroundColor: '#18181b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 20,
  },
  stepCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a0a0b',
  },
  stepCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  stepCardDescription: {
    fontSize: 14,
    color: '#71717a',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#0a0a0b',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#27272a',
    marginVertical: 24,
  },
  sectionSeparator: {
    height: 40,
  },
  tutorialSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 40,
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  tutorialSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
    marginBottom: 16,
    textAlign: 'center',
  },
  tutorialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  tutorialButtonText: {
    fontSize: 16,
    color: '#0a0a0b',
    fontWeight: '600',
  },
  tutorialButtonSubtext: {
    fontSize: 12,
    color: '#0a0a0b',
    opacity: 0.7,
    marginLeft: 4,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  errorHeader: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  copyErrorButton: {
    flexDirection: 'row',
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  copyErrorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
});