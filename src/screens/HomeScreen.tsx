import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Share,
  Platform,
  Modal,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { WorkoutStorage, WorkoutRoutine, MealPlan } from '../utils/storage';
import WorkoutCalendar from '../components/WorkoutCalendar';
import ImportFeedbackModal from '../components/ImportFeedbackModal';
import OnboardingOverlay from '../components/OnboardingOverlay';
import { useImportFeedback } from '../hooks/useImportFeedback';
import { useRevenueCat } from '../contexts/RevenueCatContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAppMode } from '../contexts/AppModeContext';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function RoutineCard({ routine, onExport, onPress, onLongPress, isPinkTheme, themeColor }: { 
  routine: WorkoutRoutine; 
  onExport: () => void;
  onPress: () => void;
  onLongPress: () => void;
  isPinkTheme?: boolean;
  themeColor: string;
}) {
  return (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.8} 
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={800}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>{routine.name}</Text>
          <Text style={styles.cardSubtitle}>
            {routine.days} days • {routine.blocks} blocks
          </Text>
        </View>
        <TouchableOpacity onPress={onExport} style={styles.exportButton}>
          <Ionicons name="share-outline" size={22} color={themeColor} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ route }: any) {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [shareModal, setShareModal] = useState<{ visible: boolean; routine: WorkoutRoutine | null }>({
    visible: false,
    routine: null,
  });
  const [successModal, setSuccessModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ visible: boolean; routine: WorkoutRoutine | null }>({
    visible: false,
    routine: null,
  });
  const [calendarModal, setCalendarModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const { showFeedbackModal, submitFeedback, skipFeedback, triggerFeedbackModal } = useImportFeedback();
  const { hasJSONPro } = useRevenueCat();
  const { isPinkTheme, setIsPinkTheme, themeColor, themeColorLight } = useTheme();
  const { appMode, setAppMode, isTrainingMode, isNutritionMode } = useAppMode();

  // Load routines from storage on component mount
  useEffect(() => {
    loadRoutines();
  }, []);

  // Check if onboarding should be shown
  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    const isCompleted = await WorkoutStorage.isOnboardingCompleted();
    if (!isCompleted) {
      setShowOnboarding(true);
    }
  };

  // Handle imported program
  useEffect(() => {
    const handleImportedProgram = async () => {
      if (route?.params?.importedProgram) {
        const program = route.params.importedProgram;
        
        // Define sample workout IDs to prevent duplicates
        const sampleWorkoutIds = [
          'sample_quick_start_ppl',
          'sample_muscle_builder_pro_52w', 
          'sample_glute_tone_12w'
        ];
        
        // Check if this is a sample workout trying to be imported
        if (program.id && sampleWorkoutIds.includes(program.id)) {
          Alert.alert(
            'Already Available',
            'This workout is already available in Sample Plans. You can access it anytime from the Workout Plans screen.',
            [{ text: 'OK' }]
          );
          
          // Clear the params and return early
          navigation.setParams({ importedProgram: undefined } as any);
          return;
        }
        
        const newRoutine: WorkoutRoutine = {
          id: Date.now().toString(),
          name: program.routine_name,
          days: program.days_per_week,
          blocks: program.blocks.length,
          data: program,
          programId: program.programId, // Link to mesocycle program if applicable
        };
        addRoutine(newRoutine);
        
        // If this routine is part of a mesocycle program, update the program's routine list
        if (program.programId) {
          try {
            const { ProgramStorage } = await import('../data/programStorage');
            await ProgramStorage.addRoutineToProgram(program.programId, newRoutine.id);
          } catch (error) {
            console.error('Failed to link routine to program:', error);
          }
        }
        
        // Trigger feedback modal if the program has an import ID
        if (program.id) {
          setTimeout(() => {
            triggerFeedbackModal(program.id);
          }, 1000); // Give time for the program to be added to the list
        }
        
        // Clear the params to prevent re-adding
        navigation.setParams({ importedProgram: undefined } as any);
      }
    };

    handleImportedProgram();
  }, [route?.params?.importedProgram, triggerFeedbackModal]);

  const loadRoutines = async () => {
    const storedRoutines = await WorkoutStorage.loadRoutines();
    setRoutines(storedRoutines);
  };

  const addRoutine = async (routine: WorkoutRoutine) => {
    await WorkoutStorage.addRoutine(routine);
    setRoutines(prev => [...prev, routine]);
  };

  const handleExport = (routine: WorkoutRoutine) => {
    if (!routine.data) return;
    setShareModal({ visible: true, routine });
  };

  const handleShare = async (action: 'copy' | 'share') => {
    const routine = shareModal.routine;
    if (!routine?.data) return;
    
    const jsonString = JSON.stringify(routine.data, null, 2);
    
    if (action === 'copy') {
      await Clipboard.setStringAsync(jsonString);
      setShareModal({ visible: false, routine: null });
      setTimeout(() => {
        setSuccessModal(true);
      }, 100);
    } else if (action === 'share') {
      try {
        await Share.share({
          message: jsonString,
          title: `${routine.name} Workout`,
        });
        setShareModal({ visible: false, routine: null });
      } catch (error) {
        console.error('Error sharing:', error);
        setShareModal({ visible: false, routine: null });
      }
    }
  };

  const handleDeleteRequest = (routine: WorkoutRoutine) => {
    setDeleteModal({ visible: true, routine });
  };

  const handleDeleteConfirm = async () => {
    const routine = deleteModal.routine;
    if (!routine) return;

    try {
      await WorkoutStorage.removeRoutine(routine.id);
      setRoutines(prev => prev.filter(r => r.id !== routine.id));
      setDeleteModal({ visible: false, routine: null });
    } catch (error) {
      console.error('Failed to delete routine:', error);
    }
  };

  const handleOnboardingDismiss = async () => {
    setShowOnboarding(false);
    await WorkoutStorage.setOnboardingCompleted();
  };

  const resetOnboarding = async () => {
    await WorkoutStorage.clearAllData();
    setShowOnboarding(true);
  };

  const handleNutritionTransition = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Switch mode and navigate
      setAppMode('nutrition');
      navigation.navigate('NutritionHome' as any);
      
      // Reset animations for when user comes back
      setTimeout(() => {
        fadeAnim.setValue(1);
        scaleAnim.setValue(1);
        setIsTransitioning(false);
      }, 100);
    });
  };

  const handleGoToTodayWorkout = async () => {
    try {
      if (routines.length === 0) {
        Alert.alert(
          'No Workout Routines',
          'You need to import a workout routine first to use "Go to Today".',
          [{ text: 'OK' }]
        );
        return;
      }

      // Find the active routine (first one for now, but could be extended to find truly active one)
      const activeRoutine = routines[0];
      
      if (!activeRoutine.data?.blocks || activeRoutine.data.blocks.length === 0) {
        Alert.alert(
          'Invalid Routine',
          'The selected routine does not have valid workout blocks.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get the active block from storage
      let activeBlockIndex = 0;
      try {
        const savedActiveBlock = await WorkoutStorage.getActiveBlock(activeRoutine.id);
        if (savedActiveBlock !== null) {
          activeBlockIndex = savedActiveBlock;
        }
      } catch (error) {
        console.log('No active block saved, using first block');
      }

      const activeBlock = activeRoutine.data.blocks[activeBlockIndex];
      
      // Calculate current week based on completion
      let currentWeek = 1;
      const totalWeeks = activeBlock.weeks.includes('-') 
        ? parseInt(activeBlock.weeks.split('-')[1]) - parseInt(activeBlock.weeks.split('-')[0]) + 1 
        : 1;

      try {
        // Check for manually bookmarked week first
        const bookmarkData = await WorkoutStorage.getBookmark(activeBlock.block_name);
        if (bookmarkData?.isBookmarked) {
          currentWeek = bookmarkData.week;
        } else {
          // Find first incomplete week
          for (let week = 1; week <= totalWeeks; week++) {
            const completedWorkouts = await WorkoutStorage.getCompletedWorkouts(activeBlock.block_name, week);
            
            if (!completedWorkouts || completedWorkouts.length === 0) {
              currentWeek = week;
              break;
            }
            
            // Check if all days in this week are completed
            const allDaysCompleted = activeBlock.days.every(day => 
              completedWorkouts.includes(`${day.day_name}_week${week}`)
            );
            
            if (!allDaysCompleted) {
              currentWeek = week;
              break;
            }
            
            // If we're on the last week and it's complete, stay on last week
            if (week === totalWeeks) {
              currentWeek = totalWeeks;
            }
          }
        }
      } catch (error) {
        console.log('Error calculating current week, using week 1');
        currentWeek = 1;
      }

      // Navigate to BlocksScreen first, then it will handle going to today's workout
      navigation.navigate('Blocks' as any, { 
        routine: activeRoutine,
        initialBlock: activeBlockIndex,
        initialWeek: currentWeek  // Pass the calculated week to jump to today
      });
      
    } catch (error) {
      console.error('Error navigating to today\'s workout:', error);
      Alert.alert(
        'Error',
        'Could not find today\'s workout. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleGoToToday = async () => {
    try {
      // Load all meal plans
      const mealPlans = await WorkoutStorage.loadMealPlans();
      
      if (mealPlans.length === 0) {
        Alert.alert(
          'No Meal Plans',
          'You need to import a meal plan first to use "Go to Today".',
          [{ text: 'OK' }]
        );
        return;
      }

      // For now, use the first meal plan. In a real app, you'd find the active meal plan
      const activeMealPlan = mealPlans[0];
      const today = new Date();
      
      // Calculate which week contains today
      const mealPlanStartDate = new Date(); // This should come from meal plan data
      const daysDifference = Math.floor((today.getTime() - mealPlanStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDifference < 0) {
        Alert.alert(
          'Future Meal Plan',
          'Today is before the start of your meal plan.',
          [{ text: 'OK' }]
        );
        return;
      }

      const weeks = activeMealPlan.data?.weeks || [];
      let currentWeek = null;
      let currentWeekNumber = 0;
      
      // Find which week contains today
      for (let i = 0; i < weeks.length; i++) {
        const weekStartDay = i * 7;
        const weekEndDay = weekStartDay + weeks[i].days.length - 1;
        
        if (daysDifference >= weekStartDay && daysDifference <= weekEndDay) {
          currentWeek = weeks[i];
          currentWeekNumber = i + 1;
          break;
        }
      }

      if (!currentWeek) {
        Alert.alert(
          'Meal Plan Completed',
          'Today is beyond the end of your current meal plan.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Navigate to the week that contains today
      navigation.navigate('MealPlanWeeks' as any, { mealPlan: activeMealPlan });
      
      // Optional: You could navigate directly to the day instead
      // navigation.navigate('MealPlanDays' as any, { 
      //   week: currentWeek, 
      //   mealPlanName: activeMealPlan.name 
      // });
      
    } catch (error) {
      console.error('Error navigating to today:', error);
      Alert.alert(
        'Error',
        'Could not find today\'s meal plan. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle nutrition mode navigation
  useEffect(() => {
    if (isNutritionMode) {
      navigation.navigate('NutritionHome' as any);
    }
  }, [isNutritionMode, navigation]);

  const renderContent = () => {
    // Show nutrition content when in nutrition mode (development only)
    if (isNutritionMode) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="restaurant-outline" size={64} color="#3f3f46" />
          <Text style={styles.emptyTitle}>Nutrition Planning</Text>
          <Text style={styles.emptyDescription}>
            Loading nutrition features...
          </Text>
        </View>
      );
    }

    if (routines.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={64} color="#3f3f46" />
          <Text style={styles.emptyTitle}>No Routines Yet</Text>
          <Text style={styles.emptyDescription}>
            Generate your first AI-powered workout routine or import a custom JSON workout plan.
          </Text>
        </View>
      );
    }

    if (routines.length === 1) {
      // Hero layout for single routine
      const routine = routines[0];
      return (
        <View style={styles.heroContainer}>
          <TouchableOpacity
            style={[styles.heroCard, { borderColor: themeColor, shadowColor: themeColor }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Blocks' as any, { routine })}
            onLongPress={() => handleDeleteRequest(routine)}
            delayLongPress={800}
          >
            <View style={styles.heroContent}>
              <Text style={[styles.heroTitle, { textShadowColor: themeColorLight }]}>{routine.name}</Text>
              <Text style={styles.heroSubtitle}>
                {routine.days} days per week • {routine.blocks} blocks
              </Text>
              <Text style={[styles.heroDescription, { color: themeColor }]}>
                Tap to start your workout
              </Text>
            </View>
            
            <View style={styles.heroActions}>
              <TouchableOpacity
                style={styles.heroActionButton}
                onPress={() => handleExport(routine)}
                activeOpacity={0.7}
              >
                <Ionicons name="share-outline" size={24} color={themeColor} />
                <Text style={[styles.heroActionText, { color: themeColor }]}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroSecondaryButton}
                onPress={() => handleGoToTodayWorkout()}
                activeOpacity={0.7}
              >
                <Ionicons name="today-outline" size={18} color="#71717a" />
                <Text style={styles.heroSecondaryText}>Today</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    if (routines.length === 2) {
      // Two routines - split screen vertically
      return (
        <View style={styles.dualVerticalContainer}>
          {routines.map((routine, index) => (
            <View key={routine.id} style={styles.dualVerticalHeroContainer}>
              <TouchableOpacity
                style={[styles.dualVerticalCard, { borderColor: themeColor, shadowColor: themeColor }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Blocks' as any, { routine })}
                onLongPress={() => handleDeleteRequest(routine)}
                delayLongPress={800}
              >
                <View style={styles.dualVerticalContent}>
                  <Text style={[styles.dualVerticalTitle, { textShadowColor: themeColorLight }]}>{routine.name}</Text>
                  <Text style={styles.dualVerticalSubtitle}>
                    {routine.days} days per week • {routine.blocks} blocks
                  </Text>
                  <Text style={[styles.dualVerticalDescription, { color: themeColor }]}>
                    Tap to start your workout
                  </Text>
                  
                  <View style={styles.dualVerticalActions}>
                    <TouchableOpacity
                      style={styles.dualVerticalShareButton}
                      onPress={() => handleExport(routine)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="share-outline" size={24} color={themeColor} />
                      <Text style={[styles.dualVerticalShareText, { color: themeColor }]}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dualVerticalSecondaryButton}
                      onPress={() => handleGoToTodayWorkout()}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="today-outline" size={16} color="#71717a" />
                      <Text style={styles.dualVerticalSecondaryText}>Today</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      );
    }

    if (routines.length === 3) {
      // Three routines - compact horizontal cards
      return (
        <View style={styles.tripleContainer}>
          {routines.map((routine, index) => (
            <View key={routine.id} style={styles.tripleCardContainer}>
              <TouchableOpacity
                style={[styles.tripleCard, { borderColor: themeColor, shadowColor: themeColor }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Blocks' as any, { routine })}
                onLongPress={() => handleDeleteRequest(routine)}
                delayLongPress={800}
              >
                <View style={styles.tripleContent}>
                  <Text style={[styles.tripleTitle, { textShadowColor: themeColorLight }]} numberOfLines={2}>
                    {routine.name}
                  </Text>
                  <Text style={styles.tripleSubtitle}>
                    {routine.days} days • {routine.blocks} blocks
                  </Text>
                  <Text style={[styles.tripleDescription, { color: themeColor }]}>
                    Tap to start
                  </Text>
                </View>
                
                <View style={styles.tripleButtonsContainer}>
                  <TouchableOpacity
                    style={styles.tripleShareButton}
                    onPress={() => handleExport(routine)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="share-outline" size={20} color={themeColor} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.tripleShareButton}
                    onPress={() => handleGoToTodayWorkout()}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="today-outline" size={20} color={themeColor} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      );
    }

    if (routines.length === 4) {
      // Four routines - vertical stack layout
      return (
        <View style={styles.quadContainer}>
          {routines.map((routine, index) => (
            <View key={routine.id} style={styles.quadCardContainer}>
              <TouchableOpacity
                style={[styles.quadCard, { borderColor: themeColor, shadowColor: themeColor }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Blocks' as any, { routine })}
                onLongPress={() => handleDeleteRequest(routine)}
                delayLongPress={800}
              >
                <View style={styles.quadContent}>
                  <Text style={[styles.quadTitle, { textShadowColor: themeColorLight }]} numberOfLines={2}>
                    {routine.name}
                  </Text>
                  <Text style={styles.quadSubtitle}>
                    {routine.days} days • {routine.blocks} blocks
                  </Text>
                  <Text style={[styles.quadDescription, { color: themeColor }]}>
                    Tap to start
                  </Text>
                </View>
                
                <View style={styles.quadButtonsContainer}>
                  <TouchableOpacity
                    style={styles.quadShareButton}
                    onPress={() => handleExport(routine)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="share-outline" size={18} color={themeColor} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quadShareButton}
                    onPress={() => handleGoToTodayWorkout()}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="today-outline" size={18} color={themeColor} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      );
    }

    // Multiple routines - scrollable list
    return (
      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RoutineCard
            routine={item}
            onExport={() => handleExport(item)}
            onPress={() => navigation.navigate('Blocks' as any, { routine: item })}
            onLongPress={() => handleDeleteRequest(item)}
            isPinkTheme={isPinkTheme}
            themeColor={themeColor}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {renderContent()}
      </Animated.View>

      {/* Calendar Button - Bottom Left */}
      <View style={[styles.calendarButton, { backgroundColor: themeColor }]}>
        <TouchableOpacity
          style={styles.buttonInner}
          onPress={() => setCalendarModal(true)}
          activeOpacity={0.9}
        >
          <Ionicons name="calendar-outline" size={24} color="#0a0a0b" />
        </TouchableOpacity>
      </View>

      {/* Go to Today Button - Bottom Left (Nutrition Mode Only) */}
      {isNutritionMode && (
        <View style={[styles.todayButton, { backgroundColor: themeColor }]}>
          <TouchableOpacity
            style={styles.buttonInner}
            onPress={handleGoToToday}
            activeOpacity={0.9}
          >
            <Ionicons name="today-outline" size={24} color="#0a0a0b" />
          </TouchableOpacity>
        </View>
      )}

      {/* Shop Button - Top Right - Hidden if user has JSON Pro - DEV ONLY */}
      {!hasJSONPro && __DEV__ && (
        <View style={styles.shopButton}>
          <TouchableOpacity
            style={styles.buttonInner}
            onPress={() => navigation.navigate('Payment' as any)}
            activeOpacity={0.9}
          >
            <Ionicons name="storefront-outline" size={24} color="#0a0a0b" />
          </TouchableOpacity>
        </View>
      )}
      {/* Questionnaire Button - Bottom Center */}
      <View style={styles.questionnaireButton}>
        <TouchableOpacity
          style={styles.buttonInner}
          onPress={() => navigation.navigate('WorkoutDashboard' as any)}
          activeOpacity={0.9}
        >
          <Ionicons name="clipboard-outline" size={24} color="#0a0a0b" />
        </TouchableOpacity>
      </View>

      {/* App Mode Toggle - Top Right (Development Only) */}
      {__DEV__ && (
        <View style={styles.devToggleContainer}>
          <TouchableOpacity
            style={[
              styles.modeToggle, 
              isTrainingMode && { backgroundColor: themeColor, borderColor: themeColor }
            ]}
            onPress={() => setAppMode('training')}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="barbell" 
              size={18} 
              color={isTrainingMode ? "#0a0a0b" : themeColor} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.modeToggle, 
              isNutritionMode && { backgroundColor: themeColor, borderColor: themeColor }
            ]}
            onPress={handleNutritionTransition}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="restaurant" 
              size={18} 
              color={isNutritionMode ? "#0a0a0b" : themeColor} 
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Gender Theme Toggle - Top Right */}
      <TouchableOpacity
        style={[styles.genderToggle, __DEV__ && styles.genderToggleWithDev]}
        onPress={() => setIsPinkTheme(!isPinkTheme)}
        activeOpacity={0.8}
      >
        <Ionicons 
          name={isPinkTheme ? "woman" : "man"} 
          size={24} 
          color={themeColor} 
        />
      </TouchableOpacity>


      {/* Add Routine FAB - Bottom Right */}
      <View style={[styles.fab, { backgroundColor: themeColor }]}>
        <TouchableOpacity
          style={styles.buttonInner}
          onPress={() => {
            if (showOnboarding) {
              handleOnboardingDismiss();
            }
            navigation.navigate('ImportRoutine' as any);
          }}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={28} color="#0a0a0b" />
        </TouchableOpacity>
      </View>

      {/* Custom Share Modal */}
      <Modal
        visible={shareModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShareModal({ visible: false, routine: null })}
      >
        <View style={styles.newShareOverlay}>
          <TouchableOpacity 
            style={styles.newShareBackdrop}
            activeOpacity={1}
            onPress={() => setShareModal({ visible: false, routine: null })}
          />
          
          <View style={[styles.newShareModal, { borderColor: themeColor }]}>
            {/* Close Button */}
            <View style={styles.newShareHeader}>
              <TouchableOpacity
                style={styles.newShareClose}
                onPress={() => setShareModal({ visible: false, routine: null })}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            {/* Image */}
            <Image 
              source={isPinkTheme ? 
                require('./../../Lucid_Origin_Two_athletic_women_in_a_modern_gym_one_spotting_t_0.jpg') :
                require('./../../sdfdfs.jpg')
              }
              style={styles.newShareImage}
              resizeMode="cover"
            />
            
            {/* Content */}
            <View style={styles.newShareContent}>
              <Text style={[styles.newShareTitle, { color: themeColor }]}>
                {shareModal.routine?.name?.toUpperCase()}
              </Text>
              <Text style={styles.newShareSubtitle}>Share your workout routine</Text>
              
              {/* Action Buttons */}
              <View style={styles.shareActionButtons}>
                <TouchableOpacity
                  style={[styles.shareActionPrimary, { backgroundColor: themeColor }]}
                  onPress={() => handleShare('copy')}
                  activeOpacity={0.9}
                >
                  <View style={styles.shareButtonContent}>
                    <Ionicons name="copy" size={22} color="#0a0a0b" />
                    <View style={styles.shareButtonText}>
                      <Text style={styles.shareButtonTitle}>COPY ROUTINE</Text>
                      <Text style={styles.shareButtonSubtitle}>JSON to clipboard</Text>
                    </View>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.shareActionSecondary}
                  onPress={() => handleShare('share')}
                  activeOpacity={0.9}
                >
                  <View style={styles.shareButtonContent}>
                    <Ionicons name="share-social" size={22} color="#22d3ee" />
                    <View style={styles.shareButtonText}>
                      <Text style={[styles.shareButtonTitle, { color: '#ffffff' }]}>SHARE</Text>
                      <Text style={[styles.shareButtonSubtitle, { color: '#a1a1aa' }]}>Send to others</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Success Modal */}
      <Modal
        visible={successModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>Copied!</Text>
            <Text style={styles.successMessage}>Workout JSON copied to clipboard</Text>
            
            <TouchableOpacity
              style={[styles.successButton, { backgroundColor: themeColor }]}
              onPress={() => setSuccessModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Delete Confirmation Modal */}
      <Modal
        visible={deleteModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModal({ visible: false, routine: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteContainer}>
            <View style={styles.deleteIconContainer}>
              <Ionicons name="warning" size={32} color="#ef4444" />
            </View>
            
            <Text style={styles.deleteTitle}>Delete Routine?</Text>
            
            <View style={styles.deleteRoutineInfo}>
              <Text style={styles.deleteRoutineName} numberOfLines={2}>
                {deleteModal.routine?.name}
              </Text>
              <Text style={styles.deleteRoutineDetails}>
                {deleteModal.routine?.days} days • {deleteModal.routine?.blocks} blocks
              </Text>
            </View>
            
            <Text style={styles.deleteMessage}>
              This routine will be permanently deleted and cannot be recovered.
            </Text>
            
            <View style={styles.deleteButtons}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => setDeleteModal({ visible: false, routine: null })}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={handleDeleteConfirm}
                activeOpacity={0.7}
              >
                <Ionicons name="trash" size={18} color="#ffffff" />
                <Text style={styles.deleteConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Workout Calendar */}
      <WorkoutCalendar
        visible={calendarModal}
        onClose={() => setCalendarModal(false)}
      />

      {/* Import Feedback Modal */}
      <ImportFeedbackModal
        visible={showFeedbackModal}
        onFeedback={submitFeedback}
        onSkip={skipFeedback}
      />

      {/* Onboarding Overlay */}
      <OnboardingOverlay
        visible={showOnboarding}
        onDismiss={handleOnboardingDismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  animatedContainer: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  appHeader: {
    marginBottom: 24,
  },
  appName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22d3ee',
    letterSpacing: 2,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  listContent: {
    paddingTop: 120,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyListContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 20,
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#71717a',
  },
  exportButton: {
    padding: 8,
    marginLeft: 12,
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
  emptySubtext: {
    fontSize: 14,
    color: '#52525b',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#22d3ee',
  },
  buttonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    gap: 12,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27272a',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  modalButtonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalButtonCancelText: {
    color: '#71717a',
  },
  successContainer: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 32,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 24,
  },
  successButton: {
    backgroundColor: '#22d3ee',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    minWidth: 80,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
    textAlign: 'center',
  },
  deleteContainer: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#27272a',
    padding: 28,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  deleteIconContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 50,
    padding: 16,
    marginBottom: 20,
  },
  deleteTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  deleteRoutineInfo: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteRoutineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  deleteRoutineDetails: {
    fontSize: 13,
    color: '#a1a1aa',
    textAlign: 'center',
  },
  deleteMessage: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  deleteButtons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  deleteCancelButton: {
    flex: 1,
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3f3f46',
    minHeight: 50,
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  heroContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Dual vertical layout (two routines)
  dualVerticalContainer: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 100,
    paddingHorizontal: 16,
    gap: 16,
    justifyContent: 'space-evenly',
  },
  dualVerticalHeroContainer: {
    height: '45%',
    width: '100%',
  },
  dualVerticalCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#22d3ee',
    padding: 32,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22d3ee',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dualVerticalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  dualVerticalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: '#22d3ee',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowOpacity: 0.5,
    textShadowRadius: 2,
  },
  dualVerticalSubtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    marginBottom: 16,
    textAlign: 'center',
  },
  dualVerticalDescription: {
    fontSize: 14,
    color: '#22d3ee',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  dualVerticalActions: {
    alignItems: 'center',
  },
  dualVerticalShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
  },
  dualVerticalShareText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dualVerticalSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
    marginTop: 8,
  },
  dualVerticalSecondaryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717a',
  },
  // Triple layout (three routines)
  tripleContainer: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 100,
    paddingHorizontal: 16,
    gap: 12,
    justifyContent: 'space-evenly',
  },
  tripleCardContainer: {
    height: '30%',
    width: '100%',
  },
  tripleCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#22d3ee',
    padding: 20,
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#22d3ee',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tripleContent: {
    flex: 1,
    justifyContent: 'center',
  },
  tripleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    textShadowColor: '#22d3ee',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowOpacity: 0.5,
    textShadowRadius: 2,
  },
  tripleSubtitle: {
    fontSize: 13,
    color: '#a1a1aa',
    marginBottom: 4,
  },
  tripleDescription: {
    fontSize: 12,
    color: '#22d3ee',
    fontWeight: '600',
  },
  tripleButtonsContainer: {
    flexDirection: 'column',
    gap: 8,
    marginLeft: 12,
  },
  tripleShareButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
  },
  // Quad layout (four routines) - vertical stack
  quadContainer: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 100,
    paddingHorizontal: 16,
    gap: 10,
    justifyContent: 'space-evenly',
  },
  quadCardContainer: {
    height: '22%',
    width: '100%',
  },
  quadCard: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#22d3ee',
    padding: 16,
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#22d3ee',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  quadContent: {
    flex: 1,
    justifyContent: 'center',
  },
  quadTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    textShadowColor: '#22d3ee',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowOpacity: 0.5,
    textShadowRadius: 2,
  },
  quadSubtitle: {
    fontSize: 12,
    color: '#a1a1aa',
    marginBottom: 2,
  },
  quadDescription: {
    fontSize: 11,
    color: '#22d3ee',
    fontWeight: '600',
  },
  quadButtonsContainer: {
    flexDirection: 'column',
    gap: 6,
    marginLeft: 12,
  },
  quadShareButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
  },
  heroCard: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#22d3ee',
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    minHeight: 320,
    justifyContent: 'center',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    // Add a subtle inner glow effect with multiple shadows
    shadowColor: '#22d3ee',
  },
  heroContent: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 42,
    textShadowColor: '#22d3ee40',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroDescription: {
    fontSize: 16,
    color: '#22d3ee',
    textAlign: 'center',
    fontWeight: '500',
  },
  heroActions: {
    width: '100%',
    alignItems: 'center',
  },
  heroActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  heroActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22d3ee',
  },
  heroSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 8,
  },
  heroSecondaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#71717a',
  },
  dualContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 100,
    gap: 20,
  },
  dualCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 24,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 120,
  },
  dualCardFirst: {
    borderColor: '#22d3ee40',
  },
  dualCardSecond: {
    borderColor: '#a855f740',
  },
  dualContent: {
    flex: 1,
  },
  dualTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 28,
  },
  dualSubtitle: {
    fontSize: 14,
    color: '#71717a',
  },
  dualShareButton: {
    backgroundColor: '#27272a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  
  // Calendar button styles
  calendarButton: {
    position: 'absolute',
    left: '50%',
    bottom: 32,
    marginLeft: -28, // Half of width to center
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#22d3ee',
  },
  
  // Today button styles (positioned next to calendar button)
  todayButton: {
    position: 'absolute',
    left: '50%',
    bottom: 96, // Above the calendar button
    marginLeft: -28, // Half of width to center
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#22d3ee',
  },
  
  // Shop button styles
  shopButton: {
    position: 'absolute',
    right: 16,
    top: 54, // Aligns with header padding
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#a855f7',
  },
  
  // Questionnaire button styles
  questionnaireButton: {
    position: 'absolute',
    left: 16,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#22d3ee',
  },

  // Share modal styles
  shareModalContainer: {
    backgroundColor: '#0a0a0b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#22d3ee',
    padding: 0,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    position: 'relative',
  },
  shareCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(39, 39, 42, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  shareCloseText: {
    fontSize: 18,
    color: '#a1a1aa',
    fontWeight: '400',
    lineHeight: 18,
  },
  shareHeader: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
  },
  shareTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  shareSubtitle: {
    fontSize: 15,
    color: '#a1a1aa',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },
  programInfo: {
    paddingHorizontal: 28,
    marginBottom: 32,
    alignItems: 'center',
  },
  programName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22d3ee',
    textAlign: 'center',
  },
  shareOptions: {
    paddingHorizontal: 28,
    paddingBottom: 28,
    gap: 12,
  },
  shareOption: {
    backgroundColor: '#22d3ee',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  shareOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
    letterSpacing: 0.3,
  },

  // Centered modal design
  centeredOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  centeredModal: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  centeredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  centeredDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22d3ee',
  },
  centeredTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  centeredWorkout: {
    fontSize: 22,
    fontWeight: '700',
    color: '#22d3ee',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 28,
  },
  centeredSubtext: {
    fontSize: 15,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  centeredActions: {
    width: '100%',
    gap: 12,
  },
  centeredCopyButton: {
    backgroundColor: '#22d3ee',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  centeredCopyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  centeredShareButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  centeredShareText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e4e4e7',
  },
  
  // Gender toggle styles
  genderToggle: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  
  // Development mode toggle styles
  devToggleContainer: {
    position: 'absolute',
    top: 60,
    left: 16, // Position in the left corner
    flexDirection: 'row',
    gap: 4,
  },
  modeToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  genderToggleWithDev: {
    right: 16, // Keep same position as before
  },
  
  // New Share Modal Styles
  newShareOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  newShareBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  newShareModal: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 2,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  newShareHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 16,
    paddingTop: 16,
    zIndex: 100,
  },
  newShareClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newShareImage: {
    width: '100%',
    height: 180,
  },
  newShareContent: {
    padding: 24,
    alignItems: 'center',
  },
  newShareTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  newShareSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 24,
  },
  shareActionButtons: {
    width: '100%',
    gap: 16,
  },
  shareActionPrimary: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  shareActionSecondary: {
    width: '100%',
    backgroundColor: '#27272a',
    borderWidth: 2,
    borderColor: '#3f3f46',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  shareButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16,
  },
  shareButtonText: {
    flex: 1,
    alignItems: 'flex-start',
  },
  shareButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a0a0b',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  shareButtonSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(10, 10, 11, 0.7)',
    letterSpacing: 0.2,
  },
});