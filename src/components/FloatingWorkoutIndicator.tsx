import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useActiveWorkout } from '../contexts/ActiveWorkoutContext';
import { navigate, getCurrentRoute } from '../utils/navigationRef';

export function FloatingWorkoutIndicator() {
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

  // Don't show on the WorkoutLog screen itself
  const currentRoute = getCurrentRoute();
  if (!activeWorkout || currentRoute?.name === 'WorkoutLog') return null;

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
            <Ionicons name="fitness" size={16} color="#22d3ee" />
            <Text style={styles.workoutName} numberOfLines={1}>
              {activeWorkout.dayName}
            </Text>
          </View>
          <View style={styles.rightContent}>
            <Text style={styles.duration}>{formatDuration(liveDuration)}</Text>
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
    color: '#22d3ee',
  },
});