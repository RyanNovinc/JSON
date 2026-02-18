import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
  Animated,
  Modal,
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
  category: 'gym' | 'bodyweight' | 'flexibility' | 'cardio' | 'custom' | null;
  customCategory?: string;
  muscleGroups: string[];
  instructions?: string;
  notes?: string;
  addedAt: string;
}

const categoryOptions = [
  { id: 'gym', name: 'Gym', icon: 'barbell' },
  { id: 'bodyweight', name: 'Bodyweight', icon: 'body' },
  { id: 'flexibility', name: 'Flexibility', icon: 'leaf' },
  { id: 'cardio', name: 'Cardio', icon: 'heart' },
  { id: 'custom', name: 'Custom', icon: 'add-circle' },
];

const getMuscleGroupOptions = (category: string | null) => {
  switch (category) {
    case 'gym':
    case 'bodyweight':
      return ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Abs', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Forearms', 'Full Body', 'Custom'];
    case 'cardio':
      return ['Lower Body', 'Upper Body', 'Full Body', 'Core', 'Custom'];
    case 'flexibility':
      return ['Back/Spine', 'Hips/Pelvis', 'Shoulders/Arms', 'Hamstrings/Legs', 'Core/Abs', 'Neck', 'Chest', 'Glutes', 'Custom'];
    case 'custom':
      return ['Custom'];
    default:
      return ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Abs', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Forearms', 'Full Body', 'Custom'];
  }
};

