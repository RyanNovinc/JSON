import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Animated,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { assemblePlanningPrompt } from '../data/planningPrompt';
import { QuestionnaireData } from '../data/workoutPrompt';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutStorage } from '../utils/storage';
import { useNavigation } from '@react-navigation/native';

interface WorkoutGeneratorStep1Props {
  onNext: () => void;
  onBack: () => void;
}

export default function WorkoutGeneratorStep1({ onNext, onBack }: WorkoutGeneratorStep1Props) {
  const { themeColor } = useTheme();
  const navigation = useNavigation<any>();
  const [planningPromptCopied, setPlanningPromptCopied] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorLogs, setErrorLogs] = useState<string>('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showCustomAlert, setShowCustomAlert] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

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
        WorkoutStorage.loadFitnessGoalsResults(),
        WorkoutStorage.loadEquipmentPreferencesResults(),
      ]);

      const fitnessGoals: any = fitnessGoalsData || {};
      const equipmentPrefs: any = equipmentPreferencesData || {};

      const consolidatedData: QuestionnaireData = {
        // From fitnessGoalsData
        primaryGoal: fitnessGoals.primaryGoal,
        customPrimaryGoal: fitnessGoals.customPrimaryGoal,
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
        auxiliaryMuscles: fitnessGoals.auxiliaryMuscles,
        movementLimitations: fitnessGoals.movementLimitations,
        customLimitation: fitnessGoals.customLimitation,
        trainingStylePreference: fitnessGoals.trainingStylePreference,
        customTrainingStyle: fitnessGoals.customTrainingStyle,
        trainingExperience: fitnessGoals.trainingExperience,
        volumePreference: fitnessGoals.volumePreference,
        gender: fitnessGoals.gender,
        programDuration: fitnessGoals.programDuration,
        customDuration: fitnessGoals.customDuration,

        // From equipmentPreferencesData
        selectedEquipment: equipmentPrefs.selectedEquipment,
        specificEquipment: equipmentPrefs.specificEquipment,
        unavailableEquipment: equipmentPrefs.unavailableEquipment,
        sessionStyle: equipmentPrefs.sessionStyle,
        likedExercises: equipmentPrefs.likedExercises ? 
          equipmentPrefs.likedExercises.split(',').map((ex: string) => ex.trim()).filter((ex: string) => ex.length > 0) 
          : undefined,
        dislikedExercises: equipmentPrefs.dislikedExercises ? 
          equipmentPrefs.dislikedExercises.split(',').map((ex: string) => ex.trim()).filter((ex: string) => ex.length > 0) 
          : undefined,
        includeDirectCore: equipmentPrefs.includeDirectCore,
        exerciseNoteDetail: equipmentPrefs.exerciseNoteDetail,
      };

      return consolidatedData;
    } catch (error) {
      console.error('Error loading questionnaire data:', error);
      throw new Error('Failed to load questionnaire data');
    }
  };

  const checkQuestionnairesCompleted = async () => {
    try {
      // Use the exact same logic as WorkoutDashboardScreen
      const [fitnessGoalsData, equipmentPreferencesData] = await Promise.all([
        WorkoutStorage.loadFitnessGoalsResults(),
        WorkoutStorage.loadEquipmentPreferencesResults()
      ]);

      const fitnessGoalsCompleted = !!(fitnessGoalsData && fitnessGoalsData.completedAt);
      const equipmentPreferencesCompleted = !!(equipmentPreferencesData && equipmentPreferencesData.completedAt);
      
      return fitnessGoalsCompleted && equipmentPreferencesCompleted;
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
        setShowCustomAlert(true);
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
            const rawFitnessData = await WorkoutStorage.loadFitnessGoalsResults();
            const rawEquipmentData = await WorkoutStorage.loadEquipmentPreferencesResults();
            
            return `PRODUCTION PROMPT GENERATION ERROR:
ERROR: ${promptError?.message || 'Unknown error'}
ERROR TYPE: ${promptError?.name || 'Unknown'}

RAW FITNESS DATA:
${JSON.stringify(rawFitnessData, null, 2) || 'null'}

RAW EQUIPMENT DATA:
${JSON.stringify(rawEquipmentData, null, 2) || 'null'}

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
- Volume Target: ${questionnaireData.volumePreference || '12-16'} sets/week per muscle group
- Gender: ${questionnaireData.gender || 'not specified'} (for volume context)
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
        
        <View style={styles.headerCenter}>
          <Ionicons name="barbell" size={24} color={themeColor} style={styles.headerIcon} />
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, { backgroundColor: themeColor }]} />
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
          </View>
        </View>

        <TouchableOpacity style={styles.infoButton} onPress={() => setShowInfo(!showInfo)}>
          <Ionicons name="information-circle-outline" size={24} color="#71717a" />
        </TouchableOpacity>
      </View>

      {showInfo && (
        <View style={styles.infoModal}>
          <Text style={styles.infoMessage}>
            Send one prompt at a time before continuing to the next step. Don't send them all in one message.
          </Text>
        </View>
      )}

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
            onPress={questionnairesCompleted ? handleCopyPrompt : () => {
              setShowCustomAlert(true);
            }}
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
              ? 'Then paste and send to any AI' 
              : 'Complete workout questionnaires'
            }
          </Text>
        </View>
      </View>

      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[
            styles.nextButton, 
            { 
              borderColor: questionnairesCompleted ? themeColor : '#27272a',
              opacity: questionnairesCompleted ? 1 : 0.6
            }
          ]}
          onPress={questionnairesCompleted ? onNext : () => {
            setShowCustomAlert(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.nextButtonText, 
            { color: questionnairesCompleted ? themeColor : '#71717a' }
          ]}>
            {questionnairesCompleted ? 'Next Step' : 'Complete Setup First'}
          </Text>
          <Ionicons 
            name={questionnairesCompleted ? "chevron-forward" : "lock-closed"} 
            size={20} 
            color={questionnairesCompleted ? themeColor : '#71717a'} 
          />
        </TouchableOpacity>
      </View>
      </Animated.View>

      {/* Custom Alert Modal */}
      <Modal
        visible={showCustomAlert}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomAlert(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>            
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>
                Complete your fitness profile to continue
              </Text>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalActionButton, { backgroundColor: themeColor }]}
                onPress={() => {
                  setShowCustomAlert(false);
                  navigation.navigate('WorkoutDashboard');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalActionText}>Go to Questionnaires</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCustomAlert(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 60,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButton: {
    position: 'absolute',
    right: 20,
    top: 60,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    marginBottom: 4,
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
  infoModal: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: '#1a1a1b',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333336',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  infoMessage: {
    fontSize: 15,
    color: '#d1d5db',
    lineHeight: 22,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 0,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalBody: {
    paddingTop: 28,
    paddingHorizontal: 28,
    paddingBottom: 28,
  },
  modalMessage: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'column',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  modalCancelButton: {
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
  },
  modalActionButton: {
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});