import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useActiveWorkout } from '../contexts/ActiveWorkoutContext';
import { navigate, getCurrentRoute } from '../utils/navigationRef';
import { useTheme } from '../contexts/ThemeContext';

export function FloatingWorkoutIndicator() {
  const { themeColor } = useTheme();
  const { activeWorkout } = useActiveWorkout();
  const [liveDuration, setLiveDuration] = useState(0);

  // Keep the timer running even when outside WorkoutLogScreen
  useEffect(() => {
    if (activeWorkout) {
      setLiveDuration(activeWorkout.duration);
      
      const interval = setInterval(() => {
        setLiveDuration(prev => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [activeWorkout?.duration]);

  // Don't show on the WorkoutLog screen if it's the SAME workout as the active one
  // Also don't show on AddExercise screen
  const currentRoute = getCurrentRoute();
  if (!activeWorkout) return null;
  
  // Hide on AddExercise screen
  if (currentRoute?.name === 'AddExercise') {
    return null;
  }
  
  // If we're on a WorkoutLog screen, check if it's the same workout as the active one
  if (currentRoute?.name === 'WorkoutLog' && currentRoute?.params) {
    const currentParams = currentRoute.params as any;
    const activeParams = activeWorkout.routeParams;
    
    // Compare day name and block name to determine if it's the same workout
    const isSameWorkout = currentParams?.day?.day_name === activeParams?.day?.day_name &&
                         currentParams?.blockName === activeParams?.blockName;
    
    console.log('🔍 FLOATING INDICATOR: On WorkoutLog screen');
    console.log('🔍 FLOATING INDICATOR: Current workout:', currentParams?.day?.day_name, '|', currentParams?.blockName);
    console.log('🔍 FLOATING INDICATOR: Active workout:', activeParams?.day?.day_name, '|', activeParams?.blockName);
    console.log('🔍 FLOATING INDICATOR: Same workout?', isSameWorkout);
    
    // Only hide if it's the same workout
    if (isSameWorkout) {
      console.log('🔍 FLOATING INDICATOR: Hiding - same workout');
      return null;
    } else {
      console.log('🔍 FLOATING INDICATOR: Showing - different workout');
    }
  }

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePress = () => {
    console.log('🚀 FLOATING INDICATOR: User tapped floating workout indicator');
    console.log('🚀 FLOATING INDICATOR: Active workout state:', {
      dayName: activeWorkout?.dayName,
      duration: activeWorkout?.duration,
      routeParams: activeWorkout?.routeParams
    });
    
    // Ensure all required route params are present to prevent crashes
    if (!activeWorkout?.routeParams?.day || !activeWorkout?.routeParams?.blockName) {
      console.warn('🚀 FLOATING INDICATOR: Incomplete route params for workout navigation:', activeWorkout?.routeParams);
      return;
    }
    
    console.log('🚀 FLOATING INDICATOR: Navigating to WorkoutLog with params:', activeWorkout.routeParams);
    navigate('WorkoutLog', activeWorkout.routeParams);
  };

  return (
    <SafeAreaView style={styles.container} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.indicator}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.content}>
          <View style={styles.leftContent}>
            <Ionicons name="fitness" size={16} color={themeColor} />
            <Text style={styles.workoutName} numberOfLines={1}>
              {activeWorkout.dayName}
            </Text>
          </View>
          <View style={styles.rightContent}>
            <Text style={[styles.duration, { color: themeColor }]}>{formatDuration(liveDuration)}</Text>
            <Ionicons name="chevron-forward" size={16} color="#71717a" />
          </View>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  indicator: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    marginHorizontal: 16,
    marginBottom: 34,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  workoutName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  duration: {
    fontSize: 14,
    fontWeight: '600',
  },
});