/**
 * useWorkoutImport Hook - Complete Import Pipeline
 * 
 * Verbatim relocation from ImportRoutineScreen with only mechanical edits:
 * - useState/setState calls preserved
 * - navigation calls replaced with callbacks
 * - route.params replaced with hook arguments
 */

import { useState, useRef, useCallback } from 'react';
import { Alert, Animated } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAIPrompt, MUSCLE_GROUPS, QuestionnaireData, generateProgramSpecs } from '../data/workoutPrompt';
import { assemblePlanningPrompt, ProgramContext } from '../data/planningPrompt';
import { ProgramStorage, Program, MesocyclePhase } from '../data/programStorage';
import { extractMesocycleSummary } from '../data/mesocycleExtractor';
import { WorkoutStorage, WorkoutRoutine } from '../utils/storage';
import RobustStorage from '../utils/robustStorage';
import { WorkoutProgram, Exercise } from '../types/workout';
import { fetchShare } from '../services/shareService';

// Types
export interface UseWorkoutImportOptions {
  onImportComplete?: (importedProgram: WorkoutProgram) => void;
  onAppendComplete?: (targetWorkoutId: string) => void;
  mode?: 'create' | 'append';
  targetWorkoutId?: string;
  prefilledJson?: string;
  shareId?: string;
  isCurated?: boolean;
  curatedSlug?: string;
}

export interface UseWorkoutImportReturn {
  // State for rendering
  parsedProgram: WorkoutProgram | null;
  accumulatedPrograms: WorkoutProgram[];
  showConfirmation: boolean;
  showAddMoreMode: boolean;
  isLoading: boolean;
  errorMessage: string;
  generationTime: number;
  
  // Animation values for modal
  modalScale: Animated.Value;
  modalOpacity: Animated.Value;
  successScale: Animated.Value;
  
  // Actions
  importFromClipboard: () => Promise<void>;
  importFromText: (text: string) => Promise<void>;
  importFromFile: () => Promise<void>;
  confirmImport: () => Promise<void>;
  cancelConfirmation: () => void;
  addMoreFiles: () => void;
  backToConfirmation: () => void;
}

