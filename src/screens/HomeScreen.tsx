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

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen({ route, transitionProgress, panGestureRef }: any) {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();

  // TEST: DISABLED auto-test to stop the loop
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

  // Clean animation functions for share modal
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

  // Handle imported program
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
    console.log('📥 Loading my routines...');
    const myRoutinesList = await WorkoutStorage.loadMyRoutines();

    if (!Array.isArray(myRoutinesList)) {
      console.warn('⚠️ My routines data is corrupted, resetting to empty array');
      setMyRoutines([]);
      setSavedWorkoutRoutines(new Set());
      return;
    }

    console.log('📥 Loaded', myRoutinesList.length, 'saved routines');
    setMyRoutines(myRoutinesList);

    const routineIds = new Set(myRoutinesList.map(routine => routine.fingerprint || routine.id));
    setSavedWorkoutRoutines(routineIds);
    console.log('📥 Saved routine IDs:', Array.from(routineIds));
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadRoutines();
      await loadMyRoutines();
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
        console.log('📋 Starting clipboard copy...');
        await Clipboard.setStringAsync(jsonString);
        console.log('📋 Clipboard copy completed');
        hideShareModal();
        console.log('📋 Share modal closed');
        setTimeout(() => {
          console.log('📋 Showing success modal');
          setSuccessModal(true);
          setTimeout(() => {
            console.log('📋 Auto-dismissing success modal');
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

  // === NEW: share from action sheet ===
  // Closes the action sheet, then opens the existing share modal (with QR
  // code, send link, retry) — same flow that handleExport powers.
  const handleShareFromActionSheet = (routine: WorkoutRoutine) => {
    setDeleteModal({ visible: false, routine: null });
    // small delay so the action sheet finishes dismissing before the share
    // modal animates in — feels smoother than a hard swap.
    setTimeout(() => {
      handleExport(routine);
    }, 200);
  };

  const handleToggleSaveWorkout = async (routine: WorkoutRoutine) => {
    try {
      const routineId = routine.fingerprint || routine.id;
      const isCurrentlySaved = savedWorkoutRoutines.has(routineId);

      console.log('💾 Save workout button pressed:', routine.name, 'Currently saved:', isCurrentlySaved);

      if (isCurrentlySaved) {
        console.log('🗑️ Removing workout from collection');
        await WorkoutStorage.removeMyRoutine(routineId);
      } else {
        const transformedWorkout = {
          ...routine,
          id: `${routine.id}_${Date.now()}`,
          fingerprint: routineId,
          createdAt: Date.now(),
        };

        console.log('💾 Saving workout with ID:', transformedWorkout.id);
        await WorkoutStorage.addMyRoutine(transformedWorkout);
      }

      await loadMyRoutines();
      console.log('💾 Toggle workout completed successfully');
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

  const resetOnboarding = async () => {
    await WorkoutStorage.clearAllData();
    setShowOnboarding(true);
  };

  const handleGoToTodayWorkout = async () => {
    try {
      if (routines.length === 0) {
        Alert.alert(
          'No Workout Routines',
          'You need to import a workout routine first to use "Go to Today".',
          [{ text: 'OK' }]
        );
        return;
      }

      const activeRoutine = routines[0];

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
          console.log('Invalid active block index, using first block');
          activeBlockIndex = 0;
        }
      } catch (error) {
        console.log('No active block saved, using first block');
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
            console.log(`🎯 [TODAY-BUTTON] Checking week ${week} with key: ${key}`);

            let completed = await RobustStorage.getItem(key, true);
            if (!completed) {
              completed = await AsyncStorage.getItem(key);
            }

            let completedWorkouts: string[] = [];
            if (completed) {
              try {
                const parsedCompleted = JSON.parse(completed);
                completedWorkouts = Array.isArray(parsedCompleted) ? parsedCompleted : [];
                console.log(`🎯 [TODAY-BUTTON] Week ${week} completed workouts:`, completedWorkouts);
              } catch (error) {
                console.log(`Error parsing completed workouts for week ${week}:`, error);
                completedWorkouts = [];
              }
            } else {
              console.log(`🎯 [TODAY-BUTTON] No completion data found for week ${week}`);
            }

            if (!completedWorkouts || completedWorkouts.length === 0) {
              console.log(`🎯 [TODAY-BUTTON] Week ${week} has no completed workouts - selecting this week`);
              currentWeek = week;
              break;
            }

            console.log(`🎯 [TODAY-BUTTON] Checking days for week ${week}:`, activeBlock.days.map(d => d.day_name));
            const workoutDays = activeBlock.days.filter(day =>
              day.day_name && !day.day_name.toLowerCase().includes('rest')
            );
            console.log(`🎯 [TODAY-BUTTON] Workout days (excluding rest):`, workoutDays.map(d => d.day_name));

            const allDaysCompleted = workoutDays.every(day => {
              const expectedKey = `${day.day_name}_week${week}`;
              const isCompleted = completedWorkouts.includes(expectedKey);
              console.log(`🎯 [TODAY-BUTTON] Day ${day.day_name} - expected key: ${expectedKey}, completed: ${isCompleted}`);
              return isCompleted;
            });

            console.log(`🎯 [TODAY-BUTTON] Week ${week} all days completed: ${allDaysCompleted}`);

            if (!allDaysCompleted) {
              console.log(`🎯 [TODAY-BUTTON] Week ${week} has incomplete days - selecting this week`);
              currentWeek = week;
              break;
            }

            if (week === totalWeeks) {
              console.log(`🎯 [TODAY-BUTTON] Reached last week ${week} - staying here`);
              currentWeek = totalWeeks;
            }
          }
        }
      } catch (error) {
        console.log('Error calculating current week, using week 1');
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

  const handleGoToToday = async () => {
    try {
      const mealPlans = await WorkoutStorage.loadMealPlans();

      if (mealPlans.length === 0) {
        Alert.alert(
          'No Meal Plans',
          'You need to import a meal plan first to use "Go to Today".',
          [{ text: 'OK' }]
        );
        return;
      }

      const activeMealPlan = mealPlans[0];
      const today = new Date();

      const mealPlanStartDate = new Date();
      const daysDifference = Math.floor((today.getTime() - mealPlanStartDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDifference < 0) {
        Alert.alert(
          'Future Meal Plan',
          'Today is before the start of your meal plan.',
          [{ text: 'OK' }]
        );
        return;
      }

      const weeks = activeMealPlan.data?.weeks || [];
      let currentWeek = null;
      let currentWeekNumber = 0;

      for (let i = 0; i < weeks.length; i++) {
        const weekStartDay = i * 7;
        const weekEndDay = weekStartDay + weeks[i].days.length - 1;

        if (daysDifference >= weekStartDay && daysDifference <= weekEndDay) {
          currentWeek = weeks[i];
          currentWeekNumber = i + 1;
          break;
        }
      }

      if (!currentWeek) {
        Alert.alert(
          'Meal Plan Completed',
          'Today is beyond the end of your current meal plan.',
          [{ text: 'OK' }]
        );
        return;
      }

      navigation.navigate('MealPlanWeeks' as any, { mealPlan: activeMealPlan });
    } catch (error) {
      console.error('Error navigating to today:', error);
      Alert.alert(
        'Error',
        'Could not find today\'s meal plan. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const openCreateFlow = () => {
    navigation.getParent()?.navigate('CreateFlow' as never);
  };

  const currentRoutine = routines[0] ?? null;
  const otherRoutines = routines.slice(1);

  return (
    <View style={styles.container}>
      <View style={[styles.titleBar, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.title}>Workouts</Text>
        <TouchableOpacity
          style={styles.titleAction}
          onPress={() => setCalendarModal(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open workout calendar"
        >
          <Ionicons name="calendar-outline" size={18} color="#a1a1aa" />
        </TouchableOpacity>
      </View>

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
            contentContainerStyle={styles.emptyScroll}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} colors={[themeColor]} />
            }
          >
            <View style={styles.emptyHero}>
              <View style={[styles.emptyHeroIcon, { backgroundColor: themeColor, shadowColor: themeColor }]}>
                <Ionicons name="sparkles" size={36} color="#0a0a0b" />
              </View>
              <Text style={styles.emptyHeroTitle}>Create your first plan</Text>
              <Text style={styles.emptyHeroBody}>
                Answer a few questions. We'll send a prompt to your AI. Import the plan it sends back.
              </Text>
              <TouchableOpacity
                style={[styles.emptyHeroButton, { backgroundColor: themeColor, shadowColor: themeColor }]}
                onPress={openCreateFlow}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyHeroButtonText}>Get started</Text>
                <Ionicons name="arrow-forward" size={16} color="#0a0a0b" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} colors={[themeColor]} />
            }
          >
            {/* ================================================================
                HERO PLAN CARD — redesigned

                Layout:
                  CURRENT PLAN  (eyebrow)
                  5-Day Strength Build  (title)
                  5 days / week • 1 block  (subtitle)

                  [   ▶  Start today's workout   ]   <- full-width primary
                       View full plan ›             <- subtle text link

                Share lives in the action sheet (long-press the card).
                ================================================================ */}
            <View style={[styles.heroCard, { borderColor: themeColor, shadowColor: themeColor }]}>
              {/* ••• menu button — opens the action sheet (Share, Save, Rename, Remove) */}
              <RNTouchable
                style={styles.heroMenuBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  handleActionRequest(currentRoutine!);
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                accessibilityRole="button"
                accessibilityLabel="More options"
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#a1a1aa" />
              </RNTouchable>

              <Pressable
                onPress={() => navigation.navigate('Blocks' as any, { routine: currentRoutine })}
                onLongPress={() => handleActionRequest(currentRoutine!)}
                delayLongPress={600}
              >
                <Text style={[styles.heroEyebrow, { color: themeColor }]}>CURRENT PLAN</Text>
                <Text style={[styles.heroTitleText, { textShadowColor: themeColorLight }]} numberOfLines={2}>
                  {currentRoutine!.name}
                </Text>
                <Text style={styles.heroSubtitle}>
                  {currentRoutine!.days} days / week • {currentRoutine!.blocks} {currentRoutine!.blocks === 1 ? 'block' : 'blocks'}
                </Text>
              </Pressable>

              {/* Primary: full-width Today button */}
              <TouchableOpacity
                style={[styles.heroTodayBtn, { backgroundColor: themeColor, shadowColor: themeColor }]}
                onPress={handleGoToTodayWorkout}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Start today's workout"
              >
                <Ionicons name="play" size={16} color="#0a0a0b" />
                <Text style={styles.heroTodayText}>Start today's workout</Text>
              </TouchableOpacity>

              {/* Secondary: subtle text link */}
              <TouchableOpacity
                style={styles.heroPlanLink}
                onPress={() => navigation.navigate('Blocks' as any, { routine: currentRoutine })}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel="View full plan"
              >
                <Text style={[styles.heroPlanLinkText, { color: themeColor }]}>View full plan</Text>
                <Ionicons name="chevron-forward" size={13} color={themeColor} />
              </TouchableOpacity>
            </View>

            {otherRoutines.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Other plans</Text>
                </View>
                {otherRoutines.map(routine => (
                  <TouchableOpacity
                    key={routine.id}
                    style={styles.smallPlanCard}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('Blocks' as any, { routine })}
                    onLongPress={() => handleActionRequest(routine)}
                    delayLongPress={600}
                  >
                    <View style={styles.smallPlanContent}>
                      <Text style={styles.smallPlanTitle} numberOfLines={1}>{routine.name}</Text>
                      <Text style={styles.smallPlanSub}>
                        {routine.days} days • {routine.blocks} blocks
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#71717a" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

          </ScrollView>
        )}
      </Animated.View>

      {/* RED TEST BUTTON - Universal Link Debug (kept from original) */}
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

      {/* ============================================================ */}
      {/* MODALS                                                        */}
      {/* ============================================================ */}

      {/* Custom Share Modal — QR code + send link, unchanged from original */}
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

      {/* Success Modal */}
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

      {/* ================================================================
          ACTION SHEET — now includes Share at the top of the actions.
          Tapping Share dismisses the sheet and opens the existing share
          modal via handleShareFromActionSheet → handleExport.
          ================================================================ */}
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

          <View style={[styles.actionSheet, { borderColor: themeColor }]}>
            <View style={styles.handleBar} />

            <View style={styles.actionHeader}>
              <Text style={styles.actionTitle}>Workout Options</Text>
              <TouchableOpacity
                style={styles.actionCloseButton}
                onPress={() => setDeleteModal({ visible: false, routine: null })}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            <View style={styles.actionPlanInfo}>
              <Text style={styles.actionPlanName} numberOfLines={2}>
                {deleteModal.routine?.name}
              </Text>
              <Text style={styles.actionPlanDetails}>
                {deleteModal.routine?.days} days • {deleteModal.routine?.blocks} blocks
              </Text>
            </View>

            <View style={styles.modernActionButtons}>
              {/* SHARE — opens the QR / send link modal */}
              <TouchableOpacity
                style={[styles.shareActionInSheet, { backgroundColor: themeColor, shadowColor: themeColor }]}
                onPress={() => deleteModal.routine && handleShareFromActionSheet(deleteModal.routine)}
                activeOpacity={0.85}
              >
                <Ionicons name="share-outline" size={18} color="#0a0a0b" />
                <Text style={styles.shareActionInSheetText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveActionButton,
                  savedWorkoutRoutines.has(deleteModal.routine?.fingerprint || deleteModal.routine?.id || '') && styles.removeActionButton
                ]}
                onPress={() => {
                  console.log('🔥 Save button pressed, modal routine:', deleteModal.routine?.name);
                  if (deleteModal.routine) {
                    handleToggleSaveWorkout(deleteModal.routine);
                  } else {
                    console.log('❌ No routine in modal');
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={savedWorkoutRoutines.has(deleteModal.routine?.fingerprint || deleteModal.routine?.id || '') ? "heart-dislike" : "heart"}
                  size={18}
                  color="#ffffff"
                />
                <Text style={styles.saveActionText}>
                  {savedWorkoutRoutines.has(deleteModal.routine?.fingerprint || deleteModal.routine?.id || '') ? 'Remove from Collection' : 'Save to Collection'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.renameButton}
                onPress={() => deleteModal.routine && handleRenameRequest(deleteModal.routine)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={18} color="#ffffff" />
                <Text style={styles.renameText}>Rename</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={handleDeleteConfirm}
                activeOpacity={0.7}
              >
                <Ionicons name="trash" size={18} color="#ffffff" />
                <Text style={styles.deleteConfirmText}>Remove</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => setDeleteModal({ visible: false, routine: null })}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
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

      {/* Rename Modal */}
      <Modal
        visible={renameModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRenameModal({ visible: false, routine: null, newName: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.renameContainer}>
            <View style={styles.renameIconContainer}>
              <Ionicons name="create-outline" size={32} color="#22d3ee" />
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

      {/* Debug Modal */}
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

  // ===== Title bar =====
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
  },
  titleAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ===== Scroll =====
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },

  // ===== Section grouping =====
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a1a1aa',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // ===== Hero card — new layout =====
  heroCard: {
    backgroundColor: '#18181b',
    borderRadius: 18,
    borderWidth: 2,
    padding: 20,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  heroTitleText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 32,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#a1a1aa',
    marginTop: 4,
  },
  // Full-width primary action
  heroTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 18,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  heroTodayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0a0a0b',
    letterSpacing: 0.2,
  },
  heroMenuBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  // Subtle text link below
  heroPlanLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 12,
    paddingBottom: 2,
  },
  heroPlanLinkText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // ===== Small plan card (for routines beyond the first) =====
  smallPlanCard: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  smallPlanContent: { flex: 1 },
  smallPlanTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  smallPlanSub: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
  },

  // ===== Link row =====
  linkRow: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkRowPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkRowMenuBtn: {
    padding: 4,
    borderRadius: 4,
  },
  linkRowText: { flex: 1 },
  linkRowTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  linkRowSub: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
  },

  // ===== Empty state =====
  emptyScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyHero: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyHeroIcon: {
    width: 84,
    height: 84,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 14,
  },
  emptyHeroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyHeroBody: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyHeroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  emptyHeroButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0a0a0b',
  },

  // ===== Old card styles preserved (rollback safety, unused by new layout) =====
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16 },
  appHeader: { marginBottom: 24 },
  appName: { fontSize: 14, fontWeight: '700', color: '#22d3ee', letterSpacing: 2 },
  pageTitle: { fontSize: 32, fontWeight: '700', color: '#ffffff' },
  listContent: { paddingTop: 120, paddingHorizontal: 16, paddingBottom: 100 },
  emptyListContent: { flex: 1, paddingHorizontal: 16 },
  card: { backgroundColor: '#18181b', borderRadius: 4, borderWidth: 1, borderColor: '#27272a', padding: 20, marginBottom: 12 },
  cardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#71717a' },
  exportButton: { padding: 8, marginLeft: 12 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff', textAlign: 'center', marginTop: 24, marginBottom: 16 },
  emptyDescription: { fontSize: 16, color: '#71717a', textAlign: 'center', lineHeight: 24 },
  emptySubtext: { fontSize: 14, color: '#52525b', textAlign: 'center', paddingHorizontal: 40 },
  buttonInner: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', borderRadius: 4 },

  // ===== Modal shared =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff', textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#71717a', textAlign: 'center', marginBottom: 24 },
  modalButtons: { gap: 12 },
  modalButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#27272a', borderRadius: 8, paddingVertical: 16, paddingHorizontal: 20, gap: 12 },
  modalButtonCancel: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#3f3f46' },
  modalButtonText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  modalButtonCancelText: { color: '#71717a' },

  // ===== Success modal =====
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
  successButton: { backgroundColor: '#22d3ee', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32, minWidth: 80 },
  successButtonText: { fontSize: 16, fontWeight: '600', color: '#0a0a0b', textAlign: 'center' },

  // ===== Action sheet =====
  actionModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  actionModalBackdrop: { flex: 1 },
  actionSheet: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 20,
    maxHeight: '85%',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#22d3ee',
    marginHorizontal: 4,
  },
  handleBar: { width: 40, height: 4, backgroundColor: '#52525b', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  actionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  actionTitle: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  actionCloseButton: { padding: 4 },
  actionPlanInfo: {
    backgroundColor: '#27272a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  actionPlanName: { color: '#ffffff', fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  actionPlanDetails: { color: '#a1a1aa', fontSize: 14, textAlign: 'center' },
  modernActionButtons: { flexDirection: 'column', gap: 14, width: '100%' },

  // NEW: Share button inside action sheet (primary cyan styling)
  shareActionInSheet: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  shareActionInSheetText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
    letterSpacing: 0.2,
  },

  saveActionButton: {
    width: '100%',
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  removeActionButton: { backgroundColor: '#f59e0b', shadowColor: '#f59e0b' },
  saveActionText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  renameButton: {
    width: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  renameText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  deleteConfirmButton: {
    width: '100%',
    backgroundColor: '#ef4444',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteConfirmText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  deleteCancelButton: {
    flex: 1,
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3f3f46',
    minHeight: 44,
  },
  deleteCancelText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  actionCancelButton: {
    width: '100%',
    backgroundColor: '#27272a',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#3f3f46',
  },

  // ===== Share modal =====
  newShareOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  newShareBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  newShareModal: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 2,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    shadowColor: '#22d3ee',
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
  newShareSubtitle: { fontSize: 14, color: '#a1a1aa', textAlign: 'center', marginBottom: 24 },
  shareActionButtons: { width: '100%', gap: 16 },
  shareActionPrimary: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  shareActionSecondary: {
    width: '100%',
    backgroundColor: '#27272a',
    borderWidth: 2,
    borderColor: '#3f3f46',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  shareButtonSimple: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  shareButtonTitleSimple: { fontSize: 16, fontWeight: '700', color: '#0a0a0b', letterSpacing: 0.5 },
  shareButtonSubtitle: { fontSize: 13, fontWeight: '500', color: 'rgba(10, 10, 11, 0.7)', letterSpacing: 0.2 },

  // ===== Rename modal =====
  renameContainer: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#27272a',
    padding: 28,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  renameIconContainer: { backgroundColor: 'rgba(34, 211, 238, 0.1)', borderRadius: 50, padding: 16, marginBottom: 20 },
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

  // ===== Debug modal =====
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

  // ===== QR =====
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
  qrCodeDescription: { color: '#a1a1aa', fontSize: 12, fontWeight: '500', marginTop: 12, textAlign: 'center' },
  shareFooterText: { color: '#71717a', fontSize: 11, fontWeight: '500', marginTop: 16, textAlign: 'center' },

  // ===== Debug test button =====
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