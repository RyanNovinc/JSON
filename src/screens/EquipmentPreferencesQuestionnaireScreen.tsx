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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RobustStorage from '../utils/robustStorage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import * as Animatable from 'react-native-animatable';

type NavigationProp = StackNavigationProp<RootStackParamList>;

// FavoriteExercise interface
interface FavoriteExercise {
  id: string;
  name: string;
  category: 'gym' | 'bodyweight' | 'flexibility' | 'cardio' | 'custom';
  customCategory?: string;
  muscleGroups: string[];
  instructions?: string;
  notes?: string;
  addedAt: string;
}

// Equipment Options
interface EquipmentOption {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const equipmentOptions: EquipmentOption[] = [
  {
    id: 'commercial_gym',
    title: 'Commercial Gym',
    description: 'Full equipment access',
    icon: 'business',
  },
  {
    id: 'home_gym',
    title: 'Home Gym',
    description: 'Personal equipment setup',
    icon: 'home',
  },
  {
    id: 'bodyweight',
    title: 'Bodyweight Only',
    description: 'No equipment needed',
    icon: 'body',
  },
  {
    id: 'basic_equipment',
    title: 'Basic Equipment',
    description: 'Dumbbells, resistance bands',
    icon: 'fitness',
  },
];

// Time Options (removed 15, 20 minute options)
const timeOptions = [30, 45, 60, 75, 90];

// Rest Time Options
interface RestTimeOption {
  id: string;
  title: string;
  subtitle: string;
  description: string;
}

const restTimeOptions: RestTimeOption[] = [
  {
    id: 'optimal',
    title: 'Optimal Rest Times',
    subtitle: 'Maximum results',
    description: 'Optimal rest times regardless of workout length',
  },
  {
    id: 'shorter',
    title: 'Shorter Rest Times',
    subtitle: 'Balanced approach',
    description: 'Good results, quicker workout',
  },
  {
    id: 'minimal',
    title: 'Minimal Rest Times',
    subtitle: 'Fastest workout',
    description: 'Time efficient, higher intensity',
  },
];

export default function EquipmentPreferencesQuestionnaireScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor, themeColorLight } = useTheme();
  
  // State variables
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [specificEquipment, setSpecificEquipment] = useState<string>('');
  const [unavailableEquipment, setUnavailableEquipment] = useState<string>('');
  const [sessionStyle, setSessionStyle] = useState<'optimal' | 'moderate' | 'minimal'>('moderate');
  const [likedExercises, setLikedExercises] = useState<string>('');
  const [dislikedExercises, setDislikedExercises] = useState<string>('');
  const [exerciseNoteDetail, setExerciseNoteDetail] = useState<'detailed' | 'brief' | 'minimal'>('brief');
  const [includeDirectCore, setIncludeDirectCore] = useState<boolean>(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const equipmentScrollRef = React.useRef<ScrollView>(null);
  const timeScrollRef = React.useRef<ScrollView>(null);
  const exerciseScrollRef = React.useRef<ScrollView>(null);

  // Load saved questionnaire data on component mount
  useEffect(() => {
    loadSavedData();
  }, []);


  const loadSavedData = async () => {
    try {
      const savedData = await RobustStorage.getItem('equipmentPreferencesData', true) || await AsyncStorage.getItem('equipmentPreferencesData');
      if (savedData) {
        const data = JSON.parse(savedData);
        
        // Restore all form data
        setSelectedEquipment(data.selectedEquipment || []);
        setSpecificEquipment(data.specificEquipment || '');
        setUnavailableEquipment(data.unavailableEquipment || '');
        setSessionStyle(data.sessionStyle || 'moderate');
        setLikedExercises(data.likedExercises || '');
        setDislikedExercises(data.dislikedExercises || '');
        setExerciseNoteDetail(data.exerciseNoteDetail || 'brief');
        setIncludeDirectCore(data.includeDirectCore !== undefined ? data.includeDirectCore : true);
        
        // If questionnaire was completed, show summary directly
        if (data.completedAt) {
          setIsCompleted(true);
          setShowResults(true);
        } else {
          // Restore current step for partial progress, but ensure it starts at 0 if incomplete
          setCurrentStep(data.currentStep || 0);
        }
      } else {
        // No saved data - start fresh at step 0
        setCurrentStep(0);
        setIsCompleted(false);
        setShowResults(false);
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
        selectedEquipment,
        specificEquipment,
        unavailableEquipment,
        sessionStyle,
        likedExercises,
        dislikedExercises,
        exerciseNoteDetail,
        includeDirectCore,
        currentStep,
        // Note: no completedAt field - this indicates it's in progress
      };

      const saveSuccess = await RobustStorage.setItem('equipmentPreferencesData', JSON.stringify(progressData), true);
      if (!saveSuccess) await AsyncStorage.setItem('equipmentPreferencesData', JSON.stringify(progressData));
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  // Auto-save progress when relevant state changes
  useEffect(() => {
    if (!isLoading && !isCompleted) {
      saveProgress();
    }
  }, [selectedEquipment, specificEquipment, unavailableEquipment, sessionStyle, likedExercises, dislikedExercises, exerciseNoteDetail, includeDirectCore]);

  const handleRetakeQuestions = async () => {
    // Don't clear existing answers - just allow user to review and modify them
    // This way if they accidentally clicked "Retake" they don't lose their progress
    setCurrentStep(0);
    setShowResults(false);
    setIsCompleted(false);
    // Keep all existing answers loaded so they can review and change if needed
    
    // Scroll to top when returning to step 0
    setTimeout(() => {
      equipmentScrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  };

  const handleEquipmentToggle = (equipmentId: string) => {
    setSelectedEquipment(prev => {
      if (prev.includes(equipmentId)) {
        return prev.filter(id => id !== equipmentId);
      } else {
        return [...prev, equipmentId];
      }
    });
  };

  const handleNext = () => {
    // Validate equipment selection on step 0
    if (currentStep === 0 && selectedEquipment.length === 0) {
      Alert.alert(
        'Equipment Required',
        'Please select at least one type of equipment you have access to.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Step 1 validation - sessionStyle always has a valid value, so no validation needed

    if (currentStep < 2) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      // Scroll to top when moving to next step
      setTimeout(() => {
        if (newStep === 1) {
          timeScrollRef.current?.scrollTo({ y: 0, animated: true });
        } else if (newStep === 2) {
          exerciseScrollRef.current?.scrollTo({ y: 0, animated: true });
        }
      }, 100);
    } else if (currentStep === 2) {
      setShowResults(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      // Scroll to top when moving to previous step
      setTimeout(() => {
        if (newStep === 0) {
          equipmentScrollRef.current?.scrollTo({ y: 0, animated: true });
        } else if (newStep === 1) {
          timeScrollRef.current?.scrollTo({ y: 0, animated: true });
        }
      }, 100);
    } else {
      navigation.goBack();
    }
  };

  const handleSaveAndContinue = async () => {
    try {
      const equipmentPreferencesData = {
        selectedEquipment,
        specificEquipment,
        unavailableEquipment,
        sessionStyle,
        likedExercises,
        dislikedExercises,
        exerciseNoteDetail,
        includeDirectCore,
        completedAt: new Date().toISOString(),
      };

      // Save to AsyncStorage
      const saveSuccess = await RobustStorage.setItem('equipmentPreferencesData', JSON.stringify(equipmentPreferencesData), true);
      if (!saveSuccess) await AsyncStorage.setItem('equipmentPreferencesData', JSON.stringify(equipmentPreferencesData));
      console.log('Equipment Preferences Data saved:', equipmentPreferencesData);
      
      // Mark as completed
      setIsCompleted(true);

      // Navigate back to workout dashboard
      navigation.navigate('WorkoutDashboard' as any);
    } catch (error) {
      console.error('Failed to save equipment preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    }
  };

  // Equipment step
  const renderEquipmentStep = () => {
    return (
      <ScrollView 
        ref={equipmentScrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <Animatable.View
          animation="fadeInUp"
          delay={50}
          style={styles.sectionContainer}
        >
          <Text style={[styles.sectionTitle, { color: themeColor }]}>
            Available Equipment
          </Text>
          <Text style={styles.sectionSubtitle}>
            What equipment do you have access to?
          </Text>
          
          <View style={styles.equipmentGrid}>
            {equipmentOptions.map((equipment, index) => {
              const isSelected = selectedEquipment.includes(equipment.id);
              return (
                <Animatable.View
                  key={equipment.id}
                  animation="fadeInUp"
                  delay={100 + (index * 50)}
                  style={styles.equipmentCardWrapper}
                >
                  <TouchableOpacity
                    style={[
                      styles.equipmentCard,
                      isSelected && [styles.selectedCard, { 
                        borderColor: themeColor, 
                        backgroundColor: `${themeColor}10`,
                        shadowColor: themeColor,
                        shadowOpacity: 0.3,
                      }]
                    ]}
                    onPress={() => handleEquipmentToggle(equipment.id)}
                    activeOpacity={0.8}
                  >
                    {/* Selection Indicator */}
                    <View style={styles.selectionIndicator}>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color={themeColor} />
                      ) : (
                        <View style={styles.unselectedCircle} />
                      )}
                    </View>

                    <View style={[styles.equipmentIconContainer, isSelected && { backgroundColor: themeColor }]}>
                      <Ionicons 
                        name={equipment.icon as any} 
                        size={28} 
                        color={isSelected ? '#000000' : themeColor} 
                      />
                    </View>
                    
                    <View style={styles.equipmentContent}>
                      <Text style={[styles.equipmentTitle, isSelected && { color: themeColor }]}>
                        {equipment.title}
                      </Text>
                      <Text style={[styles.equipmentDescription, isSelected && { color: themeColor, opacity: 0.8 }]}>
                        {equipment.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animatable.View>
              );
            })}
          </View>

          {/* Specific Equipment Input */}
          <Animatable.View
            animation="fadeInUp"
            delay={500}
            style={styles.inputContainer}
          >
            <Text style={styles.inputLabel}>
              Specific equipment you have (optional):
            </Text>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Olympic barbell, kettlebells, pull-up bar..."
                placeholderTextColor="#71717a"
                value={specificEquipment}
                onChangeText={setSpecificEquipment}
                multiline
                numberOfLines={3}
              />
            </KeyboardAvoidingView>
          </Animatable.View>

          {/* Unavailable Equipment Input */}
          <Animatable.View
            animation="fadeInUp"
            delay={600}
            style={styles.inputContainer}
          >
            <Text style={styles.inputLabel}>
              Equipment you don't have access to (optional):
            </Text>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
              <TextInput
                style={styles.textInput}
                placeholder="e.g., squat rack, cable machine, treadmill..."
                placeholderTextColor="#71717a"
                value={unavailableEquipment}
                onChangeText={setUnavailableEquipment}
                multiline
                numberOfLines={3}
              />
            </KeyboardAvoidingView>
          </Animatable.View>


        </Animatable.View>
      </ScrollView>
    );
  };

  // Time availability step
  const renderTimeStep = () => {
    const sessionStyleOptions = [
      {
        id: 'optimal',
        title: 'Optimal Rest',
        subtitle: 'Full recovery between sets. Sessions may run 75-90 min.',
        icon: 'timer-outline'
      },
      {
        id: 'moderate',
        title: 'Moderate Rest',
        subtitle: 'Balanced rest and efficiency. Sessions around 60-75 min.',
        icon: 'swap-horizontal-outline'
      },
      {
        id: 'minimal',
        title: 'Minimal Rest',
        subtitle: 'Time efficient, shorter rest. Sessions around 45-60 min.',
        icon: 'speedometer-outline'
      }
    ];

    return (
      <ScrollView 
        ref={timeScrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <Animatable.View
          animation="fadeInUp"
          delay={50}
          style={styles.sectionContainer}
        >
          <Text style={[styles.sectionTitle, { color: themeColor }]}>
            Rest Style
          </Text>
          <Text style={styles.sectionSubtitle}>
            Choose your rest period approach. Rest periods determine session duration.
          </Text>

          {sessionStyleOptions.map((option, index) => {
            const isSelected = sessionStyle === option.id;
            return (
              <Animatable.View
                key={option.id}
                animation="fadeInUp"
                delay={100 + (index * 100)}
                style={styles.durationOptionWrapper}
              >
                <TouchableOpacity
                  style={[
                    styles.durationOption,
                    isSelected && [styles.selectedDurationOption, { 
                      borderColor: themeColor, 
                      backgroundColor: `${themeColor}10`,
                      shadowColor: themeColor,
                      shadowOpacity: 0.3,
                    }]
                  ]}
                  onPress={() => setSessionStyle(option.id as 'optimal' | 'moderate' | 'minimal')}
                  activeOpacity={0.8}
                >
                  <View style={styles.durationOptionContent}>
                    <View style={[styles.durationIconContainer, isSelected && { backgroundColor: themeColor }]}>
                      <Ionicons 
                        name={option.icon as any}
                        size={20} 
                        color={isSelected ? '#000000' : themeColor} 
                      />
                    </View>
                    <View style={styles.durationTextContainer}>
                      <Text style={[styles.durationTitle, isSelected && { color: themeColor }]}>
                        {option.title}
                      </Text>
                      <Text style={[styles.durationSubtitle, isSelected && { color: themeColor, opacity: 0.8 }]}>
                        {option.subtitle}
                      </Text>
                    </View>
                    <View style={styles.durationSelectionIndicator}>
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
        </Animatable.View>
      </ScrollView>
    );
  };

  // Exercise preferences step
  const renderExercisePreferencesStep = () => {
    return (
      <ScrollView 
        ref={exerciseScrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <Animatable.View
          animation="fadeInUp"
          delay={50}
          style={styles.sectionContainer}
        >
          <Text style={[styles.sectionTitle, { color: themeColor }]}>
            Exercise Preferences
          </Text>
          <Text style={styles.sectionSubtitle}>
            Help us personalize your workouts (all fields are optional)
          </Text>

          {/* Direct Core Work Toggle */}
          <Animatable.View animation="fadeInUp" delay={75} style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Include direct core work?</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[
                { id: true, label: 'Yes', subtitle: 'Planks, ab work, cable crunches' },
                { id: false, label: 'No', subtitle: 'Core trained via compounds only' },
              ].map((option) => {
                const isSelected = includeDirectCore === option.id;
                return (
                  <TouchableOpacity
                    key={String(option.id)}
                    style={[
                      styles.optionItem,
                      { flex: 1 },
                      isSelected && { backgroundColor: `${themeColor}10`, borderColor: themeColor }
                    ]}
                    onPress={() => setIncludeDirectCore(option.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionHeader}>
                      <Text style={[styles.optionTitle, isSelected && { color: themeColor }]}>
                        {option.label}
                      </Text>
                      <View style={[styles.radioCircle, isSelected && { borderColor: themeColor, backgroundColor: themeColor }]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                    </View>
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animatable.View>
          
          {/* Liked Exercises */}
          <Animatable.View
            animation="fadeInUp"
            delay={100}
            style={styles.inputContainer}
          >
            <Text style={styles.inputLabel}>
              Exercises you love (optional):
            </Text>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
              <TextInput
                style={styles.textInput}
                placeholder="Optional: e.g., deadlifts, bench press, squats, pull-ups..."
                placeholderTextColor="#71717a"
                value={likedExercises}
                onChangeText={setLikedExercises}
                multiline
                numberOfLines={3}
              />
            </KeyboardAvoidingView>
          </Animatable.View>

          {/* Disliked Exercises */}
          <Animatable.View
            animation="fadeInUp"
            delay={200}
            style={styles.inputContainer}
          >
            <Text style={styles.inputLabel}>
              Exercises you want to avoid (optional):
            </Text>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
              <TextInput
                style={styles.textInput}
                placeholder="Optional: e.g., overhead press, leg extensions, bicep curls..."
                placeholderTextColor="#71717a"
                value={dislikedExercises}
                onChangeText={setDislikedExercises}
                multiline
                numberOfLines={3}
              />
            </KeyboardAvoidingView>
          </Animatable.View>

          {/* Exercise Note Detail */}
          <Animatable.View
            animation="fadeInUp"
            delay={300}
            style={styles.inputContainer}
          >
            <Text style={styles.inputLabel}>
              How detailed should exercise instructions be?
            </Text>
            
            {/* Exercise Note Detail Options */}
            <View style={styles.optionsList}>
              {[
                {
                  id: 'detailed',
                  title: 'Detailed instructions',
                  subtitle: 'Step-by-step form guidance for every exercise (recommended for beginners — generates longer output)'
                },
                {
                  id: 'brief',
                  title: 'Brief coaching cues',
                  subtitle: 'Short tips for compound lifts only (recommended for most users)'
                },
                {
                  id: 'minimal',
                  title: 'Minimal notes',
                  subtitle: 'Only non-obvious setup tips (fastest generation, smallest file size)'
                }
              ].map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionItem,
                    exerciseNoteDetail === option.id && { backgroundColor: `${themeColor}10`, borderColor: themeColor }
                  ]}
                  onPress={() => setExerciseNoteDetail(option.id as 'detailed' | 'brief' | 'minimal')}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.optionHeader}>
                      <Text style={[
                        styles.optionTitle,
                        exerciseNoteDetail === option.id && { color: themeColor }
                      ]}>
                        {option.title}
                      </Text>
                      <View style={[
                        styles.radioCircle,
                        exerciseNoteDetail === option.id && { borderColor: themeColor, backgroundColor: themeColor }
                      ]}>
                        {exerciseNoteDetail === option.id && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                    </View>
                    <Text style={styles.optionSubtitle}>
                      {option.subtitle}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animatable.View>

        </Animatable.View>
      </ScrollView>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return renderEquipmentStep();
      case 1:
        return renderTimeStep();
      case 2:
        return renderExercisePreferencesStep();
      default:
        return renderEquipmentStep();
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
    const selectedEquipmentTitles = equipmentOptions
      .filter(eq => selectedEquipment.includes(eq.id))
      .map(eq => eq.title);

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.formSummaryContainer}
        >
          {/* Grid Background */}
          <View style={styles.gridBackground} />

          {/* Header */}
          <View style={styles.tronHeader}>
            <Text style={[styles.tronHeaderTitle, { textShadowColor: themeColor }]}>
              Equipment & Preferences Summary
            </Text>
          </View>

          {/* Main Panel */}
          <View style={[styles.tronMainPanel, { borderColor: themeColor, shadowColor: themeColor }]}>
            
            {/* Equipment Types Row */}
            <View style={[styles.tronDataRow, { borderBottomColor: `${themeColor}30` }]}>
              <View style={styles.tronLabelSection}>
                <View style={[styles.tronLabelIndicator, { backgroundColor: themeColor, shadowColor: themeColor }]} />
                <Text style={[styles.tronLabel, { color: themeColor }]}>EQUIPMENT TYPES</Text>
              </View>
              <View style={styles.tronValueSection}>
                <Text style={styles.tronValue}>
                  {selectedEquipmentTitles.length > 0 
                    ? `✓ ${selectedEquipmentTitles.join(', ')}` 
                    : 'NONE SELECTED'
                  }
                </Text>
                {specificEquipment && (
                  <Text style={styles.tronSubValue}>+ {specificEquipment}</Text>
                )}
                {unavailableEquipment && (
                  <Text style={[styles.tronSubValue, { color: '#ff6b6b' }]}>NOT AVAILABLE: {unavailableEquipment}</Text>
                )}
              </View>
            </View>

            {/* Rest Style Row */}
            <View style={[styles.tronDataRow, { borderBottomColor: `${themeColor}30` }]}>
              <View style={styles.tronLabelSection}>
                <View style={[styles.tronLabelIndicator, { backgroundColor: themeColor, shadowColor: themeColor }]} />
                <Text style={[styles.tronLabel, { color: themeColor }]}>REST STYLE</Text>
              </View>
              <View style={styles.tronValueSection}>
                <Text style={styles.tronValue}>
                  {sessionStyle === 'optimal' ? 'Optimal Rest (full recovery, 75-90 min sessions)' :
                   sessionStyle === 'moderate' ? 'Moderate Rest (balanced, 60-75 min sessions)' :
                   sessionStyle === 'minimal' ? 'Minimal Rest (time efficient, 45-60 min sessions)' :
                   'Moderate Rest (default)'}
                </Text>
              </View>
            </View>

            
            <View style={[styles.tronDataRow, { borderBottomColor: `${themeColor}30` }]}>
              <View style={styles.tronLabelSection}>
                <View style={[styles.tronLabelIndicator, { backgroundColor: themeColor, shadowColor: themeColor }]} />
                <Text style={[styles.tronLabel, { color: themeColor }]}>CORE WORK</Text>
              </View>
              <View style={styles.tronValueSection}>
                <Text style={styles.tronValue}>
                  {includeDirectCore ? 'Direct core exercises included' : 'Core via compounds only'}
                </Text>
              </View>
            </View>

            {/* Exercise Preferences Row */}
            {(likedExercises || dislikedExercises) && (
              <View style={styles.tronDataRow}>
                <View style={styles.tronLabelSection}>
                  <View style={[styles.tronLabelIndicator, { backgroundColor: themeColor, shadowColor: themeColor }]} />
                  <Text style={[styles.tronLabel, { color: themeColor }]}>PREFERENCES</Text>
                </View>
                <View style={styles.tronValueSection}>
                  {likedExercises && (
                    <Text style={styles.tronValue}>
                      LOVES: {likedExercises}
                    </Text>
                  )}
                  {dislikedExercises && (
                    <Text style={[styles.tronValue, { marginTop: likedExercises ? 8 : 0 }]}>
                      AVOIDS: {dislikedExercises}
                    </Text>
                  )}
                </View>
              </View>
            )}

          </View>

          {/* Action Buttons */}
          <View style={styles.tronActionPanel}>
            <TouchableOpacity
              style={[styles.tronPrimaryButton, { 
                backgroundColor: themeColor, 
                shadowColor: themeColor,
                borderColor: themeColor 
              }]}
              onPress={handleSaveAndContinue}
              activeOpacity={0.8}
            >
              <View style={[styles.tronButtonIndicator, { backgroundColor: '#000000' }]} />
              <Text style={styles.tronPrimaryButtonText}>LOOKS GOOD, SAVE IT</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tronSecondaryButton, { borderColor: themeColor }]}
              onPress={handleRetakeQuestions}
              activeOpacity={0.8}
            >
              <View style={[styles.tronButtonIndicator, { backgroundColor: themeColor, shadowColor: themeColor }]} />
              <Text style={[styles.tronSecondaryButtonText, { color: themeColor }]}>
                LET ME MAKE CHANGES
              </Text>
            </TouchableOpacity>
          </View>

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
            {currentStep === 0 ? 'Equipment Access' : 
             currentStep === 1 ? 'Rest Style' : 
             'Exercise Preferences'}
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

      {/* Content */}
      <View style={styles.content}>
        {renderStep()}
      </View>

      {/* Footer Button */}
      <View style={styles.footer}>
        <Animatable.View
          ref={(ref) => {
            // Trigger animation when button becomes enabled on equipment step
            if (ref && currentStep === 0 && selectedEquipment.length === 1) {
              setTimeout(() => ref.bounceIn(600), 100);
            }
            // Trigger animation when button becomes enabled on session style step
            if (ref && currentStep === 1) {
              // sessionStyle always has a default value, so always enable
              setTimeout(() => ref.bounceIn(600), 100);
            }
          }}
        >
          <TouchableOpacity
            style={[
              styles.nextButton, 
              { 
                backgroundColor: (() => {
                  if (currentStep === 0 && selectedEquipment.length === 0) return '#71717a';
                  // sessionStyle always has a valid value, so step 1 is always enabled
                  return themeColor;
                })()
              }
            ]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.nextButtonText,
              (() => {
                if (currentStep === 0 && selectedEquipment.length === 0) return { color: '#a1a1aa' };
                // sessionStyle always has a valid value, so step 1 text is always enabled
                return {};
              })()
            ]}>
              {currentStep === 2 ? 'Complete' : 'Next'}
            </Text>
            {currentStep === 2 ? (
              <Ionicons 
                name="checkmark" 
                size={20} 
                color={(() => {
                  if (currentStep === 0 && selectedEquipment.length === 0) return '#a1a1aa';
                  // sessionStyle always has a valid value, so step 1 checkmark is always enabled
                  return '#000000';
                })()} 
              />
            ) : (
              <Ionicons 
                name="arrow-forward" 
                size={20} 
                color={(() => {
                  if (currentStep === 0 && selectedEquipment.length === 0) return '#a1a1aa';
                  // sessionStyle always has a valid value, so step 1 arrow is always enabled
                  return '#000000';
                })()} 
              />
            )}
          </TouchableOpacity>
        </Animatable.View>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#71717a',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
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
  content: {
    flex: 1,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#71717a',
    marginBottom: 24,
    lineHeight: 22,
  },
  equipmentGrid: {
    gap: 12,
    marginBottom: 32,
  },
  equipmentCardWrapper: {
    width: '100%',
    marginBottom: 12,
  },
  equipmentCard: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#2a2a2b',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedCard: {
    borderWidth: 2,
    elevation: 8,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  unselectedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#71717a',
    backgroundColor: 'transparent',
  },
  equipmentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2a2a2b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  equipmentContent: {
    flex: 1,
    paddingRight: 40, // Make room for selection indicator
  },
  equipmentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  equipmentDescription: {
    fontSize: 14,
    color: '#71717a',
    lineHeight: 20,
  },
  aiSuggestionContainer: {
    marginBottom: 24,
  },
  aiSuggestionCard: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#2a2a2b',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedAiCard: {
    borderWidth: 2,
    elevation: 8,
  },
  aiSuggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2a2a2b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  aiTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  aiSuggestionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  aiSuggestionSubtitle: {
    fontSize: 14,
    color: '#71717a',
    lineHeight: 20,
  },
  aiSelectionIndicator: {
    marginLeft: 'auto',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2a2a2b',
  },
  separatorText: {
    fontSize: 14,
    color: '#71717a',
    marginHorizontal: 16,
    fontWeight: '500',
  },
  timeOptionsContainer: {
    marginBottom: 32,
  },
  durationOptionWrapper: {
    marginBottom: 12,
  },
  durationOption: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#2a2a2b',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedDurationOption: {
    borderWidth: 2,
    elevation: 8,
  },
  durationOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  durationTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  durationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  durationSubtitle: {
    fontSize: 14,
    color: '#71717a',
    lineHeight: 18,
  },
  durationSelectionIndicator: {
    marginLeft: 'auto',
  },
  // Rest Time Styles
  restTimeSection: {
    marginTop: 32,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2b',
  },
  restTimeOptionsContainer: {
    marginBottom: 32,
  },
  restTimeOptionWrapper: {
    marginBottom: 12,
  },
  restTimeOption: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#2a2a2b',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedRestTimeOption: {
    borderWidth: 2,
    elevation: 8,
  },
  restTimeOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restTimeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  restTimeTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  restTimeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  restTimeSubtitle: {
    fontSize: 14,
    color: '#71717a',
    lineHeight: 18,
  },
  restTimeSelectionIndicator: {
    marginLeft: 'auto',
  },
  customTimeContainer: {
    marginTop: 16,
  },
  customTimeInput: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 2,
    borderColor: '#2a2a2b',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 2,
    borderColor: '#2a2a2b',
    textAlignVertical: 'top',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#0a0a0b',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  // Summary styles
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
  heroContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingTop: 60,
  },
  mainDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mainText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  mainSubtext: {
    fontSize: 18,
    color: '#000000',
    opacity: 0.8,
    textAlign: 'center',
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
  aiSummaryNote: {
    fontSize: 13,
    color: '#71717a',
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 18,
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
    marginBottom: 12,
  },
  summarySaveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
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
  // Tron-Gym Style Summary
  formSummaryContainer: {
    flexGrow: 1,
    paddingBottom: 40,
    position: 'relative',
  },
  gridBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#050505',
    opacity: 0.3,
  },
  tronHeader: {
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 32,
    zIndex: 1,
  },
  tronHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
    textShadowOffset: { width: 0, height: 0 },
    textShadowOpacity: 0.8,
    textShadowRadius: 8,
    textAlign: 'center',
  },
  tronMainPanel: {
    marginHorizontal: 16,
    backgroundColor: '#1a1a1b',
    borderWidth: 2,
    borderRadius: 8,
    padding: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 16,
    overflow: 'hidden',
  },
  tronDataRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    position: 'relative',
  },
  tronLabelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 140,
    marginRight: 20,
  },
  tronLabelIndicator: {
    width: 4,
    height: 20,
    marginRight: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  tronLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    lineHeight: 16,
  },
  tronValueSection: {
    flex: 1,
  },
  tronValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  tronSubValue: {
    fontSize: 14,
    fontWeight: '400',
    color: '#71717a',
    lineHeight: 20,
    marginTop: 6,
    letterSpacing: 0.2,
  },
  tronActionPanel: {
    paddingHorizontal: 16,
    paddingTop: 40,
    gap: 16,
  },
  tronPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 4,
    borderWidth: 2,
    position: 'relative',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 12,
  },
  tronSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 4,
    borderWidth: 2,
    backgroundColor: '#1a1a1b',
    position: 'relative',
  },
  tronButtonIndicator: {
    width: 6,
    height: 6,
    marginRight: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 3,
  },
  tronPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1,
  },
  tronSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  manageFavoritesButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  manageFavoritesText: {
    fontSize: 14,
    fontWeight: '500',
  },
  favoriteActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectExercisesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  selectExercisesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  modalBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalDoneButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalDoneText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  modalEmptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  modalEmptyDescription: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  modalAddButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  modalAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  exerciseSelectionList: {
    paddingTop: 20,
    gap: 12,
  },
  exerciseSelectionCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 20,
  },
  selectedExerciseCard: {
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exerciseSelectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  exerciseSelectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseSelectionDetails: {
    flex: 1,
    gap: 6,
  },
  exerciseSelectionName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  exerciseSelectionCategory: {
    fontSize: 14,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  exerciseSelectionIndicator: {
    marginLeft: 'auto',
  },
  unselectedExerciseCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3f3f46',
  },
  modalBottomPadding: {
    height: 40,
  },
  exercisesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  exerciseItem: {
    width: '48%',
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
  },
  selectedExerciseItem: {
    borderWidth: 2,
  },
  exerciseItemContent: {
    alignItems: 'center',
    gap: 8,
  },
  exerciseItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    minHeight: 36,
  },
  exerciseItemCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#3f3f46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Exercise Note Detail styles
  optionsList: {
    marginTop: 16,
  },
  optionItem: {
    backgroundColor: '#1a1a1b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2b',
  },
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#71717a',
    lineHeight: 20,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#71717a',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
});