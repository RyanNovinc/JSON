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
import * as Clipboard from 'expo-clipboard';
import { generateJsonConversionPrompt } from '../data/generateJsonConversionPrompt';
import { useTheme } from '../contexts/ThemeContext';

interface NutritionGeneratorStep3Props {
  onNext: () => void;
  onBack: () => void;
}

export default function NutritionGeneratorStep3({ onNext, onBack }: NutritionGeneratorStep3Props) {
  const { themeColor } = useTheme();
  const [formatPromptCopied, setFormatPromptCopied] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleCopyFormatPrompt = async () => {
    try {
      const prompt = generateJsonConversionPrompt('copy_paste');
      
      await Clipboard.setStringAsync(prompt);
      setFormatPromptCopied(true);
      setTimeout(() => {
        setFormatPromptCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Error generating format prompt:', error);
      Alert.alert(
        'Error',
        'Unable to generate format prompt. Please try again.',
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
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
            <View style={[styles.progressDot, { backgroundColor: themeColor }]} />
            <View style={styles.progressDot} />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.centerContent}>
            <View style={[styles.stepBadge, { backgroundColor: themeColor }]}>
              <Text style={styles.stepText}>3</Text>
            </View>
            
            <Text style={styles.mainTitle}>Get Your Final Plan</Text>
            
            <TouchableOpacity 
              style={[styles.primaryAction, { backgroundColor: themeColor }]}
              onPress={handleCopyFormatPrompt}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={formatPromptCopied ? "checkmark" : "sparkles"} 
                size={20} 
                color="#000" 
              />
              <Text style={styles.actionText}>
                {formatPromptCopied ? 'Copied!' : 'Copy Format Request'}
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.hintText}>Ask AI to format it for the app</Text>
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