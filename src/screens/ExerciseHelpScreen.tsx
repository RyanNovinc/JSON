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

export default function ExerciseHelpScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor } = useTheme();
  const [copiedButton, setCopiedButton] = useState<string | null>(null);

  const copyToClipboard = async (text: string, buttonId: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedButton(buttonId);
    setTimeout(() => setCopiedButton(null), 1000);
  };

  const exerciseCreationPrompt = `I want to create a custom exercise for my fitness app. Please ask me clarifying questions to understand exactly what exercise I want to create.

Ask me about:
- What specific exercise or movement I have in mind
- What equipment I have available (or if it should be bodyweight)
- What category it should be (gym/bodyweight/flexibility/cardio/custom)
- Any specific variations or modifications I want included

Please ask these questions one by one and wait for my responses. Once you have all the information, create a detailed exercise with:

Exercise Name: [Based on my input]
Category: [Based on my preference]
Equipment: [What I have available]

Primary Target Muscles: [The main muscles that do most of the work - these are the muscles this exercise directly trains and would count toward weekly volume targets]

Secondary Involvement: [Muscles that assist, stabilize, or receive some stimulus but are not the primary movers - these help but require dedicated exercises for optimal development]

Instructions:
1. [Step-by-step movement based on my specifications]
2. [Continue based on the exercise I described]

Additional Notes: [Any helpful training tips or form cues]

IMPORTANT: When categorizing muscles, think about which muscles are the PRIMARY MOVERS (doing most of the work) versus which are ASSISTERS/STABILIZERS. For example:
- Push-ups: Primary = Chest, Triceps | Secondary = Shoulders, Core
- Pull-ups: Primary = Lats, Rhomboids | Secondary = Biceps, Rear Delts
- Squats: Primary = Quads, Glutes | Secondary = Calves, Core

Start by asking me what specific exercise or movement I want to create.`;

  const jsonConversionPrompt = `Convert the exercise information above to JSON format that can be imported into the fitness app. Use this EXACT structure:

{
  "id": "exercise_[generateRandomString]",
  "name": "Exercise Name",
  "category": "gym",
  "customCategory": "Custom Category Name (only include this field if category is 'custom')",
  "primaryMuscles": ["Primary Muscle 1", "Primary Muscle 2"],
  "secondaryMuscles": ["Secondary Muscle 1", "Secondary Muscle 2"],
  "instructions": "Step 1: Starting position description\\n\\nStep 2: Movement execution\\n\\nStep 3: Return to starting position",
  "notes": "Any additional helpful information",
  "addedAt": "2026-02-19T12:00:00.000Z"
}

CRITICAL MUSCLE CATEGORIZATION:
Before creating the JSON, carefully analyze the exercise and categorize muscles correctly:

PRIMARY MUSCLES (main movers - count for volume tracking):
- The muscles doing most of the work and joint movement
- Examples: Chest in push-ups, quads in squats, lats in pull-ups

SECONDARY MUSCLES (assisters/stabilizers - provide stimulus but need dedicated work):
- Muscles that help stabilize or assist but aren't the main drivers
- Examples: Shoulders in push-ups, core in squats, biceps in pull-ups

COMMON CATEGORIZATION EXAMPLES:
- Push-ups: Primary=["Chest", "Triceps"] Secondary=["Shoulders", "Core"]
- Squats: Primary=["Quadriceps", "Glutes"] Secondary=["Calves", "Core"]
- Pull-ups: Primary=["Lats", "Rhomboids"] Secondary=["Biceps", "Rear Delts"]
- Bench Press: Primary=["Chest", "Triceps"] Secondary=["Shoulders"]
- Deadlifts: Primary=["Hamstrings", "Glutes", "Erector Spinae"] Secondary=["Traps", "Lats"]

OTHER REQUIREMENTS:
- Generate a unique ID starting with "exercise_" followed by random characters
- Category must be EXACTLY one of: "gym", "bodyweight", "flexibility", "cardio", "custom"  
- Only include "customCategory" field if category is "custom"
- Use \\n for line breaks in instructions and notes
- Use current date/time in ISO format for addedAt
- Return ONLY valid JSON - no extra text, explanations, or markdown formatting

The JSON must be ready to paste directly into the app import function.`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Create Exercise with AI</Text>
          <Text style={styles.headerSubtitle}>3 simple steps to add custom exercises</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1 */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumber, { backgroundColor: themeColor }]}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepTitle}>Create Your Exercise</Text>
          </View>
          
          <Text style={styles.stepDescription}>
            Send this prompt to get AI help creating your perfect exercise
          </Text>
          
          <TouchableOpacity 
            style={[styles.promptButton, { backgroundColor: themeColor }]}
            onPress={() => copyToClipboard(exerciseCreationPrompt, 'creation')}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={copiedButton === 'creation' ? "checkmark" : "copy-outline"} 
              size={20} 
              color="#000000" 
            />
            <Text style={styles.promptButtonText}>
              {copiedButton === 'creation' ? 'Copied!' : 'Copy Exercise Creation Prompt'}
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
            When ready, send this prompt to convert your exercise to JSON format
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