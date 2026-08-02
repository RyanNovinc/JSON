import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTimer } from '../contexts/TimerContext';
import { useTheme } from '../contexts/ThemeContext';
import type { RestPace } from '../utils/restResolver';

/**
 * The three alert channels, in the order they are shown.
 *
 * Sound first because it is the one almost everyone uses and the one most likely to be the
 * reason someone opened this section. "Vibration" rather than "haptics" — the latter is a
 * developer's word for it.
 */
const ALERT_OPTIONS = [
  {
    key: 'sound' as const,
    label: 'Sound',
    icon: 'volume-medium-outline' as const,
    accessibilityLabel: 'Play a sound for the last three seconds of a rest',
  },
  {
    key: 'haptics' as const,
    label: 'Vibration',
    icon: 'phone-portrait-outline' as const,
    accessibilityLabel: 'Vibrate for the last three seconds of a rest',
  },
  {
    key: 'visualCountdown' as const,
    label: 'Countdown',
    icon: 'eye-outline' as const,
    accessibilityLabel: 'Show a full-screen countdown for the last three seconds of a rest',
  },
];

/**
 * The three paces, in the order they are shown: longest rest first, so the row reads
 * left-to-right as "most recovery" to "least". Labels are deliberately not the internal
 * pace names — "optimal" would imply the other two are wrong choices, when the point of
 * the control is that all three are legitimate depending on how much time you have.
 */
const PACE_OPTIONS: { pace: RestPace; label: string }[] = [
  { pace: 'optimal', label: 'Full' },
  { pace: 'moderate', label: 'Balanced' },
  { pace: 'minimal', label: 'Quick' },
];

const PACE_TITLES: Record<RestPace, string> = {
  optimal: 'Full Rest',
  moderate: 'Balanced Rest',
  minimal: 'Quick Rest',
};

/** Reserves the duration line's height when there is no duration to show, so the row
 *  does not change height between a timer being live and not. */
const DURATION_PLACEHOLDER = '\u00A0';

/** Matches the main display's m:ss above a minute, and stays compact below it. */
const formatPaceSeconds = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
};

