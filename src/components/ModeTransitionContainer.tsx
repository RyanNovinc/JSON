import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useAppMode } from '../contexts/AppModeContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import HomeScreen from '../screens/HomeScreen';
import NutritionHomeScreen from '../screens/NutritionHomeScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3; // 30% of screen width to trigger transition
const SWIPE_VELOCITY_THRESHOLD = 800; // Velocity threshold for quick swipes

export default function ModeTransitionContainer({ route, navigation }: any) {
  const { appMode, setAppMode, isTransitioning, setIsTransitioning } = useAppMode();
  const nav = useNavigation();
  
  
  
  // Animated value for the container position
  // 0 = workout screen visible, -SCREEN_WIDTH = nutrition screen visible
  const translateX = useRef(new Animated.Value(appMode === 'training' ? 0 : -SCREEN_WIDTH)).current;
  const gestureTranslateX = useRef(new Animated.Value(0)).current;
  
  // Combined translation for smooth gesture + animated transitions
  const combinedTranslateX = useRef(
    Animated.add(translateX, gestureTranslateX)
  ).current;
  
  // Create an animated value that represents the transition progress (0 = workout, 1 = nutrition)
  const transitionProgress = useRef(new Animated.Value(appMode === 'training' ? 0 : 1)).current;

  // Update position when app mode changes programmatically (from button taps)
  useEffect(() => {
    const toValue = appMode === 'training' ? 0 : -SCREEN_WIDTH;
    const progressValue = appMode === 'training' ? 0 : 1;
    
    
    
    // Reset gesture offset to prevent state confusion
    gestureTranslateX.setValue(0);
    
    // Force immediate state update for instant visual feedback
    translateX.setValue(toValue);
    transitionProgress.setValue(progressValue);
    
    // Then animate smoothly
    Animated.parallel([
      Animated.spring(translateX, {
        toValue,
        useNativeDriver: true,
        tension: 120,
        friction: 25,
      }),
      Animated.spring(transitionProgress, {
        toValue: progressValue,
        useNativeDriver: true,
        tension: 120,
        friction: 25,
      }),
    ]).start((finished) => {
      // Only clear transition state if animation actually completed successfully
      if (finished) {
        setIsTransitioning(false);
      } else {
        // Force clear anyway after a short delay to prevent getting stuck
        setTimeout(() => setIsTransitioning(false), 100);
      }
    });
  }, [appMode]);

  // Fix initialization sync issue - ensure animated values match app mode on mount
  useEffect(() => {
    const correctTranslateValue = appMode === 'training' ? 0 : -SCREEN_WIDTH;
    const correctProgressValue = appMode === 'training' ? 0 : 1;
    
    
    // Set values immediately without animation on mount to fix sync issues
    translateX.setValue(correctTranslateValue);
    transitionProgress.setValue(correctProgressValue);
    gestureTranslateX.setValue(0);
    setIsTransitioning(false);
  }, [appMode]); // Run whenever appMode changes!

  const onGestureEvent = (event: any) => {
    const { translationX } = event.nativeEvent;
    
    // Calculate the current base position
    const basePosition = appMode === 'training' ? 0 : -SCREEN_WIDTH;
    
    // Clamp the translation to prevent over-scrolling
    let clampedTranslation = translationX;
    
    if (appMode === 'training') {
      // In workout mode, can only swipe left (negative values)
      clampedTranslation = Math.max(translationX, -SCREEN_WIDTH);
      clampedTranslation = Math.min(clampedTranslation, 0);
      
      // Update transition progress based on swipe (0 to 1)
      const progress = Math.abs(clampedTranslation) / SCREEN_WIDTH;
      transitionProgress.setValue(progress);
    } else {
      // In nutrition mode, can only swipe right (positive values) 
      clampedTranslation = Math.min(translationX, SCREEN_WIDTH);
      clampedTranslation = Math.max(clampedTranslation, 0);
      
      // Update transition progress based on swipe (1 to 0)
      const progress = 1 - (clampedTranslation / SCREEN_WIDTH);
      transitionProgress.setValue(progress);
    }
    
    gestureTranslateX.setValue(clampedTranslation);
  };

  const onHandlerStateChange = (event: any) => {
    const { translationX, velocityX, state } = event.nativeEvent;
    
    if (state === State.END) {
      setIsTransitioning(true);
      
      let shouldSwitch = false;
      
      if (appMode === 'training') {
        // Check if should switch to nutrition (swipe left)
        shouldSwitch = translationX < -SWIPE_THRESHOLD || velocityX < -SWIPE_VELOCITY_THRESHOLD;
      } else {
        // Check if should switch to workout (swipe right)  
        shouldSwitch = translationX > SWIPE_THRESHOLD || velocityX > SWIPE_VELOCITY_THRESHOLD;
      }
      
      if (shouldSwitch) {
        // Complete the transition to the other mode
        const newMode = appMode === 'training' ? 'nutrition' : 'training';
        const targetValue = newMode === 'training' ? 0 : -SCREEN_WIDTH;
        const targetProgress = newMode === 'training' ? 0 : 1;
        
        // Update app mode immediately for instant toggle update
        setAppMode(newMode);
        
        // Animate the gesture offset to complete the transition
        const gestureTimestamp = new Date().toISOString();
        console.log(`👆 [${gestureTimestamp}] Gesture transition animation starting...`);
        console.log(`   - newMode: ${newMode}`);
        console.log(`   - targetValue: ${targetValue}`);
        console.log(`   - targetProgress: ${targetProgress}`);
        
        Animated.parallel([
          Animated.spring(gestureTranslateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 30,
          }),
          Animated.spring(translateX, {
            toValue: targetValue,
            useNativeDriver: true,
            tension: 100,
            friction: 30,
          }),
          Animated.spring(transitionProgress, {
            toValue: targetProgress,
            useNativeDriver: true,
            tension: 100,
            friction: 30,
          }),
        ]).start((finished) => {
          const gestureCompletionTimestamp = new Date().toISOString();
          console.log(`👆✅ [${gestureCompletionTimestamp}] Gesture animation callback fired!`);
          console.log(`   - finished: ${finished}`);
          
          if (finished) {
            console.log(`   - Gesture animation completed successfully`);
            setIsTransitioning(false);
          } else {
            console.warn(`⚠️ Gesture animation interrupted! Force clearing...`);
            setTimeout(() => setIsTransitioning(false), 100);
          }
        });
      } else {
        // Snap back to current mode
        const currentProgress = appMode === 'training' ? 0 : 1;
        
        console.log(`🔙 Snap back animation starting...`);
        Animated.parallel([
          Animated.spring(gestureTranslateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 30,
          }),
          Animated.spring(transitionProgress, {
            toValue: currentProgress,
            useNativeDriver: true,
            tension: 100,
            friction: 30,
          }),
        ]).start((finished) => {
          console.log(`🔙✅ Snap back animation callback fired! finished: ${finished}`);
          
          if (finished) {
            console.log(`   - Snap back completed successfully`);
            setIsTransitioning(false);
          } else {
            console.warn(`⚠️ Snap back animation interrupted! Force clearing...`);
            setTimeout(() => setIsTransitioning(false), 100);
          }
        });
      }
    }
  };

  return (
    <View style={styles.container}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 10]}
        failOffsetY={[-30, 30]}
        enabled={!isTransitioning}
      >
        <Animated.View
          style={[
            styles.screensContainer,
            {
              transform: [{ translateX: combinedTranslateX }],
            },
          ]}
        >
          {/* Workout Screen */}
          <View style={styles.screen}>
            <HomeScreen 
              navigation={navigation || nav} 
              route={route} 
              transitionProgress={transitionProgress}
            />
          </View>
          
          {/* Nutrition Screen */}
          <View style={styles.screen}>
            <NutritionHomeScreen 
              navigation={navigation || nav} 
              route={route}
              transitionProgress={transitionProgress}
            />
          </View>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
    overflow: 'hidden',
  },
  screensContainer: {
    flexDirection: 'row',
    width: SCREEN_WIDTH * 2,
    flex: 1,
  },
  screen: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
});