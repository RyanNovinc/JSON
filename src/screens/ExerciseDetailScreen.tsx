import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Share,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { TouchableOpacity as GestureHandlerTouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
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
  alternatives?: string[]; // Alternative exercise names
  addedAt: string;
  estimatedCalories?: number;
  duration?: number;
  intensity?: 'low' | 'moderate' | 'high';
}

export default function ExerciseDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { themeColor } = useTheme();
  const [isFavorite, setIsFavorite] = useState(true);
  const [currentExercise, setCurrentExercise] = useState<FavoriteExercise | null>(null);
  
  // Initialize exercise with safe defaults (no data clearing)
  React.useEffect(() => {
    const initializeExercise = async () => {
      const routeExercise = route.params?.exercise;
      
      if (routeExercise && typeof routeExercise === 'object') {
        // Ensure all required fields are present and properly formatted
        const safeExercise: FavoriteExercise = {
          id: typeof routeExercise.id === 'string' ? routeExercise.id : 'unknown',
          name: typeof routeExercise.name === 'string' ? routeExercise.name : 'Unknown Exercise',
          category: typeof routeExercise.category === 'string' ? routeExercise.category as any : 'gym',
          muscleGroups: Array.isArray(routeExercise.muscleGroups) ? routeExercise.muscleGroups.filter(g => typeof g === 'string') : ['Custom'],
          primaryMuscles: Array.isArray(routeExercise.primaryMuscles) ? routeExercise.primaryMuscles.filter(m => typeof m === 'string') : ['Custom'],
          secondaryMuscles: Array.isArray(routeExercise.secondaryMuscles) ? routeExercise.secondaryMuscles.filter(m => typeof m === 'string') : [],
          instructions: typeof routeExercise.instructions === 'string' ? routeExercise.instructions : '',
          notes: typeof routeExercise.notes === 'string' ? routeExercise.notes : '',
          alternatives: Array.isArray(routeExercise.alternatives) ? routeExercise.alternatives.filter(a => typeof a === 'string') : [],
          addedAt: typeof routeExercise.addedAt === 'string' ? routeExercise.addedAt : new Date().toISOString(),
          estimatedCalories: typeof routeExercise.estimatedCalories === 'number' ? routeExercise.estimatedCalories : 0,
          duration: typeof routeExercise.duration === 'number' ? routeExercise.duration : 0,
          intensity: typeof routeExercise.intensity === 'string' ? routeExercise.intensity as any : 'moderate',
          customCategory: typeof routeExercise.customCategory === 'string' ? routeExercise.customCategory : undefined
        };
        
        setCurrentExercise(safeExercise);
      }
    };
    
    initializeExercise();
  }, [route.params?.exercise]);

  // Reload exercise data when screen comes into focus (after editing)
  useFocusEffect(
    React.useCallback(() => {
      const reloadExerciseData = async () => {
        try {
          const savedData = await AsyncStorage.getItem('favoriteExercises');
          if (savedData) {
            const exercises: FavoriteExercise[] = JSON.parse(savedData);
            const updatedExercise = exercises.find(ex => ex.id === currentExercise?.id);
            if (updatedExercise) {
              setCurrentExercise(updatedExercise);
            }
          }
        } catch (error) {
          console.error('Failed to reload exercise data:', error);
        }
      };
      
      if (currentExercise?.id) {
        reloadExerciseData();
      }
    }, [currentExercise?.id])
  );

  // MOVED HOOKS ABOVE EARLY RETURN - Support both new and legacy muscle group formats
  const primaryMuscles = React.useMemo(() => {
    if (currentExercise?.primaryMuscles && Array.isArray(currentExercise.primaryMuscles)) {
      return currentExercise.primaryMuscles.filter(muscle => typeof muscle === 'string');
    }
    if (currentExercise?.muscleGroups && Array.isArray(currentExercise.muscleGroups)) {
      return currentExercise.muscleGroups.filter(group => typeof group === 'string' && group !== 'Custom');
    }
    return [];
  }, [currentExercise?.primaryMuscles, currentExercise?.muscleGroups]);

  const secondaryMuscles = React.useMemo(() => {
    if (currentExercise?.secondaryMuscles && Array.isArray(currentExercise.secondaryMuscles)) {
      return currentExercise.secondaryMuscles.filter(muscle => typeof muscle === 'string');
    }
    return [];
  }, [currentExercise?.secondaryMuscles]);
  
  const exercise = currentExercise;

  if (!exercise) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Exercise not found</Text>
      </SafeAreaView>
    );
  }

  const getCategoryDisplay = () => {
    if (exercise.category === 'custom' && exercise.customCategory) {
      return exercise.customCategory;
    }
    return exercise.category.charAt(0).toUpperCase() + exercise.category.slice(1);
  };

  const getInstructionSteps = () => {
    if (!exercise.instructions) return [];
    return exercise.instructions.split('\n').filter(step => step.trim());
  };

  const handleShare = async () => {
    try {
      const primaryText = primaryMuscles.length > 0 ? `Primary: ${primaryMuscles.join(', ')}` : '';
      const secondaryText = secondaryMuscles.length > 0 ? `\nSecondary: ${secondaryMuscles.join(', ')}` : '';
      const musclesText = primaryText + secondaryText;
      
      const shareContent = `${exercise.name}\n\nCategory: ${getCategoryDisplay()}\n${musclesText}${exercise.instructions ? '\n\nInstructions:\n' + exercise.instructions : ''}${exercise.notes ? '\n\nNotes:\n' + exercise.notes : ''}\n\nShared from AI Workout Generator`;
      
      await Share.share({
        message: shareContent,
        title: exercise.name,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share exercise');
    }
  };

  const handleFavoriteToggle = async () => {
    try {
      const existingData = await AsyncStorage.getItem('favoriteExercises');
      const existingExercises: FavoriteExercise[] = existingData ? JSON.parse(existingData) : [];
      
      if (isFavorite) {
        // Remove from favorites
        const updatedExercises = existingExercises.filter(ex => ex.id !== exercise.id);
        await AsyncStorage.setItem('favoriteExercises', JSON.stringify(updatedExercises));
        setIsFavorite(false);
        
        Alert.alert(
          'Removed from Favorites',
          `"${exercise.name}" has been removed from your favorites.`
        );
      } else {
        // Add to favorites
        const updatedExercises = [exercise, ...existingExercises];
        await AsyncStorage.setItem('favoriteExercises', JSON.stringify(updatedExercises));
        setIsFavorite(true);
        
        Alert.alert('Added to Favorites', `"${exercise.name}" has been added to your favorites.`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorites');
    }
  };

  const handleEdit = () => {
    console.log('Edit button pressed for exercise:', exercise?.name);
    // Navigate to edit screen with exercise data
    navigation.navigate('ManualExerciseEntry' as any, { 
      editExercise: exercise,
      isEditing: true 
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <GestureHandlerTouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </GestureHandlerTouchableOpacity>
        <View style={styles.rightButtons}>
          <GestureHandlerTouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color="#ffffff" />
          </GestureHandlerTouchableOpacity>
          <GestureHandlerTouchableOpacity style={styles.heartButton} onPress={handleFavoriteToggle}>
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={24} 
              color={isFavorite ? "#ef4444" : "#71717a"} 
            />
          </GestureHandlerTouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Content Card */}
        <View style={styles.mainCard}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            
            {/* Alternative Exercises - Right under main name */}
            {exercise.alternatives && exercise.alternatives.length > 0 && (
              <View style={styles.headerAlternatives}>
                <Text style={styles.headerAlternativesTitle}>Alternatives:</Text>
                <View style={styles.headerAlternativesList}>
                  {exercise.alternatives.map((alternative, index) => (
                    <Text key={index} style={styles.headerAlternativeText}>
                      {alternative}{index < exercise.alternatives!.length - 1 ? ' • ' : ''}
                    </Text>
                  ))}
                </View>
              </View>
            )}
            
            <View style={[styles.categoryBadge, { backgroundColor: themeColor + '15', borderColor: themeColor + '40' }]}>
              <Ionicons name="fitness-outline" size={16} color={themeColor} />
              <Text style={[styles.categoryText, { color: themeColor }]}>
                {getCategoryDisplay()}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Target Areas Section */}
          <View style={styles.inlineSection}>
            {/* Primary Muscles */}
            {primaryMuscles.length > 0 && (
              <View style={styles.muscleSection}>
                <Text style={styles.inlineSectionTitle}>Primary Target</Text>
                <View style={styles.chipContainer}>
                  {primaryMuscles.map((muscle, index) => (
                    <View key={`primary-${index}`} style={[styles.targetChip, { backgroundColor: themeColor + '15', borderColor: themeColor + '40' }]}>
                      <Text style={[styles.targetChipText, { color: themeColor }]}>{muscle}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {/* Secondary Muscles */}
            {secondaryMuscles.length > 0 && (
              <View style={[styles.muscleSection, primaryMuscles.length > 0 && { marginTop: 20 }]}>
                <Text style={styles.secondarySectionTitle}>Secondary Involvement</Text>
                <View style={styles.chipContainer}>
                  {secondaryMuscles.map((muscle, index) => (
                    <View key={`secondary-${index}`} style={[styles.secondaryChip]}>
                      <Text style={styles.secondaryChipText}>{muscle}</Text>
                    </View>
                  ))}
                </View>
                {primaryMuscles.length > 0 && (
                  <Text style={styles.secondaryNote}>
                    Secondary muscles receive training stimulus but require dedicated exercises for optimal development.
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Instructions Section */}
          {getInstructionSteps().length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.inlineSection}>
                <Text style={styles.inlineSectionTitle}>Instructions</Text>
                <View style={styles.instructionsList}>
                  {getInstructionSteps().map((step, index) => (
                    <View key={index} style={styles.instructionRow}>
                      <View style={[styles.stepBadge, { backgroundColor: themeColor }]}>
                        <Text style={styles.stepBadgeText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.instructionText}>{step}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Additional Notes Section */}
          {exercise.notes && (
            <>
              <View style={styles.divider} />
              <View style={styles.inlineSection}>
                <View style={styles.notesHeader}>
                  <Ionicons name="document-text-outline" size={18} color={themeColor} />
                  <Text style={styles.notesTitle}>Additional Notes</Text>
                </View>
                <Text style={styles.notesContent}>{exercise.notes}</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
      
      {/* Floating Edit Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity 
          style={[styles.editFab, { backgroundColor: themeColor }]} 
          onPress={handleEdit}
          activeOpacity={0.8}
        >
          <Ionicons name="pencil" size={20} color="#ffffff" />
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
    paddingTop: 10,
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
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mainCard: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 20,
    overflow: 'hidden',
  },
  headerSection: {
    padding: 24,
    alignItems: 'flex-start',
    gap: 16,
  },
  exerciseName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 34,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerAlternatives: {
    marginVertical: 8,
  },
  headerAlternativesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717a',
    marginBottom: 4,
  },
  headerAlternativesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  headerAlternativeText: {
    fontSize: 16,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#27272a',
    marginHorizontal: 0,
  },
  inlineSection: {
    padding: 24,
  },
  inlineSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  muscleSection: {
    // Container for each muscle group section
  },
  secondarySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a1a1aa',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  targetChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  targetChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryChip: {
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#27272a',
  },
  secondaryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#a1a1aa',
  },
  secondaryNote: {
    fontSize: 12,
    color: '#71717a',
    fontStyle: 'italic',
    marginTop: 12,
    lineHeight: 16,
  },
  instructionsList: {
    gap: 20,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a0a0b',
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    color: '#e4e4e7',
    lineHeight: 24,
    fontWeight: '400',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  notesContent: {
    fontSize: 16,
    color: '#e4e4e7',
    lineHeight: 24,
    fontWeight: '400',
  },
  bottomPadding: {
    height: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 100,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 999,
  },
  editFab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
});