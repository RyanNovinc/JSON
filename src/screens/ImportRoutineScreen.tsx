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
import { assemblePlanningPrompt, ProgramContext } from '../data/planningPrompt';
import { ProgramStorage, Program, MesocyclePhase } from '../data/programStorage';
import { extractMesocycleSummary } from '../data/mesocycleExtractor';
import { WorkoutStorage } from '../utils/storage';
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
  const [reviewPromptCopied, setReviewPromptCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sampleCopied, setSampleCopied] = useState(false);
  const [modalScale] = useState(new Animated.Value(0));
  const [modalOpacity] = useState(new Animated.Value(0));
  const [successScale] = useState(new Animated.Value(0));
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [uploadMode, setUploadMode] = useState(false);

  // Mesocycle state
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
  const [mesocycleContext, setMesocycleContext] = useState<ProgramContext | null>(null);
  const [planText, setPlanText] = useState<string>('');
  const [showPlanInput, setShowPlanInput] = useState(false);
  const [planInputCopied, setPlanInputCopied] = useState(false);
  const [roadmapSaved, setRoadmapSaved] = useState(false);

  // Handle schema version migration on component mount
  useEffect(() => {
    handleSchemaMigration();
  }, []);

  // Load current program and mesocycle context
  useEffect(() => {
    loadMesocycleContext();
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
        
        // Clean up Programs with invalid mesocycle counts (from before recent fixes)
        await cleanupInvalidPrograms();
        
        // Set new schema version
        await AsyncStorage.setItem('schemaVersion', '2.0');
      }
    } catch (error) {
      console.error('Schema migration failed:', error);
    }
  };

  // Clean up Programs with invalid mesocycle counts from before recent fixes
  const cleanupInvalidPrograms = async () => {
    try {
      const programs = await ProgramStorage.loadPrograms();
      let cleaned = false;
      
      for (const program of programs) {
        if (program.totalMesocycles > 5) {
          // Fix or delete programs with excessive mesocycle counts
          let correctedCount: number;
          
          switch (program.programDuration) {
            case '1_year':
              correctedCount = 3;
              break;
            case '6_months':
              correctedCount = 2;
              break;
            case 'custom':
              correctedCount = 3;
              break;
            default:
              // Delete programs with unknown durations
              await ProgramStorage.deleteProgram(program.id);
              console.log(`Deleted invalid program: ${program.id} (duration: ${program.programDuration})`);
              cleaned = true;
              continue;
          }
          
          // Update program with corrected mesocycle count
          await ProgramStorage.updateProgram(program.id, {
            totalMesocycles: correctedCount,
            // Also reset current mesocycle if it exceeds the new total
            currentMesocycle: Math.min(program.currentMesocycle, correctedCount)
          });
          console.log(`Fixed program ${program.id}: ${program.totalMesocycles} → ${correctedCount} mesocycles`);
          cleaned = true;
        }
      }
      
      if (cleaned) {
        console.log('Program cleanup completed');
      }
    } catch (error) {
      console.error('Program cleanup failed:', error);
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


    // Keep the original program name from the first program, but strip mesocycle suffix when combining multiple mesocycles
    let combinedName = programs[0].routine_name;
    if (programs.length > 1) {
      // Strip " — Mesocycle X" suffix for combined programs
      combinedName = combinedName.replace(/\s*—\s*Mesocycle\s+\d+$/i, '');
    }
    
    // Keep the original description from the first program
    const combinedDescription = programs[0].description || '';

    // Merge all blocks preserving original week numbers
    const mergedBlocks = [];

    for (const program of programs) {
      for (const block of program.blocks) {
        // Keep original week numbers as designed by AI - don't recalculate
        const mergedBlock = {
          ...block,
          // Preserve original weeks field - AI designed these to be consecutive 
          block_name: programs.length > 1 ? `${block.block_name} (Part ${programs.indexOf(program) + 1})` : block.block_name
        };
        
        mergedBlocks.push(mergedBlock);
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
      try {
        // Handle mesocycle program association if applicable
        await handleMesocycleProgramAssociation(parsedProgram);

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
          ]).start(async () => {
            setShowConfirmation(false);
            modalScale.setValue(0);
            modalOpacity.setValue(0);
            successScale.setValue(0);
            
            // Reset accumulated programs after successful import
            setAccumulatedPrograms([]);
            
            // Check for mesocycle completion before navigating
            await checkMesocycleCompletion();
            
            navigation.navigate('Main', { 
              screen: 'Home',
              params: { importedProgram: parsedProgram }
            } as any);
          });
        }, 500);
      } catch (error) {
        console.error('Error during import:', error);
        Alert.alert('Import Error', 'There was an error associating this import with your program. The import will continue normally.');
        
        // Continue with normal import flow
        navigation.navigate('Main', { 
          screen: 'Home',
          params: { importedProgram: parsedProgram }
        } as any);
      }
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

  // Mesocycle helper functions
  const loadMesocycleContext = async () => {
    try {
      const questionnaireData = await loadQuestionnaireData();
      const duration = questionnaireData.programDuration || '12_weeks';
      const isLongProgram = ['6_months', '1_year', 'custom'].includes(duration);
      
      if (isLongProgram) {
        // Find existing program for this user based on duration
        const programs = await ProgramStorage.loadPrograms();
        // Find the most recently created program for this duration to avoid duplicates
        const matchingPrograms = programs.filter(p => p.programDuration === duration);
        const existingProgram = matchingPrograms.length > 0 ? 
          matchingPrograms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] : 
          null;
        
        if (existingProgram) {
          setCurrentProgram(existingProgram);
          
          // Create mesocycle context
          const context: ProgramContext = {
            totalMesocycles: existingProgram.totalMesocycles,
            currentMesocycle: existingProgram.currentMesocycle,
            mesocycleWeeks: Math.floor(getDurationWeeks(duration) / existingProgram.totalMesocycles),
            mesocycleBlocks: Math.floor(existingProgram.mesocycleRoadmap.length > 0 ? 
              existingProgram.mesocycleRoadmap[0].blocks : calculateDefaultBlocks(duration)),
            mesocycleRoadmapText: existingProgram.mesocycleRoadmapText,
            previousMesocycleSummary: existingProgram.completedMesocycles.length > 0 ? 
              existingProgram.completedMesocycles[existingProgram.completedMesocycles.length - 1] : undefined
          };
          setMesocycleContext(context);
        }
      }
    } catch (error) {
      console.error('Failed to load mesocycle context:', error);
    }
  };

  const getDurationWeeks = (duration: string): number => {
    switch (duration) {
      case '6_months': return 26;
      case '1_year': return 52;
      case 'custom': return 52; // Default fallback
      default: return 12;
    }
  };

  const calculateDefaultBlocks = (duration: string): number => {
    switch (duration) {
      case '6_months': return 2;
      case '1_year': return 3;
      case 'custom': return 3;
      default: return 2;
    }
  };

  const parseMesocycleRoadmap = (planText: string): {
    roadmapText: string;
    roadmapData: MesocyclePhase[];
  } => {
    // Extract roadmap section
    const roadmapMatch = planText.match(/### Mesocycle Roadmap\s*([\s\S]*?)(?=### |<!-- END PLAN -->|$)/);
    const roadmapText = roadmapMatch ? roadmapMatch[1].trim() : '';
    
    // Parse roadmap table
    const roadmapData: MesocyclePhase[] = [];
    const tableLines = roadmapText.split('\n').filter(line => line.includes('|') && !line.includes('---'));
    
    tableLines.forEach((line, index) => {
      if (index === 0) return; // Skip header
      
      const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
      if (cells.length >= 6) {
        const mesocycleNum = parseInt(cells[0]);
        if (isNaN(mesocycleNum) || mesocycleNum <= 0) return; // Skip bad rows
        
        roadmapData.push({
          mesocycleNumber: mesocycleNum,
          phaseName: cells[1],
          repFocus: cells[2],
          emphasis: cells[3],
          weeks: parseInt(cells[4]) || 12,
          blocks: parseInt(cells[5]) || 2
        });
      }
    });

    return { roadmapText, roadmapData };
  };

  const handlePlanTextSubmit = async () => {
    try {
      const { roadmapText, roadmapData } = parseMesocycleRoadmap(planText);
      
      if (!roadmapText) {
        Alert.alert('No Roadmap Found', 'Could not find a Mesocycle Roadmap section in the pasted text.');
        return;
      }

      const questionnaireData = await loadQuestionnaireData();
      const duration = questionnaireData.programDuration || '12_weeks';
      
      if (currentProgram) {
        // Update existing program
        await ProgramStorage.updateMesocycleRoadmap(currentProgram.id, roadmapText, roadmapData);
        const updatedProgram = await ProgramStorage.getProgram(currentProgram.id);
        if (updatedProgram) {
          setCurrentProgram(updatedProgram);
        }
      } else {
        // Create new program
        const newProgram: Program = {
          id: Date.now().toString(),
          name: `${duration} Mesocycle Program`,
          createdAt: new Date().toISOString(),
          programDuration: duration,
          totalMesocycles: Math.min(roadmapData.length, 5) || calculateDefaultMesocycles(duration),
          currentMesocycle: 1,
          mesocycleRoadmap: roadmapData,
          mesocycleRoadmapText: roadmapText,
          completedMesocycles: [],
          routineIds: []
        };
        
        await ProgramStorage.addProgram(newProgram);
        setCurrentProgram(newProgram);
      }
      
      setRoadmapSaved(true);
      setPlanText('');
      setShowPlanInput(false);
      
      setTimeout(() => {
        setRoadmapSaved(false);
      }, 3000);
      
      // Reload context
      await loadMesocycleContext();
    } catch (error) {
      console.error('Failed to save roadmap:', error);
      Alert.alert('Error', 'Failed to save roadmap. Please try again.');
    }
  };

  // Extract mesocycle info from routine name
  const extractMesocycleInfo = (routineName: string): { mesocycleNumber: number; totalMesocycles: number } | null => {
    // Try to match patterns like "Mesocycle 3", "Mesocycle 2 of 3", "— Mesocycle 3", etc.
    const mesocycleMatch = routineName.match(/mesocycle\s+(\d+)(?:\s+of\s+(\d+))?/i);
    
    if (mesocycleMatch) {
      const currentMesocycle = parseInt(mesocycleMatch[1]);
      let totalMesocycles = mesocycleMatch[2] ? parseInt(mesocycleMatch[2]) : null;
      
      // If no explicit total, infer from context
      if (!totalMesocycles) {
        // If we see "Mesocycle 3", assume it's likely a 3-mesocycle program
        // This is heuristic-based but reasonable for most programs
        totalMesocycles = Math.max(currentMesocycle, 3); // At least 3, could be more
      }
      
      return {
        mesocycleNumber: currentMesocycle,
        totalMesocycles: Math.min(totalMesocycles, 5) // Cap at 5 for safety
      };
    }
    
    return null;
  };

  const calculateDefaultMesocycles = (duration: string): number => {
    switch (duration) {
      case '6_months': return 2;
      case '1_year': return 3;
      case 'custom': return 3;
      default: return 1;
    }
  };

  const handleMesocycleProgramAssociation = async (importedProgram: WorkoutProgram) => {
    try {
      const questionnaireData = await loadQuestionnaireData();
      const duration = questionnaireData.programDuration || '12_weeks';
      const isLongProgram = ['6_months', '1_year', 'custom'].includes(duration);
      
      // First, try to detect mesocycle info from the routine name
      const mesocycleInfo = extractMesocycleInfo(importedProgram.routine_name);
      
      // If we detected mesocycle info OR it's a long program, handle mesocycles
      if (!mesocycleInfo && !isLongProgram) {
        return; // No mesocycle handling for short programs without mesocycle info
      }

      let program = currentProgram;
      
      // Create program if it doesn't exist
      if (!program) {
        // Don't pre-create empty mesocycles - let them be created as blocks are imported
        const totalMesocycles = mesocycleInfo ? 
          mesocycleInfo.mesocycleNumber : // Only track up to the current imported mesocycle
          calculateDefaultMesocycles(duration);
          
        const currentMesocycle = mesocycleInfo ? 
          mesocycleInfo.mesocycleNumber : 
          1;
        
        program = {
          id: Date.now().toString(),
          name: mesocycleInfo ? 
            `${importedProgram.routine_name.split('—')[0].trim()} Program` :
            `${duration} Mesocycle Program`,
          createdAt: new Date().toISOString(),
          programDuration: duration,
          totalMesocycles,
          currentMesocycle,
          mesocycleRoadmap: [],
          mesocycleRoadmapText: '',
          completedMesocycles: [],
          routineIds: []
        };
        
        await ProgramStorage.addProgram(program);
        setCurrentProgram(program);
      }

      // Associate the imported routine with the program
      // Only set mesocycleNumber for individual mesocycle imports (when mesocycleInfo exists)
      // For full program imports, leave mesocycleNumber undefined so blocks get distributed
      importedProgram.programId = program.id;
      if (mesocycleInfo) {
        importedProgram.mesocycleNumber = mesocycleInfo.mesocycleNumber;
      }
      // Don't set mesocycleNumber for full program imports - let BlocksScreen distribute them
      
    } catch (error) {
      console.error('Error in mesocycle program association:', error);
      throw error;
    }
  };


  const checkMesocycleCompletion = async () => {
    try {
      if (!currentProgram || !mesocycleContext) {
        return;
      }

      // Calculate expected blocks for current mesocycle
      const expectedBlocks = mesocycleContext.mesocycleBlocks * mesocycleContext.currentMesocycle;
      const currentBlocks = currentProgram.routineIds.length;
      
      // Check if mesocycle is complete
      if (currentBlocks >= mesocycleContext.mesocycleBlocks) {
        // Get routines for current mesocycle
        const routines = await WorkoutStorage.loadRoutines();
        const mesocycleRoutines = routines.filter(r => 
          currentProgram.routineIds.includes(r.id)
        ).slice(-mesocycleContext.mesocycleBlocks); // Get last N blocks

        if (mesocycleRoutines.length === mesocycleContext.mesocycleBlocks) {
          // Extract mesocycle summary
          const currentPhase = currentProgram.mesocycleRoadmap[mesocycleContext.currentMesocycle - 1];
          const phaseName = currentPhase?.phaseName || `Mesocycle ${mesocycleContext.currentMesocycle}`;
          
          const summary = extractMesocycleSummary(mesocycleRoutines, phaseName);
          summary.mesocycleNumber = mesocycleContext.currentMesocycle;

          // Complete the mesocycle
          await ProgramStorage.completeMesocycle(currentProgram.id, summary);
          
          // Show completion message
          const isLastMesocycle = mesocycleContext.currentMesocycle >= mesocycleContext.totalMesocycles;
          
          if (isLastMesocycle) {
            Alert.alert(
              'Program Complete! 🎉',
              `Congratulations! You've completed all ${mesocycleContext.totalMesocycles} mesocycles of your program.`,
              [{ text: 'Awesome!' }]
            );
          } else {
            Alert.alert(
              'Mesocycle Complete! ✅',
              `Mesocycle ${mesocycleContext.currentMesocycle} complete. When you're ready, copy the planning prompt to start Mesocycle ${mesocycleContext.currentMesocycle + 1}.`,
              [{ text: 'Got it!' }]
            );
          }

          // Reload context to reflect the changes
          await loadMesocycleContext();
        }
      }
    } catch (error) {
      console.error('Error checking mesocycle completion:', error);
      // Don't throw - this is not critical to the import flow
    }
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

  // Build dynamic profile text from questionnaire data
  const buildProfileText = (data: QuestionnaireData): string => {
    const lines: string[] = [];

    // Mapping tables
    const primaryGoalMap: { [key: string]: string } = {
      'burn_fat': 'Burn Fat (lose weight while preserving muscle)',
      'build_muscle': 'Muscle Building (gain lean mass and size)', 
      'gain_strength': 'Strength Training (increase power and max lifts)',
      'body_recomposition': 'Body Recomposition (lose fat and gain muscle simultaneously)',
      'sport_specific': 'Sport-Specific Training (train for {sport_name})',
      'general_fitness': 'General Fitness (overall health and wellness)',
      'custom_primary': 'Custom Goal'
    };

    const secondaryGoalMap: { [key: string]: string } = {
      'include_cardio': 'Include Cardiovascular Training',
      'maintain_flexibility': 'Include Flexibility & Mobility Work', 
      'athletic_performance': 'Improve Athletic Performance',
      'injury_prevention': 'Include Injury Prevention Work',
      'fun_social': 'Include Fun & Social Activities',
      'custom_secondary': 'Custom Focus'
    };

    const primaryLabelMap: { [key: string]: string } = {
      'build_muscle': 'Muscle Building',
      'burn_fat': 'Fat Loss Training',
      'gain_strength': 'Strength Training', 
      'body_recomposition': 'Resistance Training',
      'sport_specific': 'Sport-Specific Training',
      'general_fitness': 'General Training',
      'custom_primary': 'Training'
    };

    const experienceMap: { [key: string]: string } = {
      'beginner': 'Beginner (under 1 year, still learning form and building base fitness)',
      'intermediate': 'Intermediate (1-2 years, good technique, consistent progression)',
      'advanced': 'Advanced (2+ years, excellent technique, slow progression)'
    };

    const approachMap: { [key: string]: string } = {
      'push_hard': 'Push Hard — target upper end of optimal volume ranges.',
      'balanced': 'Balanced — moderate volume, sustainable long-term.',
      'conservative': 'Conservative — lower volume, focus on recovery and consistency.'
    };

    const durationMap: { [key: string]: string } = {
      '4_weeks': '4 weeks (short training block)',
      '8_weeks': '8 weeks (standard training block)',
      '12_weeks': '12 weeks (full training cycle)',
      '16_weeks': '16 weeks (extended training cycle)',
      '6_months': '6 months (medium-term development plan)',
      '1_year': '1 year (long-term development plan)',
      'custom': data.customDuration ? `${data.customDuration} weeks` : 'Custom duration'
    };

    const equipmentMap: { [key: string]: string } = {
      'commercial_gym': 'Commercial Gym (full equipment access)',
      'home_gym': 'Home Gym (personal equipment setup)',
      'bodyweight': 'Bodyweight Only (no equipment)', 
      'basic_equipment': 'Basic Equipment (dumbbells, resistance bands)'
    };

    const sessionLengthMap: { [key: string]: string } = {
      '30': '30 minutes',
      '45': '45 minutes', 
      '60': '60 minutes',
      '75': '75 minutes',
      '90': '90 minutes',
      'custom': data.customDuration ? `${data.customDuration} minutes` : 'Custom duration',
      'ai_suggest': 'Not specified — let AI suggest optimal duration based on goal and experience.'
    };

    const restTimeMap: { [key: string]: string } = {
      'optimal': 'Optimal rest times — prioritize maximum results regardless of session length.',
      'shorter': 'Shorter rest times — reduced rest (~25% less) for time efficiency.',
      'minimal': 'Minimal rest times — time efficient, higher intensity.',
      'ai_choose': 'Not specified — use evidence-based defaults.'
    };

    const noteDetailMap: { [key: string]: string } = {
      'detailed': 'Detailed instructions for each exercise.',
      'brief': 'Brief technique cues only.',
      'minimal': 'Only non-obvious technique tips or specific setup instructions.'
    };

    // Primary Goal
    let goalText = primaryGoalMap[data.primaryGoal || ''] || 'Not specified';
    if (data.primaryGoal === 'custom_primary' && data.customGoals) {
      goalText += ` — "${data.customGoals}"`;
    }
    if (data.primaryGoal === 'sport_specific' && data.specificSport) {
      goalText = goalText.replace('{sport_name}', data.specificSport);
    }
    lines.push(`**Primary Goal:** ${goalText}`);

    // Secondary Goals
    if (data.secondaryGoals && data.secondaryGoals.length > 0) {
      const goalTexts = data.secondaryGoals.map(g => {
        if (g === 'custom_secondary') {
          return `Custom Focus — "${data.customGoals || 'No description provided'}"`;
        }
        return secondaryGoalMap[g] || g;
      });
      lines.push(`**Secondary Goals:** ${goalTexts.join(', ')}`);
    } else {
      lines.push(`**Secondary Goals:** None selected`);
    }

    lines.push(''); // blank line

    // Training Schedule
    lines.push('**Training Schedule:**');
    lines.push(`- Total training days per week: ${data.totalTrainingDays || 'Not specified'}`);
    
    const primaryLabel = primaryLabelMap[data.primaryGoal || ''] || 'Training';
    lines.push(`- ${primaryLabel} days: ${data.gymTrainingDays || 'Not specified'}`);
    
    if (data.otherTrainingDays && data.otherTrainingDays > 0) {
      const secondaryLabels = [];
      if (data.secondaryGoals) {
        data.secondaryGoals.forEach(goal => {
          if (goal === 'include_cardio') secondaryLabels.push('cardiovascular training');
          if (goal === 'maintain_flexibility') secondaryLabels.push('flexibility');
          if (goal === 'athletic_performance') secondaryLabels.push('athletic performance');
          if (goal === 'injury_prevention') secondaryLabels.push('injury prevention');
          if (goal === 'fun_social') secondaryLabels.push('fun & social');
        });
      }
      const secondaryLabel = secondaryLabels.join(', ') || 'additional focus';
      lines.push(`- Additional focus days (${secondaryLabel}): ${data.otherTrainingDays}`);
    }

    lines.push(''); // blank line

    // Experience & Approach  
    lines.push(`**Training Experience:** ${experienceMap[data.trainingExperience || ''] || 'Not specified'}`);
    lines.push(`**Training Approach:** ${approachMap[data.trainingApproach || ''] || 'Not specified'}`);

    lines.push(''); // blank line

    // Duration
    lines.push(`**Program Duration:** ${durationMap[data.programDuration || ''] || 'Not specified'}`);

    // Conditional: Cardio activities
    if (data.secondaryGoals?.includes('include_cardio') && data.cardioPreferences && data.cardioPreferences.length > 0) {
      const activityMap: { [key: string]: string } = {
        'treadmill': 'Treadmill / Indoor Running',
        'stationary_bike': 'Stationary Bike / Cycling', 
        'rowing_machine': 'Rowing Machine',
        'swimming': 'Swimming',
        'stair_climber': 'Stair Climber / StepMill',
        'elliptical': 'Elliptical',
        'jump_rope': 'Jump Rope',
        'outdoor_running': 'Outdoor Running / Walking',
        'no_preference': 'No Preference (AI chooses)'
      };
      const activities = data.cardioPreferences.map(a => activityMap[a] || a);
      lines.push(`**Preferred Cardio Activities:** ${activities.join(', ')}`);
    }

    // Conditional: Sport details
    if (data.primaryGoal === 'sport_specific' && data.specificSport) {
      const sportDetails = data.athleticPerformanceDetails || 'No additional details provided';
      lines.push(`**Sport:** ${data.specificSport} — "${sportDetails}"`);
    }

    // Conditional: Secondary goal details
    if (data.athleticPerformanceDetails && data.secondaryGoals?.includes('athletic_performance')) {
      lines.push(`**Athletic Performance Focus:** ${data.athleticPerformanceDetails}`);
    }
    if (data.injuryPreventionDetails && data.secondaryGoals?.includes('injury_prevention')) {
      lines.push(`**Injury Prevention Focus:** ${data.injuryPreventionDetails}`);
    }
    if (data.flexibilityDetails && data.secondaryGoals?.includes('maintain_flexibility')) {
      lines.push(`**Flexibility Focus:** ${data.flexibilityDetails}`);
    }
    if (data.funSocialDetails && data.secondaryGoals?.includes('fun_social')) {
      lines.push(`**Fun & Social Activities:** ${data.funSocialDetails}`);
    }

    lines.push(''); // blank line

    // Equipment
    const equipmentTypes = Array.isArray(data.selectedEquipment) ? data.selectedEquipment : 
                          data.selectedEquipment ? [data.selectedEquipment] : [];
    if (equipmentTypes.length > 0) {
      const equipmentTexts = equipmentTypes.map(e => equipmentMap[e] || e);
      lines.push(`**Available Equipment:** ${equipmentTexts.join(', ')}`);
    } else {
      lines.push(`**Available Equipment:** Not specified`);
    }
    
    if (data.specificEquipment) {
      lines.push(`**Specific Equipment:** ${data.specificEquipment}`);
    }
    if (data.unavailableEquipment) {
      lines.push(`**Unavailable Equipment:** ${data.unavailableEquipment}`);
    }

    // Session Length
    const sessionKey = data.useAISuggestion ? 'ai_suggest' : 
                       data.workoutDuration ? data.workoutDuration.toString() : 'custom';
    lines.push(`**Session Length:** ${sessionLengthMap[sessionKey] || 'Not specified'}`);

    // Heart Rate Monitor
    lines.push(`**Heart Rate Monitor:** ${data.hasHeartRateMonitor ? 'Available' : 'Not available'}`);

    // Rest Time Preference
    const restKey = data.useAIRestTime ? 'ai_choose' : data.restTimePreference || 'ai_choose';
    lines.push(`**Rest Time Preference:** ${restTimeMap[restKey] || 'Not specified — use evidence-based defaults.'}`);

    // Exercise Note Detail
    lines.push(`**Exercise Note Detail:** ${noteDetailMap[data.exerciseNoteDetail || 'minimal'] || 'Only non-obvious technique tips or specific setup instructions.'}`);

    lines.push(''); // blank line

    // Conditional fields
    if (data.priorityMuscleGroups && data.priorityMuscleGroups.length > 0) {
      const muscles = data.priorityMuscleGroups.concat(data.customMuscleGroup ? [data.customMuscleGroup] : []);
      lines.push(`**Priority Muscle Groups:** ${muscles.join(', ')}`);
    }

    if (data.movementLimitations && data.movementLimitations.length > 0) {
      const limitations = data.movementLimitations.concat(data.customLimitation ? [data.customLimitation] : []);
      lines.push(`**Movement Limitations:** ${limitations.join('. ')}`);
    }

    if (data.trainingStylePreference) {
      const style = data.customTrainingStyle || data.trainingStylePreference;
      lines.push(`**Training Style Preference:** ${style}`);
    }

    if (data.likedExercises) {
      lines.push(`**Liked Exercises:** ${data.likedExercises}`);
    }

    if (data.dislikedExercises) {
      lines.push(`**Disliked Exercises:** ${data.dislikedExercises}`);
    }

    return lines.join('\n');
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
                    
                    const planningPrompt = assemblePlanningPrompt(questionnaireData, mesocycleContext || undefined);
                    
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
                  <Text style={styles.stepCardTitle}>Review & Verify</Text>
                </View>
                <Text style={styles.stepCardDescription}>
                  Have your AI review each JSON block for quality
                </Text>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: themeColor }]}
                  onPress={async () => {
                    const reviewPrompt = `# Review Block

First, read the JSON file you just created so you have the full content in context. Then review it as an experienced coach auditing a program for a client. This is an independent quality gate — do not assume your self-check caught everything.

## Review Checklist

Work through each check. For each, state PASS or FAIL with a brief note.

### 1. Plan Fidelity
Compare the JSON against the training plan above:
- Every exercise listed in the plan for this block appears in the JSON
- Set counts match the plan
- Muscle tags (primaryMuscles, secondaryMuscles) match the plan
- Day structure and exercise order match the plan
- For diff-based blocks (5+ block programs), verify that all carried-over exercises from the base block are present — not just the swapped ones
- No exercises were added, removed, or renamed
- If the plan includes cardio or secondary goal days, the cardio entry matches the plan's Secondary Goal Summary (activities, rotation order, duration)
- **FAIL if** any exercise is missing, added, or has wrong sets/muscles, or cardio day doesn't match the plan

### 2. Rep Progression Logic
For each exercise, check reps_weekly across all weeks:
- Reps change meaningfully across weeks (not "10, 10, 10" every week for every exercise)
- **Compound exercises should trend flat-to-decreasing** over the block (linear/intensity progression)
- **Isolation exercises should trend flat-to-increasing** over the block (ascending density)
- Compound rep ranges match the block's stated focus (e.g., a "Strength: 5-8 reps" block shouldn't have compound exercises at 12-15). Isolation exercises can run 2-4 reps higher than the block's stated range.
- **FAIL if** more than half the exercises have identical reps every week (flat progression)
- **FAIL if** compounds trend upward or isolations trend downward (wrong direction)
- **FAIL if** compound rep ranges don't match the block's focus

### 3. Deload Weeks
If the block includes a deload week:
- sets_weekly for the deload week is ~40-50% lower than training weeks
- Reps in the deload week are 2-3 higher per set than training weeks
- ALL exercises have reduced volume on the deload week, not just some
- **FAIL if** deload volume reduction is less than 30% or greater than 60%
- **FAIL if** any exercise has unchanged volume on the deload week

### 4. Superset Integrity
- Superset exercises are adjacent in the exercises array
- Both exercises reference each other by exact name in their notes: "Superset with [name]"
- The first superset exercise (SS[n]a) has shorter rest (60-90s); the second (SS[n]b) has full rest for its exercise type
- **FAIL if** superset exercises are separated, cross-references are missing/mismatched, or rest encoding is wrong

### 5. Exercise Name Consistency
- Each exercise uses the exact same name string everywhere: in the exercise field, in superset notes, and across days if it appears more than once
- **FAIL if** any name varies (e.g., "Cable Overhead Extension" vs "Overhead Cable Extension")

### 6. Rest Periods
- Heavy compounds (squat, deadlift, barbell bench, barbell OHP): 150-180s rest
- Other compounds (rows, lunges, dumbbell presses, pull-ups, dips, leg press): 120-150s rest
- Isolation exercises: 60-90s rest
- restQuick ≈ 65% of rest (±5s tolerance)
- If the plan specifies shorter or minimal rest, verify adjustments are consistent
- **FAIL if** any heavy compound has rest <150s, any other compound has rest <120s, or any isolation has rest >90s (unless plan specifies non-default rest)

### 7. Muscle Tags
- All primaryMuscles and secondaryMuscles use exact taxonomy names: Chest, Front Delts, Side Delts, Rear Delts, Lats, Upper Back, Traps, Biceps, Triceps, Forearms, Quads, Hamstrings, Glutes, Calves, Core
- No exercise has an empty primaryMuscles array
- Tags follow the compound tagging guide (e.g., rows = Primary Upper Back, Lats | Secondary Biceps, Rear Delts)
- **FAIL if** any non-taxonomy name appears or primaryMuscles is empty

### 8. Schema Compliance
- Weekly keys are block-relative (start from "1")
- deload_weeks array is present and correct if the block has deloads; omitted entirely (not an empty array) if no deloads
- secondaryMuscles is \`[]\` (not omitted) when empty
- All required fields are present for each exercise type
- reps_weekly values are comma-separated per-set targets, not shorthand
- sets_weekly is present for every week in the block; training weeks match the \`sets\` field; deload weeks show reduced values
- No warm-up sets included
- **FAIL if** any schema violation

### 9. Volume Verification
Cross-reference the volume summary output after the block against the plan's Volume Targets table:
- Count total primary-tagged sets per muscle group across all days (use training week set counts, not deload)
- Compare against the volume targets from the plan
- **FAIL if** any non-exempt muscle group is below its stated minimum

### 10. Alternatives Check
- Every strength exercise has 2 alternatives (or 1 for bodyweight-only programs)
- Each alternative includes primaryMuscles and secondaryMuscles (secondaryMuscles can be \`[]\`)
- Alternatives target the same primary muscles as the main exercise
- **FAIL if** alternatives are missing, incomplete, or target different primary muscles

### 11. Duration Reasonableness
Check that estimated_duration values are reasonable:
- Days with more exercises/sets should have proportionally longer durations
- No training day should exceed 90 minutes (or 95 for Push Hard programs with heavy compound days) or fall below 30 minutes unless the plan explicitly specifies otherwise
- Cardio days should roughly match the prescribed activity duration + 10 min for warmup/cooldown
- **FAIL if** any day's duration seems unreasonable given its exercise count and set total (e.g., 8 exercises at 4 sets each with compound rest shouldn't show 45 minutes)

## Output

If ALL checks pass:

> ✅ Reviewed — all checks passed. [One sentence summary of what was verified.]

Then re-output the JSON file with the download link so the user doesn't need to scroll back to find it.

If ANY check fails:
1. List each failure with the check name, what's wrong, and what the fix is
2. Output a corrected JSON file
3. Say what changed

Then say: "Say **next** to generate the next block. After each block, say **review** to verify it before moving on."

If this is the last block of a mesocycle (not the last mesocycle of the program), also say: "Mesocycle [X] complete. Paste your Planning Prompt in this conversation to plan Mesocycle [X+1]."

---

**Remember this review process.** After each future block in this conversation, when the user says "review", run this same checklist. No need to paste these instructions again.`;
                    await Clipboard.setStringAsync(reviewPrompt);
                    setReviewPromptCopied(true);
                    setTimeout(() => {
                      setReviewPromptCopied(false);
                    }, 2000);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#0a0a0b" />
                  <Text style={styles.actionButtonText}>
                    {reviewPromptCopied ? 'Copied!' : 'Copy Review Prompt'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.stepCard}>
                <View style={styles.stepCardHeader}>
                  <View style={[styles.stepBadge, { backgroundColor: themeColor }]}>
                    <Text style={styles.stepBadgeText}>4</Text>
                  </View>
                  <Text style={styles.stepCardTitle}>Import & Train</Text>
                </View>
                <Text style={styles.stepCardDescription}>
                  Copy the verified JSON file and paste it in
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


        <View style={{
          position: 'absolute',
          bottom: 30,
          left: 20,
          right: 20,
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <TouchableOpacity 
            onPress={() => {
              console.log('Help link pressed');
              setShowInstructions(true);
            }}
            style={{
              backgroundColor: 'transparent',
              paddingVertical: 16,
              paddingHorizontal: 24,
              minHeight: 48,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            activeOpacity={0.7}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: '500',
              textAlign: 'center',
              textDecorationLine: 'underline',
              color: themeColor,
            }}>
              How to create custom programs with AI?
            </Text>
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
  mesocycleProgress: {
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    color: '#a1a1aa',
  },
});