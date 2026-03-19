import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import LiveActivity from 'expo-live-activity';

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
  liveActivityId?: string; // Track Live Activity ID
}

export interface TimerSettings {
  countUp: boolean;
  quickMode: boolean;
}

interface ExerciseContext {
  currentExercise?: string;
  nextExercise?: string;
  currentSet?: number;
  totalSets?: number;
  weight?: string;
  reps?: string;
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
  stopTimer: () => void;
  resetTimer: () => void;
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
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - timer.startTime.getTime()) / 1000);
        setTimer(prev => prev ? { ...prev, timeElapsed: elapsed } : null);
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
      console.error('Failed to play countdown sound:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
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
            // Stop Live Activity when timer completes
            if (prev.liveActivityId) {
              stopLiveActivity(prev.liveActivityId);
            }
            return { 
              ...prev, 
              timeElapsed: 0, // Reset to 0
              targetTime: 0,  // Reset to 0 so timer shows 0:00 cleanly
              isRunning: false,
              isPaused: false,
              liveActivityId: undefined, // Clear Live Activity ID
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
    const now = new Date();
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
      countdownSoundPlayed: false, // Reset countdown sound flag
    };
    
    setTimer(newTimer);
    
    // Start Live Activity for countdown timers with exercise context
    if (!timerSettings.countUp && targetSeconds > 0) {
      // Try to get current exercise information if available
      const exerciseContext = getExerciseContextRef.current?.(exerciseIndex, setIndex);
      await startLiveActivity(
        newTimer, 
        exerciseContext?.currentExercise,
        exerciseContext?.nextExercise,
        exerciseContext?.currentSet,
        exerciseContext?.totalSets,
        exerciseContext?.weight,
        exerciseContext?.reps,
        themeColor
      );
    }
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

  const stopTimer = () => {
    setTimer(null);
    AsyncStorage.removeItem(STORAGE_KEY);
  };

  const resetTimer = () => {
    if (!timer) return;
    
    const now = new Date();
    setTimer(prev => prev ? {
      ...prev,
      timeElapsed: 0,
      startTime: now,
      pausedAt: null,
      isRunning: false,
      isPaused: false,
      countdownSoundPlayed: false, // Reset countdown sound flag
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

  // Live Activity functions
  const startLiveActivity = async (timer: TimerState, exerciseName?: string, nextExerciseName?: string, currentSet?: number, totalSets?: number, weight?: string, reps?: string, themeColor?: string) => {
    try {
      if (!timer.isCountUp && timer.targetTime > 0) {
        const endTime = new Date(Date.now() + (timer.targetTime - timer.timeElapsed) * 1000);
        
        // Choose icon based on theme color
        const isPinkTheme = themeColor?.toLowerCase().includes('pink') || themeColor === '#ec4899' || themeColor === '#f472b6';
        const iconName = isPinkTheme ? 'icon_pink_transparent' : 'icon_transparent';
        
        const liveActivityState = {
          title: timer.isQuickMode ? 'Quick Rest' : 'Optimal Rest',
          subtitle: exerciseName ? `Next: ${nextExerciseName || 'Workout Complete'}` : 'Workout Timer',
          progressBar: {
            date: endTime.getTime(),
          },
          imageName: iconName,
          dynamicIslandImageName: iconName,
          // Additional workout context for lock screen
          exerciseName: exerciseName || '',
          nextExerciseName: nextExerciseName || '',
          setInfo: currentSet && totalSets ? `Set ${currentSet} of ${totalSets}` : '',
          weightReps: weight && reps ? `${weight} kgs x ${reps} reps` : '',
        };

        const activityId = await LiveActivity.startActivity(liveActivityState);
        console.log('🎯 Live Activity started:', activityId);
        
        // Update timer with Live Activity ID
        setTimer(prev => prev ? { ...prev, liveActivityId: activityId } : null);
        return activityId;
      }
    } catch (error) {
      console.error('❌ Failed to start Live Activity:', error);
    }
  };

  const stopLiveActivity = async (activityId?: string) => {
    try {
      if (activityId) {
        await LiveActivity.endActivity(activityId);
        console.log('🛑 Live Activity stopped:', activityId);
      }
    } catch (error) {
      console.error('❌ Failed to stop Live Activity:', error);
    }
  };

  const updateLiveActivity = async (timer: TimerState) => {
    try {
      if (timer.liveActivityId && !timer.isCountUp && timer.targetTime > 0) {
        const endTime = new Date(Date.now() + (timer.targetTime - timer.timeElapsed) * 1000);
        
        const liveActivityState = {
          title: timer.isQuickMode ? 'Quick Rest Timer' : 'Optimal Rest Timer',
          subtitle: timer.isRunning ? 'Running...' : 'Paused',
          progressBar: {
            date: endTime.getTime(),
          },
        };

        await LiveActivity.updateActivity(timer.liveActivityId, liveActivityState);
        console.log('🔄 Live Activity updated');
      }
    } catch (error) {
      console.error('❌ Failed to update Live Activity:', error);
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