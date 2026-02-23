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
  const [showConfirmation, setShowConfirmation] = useState(false);
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
        setParsedProgram(program);
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
    }, 800);
  };

  const handleConfirmImport = async () => {
    if (parsedProgram) {
      // Success animation
      Animated.sequence([
        Animated.spring(successScale, {
          toValue: 1.2,
          useNativeDriver: true,
          duration: 200,
        }),
        Animated.spring(successScale, {
          toValue: 1,
          useNativeDriver: true,
          duration: 150,
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
          
          navigation.navigate('Main', { 
            screen: 'Home',
            params: { importedProgram: parsedProgram }
          } as any);
        });
      }, 500);
    }
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

**Step 1 — Review & Clarify**
Before designing the program, review the full profile below. In MOST cases, the profile will contain everything you need — skip straight to Step 2 and build the program.

Only ask a clarifying question if there is a genuine contradiction or critical ambiguity that would result in a fundamentally different program depending on the answer. Ask a maximum of 2 questions.

Do NOT ask questions:
- To confirm choices the user already made (e.g., don't ask 'are you sure you want X frequency?')
- To validate your programming decisions (e.g., don't ask 'is it okay if I include Y?')
- About technical details the user expects you to handle (split type, exercise selection, periodization)
- When you can make a reasonable assumption and note it in Quick Notes instead

You are the coach. If the profile gives you enough to build a good program, just build it.

**Step 2 — Design & Present**
Design a complete training program based on the profile. Use established, evidence-based training principles. Create it as a markdown document artifact. After presenting, wait for feedback before making changes or converting to JSON.

**Step 3 — Recommendations (optional)**
If the program has inherent limitations due to the user's choices (e.g., a muscle group can't reach optimal volume due to available training days), include a brief '### Recommendations' section after Quick Notes explaining what change would improve results. Keep it to 1-2 sentences maximum. Example: 'Side delts are at 8 sets/week — adding lateral raises as supersets on lower body days would bring these to 12+ sets for better growth.'

## MY PROFILE

${generateProgramSpecs(questionnaireData)}

## MUSCLE TAXONOMY

When listing primary and secondary muscles for exercises, you MUST use ONLY these exact names:
Chest, Front Delts, Side Delts, Rear Delts, Lats, Upper Back, Traps, Biceps, Triceps, Forearms, Quads, Hamstrings, Glutes, Calves, Core

Do NOT use generic terms like "Shoulders", "Back", "Arms", or "Legs" — always use the specific muscle names above.
Do NOT use "Lower Back" — use "Core" instead for any exercise involving spinal stabilization or erector engagement.

### COMPOUND EXERCISE TAGGING GUIDE

When an exercise significantly loads a muscle through full range of motion, list it as Primary. When a muscle assists but is not the main driver, list it as Secondary. Use this reference for common compounds:

- Bench press variants: Primary Chest, Triceps
- Incline press variants: Primary Chest, Front Delts | Secondary Triceps
- Row variants: Primary Upper Back, Lats | Secondary Biceps, Rear Delts
- Pull-up / Pulldown: Primary Lats | Secondary Biceps, Upper Back
- Overhead press: Primary Front Delts, Triceps | Secondary Side Delts
- Squat variants (back squat, front squat): Primary Quads, Glutes
- Leg press: Primary Quads | Secondary Glutes
- Hack squat: Primary Quads | Secondary Glutes
- Lunge / Split squat: Primary Quads, Glutes
- Hip hinge (RDL, good morning): Primary Hamstrings, Glutes
- Hip thrust: Primary Glutes | Secondary Hamstrings
- Dips: Primary Chest, Triceps
- Calf raise variants: Primary Calves

This guide ensures consistent volume counting. When in doubt, ask: "Is this muscle the main driver or just assisting?" Main driver = Primary, assisting = Secondary.

## EXERCISE TYPES & FORMATTING

My app handles five exercise types. Use the appropriate type for each activity and format exactly as shown:

### STRENGTH (for gym/weight training exercises)
\`\`\`
Barbell Bench Press
- Sets x Reps: 4 x 8-10
- Rest: 120-180 sec
- Primary: Chest, Triceps
- Secondary: Front Delts
- Alt 1: Dumbbell Bench Press (Primary: Chest, Triceps | Secondary: Front Delts)
- Alt 2: Machine Chest Press (Primary: Chest, Triceps | Secondary: Front Delts)
- Notes: Retract shoulder blades, maintain slight arch
- Weekly progression: Wk1: 10-12, Wk2: 8-10, Wk3: 6-8, Wk4 (deload): 12 at lighter weight
\`\`\`

Rules for strength exercises:
- Use full descriptive names with equipment prefix (e.g., "Barbell Back Squat", "Dumbbell Lateral Raise", "Cable Face Pull")
- Always include 2 alternative exercises, each with their own Primary/Secondary muscles
- Always show weekly rep progression across the block
${notesInstruction}

### CARDIO (for cardiovascular/endurance activities)
\`\`\`
Treadmill Run
- Duration: 25 minutes
- Intensity: Zone 2 / Conversational pace
- Mode: Steady state
- Weekly progression: Wk1: 20 min, Wk2: 25 min, Wk3: 30 min, Wk4: 20 min (deload)
- Notes: Should be able to hold a conversation throughout
\`\`\`

Rules for cardio:
- Include weekly progression showing how duration or intensity changes
- Specify intensity in a way the user can follow (heart rate zone, conversational pace, or RPE)
- If the user hasn't mentioned a heart rate monitor, use perceived effort descriptions instead of HR zones

### STRETCH (for flexibility/mobility work)
\`\`\`
Pigeon Stretch
- Hold: 45 seconds x 2 sets (each side)
- Primary: Glutes
- Notes: Keep hips square, ease into the stretch gradually
\`\`\`

Rules for stretching:
- Specify whether the stretch is "each side" or bilateral
- Include primary muscles from the taxonomy
- Include brief form cue in notes

### CIRCUIT (for conditioning/metabolic work)
\`\`\`
Core Finisher Circuit
- Rounds: 3
- Work: 40 sec on / 20 sec off
- Exercises: Plank, Bicycle Crunches, Dead Bugs, Mountain Climbers
- Notes: Focus on form over speed, rest 60 sec between rounds
\`\`\`

### SPORT (for recreational/social activities)
\`\`\`
Basketball (Recreational)
- Duration: 60 minutes
- Notes: Pickup game or shooting practice — counts as active recovery
\`\`\`

## PROGRAM DESIGN RULES

1. **Match my primary goal** — structure the program to optimize for my stated objective
2. **Respect my experience level** — appropriate complexity, volume, and exercise selection
3. **Only use available equipment** — do not include exercises I cannot perform with my setup
4. **Stay within my session duration** — each session must fit within my stated time limit
5. **Show explicit weekly progression** — for every strength exercise, show what reps/sets look like each week of the block (not just "increase weight over time")
6. **Include a deload** — if the program is 4+ weeks, include a deload week with explicitly reduced volume. Show the actual deload sets and reps, do not just say "reduce volume by 40%"
7. **2 alternatives per strength exercise** — each with their own primary and secondary muscle tags from the taxonomy
8. **Use the correct exercise type** — gym exercises use "strength" format, running/biking use "cardio" format, mobility work uses "stretch" format, etc. Do not format a cardio session as if it were a strength exercise
9. **Prioritize selected cardio activities** — When programming cardio days, use the user's preferred cardio activities first. Rotate through different preferred activities week by week within each block rather than repeating the same activity every session. Every preferred activity should appear at least once in the program. Only introduce activities outside their preferences if needed for variety.
10. **Rotate exercises between blocks** — For programs with multiple blocks (e.g., Block A and Block B), rotate at least some exercise variations between blocks to provide fresh stimulus. Keep the same movement patterns (e.g., horizontal press, vertical pull) but change the specific exercise (e.g., barbell bench → dumbbell bench). This is especially important for intermediate and advanced lifters.

## QUALITY CHECK

Before presenting the program, verify:
- **Volume summary:** After the complete program, include a weekly volume summary table for each block showing sets per week per muscle group (counting only exercises where that muscle is listed as Primary). Group by block since exercises stay the same within a block. Show deload weeks separately since volume is intentionally reduced. Format as a simple table with status indicators:

| Muscle Group | Sets/Week | Min | Target | Optimal | Status |
|---|---|---|---|---|---|
| Chest | 16 | 10 | 16-20 | 12-20 | ✅ |
| Side Delts | 12 | 8 | 12-16 | 10-16 | ✅ |
| Rear Delts | 6 | 0 | — | 10-18 | ✅ |
| Front Delts | 0 | 0 | — | — | ✅ |
| Calves | 18 | 8 | 16-22 | 12-22 (priority) | ✅ |
| Forearms | 0 | 0 | — | — | ✅ |

Status indicators:
- ✅ = within target range
- ⚠️ LOW = below minimum (needs more volume)
- ⚠️ HIGH = above maximum (diminishing returns, consider reducing unless this is a priority muscle group)
- ℹ️ CONSTRAINED = above minimum but below training approach target due to split/schedule limitations. Must be explained in Recommendations section.

Priority muscle groups specified by the user get a wider acceptable range — being above the standard maximum is acceptable for priority groups. Mark priority muscle groups with "(priority)" next to their target range. The target column should reflect the user's goal (10-20 for hypertrophy, 6-12 for general fitness/maintenance).

CRITICAL: If the volume summary shows any muscle group below the minimum target, you MUST revise the program to fix the gap BEFORE presenting it. Do not present a program with ⚠️ LOW flags and then explain why it's acceptable — instead, add sets or exercises to bring every muscle group into range. Muscles that can show 0 direct sets without being flagged: Front Delts, Traps, Rear Delts, Core, and Forearms (these receive sufficient indirect stimulus from compound pressing, pulling, rowing, stabilization, and gripping movements respectively). All other muscle groups must meet the minimum target for their experience level.

If the training approach is Push Hard and a non-exempt muscle group is below its Push Hard target but a practical fix exists (e.g., adding an isolation movement as a superset on another training day, swapping a less effective exercise for one that hits the lagging group), implement the fix in the program rather than flagging it in Recommendations. Only use ℹ️ CONSTRAINED when there is genuinely no way to reach the target within session time and recovery constraints.

EXPERIENCE-SCALED VOLUME MINIMUMS (natural lifters):

BEGINNERS (complete_beginner, beginner):
- Major muscles (Chest, Lats, Quads, Hamstrings, Glutes): 6-8 sets/week minimum
- Medium muscles (Side Delts, Biceps, Triceps, Calves): 6 sets/week minimum
- Small/indirect muscles (Front Delts, Rear Delts, Traps, Core, Forearms): 0 sets minimum (exempt — sufficient indirect stimulus from compounds)

INTERMEDIATE:
- Major muscles: 8-10 sets/week minimum
- Medium muscles: 6-8 sets/week minimum
- Small/indirect muscles: 0-6 sets/week

ADVANCED:
- Major muscles: 10-12 sets/week minimum
- Medium muscles: 8-10 sets/week minimum
- Small/indirect muscles: 0-6 sets/week

OPTIMAL ranges for natural lifters (where most gains happen):
- Major muscles: 12-20 sets/week
- Medium muscles: 10-16 sets/week
- Going above 20 sets/week for any muscle group has diminishing returns for natural lifters

PRIORITY MUSCLE GROUPS: Increase priority muscles toward upper optimal range (16-22 sets/week). Reduce non-priority muscles toward their minimums to maintain recoverable total training stress. You cannot add volume everywhere — total weekly stress must be recoverable.

TRAINING APPROACH ADJUSTMENT: The user's training approach shifts where within the optimal range (12-20 sets for major muscles) the AI should target:
- Push Hard: target upper end (16-20 for major muscles, 12-16 for medium)
- Balanced: target mid-range (12-16 for major muscles, 10-14 for medium)  
- Conservative: target lower end (10-12 for major muscles, 8-10 for medium)
These targets combine with experience level — a beginner choosing Push Hard still stays within beginner-appropriate ranges, just at the higher end of those ranges.

If the training approach is Push Hard, the volume summary should show most non-exempt muscle groups in the UPPER half of the optimal range, not clustered at their minimums. A Push Hard program where most muscles sit at minimum volume is underdelivering on the user's intent. If a muscle group cannot reach the Push Hard target due to split constraints (e.g., only 2 upper body days), note this in the Recommendations section and suggest how the user could address it (e.g., adding lateral raises as supersets on lower body days).
- **Rest periods:** Default to 1-2 minutes for compound exercises and 60-90 seconds for isolation exercises. Adjust based on the user's rest time preference if specified.
- **Progressive overload:** Every program must include a clear overload mechanism (increasing load, reps, or sets week to week). Do not use vague instructions like "increase weight when ready."
- **Frequency:** Each muscle group should ideally be trained 2x per week for hypertrophy. Once per week is suboptimal but acceptable if schedule constraints require it.
- **Goal-specific adjustments:** Apply your knowledge of evidence-based training principles to adjust volume, intensity, and rest periods for the user's specific goal (e.g., strength goals use heavier loads with more rest, fat loss maintains volume with potential conditioning additions, recomposition follows hypertrophy guidelines).

## OUTPUT FORMAT

Create the program as a **markdown document artifact** (not in the chat). Present the program with these sections only:

### 1. Program Overview
3-4 sentences: training split, session types, overall approach.

### 2. Weekly Structure
Simple list showing each day (e.g., Day 1: Push, Day 2: Pull, Day 3: Cardio, Day 4: Rest, etc.)

### 3. Progression Strategy
Concrete numbers showing what changes week to week. Example: "Weeks 1-3: reps decrease from 12 → 10 → 8 as load increases. Week 4: deload at 60% volume with higher reps."

### 4. Complete Program
Every training day, every exercise, fully detailed using the formats above. Organize by block if the program has multiple phases.

### 5. Quick Notes
2-3 bullet points maximum with practical tips specific to this program. Do NOT include general fitness advice, nutrition recommendations, warm-up philosophy, or motivational text.

### 6. Recommendations (optional)
If the program has limitations due to the user's schedule or split, briefly note what change would improve results. 1-2 sentences maximum. Omit this section entirely if there are no meaningful recommendations.

### 7. Weekly Volume Summary
For each block (and deload weeks separately), show a table of sets per week per muscle group (counting only sets where that muscle is listed as Primary). Include Target range and Status columns. This verifies the program meets evidence-based volume targets before approving.

## IMPORTANT

- Do NOT include lengthy exercise selection rationale or training philosophy essays
- Do NOT include nutrition advice or general health tips
- Do NOT perform post-generation verification in the response. Complete all volume calculations and exercise planning BEFORE writing the program. Once the markdown document is created, your response is done — do not re-audit, re-count, or edit the program in a follow-up message.
- Do NOT show your planning, volume calculations, or exercise selection reasoning in the chat. Work through all calculations internally. The user should only see a brief acknowledgment (1-2 sentences) followed by the markdown document artifact. No visible "let me plan..." or volume tallying in the response.
- Do NOT convert to JSON — I need to review and approve the program first
- After presenting the program, ask for my feedback on: exercise selection, volume, progression, and anything I want to change
- Only after I confirm I'm happy should you offer JSON conversion`;
                    
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
          <View style={styles.infoButton} />
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
            {/* Close Button */}
            <View style={styles.closeButtonWrapper}>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={handleModalCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Header Badge */}
            {generationTime && (
              <View style={[styles.headerBadge, { backgroundColor: themeColor + '1A', borderColor: themeColor }]}>
                <Text style={[styles.badgeText, { color: themeColor }]}>Generated in {generationTime.toFixed(2)}s</Text>
              </View>
            )}

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
            
            {/* Action Button */}
            <View style={styles.actionSection}>
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: themeColor }]}
                onPress={handleConfirmImport}
                activeOpacity={0.9}
              >
                <Text style={styles.createButtonText}>Start Training</Text>
              </TouchableOpacity>
            </View>
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
  headerBadge: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 24,
    marginBottom: 8,
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