import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import * as Clipboard from 'expo-clipboard';
import { assembleMealPlanningPrompt } from '../data/mealPlanningPrompt';

interface NutritionGeneratorStep1NewProps {
  onNext: () => void;
  onBack: () => void;
}

export default function NutritionGeneratorStep1New({ onNext, onBack }: NutritionGeneratorStep1NewProps) {
  const { themeColor } = useTheme();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showInfo, setShowInfo] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  const handleCopyPrompt = async () => {
    try {
      // First test with simple text to see if copy functionality works
      const testPrompt = "Test meal planning prompt - this is working!";
      await Clipboard.setStringAsync(testPrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
      
      // Try the real prompt function
      try {
        const realPrompt = await assembleMealPlanningPrompt();
        await Clipboard.setStringAsync(realPrompt);
      } catch (promptError) {
        console.error('assembleMealPlanningPrompt error:', promptError);
        // Keep the test prompt if real one fails
      }
    } catch (error) {
      console.error('Failed to copy prompt:', error);
      Alert.alert('Error', 'Failed to copy prompt to clipboard');
    }
  };

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

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
            <Ionicons name="restaurant" size={24} color={themeColor} style={styles.headerIcon} />
            <View style={styles.progressContainer}>
              <View style={[styles.progressDot, { backgroundColor: themeColor }]} />
              <View style={styles.progressDot} />
            </View>
          </View>

          <TouchableOpacity style={styles.infoButton} onPress={() => setShowInfo(!showInfo)}>
            <Ionicons name="information-circle-outline" size={24} color="#71717a" />
          </TouchableOpacity>
        </View>

        {showInfo && (
          <View style={styles.infoModal}>
            <View style={styles.infoSteps}>
              <Text style={styles.infoMessage}>
                <Text style={[styles.stepNumber, { color: themeColor }]}>1. </Text>
                Paste this prompt into any AI like Claude or ChatGPT
              </Text>
              <Text style={styles.infoMessage}>
                <Text style={[styles.stepNumber, { color: themeColor }]}>2. </Text>
                Follow the AI's questions to refine your meal plan
              </Text>
              <Text style={styles.infoMessage}>
                <Text style={[styles.stepNumber, { color: themeColor }]}>3. </Text>
                The AI will create your meal plan file for import
              </Text>
            </View>
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.centerContent}>
            <Text style={styles.mainTitle}>Your Prompt is Ready!</Text>
            
            <TouchableOpacity 
              style={[styles.primaryAction, { backgroundColor: themeColor }]}
              onPress={handleCopyPrompt}
              activeOpacity={0.8}
            >
              <Ionicons name={promptCopied ? "checkmark" : "copy"} size={20} color="#000" />
              <Text style={styles.actionText}>{promptCopied ? "Copied!" : "Copy Prompt"}</Text>
            </TouchableOpacity>
            
            <Text style={styles.hintText}>Then paste and send to any AI</Text>
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
  infoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
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
  infoSteps: {
    gap: 12,
  },
  infoMessage: {
    fontSize: 15,
    color: '#d1d5db',
    lineHeight: 22,
  },
  stepNumber: {
    fontWeight: '700',
  },
});