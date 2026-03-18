import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// SIMPLE TIMER CONTEXT - Clean, straightforward timer management
// =============================================================================

export interface SimpleTimer {
  id: string;           // Unique timer ID  
  name: string;         // Display name (e.g., "Rest Timer", "Exercise Timer")
  currentTime: number;  // Current time in seconds
  isRunning: boolean;   // Is timer actively running
  isCountUp: boolean;   // true = countup (0,1,2...), false = countdown (120,119,118...)
  startValue: number;   // Starting value (0 for countup, target for countdown)
  isQuickMode: boolean; // true = quick timer, false = optimal timer
}

interface SimpleTimerContextType {
  timer: SimpleTimer | null;
  isMinimized: boolean;
  
  // Core operations - simple and clear
  startTimer: (config: { name: string; isCountUp: boolean; startValue: number; isQuickMode?: boolean; autoStart?: boolean }) => void;
  stopTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  adjustTime: (seconds: number) => void; // +15, -15, etc.
  clearTimer: () => void;
  
  // Timer mode toggles
  toggleQuickMode: () => void;
  toggleCountMode: () => void;
  
  // UI state
  setMinimized: (minimized: boolean) => void;
}

const SimpleTimerContext = createContext<SimpleTimerContextType | undefined>(undefined);

const STORAGE_KEY = 'simple_timer_state';

interface SimpleTimerProviderProps {
  children: ReactNode;
}

export const SimpleTimerProvider: React.FC<SimpleTimerProviderProps> = ({ children }) => {
  const [timer, setTimer] = useState<SimpleTimer | null>(null);
  const [isMinimized, setIsMinimized] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // =============================================================================
  // PERSISTENCE - Save/load timer state
  // =============================================================================
  
  const saveTimerState = async (timerState: SimpleTimer | null, minimized: boolean) => {
    try {
      const state = { timer: timerState, isMinimized: minimized };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save timer state:', error);
    }
  };

  const loadTimerState = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        if (state.timer) {
          setTimer(state.timer);
          setIsMinimized(state.isMinimized ?? true);
          
          // Resume background timer if it was running
          if (state.timer.isRunning) {
            startBackgroundTimer();
          }
        }
      }
    } catch (error) {
      console.error('Failed to load timer state:', error);
    }
  };

  // =============================================================================
  // BACKGROUND TIMER - Simple setInterval that updates currentTime
  // =============================================================================
  
  const startBackgroundTimer = () => {
    stopBackgroundTimer(); // Clear any existing timer
    
    intervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (!prev || !prev.isRunning) return prev;
        
        const newTime = prev.isCountUp 
          ? prev.currentTime + 1 
          : Math.max(0, prev.currentTime - 1);
        
        const updatedTimer = { ...prev, currentTime: newTime };
        
        // Auto-save state
        saveTimerState(updatedTimer, isMinimized);
        
        return updatedTimer;
      });
    }, 1000);
  };

  const stopBackgroundTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // =============================================================================
  // TIMER OPERATIONS - Clean, simple functions
  // =============================================================================

  const startTimer = (config: { name: string; isCountUp: boolean; startValue: number; isQuickMode?: boolean; autoStart?: boolean }) => {
    const shouldAutoStart = config.autoStart !== false; // Default to true unless explicitly false
    const newTimer: SimpleTimer = {
      id: Date.now().toString(),
      name: config.name,
      currentTime: config.isCountUp ? 0 : config.startValue, // Count up starts at 0, countdown starts at startValue
      isRunning: shouldAutoStart,
      isCountUp: config.isCountUp,
      startValue: config.startValue,
      isQuickMode: config.isQuickMode || false,
    };
    
    setTimer(newTimer);
    saveTimerState(newTimer, isMinimized);
    if (shouldAutoStart) {
      startBackgroundTimer();
    }
  };

  const stopTimer = () => {
    setTimer(null);
    saveTimerState(null, isMinimized);
    stopBackgroundTimer();
  };

  const pauseTimer = () => {
    if (!timer) return;
    
    const pausedTimer = { ...timer, isRunning: false };
    setTimer(pausedTimer);
    saveTimerState(pausedTimer, isMinimized);
    stopBackgroundTimer();
  };

  const resumeTimer = () => {
    if (!timer) return;
    
    const runningTimer = { ...timer, isRunning: true };
    setTimer(runningTimer);
    saveTimerState(runningTimer, isMinimized);
    startBackgroundTimer();
  };

  const adjustTime = (seconds: number) => {
    if (!timer) return;
    
    const newTime = timer.isCountUp
      ? Math.max(0, timer.currentTime + seconds)
      : Math.max(0, timer.currentTime + seconds);
    
    const adjustedTimer = { ...timer, currentTime: newTime };
    setTimer(adjustedTimer);
    saveTimerState(adjustedTimer, isMinimized);
  };

  const clearTimer = () => {
    stopTimer();
  };

  const setMinimized = (minimized: boolean) => {
    setIsMinimized(minimized);
    saveTimerState(timer, minimized);
  };

  const toggleQuickMode = () => {
    if (!timer) return;
    
    const newIsQuickMode = !timer.isQuickMode;
    const updatedTimer = { 
      ...timer, 
      isQuickMode: newIsQuickMode,
      isRunning: false // Pause timer when switching modes
    };
    
    // Recalculate timer duration based on mode (only for rest timers)
    if (timer.name === 'Rest Timer') {
      const currentOptimalTime = !timer.isCountUp ? timer.startValue : 120; // Default to 120s if counting up
      const newStartValue = newIsQuickMode 
        ? Math.max(30, Math.floor(currentOptimalTime * 0.5)) // Quick = 50% of optimal, min 30s
        : currentOptimalTime; // Keep optimal time
      
      updatedTimer.startValue = newStartValue;
      updatedTimer.currentTime = updatedTimer.isCountUp ? 0 : newStartValue; // Count up starts at 0, countdown at startValue
    }
    
    setTimer(updatedTimer);
    saveTimerState(updatedTimer, isMinimized);
    stopBackgroundTimer(); // Stop the background timer
  };

  const toggleCountMode = () => {
    if (!timer) return;
    
    const newIsCountUp = !timer.isCountUp;
    const updatedTimer = { 
      ...timer, 
      isCountUp: newIsCountUp,
      isRunning: false // Pause timer when switching modes
    };
    // Reset timer: count up starts at 0, countdown starts at startValue
    updatedTimer.currentTime = newIsCountUp ? 0 : timer.startValue;
    setTimer(updatedTimer);
    saveTimerState(updatedTimer, isMinimized);
    stopBackgroundTimer(); // Stop the background timer
  };

  // =============================================================================
  // INITIALIZATION - Load saved state on mount
  // =============================================================================

  useEffect(() => {
    loadTimerState();
    
    // Cleanup on unmount
    return () => stopBackgroundTimer();
  }, []);

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const contextValue: SimpleTimerContextType = {
    timer,
    isMinimized,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    adjustTime,
    clearTimer,
    toggleQuickMode,
    toggleCountMode,
    setMinimized,
  };

  return (
    <SimpleTimerContext.Provider value={contextValue}>
      {children}
    </SimpleTimerContext.Provider>
  );
};

export const useSimpleTimer = (): SimpleTimerContextType => {
  const context = useContext(SimpleTimerContext);
  if (!context) {
    throw new Error('useSimpleTimer must be used within a SimpleTimerProvider');
  }
  return context;
};