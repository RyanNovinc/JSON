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
  Platform,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { getAIPrompt, MUSCLE_GROUPS, QuestionnaireData, generateProgramSpecs } from '../data/workoutPrompt';
import { assemblePlanningPrompt, ProgramContext } from '../data/planningPrompt';
import { ProgramStorage, Program, MesocyclePhase } from '../data/programStorage';
import { extractMesocycleSummary } from '../data/mesocycleExtractor';
import { WorkoutStorage, WorkoutRoutine } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RobustStorage from '../utils/robustStorage';
// import * as Crypto from 'expo-crypto';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutProgram, Exercise } from '../types/workout';
import WorkoutGeneratorStep1New from '../components/WorkoutGeneratorStep1New';
import { fetchShare } from '../services/shareService';

type ImportScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ImportRoutine'>;
type ImportScreenRouteProp = RouteProp<RootStackParamList, 'ImportRoutine'>;

// Interface moved to types/workout.ts - importing from there

export default function ImportRoutineScreen() {
  const navigation = useNavigation<ImportScreenNavigationProp>();
  const route = useRoute<ImportScreenRouteProp>();
  const { themeColor } = useTheme();
  // Check if we have shareId and should show loading immediately
  const { shareId } = route.params || {};
  const [isLoading, setIsLoading] = useState(!!shareId); // Start loading if we have shareId
  const [parsedProgram, setParsedProgram] = useState<WorkoutProgram | null>(null);
  const [accumulatedPrograms, setAccumulatedPrograms] = useState<WorkoutProgram[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showAddMoreMode, setShowAddMoreMode] = useState(false);
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
  const [outputPreference, setOutputPreference] = useState<'copy_paste' | 'save_import'>('copy_paste');
  const [uploadMode, setUploadMode] = useState(false);
  const [showStep1New, setShowStep1New] = useState(
    (route?.params?.mode === 'append-block') ? false : (route?.params?.showStep1New || false)
  );
  const [showInfo, setShowInfo] = useState(false);

  // Mesocycle state
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
  const [mesocycleContext, setMesocycleContext] = useState<ProgramContext | null>(null);
  const [planText, setPlanText] = useState<string>('');
  const [showPlanInput, setShowPlanInput] = useState(false);
  const [planInputCopied, setPlanInputCopied] = useState(false);
  const [roadmapSaved, setRoadmapSaved] = useState(false);

  // Error logging modal state
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorLogs, setErrorLogs] = useState<string>('');
  const [errorLogsCopied, setErrorLogsCopied] = useState(false);

  // Track if user cancelled prefilledJson import to prevent re-processing
  const [prefilledCancelled, setPrefilledCancelled] = useState(false);


  // Handle schema version migration on component mount
  useEffect(() => {
    handleSchemaMigration();
  }, []);

  // Load output preference or auto-detect based on platform
  useEffect(() => {
    const loadOutputPreference = async () => {
      try {
        const savedData = await RobustStorage.getItem('outputPreference', true) || await AsyncStorage.getItem('outputPreference');
        if (savedData) {
          setOutputPreference(savedData as 'copy_paste' | 'save_import');
        } else {
          // Default to copy_paste for all platforms (works everywhere, especially good for mobile)
          setOutputPreference('copy_paste');
        }
      } catch (error) {
        console.error('Error loading output preference:', error);
        // Default to copy_paste on error since it works on all platforms
        setOutputPreference('copy_paste');
      }
    };
    loadOutputPreference();
  }, []);

  // Load current program and mesocycle context
  useEffect(() => {
    loadMesocycleContext();
  }, []);

  // Handle shareId by fetching and converting to prefilledJson
  useEffect(() => {
    const { shareId } = route.params || {};
    if (shareId && !parsedProgram && !prefilledCancelled) {
      console.log('🔄 [SHARE-IMPORT] Starting share import with shareId:', shareId);
      handleShareImport(shareId);
    }
  }, [route.params?.shareId, parsedProgram, prefilledCancelled]);

  // Handle auto-import when prefilledJson is provided
  useEffect(() => {
    console.log('🏋️ [IMPORT ROUTINE] Auto-import useEffect triggered');
    console.log('🏋️ [IMPORT ROUTINE] Route params:', route.params);
    console.log('🏋️ [IMPORT ROUTINE] State check:', { 
      isLoading, 
      parsedProgram: !!parsedProgram, 
      prefilledCancelled,
      hasRouteParams: !!route.params 
    });
    
    const { prefilledJson } = route.params || {};
    console.log('🏋️ [IMPORT ROUTINE] prefilledJson present:', !!prefilledJson);
    
    if (prefilledJson) {
      console.log('🏋️ [IMPORT ROUTINE] prefilledJson length:', prefilledJson.length);
      console.log('🏋️ [IMPORT ROUTINE] prefilledJson sample:', prefilledJson.substring(0, 100) + '...');
    }
    
    if (prefilledJson && !isLoading && !parsedProgram && !prefilledCancelled) {
      console.log('🔄 [AUTO-IMPORT] All conditions met - starting auto-import');
      console.log('🔄 [AUTO-IMPORT] JSON length:', prefilledJson.length);
      console.log('🔄 [AUTO-IMPORT] About to call processWorkoutData');
      processWorkoutData(prefilledJson);
      console.log('🔄 [AUTO-IMPORT] processWorkoutData call completed');
    } else {
      console.log('🔄 [AUTO-IMPORT] Conditions not met for auto-import:', {
        hasPrefilledJson: !!prefilledJson,
        isNotLoading: !isLoading,
        noParsedProgram: !parsedProgram,
        notCancelled: !prefilledCancelled
      });
    }
  }, [route.params?.prefilledJson, isLoading, parsedProgram, prefilledCancelled]);

  // Handle share import by fetching and processing
  const handleShareImport = async (shareId: string) => {
    try {
      const sharedData = await fetchShare(shareId);
      
      // Extract the workout data from the shared structure
      const sharedDataAny = sharedData as any;
      let workoutData;
      if (sharedDataAny.data && sharedDataAny.data.workoutData) {
        workoutData = sharedDataAny.data.workoutData;
      } else if (sharedDataAny.workoutData) {
        workoutData = sharedDataAny.workoutData;
      } else {
        workoutData = sharedDataAny;
      }
      
      if (!workoutData || typeof workoutData !== 'object') {
        throw new Error('Invalid workout data received');
      }
      
      // Convert to JSON string and process directly
      const jsonString = JSON.stringify(workoutData);
      processWorkoutData(jsonString);
      
    } catch (error) {
      console.error('Share import error:', error);
      // For now, just set an error message - could enhance with better error handling
      setErrorMessage('Failed to load shared workout: ' + (error?.message || 'Unknown error'));
    }
  };

  // Auto-confirm import when we have a parsed program from prefilledJson
  // REMOVED: Let user see confirmation screen and click "Start Training" to create workout

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
      
      // Show first 100 characters of input for debugging
      detailedError += '\n\n🔍 First 100 characters of input:\n';
      detailedError += `"${text.substring(0, 100).replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')}"`;
      
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
          
          // Allow REST DAY entries to have no exercises
          const isRestDay = day.day_name && day.day_name.toUpperCase().includes('REST');
          if (!Array.isArray(day.exercises) || (day.exercises.length === 0 && !isRestDay)) {
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
    console.log('⚙️ [PROCESS WORKOUT] Starting processWorkoutData');
    console.log('⚙️ [PROCESS WORKOUT] Text length:', text.length);
    console.log('⚙️ [PROCESS WORKOUT] Text sample:', text.substring(0, 200) + '...');
    console.log('⚙️ [PROCESS WORKOUT] Current state:', { isLoading, showAddMoreMode, accumulatedProgramsCount: accumulatedPrograms.length });
    
    setIsLoading(true);
    console.log('⚙️ [PROCESS WORKOUT] Set isLoading to true');
    
    const startTime = Date.now();
    setGenerationStartTime(startTime);
    console.log('⚙️ [PROCESS WORKOUT] Set generation start time:', startTime);
    
    // Simulate processing time for better UX
    setTimeout(() => {
      console.log('⚙️ [PROCESS WORKOUT] Timeout callback started - about to call validateAndParseJSON');
      
      try {
        const program = validateAndParseJSON(text);
        console.log('⚙️ [PROCESS WORKOUT] validateAndParseJSON result:', program ? 'SUCCESS' : 'FAILED');
        
        if (program) {
          console.log('⚙️ [PROCESS WORKOUT] Program keys:', Object.keys(program));
          console.log('⚙️ [PROCESS WORKOUT] Program name:', program.routine_name);
        }
        
        const endTime = Date.now();
        const totalTime = (endTime - startTime) / 1000; // Convert to seconds
        console.log('⚙️ [PROCESS WORKOUT] Processing completed in:', totalTime, 'seconds');
        
        setGenerationTime(totalTime);
        setIsLoading(false);
        console.log('⚙️ [PROCESS WORKOUT] Set isLoading to false');
      
      if (program) {
        console.log('⚙️ [PROCESS WORKOUT] Program validation successful - starting import flow');
        
        // Generate unique ID for this program import
        const programId = Date.now().toString() + Math.random().toString(36);
        program.id = programId;
        console.log('⚙️ [PROCESS WORKOUT] Assigned program ID:', programId);
        
        // If we're in add more mode, add to existing programs
        // If we're in main import mode, start fresh
        const newAccumulated = showAddMoreMode ? [...accumulatedPrograms, program] : [program];
        console.log('⚙️ [PROCESS WORKOUT] Accumulated programs count:', newAccumulated.length, 'showAddMoreMode:', showAddMoreMode);
        setAccumulatedPrograms(newAccumulated);
        
        // Create the merged program for display
        try {
          console.log('⚙️ [PROCESS WORKOUT] About to merge programs');
          const mergedProgram = mergePrograms(newAccumulated);
          console.log('⚙️ [PROCESS WORKOUT] Program merge successful');
          setParsedProgram(mergedProgram);
          console.log('⚙️ [PROCESS WORKOUT] setParsedProgram called with merged program');
          
          // If we're in add more mode, go back to confirmation view
          if (showAddMoreMode) {
            console.log('⚙️ [PROCESS WORKOUT] Add more mode - setting showAddMoreMode to false');
            setShowAddMoreMode(false);
          } else {
            console.log('⚙️ [PROCESS WORKOUT] Main import mode - showing confirmation modal');
            setShowConfirmation(true);
            
            // Animate modal entrance with futuristic easing
            console.log('⚙️ [PROCESS WORKOUT] Starting modal animations');
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
            console.log('⚙️ [PROCESS WORKOUT] Modal animations started');
          }
        } catch (mergeError) {
          const error = mergeError as Error;
          console.error('⚙️ [PROCESS WORKOUT] Program merge failed:', error);
          console.error('⚙️ [PROCESS WORKOUT] Merge error details:', error.stack);
          setErrorMessage(`Cannot combine programs: ${error.message}`);
          // Reset accumulated programs on error
          setAccumulatedPrograms([]);
          console.log('⚙️ [PROCESS WORKOUT] Reset accumulated programs due to merge error');
        }
      } else {
        console.error('⚙️ [PROCESS WORKOUT] Program validation failed - no program returned from validateAndParseJSON');
      }
      
      } catch (outerError) {
        console.error('⚙️ [PROCESS WORKOUT] Outer try-catch error:', outerError);
        console.error('⚙️ [PROCESS WORKOUT] Outer error stack:', outerError?.stack);
        setIsLoading(false);
        setErrorMessage('Failed to process workout data: ' + (outerError?.message || 'Unknown error'));
      }
    }, 800);
  };

  const handleConfirmImport = async () => {
    if (parsedProgram) {
      try {
        // Check if this is append-block mode
        const { mode, targetWorkoutId } = route.params || {};
        if (mode === 'append-block' && targetWorkoutId) {
          await handleAppendBlocks(parsedProgram, targetWorkoutId);
          return;
        }
        
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
              params: { 
                importedProgram: parsedProgram,
                refreshRoutines: true // Force refresh to load new mesocycle routines
              }
            } as any);
          });
        }, 500);
      } catch (error) {
        console.error('Error during import:', error);
        Alert.alert('Import Error', 'There was an error associating this import with your program. The import will continue normally.');
        
        // Continue with normal import flow
        navigation.navigate('Main', { 
          screen: 'Home',
          params: { 
            importedProgram: parsedProgram,
            refreshRoutines: true // Force refresh to load new mesocycle routines
          }
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
    // If this was from a shared import (shareId or prefilledJson), navigate back to home instead of staying here
    const { prefilledJson, shareId } = route.params || {};
    if (prefilledJson || shareId) {
      setPrefilledCancelled(true);
      // Navigate to home screen for shared imports
      navigation.navigate('Main');
      return;
    }

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

  // Save output preference
  const saveOutputPreference = async (preference: 'copy_paste' | 'save_import') => {
    try {
      await RobustStorage.setItem('outputPreference', preference);
      setOutputPreference(preference);
    } catch (error) {
      console.error('Error saving output preference:', error);
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
  const createMesocycleRoutines = async (importedProgram: WorkoutProgram, metadata: any, baseRoutineId: string) => {
    try {
      console.log('🚨 IMPORT TRIGGERED - createMesocycleRoutines called');
      console.log('🔄 IMPORT DEBUG - Creating individual mesocycle routines from complete state...');
      
      const totalBlocks = importedProgram.blocks.length;
      const blocksPerMesocycle = Math.ceil(totalBlocks / metadata.totalMesocycles);
      
      console.log('🔍 IMPORT DEBUG - Distribution plan:', {
        totalBlocks,
        totalMesocycles: metadata.totalMesocycles,
        blocksPerMesocycle,
        routineName: metadata.currentDisplayName || importedProgram.routine_name
      });
      
      for (let i = 0; i < metadata.totalMesocycles; i++) {
        const mesocycleNumber = i + 1;
        const mesocycleName = metadata.mesocycleRoadmap?.[i]?.phaseName || `Mesocycle ${mesocycleNumber}`;
        
        // Distribute blocks across mesocycles
        const startIdx = i * blocksPerMesocycle;
        const endIdx = Math.min(startIdx + blocksPerMesocycle, totalBlocks);
        const mesocycleBlocks = importedProgram.blocks.slice(startIdx, endIdx);
        
        if (mesocycleBlocks.length === 0) continue;
        
        // Create routine for this mesocycle
        const mesocycleRoutine = {
          id: `${baseRoutineId}_meso_${mesocycleNumber}`,
          name: `${metadata.currentDisplayName || importedProgram.routine_name}`,
          days: importedProgram.days_per_week,
          blocks: mesocycleBlocks.length,
          data: {
            ...importedProgram,
            routine_name: `${metadata.currentDisplayName || importedProgram.routine_name} — ${mesocycleName}`,
            blocks: mesocycleBlocks // This should override the imported blocks
          },
          programId: metadata.originalProgramId, // Use current program ID
          mesocycleNumber: mesocycleNumber // Explicitly set mesocycle number
        };
        
        // Add this mesocycle routine to storage
        console.log('💾 SAVING MESOCYCLE ROUTINE:', mesocycleRoutine.id, mesocycleRoutine.name);
        await WorkoutStorage.addRoutine(mesocycleRoutine);
        console.log('✅ SAVED MESOCYCLE ROUTINE SUCCESSFULLY');
        
        // DEBUG: Check what routines are now in storage
        const allRoutines = await WorkoutStorage.loadRoutines();
        console.log('📋 ALL ROUTINES IN STORAGE:', allRoutines.map(r => ({ id: r.id, name: r.name })));
        console.log(`📦 IMPORT DEBUG - Created routine for ${mesocycleName}:`, {
          routineId: mesocycleRoutine.id,
          mesocycleNumber,
          blocksInThisMesocycle: mesocycleBlocks.length,
          blockRange: `${startIdx}-${endIdx-1}`,
          programId: mesocycleRoutine.programId,
          displayName: mesocycleRoutine.name,
          actualBlocksInData: mesocycleRoutine.data.blocks.length,
          blockNamesInData: mesocycleRoutine.data.blocks.map(b => b.block_name)
        });
        
        // Restore mesocycle-specific data with new routine ID
        await restoreCompleteStateForMesocycle(mesocycleRoutine.id, metadata, mesocycleNumber);
      }
      
    } catch (error) {
      console.error('❌ Error creating mesocycle routines:', error);
      throw error;
    }
  };

  const restoreCompleteStateForMesocycle = async (routineId: string, metadata: any, mesocycleNumber: number) => {
    try {
      // Restore manual blocks for this specific mesocycle
      if (metadata.manualBlocks) {
        const mesocycleManualBlocks = metadata.manualBlocks.filter(
          block => block.mesocycleNumber === mesocycleNumber
        );
        
        if (mesocycleManualBlocks.length > 0) {
          const storageKey = `manual_blocks_mesocycle_${mesocycleNumber}`;
          const cleanBlocks = mesocycleManualBlocks.map(block => {
            const cleanBlock = { ...block };
            delete cleanBlock.mesocycleNumber;
            return cleanBlock;
          });
          await AsyncStorage.setItem(storageKey, JSON.stringify(cleanBlocks));
          console.log(`📦 Restored ${cleanBlocks.length} manual blocks for mesocycle ${mesocycleNumber}`);
        }
      }
      
      // Restore completion status
      if (metadata.completionStatus) {
        const completionKey = `completion_${routineId}`;
        await AsyncStorage.setItem(completionKey, JSON.stringify(metadata.completionStatus));
      }
      
      // Restore workout history
      if (metadata.workoutHistory) {
        const historyKey = `workoutHistory_${routineId}`;
        await AsyncStorage.setItem(historyKey, JSON.stringify(metadata.workoutHistory));
      }
      
      // Restore exercise customizations, dynamic exercises, sets data
      const dataCategories = [
        { source: 'exerciseCustomizations', prefix: 'day_customization_' },
        { source: 'dynamicExercisesData', prefix: 'workout_' },
        { source: 'setsData', prefix: 'workout_' }
      ];
      
      for (const category of dataCategories) {
        const sourceData = metadata[category.source];
        if (sourceData) {
          for (const [originalKey, data] of Object.entries(sourceData)) {
            // Only restore data that belongs to this mesocycle's blocks
            const newKey = originalKey.replace(metadata.routineId, routineId);
            await AsyncStorage.setItem(newKey, JSON.stringify(data));
          }
        }
      }
      
    } catch (error) {
      console.log(`Could not restore data for mesocycle ${mesocycleNumber}:`, error);
    }
  };

  const restoreCompleteState = async (importedProgram: WorkoutProgram, metadata: any) => {
    try {
      console.log('🔄 Restoring complete state from export...');
      
      // Generate new routine ID to avoid conflicts
      const newRoutineId = Date.now().toString() + Math.random().toString(36);
      
      // Restore manual blocks
      if (metadata.manualBlocks && metadata.manualBlocks.length > 0) {
        const manualBlocksByMesocycle: Record<string, any[]> = {};
        
        for (const block of metadata.manualBlocks) {
          if (block.mesocycleNumber) {
            // Multi-mesocycle manual block
            const mesocycleNum = block.mesocycleNumber;
            if (!manualBlocksByMesocycle[mesocycleNum]) {
              manualBlocksByMesocycle[mesocycleNum] = [];
            }
            
            // Remove mesocycle metadata from the block before storing
            const cleanBlock = { ...block };
            delete cleanBlock.mesocycleNumber;
            manualBlocksByMesocycle[mesocycleNum].push(cleanBlock);
          } else if (block.customMesocycleId) {
            // Custom mesocycle manual block - will be handled with custom mesocycles
            continue;
          } else {
            // Single routine manual block
            if (!manualBlocksByMesocycle.single) {
              manualBlocksByMesocycle.single = [];
            }
            manualBlocksByMesocycle.single.push(block);
          }
        }
        
        // Store manual blocks for each mesocycle
        for (const [mesocycleKey, blocks] of Object.entries(manualBlocksByMesocycle)) {
          const storageKey = mesocycleKey === 'single' 
            ? `manual_blocks_${newRoutineId}`
            : `manual_blocks_mesocycle_${mesocycleKey}`;
          
          await AsyncStorage.setItem(storageKey, JSON.stringify(blocks));
          console.log(`📦 Restored ${blocks.length} manual blocks for ${mesocycleKey}`);
        }
      }
      
      // Restore completion status (with new routine ID)
      if (metadata.completionStatus && Object.keys(metadata.completionStatus).length > 0) {
        const completionKey = `completion_${newRoutineId}`;
        await AsyncStorage.setItem(completionKey, JSON.stringify(metadata.completionStatus));
        console.log('✅ Restored completion status');
      }
      
      // Restore workout history (with new routine ID)
      if (metadata.workoutHistory && metadata.workoutHistory.length > 0) {
        const historyKey = `workoutHistory_${newRoutineId}`;
        await AsyncStorage.setItem(historyKey, JSON.stringify(metadata.workoutHistory));
        console.log(`📈 Restored ${metadata.workoutHistory.length} workout history entries`);
      }
      
      // Restore active block
      if (metadata.activeBlock !== null && metadata.activeBlock !== undefined) {
        const activeBlockKey = `activeBlock_${newRoutineId}`;
        await AsyncStorage.setItem(activeBlockKey, metadata.activeBlock.toString());
        console.log(`🎯 Restored active block: ${metadata.activeBlock}`);
      }
      
      // Restore week progress
      if (metadata.weekProgress) {
        const weekProgressKey = `weekProgress_${newRoutineId}`;
        await AsyncStorage.setItem(weekProgressKey, JSON.stringify(metadata.weekProgress));
        console.log('📅 Restored week progress');
      }
      
      // Restore exercise customizations
      if (metadata.exerciseCustomizations && Object.keys(metadata.exerciseCustomizations).length > 0) {
        for (const [originalKey, customizationData] of Object.entries(metadata.exerciseCustomizations)) {
          // Update key to use new routine ID if needed
          const newKey = originalKey.replace(metadata.routineId, newRoutineId);
          await AsyncStorage.setItem(newKey, JSON.stringify(customizationData));
        }
        console.log(`🎨 Restored ${Object.keys(metadata.exerciseCustomizations).length} exercise customizations`);
      }
      
      // Restore dynamic exercises
      if (metadata.dynamicExercisesData && Object.keys(metadata.dynamicExercisesData).length > 0) {
        for (const [originalKey, dynamicData] of Object.entries(metadata.dynamicExercisesData)) {
          const newKey = originalKey.replace(metadata.routineId, newRoutineId);
          await AsyncStorage.setItem(newKey, JSON.stringify(dynamicData));
        }
        console.log(`💪 Restored ${Object.keys(metadata.dynamicExercisesData).length} dynamic exercise sets`);
      }
      
      // Restore sets data
      if (metadata.setsData && Object.keys(metadata.setsData).length > 0) {
        for (const [originalKey, setsInfo] of Object.entries(metadata.setsData)) {
          const newKey = originalKey.replace(metadata.routineId, newRoutineId);
          await AsyncStorage.setItem(newKey, JSON.stringify(setsInfo));
        }
        console.log(`📊 Restored ${Object.keys(metadata.setsData).length} sets data records`);
      }
      
      // Restore exercise preferences (global, not routine-specific)
      // Skip for sample plans to prevent contaminating user preferences
      if (metadata.exercisePreferences && 
          Object.keys(metadata.exercisePreferences).length > 0 &&
          !metadata.isSamplePlan) {
        try {
          // Load existing preferences
          const existingPreferencesData = await AsyncStorage.getItem('exercise_preferences');
          let existingPreferences = {};
          if (existingPreferencesData) {
            existingPreferences = JSON.parse(existingPreferencesData);
          }
          
          // Merge with imported preferences (imported preferences take priority)
          const mergedPreferences = { ...existingPreferences, ...metadata.exercisePreferences };
          await AsyncStorage.setItem('exercise_preferences', JSON.stringify(mergedPreferences));
          console.log('🏋️ Restored exercise preferences');
        } catch (error) {
          console.log('Could not restore exercise preferences:', error);
        }
      } else if (metadata.isSamplePlan && metadata.exercisePreferences) {
        console.log('🚫 Skipped applying exercise preferences from sample plan to prevent user preference contamination');
      }
      
      // For complete state imports with multiple mesocycles, create individual mesocycle routines
      if (metadata.exportType === 'complete_state' && metadata.totalMesocycles > 1) {
        console.log('🔥 FIRST BRANCH - About to call createMesocycleRoutines');
        await createMesocycleRoutines(importedProgram, metadata, newRoutineId);
        console.log(`🎯 FIRST BRANCH - Complete state: created ${metadata.totalMesocycles} individual mesocycle routines`);
        return; // Exit early since we've created separate routines
      }
      
      // Update the imported program's ID to the new one
      importedProgram.id = newRoutineId;
      
      console.log('✨ Complete state restoration finished');
      
    } catch (error) {
      console.error('❌ Error restoring complete state:', error);
      // Don't throw - let import continue with basic functionality
    }
  };

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
      const metadata = (importedProgram as any)._metadata;
      
      
      // Check if this is a new unified export
      if (metadata && metadata.exportType === 'unified_mesocycle_structure') {
        return await handleUnifiedMesocycleImport(importedProgram, metadata);
      }
      
      // Fall back to legacy import logic for old exports
      return await handleLegacyMesocycleImport(importedProgram, metadata);
    } catch (error) {
      console.error('Error in mesocycle import:', error);
      Alert.alert('Import Error', 'Failed to import mesocycle data. The routine will be imported without mesocycle structure.');
    }
  };

  // NEW: Handle unified mesocycle structure imports
  const handleUnifiedMesocycleImport = async (importedProgram: WorkoutProgram, metadata: any) => {
    try {
      const allMesocycles = metadata.allMesocycles || [];
      

      let program = currentProgram;
      
      // Separate program and custom mesocycles
      const programMesocycles = allMesocycles.filter(m => !m.isCustom);
      const customMesocycles = allMesocycles.filter(m => m.isCustom);
      
      // Create program if needed
      if (!program && programMesocycles.length > 0) {
        const mesocycleRoadmap = programMesocycles.map(m => ({
          mesocycleNumber: m.mesocycleNumber,
          phaseName: m.phaseName,
          repFocus: m.repFocus,
          emphasis: m.emphasis,
          weeks: m.weeks,
          blocks: m.blocks
        }));
        
        program = {
          id: Date.now().toString(),
          name: importedProgram.routine_name,
          createdAt: new Date().toISOString(),
          programDuration: 'custom',
          totalMesocycles: programMesocycles.length,
          currentMesocycle: 1,
          mesocycleRoadmap: mesocycleRoadmap,
          mesocycleRoadmapText: '',
          completedMesocycles: [],
          routineIds: []
        };
        
        await ProgramStorage.addProgram(program);
      }
      
      // Create the routine (always without mesocycleNumber for unified imports)
      const newRoutineId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newRoutine: WorkoutRoutine = {
        id: newRoutineId,
        name: metadata.currentDisplayName || importedProgram.routine_name,
        days: metadata.originalDaysPerWeek || importedProgram.days_per_week || 5,
        blocks: importedProgram.blocks?.length || 0,
        data: importedProgram,
        programId: program?.id
        // NO mesocycleNumber - this ensures unified handling in BlocksScreen
      };
      
      
      // Save the routine
      const existingRoutines = await WorkoutStorage.loadRoutines();
      existingRoutines.push(newRoutine);
      await WorkoutStorage.saveRoutines(existingRoutines);
      
      // Handle custom mesocycles if any
      if (customMesocycles.length > 0) {
        const customMesocyclesKey = `custom_mesocycles_${newRoutineId}`;
        const customMesocycleData = customMesocycles.map(m => ({
          mesocycleNumber: m.mesocycleNumber,
          phase: {
            mesocycleNumber: m.mesocycleNumber,
            phaseName: m.phaseName,
            repFocus: m.repFocus,
            emphasis: m.emphasis,
            weeks: m.weeks,
            blocks: m.blocks
          },
          blocksInMesocycle: [],
          completedBlocks: 0,
          totalBlocks: 0,
          isCompleted: false,
          isActive: false,
          isCustomMesocycle: true,
          customId: Date.now().toString() + Math.random().toString(36).substr(2, 9).substr(2, 9)
        }));
        
        await AsyncStorage.setItem(customMesocyclesKey, JSON.stringify(customMesocycleData));
      }
      
      // Restore all the additional state data (exercise customizations, etc.)
      // Pass importedProgram through metadata as a workaround to access _customMesocycles
      const enhancedMetadata = { ...metadata, importedProgram };
      await restoreCompleteStateForUnified(enhancedMetadata, newRoutineId);
      
      return newRoutine;
      
    } catch (error) {
      console.error('Error in unified import:', error);
      throw error;
    }
  };
  
  // NEW: Legacy fallback for old export formats
  const handleLegacyMesocycleImport = async (importedProgram: WorkoutProgram, metadata: any) => {
    // For now, just log that we're using legacy import
    console.log('⚠️ Using legacy import - consider re-exporting with new format');
    
    // Insert the old complex logic here if needed, but for now let's keep it simple
    return null; // Will implement legacy fallback if needed
  };
  
  // Helper function to restore complete state for unified imports
  const restoreCompleteStateForUnified = async (metadata: any, newRoutineId: string) => {
    if (!metadata) return;
    
    try {
      // Restore all the state data (completion status, workout history, etc.)
      if (metadata.completionStatus) {
        // Handle completion status restoration logic here
        console.log('📊 Restoring completion status');
      }
      
      if (metadata.workoutHistory) {
        // Handle workout history restoration logic here
        console.log('📚 Restoring workout history');
      }
      
      if (metadata.exerciseCustomizations) {
        // Handle exercise customizations restoration logic here
        console.log('🎯 Restoring exercise customizations');
      }
      
      // Add other state restoration as needed
      
      // ⚠️ TEMPORARILY PASS importedProgram THROUGH metadata TO ACCESS _customMesocycles
      // This is a workaround until we refactor the function signature
      if (metadata.importedProgram) {
        console.log('🔍 Debug: About to check for custom mesocycles restoration');
        
        // Restore custom mesocycles
        const customMesocycles = (metadata.importedProgram as any)._customMesocycles;
        if (customMesocycles && customMesocycles.length > 0) {
          const customMesocyclesKey = `custom_mesocycles_${newRoutineId}`;
          
          // Update custom mesocycle IDs to avoid conflicts
          const updatedCustomMesocycles = customMesocycles.map(mesocycle => ({
            ...mesocycle,
            customId: Date.now().toString() + Math.random().toString(36).substr(2, 9)
          }));
          
          await AsyncStorage.setItem(customMesocyclesKey, JSON.stringify(updatedCustomMesocycles));
          console.log(`🎯 Restored ${customMesocycles.length} custom mesocycles`);
          
          // Restore manual blocks for custom mesocycles
          
          for (let i = 0; i < customMesocycles.length; i++) {
            const originalCustomId = customMesocycles[i].customId;
            const newCustomId = updatedCustomMesocycles[i].customId;
            
            
            const customManualBlocks = metadata.manualBlocks?.filter(
              block => block.customMesocycleId === originalCustomId
            );
            
            
            if (customManualBlocks && customManualBlocks.length > 0) {
              const cleanBlocks = customManualBlocks.map(block => {
                const cleanBlock = { ...block };
                delete cleanBlock.customMesocycleId;
                return cleanBlock;
              });
              
              const customManualBlocksKey = `manual_blocks_${newCustomId}`;
              await AsyncStorage.setItem(customManualBlocksKey, JSON.stringify(cleanBlocks));
            }
          }
        }
      }
      
      console.log('✅ Complete state restored for routine:', newRoutineId);
      
    } catch (error) {
      console.error('Error restoring complete state:', error);
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

  const handleAppendBlocks = async (parsedProgram: WorkoutProgram, targetWorkoutId: string) => {
    try {
      console.log('🔄 [APPEND-BLOCKS] Starting append blocks process');
      console.log('🔄 [APPEND-BLOCKS] Target workout ID:', targetWorkoutId);
      console.log('🔄 [APPEND-BLOCKS] Parsed program:', JSON.stringify(parsedProgram, null, 2));
      
      // Load the existing workout
      const existingRoutines = await WorkoutStorage.loadRoutines();
      console.log('🔄 [APPEND-BLOCKS] Found routines:', existingRoutines.map(r => ({ id: r.id, name: r.name })));
      
      const targetRoutine = existingRoutines.find(r => r.id === targetWorkoutId);
      console.log('🔄 [APPEND-BLOCKS] Target routine found:', !!targetRoutine);
      
      if (!targetRoutine) {
        console.error('❌ [APPEND-BLOCKS] Target workout not found');
        Alert.alert('Error', 'Target workout not found');
        return;
      }

      // Extract blocks from the parsed program
      let blocksToAppend: any[] = [];
      
      if (parsedProgram.blocks && Array.isArray(parsedProgram.blocks)) {
        // If pasted JSON is a full workout with blocks array
        blocksToAppend = parsedProgram.blocks;
        console.log('🔄 [APPEND-BLOCKS] Extracted blocks from workout:', blocksToAppend.length);
      } else if ((parsedProgram as any).block_name && (parsedProgram as any).days) {
        // If pasted JSON is a single block object
        blocksToAppend = [parsedProgram];
        console.log('🔄 [APPEND-BLOCKS] Using single block object');
      } else {
        console.error('❌ [APPEND-BLOCKS] Invalid block format');
        Alert.alert('Error', 'Invalid block format. Please paste a valid block or workout JSON.');
        return;
      }
      
      console.log('🔄 [APPEND-BLOCKS] Blocks to append:', blocksToAppend.length);

      // Append blocks to the existing workout
      const originalBlockCount = targetRoutine.data.blocks?.length || 0;
      const updatedWorkout = {
        ...targetRoutine,
        data: {
          ...targetRoutine.data,
          blocks: [...(targetRoutine.data.blocks || []), ...blocksToAppend]
        },
        blocks: originalBlockCount + blocksToAppend.length
      };

      console.log('🔄 [APPEND-BLOCKS] Original block count:', originalBlockCount);
      console.log('🔄 [APPEND-BLOCKS] New block count:', updatedWorkout.blocks);
      console.log('🔄 [APPEND-BLOCKS] Updated workout blocks:', updatedWorkout.data.blocks.map(b => b.block_name));

      // Save the updated workout
      const updatedRoutines = existingRoutines.map(r => 
        r.id === targetWorkoutId ? updatedWorkout : r
      );
      
      console.log('🔄 [APPEND-BLOCKS] Saving updated routines...');
      await WorkoutStorage.saveRoutines(updatedRoutines);
      console.log('✅ [APPEND-BLOCKS] Successfully saved updated routines');

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
          
          // Navigate back to the block list with refresh trigger
          navigation.navigate('Blocks', {
            routine: targetRoutine,
            refresh: Date.now() // Force refresh with timestamp
          } as any);
        });
      }, 500);

    } catch (error) {
      console.error('Error appending blocks:', error);
      Alert.alert('Error', 'Failed to append blocks to workout');
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

      // Parse the JSON data with better error handling
      let fitnessGoals: any = {};
      let equipmentPrefs: any = {};
      
      try {
        fitnessGoals = fitnessGoalsData ? JSON.parse(fitnessGoalsData) : {};
      } catch (parseError) {
        console.error('Error parsing fitnessGoalsData:', parseError);
        fitnessGoals = {};
      }
      
      try {
        equipmentPrefs = equipmentPreferencesData ? JSON.parse(equipmentPreferencesData) : {};
      } catch (parseError) {
        console.error('Error parsing equipmentPreferencesData:', parseError);
        equipmentPrefs = {};
      }

      // Consolidate all data into the expected QuestionnaireData format
      const consolidatedData: QuestionnaireData = {
        // From fitnessGoalsData
        primaryGoal: fitnessGoals.primaryGoal,
        customPrimaryGoal: fitnessGoals.customPrimaryGoal,
        integrationMethods: fitnessGoals.integrationMethods,
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
        volumePreference: fitnessGoals.volumePreference,
        gender: fitnessGoals.gender,
        programDuration: fitnessGoals.programDuration,
        customDuration: fitnessGoals.customDuration,

        // From equipmentPreferencesData
        selectedEquipment: equipmentPrefs.selectedEquipment,
        specificEquipment: equipmentPrefs.specificEquipment,
        unavailableEquipment: equipmentPrefs.unavailableEquipment,
        sessionStyle: equipmentPrefs.sessionStyle,
        likedExercises: equipmentPrefs.likedExercises,
        dislikedExercises: equipmentPrefs.dislikedExercises,
      };

      // Filter out undefined/null values and ensure data integrity
      const cleanedData = Object.fromEntries(
        Object.entries(consolidatedData).filter(([key, value]) => {
          // More robust filtering for production
          return value !== undefined && 
                 value !== null && 
                 value !== '' && 
                 !(Array.isArray(value) && value.length === 0) &&
                 !(typeof value === 'object' && Object.keys(value).length === 0);
        })
      );

      // Add basic defaults if critical data is missing
      if (!cleanedData.primaryGoal) {
        cleanedData.primaryGoal = 'build_muscle';
      }
      if (!cleanedData.selectedEquipment) {
        cleanedData.selectedEquipment = ['commercial_gym'];
      }
      if (!cleanedData.trainingExperience) {
        cleanedData.trainingExperience = 'intermediate';
      }
      if (!cleanedData.sessionStyle) {
        cleanedData.sessionStyle = 'moderate';
      }

      return cleanedData;
    } catch (error) {
      console.error('Error loading questionnaire data:', error);
      // Return minimal viable data instead of empty object for production
      return {
        primaryGoal: 'build_muscle',
        selectedEquipment: ['commercial_gym'],
        trainingExperience: 'intermediate',
        volumePreference: '12-16',
        gender: 'male',
        programDuration: '12_weeks',
        sessionStyle: 'moderate'
      };
    }
  };

  // Build dynamic profile text from questionnaire data


  const handleCancel = () => {
    // Don't show Step1 if we're in append-block mode
    if (route?.params?.mode === 'append-block') {
      navigation.goBack();
    } else {
      setShowStep1New(true);
    }
  };

  // Show WorkoutGeneratorStep1New if requested
  if (showStep1New) {
    return (
      <WorkoutGeneratorStep1New
        onNext={() => setShowStep1New(false)}
        onBack={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Main' as any);
          }
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColor} />
        <Text style={styles.loadingText}>
          {shareId ? "Loading shared workout..." : "Processing routine..."}
        </Text>
      </View>
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
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Ionicons name="barbell" size={24} color={themeColor} style={styles.headerIcon} />
            <View style={styles.progressContainer}>
              <View style={styles.progressDot} />
              <View style={[styles.progressDot, { backgroundColor: themeColor }]} />
            </View>
          </View>

          <TouchableOpacity style={styles.infoButton} onPress={() => setShowInfo(!showInfo)}>
            <Ionicons name="information-circle-outline" size={24} color="#71717a" />
          </TouchableOpacity>
        </View>

        {showInfo && (
          <View style={styles.headerInfoModal}>
            <Text style={styles.headerInfoMessage}>
              {route?.params?.mode === 'append-block' 
                ? "Add one block to this workout by importing a JSON file below."
                : "The AI will create a JSON file. Either copy this file or save it. Either option works perfectly fine. Import it using the button below."
              }
            </Text>
          </View>
        )}

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
              name={uploadMode ? "cloud-upload" : "barbell"} 
              size={40} 
              color="#0a0a0b" 
            />
            <Text style={styles.mainButtonText}>
              {uploadMode ? "Upload Your Plan" : "Paste Your Plan"}
            </Text>
            <Text style={styles.mainButtonSubtext}>
              {uploadMode ? "Import the AI's file" : "Paste what the AI created"}
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
                height: '65%',
                alignSelf: 'center',
                width: '90%',
                justifyContent: 'flex-start',
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
                        {uploadMode ? "Upload Your Plan" : "Paste Your Plan"}
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
                    <Text style={styles.title}>
                      {route.params?.mode === 'append-block' ? 'Blocks Ready' : 'Workout Ready'}
                    </Text>
                    <Text style={styles.routineName}>
                      {route.params?.mode === 'append-block' 
                        ? (() => {
                            // Extract block names for display
                            if (parsedProgram?.blocks && Array.isArray(parsedProgram.blocks)) {
                              // Multiple blocks case
                              const blockNames = parsedProgram.blocks.map(block => block.block_name).filter(Boolean);
                              return blockNames.length > 1 
                                ? `${blockNames.length} Blocks`
                                : blockNames[0] || 'Block';
                            } else if ((parsedProgram as any)?.block_name) {
                              // Single block case
                              return (parsedProgram as any).block_name;
                            }
                            return 'Block';
                          })()
                        : parsedProgram?.routine_name
                      }
                    </Text>
                    
                    {/* Program Summary */}
                    <View style={[
                      styles.summaryCard,
                      route.params?.mode === 'append-block' && { paddingVertical: 28 }
                    ]}>
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
                      <Text style={styles.createButtonText}>
                        {route.params?.mode === 'append-block' ? 'Add Block' : 'Start Training'}
                      </Text>
                    </TouchableOpacity>

                    {accumulatedPrograms.length > 0 && route.params?.mode !== 'append-block' && (
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

      {/* Error Logs Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showErrorModal}
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.errorModalOverlay}>
          <View style={styles.errorModalContainer}>
            <View style={styles.errorModalHeader}>
              <Text style={styles.errorModalTitle}>Production Error Logs</Text>
              <TouchableOpacity 
                onPress={() => setShowErrorModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={28} color="#71717a" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.errorLogsContainer}>
              <Text style={styles.errorLogsText}>{errorLogs}</Text>
            </ScrollView>
            
            <TouchableOpacity 
              style={[styles.copyButton, { backgroundColor: errorLogsCopied ? '#10b981' : themeColor }]}
              onPress={async () => {
                try {
                  await Clipboard.setStringAsync(errorLogs);
                  setErrorLogsCopied(true);
                  setTimeout(() => setErrorLogsCopied(false), 2000);
                } catch (error) {
                  Alert.alert('Error', 'Failed to copy error logs');
                }
              }}
            >
              <Ionicons 
                name={errorLogsCopied ? "checkmark" : "copy-outline"} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.copyButtonText}>
                {errorLogsCopied ? 'Copied!' : 'Copy Error Logs'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
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
  headerCenter: {
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    marginBottom: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#27272a',
  },
  infoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonWrapper: {
    position: 'absolute',
    top: 60,
    left: 20,
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
    paddingTop: 0,
    paddingBottom: 160,
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
    paddingTop: 16,
    paddingBottom: 24,
  },
  addMoreTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 24,
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
    paddingBottom: 32,
    paddingTop: 8,
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
    marginBottom: 24,
  },
  addMoreButton: {
    borderRadius: 16,
    paddingVertical: 24,
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
    marginTop: 0,
    paddingHorizontal: 20,
    lineHeight: 20,
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
  helpSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 20,
  },
  tutorialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  tutorialButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  tutorialDuration: {
    fontSize: 14,
    color: '#000000',
    opacity: 0.8,
    marginLeft: 8,
  },
  tutorialButtonSubtext: {
    fontSize: 12,
    color: '#0a0a0b',
    opacity: 0.7,
    marginLeft: 4,
  },
  bottomPadding: {
    height: 40,
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
  errorModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  errorModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  errorModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  errorLogsContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    maxHeight: 400,
  },
  errorLogsText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#0a0a0b',
    lineHeight: 18,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  outputPreferenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  preferenceOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  preferenceText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717a',
  },
  preferenceSeparator: {
    fontSize: 13,
    color: '#3f3f46',
    marginHorizontal: 4,
  },
  headerInfoModal: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: '#1a1a1b',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333336',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerInfoMessage: {
    fontSize: 15,
    color: '#d1d5db',
    lineHeight: 22,
    textAlign: 'center',
  },
});