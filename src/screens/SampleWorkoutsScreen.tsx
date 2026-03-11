import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { SampleWorkout } from '../types/workout';
import { foundationBuilderProgram } from '../data/sampleWorkouts';
import { muscleBuilderProProgram } from '../data/muscleBuilderPro';
import { gluteAndToneProgram } from '../data/gluteAndTone';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutStorage, WorkoutRoutine } from '../utils/storage';

type SampleWorkoutsNavigationProp = StackNavigationProp<RootStackParamList, 'SampleWorkouts'>;

export default function SampleWorkoutsScreen() {
  const { themeColor } = useTheme();
  const navigation = useNavigation<SampleWorkoutsNavigationProp>();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showWorkoutInfo, setShowWorkoutInfo] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<SampleWorkout | null>(null);
  const [activeTab, setActiveTab] = useState<'sample' | 'my'>('sample');
  const [userWorkouts, setUserWorkouts] = useState<WorkoutRoutine[]>([]);

  // Load user workouts when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadUserWorkouts();
    }, [])
  );

  const loadUserWorkouts = async () => {
    // Load from the saved collection (My Collection)
    const savedRoutines = await WorkoutStorage.loadMyRoutines();
    console.log('📱 My Workouts loading:', savedRoutines.length, 'saved routines');
    setUserWorkouts(savedRoutines);
  };

  // Convert user routine to display format
  const convertUserWorkoutToSample = (routine: WorkoutRoutine): SampleWorkout => {
    // Extract meaningful info from workout name and data
    const name = routine.name.toLowerCase();
    
    // Determine program type and details
    let programLength = 'Variable';
    let workoutType = 'Strength Training';
    let split = 'Custom Split';
    let equipment = 'Gym Required';
    let difficulty = 'Intermediate';
    
    if (name.includes('hypertrophy') || name.includes('muscle') || name.includes('builder')) {
      workoutType = 'Muscle Building & Hypertrophy';
      programLength = '52 weeks';
      split = 'Lower/Push/Pull/Lower/Upper';
      equipment = 'Full Gym Required';
      difficulty = 'Advanced';
    } else if (name.includes('glute') || name.includes('tone')) {
      workoutType = 'Glute Development & Toning';
      programLength = '12 weeks';
      split = 'Lower/Upper Body Focus';
      equipment = 'Home or Gym';
      difficulty = 'Intermediate';
    } else if (name.includes('beginner') || name.includes('start')) {
      workoutType = 'General Fitness & Strength';
      programLength = '10 weeks';
      split = 'Push/Pull/Legs';
      equipment = 'Basic Gym Equipment';
      difficulty = 'Beginner';
    }
    
    return {
      id: routine.id,
      title: routine.name,
      description: 'Custom AI workout',
      duration: `${routine.days} days/week • ${programLength}`,
      difficulty: difficulty,
      focus: workoutType,
      program: routine.data,
      detailInfo: {
        overview: 'Custom workout program generated or imported by you.',
        highlights: [
          'Personalized training program',
          'Custom exercise selection',
          'Tailored to your preferences',
          'AI-generated or imported',
          'Saved to your library'
        ],
        targetMuscles: split,
        restPeriods: 'Optimized for muscle growth and strength',
        progression: 'Progressive overload with weekly advancement',
        equipment: equipment
      }
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

  const sampleWorkouts: SampleWorkout[] = [
    {
      id: 'foundation-builder',
      title: 'Foundation Builder',
      description: 'Perfect starter routine',
      duration: '3 days/week • 12 weeks',
      difficulty: 'Beginner',
      focus: 'General Fitness',
      program: foundationBuilderProgram,
      detailInfo: {
        overview: '12-week full body general fitness program for beginners. Three days per week using antagonist supersets to maximise volume within 45-minute sessions.',
        highlights: [
          '12 weeks of progressive overload',
          'Antagonist supersets for efficiency',
          'Full body training 3x per week',
          'Movement quality focus in Block 1',
          'Foundation → Development phases',
          '45-minute time-efficient sessions'
        ],
        targetMuscles: 'Full body development with balanced training covering all major muscle groups through compound and isolation exercises',
        restPeriods: '75-120 seconds optimized for strength and muscle growth with superset pairings',
        progression: '2 structured blocks: Foundation (weeks 1-6), Development (weeks 7-12)',
        equipment: 'Full gym access required (barbells, dumbbells, machines, cables)'
      }
    },
    {
      id: 'glute-tone-12',
      title: '12-Week Glute & Tone',
      description: 'Feminine strength & curves',
      duration: '4 days/week • 12 weeks',
      difficulty: 'Intermediate',
      focus: 'Glute Development & Toning',
      program: gluteAndToneProgram,
      detailInfo: {
        overview: 'A comprehensive 12-week program specifically designed for women, focusing on glute development, overall toning, and feminine strength training with progressive lower/upper body splits.',
        highlights: [
          '4-day Lower/Upper split routine',
          'Glute-focused exercises and activation',
          'Progressive resistance training',
          'Toning and sculpting emphasis',
          'Builds strength while maintaining curves',
          'Suitable for home or gym training'
        ],
        targetMuscles: 'Primary focus on glutes, hips, and legs with comprehensive upper body toning including arms, shoulders, and core',
        restPeriods: '30-90 seconds optimized for toning and muscle definition',
        progression: '3 structured phases: Foundation & Activation (weeks 1-4), Strength & Shaping (weeks 5-8), Power & Definition (weeks 9-12)',
        equipment: 'Progressive needs: bodyweight → dumbbells → gym equipment for advanced phases'
      }
    },
    {
      id: 'hypertrophy-52',
      title: 'Muscle Builder Pro',
      description: 'Complete 1-year hypertrophy program',
      duration: '5 days/week • 48 weeks',
      difficulty: 'Advanced',
      focus: 'Advanced Hypertrophy Training',
      program: muscleBuilderProProgram,
      detailInfo: {
        overview: 'Complete 48-week advanced 5-day Push/Pull/Legs/Upper/Lower hypertrophy program. 4 mesocycles of 2 blocks each, progressing through Hypertrophy Foundation, Strength-Hypertrophy, Metabolic Intensification, and Peak & Consolidation phases.',
        highlights: [
          '4 mesocycles with progressive rep schemes',
          'Push/Pull/Legs/Upper/Lower 5-day split',
          'Hypertrophy Foundation (8-12 reps) → Peak & Consolidation (6-8 reps)',
          'Metabolic Intensification and Strength-Hypertrophy phases',
          '48-week structured progression',
          'Designed for advanced commercial gym lifters'
        ],
        targetMuscles: 'Complete physique development with Push/Pull/Legs/Upper/Lower split targeting all major muscle groups',
        restPeriods: 'Optimized for hypertrophy and strength gains across different training phases',
        progression: '4 mesocycles: Hypertrophy Foundation → Strength-Hypertrophy → Metabolic Intensification → Peak & Consolidation',
        equipment: 'Commercial gym required (full range of barbells, dumbbells, machines, cables)'
      }
    }
  ];

  const handleCopyWorkout = async (workout: SampleWorkout) => {
    const workoutJson = JSON.stringify(workout.program, null, 2);
    await Clipboard.setStringAsync(workoutJson);
    
    setCopiedId(workout.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1500);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return '#22c55e';
      case 'Intermediate':
        return '#f59e0b';
      case 'Advanced':
        return '#ef4444';
      default:
        return '#71717a';
    }
  };

  const handleShowDetails = (workout: SampleWorkout) => {
    console.log('ℹ️ INFO BUTTON PRESSED:', workout.title);
    
    setSelectedWorkout(workout);
    setShowWorkoutInfo(true);
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
          <Text style={styles.headerTitle}>Workout Plans</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'sample' && styles.activeTab]}
            onPress={() => setActiveTab('sample')}
          >
            <Text style={[styles.tabText, activeTab === 'sample' && styles.activeTabText]}>
              Sample Plans
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'my' && styles.activeTab]}
            onPress={() => setActiveTab('my')}
          >
            <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>
              My Workouts {userWorkouts.length > 0 && `(${userWorkouts.length})`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Workout Cards */}
        {activeTab === 'sample' && sampleWorkouts.map((workout, index) => {
          const imageUrls = [
            'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1550259979-ed79b48d2a30?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1549476464-37392f717541?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
          ];
          
          return (
            <View key={workout.id} style={styles.cardContainer}>
              <View style={styles.workoutCard}>
                {/* Main card TouchableOpacity */}
                <TouchableOpacity 
                  onPress={() => handleCopyWorkout(workout)}
                  activeOpacity={0.8}
                  style={styles.cardTouchable}
                >
                  <ImageBackground
                    style={styles.cardBackground}
                    imageStyle={styles.cardImage}
                    source={{ uri: imageUrls[index] }}
                  >
                    <LinearGradient
                      colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
                      style={styles.cardGradient}
                    >
                      <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(workout.difficulty) }]}>
                            <Text style={styles.difficultyText}>{workout.difficulty}</Text>
                          </View>
                        </View>

                        <View style={styles.cardMainContent}>
                          <Text style={styles.workoutTitle}>{workout.title}</Text>
                          <Text style={styles.workoutDescription}>{workout.description}</Text>
                          
                          <View style={styles.cardFooter}>
                            <View style={styles.cardFooterLeft}>
                              <Text style={styles.focusText}>{workout.focus}</Text>
                              <Text style={styles.durationText}>{workout.duration}</Text>
                            </View>
                            <TouchableOpacity 
                              style={styles.inlineInfoButton}
                              onPress={() => handleShowDetails(workout)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="information-circle" size={28} color="rgba(255,255,255,0.9)" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </LinearGradient>
                  </ImageBackground>
                </TouchableOpacity>
                
                {/* Copied Overlay */}
                {copiedId === workout.id && (
                  <View style={styles.copiedOverlay}>
                    <LinearGradient
                      colors={[`${themeColor}F2`, `${themeColor}D9`]}
                      style={styles.copiedGradient}
                    >
                      <View style={styles.copiedContent}>
                        <Ionicons name="checkmark-circle" size={60} color="#ffffff" />
                        <Text style={styles.copiedTitle}>Copied!</Text>
                        <Text style={styles.copiedSubtitle}>{workout.title} is ready to import</Text>
                      </View>
                    </LinearGradient>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* User Workouts */}
        {activeTab === 'my' && (
          userWorkouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="fitness-outline" size={64} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyTitle}>No Custom Workouts</Text>
              <Text style={styles.emptyDescription}>
                Import or create a custom workout to see it here
              </Text>
            </View>
          ) : (
            userWorkouts.map((routine, index) => {
              const workout = convertUserWorkoutToSample(routine);
              
              return (
                <View key={workout.id} style={styles.cardContainer}>
                  <TouchableOpacity
                    style={styles.card}
                    activeOpacity={0.9}
                    onPress={() => handleCopyWorkout(workout)}
                  >
                    <View style={styles.userMealGradient}>
                      <View style={styles.userMealHeader}>
                        <Text style={styles.userMealTitle}>{workout.title}</Text>
                        <TouchableOpacity 
                          style={styles.deleteButton}
                          onPress={() => handleDeleteWorkout(routine.id, routine.name)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.userMealSubtitle}>Custom workout</Text>
                      <View style={styles.userMealDetails}>
                        <Text style={styles.userMealText}>Tap to copy & share</Text>
                      </View>

                      {/* Info Button - Bottom Right */}
                      <TouchableOpacity 
                        style={styles.infoButtonBottomRight}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleShowDetails(workout);
                        }}
                      >
                        <Ionicons name="information-circle-outline" size={20} color={themeColor} />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Copied Overlay */}
                    {copiedId === workout.id && (
                      <View style={styles.copiedOverlay}>
                        <LinearGradient
                          colors={[`${themeColor}F2`, `${themeColor}D9`]}
                          style={styles.copiedGradient}
                        >
                          <View style={styles.copiedContent}>
                            <Ionicons name="checkmark-circle" size={60} color="#ffffff" />
                            <Text style={styles.copiedTitle}>Copied!</Text>
                            <Text style={styles.copiedSubtitle}>{workout.title} is ready to import</Text>
                          </View>
                        </LinearGradient>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )
        )}

        {activeTab === 'sample' && (
          <View style={styles.trendsSection}>
            <Text style={styles.sectionTitle}>Getting Started</Text>
            <View style={styles.infoCard}>
              <LinearGradient
                colors={['#2d3748', '#1a202c']}
                style={styles.infoGradient}
              >
                <View style={styles.infoContent}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="download-outline" size={24} color={themeColor} />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoTitle}>How to Import</Text>
                    <Text style={styles.infoDescription}>
                      Tap any workout card to copy it to your clipboard, then return and use "Paste & Import"
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>
        )}

        <View style={styles.bottomSection}>
          <Text style={styles.bottomText}>
            {activeTab === 'sample' ? 'More workout plans coming soon' : 'Import workouts to build your collection'}
          </Text>
        </View>
      </ScrollView>

      {/* Workout Modal - EXACT copy from working nutrition screen */}
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.actionModalOverlay}>
          <TouchableOpacity 
            style={styles.actionModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowDetailModal(false)}
          />
          
          <View style={styles.actionSheet}>
            {/* Handle Bar */}
            <View style={styles.handleBar} />
            
            {/* Header */}
            <View style={styles.actionHeader}>
              <Text style={styles.actionTitle}>Workout Options</Text>
              <TouchableOpacity
                style={styles.actionCloseButton}
                onPress={() => setShowDetailModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#a1a1aa" />
              </TouchableOpacity>
            </View>
            
            {/* Plan Info */}
            {selectedWorkout && (
              <>
                <View style={styles.actionPlanInfo}>
                  <Text style={styles.actionPlanName} numberOfLines={2}>
                    {selectedWorkout.title}
                  </Text>
                  <Text style={styles.actionPlanDetails}>
                    {selectedWorkout.duration} • {selectedWorkout.difficulty}
                  </Text>
                </View>
                
                <View style={styles.modernActionButtons}>
                  {/* Save to Collection Button */}
                  <TouchableOpacity
                    style={styles.saveActionButton}
                    onPress={() => {
                      // Handle save to collection
                      console.log('💾 Save to My Workouts');
                      setShowDetailModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name="heart" 
                      size={18} 
                      color="#ffffff" 
                    />
                    <Text style={styles.saveActionText}>Save to Collection</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.renameButton}
                    onPress={() => {
                      console.log('✏️ Rename workout');
                      setShowDetailModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={18} color="#ffffff" />
                    <Text style={styles.renameText}>Rename</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.deleteConfirmButton}
                    onPress={() => {
                      console.log('🗑️ Remove workout');
                      setShowDetailModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash" size={18} color="#ffffff" />
                    <Text style={styles.deleteConfirmText}>Remove</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.deleteCancelButton}
                    onPress={() => setShowDetailModal(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.deleteCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Workout Info Modal */}
      <Modal
        visible={showWorkoutInfo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWorkoutInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedWorkout?.title}</Text>
              <TouchableOpacity
                onPress={() => setShowWorkoutInfo(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#71717a" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDescription}>
                {selectedWorkout?.detailInfo?.overview || 'Program structure and organization for your custom workout plan.'}
              </Text>
              
              {selectedWorkout && (
                <View style={styles.nutritionInfo}>
                  <Text style={styles.nutritionTitle}>Program Details:</Text>
                  <View style={styles.nutritionRow}>
                    <Text style={styles.nutritionLabel}>Duration:</Text>
                    <Text style={[styles.nutritionValue, { color: themeColor }]}>
                      {selectedWorkout.duration}
                    </Text>
                  </View>
                  <View style={styles.nutritionRow}>
                    <Text style={styles.nutritionLabel}>Difficulty:</Text>
                    <Text style={[styles.nutritionValue, { color: themeColor }]}>
                      {selectedWorkout.difficulty}
                    </Text>
                  </View>
                  <View style={styles.nutritionRow}>
                    <Text style={styles.nutritionLabel}>Focus:</Text>
                    <Text style={[styles.nutritionValue, { color: themeColor }]}>
                      {selectedWorkout.focus}
                    </Text>
                  </View>
                </View>
              )}

              {selectedWorkout?.detailInfo?.highlights && (
                <View style={styles.features}>
                  <Text style={styles.featuresTitle}>Program Highlights:</Text>
                  {selectedWorkout.detailInfo.highlights.map((highlight, index) => (
                    <Text key={index} style={styles.featureItem}>• {highlight}</Text>
                  ))}
                </View>
              )}

              {selectedWorkout?.detailInfo?.targetMuscles && (
                <View style={styles.features}>
                  <Text style={styles.featuresTitle}>Target Muscles:</Text>
                  <Text style={styles.featureItem}>{selectedWorkout.detailInfo.targetMuscles}</Text>
                </View>
              )}

              {selectedWorkout?.detailInfo?.progression && (
                <View style={styles.features}>
                  <Text style={styles.featuresTitle}>Progression:</Text>
                  <Text style={styles.featureItem}>{selectedWorkout.detailInfo.progression}</Text>
                </View>
              )}

              {selectedWorkout?.detailInfo?.equipment && (
                <View style={styles.features}>
                  <Text style={styles.featuresTitle}>Equipment Required:</Text>
                  <Text style={styles.featureItem}>{selectedWorkout.detailInfo.equipment}</Text>
                </View>
              )}
              
              <View style={styles.features}>
                <Text style={styles.featuresTitle}>Actions:</Text>
                <Text style={styles.featureItem}>• Tap the card to copy JSON data</Text>
                <Text style={styles.featureItem}>• Share with other users</Text>
                <Text style={styles.featureItem}>• Use in workout planning apps</Text>
                <Text style={styles.featureItem}>• Import into your routine library</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  expandedContainer: {
    paddingVertical: 20,
  },
  workoutCard: {
    borderRadius: 16,
    height: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  // Copied exact meal plan card styles
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
  userMealGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    borderRadius: 20,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  userMealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  infoButton: {
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
  },
  userMealTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginRight: 12,
  },
  userMealSubtitle: {
    fontSize: 16,
    color: '#e4e4e7',
    marginBottom: 12,
  },
  userMealDetails: {
    marginTop: 'auto',
  },
  userMealText: {
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
  infoButtonBottomRight: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedCard: {
    height: 400,
    marginBottom: 32,
    marginTop: 16,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
  },
  cardHidden: {
    opacity: 0,
  },
  cardTouchable: {
    width: '100%',
    height: '100%',
  },
  cardBack: {
    backgroundColor: '#1e293b',
  },
  cardBackground: {
    width: '100%',
    height: '100%',
  },
  cardImage: {
    borderRadius: 16,
  },
  cardGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  cardHeader: {
    alignItems: 'flex-start',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  infoButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    transform: [{ scale: 0.95 }],
  },
  cardContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  cardMainContent: {
    justifyContent: 'flex-end',
  },
  cardBackGradient: {
    flex: 1,
    padding: 20,
  },
  backHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 8,
  },
  backContent: {
    flex: 1,
  },
  cardContentArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardContent: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flex: 1,
  },
  workoutTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  workoutDescription: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 12,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardFooter: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardFooterLeft: {
    flex: 1,
    gap: 4,
  },
  inlineInfoButton: {
    marginLeft: 12,
    padding: 4,
  },
  focusText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  durationText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  trendsSection: {
    marginTop: 32,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  infoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  infoGradient: {
    padding: 20,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(66, 153, 225, 0.2)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
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
  overviewText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    marginBottom: 16,
  },
  highlightsSection: {
    marginBottom: 16,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  highlightText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  // Copied overlay styles
  copiedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
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
  // Working Modal styles - copied from nutrition screen
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  actionModalBackdrop: {
    flex: 1,
  },
  actionSheet: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 20,
    maxHeight: '80%',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#71717a',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  actionCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionPlanInfo: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  actionPlanName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  actionPlanDetails: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  modalScrollContent: {
    flex: 1,
  },
  modernActionButtons: {
    flexDirection: 'column',
    gap: 16,
    width: '100%',
  },
  saveActionButton: {
    width: '100%',
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  renameButton: {
    width: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  renameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteConfirmButton: {
    width: '100%',
    backgroundColor: '#ef4444',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  deleteConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteCancelButton: {
    width: '100%',
    backgroundColor: '#27272a',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#3f3f46',
  },
  deleteCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  // Modal styles (copied from nutrition screen)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: '#e4e4e7',
    lineHeight: 24,
    marginBottom: 24,
  },
  nutritionInfo: {
    backgroundColor: '#0a0a0b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  nutritionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  nutritionLabel: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  features: {
    backgroundColor: '#0a0a0b',
    borderRadius: 12,
    padding: 16,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  featureItem: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 6,
    lineHeight: 20,
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 28,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 20,
    padding: 3,
    backdropFilter: 'blur(20px)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    marginHorizontal: 2,
    minHeight: 52,
  },
  activeTab: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  activeTabText: {
    color: '#1e293b',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // User workout card styles
  userCardGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    borderRadius: 16,
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 20,
    padding: 8,
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
});