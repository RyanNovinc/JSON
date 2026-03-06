import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/AppNavigator';
import { WorkoutStorage, WorkoutRoutine, MealPlan } from '../utils/storage';
import WorkoutCalendar from '../components/WorkoutCalendar';
import ImportFeedbackModal from '../components/ImportFeedbackModal';
import OnboardingSlideshow from '../components/OnboardingSlideshow';
import { useImportFeedback } from '../hooks/useImportFeedback';
import { useTheme } from '../contexts/ThemeContext';
import { ENABLE_NUTRITION_PAYWALL } from '../config/revenueCatConfig';
import { useAppMode } from '../contexts/AppModeContext';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function RoutineCard({ routine, onExport, onPress, onLongPress, isPinkTheme, themeColor }: { 
  routine: WorkoutRoutine; 
  onExport: () => void;
  onPress: () => void;
  onLongPress: () => void;
  isPinkTheme?: boolean;
  themeColor: string;
}) {
  return (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.8} 
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={800}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>{routine.name}</Text>
          <Text style={styles.cardSubtitle}>
            {routine.days} days • {routine.blocks} blocks
          </Text>
        </View>
        <TouchableOpacity onPress={onExport} style={styles.exportButton}>
          <Ionicons name="share-outline" size={22} color={themeColor} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ route }: any) {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [shareModal, setShareModal] = useState<{ visible: boolean; routine: WorkoutRoutine | null }>({
    visible: false,
    routine: null,
  });
  const [successModal, setSuccessModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ visible: boolean; routine: WorkoutRoutine | null }>({
    visible: false,
    routine: null,
  });
  const [savedWorkoutRoutines, setSavedWorkoutRoutines] = useState<Set<string>>(new Set());
  const [myRoutines, setMyRoutines] = useState<WorkoutRoutine[]>([]);
  const [renameModal, setRenameModal] = useState<{ visible: boolean; routine: WorkoutRoutine | null; newName: string }>({
    visible: false,
    routine: null,
    newName: '',
  });
  const [calendarModal, setCalendarModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const { showFeedbackModal, submitFeedback, skipFeedback, triggerFeedbackModal } = useImportFeedback();
  const { isPinkTheme, setIsPinkTheme, themeColor, themeColorLight } = useTheme();
  const { appMode, setAppMode, isTrainingMode, isNutritionMode } = useAppMode();

  // Load routines from storage on component mount
  useEffect(() => {
    const initializeApp = async () => {
      // Clean up any corrupted completion data on app start
      await WorkoutStorage.cleanupCorruptedCompletionData();
      
      // Load app data
      loadRoutines();
      loadMyRoutines();
    };
    
    initializeApp();
  }, []);

  // Check if onboarding should be shown
  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    // Reset onboarding in development for easy testing
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
        
        // Check if this is a new unified export that already created the routine
        const metadata = (program as any)._metadata;
        if (metadata && metadata.exportType === 'unified_mesocycle_structure') {
          // Just refresh routines list - routine was already created in ImportScreen
          await loadRoutines();
          navigation.setParams({ importedProgram: undefined } as any);
          return;
        }
        
        // Define sample workout IDs to prevent duplicates
        const sampleWorkoutIds = [
          'sample_quick_start_ppl',
          'sample_muscle_builder_pro_52w', 
          'sample_glute_tone_12w'
        ];
        
        // Check if this is a sample workout trying to be imported
        if (program.id && sampleWorkoutIds.includes(program.id)) {
          Alert.alert(
            'Already Available',
            'This workout is already available in Sample Plans. You can access it anytime from the Workout Plans screen.',
            [{ text: 'OK' }]
          );
          
          // Clear the params and return early
          navigation.setParams({ importedProgram: undefined } as any);
          return;
        }
        
        // Determine mesocycle number if this is part of a mesocycle program
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
          programId: program.programId, // Link to mesocycle program if applicable
          mesocycleNumber, // which mesocycle this routine belongs to
        };
        addRoutine(newRoutine);
        
        // If this routine is part of a mesocycle program, update the program's routine list
        if (program.programId) {
          try {
            const { ProgramStorage } = await import('../data/programStorage');
            await ProgramStorage.addRoutineToProgram(program.programId, newRoutine.id);
          } catch (error) {
            console.error('Failed to link routine to program:', error);
          }
        }
        
        // Trigger feedback modal if the program has an import ID
        if (program.id) {
          setTimeout(() => {
            triggerFeedbackModal(program.id);
          }, 1000); // Give time for the program to be added to the list
        }
        
        // Clear the params to prevent re-adding
        navigation.setParams({ importedProgram: undefined } as any);
      }
    };

    handleImportedProgram();
  }, [route?.params?.importedProgram, triggerFeedbackModal]);

  const loadRoutines = async () => {
    const storedRoutines = await WorkoutStorage.loadRoutines();
    setRoutines(storedRoutines);
  };

  const loadMyRoutines = async () => {
    console.log('📥 Loading my routines...');
    const myRoutinesList = await WorkoutStorage.loadMyRoutines();
    console.log('📥 Loaded', myRoutinesList.length, 'saved routines');
    setMyRoutines(myRoutinesList);
    
    // Update saved routines set
    const routineIds = new Set(myRoutinesList.map(routine => routine.fingerprint || routine.id));
    setSavedWorkoutRoutines(routineIds);
    console.log('📥 Saved routine IDs:', Array.from(routineIds));
  };

  const addRoutine = async (routine: WorkoutRoutine) => {
    await WorkoutStorage.addRoutine(routine);
    setRoutines(prev => [...prev, routine]);
  };

  const handleExport = (routine: WorkoutRoutine) => {
    if (!routine.data) return;
    setShareModal({ visible: true, routine });
  };

  const handleShare = async (action: 'copy' | 'share') => {
    const routine = shareModal.routine;
    if (!routine?.data) return;
    
    try {
      // Enhanced export with complete state including manual modifications
      let exportData = { ...routine.data };
      
      // Clean exercisePreferences from sample plans at the source
      if (routine.data?._metadata?.isSamplePlan && exportData._metadata?.exercisePreferences) {
        delete exportData._metadata.exercisePreferences;
      }
      let programData = null;
      
      // Load program data if available
      if (routine.programId) {
        const { ProgramStorage } = await import('../data/programStorage');
        programData = await ProgramStorage.getProgram(routine.programId);
      }
      
      // Collect all manual blocks across all mesocycles
      const manualBlocks = [];
      const completionStatus = {};
      const workoutHistory = [];
      
      if (programData && programData.totalMesocycles > 1) {
        // Multi-mesocycle program - collect manual blocks from each mesocycle
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
        
        // Load custom mesocycles
        try {
          const customMesocyclesKey = `custom_mesocycles_${routine.id}`;
          const customMesocyclesData = await AsyncStorage.getItem(customMesocyclesKey);
          if (customMesocyclesData) {
            const customMesocycles = JSON.parse(customMesocyclesData);
            for (const customMeso of customMesocycles) {
              if (customMeso.customId) {
                const customManualBlocksKey = `manual_blocks_${customMeso.customId}`;
                const customManualBlocksData = await AsyncStorage.getItem(customManualBlocksKey);
                console.log(`📤 Export: Checking custom mesocycle ${customMeso.customId} manual blocks:`, customManualBlocksData ? 'FOUND' : 'NOT FOUND');
                if (customManualBlocksData) {
                  const customManualBlocks = JSON.parse(customManualBlocksData);
                  console.log(`📤 Export: Adding ${customManualBlocks.length} manual blocks with customMesocycleId: ${customMeso.customId}`);
                  manualBlocks.push(...customManualBlocks.map(block => ({
                    ...block,
                    customMesocycleId: customMeso.customId
                  })));
                }
              }
            }
            
            // Include custom mesocycles in export
            exportData._customMesocycles = customMesocycles;
          }
        } catch (error) {
          console.log('Could not load custom mesocycles');
        }
      } else {
        // Single routine or no mesocycles - load manual blocks directly
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
      
      // Load completion status
      try {
        const completionKey = `completion_${routine.id}`;
        const completionData = await AsyncStorage.getItem(completionKey);
        if (completionData) {
          Object.assign(completionStatus, JSON.parse(completionData));
        }
      } catch (error) {
        console.log('Could not load completion status');
      }
      
      // Load workout history
      try {
        const historyKey = `workoutHistory_${routine.id}`;
        const historyData = await AsyncStorage.getItem(historyKey);
        if (historyData) {
          workoutHistory.push(...JSON.parse(historyData));
        }
      } catch (error) {
        console.log('Could not load workout history');
      }
      
      // Load exercise customizations and dynamic exercises
      const exerciseCustomizations = {};
      const dynamicExercisesData = {};
      const setsData = {};
      
      if (routine.data && routine.data.blocks) {
        for (const block of routine.data.blocks) {
          for (const day of block.days) {
            // Check for various week customizations
            for (let week = 1; week <= 20; week++) { // Check up to 20 weeks
              // Load exercise customizations (order changes, rep scheme changes)
              const customizationKey = `day_customization_${block.block_name}_${day.day_name}_week${week}`;
              try {
                const customizationData = await AsyncStorage.getItem(customizationKey);
                if (customizationData) {
                  exerciseCustomizations[customizationKey] = JSON.parse(customizationData);
                }
              } catch (error) {
                // Continue to next
              }
              
              // Load dynamic exercises (added during workouts)
              const dynamicKey = `workout_${block.block_name}_${day.day_name}_week${week}_exercises`;
              try {
                const dynamicData = await AsyncStorage.getItem(dynamicKey);
                if (dynamicData) {
                  dynamicExercisesData[dynamicKey] = JSON.parse(dynamicData);
                }
              } catch (error) {
                // Continue to next
              }
              
              // Load sets data (modified sets/reps)
              const setsKey = `workout_${block.block_name}_${day.day_name}_week${week}_sets`;
              try {
                const setsInfo = await AsyncStorage.getItem(setsKey);
                if (setsInfo) {
                  setsData[setsKey] = JSON.parse(setsInfo);
                }
              } catch (error) {
                // Continue to next
              }
            }
          }
        }
      }
      
      // Load exercise preferences
      let exercisePreferences = {};
      try {
        const preferencesData = await AsyncStorage.getItem('exercise_preferences');
        if (preferencesData) {
          exercisePreferences = JSON.parse(preferencesData);
        }
      } catch (error) {
        console.log('Could not load exercise preferences');
      }
      
      // Load active block and week progress
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
      
      // Load custom mesocycles for this routine
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
      
      // NEW UNIFIED APPROACH: Create complete mesocycle structure
      const allMesocycles = [];
      
      // Add program mesocycles (if any)
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
      
      // Add custom mesocycles 
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
      
      // Sort by mesocycle number
      allMesocycles.sort((a, b) => a.mesocycleNumber - b.mesocycleNumber);
      
      // Check if this is a sample plan to exclude exercisePreferences
      // Primary check: explicit isSamplePlan flag
      let isSamplePlan = routine.data?._metadata?.isSamplePlan || false;
      
      // Fallback check: detect sample plans by their characteristics (for plans imported before isSamplePlan flag)
      if (!isSamplePlan) {
        
        // Check by original sample plan IDs first
        const knownSamplePlanIds = ['sample_quick_start_ppl', 'sample_muscle_builder_52w', 'sample_glute_tone_12w'];
        isSamplePlan = knownSamplePlanIds.includes(routine.data?.id);
        
        // If not found by ID, check by workout structure fingerprint
        if (!isSamplePlan) {
          // Check for Foundation Builder fingerprint (this specific routine):
          // - 3 days per week
          // - 2 blocks 
          // - Full Body A/B/C structure
          if (routine.data?.days_per_week === 3 && 
              routine.data?.blocks?.length === 2 &&
              routine.data?.blocks?.[0]?.days?.[0]?.day_name === "Full Body A" &&
              routine.data?.blocks?.[0]?.days?.[1]?.day_name === "Full Body B" &&
              routine.data?.blocks?.[0]?.days?.[2]?.day_name === "Full Body C") {
            isSamplePlan = true;
          }
          
          // Check for original Quick Start sample plan fingerprint:
          // - 3 days per week, 3 blocks, Push/Pull/Legs
          else if (routine.data?.days_per_week === 3 && 
                   routine.data?.blocks?.length === 3 &&
                   routine.data?.blocks?.[0]?.days?.[0]?.day_name === "Push Day" &&
                   routine.data?.blocks?.[0]?.days?.[1]?.day_name === "Pull Day" &&
                   routine.data?.blocks?.[0]?.days?.[2]?.day_name === "Leg Day") {
            isSamplePlan = true;
          }
          
          // Check for Muscle Builder Pro fingerprint:
          // - 4-6 days per week, many blocks, specific structure
          else if (routine.data?.blocks?.length >= 10 && 
                   routine.data?.days_per_week >= 4) {
            isSamplePlan = true;
          }
          
          // Check for Glute & Tone fingerprint:
          // - 4 days per week, Lower/Upper pattern
          else if (routine.data?.days_per_week === 4 &&
                   routine.data?.blocks?.[0]?.days?.[0]?.day_name === "Lower Body - Glute Focus") {
            isSamplePlan = true;
          }
        }
      }
      
      // Simplified metadata with unified mesocycle structure
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
        // Complete state data
        manualBlocks: manualBlocks,
        completionStatus: completionStatus,
        workoutHistory: workoutHistory,
        activeBlock: activeBlock ? parseInt(activeBlock) : null,
        weekProgress: weekProgress,
        // Exercise-level modifications
        exerciseCustomizations: exerciseCustomizations,
        dynamicExercisesData: dynamicExercisesData,
        setsData: setsData,
        // Only include exercisePreferences for non-sample plans
        ...(isSamplePlan ? {} : { exercisePreferences: exercisePreferences }),
        // Preserve isSamplePlan flag if it exists
        ...(isSamplePlan ? { isSamplePlan: true } : {})
      };
      
      exportData._metadata = metadata;
      exportData.routine_name = routine.name;
      
      // NEW UNIFIED EXPORT: No complex logic, just export everything cleanly
      
      const jsonString = JSON.stringify(exportData, null, 2);
      
      if (action === 'copy') {
        console.log('📋 Starting clipboard copy...');
        await Clipboard.setStringAsync(jsonString);
        console.log('📋 Clipboard copy completed');
        setShareModal({ visible: false, routine: null });
        console.log('📋 Share modal closed');
        setTimeout(() => {
          console.log('📋 Showing success modal');
          setSuccessModal(true);
          // Auto-dismiss success modal after 2 seconds
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
        setShareModal({ visible: false, routine: null });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      setShareModal({ visible: false, routine: null });
    }
  };

  const handleActionRequest = (routine: WorkoutRoutine) => {
    setDeleteModal({ visible: true, routine });
  };

  const handleToggleSaveWorkout = async (routine: WorkoutRoutine) => {
    try {
      const routineId = routine.fingerprint || routine.id;
      const isCurrentlySaved = savedWorkoutRoutines.has(routineId);
      
      console.log('💾 Save workout button pressed:', routine.name, 'Currently saved:', isCurrentlySaved);
      
      if (isCurrentlySaved) {
        // Remove from collection
        console.log('🗑️ Removing workout from collection');
        await WorkoutStorage.removeMyRoutine(routineId);
      } else {
        // Add to collection
        const transformedWorkout = {
          ...routine,
          id: `${routine.id}_${Date.now()}`,
          fingerprint: routineId, // Keep original fingerprint for identification
          createdAt: Date.now(),
        };
        
        console.log('💾 Saving workout with ID:', transformedWorkout.id);
        await WorkoutStorage.addMyRoutine(transformedWorkout);
      }
      
      // Refresh my routines list
      await loadMyRoutines();
      console.log('💾 Toggle workout completed successfully');
    } catch (error) {
      console.error('Failed to toggle save workout:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    const routine = deleteModal.routine;
    if (!routine) return;

    try {
      await WorkoutStorage.removeRoutine(routine.id);
      setRoutines(prev => prev.filter(r => r.id !== routine.id));
      setDeleteModal({ visible: false, routine: null });
    } catch (error) {
      console.error('Failed to delete routine:', error);
    }
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
      setRoutines(prev => prev.map(r => r.id === routine.id ? updatedRoutine : r));
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

  const handleNutritionTransition = () => {
    if (isTransitioning) return;
    
    // 🚨 MONETIZATION CONTROL: Check if paywall is enabled
    if (ENABLE_NUTRITION_PAYWALL) {
      // When paywall is ENABLED: Check if user has purchased
      // TODO: Add nutrition entitlement check here when paywall is enabled
      // For now, always show paywall when enabled
      navigation.navigate('PaymentScreen' as any);
      return;
    }
    
    // When paywall is DISABLED: Direct access to nutrition (FREE)
    setAppMode('nutrition');
    navigation.navigate('NutritionHome' as any);
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

      // Find the active routine (first one for now, but could be extended to find truly active one)
      const activeRoutine = routines[0];
      
      
      if (!activeRoutine.data?.blocks || activeRoutine.data.blocks.length === 0) {
        Alert.alert(
          'Invalid Routine',
          'The selected routine does not have valid workout blocks.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get the active block from storage, or find first incomplete block
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
      
      // Calculate current week based on completion
      let currentWeek = 1;
      const totalWeeks = activeBlock.weeks.includes('-') 
        ? parseInt(activeBlock.weeks.split('-')[1]) - parseInt(activeBlock.weeks.split('-')[0]) + 1 
        : 1;

      try {
        // Check for manually bookmarked week first
        const bookmarkData = await WorkoutStorage.getBookmark(activeBlock.block_name);
        
        if (bookmarkData?.isBookmarked) {
          currentWeek = bookmarkData.week;
        } else {
          // Find first incomplete week
          for (let week = 1; week <= totalWeeks; week++) {
            const completedWorkouts = await WorkoutStorage.getCompletedWorkouts(activeBlock.block_name, week);
            
            if (!completedWorkouts || completedWorkouts.length === 0) {
              currentWeek = week;
              break;
            }
            
            // Check if all days in this week are completed
            const allDaysCompleted = activeBlock.days.every(day => 
              completedWorkouts.includes(`${day.day_name}_week${week}`)
            );
            
            if (!allDaysCompleted) {
              currentWeek = week;
              break;
            }
            
            // If we're on the last week and it's complete, stay on last week
            if (week === totalWeeks) {
              currentWeek = totalWeeks;
            }
          }
        }
      } catch (error) {
        console.log('Error calculating current week, using week 1');
        currentWeek = 1;
      }

      // Navigate directly to the Days screen with the active block
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
      // Load all meal plans
      const mealPlans = await WorkoutStorage.loadMealPlans();
      
      if (mealPlans.length === 0) {
        Alert.alert(
          'No Meal Plans',
          'You need to import a meal plan first to use "Go to Today".',
          [{ text: 'OK' }]
        );
        return;
      }

      // For now, use the first meal plan. In a real app, you'd find the active meal plan
      const activeMealPlan = mealPlans[0];
      const today = new Date();
      
      // Calculate which week contains today
      const mealPlanStartDate = new Date(); // This should come from meal plan data
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
      
      // Find which week contains today
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

      // Navigate to the week that contains today
      navigation.navigate('MealPlanWeeks' as any, { mealPlan: activeMealPlan });
      
      // Optional: You could navigate directly to the day instead
      // navigation.navigate('MealPlanDays' as any, { 
      //   week: currentWeek, 
      //   mealPlanName: activeMealPlan.name 
      // });
      
    } catch (error) {
      console.error('Error navigating to today:', error);
      Alert.alert(
        'Error',
        'Could not find today\'s meal plan. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle nutrition mode navigation
  useEffect(() => {
    if (isNutritionMode) {
      // 🚨 MONETIZATION CONTROL: Check if paywall is enabled
      if (ENABLE_NUTRITION_PAYWALL) {
        // When paywall is ENABLED: Show paywall instead of direct access
        navigation.navigate('PaymentScreen' as any);
        return;
      }
      
      // When paywall is DISABLED: Direct access to nutrition (FREE)
      navigation.navigate('NutritionHome' as any);
    }
  }, [isNutritionMode, navigation]);

  const renderContent = () => {
    // If in nutrition mode, don't render workout content - navigation happens in useEffect above
    if (isNutritionMode) {
      return null; // Don't render anything while navigating to nutrition screen
    }

    if (routines.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={64} color="#3f3f46" />
          <Text style={styles.emptyTitle}>No Routines Yet</Text>
          <Text style={styles.emptyDescription}>
            Import a custom JSON workout plan or choose one of the sample plans.
          </Text>
        </View>
      );
    }

    if (routines.length === 1) {
      // Hero layout for single routine
      const routine = routines[0];
      return (
        <View style={styles.heroContainer}>
          <TouchableOpacity
            style={[styles.heroCard, { borderColor: themeColor, shadowColor: themeColor }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Blocks' as any, { routine })}
            onLongPress={() => handleActionRequest(routine)}
            delayLongPress={800}
          >
            <View style={styles.heroContent}>
              <Text style={[styles.heroTitle, { textShadowColor: themeColorLight }]}>{routine.name}</Text>
              <Text style={styles.heroSubtitle}>
                {routine.days} days per week • {routine.blocks} blocks
              </Text>
              <Text style={[styles.heroDescription, { color: themeColor }]}>
                Tap to start your workout
              </Text>
            </View>
            
            <View style={styles.heroActions}>
              <TouchableOpacity
                style={styles.heroActionButton}
                onPress={() => handleExport(routine)}
                activeOpacity={0.7}
              >
                <Ionicons name="share-outline" size={24} color={themeColor} />
                <Text style={[styles.heroActionText, { color: themeColor }]}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroSecondaryButton}
                onPress={() => handleGoToTodayWorkout()}
                activeOpacity={0.7}
              >
                <Ionicons name="today-outline" size={18} color="#71717a" />
                <Text style={styles.heroSecondaryText}>Today</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    if (routines.length === 2) {
      // Two routines - split screen vertically
      return (
        <View style={styles.dualVerticalContainer}>
          {routines.map((routine, index) => (
            <View key={routine.id} style={styles.dualVerticalHeroContainer}>
              <TouchableOpacity
                style={[styles.dualVerticalCard, { borderColor: themeColor, shadowColor: themeColor }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Blocks' as any, { routine })}
                onLongPress={() => handleActionRequest(routine)}
                delayLongPress={800}
              >
                <View style={styles.dualVerticalContent}>
                  <Text style={[styles.dualVerticalTitle, { textShadowColor: themeColorLight }]}>{routine.name}</Text>
                  <Text style={styles.dualVerticalSubtitle}>
                    {routine.days} days per week • {routine.blocks} blocks
                  </Text>
                  <Text style={[styles.dualVerticalDescription, { color: themeColor }]}>
                    Tap to start your workout
                  </Text>
                  
                  <View style={styles.dualVerticalActions}>
                    <TouchableOpacity
                      style={styles.dualVerticalShareButton}
                      onPress={() => handleExport(routine)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="share-outline" size={24} color={themeColor} />
                      <Text style={[styles.dualVerticalShareText, { color: themeColor }]}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dualVerticalSecondaryButton}
                      onPress={() => handleGoToTodayWorkout()}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="today-outline" size={16} color="#71717a" />
                      <Text style={styles.dualVerticalSecondaryText}>Today</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      );
    }

    if (routines.length === 3) {
      // Three routines - compact horizontal cards
      return (
        <View style={styles.tripleContainer}>
          {routines.map((routine, index) => (
            <View key={routine.id} style={styles.tripleCardContainer}>
              <TouchableOpacity
                style={[styles.tripleCard, { borderColor: themeColor, shadowColor: themeColor }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Blocks' as any, { routine })}
                onLongPress={() => handleActionRequest(routine)}
                delayLongPress={800}
              >
                <View style={styles.tripleContent}>
                  <Text style={[styles.tripleTitle, { textShadowColor: themeColorLight }]} numberOfLines={2}>
                    {routine.name}
                  </Text>
                  <Text style={styles.tripleSubtitle}>
                    {routine.days} days • {routine.blocks} blocks
                  </Text>
                  <Text style={[styles.tripleDescription, { color: themeColor }]}>
                    Tap to start
                  </Text>
                </View>
                
                <View style={styles.tripleButtonsContainer}>
                  <TouchableOpacity
                    style={styles.tripleShareButton}
                    onPress={() => handleExport(routine)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="share-outline" size={20} color={themeColor} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.tripleShareButton}
                    onPress={() => handleGoToTodayWorkout()}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="today-outline" size={20} color={themeColor} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      );
    }

    if (routines.length === 4) {
      // Four routines - vertical stack layout
      return (
        <View style={styles.quadContainer}>
          {routines.map((routine, index) => (
            <View key={routine.id} style={styles.quadCardContainer}>
              <TouchableOpacity
                style={[styles.quadCard, { borderColor: themeColor, shadowColor: themeColor }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Blocks' as any, { routine })}
                onLongPress={() => handleActionRequest(routine)}
                delayLongPress={800}
              >
                <View style={styles.quadContent}>
                  <Text style={[styles.quadTitle, { textShadowColor: themeColorLight }]} numberOfLines={2}>
                    {routine.name}
                  </Text>
                  <Text style={styles.quadSubtitle}>
                    {routine.days} days • {routine.blocks} blocks
                  </Text>
                  <Text style={[styles.quadDescription, { color: themeColor }]}>
                    Tap to start
                  </Text>
                </View>
                
                <View style={styles.quadButtonsContainer}>
                  <TouchableOpacity
                    style={styles.quadShareButton}
                    onPress={() => handleExport(routine)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="share-outline" size={18} color={themeColor} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quadShareButton}
                    onPress={() => handleGoToTodayWorkout()}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="today-outline" size={18} color={themeColor} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      );
    }

    // Multiple routines - scrollable list
    return (
      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RoutineCard
            routine={item}
            onExport={() => handleExport(item)}
            onPress={() => navigation.navigate('Blocks' as any, { routine: item })}
            onLongPress={() => handleActionRequest(item)}
            isPinkTheme={isPinkTheme}
            themeColor={themeColor}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

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
        {renderContent()}
      </Animated.View>

      {/* Calendar Button - Bottom Left */}
      <View style={[styles.calendarButton, { backgroundColor: themeColor }]}>
        <TouchableOpacity
          style={styles.buttonInner}
          onPress={() => setCalendarModal(true)}
          activeOpacity={0.9}
        >
          <Ionicons name="calendar-outline" size={24} color="#0a0a0b" />
        </TouchableOpacity>
      </View>

      {/* Go to Today Button - Bottom Left (Nutrition Mode Only) */}
      {isNutritionMode && (
        <View style={[styles.todayButton, { backgroundColor: themeColor }]}>
          <TouchableOpacity
            style={styles.buttonInner}
            onPress={handleGoToToday}
            activeOpacity={0.9}
          >
            <Ionicons name="today-outline" size={24} color="#0a0a0b" />
          </TouchableOpacity>
        </View>
      )}

      {/* Questionnaire Button - Bottom Center */}
      <View style={[styles.questionnaireButton, { backgroundColor: themeColor }]}>
        <TouchableOpacity
          style={styles.buttonInner}
          onPress={() => navigation.navigate('WorkoutDashboard' as any)}
          activeOpacity={0.9}
        >
          <Ionicons name="clipboard-outline" size={24} color="#0a0a0b" />
        </TouchableOpacity>
      </View>

      {/* App Mode Toggle - Centered at Top */}
      <View style={styles.centralToggleContainer}>
        <TouchableOpacity
          style={[
            styles.centralModeToggle, 
            isTrainingMode && { backgroundColor: themeColor, borderColor: themeColor }
          ]}
          onPress={() => setAppMode('training')}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="barbell" 
            size={20} 
            color={isTrainingMode ? "#0a0a0b" : themeColor} 
          />
          <Text style={[
            styles.centralToggleText,
            { color: isTrainingMode ? "#0a0a0b" : themeColor }
          ]}>
            Workouts
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.centralModeToggle, 
            isNutritionMode && { backgroundColor: themeColor, borderColor: themeColor }
          ]}
          onPress={handleNutritionTransition}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="restaurant" 
            size={20} 
            color={isNutritionMode ? "#0a0a0b" : themeColor} 
          />
          <Text style={[
            styles.centralToggleText,
            { color: isNutritionMode ? "#0a0a0b" : themeColor }
          ]}>
            Nutrition
          </Text>
        </TouchableOpacity>
      </View>


      {/* Add Routine FAB - Bottom Right */}
      <View style={[styles.fab, { backgroundColor: themeColor }]}>
        <TouchableOpacity
          style={styles.buttonInner}
          onPress={() => {
            if (showOnboarding) {
              handleOnboardingComplete();
            }
            navigation.navigate('ImportRoutine' as any);
          }}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={28} color="#0a0a0b" />
        </TouchableOpacity>
      </View>

      {/* Custom Share Modal */}
      <Modal
        visible={shareModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShareModal({ visible: false, routine: null })}
      >
        <View style={styles.newShareOverlay}>
          <TouchableOpacity 
            style={styles.newShareBackdrop}
            activeOpacity={1}
            onPress={() => setShareModal({ visible: false, routine: null })}
          />
          
          <View style={[styles.newShareModal, { borderColor: themeColor }]}>
            {/* Close Button */}
            <View style={styles.newShareHeader}>
              <TouchableOpacity
                style={styles.newShareClose}
                onPress={() => setShareModal({ visible: false, routine: null })}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            {/* Image */}
            <Image 
              source={isPinkTheme ? 
                require('./../../Lucid_Origin_Two_athletic_women_in_a_modern_gym_one_spotting_t_0.jpg') :
                require('./../../sdfdfs.jpg')
              }
              style={styles.newShareImage}
              resizeMode="cover"
            />
            
            {/* Content */}
            <View style={styles.newShareContent}>
              <Text style={[styles.newShareTitle, { color: themeColor }]}>
                {shareModal.routine?.name?.toUpperCase()}
              </Text>
              <Text style={styles.newShareSubtitle}>Share your workout routine</Text>
              
              {/* Action Buttons */}
              <View style={styles.shareActionButtons}>
                <TouchableOpacity
                  style={[styles.shareActionPrimary, { backgroundColor: themeColor }]}
                  onPress={() => handleShare('copy')}
                  activeOpacity={0.9}
                >
                  <View style={styles.shareButtonContent}>
                    <Ionicons name="copy" size={22} color="#0a0a0b" />
                    <View style={styles.shareButtonText}>
                      <Text style={styles.shareButtonTitle}>COPY ROUTINE</Text>
                      <Text style={styles.shareButtonSubtitle}>JSON to clipboard</Text>
                    </View>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.shareActionSecondary}
                  onPress={() => handleShare('share')}
                  activeOpacity={0.9}
                >
                  <View style={styles.shareButtonContent}>
                    <Ionicons name="share-social" size={22} color="#22d3ee" />
                    <View style={styles.shareButtonText}>
                      <Text style={[styles.shareButtonTitle, { color: '#ffffff' }]}>SHARE</Text>
                      <Text style={[styles.shareButtonSubtitle, { color: '#a1a1aa' }]}>Send to others</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Success Modal */}
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

      {/* Action Sheet Modal */}
      <Modal
        visible={deleteModal.visible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDeleteModal({ visible: false, routine: null })}
      >
        <View style={styles.actionModalOverlay}>
          <TouchableOpacity 
            style={styles.actionModalBackdrop}
            activeOpacity={1}
            onPress={() => setDeleteModal({ visible: false, routine: null })}
          />
          
          <View style={[styles.actionSheet, { borderColor: themeColor }]}>
            {/* Handle Bar */}
            <View style={styles.handleBar} />
            
            {/* Header */}
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
            
            {/* Routine Info */}
            <View style={styles.actionPlanInfo}>
              <Text style={styles.actionPlanName} numberOfLines={2}>
                {deleteModal.routine?.name}
              </Text>
              <Text style={styles.actionPlanDetails}>
                {deleteModal.routine?.days} days • {deleteModal.routine?.blocks} blocks
              </Text>
            </View>
            
            <View style={styles.modernActionButtons}>
              {/* Save to Collection Button */}
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

      {/* Workout Calendar */}
      <WorkoutCalendar
        visible={calendarModal}
        onClose={() => setCalendarModal(false)}
      />

      {/* Import Feedback Modal */}
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


      {/* Onboarding Slideshow */}
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
  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  appHeader: {
    marginBottom: 24,
  },
  appName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22d3ee',
    letterSpacing: 2,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  listContent: {
    paddingTop: 120,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyListContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 20,
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#71717a',
  },
  exportButton: {
    padding: 8,
    marginLeft: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#52525b',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#22d3ee',
  },
  buttonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
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
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    gap: 12,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27272a',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  modalButtonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalButtonCancelText: {
    color: '#71717a',
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
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 24,
  },
  successButton: {
    backgroundColor: '#22d3ee',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    minWidth: 80,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
    textAlign: 'center',
  },
  deleteContainer: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#27272a',
    padding: 28,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  deleteIconContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 50,
    padding: 16,
    marginBottom: 20,
  },
  deleteTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  deleteRoutineInfo: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteRoutineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  deleteRoutineDetails: {
    fontSize: 13,
    color: '#a1a1aa',
    textAlign: 'center',
  },
  deleteMessage: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  deleteButtons: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  renameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  heroContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Dual vertical layout (two routines)
  dualVerticalContainer: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 100,
    paddingHorizontal: 16,
    gap: 16,
    justifyContent: 'space-evenly',
  },
  dualVerticalHeroContainer: {
    height: '45%',
    width: '100%',
  },
  dualVerticalCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#22d3ee',
    padding: 32,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22d3ee',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dualVerticalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  dualVerticalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(34, 211, 238, 0.5)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 2,
  },
  dualVerticalSubtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    marginBottom: 16,
    textAlign: 'center',
  },
  dualVerticalDescription: {
    fontSize: 14,
    color: '#22d3ee',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  dualVerticalActions: {
    alignItems: 'center',
  },
  dualVerticalShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
  },
  dualVerticalShareText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dualVerticalSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
    marginTop: 8,
  },
  dualVerticalSecondaryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717a',
  },
  // Triple layout (three routines)
  tripleContainer: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 100,
    paddingHorizontal: 16,
    gap: 12,
    justifyContent: 'space-evenly',
  },
  tripleCardContainer: {
    height: '30%',
    width: '100%',
  },
  tripleCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#22d3ee',
    padding: 20,
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#22d3ee',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tripleContent: {
    flex: 1,
    justifyContent: 'center',
  },
  tripleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    textShadowColor: 'rgba(34, 211, 238, 0.5)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 2,
  },
  tripleSubtitle: {
    fontSize: 13,
    color: '#a1a1aa',
    marginBottom: 4,
  },
  tripleDescription: {
    fontSize: 12,
    color: '#22d3ee',
    fontWeight: '600',
  },
  tripleButtonsContainer: {
    flexDirection: 'column',
    gap: 8,
    marginLeft: 12,
  },
  tripleShareButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
  },
  // Quad layout (four routines) - vertical stack
  quadContainer: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 100,
    paddingHorizontal: 16,
    gap: 10,
    justifyContent: 'space-evenly',
  },
  quadCardContainer: {
    height: '22%',
    width: '100%',
  },
  quadCard: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#22d3ee',
    padding: 16,
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#22d3ee',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  quadContent: {
    flex: 1,
    justifyContent: 'center',
  },
  quadTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    textShadowColor: 'rgba(34, 211, 238, 0.5)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 2,
  },
  quadSubtitle: {
    fontSize: 12,
    color: '#a1a1aa',
    marginBottom: 2,
  },
  quadDescription: {
    fontSize: 11,
    color: '#22d3ee',
    fontWeight: '600',
  },
  quadButtonsContainer: {
    flexDirection: 'column',
    gap: 6,
    marginLeft: 12,
  },
  quadShareButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
  },
  heroCard: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#22d3ee',
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    minHeight: 320,
    justifyContent: 'center',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    // Add a subtle inner glow effect with multiple shadows
    shadowColor: '#22d3ee',
  },
  heroContent: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 42,
    textShadowColor: '#22d3ee40',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroDescription: {
    fontSize: 16,
    color: '#22d3ee',
    textAlign: 'center',
    fontWeight: '500',
  },
  heroActions: {
    width: '100%',
    alignItems: 'center',
  },
  heroActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  heroActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22d3ee',
  },
  heroSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 8,
  },
  heroSecondaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#71717a',
  },
  dualContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 100,
    gap: 20,
  },
  dualCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 24,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 120,
  },
  dualCardFirst: {
    borderColor: '#22d3ee40',
  },
  dualCardSecond: {
    borderColor: '#a855f740',
  },
  dualContent: {
    flex: 1,
  },
  dualTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 28,
  },
  dualSubtitle: {
    fontSize: 14,
    color: '#71717a',
  },
  dualShareButton: {
    backgroundColor: '#27272a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  
  // Calendar button styles
  calendarButton: {
    position: 'absolute',
    left: '50%',
    bottom: 32,
    marginLeft: -28, // Half of width to center
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#22d3ee',
  },
  
  // Today button styles (positioned next to calendar button)
  todayButton: {
    position: 'absolute',
    left: '50%',
    bottom: 96, // Above the calendar button
    marginLeft: -28, // Half of width to center
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#22d3ee',
  },
  
  
  // Questionnaire button styles
  questionnaireButton: {
    position: 'absolute',
    left: 16,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 4,
  },

  // Share modal styles
  shareModalContainer: {
    backgroundColor: '#0a0a0b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#22d3ee',
    padding: 0,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    position: 'relative',
  },
  shareCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(39, 39, 42, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  shareCloseText: {
    fontSize: 18,
    color: '#a1a1aa',
    fontWeight: '400',
    lineHeight: 18,
  },
  shareHeader: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
  },
  shareTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  shareSubtitle: {
    fontSize: 15,
    color: '#a1a1aa',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },
  programInfo: {
    paddingHorizontal: 28,
    marginBottom: 32,
    alignItems: 'center',
  },
  programName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22d3ee',
    textAlign: 'center',
  },
  shareOptions: {
    paddingHorizontal: 28,
    paddingBottom: 28,
    gap: 12,
  },
  shareOption: {
    backgroundColor: '#22d3ee',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  shareOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
    letterSpacing: 0.3,
  },

  // Centered modal design
  centeredOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  centeredModal: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  centeredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  centeredDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22d3ee',
  },
  centeredTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  centeredWorkout: {
    fontSize: 22,
    fontWeight: '700',
    color: '#22d3ee',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 28,
  },
  centeredSubtext: {
    fontSize: 15,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  centeredActions: {
    width: '100%',
    gap: 12,
  },
  centeredCopyButton: {
    backgroundColor: '#22d3ee',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  centeredCopyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  centeredShareButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  centeredShareText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e4e4e7',
  },
  
  
  // Central mode toggle styles
  centralToggleContainer: {
    position: 'absolute',
    top: 54,
    left: '50%',
    marginLeft: -120, // Half of the total width (240px / 2)
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#27272a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  centralModeToggle: {
    width: 112,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  centralToggleText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  
  // New Share Modal Styles
  newShareOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  newShareBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
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
  newShareImage: {
    width: '100%',
    height: 180,
  },
  newShareContent: {
    padding: 24,
    alignItems: 'center',
  },
  newShareTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  newShareSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 24,
  },
  shareActionButtons: {
    width: '100%',
    gap: 16,
  },
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
  shareButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16,
  },
  shareButtonText: {
    flex: 1,
    alignItems: 'flex-start',
  },
  shareButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a0a0b',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  shareButtonSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(10, 10, 11, 0.7)',
    letterSpacing: 0.2,
  },
  // Action Sheet Modal Styles (matching nutrition screen)
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  actionModalBackdrop: {
    flex: 1,
  },
  actionSheet: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 20,
    maxHeight: '80%',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#22d3ee', // Default color, overridden by inline style
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#52525b',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  actionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  actionCloseButton: {
    padding: 4,
  },
  actionPlanInfo: {
    backgroundColor: '#27272a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  actionPlanName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionPlanDetails: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
  },
  modernActionButtons: {
    flexDirection: 'column',
    gap: 16,
    width: '100%',
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  removeActionButton: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
  },
  saveActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
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
  deleteCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Rename Modal Styles (updated for centered design)
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  renameIconContainer: {
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderRadius: 50,
    padding: 16,
    marginBottom: 20,
  },
  renameTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  renameInputContainer: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 4,
    width: '100%',
    marginBottom: 28,
  },
  renameInput: {
    fontSize: 16,
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  renameButtons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  renameCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  renameConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  nutritionPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  nutritionPlaceholderTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },
  nutritionPlaceholderText: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 22,
  },
});