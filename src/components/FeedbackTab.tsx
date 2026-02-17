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
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
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

export function FeedbackTab() {
  const { themeColor } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('rating');
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);

  // Hide feedback tab on payment screen
  const navigationState = useNavigationState(state => state);
  const currentRoute = navigationState?.routes?.[navigationState.index];
  const isPaymentScreen = currentRoute?.name === 'Payment';

  // SINGLE ANIMATION SYSTEM
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
      setIsOpen(false);
      setFeedback('');
      setRating(0);
      setActiveTab('rating');
    });
  };

  // WORKING PANRESPONDER - EXACTLY LIKE ORIGINAL
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
        
        Alert.alert(
          'Thank you!',
          'Your feedback helps us improve.',
          [{ text: 'OK', onPress: closePanel }]
        );
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
      
      Alert.alert(
        'Thank you!',
        activeTab === 'bug' ? 'We\'ll look into this issue.' : 'Your suggestion has been noted.',
        [{ text: 'OK', onPress: closePanel }]
      );
    } catch (error) {
      console.error('Failed to save feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    }
  };

  // Don't render if on payment screen
  if (isPaymentScreen) {
    return null;
  }

  return (
    <>
      {/* Tab - always visible, moves with panel */}
      <Animated.View 
        style={[
          styles.floatingTab, 
          { transform: [{ translateX: tabTranslateX }] }
        ]} 
        {...panResponder.panHandlers}
      >
        <View style={styles.tabTouchArea}>
          <View style={[styles.tabIndicator, { backgroundColor: themeColor }]} />
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
              <Text style={styles.title}>Feedback</Text>
              <TouchableOpacity onPress={closePanel} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#71717a" />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
              {[
                { key: 'rating', icon: 'star', label: 'Rate' },
                { key: 'bug', icon: 'bug', label: 'Bug' },
                { key: 'feature', icon: 'bulb', label: 'Feature' },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabButton,
                    activeTab === tab.key && { ...styles.tabButtonActive, backgroundColor: themeColor }
                  ]}
                  onPress={() => {
                    setActiveTab(tab.key as TabType);
                    setFeedback('');
                    setRating(0);
                  }}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={20}
                    color={activeTab === tab.key ? '#ffffff' : '#d4d4d8'}
                  />
                  <Text style={[
                    styles.tabLabel,
                    activeTab === tab.key && styles.tabLabelActive
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Content */}
            <View style={styles.formContent}>
              {activeTab === 'rating' && (
                <>
                  <Text style={styles.question}>How would you rate the app?</Text>
                  
                  <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setRating(star)}
                        style={styles.star}
                      >
                        <Ionicons
                          name={star <= rating ? 'star' : 'star-outline'}
                          size={32}
                          color={star <= rating ? themeColor : '#3f3f46'}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  {rating > 0 && rating < 5 && (
                    <>
                      <Text style={styles.label}>What can we improve?</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Tell us more..."
                        placeholderTextColor="#52525b"
                        value={feedback}
                        onChangeText={setFeedback}
                        multiline
                        maxLength={500}
                      />
                      <Text style={styles.charCount}>{feedback.length} / 500</Text>
                    </>
                  )}

                  {rating === 5 && (
                    <Text style={[styles.appStoreText, { color: themeColor }]}>
                      Glad you love it! Tap below to rate us on the App Store.
                    </Text>
                  )}

                  <TouchableOpacity
                    style={{
                      paddingVertical: 16,
                      borderRadius: 12,
                      alignItems: 'center',
                      marginTop: 'auto',
                      backgroundColor: rating === 0 ? '#18181b' : themeColor,
                      opacity: rating === 0 ? 0.3 : 1,
                    }}
                    onPress={handleRatingSubmit}
                    disabled={rating === 0}
                  >
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: rating === 0 ? '#52525b' : '#ffffff',
                    }}>
                      {rating === 5 ? 'Rate on App Store' : 'Submit Feedback'}
                    </Text>
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
                        ? 'Describe the bug...'
                        : 'Describe your feature idea...'
                    }
                    placeholderTextColor="#52525b"
                    value={feedback}
                    onChangeText={setFeedback}
                    multiline
                    maxLength={500}
                  />
                  
                  <Text style={styles.charCount}>{feedback.length} / 500</Text>

                  <TouchableOpacity
                    style={{
                      paddingVertical: 16,
                      borderRadius: 12,
                      alignItems: 'center',
                      marginTop: 'auto',
                      backgroundColor: !feedback.trim() ? '#18181b' : themeColor,
                      opacity: !feedback.trim() ? 0.3 : 1,
                    }}
                    onPress={handleFeedbackSubmit}
                    disabled={!feedback.trim()}
                  >
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: !feedback.trim() ? '#52525b' : '#ffffff',
                    }}>
                      Submit {activeTab === 'bug' ? 'Bug Report' : 'Feature Request'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
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
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 5,
  },
  panel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: '#0a0a0b',
    zIndex: 2001,
    shadowColor: '#000',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
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
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#27272a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  tabButtonActive: {
    borderColor: 'transparent',
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d4d4d8',
  },
  tabLabelActive: {
    color: '#ffffff',
  },
  formContent: {
    flex: 1,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 24,
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    backgroundColor: '#18181b',
    borderRadius: 12,
    marginBottom: 24,
  },
  star: {
    padding: 4,
  },
  label: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 15,
    minHeight: 100,
    marginBottom: 8,
    textAlignVertical: 'top',
  },
  largeInput: {
    minHeight: 180,
  },
  charCount: {
    fontSize: 12,
    color: '#52525b',
    textAlign: 'right',
    marginBottom: 24,
  },
  appStoreText: {
    fontSize: 15,
    textAlign: 'center',
    marginVertical: 20,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 'auto',
  },
  buttonDisabled: {
    backgroundColor: '#18181b',
    opacity: 0.3,
  },
  buttonEnabled: {
    opacity: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonTextDisabled: {
    color: '#52525b',
  },
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