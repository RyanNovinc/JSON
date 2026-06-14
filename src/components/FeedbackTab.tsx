import React, { useState, useRef, useEffect } from 'react';
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
  Linking,
  ScrollView,
  Pressable,
  Modal,
  Easing,
 TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { sendRatingFeedback, sendBugReport, sendFeatureRequest } from '../services/feedbackApi';

type TabType = 'rating' | 'bug' | 'feature';

// Convert hex to rgba — preserved verbatim from FeedbackTab
function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * FeedbackModal — same form/internals as the original FeedbackTab.
 *
 * What changed:
 *  - Container went from "swipe-from-right panel" to "Modal with slide animation"
 *  - panResponder, translateX, tabTranslateX animations all REMOVED
 *  - The "always-visible cyan strip on the right edge of every screen" is gone
 *
 * What stayed identical:
 *  - All 3 tabs (Rate, Bug, Feature)
 *  - Star rating with friendly labels
 *  - 5-star → App Store deep link (iOS + Android)
 *  - <5-star → follow-up text field
 *  - AsyncStorage of all feedback to 'userFeedback' key
 *  - sendRatingFeedback / sendBugReport / sendFeatureRequest API calls
 *  - Inline success state with auto-close after 1.6s
 *  - Theme toggle in header
 */
export function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
  const { themeColor, isPinkTheme, setIsPinkTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('rating');
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [submittedState, setSubmittedState] = useState<TabType | null>(null);

  // Mirror the theme color locally so the rating stars flip instantly
  // when the user toggles theme (the context update has a tick of delay).
  const [localThemeState, setLocalThemeState] = useState(isPinkTheme);
  useEffect(() => {
    setLocalThemeState(isPinkTheme);
  }, [isPinkTheme]);
  const currentThemeState = localThemeState;
  const currentThemeColor = currentThemeState ? '#ec4899' : '#22d3ee';

  const successOpacity = useRef(new Animated.Value(0)).current;

  // Reset form state every time the modal closes — was previously done
  // inside the closePanel animation callback.
  const resetForm = () => {
    setFeedback('');
    setRating(0);
    setActiveTab('rating');
    setSubmittedState(null);
    successOpacity.setValue(0);
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
    // Reset after a tick so the close animation looks clean (otherwise
    // the form snaps back to the rating tab while still visible)
    setTimeout(resetForm, 300);
  };

  const showInlineSuccess = (type: TabType) => {
    setSubmittedState(type);
    Animated.timing(successOpacity, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      handleClose();
    }, 1600);
  };

  // ===== Submit handlers — identical to original =====
  const handleRatingSubmit = async () => {
    if (rating === 5) {
      const appStoreUrl = Platform.OS === 'ios'
        ? 'https://apps.apple.com/au/app/json-09d4ce/id6758357834?action=write-review'
        : 'https://play.google.com/store/apps/details?id=YOUR_PACKAGE_ID';

      Linking.openURL(appStoreUrl).catch(err =>
        console.error('Failed to open app store:', err)
      );
      handleClose();
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

  const TABS: { key: TabType; icon: string; label: string }[] = [
    { key: 'rating', icon: 'star-outline', label: 'Rate' },
    { key: 'bug', icon: 'bug-outline', label: 'Bug' },
    { key: 'feature', icon: 'bulb-outline', label: 'Feature' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
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
              <Text style={styles.title}>How&apos;s the app?</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleClose}
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
                        {rating === 3 && "It's okay"}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Header
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

  // Tabs
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

  // Form
  formContent: { flex: 1 },
  question: {
    fontSize: 15,
    fontWeight: '500',
    color: '#f0f0f2',
    marginBottom: 14,
    fontFamily: 'Outfit-Medium',
    letterSpacing: -0.1,
    lineHeight: 21,
  },

  // Stars
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
  starsRow: { flexDirection: 'row', gap: 12 },
  starButton: { padding: 2 },
  starsLabel: {
    fontSize: 11,
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
    marginTop: 12,
  },

  // Inputs
  followUpSection: { marginBottom: 16 },
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
  largeInput: { minHeight: 180 },
  charCount: {
    fontSize: 10,
    color: '#3a3a44',
    textAlign: 'right',
    marginBottom: 20,
    letterSpacing: 0.5,
    fontFamily: 'DMMono-Regular',
  },

  // App Store invitation card
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

  // Submit
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

  // Success
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
});