export const useWorkoutImport = (options: UseWorkoutImportOptions = {}): UseWorkoutImportReturn => {
  // Destructure options (mechanical edit: route.params -> options)
  const { 
    onImportComplete, 
    onAppendComplete, 
    mode, 
    targetWorkoutId, 
    prefilledJson, 
    shareId,
    isCurated,
    curatedSlug
  } = options;

  // State (copied verbatim from ImportRoutineScreen)
  const [isLoading, setIsLoading] = useState(!!shareId);
  const [parsedProgram, setParsedProgram] = useState<WorkoutProgram | null>(null);
  const [accumulatedPrograms, setAccumulatedPrograms] = useState<WorkoutProgram[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showAddMoreMode, setShowAddMoreMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [generationTime, setGenerationTime] = useState(0);
  const [showStepNavigation, setShowStepNavigation] = useState(false);
  const [prefilledCancelled, setPrefilledCancelled] = useState(false);
  
  // Mesocycle context state
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
  const [mesocycleContext, setMesocycleContext] = useState<any>(null);

  // Animation values (copied verbatim)
  const modalScale = useRef(new Animated.Value(0)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  // HARDEST FUNCTIONS FIRST - verbatim relocation from ImportRoutineScreen

  // 1. restoreCompleteStateForMesocycle (verbatim copy)
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

  // 2. createMesocycleRoutines (verbatim copy)
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

  // 3. restoreCompleteState (verbatim copy)
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
      // Skip for sample plans and curated programs to prevent contaminating user preferences
      if (metadata.exercisePreferences && 
          Object.keys(metadata.exercisePreferences).length > 0 &&
          !metadata.isSamplePlan && !isCurated) {
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
      } else if ((metadata.isSamplePlan || isCurated) && metadata.exercisePreferences) {
        console.log(`🚫 Skipped applying exercise preferences from ${isCurated ? 'curated program' : 'sample plan'} to prevent user preference contamination`);
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

  // 4. handleMesocycleProgramAssociation (verbatim copy)
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

  // 5. handleUnifiedMesocycleImport (verbatim copy)
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
      
      // Check for existing routine with same fingerprint (curated or generated)
      const existingRoutines = await WorkoutStorage.loadRoutines();
      let fingerprint: string | undefined;
      
      if (isCurated && curatedSlug) {
        fingerprint = `curated:${curatedSlug}`;
      } else if (importedProgram.fingerprint) {
        fingerprint = importedProgram.fingerprint;
      }
      
      if (fingerprint) {
        const existingRoutine = existingRoutines.find(r => r.fingerprint === fingerprint);
        
        if (existingRoutine) {
          console.log(`🔍 Found existing program with fingerprint ${fingerprint}: ${existingRoutine.name}`);
          // TODO: Navigate to existing routine and show toast
          // For now, call the import complete callback with the existing routine's data
          if (onImportComplete && existingRoutine.data) {
            onImportComplete(existingRoutine.data);
          }
          return existingRoutine;
        }
      }

      // Create the routine (always without mesocycleNumber for unified imports)
      const newRoutineId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newRoutine: WorkoutRoutine = {
        id: newRoutineId,
        name: metadata.currentDisplayName || importedProgram.routine_name,
        days: metadata.originalDaysPerWeek || importedProgram.days_per_week || 5,
        blocks: importedProgram.blocks?.length || 0,
        data: importedProgram,
        programId: program?.id,
        fingerprint: isCurated && curatedSlug ? `curated:${curatedSlug}` : undefined
        // NO mesocycleNumber - this ensures unified handling in BlocksScreen
      };
      
      
      // Save the routine
      const allRoutines = await WorkoutStorage.loadRoutines();
      allRoutines.push(newRoutine);
      await WorkoutStorage.saveRoutines(allRoutines);
      
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

  // 6. restoreCompleteStateForUnified (verbatim copy)
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

  // 7. handleLegacyMesocycleImport (verbatim copy)
  const handleLegacyMesocycleImport = async (importedProgram: WorkoutProgram, metadata: any) => {
    // For now, just log that we're using legacy import
    console.log('⚠️ Using legacy import - consider re-exporting with new format');
    
    // Insert the old complex logic here if needed, but for now let's keep it simple
    return null; // Will implement legacy fallback if needed
  };

  // 8. checkMesocycleCompletion (verbatim copy)
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

  // 9. handleAppendBlocks (verbatim copy)
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
        ]).start(async () => {
          setShowConfirmation(false);
          modalScale.setValue(0);
          modalOpacity.setValue(0);
          successScale.setValue(0);
          
          // Clear the cold-launch banner flag — append succeeded
          await WorkoutStorage.setAwaitingImport(false);
          
          // Notify completion with target workout ID
          if (options.onAppendComplete) {
            options.onAppendComplete(targetWorkoutId);
          }
        });
      }, 500);

    } catch (error) {
      console.error('Error appending blocks:', error);
      Alert.alert('Error', 'Failed to append blocks to workout');
    }
  };

  // 10. loadQuestionnaireData (verbatim copy)
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

  // 11. loadMesocycleContext (verbatim copy)
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

  // 12. getDurationWeeks (verbatim copy)
  const getDurationWeeks = (duration: string): number => {
    switch (duration) {
      case '6_months': return 26;
      case '1_year': return 52;
      case 'custom': return 52; // Default fallback
      default: return 12;
    }
  };

  // 13. calculateDefaultBlocks (verbatim copy)
  const calculateDefaultBlocks = (duration: string): number => {
    switch (duration) {
      case '6_months': return 2;
      case '1_year': return 3;
      case 'custom': return 3;
      default: return 2;
    }
  };

  // 14. processWorkoutData (verbatim copy)
  /**
   * ⚠️ THIS FUNCTION MISREPORTS COMPLETION.
   *
   * It is `async`, and it is exposed as `importFromText`, so callers reasonably write
   * `await importFromText(json)` and assume the import has been processed. It has not.
   * Every piece of real work — validateAndParseJSON, setParsedProgram, setShowConfirmation —
   * happens inside an unawaited `setTimeout(..., 800)` below. The returned promise resolves
   * almost immediately, ~800ms BEFORE validation has even started.
   *
   * So `await importFromText(...)` tells you nothing about whether the import succeeded,
   * failed, or ran at all. Callers must await the resulting STATE (e.g. showConfirmation /
   * errorMessage), not the call.
   *
   * The 800ms is described below as "Simulate processing time for better UX" — it is a
   * deliberate cosmetic delay, not real work being scheduled.
   *
   * This is a production API defect, not a test artefact: it silently defeats any caller
   * that sequences off the promise. It is left as-is for now (fixing it means changing the
   * contract of a 1600-line hook), but do not rediscover it the hard way — see
   * src/utils/__tests__/awaitingImportCleanup.test.ts for how tests work around it.
   */
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

  // 15. validateAndParseJSON (verbatim copy)
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
          if (line !== null) detailedError += ` (line ${line})`;
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
      // Clear awaiting_import flag on parse failure
      WorkoutStorage.setAwaitingImport(false).catch(e => 
        console.error('Failed to clear awaiting import flag on parse error:', e)
      );
      console.log('[VALIDATE] rejected: JSON parse error');
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

      // Helper function for parsing weeks range
      const parseWeeksRange = (weeks: string): { startWeek: number, endWeek: number, weekCount: number } | null => {
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
        
        // Validate parsed numbers
        if (!Number.isFinite(startWeek) || !Number.isFinite(endWeek) || 
            startWeek <= 0 || endWeek <= 0 || endWeek < startWeek) {
          return null;
        }
        
        return { startWeek, endWeek, weekCount: endWeek - startWeek + 1 };
      };

      // Validate blocks structure
      parsed.blocks.forEach((block: any, blockIndex: number) => {
        if (!block.block_name || !block.weeks) {
          throw new Error(`Block ${blockIndex + 1} is incomplete`);
        }
        
        // Validate weeks format
        const weekRange = parseWeeksRange(block.weeks);
        if (!weekRange) {
          throw new Error(`Block "${block.block_name}" has invalid weeks field "${block.weeks}" - expected a range like "1-5" or a single number`);
        }
        const { startWeek, endWeek, weekCount } = weekRange;
        const expectedWeekKeys = Array.from({ length: weekCount }, (_, i) => (i + 1).toString());
        
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
            // CHECK 1: Range validation
            if (week < startWeek || week > endWeek) {
              throw new Error(`Block "${block.block_name}" has deload_weeks ${week} outside its week range ${block.weeks}`);
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

            // CHECK 2: Weekly data completeness (only for exercises with sets_weekly)
            if (exercise.sets_weekly) {
              const missingWeeks = expectedWeekKeys.filter(weekKey => 
                !exercise.sets_weekly.hasOwnProperty(weekKey)
              );
              if (missingWeeks.length > 0) {
                throw new Error(`Block "${block.block_name}" declares ${weekCount} weeks but exercise "${exercise.exercise}" is missing sets_weekly data for week(s) ${missingWeeks.join(', ')}`);
              }
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
      console.error('🔍 [VALIDATION DEBUG] Raw validation error:', error);
      console.error('🔍 [VALIDATION DEBUG] Error message:', error.message);
      console.error('🔍 [VALIDATION DEBUG] Error stack:', error.stack);
      const detailedError = `⚠️ Validation Error:\n\n${error.message}\n\n💡 This means your JSON was parsed successfully, but the workout program structure has issues. Please check that all required fields are present and correctly formatted.`;
      
      setErrorMessage(detailedError);
      // Clear awaiting_import flag on validation failure, exactly as the JSON parse catch
      // above does. Without this the "Continue your setup" banner stays wedged on — and
      // structural validation failure is the COMMON failure mode here, because the input is
      // JSON an LLM produced: it parses fine and gets the shape wrong.
      WorkoutStorage.setAwaitingImport(false).catch(e =>
        console.error('Failed to clear awaiting import flag on validation error:', e)
      );
      console.log('[VALIDATE] rejected: structural validation error -', error.message);
      return null;
    }
  };

  // 16. mergePrograms (verbatim copy)
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

  // 17. validateMuscles (verbatim copy)
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

  // 18. validateStrengthExercise (verbatim copy)
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

  // 19. validateCardioExercise (verbatim copy)
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

  // 20. validateStretchExercise (verbatim copy)
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

  // 21. validateCircuitExercise (verbatim copy)
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

  // 22. validateSportExercise (verbatim copy)
  const validateSportExercise = (exercise: any, dayName: string) => {
    if (!exercise.activity || typeof exercise.activity !== 'string') {
      throw new Error(`Sport exercise in "${dayName}" missing activity name`);
    }
    if (exercise.duration_minutes && (typeof exercise.duration_minutes !== 'number' || exercise.duration_minutes <= 0)) {
      throw new Error(`Sport "${exercise.activity}" has invalid duration_minutes`);
    }
  };

  // === API Implementation Functions (orchestration layer) ===

  // 23. handlePasteAndImport (verbatim copy)
  const handlePasteAndImport = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text) {
      Alert.alert('Clipboard Empty', 'Copy your workout program first', [{ text: 'OK' }]);
      return;
    }

    processWorkoutData(text);
  };

  // 24. handleFileUpload (verbatim copy)
  // This is the user-initiated picker only. The INBOUND file path (share sheet / Open-with,
  // where the OS hands us a file:// or content:// URI) lives in ImportRoutineScreen.tsx —
  // see its "KEEP IN SYNC: inbound file import" effect. Changes to file-read behaviour here
  // likely need to be mirrored there.
  //
  // Note the inbound effects there carry a one-shot ref latch. That is REQUIRED, not
  // defensive: processWorkoutData resolves ~800ms before validation runs (see its warning),
  // so an effect guarded only on !isLoading && !parsedProgram reopens after every validation
  // failure and re-imports forever. This picker path is safe only because it is user-driven
  // rather than effect-driven. Any new auto-import effect needs the same latch.
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

  // 25. handleConfirmImport (verbatim copy)
  const handleConfirmImport = async () => {
    if (parsedProgram) {
      try {
        // Check if this is append-block mode
        if (options.mode === 'append' && options.targetWorkoutId) {
          await handleAppendBlocks(parsedProgram, options.targetWorkoutId);
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
            
            // Clear the cold-launch banner flag — import succeeded
            await WorkoutStorage.setAwaitingImport(false);
            
            // Navigate via callback (mechanical edit: navigation -> callback)
            if (options.onImportComplete) {
              options.onImportComplete(parsedProgram);
            }
          });
        }, 500);
      } catch (error) {
        console.error('Error during import:', error);
        Alert.alert('Import Error', 'There was an error associating this import with your program. The import will continue normally.');
        
        // Clear the cold-launch banner flag — import still proceeded to Home
        WorkoutStorage.setAwaitingImport(false).catch(() => {});
        
        // Continue with normal import flow via callback (mechanical edit: navigation -> callback)
        if (options.onImportComplete) {
          options.onImportComplete(parsedProgram);
        }
      }
    }
  };

  // 26. handleModalCancel (verbatim copy with mechanical edit)
  const handleModalCancel = async () => {
    // Clear awaiting_import flag on cancel to prevent stuck banner
    try {
      await WorkoutStorage.setAwaitingImport(false);
    } catch (error) {
      console.error('Failed to clear awaiting import flag on cancel:', error);
    }
    
    // If this was from a shared import (shareId or prefilledJson), navigate back to home instead of staying here
    if (prefilledJson || shareId) {
      setPrefilledCancelled(true);
      // For hook usage, we'll just reset the modal instead of navigation
      setShowConfirmation(false);
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

  // 27. handleAddMoreFiles (verbatim copy)
  const handleAddMoreFiles = () => {
    setShowAddMoreMode(true);
  };

  // 28. handleBackToConfirmation (verbatim copy)
  const handleBackToConfirmation = () => {
    setShowAddMoreMode(false);
  };

  return {
    parsedProgram,
    accumulatedPrograms,
    showConfirmation,
    showAddMoreMode,
    isLoading,
    errorMessage,
    generationTime,
    modalScale,
    modalOpacity,
    successScale,
    importFromClipboard: handlePasteAndImport,
    importFromText: processWorkoutData,
    importFromFile: handleFileUpload,
    confirmImport: handleConfirmImport,
    cancelConfirmation: handleModalCancel,
    addMoreFiles: handleAddMoreFiles,
    backToConfirmation: handleBackToConfirmation,
  };
};