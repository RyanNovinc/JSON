import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutStorage } from '../utils/storage';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface WorkoutCompletionStatus {
  fitnessGoals: boolean;
  experienceLevel: boolean;
  availableEquipment: boolean;
  timeAvailability: boolean;
  workoutPreferences: boolean;
}

interface QuestionnaireCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  navigationTarget: string;
  completionKey: keyof WorkoutCompletionStatus;
}

const questionnaires: QuestionnaireCard[] = [
  {
    id: 'fitnessGoals',
    title: 'Fitness Goals',
    subtitle: 'Set your objectives',
    description: 'Weight loss, muscle gain, strength, etc.',
    icon: 'trophy-outline',
    navigationTarget: 'FitnessGoalsQuestionnaire',
    completionKey: 'fitnessGoals',
  },
  {
    id: 'experienceLevel',
    title: 'Experience Level',
    subtitle: 'Your fitness background',
    description: 'Beginner, intermediate, or advanced',
    icon: 'school-outline',
    navigationTarget: 'ExperienceLevelQuestionnaire',
    completionKey: 'experienceLevel',
  },
  {
    id: 'availableEquipment',
    title: 'Available Equipment',
    subtitle: 'What you have access to',
    description: 'Home gym, commercial gym, bodyweight',
    icon: 'barbell-outline',
    navigationTarget: 'AvailableEquipmentQuestionnaire',
    completionKey: 'availableEquipment',
  },
  {
    id: 'timeAvailability',
    title: 'Time Availability',
    subtitle: 'How long you can workout',
    description: '30 mins, 45 mins, 60+ mins per session',
    icon: 'time-outline',
    navigationTarget: 'TimeAvailabilityQuestionnaire',
    completionKey: 'timeAvailability',
  },
  {
    id: 'workoutPreferences',
    title: 'Workout Preferences',
    subtitle: 'Training style & frequency',
    description: 'Split type, workout frequency, etc.',
    icon: 'calendar-outline',
    navigationTarget: 'WorkoutPreferencesQuestionnaire',
    completionKey: 'workoutPreferences',
  },
];

export default function WorkoutDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor, themeColorLight } = useTheme();
  const [completionStatus, setCompletionStatus] = useState<WorkoutCompletionStatus>({
    fitnessGoals: false,
    experienceLevel: false,
    availableEquipment: false,
    timeAvailability: false,
    workoutPreferences: false,
  });

  useEffect(() => {
    loadCompletionStatus();
  }, []);

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadCompletionStatus();
    }, [])
  );

  const loadCompletionStatus = async () => {
    try {
      // For now, we'll use placeholder logic
      // In the future, this would load from actual questionnaire completion data
      const mockCompletionStatus: WorkoutCompletionStatus = {
        fitnessGoals: false,
        experienceLevel: false,
        availableEquipment: false,
        timeAvailability: false,
        workoutPreferences: false,
      };
      setCompletionStatus(mockCompletionStatus);
    } catch (error) {
      console.error('Failed to load workout completion status:', error);
    }
  };

  const handleQuestionnairePress = (questionnaire: QuestionnaireCard) => {
    if (questionnaire.id === 'fitnessGoals') {
      navigation.navigate('FitnessGoalsQuestionnaire' as any);
    } else {
      // For other questionnaires, show coming soon alert
      alert(`${questionnaire.title} questionnaire coming soon!`);
    }
  };

  const renderQuestionnaireCard = (questionnaire: QuestionnaireCard, index: number) => {
    const isCompleted = completionStatus[questionnaire.completionKey];
    
    return (
      <TouchableOpacity
        key={questionnaire.id}
        style={[styles.card, { 
          borderColor: themeColor, 
          shadowColor: themeColor 
        }]}
        activeOpacity={0.8}
        onPress={() => handleQuestionnairePress(questionnaire)}
      >
        {/* Completion Status Indicator */}
        <View style={styles.statusContainer}>
          {isCompleted ? (
            <Ionicons 
              name="checkmark-circle" 
              size={24} 
              color={themeColor}
            />
          ) : (
            <View style={[styles.incompleteCircle, { borderColor: '#71717a' }]} />
          )}
        </View>
        
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name={questionnaire.icon as any} 
              size={32} 
              color={themeColor}
            />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[styles.cardTitle, { textShadowColor: themeColorLight }]}>
              {questionnaire.title}
            </Text>
            <Text style={styles.cardSubtitle}>
              {questionnaire.subtitle}
            </Text>
            <Text style={[styles.cardDescription, { color: isCompleted ? themeColor : '#71717a' }]}>
              {isCompleted ? 'Completed' : questionnaire.description}
            </Text>
          </View>
          
          <View style={styles.arrowContainer}>
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color="#71717a"
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Count completed questionnaires
  const completedCount = Object.values(completionStatus).filter(Boolean).length;
  const totalQuestionnaires = questionnaires.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Scrollable Content */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColor} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Workout Setup</Text>
            <Text style={styles.headerSubtitle}>
              {completedCount}/{totalQuestionnaires} questionnaires completed
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
                  width: `${(completedCount / totalQuestionnaires) * 100}%`
                }
              ]} 
            />
          </View>
        </View>

        {/* Questionnaire Cards */}
        <View style={styles.cardsContainer}>
          {questionnaires.map((questionnaire, index) => 
            renderQuestionnaireCard(questionnaire, index)
          )}
        </View>
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
    fontSize: 28,
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
  cardsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#22d3ee',
    padding: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statusContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  incompleteCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    paddingRight: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textShadowOpacity: 0.3,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    fontWeight: '600',
  },
  arrowContainer: {
    marginLeft: 'auto',
  },
});