export const TimerModal: React.FC = () => {
  const { timer, isMinimized, timerSettings, setTimerSettings, startTimer, pauseTimer, resumeTimer, stopTimer, resetTimer, addTime, subtractTime, hideModal, previewRestOptions } = useTimer();
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
      // Timer exists but is stopped — restart it with existing target time.
      // restOptions is carried across: without it the restarted rest loses its pace
      // durations, and switching pace stops retargeting.
      startTimer(timer.targetTime, timer.exerciseIndex, timer.setIndex, themeColor, timer.restOptions);
    }
  };

  const isTimerRunning = timer?.isRunning && !timer?.isPaused;
  const hasTimer = timer !== null;

  /**
   * Which set of durations the pace buttons describe.
   *
   * A live rest wins. Its restOptions are what a pace switch would actually retarget TO, so
   * they must be what the user is looking at when they tap — including when they have swiped
   * to a different exercise while resting, where the preview belongs to a movement whose rest
   * has not started.
   *
   * Otherwise fall back to the preview the workout screen publishes for the exercise on
   * screen, so the costs are visible BEFORE the first set rather than only after it. Null
   * outside a workout, where there is no exercise to describe.
   */
  const paceDurations = timer?.restOptions ?? previewRestOptions ?? null;

  /** Only a live rest has elapsed time to compare a pace against. */
  const isLiveRest = !!timer?.restOptions;

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
          {/* The sheet is capped at 70% of the window and its content is now taller than
              that on a small phone, so it has to scroll or the bottom of the settings is
              simply invisible — which is exactly how the alert toggles went missing.
              bounces={false} keeps it feeling like a fixed sheet when everything does fit. */}
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
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
                  ? PACE_TITLES[timerSettings.pace]
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
            {/* The "Count up" toggle used to sit here and has been removed from the UI.
                A stopwatch is a different tool from a rest timer, nothing in the workout
                flow starts one, and the switch cost a row in a sheet that had run out of
                them. `countUp` itself is left in TimerSettings and every branch that reads
                it still works — it is simply no longer reachable, so it stays false. Put
                the row back if the mode is ever wanted again. */}

            {/* Rest pace (only for countdown) */}
            {!timerSettings.countUp && (
              <View>
                <Text style={styles.settingLabel}>Rest pace</Text>
                <View style={styles.paceControl}>
                  {PACE_OPTIONS.map(({ pace, label }) => {
                    const isSelected = timerSettings.pace === pace;
                    const seconds = paceDurations?.[pace];

                    // Switching to a pace shorter than the time already served ends the
                    // rest immediately. Saying so is the difference between an informed
                    // switch and a surprise — this is the case someone hits when they
                    // realise mid-rest that they are running late.
                    //
                    // Only meaningful against a LIVE rest. A preview has no elapsed time
                    // behind it, and a preview shown next to someone else's running timer
                    // must not be compared to that timer's clock.
                    const endsImmediately =
                      isLiveRest &&
                      seconds !== undefined &&
                      timer !== null &&
                      !isSelected &&
                      timer.timeElapsed >= seconds;

                    const durationLabel =
                      seconds === undefined
                        ? DURATION_PLACEHOLDER
                        : endsImmediately
                        ? 'ends now'
                        : formatPaceSeconds(seconds);

                    const accessibilityLabel =
                      seconds === undefined
                        ? `${label} rest`
                        : endsImmediately
                        ? `${label} rest, ${seconds} seconds, would end this rest immediately`
                        : `${label} rest, ${seconds} seconds`;

                    return (
                      <TouchableOpacity
                        key={pace}
                        style={[
                          styles.paceOption,
                          isSelected && { backgroundColor: `${themeColor}26`, borderColor: themeColor },
                        ]}
                        // paceTouched latches here and nowhere else. Once the user has
                        // picked a pace, an imported plan's default_pace stops overriding it.
                        onPress={() => setTimerSettings({ ...timerSettings, pace, paceTouched: true })}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={accessibilityLabel}
                      >
                        <Text style={[styles.paceLabel, isSelected && { color: themeColor }]}>
                          {label}
                        </Text>
                        <Text
                          style={[
                            styles.paceSeconds,
                            isSelected && { color: themeColor },
                            endsImmediately && styles.paceSecondsWarning,
                          ]}
                        >
                          {durationLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* An empty row of buttons with no numbers under them looks broken. Say
                    why they are empty instead. Only reachable outside a workout now that
                    the log screen publishes a preview for whichever exercise is on screen. */}
                {!paceDurations && (
                  <Text style={styles.paceHint}>
                    Durations show while you're logging a workout.
                  </Text>
                )}
              </View>
            )}

            {/* Alert channels.
                Grouped under a caption rather than dropped in as three loose switches,
                because "Sound" on its own reads as though it might mute the whole app.
                The caption is what scopes them to the end of a rest.

                No longer gated on count-up mode: with that toggle gone from the UI there is
                always a deadline to announce. */}
            <View style={styles.alertsSection}>
              <Text style={styles.alertsCaption}>ALERT ME IN THE LAST 3 SECONDS</Text>
              <View style={styles.alertControl}>
                {ALERT_OPTIONS.map(({ key, label, icon, accessibilityLabel }) => {
                  const isOn = timerSettings[key];
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.alertOption,
                        isOn && { backgroundColor: `${themeColor}26`, borderColor: themeColor },
                      ]}
                      onPress={() => setTimerSettings({ ...timerSettings, [key]: !isOn })}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: isOn }}
                      accessibilityLabel={accessibilityLabel}
                    >
                      <Ionicons name={icon} size={18} color={isOn ? themeColor : '#55555f'} />
                      <Text style={[styles.alertLabel, isOn && { color: themeColor }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
          </ScrollView>
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
    maxHeight: '85%',
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
  scrollContent: {
    paddingBottom: 8,
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
  // Its own rule and its own tighter row rhythm: settingsSection's 24px gap is right for
  // separating unrelated controls, and far too loose for three switches that belong
  // together under one caption.
  alertsSection: {
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#222',
  },
  alertsCaption: {
    fontSize: 10,
    letterSpacing: 1.4,
    color: '#55555f',
    fontFamily: 'DMMono-Medium',
    marginBottom: 8,
  },
  // Deliberately the same shape as paceControl / paceOption directly above it. Three
  // full-width switch rows plus a caption overflowed a sheet capped at 70% of the window,
  // and the answer to "the toggles are below the fold" is not a nicer scroll — it is one
  // row instead of four. Reusing the pace control's visual language also means the two
  // blocks read as one settings area rather than two unrelated widgets.
  alertControl: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  alertOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#141414',
    gap: 4,
  },
  alertLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ccc',
  },
  paceControl: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  paceOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#141414',
    gap: 2,
  },
  paceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ccc',
  },
  paceSeconds: {
    fontSize: 12,
    fontWeight: '400',
    color: '#888',
    fontVariant: ['tabular-nums'],
  },
  paceSecondsWarning: {
    color: '#f59e0b',
  },
  paceHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
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