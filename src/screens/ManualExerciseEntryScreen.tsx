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
import { useNavigation, useRoute } from '@react-navigation/native';
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
      return ['Chest', 'Front Delts', 'Side Delts', 'Rear Delts', 'Lats', 'Upper Back', 'Traps', 'Biceps', 'Triceps', 'Forearms', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Custom'];
    case 'cardio':
      return ['Lower Body', 'Upper Body', 'Full Body', 'Core', 'Custom'];
    case 'flexibility':
      return ['Chest', 'Front Delts', 'Side Delts', 'Rear Delts', 'Lats', 'Upper Back', 'Traps', 'Biceps', 'Triceps', 'Forearms', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Custom'];
    case 'custom':
      return ['Custom'];
    default:
      return ['Chest', 'Front Delts', 'Side Delts', 'Rear Delts', 'Lats', 'Upper Back', 'Traps', 'Biceps', 'Triceps', 'Forearms', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Custom'];
  }
};

export default function ManualExerciseEntryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { themeColor } = useTheme();
  
  // Check if we're editing an existing exercise
  const editExercise = route.params?.editExercise as FavoriteExercise | undefined;
  const isEditing = route.params?.isEditing as boolean | undefined;
  
  const [exerciseName, setExerciseName] = useState(editExercise?.name || '');
  const [selectedCategory, setSelectedCategory] = useState<'gym' | 'bodyweight' | 'flexibility' | 'cardio' | 'custom' | null>(editExercise?.category || null);
  
  // Category-specific muscle selections - preserve selections when switching categories
  const [categoryMuscleData, setCategoryMuscleData] = useState<{
    [key: string]: {
      muscleGroups: string[];
      primaryMuscles: string[];
      secondaryMuscles: string[];
    }
  }>(() => {
    // Initialize with current exercise data if editing
    if (editExercise && editExercise.category) {
      return {
        [editExercise.category]: {
          muscleGroups: editExercise.muscleGroups || [],
          primaryMuscles: editExercise.primaryMuscles || [],
          secondaryMuscles: editExercise.secondaryMuscles || [],
        }
      };
    }
    return {};
  });
  
  // Current active selections (computed from categoryMuscleData)
  const selectedMuscleGroups = selectedCategory ? (categoryMuscleData[selectedCategory]?.muscleGroups || []) : [];
  const selectedPrimaryMuscles = selectedCategory ? (categoryMuscleData[selectedCategory]?.primaryMuscles || []) : [];
  const selectedSecondaryMuscles = selectedCategory ? (categoryMuscleData[selectedCategory]?.secondaryMuscles || []) : [];
  
  const [muscleSelectionMode, setMuscleSelectionMode] = useState<'primary' | 'secondary'>('primary');
  const [customCategory, setCustomCategory] = useState(editExercise?.customCategory || '');
  const [instructionSteps, setInstructionSteps] = useState<string[]>(editExercise?.instructions ? editExercise.instructions.split('\n').filter(step => step.trim()) : ['']);
  const [notes, setNotes] = useState(editExercise?.notes || '');
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

  const updateCategoryMuscleData = (category: string, field: 'muscleGroups' | 'primaryMuscles' | 'secondaryMuscles', updater: (prev: string[]) => string[]) => {
    setCategoryMuscleData(prev => ({
      ...prev,
      [category]: {
        muscleGroups: prev[category]?.muscleGroups || [],
        primaryMuscles: prev[category]?.primaryMuscles || [],
        secondaryMuscles: prev[category]?.secondaryMuscles || [],
        ...prev[category],
        [field]: updater(prev[category]?.[field] || [])
      }
    }));
  };

  const handleMuscleGroupToggle = (muscleGroup: string) => {
    if (!selectedCategory) return;
    
    if (muscleGroup === 'Custom') {
      setShowCustomMuscleInput(true);
      return;
    }
    
    // For gym and bodyweight, use primary/secondary selection
    if (selectedCategory === 'gym' || selectedCategory === 'bodyweight') {
      if (muscleSelectionMode === 'primary') {
        updateCategoryMuscleData(selectedCategory, 'primaryMuscles', prev => {
          if (prev.includes(muscleGroup)) {
            return prev.filter(group => group !== muscleGroup);
          } else {
            return [...prev, muscleGroup];
          }
        });
      } else {
        updateCategoryMuscleData(selectedCategory, 'secondaryMuscles', prev => {
          if (prev.includes(muscleGroup)) {
            return prev.filter(group => group !== muscleGroup);
          } else {
            return [...prev, muscleGroup];
          }
        });
      }
    } else {
      // For other categories, use legacy muscle groups
      updateCategoryMuscleData(selectedCategory, 'muscleGroups', prev => {
        if (prev.includes(muscleGroup)) {
          return prev.filter(group => group !== muscleGroup);
        } else {
          return [...prev, muscleGroup];
        }
      });
    }
  };

  const handleCustomMuscleGroupAdd = () => {
    if (!selectedCategory) return;
    
    const customGroup = customMuscleInput.trim();
    if (customGroup && !customMuscleGroups.includes(customGroup) && !selectedMuscleGroups.includes(customGroup)) {
      setCustomMuscleGroups(prev => [...prev, customGroup]);
      
      // Add to appropriate muscle group based on category
      if (selectedCategory === 'gym' || selectedCategory === 'bodyweight') {
        updateCategoryMuscleData(selectedCategory, muscleSelectionMode === 'primary' ? 'primaryMuscles' : 'secondaryMuscles', prev => [...prev, customGroup]);
      } else {
        updateCategoryMuscleData(selectedCategory, 'muscleGroups', prev => [...prev, customGroup]);
      }
      
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

  const estimateCalories = (category: string | null, muscleGroups: string[]) => {
    // Realistic calorie estimation for 30-minute exercise sessions
    let baseCalories = 200;
    
    switch (category) {
      case 'cardio':
        baseCalories = 350; // High intensity cardio burns a lot
        break;
      case 'gym':
        baseCalories = 250; // Weight training
        break;
      case 'bodyweight':
        baseCalories = 200; // Moderate intensity
        break;
      case 'flexibility':
        baseCalories = 120; // Lower intensity but still burns calories
        break;
      default:
        baseCalories = 200;
    }
    
    // Add calories based on muscle groups involved (more muscle groups = higher intensity)
    const muscleGroupBonus = muscleGroups.length * 20;
    
    return baseCalories + muscleGroupBonus;
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

    // Check muscle group selection based on category
    if (selectedCategory === 'gym' || selectedCategory === 'bodyweight') {
      if (selectedPrimaryMuscles.length === 0) {
        Alert.alert('Error', 'Please select at least one primary target muscle');
        return;
      }
    } else {
      if (selectedMuscleGroups.length === 0) {
        Alert.alert('Error', 'Please select at least one muscle group');
        return;
      }
    }

    setIsLoading(true);

    try {
      // Load existing favorites
      const existingData = await AsyncStorage.getItem('favoriteExercises');
      const existingExercises: FavoriteExercise[] = existingData ? JSON.parse(existingData) : [];

      // Check if exercise already exists (skip if we're editing the same exercise)
      if (!isEditing) {
        const exerciseExists = existingExercises.some(
          exercise => exercise.name.toLowerCase().trim() === exerciseName.toLowerCase().trim()
        );

        if (exerciseExists) {
          Alert.alert('Duplicate Exercise', 'This exercise is already in your favorites');
          setIsLoading(false);
          return;
        }
      }

      // Create/update exercise with primary/secondary muscle support
      const allMuscleGroups = selectedCategory === 'gym' || selectedCategory === 'bodyweight' ? 
        [...selectedPrimaryMuscles, ...selectedSecondaryMuscles] : selectedMuscleGroups;
        
      const exerciseData: FavoriteExercise = {
        id: isEditing ? editExercise!.id : Date.now().toString(),
        name: exerciseName.trim(),
        category: selectedCategory,
        customCategory: selectedCategory === 'custom' ? customCategory.trim() : undefined,
        muscleGroups: allMuscleGroups, // Legacy field - combined for backward compatibility
        primaryMuscles: (selectedCategory === 'gym' || selectedCategory === 'bodyweight') ? selectedPrimaryMuscles : undefined,
        secondaryMuscles: (selectedCategory === 'gym' || selectedCategory === 'bodyweight') ? selectedSecondaryMuscles : undefined,
        instructions: instructionSteps.filter(step => step.trim()).join('\n') || undefined,
        notes: notes.trim() || undefined,
        addedAt: isEditing ? editExercise!.addedAt : new Date().toISOString(),
        estimatedCalories: estimateCalories(selectedCategory, allMuscleGroups),
        duration: isEditing ? editExercise!.duration : 30, // Preserve or default 30 minutes
        intensity: isEditing ? editExercise!.intensity : (selectedCategory === 'cardio' ? 'high' : selectedCategory === 'flexibility' ? 'low' : 'moderate'),
      };

      let updatedExercises;
      if (isEditing) {
        // Update existing exercise in place
        updatedExercises = existingExercises.map(ex => 
          ex.id === editExercise!.id ? exerciseData : ex
        );
        console.log('Updated existing exercise:', exerciseData.name);
      } else {
        // Add new exercise
        updatedExercises = [exerciseData, ...existingExercises];
        console.log('Added new exercise:', exerciseData.name);
      }
      
      await AsyncStorage.setItem('favoriteExercises', JSON.stringify(updatedExercises));

      // Navigate back with success message
      const successMessage = isEditing ? 'Exercise updated successfully!' : 'Exercise added to your favorites!';
      Alert.alert('Success', successMessage, [
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
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Exercise' : 'Add Exercise'}</Text>
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
                    // Reset to primary selection mode when switching categories
                    setMuscleSelectionMode('primary');
                    console.log('Category changed to:', newCategory);
                    console.log('Current muscle data:', categoryMuscleData);
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
              // Reset to primary selection mode when switching categories
              setMuscleSelectionMode('primary');
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
            {/* Primary/Secondary Selection for Gym and Bodyweight */}
            {(animatingCategory === 'gym' || animatingCategory === 'bodyweight') && (
              <View style={styles.muscleSectionContainer}>
                {/* Primary Section */}
                <TouchableOpacity
                  style={[
                    styles.muscleSectionCard,
                    muscleSelectionMode === 'primary' && [styles.activeMuscleSection, { borderColor: themeColor }]
                  ]}
                  onPress={() => setMuscleSelectionMode('primary')}
                  activeOpacity={0.8}
                >
                  <View style={styles.muscleSectionHeader}>
                    <View style={[styles.muscleSectionIcon, { backgroundColor: themeColor }]}>
                      <Ionicons name="flash" size={16} color="#000000" />
                    </View>
                    <View style={styles.muscleSectionContent}>
                      <Text style={[styles.muscleSectionTitle, muscleSelectionMode === 'primary' && { color: themeColor }]}>
                        Primary Target
                      </Text>
                      <Text style={styles.muscleSectionDescription}>
                        Main muscles • Count for volume
                      </Text>
                    </View>
                    <View style={styles.muscleSectionBadge}>
                      <Text style={[styles.muscleSectionBadgeText, { color: themeColor }]}>
                        {selectedPrimaryMuscles.length}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Secondary Section */}
                <TouchableOpacity
                  style={[
                    styles.muscleSectionCard,
                    muscleSelectionMode === 'secondary' && [styles.activeMuscleSection, { borderColor: '#71717a' }]
                  ]}
                  onPress={() => setMuscleSelectionMode('secondary')}
                  activeOpacity={0.8}
                >
                  <View style={styles.muscleSectionHeader}>
                    <View style={[styles.muscleSectionIcon, { backgroundColor: '#71717a' }]}>
                      <Ionicons name="add-circle-outline" size={16} color="#000000" />
                    </View>
                    <View style={styles.muscleSectionContent}>
                      <Text style={[styles.muscleSectionTitle, muscleSelectionMode === 'secondary' && { color: '#71717a' }]}>
                        Secondary
                      </Text>
                      <Text style={styles.muscleSectionDescription}>
                        Assist & stabilize • Optional
                      </Text>
                    </View>
                    <View style={styles.muscleSectionBadge}>
                      <Text style={[styles.muscleSectionBadgeText, { color: '#71717a' }]}>
                        {selectedSecondaryMuscles.length}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            )}
            
            <Text style={styles.sectionTitle}>
              {(animatingCategory === 'gym' || animatingCategory === 'bodyweight') ? 
                (muscleSelectionMode === 'primary' ? 'Primary Target Muscles' : 'Secondary Involvement') :
               animatingCategory === 'cardio' ? 'Primary Focus' : 
               animatingCategory === 'flexibility' ? 'Stretch Areas' : 
               animatingCategory === 'custom' ? 'Target Areas' :
               'Muscle Groups'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {(animatingCategory === 'gym' || animatingCategory === 'bodyweight') ? 
                (muscleSelectionMode === 'primary' ? 
                  'Main muscles that do most of the work (count for volume tracking)' : 
                  'Muscles that assist or stabilize (optional)') :
                'Select all that apply'}
            </Text>
            <View style={styles.muscleGroupGrid}>
              {getAllMuscleGroupOptions(animatingCategory).map((muscleGroup) => {
                // Determine if muscle is selected based on category
                let isSelected = false;
                if (animatingCategory === 'gym' || animatingCategory === 'bodyweight') {
                  isSelected = muscleSelectionMode === 'primary' ? 
                    selectedPrimaryMuscles.includes(muscleGroup) :
                    selectedSecondaryMuscles.includes(muscleGroup);
                } else {
                  isSelected = selectedMuscleGroups.includes(muscleGroup);
                }
                
                const isCustomOption = muscleGroup === 'Custom';
                const chipColor = (animatingCategory === 'gym' || animatingCategory === 'bodyweight') && muscleSelectionMode === 'secondary' ? '#71717a' : themeColor;
                
                return (
                  <TouchableOpacity
                    key={muscleGroup}
                    style={[
                      styles.muscleGroupChip,
                      isCustomOption && styles.customMuscleGroupChip,
                      isSelected && [styles.selectedMuscleGroupChip, { 
                        borderColor: chipColor, 
                        backgroundColor: `${chipColor}20` 
                      }]
                    ]}
                    onPress={() => handleMuscleGroupToggle(muscleGroup)}
                    activeOpacity={0.8}
                  >
                    {isCustomOption && (
                      <Ionicons name="add" size={14} color={isSelected ? chipColor : '#71717a'} style={{ marginRight: 4 }} />
                    )}
                    <Text style={[
                      styles.muscleGroupText, 
                      isCustomOption && styles.customMuscleGroupText,
                      isSelected && { color: chipColor }
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
          <Text style={styles.sectionTitle}>Instructions</Text>
          <Text style={styles.sectionSubtitle}>How to perform this exercise (optional)</Text>
          
          {instructionSteps.map((step, index) => (
            <View key={index} style={styles.instructionRow}>
              <View style={styles.numberContainer}>
                <Text style={styles.stepNumber}>{index + 1}.</Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.instructionInput}
                  placeholder="Enter step description..."
                  placeholderTextColor="#71717a"
                  value={step}
                  onChangeText={(text) => updateInstructionStep(index, text)}
                  multiline={false}
                />
                {instructionSteps.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeInstructionStep(index)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close" size={20} color="#71717a" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          
          <TouchableOpacity
            onPress={addInstructionStep}
            style={[styles.addStepBtn, { borderColor: themeColor }]}
          >
            <Ionicons name="add" size={20} color={themeColor} />
            <Text style={[styles.addStepText, { color: themeColor }]}>Add another step</Text>
          </TouchableOpacity>
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
            {isLoading ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Exercise' : 'Add to Favorites')}
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
  instructionRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  numberContainer: {
    width: 30,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructionInput: {
    flex: 1,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
    minHeight: 44,
  },
  removeButton: {
    marginLeft: 8,
    padding: 4,
  },
  addStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  addStepText: {
    fontSize: 16,
    fontWeight: '500',
  },
  muscleSectionContainer: {
    gap: 12,
    marginBottom: 16,
  },
  muscleSectionCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#27272a',
    padding: 16,
  },
  activeMuscleSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  muscleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  muscleSectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muscleSectionContent: {
    flex: 1,
  },
  muscleSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  muscleSectionDescription: {
    fontSize: 12,
    color: '#71717a',
    fontWeight: '500',
  },
  muscleSectionBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muscleSectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});