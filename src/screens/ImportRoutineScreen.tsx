import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
// Every TouchableOpacity in this file comes from react-native-gesture-handler (above), and
// on Android a raw <Modal> is a detached native window that does not inherit the app's
// GestureHandlerRootView, so RNGH touchables inside it receive NO touches, silently. That
// is what made "Start Training" unpressable on Android, blocking every workout import.
// AppModal re-roots the gesture handler (and safe-area) contexts inside the modal.
import AppModal from '../components/AppModal';
import ImportHeroWorkout from '../components/import/ImportHeroWorkout';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Clipboard from 'expo-clipboard';
import { File } from 'expo-file-system';
import { MUSCLE_GROUPS, QuestionnaireData } from '../data/workoutPrompt';
import { ProgramContext } from '../data/planningPrompt';
import { ProgramStorage, Program } from '../data/programStorage';
import { extractMesocycleSummary } from '../data/mesocycleExtractor';
import { WorkoutStorage, WorkoutRoutine } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutProgram } from '../types/workout';
import { fetchShare } from '../services/shareService';
import { Analytics } from '../services/analytics';

type ImportScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ImportRoutine'>;
type ImportScreenRouteProp = RouteProp<RootStackParamList, 'ImportRoutine'>;

/**
 * HEADLESS IMPORT RECEIVER.
 *
 * This screen has NO paste UI, deliberately. It exists only to receive a program
 * that arrived from OUTSIDE the app and put it in front of the user as a
 * confirmation modal. The three inbound deliveries:
 *
 *   fileUri        Open-with / share sheet file, routed here as /import-file
 *   prefilledJson  share or curated program, handed over by ImportSharedContent
 *   shareId        share link (json.fit/p/<id>), fetched by this screen
 *
 * Prompt generation and the paste/upload fallback belong to the questionnaire
 * screens (PromptReadyScreen, NutritionPromptReadyScreen). The legacy paste UI
 * that used to live here ("Paste Your Plan" / "Your Prompt is Ready!") is gone,
 * along with the mode toggle, the info popover, the two-dot header, Add More
 * Files, and append-block mode.
 *
 * WHY THAT MATTERS BEYOND TIDINESS: the paste UI was this component's DEFAULT
 * render. Any state that left the screen mounted with nothing to do fell through
 * to it, which is how a cancelled or re-attempted import "navigated" to a screen
 * nobody sent the user to. There is no default render to fall through to now: if
 * there is no source param, the screen leaves.
 */
