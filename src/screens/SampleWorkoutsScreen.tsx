import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Modal,
  Alert,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { SampleWorkout } from '../types/workout';
import { quickStartProgram } from '../data/sampleWorkouts';
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
    const routines = await WorkoutStorage.loadRoutines();
    
    // Define sample workout IDs to filter out duplicates
    const sampleWorkoutIds = [
      'sample_quick_start_ppl',
      'sample_muscle_builder_pro_52w', 
      'sample_glute_tone_12w'
    ];
    
    // Filter out any sample workouts that may have been imported before
    const customRoutines = routines.filter(routine => {
      // Check by ID if it exists
      if (routine.data?.id && sampleWorkoutIds.includes(routine.data.id)) {
        return false;
      }
      // Also check by routine name as fallback
      const sampleNames = [
        'Quick Start - Push Pull Legs',
        '52-Week Advanced Hypertrophy Program',
        '12-Week Glute & Tone'
      ];
      return !sampleNames.includes(routine.name);
    });
    
    // If we filtered out any duplicates, update storage
    if (customRoutines.length !== routines.length) {
      await WorkoutStorage.saveRoutines(customRoutines);
    }
    
    setUserWorkouts(customRoutines);
  };

  // Convert user routine to display format
  const convertUserWorkoutToSample = (routine: WorkoutRoutine): SampleWorkout => {
    return {
      id: routine.id,
      title: routine.name,
      description: 'Custom AI workout',
      duration: `${routine.days} days • ${routine.blocks} blocks`,
      difficulty: 'Custom',
      focus: 'Personal Training',
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
        targetMuscles: 'Customized based on your program design',
        restPeriods: 'As specified in your program',
        progression: 'Custom progression scheme',
        equipment: 'As required by your exercises'
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
            await WorkoutStorage.removeRoutine(workoutId);
            loadUserWorkouts();
          }
        }
      ]
    );
  };

  const sampleWorkouts: SampleWorkout[] = [
    {
      id: 'quick-start',
      title: 'Quick Start - Push Pull Legs',
      description: 'Perfect starter routine',
      duration: '3 days/week • 10 weeks',
      difficulty: 'Beginner',
      focus: 'General Fitness',
      program: quickStartProgram,
      detailInfo: {
        overview: 'A comprehensive 10-week beginner Push/Pull/Legs program with structured progression from bodyweight basics to barbell compound movements.',
        highlights: [
          '10 weeks of progressive overload',
          'Weekly rep progression built-in',
          'Gradual exercise complexity increase',
          'Proper beginner exercise selection',
          'Foundation → Strength → Advanced phases',
          'Alternative exercises for all levels'
        ],
        targetMuscles: 'Full body development with balanced push/pull/legs split covering chest, shoulders, triceps, back, biceps, quads, hamstrings, glutes, and calves',
        restPeriods: '60-210 seconds optimized for strength and muscle growth progression',
        progression: '3 structured blocks: Foundation Building (weeks 1-3), Strength Building (weeks 4-6), Advanced Development (weeks 7-10)',
        equipment: 'Progressive equipment needs: dumbbells → barbells → full gym access by week 7'
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
      description: 'Full year muscle growth',
      duration: '5 days/week • 52 weeks',
      difficulty: 'Advanced',
      focus: 'Hypertrophy & Strength',
      program: muscleBuilderProProgram,
      detailInfo: {
        overview: 'A comprehensive 52-week periodized program using Lower/Push/Pull/Lower/Upper splits with strategic volume and intensity cycling.',
        highlights: [
          'Hits muscle groups 2x per week',
          'Optimized rest periods for growth',
          'Weekly rep progression',
          'Periodized training blocks',
          'Advanced exercise selection'
        ],
        targetMuscles: 'Prioritizes legs and calves while building balanced physique',
        restPeriods: '90-210 seconds optimized for muscle growth',
        progression: '4-week mesocycles: Accumulation → Intensification → Deload',
        equipment: 'Full gym access required (barbells, cables, machines)'
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
    setShowDetailModal(true);
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
                  <View style={styles.workoutCard}>
                    <TouchableOpacity 
                      onPress={() => handleCopyWorkout(workout)}
                      activeOpacity={0.8}
                      style={styles.cardTouchable}
                    >
                      <LinearGradient
                        colors={['#2d3748', '#1a202c']}
                        style={styles.userCardGradient}
                      >
                        <View style={styles.cardContent}>
                          <View style={styles.cardHeader}>
                            <View style={[styles.difficultyBadge, { backgroundColor: '#8b5cf6' }]}>
                              <Text style={styles.difficultyText}>Custom</Text>
                            </View>
                            <TouchableOpacity 
                              style={styles.deleteButton}
                              onPress={() => handleDeleteWorkout(routine.id, routine.name)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="trash-outline" size={20} color="#ef4444" />
                            </TouchableOpacity>
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

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        {selectedWorkout && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedWorkout.title}</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Ionicons name="close" size={28} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.overviewText}>{selectedWorkout.detailInfo.overview}</Text>
              
              <View style={styles.highlightsSection}>
                <Text style={styles.sectionTitle}>Key Features</Text>
                {selectedWorkout.detailInfo.highlights.map((highlight, idx) => (
                  <View key={idx} style={styles.highlightItem}>
                    <Ionicons name="checkmark" size={16} color={themeColor} />
                    <Text style={styles.highlightText}>{highlight}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Target Muscles</Text>
                <Text style={styles.detailText}>{selectedWorkout.detailInfo.targetMuscles}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Rest Periods</Text>
                <Text style={styles.detailText}>{selectedWorkout.detailInfo.restPeriods}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Progression</Text>
                <Text style={styles.detailText}>{selectedWorkout.detailInfo.progression}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Equipment</Text>
                <Text style={styles.detailText}>{selectedWorkout.detailInfo.equipment}</Text>
              </View>
            </ScrollView>
          </View>
        )}
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  modalHeader: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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