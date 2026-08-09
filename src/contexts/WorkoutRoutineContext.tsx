import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutRoutine } from '../utils/storage';
import RobustStorage from '../utils/robustStorage';

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

export const WorkoutRoutineProvider = ({ children }: WorkoutRoutineProviderProps) => {
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

  // Some screens sanitize the block name before using it in a key
  // (DaysScreen does `replace(/[^a-zA-Z0-9]/g, '_')`), so a sweep has to look for
  // both spellings.
  const sanitizeBlockName = (name: string): string => name.replace(/[^a-zA-Z0-9]/g, '_');

  /**
   * Removing a routine used to leave every per-block key behind: completed_*,
   * completionStats_*, currentWeek_*, bookmark_*, manual_days_*,
   * day_customization_*, workout_*_sets, workout_*_exercises, plus the
   * RobustStorage shadows of each (_backup1, _backup2, _meta, _emergency_*).
   * Re-adding the same program then inherited the old progress.
   *
   * The sweep is by BLOCK NAME because that is what every one of those keys is
   * built from — none of them carry the routine id. Block names are NOT unique
   * across routines (all three bundled sample plans use "Block 1 — Foundation"),
   * so purging blindly would wipe a different program's history. Only names that
   * no REMAINING routine still uses are purged; a shared name is left alone.
   */
  const purgeBlockStorage = async (
    deleted: WorkoutRoutine | undefined,
    remaining: WorkoutRoutine[],
  ): Promise<void> => {
    console.log('🧹 WorkoutContext: purgeBlockStorage v2 running', {
      deleted: (deleted as any)?.name,
      blocksOnDeleted: ((deleted as any)?.data?.blocks || []).length,
      remainingRoutines: remaining.length,
    });

    if (!deleted) {
      console.log('🧹 WorkoutContext: nothing to purge — no deleted routine captured');
      return;
    }

    const namesOf = (routine: any): string[] =>
      (routine?.data?.blocks || [])
        .map((block: any) => block?.block_name)
        .filter((name: any): name is string => typeof name === 'string' && name.length >= 3);

    const stillUsed = new Set<string>();
    remaining.forEach(routine => namesOf(routine).forEach(name => stillUsed.add(name)));

    const purgeable = Array.from(new Set(namesOf(deleted))).filter(name => !stillUsed.has(name));

    if (purgeable.length === 0) {
      console.log('🧹 WorkoutContext: no block names to purge (shared with a remaining routine, or none found)');
      return;
    }

    const needles: string[] = [];
    purgeable.forEach(name => {
      needles.push(name);
      const sanitized = sanitizeBlockName(name);
      if (sanitized !== name) needles.push(sanitized);
    });

    const allKeys = await AsyncStorage.getAllKeys();
    const doomed = allKeys.filter(key => needles.some(needle => key.includes(needle)));

    console.log(`🧹 WorkoutContext: ${doomed.length} keys match block(s): ${purgeable.join(', ')}`);

    if (doomed.length === 0) {
      console.log('🧹 WorkoutContext: no matching keys found — nothing removed');
      return;
    }

    // Completion primaries go through RobustStorage so it lays its tombstone and
    // clears its own cross-session copies; a raw removeItem here would let the
    // recovery layer resurrect them on the next read.
    const primaries = doomed.filter(key =>
      (key.startsWith('completed_') || key.startsWith('workout_completion_')) &&
      !/_backup1$|_backup2$|_meta$|_emergency_/.test(key)
    );

    for (const key of primaries) {
      try {
        await RobustStorage.removeItem(key, true, true);
      } catch (error) {
        console.warn(`🧹 WorkoutContext: RobustStorage could not remove "${key}"`, error);
      }
    }

    const leftovers = (await AsyncStorage.getAllKeys()).filter(key =>
      needles.some(needle => key.includes(needle))
    );

    if (leftovers.length > 0) {
      await AsyncStorage.multiRemove(leftovers);
    }

    console.log(
      `🧹 WorkoutContext: purged ${doomed.length} keys for block(s): ${purgeable.join(', ')}`
    );
  };

  const deleteRoutine = async (routineId: string): Promise<void> => {
    try {
      const removed = state.routines.find(r => r.id === routineId);
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

      // Deliberately AFTER the routine list is saved and state is updated: the
      // routine is gone from the user's point of view either way, so a failure
      // in the cleanup must never make the delete itself look broken.
      try {
        await purgeBlockStorage(removed, updatedRoutines);
      } catch (purgeError) {
        console.warn('🧹 WorkoutContext: block storage purge failed (routine still deleted):', purgeError);
      }
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