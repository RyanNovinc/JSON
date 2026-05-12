import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  Dimensions,
  Linking,
  ScrollView,
  PanResponder,
  Pressable,
  Easing,
} from 'react-native';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigationState } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { sendRatingFeedback, sendBugReport, sendFeatureRequest } from '../services/feedbackApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = SCREEN_WIDTH * 0.9;
const VELOCITY_THRESHOLD = 500;
const DISTANCE_THRESHOLD = 50;

type TabType = 'rating' | 'bug' | 'feature';

// ── Helper ────────────────────────────────────────────────────────

function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function FeedbackTab() {
  const { themeColor, isPinkTheme, setIsPinkTheme, isThemeLoaded } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('rating');
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [submittedState, setSubmittedState] = useState<TabType | null>(null);

  // Initialize local state with current theme state immediately
  const [localThemeState, setLocalThemeState] = useState(isPinkTheme);

  // Sync local state with theme context when context changes
  React.useEffect(() => {
    setLocalThemeState(isPinkTheme);
  }, [isPinkTheme]);

  // Use local state for immediate feedback
  const currentThemeState = localThemeState;
  const currentThemeColor = currentThemeState ? '#ec4899' : '#22d3ee';

  // Inline success fade animation
  const successOpacity = useRef(new Animated.Value(0)).current;

  // Hide feedback tab on payment screen
  const navigationState = useNavigationState(state => state);
  const currentRoute = navigationState?.routes?.[navigationState.index];
  const isPaymentScreen = currentRoute?.name === 'Payment';

  // SINGLE ANIMATION SYSTEM — DO NOT TOUCH
  const translateX = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const tabTranslateX = useRef(new Animated.Value(0)).current;

  const openPanel = () => {
    setIsOpen(true);
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }),
      Animated.spring(tabTranslateX, {
        toValue: -PANEL_WIDTH,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }),
    ]).start();
  };

  const closePanel = () => {
    Keyboard.dismiss();
    setIsOpen(false); // Update state immediately, not in callback
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: PANEL_WIDTH,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }),
      Animated.spring(tabTranslateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }),
    ]).start(() => {
      // Force tab to final position to fix iOS production build bug
      tabTranslateX.setValue(0);
      // Reset form state after animation completes
      setFeedback('');
      setRating(0);
      setActiveTab('rating');
      setSubmittedState(null);
      successOpacity.setValue(0);
    });
  };

  // WORKING PANRESPONDER — DO NOT TOUCH
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 5,

      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0 && !isOpen) {
          // Opening: Panel and tab follow finger continuously
          const dragDistance = Math.abs(gestureState.dx);
          const newTranslateX = PANEL_WIDTH - dragDistance;
          const newTabTranslateX = -dragDistance;
          translateX.setValue(newTranslateX);
          tabTranslateX.setValue(newTabTranslateX);
        } else if (gestureState.dx > 0 && isOpen) {
          // Closing: Panel and tab follow finger as it closes
          const dragDistance = gestureState.dx;
          const newTranslateX = dragDistance;
          const newTabTranslateX = -PANEL_WIDTH + dragDistance;
          translateX.setValue(newTranslateX);
          tabTranslateX.setValue(newTabTranslateX);
        }
      },

      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx } = gestureState;
        const velocity = Math.abs(vx);
        const distance = Math.abs(dx);

        // Handle tap (small movement)
        if (distance < 5) {
          if (isOpen) {
            closePanel();
          } else if (Platform.OS === 'android') {
            // Android: Allow tap to open
            openPanel();
          }
          // iOS: Don't open on tap - only swipe
          return;
        }

        if (!isOpen) {
          // Opening logic
          if ((velocity > VELOCITY_THRESHOLD && dx < 0) || (dx < 0 && distance > DISTANCE_THRESHOLD)) {
            openPanel();
          } else {
            // Snap back to closed
            Animated.parallel([
              Animated.spring(translateX, {
                toValue: PANEL_WIDTH,
                useNativeDriver: true,
                velocity: vx,
                tension: 100,
                friction: 8,
              }),
              Animated.spring(tabTranslateX, {
                toValue: 0,
                useNativeDriver: true,
                velocity: vx,
                tension: 100,
                friction: 8,
              }),
            ]).start(() => {
              // Force tab to final position to fix iOS production build bug
              tabTranslateX.setValue(0);
            });
          }
        } else {
          // Closing logic
          if ((velocity > VELOCITY_THRESHOLD && dx > 0) || (dx > 0 && distance > DISTANCE_THRESHOLD)) {
            closePanel();
          } else {
            // Snap back to open
            Animated.parallel([
              Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
                velocity: -vx,
                tension: 100,
                friction: 8,
              }),
              Animated.spring(tabTranslateX, {
                toValue: -PANEL_WIDTH,
                useNativeDriver: true,
                velocity: -vx,
                tension: 100,
                friction: 8,
              }),
            ]).start(() => {
              // Force tab to final position to fix iOS production build bug
              tabTranslateX.setValue(-PANEL_WIDTH);
            });
          }
        }
      },
    })
  ).current;

  const showInlineSuccess = (type: TabType) => {
    setSubmittedState(type);
    Animated.timing(successOpacity, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Auto-close after 1.6s
    setTimeout(() => {
      closePanel();
    }, 1600);
  };

  const handleRatingSubmit = async () => {
    if (rating === 5) {
      const appStoreUrl = Platform.OS === 'ios'
        ? 'https://apps.apple.com/au/app/json-09d4ce/id6758357834?action=write-review'
        : 'https://play.google.com/store/apps/details?id=YOUR_PACKAGE_ID';

      Linking.openURL(appStoreUrl).catch(err =>
        console.error('Failed to open app store:', err)
      );
      closePanel();
    } else {
      const feedbackEntry = {
        type: 'rating',
        rating: rating,
        message: feedback,
        timestamp: new Date().toISOString(),
        device: Platform.OS,
      };

      try {
        const existingFeedback = await AsyncStorage.getItem('userFeedback');
        const feedbackArray = existingFeedback ? JSON.parse(existingFeedback) : [];
        feedbackArray.push(feedbackEntry);
        await AsyncStorage.setItem('userFeedback', JSON.stringify(feedbackArray));

        sendRatingFeedback(rating, feedback).catch(error => {
          console.log('Failed to send rating to server:', error);
        });

        showInlineSuccess('rating');
      } catch (error) {
        console.error('Failed to save rating:', error);
        Alert.alert('Error', 'Failed to submit rating. Please try again.');
      }
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) {
      Alert.alert('Please enter your feedback');
      return;
    }

    const feedbackEntry = {
      type: activeTab,
      message: feedback,
      timestamp: new Date().toISOString(),
      device: Platform.OS,
    };

    try {
      const existingFeedback = await AsyncStorage.getItem('userFeedback');
      const feedbackArray = existingFeedback ? JSON.parse(existingFeedback) : [];
      feedbackArray.push(feedbackEntry);
      await AsyncStorage.setItem('userFeedback', JSON.stringify(feedbackArray));

      if (activeTab === 'bug') {
        sendBugReport(feedback, 'medium').catch(error => {
          console.log('Failed to send bug report to server:', error);
        });
      } else if (activeTab === 'feature') {
        sendFeatureRequest(feedback, 'medium').catch(error => {
          console.log('Failed to send feature request to server:', error);
        });
      }

      showInlineSuccess(activeTab);
    } catch (error) {
      console.error('Failed to save feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    }
  };

  // Don't render if on payment screen
  if (isPaymentScreen) {
    return null;
  }

  const TABS: { key: TabType; icon: string; label: string }[] = [
    { key: 'rating', icon: 'star-outline', label: 'Rate' },
    { key: 'bug', icon: 'bug-outline', label: 'Bug' },
    { key: 'feature', icon: 'bulb-outline', label: 'Feature' },
  ];

  return (
    <>
      {/* Tab — always visible, moves with panel — DO NOT TOUCH LOGIC */}
      <Animated.View
        style={[
          styles.floatingTab,
          { transform: [{ translateX: tabTranslateX }] }
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.tabTouchArea}>
          <View
            style={[
              styles.tabIndicator,
              {
                backgroundColor: currentThemeColor,
                shadowColor: currentThemeColor,
              },
            ]}
          />
        </View>
      </Animated.View>

      {/* Background overlay - tap to close */}
      {isOpen && (
        <TouchableOpacity
          style={styles.overlay}
          onPress={closePanel}
          activeOpacity={1}
        />
      )}

      {/* Panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            transform: [{ translateX }],
          },
        ]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerLabel}>FEEDBACK</Text>
                <Text style={styles.title}>How's the app?</Text>
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => {
                    const newThemeState = !currentThemeState;
                    setLocalThemeState(newThemeState);
                    setIsPinkTheme(newThemeState);
                  }}
                  style={({ pressed }) => [
                    styles.colorToggle,
                    {
                      borderColor: hexA(currentThemeColor, 0.5),
                      backgroundColor: hexA(currentThemeColor, 0.15),
                    },
                    pressed && { opacity: 0.7 }
                  ]}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <View
                    style={[
                      styles.colorIndicator,
                      { backgroundColor: currentThemeColor }
                    ]}
                  />
                </Pressable>
                <TouchableOpacity
                  onPress={closePanel}
                  style={styles.closeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={18} color="#9898a4" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Segmented Tabs */}
            <View style={styles.tabsContainer}>
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={styles.tabItem}
                    onPress={() => {
                      setActiveTab(tab.key);
                      setFeedback('');
                      setRating(0);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tabItemInner}>
                      <Ionicons
                        name={tab.icon as any}
                        size={14}
                        color={isActive ? currentThemeColor : '#55555f'}
                      />
                      <Text
                        style={[
                          styles.tabLabel,
                          isActive && { color: currentThemeColor },
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </View>
                    {isActive && (
                      <View
                        style={[
                          styles.tabIndicatorUnderline,
                          { backgroundColor: currentThemeColor },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Inline success overlay (covers form content when active) */}
            {submittedState && (
              <Animated.View style={[styles.successCard, { opacity: successOpacity }]}>
                <View
                  style={[
                    styles.successIcon,
                    {
                      backgroundColor: hexA(currentThemeColor, 0.15),
                      borderColor: hexA(currentThemeColor, 0.4),
                    },
                  ]}
                >
                  <Ionicons name="checkmark" size={28} color={currentThemeColor} />
                </View>
                <Text style={styles.successTitle}>
                  {submittedState === 'rating' && 'Thanks for the feedback'}
                  {submittedState === 'bug' && "We'll look into it"}
                  {submittedState === 'feature' && 'Got it'}
                </Text>
                <Text style={styles.successSubtitle}>
                  {submittedState === 'rating' && 'Your feedback helps us improve.'}
                  {submittedState === 'bug' && 'Thanks for reporting this bug.'}
                  {submittedState === 'feature' && 'Your suggestion has been noted.'}
                </Text>
              </Animated.View>
            )}

            {/* Form content */}
            {!submittedState && (
              <View style={styles.formContent}>
                {activeTab === 'rating' && (
                  <>
                    <Text style={styles.question}>How would you rate the app?</Text>

                    <View style={styles.starsCard}>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity
                            key={star}
                            onPress={() => setRating(star)}
                            style={styles.starButton}
                            activeOpacity={0.6}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          >
                            <Ionicons
                              name={star <= rating ? 'star' : 'star-outline'}
                              size={32}
                              color={star <= rating ? currentThemeColor : '#3a3a44'}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                      {rating > 0 && (
                        <Text style={[styles.starsLabel, { color: currentThemeColor }]}>
                          {rating === 1 && 'Not great'}
                          {rating === 2 && 'Could be better'}
                          {rating === 3 && 'It\'s okay'}
                          {rating === 4 && 'Pretty good'}
                          {rating === 5 && 'Love it'}
                        </Text>
                      )}
                    </View>

                    {rating > 0 && rating < 5 && (
                      <View style={styles.followUpSection}>
                        <Text style={styles.label}>WHAT CAN WE IMPROVE?</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Tell us more..."
                          placeholderTextColor="#3a3a44"
                          value={feedback}
                          onChangeText={setFeedback}
                          multiline
                          maxLength={500}
                        />
                        <Text style={styles.charCount}>{feedback.length} / 500</Text>
                      </View>
                    )}

                    {rating === 5 && (
                      <View
                        style={[
                          styles.appStoreCard,
                          {
                            backgroundColor: hexA(currentThemeColor, 0.05),
                            borderColor: hexA(currentThemeColor, 0.3),
                          },
                        ]}
                      >
                        <Ionicons name="sparkles" size={18} color={currentThemeColor} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.appStoreTitle, { color: currentThemeColor }]}>
                            Love JSON.fit?
                          </Text>
                          <Text style={styles.appStoreSubtitle}>
                            Help others discover it with a quick review.
                          </Text>
                        </View>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        {
                          backgroundColor: rating === 0 ? '#0a0a0f' : currentThemeColor,
                          borderWidth: rating === 0 ? 1 : 0,
                          borderColor: 'rgba(255,255,255,0.06)',
                        },
                      ]}
                      onPress={handleRatingSubmit}
                      disabled={rating === 0}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.submitButtonText,
                          { color: rating === 0 ? '#55555f' : '#000' },
                        ]}
                      >
                        {rating === 5 ? 'Rate on App Store' : 'Submit feedback'}
                      </Text>
                      {rating > 0 && (
                        <Ionicons
                          name={rating === 5 ? 'open-outline' : 'arrow-forward'}
                          size={16}
                          color="#000"
                        />
                      )}
                    </TouchableOpacity>
                  </>
                )}

                {(activeTab === 'bug' || activeTab === 'feature') && (
                  <>
                    <Text style={styles.question}>
                      {activeTab === 'bug'
                        ? 'What issue are you experiencing?'
                        : 'What feature would you like to see?'}
                    </Text>

                    <TextInput
                      style={[styles.input, styles.largeInput]}
                      placeholder={
                        activeTab === 'bug'
                          ? 'Describe the bug — what happened, what you expected, steps to reproduce...'
                          : 'Describe your feature idea — what should it do, why it would help...'
                      }
                      placeholderTextColor="#3a3a44"
                      value={feedback}
                      onChangeText={setFeedback}
                      multiline
                      maxLength={500}
                    />

                    <Text style={styles.charCount}>{feedback.length} / 500</Text>

                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        {
                          backgroundColor: !feedback.trim() ? '#0a0a0f' : currentThemeColor,
                          borderWidth: !feedback.trim() ? 1 : 0,
                          borderColor: 'rgba(255,255,255,0.06)',
                        },
                      ]}
                      onPress={handleFeedbackSubmit}
                      disabled={!feedback.trim()}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.submitButtonText,
                          { color: !feedback.trim() ? '#55555f' : '#000' },
                        ]}
                      >
                        Submit {activeTab === 'bug' ? 'bug report' : 'feature request'}
                      </Text>
                      {feedback.trim() && (
                        <Ionicons name="arrow-forward" size={16} color="#000" />
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  // ── Pull-tab (visual tweaks only, position/sizing preserved) ─────
  floatingTab: {
    position: 'absolute',
    right: 0,
    top: '45%',
    zIndex: 1000,
  },
  tabTouchArea: {
    padding: 5,
  },
  tabIndicator: {
    width: 12,
    height: 60,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },

  // ── Panel ────────────────────────────────────────────────────────
  panel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: '#000',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.05)',
    zIndex: 2001,
    shadowColor: '#000',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 15,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // ── Header ───────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  headerLabel: {
    color: '#55555f',
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f0f0f2',
    letterSpacing: -0.4,
    fontFamily: 'Outfit-Bold',
    lineHeight: 28,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorToggle: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Segmented tabs ───────────────────────────────────────────────
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    position: 'relative',
  },
  tabItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabLabel: {
    color: '#55555f',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
    letterSpacing: -0.1,
  },
  tabIndicatorUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 2,
  },

  // ── Form content ─────────────────────────────────────────────────
  formContent: {
    flex: 1,
  },
  question: {
    fontSize: 15,
    fontWeight: '500',
    color: '#f0f0f2',
    marginBottom: 14,
    fontFamily: 'Outfit-Medium',
    letterSpacing: -0.1,
    lineHeight: 21,
  },

  // ── Stars row ────────────────────────────────────────────────────
  starsCard: {
    backgroundColor: '#0a0a0f',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 22,
    paddingHorizontal: 16,
    marginBottom: 18,
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  starButton: {
    padding: 2,
  },
  starsLabel: {
    fontSize: 11,
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
    marginTop: 12,
  },

  // ── Inputs ───────────────────────────────────────────────────────
  followUpSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    color: '#9898a4',
    marginBottom: 8,
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
  },
  input: {
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    color: '#f0f0f2',
    fontSize: 14,
    minHeight: 100,
    marginBottom: 6,
    textAlignVertical: 'top',
    fontFamily: 'Outfit-Regular',
    lineHeight: 20,
  },
  largeInput: {
    minHeight: 180,
  },
  charCount: {
    fontSize: 10,
    color: '#3a3a44',
    textAlign: 'right',
    marginBottom: 20,
    letterSpacing: 0.5,
    fontFamily: 'DMMono-Regular',
  },

  // ── 5-star App Store invitation ──────────────────────────────────
  appStoreCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  appStoreTitle: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  appStoreSubtitle: {
    fontSize: 12,
    color: '#9898a4',
    fontFamily: 'Outfit-Regular',
    lineHeight: 16,
  },

  // ── Submit button ────────────────────────────────────────────────
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginTop: 'auto',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    fontFamily: 'Outfit-SemiBold',
  },

  // ── Inline success state ─────────────────────────────────────────
  successCard: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f0f0f2',
    fontFamily: 'Outfit-SemiBold',
    letterSpacing: -0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 13,
    color: '#9898a4',
    fontFamily: 'Outfit-Regular',
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  // ── Overlay ──────────────────────────────────────────────────────
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 2000,
  },
});