import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Share,
  Platform,
  Modal,
  Animated,
  Image,
  Dimensions,
  TextInput,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { TouchableOpacity as RNTouchable } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RobustStorage from '../utils/robustStorage';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createShare, ShareError } from '../services/shareService';
import { RootStackParamList } from '../navigation/AppNavigator';
import { WorkoutStorage, WorkoutRoutine, MealPlan } from '../utils/storage';
import WorkoutCalendar from '../components/WorkoutCalendar';
import ImportFeedbackModal from '../components/ImportFeedbackModal';
import OnboardingSlideshow from '../components/OnboardingSlideshow';
import { useImportFeedback } from '../hooks/useImportFeedback';
import { useTheme } from '../contexts/ThemeContext';
import { ENABLE_NUTRITION_PAYWALL } from '../config/revenueCatConfig';
import { useAppMode } from '../contexts/AppModeContext';
import { useHasNutritionAccess } from '../contexts/RevenueCatContext';
import { useWorkoutRoutines } from '../contexts/WorkoutRoutineContext';
import { getProgramImage } from '../assets/programImages';
import { SAMPLE_PLANS } from '../data/samplePlans';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// Bulking programs — gradient fallback colors (used when no image is found).
// The card data itself now comes from SAMPLE_PLANS (src/data/samplePlans).
// ============================================================================
const PROGRAM_GRADIENTS: Record<string, [string, string]> = {
  foundations: ['#1a1a1a', '#2d1410'],
  builder: ['#1a1a1a', '#3a1f1a'],
  mass: ['#1a1a1a', '#4a2820'],
};

// ============================================================================
// Week strip
// ============================================================================
type DayState = 'workedOut' | 'skipped' | 'today' | 'future';

function getWeekDays(workoutDates: Set<string>): Array<{ letter: string; state: DayState; date: Date }> {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);

  const todayKey = new Date().toDateString();

  const days: Array<{ letter: string; state: DayState; date: Date }> = [];
  const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dKey = d.toDateString();

    let state: DayState;
    if (dKey === todayKey) {
      state = 'today';
    } else if (d > today) {
      state = 'future';
    } else if (workoutDates.has(dKey)) {
      state = 'workedOut';
    } else {
      state = 'skipped';
    }

    days.push({ letter: letters[i], state, date: d });
  }

  return days;
}

