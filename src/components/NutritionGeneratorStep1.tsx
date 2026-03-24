import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { assembleMealPlanningPrompt } from '../data/mealPlanningPrompt';
import { useTheme } from '../contexts/ThemeContext';
import { NUTRITION_STORAGE_KEYS } from '../types/nutrition';
import { WorkoutStorage } from '../utils/storage';

interface NutritionGeneratorStep1Props {
  onNext: () => void;
  onBack: () => void;
}

export default function NutritionGeneratorStep1({ onNext, onBack }: NutritionGeneratorStep1Props) {
  const { themeColor } = useTheme();
  const [planningPromptCopied, setPlanningPromptCopied] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showInfo, setShowInfo] = useState(false);

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadNutritionData = async () => {
    try {
      const nutritionResults = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.RESULTS);
      if (nutritionResults) {
        return JSON.parse(nutritionResults);
      }
      return null;
    } catch (error) {
      console.error('Error loading nutrition data:', error);
      return null;
    }
  };

  const checkNutritionCompleted = async () => {
    try {
      const completionStatus = await WorkoutStorage.loadNutritionCompletionStatus();
      // Check that the core questionnaires are completed (same as dashboard screen)
      return completionStatus.nutritionGoals && 
             completionStatus.budgetCooking && 
             completionStatus.sleepOptimization;
    } catch (error) {
      return false;
    }
  };

  const [nutritionCompleted, setNutritionCompleted] = useState(false);

  React.useEffect(() => {
    const checkStatus = async () => {
      const completed = await checkNutritionCompleted();
      setNutritionCompleted(completed);
    };
    checkStatus();
  }, []);

  const handleCopyPrompt = async () => {
    try {
      const completed = await checkNutritionCompleted();
      
      if (!completed) {
        Alert.alert(
          'Complete Nutrition Setup First',
          'Please complete the nutrition questionnaire to generate your personalized meal plan prompt.',
          [{ text: 'OK' }]
        );
        return;
      }

      let planningPrompt: string;
      try {
        planningPrompt = await assembleMealPlanningPrompt();
      } catch (promptError) {
        console.error('Error in assembleMealPlanningPrompt:', promptError);
        
        // Fallback: use basic prompt
        planningPrompt = `# Basic Meal Plan Prompt
Create a personalized meal plan based on the nutrition data provided. Include breakfast, lunch, dinner, and snacks with specific foods, portions, and macronutrient targets.`;
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
          'Unable to copy to clipboard. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error generating prompt:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'Prompt Generation Error',
        `Failed to generate meal plan prompt: ${errorMessage}`,
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
              {nutritionCompleted ? 'Your Prompt is Ready!' : 'Complete Setup First'}
            </Text>
            
            <TouchableOpacity 
              style={[
                styles.primaryAction, 
                { 
                  backgroundColor: nutritionCompleted ? themeColor : '#27272a',
                  opacity: nutritionCompleted ? 1 : 0.6
                }
              ]}
              onPress={handleCopyPrompt}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={planningPromptCopied ? "checkmark" : (nutritionCompleted ? "copy" : "lock-closed")} 
                size={20} 
                color={nutritionCompleted ? "#000" : "#71717a"} 
              />
              <Text style={[
                styles.actionText,
                { color: nutritionCompleted ? "#000" : "#71717a" }
              ]}>
                {planningPromptCopied ? 'Copied!' : (nutritionCompleted ? 'Copy Prompt' : 'Finish Setup')}
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.hintText}>
              {nutritionCompleted 
                ? 'Then paste and send to any AI' 
                : 'Complete nutrition questionnaire above'
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
});