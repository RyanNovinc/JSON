import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutRoutine } from '../utils/storage';

// =============================================================================
// WORKOUT ROUTINE CONTEXT - Based on SimplifiedMealPlanningContext Pattern
// =============================================================================

interface WorkoutRoutineContextType {
  // State
  routines: WorkoutRoutine[];
  isLoading: boolean;
  
  // Core operations
  loadRoutines: () => Promise<void>;
  saveRoutine: (routine: WorkoutRoutine) => Promise<void>;
  deleteRoutine: (routineId: string) => Promise<void>;
  updateRoutine: (routine: WorkoutRoutine) => Promise<void>;
}

const WorkoutRoutineContext = createContext<WorkoutRoutineContextType | undefined>(undefined);

// Storage keys - using simple AsyncStorage like nutrition screen
const STORAGE_KEYS = {
  ROUTINES: 'workout_routines_simple',
  BACKUP: 'workout_routines_simple_backup'
};

interface WorkoutRoutineProviderProps {
  children: ReactNode;
}

export const WorkoutRoutineProvider: React.FC<WorkoutRoutineProviderProps> = ({ children }) => {
  const [state, setState] = useState({
    routines: [] as WorkoutRoutine[],
    isLoading: true,
  });

  // =============================================================================
  // CORE DATA OPERATIONS - Simple and Reliable (copied from nutrition pattern)
  // =============================================================================

  const loadRoutines = async (): Promise<void> => {
    try {
      console.log('📥 WorkoutContext: Loading routines...');
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Try primary storage first
      const storedRoutines = await AsyncStorage.getItem(STORAGE_KEYS.ROUTINES);
      
      let routines: WorkoutRoutine[] = [];
      
      if (storedRoutines) {
        routines = JSON.parse(storedRoutines) as WorkoutRoutine[];
        console.log(`✅ WorkoutContext: Loaded ${routines.length} routines`);
      } else {
        // Migration: check for data in old RobustStorage system
        console.log('🔄 WorkoutContext: No simple storage found, checking old system...');
        try {
          const { WorkoutStorage } = await import('../utils/storage');
          const oldRoutines = await WorkoutStorage.loadRoutines();
          if (oldRoutines.length > 0) {
            routines = oldRoutines;
            // Save in new simple format
            await AsyncStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(routines));
            await AsyncStorage.setItem(STORAGE_KEYS.BACKUP, JSON.stringify(routines));
            console.log(`🔄 WorkoutContext: Migrated ${routines.length} routines from old system`);
          }
        } catch (migrationError) {
          console.warn('⚠️ WorkoutContext: Migration from old system failed:', migrationError);
        }
      }
      
      setState(prev => ({ 
        ...prev, 
        routines,
        isLoading: false 
      }));
      
      console.log(`✅ WorkoutContext: Final routine count: ${routines.length}`);
      
    } catch (error) {
      console.error('❌ WorkoutContext: Failed to load routines:', error);
      setState(prev => ({ 
        ...prev, 
        routines: [],
        isLoading: false 
      }));
    }
  };

  const saveRoutine = async (routine: WorkoutRoutine): Promise<void> => {
    try {
      console.log(`💾 WorkoutContext: Saving routine "${routine.name}"...`);
      
      // Update or add routine to the list
      let updatedRoutines = [...state.routines];
      const existingIndex = updatedRoutines.findIndex(r => r.id === routine.id);
      
      if (existingIndex >= 0) {
        updatedRoutines[existingIndex] = routine;
        console.log('✅ WorkoutContext: Updated existing routine');
      } else {
        updatedRoutines.push(routine);
        console.log('✅ WorkoutContext: Added new routine');
      }
      
      // Save to both primary and backup (simple redundancy)
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(updatedRoutines)),
        AsyncStorage.setItem(STORAGE_KEYS.BACKUP, JSON.stringify(updatedRoutines))
      ]);
      
      setState(prev => ({ 
        ...prev, 
        routines: updatedRoutines
      }));
      
      console.log('✅ WorkoutContext: Routine saved successfully');
    } catch (error) {
      console.error('❌ WorkoutContext: Failed to save routine:', error);
      throw error;
    }
  };

  const updateRoutine = async (routine: WorkoutRoutine): Promise<void> => {
    await saveRoutine(routine); // Same operation
  };

  const deleteRoutine = async (routineId: string): Promise<void> => {
    try {
      const updatedRoutines = state.routines.filter(r => r.id !== routineId);
      
      // Save updated routines
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(updatedRoutines)),
        AsyncStorage.setItem(STORAGE_KEYS.BACKUP, JSON.stringify(updatedRoutines))
      ]);
      
      setState(prev => ({ 
        ...prev, 
        routines: updatedRoutines
      }));
      
      console.log(`✅ WorkoutContext: Deleted routine "${routineId}"`);
    } catch (error) {
      console.error('❌ WorkoutContext: Failed to delete routine:', error);
    }
  };

  // Load routines on mount
  useEffect(() => {
    loadRoutines();
  }, []);

  const contextValue: WorkoutRoutineContextType = {
    routines: state.routines,
    isLoading: state.isLoading,
    loadRoutines,
    saveRoutine,
    deleteRoutine,
    updateRoutine,
  };

  return (
    <WorkoutRoutineContext.Provider value={contextValue}>
      {children}
    </WorkoutRoutineContext.Provider>
  );
};

// Hook for consuming the context
export const useWorkoutRoutines = (): WorkoutRoutineContextType => {
  const context = useContext(WorkoutRoutineContext);
  if (!context) {
    throw new Error('useWorkoutRoutines must be used within a WorkoutRoutineProvider');
  }
  return context;
};