export default function ManualExerciseEntryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor } = useTheme();
  
  const [exerciseName, setExerciseName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'gym' | 'bodyweight' | 'flexibility' | 'cardio' | 'custom' | null>(null);
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState('');
  const [instructionSteps, setInstructionSteps] = useState<string[]>(['']);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [muscleGroupAnimation] = useState(new Animated.Value(0));
  const [showMuscleGroups, setShowMuscleGroups] = useState(false);
  const [animatingCategory, setAnimatingCategory] = useState<'gym' | 'bodyweight' | 'flexibility' | 'cardio' | 'custom' | null>(null);
  const [customMuscleGroups, setCustomMuscleGroups] = useState<string[]>([]);
  const [showCustomMuscleInput, setShowCustomMuscleInput] = useState(false);
  const [customMuscleInput, setCustomMuscleInput] = useState('');

  useEffect(() => {
    if (selectedCategory) {
      // Show component first, then animate in
      setAnimatingCategory(selectedCategory);
      setShowMuscleGroups(true);
      Animated.timing(muscleGroupAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else if (showMuscleGroups) {
      // Animate out first, then hide component
      Animated.timing(muscleGroupAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setShowMuscleGroups(false);
        setAnimatingCategory(null);
      });
    }
  }, [selectedCategory]);

  const handleMuscleGroupToggle = (muscleGroup: string) => {
    if (muscleGroup === 'Custom') {
      setShowCustomMuscleInput(true);
      return;
    }
    
    setSelectedMuscleGroups(prev => {
      if (prev.includes(muscleGroup)) {
        return prev.filter(group => group !== muscleGroup);
      } else {
        return [...prev, muscleGroup];
      }
    });
  };

  const handleCustomMuscleGroupAdd = () => {
    const customGroup = customMuscleInput.trim();
    if (customGroup && !customMuscleGroups.includes(customGroup) && !selectedMuscleGroups.includes(customGroup)) {
      setCustomMuscleGroups(prev => [...prev, customGroup]);
      setSelectedMuscleGroups(prev => [...prev, customGroup]);
      setCustomMuscleInput('');
      setShowCustomMuscleInput(false);
    }
  };

  const getAllMuscleGroupOptions = (category: string | null) => {
    const baseOptions = getMuscleGroupOptions(category);
    const filteredCustomGroups = customMuscleGroups.filter(group => !baseOptions.includes(group));
    return [...baseOptions.filter(option => option !== 'Custom'), ...filteredCustomGroups, 'Custom'];
  };

  const addInstructionStep = () => {
    setInstructionSteps(prev => [...prev, '']);
  };

  const removeInstructionStep = (index: number) => {
    if (instructionSteps.length > 1) {
      setInstructionSteps(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateInstructionStep = (index: number, value: string) => {
    setInstructionSteps(prev => prev.map((step, i) => i === index ? value : step));
  };

  const handleSaveExercise = async () => {
    if (!exerciseName.trim()) {
      Alert.alert('Error', 'Please enter an exercise name');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    if (selectedCategory === 'custom' && !customCategory.trim()) {
      Alert.alert('Error', 'Please enter a custom category name');
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
        customCategory: selectedCategory === 'custom' ? customCategory.trim() : undefined,
        muscleGroups: selectedMuscleGroups,
        instructions: instructionSteps.filter(step => step.trim()).join('\n') || undefined,
        notes: notes.trim() || undefined,
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
            {categoryOptions.filter(cat => cat.id !== 'custom').map((category) => {
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
                  onPress={() => {
                    const newCategory = selectedCategory === category.id ? null : category.id as any;
                    setSelectedCategory(newCategory);
                    // Clear muscle groups when category changes
                    setSelectedMuscleGroups([]);
                  }}
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
          
          {/* Custom Category Button - New Design */}
          <TouchableOpacity
            style={[
              styles.customCategoryButton,
              selectedCategory === 'custom' && { 
                borderColor: themeColor, 
                backgroundColor: `${themeColor}15` 
              }
            ]}
            onPress={() => {
              const newCategory = selectedCategory === 'custom' ? null : 'custom';
              setSelectedCategory(newCategory);
              // Clear muscle groups when category changes
              setSelectedMuscleGroups([]);
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.customIconCircle, selectedCategory === 'custom' && { backgroundColor: themeColor }]}>
              <Ionicons 
                name="add" 
                size={20} 
                color={selectedCategory === 'custom' ? '#000000' : themeColor} 
              />
            </View>
            <Text style={[styles.customButtonText, selectedCategory === 'custom' && { color: themeColor }]}>
              Add Custom Category
            </Text>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={selectedCategory === 'custom' ? themeColor : '#71717a'} 
            />
          </TouchableOpacity>
        </View>

        {/* Custom Category Input */}
        {selectedCategory === 'custom' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom Category</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Yoga, Pilates, Swimming..."
              placeholderTextColor="#71717a"
              value={customCategory}
              onChangeText={setCustomCategory}
              maxLength={30}
            />
          </View>
        )}

        {/* Muscle Groups - Only show if category is selected with animation */}
        {showMuscleGroups && (
          <Animated.View 
            style={[
              styles.section,
              {
                opacity: muscleGroupAnimation,
                transform: [{
                  translateY: muscleGroupAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  })
                }]
              }
            ]}
          >
            <Text style={styles.sectionTitle}>
              {animatingCategory === 'cardio' ? 'Primary Focus' : 
               animatingCategory === 'flexibility' ? 'Stretch Areas' : 
               animatingCategory === 'custom' ? 'Target Areas' :
               'Muscle Groups'}
            </Text>
            <Text style={styles.sectionSubtitle}>Select all that apply</Text>
            <View style={styles.muscleGroupGrid}>
              {getAllMuscleGroupOptions(animatingCategory).map((muscleGroup) => {
                const isSelected = selectedMuscleGroups.includes(muscleGroup);
                const isCustomOption = muscleGroup === 'Custom';
                return (
                  <TouchableOpacity
                    key={muscleGroup}
                    style={[
                      styles.muscleGroupChip,
                      isCustomOption && styles.customMuscleGroupChip,
                      isSelected && [styles.selectedMuscleGroupChip, { 
                        borderColor: themeColor, 
                        backgroundColor: `${themeColor}20` 
                      }]
                    ]}
                    onPress={() => handleMuscleGroupToggle(muscleGroup)}
                    activeOpacity={0.8}
                  >
                    {isCustomOption && (
                      <Ionicons name="add" size={14} color={isSelected ? themeColor : '#71717a'} style={{ marginRight: 4 }} />
                    )}
                    <Text style={[
                      styles.muscleGroupText, 
                      isCustomOption && styles.customMuscleGroupText,
                      isSelected && { color: themeColor }
                    ]}>
                      {muscleGroup}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Instructions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <TouchableOpacity
              onPress={addInstructionStep}
              style={[styles.addButton, { borderColor: themeColor }]}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={14} color={themeColor} />
              <Text style={[styles.addButtonText, { color: themeColor }]}>Add Step</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>Break down how to perform this exercise (optional)</Text>
          
          <View style={styles.stepsContainer}>
            {instructionSteps.map((step, index) => (
              <View key={index} style={styles.stepItem}>
                <Text style={styles.stepDot}>{index + 1}.</Text>
                <TextInput
                  style={styles.stepTextInput}
                  placeholder={
                    index === 0 ? "Stand with feet shoulder-width apart..." :
                    index === 1 ? "Lower into squat position..." :
                    "Return to starting position..."
                  }
                  placeholderTextColor="#71717a"
                  value={step}
                  onChangeText={(text) => updateInstructionStep(index, text)}
                  multiline={true}
                  textAlignVertical="top"
                />
                {instructionSteps.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeInstructionStep(index)}
                    style={styles.deleteButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Additional Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes</Text>
          <Text style={styles.sectionSubtitle}>Tips, modifications, or personal reminders (optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Form tips, variations, personal notes..."
            placeholderTextColor="#71717a"
            value={notes}
            onChangeText={setNotes}
            multiline={true}
            numberOfLines={3}
            textAlignVertical="top"
          />
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

      {/* Custom Muscle Group Input Modal */}
      <Modal
        visible={showCustomMuscleInput}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCustomMuscleInput(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.customMuscleModalContainer}>
            <Text style={styles.customMuscleModalTitle}>Add Custom {
              animatingCategory === 'cardio' ? 'Focus Area' : 
              animatingCategory === 'flexibility' ? 'Stretch Area' : 
              'Muscle Group'
            }</Text>
            
            <TextInput
              style={[styles.customMuscleInput, { borderColor: themeColor }]}
              placeholder="e.g., Lower Traps, Hip Adductors..."
              placeholderTextColor="#71717a"
              value={customMuscleInput}
              onChangeText={setCustomMuscleInput}
              maxLength={25}
              autoFocus
            />

            <View style={styles.customMuscleModalActions}>
              <TouchableOpacity
                style={styles.customMuscleCancelButton}
                onPress={() => {
                  setShowCustomMuscleInput(false);
                  setCustomMuscleInput('');
                }}
              >
                <Text style={styles.customMuscleCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.customMuscleAddButton, { backgroundColor: themeColor }]}
                onPress={handleCustomMuscleGroupAdd}
                disabled={!customMuscleInput.trim()}
              >
                <Text style={styles.customMuscleAddText}>Add</Text>
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
  customCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    marginTop: 12,
    gap: 12,
  },
  customIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
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
  textArea: {
    height: 80,
    paddingTop: 16,
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
  customMuscleGroupChip: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#71717a',
  },
  customMuscleGroupText: {
    fontStyle: 'italic',
    color: '#71717a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  customMuscleModalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  customMuscleModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  customMuscleInput: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 2,
    marginBottom: 20,
  },
  customMuscleModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  customMuscleCancelButton: {
    flex: 1,
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  customMuscleCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  customMuscleAddButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  customMuscleAddText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  instructionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  addStepText: {
    fontSize: 12,
    fontWeight: '600',
  },
  instructionStepContainer: {
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    minWidth: 20,
  },
  removeStepButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 13,
  },
  stepInput: {
    flex: 1,
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#27272a',
    minHeight: 50,
    textAlignVertical: 'top',
  },
});