export default function HomeScreen({ route, transitionProgress, panGestureRef }: any) {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();

  const [hasRunTest, setHasRunTest] = useState(true);

  const { routines, isLoading, saveRoutine, deleteRoutine: deleteRoutineFromContext, loadRoutines } = useWorkoutRoutines();

  const [shareModal, setShareModal] = useState<{
    visible: boolean;
    routine: WorkoutRoutine | null;
    qrCode?: string;
    shareUrl?: string;
    isGenerating?: boolean;
    error?: string;
    isAnimating?: boolean;
  }>({
    visible: false,
    routine: null,
    qrCode: undefined,
    shareUrl: undefined,
    isGenerating: false,
    error: undefined,
    isAnimating: false,
  });
  const [calendarModal, setCalendarModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ visible: boolean; routine: WorkoutRoutine | null }>({
    visible: false,
    routine: null,
  });

  const [debugModal, setDebugModal] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string>('');
  const [debugLogsCopied, setDebugLogsCopied] = useState(false);

  const debugLog = useCallback((message: string) => {
    console.log(message);
    setDebugLogs(prev => prev + `${new Date().toISOString()}: ${message}\n`);
  }, []);

  const [savedWorkoutRoutines, setSavedWorkoutRoutines] = useState<Set<string>>(new Set());
  const [myRoutines, setMyRoutines] = useState<WorkoutRoutine[]>([]);
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set());
  const [renameModal, setRenameModal] = useState<{ visible: boolean; routine: WorkoutRoutine | null; newName: string }>({
    visible: false,
    routine: null,
    newName: '',
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shareModalOpacity = useRef(new Animated.Value(0)).current;

  const { showFeedbackModal, submitFeedback, skipFeedback, triggerFeedbackModal } = useImportFeedback();
  const { isPinkTheme, setIsPinkTheme, themeColor, themeColorLight } = useTheme();
  const { appMode, setAppMode, isTrainingMode, isNutritionMode, isTransitioning, setIsTransitioning } = useAppMode();
  const hasNutritionAccess = useHasNutritionAccess();

  const showShareModal = (routine: WorkoutRoutine) => {
    setShareModal({
      visible: true,
      routine,
      qrCode: undefined,
      shareUrl: undefined,
      isGenerating: true,
      error: undefined,
      isAnimating: true,
    });

    shareModalOpacity.setValue(0);
    Animated.timing(shareModalOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShareModal(prev => ({ ...prev, isAnimating: false }));
    });
  };

  const hideShareModal = () => {
    setShareModal(prev => ({ ...prev, isAnimating: true }));

    Animated.timing(shareModalOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShareModal({
        visible: false,
        routine: null,
        qrCode: undefined,
        shareUrl: undefined,
        isGenerating: false,
        error: undefined,
        isAnimating: false,
      });
    });
  };

  useEffect(() => {
    const initializeApp = async () => {
      await WorkoutStorage.cleanupCorruptedCompletionData();
      loadMyRoutines();
      loadWeekHistory();
    };
    initializeApp();
  }, []);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    if (__DEV__) {
      await AsyncStorage.removeItem('onboarding_completed');
    }
    const isCompleted = await WorkoutStorage.isOnboardingCompleted();
    if (!isCompleted) {
      setShowOnboarding(true);
    }
  };

  useEffect(() => {
    const handleImportedProgram = async () => {
      if (route?.params?.importedProgram) {
        const program = route.params.importedProgram;

        const metadata = (program as any)._metadata;
        if (metadata && metadata.exportType === 'unified_mesocycle_structure') {
          await loadRoutines();
          navigation.setParams({ importedProgram: undefined } as any);
          return;
        }

        const sampleWorkoutIds = [
          'sample_quick_start_ppl',
          'sample_muscle_builder_pro_52w',
          'sample_glute_tone_12w'
        ];

        if (program.id && sampleWorkoutIds.includes(program.id)) {
          Alert.alert(
            'Already Available',
            'This workout has been imported previously. You can access it anytime from your saved workouts.',
            [{ text: 'OK' }]
          );
          navigation.setParams({ importedProgram: undefined } as any);
          return;
        }

        let mesocycleNumber: number | undefined;
        if (program.programId) {
          try {
            const { ProgramStorage } = await import('../data/programStorage');
            const mesocycleProgram = await ProgramStorage.getProgram(program.programId);
            mesocycleNumber = mesocycleProgram?.currentMesocycle;
          } catch (error) {
            console.error('Failed to get mesocycle program:', error);
          }
        }

        const newRoutine: WorkoutRoutine = {
          id: Date.now().toString(),
          name: program.routine_name,
          days: program.days_per_week,
          blocks: program.blocks.length,
          data: program,
          programId: program.programId,
          mesocycleNumber,
        };
        await saveRoutine(newRoutine);

        if (program.programId) {
          try {
            const { ProgramStorage } = await import('../data/programStorage');
            await ProgramStorage.addRoutineToProgram(program.programId, newRoutine.id);
          } catch (error) {
            console.error('Failed to link routine to program:', error);
          }
        }

        if (program.id) {
          setTimeout(() => {
            triggerFeedbackModal(program.id);
          }, 100);
        }

        navigation.setParams({ importedProgram: undefined } as any);
      }
    };

    handleImportedProgram();
  }, [route?.params?.importedProgram, triggerFeedbackModal]);

  const loadMyRoutines = async () => {
    const myRoutinesList = await WorkoutStorage.loadMyRoutines();

    if (!Array.isArray(myRoutinesList)) {
      setMyRoutines([]);
      setSavedWorkoutRoutines(new Set());
      return;
    }

    setMyRoutines(myRoutinesList);

    const routineIds = new Set(myRoutinesList.map(routine => routine.fingerprint || routine.id));
    setSavedWorkoutRoutines(routineIds);
  };

  const loadWeekHistory = async () => {
    try {
      const history = await WorkoutStorage.loadWorkoutHistory();
      const dates = new Set<string>();
      history.forEach((workout: any) => {
        let dateKey: string | null = null;
        if (workout.timestamp) {
          dateKey = new Date(workout.timestamp).toDateString();
        } else if (workout.date) {
          const [y, m, d] = workout.date.split('-');
          dateKey = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).toDateString();
        }
        if (dateKey) dates.add(dateKey);
      });
      setWorkoutDates(dates);
    } catch (e) {
      console.warn('Could not load workout history for week strip', e);
      setWorkoutDates(new Set());
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadRoutines();
      await loadMyRoutines();
      await loadWeekHistory();
    } finally {
      setRefreshing(false);
    }
  }, [loadRoutines]);

  const handleExport = async (routine: WorkoutRoutine) => {
    if (!routine.data) return;

    showShareModal(routine);

    try {
      let exportData = { ...routine.data };

      if (routine.data?._metadata?.isSamplePlan && exportData._metadata?.exercisePreferences) {
        delete exportData._metadata.exercisePreferences;
      }
      let programData = null;

      if (routine.programId) {
        const { ProgramStorage } = await import('../data/programStorage');
        programData = await ProgramStorage.getProgram(routine.programId);
      }

      const manualBlocks = [];
      const completionStatus = {};
      const workoutHistory = [];

      if (programData && programData.totalMesocycles > 1) {
        for (let mesocycleNum = 1; mesocycleNum <= programData.totalMesocycles; mesocycleNum++) {
          const manualBlocksKey = `manual_blocks_mesocycle_${mesocycleNum}`;
          try {
            const manualBlocksData = await AsyncStorage.getItem(manualBlocksKey);
            if (manualBlocksData) {
              const mesocycleManualBlocks = JSON.parse(manualBlocksData);
              manualBlocks.push(...mesocycleManualBlocks.map(block => ({
                ...block,
                mesocycleNumber: mesocycleNum
              })));
            }
          } catch (error) {
            console.log(`Could not load manual blocks for mesocycle ${mesocycleNum}`);
          }
        }
      } else {
        try {
          const manualBlocksData = await AsyncStorage.getItem('manual_blocks');
          if (manualBlocksData) {
            const parsedManualBlocks = JSON.parse(manualBlocksData);
            manualBlocks.push(...parsedManualBlocks);
          }
        } catch (error) {
          console.log('Could not load manual blocks');
        }
      }

      try {
        const statusData = await AsyncStorage.getItem('workout_completion_status');
        if (statusData) {
          Object.assign(completionStatus, JSON.parse(statusData));
        }
      } catch (error) {
        console.log('Could not load completion status');
      }

      const completeExport = {
        workoutData: exportData,
        manualBlocks: manualBlocks,
        completionStatus: completionStatus,
        workoutHistory: workoutHistory,
        exportMetadata: {
          routineName: routine.name,
          routineId: routine.id,
          exportDate: new Date().toISOString(),
          source: "JSON.fit",
          includesCustomizations: manualBlocks.length > 0
        }
      };

      const shareResult = await createShare(completeExport);

      setShareModal(prev => ({
        ...prev,
        qrCode: shareResult.shareUrl,
        shareUrl: shareResult.shareUrl,
        isGenerating: false
      }));
    } catch (error) {
      console.error('Error generating share link:', error);
      let errorMessage = 'Failed to create share link';

      if (error instanceof ShareError) {
        switch (error.code) {
          case 'TOO_LARGE':
            errorMessage = 'Workout is too large to share';
            break;
          case 'NETWORK_ERROR':
            errorMessage = 'Check your connection';
            break;
          case 'TIMEOUT':
            errorMessage = 'Request timed out';
            break;
          default:
            errorMessage = error.message;
        }
      }

      setShareModal(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage
      }));
    }
  };

  const handleShare = async (action: 'copy' | 'share' | 'shareUrl' | 'retry') => {
    const routine = shareModal.routine;
    if (!routine?.data) return;

    if (action === 'retry') {
      handleExport(routine);
      return;
    }

    if (action === 'shareUrl' && shareModal.shareUrl) {
      try {
        await Share.share({
          url: shareModal.shareUrl,
          message: shareModal.shareUrl,
        });
        hideShareModal();
        return;
      } catch (error) {
        console.error('Error sharing URL:', error);
        return;
      }
    }

    try {
      let exportData = { ...routine.data };

      if (routine.data?._metadata?.isSamplePlan && exportData._metadata?.exercisePreferences) {
        delete exportData._metadata.exercisePreferences;
      }
      let programData = null;

      if (routine.programId) {
        const { ProgramStorage } = await import('../data/programStorage');
        programData = await ProgramStorage.getProgram(routine.programId);
      }

      const manualBlocks = [];
      const completionStatus = {};
      const workoutHistory = [];

      if (programData && programData.totalMesocycles > 1) {
        for (let mesocycleNum = 1; mesocycleNum <= programData.totalMesocycles; mesocycleNum++) {
          const manualBlocksKey = `manual_blocks_mesocycle_${mesocycleNum}`;
          try {
            const manualBlocksData = await AsyncStorage.getItem(manualBlocksKey);
            if (manualBlocksData) {
              const mesocycleManualBlocks = JSON.parse(manualBlocksData);
              manualBlocks.push(...mesocycleManualBlocks.map(block => ({
                ...block,
                mesocycleNumber: mesocycleNum
              })));
            }
          } catch (error) {
            console.log(`Could not load manual blocks for mesocycle ${mesocycleNum}`);
          }
        }

        try {
          const customMesocyclesKey = `custom_mesocycles_${routine.id}`;
          const customMesocyclesData = await AsyncStorage.getItem(customMesocyclesKey);
          if (customMesocyclesData) {
            const customMesocycles = JSON.parse(customMesocyclesData);
            for (const customMeso of customMesocycles) {
              if (customMeso.customId) {
                const customManualBlocksKey = `manual_blocks_${customMeso.customId}`;
                const customManualBlocksData = await AsyncStorage.getItem(customManualBlocksKey);
                if (customManualBlocksData) {
                  const customManualBlocks = JSON.parse(customManualBlocksData);
                  manualBlocks.push(...customManualBlocks.map(block => ({
                    ...block,
                    customMesocycleId: customMeso.customId
                  })));
                }
              }
            }

            exportData._customMesocycles = customMesocycles;
          }
        } catch (error) {
          console.log('Could not load custom mesocycles');
        }
      } else {
        const manualBlocksKey = `manual_blocks_${routine.id}`;
        try {
          const manualBlocksData = await AsyncStorage.getItem(manualBlocksKey);
          if (manualBlocksData) {
            const singleManualBlocks = JSON.parse(manualBlocksData);
            manualBlocks.push(...singleManualBlocks);
          }
        } catch (error) {
          console.log('Could not load manual blocks');
        }
      }

      try {
        const completionKey = `completion_${routine.id}`;
        const completionData = await AsyncStorage.getItem(completionKey);
        if (completionData) {
          Object.assign(completionStatus, JSON.parse(completionData));
        }
      } catch (error) {
        console.log('Could not load completion status');
      }

      try {
        const historyKey = `workoutHistory_${routine.id}`;
        const historyData = await AsyncStorage.getItem(historyKey);
        if (historyData) {
          workoutHistory.push(...JSON.parse(historyData));
        }
      } catch (error) {
        console.log('Could not load workout history');
      }

      const exerciseCustomizations = {};
      const dynamicExercisesData = {};
      const setsData = {};

      if (routine.data && routine.data.blocks) {
        for (const block of routine.data.blocks) {
          for (const day of block.days) {
            for (let week = 1; week <= 20; week++) {
              const customizationKey = `day_customization_${block.block_name}_${day.day_name}_week${week}`;
              try {
                const customizationData = await AsyncStorage.getItem(customizationKey);
                if (customizationData) {
                  exerciseCustomizations[customizationKey] = JSON.parse(customizationData);
                }
              } catch (error) {}

              const dynamicKey = `workout_${block.block_name}_${day.day_name}_week${week}_exercises`;
              try {
                const dynamicData = await AsyncStorage.getItem(dynamicKey);
                if (dynamicData) {
                  dynamicExercisesData[dynamicKey] = JSON.parse(dynamicData);
                }
              } catch (error) {}

              const setsKey = `workout_${block.block_name}_${day.day_name}_week${week}_sets`;
              try {
                const setsInfo = await AsyncStorage.getItem(setsKey);
                if (setsInfo) {
                  setsData[setsKey] = JSON.parse(setsInfo);
                }
              } catch (error) {}
            }
          }
        }
      }

      let exercisePreferences = {};
      try {
        const preferencesData = await AsyncStorage.getItem('exercise_preferences');
        if (preferencesData) {
          exercisePreferences = JSON.parse(preferencesData);
        }
      } catch (error) {
        console.log('Could not load exercise preferences');
      }

      let activeBlock = null;
      let weekProgress = null;
      try {
        activeBlock = await AsyncStorage.getItem(`activeBlock_${routine.id}`);
        const weekProgressData = await AsyncStorage.getItem(`weekProgress_${routine.id}`);
        if (weekProgressData) {
          weekProgress = JSON.parse(weekProgressData);
        }
      } catch (error) {
        console.log('Could not load progress data');
      }

      let customMesocycles = [];
      try {
        const customMesocyclesKey = `custom_mesocycles_${routine.id}`;
        const customMesocyclesData = await AsyncStorage.getItem(customMesocyclesKey);
        if (customMesocyclesData) {
          customMesocycles = JSON.parse(customMesocyclesData);
        }
      } catch (error) {
        console.log('Could not load custom mesocycles');
      }

      const allMesocycles = [];

      if (programData?.mesocycleRoadmap && programData.mesocycleRoadmap.length > 0) {
        for (const phase of programData.mesocycleRoadmap) {
          allMesocycles.push({
            mesocycleNumber: phase.mesocycleNumber,
            phaseName: phase.phaseName,
            repFocus: phase.repFocus,
            emphasis: phase.emphasis,
            weeks: phase.weeks,
            blocks: phase.blocks,
            isCustom: false
          });
        }
      }

      for (const customMeso of customMesocycles) {
        allMesocycles.push({
          mesocycleNumber: customMeso.mesocycleNumber,
          phaseName: customMeso.phase?.phaseName || `Mesocycle ${customMeso.mesocycleNumber}`,
          repFocus: customMeso.phase?.repFocus || '',
          emphasis: customMeso.phase?.emphasis || '',
          weeks: customMeso.phase?.weeks || 4,
          blocks: customMeso.phase?.blocks || 0,
          isCustom: true,
          customId: customMeso.customId
        });
      }

      allMesocycles.sort((a, b) => a.mesocycleNumber - b.mesocycleNumber);

      let isSamplePlan = routine.data?._metadata?.isSamplePlan || false;

      if (!isSamplePlan) {
        const knownSamplePlanIds = ['sample_quick_start_ppl', 'sample_muscle_builder_52w', 'sample_glute_tone_12w'];
        isSamplePlan = knownSamplePlanIds.includes(routine.data?.id);

        if (!isSamplePlan) {
          if (routine.data?.days_per_week === 3 &&
              routine.data?.blocks?.length === 2 &&
              routine.data?.blocks?.[0]?.days?.[0]?.day_name === "Full Body A" &&
              routine.data?.blocks?.[0]?.days?.[1]?.day_name === "Full Body B" &&
              routine.data?.blocks?.[0]?.days?.[2]?.day_name === "Full Body C") {
            isSamplePlan = true;
          }
          else if (routine.data?.days_per_week === 3 &&
                   routine.data?.blocks?.length === 3 &&
                   routine.data?.blocks?.[0]?.days?.[0]?.day_name === "Push Day" &&
                   routine.data?.blocks?.[0]?.days?.[1]?.day_name === "Pull Day" &&
                   routine.data?.blocks?.[0]?.days?.[2]?.day_name === "Leg Day") {
            isSamplePlan = true;
          }
          else if (routine.data?.blocks?.length >= 10 &&
                   routine.data?.days_per_week >= 4) {
            isSamplePlan = true;
          }
          else if (routine.data?.days_per_week === 4 &&
                   routine.data?.blocks?.[0]?.days?.[0]?.day_name === "Lower Body - Glute Focus") {
            isSamplePlan = true;
          }
        }
      }

      const metadata = {
        exportType: 'unified_mesocycle_structure',
        totalMesocycles: allMesocycles.length,
        allMesocycles: allMesocycles,
        originalProgramId: routine.programId,
        exportedAt: new Date().toISOString(),
        routineId: routine.id,
        routineName: routine.name,
        currentDisplayName: routine.name,
        originalDaysPerWeek: routine.days,
        manualBlocks: manualBlocks,
        completionStatus: completionStatus,
        workoutHistory: workoutHistory,
        activeBlock: activeBlock ? parseInt(activeBlock) : null,
        weekProgress: weekProgress,
        exerciseCustomizations: exerciseCustomizations,
        dynamicExercisesData: dynamicExercisesData,
        setsData: setsData,
        ...(isSamplePlan ? {} : { exercisePreferences: exercisePreferences }),
        ...(isSamplePlan ? { isSamplePlan: true } : {})
      };

      exportData._metadata = metadata;
      exportData.routine_name = routine.name;

      const jsonString = JSON.stringify(exportData, null, 2);

      if (action === 'copy') {
        await Clipboard.setStringAsync(jsonString);
        hideShareModal();
        setTimeout(() => {
          setSuccessModal(true);
          setTimeout(() => {
            setSuccessModal(false);
          }, 2000);
        }, 100);
      } else if (action === 'share') {
        await Share.share({
          message: jsonString,
          title: `${routine.name} Workout`,
        });
        hideShareModal();
      }
    } catch (error) {
      console.error('Error sharing:', error);
      setShareModal({ visible: false, routine: null });
    }
  };

  const handleActionRequest = (routine: WorkoutRoutine) => {
    setDeleteModal({ visible: true, routine });
  };

  const handleShareFromActionSheet = (routine: WorkoutRoutine) => {
    setDeleteModal({ visible: false, routine: null });
    setTimeout(() => {
      handleExport(routine);
    }, 200);
  };

  const handleToggleSaveWorkout = async (routine: WorkoutRoutine) => {
    try {
      const routineId = routine.fingerprint || routine.id;
      const isCurrentlySaved = savedWorkoutRoutines.has(routineId);

      if (isCurrentlySaved) {
        await WorkoutStorage.removeMyRoutine(routineId);
      } else {
        const transformedWorkout = {
          ...routine,
          id: `${routine.id}_${Date.now()}`,
          fingerprint: routineId,
          createdAt: Date.now(),
        };
        await WorkoutStorage.addMyRoutine(transformedWorkout);
      }

      await loadMyRoutines();
    } catch (error) {
      console.error('Failed to toggle save workout:', error);
    }
  };

  const handleDeleteConfirm = () => {
    const routine = deleteModal.routine;
    if (!routine) return;

    Alert.alert(
      'Remove Workout Plan',
      'Are you sure? This will delete all progress you have made in this plan and cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRoutineFromContext(routine.id);
              setDeleteModal({ visible: false, routine: null });
            } catch (error) {
              console.error('Failed to delete routine:', error);
              Alert.alert('Error', 'Failed to remove workout plan. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleRenameRequest = (routine: WorkoutRoutine) => {
    setDeleteModal({ visible: false, routine: null });
    setRenameModal({ visible: true, routine, newName: routine.name });
  };

  const handleRenameConfirm = async () => {
    const { routine, newName } = renameModal;
    if (!routine || !newName.trim()) return;

    try {
      const updatedRoutine = { ...routine, name: newName.trim() };
      await WorkoutStorage.updateRoutine(updatedRoutine);
      setRenameModal({ visible: false, routine: null, newName: '' });
    } catch (error) {
      console.error('Failed to rename routine:', error);
      Alert.alert('Error', 'Failed to rename routine. Please try again.');
    }
  };

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    await WorkoutStorage.setOnboardingCompleted();
  };

  const handleGoToTodayWorkoutForRoutine = async (activeRoutine: WorkoutRoutine) => {
    try {
      if (!activeRoutine.data?.blocks || activeRoutine.data.blocks.length === 0) {
        Alert.alert(
          'Invalid Routine',
          'The selected routine does not have valid workout blocks.',
          [{ text: 'OK' }]
        );
        return;
      }

      let activeBlockIndex = 0;
      try {
        const savedActiveBlock = await WorkoutStorage.getActiveBlock(activeRoutine.id);
        if (savedActiveBlock !== null && savedActiveBlock >= 0 && savedActiveBlock < activeRoutine.data.blocks.length) {
          activeBlockIndex = savedActiveBlock;
        } else {
          activeBlockIndex = 0;
        }
      } catch (error) {
        activeBlockIndex = 0;
      }

      const activeBlock = activeRoutine.data.blocks[activeBlockIndex];

      if (!activeBlock || !activeBlock.weeks) {
        Alert.alert(
          'Invalid Block',
          'The selected workout block is missing or invalid.',
          [{ text: 'OK' }]
        );
        return;
      }

      let currentWeek = 1;
      const totalWeeks = activeBlock.weeks.includes('-')
        ? parseInt(activeBlock.weeks.split('-')[1]) - parseInt(activeBlock.weeks.split('-')[0]) + 1
        : 1;

      try {
        const bookmarkData = await WorkoutStorage.getBookmark(activeBlock.block_name);

        if (bookmarkData?.isBookmarked) {
          currentWeek = bookmarkData.week;
        } else {
          for (let week = 1; week <= totalWeeks; week++) {
            const key = `completed_${activeBlock.block_name}_week${week}`;

            let completed = await RobustStorage.getItem(key, true);
            if (!completed) {
              completed = await AsyncStorage.getItem(key);
            }

            let completedWorkouts: string[] = [];
            if (completed) {
              try {
                const parsedCompleted = JSON.parse(completed);
                completedWorkouts = Array.isArray(parsedCompleted) ? parsedCompleted : [];
              } catch (error) {
                completedWorkouts = [];
              }
            }

            if (!completedWorkouts || completedWorkouts.length === 0) {
              currentWeek = week;
              break;
            }

            const workoutDays = activeBlock.days.filter(day =>
              day.day_name && !day.day_name.toLowerCase().includes('rest')
            );

            const allDaysCompleted = workoutDays.every(day => {
              const expectedKey = `${day.day_name}_week${week}`;
              return completedWorkouts.includes(expectedKey);
            });

            if (!allDaysCompleted) {
              currentWeek = week;
              break;
            }

            if (week === totalWeeks) {
              currentWeek = totalWeeks;
            }
          }
        }
      } catch (error) {
        currentWeek = 1;
      }

      const todayActiveBlock = activeRoutine.data.blocks[activeBlockIndex];
      navigation.navigate('Days' as any, {
        block: todayActiveBlock,
        routineName: activeRoutine.name,
        initialWeek: currentWeek
      });

    } catch (error) {
      console.error('Error navigating to today\'s workout:', error);
      Alert.alert(
        'Error',
        'Could not find today\'s workout. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const openCreateFlow = () => {
    navigation.getParent()?.navigate('CreateFlow' as never);
  };

  const handleBulkingProgramPress = (plan: any) => {
    navigation.navigate('SamplePlanDetail' as any, { plan });
  };

  const weekDays = getWeekDays(workoutDates);

  // ==========================================================================
  // Render helpers
  // ==========================================================================
  const renderBulkingPrograms = (subtitle?: string) => (
    <>
      <View style={styles.bulkingHeader}>
        <Text style={styles.bulkingSectionTitle}>Bulking programs</Text>
        {subtitle ? <Text style={styles.bulkingSubtitle}>{subtitle}</Text> : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bulkingScrollContent}
        style={styles.bulkingScroll}
      >
        {SAMPLE_PLANS.map((plan) => {
          const imageSource = getProgramImage(plan.id, isPinkTheme);
          const gradient = PROGRAM_GRADIENTS[plan.id] || ['#1a1a1a', '#2d1410'];
          return (
            <TouchableOpacity
              key={plan.id}
              style={styles.bulkingCard}
              onPress={() => handleBulkingProgramPress(plan)}
              activeOpacity={0.85}
            >
              <View style={styles.bulkingCardImage}>
                {imageSource ? (
                  <Image
                    source={imageSource}
                    style={styles.bulkingCardImageSrc}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.bulkingCardImageSrc,
                      { backgroundColor: gradient[1] },
                    ]}
                  />
                )}
                <View style={styles.bulkingLevelChip}>
                  <Text style={[styles.bulkingLevelText, { color: themeColor }]}>
                    {plan.level}
                  </Text>
                </View>
                <View style={styles.bulkingDurationChip}>
                  <Text style={styles.bulkingDurationText}>{plan.summary.weeks} weeks</Text>
                </View>
              </View>
              <View style={styles.bulkingCardBody}>
                <Text style={styles.bulkingCardTitle} numberOfLines={2}>{plan.summary.routine_name}</Text>
                <Text style={styles.bulkingCardMeta} numberOfLines={1}>{plan.summary.daysPerWeek} days · {plan.summary.split}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );

  const renderWeekStrip = () => (
    <TouchableOpacity
      style={styles.weekStrip}
      onPress={() => setCalendarModal(true)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="View workout calendar"
    >
      <View style={styles.weekStripHeader}>
        <Text style={styles.weekStripLabel}>THIS WEEK</Text>
        <View style={styles.weekStripLinkRow}>
          <Text style={[styles.weekStripLink, { color: themeColor }]}>View calendar</Text>
          <Ionicons name="chevron-forward" size={13} color={themeColor} />
        </View>
      </View>

      <View style={styles.weekStripDays}>
        {weekDays.map((d, i) => {
          const isToday = d.state === 'today';
          const isWorkedOut = d.state === 'workedOut';
          const isFuture = d.state === 'future';
          return (
            <View key={i} style={styles.weekStripDayCol}>
              <Text
                style={[
                  styles.weekStripDayLetter,
                  isToday && { color: themeColor, fontWeight: '700' },
                  isFuture && { color: '#52525b' },
                ]}
              >
                {d.letter}
              </Text>
              <View
                style={[
                  styles.weekStripDot,
                  isWorkedOut && { backgroundColor: themeColor, borderWidth: 0 },
                  isToday && { borderColor: themeColor, borderWidth: 2, backgroundColor: 'transparent' },
                  isFuture && { borderColor: '#27272a' },
                ]}
              />
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {isLoading ? (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={56} color="#3f3f46" />
            <Text style={styles.emptyTitle}>Loading routines...</Text>
          </View>
        ) : routines.length === 0 ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} colors={[themeColor]} />
            }
          >
            <Text style={styles.title}>Workouts</Text>
            <View
              style={[
                styles.emptyHeroCard,
                {
                  borderColor: themeColor + '59',
                  backgroundColor: themeColor + '14',
                },
              ]}
            >
              <View
                style={[
                  styles.emptyHeroIcon,
                  { backgroundColor: themeColor, shadowColor: themeColor },
                ]}
              >
                <Ionicons name="sparkles" size={26} color="#0a0a0b" />
              </View>
              <Text style={styles.emptyHeroTitle}>Create your first plan</Text>
              <Text style={styles.emptyHeroBody}>
                A custom workout built around your goals — completely free.
              </Text>
              <TouchableOpacity
                style={[styles.emptyHeroButton, { backgroundColor: themeColor, shadowColor: themeColor }]}
                onPress={openCreateFlow}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyHeroButtonText}>Get started</Text>
                <Ionicons name="arrow-forward" size={15} color="#0a0a0b" />
              </TouchableOpacity>
            </View>

            {renderBulkingPrograms('Or start with a pre-built program')}
            {renderWeekStrip()}
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} colors={[themeColor]} />
            }
          >
            <Text style={styles.title}>Workouts</Text>
            {routines.length > 1 && (
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>YOUR PLANS</Text>
              </View>
            )}

            {routines.map((routine, idx) => {
              const isPrimary = idx === 0;
              return (
                <View
                  key={routine.id}
                  style={[
                    isPrimary ? styles.planCardPrimary : styles.planCardSecondary,
                    isPrimary && {
                      borderColor: themeColor,
                      shadowColor: themeColor,
                    },
                  ]}
                >
                  <RNTouchable
                    style={styles.planMenuBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleActionRequest(routine);
                    }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel="More options"
                  >
                    <Ionicons name="ellipsis-horizontal" size={isPrimary ? 18 : 16} color="#a1a1aa" />
                  </RNTouchable>

                  {isPrimary && (
                    <Text style={[styles.planEyebrow, { color: themeColor }]}>CURRENT PLAN</Text>
                  )}

                  <Pressable
                    onPress={() => navigation.navigate('Blocks' as any, { routine })}
                    onLongPress={() => handleActionRequest(routine)}
                    delayLongPress={600}
                  >
                    <Text style={isPrimary ? styles.planTitlePrimary : styles.planTitleSecondary} numberOfLines={2}>
                      {routine.name}
                    </Text>
                    <Text style={isPrimary ? styles.planSubtitlePrimary : styles.planSubtitleSecondary}>
                      {routine.days} days / week · {routine.blocks} {routine.blocks === 1 ? 'block' : 'blocks'}
                    </Text>
                  </Pressable>

                  {isPrimary ? (
                    <>
                      <TouchableOpacity
                        style={[styles.planStartBtnPrimary, { backgroundColor: themeColor, shadowColor: themeColor }]}
                        onPress={() => handleGoToTodayWorkoutForRoutine(routine)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel="Start today's workout"
                      >
                        <Ionicons name="play" size={14} color="#0a0a0b" />
                        <Text style={styles.planStartBtnPrimaryText}>Start today's workout</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.planViewLink}
                        onPress={() => navigation.navigate('Blocks' as any, { routine })}
                        activeOpacity={0.6}
                      >
                        <Text style={[styles.planViewLinkText, { color: themeColor }]}>View full plan</Text>
                        <Ionicons name="chevron-forward" size={13} color={themeColor} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.planStartBtnSecondary}
                      onPress={() => handleGoToTodayWorkoutForRoutine(routine)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="play" size={13} color="#d4d4d8" />
                      <Text style={styles.planStartBtnSecondaryText}>Start today's workout</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {renderBulkingPrograms()}
            {renderWeekStrip()}
          </ScrollView>
        )}
      </Animated.View>

      {__DEV__ && (
        <TouchableOpacity
          style={styles.debugTestButton}
          onPress={() => {
            console.log('🔴 [TEST] Simulating universal link import for shareId: BVFdmcwG');
            navigation.navigate('ImportSharedContent', { shareId: 'BVFdmcwG' });
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.debugTestButtonText}>TEST UNIVERSAL LINK</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={shareModal.visible}
        transparent={true}
        animationType="none"
        onRequestClose={hideShareModal}
      >
        <Animated.View style={[styles.newShareOverlay, { opacity: shareModalOpacity }]}>
          <TouchableOpacity
            style={styles.newShareBackdrop}
            activeOpacity={1}
            onPress={hideShareModal}
          />

          <View style={[styles.newShareModal, { borderColor: themeColor }]}>
            <View style={styles.newShareHeader}>
              <TouchableOpacity
                style={styles.newShareClose}
                onPress={hideShareModal}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <Image
              source={isPinkTheme ?
                require('./../../Lucid_Origin_Two_athletic_women_in_a_modern_gym_one_spotting_t_0.jpg') :
                require('./../../sdfdfs.jpg')
              }
              style={styles.newShareImage}
              resizeMode="cover"
            />

            <View style={styles.newShareContent}>
              <Text style={[styles.newShareTitle, { color: themeColor }]}>
                {shareModal.routine?.name?.toUpperCase()}
              </Text>

              {shareModal.isGenerating ? (
                <View style={styles.qrCodeContainer}>
                  <View style={styles.qrCodePlaceholder}>
                    <Ionicons name="refresh" size={32} color={themeColor} />
                    <Text style={styles.qrCodeLoadingText}>Generating QR code...</Text>
                  </View>
                </View>
              ) : shareModal.error ? (
                <View style={styles.qrCodeContainer}>
                  <View style={styles.qrCodePlaceholder}>
                    <Ionicons name="warning" size={32} color="#ef4444" />
                    <Text style={styles.qrCodeErrorText}>{shareModal.error}</Text>
                  </View>
                </View>
              ) : shareModal.qrCode ? (
                <View style={styles.qrCodeContainer}>
                  <View style={styles.qrCodeWrapper}>
                    <QRCode
                      value={shareModal.qrCode}
                      size={240}
                      backgroundColor="white"
                      color="black"
                    />
                  </View>
                </View>
              ) : null}

              <View style={styles.shareActionButtons}>
                {shareModal.error ? (
                  <TouchableOpacity
                    style={[styles.shareActionPrimary, { backgroundColor: themeColor }]}
                    onPress={() => handleShare('retry')}
                    activeOpacity={0.9}
                  >
                    <View style={styles.shareButtonSimple}>
                      <Ionicons name="refresh" size={20} color="#0a0a0b" />
                      <Text style={styles.shareButtonTitleSimple}>TRY AGAIN</Text>
                    </View>
                  </TouchableOpacity>
                ) : shareModal.qrCode ? (
                  <TouchableOpacity
                    style={[styles.shareActionPrimary, { backgroundColor: themeColor }]}
                    onPress={() => handleShare('shareUrl')}
                    activeOpacity={0.9}
                  >
                    <View style={styles.shareButtonSimple}>
                      <Ionicons name="share" size={20} color="#0a0a0b" />
                      <Text style={styles.shareButtonTitleSimple}>SEND LINK</Text>
                    </View>
                  </TouchableOpacity>
                ) : null}
              </View>

              {shareModal.qrCode && (
                <Text style={styles.shareFooterText}>Link expires in 7 days</Text>
              )}
            </View>
          </View>
        </Animated.View>
      </Modal>

      <Modal
        visible={successModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>Copied!</Text>
            <Text style={styles.successMessage}>Workout JSON copied to clipboard</Text>

            <TouchableOpacity
              style={[styles.successButton, { backgroundColor: themeColor }]}
              onPress={() => setSuccessModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModal({ visible: false, routine: null })}
      >
        <View style={styles.actionModalOverlay}>
          <TouchableOpacity
            style={styles.actionModalBackdrop}
            activeOpacity={1}
            onPress={() => setDeleteModal({ visible: false, routine: null })}
          />

          <View style={[styles.actionSheet, { borderColor: themeColor, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.handleBar} />

            {(() => {
              const isSaved = savedWorkoutRoutines.has(
                deleteModal.routine?.fingerprint || deleteModal.routine?.id || ''
              );
              return (
                <>
                  {/* Header: thumbnail + title + close */}
                  <View style={styles.actionHeaderRow}>
                    <View style={styles.actionThumb}>
                      <Ionicons name="barbell" size={26} color={themeColor} />
                    </View>
                    <View style={styles.actionHeaderText}>
                      <Text style={styles.actionPlanName} numberOfLines={2}>
                        {deleteModal.routine?.name}
                      </Text>
                      <Text style={styles.actionPlanDetails}>
                        {deleteModal.routine?.days} days · {deleteModal.routine?.blocks} {deleteModal.routine?.blocks === 1 ? 'block' : 'blocks'}
                      </Text>
                    </View>
                    <RNTouchable
                      style={styles.actionCloseButton}
                      onPress={() => setDeleteModal({ visible: false, routine: null })}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    >
                      <Ionicons name="close" size={22} color="#71717a" />
                    </RNTouchable>
                  </View>

                  {/* Primary CTA: Share */}
                  <RNTouchable
                    style={[styles.shareCtaButton, { backgroundColor: themeColor, shadowColor: themeColor }]}
                    onPress={() => deleteModal.routine && handleShareFromActionSheet(deleteModal.routine)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="share-outline" size={18} color="#0a0a0b" />
                    <Text style={styles.shareCtaText}>Share plan</Text>
                  </RNTouchable>

                  {/* Secondary tile row: Save / Rename / Remove */}
                  <View style={styles.tileRow}>
                    <RNTouchable
                      style={[
                        styles.actionTile,
                        isSaved && {
                          backgroundColor: themeColor + '1A',
                          borderColor: themeColor + '66',
                        },
                      ]}
                      onPress={() => {
                        if (deleteModal.routine) {
                          handleToggleSaveWorkout(deleteModal.routine);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isSaved ? 'heart-dislike' : 'heart'}
                        size={19}
                        color={isSaved ? themeColor : '#d4d4d8'}
                      />
                      <Text
                        style={[
                          styles.actionTileText,
                          isSaved && { color: themeColor },
                        ]}
                      >
                        {isSaved ? 'Saved' : 'Save'}
                      </Text>
                    </RNTouchable>

                    <RNTouchable
                      style={styles.actionTile}
                      onPress={() => deleteModal.routine && handleRenameRequest(deleteModal.routine)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={19} color="#d4d4d8" />
                      <Text style={styles.actionTileText}>Rename</Text>
                    </RNTouchable>

                    <RNTouchable
                      style={styles.actionTileDanger}
                      onPress={handleDeleteConfirm}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={19} color="#f87171" />
                      <Text style={styles.actionTileDangerText}>Remove</Text>
                    </RNTouchable>
                  </View>

                  {/* Cancel */}
                  <RNTouchable
                    style={styles.actionCancel}
                    onPress={() => setDeleteModal({ visible: false, routine: null })}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.actionCancelText}>Cancel</Text>
                  </RNTouchable>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      <WorkoutCalendar
        visible={calendarModal}
        onClose={() => setCalendarModal(false)}
      />

      <ImportFeedbackModal
        visible={showFeedbackModal}
        onFeedback={submitFeedback}
        onSkip={skipFeedback}
      />

      <Modal
        visible={renameModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRenameModal({ visible: false, routine: null, newName: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.renameContainer}>
            <View style={styles.renameIconContainer}>
              <Ionicons name="create-outline" size={32} color={themeColor} />
            </View>

            <Text style={styles.renameTitle}>Rename Routine</Text>

            <View style={styles.renameInputContainer}>
              <TextInput
                style={styles.renameInput}
                value={renameModal.newName}
                onChangeText={(text) => setRenameModal(prev => ({ ...prev, newName: text }))}
                placeholder="Enter new name"
                placeholderTextColor="#71717a"
                autoFocus={true}
                selectTextOnFocus={true}
              />
            </View>

            <View style={styles.renameButtons}>
              <TouchableOpacity
                style={styles.renameCancelButton}
                onPress={() => setRenameModal({ visible: false, routine: null, newName: '' })}
                activeOpacity={0.7}
              >
                <Text style={styles.renameCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.renameConfirmButton, { backgroundColor: themeColor }]}
                onPress={handleRenameConfirm}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark" size={18} color="#0a0a0b" />
                <Text style={styles.renameConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={false}
        visible={debugModal}
        onRequestClose={() => setDebugModal(false)}
      >
        <View style={styles.debugFullscreenContainer}>
          <View style={styles.debugHeader}>
            <Text style={styles.debugHeaderTitle}>Debug Console</Text>
            <TouchableOpacity
              onPress={() => setDebugModal(false)}
              style={styles.debugCloseButton}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.debugContent}>
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>Production Logs</Text>
              <ScrollView style={styles.debugScrollContainer}>
                <Text style={styles.debugText}>
                  {debugLogs || 'No logs captured yet. Tap "Reload Data" to capture storage logs.'}
                </Text>
              </ScrollView>
            </View>
          </View>

          <View style={styles.debugActions}>
            <TouchableOpacity
              style={styles.debugReloadButton}
              onPress={async () => {
                debugLog('🔄 [DEBUG] Manually triggering context loadRoutines...');
                debugLog(`🔄 [DEBUG] Before reload - routines.length: ${routines.length}`);
                await loadRoutines();
                debugLog(`🔄 [DEBUG] After reload - routines.length: ${routines.length}`);
                debugLog('🔄 [DEBUG] Context reload completed');
              }}
            >
              <Ionicons name="refresh" size={18} color="#ffffff" />
              <Text style={styles.debugButtonLabel}>Reload Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.debugCopyButton,
                { backgroundColor: debugLogsCopied ? '#10b981' : '#3b82f6' }
              ]}
              onPress={async () => {
                try {
                  await Clipboard.setStringAsync(debugLogs);
                  setDebugLogsCopied(true);
                  setTimeout(() => setDebugLogsCopied(false), 2000);
                } catch (error) {
                  debugLog(`❌ Failed to copy logs: ${error?.message}`);
                }
              }}
            >
              <Ionicons
                name={debugLogsCopied ? "checkmark" : "copy-outline"}
                size={18}
                color="#ffffff"
              />
              <Text style={styles.debugButtonLabel}>
                {debugLogsCopied ? 'Copied!' : 'Copy Logs'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <OnboardingSlideshow
        visible={showOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  animatedContainer: {
    flex: 1,
  },

  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.4,
    marginBottom: 16,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },

  sectionHeaderRow: {
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717a',
    letterSpacing: 1.2,
  },

  planCardPrimary: {
    backgroundColor: '#000',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 12,
    position: 'relative',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  planEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  planTitlePrimary: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
    paddingRight: 30,
  },
  planSubtitlePrimary: {
    color: '#71717a',
    fontSize: 13,
    marginBottom: 16,
  },
  planStartBtnPrimary: {
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  planStartBtnPrimaryText: {
    color: '#0a0a0b',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  planViewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 14,
    paddingBottom: 2,
  },
  planViewLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },

  planCardSecondary: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    borderColor: '#27272a',
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
    position: 'relative',
  },
  planTitleSecondary: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
    paddingRight: 30,
  },
  planSubtitleSecondary: {
    color: '#71717a',
    fontSize: 12,
    marginBottom: 10,
  },
  planStartBtnSecondary: {
    height: 40,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3f3f46',
  },
  planStartBtnSecondaryText: {
    color: '#d4d4d8',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  planMenuBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  bulkingHeader: {
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  bulkingSectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  bulkingSubtitle: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 2,
  },
  bulkingScroll: {
    marginHorizontal: -16,
  },
  bulkingScrollContent: {
    paddingHorizontal: 16,
    paddingRight: 4,
    gap: 12,
  },
  bulkingCard: {
    width: 260,
    height: 208,
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
  },
  bulkingCardImage: {
    height: 130,
    position: 'relative',
    overflow: 'hidden',
  },
  bulkingCardImageSrc: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  bulkingLevelChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bulkingLevelText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  bulkingDurationChip: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bulkingDurationText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  bulkingCardBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'flex-start',
  },
  bulkingCardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 4,
  },
  bulkingCardMeta: {
    color: '#71717a',
    fontSize: 11,
  },

  weekStrip: {
    marginTop: 24,
    marginBottom: 8,
    backgroundColor: '#0a0a0f',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  weekStripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  weekStripLabel: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  weekStripLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  weekStripLink: {
    fontSize: 12,
    fontWeight: '600',
  },
  weekStripDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  weekStripDayCol: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  weekStripDayLetter: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '600',
  },
  weekStripDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },

  emptyHeroCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 22,
    marginBottom: 8,
    alignItems: 'center',
  },
  emptyHeroIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 14,
  },
  emptyHeroTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyHeroBody: {
    fontSize: 13,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  emptyHeroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  emptyHeroButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a0a0b',
  },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff', textAlign: 'center', marginTop: 24, marginBottom: 16 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  successContainer: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 32,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  successMessage: { fontSize: 14, color: '#71717a', textAlign: 'center', marginBottom: 24 },
  successButton: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32, minWidth: 80 },
  successButtonText: { fontSize: 16, fontWeight: '600', color: '#0a0a0b', textAlign: 'center' },

  // ==========================================================================
  // Action sheet (Workout Options) — option-3 header card layout
  // ==========================================================================
  actionModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  actionModalBackdrop: { flex: 1 },
  actionSheet: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '85%',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    marginHorizontal: 4,
  },
  handleBar: { width: 40, height: 5, backgroundColor: '#52525b', borderRadius: 3, alignSelf: 'center', marginBottom: 22 },

  actionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 22,
  },
  actionThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionHeaderText: {
    flex: 1,
  },
  actionPlanName: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginBottom: 3 },
  actionPlanDetails: { color: '#71717a', fontSize: 13 },
  actionCloseButton: {
    alignSelf: 'flex-start',
    padding: 2,
  },

  shareCtaButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  shareCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0a0a0b',
    letterSpacing: 0.2,
  },

  tileRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  actionTile: {
    flex: 1,
    minHeight: 68,
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3f3f46',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionTileText: {
    color: '#d4d4d8',
    fontSize: 12,
    fontWeight: '500',
  },
  actionTileDanger: {
    flex: 1,
    minHeight: 68,
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionTileDangerText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '500',
  },

  actionCancel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  actionCancelText: {
    color: '#71717a',
    fontSize: 15,
    fontWeight: '500',
  },

  newShareOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  newShareBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  newShareModal: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 2,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  newShareHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 16,
    paddingTop: 16,
    zIndex: 100,
  },
  newShareClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newShareImage: { width: '100%', height: 180 },
  newShareContent: { padding: 24, alignItems: 'center' },
  newShareTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8, letterSpacing: 1 },
  shareActionButtons: { width: '100%', gap: 16 },
  shareActionPrimary: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  shareButtonSimple: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  shareButtonTitleSimple: { fontSize: 16, fontWeight: '700', color: '#0a0a0b', letterSpacing: 0.5 },

  renameContainer: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#27272a',
    padding: 28,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  renameIconContainer: { backgroundColor: 'rgba(236, 72, 153, 0.1)', borderRadius: 50, padding: 16, marginBottom: 20 },
  renameTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff', marginBottom: 20, textAlign: 'center' },
  renameInputContainer: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 4,
    width: '100%',
    marginBottom: 28,
  },
  renameInput: { fontSize: 16, color: '#ffffff', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'transparent' },
  renameButtons: { flexDirection: 'row', gap: 16, width: '100%', justifyContent: 'center', alignItems: 'center' },
  renameCancelButton: {
    flex: 1,
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3f3f46',
    minHeight: 50,
  },
  renameConfirmButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  renameCancelText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  renameConfirmText: { fontSize: 16, fontWeight: '600', color: '#0a0a0b' },

  debugFullscreenContainer: { flex: 1, backgroundColor: '#1a1a1a' },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  debugHeaderTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  debugCloseButton: { padding: 8, backgroundColor: '#404040', borderRadius: 8 },
  debugContent: { flex: 1, padding: 20 },
  debugSection: { flex: 1 },
  debugSectionTitle: { fontSize: 16, fontWeight: '600', color: '#cccccc', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  debugScrollContainer: { flex: 1, backgroundColor: '#0f0f0f', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#333333' },
  debugText: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: '#00ff00', lineHeight: 18 },
  debugActions: { flexDirection: 'row', padding: 20, paddingTop: 0, gap: 12 },
  debugReloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  debugCopyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  debugButtonLabel: { fontSize: 16, fontWeight: '600', color: '#ffffff' },

  qrCodeContainer: { alignItems: 'center', marginVertical: 20 },
  qrCodeWrapper: { backgroundColor: 'white', padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  qrCodePlaceholder: {
    width: 272,
    height: 272,
    backgroundColor: '#27272a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3f3f46',
  },
  qrCodeLoadingText: { color: '#a1a1aa', fontSize: 14, fontWeight: '500', marginTop: 8, textAlign: 'center' },
  qrCodeErrorText: { color: '#ef4444', fontSize: 14, fontWeight: '500', marginTop: 8, textAlign: 'center' },
  shareFooterText: { color: '#71717a', fontSize: 11, fontWeight: '500', marginTop: 16, textAlign: 'center' },

  debugTestButton: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  debugTestButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700', textAlign: 'center', letterSpacing: 0.5 },
});