import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutStorage, WorkoutRoutine } from '../utils/storage';
import { WorkoutProgram } from '../types/workout';
import * as Clipboard from 'expo-clipboard';

type MyWorkoutsNavigationProp = StackNavigationProp<RootStackParamList, 'MyWorkouts'>;

interface WorkoutForDisplay {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Custom';
  focus: string;
  program: WorkoutProgram;
}

export default function MyWorkoutsScreen() {
  const { themeColor } = useTheme();
  const navigation = useNavigation<MyWorkoutsNavigationProp>();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [userWorkouts, setUserWorkouts] = useState<WorkoutRoutine[]>([]);

  // Load user workouts when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadUserWorkouts();
    }, [])
  );

  const loadUserWorkouts = async () => {
    const savedRoutines = await WorkoutStorage.loadMyRoutines();
    console.log('📱 My Workouts loading:', savedRoutines.length, 'saved routines');
    setUserWorkouts(savedRoutines);
  };

  // Convert user routine to display format
  const convertUserWorkoutToDisplay = (routine: WorkoutRoutine): WorkoutForDisplay => {
    const name = routine.name.toLowerCase();
    
    let programLength = 'Variable';
    let workoutType = 'Strength Training';
    let difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Custom' = 'Intermediate';
    
    if (name.includes('hypertrophy') || name.includes('muscle') || name.includes('builder')) {
      workoutType = 'Muscle Building & Hypertrophy';
      programLength = '52 weeks';
      difficulty = 'Advanced';
    } else if (name.includes('glute') || name.includes('tone')) {
      workoutType = 'Glute Development & Toning';
      programLength = '12 weeks';
      difficulty = 'Intermediate';
    } else if (name.includes('beginner') || name.includes('start')) {
      workoutType = 'General Fitness & Strength';
      programLength = '10 weeks';
      difficulty = 'Beginner';
    } else {
      difficulty = 'Custom';
    }
    
    return {
      id: routine.id,
      title: routine.name,
      description: 'Custom AI workout',
      duration: `${routine.days} days/week • ${programLength}`,
      difficulty: difficulty,
      focus: workoutType,
      program: routine.data,
    };
  };

  const handleDeleteWorkout = (workoutId: string, workoutName: string) => {
    Alert.alert(
      'Delete Workout',
      `Are you sure you want to delete "${workoutName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            console.log('🗑️ Deleting saved workout:', workoutName, 'ID:', workoutId);
            await WorkoutStorage.removeMyRoutine(workoutId);
            loadUserWorkouts();
            console.log('🗑️ Workout deleted from My Collection');
          }
        }
      ]
    );
  };

  const handleCopyWorkout = async (workout: WorkoutForDisplay) => {
    const workoutJson = JSON.stringify(workout.program, null, 2);
    await Clipboard.setStringAsync(workoutJson);
    
    setCopiedId(workout.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.simpleHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Workouts</Text>
          <View style={styles.placeholder} />
        </View>

        {/* User Workouts */}
        {userWorkouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={64} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyTitle}>No Custom Workouts</Text>
            <Text style={styles.emptyDescription}>
              Import or create a custom workout to see it here
            </Text>
          </View>
        ) : (
          userWorkouts.map((routine, index) => {
            const workout = convertUserWorkoutToDisplay(routine);
            
            return (
              <View key={workout.id} style={styles.cardContainer}>
                <TouchableOpacity
                  style={styles.card}
                  activeOpacity={0.9}
                  onPress={() => handleCopyWorkout(workout)}
                >
                  <View style={styles.userWorkoutGradient}>
                    <View style={styles.userWorkoutHeader}>
                      <Text style={styles.userWorkoutTitle}>{workout.title}</Text>
                      <TouchableOpacity 
                        style={styles.deleteButton}
                        onPress={() => handleDeleteWorkout(routine.id, routine.name)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.userWorkoutSubtitle}>Custom workout</Text>
                    <View style={styles.userWorkoutDetails}>
                      <Text style={styles.userWorkoutText}>Tap to copy & share</Text>
                    </View>
                  </View>
                  
                  {/* Copied Overlay */}
                  {copiedId === workout.id && (
                    <View style={styles.copiedOverlay}>
                      <View style={[styles.copiedGradient, { backgroundColor: themeColor + 'E6' }]}>
                        <View style={styles.copiedContent}>
                          <Ionicons name="checkmark-circle" size={60} color="#ffffff" />
                          <Text style={styles.copiedTitle}>Copied!</Text>
                          <Text style={styles.copiedSubtitle}>{workout.title} is ready to import</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <View style={styles.bottomSection}>
          <Text style={styles.bottomText}>
            Import workouts to build your collection
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  simpleHeader: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 44,
    height: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  // User workout card styles
  cardContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  card: {
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  userWorkoutGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    borderRadius: 20,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  userWorkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userWorkoutTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginRight: 12,
  },
  userWorkoutSubtitle: {
    fontSize: 16,
    color: '#e4e4e7',
    marginBottom: 12,
  },
  userWorkoutDetails: {
    marginTop: 'auto',
  },
  userWorkoutText: {
    fontSize: 14,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  // Empty state styles
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  bottomText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
  },
  // Copied overlay styles
  copiedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    overflow: 'hidden',
  },
  copiedGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  copiedContent: {
    alignItems: 'center',
  },
  copiedTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  copiedSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});