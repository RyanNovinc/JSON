import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
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

const categoryOptions = [
  { id: 'strength', name: 'Strength', icon: 'barbell' },
  { id: 'cardio', name: 'Cardio', icon: 'heart' },
  { id: 'flexibility', name: 'Flexibility', icon: 'body' },
  { id: 'sports', name: 'Sports', icon: 'football' },
];

const muscleGroupOptions = [
  'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Glutes', 'Full Body'
];

export default function AddExerciseScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor } = useTheme();
  
  const [exerciseName, setExerciseName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'strength' | 'cardio' | 'flexibility' | 'sports'>('strength');
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleMuscleGroupToggle = (muscleGroup: string) => {
    setSelectedMuscleGroups(prev => {
      if (prev.includes(muscleGroup)) {
        return prev.filter(group => group !== muscleGroup);
      } else {
        return [...prev, muscleGroup];
      }
    });
  };

  const handleSaveExercise = async () => {
    if (!exerciseName.trim()) {
      Alert.alert('Error', 'Please enter an exercise name');
      return;
    }

    if (selectedMuscleGroups.length === 0) {
      Alert.alert('Error', 'Please select at least one muscle group');
      return;
    }

    setIsLoading(true);

    try {
      // Load existing favorites
      const existingData = await AsyncStorage.getItem('favoriteExercises');
      const existingExercises: FavoriteExercise[] = existingData ? JSON.parse(existingData) : [];

      // Check if exercise already exists
      const exerciseExists = existingExercises.some(
        exercise => exercise.name.toLowerCase().trim() === exerciseName.toLowerCase().trim()
      );

      if (exerciseExists) {
        Alert.alert('Duplicate Exercise', 'This exercise is already in your favorites');
        setIsLoading(false);
        return;
      }

      // Create new exercise
      const newExercise: FavoriteExercise = {
        id: Date.now().toString(),
        name: exerciseName.trim(),
        category: selectedCategory,
        muscleGroups: selectedMuscleGroups,
        addedAt: new Date().toISOString(),
      };

      // Add to favorites
      const updatedExercises = [newExercise, ...existingExercises];
      await AsyncStorage.setItem('favoriteExercises', JSON.stringify(updatedExercises));

      // Navigate back
      Alert.alert('Success', 'Exercise added to your favorites!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Failed to save exercise:', error);
      Alert.alert('Error', 'Failed to save exercise. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Exercise</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Exercise Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercise Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Deadlifts, Push-ups, Running..."
            placeholderTextColor="#71717a"
            value={exerciseName}
            onChangeText={setExerciseName}
            maxLength={50}
          />
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>
          <View style={styles.categoryGrid}>
            {categoryOptions.map((category) => {
              const isSelected = selectedCategory === category.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    isSelected && [styles.selectedCategoryCard, { 
                      borderColor: themeColor, 
                      backgroundColor: `${themeColor}10` 
                    }]
                  ]}
                  onPress={() => setSelectedCategory(category.id as any)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.categoryIconContainer, isSelected && { backgroundColor: themeColor }]}>
                    <Ionicons 
                      name={category.icon as any} 
                      size={24} 
                      color={isSelected ? '#000000' : themeColor} 
                    />
                  </View>
                  <Text style={[styles.categoryName, isSelected && { color: themeColor }]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Muscle Groups */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Muscle Groups</Text>
          <Text style={styles.sectionSubtitle}>Select all that apply</Text>
          <View style={styles.muscleGroupGrid}>
            {muscleGroupOptions.map((muscleGroup) => {
              const isSelected = selectedMuscleGroups.includes(muscleGroup);
              return (
                <TouchableOpacity
                  key={muscleGroup}
                  style={[
                    styles.muscleGroupChip,
                    isSelected && [styles.selectedMuscleGroupChip, { 
                      borderColor: themeColor, 
                      backgroundColor: `${themeColor}20` 
                    }]
                  ]}
                  onPress={() => handleMuscleGroupToggle(muscleGroup)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.muscleGroupText, isSelected && { color: themeColor }]}>
                    {muscleGroup}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color={themeColor} style={styles.muscleGroupCheck} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: themeColor }]}
          onPress={handleSaveExercise}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Adding...' : 'Add to Favorites'}
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 16,
    paddingTop: 10,
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
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#27272a',
  },
  selectedCategoryCard: {
    borderWidth: 2,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  muscleGroupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleGroupChip: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedMuscleGroupChip: {
    borderWidth: 2,
  },
  muscleGroupText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  muscleGroupCheck: {
    marginLeft: 6,
  },
  bottomPadding: {
    height: 100,
  },
  saveButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});