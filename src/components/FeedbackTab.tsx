import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigationState } from '@react-navigation/native';
import { sendRatingFeedback, sendBugReport, sendFeatureRequest } from '../services/feedbackApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = SCREEN_WIDTH * 0.9;

type TabType = 'rating' | 'bug' | 'feature';

export function FeedbackTab() {
  const [activeTab, setActiveTab] = useState<TabType>('rating');
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);

  // Hide feedback tab on payment screen
  const navigationState = useNavigationState(state => state);
  const currentRoute = navigationState?.routes?.[navigationState.index];
  const isPaymentScreen = currentRoute?.name === 'Payment';

  // SIMPLE ANIMATION SYSTEM - ONE SET OF VALUES
  const panelX = useRef(new Animated.Value(PANEL_WIDTH)).current; // Panel position
  const tabX = useRef(new Animated.Value(0)).current; // Tab position

  // SIMPLE STATE
  const [isOpen, setIsOpen] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // SIMPLE OPEN/CLOSE FUNCTIONS
  const openPanel = () => {
    setIsOpen(true);
    Animated.parallel([
      Animated.spring(panelX, { toValue: 0, useNativeDriver: false, tension: 100, friction: 8 }),
      Animated.spring(tabX, { toValue: -PANEL_WIDTH, useNativeDriver: false, tension: 100, friction: 8 }),
    ]).start();
  };

  const closePanel = () => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.spring(panelX, { toValue: PANEL_WIDTH, useNativeDriver: false, tension: 100, friction: 8 }),
      Animated.spring(tabX, { toValue: 0, useNativeDriver: false, tension: 100, friction: 8 }),
    ]).start(() => {
      setIsOpen(false);
      setFeedback('');
      setRating(0);
      setActiveTab('rating');
    });
  };

  // PROVEN PANRESPONDER PATTERN FROM RESEARCH
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes > 10px
        const shouldRespond = Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 80;
        if (shouldRespond) {
          setScrollEnabled(false); // DISABLE SCROLL IMMEDIATELY
        }
        return shouldRespond;
      },

      onPanResponderMove: (_, gestureState) => {
        const { dx } = gestureState;

        if (!isOpen && dx < 0) {
          // OPENING: Follow finger from right edge
          const newPosition = PANEL_WIDTH + dx;
          const clampedPosition = Math.max(0, newPosition);
          panelX.setValue(clampedPosition);
          tabX.setValue(dx);
        } else if (isOpen && dx > 0) {
          // CLOSING: Follow finger from left edge  
          panelX.setValue(dx);
          tabX.setValue(-PANEL_WIDTH + dx);
        }
      },

      onPanResponderRelease: (_, gestureState) => {
        setScrollEnabled(true); // RE-ENABLE SCROLL
        const { dx, vx } = gestureState;
        const velocity = Math.abs(vx);
        const distance = Math.abs(dx);

        if (!isOpen) {
          // OPENING LOGIC: Velocity > 0.5 OR distance > 1/3 panel width
          if ((velocity > 0.5 && dx < 0) || distance > PANEL_WIDTH / 3) {
            openPanel();
          } else {
            // Snap back to closed
            Animated.parallel([
              Animated.spring(panelX, { toValue: PANEL_WIDTH, useNativeDriver: false }),
              Animated.spring(tabX, { toValue: 0, useNativeDriver: false }),
            ]).start();
          }
        } else {
          // CLOSING LOGIC: Velocity > 0.5 OR distance > 1/3 panel width
          if ((velocity > 0.5 && dx > 0) || distance > PANEL_WIDTH / 3) {
            closePanel();
          } else {
            // Snap back to open
            Animated.parallel([
              Animated.spring(panelX, { toValue: 0, useNativeDriver: false }),
              Animated.spring(tabX, { toValue: -PANEL_WIDTH, useNativeDriver: false }),
            ]).start();
          }
        }
      },
    })
  ).current;

  const handleRatingSubmit = async () => {
    if (rating === 5) {
      const appStoreUrl = Platform.OS === 'ios' 
        ? 'https://apps.apple.com/app/idYOUR_APP_ID'
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
        // Save locally
        const existingFeedback = await AsyncStorage.getItem('userFeedback');
        const feedbackArray = existingFeedback ? JSON.parse(existingFeedback) : [];
        feedbackArray.push(feedbackEntry);
        await AsyncStorage.setItem('userFeedback', JSON.stringify(feedbackArray));
        
        // Send to AWS (non-blocking)
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
      // Save locally
      const existingFeedback = await AsyncStorage.getItem('userFeedback');
      const feedbackArray = existingFeedback ? JSON.parse(existingFeedback) : [];
      feedbackArray.push(feedbackEntry);
      await AsyncStorage.setItem('userFeedback', JSON.stringify(feedbackArray));
      
      // Send to AWS (non-blocking)
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
      {/* BLUE TAB - ALWAYS VISIBLE */}
      <Animated.View 
        style={[styles.floatingTab, { transform: [{ translateX: tabX }] }]} 
        {...panResponder.panHandlers}
      >
        <TouchableOpacity style={styles.tabTouchArea} onPress={openPanel}>
          <View style={styles.tabIndicator} />
        </TouchableOpacity>
      </Animated.View>

      {/* FEEDBACK PANEL */}
      <Animated.View
        style={[styles.panel, { transform: [{ translateX: panelX }] }]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.content}
            scrollEnabled={scrollEnabled}
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
                  style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
                  onPress={() => {
                    setActiveTab(tab.key as TabType);
                    setFeedback('');
                    setRating(0);
                  }}
                >
                  <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.key ? '#ffffff' : '#71717a'} />
                  <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
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
                      <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.star}>
                        <Ionicons
                          name={star <= rating ? 'star' : 'star-outline'}
                          size={32}
                          color={star <= rating ? '#22d3ee' : '#3f3f46'}
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
                    <Text style={styles.appStoreText}>
                      Glad you love it! Tap below to rate us on the App Store.
                    </Text>
                  )}

                  <TouchableOpacity
                    style={[styles.button, rating === 0 && styles.buttonDisabled]}
                    onPress={handleRatingSubmit}
                    disabled={rating === 0}
                  >
                    <Text style={styles.buttonText}>
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
                    style={[styles.button, !feedback.trim() && styles.buttonDisabled]}
                    onPress={handleFeedbackSubmit}
                    disabled={!feedback.trim()}
                  >
                    <Text style={styles.buttonText}>
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
    backgroundColor: '#22d3ee',
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
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#18181b',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#22d3ee',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717a',
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
    color: '#22d3ee',
    textAlign: 'center',
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#22d3ee',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 'auto',
  },
  buttonDisabled: {
    backgroundColor: '#18181b',
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
});