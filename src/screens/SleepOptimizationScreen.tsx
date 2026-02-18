import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  
  ScrollView,
  Alert,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutStorage } from '../utils/storage';

const { height: screenHeight } = Dimensions.get('window');

type SleepOptimizationNavigationProp = StackNavigationProp<RootStackParamList, 'SleepOptimizationScreen'>;

interface FormData {
  bedtime: string;
  wakeTime: string;
  optimizationLevel: 'minimal' | 'moderate' | 'maximum';
}

export default function SleepOptimizationScreen() {
  const navigation = useNavigation<SleepOptimizationNavigationProp>();
  const route = useRoute();
  const { themeColor } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [showResearch, setShowResearch] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    bedtime: '',
    wakeTime: '',
    optimizationLevel: 'moderate',
  });

  // Handle showing results if user has already completed
  const showResults = route.params?.showResults;
  
  // Load saved data on component mount
  useEffect(() => {
    loadSavedData();
  }, []);

  useEffect(() => {
    if (showResults) {
      loadAndShowResults();
    }
  }, [showResults]);

  const loadSavedData = async () => {
    try {
      const savedResults = await WorkoutStorage.loadSleepOptimizationResults();
      if (savedResults) {
        // Restore form data
        setFormData(savedResults.formData);
        
        // If questionnaire was completed, show results directly
        if (savedResults.completedAt) {
          setCurrentStep(3); // Go to results
        }
        // If partial data exists, user stays on current step with restored data
      }
    } catch (error) {
      console.error('Failed to load saved sleep optimization data:', error);
    }
  };

  const loadAndShowResults = async () => {
    try {
      const savedResults = await WorkoutStorage.loadSleepOptimizationResults();
      if (savedResults) {
        setFormData(savedResults.formData);
        setCurrentStep(3); // Show results
      }
    } catch (error) {
      console.error('Failed to load sleep optimization results:', error);
    }
  };

  useEffect(() => {
    // Scroll to top when step changes
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleComplete = async () => {
    try {
      const results = {
        formData,
        completedAt: new Date().toISOString(),
      };

      await WorkoutStorage.saveSleepOptimizationResults(results);
      setCurrentStep(3); // Show results
    } catch (error) {
      console.error('Failed to save sleep optimization results:', error);
      Alert.alert('Error', 'Failed to save your sleep optimization data. Please try again.');
    }
  };

  const handleSaveAndContinue = () => {
    // Context-aware navigation - determine which dashboard called this screen
    const routeState = navigation.getState();
    const previousRoute = routeState?.routes?.[routeState.index - 1];
    
    if (previousRoute?.name === 'WorkoutDashboard') {
      navigation.navigate('WorkoutDashboard' as any);
    } else {
      navigation.navigate('NutritionHome' as any);
    }
  };

  const timeOptions = [
    '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
    '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM', '12:00 AM',
    '12:30 AM', '1:00 AM', '1:30 AM', '2:00 AM'
  ];

  const wakeTimeOptions = [
    '4:00 AM', '4:30 AM', '5:00 AM', '5:30 AM', '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
    '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM'
  ];

  const optimizationOptions = [
    {
      level: 'minimal' as const,
      title: 'Minimal Effort',
      subtitle: 'Basic guidelines most people can follow',
      features: [
        'First meal within 2 hours of waking',
        'Last meal 2 hours before bed',
        '12-hour eating window',
        'Include protein at breakfast'
      ]
    },
    {
      level: 'moderate' as const,
      title: 'Moderate Optimization',
      subtitle: 'Good benefits without being too restrictive',
      features: [
        'First meal 30-90 minutes after waking',
        'Last meal 3 hours before bed',
        '8-10 hour eating window',
        'Prioritize protein-rich breakfast'
      ]
    },
    {
      level: 'maximum' as const,
      title: 'Maximum Optimization',
      subtitle: 'Complete adherence for optimal results',
      features: [
        'First meal within 30-60 minutes of waking',
        'Last meal 4+ hours before bed',
        '8-hour early eating window',
        'High-protein breakfast emphasis'
      ]
    }
  ];

  const calculateMealTimes = () => {
    if (!formData.bedtime || !formData.wakeTime) return null;

    // Convert time strings to minutes from midnight
    const timeToMinutes = (timeStr: string) => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let totalMinutes = (hours % 12) * 60 + minutes;
      if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
      if (period === 'AM' && hours === 12) totalMinutes = minutes;
      return totalMinutes;
    };

    const minutesToTime = (minutes: number) => {
      // Handle negative minutes and overflow properly
      let adjustedMinutes = minutes;
      if (adjustedMinutes < 0) {
        adjustedMinutes += 24 * 60; // Add a day if negative
      }
      adjustedMinutes = adjustedMinutes % (24 * 60); // Handle overflow
      
      const hours = Math.floor(adjustedMinutes / 60);
      const mins = adjustedMinutes % 60;
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
    };

    const wakeMinutes = timeToMinutes(formData.wakeTime);
    let bedMinutes = timeToMinutes(formData.bedtime);
    
    // Handle bedtime being early next day (e.g., 1 AM bedtime after 6 AM wake)
    if (bedMinutes < wakeMinutes) {
      bedMinutes += 24 * 60; // Add 24 hours
    }

    let firstMealStart, firstMealEnd, lastMealTime;

    switch (formData.optimizationLevel) {
      case 'minimal':
        firstMealStart = wakeMinutes;
        firstMealEnd = wakeMinutes + 120; // 2 hours
        lastMealTime = bedMinutes - 120; // 2 hours before bed
        break;
      case 'moderate':
        firstMealStart = wakeMinutes + 30; // 30 min after wake
        firstMealEnd = wakeMinutes + 90; // 90 min after wake
        lastMealTime = bedMinutes - 180; // 3 hours before bed
        break;
      case 'maximum':
        firstMealStart = wakeMinutes + 30; // 30 min after wake
        firstMealEnd = wakeMinutes + 60; // 60 min after wake
        lastMealTime = bedMinutes - 240; // 4 hours before bed
        break;
    }

    return {
      firstMealWindow: `${minutesToTime(firstMealStart)} - ${minutesToTime(firstMealEnd)}`,
      lastMealTime: minutesToTime(lastMealTime),
      eatingWindow: `${minutesToTime(firstMealStart)} to ${minutesToTime(lastMealTime)}`
    };
  };

  const calculateWorkoutTimes = () => {
    if (!formData.bedtime || !formData.wakeTime) return null;

    // Convert time strings to minutes from midnight
    const timeToMinutes = (timeStr: string) => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let totalMinutes = (hours % 12) * 60 + minutes;
      if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
      if (period === 'AM' && hours === 12) totalMinutes = minutes;
      return totalMinutes;
    };

    const minutesToTime = (minutes: number) => {
      // Handle negative minutes and overflow properly
      let adjustedMinutes = minutes;
      if (adjustedMinutes < 0) {
        adjustedMinutes += 24 * 60; // Add a day if negative
      }
      adjustedMinutes = adjustedMinutes % (24 * 60); // Handle overflow
      
      const hours = Math.floor(adjustedMinutes / 60);
      const mins = adjustedMinutes % 60;
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
    };

    const wakeMinutes = timeToMinutes(formData.wakeTime);
    let bedMinutes = timeToMinutes(formData.bedtime);
    
    // Handle bedtime being early next day (e.g., 1 AM bedtime after 6 AM wake)
    if (bedMinutes < wakeMinutes) {
      bedMinutes += 24 * 60; // Add 24 hours
    }

    let optimalStart, optimalEnd, lightExerciseCutoff, moderateCutoff, intenseCutoff;

    // Based on research: Morning exercise (30min-3hrs after wake) is optimal for circadian rhythm
    optimalStart = wakeMinutes + 30; // 30 minutes after wake for body to activate
    optimalEnd = wakeMinutes + 180; // 3 hours after wake for peak benefits

    switch (formData.optimizationLevel) {
      case 'minimal':
        lightExerciseCutoff = bedMinutes - 90; // 1.5 hours before bed
        moderateCutoff = bedMinutes - 120; // 2 hours before bed
        intenseCutoff = bedMinutes - 180; // 3 hours before bed
        break;
      case 'moderate':
        lightExerciseCutoff = bedMinutes - 120; // 2 hours before bed
        moderateCutoff = bedMinutes - 180; // 3 hours before bed
        intenseCutoff = bedMinutes - 240; // 4 hours before bed
        break;
      case 'maximum':
        lightExerciseCutoff = bedMinutes - 180; // 3 hours before bed
        moderateCutoff = bedMinutes - 240; // 4 hours before bed
        intenseCutoff = bedMinutes - 300; // 5 hours before bed
        break;
    }

    return {
      optimalWindow: `${minutesToTime(optimalStart)} - ${minutesToTime(optimalEnd)}`,
      lightCutoff: minutesToTime(lightExerciseCutoff),
      moderateCutoff: minutesToTime(moderateCutoff),
      intenseCutoff: minutesToTime(intenseCutoff)
    };
  };

  const renderTimeSelector = (title: string, value: string, options: string[], onSelect: (value: string) => void) => (
    <View style={styles.inputSection}>
      <Text style={[styles.inputLabel, { color: themeColor }]}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScrollContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.timeOption,
              value === option && { backgroundColor: themeColor, borderColor: themeColor }
            ]}
            onPress={() => onSelect(option)}
          >
            <Text style={[
              styles.timeOptionText,
              value === option && { color: '#000000' }
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderStep1 = () => {
    // Determine which dashboard called this screen
    const routeState = navigation.getState();
    const previousRoute = routeState?.routes?.[routeState.index - 1];
    const isFromWorkoutDashboard = previousRoute?.name === 'WorkoutDashboard';
    
    return (
      <Animatable.View animation="fadeInUp" duration={300} style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { color: themeColor }]}>Sleep Schedule</Text>
          <Text style={styles.stepDescription}>
            When do you typically sleep and wake up? This helps us optimize your {isFromWorkoutDashboard ? 'workout timing' : 'meal timing'} for better circadian health.
          </Text>
        </View>

      {renderTimeSelector(
        'Typical bedtime',
        formData.bedtime,
        timeOptions,
        (value) => setFormData(prev => ({ ...prev, bedtime: value }))
      )}

      {renderTimeSelector(
        'Typical wake time',
        formData.wakeTime,
        wakeTimeOptions,
        (value) => setFormData(prev => ({ ...prev, wakeTime: value }))
      )}
    </Animatable.View>
    );
  };

  const renderStep2 = () => {
    // Determine which dashboard called this screen
    const routeState = navigation.getState();
    const previousRoute = routeState?.routes?.[routeState.index - 1];
    const isFromWorkoutDashboard = previousRoute?.name === 'WorkoutDashboard';
    
    return (
      <Animatable.View animation="fadeInUp" duration={300} style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { color: themeColor }]}>Optimization Level</Text>
          <Text style={styles.stepDescription}>
            Choose how strict you want to be with {isFromWorkoutDashboard ? 'workout timing' : 'meal timing'} optimization.
          </Text>
        </View>

      <View style={styles.optimizationContainer}>
        {optimizationOptions.map((option) => (
          <TouchableOpacity
            key={option.level}
            style={[
              styles.optimizationOption,
              formData.optimizationLevel === option.level && { 
                backgroundColor: themeColor + '20', 
                borderColor: themeColor,
                borderWidth: 2
              }
            ]}
            onPress={() => setFormData(prev => ({ ...prev, optimizationLevel: option.level }))}
          >
            <View style={styles.optimizationHeader}>
              <Text style={[
                styles.optimizationTitle,
                formData.optimizationLevel === option.level && { color: themeColor }
              ]}>
                {option.title}
              </Text>
              {formData.optimizationLevel === option.level && (
                <Ionicons name="checkmark-circle" size={24} color={themeColor} />
              )}
            </View>
            <Text style={[
              styles.optimizationSubtitle,
              formData.optimizationLevel === option.level && { color: themeColor + 'CC' }
            ]}>
              {option.subtitle}
            </Text>
            <View style={styles.featuresList}>
              {option.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Text style={styles.featureBullet}>•</Text>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Why This Matters Section */}
      <View style={styles.infoSection}>
        <Text style={[styles.infoTitle, { color: themeColor }]}>
          Why {isFromWorkoutDashboard ? 'Workout' : 'Meal'} Timing Matters
        </Text>
        <View style={styles.infoGrid}>
          {isFromWorkoutDashboard ? (
            <>
              <View style={styles.infoItem}>
                <Ionicons name="sunny" size={20} color={themeColor} />
                <Text style={styles.infoText}>Morning workouts advance your circadian rhythm and improve sleep</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="fitness" size={20} color={themeColor} />
                <Text style={styles.infoText}>Exercise raises core body temperature - timing prevents sleep disruption</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="moon" size={20} color={themeColor} />
                <Text style={styles.infoText}>Proper workout cutoffs allow body temperature to normalize before bed</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoItem}>
                <Ionicons name="restaurant" size={20} color={themeColor} />
                <Text style={styles.infoText}>Optimal morning meals ensure proper energy for the day</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="time" size={20} color={themeColor} />
                <Text style={styles.infoText}>Proper meal spacing aligns with your body's natural rhythms</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="moon" size={20} color={themeColor} />
                <Text style={styles.infoText}>Stopping eating 3-4 hours before bed improves sleep quality</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </Animatable.View>
    );
  };

  const renderResults = () => {
    const mealTimes = calculateMealTimes();
    const workoutTimes = calculateWorkoutTimes();
    
    // Determine which dashboard called this screen
    const routeState = navigation.getState();
    const previousRoute = routeState?.routes?.[routeState.index - 1];
    const isFromWorkoutDashboard = previousRoute?.name === 'WorkoutDashboard';
    
    return (
      <Animatable.View 
        animation="bounceIn" 
        duration={800} 
        style={styles.resultsContainer}
      >
        <Animatable.View
          animation="pulse"
          iterationCount="infinite"
          duration={2000}
          style={[styles.celebrationHeader, { borderColor: themeColor }]}
        >
          <Ionicons name="moon" size={48} color={themeColor} />
          <Text style={[styles.celebrationTitle, { color: themeColor }]}>
            SLEEP OPTIMIZATION COMPLETE
          </Text>
          <View style={[styles.celebrationDivider, { backgroundColor: themeColor }]} />
        </Animatable.View>

        <View style={styles.resultsContent}>
          <Text style={styles.resultsTitle}>
            {isFromWorkoutDashboard ? 'Your Optimized Workout Schedule' : 'Your Optimized Meal Schedule'}
          </Text>
          <Text style={styles.resultsDescription}>
            Based on your sleep schedule and optimization level, here's your personalized {isFromWorkoutDashboard ? 'workout' : 'meal'} timing:
          </Text>

          {isFromWorkoutDashboard && workoutTimes ? (
            <View style={styles.mealTimingContainer}>
              <View style={styles.timingItem}>
                <Ionicons name="sunny" size={24} color={themeColor} />
                <View style={styles.timingContent}>
                  <Text style={styles.timingLabel}>Optimal Workout Window</Text>
                  <Text style={[styles.timingValue, { color: themeColor }]}>
                    {workoutTimes.optimalWindow}
                  </Text>
                  <Text style={styles.timingDescription}>
                    Best for circadian rhythm and performance
                  </Text>
                </View>
              </View>

              <View style={styles.timingItem}>
                <Ionicons name="walk" size={24} color={themeColor} />
                <View style={styles.timingContent}>
                  <Text style={styles.timingLabel}>Light Exercise Cutoff</Text>
                  <Text style={[styles.timingValue, { color: themeColor }]}>
                    {workoutTimes.lightCutoff}
                  </Text>
                  <Text style={styles.timingDescription}>
                    Yoga, walking, stretching
                  </Text>
                </View>
              </View>

              <View style={styles.timingItem}>
                <Ionicons name="fitness" size={24} color={themeColor} />
                <View style={styles.timingContent}>
                  <Text style={styles.timingLabel}>Moderate Exercise Cutoff</Text>
                  <Text style={[styles.timingValue, { color: themeColor }]}>
                    {workoutTimes.moderateCutoff}
                  </Text>
                  <Text style={styles.timingDescription}>
                    Weight training, moderate cardio
                  </Text>
                </View>
              </View>

              <View style={styles.timingItem}>
                <Ionicons name="barbell" size={24} color={themeColor} />
                <View style={styles.timingContent}>
                  <Text style={styles.timingLabel}>Intense Exercise Cutoff</Text>
                  <Text style={[styles.timingValue, { color: themeColor }]}>
                    {workoutTimes.intenseCutoff}
                  </Text>
                  <Text style={styles.timingDescription}>
                    HIIT, heavy lifting, intense cardio
                  </Text>
                </View>
              </View>
            </View>
          ) : mealTimes && (
            <View style={styles.mealTimingContainer}>
              <View style={styles.timingItem}>
                <Ionicons name="sunny" size={24} color={themeColor} />
                <View style={styles.timingContent}>
                  <Text style={styles.timingLabel}>First Meal Window</Text>
                  <Text style={[styles.timingValue, { color: themeColor }]}>
                    {mealTimes.firstMealWindow}
                  </Text>
                </View>
              </View>

              <View style={styles.timingItem}>
                <Ionicons name="restaurant" size={24} color={themeColor} />
                <View style={styles.timingContent}>
                  <Text style={styles.timingLabel}>Eating Window</Text>
                  <Text style={[styles.timingValue, { color: themeColor }]}>
                    {mealTimes.eatingWindow}
                  </Text>
                </View>
              </View>

              <View style={styles.timingItem}>
                <Ionicons name="moon" size={24} color={themeColor} />
                <View style={styles.timingContent}>
                  <Text style={styles.timingLabel}>Last Meal By</Text>
                  <Text style={[styles.timingValue, { color: themeColor }]}>
                    {mealTimes.lastMealTime}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>
              {optimizationOptions.find(opt => opt.level === formData.optimizationLevel)?.title}
            </Text>
          </View>

          <View style={styles.resultsButtonsContainer}>
            <TouchableOpacity
              style={[styles.researchButton, { borderColor: themeColor }]}
              onPress={() => setShowResearch(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="library" size={20} color={themeColor} />
              <Text style={[styles.researchButtonText, { color: themeColor }]}>
                Research Behind This
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.editButton, { borderColor: themeColor }]}
              onPress={() => setCurrentStep(1)}
              activeOpacity={0.8}
            >
              <Ionicons name="create" size={20} color={themeColor} />
              <Text style={[styles.editButtonText, { color: themeColor }]}>
                Edit Answers
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.completeButton, { backgroundColor: themeColor }]}
            onPress={handleSaveAndContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.completeButtonText}>SAVE & CONTINUE</Text>
          </TouchableOpacity>
        </View>
      </Animatable.View>
    );
  };

  const renderResearch = () => (
    <Animatable.View 
      animation="fadeIn" 
      duration={300} 
      style={styles.researchScreenContainer}
    >
      {/* Header */}
      <View style={styles.researchScreenHeader}>
        <TouchableOpacity
          style={styles.researchBackButton}
          onPress={() => setShowResearch(false)}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color={themeColor} />
        </TouchableOpacity>
        
        <View style={styles.researchHeaderContent}>
          <View style={[styles.researchHeaderIcon, { backgroundColor: themeColor + '20' }]}>
            <Ionicons name="library" size={32} color={themeColor} />
          </View>
          <Text style={[styles.researchScreenTitle, { color: themeColor }]}>
            Research Behind This
          </Text>
          <Text style={styles.researchScreenSubtitle}>
            Science-backed recommendations
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.researchScreenScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.researchScrollContent}
      >
        <View style={styles.researchSection}>
          <Text style={styles.researchSectionTitle}>Recent Studies (2020-2024)</Text>
          <View style={styles.researchStudies}>
            <Text style={styles.researchStudyItem}>• Johns Hopkins (Cell Metabolism, 2022)</Text>
            <Text style={styles.researchStudyItem}>• Harvard/Brigham (Cell Metabolism, 2022)</Text>
            <Text style={styles.researchStudyItem}>• TIMET Trial (Annals of Internal Medicine, 2024)</Text>
            <Text style={styles.researchStudyItem}>• NutriNet-Santé Study (103,389 participants)</Text>
          </View>
        </View>

        <View style={styles.researchSection}>
          <Text style={styles.researchSectionTitle}>Key Findings</Text>
          <View style={styles.researchFindings}>
            <View style={styles.researchFinding}>
              <Text style={styles.researchBulletText}>•</Text>
              <Text style={styles.researchFindingText}>
                Insulin sensitivity is <Text style={{ color: themeColor, fontWeight: '700' }}>34% higher</Text> in morning vs evening
              </Text>
            </View>
            <View style={styles.researchFinding}>
              <Text style={styles.researchBulletText}>•</Text>
              <Text style={styles.researchFindingText}>
                Eating 1hr vs 4hrs before bed increases glucose by <Text style={{ color: themeColor, fontWeight: '700' }}>18%</Text>
              </Text>
            </View>
            <View style={styles.researchFinding}>
              <Text style={styles.researchBulletText}>•</Text>
              <Text style={styles.researchFindingText}>
                Early time-restricted eating improves weight loss by <Text style={{ color: themeColor, fontWeight: '700' }}>3.7kg</Text> over 14 weeks
              </Text>
            </View>
            <View style={styles.researchFinding}>
              <Text style={styles.researchBulletText}>•</Text>
              <Text style={styles.researchFindingText}>
                Morning protein intake correlates with better muscle mass and HDL levels
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.researchSection}>
          <Text style={styles.researchSectionTitle}>Why This Matters</Text>
          <View style={styles.researchFindings}>
            <View style={styles.researchFinding}>
              <Text style={styles.researchBulletText}>•</Text>
              <Text style={styles.researchFindingText}>
                Your body's internal clock affects how well you process food
              </Text>
            </View>
            <View style={styles.researchFinding}>
              <Text style={styles.researchBulletText}>•</Text>
              <Text style={styles.researchFindingText}>
                Meal timing can be as important as what you eat for metabolic health
              </Text>
            </View>
            <View style={styles.researchFinding}>
              <Text style={styles.researchBulletText}>•</Text>
              <Text style={styles.researchFindingText}>
                Simple timing changes can improve sleep quality and energy levels
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.researchBottomContainer}>
        <TouchableOpacity
          style={[styles.researchDoneButton, { backgroundColor: themeColor }]}
          onPress={() => setShowResearch(false)}
          activeOpacity={0.8}
        >
          <Text style={styles.researchDoneText}>Got it</Text>
        </TouchableOpacity>
      </View>
    </Animatable.View>
  );

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.bedtime && formData.wakeTime;
      case 2:
        return true; // Optimization level has a default
      default:
        return false;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {showResearch ? renderResearch() : 
         currentStep === 3 ? renderResults() : (
          <>
            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                {[1, 2].map((step) => (
                  <View
                    key={step}
                    style={[
                      styles.progressDot,
                      step <= currentStep && { backgroundColor: themeColor }
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.progressText}>
                Step {currentStep} of 2
              </Text>
            </View>

            {/* Step content */}
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}

            {/* Navigation buttons */}
            <View style={styles.navigationContainer}>
              <TouchableOpacity
                style={[styles.navigationButton, styles.backButton]}
                onPress={handleBack}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={20} color="#71717a" />
                <Text style={styles.backButtonText}>
                  {currentStep === 1 ? 'Cancel' : 'Back'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navigationButton,
                  styles.nextButton,
                  { backgroundColor: canProceed() ? themeColor : '#27272a' }
                ]}
                onPress={handleNext}
                disabled={!canProceed()}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.nextButtonText,
                  { color: canProceed() ? '#000000' : '#71717a' }
                ]}>
                  {currentStep === 2 ? 'Complete' : 'Next'}
                </Text>
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={canProceed() ? '#000000' : '#71717a'} 
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  progressContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  progressBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#27272a',
  },
  progressText: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
  },
  stepContainer: {
    paddingHorizontal: 20,
  },
  stepHeader: {
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
    lineHeight: 36,
  },
  stepDescription: {
    fontSize: 16,
    color: '#71717a',
    lineHeight: 24,
  },
  inputSection: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  timeScrollContainer: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  timeOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#18181b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  timeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  optimizationContainer: {
    gap: 16,
    marginBottom: 32,
  },
  optimizationOption: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 24,
  },
  optimizationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optimizationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  optimizationSubtitle: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 16,
    lineHeight: 20,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  featureBullet: {
    fontSize: 16,
    color: '#71717a',
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 20,
  },
  infoSection: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 20,
  },
  navigationContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  backButton: {
    backgroundColor: '#27272a',
    flex: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
  },
  nextButton: {
    flex: 2,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  celebrationHeader: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 32,
    backgroundColor: '#0f0f10',
  },
  celebrationTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 16,
    textAlign: 'center',
  },
  celebrationDivider: {
    width: 60,
    height: 2,
    marginTop: 16,
    opacity: 0.6,
  },
  resultsContent: {
    gap: 24,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  resultsDescription: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 24,
  },
  mealTimingContainer: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 24,
    gap: 20,
  },
  timingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  timingContent: {
    flex: 1,
  },
  timingLabel: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 4,
  },
  timingValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  timingDescription: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
    fontStyle: 'italic',
  },
  levelBadge: {
    backgroundColor: '#27272a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
  },
  levelBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  resultsButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  researchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'transparent',
    gap: 6,
  },
  researchButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'transparent',
    gap: 6,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  completeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1,
  },
  // Research Screen Styles
  researchScreenContainer: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  researchScreenHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    flexDirection: 'row',
    alignItems: 'center',
  },
  researchBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  researchHeaderContent: {
    flex: 1,
    alignItems: 'center',
    marginLeft: -40, // Offset back button to center content
  },
  researchHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  researchScreenTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  researchScreenSubtitle: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
  },
  researchScreenScroll: {
    flex: 1,
  },
  researchScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  researchSection: {
    paddingVertical: 20,
  },
  researchSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  researchStudies: {
    gap: 8,
  },
  researchStudyItem: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 20,
  },
  researchFindings: {
    gap: 16,
  },
  researchFinding: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  researchBulletText: {
    fontSize: 16,
    color: '#71717a',
    marginTop: 2,
    width: 20,
  },
  researchFindingText: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 20,
    flex: 1,
  },
  researchBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0a0a0b',
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  researchDoneButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  researchDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
});