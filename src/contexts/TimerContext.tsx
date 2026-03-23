import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

import { startActivity, updateActivity, stopActivity } from 'expo-live-activity';
import { DebugLogger } from '../components/DebugOverlay';

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  timeElapsed: number; // seconds elapsed
  targetTime: number; // target time in seconds (for countdown mode)
  startTime: Date | null;
  pausedAt: Date | null;
  isCountUp: boolean;
  isQuickMode: boolean;
  exerciseIndex?: number;
  setIndex?: number;
  countdownSoundPlayed?: boolean; // Track if countdown sound has been played
  liveActivityId?: string; // Track native Live Activity ID
  themeColor?: string; // Theme color for Live Activity
  fixedEndTime?: number; // Fixed end timestamp to prevent Live Activity jumping
  lastSentRemaining?: number; // Track last remaining seconds sent to Live Activity to avoid excessive updates
}

interface ExerciseContext {
  currentExercise?: string;
  nextExercise?: string;
  currentSet?: number;
  totalSets?: number;
  weight?: string;
  reps?: string;
}

export interface TimerSettings {
  countUp: boolean;
  quickMode: boolean;
}


interface TimerContextType {
  // Timer state
  timer: TimerState | null;
  isMinimized: boolean;
  
  // Settings
  timerSettings: TimerSettings;
  setTimerSettings: (settings: TimerSettings) => void;
  
  // Timer controls
  startTimer: (targetSeconds?: number, exerciseIndex?: number, setIndex?: number, themeColor?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => Promise<void>;
  resetTimer: () => Promise<void>;
  addTime: (seconds: number) => void;
  subtractTime: (seconds: number) => void;
  
  // UI controls
  showModal: () => void;
  hideModal: () => void;
  minimize: () => void;
  
  // Auto-timer for set completion
  startAutoTimer: (restTime: number, quickRestTime: number, exerciseIndex: number, setIndex: number, themeColor?: string) => void;
  
  // Exercise context for Live Activities
  setExerciseContext: (getContext: ((exerciseIndex?: number, setIndex?: number) => ExerciseContext) | null) => void;
  
  // Test function for audio
  testAudio: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const STORAGE_KEY = '@timer_state';
const SETTINGS_KEY = '@timer_settings';

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [isMinimized, setIsMinimized] = useState(true);
  const [timerSettings, setTimerSettingsState] = useState<TimerSettings>({
    countUp: false,
    quickMode: false,
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const soundRef = useRef<Audio.Sound | null>(null);
  const getExerciseContextRef = useRef<((exerciseIndex?: number, setIndex?: number) => ExerciseContext) | null>(null);
  const backgroundLiveActivityId = useRef<string | null>(null); // Store Live Activity ID when going to background
  const prevTimerRef = useRef<TimerState | null>(null); // Track previous timer state to avoid excessive Live Activity updates

  // Load persisted state on mount
  useEffect(() => {
    loadPersistedState();
    loadSettings();
    loadCountdownSound();
  }, []);

  // Load countdown sound
  const loadCountdownSound = async () => {
    try {
      console.log('Loading countdown sound...');
      
      // Set audio mode first
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
      });

      // Load the sound with proper initial settings
      const { sound } = await Audio.Sound.createAsync(
        require('../../json_fit_timer_v3.wav'),
        { 
          shouldPlay: false,
          isLooping: false,
          volume: 1.0,
        }
      );
      
      soundRef.current = sound;
      console.log('Countdown sound loaded successfully');
      
      // Test play to ensure it's working (optional)
      // await sound.setPositionAsync(0);
      
    } catch (error) {
      console.error('Failed to load countdown sound:', error);
    }
  };

  // Handle app state changes for background persistence
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Start/stop interval based on timer state
  useEffect(() => {
    if (timer?.isRunning && !timer.isPaused) {
      startInterval();
    } else {
      stopInterval();
    }
    
    return () => stopInterval();
  }, [timer?.isRunning, timer?.isPaused]);

  // Persist state changes
  useEffect(() => {
    if (timer) {
      persistState();
    }
  }, [timer]);

  // Sync Live Activity only for significant timer state changes (not every second)
  useEffect(() => {
    // Only sync for significant changes, not every timeElapsed update
    const shouldSync = !timer || // Timer cleared
                      !prevTimerRef.current || // First timer
                      timer.isRunning !== prevTimerRef.current.isRunning || // Start/stop
                      timer.isPaused !== prevTimerRef.current.isPaused || // Pause/resume
                      timer.targetTime !== prevTimerRef.current.targetTime || // Time adjusted
                      !timer.liveActivityId; // No Live Activity exists
                      
    if (shouldSync) {
      DebugLogger.log(`🔄 Syncing Live Activity for significant change: running=${timer?.isRunning}, paused=${timer?.isPaused}, hasId=${!!timer?.liveActivityId}`);
      syncLiveActivity();
    } else {
      DebugLogger.log(`⏭️ Skipping Live Activity sync - only timeElapsed changed`);
    }
    
    // Store previous timer state for comparison
    prevTimerRef.current = timer;
  }, [timer]);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const loadPersistedState = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.startTime) {
          parsed.startTime = new Date(parsed.startTime);
        }
        if (parsed.pausedAt) {
          parsed.pausedAt = new Date(parsed.pausedAt);
        }
        
