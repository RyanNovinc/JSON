import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
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
];

export default function FitnessGoalsQuestionnaireScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor, themeColorLight } = useTheme();
  const [selectedPrimaryGoal, setSelectedPrimaryGoal] = useState<string>('');
  const [selectedSecondaryGoals, setSelectedSecondaryGoals] = useState<string[]>([]);
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
  const [currentStep, setCurrentStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved questionnaire data on component mount
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('fitnessGoalsData');
      if (savedData) {
        const data = JSON.parse(savedData);
        
        // Restore all form data
        setSelectedPrimaryGoal(data.primaryGoal || '');
        setSelectedSecondaryGoals(data.secondaryGoals || []);
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
        
        // If questionnaire was completed, show summary directly
        if (data.completedAt) {
          setIsCompleted(true);
          setShowResults(true);
        } else {
          // Restore current step for partial progress
          setCurrentStep(data.currentStep || 0);
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
      otherTrainingDays, customGoals]);

  const handleRetakeQuestions = async () => {
    try {
      // Clear saved data from AsyncStorage
      await AsyncStorage.removeItem('fitnessGoalsData');
      
      // Reset all state variables
      setSelectedPrimaryGoal('');
      setSelectedSecondaryGoals([]);
      setSpecificSport('');
      setAthleticPerformanceDetails('');
      setFunSocialDetails('');
      setInjuryPreventionDetails('');
      setFlexibilityDetails('');
      setPriorityMuscleGroups([]);
      setCustomMuscleGroup('');
      setMovementLimitations([]);
      setCustomLimitation('');
      setTrainingStylePreference('');
      setCustomTrainingStyle('');
      setTotalTrainingDays(0);
      setGymTrainingDays(0);
      setOtherTrainingDays(0);
      setCustomFrequency('');
      setShowCustomFrequency(false);
      setCustomGoals('');
      setCurrentStep(0);
      setShowResults(false);
      setIsCompleted(false);
    } catch (error) {
      console.error('Failed to reset questionnaire:', error);
    }
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

  const handleLimitationToggle = (limitation: string) => {
    setMovementLimitations(prev => {
      if (prev.includes(limitation)) {
        return prev.filter(limit => limit !== limitation);
      } else {
        return [...prev, limitation];
      }
    });
  };

  const isValid = () => {
    if (currentStep === 0) {
      return selectedPrimaryGoal !== '';
    }
    if (currentStep === 1) {
      return totalTrainingDays > 0;
    }
    // Step 2 (Training Preferences) is completely optional
    return true;
  };

  const handleNext = () => {
    if (!isValid()) {
      if (currentStep === 0) {
        Alert.alert('Required Selection', 'Please select a primary fitness goal.');
      } else if (currentStep === 1) {
        Alert.alert('Required Selection', 'Please select how many days per week you want to train.');
      }
      return;
    }
    
    if (currentStep === 0) {
      setCurrentStep(1);
    } else if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setShowResults(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSaveAndContinue = async () => {
    try {
      const fitnessGoalsData = {
        primaryGoal: selectedPrimaryGoal,
        secondaryGoals: selectedSecondaryGoals,
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
    'Arms', 'Shoulders', 'Chest', 'Back', 'Core', 'Legs', 'Glutes', 'Calves', 'Other'
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
    </ScrollView>
  );

  const renderTrainingFrequencyStep = () => {
    // Determine what additional activities are selected
    const hasCardio = selectedSecondaryGoals.includes('include_cardio');
    const hasSport = selectedPrimaryGoal === 'sport_specific' || selectedSecondaryGoals.includes('fun_social');
    
    return (
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Training Frequency */}
        <Animatable.View
          animation="fadeInUp"
          delay={50}
          style={styles.sectionContainer}
        >
          <Text style={[styles.sectionTitle, { color: themeColor }]}>
            Training Frequency
          </Text>
          <Text style={styles.sectionSubtitle}>
            Choose your weekly training schedule
          </Text>
          
          {/* Modern Frequency Grid */}
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
                </TouchableOpacity>
              );
            })}
            
            {/* Custom Card */}
            <TouchableOpacity
              style={[
                styles.modernCustomCard,
                showCustomFrequency && [styles.selectedModernCard, { borderColor: themeColor, backgroundColor: `${themeColor}15` }]
              ]}
              onPress={() => {
                setShowCustomFrequency(true);
                setTotalTrainingDays(0);
                setGymTrainingDays(0);
                setOtherTrainingDays(0);
              }}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="add-circle-outline" 
                size={24} 
                color={showCustomFrequency ? themeColor : '#71717a'} 
              />
              <Text style={[
                styles.modernCustomLabel,
                showCustomFrequency && { color: themeColor }
              ]}>
                Custom
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Custom input field */}
          {showCustomFrequency && (
            <Animatable.View
              animation="slideInDown"
              duration={300}
              style={styles.customInputContainer}
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

        {/* Training Split (show when total days selected) */}
        {totalTrainingDays > 0 && (
          <Animatable.View
            animation="fadeInUp"
            delay={75}
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
                  <Text style={styles.modernSplitLabel}>Gym/Strength Training</Text>
                </View>
                <View style={styles.modernSplitGrid}>
                  {[0, 1, 2, 3, 4, 5, 6, 7].slice(0, totalTrainingDays + 1).map((days) => {
                    const isSelected = gymTrainingDays === days;
                    return (
                      <TouchableOpacity
                        key={`gym-${days}`}
                        style={[
                          styles.modernSplitCard,
                          isSelected && [styles.selectedModernSplitCard, { borderColor: themeColor, backgroundColor: `${themeColor}15` }]
                        ]}
                        onPress={() => setGymTrainingDays(days)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.modernSplitNumber,
                          isSelected && { color: themeColor }
                        ]}>
                          {days}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Other Activities Section */}
              <View style={styles.modernSplitSection}>
                <View style={styles.modernSplitHeader}>
                  <View style={[styles.splitIconContainer, { backgroundColor: '#10b98120' }]}>
                    <Ionicons name="walk" size={20} color="#10b981" />
                  </View>
                  <Text style={styles.modernSplitLabel}>Other Activities</Text>
                </View>
                <View style={styles.modernSplitGrid}>
                  {[0, 1, 2, 3, 4, 5, 6, 7].slice(0, totalTrainingDays + 1).map((days) => {
                    const isSelected = otherTrainingDays === days;
                    return (
                      <TouchableOpacity
                        key={`other-${days}`}
                        style={[
                          styles.modernSplitCard,
                          isSelected && [styles.selectedModernSplitCard, { borderColor: '#10b981', backgroundColor: '#10b98115' }]
                        ]}
                        onPress={() => setOtherTrainingDays(days)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.modernSplitNumber,
                          isSelected && { color: '#10b981' }
                        ]}>
                          {days}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Split validation warning */}
            {totalTrainingDays > 0 && (gymTrainingDays + otherTrainingDays) !== totalTrainingDays && (
              <View style={styles.warningContainer}>
                <Ionicons name="warning-outline" size={16} color="#f59e0b" />
                <Text style={styles.warningText}>
                  Your split ({gymTrainingDays + otherTrainingDays} days) doesn't match your total training days ({totalTrainingDays})
                </Text>
              </View>
            )}
          </Animatable.View>
        )}
      </ScrollView>
    );
  };

  const renderTrainingPreferencesStep = () => (
    <ScrollView 
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

      {/* Training Style Preference */}
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
                      <Text style={styles.scheduleSubLabel}>Other Activities</Text>
                      <Text style={styles.scheduleSubValue}>{otherTrainingDays} {otherTrainingDays === 1 ? 'day' : 'days'}</Text>
                    </View>
                  )}
                </View>
              )}
            </Animatable.View>
          )}

          {/* Secondary Goals */}
          {selectedSecondary.length > 0 && (
            <Animatable.View 
              animation="fadeInUp" 
              delay={1600}
              duration={500}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryCardTitle}>Additional Focus Areas</Text>
              <View style={styles.secondaryGoalsList}>
                {selectedSecondary.map((goal, index) => (
                  <Animatable.View 
                    key={goal.id} 
                    animation="fadeInRight"
                    delay={1800 + (index * 100)}
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
              delay={1800}
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColor} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {currentStep === 0 ? 'Fitness Goals' : 
             currentStep === 1 ? 'Training Frequency' : 
             'Training Preferences'}
          </Text>
          <Text style={styles.headerSubtitle}>
            Step {currentStep + 1} of 3
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
                width: `${((currentStep + 1) / 3) * 100}%`
              }
            ]} 
          />
        </View>
      </View>

      {/* Step Content */}
      {renderStep()}

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navigationButton, { backgroundColor: themeColor }]}
          onPress={handleNext}
          activeOpacity={0.8}
          disabled={!isValid()}
        >
          <Text style={styles.navigationButtonText}>
            {currentStep === 2 ? 'Complete' : 'Next'}
          </Text>
          {currentStep === 2 ? (
            <Ionicons name="checkmark" size={20} color="#000000" />
          ) : (
            <Ionicons name="arrow-forward" size={20} color="#000000" />
          )}
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
  modernFrequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modernFrequencyCard: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
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
  modernCustomCard: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
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

});