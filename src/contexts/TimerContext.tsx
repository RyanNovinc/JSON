import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

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
  startTimer: (targetSeconds?: number, exerciseIndex?: number, setIndex?: number) => void;
  pauseTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  addTime: (seconds: number) => void;
  subtractTime: (seconds: number) => void;
  
  // UI controls
  showModal: () => void;
  hideModal: () => void;
  minimize: () => void;
  
  // Auto-timer for set completion
  startAutoTimer: (restTime: number, quickRestTime: number, exerciseIndex: number, setIndex: number) => void;
  
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
        
        // Check for countdown sound trigger (when 3 seconds remaining)
        if (!prev.isCountUp && !prev.countdownSoundPlayed) {
          const remaining = prev.targetTime - elapsed;
          console.log(`Countdown check: remaining=${remaining}, elapsed=${elapsed}, targetTime=${prev.targetTime}`);
          if (remaining <= 3 && remaining > 0) {
            console.log('Triggering countdown sound!');
            playCountdownSound();
            return { ...prev, timeElapsed: elapsed, countdownSoundPlayed: true };
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

  const startTimer = (targetSeconds = 0, exerciseIndex?: number, setIndex?: number) => {
    const now = new Date();
    setTimer({
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
    });
  };

  const pauseTimer = () => {
    setTimer(prev => prev ? {
      ...prev,
      isRunning: false,
      isPaused: true,
      pausedAt: new Date(),
    } : null);
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
    if (!timer) return;
    
    if (timerSettings.countUp) {
      // In count up mode, add to elapsed time
      setTimer(prev => prev ? {
        ...prev,
        timeElapsed: Math.min(3600, prev.timeElapsed + seconds), // Max 1 hour
      } : null);
    } else {
      // In countdown mode, add to target time
      setTimer(prev => prev ? {
        ...prev,
        targetTime: prev.targetTime + seconds,
      } : null);
    }
  };

  const subtractTime = (seconds: number) => {
    if (!timer) return;
    
    if (timerSettings.countUp) {
      // In count up mode, subtract from elapsed time
      setTimer(prev => prev ? {
        ...prev,
        timeElapsed: Math.max(0, prev.timeElapsed - seconds),
      } : null);
    } else {
      // In countdown mode, subtract from target time
      setTimer(prev => prev ? {
        ...prev,
        targetTime: Math.max(0, prev.targetTime - seconds),
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

  const startAutoTimer = (restTime: number, quickRestTime: number, exerciseIndex: number, setIndex: number) => {
    const targetTime = timerSettings.quickMode ? quickRestTime : restTime;
    startTimer(targetTime, exerciseIndex, setIndex);
  };

  const testAudio = () => {
    console.log('🔊 Testing audio manually...');
    playCountdownSound();
  };

  const contextValue: TimerContextType = {
    timer,
    isMinimized,
    timerSettings,
    setTimerSettings,
    startTimer,
    pauseTimer,
    stopTimer,
    resetTimer,
    addTime,
    subtractTime,
    showModal,
    hideModal,
    minimize,
    startAutoTimer,
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