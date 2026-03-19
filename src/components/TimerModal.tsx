import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTimer } from '../contexts/TimerContext';
import { useTheme } from '../contexts/ThemeContext';

export const TimerModal: React.FC = () => {
  const { timer, isMinimized, timerSettings, setTimerSettings, startTimer, pauseTimer, resumeTimer, stopTimer, resetTimer, addTime, subtractTime, hideModal } = useTimer();
  const { themeColor } = useTheme();

  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Animate in/out when modal visibility changes
  useEffect(() => {
    if (!isMinimized) {
      // Show modal with smooth, spring-like animation
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Hide modal with smooth spring animation
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 120,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isMinimized, overlayOpacity, slideAnim]);

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

  const handlePlayPause = () => {
    if (!timer) {
      // Start a new timer at 0:00
      startTimer(0, undefined, undefined, themeColor);
    } else if (timer.isRunning && !timer.isPaused) {
      pauseTimer();
    } else if (timer.isPaused) {
      // Resume the paused timer
      resumeTimer();
    } else {
      // Timer exists but is stopped - restart it with existing target time
      startTimer(timer.targetTime, timer.exerciseIndex, timer.setIndex, themeColor);
    }
  };

  const isTimerRunning = timer?.isRunning && !timer?.isPaused;
  const hasTimer = timer !== null;

  const modalTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0], // Slide up from 300px below
  });

  return (
    <Modal
      visible={!isMinimized}
      transparent={true}
      animationType="none"
      onRequestClose={hideModal}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: overlayOpacity }]}>
        {/* Backdrop tap to close */}
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={hideModal}
        />
        
        <Animated.View 
          style={[
            styles.timerModal, 
            { 
              transform: [{ translateY: modalTranslateY }],
              borderTopColor: `${themeColor}40`,
              shadowColor: themeColor,
              shadowOffset: { width: 0, height: -8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 25,
            }
          ]}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={hideModal}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-down" size={24} color="#a1a1aa" />
            </TouchableOpacity>
            
            <View style={styles.titleContainer}>
              <Text style={styles.title}>
                {!timerSettings.countUp 
                  ? (timer?.isQuickMode ? 'Quick Rest' : 'Optimal Rest')
                  : 'Count Up'
                }
              </Text>
              <Text style={styles.subtitle}>
                {timerSettings.countUp ? 'Elapsed Time' : 'Rest Timer'}
              </Text>
            </View>
            
            <View style={{ width: 24 }} />
          </View>

          {/* Main Timer Display */}
          <View style={styles.timerSection}>
            <Text style={styles.timeDisplay}>{displayTime}</Text>
            
            {/* Time adjustment controls for countdown only */}
            {!timerSettings.countUp && (
              <View style={styles.timeAdjustControls}>
                <TouchableOpacity
                  style={[styles.adjustButton, styles.minusButton]}
                  onPress={() => subtractTime(15)}
                  disabled={!hasTimer}
                >
                  <Ionicons name="remove" size={16} color="#ef4444" />
                  <Text style={styles.adjustButtonText}>15s</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.adjustButton, styles.plusButton]}
                  onPress={() => addTime(15)}
                  disabled={!hasTimer}
                >
                  <Ionicons name="add" size={16} color="#22c55e" />
                  <Text style={styles.adjustButtonText}>15s</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Control Buttons */}
          <View style={styles.controlSection}>
            <View style={styles.playbackControls}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: isTimerRunning ? '#ef4444' : themeColor }]}
                onPress={handlePlayPause}
              >
                <Ionicons 
                  name={isTimerRunning ? "pause" : "play"} 
                  size={24} 
                  color="white" 
                  style={{ marginLeft: isTimerRunning ? 0 : 2 }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Settings */}
          <View style={styles.settingsSection}>
            {/* Mode Toggle */}
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => setTimerSettings({ ...timerSettings, countUp: !timerSettings.countUp })}
            >
              <Text style={styles.settingLabel}>
                {timerSettings.countUp ? 'Count Up' : 'Countdown'}
              </Text>
              <View style={[styles.simpleToggle, timerSettings.countUp && { backgroundColor: themeColor }]}>
                <View style={[
                  styles.toggleKnob,
                  timerSettings.countUp && styles.toggleKnobActive
                ]} />
              </View>
            </TouchableOpacity>

            {/* Rest Time Toggle (only for countdown) */}
            {!timerSettings.countUp && (
              <TouchableOpacity 
                style={styles.settingRow}
                onPress={() => setTimerSettings({ ...timerSettings, quickMode: !timerSettings.quickMode })}
              >
                <Text style={styles.settingLabel}>
                  {timerSettings.quickMode ? 'Quick Rest' : 'Optimal Rest'}
                </Text>
                <View style={[styles.simpleToggle, timerSettings.quickMode && { backgroundColor: themeColor }]}>
                  <View style={[
                    styles.toggleKnob,
                    timerSettings.quickMode && styles.toggleKnobActive
                  ]} />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  timerModal: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    paddingTop: 24,
    maxHeight: '70%',
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  closeButton: {
    position: 'absolute',
    right: 24,
    top: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    fontWeight: '400',
  },
  timerSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  timeDisplay: {
    fontSize: 72,
    fontWeight: '200',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
    letterSpacing: -3,
    marginBottom: 32,
  },
  timeAdjustControls: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 8,
  },
  adjustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    minWidth: 80,
    justifyContent: 'center',
  },
  minusButton: {
    backgroundColor: '#2a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  plusButton: {
    backgroundColor: '#1a2a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  adjustButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ccc',
  },
  controlSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  playbackControls: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    borderTopWidth: 0.5,
    borderTopColor: '#333',
    gap: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
  },
  simpleToggle: {
    width: 44,
    height: 24,
    backgroundColor: '#404040',
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    transform: [{ translateX: 0 }],
  },
  toggleKnobActive: {
    transform: [{ translateX: 18 }],
  },
});