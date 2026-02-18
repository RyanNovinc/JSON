import React, { useState } from 'react';
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
  const [showFrequencyInfo, setShowFrequencyInfo] = useState<boolean>(false);
  const [customGoals, setCustomGoals] = useState<string>('');
  const [currentStep, setCurrentStep] = useState(0);
  const [showResults, setShowResults] = useState(false);

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

      // Save to storage (implement this later)
      console.log('Fitness Goals Data:', fitnessGoalsData);

      // For now, just show success and navigate back
      Alert.alert(
        'Goals Saved!',
        'Your fitness goals have been saved successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('WorkoutDashboard' as any)
          }
        ]
      );
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
          <View style={styles.titleWithInfo}>
            <Text style={[styles.sectionTitle, { color: themeColor }]}>
              Training Frequency
            </Text>
            <TouchableOpacity 
              onPress={() => setShowFrequencyInfo(true)}
              style={styles.infoButton}
              activeOpacity={0.7}
            >
              <Ionicons name="information-circle-outline" size={20} color={themeColor} />
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>
            How many days per week do you want to train?
          </Text>
          
          <View style={styles.frequencyContainer}>
            {[1, 2, 3, 4, 5, 6, 7].map((days) => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.frequencyChip,
                  !showCustomFrequency && totalTrainingDays === days && [
                    styles.selectedFrequencyChip,
                    { backgroundColor: themeColor, borderColor: themeColor }
                  ]
                ]}
                onPress={() => {
                  setTotalTrainingDays(days);
                  setShowCustomFrequency(false);
                  setCustomFrequency('');
                  // Reset split when changing total days
                  setGymTrainingDays(0);
                  setOtherTrainingDays(0);
                }}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.frequencyText,
                  !showCustomFrequency && totalTrainingDays === days && styles.selectedFrequencyText
                ]}>
                  {days}
                </Text>
              </TouchableOpacity>
            ))}
            
            {/* Custom option */}
            <TouchableOpacity
              style={[
                styles.customFrequencyChip,
                showCustomFrequency && [
                  styles.selectedFrequencyChip,
                  { backgroundColor: themeColor, borderColor: themeColor }
                ]
              ]}
              onPress={() => {
                setShowCustomFrequency(true);
                setTotalTrainingDays(0);
                // Reset split when switching to custom
                setGymTrainingDays(0);
                setOtherTrainingDays(0);
              }}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.customFrequencyText,
                showCustomFrequency && styles.selectedFrequencyText
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
              <Text style={styles.customInputLabel}>
                Enter number of training sessions per week (max 14):
              </Text>
              <TextInput
                style={styles.customFrequencyInput}
                placeholder="8 - 14"
                placeholderTextColor="#71717a"
                value={customFrequency}
                onChangeText={(value) => {
                  // Only allow numbers
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
              />
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
              How do you want to split your {totalTrainingDays} training days?
            </Text>
            
            <View style={styles.splitContainer}>
              {/* Gym Training */}
              <View style={styles.splitRow}>
                <Text style={styles.splitLabel}>Gym/Strength Training:</Text>
                <View style={styles.splitControls}>
                  {[0, 1, 2, 3, 4, 5, 6, 7].slice(0, totalTrainingDays + 1).map((days) => (
                    <TouchableOpacity
                      key={`gym-${days}`}
                      style={[
                        styles.splitChip,
                        gymTrainingDays === days && [
                          styles.selectedSplitChip,
                          { backgroundColor: themeColor, borderColor: themeColor }
                        ]
                      ]}
                      onPress={() => setGymTrainingDays(days)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.splitText,
                        gymTrainingDays === days && styles.selectedSplitText
                      ]}>
                        {days}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Other Training */}
              <View style={styles.splitRow}>
                <Text style={styles.splitLabel}>Other Activities:</Text>
                <View style={styles.splitControls}>
                  {[0, 1, 2, 3, 4, 5, 6, 7].slice(0, totalTrainingDays + 1).map((days) => (
                    <TouchableOpacity
                      key={`other-${days}`}
                      style={[
                        styles.splitChip,
                        otherTrainingDays === days && [
                          styles.selectedSplitChip,
                          { backgroundColor: '#10b981', borderColor: '#10b981' }
                        ]
                      ]}
                      onPress={() => setOtherTrainingDays(days)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.splitText,
                        otherTrainingDays === days && styles.selectedSplitText
                      ]}>
                        {days}
                      </Text>
                    </TouchableOpacity>
                  ))}
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

      {/* Training Frequency Guide - Full Screen Modal */}
      {showFrequencyInfo && (
        <View style={styles.guideModal}>
          <SafeAreaView style={styles.guideModalSafeArea}>
            <View style={styles.guideHeader}>
              <TouchableOpacity 
                onPress={() => setShowFrequencyInfo(false)}
                style={styles.guideBackButton}
              >
                <Ionicons name="arrow-back" size={24} color={themeColor} />
              </TouchableOpacity>
              <Text style={[styles.guideTitle, { color: themeColor }]}>
                Training Frequency Guide
              </Text>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView 
              style={styles.guideContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.guideScrollContent}
            >
              {/* Hero Stats */}
              <View style={styles.heroStats}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: themeColor }]}>200+</Text>
                  <Text style={styles.statLabel}>Studies Analyzed</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: themeColor }]}>2016-2025</Text>
                  <Text style={styles.statLabel}>Latest Research</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: themeColor }]}>Meta</Text>
                  <Text style={styles.statLabel}>Analysis Based</Text>
                </View>
              </View>

              {/* Quick Decision Helper */}
              <View style={styles.quickHelper}>
                <View style={styles.helperHeader}>
                  <Ionicons name="flash" size={20} color="#f59e0b" />
                  <Text style={styles.helperTitle}>Quick Decision Helper</Text>
                </View>
                <View style={styles.helperGrid}>
                  <View style={styles.helperCard}>
                    <Text style={styles.helperGoal}>💪 Muscle Building</Text>
                    <Text style={styles.helperFreq}>3-4 days/week</Text>
                  </View>
                  <View style={styles.helperCard}>
                    <Text style={styles.helperGoal}>🏋️ Strength</Text>
                    <Text style={styles.helperFreq}>4-5 days/week</Text>
                  </View>
                  <View style={styles.helperCard}>
                    <Text style={styles.helperGoal}>🔥 Fat Loss</Text>
                    <Text style={styles.helperFreq}>4-6 days/week</Text>
                  </View>
                  <View style={styles.helperCard}>
                    <Text style={styles.helperGoal}>🎯 General Fitness</Text>
                    <Text style={styles.helperFreq}>3-5 days/week</Text>
                  </View>
                </View>
              </View>

              {/* Key Findings */}
              <View style={styles.findingsSection}>
                <Text style={[styles.sectionHeader, { color: themeColor }]}>
                  Key Research Findings
                </Text>
                
                <View style={styles.findingCard}>
                  <View style={styles.findingIcon}>
                    <Text style={styles.findingEmoji}>📊</Text>
                  </View>
                  <View style={styles.findingContent}>
                    <Text style={styles.findingTitle}>Volume Beats Frequency</Text>
                    <Text style={styles.findingText}>
                      For muscle growth, total weekly sets matter more than how often you train. 
                      10-20 sets per muscle per week is the sweet spot.
                    </Text>
                  </View>
                </View>

                <View style={styles.findingCard}>
                  <View style={styles.findingIcon}>
                    <Text style={styles.findingEmoji}>🧠</Text>
                  </View>
                  <View style={styles.findingContent}>
                    <Text style={styles.findingTitle}>Strength Loves Practice</Text>
                    <Text style={styles.findingText}>
                      Unlike muscle building, strength gains improve with higher frequency. 
                      Practice your lifts 3-4 times per week for best results.
                    </Text>
                  </View>
                </View>

                <View style={styles.findingCard}>
                  <View style={styles.findingIcon}>
                    <Text style={styles.findingEmoji}>❤️</Text>
                  </View>
                  <View style={styles.findingContent}>
                    <Text style={styles.findingTitle}>Cardio Won't Hurt Gains</Text>
                    <Text style={styles.findingText}>
                      The "interference effect" is overblown. Cardio mainly affects explosive power, 
                      not muscle growth or max strength.
                    </Text>
                  </View>
                </View>

                <View style={styles.findingCard}>
                  <View style={styles.findingIcon}>
                    <Text style={styles.findingEmoji}>😴</Text>
                  </View>
                  <View style={styles.findingContent}>
                    <Text style={styles.findingTitle}>Recovery Sets the Limit</Text>
                    <Text style={styles.findingText}>
                      Less than 7 hours of sleep significantly hurts gains. 
                      Recovery capacity, not training stimulus, usually limits frequency.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Warning Signs */}
              <View style={styles.warningSection}>
                <View style={styles.warningHeader}>
                  <Ionicons name="warning" size={20} color="#ef4444" />
                  <Text style={[styles.sectionHeader, { color: '#ef4444', marginLeft: 8 }]}>
                    Warning Signs
                  </Text>
                </View>
                <View style={styles.warningList}>
                  <Text style={styles.warningItem}>
                    🔴 Performance declining for 2+ weeks straight
                  </Text>
                  <Text style={styles.warningItem}>
                    🔴 Persistent fatigue despite adequate sleep
                  </Text>
                  <Text style={styles.warningItem}>
                    🔴 Chronic DOMS interfering with daily life
                  </Text>
                  <Text style={styles.warningItem}>
                    🔴 Mood changes or sleep disruption
                  </Text>
                </View>
              </View>

              {/* Evidence Base */}
              <View style={styles.evidenceSection}>
                <Text style={[styles.sectionHeader, { color: themeColor }]}>
                  Evidence Base
                </Text>
                <View style={styles.evidenceGrid}>
                  <View style={styles.evidenceItem}>
                    <Text style={styles.evidenceJournal}>Sports Medicine</Text>
                    <Text style={styles.evidenceStudy}>Schoenfeld et al. (2019)</Text>
                  </View>
                  <View style={styles.evidenceItem}>
                    <Text style={styles.evidenceJournal}>Sports Medicine</Text>
                    <Text style={styles.evidenceStudy}>Pelland et al. (2025)</Text>
                  </View>
                  <View style={styles.evidenceItem}>
                    <Text style={styles.evidenceJournal}>J. Strength Cond. Res.</Text>
                    <Text style={styles.evidenceStudy}>Wilson et al. (2012)</Text>
                  </View>
                  <View style={styles.evidenceItem}>
                    <Text style={styles.evidenceJournal}>Sports Medicine</Text>
                    <Text style={styles.evidenceStudy}>Grgic et al. (2018)</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      )}
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

  if (showResults) {
    const selectedPrimary = primaryGoals.find(g => g.id === selectedPrimaryGoal);
    const selectedSecondary = secondaryGoals.filter(g => selectedSecondaryGoals.includes(g.id));

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowResults(false)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={themeColor} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Fitness Goals Summary</Text>
              <Text style={styles.headerSubtitle}>Review your selections</Text>
            </View>
          </View>

          {/* Results Content */}
          <View style={styles.resultsContainer}>
            <Animatable.View 
              animation="fadeInUp" 
              delay={200}
              style={[styles.resultCard, { borderColor: themeColor }]}
            >
              <Text style={[styles.resultTitle, { color: themeColor }]}>
                Primary Goal
              </Text>
              <Text style={styles.resultValue}>
                {selectedPrimary?.title}
              </Text>
              <Text style={styles.resultDescription}>
                {selectedPrimary?.description}
              </Text>
            </Animatable.View>

            {selectedSecondary.length > 0 && (
              <Animatable.View 
                animation="fadeInUp" 
                delay={300}
                style={[styles.resultCard, { borderColor: themeColor }]}
              >
                <Text style={[styles.resultTitle, { color: themeColor }]}>
                  Additional Focus Areas
                </Text>
                {selectedSecondary.map((goal, index) => (
                  <Text key={goal.id} style={styles.resultValue}>
                    • {goal.title}
                  </Text>
                ))}
              </Animatable.View>
            )}

            {selectedPrimaryGoal === 'sport_specific' && specificSport && (
              <Animatable.View 
                animation="fadeInUp" 
                delay={400}
                style={[styles.resultCard, { borderColor: themeColor }]}
              >
                <Text style={[styles.resultTitle, { color: themeColor }]}>
                  Specific Sport
                </Text>
                <Text style={styles.resultValue}>
                  {specificSport}
                </Text>
              </Animatable.View>
            )}

            {selectedSecondaryGoals.includes('athletic_performance') && athleticPerformanceDetails && (
              <Animatable.View 
                animation="fadeInUp" 
                delay={450}
                style={[styles.resultCard, { borderColor: themeColor }]}
              >
                <Text style={[styles.resultTitle, { color: themeColor }]}>
                  Athletic Performance Focus
                </Text>
                <Text style={styles.resultValue}>
                  {athleticPerformanceDetails}
                </Text>
              </Animatable.View>
            )}

            {selectedSecondaryGoals.includes('fun_social') && funSocialDetails && (
              <Animatable.View 
                animation="fadeInUp" 
                delay={500}
                style={[styles.resultCard, { borderColor: themeColor }]}
              >
                <Text style={[styles.resultTitle, { color: themeColor }]}>
                  Fun & Social Activities
                </Text>
                <Text style={styles.resultValue}>
                  {funSocialDetails}
                </Text>
              </Animatable.View>
            )}

            {selectedSecondaryGoals.includes('injury_prevention') && injuryPreventionDetails && (
              <Animatable.View 
                animation="fadeInUp" 
                delay={525}
                style={[styles.resultCard, { borderColor: themeColor }]}
              >
                <Text style={[styles.resultTitle, { color: themeColor }]}>
                  Injury Prevention Focus
                </Text>
                <Text style={styles.resultValue}>
                  {injuryPreventionDetails}
                </Text>
              </Animatable.View>
            )}

            {selectedSecondaryGoals.includes('maintain_flexibility') && flexibilityDetails && (
              <Animatable.View 
                animation="fadeInUp" 
                delay={550}
                style={[styles.resultCard, { borderColor: themeColor }]}
              >
                <Text style={[styles.resultTitle, { color: themeColor }]}>
                  Flexibility Focus Areas
                </Text>
                <Text style={styles.resultValue}>
                  {flexibilityDetails}
                </Text>
              </Animatable.View>
            )}

            {customGoals && (
              <Animatable.View 
                animation="fadeInUp" 
                delay={575}
                style={[styles.resultCard, { borderColor: themeColor }]}
              >
                <Text style={[styles.resultTitle, { color: themeColor }]}>
                  Additional Notes
                </Text>
                <Text style={styles.resultValue}>
                  {customGoals}
                </Text>
              </Animatable.View>
            )}
          </View>

          {/* Action Buttons */}
          <Animatable.View 
            animation="fadeInUp" 
            delay={600}
            style={styles.actionButtons}
          >
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: themeColor }]}
              onPress={handleSaveAndContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>Save & Continue</Text>
            </TouchableOpacity>
          </Animatable.View>
        </ScrollView>
      </SafeAreaView>
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
  titleWithInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoButton: {
    marginLeft: 8,
    padding: 4,
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
});