/**
 * OneRMProgressionScreen.tsx
 * 
 * Dedicated screen for displaying 1RM progression data for a specific exercise.
 * Shows historical 1RM values, changes, and trends over time.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { WorkoutStorage, WorkoutHistory } from '../utils/storage';
import { useTheme } from '../contexts/ThemeContext';
import { useWeightUnit } from '../contexts/WeightUnitContext';

// Epley formula: 1RM = weight × (1 + reps/30)
const defaultCalc1RM = (weight: number, reps: number): number => {
  if (weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
};

interface RouteParams {
  exerciseName: string;
}

interface ProgressionData {
  date: string;
  dayName: string;
  oneRM: number | null;
}

export default function OneRMProgressionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { exerciseName } = route.params as RouteParams;
  
  const { themeColor } = useTheme();
  const { globalUnit } = useWeightUnit();
  
  const [exerciseHistory, setExerciseHistory] = useState<WorkoutHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressionData, setProgressionData] = useState<ProgressionData[]>([]);

  // Load exercise history
  useEffect(() => {
    const loadHistoryData = async () => {
      try {
        setLoading(true);
        const history = await WorkoutStorage.getExerciseHistory(exerciseName);
        setExerciseHistory(history);

        // Calculate progression data
        const progression = history
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Oldest first for progression
          .map(workout => {
            // Get the best 1RM from this workout
            const bestOneRM = workout.sets.reduce((best, set) => {
              const weight = parseFloat(set.weight) || 0;
              const reps = parseInt(set.reps) || 0;
              const oneRM = weight > 0 && reps > 0 ? defaultCalc1RM(weight, reps) : 0;
              return Math.max(best, oneRM);
            }, 0);
            
            return {
              date: workout.date,
              dayName: workout.dayName || workout.date,
              oneRM: bestOneRM > 0 ? bestOneRM : null,
            };
          })
          .filter(session => session.oneRM !== null); // Only include sessions with valid 1RM

        setProgressionData(progression);
      } catch (error) {
        console.error('Failed to load exercise history:', error);
      } finally {
        setLoading(false);
      }
    };

    if (exerciseName) {
      loadHistoryData();
    }
  }, [exerciseName]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color="#f0f0f2" />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>1RM Progression</Text>
        <Text style={styles.headerSubtitle}>{exerciseName}</Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="trending-up-outline" size={80} color="#3a3a44" />
      <Text style={styles.emptyTitle}>No progression data</Text>
      <Text style={styles.emptyText}>
        Complete some sets for this exercise to see your strength progression over time.
      </Text>
    </View>
  );

  const renderProgressionData = () => (
    <View style={styles.progressionContainer}>
      {progressionData.map((session, index) => {
        const previousSession = index > 0 ? progressionData[index - 1] : null;
        const change = previousSession ? session.oneRM! - previousSession.oneRM! : 0;
        const percentChange = previousSession && previousSession.oneRM! > 0 ? 
          ((change / previousSession.oneRM!) * 100) : 0;

        return (
          <View key={`${session.date}-${index}`} style={styles.progressionEntry}>
            <View style={styles.progressionHeader}>
              <Text style={styles.progressionDate}>
                {new Date(session.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
              <Text style={styles.progressionDayName}>{session.dayName}</Text>
            </View>
            
            <View style={styles.progressionStats}>
              <View style={styles.progressionOneRM}>
                <Text style={[styles.progressionValue, { color: themeColor }]}>
                  {session.oneRM?.toFixed(1)} {globalUnit}
                </Text>
                <Text style={styles.progressionLabel}>Best 1RM</Text>
              </View>
              
              {index > 0 && (
                <View style={styles.progressionChange}>
                  <Text style={[
                    styles.progressionChangeValue,
                    { color: change >= 0 ? '#4ade80' : '#f87171' }
                  ]}>
                    {change >= 0 ? '+' : ''}{change.toFixed(1)} {globalUnit}
                  </Text>
                  <Text style={[
                    styles.progressionChangePercent,
                    { color: change >= 0 ? '#4ade80' : '#f87171' }
                  ]}>
                    {change >= 0 ? '+' : ''}{percentChange.toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>
            
            {/* Progress indicator for trend */}
            {index > 0 && (
              <View style={styles.trendIndicator}>
                <Ionicons 
                  name={change >= 0 ? "trending-up" : "trending-down"} 
                  size={16} 
                  color={change >= 0 ? '#4ade80' : '#f87171'} 
                />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColor} />
          <Text style={styles.loadingText}>Loading progression data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {progressionData.length === 0 ? renderEmptyState() : renderProgressionData()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#0a0a0f',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#f0f0f2',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
  },
  headerSubtitle: {
    color: '#9898a4',
    fontSize: 14,
    fontFamily: 'DMMono-Regular',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    color: '#9898a4',
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    marginTop: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#f0f0f2',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyText: {
    color: '#9898a4',
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  progressionContainer: {
    gap: 16,
  },
  progressionEntry: {
    backgroundColor: '#0a0a0f',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  progressionHeader: {
    marginBottom: 16,
  },
  progressionDate: {
    color: '#f0f0f2',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
  },
  progressionDayName: {
    color: '#9898a4',
    fontSize: 12,
    fontFamily: 'DMMono-Regular',
    marginTop: 4,
  },
  progressionStats: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  progressionOneRM: {
    flex: 1,
  },
  progressionValue: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    lineHeight: 32,
  },
  progressionLabel: {
    color: '#9898a4',
    fontSize: 11,
    fontFamily: 'DMMono-Regular',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  progressionChange: {
    alignItems: 'flex-end',
  },
  progressionChangeValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    lineHeight: 22,
  },
  progressionChangePercent: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'DMMono-Medium',
    marginTop: 2,
  },
  trendIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
});