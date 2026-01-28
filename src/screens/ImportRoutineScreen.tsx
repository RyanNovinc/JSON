import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Clipboard from 'expo-clipboard';
import { getAIPrompt, exerciseGlossary } from '../data/workoutPrompt';
// import * as Crypto from 'expo-crypto';

type ImportScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ImportRoutine'>;

interface WorkoutProgram {
  routine_name: string;
  description?: string;
  days_per_week: number;
  blocks: Array<{
    block_name: string;
    weeks: string;
    structure?: string;
    days: Array<{
      day_name: string;
      estimated_duration?: number;
      exercises: Array<{
        exercise: string;
        sets: number;
        reps: string;
        reps_weekly?: { [week: string]: string };
        rest: number;
        restQuick?: number;
        notes?: string;
        alternatives?: string[];
      }>;
    }>;
  }>;
  id?: string; // Add optional id field for tracking
}

export default function ImportRoutineScreen() {
  const navigation = useNavigation<ImportScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(false);
  const [parsedProgram, setParsedProgram] = useState<WorkoutProgram | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [planningPromptCopied, setPlanningPromptCopied] = useState(false);
  const [aiPromptCopied, setAiPromptCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sampleCopied, setSampleCopied] = useState(false);

  const sampleWorkout = {
    "routine_name": "Quick Start PPL",
    "description": "3-day Push Pull Legs sample to try the app",
    "days_per_week": 3,
    "blocks": [
      {
        "block_name": "Demo Week",
        "weeks": "1",
        "structure": "Push Pull Legs",
        "days": [
          {
            "day_name": "Push",
            "estimated_duration": 45,
            "exercises": [
              {
                "exercise": "Push Up",
                "sets": 3,
                "reps": "8-12",
                "rest": 90,
                "restQuick": 60,
                "notes": "Knee variation if needed",
                "alternatives": ["Incline Push Up", "Dumbbell Bench Press"]
              },
              {
                "exercise": "Overhead Press",
                "sets": 3,
                "reps": "8-10",
                "rest": 120,
                "restQuick": 90,
                "alternatives": ["Dumbbell Shoulder Press", "Machine Shoulder Press"]
              },
              {
                "exercise": "Lateral Raise",
                "sets": 3,
                "reps": "12-15",
                "rest": 60,
                "restQuick": 45,
                "alternatives": ["Cable Lateral Raise", "Machine Lateral Raise"]
              }
            ]
          },
          {
            "day_name": "Pull",
            "estimated_duration": 40,
            "exercises": [
              {
                "exercise": "Assisted Pull Up",
                "sets": 3,
                "reps": "5-10",
                "rest": 120,
                "restQuick": 90,
                "notes": "Use assistance machine or bands",
                "alternatives": ["Lat Pulldown", "Inverted Row"]
              },
              {
                "exercise": "Dumbbell Row",
                "sets": 3,
                "reps": "8-10",
                "rest": 90,
                "restQuick": 60,
                "alternatives": ["Barbell Row", "Cable Row"]
              },
              {
                "exercise": "Dumbbell Curl",
                "sets": 3,
                "reps": "10-12",
                "rest": 60,
                "restQuick": 45,
                "alternatives": ["Barbell Curl", "Cable Curl"]
              }
            ]
          },
          {
            "day_name": "Legs",
            "estimated_duration": 50,
            "exercises": [
              {
                "exercise": "Goblet Squat",
                "sets": 3,
                "reps": "12-15",
                "rest": 90,
                "restQuick": 60,
                "notes": "Hold dumbbell at chest, focus on depth",
                "alternatives": ["Dumbbell Squat", "Leg Press"]
              },
              {
                "exercise": "Dumbbell Romanian Deadlift",
                "sets": 3,
                "reps": "10-12",
                "rest": 90,
                "restQuick": 60,
                "notes": "Keep bar close to body",
                "alternatives": ["Romanian Deadlift", "Good Morning"]
              },
              {
                "exercise": "Dumbbell Calf Raise",
                "sets": 3,
                "reps": "15-20",
                "rest": 60,
                "restQuick": 45,
                "alternatives": ["Standing Calf Raise", "Seated Calf Raise"]
              }
            ]
          }
        ]
      }
    ]
  };

  const handleCopySample = async () => {
    const sampleJson = JSON.stringify(sampleWorkout, null, 2);
    await Clipboard.setStringAsync(sampleJson);
    setSampleCopied(true);
    setTimeout(() => {
      setSampleCopied(false);
    }, 2000);
  };

  const validateAndParseJSON = (input: string): WorkoutProgram | null => {
    try {
      const parsed = JSON.parse(input);
      
      // Basic validation
      if (!parsed.routine_name || typeof parsed.routine_name !== 'string') {
        throw new Error('Invalid routine name');
      }
      
      if (!parsed.days_per_week || typeof parsed.days_per_week !== 'number') {
        throw new Error('Invalid days per week');
      }
      
      if (!Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
        throw new Error('No training blocks found');
      }
      
      // Validate routine-level optional fields
      if (parsed.description && typeof parsed.description !== 'string') {
        throw new Error('Description must be a string');
      }

      // Validate blocks structure
      parsed.blocks.forEach((block: any, blockIndex: number) => {
        if (!block.block_name || !block.weeks) {
          throw new Error(`Block ${blockIndex + 1} is incomplete`);
        }
        
        // Validate optional block fields
        if (block.structure && typeof block.structure !== 'string') {
          throw new Error(`Block "${block.block_name}" has invalid structure field`);
        }
        
        if (!Array.isArray(block.days) || block.days.length === 0) {
          throw new Error(`Block "${block.block_name}" has no training days`);
        }
        
        block.days.forEach((day: any, dayIndex: number) => {
          if (!day.day_name) {
            throw new Error(`Day ${dayIndex + 1} in "${block.block_name}" needs a name`);
          }
          
          // Validate optional day fields
          if (day.estimated_duration && (typeof day.estimated_duration !== 'number' || day.estimated_duration <= 0)) {
            throw new Error(`"${day.day_name}" has invalid estimated_duration`);
          }
          
          if (!Array.isArray(day.exercises) || day.exercises.length === 0) {
            throw new Error(`"${day.day_name}" has no exercises`);
          }
          
          day.exercises.forEach((exercise: any, exerciseIndex: number) => {
            // Validate required fields
            if (!exercise.exercise || typeof exercise.sets !== 'number' || 
                !exercise.reps || typeof exercise.rest !== 'number') {
              throw new Error(`Exercise ${exerciseIndex + 1} in "${day.day_name}" is missing required fields`);
            }
            
            // Validate exercise name is in glossary
            if (!exerciseGlossary.includes(exercise.exercise)) {
              throw new Error(`Exercise "${exercise.exercise}" in "${day.day_name}" not found in exercise glossary`);
            }
            
            // Validate optional exercise fields
            if (exercise.reps_weekly) {
              if (typeof exercise.reps_weekly !== 'object' || exercise.reps_weekly === null) {
                throw new Error(`Exercise "${exercise.exercise}" has invalid reps_weekly format`);
              }
              // Validate all values are strings
              Object.values(exercise.reps_weekly).forEach((reps: any) => {
                if (typeof reps !== 'string') {
                  throw new Error(`Exercise "${exercise.exercise}" has invalid reps_weekly values (must be strings)`);
                }
              });
            }
            
            if (exercise.restQuick && (typeof exercise.restQuick !== 'number' || exercise.restQuick <= 0)) {
              throw new Error(`Exercise "${exercise.exercise}" has invalid restQuick value`);
            }
            
            if (exercise.notes && typeof exercise.notes !== 'string') {
              throw new Error(`Exercise "${exercise.exercise}" has invalid notes field`);
            }
            
            if (exercise.alternatives) {
              if (!Array.isArray(exercise.alternatives)) {
                throw new Error(`Exercise "${exercise.exercise}" alternatives must be an array`);
              }
              // Validate all alternatives are in glossary
              exercise.alternatives.forEach((alt: any) => {
                if (typeof alt !== 'string' || !exerciseGlossary.includes(alt)) {
                  throw new Error(`Alternative exercise "${alt}" for "${exercise.exercise}" not found in exercise glossary`);
                }
              });
            }
          });
        });
      });
      
      return parsed as WorkoutProgram;
    } catch (error) {
      let errorDetail = '';
      
      if (error instanceof SyntaxError) {
        // Common JSON errors
        if (input.includes('...')) {
          errorDetail = 'Your JSON contains "..." which is not valid. Make sure to copy the COMPLETE workout, not an abbreviated version.';
        } else if (input.trim().startsWith('```')) {
          errorDetail = 'Remove the ```json and ``` markers. Copy only the JSON content between them.';
        } else if (!input.trim().startsWith('{')) {
          errorDetail = 'JSON should start with {. Make sure you copied the entire output.';
        } else if (!input.trim().endsWith('}')) {
          errorDetail = 'JSON appears incomplete. Make sure you copied everything including the final }.';
        } else {
          errorDetail = 'Invalid JSON format. Common issues:\n• Missing commas between items\n• Extra commas at the end\n• Unclosed brackets or quotes\n• Text before or after the JSON';
        }
      } else if (error instanceof Error) {
        errorDetail = `Validation issue: ${error.message}`;
      }
      
      setErrorMessage(errorDetail);
      return null;
    }
  };

  const handlePasteAndImport = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text) {
      Alert.alert('Clipboard Empty', 'Copy your workout program first', [{ text: 'OK' }]);
      return;
    }

    setIsLoading(true);
    
    // Simulate processing time for better UX
    setTimeout(() => {
      const program = validateAndParseJSON(text);
      setIsLoading(false);
      
      if (program) {
        // Generate unique ID for this program import
        const programId = Date.now().toString() + Math.random().toString(36);
        program.id = programId;
        setParsedProgram(program);
        setShowConfirmation(true);
      }
    }, 800);
  };

  const handleConfirmImport = async () => {
    if (parsedProgram) {
      setShowConfirmation(false);
      
      navigation.navigate('Main', { 
        screen: 'Home',
        params: { importedProgram: parsedProgram }
      } as any);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22d3ee" />
        <Text style={styles.loadingText}>Processing routine...</Text>
      </View>
    );
  }

  if (showInstructions) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.infoButton} />
          <Text style={styles.instructionsTitle}>How It Works</Text>
          <TouchableOpacity onPress={() => setShowInstructions(false)} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#71717a" />
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.instructionsContainer}
          contentContainerStyle={styles.instructionsContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepsContainer}>
            <View style={styles.stepCard}>
              <View style={styles.stepCardHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>1</Text>
                </View>
                <Text style={styles.stepCardTitle}>Plan Your Program</Text>
              </View>
              <Text style={styles.stepCardDescription}>
                Send this prompt to your AI of choice
              </Text>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={async () => {
                  const planningPrompt = `You are a fitness coach helping users design a workout program for a fitness app called 'JSON'.

# Workout Program Planning

Help me design a workout program by asking about:

- Days per week I can commit to
- Primary goal (muscle growth, strength, fat loss, athletic performance, general fitness)
- Experience level (beginner, intermediate, advanced)
- Equipment access (full gym, home gym, dumbbells only, bodyweight only)
- Normal session length (when I have full time)
- Quick session length (when I'm rushed)
- Program duration (4 weeks, 8 weeks, 12 weeks, 52 weeks)
- Any injuries or limitations
- Priority muscle groups or weak points
- Exercises I love or want included
- Exercises I hate or want to avoid

Once you have all the information, output this EXACT format:

---
**PROGRAM SPECS**
- Days/week: [number]
- Goal: [goal]
- Experience: [beginner/intermediate/advanced]
- Equipment: [full gym/home gym/dumbbells only/bodyweight]
- Normal session: [X minutes]
- Quick session: [X minutes]
- Program length: [X weeks]
- Injuries/limitations: [list or "none"]
- Priority areas: [muscle groups or "balanced"]
- Include exercises: [list or "no preference"]
- Exclude exercises: [list or "none"]

**RECOMMENDED APPROACH**
- Split: [e.g., "Push Pull Legs", "Upper Lower", "Full Body"]
- Block structure: [e.g., "4-week blocks alternating volume and intensity phases"]
- Progression style: [e.g., "Weekly rep decrease with weight increase" or "Linear progression"]
- Rest strategy: [e.g., "2-3 min compounds / 60-90 sec isolation, Quick mode: 60-90 sec all"]
- Coaching notes: [e.g., "Detailed form cues for all exercises" or "Minimal notes for experienced lifter"]
---

Confirm these specs are correct. Once the user approves, await further instructions for generating the program.`;
                  
                  await Clipboard.setStringAsync(planningPrompt);
                  setPlanningPromptCopied(true);
                  setTimeout(() => {
                    setPlanningPromptCopied(false);
                  }, 2000);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="copy-outline" size={18} color="#0a0a0b" />
                <Text style={styles.actionButtonText}>
                  {planningPromptCopied ? 'Copied!' : 'Copy Planning Prompt'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.stepCard}>
              <View style={styles.stepCardHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>2</Text>
                </View>
                <Text style={styles.stepCardTitle}>Generate Workout</Text>
              </View>
              <Text style={styles.stepCardDescription}>
                Send this prompt to convert your plan to a JSON format
              </Text>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={async () => {
                  const prompt = getAIPrompt();
                  await Clipboard.setStringAsync(prompt);
                  setAiPromptCopied(true);
                  setTimeout(() => {
                    setAiPromptCopied(false);
                  }, 2000);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles" size={18} color="#0a0a0b" />
                <Text style={styles.actionButtonText}>
                  {aiPromptCopied ? 'Copied!' : 'Copy AI Prompt'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.stepCard}>
              <View style={styles.stepCardHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>3</Text>
                </View>
                <Text style={styles.stepCardTitle}>Import & Train</Text>
              </View>
              <Text style={styles.stepCardDescription}>
                Copy the JSON file your AI created and paste it in
              </Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.tutorialSection}>
            <Text style={styles.tutorialSectionTitle}>Need Help?</Text>
            <TouchableOpacity 
              style={styles.tutorialButton}
              onPress={() => {
                // TODO: Open YouTube video
                console.log('Open YouTube tutorial');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={18} color="#ffffff" />
              <Text style={styles.tutorialButtonText}>Watch Tutorial</Text>
              <Text style={styles.tutorialButtonSubtext}>60 seconds</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }


  if (errorMessage) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorHeader}>
          <View style={styles.infoButton} />
          <TouchableOpacity 
            onPress={() => setErrorMessage(null)} 
            style={styles.closeButton}
          >
            <Ionicons name="close" size={28} color="#71717a" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.errorContent}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Format Error</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          
          <TouchableOpacity
            style={styles.copyErrorButton}
            onPress={async () => {
              const debugMessage = `I got this error when trying to import my workout: "${errorMessage}". Please fix the JSON and make sure it follows the exact format.`;
              await Clipboard.setStringAsync(debugMessage);
              
              // Just dismiss error - no copied screen needed
              setErrorMessage(null);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="copy-outline" size={20} color="#0a0a0b" />
            <Text style={styles.copyErrorText}>Copy Error for AI</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.infoButton}
          onPress={() => setShowInstructions(true)}
        >
          <Ionicons name="information-circle-outline" size={24} color="#71717a" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#71717a" />
        </TouchableOpacity>
        
        <View style={styles.centerContainer}>
          <TouchableOpacity 
            style={styles.pasteButton}
            onPress={handlePasteAndImport}
            activeOpacity={0.9}
          >
            <Ionicons name="clipboard" size={32} color="#0a0a0b" />
            <Text style={styles.pasteButtonText}>Paste & Import</Text>
            <Text style={styles.pasteButtonSubtext}>Tap to paste your workout</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.testSection}>
          <Text style={styles.testSectionTitle}>Want to try it first?</Text>
          <TouchableOpacity 
            style={styles.testButton}
            onPress={handleCopySample}
            activeOpacity={0.8}
          >
            <Ionicons name="flash" size={18} color="#71717a" />
            <Text style={styles.testButtonText}>
              {sampleCopied ? 'Sample Copied!' : 'Copy Sample Workout'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.testInstructions}>
            Copy sample → tap Paste & Import above → see it work!
          </Text>
        </View>
      </View>

      <Modal
        visible={showConfirmation}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Routine?</Text>
            <Text style={styles.routineName}>{parsedProgram?.routine_name}</Text>
            <Text style={styles.routineDetails}>
              {parsedProgram?.days_per_week} days • {parsedProgram?.blocks.length} blocks
            </Text>
            {parsedProgram?.description && (
              <Text style={styles.routineDescription}>{parsedProgram.description}</Text>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowConfirmation(false);
                  setParsedProgram(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmImport}
              >
                <Text style={styles.confirmButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  pasteButton: {
    backgroundColor: '#22d3ee',
    borderRadius: 4,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 280,
  },
  pasteButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0a0a0b',
    marginTop: 12,
  },
  pasteButtonSubtext: {
    fontSize: 14,
    color: '#0a0a0b',
    opacity: 0.7,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#71717a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#18181b',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 24,
    width: '85%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  routineName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#22d3ee',
    marginBottom: 8,
  },
  routineDetails: {
    fontSize: 16,
    color: '#71717a',
    marginBottom: 8,
  },
  routineDescription: {
    fontSize: 14,
    color: '#52525b',
    marginTop: 8,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#27272a',
  },
  confirmButton: {
    backgroundColor: '#22d3ee',
  },
  cancelButtonText: {
    color: '#71717a',
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#0a0a0b',
    fontWeight: '600',
  },
  instructionsContainer: {
    flex: 1,
  },
  instructionsContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    flex: 1,
  },
  stepsContainer: {
    flex: 1,
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
    backgroundColor: '#22d3ee',
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
    backgroundColor: '#22d3ee',
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
  divider: {
    height: 1,
    backgroundColor: '#27272a',
    marginVertical: 24,
  },
  tutorialSection: {
    alignItems: 'center',
    paddingBottom: 8,
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
    backgroundColor: '#22d3ee',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  tutorialButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  tutorialButtonSubtext: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
    marginLeft: 4,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  errorHeader: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  copyErrorButton: {
    flexDirection: 'row',
    backgroundColor: '#22d3ee',
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  copyErrorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  testSection: {
    position: 'absolute',
    bottom: 40,
    left: 32,
    right: 32,
    alignItems: 'center',
  },
  testSectionTitle: {
    fontSize: 14,
    color: '#52525b',
    marginBottom: 12,
    textAlign: 'center',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  testButtonText: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
  },
  testInstructions: {
    fontSize: 11,
    color: '#3f3f46',
    textAlign: 'center',
    opacity: 0.8,
  },
});