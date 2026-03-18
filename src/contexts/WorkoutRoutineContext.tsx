import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutRoutine } from '../utils/storage';

// =============================================================================
// WORKOUT ROUTINE CONTEXT - Based on SimplifiedMealPlanningContext Pattern
// =============================================================================

// Timer interface for background timer persistence
export interface GlobalTimer {
  exerciseIndex: number;
  setIndex: number;
  isRunning: boolean;
  isQuickMode: boolean;
  completed: boolean;
  startTime: Date;
  // Countdown mode fields
  countdownTimeLeft?: number;
  countdownDuration?: number;
  // Countup mode fields  
  countupElapsed?: number;
  // Background countdown when in countup mode
  backgroundCountdownTime?: number;
  backgroundCountdownRunning?: boolean;
}

interface WorkoutRoutineContextType {
  // State
  routines: WorkoutRoutine[];
  isLoading: boolean;
  
  // Global timer state
  globalTimer: GlobalTimer | null;
  timerMinimized: boolean;
  
  // Core operations
  loadRoutines: () => Promise<void>;
  saveRoutine: (routine: WorkoutRoutine) => Promise<void>;
  deleteRoutine: (routineId: string) => Promise<void>;
  updateRoutine: (routine: WorkoutRoutine) => Promise<void>;
  
  // Timer operations
  setGlobalTimer: (timer: GlobalTimer | null) => void;
  setTimerMinimized: (minimized: boolean) => void;
  updateTimerState: (updater: (timer: GlobalTimer | null) => GlobalTimer | null) => void;
}

const WorkoutRoutineContext = createContext<WorkoutRoutineContextType | undefined>(undefined);

// Storage keys - using simple AsyncStorage like nutrition screen
const STORAGE_KEYS = {
  ROUTINES: 'workout_routines_simple',
  BACKUP: 'workout_routines_simple_backup',
  GLOBAL_TIMER: 'global_timer_state'
};

interface WorkoutRoutineProviderProps {
  children: ReactNode;
}

export const WorkoutRoutineProvider: React.FC<WorkoutRoutineProviderProps> = ({ children }) => {
  const [state, setState] = useState({
    routines: [] as WorkoutRoutine[],
    isLoading: true,
    globalTimer: null as GlobalTimer | null,
    timerMinimized: true,
  });
  
  // Background timer interval ref
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      
      // Load timer state
      const savedTimerState = await AsyncStorage.getItem(STORAGE_KEYS.GLOBAL_TIMER);
      let globalTimer: GlobalTimer | null = null;
      let timerMinimized = true;
      
      if (savedTimerState) {
        try {
          const parsed = JSON.parse(savedTimerState);
          if (parsed.timer) {
            globalTimer = {
              ...parsed.timer,
              startTime: new Date(parsed.timer.startTime)
            };
            timerMinimized = parsed.timerMinimized ?? true;
            console.log('✅ WorkoutContext: Restored global timer state');
          }
        } catch (error) {
          console.warn('⚠️ WorkoutContext: Failed to parse timer state:', error);
        }
      }
      
      setState(prev => ({ 
        ...prev, 
        routines,
        globalTimer,
        timerMinimized,
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

  // =============================================================================
  // GLOBAL TIMER OPERATIONS
  // =============================================================================

  const saveTimerState = async (timer: GlobalTimer | null, minimized: boolean) => {
    try {
      const timerData = {
        timer: timer ? {
          ...timer,
          startTime: timer.startTime.toISOString()
        } : null,
        timerMinimized: minimized
      };
      await AsyncStorage.setItem(STORAGE_KEYS.GLOBAL_TIMER, JSON.stringify(timerData));
    } catch (error) {
      console.error('❌ WorkoutContext: Failed to save timer state:', error);
    }
  };

  const setGlobalTimer = (timer: GlobalTimer | null) => {
    setState(prev => ({ ...prev, globalTimer: timer }));
    saveTimerState(timer, state.timerMinimized);
    
    // Manage background timer interval
    if (timer?.isRunning) {
      startBackgroundTimer();
    } else {
      stopBackgroundTimer();
    }
  };

  const setTimerMinimized = (minimized: boolean) => {
    setState(prev => ({ ...prev, timerMinimized: minimized }));
    saveTimerState(state.globalTimer, minimized);
  };

  const updateTimerState = (updater: (timer: GlobalTimer | null) => GlobalTimer | null) => {
    setState(prev => {
      const newTimer = updater(prev.globalTimer);
      // Save immediately
      saveTimerState(newTimer, prev.timerMinimized);
      
      // Manage background timer
      if (newTimer?.isRunning) {
        startBackgroundTimer();
      } else {
        stopBackgroundTimer();
      }
      
      return { ...prev, globalTimer: newTimer };
    });
  };

  const startBackgroundTimer = () => {
    stopBackgroundTimer(); // Clear any existing timer
    
    timerIntervalRef.current = setInterval(() => {
      setState(prev => {
        if (!prev.globalTimer?.isRunning) return prev;
        
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - prev.globalTimer.startTime.getTime()) / 1000);
        
        let updatedTimer = { ...prev.globalTimer };
        
        // Update based on timer mode
        if (updatedTimer.countdownTimeLeft !== undefined) {
          // Countdown mode
          const remaining = updatedTimer.countdownDuration! - elapsedSeconds;
          updatedTimer.countdownTimeLeft = Math.max(0, remaining);
          
          if (remaining <= 0) {
            updatedTimer.completed = true;
            updatedTimer.isRunning = false;
          }
        }
        
        if (updatedTimer.countupElapsed !== undefined) {
          // Count up mode
          updatedTimer.countupElapsed = elapsedSeconds;
        }
        
        // Background countdown in count up mode
        if (updatedTimer.backgroundCountdownRunning && updatedTimer.backgroundCountdownTime !== undefined) {
          const backgroundRemaining = updatedTimer.backgroundCountdownTime - elapsedSeconds;
          if (backgroundRemaining <= 0) {
            updatedTimer.backgroundCountdownRunning = false;
          }
        }
        
        // Save updated state
        saveTimerState(updatedTimer, prev.timerMinimized);
        
        return { ...prev, globalTimer: updatedTimer };
      });
    }, 1000);
  };

  const stopBackgroundTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Start background timer if there's an active timer on mount
  useEffect(() => {
    if (state.globalTimer?.isRunning) {
      startBackgroundTimer();
    }
    
    // Cleanup on unmount
    return () => stopBackgroundTimer();
  }, [state.globalTimer?.isRunning]);

  // Load routines on mount
  useEffect(() => {
    loadRoutines();
  }, []);

  const contextValue: WorkoutRoutineContextType = {
    routines: state.routines,
    isLoading: state.isLoading,
    globalTimer: state.globalTimer,
    timerMinimized: state.timerMinimized,
    loadRoutines,
    saveRoutine,
    deleteRoutine,
    updateRoutine,
    setGlobalTimer,
    setTimerMinimized,
    updateTimerState,
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