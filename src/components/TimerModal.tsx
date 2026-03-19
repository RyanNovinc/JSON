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
  const { timer, isMinimized, timerSettings, setTimerSettings, startTimer, pauseTimer, stopTimer, resetTimer, addTime, subtractTime, hideModal } = useTimer();
  const { themeColor } = useTheme();

  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Animate in/out when modal visibility changes
  useEffect(() => {
    if (!isMinimized) {
      // Show modal
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Hide modal
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
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
      startTimer(0);
    } else if (timer.isRunning && !timer.isPaused) {
      pauseTimer();
    } else {
      // Resume timer by setting start time to account for elapsed time
      const now = new Date();
      const adjustedStartTime = new Date(now.getTime() - timer.timeElapsed * 1000);
      startTimer(timer.targetTime, timer.exerciseIndex, timer.setIndex);
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
            { transform: [{ translateY: modalTranslateY }] }
          ]}
        >
          {/* Header with drag indicator */}
          <View style={styles.dragIndicator} />
          
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
                style={styles.secondaryButton}
                onPress={resetTimer}
                disabled={!hasTimer}
              >
                <Ionicons 
                  name="refresh-outline" 
                  size={20} 
                  color={hasTimer ? "#a1a1aa" : "#52525b"} 
                />
              </TouchableOpacity>
              
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
              
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={stopTimer}
                disabled={!hasTimer}
              >
                <Ionicons 
                  name="stop-outline" 
                  size={20} 
                  color={hasTimer ? "#a1a1aa" : "#52525b"} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Settings */}
          <View style={styles.settingsSection}>
            {/* Mode Toggle */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Timer Mode</Text>
              <TouchableOpacity
                style={[styles.modernToggle, timerSettings.countUp && styles.modernToggleActive]}
                onPress={() => setTimerSettings({ ...timerSettings, countUp: !timerSettings.countUp })}
              >
                <View style={[
                  styles.modernToggleThumb,
                  { backgroundColor: timerSettings.countUp ? themeColor : '#52525b' },
                  timerSettings.countUp && styles.modernToggleThumbActive
                ]}>
                  <Ionicons 
                    name={timerSettings.countUp ? "trending-up" : "trending-down"} 
                    size={12} 
                    color="white" 
                  />
                </View>
                <Text style={[styles.toggleText, timerSettings.countUp && { color: themeColor }]}>
                  {timerSettings.countUp ? 'Count Up' : 'Countdown'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Rest Time Toggle (only for countdown) */}
            {!timerSettings.countUp && (
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Rest Duration</Text>
                <TouchableOpacity
                  style={[styles.modernToggle, timerSettings.quickMode && styles.modernToggleActive]}
                  onPress={() => setTimerSettings({ ...timerSettings, quickMode: !timerSettings.quickMode })}
                >
                  <View style={[
                    styles.modernToggleThumb,
                    { backgroundColor: timerSettings.quickMode ? themeColor : '#52525b' },
                    timerSettings.quickMode && styles.modernToggleThumbActive
                  ]}>
                    <Ionicons 
                      name={timerSettings.quickMode ? "flash" : "time"} 
                      size={12} 
                      color="white" 
                    />
                  </View>
                  <Text style={[styles.toggleText, timerSettings.quickMode && { color: themeColor }]}>
                    {timerSettings.quickMode ? 'Quick Rest' : 'Optimal Rest'}
                  </Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  timerModal: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34, // Account for home indicator
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    backgroundColor: '#52525b',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  timerSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  timeDisplay: {
    fontSize: 64,
    fontWeight: '300',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
    marginBottom: 24,
  },
  timeAdjustControls: {
    flexDirection: 'row',
    gap: 16,
  },
  adjustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  minusButton: {
    backgroundColor: '#ef444415',
    borderWidth: 1,
    borderColor: '#ef444430',
  },
  plusButton: {
    backgroundColor: '#22c55e15',
    borderWidth: 1,
    borderColor: '#22c55e30',
  },
  adjustButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  controlSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  primaryButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  secondaryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    gap: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  modernToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
    minWidth: 140,
  },
  modernToggleActive: {
    backgroundColor: '#ffffff10',
  },
  modernToggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernToggleThumbActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a1a1aa',
    flex: 1,
  },
});