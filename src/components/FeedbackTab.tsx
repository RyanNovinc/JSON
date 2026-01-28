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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = SCREEN_WIDTH * 0.9;
const VELOCITY_THRESHOLD = 500; // Minimum velocity to trigger open
const DISTANCE_THRESHOLD = 30; // Minimum distance to trigger open

type TabType = 'rating' | 'bug' | 'feature';

export function FeedbackTab() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('rating');
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);

  const translateX = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const tabTranslateX = useRef(new Animated.Value(0)).current;

  // Hide feedback tab on payment screen
  const navigationState = useNavigationState(state => state);
  const currentRoute = navigationState?.routes?.[navigationState.index];
  const isPaymentScreen = currentRoute?.name === 'Payment';

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
      setIsOpen(false);
      setFeedback('');
      setRating(0);
      setActiveTab('rating');
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isDragging = Math.abs(gestureState.dx) > 5;
        // For closing, be more sensitive to right swipes
        if (isOpen && gestureState.dx > 3) {
          return true;
        }
        // For opening, be sensitive to left swipes
        if (!isOpen && gestureState.dx < -5) {
          return true;
        }
        return isDragging;
      },
      
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0 && !isOpen) {
          // Opening: Panel and tab follow finger continuously
          const dragDistance = Math.abs(gestureState.dx);
          const newTranslateX = Math.max(0, PANEL_WIDTH - dragDistance);
          const newTabTranslateX = Math.min(0, -dragDistance);
          translateX.setValue(newTranslateX);
          tabTranslateX.setValue(newTabTranslateX);
        } else if (gestureState.dx > 0 && isOpen) {
          // Closing: Panel and tab follow finger smoothly - REAL TIME
          console.log('CLOSING DRAG:', gestureState.dx, 'isOpen:', isOpen);
          const dragDistance = gestureState.dx;
          const newTranslateX = Math.min(PANEL_WIDTH, dragDistance);
          const newTabTranslateX = Math.max(-PANEL_WIDTH, -PANEL_WIDTH + dragDistance);
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
          } else {
            openPanel();
          }
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
            ]).start();
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
        const existingFeedback = await AsyncStorage.getItem('userFeedback');
        const feedbackArray = existingFeedback ? JSON.parse(existingFeedback) : [];
        feedbackArray.push(feedbackEntry);
        await AsyncStorage.setItem('userFeedback', JSON.stringify(feedbackArray));
        
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
          <View style={styles.tabIndicator} />
        </View>
      </Animated.View>


      {/* Panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            transform: [{ translateX }],
          },
        ]}
        pointerEvents={isOpen ? 'auto' : 'none'}
        {...(isOpen ? panResponder.panHandlers : {})}
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
                    activeTab === tab.key && styles.tabButtonActive
                  ]}
                  onPress={() => {
                    setActiveTab(tab.key as TabType);
                    setFeedback('');
                    setRating(0);
                  }}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={16}
                    color={activeTab === tab.key ? '#ffffff' : '#71717a'}
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
                    style={[
                      styles.button,
                      rating === 0 && styles.buttonDisabled
                    ]}
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
                    style={[
                      styles.button,
                      !feedback.trim() && styles.buttonDisabled
                    ]}
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
    padding: 5, // Add some padding for better touch area
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 2000,
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