        // If timer was running, calculate elapsed time from background
        if (parsed.isRunning && !parsed.isPaused && parsed.startTime) {
          const now = new Date();
          const backgroundElapsed = Math.floor((now.getTime() - new Date(parsed.startTime).getTime()) / 1000);
          parsed.timeElapsed = backgroundElapsed;
        }
        
        setTimer(parsed);
      }
    } catch (error) {
      console.error('Error loading timer state:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) {
        setTimerSettingsState(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading timer settings:', error);
    }
  };

  const persistState = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
    } catch (error) {
      console.error('Error persisting timer state:', error);
    }
  };

  const setTimerSettings = async (settings: TimerSettings) => {
    setTimerSettingsState(settings);
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving timer settings:', error);
    }
  };

  const handleAppStateChange = (nextAppState: string) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground, update timer if running
      if (timer?.isRunning && !timer.isPaused && timer.startTime) {
        DebugLogger.log(`📱 App activated - refreshing Live Activity timer to sync accurate time`, 'log');
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - timer.startTime.getTime()) / 1000);
        setTimer(prev => prev ? { 
          ...prev, 
          timeElapsed: elapsed,
          // Force Live Activity refresh by clearing lastSentRemaining
          lastSentRemaining: undefined 
        } : null);
      }
    }
    appStateRef.current = nextAppState;
  };

  const playCountdownSound = async () => {
    try {
      console.log('Attempting to play countdown sound...');
      if (soundRef.current) {
        // Get sound status to check if it's loaded
        const status = await soundRef.current.getStatusAsync();
        console.log('Sound status:', status);
        
        if (status.isLoaded) {
          // Stop and reset position first
          await soundRef.current.stopAsync();
          await soundRef.current.setPositionAsync(0);
          
          // Play the sound
          await soundRef.current.playAsync();
          console.log('Countdown sound played successfully');
        } else {
          console.warn('Sound not loaded yet');
          // Try to reload the sound
          await loadCountdownSound();
        }
      } else {
        console.warn('Sound not loaded - soundRef.current is null');
        // Try to reload the sound
        await loadCountdownSound();
      }
    } catch (error) {
      // Handle background audio session errors gracefully
      if (error.code === 'E_AV_PLAY' && error.message?.includes('audio session not activated')) {
        console.log('⚠️ Audio session not active (app in background) - skipping sound');
      } else {
        console.error('Failed to play countdown sound:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
      }
    }
  };

  const startInterval = () => {
    if (intervalRef.current) return;
    
    intervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (!prev || !prev.isRunning || prev.isPaused || !prev.startTime) return prev;
        
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - prev.startTime.getTime()) / 1000);
        
        // Check for countdown completion and sound trigger
        if (!prev.isCountUp) {
          const remaining = prev.targetTime - elapsed;
          console.log(`Countdown check: remaining=${remaining}, elapsed=${elapsed}, targetTime=${prev.targetTime}`);
          
          // Play countdown sound when hitting 3 seconds
          if (!prev.countdownSoundPlayed && remaining <= 3 && remaining > 0) {
            console.log('Triggering countdown sound!');
            playCountdownSound();
            return { ...prev, timeElapsed: elapsed, countdownSoundPlayed: true };
          }
          
          // Stop timer when countdown reaches 0
          if (remaining <= 0) {
            console.log('Countdown finished! Stopping timer.');
            
            // Keep Live Activity ID for proper cleanup by syncLiveActivity
            return { 
              ...prev, 
              timeElapsed: 0, // Reset to 0
              targetTime: 0,  // Reset to 0 so timer shows 0:00 cleanly
              isRunning: false,
              isPaused: false,
              // Don't clear liveActivityId here - let syncLiveActivity handle cleanup
            };
          }
        }
        
        return { ...prev, timeElapsed: elapsed };
      });
    }, 1000);
  };

  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startTimer = async (targetSeconds = 0, exerciseIndex?: number, setIndex?: number, themeColor?: string) => {
    // Debug logging for new timer start
    DebugLogger.log(`🚀 startTimer called: targetSeconds=${targetSeconds}, exerciseIndex=${exerciseIndex}, setIndex=${setIndex}`, 'log');
    
    // Check if there's an existing Live Activity that needs to be stopped
    if (timer?.liveActivityId) {
      DebugLogger.log(`⚠️ Found existing Live Activity ${timer.liveActivityId} - should be stopped before new timer`, 'warn');
      // Explicitly stop the old Live Activity
      try {
        await stopActivity(timer.liveActivityId, { title: 'Timer Stopped' });
        DebugLogger.log(`✅ Successfully stopped old Live Activity ${timer.liveActivityId}`, 'log');
      } catch (error) {
        DebugLogger.log(`❌ Failed to stop old Live Activity ${timer.liveActivityId}: ${error}`, 'error');
      }
    } else {
      DebugLogger.log(`✅ No existing Live Activity to stop`, 'log');
    }
    
    const now = new Date();
    const fixedEndTime = now.getTime() + (targetSeconds * 1000); // Calculate stable end time once
    const newTimer = {
      isRunning: true,
      isPaused: false,
      timeElapsed: 0,
      targetTime: targetSeconds,
      startTime: now,
      pausedAt: null,
      isCountUp: timerSettings.countUp,
      isQuickMode: timerSettings.quickMode,
      exerciseIndex,
      setIndex,
      countdownSoundPlayed: false,
      liveActivityId: undefined, // Always start fresh - syncLiveActivity will create new one
      themeColor, // Store theme color for Live Activity
      fixedEndTime, // Store stable end time to prevent Live Activity jumping
    };
    
    DebugLogger.log(`📊 New timer created: targetTime=${targetSeconds}s, countUp=${timerSettings.countUp}`, 'log');
    setTimer(newTimer);
    
  };

  const pauseTimer = () => {
    setTimer(prev => prev ? {
      ...prev,
      isRunning: false,
      isPaused: true,
      pausedAt: new Date(),
    } : null);
  };

  const resumeTimer = () => {
    setTimer(prev => {
      if (!prev || !prev.isPaused || !prev.pausedAt || !prev.startTime) return prev;
      
      // Calculate how long we were paused
      const now = new Date();
      const pauseDuration = now.getTime() - prev.pausedAt.getTime();
      
      // Adjust the start time to account for the pause duration
      const newStartTime = new Date(prev.startTime.getTime() + pauseDuration);
      
      return {
        ...prev,
        isRunning: true,
        isPaused: false,
        startTime: newStartTime,
        pausedAt: null,
      };
    });
  };

  const stopTimer = async () => {
    // Explicitly stop Live Activity before clearing timer
    if (timer?.liveActivityId) {
      DebugLogger.log(`🛑 Explicitly stopping Live Activity in stopTimer: ${timer.liveActivityId}`, 'log');
      try {
        await stopActivity(timer.liveActivityId, { title: 'Timer Stopped' });
        DebugLogger.log(`✅ Live Activity stopped successfully in stopTimer`, 'log');
      } catch (error) {
        DebugLogger.log(`❌ Failed to stop Live Activity in stopTimer: ${error}`, 'error');
      }
    }
    
    // Clear timer state and storage
    setTimer(null);
    AsyncStorage.removeItem(STORAGE_KEY);
  };

  const resetTimer = async () => {
    if (!timer) return;
    
    // Explicitly stop Live Activity before resetting
    if (timer?.liveActivityId) {
      DebugLogger.log(`🔄 Explicitly stopping Live Activity in resetTimer: ${timer.liveActivityId}`, 'log');
      try {
        await stopActivity(timer.liveActivityId, { title: 'Timer Reset' });
        DebugLogger.log(`✅ Live Activity stopped successfully in resetTimer`, 'log');
      } catch (error) {
        DebugLogger.log(`❌ Failed to stop Live Activity in resetTimer: ${error}`, 'error');
      }
    }
    
    const now = new Date();
    setTimer(prev => prev ? {
      ...prev,
      timeElapsed: 0,
      startTime: now,
      pausedAt: null,
      isRunning: false,
      isPaused: false,
      countdownSoundPlayed: false, // Reset countdown sound flag
      liveActivityId: undefined, // Clear Live Activity ID
    } : null);
  };

  const addTime = (seconds: number) => {
    console.log(`🔧 addTime called with ${seconds} seconds. Timer exists: ${!!timer}`);
    
    // If no timer exists, create one with the added time
    if (!timer) {
      console.log('⚡ No timer found, creating new one with added time');
      setTimer({
        isRunning: false,
        isPaused: false,
        timeElapsed: 0,
        targetTime: timerSettings.countUp ? 0 : seconds,
        startTime: null,
        pausedAt: null,
        isCountUp: timerSettings.countUp,
        isQuickMode: timerSettings.quickMode,
        countdownSoundPlayed: false,
      });
      return;
    }
    
    console.log(`Timer mode: ${timerSettings.countUp ? 'Count Up' : 'Countdown'}, Target: ${timer.targetTime}`);
    
    if (timerSettings.countUp) {
      // In count up mode, adjust the start time to appear as if more time has elapsed
      setTimer(prev => prev ? {
        ...prev,
        startTime: prev.startTime ? new Date(prev.startTime.getTime() - seconds * 1000) : prev.startTime,
        timeElapsed: Math.min(3600, prev.timeElapsed + seconds), // Max 1 hour
      } : null);
    } else {
      // In countdown mode, add to target time AND reset countdown sound flag
      const newTargetTime = timer.targetTime + seconds;
      
      // If timer is stopped (not running, not paused), reset elapsed time so it starts fresh
      const shouldResetElapsed = !timer.isRunning && !timer.isPaused;
      
      setTimer(prev => prev ? {
        ...prev,
        targetTime: newTargetTime,
        timeElapsed: shouldResetElapsed ? 0 : prev.timeElapsed,
        countdownSoundPlayed: false, // Reset so sound can play again if we go back under 3s
      } : null);
    }
  };

  const subtractTime = (seconds: number) => {
    // If no timer exists, create one with zero time (can't subtract from nothing)
    if (!timer) {
      console.log('⚡ No timer found for subtraction, creating new timer at 0:00');
      setTimer({
        isRunning: false,
        isPaused: false,
        timeElapsed: 0,
        targetTime: 0,
        startTime: null,
        pausedAt: null,
        isCountUp: timerSettings.countUp,
        isQuickMode: timerSettings.quickMode,
        countdownSoundPlayed: false,
      });
      return;
    }
    
    if (timerSettings.countUp) {
      // In count up mode, adjust the start time to appear as if less time has elapsed
      setTimer(prev => prev ? {
        ...prev,
        startTime: prev.startTime ? new Date(prev.startTime.getTime() + seconds * 1000) : prev.startTime,
        timeElapsed: Math.max(0, prev.timeElapsed - seconds),
      } : null);
    } else {
      // In countdown mode, check current remaining time first
      const currentRemaining = timer.targetTime - timer.timeElapsed;
      
      // If already at or below 0, don't allow further reduction
      if (currentRemaining <= 0) {
        console.log('Timer already at 0:00, cannot subtract more time');
        return;
      }
      
      // Calculate new target time, but don't let it go below current elapsed time
      const newTargetTime = Math.max(timer.timeElapsed, timer.targetTime - seconds);
      
      setTimer(prev => prev ? {
        ...prev,
        targetTime: newTargetTime,
        countdownSoundPlayed: false, // Reset so sound can play again
      } : null);
    }
  };

  const showModal = () => {
    setIsMinimized(false);
  };

  const hideModal = () => {
    setIsMinimized(true);
  };

  const minimize = () => {
    setIsMinimized(true);
  };

  const startAutoTimer = (restTime: number, quickRestTime: number, exerciseIndex: number, setIndex: number, themeColor?: string) => {
    const targetTime = timerSettings.quickMode ? quickRestTime : restTime;
    startTimer(targetTime, exerciseIndex, setIndex, themeColor);
  };

  const testAudio = () => {
    console.log('🔊 Testing audio manually...');
    playCountdownSound();
  };

  const setExerciseContext = (getContext: ((exerciseIndex?: number, setIndex?: number) => ExerciseContext) | null) => {
    getExerciseContextRef.current = getContext;
  };

  // Simple Live Activity - mirrors timer state
  // Track last sync time to detect rapid consecutive calls that could cause jumping
  const lastSyncTimeRef = useRef<number>(0);

  const syncLiveActivity = async () => {
    try {
      const syncStartTime = Date.now();
      const timeSinceLastSync = syncStartTime - lastSyncTimeRef.current;
      
      const debugInfo = {
        hasTimer: !!timer,
        isCountUp: timer?.isCountUp,
        isRunning: timer?.isRunning,
        isPaused: timer?.isPaused,
        hasStartTime: !!timer?.startTime,
        targetTime: timer?.targetTime,
        liveActivityId: timer?.liveActivityId
      };
      
      console.log('🔄 syncLiveActivity called', debugInfo);
      DebugLogger.log(`syncLiveActivity called: ${JSON.stringify(debugInfo)}`);
      
      // Detect rapid consecutive syncs that could cause timer jumping
      if (timeSinceLastSync < 100 && lastSyncTimeRef.current > 0) {
        DebugLogger.log(`⚠️ RAPID SYNC: Only ${timeSinceLastSync}ms since last sync - potential race condition!`, 'warn');
      }
      lastSyncTimeRef.current = syncStartTime;

      // Only sync Live Activity for running countdown timers
      if (!timer || timer.isCountUp || !timer.isRunning || timer.isPaused || !timer.startTime || timer.targetTime <= 0) {
        const reason = !timer ? 'no timer' : 
                     timer.isCountUp ? 'count up mode' :
                     !timer.isRunning ? 'timer not running' :
                     timer.isPaused ? 'timer paused' :
                     !timer.startTime ? 'no start time' :
                     timer.targetTime <= 0 ? 'target time <= 0' : 'unknown';
        
        console.log('⚠️ Stopping Live Activity - conditions not met');
        DebugLogger.log(`Stopping Live Activity - reason: ${reason}`);
        
        // No active countdown timer, stop any existing Live Activity
        if (timer?.liveActivityId) {
          DebugLogger.log(`Stopping existing Live Activity: ${timer.liveActivityId}`);
          await stopActivity(timer.liveActivityId, { title: 'Timer Complete' });
          setTimer(prev => prev ? { ...prev, liveActivityId: undefined } : null);
          DebugLogger.log('Live Activity stopped successfully');
        }
        return;
      }

      const exerciseContext = getExerciseContextRef.current?.(timer.exerciseIndex, timer.setIndex);
      // Use the stable fixedEndTime to prevent jumping, fallback to calculation if not available
      const now = new Date().getTime();
      const elapsed = Math.floor((now - timer.startTime.getTime()) / 1000);
      const remaining = Math.max(0, timer.targetTime - elapsed);
      
      // CRITICAL: Always align endTime perfectly with remaining seconds to prevent lock screen jumping
      // Don't use fixedEndTime if it would create inconsistency with remaining seconds
      const calculatedEndTime = now + (remaining * 1000);
      const endTime = timer.fixedEndTime && Math.abs((timer.fixedEndTime - calculatedEndTime) / 1000) < 2 
        ? timer.fixedEndTime 
        : calculatedEndTime;
      
      // Debug log if we're using stable vs calculated endTime
      if (!timer.fixedEndTime) {
        DebugLogger.log(`⚠️ Using calculated endTime (timer missing fixedEndTime)`, 'warn');
      }

      const timingInfo = {
        now: new Date(now).toISOString(),
        startTime: timer.startTime.toISOString(),
        elapsed,
        targetTime: timer.targetTime,
        remaining,
        endTime: new Date(endTime).toISOString()
      };

      console.log('📊 Live Activity timing calculation', timingInfo);
      DebugLogger.log(`Timing calculation: elapsed=${elapsed}s, remaining=${remaining}s, endTime=${new Date(endTime).toISOString()}`);
      
      // Check for timing inconsistencies that could cause jumping
      const timeDiffFromNow = Math.abs((endTime - now) / 1000 - remaining);
      if (timeDiffFromNow > 1) {
        const usedFixed = timer.fixedEndTime && Math.abs((timer.fixedEndTime - calculatedEndTime) / 1000) < 2;
        DebugLogger.log(`⚠️ TIMING INCONSISTENCY: endTime-now=${Math.round((endTime-now)/1000)}s but remaining=${remaining}s (diff=${Math.round(timeDiffFromNow)}s) usedFixed=${usedFixed}`, 'warn');
      }
      
      const state = {
        title: 'REST',
        subtitle: exerciseContext?.nextExercise ? `Next: ${exerciseContext.nextExercise}` : undefined,
        timerEndDateInMilliseconds: endTime,
        // Remove remainingSeconds - let iOS calculate natively to prevent jumping
        progressBar: { date: endTime },
        // Remove custom icons - let iOS use default app icon
        // imageName: 'icon_transparent',
        // dynamicIslandImageName: 'icon_transparent',
      };

      // Log the exact state being sent to Live Activity for lock screen debugging
      DebugLogger.log(`📱 Live Activity State: title="${state.title}", endTime=${new Date(endTime).toISOString()}, timerEndMs=${endTime}, remainingSeconds=${remaining}`, 'log');

      const config = {
        backgroundColor: '#1a1a1a',
        titleColor: '#ffffff',
        subtitleColor: '#cccccc',
        progressViewTint: timer.themeColor || '#007AFF',
        timerType: 'digital' as const,
      };

      if (!timer.liveActivityId) {
        // Start new Live Activity - set once and let iOS handle native countdown
        console.log('🚀 Starting new Live Activity', { state, config });
        DebugLogger.log(`🆕 Starting new Live Activity with endTime: ${new Date(endTime).toISOString()} - will use native iOS countdown`);
        
        const activityId = await startActivity(state, config);
        console.log('✅ Live Activity started with ID:', activityId);
        DebugLogger.log(`✅ Live Activity started successfully with ID: ${activityId}`);
        
        if (activityId) {
          setTimer(prev => prev ? { ...prev, liveActivityId: activityId } : null);
        }
      } else {
        // Don't update every second - let iOS handle native countdown for accuracy
        // Only update if there are significant state changes (pause/resume/time adjustments)
        const hasSignificantChange = timer.isPaused !== (timer.isPaused || false) ||
                                   Math.abs(remaining - (timer.lastSentRemaining || remaining)) > 5;
        
        if (hasSignificantChange) {
          console.log('🔄 Updating Live Activity for significant change', timer.liveActivityId, { state });
          DebugLogger.log(`🔄 Updating Live Activity for significant change: remaining=${remaining}, lastSent=${timer.lastSentRemaining}`);
          
          await updateActivity(timer.liveActivityId, state);
          setTimer(prev => prev ? { ...prev, lastSentRemaining: remaining } : null);
          DebugLogger.log('✅ Live Activity updated successfully');
        } else {
          DebugLogger.log(`⏭️ Skipping Live Activity update - no significant change (remaining=${remaining})`);
        }
      }
    } catch (error) {
      console.error('Live Activity sync error:', error);
      DebugLogger.log(`ERROR: Live Activity sync failed: ${error.message}`, 'error');
      
      if (timer?.liveActivityId && error.message?.includes('not found')) {
        DebugLogger.log(`Live Activity ${timer.liveActivityId} not found, clearing ID`);
        setTimer(prev => prev ? { ...prev, liveActivityId: undefined } : null);
      }
    }
  };



  const contextValue: TimerContextType = {
    timer,
    isMinimized,
    timerSettings,
    setTimerSettings,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    addTime,
    subtractTime,
    showModal,
    hideModal,
    minimize,
    startAutoTimer,
    setExerciseContext,
    testAudio,
  };

  return (
    <TimerContext.Provider value={contextValue}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = (): TimerContextType => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};