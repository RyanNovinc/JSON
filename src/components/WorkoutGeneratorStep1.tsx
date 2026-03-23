import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Animated,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { assemblePlanningPrompt } from '../data/planningPrompt';
import { QuestionnaireData } from '../data/workoutPrompt';
import { useTheme } from '../contexts/ThemeContext';

interface WorkoutGeneratorStep1Props {
  onNext: () => void;
  onBack: () => void;
}

export default function WorkoutGeneratorStep1({ onNext, onBack }: WorkoutGeneratorStep1Props) {
  const { themeColor } = useTheme();
  const [planningPromptCopied, setPlanningPromptCopied] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorLogs, setErrorLogs] = useState<string>('');
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadQuestionnaireData = async (): Promise<QuestionnaireData> => {
    try {
      const [
        fitnessGoalsData,
        equipmentPreferencesData,
      ] = await Promise.all([
        AsyncStorage.getItem('fitnessGoalsData'),
        AsyncStorage.getItem('equipmentPreferencesData'),
      ]);

      let fitnessGoals: any = {};
      let equipmentPrefs: any = {};
      
      try {
        fitnessGoals = fitnessGoalsData ? JSON.parse(fitnessGoalsData) : {};
      } catch (parseError) {
        console.error('Error parsing fitnessGoalsData:', parseError);
        fitnessGoals = {};
      }
      
      try {
        equipmentPrefs = equipmentPreferencesData ? JSON.parse(equipmentPreferencesData) : {};
      } catch (parseError) {
        console.error('Error parsing equipmentPreferencesData:', parseError);
        equipmentPrefs = {};
      }

      const consolidatedData: QuestionnaireData = {
        // From fitnessGoalsData
        primaryGoal: fitnessGoals.primaryGoal,
        integrationMethods: fitnessGoals.integrationMethods,
        specificSport: fitnessGoals.specificSport,
        athleticPerformanceDetails: fitnessGoals.athleticPerformanceDetails,
        funSocialDetails: fitnessGoals.funSocialDetails,
        injuryPreventionDetails: fitnessGoals.injuryPreventionDetails,
        flexibilityDetails: fitnessGoals.flexibilityDetails,
        customGoals: fitnessGoals.customGoals,
        totalTrainingDays: fitnessGoals.totalTrainingDays,
        gymTrainingDays: fitnessGoals.gymTrainingDays,
        otherTrainingDays: fitnessGoals.otherTrainingDays,
        customFrequency: fitnessGoals.customFrequency,
        priorityMuscleGroups: fitnessGoals.priorityMuscleGroups,
        customMuscleGroup: fitnessGoals.customMuscleGroup,
        movementLimitations: fitnessGoals.movementLimitations,
        customLimitation: fitnessGoals.customLimitation,
        trainingStylePreference: fitnessGoals.trainingStylePreference,
        customTrainingStyle: fitnessGoals.customTrainingStyle,
        trainingExperience: fitnessGoals.trainingExperience,
        trainingApproach: fitnessGoals.trainingApproach,
        programDuration: fitnessGoals.programDuration,
        sessionStyle: fitnessGoals.sessionStyle,
        exerciseNoteDetail: fitnessGoals.exerciseNoteDetail,

        // From equipmentPreferencesData
        selectedEquipment: equipmentPrefs.selectedEquipment,
        specificEquipment: equipmentPrefs.specificEquipment,
        unavailableEquipment: equipmentPrefs.unavailableEquipment,
        sessionStyle: equipmentPrefs.sessionStyle,
      };

      return consolidatedData;
    } catch (error) {
      console.error('Error loading questionnaire data:', error);
      throw new Error('Failed to load questionnaire data');
    }
  };

  const checkQuestionnairesCompleted = async () => {
    try {
      const questionnaireData = await loadQuestionnaireData();
      
      // Check if user has actually completed questionnaires (not just defaults)
      const hasRealData = questionnaireData && (
        (questionnaireData.primaryGoal && questionnaireData.primaryGoal !== 'build_muscle') ||
        (questionnaireData.selectedEquipment && !questionnaireData.selectedEquipment.includes('commercial_gym')) ||
        (questionnaireData.trainingExperience && questionnaireData.trainingExperience !== 'intermediate') ||
        questionnaireData.totalTrainingDays ||
        questionnaireData.sessionStyle && questionnaireData.sessionStyle !== 'moderate' ||
        questionnaireData.programDuration && questionnaireData.programDuration !== '12_weeks'
      );
      
      return hasRealData;
    } catch (error) {
      return false;
    }
  };

  const [questionnairesCompleted, setQuestionnairesCompleted] = useState(false);

  React.useEffect(() => {
    const checkStatus = async () => {
      const completed = await checkQuestionnairesCompleted();
      setQuestionnairesCompleted(completed);
    };
    checkStatus();
  }, []);

  const handleCopyPrompt = async () => {
    try {
      const completed = await checkQuestionnairesCompleted();
      
      if (!completed) {
        Alert.alert(
          'Complete Questionnaires First',
          'Please finish the Fitness Goals and Equipment & Preferences questionnaires to generate your personalized workout prompt.',
          [{ text: 'OK' }]
        );
        return;
      }

      const questionnaireData = await loadQuestionnaireData();
      
      let planningPrompt;
      try {
        planningPrompt = assemblePlanningPrompt(questionnaireData);
      } catch (promptError) {
        console.error('Error in assemblePlanningPrompt:', promptError);
        console.error('QuestionnaireData that caused error:', JSON.stringify(questionnaireData, null, 2));
        console.error('Error stack:', promptError?.stack);
        
        const createErrorDetails = async () => {
          try {
            const rawFitnessData = await AsyncStorage.getItem('fitnessGoalsData');
            const rawEquipmentData = await AsyncStorage.getItem('equipmentPreferencesData');
            
            return `PRODUCTION PROMPT GENERATION ERROR:
ERROR: ${promptError?.message || 'Unknown error'}
ERROR TYPE: ${promptError?.name || 'Unknown'}

RAW FITNESS DATA:
${rawFitnessData || 'null'}

RAW EQUIPMENT DATA:
${rawEquipmentData || 'null'}

CONSOLIDATED DATA:
${JSON.stringify(questionnaireData, null, 2)}

BASIC QUESTIONNAIRE DATA:
${JSON.stringify(questionnaireData, null, 2)}`;
          } catch (error) {
            return 'Error details unavailable';
          }
        };
        
        createErrorDetails().then(errorDetails => {
          setErrorLogs(errorDetails);
          setShowErrorModal(true);
        });
        
        // Fallback: use basic prompt if advanced prompt fails
        planningPrompt = `# Basic Workout Planning Prompt
Create a workout program based on the following information:
- Goal: ${questionnaireData.primaryGoal || 'muscle building'}
- Experience: ${questionnaireData.trainingExperience || 'intermediate'}
- Equipment: ${(questionnaireData.selectedEquipment || ['commercial_gym']).join(', ')}
- Training Approach: ${questionnaireData.trainingApproach || 'balanced'}
Please design a complete workout program with exercises, sets, reps, and rest periods.`;
      }
      
      try {
        await Clipboard.setStringAsync(planningPrompt);
        setPlanningPromptCopied(true);
        setTimeout(() => {
          setPlanningPromptCopied(false);
        }, 2000);
      } catch (clipboardError) {
        console.error('Clipboard error:', clipboardError);
        Alert.alert(
          'Copy Failed',
          'Unable to copy to clipboard. Please try again or copy manually from the generated prompt.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error generating prompt:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'Prompt Generation Error',
        `Failed to generate workout prompt: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{ 
        flex: 1,
        opacity: fadeAnim,
        transform: [{
          translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          })
        }]
      }}>
        <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, { backgroundColor: themeColor }]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.centerContent}>
          <View style={[styles.stepBadge, { backgroundColor: themeColor }]}>
            <Text style={styles.stepText}>1</Text>
          </View>
          
          <Text style={styles.mainTitle}>
            {questionnairesCompleted ? 'Your Prompt is Ready!' : 'Complete Setup First'}
          </Text>
          
          <TouchableOpacity 
            style={[
              styles.primaryAction, 
              { 
                backgroundColor: questionnairesCompleted ? themeColor : '#27272a',
                opacity: questionnairesCompleted ? 1 : 0.6
              }
            ]}
            onPress={handleCopyPrompt}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={planningPromptCopied ? "checkmark" : (questionnairesCompleted ? "copy" : "lock-closed")} 
              size={20} 
              color={questionnairesCompleted ? "#000" : "#71717a"} 
            />
            <Text style={[
              styles.actionText,
              { color: questionnairesCompleted ? "#000" : "#71717a" }
            ]}>
              {planningPromptCopied ? 'Copied!' : (questionnairesCompleted ? 'Copy Prompt' : 'Finish Setup')}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.hintText}>
            {questionnairesCompleted 
              ? 'Then paste it into any AI' 
              : 'Complete both questionnaires above'
            }
          </Text>
        </View>
      </View>

      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[styles.nextButton, { borderColor: themeColor }]}
          onPress={onNext}
          activeOpacity={0.8}
        >
          <Text style={[styles.nextButtonText, { color: themeColor }]}>Next Step</Text>
          <Ionicons name="chevron-forward" size={20} color={themeColor} />
        </TouchableOpacity>
      </View>
      </Animated.View>
    </View>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#27272a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  centerContent: {
    alignItems: 'center',
    gap: 32,
  },
  stepBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -1.5,
    marginTop: -8,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 10,
    marginTop: 8,
  },
  actionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  hintText: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    marginTop: -8,
  },
  bottomContainer: {
    paddingHorizontal: 30,
    paddingBottom: 40,
    paddingTop: 20,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 18,
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});