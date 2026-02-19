import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import * as Clipboard from 'expo-clipboard';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function MealPlanHelpScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor } = useTheme();
  const [copiedButton, setCopiedButton] = useState<string | null>(null);

  const copyToClipboard = async (text: string, buttonId: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedButton(buttonId);
    setTimeout(() => setCopiedButton(null), 1000);
  };

  const mealCreationPrompt = `Create a detailed recipe with the following information:

Recipe Name: [Name of the dish]
Type: [breakfast/lunch/dinner/snack]
Prep Time: [Time in minutes]
Cook Time: [Time in minutes]
Servings: [Number of servings]
Difficulty: [easy/medium/hard]

Ingredients:
- [Ingredient 1 with amount and unit]
- [Ingredient 2 with amount and unit]
- [Continue for all ingredients]

Instructions:
1. [Step 1 instruction]
2. [Step 2 instruction]
3. [Continue for all steps]

Nutrition Information:
- Calories: [per serving]
- Protein: [grams]
- Carbohydrates: [grams]
- Fat: [grams]
- Fiber: [grams]

Tags: [List relevant tags like "vegetarian", "quick", "healthy", etc.]

Please provide a complete recipe that is delicious and nutritious.`;

  const jsonConversionPrompt = `Convert the recipe information above to JSON format using this exact structure:

{
  "name": "Recipe Name",
  "type": "breakfast", // or "lunch", "dinner", "snack"
  "prepTime": 15,
  "cookTime": 20,
  "servings": 4,
  "difficulty": "easy", // or "medium", "hard"
  "ingredients": [
    {
      "name": "Ingredient name",
      "amount": 2,
      "unit": "cups"
    }
  ],
  "instructions": [
    {
      "step": 1,
      "instruction": "Step instruction"
    }
  ],
  "nutritionInfo": {
    "calories": 300,
    "protein": 25,
    "carbs": 30,
    "fat": 12,
    "fiber": 5
  },
  "tags": ["tag1", "tag2"]
}

Only return the JSON, nothing else.`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Create Meal with AI</Text>
          <Text style={styles.headerSubtitle}>3 simple steps to add custom meals</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1 */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumber, { backgroundColor: themeColor }]}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepTitle}>Create Your Meal</Text>
          </View>
          
          <Text style={styles.stepDescription}>
            Send this prompt to get AI help creating your perfect meal
          </Text>
          
          <TouchableOpacity 
            style={[styles.promptButton, { backgroundColor: themeColor }]}
            onPress={() => copyToClipboard(mealCreationPrompt, 'creation')}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={copiedButton === 'creation' ? "checkmark" : "copy-outline"} 
              size={20} 
              color="#000000" 
            />
            <Text style={styles.promptButtonText}>
              {copiedButton === 'creation' ? 'Copied!' : 'Copy Meal Creation Prompt'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Step 2 */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumber, { backgroundColor: themeColor }]}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepTitle}>Convert to JSON</Text>
          </View>
          
          <Text style={styles.stepDescription}>
            When ready, send this prompt to convert your meal to JSON format
          </Text>
          
          <TouchableOpacity 
            style={[styles.promptButton, { backgroundColor: themeColor }]}
            onPress={() => copyToClipboard(jsonConversionPrompt, 'json')}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={copiedButton === 'json' ? "checkmark" : "sparkles"} 
              size={20} 
              color="#000000" 
            />
            <Text style={styles.promptButtonText}>
              {copiedButton === 'json' ? 'Copied!' : 'Copy JSON Conversion Prompt'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Step 3 */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumber, { backgroundColor: themeColor }]}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepTitle}>Import & Enjoy</Text>
          </View>
          
          <Text style={styles.stepDescription}>
            Copy the JSON your AI created and paste it using "Paste & Import" button
          </Text>
        </View>

        {/* Need Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          
          <TouchableOpacity 
            style={[styles.tutorialButton, { backgroundColor: themeColor }]}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={20} color="#000000" />
            <Text style={styles.tutorialButtonText}>Watch Tutorial</Text>
            <Text style={styles.tutorialDuration}>30 seconds</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#71717a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 20,
    marginTop: 20,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepDescription: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 20,
    marginBottom: 16,
  },
  promptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  promptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  helpSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 20,
  },
  tutorialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  tutorialButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  tutorialDuration: {
    fontSize: 14,
    color: '#000000',
    opacity: 0.8,
    marginLeft: 8,
  },
  bottomPadding: {
    height: 40,
  },
});