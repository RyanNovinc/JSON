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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface FavoriteExercise {
  id: string;
  name: string;
  category: 'strength' | 'cardio' | 'flexibility' | 'sports';
  muscleGroups: string[];
  addedAt: string;
}

export default function FavoriteExercisesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor } = useTheme();
  const [favoriteExercises, setFavoriteExercises] = useState<FavoriteExercise[]>([]);

  useEffect(() => {
    loadFavoriteExercises();
  }, []);

  const loadFavoriteExercises = async () => {
    try {
      const savedData = await AsyncStorage.getItem('favoriteExercises');
      if (savedData) {
        const exercises = JSON.parse(savedData);
        setFavoriteExercises(exercises);
      }
    } catch (error) {
      console.error('Failed to load favorite exercises:', error);
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

  const getCategoryIcon = (category: 'strength' | 'cardio' | 'flexibility' | 'sports') => {
    switch (category) {
      case 'strength': return 'barbell';
      case 'cardio': return 'heart';
      case 'flexibility': return 'body';
      case 'sports': return 'football';
    }
  };

  const FavoriteExerciseCard = ({ exercise }: { exercise: FavoriteExercise }) => (
    <TouchableOpacity
      style={styles.exerciseCard}
      onPress={() => {
        // Navigate to exercise detail if we have one
        // For now just show info
        Alert.alert(exercise.name, `Category: ${exercise.category}\nMuscle Groups: ${exercise.muscleGroups.join(', ')}`);
      }}
      activeOpacity={0.8}
    >
      <View style={styles.cardContent}>
        <View style={styles.exerciseIconContainer}>
          <Ionicons
            name={getCategoryIcon(exercise.category)}
            size={24}
            color={themeColor}
          />
        </View>
        
        <View style={styles.exerciseInfo}>
          <View style={styles.exerciseTitleRow}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <TouchableOpacity
              onPress={() => removeFavorite(exercise)}
              style={styles.removeButton}
            >
              <Ionicons name="heart" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.exerciseCategory, { color: themeColor }]}>
            {exercise.category.charAt(0).toUpperCase() + exercise.category.slice(1)}
          </Text>
          
          <View style={styles.muscleGroupsRow}>
            <Text style={styles.muscleGroupsText}>
              {exercise.muscleGroups.join(', ')}
            </Text>
          </View>
        </View>
        
        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={20} color="#71717a" />
        </View>
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
    padding: 16,
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  exerciseIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseInfo: {
    flex: 1,
    gap: 4,
  },
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  exerciseCategory: {
    fontSize: 14,
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  muscleGroupsRow: {
    marginTop: 8,
  },
  muscleGroupsText: {
    fontSize: 12,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  chevronContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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