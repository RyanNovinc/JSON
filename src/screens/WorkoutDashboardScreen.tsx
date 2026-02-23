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
import AsyncStorage from '@react-native-async-storage/async-storage';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface WorkoutCompletionStatus {
  fitnessGoals: boolean;
  equipmentPreferences: boolean;
}

interface QuestionnaireCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  navigationTarget: string;
  completionKey?: keyof WorkoutCompletionStatus; // Optional for management screens
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
    id: 'equipmentPreferences',
    title: 'Equipment & Preferences',
    subtitle: 'Setup & exercise preferences',
    description: 'Equipment, time, exercise likes/dislikes',
    icon: 'barbell-outline',
    navigationTarget: 'EquipmentPreferencesQuestionnaire',
    completionKey: 'equipmentPreferences',
  },
  {
    id: 'favoriteExercises',
    title: 'Favorite Exercises',
    subtitle: 'Manage your exercise library',
    description: 'Add and organize exercises you love',
    icon: 'heart-outline',
    navigationTarget: 'FavoriteExercises',
    // No completionKey - this is a management screen, not completable
  },
];

export default function WorkoutDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor, themeColorLight } = useTheme();
  const [completionStatus, setCompletionStatus] = useState<WorkoutCompletionStatus>({
    fitnessGoals: false,
    equipmentPreferences: false,
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
      // Check if fitness goals questionnaire is completed
      const fitnessGoalsDataString = await AsyncStorage.getItem('fitnessGoalsData');
      let fitnessGoalsCompleted = false;
      
      if (fitnessGoalsDataString) {
        const fitnessGoalsData = JSON.parse(fitnessGoalsDataString);
        fitnessGoalsCompleted = !!(fitnessGoalsData && fitnessGoalsData.completedAt);
      }

      // Check if equipment preferences questionnaire is completed
      const equipmentPreferencesDataString = await AsyncStorage.getItem('equipmentPreferencesData');
      let equipmentPreferencesCompleted = false;
      
      if (equipmentPreferencesDataString) {
        const equipmentPreferencesData = JSON.parse(equipmentPreferencesDataString);
        equipmentPreferencesCompleted = !!(equipmentPreferencesData && equipmentPreferencesData.completedAt);
      }

      const completionStatus: WorkoutCompletionStatus = {
        fitnessGoals: fitnessGoalsCompleted,
        equipmentPreferences: equipmentPreferencesCompleted,
      };
      setCompletionStatus(completionStatus);
    } catch (error) {
      console.error('Failed to load workout completion status:', error);
      // Set default values on error
      setCompletionStatus({
        fitnessGoals: false,
        equipmentPreferences: false,
      });
    }
  };

  const handleQuestionnairePress = (questionnaire: QuestionnaireCard) => {
    if (questionnaire.id === 'fitnessGoals') {
      navigation.navigate('FitnessGoalsQuestionnaire' as any);
    } else if (questionnaire.id === 'equipmentPreferences') {
      navigation.navigate('EquipmentPreferencesQuestionnaire' as any);
    } else if (questionnaire.id === 'favoriteExercises') {
      navigation.navigate('FavoriteExercises' as any);
    } else {
      // Fallback for any future questionnaires
      alert(`${questionnaire.title} questionnaire coming soon!`);
    }
  };

  const renderQuestionnaireCard = (questionnaire: QuestionnaireCard, index: number) => {
    const isCompleted = questionnaire.completionKey ? completionStatus[questionnaire.completionKey] : false;
    const isManagementScreen = !questionnaire.completionKey;
    
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
          {isManagementScreen ? (
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color="#71717a"
            />
          ) : isCompleted ? (
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
              {isManagementScreen ? questionnaire.description : 
               isCompleted ? 'Completed' : questionnaire.description}
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

  // Count completed questionnaires (exclude management screens)
  const completedCount = Object.values(completionStatus).filter(Boolean).length;
  const totalQuestionnaires = questionnaires.filter(q => q.completionKey).length;

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