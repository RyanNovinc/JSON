import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface FavoriteExercise {
  id: string;
  name: string;
  category: 'gym' | 'bodyweight' | 'flexibility' | 'cardio' | 'custom';
  customCategory?: string;
  muscleGroups: string[]; // Legacy field for backward compatibility
  primaryMuscles?: string[]; // New field for primary target muscles
  secondaryMuscles?: string[]; // New field for secondary involvement
  instructions?: string;
  notes?: string;
  addedAt: string;
  // Activity metrics to match meal format
  estimatedCalories?: number;
  duration?: number; // minutes
  intensity?: 'low' | 'moderate' | 'high';
}

export default function FavoriteExercisesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor } = useTheme();
  const [favoriteExercises, setFavoriteExercises] = useState<FavoriteExercise[]>([]);

  useEffect(() => {
    loadFavoriteExercises();
  }, []);

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadFavoriteExercises();
    }, [])
  );

  const loadFavoriteExercises = async () => {
    try {
      console.log('=== FAVORITES SCREEN LOAD START ===');
      console.log('Attempting to load favorite exercises...');
      
      const savedData = await AsyncStorage.getItem('favoriteExercises');
      console.log('Raw data from storage:', savedData);
      console.log('Data type:', typeof savedData);
      console.log('Data length:', savedData ? savedData.length : 'null');
      
      if (savedData) {
        try {
          const exercises = JSON.parse(savedData);
          console.log('Successfully parsed exercises:', JSON.stringify(exercises, null, 2));
          console.log('Exercises is array?:', Array.isArray(exercises));
          console.log('Number of exercises loaded:', exercises.length);
          
          // Fix any duplicate IDs
          const exercisesWithUniqueIds = exercises.map((exercise, index) => {
            const hasValidId = exercise.id && typeof exercise.id === 'string' && exercise.id.length > 0;
            if (!hasValidId) {
              const newId = 'exercise_' + Date.now() + '_' + index + '_' + Math.random().toString(36).substr(2, 9);
              console.log(`Fixed missing/invalid ID for exercise "${exercise.name}": ${exercise.id} -> ${newId}`);
              return { ...exercise, id: newId };
            }
            return exercise;
          });
          
          // Check for and fix duplicates
          const seenIds = new Set();
          const uniqueExercises = exercisesWithUniqueIds.map((exercise, index) => {
            if (seenIds.has(exercise.id)) {
              const newId = 'exercise_' + Date.now() + '_' + index + '_' + Math.random().toString(36).substr(2, 9);
              console.log(`Fixed duplicate ID for exercise "${exercise.name}": ${exercise.id} -> ${newId}`);
              seenIds.add(newId);
              return { ...exercise, id: newId };
            }
            seenIds.add(exercise.id);
            return exercise;
          });
          
          // Save cleaned data back if we made changes
          if (JSON.stringify(exercises) !== JSON.stringify(uniqueExercises)) {
            console.log('Saving cleaned exercise data back to storage');
            await AsyncStorage.setItem('favoriteExercises', JSON.stringify(uniqueExercises));
          }
          
          if (uniqueExercises.length > 0) {
            console.log('Sample exercise structure:', uniqueExercises[0]);
            uniqueExercises.forEach((exercise, index) => {
              console.log(`Exercise ${index + 1}:`, {
                id: exercise.id,
                name: exercise.name,
                category: exercise.category,
                muscleGroups: exercise.muscleGroups
              });
            });
          }
          
          setFavoriteExercises(uniqueExercises);
          console.log('State updated with', uniqueExercises.length, 'exercises');
        } catch (parseError) {
          console.error('PARSE ERROR in favorites screen:', parseError);
          console.log('Invalid JSON data:', savedData);
          setFavoriteExercises([]);
        }
      } else {
        console.log('No data found in storage (null/undefined)');
        setFavoriteExercises([]);
      }
      
      console.log('=== FAVORITES SCREEN LOAD END ===');
    } catch (error) {
      console.error('Failed to load favorite exercises:', error);
      setFavoriteExercises([]);
    }
  };

  const saveFavoriteExercises = async (exercises: FavoriteExercise[]) => {
    try {
      await AsyncStorage.setItem('favoriteExercises', JSON.stringify(exercises));
    } catch (error) {
      console.error('Failed to save favorite exercises:', error);
    }
  };

  const removeFavorite = (exercise: FavoriteExercise) => {
    Alert.alert(
      'Remove Favorite',
      `Remove "${exercise.name}" from your favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedExercises = favoriteExercises.filter(e => e.id !== exercise.id);
              setFavoriteExercises(updatedExercises);
              await saveFavoriteExercises(updatedExercises);
            } catch (error) {
              Alert.alert('Error', 'Failed to remove favorite');
            }
          }
        }
      ]
    );
  };

  if (favoriteExercises.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Favorite Exercises</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddExercise' as any)} style={styles.addButton}>
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={64} color="#3f3f46" />
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptyDescription}>
            Heart exercises you love to see them here. Your favorites help AI generate better workouts for you.
          </Text>
        </View>
      </View>
    );
  }

  // Sort favorites by most recently added
  const sortedFavorites = [...favoriteExercises].sort((a, b) => {
    return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
  });

  const getCategoryIcon = (category: 'gym' | 'bodyweight' | 'flexibility' | 'cardio' | 'custom') => {
    switch (category) {
      case 'gym': return 'barbell';
      case 'bodyweight': return 'body';
      case 'flexibility': return 'leaf';
      case 'cardio': return 'heart';
      case 'custom': return 'add-circle';
    }
  };

  const FavoriteExerciseCard = ({ exercise }: { exercise: FavoriteExercise }) => (
    <TouchableOpacity
      style={styles.exerciseCard}
      onPress={() => {
        navigation.navigate('ExerciseDetail' as any, { exercise });
      }}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <TouchableOpacity
          onPress={() => removeFavorite(exercise)}
          style={styles.heartButton}
        >
          <Ionicons name="heart" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={getCategoryIcon(exercise.category)}
            size={20}
            color={themeColor}
          />
        </View>
        
        <View style={styles.exerciseDetails}>
          <Text style={[styles.categoryText, { color: themeColor }]}>
            {exercise.category === 'custom' && exercise.customCategory 
              ? exercise.customCategory 
              : exercise.category.charAt(0).toUpperCase() + exercise.category.slice(1)}
          </Text>
          
          <Text style={styles.muscleGroupsText}>
            {(() => {
              const displayMuscles = exercise.primaryMuscles || exercise.muscleGroups.filter(group => group !== 'Custom');
              const visibleMuscles = displayMuscles.slice(0, 3);
              const remainingCount = displayMuscles.length - 3;
              return visibleMuscles.join(', ') + (remainingCount > 0 ? ` +${remainingCount}` : '');
            })()}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.chevronButton}>
          <Ionicons name="chevron-forward" size={20} color="#71717a" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorite Exercises</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddExercise' as any)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Exercises List */}
        <View style={styles.exercisesSection}>
          <Text style={styles.sectionTitle}>
            {sortedFavorites.length} Favorite{sortedFavorites.length !== 1 ? 's' : ''}
          </Text>

          <View style={styles.exercisesList}>
            {sortedFavorites.map((exercise) => (
              <FavoriteExerciseCard key={exercise.id} exercise={exercise} />
            ))}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

    </View>
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
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  exercisesSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  exercisesList: {
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  heartButton: {
    padding: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseDetails: {
    flex: 1,
    gap: 8,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  muscleGroupsText: {
    fontSize: 13,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  chevronButton: {
    padding: 4,
  },
  bottomPadding: {
    height: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 24,
  },
});