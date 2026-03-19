import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTimer } from '../contexts/TimerContext';
import { useTheme } from '../contexts/ThemeContext';

export const MinimizedTimer: React.FC = () => {
  const { timer, timerSettings, showModal } = useTimer();
  const { themeColor } = useTheme();

  const displayTime = useMemo(() => {
    if (!timer) return '0:00';
    
    if (timerSettings.countUp) {
      const elapsed = timer.timeElapsed;
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      const remaining = Math.max(0, timer.targetTime - timer.timeElapsed);
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }, [timer, timerSettings.countUp]);

  const isTimerRunning = timer?.isRunning && !timer?.isPaused;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.timerButton,
          {
            backgroundColor: isTimerRunning ? `${themeColor}20` : '#27272a',
            borderColor: isTimerRunning ? themeColor : 'transparent',
          }
        ]}
        onPress={showModal}
        activeOpacity={0.7}
      >
        <View style={styles.timerContent}>
          {isTimerRunning && (
            <View style={[styles.runningIndicator, { backgroundColor: themeColor }]} />
          )}
          <Ionicons 
            name="timer-outline" 
            size={18} 
            color={isTimerRunning ? themeColor : '#a1a1aa'} 
            style={styles.timerIcon}
          />
          <Text 
            style={[
              styles.timerText,
              { color: isTimerRunning ? themeColor : '#a1a1aa' }
            ]}
          >
            {displayTime}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 34,
    left: 20,
    right: 20,
    zIndex: 1000,
    alignItems: 'center',
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    minWidth: 100,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  timerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  runningIndicator: {
    position: 'absolute',
    left: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  timerIcon: {
    marginRight: 8,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});