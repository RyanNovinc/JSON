import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import * as Animatable from 'react-native-animatable';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface FitnessGoalOption {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
}

interface SecondaryGoal {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const primaryGoals: FitnessGoalOption[] = [
  {
    id: 'burn_fat',
    title: 'Burn Fat',
    subtitle: 'Lose weight while preserving muscle',
    description: 'Focus on fat loss with resistance training to maintain lean mass',
    icon: 'flame-outline',
  },
  {
    id: 'build_muscle',
    title: 'Build Muscle',
    subtitle: 'Gain lean mass and size',
    description: 'Hypertrophy-focused training to increase muscle mass',
    icon: 'fitness-outline',
  },
  {
    id: 'gain_strength',
    title: 'Gain Strength',
    subtitle: 'Increase power and max lifts',
    description: 'Powerlifting-style training focused on strength gains',
    icon: 'barbell-outline',
  },
  {
    id: 'body_recomposition',
    title: 'Body Recomposition',
    subtitle: 'Lose fat and gain muscle',
    description: 'Simultaneously reduce body fat while building lean muscle',
    icon: 'refresh-outline',
  },
  {
    id: 'sport_specific',
    title: 'Sport-Specific Training',
    subtitle: 'Train for a particular sport',
    description: 'Performance training tailored to sport requirements',
    icon: 'trophy-outline',
  },
  {
    id: 'general_fitness',
    title: 'General Fitness',
    subtitle: 'Overall health and wellness',
    description: 'Balanced approach to fitness, health, and longevity',
    icon: 'heart-outline',
  },
  {
    id: 'custom_primary',
    title: 'Custom Goal',
    subtitle: 'Create your own fitness objective',
    description: 'Define a personalized goal that fits your unique needs',
    icon: 'create-outline',
  },
];

const secondaryGoals: SecondaryGoal[] = [
  {
    id: 'include_cardio',
    title: 'Include Cardio',
    description: 'Add cardiovascular/endurance work',
    icon: 'walk-outline',
  },
  {
    id: 'maintain_flexibility',
    title: 'Maintain Flexibility',
    description: 'Include mobility and stretching work',
    icon: 'accessibility-outline',
  },
  {
    id: 'athletic_performance',
    title: 'Athletic Performance',
    description: 'Improve speed, agility, and power',
    icon: 'speedometer-outline',
  },
  {
    id: 'injury_prevention',
    title: 'Injury Prevention',
    description: 'Focus on corrective exercises and balance',
    icon: 'shield-checkmark-outline',
  },
  {
    id: 'fun_social',
    title: 'Fun & Social Activities',
    description: 'Include enjoyable group activities and recreational sports',
    icon: 'people-outline',
  },
  {
    id: 'custom_secondary',
    title: 'Custom Focus Area',
    description: 'Define your own additional training focus',
    icon: 'create-outline',
  },
];

export default function FitnessGoalsQuestionnaireScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor, themeColorLight } = useTheme();
  const [selectedPrimaryGoal, setSelectedPrimaryGoal] = useState<string>('');
  const [selectedSecondaryGoals, setSelectedSecondaryGoals] = useState<string[]>([]);
  const [customPrimaryGoal, setCustomPrimaryGoal] = useState<string>('');
  const [customSecondaryGoal, setCustomSecondaryGoal] = useState<string>('');
  const [specificSport, setSpecificSport] = useState<string>('');
  const [athleticPerformanceDetails, setAthleticPerformanceDetails] = useState<string>('');
  const [funSocialDetails, setFunSocialDetails] = useState<string>('');
  const [injuryPreventionDetails, setInjuryPreventionDetails] = useState<string>('');
  const [flexibilityDetails, setFlexibilityDetails] = useState<string>('');
  const [priorityMuscleGroups, setPriorityMuscleGroups] = useState<string[]>([]);
  const [customMuscleGroup, setCustomMuscleGroup] = useState<string>('');
  const [movementLimitations, setMovementLimitations] = useState<string[]>([]);
  const [customLimitation, setCustomLimitation] = useState<string>('');
  const [trainingStylePreference, setTrainingStylePreference] = useState<string>('');
  const [customTrainingStyle, setCustomTrainingStyle] = useState<string>('');
  const [totalTrainingDays, setTotalTrainingDays] = useState<number>(0);
  const [gymTrainingDays, setGymTrainingDays] = useState<number>(0);
  const [otherTrainingDays, setOtherTrainingDays] = useState<number>(0);
  const [customFrequency, setCustomFrequency] = useState<string>('');
  const [showCustomFrequency, setShowCustomFrequency] = useState<boolean>(false);
  const [customGoals, setCustomGoals] = useState<string>('');
  const [trainingExperience, setTrainingExperience] = useState<string>('');
  const [trainingApproach, setTrainingApproach] = useState<'push_hard' | 'balanced' | 'conservative'>('balanced');
  const [programDuration, setProgramDuration] = useState<string>('');
  const [customDuration, setCustomDuration] = useState<string>('');
  const [cardioPreferences, setCardioPreferences] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ScrollView refs for auto-scroll to top
  const step0ScrollRef = useRef<ScrollView>(null);
  const step1ScrollRef = useRef<ScrollView>(null);
  const step2ScrollRef = useRef<ScrollView>(null);
  const step3ScrollRef = useRef<ScrollView>(null);

  // Load saved questionnaire data on component mount
  useEffect(() => {
    loadSavedData();
  }, []);

  // Scroll to top when step changes
  useEffect(() => {
    const scrollToTop = () => {
      const refs = [step0ScrollRef, step1ScrollRef, step2ScrollRef, step3ScrollRef];
      const currentRef = refs[currentStep];
      if (currentRef?.current) {
        currentRef.current.scrollTo({ y: 0, animated: true });
      }
    };

    // Small delay to ensure the new step content is rendered
    const timeoutId = setTimeout(scrollToTop, 100);
    return () => clearTimeout(timeoutId);
  }, [currentStep]);

  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('fitnessGoalsData');
      if (savedData) {
        const data = JSON.parse(savedData);
        
        // Restore all form data
        setSelectedPrimaryGoal(data.primaryGoal || '');
        setSelectedSecondaryGoals(data.secondaryGoals || []);
        setCustomPrimaryGoal(data.customPrimaryGoal || '');
        setCustomSecondaryGoal(data.customSecondaryGoal || '');
        setSpecificSport(data.specificSport || '');
        setAthleticPerformanceDetails(data.athleticPerformanceDetails || '');
        setFunSocialDetails(data.funSocialDetails || '');
        setInjuryPreventionDetails(data.injuryPreventionDetails || '');
        setFlexibilityDetails(data.flexibilityDetails || '');
        setPriorityMuscleGroups(data.priorityMuscleGroups || []);
        setCustomMuscleGroup(data.customMuscleGroup || '');
        setMovementLimitations(data.movementLimitations || []);
        setCustomLimitation(data.customLimitation || '');
        setTrainingStylePreference(data.trainingStylePreference || '');
        setCustomTrainingStyle(data.customTrainingStyle || '');
        setTotalTrainingDays(data.totalTrainingDays || 0);
        setGymTrainingDays(data.gymTrainingDays || 0);
        setOtherTrainingDays(data.otherTrainingDays || 0);
        setCustomFrequency(data.customFrequency || '');
        setShowCustomFrequency(data.customFrequency !== '');
        setCustomGoals(data.customGoals || '');
        setTrainingExperience(data.trainingExperience || '');
        setTrainingApproach(data.trainingApproach || 'balanced');
        setProgramDuration(data.programDuration || '');
        setCustomDuration(data.customDuration || '');
        setCardioPreferences(data.cardioPreferences || []);
        
        // If questionnaire was completed, show summary directly
        // Check multiple indicators of completion
        const isQuestionnaireComplete = data.completedAt || 
          (data.primaryGoal && 
           data.totalTrainingDays > 0 && 
           data.programDuration && 
           (data.gymTrainingDays + (data.otherTrainingDays || 0)) === data.totalTrainingDays);
        
        if (isQuestionnaireComplete) {
          setIsCompleted(true);
          setShowResults(true);
        } else {
          // Restore current step for partial progress, but adjust for new navigation
          let stepToLoad = data.currentStep || 0;
          if (stepToLoad === 1) {
            stepToLoad = 2; // Skip the old empty step 1
          }
          setCurrentStep(stepToLoad);
        }
      }
    } catch (error) {
      console.error('Failed to load saved questionnaire data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save progress (without completedAt to indicate it's not finished)
  const saveProgress = async () => {
    try {
      const progressData = {
        primaryGoal: selectedPrimaryGoal,
        secondaryGoals: selectedSecondaryGoals,
        customPrimaryGoal: customPrimaryGoal,
        customSecondaryGoal: customSecondaryGoal,
        specificSport: specificSport,
        athleticPerformanceDetails: athleticPerformanceDetails,
        funSocialDetails: funSocialDetails,
        injuryPreventionDetails: injuryPreventionDetails,
        flexibilityDetails: flexibilityDetails,
        priorityMuscleGroups: priorityMuscleGroups,
        customMuscleGroup: customMuscleGroup,
        movementLimitations: movementLimitations,
        customLimitation: customLimitation,
        trainingStylePreference: trainingStylePreference,
        customTrainingStyle: customTrainingStyle,
        totalTrainingDays: totalTrainingDays,
        customFrequency: customFrequency,
        gymTrainingDays: gymTrainingDays,
        otherTrainingDays: otherTrainingDays,
        customGoals: customGoals,
        trainingExperience: trainingExperience,
        trainingApproach: trainingApproach,
        programDuration: programDuration,
        customDuration: customDuration,
        cardioPreferences: cardioPreferences,
        currentStep: currentStep,
        // Note: no completedAt field - this indicates it's in progress
      };

      await AsyncStorage.setItem('fitnessGoalsData', JSON.stringify(progressData));
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  // Auto-save progress when relevant state changes
  useEffect(() => {
    if (!isLoading && !isCompleted) {
      saveProgress();
    }
  }, [selectedPrimaryGoal, selectedSecondaryGoals, specificSport, athleticPerformanceDetails, 
      funSocialDetails, injuryPreventionDetails, flexibilityDetails, priorityMuscleGroups, 
      customMuscleGroup, movementLimitations, customLimitation, trainingStylePreference, 
      customTrainingStyle, totalTrainingDays, customFrequency, gymTrainingDays, 
      otherTrainingDays, customGoals, trainingExperience, trainingApproach, programDuration, customDuration, cardioPreferences]);

  const handleRetakeQuestions = async () => {
    // Don't clear existing answers - just allow user to review and modify them
    // This way if they accidentally clicked "Retake" they don't lose their progress
    setCurrentStep(0);
    setShowResults(false);
    setIsCompleted(false);
    // Keep all existing answers loaded so they can review and change if needed
  };

  const handlePrimaryGoalSelect = (goalId: string) => {
    setSelectedPrimaryGoal(goalId);
  };

  const handleSecondaryGoalToggle = (goalId: string) => {
    setSelectedSecondaryGoals(prev => {
      if (prev.includes(goalId)) {
        return prev.filter(id => id !== goalId);
      } else {
        return [...prev, goalId];
      }
    });
  };

  const handleMuscleGroupToggle = (muscleGroup: string) => {
    setPriorityMuscleGroups(prev => {
      if (prev.includes(muscleGroup)) {
        return prev.filter(group => group !== muscleGroup);
      } else {
        return [...prev, muscleGroup];
      }
    });
  };

  const handleCardioPreferenceToggle = (activity: string) => {
    setCardioPreferences(prev => {
      if (prev.includes(activity)) {
        return prev.filter(a => a !== activity);
      } else {
        return [...prev, activity];
      }
    });
  };

  const handleLimitationToggle = (limitation: string) => {
    setMovementLimitations(prev => {
      if (prev.includes(limitation)) {
        return prev.filter(limit => limit !== limitation);
      } else {
        return [...prev, limitation];
      }
    });
  };

  // Helper functions to get display names
  const getPrimaryGoalTitle = () => {
    if (selectedPrimaryGoal === 'custom_primary') {
      return customPrimaryGoal || 'Custom Goal';
    }
    const goal = primaryGoals.find(goal => goal.id === selectedPrimaryGoal);
    return goal ? goal.title : 'Gym/Strength Training';
  };

  const getSecondaryGoalTitle = () => {
    if (selectedSecondaryGoals.length === 0) return 'Other Activities';
    if (selectedSecondaryGoals.length === 1) {
      if (selectedSecondaryGoals[0] === 'custom_secondary') {
        return customSecondaryGoal || 'Custom Focus Area';
      }
      const goal = secondaryGoals.find(goal => goal.id === selectedSecondaryGoals[0]);
      return goal ? goal.title : 'Other Activities';
    }
    return 'Other Activities'; // Multiple goals - keep generic
  };

  const isValid = () => {
    if (currentStep === 0) {
      if (selectedPrimaryGoal === '' || totalTrainingDays <= 0) {
        return false;
      }
      
      // Check if custom primary goal is filled when selected
      if (selectedPrimaryGoal === 'custom_primary' && customPrimaryGoal.trim() === '') {
        return false;
      }
      
      // Check if custom secondary goal is filled when selected
      if (selectedSecondaryGoals.includes('custom_secondary') && customSecondaryGoal.trim() === '') {
        return false;
      }
      
      // If no secondary goals selected, all days should go to gym
      if (selectedSecondaryGoals.length === 0) {
        return gymTrainingDays === totalTrainingDays;
      }
      
      // If secondary goals are selected, split must add up to total
      return (gymTrainingDays + otherTrainingDays) === totalTrainingDays;
    }
    if (currentStep === 1) {
      return true; // Step 1 is now optional (was training frequency, now training preferences)
    }
    if (currentStep === 3) {
      return programDuration !== '';
    }
    // Step 2 (Training Preferences) is completely optional
    return true;
  };

  const handleNext = () => {
    if (!isValid()) {
      if (currentStep === 0) {
        if (selectedPrimaryGoal === '') {
          Alert.alert('Required Selection', 'Please select a primary fitness goal.');
        } else if (selectedPrimaryGoal === 'custom_primary' && customPrimaryGoal.trim() === '') {
          Alert.alert('Required Input', 'Please describe your custom fitness goal.');
        } else if (selectedSecondaryGoals.includes('custom_secondary') && customSecondaryGoal.trim() === '') {
          Alert.alert('Required Input', 'Please describe your custom focus area.');
        } else if (totalTrainingDays <= 0) {
          Alert.alert('Required Selection', 'Please select how many days per week you want to train.');
        } else if (selectedSecondaryGoals.length === 0 && gymTrainingDays !== totalTrainingDays) {
          Alert.alert('Required Selection', `Please set your ${getPrimaryGoalTitle()} days to ${totalTrainingDays} since you haven't selected any additional focus areas.`);
        } else if (selectedSecondaryGoals.length > 0 && (gymTrainingDays + otherTrainingDays) !== totalTrainingDays) {
          Alert.alert('Required Selection', 'Please complete your training split - the total must match your training days.');
        }
      } else if (currentStep === 1) {
        Alert.alert('Required Selection', 'Please select how many days per week you want to train.');
      } else if (currentStep === 3) {
        Alert.alert('Required Selection', 'Please select a program duration.');
      }
      return;
    }
    
    if (currentStep === 0) {
      setCurrentStep(2); // Skip step 1 (now empty) and go directly to step 2
    } else if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setShowResults(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      if (currentStep === 2) {
        setCurrentStep(0); // Skip empty step 1 when going back
      } else {
        setCurrentStep(currentStep - 1);
      }
    } else {
      navigation.goBack();
    }
  };

  const handleSaveAndContinue = async () => {
    try {
      const fitnessGoalsData = {
        primaryGoal: selectedPrimaryGoal,
        secondaryGoals: selectedSecondaryGoals,
        customPrimaryGoal: customPrimaryGoal,
        customSecondaryGoal: customSecondaryGoal,
        specificSport: specificSport,
        athleticPerformanceDetails: athleticPerformanceDetails,
        funSocialDetails: funSocialDetails,
        injuryPreventionDetails: injuryPreventionDetails,
        flexibilityDetails: flexibilityDetails,
        priorityMuscleGroups: priorityMuscleGroups,
        customMuscleGroup: customMuscleGroup,
        movementLimitations: movementLimitations,
        customLimitation: customLimitation,
        trainingStylePreference: trainingStylePreference,
        customTrainingStyle: customTrainingStyle,
        totalTrainingDays: totalTrainingDays,
        customFrequency: customFrequency,
        gymTrainingDays: gymTrainingDays,
        otherTrainingDays: otherTrainingDays,
        customGoals: customGoals,
        trainingExperience: trainingExperience,
        trainingApproach: trainingApproach,
        programDuration: programDuration,
        customDuration: customDuration,
        cardioPreferences: cardioPreferences,
        completedAt: new Date().toISOString(),
      };

      // Save to AsyncStorage
      await AsyncStorage.setItem('fitnessGoalsData', JSON.stringify(fitnessGoalsData));
      console.log('Fitness Goals Data saved:', fitnessGoalsData);
      
      // Mark as completed
      setIsCompleted(true);

      // Navigate back to workout dashboard
      navigation.navigate('WorkoutDashboard' as any);
    } catch (error) {
      console.error('Failed to save fitness goals:', error);
      Alert.alert('Error', 'Failed to save fitness goals. Please try again.');
    }
  };

  const renderPrimaryGoalOption = (goal: FitnessGoalOption, index: number) => {
    const isSelected = selectedPrimaryGoal === goal.id;
    
    return (
      <Animatable.View
        key={goal.id}
        animation="fadeInUp"
        delay={200 + (index * 100)}
        style={styles.goalOptionWrapper}
      >
        <TouchableOpacity
          style={[
            styles.goalOptionCard,
            isSelected && [
              styles.selectedGoalCard,
              { borderColor: themeColor, backgroundColor: `${themeColor}10` }
            ]
          ]}
          onPress={() => handlePrimaryGoalSelect(goal.id)}
          activeOpacity={0.8}
        >
          <View style={styles.goalCardContent}>
            <View style={styles.goalIconContainer}>
              <Ionicons
                name={goal.icon as any}
                size={28}
                color={isSelected ? themeColor : '#71717a'}
              />
            </View>
            
            <View style={styles.goalTextContainer}>
              <Text style={[styles.goalTitle, isSelected && { color: themeColor }]}>
                {goal.title}
              </Text>
              <Text style={styles.goalSubtitle}>
                {goal.subtitle}
              </Text>
              <Text style={styles.goalDescription}>
                {goal.description}
              </Text>
            </View>
            
            <View style={styles.goalCheckContainer}>
              <View style={[
                styles.radioButton,
                isSelected && { backgroundColor: themeColor, borderColor: themeColor }
              ]}>
                {isSelected && (
                  <Ionicons name="checkmark" size={16} color="#000000" />
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animatable.View>
    );
  };

  const renderSecondaryGoalOption = (goal: SecondaryGoal, index: number) => {
    const isSelected = selectedSecondaryGoals.includes(goal.id);
    
    return (
      <Animatable.View
        key={goal.id}
        animation="fadeInUp"
        delay={300 + (index * 50)}
        style={styles.secondaryGoalWrapper}
      >
        <TouchableOpacity
          style={[
            styles.secondaryGoalCard,
            isSelected && [
              styles.selectedSecondaryCard,
              { borderColor: themeColor, backgroundColor: `${themeColor}10` }
            ]
          ]}
          onPress={() => handleSecondaryGoalToggle(goal.id)}
          activeOpacity={0.8}
        >
          <View style={styles.secondaryGoalContent}>
            <View style={styles.secondaryIconContainer}>
              <Ionicons
                name={goal.icon as any}
                size={20}
                color={isSelected ? themeColor : '#71717a'}
              />
            </View>
            
            <View style={styles.secondaryTextContainer}>
              <Text style={[styles.secondaryTitle, isSelected && { color: themeColor }]}>
                {goal.title}
              </Text>
              <Text style={styles.secondaryDescription}>
                {goal.description}
              </Text>
            </View>
            
            <View style={styles.secondaryCheckContainer}>
              <View style={[
                styles.checkbox,
                isSelected && { backgroundColor: themeColor, borderColor: themeColor }
              ]}>
                {isSelected && (
                  <Ionicons name="checkmark" size={14} color="#000000" />
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Inline text input for Athletic Performance */}
        {goal.id === 'athletic_performance' && isSelected && (
          <Animatable.View
            animation="slideInDown"
            duration={300}
            style={styles.inlineInputContainer}
          >
            <Text style={styles.inlineInputLabel}>
              What specific athletic qualities do you want to improve?
            </Text>
            <TextInput
              style={styles.inlineTextInput}
              placeholder="e.g., Sprint speed for soccer, vertical jump, explosive power..."
              placeholderTextColor="#71717a"
              value={athleticPerformanceDetails}
              onChangeText={setAthleticPerformanceDetails}
            />
          </Animatable.View>
        )}

        {/* Inline text input for Fun & Social Activities */}
        {goal.id === 'fun_social' && isSelected && (
          <Animatable.View
            animation="slideInDown"
            duration={300}
            style={styles.inlineInputContainer}
          >
            <Text style={styles.inlineInputLabel}>
              What activities or sports interest you?
            </Text>
            <TextInput
              style={styles.inlineTextInput}
              placeholder="e.g., Rock climbing, volleyball, dance classes, running groups..."
              placeholderTextColor="#71717a"
              value={funSocialDetails}
              onChangeText={setFunSocialDetails}
            />
          </Animatable.View>
        )}

        {/* Inline text input for Injury Prevention */}
        {goal.id === 'injury_prevention' && isSelected && (
          <Animatable.View
            animation="slideInDown"
            duration={300}
            style={styles.inlineInputContainer}
          >
            <Text style={styles.inlineInputLabel}>
              Any specific areas of concern or previous injuries?
            </Text>
            <TextInput
              style={styles.inlineTextInput}
              placeholder="e.g., Previous knee injury, lower back pain, shoulder issues..."
              placeholderTextColor="#71717a"
              value={injuryPreventionDetails}
              onChangeText={setInjuryPreventionDetails}
            />
          </Animatable.View>
        )}

        {/* Inline text input for Maintain Flexibility */}
        {goal.id === 'maintain_flexibility' && isSelected && (
          <Animatable.View
            animation="slideInDown"
            duration={300}
            style={styles.inlineInputContainer}
          >
            <Text style={styles.inlineInputLabel}>
              Any specific areas you'd like to focus on?
            </Text>
            <TextInput
              style={styles.inlineTextInput}
              placeholder="e.g., Hip mobility, shoulder flexibility, lower back..."
              placeholderTextColor="#71717a"
              value={flexibilityDetails}
              onChangeText={setFlexibilityDetails}
            />
          </Animatable.View>
        )}
      </Animatable.View>
    );
  };

  // Add data for Step 2
  const muscleGroups = [
    'Chest', 'Front Delts', 'Side Delts', 'Rear Delts', 'Lats', 'Upper Back', 
    'Traps', 'Biceps', 'Triceps', 'Forearms', 'Quads', 'Hamstrings', 'Glutes', 
    'Calves', 'Core'
  ];

  const limitations = [
    'Overhead movements', 'Heavy squats', 'High-impact exercises', 
    'Jumping/plyometrics', 'Inversions/handstands', 'Heavy deadlifts', 'Other'
  ];

  const trainingStyles = [
    { id: 'compound_focused', title: 'Compound-Focused', description: 'Multi-joint exercises like squats, deadlifts' },
    { id: 'functional', title: 'Functional Fitness', description: 'Real-world movement patterns' },
    { id: 'bodybuilding', title: 'Bodybuilding Style', description: 'Isolation exercises for muscle growth' },
    { id: 'powerlifting', title: 'Powerlifting Style', description: 'Focus on squat, bench, deadlift' },
    { id: 'calisthenics', title: 'Calisthenics', description: 'Bodyweight-focused training' },
    { id: 'other', title: 'Other', description: 'Specify your preferred training approach' },
  ];

  const renderFitnessGoalsStep = () => (
    <ScrollView 
      ref={step0ScrollRef}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Primary Goals Section */}
      <Animatable.View
        animation="fadeInUp"
        delay={100}
        style={styles.sectionContainer}
      >
        <Text style={[styles.sectionTitle, { color: themeColor }]}>
          Primary Goal
        </Text>
        <Text style={styles.sectionSubtitle}>
          Choose your main fitness objective
        </Text>
        
        <View style={styles.goalsContainer}>
          {primaryGoals.map((goal, index) => renderPrimaryGoalOption(goal, index))}
        </View>
      </Animatable.View>

      {/* Sport-Specific Input */}
      {selectedPrimaryGoal === 'sport_specific' && (
        <Animatable.View
          animation="fadeInUp"
          delay={400}
          style={styles.sectionContainer}
        >
          <Text style={[styles.sectionTitle, { color: themeColor }]}>
            Which Sport?
          </Text>
          <Text style={styles.sectionSubtitle}>
            Tell us what sport you're training for
          </Text>
          
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Soccer, Basketball, Marathon Running..."
            placeholderTextColor="#71717a"
            value={specificSport}
            onChangeText={setSpecificSport}
          />
        </Animatable.View>
      )}

      {/* Custom Primary Goal Input */}
      {selectedPrimaryGoal === 'custom_primary' && (
        <Animatable.View
          animation="fadeInUp"
          delay={400}
          style={styles.sectionContainer}
        >
          <Text style={[styles.sectionTitle, { color: themeColor }]}>
            Custom Fitness Goal
          </Text>
          <Text style={styles.sectionSubtitle}>
            Describe your specific fitness objective
          </Text>
          
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Improve endurance for hiking, Build core strength..."
            placeholderTextColor="#71717a"
            value={customPrimaryGoal}
            onChangeText={setCustomPrimaryGoal}
          />
        </Animatable.View>
      )}

      {/* Secondary Goals Section */}
      {selectedPrimaryGoal && (
        <Animatable.View
          animation="fadeInUp"
          delay={500}
          style={styles.sectionContainer}
        >
          <Text style={[styles.sectionTitle, { color: themeColor }]}>
            Additional Focus Areas
          </Text>
          <Text style={styles.sectionSubtitle}>
            Select any additional areas you'd like to include (optional)
          </Text>
          
          <View style={styles.secondaryGoalsContainer}>
            {secondaryGoals.map((goal, index) => renderSecondaryGoalOption(goal, index))}
          </View>
        </Animatable.View>
      )}

      {/* Custom Secondary Goal Input */}
      {selectedSecondaryGoals.includes('custom_secondary') && (
        <Animatable.View
          animation="fadeInUp"
          delay={525}
          style={styles.sectionContainer}
        >
          <Text style={[styles.sectionTitle, { color: themeColor }]}>
            Custom Focus Area
          </Text>
          <Text style={styles.sectionSubtitle}>
            Describe your additional training focus
          </Text>
          
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Balance training, Flexibility for dance, Power for sports..."
            placeholderTextColor="#71717a"
            value={customSecondaryGoal}
            onChangeText={setCustomSecondaryGoal}
          />
        </Animatable.View>
      )}

      {/* Custom Goals Section */}
      {selectedPrimaryGoal && (
        <Animatable.View
          animation="fadeInUp"
          delay={550}
          style={styles.sectionContainer}
        >
          <Text style={[styles.sectionTitle, { color: themeColor }]}>
            Additional Notes
          </Text>
          <Text style={styles.sectionSubtitle}>
            Any specific goals or preferences? (optional)
          </Text>
          
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            placeholder="e.g., Focus on lower body, avoid high-impact exercises..."
            placeholderTextColor="#71717a"
            value={customGoals}
            onChangeText={setCustomGoals}
            multiline
            numberOfLines={3}
          />
        </Animatable.View>
      )}

      {/* Training Frequency - moved from step 1 */}
      {selectedPrimaryGoal && (
        <Animatable.View
          animation="fadeInUp"
          delay={600}
          style={styles.sectionContainer}
        >
          <Text style={[styles.sectionTitle, { color: themeColor }]}>
            Training Frequency
          </Text>
          <Text style={styles.sectionSubtitle}>
            Choose your weekly training schedule
          </Text>
          
          {/* Modern Frequency Grid */}
          <View style={styles.modernFrequencyContainer}>
            <View style={styles.modernFrequencyGrid}>
              {[1, 2, 3, 4, 5, 6, 7].map((days) => {
                const isSelected = !showCustomFrequency && totalTrainingDays === days;
                return (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.modernFrequencyCard,
                      isSelected && [styles.selectedModernCard, { borderColor: themeColor, backgroundColor: `${themeColor}15` }]
                    ]}
                    onPress={() => {
                      setTotalTrainingDays(days);
                      setShowCustomFrequency(false);
                      setCustomFrequency('');
                      setGymTrainingDays(0);
                      setOtherTrainingDays(0);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.modernFrequencyNumber,
                      isSelected && { color: themeColor }
                    ]}>
                      {days}
                    </Text>
                    <Text style={[
                      styles.modernFrequencyLabel,
                      isSelected && { color: themeColor }
                    ]}>
                      {days === 1 ? 'day' : 'days'}
                    </Text>
                    <Text style={[
                      styles.modernFrequencySubtext,
                      isSelected && { color: themeColor }
                    ]}>
                      per week
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Frequency Option - Now inside the container */}
            <TouchableOpacity
              style={[
                styles.modernCustomFrequencyTrigger,
                showCustomFrequency && [styles.selectedModernCard, { borderColor: themeColor, backgroundColor: `${themeColor}15` }]
              ]}
              onPress={() => {
                setShowCustomFrequency(!showCustomFrequency);
                if (!showCustomFrequency) {
                  setTotalTrainingDays(0);
                  setCustomFrequency('');
                  setGymTrainingDays(0);
                  setOtherTrainingDays(0);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.customFrequencyContent}>
                <Ionicons 
                  name="create-outline" 
                  size={20} 
                  color={showCustomFrequency ? themeColor : '#71717a'} 
                />
                <Text style={[
                  styles.customFrequencyText,
                  showCustomFrequency && { color: themeColor }
                ]}>
                  Custom Frequency (8-14 days)
                </Text>
              </View>
              <Ionicons 
                name={showCustomFrequency ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={showCustomFrequency ? themeColor : '#71717a'} 
              />
            </TouchableOpacity>
          </View>

          {/* Custom Input */}
          {showCustomFrequency && (
            <Animatable.View
              animation="slideInDown"
              duration={300}
              style={styles.modernCustomInputContainer}
            >
              <Text style={styles.modernCustomTitle}>Enter Custom Frequency</Text>
              <View style={styles.customInputWrapper}>
                <TextInput
                  style={[styles.modernCustomTextInput, { borderColor: themeColor }]}
                  placeholder="8-14"
                  placeholderTextColor="#71717a"
                  value={customFrequency}
                  onChangeText={(value) => {
                    const numericValue = value.replace(/[^0-9]/g, '');
                    setCustomFrequency(numericValue);
                    
                    const numValue = parseInt(numericValue);
                    if (!isNaN(numValue) && numValue > 0 && numValue <= 14) {
                      setTotalTrainingDays(numValue);
                    } else if (numValue > 14) {
                      setCustomFrequency('14');
                      setTotalTrainingDays(14);
                    } else {
                      setTotalTrainingDays(0);
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.daysPerWeekLabel}>days/week</Text>
              </View>
              <Text style={styles.customInputHint}>Maximum 14 sessions per week</Text>
            </Animatable.View>
          )}
        </Animatable.View>
      )}

      {/* Training Split - moved from step 1 */}
      {selectedPrimaryGoal && totalTrainingDays > 0 && (
        <Animatable.View
          animation="fadeInUp"
          delay={650}
          style={styles.sectionContainer}
        >
          <Text style={[styles.sectionTitle, { color: themeColor }]}>
            Training Split
          </Text>
          <Text style={styles.sectionSubtitle}>
            Divide your {totalTrainingDays} days between gym and other activities
          </Text>
          
          {/* Modern Split Container */}
          <View style={styles.modernSplitContainer}>
            {/* Gym Training Section */}
            <View style={styles.modernSplitSection}>
              <View style={styles.modernSplitHeader}>
                <View style={[styles.splitIconContainer, { backgroundColor: `${themeColor}20` }]}>
                  <Ionicons name="fitness" size={20} color={themeColor} />
                </View>
                <Text style={styles.modernSplitLabel}>{getPrimaryGoalTitle()}</Text>
              </View>
              <View style={styles.modernSplitGrid}>
                {[0, 1, 2, 3, 4, 5, 6, 7].slice(0, totalTrainingDays + 1).map((days) => {
                  const isSelected = gymTrainingDays === days;
                  const maxAllowed = totalTrainingDays - otherTrainingDays;
                  const isDisabled = days > maxAllowed;
                  
                  return (
                    <TouchableOpacity
                      key={`gym-${days}`}
                      style={[
                        styles.modernSplitCard,
                        isSelected && [styles.selectedModernSplitCard, { borderColor: themeColor, backgroundColor: `${themeColor}15` }],
                        isDisabled && styles.disabledSplitCard
                      ]}
                      onPress={() => !isDisabled && setGymTrainingDays(days)}
                      activeOpacity={isDisabled ? 1 : 0.7}
                      disabled={isDisabled}
                    >
                      <Text style={[
                        styles.modernSplitNumber,
                        isSelected && { color: themeColor },
                        isDisabled && styles.disabledSplitText
                      ]}>
                        {days}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Other Activities Section - Only show if user selected secondary goals */}
            {selectedSecondaryGoals.length > 0 && (
              <View style={styles.modernSplitSection}>
                <View style={styles.modernSplitHeader}>
                  <View style={[styles.splitIconContainer, { backgroundColor: '#10b98120' }]}>
                    <Ionicons name="walk" size={20} color="#10b981" />
                  </View>
                  <Text style={styles.modernSplitLabel}>{getSecondaryGoalTitle()}</Text>
                </View>
                <View style={styles.modernSplitGrid}>
                  {[0, 1, 2, 3, 4, 5, 6, 7].slice(0, totalTrainingDays + 1).map((days) => {
                    const isSelected = otherTrainingDays === days;
                    const maxAllowed = totalTrainingDays - gymTrainingDays;
                    const isDisabled = days > maxAllowed;
                    
                    return (
                      <TouchableOpacity
                        key={`other-${days}`}
                        style={[
                          styles.modernSplitCard,
                          isSelected && [styles.selectedModernSplitCard, { borderColor: '#10b981', backgroundColor: '#10b98115' }],
                          isDisabled && styles.disabledSplitCard
                        ]}
                        onPress={() => !isDisabled && setOtherTrainingDays(days)}
                        activeOpacity={isDisabled ? 1 : 0.7}
                        disabled={isDisabled}
                      >
                        <Text style={[
                          styles.modernSplitNumber,
                          isSelected && { color: '#10b981' },
                          isDisabled && styles.disabledSplitText
                        ]}>
                          {days}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Split validation warning */}
          {totalTrainingDays > 0 && (
            (selectedSecondaryGoals.length === 0 && gymTrainingDays !== totalTrainingDays) ||
            (selectedSecondaryGoals.length > 0 && (gymTrainingDays + otherTrainingDays) !== totalTrainingDays)
          ) && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning-outline" size={16} color="#f59e0b" />
              <Text style={styles.warningText}>
                {selectedSecondaryGoals.length === 0 
                  ? `Set your ${getPrimaryGoalTitle()} days to ${totalTrainingDays}`
                  : `Your split (${gymTrainingDays + otherTrainingDays} days) doesn't match your total training days (${totalTrainingDays})`
                }
              </Text>
            </View>
          )}
        </Animatable.View>
      )}
    </ScrollView>
  );

  const renderTrainingFrequencyStep = () => (
    <ScrollView 
      ref={step1ScrollRef}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Empty step - Training Experience moved to Step 4 */}
      <View style={styles.emptyStepContainer}>
        <Text style={styles.emptyStepText}>
          All set! Continue to customize your training preferences.
        </Text>
      </View>
    </ScrollView>
  );

  const renderTrainingPreferencesStep = () => (
    <ScrollView 
      ref={step2ScrollRef}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
    >

        {/* Priority Muscle Groups */}
        <Animatable.View
          animation="fadeInUp"
          delay={100}
          style={styles.sectionContainer}
        >
        <Text style={[styles.sectionTitle, { color: themeColor }]}>
          Priority Muscle Groups
        </Text>
        <Text style={styles.sectionSubtitle}>
          Any muscle groups you want to prioritize? (optional)
        </Text>
        
        <View style={styles.muscleGroupsContainer}>
          {muscleGroups.map((muscle, index) => (
            <TouchableOpacity
              key={muscle}
              style={[
                styles.muscleGroupChip,
                priorityMuscleGroups.includes(muscle) && [
                  styles.selectedMuscleChip,
                  { backgroundColor: themeColor, borderColor: themeColor }
                ]
              ]}
              onPress={() => handleMuscleGroupToggle(muscle)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.muscleGroupText,
                priorityMuscleGroups.includes(muscle) && styles.selectedMuscleText
              ]}>
                {muscle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {priorityMuscleGroups.includes('Other') && (
          <Animatable.View
            animation="slideInDown"
            duration={300}
            style={styles.otherInputContainer}
          >
            <Text style={styles.otherInputLabel}>
              Specify other muscle groups:
            </Text>
            <TextInput
              style={styles.otherTextInput}
              placeholder="e.g., Forearms, Traps, Lower traps..."
              placeholderTextColor="#71717a"
              value={customMuscleGroup}
              onChangeText={setCustomMuscleGroup}
            />
          </Animatable.View>
        )}
      </Animatable.View>

      {/* Movement Limitations */}
      <Animatable.View
        animation="fadeInUp"
        delay={200}
        style={styles.sectionContainer}
      >
        <Text style={[styles.sectionTitle, { color: themeColor }]}>
          Movement Limitations
        </Text>
        <Text style={styles.sectionSubtitle}>
          Any movements to avoid due to injury or comfort? (optional)
        </Text>
        
        <View style={styles.limitationsContainer}>
          {limitations.map((limitation, index) => (
            <TouchableOpacity
              key={limitation}
              style={[
                styles.limitationChip,
                movementLimitations.includes(limitation) && [
                  styles.selectedLimitationChip,
                  { backgroundColor: '#ff4444', borderColor: '#ff4444' }
                ]
              ]}
              onPress={() => handleLimitationToggle(limitation)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.limitationText,
                movementLimitations.includes(limitation) && styles.selectedLimitationText
              ]}>
                {limitation}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {movementLimitations.includes('Other') && (
          <Animatable.View
            animation="slideInDown"
            duration={300}
            style={styles.otherInputContainer}
          >
            <Text style={styles.otherInputLabel}>
              Specify other movement limitations:
            </Text>
            <TextInput
              style={styles.otherTextInput}
              placeholder="e.g., Wrist pain, ankle mobility issues, neck problems..."
              placeholderTextColor="#71717a"
              value={customLimitation}
              onChangeText={setCustomLimitation}
            />
          </Animatable.View>
        )}
      </Animatable.View>

      {/* Training Style Preference - Only for ambiguous goals that need approach clarification */}
      {(selectedPrimaryGoal === 'general_fitness' || selectedPrimaryGoal === 'body_recomposition' || selectedPrimaryGoal === 'custom_primary') && (
      <Animatable.View
        animation="fadeInUp"
        delay={300}
        style={styles.sectionContainer}
      >
        <Text style={[styles.sectionTitle, { color: themeColor }]}>
          Training Style Preference
        </Text>
        <Text style={styles.sectionSubtitle}>
          Any specific training approach you prefer? (optional)
        </Text>
        
        <View style={styles.trainingStylesContainer}>
          {trainingStyles.map((style, index) => (
            <TouchableOpacity
              key={style.id}
              style={[
                styles.trainingStyleCard,
                trainingStylePreference === style.id && [
                  styles.selectedTrainingStyle,
                  { borderColor: themeColor, backgroundColor: `${themeColor}10` }
                ]
              ]}
              onPress={() => setTrainingStylePreference(
                trainingStylePreference === style.id ? '' : style.id
              )}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.trainingStyleTitle,
                trainingStylePreference === style.id && { color: themeColor }
              ]}>
                {style.title}
              </Text>
              <Text style={styles.trainingStyleDescription}>
                {style.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {trainingStylePreference === 'other' && (
          <Animatable.View
            animation="slideInDown"
            duration={300}
            style={styles.otherInputContainer}
          >
            <Text style={styles.otherInputLabel}>
              Describe your preferred training approach:
            </Text>
            <TextInput
              style={styles.otherTextInput}
              placeholder="e.g., CrossFit style, circuit training, martial arts focused..."
              placeholderTextColor="#71717a"
              value={customTrainingStyle}
              onChangeText={setCustomTrainingStyle}
            />
          </Animatable.View>
        )}
      </Animatable.View>
      )}

      {/* Cardio Preferences - Only for users who selected include_cardio */}
      {selectedSecondaryGoals.includes('include_cardio') && (
      <Animatable.View
        animation="fadeInUp"
        delay={400}
        style={styles.sectionContainer}
      >
        <Text style={[styles.sectionTitle, { color: themeColor }]}>
          Cardio Preferences
        </Text>
        <Text style={styles.sectionSubtitle}>
          Which cardio activities would you prefer? Select all that apply. (optional)
        </Text>
        
        <View style={styles.cardioPreferencesContainer}>
          {[
            {
              id: 'treadmill',
              title: 'Treadmill / Indoor Running',
              icon: 'fitness-outline',
            },
            {
              id: 'stationary_bike',
              title: 'Stationary Bike / Cycling',
              icon: 'bicycle-outline',
            },
            {
              id: 'rowing_machine',
              title: 'Rowing Machine',
              icon: 'boat-outline',
            },
            {
              id: 'swimming',
              title: 'Swimming',
              icon: 'water-outline',
            },
            {
              id: 'stair_climber',
              title: 'Stair Climber / StepMill',
              icon: 'trending-up-outline',
            },
            {
              id: 'elliptical',
              title: 'Elliptical',
              icon: 'ellipse-outline',
            },
            {
              id: 'jump_rope',
              title: 'Jump Rope',
              icon: 'sync-outline',
            },
            {
              id: 'outdoor_running',
              title: 'Outdoor Running / Walking',
              icon: 'walk-outline',
            },
            {
              id: 'no_preference',
              title: 'No Preference (AI chooses)',
              icon: 'sparkles-outline',
            },
          ].map((cardio, index) => {
            const isSelected = cardioPreferences.includes(cardio.id);
            return (
              <TouchableOpacity
                key={cardio.id}
                style={[
                  styles.cardioPreferenceCard,
                  isSelected && [
                    styles.selectedCardioCard,
                    { borderColor: themeColor, backgroundColor: `${themeColor}10` }
                  ]
                ]}
                onPress={() => handleCardioPreferenceToggle(cardio.id)}
                activeOpacity={0.8}
              >
                <View style={styles.cardioPreferenceContent}>
                  <View style={[styles.cardioPreferenceIcon, isSelected && { backgroundColor: themeColor }]}>
                    <Ionicons
                      name={cardio.icon as any}
                      size={18}
                      color={isSelected ? '#000000' : themeColor}
                    />
                  </View>
                  <View style={styles.cardioPreferenceText}>
                    <Text style={[
                      styles.cardioPreferenceTitle,
                      isSelected && { color: themeColor }
                    ]}>
                      {cardio.title}
                    </Text>
                  </View>
                  <View style={styles.cardioPreferenceCheck}>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={18} color={themeColor} />
                    ) : (
                      <View style={styles.unselectedCircle} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animatable.View>
      )}
      
    </ScrollView>
  );

  const renderProgramPreferencesStep = () => (
    <ScrollView 
      ref={step3ScrollRef}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 350 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Program Duration Section */}
      <Animatable.View
        animation="fadeInUp"
        delay={50}
        style={styles.sectionContainer}
      >
        <Text style={[styles.sectionTitle, { color: themeColor }]}>
          Program Duration
        </Text>
        <Text style={styles.sectionSubtitle}>
          How long would you like your workout program to run?
        </Text>
        
        <View style={styles.programDurationContainer}>
          {[
            {
              id: '4_weeks',
              title: '4 Weeks',
              description: 'Quick trial program',
              icon: 'flash-outline',
            },
            {
              id: '8_weeks',
              title: '8 Weeks',
              description: 'Focused short-term program',
              icon: 'trending-up-outline',
            },
            {
              id: '12_weeks',
              title: '12 Weeks',
              description: 'Complete transformation cycle',
              icon: 'fitness-outline',
            },
            {
              id: '6_months',
              title: '6 Months',
              description: 'Comprehensive progression',
              icon: 'calendar-outline',
            },
            {
              id: '1_year',
              title: '1 Year',
              description: 'Long-term development plan',
              icon: 'trophy-outline',
            },
            {
              id: 'custom',
              title: 'Custom',
              description: 'Specify your own timeframe',
              icon: 'create-outline',
            },
          ].map((duration, index) => {
            const isSelected = programDuration === duration.id;
            return (
              <Animatable.View
                key={duration.id}
                animation="fadeInUp"
                delay={100 + (index * 50)}
                style={styles.durationOptionWrapper}
              >
                <TouchableOpacity
                  style={[
                    styles.durationCard,
                    isSelected && [
                      styles.selectedDurationCard,
                      { borderColor: themeColor, backgroundColor: `${themeColor}10` }
                    ]
                  ]}
                  onPress={() => {
                    // Allow deselection
                    if (programDuration === duration.id) {
                      setProgramDuration('');
                      if (duration.id === 'custom') {
                        setCustomDuration(''); // Clear custom input when deselecting
                      }
                    } else {
                      setProgramDuration(duration.id);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.durationCardContent}>
                    <View style={[styles.durationCardIcon, isSelected && { backgroundColor: themeColor }]}>
                      <Ionicons
                        name={duration.icon as any}
                        size={20}
                        color={isSelected ? '#000000' : themeColor}
                      />
                    </View>
                    <View style={styles.durationCardText}>
                      <Text style={[styles.durationCardTitle, isSelected && { color: themeColor }]}>
                        {duration.title}
                      </Text>
                      <Text style={[styles.durationCardDescription, isSelected && { color: themeColor, opacity: 0.8 }]}>
                        {duration.description}
                      </Text>
                    </View>
                    <View style={styles.durationCardCheck}>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color={themeColor} />
                      ) : (
                        <View style={styles.unselectedCircle} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Custom duration input */}
                {duration.id === 'custom' && isSelected && (
                  <Animatable.View
                    animation="slideInDown"
                    duration={300}
                    style={styles.customDurationContainer}
                  >
                    <TextInput
                      style={styles.customDurationInput}
                      placeholder="e.g., 16 weeks, 2 months, 18 months..."
                      placeholderTextColor="#71717a"
                      value={customDuration}
                      onChangeText={setCustomDuration}
                    />
                  </Animatable.View>
                )}
              </Animatable.View>
            );
          })}
        </View>
      </Animatable.View>

      {/* Training Experience Section */}
      <Animatable.View
        animation="fadeInUp"
        delay={200}
        style={styles.sectionContainer}
      >
        <Text style={[styles.sectionTitle, { color: themeColor }]}>
          Training Experience
        </Text>
        <Text style={styles.sectionSubtitle}>
          How familiar are you with gym workouts and exercise form?
        </Text>
        
        <View style={styles.experienceContainer}>
          {[
            {
              id: 'complete_beginner',
              title: 'Complete Beginner',
              description: 'New to gym or returning after 6+ months off',
              icon: 'school-outline',
            },
            {
              id: 'beginner',
              title: 'Beginner',
              description: '6-12 months consistent training, learning form',
              icon: 'fitness-outline',
            },
            {
              id: 'intermediate',
              title: 'Intermediate',
              description: '1+ years training, good form, steady progress',
              icon: 'barbell-outline',
            },
            {
              id: 'advanced',
              title: 'Advanced',
              description: '2+ years, excellent technique, slow progression',
              icon: 'trophy-outline',
            },
          ].map((experience, index) => {
            const isSelected = trainingExperience === experience.id;
            return (
              <Animatable.View
                key={experience.id}
                animation="fadeInUp"
                delay={250 + (index * 50)}
                style={styles.experienceOptionWrapper}
              >
                <TouchableOpacity
                  style={[
                    styles.experienceOption,
                    isSelected && [
                      styles.selectedExperienceOption,
                      { borderColor: themeColor, backgroundColor: `${themeColor}10` }
                    ]
                  ]}
                  onPress={() => setTrainingExperience(experience.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.experienceOptionContent}>
                    <View style={[styles.experienceIconContainer, isSelected && { backgroundColor: themeColor }]}>
                      <Ionicons
                        name={experience.icon as any}
                        size={20}
                        color={isSelected ? '#000000' : themeColor}
                      />
                    </View>
                    <View style={styles.experienceTextContainer}>
                      <Text style={[styles.experienceTitle, isSelected && { color: themeColor }]}>
                        {experience.title}
                      </Text>
                      <Text style={[styles.experienceDescription, isSelected && { color: themeColor, opacity: 0.8 }]}>
                        {experience.description}
                      </Text>
                    </View>
                    <View style={styles.experienceSelectionIndicator}>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color={themeColor} />
                      ) : (
                        <View style={styles.unselectedCircle} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </Animatable.View>
            );
          })}
        </View>
      </Animatable.View>

      {/* Training Approach Section */}
      <Animatable.View
        animation="fadeInUp"
        delay={300}
        style={styles.sectionContainer}
      >
        <Text style={[styles.sectionTitle, { color: themeColor }]}>
          How hard do you want to train?
        </Text>
        <Text style={styles.sectionSubtitle}>
          Choose your preferred training intensity and volume level
        </Text>
        
        <View style={styles.experienceContainer}>
          {[
            {
              id: 'push_hard',
              title: 'Push Hard',
              icon: 'flame-outline',
              getSubtitle: () => {
                switch (trainingExperience) {
                  case 'complete_beginner':
                    return '~8-10 sets/week per major muscle · Longer sessions · Prioritize sleep and nutrition';
                  case 'beginner':
                    return '~8-10 sets/week per major muscle · Longer sessions · Prioritize sleep and nutrition';
                  case 'intermediate':
                    return '~12-16 sets/week per major muscle · Longer sessions · Good recovery habits needed';
                  case 'advanced':
                    return '~16-20 sets/week per major muscle · Longer sessions · Excellent recovery essential';
                  default:
                    return '~12-16 sets/week per major muscle · Longer sessions · Good recovery habits needed';
                }
              }
            },
            {
              id: 'balanced',
              title: 'Balanced',
              subtitle: '(Recommended)',
              icon: 'speedometer-outline',
              getSubtitle: () => {
                switch (trainingExperience) {
                  case 'complete_beginner':
                    return '~6-8 sets/week per major muscle · Moderate sessions · Sustainable for most people';
                  case 'beginner':
                    return '~6-8 sets/week per major muscle · Moderate sessions · Sustainable for most people';
                  case 'intermediate':
                    return '~10-14 sets/week per major muscle · Moderate sessions · Best effort-to-results ratio';
                  case 'advanced':
                    return '~12-16 sets/week per major muscle · Moderate sessions · Solid gains without burnout';
                  default:
                    return '~10-14 sets/week per major muscle · Moderate sessions · Best effort-to-results ratio';
                }
              }
            },
            {
              id: 'conservative',
              title: 'Conservative',
              icon: 'leaf-outline',
              getSubtitle: () => {
                switch (trainingExperience) {
                  case 'complete_beginner':
                    return '~6 sets/week per major muscle · Shorter sessions · Great for busy schedules';
                  case 'beginner':
                    return '~6 sets/week per major muscle · Shorter sessions · Great for busy schedules';
                  case 'intermediate':
                    return '~8-10 sets/week per major muscle · Shorter sessions · Easy recovery';
                  case 'advanced':
                    return '~10-12 sets/week per major muscle · Shorter sessions · Sustainable long-term';
                  default:
                    return '~8-10 sets/week per major muscle · Shorter sessions · Easy recovery';
                }
              }
            }
          ].map((approach, index) => {
            const isSelected = trainingApproach === approach.id;
            return (
              <Animatable.View
                key={approach.id}
                animation="fadeInUp"
                delay={350 + (index * 50)}
                style={styles.experienceOptionWrapper}
              >
                <TouchableOpacity
                  style={[
                    styles.experienceOption,
                    isSelected && [
                      styles.selectedExperienceOption,
                      { borderColor: themeColor, backgroundColor: `${themeColor}10` }
                    ]
                  ]}
                  onPress={() => setTrainingApproach(approach.id as 'push_hard' | 'balanced' | 'conservative')}
                  activeOpacity={0.8}
                >
                  <View style={styles.experienceOptionContent}>
                    <View style={[styles.experienceIconContainer, isSelected && { backgroundColor: themeColor }]}>
                      <Ionicons
                        name={approach.icon as any}
                        size={20}
                        color={isSelected ? '#000000' : themeColor}
                      />
                    </View>
                    <View style={styles.experienceTextContainer}>
                      <Text style={[styles.experienceTitle, isSelected && { color: themeColor }]}>
                        {approach.title} {approach.subtitle || ''}
                      </Text>
                      <Text style={[styles.experienceDescription, isSelected && { color: themeColor, opacity: 0.8 }]}>
                        {approach.getSubtitle()}
                      </Text>
                    </View>
                    <View style={styles.experienceSelectionIndicator}>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color={themeColor} />
                      ) : (
                        <View style={styles.unselectedCircle} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </Animatable.View>
            );
          })}
        </View>
      </Animatable.View>

    </ScrollView>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return renderFitnessGoalsStep();
      case 1:
        return renderTrainingFrequencyStep();
      case 2:
        return renderTrainingPreferencesStep();
      case 3:
        return renderProgramPreferencesStep();
      default:
        return renderFitnessGoalsStep();
    }
  };

  // Show loading screen while data is loading
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showResults) {
    const selectedPrimary = primaryGoals.find(g => g.id === selectedPrimaryGoal);
    const selectedSecondary = secondaryGoals.filter(g => selectedSecondaryGoals.includes(g.id));

    return (
      <View style={styles.container}>
        {/* Single ScrollView for entire screen */}
        <ScrollView 
          style={styles.summaryScrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.summaryScrollContainer}
        >
          {/* Hero Section - Now scrollable */}
          <Animatable.View 
            animation="slideInDown" 
            duration={800}
            easing="ease-out-quart"
            style={[styles.scrollableHeroSection, { backgroundColor: themeColor }]}
          >
            <SafeAreaView>
              {/* Header */}
              <View style={styles.summaryHeader}>
              </View>

              {/* Hero Content */}
              <Animatable.View 
                animation="fadeInUp" 
                delay={300}
                duration={600}
                style={styles.heroContent}
              >
                {/* Main Goal Display */}
                <Animatable.View 
                  animation="zoomIn" 
                  delay={600}
                  duration={500}
                  style={styles.mainGoalDisplay}
                >
                  <Text style={styles.mainGoalText}>{selectedPrimary?.title}</Text>
                  <Text style={styles.mainGoalSubtext}>Primary Focus</Text>
                </Animatable.View>

                {/* Training Frequency Display */}
                <Animatable.View 
                  animation="bounceIn" 
                  delay={900}
                  duration={600}
                  style={styles.frequencyDisplay}
                >
                  <View style={styles.frequencyBadge}>
                    <Ionicons name="calendar" size={20} color={themeColor} />
                    <Text style={[styles.frequencyText, { color: themeColor }]}>
                      {totalTrainingDays} {totalTrainingDays === 1 ? 'day' : 'days'}/week
                    </Text>
                  </View>
                </Animatable.View>
              </Animatable.View>
            </SafeAreaView>
          </Animatable.View>

          {/* Content Cards */}
          <View style={styles.summaryCardsContainer}>

          {/* Goal Summary - Always show */}
          <Animatable.View 
            animation="fadeInUp" 
            delay={1200}
            duration={500}
            style={styles.summaryCard}
          >
            <Text style={styles.summaryCardTitle}>Your Selection Summary</Text>
            
            {/* Primary Goal */}
            <View style={styles.summaryItem}>
              <View style={[styles.summaryItemIcon, { backgroundColor: `${themeColor}15` }]}>
                <Ionicons name="trophy" size={18} color={themeColor} />
              </View>
              <View style={styles.summaryItemContent}>
                <Text style={styles.summaryItemLabel}>Primary Goal</Text>
                <Text style={styles.summaryItemValue}>{selectedPrimary?.title || 'Not selected'}</Text>
              </View>
            </View>


            {/* Additional Goals */}
            {selectedSecondary.length > 0 && (
              <View style={styles.summaryItem}>
                <View style={[styles.summaryItemIcon, { backgroundColor: `${themeColor}15` }]}>
                  <Ionicons name="add-circle" size={18} color={themeColor} />
                </View>
                <View style={styles.summaryItemContent}>
                  <Text style={styles.summaryItemLabel}>Additional Focus</Text>
                  <Text style={styles.summaryItemValue}>{selectedSecondary.map(g => g.title).join(', ')}</Text>
                </View>
              </View>
            )}
          </Animatable.View>

          {/* Training Schedule */}
          {totalTrainingDays > 0 && (
            <Animatable.View 
              animation="fadeInUp" 
              delay={1400}
              duration={500}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryCardTitle}>Training Schedule</Text>
              
              {/* Weekly Frequency */}
              <View style={styles.scheduleItem}>
                <View style={styles.scheduleHeader}>
                  <Ionicons name="calendar-outline" size={20} color={themeColor} />
                  <Text style={styles.scheduleHeaderText}>Weekly Training</Text>
                </View>
                <Text style={[styles.scheduleValue, { color: themeColor }]}>
                  {totalTrainingDays} {totalTrainingDays === 1 ? 'day' : 'days'} per week
                </Text>
              </View>

              {/* Training Split Breakdown */}
              {(gymTrainingDays > 0 || otherTrainingDays > 0) && (
                <View style={styles.scheduleBreakdown}>
                  {gymTrainingDays > 0 && (
                    <View style={styles.scheduleSubItem}>
                      <View style={styles.scheduleSubIcon}>
                        <Ionicons name="barbell" size={16} color="#22d3ee" />
                      </View>
                      <Text style={styles.scheduleSubLabel}>Gym Training</Text>
                      <Text style={styles.scheduleSubValue}>{gymTrainingDays} {gymTrainingDays === 1 ? 'day' : 'days'}</Text>
                    </View>
                  )}
                  {otherTrainingDays > 0 && (
                    <View style={styles.scheduleSubItem}>
                      <View style={styles.scheduleSubIcon}>
                        <Ionicons name="walk" size={16} color="#10b981" />
                      </View>
                      <Text style={styles.scheduleSubLabel}>{getSecondaryGoalTitle()}</Text>
                      <Text style={styles.scheduleSubValue}>{otherTrainingDays} {otherTrainingDays === 1 ? 'day' : 'days'}</Text>
                    </View>
                  )}
                </View>
              )}
            </Animatable.View>
          )}

          {/* Training Experience */}
          {trainingExperience && (
            <Animatable.View 
              animation="fadeInUp" 
              delay={1500}
              duration={500}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryCardTitle}>Training Experience</Text>
              
              <View style={styles.summaryItem}>
                <View style={[styles.summaryItemIcon, { backgroundColor: `${themeColor}15` }]}>
                  <Ionicons 
                    name={
                      trainingExperience === 'complete_beginner' ? 'school' :
                      trainingExperience === 'beginner' ? 'fitness' :
                      trainingExperience === 'intermediate' ? 'barbell' : 'trophy'
                    } 
                    size={18} 
                    color={themeColor} 
                  />
                </View>
                <View style={styles.summaryItemContent}>
                  <Text style={styles.summaryItemLabel}>Experience Level</Text>
                  <Text style={styles.summaryItemValue}>
                    {trainingExperience === 'complete_beginner' ? 'Complete Beginner' :
                     trainingExperience === 'beginner' ? 'Beginner' :
                     trainingExperience === 'intermediate' ? 'Intermediate' : 'Advanced'}
                  </Text>
                </View>
              </View>
            </Animatable.View>
          )}

          {/* Training Approach */}
          {trainingApproach && (
            <Animatable.View 
              animation="fadeInUp" 
              delay={1550}
              duration={500}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryCardTitle}>Training Approach</Text>
              
              <View style={styles.summaryItem}>
                <View style={[styles.summaryItemIcon, { backgroundColor: `${themeColor}15` }]}>
                  <Ionicons 
                    name={
                      trainingApproach === 'push_hard' ? 'flame' :
                      trainingApproach === 'balanced' ? 'speedometer' : 'leaf'
                    } 
                    size={18} 
                    color={themeColor} 
                  />
                </View>
                <View style={styles.summaryItemContent}>
                  <Text style={styles.summaryItemLabel}>Training Intensity</Text>
                  <Text style={styles.summaryItemValue}>
                    {trainingApproach === 'push_hard' ? 'Push Hard' :
                     trainingApproach === 'balanced' ? 'Balanced (Recommended)' : 'Conservative'}
                  </Text>
                </View>
              </View>
            </Animatable.View>
          )}

          {/* Program Preferences */}
          {programDuration && (
            <Animatable.View 
              animation="fadeInUp" 
              delay={1600}
              duration={500}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryCardTitle}>Program Preferences</Text>
              
              {programDuration && (
                <View style={styles.summaryItem}>
                  <View style={[styles.summaryItemIcon, { backgroundColor: `${themeColor}15` }]}>
                    <Ionicons 
                      name={
                        programDuration === '4_weeks' ? 'flash' :
                        programDuration === '8_weeks' ? 'trending-up' :
                        programDuration === '12_weeks' ? 'fitness' :
                        programDuration === '6_months' ? 'calendar' :
                        programDuration === '1_year' ? 'trophy' : 'create'
                      } 
                      size={18} 
                      color={themeColor} 
                    />
                  </View>
                  <View style={styles.summaryItemContent}>
                    <Text style={styles.summaryItemLabel}>Program Duration</Text>
                    <Text style={styles.summaryItemValue}>
                      {programDuration === '4_weeks' ? '4 Weeks' :
                       programDuration === '8_weeks' ? '8 Weeks' :
                       programDuration === '12_weeks' ? '12 Weeks' :
                       programDuration === '6_months' ? '6 Months' :
                       programDuration === '1_year' ? '1 Year' :
                       programDuration === 'custom' ? (customDuration || 'Custom Duration') : 'Custom Duration'}
                    </Text>
                  </View>
                </View>
              )}
            </Animatable.View>
          )}

          {/* Secondary Goals - Exclude cardio since it has its own dedicated section */}
          {selectedSecondary.filter(goal => goal.id !== 'include_cardio').length > 0 && (
            <Animatable.View 
              animation="fadeInUp" 
              delay={1700}
              duration={500}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryCardTitle}>Additional Focus Areas</Text>
              <View style={styles.secondaryGoalsList}>
                {selectedSecondary
                  .filter(goal => goal.id !== 'include_cardio')
                  .map((goal, index) => (
                    <Animatable.View 
                      key={goal.id} 
                      animation="fadeInRight"
                      delay={1900 + (index * 100)}
                      style={styles.secondaryGoalItem}
                    >
                      <View style={[styles.goalDot, { backgroundColor: themeColor }]} />
                      <Text style={styles.secondaryGoalText}>{goal.title}</Text>
                    </Animatable.View>
                  ))}
              </View>
            </Animatable.View>
          )}

          {/* Specific Details */}
          {(specificSport || athleticPerformanceDetails || funSocialDetails || injuryPreventionDetails || flexibilityDetails || customGoals) && (
            <Animatable.View 
              animation="fadeInUp" 
              delay={1900}
              duration={500}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryCardTitle}>Specific Focus</Text>
              <View style={styles.specificDetails}>
                {selectedPrimaryGoal === 'sport_specific' && specificSport && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: themeColor }]}>Sport:</Text>
                    <Text style={styles.detailValue}>{specificSport}</Text>
                  </View>
                )}
                {selectedSecondaryGoals.includes('athletic_performance') && athleticPerformanceDetails && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: themeColor }]}>Athletic Performance:</Text>
                    <Text style={styles.detailValue}>{athleticPerformanceDetails}</Text>
                  </View>
                )}
                {selectedSecondaryGoals.includes('fun_social') && funSocialDetails && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: themeColor }]}>Fun & Social:</Text>
                    <Text style={styles.detailValue}>{funSocialDetails}</Text>
                  </View>
                )}
                {selectedSecondaryGoals.includes('injury_prevention') && injuryPreventionDetails && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: themeColor }]}>Injury Prevention:</Text>
                    <Text style={styles.detailValue}>{injuryPreventionDetails}</Text>
                  </View>
                )}
                {selectedSecondaryGoals.includes('maintain_flexibility') && flexibilityDetails && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: themeColor }]}>Flexibility:</Text>
                    <Text style={styles.detailValue}>{flexibilityDetails}</Text>
                  </View>
                )}
                {customGoals && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: themeColor }]}>Custom Goals:</Text>
                    <Text style={styles.detailValue}>{customGoals}</Text>
                  </View>
                )}
                {selectedSecondaryGoals.includes('include_cardio') && cardioPreferences.length > 0 && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: themeColor }]}>Cardio Activities:</Text>
                    <Text style={styles.detailValue}>
                      {cardioPreferences.map(activity => {
                        const activityMap: { [key: string]: string } = {
                          'treadmill': 'Treadmill / Indoor Running',
                          'stationary_bike': 'Stationary Bike / Cycling',
                          'rowing_machine': 'Rowing Machine',
                          'swimming': 'Swimming',
                          'stair_climber': 'Stair Climber / StepMill',
                          'elliptical': 'Elliptical',
                          'jump_rope': 'Jump Rope',
                          'outdoor_running': 'Outdoor Running / Walking',
                          'no_preference': 'No Preference (AI chooses)',
                        };
                        return activityMap[activity] || activity;
                      }).join(', ')}
                    </Text>
                  </View>
                )}
              </View>
            </Animatable.View>
          )}

          {/* Save Button */}
          <Animatable.View 
            animation="slideInUp" 
            delay={2000}
            duration={600}
            style={styles.summaryFooter}
          >
            <Animatable.View
              animation="pulse"
              delay={2400}
              duration={800}
              iterationCount={2}
            >
              <TouchableOpacity
                style={[styles.summarySaveButton, { backgroundColor: themeColor }]}
                onPress={handleSaveAndContinue}
                activeOpacity={0.8}
              >
                <Text style={styles.summarySaveButtonText}>Save & Continue</Text>
              </TouchableOpacity>
            </Animatable.View>
            
            {/* Retake Questions Button */}
            <Animatable.View
              animation="fadeIn"
              delay={2600}
              duration={400}
            >
              <TouchableOpacity
                style={styles.retakeQuestionsButton}
                onPress={handleRetakeQuestions}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={18} color="#71717a" />
                <Text style={styles.retakeQuestionsButtonText}>Retake Questions</Text>
              </TouchableOpacity>
            </Animatable.View>
          </Animatable.View>

          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColor} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {currentStep === 0 ? 'Goals & Schedule' : 
             currentStep === 1 ? 'Training Preferences' : 
             currentStep === 2 ? 'Additional Details' :
             'Program Preferences'}
          </Text>
          <Text style={styles.headerSubtitle}>
            Step {currentStep === 0 ? 1 : currentStep === 2 ? 2 : currentStep === 3 ? 3 : currentStep + 1} of 3
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: themeColor,
                width: `${(currentStep === 0 ? 1 : currentStep === 2 ? 2 : currentStep === 3 ? 3 : currentStep + 1) / 3 * 100}%`
              }
            ]} 
          />
        </View>
      </View>

      {/* Step Content */}
      {renderStep()}

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <Animatable.View
          animation={isValid() ? 'pulse' : undefined}
          duration={1000}
          iterationCount={isValid() ? 2 : 1}
        >
          <TouchableOpacity
            style={[
              styles.navigationButton, 
              { backgroundColor: isValid() ? themeColor : '#27272a' },
              !isValid() && styles.disabledButton
            ]}
            onPress={handleNext}
            activeOpacity={isValid() ? 0.8 : 1}
            disabled={!isValid()}
          >
          <Text style={[
            styles.navigationButtonText,
            { color: isValid() ? '#000000' : '#71717a' }
          ]}>
            {currentStep === 3 ? 'Complete' : 'Next'}
          </Text>
          {currentStep === 3 ? (
            <Ionicons name="checkmark" size={20} color={isValid() ? '#000000' : '#71717a'} />
          ) : (
            <Ionicons name="arrow-forward" size={20} color={isValid() ? '#000000' : '#71717a'} />
          )}
        </TouchableOpacity>
        </Animatable.View>
      </View>

    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#71717a',
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 20,
  },
  goalsContainer: {
    gap: 12,
  },
  goalOptionWrapper: {
    marginBottom: 4,
  },
  goalOptionCard: {
    backgroundColor: '#1a1a1b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333333',
    padding: 16,
  },
  selectedGoalCard: {
    borderWidth: 2,
  },
  goalCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalIconContainer: {
    marginRight: 16,
  },
  goalTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  goalSubtitle: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 4,
  },
  goalDescription: {
    fontSize: 13,
    color: '#a1a1aa',
    lineHeight: 18,
  },
  goalCheckContainer: {
    alignItems: 'center',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#71717a',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryGoalsContainer: {
    gap: 8,
  },
  secondaryGoalWrapper: {
    marginBottom: 4,
  },
  secondaryGoalCard: {
    backgroundColor: '#1a1a1b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 12,
  },
  selectedSecondaryCard: {
    borderWidth: 2,
  },
  secondaryGoalContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryIconContainer: {
    marginRight: 12,
  },
  secondaryTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  secondaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  secondaryDescription: {
    fontSize: 12,
    color: '#a1a1aa',
  },
  secondaryCheckContainer: {
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#71717a',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    backgroundColor: '#1a1a1b',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  inlineInputContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  inlineInputLabel: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 8,
  },
  inlineTextInput: {
    backgroundColor: '#0a0a0b',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 6,
    padding: 10,
    color: '#ffffff',
    fontSize: 14,
  },
  continueButtonContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  resultsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  resultCard: {
    backgroundColor: '#1a1a1b',
    borderRadius: 12,
    borderWidth: 2,
    padding: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  resultValue: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 4,
  },
  resultDescription: {
    fontSize: 14,
    color: '#a1a1aa',
    marginTop: 8,
  },
  actionButtons: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressBackground: {
    height: 8,
    backgroundColor: '#1a1a1b',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 8,
  },
  navigationContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0a0a0b',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1b',
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  navigationButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  disabledButton: {
    opacity: 0.6,
  },
  muscleGroupsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleGroupChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#1a1a1b',
  },
  selectedMuscleChip: {
    borderWidth: 1,
  },
  muscleGroupText: {
    fontSize: 14,
    color: '#ffffff',
  },
  selectedMuscleText: {
    color: '#000000',
  },
  limitationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  limitationChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#1a1a1b',
  },
  selectedLimitationChip: {
    borderWidth: 1,
  },
  limitationText: {
    fontSize: 14,
    color: '#ffffff',
  },
  selectedLimitationText: {
    color: '#ffffff',
  },
  trainingStylesContainer: {
    gap: 12,
  },
  trainingStyleCard: {
    backgroundColor: '#1a1a1b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 16,
  },
  selectedTrainingStyle: {
    borderWidth: 2,
  },
  trainingStyleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  trainingStyleDescription: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  otherInputContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111112',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  otherInputLabel: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 8,
  },
  otherTextInput: {
    backgroundColor: '#1a1a1b',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 6,
    padding: 10,
    color: '#ffffff',
    fontSize: 14,
  },
  frequencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  frequencyChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#333333',
    backgroundColor: '#1a1a1b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedFrequencyChip: {
    borderWidth: 2,
  },
  frequencyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  selectedFrequencyText: {
    color: '#000000',
  },
  splitContainer: {
    gap: 16,
  },
  splitRow: {
    gap: 8,
  },
  splitLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  splitControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  splitChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#1a1a1b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedSplitChip: {
    borderWidth: 2,
  },
  splitText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  selectedSplitText: {
    color: '#000000',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#2d1b0f',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#f59e0b',
  },
  customFrequencyChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#333333',
    backgroundColor: '#1a1a1b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customFrequencyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  customInputContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111112',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  customInputLabel: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 8,
  },
  customFrequencyInput: {
    backgroundColor: '#1a1a1b',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 6,
    padding: 10,
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
  },
  // Guide Modal Styles
  guideModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0a0a0b',
    zIndex: 1000,
    elevation: 1000,
  },
  guideModalSafeArea: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: '#0a0a0b',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1b',
  },
  guideBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  guideContent: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  guideScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  
  // Hero Stats
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#1a1a1b',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#a1a1aa',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#333333',
    marginHorizontal: 8,
  },
  
  // Quick Helper
  quickHelper: {
    backgroundColor: '#111112',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  helperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  helperTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
  },
  helperGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  helperCard: {
    backgroundColor: '#1a1a1b',
    borderRadius: 8,
    padding: 12,
    width: '48%',
    alignItems: 'center',
  },
  helperGoal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  helperFreq: {
    fontSize: 13,
    color: '#a1a1aa',
    textAlign: 'center',
  },
  
  // Findings Section
  findingsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  findingCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  findingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  findingEmoji: {
    fontSize: 20,
  },
  findingContent: {
    flex: 1,
  },
  findingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  findingText: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 20,
  },
  
  // Warning Section
  warningSection: {
    backgroundColor: '#1a0f0f',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningList: {
    gap: 8,
  },
  warningItem: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
  },
  
  // Evidence Section
  evidenceSection: {
    marginBottom: 20,
  },
  evidenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  evidenceItem: {
    backgroundColor: '#1a1a1b',
    borderRadius: 8,
    padding: 12,
    width: '48%',
    borderWidth: 1,
    borderColor: '#333333',
  },
  evidenceJournal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  evidenceStudy: {
    fontSize: 11,
    color: '#a1a1aa',
  },

  // Modern Training Frequency Styles
  modernFrequencyContainer: {
    marginBottom: 24,
  },
  modernFrequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modernFrequencyCard: {
    width: '30%',
    aspectRatio: 0.9,
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedModernCard: {
    borderWidth: 2,
    shadowColor: '#22d3ee',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modernFrequencyNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  modernFrequencyLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717a',
  },
  modernFrequencySubtext: {
    fontSize: 10,
    fontWeight: '400',
    color: '#71717a',
    opacity: 0.8,
  },
  modernCustomCard: {
    width: '30%',
    aspectRatio: 0.9,
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modernCustomLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717a',
    marginTop: 4,
  },
  modernCustomInput: {
    marginTop: 16,
  },
  customInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modernCustomTextInput: {
    backgroundColor: '#1a1a1b',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 80,
    marginRight: 12,
  },
  daysPerWeekLabel: {
    fontSize: 16,
    color: '#71717a',
    fontWeight: '500',
  },
  modernCustomTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  customInputHint: {
    fontSize: 14,
    color: '#71717a',
    fontStyle: 'italic',
  },
  modernCustomFrequencyTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1b',
    borderWidth: 2,
    borderColor: '#333333',
    borderRadius: 16,
    padding: 16,
  },
  customFrequencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customFrequencyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717a',
  },
  modernCustomInputContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#111112',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },

  // Modern Split Styles
  modernSplitContainer: {
    gap: 24,
  },
  modernSplitSection: {
    marginBottom: 8,
  },
  modernSplitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  splitIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modernSplitLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modernSplitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modernSplitCard: {
    width: 48,
    height: 48,
    backgroundColor: '#1a1a1b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedModernSplitCard: {
    borderWidth: 2,
    shadowColor: '#22d3ee',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  modernSplitNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  disabledSplitCard: {
    backgroundColor: '#1a1a1b',
    borderColor: '#2a2a2b',
    opacity: 0.4,
  },
  disabledSplitText: {
    color: '#4a4a4b',
  },

  // Summary Page Styles
  heroSection: {
    paddingBottom: 40,
  },
  summaryScrollView: {
    flex: 1,
  },
  summaryScrollContainer: {
    flexGrow: 1,
  },
  scrollableHeroSection: {
    paddingBottom: 40,
  },
  summaryCardsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  retakeQuestionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
  },
  retakeQuestionsButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#71717a',
    marginLeft: 6,
  },
  heroContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#000000',
    opacity: 0.7,
    marginBottom: 32,
  },
  mainGoalDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mainGoalText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  mainGoalSubtext: {
    fontSize: 16,
    color: '#000000',
    opacity: 0.7,
  },
  frequencyDisplay: {
    alignItems: 'center',
  },
  frequencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  summaryContent: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  summaryScrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  summaryCard: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryItemContent: {
    flex: 1,
  },
  summaryItemLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#71717a',
    marginBottom: 2,
  },
  summaryItemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 22,
  },
  scheduleItem: {
    marginBottom: 16,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  scheduleValue: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2a2a2b',
    borderRadius: 12,
  },
  scheduleBreakdown: {
    marginTop: 12,
    gap: 8,
  },
  scheduleSubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#2a2a2b',
    borderRadius: 8,
  },
  scheduleSubIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1a1a1b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  scheduleSubLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#d1d5db',
  },
  scheduleSubValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  splitDisplay: {
    gap: 16,
  },
  splitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2b',
    borderRadius: 12,
    padding: 16,
  },
  splitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  splitValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryGoalsList: {
    gap: 12,
  },
  secondaryGoalItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  secondaryGoalText: {
    fontSize: 16,
    color: '#d1d5db',
  },
  specificDetails: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
    minWidth: 80,
  },
  detailValue: {
    flex: 1,
    fontSize: 16,
    color: '#d1d5db',
    lineHeight: 22,
  },
  summaryFooter: {
    marginHorizontal: 20,
    marginTop: 32,
    marginBottom: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1b',
  },
  summarySaveButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  summarySaveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },

  // Training Experience Styles
  experienceContainer: {
    gap: 12,
  },
  experienceOptionWrapper: {
    marginBottom: 4,
  },
  experienceOption: {
    backgroundColor: '#1a1a1b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333333',
    padding: 16,
  },
  selectedExperienceOption: {
    borderWidth: 2,
  },
  experienceOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  experienceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  experienceTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  experienceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  experienceDescription: {
    fontSize: 13,
    color: '#a1a1aa',
    lineHeight: 18,
  },
  experienceSelectionIndicator: {
    alignItems: 'center',
  },

  // Empty Step Styles
  emptyStepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyStepText: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Program Duration Styles
  programDurationContainer: {
    gap: 12,
  },
  durationOptionWrapper: {
    marginBottom: 4,
  },
  durationCard: {
    backgroundColor: '#1a1a1b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333333',
    padding: 16,
  },
  selectedDurationCard: {
    borderWidth: 2,
  },
  durationCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  durationCardText: {
    flex: 1,
    marginRight: 12,
  },
  durationCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  durationCardDescription: {
    fontSize: 13,
    color: '#a1a1aa',
    lineHeight: 18,
  },
  durationCardCheck: {
    alignItems: 'center',
  },
  customDurationContainer: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  customDurationInput: {
    backgroundColor: '#27272a',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#3a3a3b',
  },

  // Cardio Preferences Styles
  cardioPreferencesContainer: {
    marginTop: 16,
  },
  cardioPreferenceCard: {
    backgroundColor: '#1a1a1b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 12,
    overflow: 'hidden',
  },
  selectedCardioCard: {
    borderWidth: 2,
  },
  cardioPreferenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardioPreferenceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardioPreferenceText: {
    flex: 1,
  },
  cardioPreferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  cardioPreferenceCheck: {
    alignItems: 'center',
  },

});