import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../contexts/ThemeContext';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function MealPlanHelpScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor } = useTheme();
  const [mealPromptCopied, setMealPromptCopied] = useState(false);
  const [jsonPromptCopied, setJsonPromptCopied] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.closeButtonWrapper}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButtonInner}>
          <Ionicons name="close" size={28} color="#71717a" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: 60 }} />
        
        <View style={styles.stepsContainer}>
          <View style={styles.stepCard}>
            <View style={styles.stepCardHeader}>
              <View style={[styles.stepBadge, { backgroundColor: themeColor }]}>
                <Text style={styles.stepBadgeText}>1</Text>
              </View>
              <Text style={styles.stepCardTitle}>Create Your Meal</Text>
            </View>
            <Text style={styles.stepCardDescription}>
              Send this prompt to get AI help creating your perfect meal
            </Text>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: themeColor }]}
              onPress={async () => {
                const mealCreationPrompt = `I want to create a custom meal for my meal tracking app. Can you help me design a meal with all the details?

I need you to help me create a meal with these details:
- Meal name
- Meal type (breakfast, lunch, dinner, or snack)  
- Prep time (in minutes)
- Cook time (in minutes)
- Nutrition information (calories, protein, carbs, fat)
- Ingredients list
- Step-by-step instructions

Please ask me questions to help fill in these details. Start by asking what type of meal I want to create and any preferences I have.`;

                await Clipboard.setStringAsync(mealCreationPrompt);
                setMealPromptCopied(true);
                setTimeout(() => {
                  setMealPromptCopied(false);
                }, 2000);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="copy-outline" size={18} color="#0a0a0b" />
              <Text style={styles.actionButtonText}>
                {mealPromptCopied ? 'Copied!' : 'Copy Meal Creation Prompt'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.stepCard}>
            <View style={styles.stepCardHeader}>
              <View style={[styles.stepBadge, { backgroundColor: themeColor }]}>
                <Text style={styles.stepBadgeText}>2</Text>
              </View>
              <Text style={styles.stepCardTitle}>Convert to JSON</Text>
            </View>
            <Text style={styles.stepCardDescription}>
              When ready, send this prompt to convert your meal to JSON format
            </Text>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: themeColor }]}
              onPress={async () => {
                const jsonConversionPrompt = `Perfect! Now convert this meal into a JSON format that matches this exact structure:

{
  "name": "Meal Name Here",
  "type": "breakfast/lunch/dinner/snack",
  "prepTime": 0,
  "cookTime": 0,
  "nutritionInfo": {
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0
  },
  "ingredients": [
    "1 cup ingredient 1",
    "2 tbsp ingredient 2"
  ],
  "instructions": [
    "Step 1 instructions",
    "Step 2 instructions"
  ]
}

Please provide ONLY the JSON format, no additional text or explanation. I'll copy and paste this directly into my app.`;

                await Clipboard.setStringAsync(jsonConversionPrompt);
                setJsonPromptCopied(true);
                setTimeout(() => {
                  setJsonPromptCopied(false);
                }, 2000);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={18} color="#0a0a0b" />
              <Text style={styles.actionButtonText}>
                {jsonPromptCopied ? 'Copied!' : 'Copy JSON Conversion Prompt'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.stepCard}>
            <View style={styles.stepCardHeader}>
              <View style={[styles.stepBadge, { backgroundColor: themeColor }]}>
                <Text style={styles.stepBadgeText}>3</Text>
              </View>
              <Text style={styles.stepCardTitle}>Import & Enjoy</Text>
            </View>
            <Text style={styles.stepCardDescription}>
              Copy the JSON your AI created and paste it using "Paste & Import" button
            </Text>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.tutorialSection}>
        <Text style={styles.tutorialSectionTitle}>Need Help?</Text>
        <TouchableOpacity 
          style={[styles.tutorialButton, { backgroundColor: themeColor }]}
          onPress={() => {
            const url = 'https://youtube.com/shorts/_l6E9sX-9QQ';
            Linking.openURL(url);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="play" size={18} color="#ffffff" />
          <Text style={styles.tutorialButtonText}>Watch Tutorial</Text>
          <Text style={styles.tutorialButtonSubtext}>30 seconds</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  closeButtonWrapper: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    zIndex: 1,
  },
  closeButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  stepsContainer: {
    gap: 16,
  },
  stepCard: {
    backgroundColor: '#18181b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 20,
  },
  stepCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a0a0b',
  },
  stepCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  stepCardDescription: {
    fontSize: 14,
    color: '#71717a',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#0a0a0b',
    fontWeight: '600',
  },
  tutorialSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#18181b',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  tutorialSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
    marginBottom: 16,
    textAlign: 'center',
  },
  tutorialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  tutorialButtonText: {
    fontSize: 16,
    color: '#0a0a0b',
    fontWeight: '600',
  },
  tutorialButtonSubtext: {
    fontSize: 12,
    color: '#0a0a0b',
    opacity: 0.7,
    marginLeft: 4,
  },
});