export default function ImportRoutineScreen() {
  const navigation = useNavigation<ImportScreenNavigationProp>();
  const route = useRoute<ImportScreenRouteProp>();
  const { themeColor } = useTheme();

  const { shareId, isCurated, curatedSlug, fileUri, receivedAt, prefilledJson } =
    route.params || {};

  // The only three ways a program can arrive. No source means no work to do.
  const hasSource = !!(fileUri || prefilledJson || shareId);

  const [isLoading, setIsLoading] = useState(!!shareId && !isCurated);
  const [parsedProgram, setParsedProgram] = useState<WorkoutProgram | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [modalScale] = useState(new Animated.Value(0));
  const [modalOpacity] = useState(new Animated.Value(0));
  const [successScale] = useState(new Animated.Value(0));

  // Mesocycle state
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
  const [mesocycleContext, setMesocycleContext] = useState<ProgramContext | null>(null);

  // One-shot latches. processWorkoutData resolves ~800ms BEFORE validation runs
  // (see its warning), so without these a validation failure reopens the guard on
  // every render and loops forever. Deliberately never cleared while mounted: they
  // die with the unmount, and clearing one while its param is still set would
  // immediately re-trigger the same import.
  const consumedPrefilledJson = useRef<string | null>(null);
  const consumedFileUri = useRef<string | null>(null);

  // Nothing to import. Leave before painting anything the user can get stuck on.
  // This is the guard that makes the paste UI's removal safe: previously this
  // exact state (mounted, no source, nothing loading) WAS the "Paste Your Plan"
  // screen.
  useEffect(() => {
    if (hasSource) return;
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main' as any);
    }
  }, [hasSource, navigation]);

  useEffect(() => {
    handleSchemaMigration();
  }, []);

  useEffect(() => {
    loadMesocycleContext();
  }, []);

  // ---------------------------------------------------------------------------
  // Inbound delivery 1: share link. Fetch, then hand the JSON to the same
  // pipeline everything else uses.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (shareId && !parsedProgram && !errorMessage) {
      handleShareImport(shareId);
    }
  }, [shareId, parsedProgram, errorMessage]);

  // ---------------------------------------------------------------------------
  // Inbound delivery 2: prefilledJson from ImportSharedContent.
  // KEEP IN SYNC with the fileUri effect below — same latch shape.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (
      prefilledJson &&
      consumedPrefilledJson.current !== prefilledJson &&
      !isLoading &&
      !parsedProgram
    ) {
      consumedPrefilledJson.current = prefilledJson;
      processWorkoutData(prefilledJson);
    }
  }, [prefilledJson, isLoading, parsedProgram]);

  // ---------------------------------------------------------------------------
  // Inbound delivery 3: a file opened from the share sheet or Open-with, routed
  // here by toCanonicalUrl in AppNavigator as /import-file?fileUri=...
  //
  // The latch is keyed on the DELIVERY (fileUri + receivedAt), not the file: one
  // tap equals one import attempt. Keying on fileUri alone would stop the loop
  // but wedge the opposite way, leaving the same file latched shut for the life
  // of the screen. receivedAt is stamped per delivery in toCanonicalUrl, so
  // cancel-then-reopen works. Latched synchronously BEFORE the await, or a
  // re-render during the read re-enters the guard and double-reads.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const deliveryKey = fileUri + ':' + receivedAt;
    if (
      fileUri &&
      consumedFileUri.current !== deliveryKey &&
      !isLoading &&
      !parsedProgram
    ) {
      consumedFileUri.current = deliveryKey;
      (async () => {
        try {
          // fileUri arrives already decoded exactly once (by React Navigation's
          // query parsing, undoing toCanonicalUrl's encode). Do NOT decode again.
          const text = await new File(fileUri).text();
          // Validation runs ~800ms later inside processWorkoutData; on the
          // deep-link path this instance may be gone by then, so surface failures
          // via an Alert, which the OS draws over whatever is on screen.
          processWorkoutData(text, () => {
            Alert.alert(
              "This file isn't a valid JSON.fit program",
              "It looks incomplete or isn't a JSON.fit export. Re-generate or re-download your program, then open the file again."
            );
          });
        } catch (e) {
          console.error('[FILE IMPORT] Read failed:', e);
          Alert.alert(
            'Import failed',
            "Couldn't read that file. Try generating your plan again."
          );
        }
      })();
    }
  }, [fileUri, receivedAt, isLoading, parsedProgram]);

  const handleShareImport = async (id: string) => {
    try {
      const sharedData = await fetchShare(id);
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

      processWorkoutData(JSON.stringify(workoutData));
    } catch (error) {
      console.error('Share import error:', error);
      setIsLoading(false);
      setErrorMessage(
        'Failed to load shared workout: ' + ((error as Error)?.message || 'Unknown error')
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Schema migration / housekeeping
  // ---------------------------------------------------------------------------
  const handleSchemaMigration = async () => {
    try {
      const schemaVersion = await AsyncStorage.getItem('schemaVersion');
      if (!schemaVersion || schemaVersion !== '2.0') {
        const keysToCheck = [
          'savedWorkoutPrograms',
          'currentWorkoutProgram',
          'completedWorkouts',
          'workoutHistory',
          'favoriteExercises',
        ];

        const keysToDelete: string[] = [];
        for (const key of keysToCheck) {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            try {
              const parsed = JSON.parse(data);
              if (key === 'savedWorkoutPrograms' || key === 'currentWorkoutProgram') {
                if (checkForOldExerciseFormat(parsed)) {
                  keysToDelete.push(key);
                }
              }
            } catch {
              keysToDelete.push(key);
            }
          }
        }

        if (keysToDelete.length > 0) {
          await AsyncStorage.multiRemove(keysToDelete);
        }

        await cleanupInvalidPrograms();
        await AsyncStorage.setItem('schemaVersion', '2.0');
      }
    } catch (error) {
      console.error('Schema migration failed:', error);
    }
  };

  const cleanupInvalidPrograms = async () => {
    try {
      const programs = await ProgramStorage.loadPrograms();

      for (const program of programs) {
        if (program.totalMesocycles > 5) {
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
              await ProgramStorage.deleteProgram(program.id);
              continue;
          }

          await ProgramStorage.updateProgram(program.id, {
            totalMesocycles: correctedCount,
            currentMesocycle: Math.min(program.currentMesocycle, correctedCount),
          });
        }
      }
    } catch (error) {
      console.error('Program cleanup failed:', error);
    }
  };

  const checkForOldExerciseFormat = (data: any): boolean => {
    if (!data) return false;

    try {
      if (data.blocks) {
        for (const block of data.blocks) {
          if (block.days) {
            for (const day of block.days) {
              if (day.exercises) {
                for (const exercise of day.exercises) {
                  if (
                    !exercise.type ||
                    (exercise.alternatives &&
                      Array.isArray(exercise.alternatives) &&
                      exercise.alternatives.length > 0 &&
                      typeof exercise.alternatives[0] === 'string') ||
                    !exercise.primaryMuscles
                  ) {
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
      return true;
    }
  };

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------
  const validateMuscles = (
    muscles: string[],
    exerciseName: string,
    type: 'primary' | 'secondary'
  ) => {
    if (!Array.isArray(muscles)) {
      throw new Error(`Exercise "${exerciseName}" ${type}Muscles must be an array`);
    }
    muscles.forEach((muscle: any) => {
      if (typeof muscle !== 'string' || !MUSCLE_GROUPS.includes(muscle)) {
        throw new Error(
          `Exercise "${exerciseName}" has invalid ${type} muscle: "${muscle}". Must be one of: ${MUSCLE_GROUPS.join(', ')}`
        );
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
    // `rest` and `restQuick` are deliberately NOT validated, required or read. Rest is
    // resolved at runtime by resolveRest() (src/utils/restResolver.ts). Plans generated
    // before that change still carry both fields; they import cleanly and are ignored.

    if (!exercise.primaryMuscles) {
      throw new Error(`Exercise "${exercise.exercise}" missing primaryMuscles`);
    }
    if (!exercise.secondaryMuscles) {
      throw new Error(`Exercise "${exercise.exercise}" missing secondaryMuscles`);
    }
    validateMuscles(exercise.primaryMuscles, exercise.exercise, 'primary');
    validateMuscles(exercise.secondaryMuscles, exercise.exercise, 'secondary');

    if (exercise.notes && typeof exercise.notes !== 'string') {
      throw new Error(`Exercise "${exercise.exercise}" notes must be a string`);
    }
    if (exercise.reps_weekly) {
      if (typeof exercise.reps_weekly !== 'object' || exercise.reps_weekly === null) {
        throw new Error(`Exercise "${exercise.exercise}" has invalid reps_weekly format`);
      }
      Object.values(exercise.reps_weekly).forEach((reps: any) => {
        if (typeof reps !== 'string') {
          throw new Error(
            `Exercise "${exercise.exercise}" reps_weekly values must be strings`
          );
        }
      });
    }
    if (exercise.sets_weekly) {
      if (typeof exercise.sets_weekly !== 'object' || exercise.sets_weekly === null) {
        throw new Error(`Exercise "${exercise.exercise}" has invalid sets_weekly format`);
      }
      Object.values(exercise.sets_weekly).forEach((sets: any) => {
        if (typeof sets !== 'number') {
          throw new Error(
            `Exercise "${exercise.exercise}" sets_weekly values must be numbers`
          );
        }
      });
    }
    if (exercise.alternatives) {
      if (!Array.isArray(exercise.alternatives)) {
        throw new Error(`Exercise "${exercise.exercise}" alternatives must be an array`);
      }
      exercise.alternatives.forEach((alt: any, index: number) => {
        if (!alt.exercise || typeof alt.exercise !== 'string') {
          throw new Error(
            `Alternative ${index + 1} for "${exercise.exercise}" missing exercise name`
          );
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
        throw new Error(
          `Circuit "${exercise.circuit_name}" exercise ${index + 1} missing name`
        );
      }
    });
  };

  const validateSportExercise = (exercise: any, dayName: string) => {
    if (!exercise.activity || typeof exercise.activity !== 'string') {
      throw new Error(`Sport exercise in "${dayName}" missing activity name`);
    }
    if (
      exercise.duration_minutes &&
      (typeof exercise.duration_minutes !== 'number' || exercise.duration_minutes <= 0)
    ) {
      throw new Error(`Sport "${exercise.activity}" has invalid duration_minutes`);
    }
  };

  const validateAndParseJSON = (input: string): WorkoutProgram | null => {
    let parsed: any;

    // Normalize smart quotes to straight quotes before parsing
    let text = input;
    text = text.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
    text = text.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");

    try {
      parsed = JSON.parse(text);
    } catch (jsonError) {
      const error = jsonError as Error;
      let detailedError = 'JSON Parse Error:\n\n';

      const positionMatch =
        error.message.match(/position (\d+)/i) ||
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

          const start = Math.max(0, position - 50);
          const end = Math.min(text.length, position + 50);
          const snippet = text.slice(start, end);
          const errorPos = position - start;

          detailedError += 'Context:\n';
          detailedError += `...${snippet.slice(0, errorPos)}⚠️${snippet.slice(errorPos)}...\n\n`;
        }
      }

      const rawError = error.message.toLowerCase();

      if (rawError.includes('unexpected end') || rawError.includes('unterminated')) {
        detailedError += '🔍 Issue: JSON appears truncated or incomplete\n';
        detailedError += '💡 Solution: Re-generate the plan and share the complete file\n';
      } else if (
        input.includes('\u201c') ||
        input.includes('\u201d') ||
        input.includes('\u2018') ||
        input.includes('\u2019')
      ) {
        detailedError += '🔍 Issue: Smart/curly quotes were detected and auto-fixed\n';
        detailedError += '💡 Note: Quotes were normalized, but there may be other syntax issues\n';
      } else if (rawError.includes('unexpected token')) {
        const tokenMatch =
          error.message.match(/unexpected token '(.*)'/i) ||
          error.message.match(/unexpected token (.*) in/i);
        if (tokenMatch) {
          detailedError += `🔍 Issue: Unexpected character "${tokenMatch[1]}"\n`;
          detailedError += '💡 Solution: Remove invalid characters or fix JSON syntax\n';
        }
      } else if (text.trim().startsWith('```')) {
        detailedError += '🔍 Issue: Code block markers found\n';
        detailedError += '💡 Solution: The file should contain only JSON, not ```json markers\n';
      } else if (!text.trim().startsWith('{')) {
        detailedError += '🔍 Issue: JSON must start with {\n';
        detailedError += '💡 Solution: Share the complete JSON file\n';
      } else {
        detailedError += '🔍 Issue: JSON syntax error\n';
        detailedError += '💡 Common fixes:\n';
        detailedError += '• Check for missing commas between items\n';
        detailedError += '• Remove trailing commas\n';
        detailedError += '• Ensure all brackets are properly closed\n';
        detailedError += '• Use straight quotes, not curly quotes\n';
      }

      detailedError += '\n📋 Raw error: ' + error.message;
      detailedError += '\n\n🔍 First 100 characters of input:\n';
      detailedError += `"${text
        .substring(0, 100)
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')}"`;

      setErrorMessage(detailedError);
      Analytics.track('program_imported', {
        valid: false,
        error_type: 'json_parse_error',
        week_count: 0,
        day_count: 0,
      });
      return null;
    }

    try {
      if (!parsed.routine_name || typeof parsed.routine_name !== 'string') {
        throw new Error('Invalid routine name');
      }

      if (!parsed.days_per_week || typeof parsed.days_per_week !== 'number') {
        throw new Error('Invalid days per week');
      }

      if (!Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
        throw new Error('No training blocks found');
      }

      if (parsed.description && typeof parsed.description !== 'string') {
        throw new Error('Description must be a string');
      }

      const parseWeeksRange = (
        weeks: string
      ): { startWeek: number; endWeek: number; weekCount: number } | null => {
        if (!weeks || typeof weeks !== 'string') {
          return null;
        }

        let startWeek: number, endWeek: number;

        if (weeks.includes('-')) {
          const parts = weeks.split('-');
          if (parts.length !== 2) return null;
          startWeek = parseInt(parts[0].trim());
          endWeek = parseInt(parts[1].trim());
        } else {
          const week = parseInt(weeks.trim());
          startWeek = endWeek = week;
        }

        if (
          !Number.isFinite(startWeek) ||
          !Number.isFinite(endWeek) ||
          startWeek <= 0 ||
          endWeek <= 0 ||
          endWeek < startWeek
        ) {
          return null;
        }

        return { startWeek, endWeek, weekCount: endWeek - startWeek + 1 };
      };

      parsed.blocks.forEach((block: any, blockIndex: number) => {
        if (!block.block_name || !block.weeks) {
          throw new Error(`Block ${blockIndex + 1} is incomplete`);
        }

        const weekRange = parseWeeksRange(block.weeks);
        if (!weekRange) {
          throw new Error(
            `Block "${block.block_name}" has invalid weeks field "${block.weeks}" - expected a range like "1-5" or a single number`
          );
        }
        const { weekCount } = weekRange;
        const expectedWeekKeys = Array.from({ length: weekCount }, (_, i) =>
          (i + 1).toString()
        );

        if (block.structure && typeof block.structure !== 'string') {
          throw new Error(`Block "${block.block_name}" has invalid structure field`);
        }

        if (block.deload_weeks) {
          if (!Array.isArray(block.deload_weeks)) {
            throw new Error(
              `Block "${block.block_name}" has invalid deload_weeks field - must be an array`
            );
          }
          block.deload_weeks.forEach((week: any) => {
            if (typeof week !== 'number' || week <= 0) {
              throw new Error(
                `Block "${block.block_name}" has invalid deload_weeks - must contain positive numbers`
              );
            }
            // CHECK 1: deload_weeks are BLOCK-RELATIVE (1..weekCount), same convention as sets_weekly keys
            if (week > weekCount) {
              throw new Error(
                `Block "${block.block_name}" has deload_weeks ${week} outside its ${weekCount}-week span`
              );
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

          if (
            day.estimated_duration &&
            (typeof day.estimated_duration !== 'number' || day.estimated_duration <= 0)
          ) {
            throw new Error(`"${day.day_name}" has invalid estimated_duration`);
          }

          const isRestDay = day.day_name && day.day_name.toUpperCase().includes('REST');
          if (!Array.isArray(day.exercises) || (day.exercises.length === 0 && !isRestDay)) {
            throw new Error(`"${day.day_name}" has no exercises`);
          }

          day.exercises.forEach((exercise: any, exerciseIndex: number) => {
            if (!exercise.type || typeof exercise.type !== 'string') {
              throw new Error(
                `Exercise ${exerciseIndex + 1} in "${day.day_name}" missing type field`
              );
            }

            // CHECK 2: Weekly data completeness (only for exercises with sets_weekly)
            if (exercise.sets_weekly) {
              const missingWeeks = expectedWeekKeys.filter(
                (weekKey) => !exercise.sets_weekly.hasOwnProperty(weekKey)
              );
              if (missingWeeks.length > 0) {
                throw new Error(
                  `Block "${block.block_name}" declares ${weekCount} weeks but exercise "${exercise.exercise}" is missing sets_weekly data for week(s) ${missingWeeks.join(', ')}`
                );
              }
            }

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
                throw new Error(
                  `Exercise "${exercise.exercise || exercise.activity || 'unknown'}" in "${day.day_name}" has invalid type: ${exercise.type}`
                );
            }
          });
        });
      });

      return parsed as WorkoutProgram;
    } catch (validationError) {
      const error = validationError as Error;
      setErrorMessage(
        `⚠️ Validation Error:\n\n${error.message}\n\n💡 This means your JSON was parsed successfully, but the workout program structure has issues. Please check that all required fields are present and correctly formatted.`
      );
      Analytics.track('program_imported', {
        valid: false,
        error_type: 'validation_error',
        week_count: 0,
        day_count: 0,
      });
      return null;
    }
  };

  /**
   * Meal plans arrive HERE, not at ImportMealPlanScreen.
   *
   * Every opened file deep-links to /import-file → ImportRoutine (see the routing
   * note in AppNavigator), so this screen is the single front door for both kinds
   * of export. Detection is on SHAPE, not filename: a meal plan has `dailyMeals`
   * and no `routine_name`. Anything ambiguous or unparseable falls through to the
   * workout path exactly as before, so this can only ever rescue a file the old
   * code was going to reject.
   */
  const looksLikeMealPlan = (text: string): boolean => {
    try {
      const parsed = JSON.parse(text);
      return (
        !!parsed &&
        typeof parsed === 'object' &&
        !!parsed.dailyMeals &&
        typeof parsed.dailyMeals === 'object' &&
        !parsed.routine_name
      );
    } catch {
      return false;
    }
  };

  /**
   * onFailure fires whenever the import does NOT produce a program (validation
   * rejected, or an unexpected error). The file-open/deep-link path passes one,
   * because this transient instance can be superseded before the ~800ms-deferred
   * setErrorMessage renders, leaving the user with no feedback.
   *
   * WARNING: this function's promise resolves ~800ms BEFORE validation runs.
   * Never await or sequence on it. The confirm UI is driven by the
   * showConfirmation / errorMessage state it eventually sets.
   */
  const processWorkoutData = async (text: string, onFailure?: () => void) => {
    if (looksLikeMealPlan(text)) {
      // replace, not navigate: the user opened a file, so they should land on the
      // meal importer rather than stacking it over a workout screen they never
      // asked for and can back into.
      navigation.replace('ImportMealPlan', { prefilledJson: text });
      return;
    }

    setIsLoading(true);
    const startTime = Date.now();

    setTimeout(() => {
      try {
        const program = validateAndParseJSON(text);
        const totalTime = (Date.now() - startTime) / 1000;

        setGenerationTime(totalTime);
        setIsLoading(false);

        if (program) {
          program.id = Date.now().toString() + Math.random().toString(36);
          setParsedProgram(program);
          setShowConfirmation(true);

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
        } else {
          onFailure?.();
        }
      } catch (outerError) {
        console.error('[PROCESS WORKOUT] error:', outerError);
        setIsLoading(false);
        setErrorMessage(
          'Failed to process workout data: ' +
            ((outerError as Error)?.message || 'Unknown error')
        );
        onFailure?.();
      }
    }, 800);
  };

  // ---------------------------------------------------------------------------
  // Confirm
  // ---------------------------------------------------------------------------
  const handleConfirmImport = async () => {
    if (!parsedProgram) return;

    const weekCount = (parsedProgram.blocks ?? []).reduce((total: number, block: any) => {
      const w = String(block.weeks ?? '');
      if (w.includes('-')) {
        const [start, end] = w.split('-');
        return total + (parseInt(end, 10) - parseInt(start, 10) + 1);
      }
      return total + (parseInt(w, 10) || 1);
    }, 0);
    const dayCount = (parsedProgram.blocks ?? []).reduce(
      (total: number, block: any) => total + (block.days?.length || 0),
      0
    );
    Analytics.track('program_imported', {
      valid: true,
      error_type: null,
      week_count: weekCount,
      day_count: dayCount,
    });

    try {
      await handleMesocycleProgramAssociation(parsedProgram);

      Animated.sequence([
        Animated.spring(successScale, { toValue: 1.2, useNativeDriver: true }),
        Animated.spring(successScale, { toValue: 1, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
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

          await checkMesocycleCompletion();
          await WorkoutStorage.setAwaitingImport(false);

          navigation.navigate('Main', {
            screen: 'Workouts',
            params: {
              importedProgram: parsedProgram,
              refreshRoutines: true,
            },
          } as any);
        });
      }, 500);
    } catch (error) {
      console.error('Error during import:', error);
      Alert.alert(
        'Import Error',
        'There was an error associating this import with your program. The import will continue normally.'
      );

      WorkoutStorage.setAwaitingImport(false).catch(() => {});

      navigation.navigate('Main', {
        screen: 'Workouts',
        params: {
          importedProgram: parsedProgram,
          refreshRoutines: true,
        },
      } as any);
    }
  };

  /**
   * Cancel means LEAVE, and it means leave CLEAN.
   *
   * This is the bug that made the X look dead and broke every second import. The
   * old version returned early on the file/share paths after calling navigate,
   * without clearing showConfirmation or parsedProgram. Because AppModal is a
   * native modal it stayed presented over the destination, so the tap looked
   * ignored; and because parsedProgram survived, every import effect stayed
   * guarded shut, so the next file open did nothing and the screen fell through
   * to its default render, which used to be the paste UI.
   *
   * Every reset now happens SYNCHRONOUSLY, before navigating, on every path.
   */
  const handleModalCancel = () => {
    setShowConfirmation(false);
    setParsedProgram(null);
    setErrorMessage(null);
    setGenerationTime(null);
    modalScale.setValue(0);
    modalOpacity.setValue(0);
    successScale.setValue(0);

    WorkoutStorage.setAwaitingImport(false).catch(() => {});

    // The latches are deliberately NOT cleared. The params that fed them are
    // still on the route, so clearing a latch here would immediately re-import
    // the thing the user just declined. A fresh delivery carries a new
    // receivedAt, which is what makes reopening the same file work.
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main' as any);
    }
  };

  // ---------------------------------------------------------------------------
  // Mesocycle association
  // ---------------------------------------------------------------------------
  const loadMesocycleContext = async () => {
    try {
      const questionnaireData = await loadQuestionnaireData();
      const duration = questionnaireData.programDuration || '12_weeks';
      const isLongProgram = ['6_months', '1_year', 'custom'].includes(duration);

      if (isLongProgram) {
        const programs = await ProgramStorage.loadPrograms();
        const matchingPrograms = programs.filter((p) => p.programDuration === duration);
        const existingProgram =
          matchingPrograms.length > 0
            ? matchingPrograms.sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )[0]
            : null;

        if (existingProgram) {
          setCurrentProgram(existingProgram);

          const context: ProgramContext = {
            totalMesocycles: existingProgram.totalMesocycles,
            currentMesocycle: existingProgram.currentMesocycle,
            mesocycleWeeks: Math.floor(
              getDurationWeeks(duration) / existingProgram.totalMesocycles
            ),
            mesocycleBlocks: Math.floor(
              existingProgram.mesocycleRoadmap.length > 0
                ? existingProgram.mesocycleRoadmap[0].blocks
                : calculateDefaultBlocks(duration)
            ),
            mesocycleRoadmapText: existingProgram.mesocycleRoadmapText,
            previousMesocycleSummary:
              existingProgram.completedMesocycles.length > 0
                ? existingProgram.completedMesocycles[
                    existingProgram.completedMesocycles.length - 1
                  ]
                : undefined,
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
      case '6_months':
        return 26;
      case '1_year':
        return 52;
      case 'custom':
        return 52;
      default:
        return 12;
    }
  };

  const calculateDefaultBlocks = (duration: string): number => {
    switch (duration) {
      case '6_months':
        return 2;
      case '1_year':
        return 3;
      case 'custom':
        return 3;
      default:
        return 2;
    }
  };

  const createMesocycleRoutines = async (
    importedProgram: WorkoutProgram,
    metadata: any,
    baseRoutineId: string
  ) => {
    try {
      const totalBlocks = importedProgram.blocks.length;
      const blocksPerMesocycle = Math.ceil(totalBlocks / metadata.totalMesocycles);

      for (let i = 0; i < metadata.totalMesocycles; i++) {
        const mesocycleNumber = i + 1;
        const mesocycleName =
          metadata.mesocycleRoadmap?.[i]?.phaseName || `Mesocycle ${mesocycleNumber}`;

        const startIdx = i * blocksPerMesocycle;
        const endIdx = Math.min(startIdx + blocksPerMesocycle, totalBlocks);
        const mesocycleBlocks = importedProgram.blocks.slice(startIdx, endIdx);

        if (mesocycleBlocks.length === 0) continue;

        const mesocycleRoutine = {
          id: `${baseRoutineId}_meso_${mesocycleNumber}`,
          name: `${metadata.currentDisplayName || importedProgram.routine_name}`,
          days: importedProgram.days_per_week,
          blocks: mesocycleBlocks.length,
          data: {
            ...importedProgram,
            routine_name: `${metadata.currentDisplayName || importedProgram.routine_name} — ${mesocycleName}`,
            blocks: mesocycleBlocks,
          },
          programId: metadata.originalProgramId,
          mesocycleNumber: mesocycleNumber,
        };

        await WorkoutStorage.addRoutine(mesocycleRoutine);
        await restoreCompleteStateForMesocycle(
          mesocycleRoutine.id,
          metadata,
          mesocycleNumber
        );
      }
    } catch (error) {
      console.error('Error creating mesocycle routines:', error);
      throw error;
    }
  };

  const restoreCompleteStateForMesocycle = async (
    routineId: string,
    metadata: any,
    mesocycleNumber: number
  ) => {
    try {
      if (metadata.manualBlocks) {
        const mesocycleManualBlocks = metadata.manualBlocks.filter(
          (block: any) => block.mesocycleNumber === mesocycleNumber
        );

        if (mesocycleManualBlocks.length > 0) {
          const storageKey = `manual_blocks_mesocycle_${mesocycleNumber}`;
          const cleanBlocks = mesocycleManualBlocks.map((block: any) => {
            const cleanBlock = { ...block };
            delete cleanBlock.mesocycleNumber;
            return cleanBlock;
          });
          await AsyncStorage.setItem(storageKey, JSON.stringify(cleanBlocks));
        }
      }

      if (metadata.completionStatus) {
        await AsyncStorage.setItem(
          `completion_${routineId}`,
          JSON.stringify(metadata.completionStatus)
        );
      }

      if (metadata.workoutHistory) {
        await AsyncStorage.setItem(
          `workoutHistory_${routineId}`,
          JSON.stringify(metadata.workoutHistory)
        );
      }

      const dataCategories = [
        { source: 'exerciseCustomizations', prefix: 'day_customization_' },
        { source: 'dynamicExercisesData', prefix: 'workout_' },
        { source: 'setsData', prefix: 'workout_' },
      ];

      for (const category of dataCategories) {
        const sourceData = metadata[category.source];
        if (sourceData) {
          for (const [originalKey, data] of Object.entries(sourceData)) {
            const newKey = originalKey.replace(metadata.routineId, routineId);
            await AsyncStorage.setItem(newKey, JSON.stringify(data));
          }
        }
      }
    } catch (error) {
      console.log(`Could not restore data for mesocycle ${mesocycleNumber}:`, error);
    }
  };

  const handleMesocycleProgramAssociation = async (importedProgram: WorkoutProgram) => {
    try {
      const metadata = (importedProgram as any)._metadata;

      if (metadata && metadata.exportType === 'unified_mesocycle_structure') {
        return await handleUnifiedMesocycleImport(importedProgram, metadata);
      }

      return await handleLegacyMesocycleImport(importedProgram, metadata);
    } catch (error) {
      console.error('Error in mesocycle import:', error);
      Alert.alert(
        'Import Error',
        'Failed to import mesocycle data. The routine will be imported without mesocycle structure.'
      );
    }
  };

  const handleUnifiedMesocycleImport = async (
    importedProgram: WorkoutProgram,
    metadata: any
  ) => {
    try {
      const allMesocycles = metadata.allMesocycles || [];
      let program = currentProgram;

      const programMesocycles = allMesocycles.filter((m: any) => !m.isCustom);
      const customMesocycles = allMesocycles.filter((m: any) => m.isCustom);

      if (!program && programMesocycles.length > 0) {
        const mesocycleRoadmap = programMesocycles.map((m: any) => ({
          mesocycleNumber: m.mesocycleNumber,
          phaseName: m.phaseName,
          repFocus: m.repFocus,
          emphasis: m.emphasis,
          weeks: m.weeks,
          blocks: m.blocks,
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
          routineIds: [],
        };

        await ProgramStorage.addProgram(program);
      }

      if (isCurated && curatedSlug) {
        const curatedFingerprint = `curated:${curatedSlug}`;
        const existingRoutines = await WorkoutStorage.loadRoutines();
        const existingRoutine = existingRoutines.find(
          (r) => r.fingerprint === curatedFingerprint
        );

        if (existingRoutine) {
          navigation.navigate('Main' as any);
          Alert.alert(
            'Program Already Added',
            `You already have "${existingRoutine.name}". Opening your existing copy.`
          );
          return existingRoutine;
        }
      }

      const newRoutineId =
        Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newRoutine: WorkoutRoutine = {
        id: newRoutineId,
        name: metadata.currentDisplayName || importedProgram.routine_name,
        days: metadata.originalDaysPerWeek || importedProgram.days_per_week || 5,
        blocks: importedProgram.blocks?.length || 0,
        data: importedProgram,
        programId: program?.id,
        fingerprint: isCurated && curatedSlug ? `curated:${curatedSlug}` : undefined,
      };

      const existingRoutines = await WorkoutStorage.loadRoutines();
      existingRoutines.push(newRoutine);
      await WorkoutStorage.saveRoutines(existingRoutines);

      if (customMesocycles.length > 0) {
        const customMesocyclesKey = `custom_mesocycles_${newRoutineId}`;
        const customMesocycleData = customMesocycles.map((m: any) => ({
          mesocycleNumber: m.mesocycleNumber,
          phase: {
            mesocycleNumber: m.mesocycleNumber,
            phaseName: m.phaseName,
            repFocus: m.repFocus,
            emphasis: m.emphasis,
            weeks: m.weeks,
            blocks: m.blocks,
          },
          blocksInMesocycle: [],
          completedBlocks: 0,
          totalBlocks: 0,
          isCompleted: false,
          isActive: false,
          isCustomMesocycle: true,
          customId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        }));

        await AsyncStorage.setItem(
          customMesocyclesKey,
          JSON.stringify(customMesocycleData)
        );
      }

      const enhancedMetadata = { ...metadata, importedProgram };
      await restoreCompleteStateForUnified(enhancedMetadata, newRoutineId);

      return newRoutine;
    } catch (error) {
      console.error('Error in unified import:', error);
      throw error;
    }
  };

  const handleLegacyMesocycleImport = async (
    importedProgram: WorkoutProgram,
    metadata: any
  ) => {
    console.log('Using legacy import - consider re-exporting with new format');
    return null;
  };

  const restoreCompleteStateForUnified = async (metadata: any, newRoutineId: string) => {
    if (!metadata) return;

    try {
      if (metadata.importedProgram) {
        const customMesocycles = (metadata.importedProgram as any)._customMesocycles;
        if (customMesocycles && customMesocycles.length > 0) {
          const customMesocyclesKey = `custom_mesocycles_${newRoutineId}`;

          const updatedCustomMesocycles = customMesocycles.map((mesocycle: any) => ({
            ...mesocycle,
            customId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          }));

          await AsyncStorage.setItem(
            customMesocyclesKey,
            JSON.stringify(updatedCustomMesocycles)
          );

          for (let i = 0; i < customMesocycles.length; i++) {
            const originalCustomId = customMesocycles[i].customId;
            const newCustomId = updatedCustomMesocycles[i].customId;

            const customManualBlocks = metadata.manualBlocks?.filter(
              (block: any) => block.customMesocycleId === originalCustomId
            );

            if (customManualBlocks && customManualBlocks.length > 0) {
              const cleanBlocks = customManualBlocks.map((block: any) => {
                const cleanBlock = { ...block };
                delete cleanBlock.customMesocycleId;
                return cleanBlock;
              });

              await AsyncStorage.setItem(
                `manual_blocks_${newCustomId}`,
                JSON.stringify(cleanBlocks)
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Error restoring complete state:', error);
    }
  };

  const checkMesocycleCompletion = async () => {
    try {
      if (!currentProgram || !mesocycleContext) {
        return;
      }

      const currentBlocks = currentProgram.routineIds.length;

      if (currentBlocks >= mesocycleContext.mesocycleBlocks) {
        const routines = await WorkoutStorage.loadRoutines();
        const mesocycleRoutines = routines
          .filter((r) => currentProgram.routineIds.includes(r.id))
          .slice(-mesocycleContext.mesocycleBlocks);

        if (mesocycleRoutines.length === mesocycleContext.mesocycleBlocks) {
          const currentPhase =
            currentProgram.mesocycleRoadmap[mesocycleContext.currentMesocycle - 1];
          const phaseName =
            currentPhase?.phaseName || `Mesocycle ${mesocycleContext.currentMesocycle}`;

          const summary = extractMesocycleSummary(mesocycleRoutines, phaseName);
          summary.mesocycleNumber = mesocycleContext.currentMesocycle;

          await ProgramStorage.completeMesocycle(currentProgram.id, summary);

          const isLastMesocycle =
            mesocycleContext.currentMesocycle >= mesocycleContext.totalMesocycles;

          if (isLastMesocycle) {
            Alert.alert(
              'Program Complete! 🎉',
              `Congratulations! You've completed all ${mesocycleContext.totalMesocycles} mesocycles of your program.`,
              [{ text: 'Awesome!' }]
            );
          } else {
            Alert.alert(
              'Mesocycle Complete! ✅',
              `Mesocycle ${mesocycleContext.currentMesocycle} complete. When you're ready, generate your next mesocycle.`,
              [{ text: 'Got it!' }]
            );
          }

          await loadMesocycleContext();
        }
      }
    } catch (error) {
      console.error('Error checking mesocycle completion:', error);
    }
  };

  const loadQuestionnaireData = async (): Promise<QuestionnaireData> => {
    try {
      const [fitnessGoalsData, equipmentPreferencesData] = await Promise.all([
        AsyncStorage.getItem('fitnessGoalsData'),
        AsyncStorage.getItem('equipmentPreferencesData'),
      ]);

      let fitnessGoals: any = {};
      let equipmentPrefs: any = {};

      try {
        fitnessGoals = fitnessGoalsData ? JSON.parse(fitnessGoalsData) : {};
      } catch {
        fitnessGoals = {};
      }

      try {
        equipmentPrefs = equipmentPreferencesData
          ? JSON.parse(equipmentPreferencesData)
          : {};
      } catch {
        equipmentPrefs = {};
      }

      const consolidatedData: QuestionnaireData = {
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

        selectedEquipment: equipmentPrefs.selectedEquipment,
        specificEquipment: equipmentPrefs.specificEquipment,
        unavailableEquipment: equipmentPrefs.unavailableEquipment,
        sessionStyle: equipmentPrefs.sessionStyle,
        likedExercises: equipmentPrefs.likedExercises,
        dislikedExercises: equipmentPrefs.dislikedExercises,
      };

      const cleanedData = Object.fromEntries(
        Object.entries(consolidatedData).filter(([, value]) => {
          return (
            value !== undefined &&
            value !== null &&
            value !== '' &&
            !(Array.isArray(value) && value.length === 0) &&
            !(typeof value === 'object' && Object.keys(value).length === 0)
          );
        })
      );

      if (!cleanedData.primaryGoal) cleanedData.primaryGoal = 'build_muscle';
      if (!cleanedData.selectedEquipment) cleanedData.selectedEquipment = ['commercial_gym'];
      if (!cleanedData.trainingExperience) cleanedData.trainingExperience = 'intermediate';
      if (!cleanedData.sessionStyle) cleanedData.sessionStyle = 'moderate';

      return cleanedData;
    } catch (error) {
      console.error('Error loading questionnaire data:', error);
      return {
        primaryGoal: 'build_muscle',
        selectedEquipment: ['commercial_gym'],
        trainingExperience: 'intermediate',
        volumePreference: '12-16',
        gender: 'male',
        programDuration: '12_weeks',
        sessionStyle: 'moderate',
      };
    }
  };

  // ---------------------------------------------------------------------------
  // Render. Only three possible states: working, failed, or confirming.
  // There is no fourth "idle" state, which is the whole point of this rewrite.
  // ---------------------------------------------------------------------------
  if (errorMessage) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorHeader}>
          <View style={{ width: 44 }} />
          <TouchableOpacity onPress={handleModalCancel} style={styles.closeButton}>
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
              handleModalCancel();
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

  // Everything that is not an error and not a confirmation is "still working".
  // Previously this fell through to the paste UI, which is why cancelled and
  // repeated imports appeared to navigate to a screen nobody asked for.
  if (!showConfirmation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColor} />
        <Text style={styles.loadingText}>
          {shareId ? 'Loading shared workout...' : 'Processing your plan...'}
        </Text>
      </View>
    );
  }

  const weekTotal = (parsedProgram?.blocks ?? []).reduce((total: number, block: any) => {
    const w = String(block.weeks ?? '');
    if (w.includes('-')) {
      const [a, b] = w.split('-');
      return total + (parseInt(b, 10) - parseInt(a, 10) + 1);
    }
    return total + (parseInt(w, 10) || 1);
  }, 0);

  const movementCount = (() => {
    const unique = new Set<string>();
    parsedProgram?.blocks.forEach((block) =>
      block.days.forEach((day) =>
        day.exercises.forEach((exercise: any) => {
          const name =
            exercise.type === 'strength'
              ? exercise.exercise
              : exercise.type === 'cardio'
              ? exercise.activity
              : exercise.type === 'stretch'
              ? exercise.exercise
              : exercise.type === 'circuit'
              ? exercise.circuit_name
              : exercise.type === 'sport'
              ? exercise.activity
              : 'Unknown';
          unique.add(name);
        })
      )
    );
    return unique.size;
  })();

  const blockChips = (parsedProgram?.blocks ?? []).slice(0, 2);
  const extraBlocks = Math.max(0, (parsedProgram?.blocks?.length ?? 0) - blockChips.length);

  return (
    <AppModal
      visible={showConfirmation}
      transparent
      animationType="none"
      // Android hardware back. Without this, back does NOTHING while this modal is
      // open, and before the RNGH/AppModal touch fix its buttons were dead too, so
      // an Android user who reached this screen was hard-trapped.
      onRequestClose={handleModalCancel}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: modalOpacity }]}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{ scale: modalScale }],
              opacity: modalOpacity,
              borderColor: themeColor,
              shadowColor: themeColor,
            },
          ]}
        >
          <View>
            <ImportHeroWorkout />

            {/* box-none so only the two controls take touches, not the whole band */}
            <View style={styles.heroOverlay} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleModalCancel}
                hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                activeOpacity={0.8}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color="#e4e4e7" />
              </TouchableOpacity>

              {generationTime != null && (
                <View style={[styles.timeBadge, { borderColor: themeColor }]}>
                  <Text style={[styles.timeBadgeText, { color: themeColor }]}>
                    Ready in {generationTime.toFixed(1)}s
                  </Text>
                </View>
              )}
            </View>
          </View>

          <ScrollView style={styles.confirmScroll} showsVerticalScrollIndicator>
            <View style={styles.titleBlock}>
              <Text style={[styles.eyebrow, { color: themeColor }]}>WORKOUT PROGRAM</Text>
              <Text style={styles.planName}>{parsedProgram?.routine_name}</Text>
              <Text style={styles.subtitle}>
                {parsedProgram?.blocks?.length}{' '}
                {parsedProgram?.blocks?.length === 1 ? 'block' : 'blocks'}
              </Text>
            </View>

            <View style={styles.statStrip}>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: themeColor }]}>
                  {parsedProgram?.days_per_week}
                </Text>
                <Text style={styles.statLabel}>days / wk</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: themeColor }]}>{weekTotal}</Text>
                <Text style={styles.statLabel}>weeks</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: themeColor }]}>
                  {movementCount}
                </Text>
                <Text style={styles.statLabel}>movements</Text>
              </View>
            </View>

            {blockChips.length > 0 && (
              <View style={styles.insideBlock}>
                <Text style={styles.insideLabel}>INSIDE</Text>
                <View style={styles.chipRow}>
                  {blockChips.map((block: any, i: number) => (
                    <View key={`${block.block_name}-${i}`} style={styles.chip}>
                      <Text style={styles.chipText} numberOfLines={1}>
                        {block.block_name} · wk {block.weeks}
                      </Text>
                    </View>
                  ))}
                  {extraBlocks > 0 && (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>+{extraBlocks} more</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: themeColor }]}
              onPress={handleConfirmImport}
              activeOpacity={0.9}
            >
              <Text style={styles.createButtonText}>Start training</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleModalCancel}
              activeOpacity={0.7}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Text style={styles.dismissText}>Not this one? Close</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
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
    width: '90%',
    maxWidth: 420,
    height: '65%',
    alignSelf: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  // Shrinks within the fixed-height card so the pinned action footer stays on
  // screen. A long routine name scrolls instead of pushing the button off.
  confirmScroll: {
    flexShrink: 1,
    alignSelf: 'stretch',
  },
  // Sits over the hero band.
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 132,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBadge: {
    backgroundColor: 'rgba(10,10,11,0.7)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  titleBlock: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 6,
  },
  planName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 6,
  },
  statStrip: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: 'rgba(39, 39, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(113, 113, 122, 0.2)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  stat: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(113, 113, 122, 0.2)',
  },
  statValue: {
    fontSize: 19,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10.5,
    color: '#a1a1aa',
    marginTop: 2,
  },
  insideBlock: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  insideLabel: {
    fontSize: 11,
    color: '#52525b',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: '100%',
  },
  chipText: {
    fontSize: 11.5,
    color: '#d4d4d8',
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  createButton: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0a0a0b',
  },
  dismissText: {
    fontSize: 12,
    color: '#52525b',
    textAlign: 'center',
    marginTop: 12,
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