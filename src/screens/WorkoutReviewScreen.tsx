import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/AppNavigator';
import { WorkoutStorage, WorkoutHistory } from '../utils/storage';

type WorkoutReviewScreenNavigationProp = StackNavigationProp<RootStackParamList, 'WorkoutReview'>;
type WorkoutReviewScreenRouteProp = RouteProp<RootStackParamList, 'WorkoutReview'>;

interface Exercise {
  exercise: string;
  sets: number;
  reps: string;
  rest?: number;
  notes?: string;
  alternatives?: string[];
}

interface Day {
  day_name: string;
  exercises: Exercise[];
}

interface CompletionStats {
  duration: number;
  totalVolume: number;
  date: string;
}

export default function WorkoutReviewScreen() {
  const navigation = useNavigation<WorkoutReviewScreenNavigationProp>();
  const route = useRoute<WorkoutReviewScreenRouteProp>();
  const { day, blockName, completionStats, currentWeek } = route.params;
  
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistory[]>([]);
  const [showRedoModal, setShowRedoModal] = useState(false);
  
  useEffect(() => {
    loadWorkoutHistory();
  }, []);
  
  const loadWorkoutHistory = async () => {
    const history = await WorkoutStorage.loadWorkoutHistory();
    const currentDate = new Date(completionStats.date).toISOString().split('T')[0];
    
    // Filter history for this specific workout on this date
    const relevantHistory = history.filter(entry => 
      entry.dayName === day.day_name && 
      entry.date === currentDate &&
      entry.routineName === blockName
    );
    
    setWorkoutHistory(relevantHistory);
  };
  
  const handleRedo = () => {
    setShowRedoModal(true);
  };
  
  const handleConfirmRedo = async () => {
    // Clear the completion data
    const completedKey = `completed_${blockName}_week${currentWeek}`;
    const completed = await AsyncStorage.getItem(completedKey);
    if (completed) {
      const completedSet = new Set(JSON.parse(completed));
      completedSet.delete(`${day.day_name}_week${currentWeek}`);
      await AsyncStorage.setItem(completedKey, JSON.stringify(Array.from(completedSet)));
    }
    
    // Clear the stats
    const statsKey = `completionStats_${blockName}_week${currentWeek}`;
    const existingStats = await AsyncStorage.getItem(statsKey);
    if (existingStats) {
      const statsMap = new Map(JSON.parse(existingStats));
      statsMap.delete(`${day.day_name}_week${currentWeek}`);
      await AsyncStorage.setItem(statsKey, JSON.stringify(Array.from(statsMap)));
    }
    
    // Navigate to workout log screen
    navigation.replace('WorkoutLog' as any, { day, blockName });
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };
  
  const getExerciseHistory = (exerciseName: string) => {
    return workoutHistory.find(h => 
      h.exerciseName === exerciseName || 
      day.exercises.find(e => e.exercise === exerciseName)?.alternatives?.includes(h.exerciseName)
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{day.day_name}</Text>
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark" size={12} color="#0a0a0b" />
            <Text style={styles.completedBadgeText}>COMPLETED</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.redoButton} 
          onPress={handleRedo}
          activeOpacity={0.7}
        >
          <Text style={styles.redoButtonText}>Redo</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsCard}>
        <Text style={styles.statsDate}>{formatDate(completionStats.date)}</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{completionStats.duration}</Text>
            <Text style={styles.statLabel}>MINUTES</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{completionStats.totalVolume.toFixed(0)}</Text>
            <Text style={styles.statLabel}>KG LIFTED</Text>
          </View>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.exercisesList}>
          {day.exercises.map((exercise, index) => {
            const history = getExerciseHistory(exercise.exercise);
            const exerciseName = history?.exerciseName || exercise.exercise;
            
            return (
              <View key={index} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{exerciseName}</Text>
                  {history ? (
                    <View style={styles.completedIndicator}>
                      <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    </View>
                  ) : (
                    <View style={styles.skippedIndicator}>
                      <Text style={styles.skippedText}>SKIPPED</Text>
                    </View>
                  )}
                </View>
                
                {history ? (
                  <View style={styles.setsContainer}>
                    {history.sets.map((set, setIndex) => (
                      <View key={setIndex} style={styles.setRow}>
                        <Text style={styles.setNumber}>Set {set.setNumber}</Text>
                        <View style={styles.setData}>
                          <Text style={styles.setWeight}>{set.weight} kg</Text>
                          <Text style={styles.setSeparator}>×</Text>
                          <Text style={styles.setReps}>{set.reps} reps</Text>
                        </View>
                        {set.drops && set.drops.length > 0 && (
                          <View style={styles.dropSets}>
                            {set.drops.map((drop, dropIndex) => (
                              <View key={dropIndex} style={styles.dropSet}>
                                <Text style={styles.dropLabel}>Drop {dropIndex + 1}:</Text>
                                <Text style={styles.dropData}>
                                  {drop.weight} kg × {drop.reps} reps
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noDataText}>No sets completed</Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
      
      {/* Custom Redo Modal */}
      <Modal
        visible={showRedoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRedoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="refresh-circle" size={48} color="#ef4444" />
            </View>
            
            <Text style={styles.modalTitle}>Start New Session?</Text>
            <Text style={styles.modalMessage}>
              This will clear your previous workout data and start a fresh session.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowRedoModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmRedo}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>Start New</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0a0a0b',
    letterSpacing: 0.5,
  },
  redoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  redoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  statsCard: {
    backgroundColor: '#18181b',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
  },
  statsDate: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#71717a',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#27272a',
  },
  scrollView: {
    flex: 1,
  },
  exercisesList: {
    padding: 16,
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  completedIndicator: {
    marginLeft: 8,
  },
  skippedIndicator: {
    backgroundColor: '#27272a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  skippedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#71717a',
    letterSpacing: 0.5,
  },
  setsContainer: {
    gap: 8,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  setNumber: {
    fontSize: 14,
    color: '#71717a',
    width: 50,
  },
  setData: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setWeight: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22d3ee',
  },
  setSeparator: {
    fontSize: 14,
    color: '#71717a',
  },
  setReps: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  dropSets: {
    marginTop: 8,
    paddingLeft: 60,
    gap: 4,
  },
  dropSet: {
    flexDirection: 'row',
    gap: 8,
  },
  dropLabel: {
    fontSize: 12,
    color: '#71717a',
  },
  dropData: {
    fontSize: 12,
    color: '#a1a1aa',
  },
  noDataText: {
    fontSize: 14,
    color: '#71717a',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#27272a',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  confirmButton: {
    backgroundColor: '#ef4444',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});