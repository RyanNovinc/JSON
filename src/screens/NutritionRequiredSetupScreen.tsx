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
import { WorkoutStorage, NutritionCompletionStatus } from '../utils/storage';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface QuestionnaireCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  navigationTarget: string;
  completionKey: keyof NutritionCompletionStatus;
}

const requiredQuestionnaires: QuestionnaireCard[] = [
  {
    id: 'nutrition',
    title: 'Nutrition Goals',
    description: 'Set your macro targets',
    icon: 'nutrition-outline',
    navigationTarget: 'NutritionQuestionnaire',
    completionKey: 'nutritionGoals',
  },
  {
    id: 'budget',
    title: 'Budget Cooking',
    description: 'Meal planning preferences',
    icon: 'restaurant-outline',
    navigationTarget: 'BudgetCookingQuestionnaire',
    completionKey: 'budgetCooking',
  },
  {
    id: 'sleep',
    title: 'Sleep Optimization',
    description: 'Meal timing & sleep',
    icon: 'moon-outline',
    navigationTarget: 'SleepOptimizationScreen',
    completionKey: 'sleepOptimization',
  },
];

export default function NutritionRequiredSetupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor, themeColorLight } = useTheme();
  const [completionStatus, setCompletionStatus] = useState<NutritionCompletionStatus>({
    nutritionGoals: false,
    budgetCooking: false,
    sleepOptimization: false,
    fridgePantry: false,
    favoriteMeals: false,
  });

  useEffect(() => {
    loadCompletionStatus();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadCompletionStatus();
    }, [])
  );

  const loadCompletionStatus = async () => {
    try {
      const status = await WorkoutStorage.loadNutritionCompletionStatus();
      setCompletionStatus(status);
    } catch (error) {
      console.error('Failed to load completion status:', error);
    }
  };

  const handleQuestionnairePress = (questionnaire: QuestionnaireCard) => {
    if (questionnaire.id === 'nutrition') {
      const isCompleted = completionStatus[questionnaire.completionKey];
      navigation.navigate(questionnaire.navigationTarget as any, {
        showResults: isCompleted
      });
    } else if (questionnaire.id === 'sleep') {
      const isCompleted = completionStatus[questionnaire.completionKey];
      navigation.navigate(questionnaire.navigationTarget as any, {
        showResults: isCompleted
      });
    } else {
      navigation.navigate(questionnaire.navigationTarget as any);
    }
  };

  const renderQuestionnaireCard = (questionnaire: QuestionnaireCard, index: number) => {
    const isCompleted = completionStatus[questionnaire.completionKey];
    
    return (
      <TouchableOpacity
        key={questionnaire.id}
        style={[
          styles.setupItem,
          isCompleted && {
            backgroundColor: themeColor === '#ec4899' ? '#1f1325' : 
                           themeColor === '#22d3ee' ? '#1e2238' :
                           themeColor === '#10b981' ? '#0f1611' : '#1f1325',
            borderColor: themeColor + '20',
          },
          { borderLeftColor: isCompleted ? themeColor : '#27272a' }
        ]}
        onPress={() => handleQuestionnairePress(questionnaire)}
        activeOpacity={0.8}
      >
        <View style={styles.setupItemContent}>
          <View style={[
            styles.iconContainer,
            { backgroundColor: isCompleted ? themeColor + '20' : '#27272a' }
          ]}>
            <Ionicons 
              name={questionnaire.icon as any} 
              size={24} 
              color={isCompleted ? themeColor : '#71717a'} 
            />
          </View>
          
          <View style={styles.itemDetails}>
            <Text style={styles.itemTitle}>{questionnaire.title}</Text>
            <Text style={styles.itemDescription}>{questionnaire.description}</Text>
            {isCompleted && (
              <View style={styles.completedIndicator}>
                <Ionicons name="checkmark" size={16} color={themeColor} />
                <Text style={[styles.completedText, { color: themeColor }]}>
                  Completed
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.itemAction}>
            {isCompleted ? (
              <Ionicons name="chevron-forward" size={20} color="#71717a" />
            ) : (
              <View style={[styles.actionButton, { borderColor: themeColor }]}>
                <Text style={[styles.actionButtonText, { color: themeColor }]}>
                  Start
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const completedCount = [
    completionStatus.nutritionGoals,
    completionStatus.budgetCooking,
    completionStatus.sleepOptimization
  ].filter(Boolean).length;
  const totalQuestionnaires = requiredQuestionnaires.length;
  const allCompleted = completedCount === totalQuestionnaires;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Profile Setup</Text>
            {!allCompleted && (
              <Text style={styles.subtitle}>
                {completedCount}/{totalQuestionnaires} completed
              </Text>
            )}
          </View>
        </View>

        {allCompleted && (
          <View style={[styles.completionBanner, { backgroundColor: themeColor + '20' }]}>
            <Ionicons name="checkmark-circle" size={24} color={themeColor} />
            <Text style={[styles.completionText, { color: themeColor }]}>
              Profile setup complete - Ready to generate!
            </Text>
          </View>
        )}

        <View style={styles.content}>
          {requiredQuestionnaires.map((questionnaire, index) => 
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
  },
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    gap: 12,
  },
  completionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  setupItem: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    borderLeftWidth: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  setupItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#71717a',
    lineHeight: 20,
  },
  completedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemAction: {
    marginLeft: 12,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});