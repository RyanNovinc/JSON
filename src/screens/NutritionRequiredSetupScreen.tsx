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

// ── Helper ────────────────────────────────────────────────────────

function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function NutritionRequiredSetupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor } = useTheme();
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
        showResults: isCompleted,
      });
    } else if (questionnaire.id === 'sleep') {
      const isCompleted = completionStatus[questionnaire.completionKey];
      navigation.navigate(questionnaire.navigationTarget as any, {
        showResults: isCompleted,
      });
    } else {
      navigation.navigate(questionnaire.navigationTarget as any);
    }
  };

  const completedCount = [
    completionStatus.nutritionGoals,
    completionStatus.budgetCooking,
    completionStatus.sleepOptimization,
  ].filter(Boolean).length;
  const totalQuestionnaires = requiredQuestionnaires.length;
  const allCompleted = completedCount === totalQuestionnaires;

  const renderQuestionnaireCard = (questionnaire: QuestionnaireCard) => {
    const isCompleted = completionStatus[questionnaire.completionKey];

    return (
      <TouchableOpacity
        key={questionnaire.id}
        style={[
          styles.setupItem,
          {
            backgroundColor: isCompleted ? hexA(themeColor, 0.05) : '#0a0a0f',
            borderColor: isCompleted
              ? hexA(themeColor, 0.3)
              : 'rgba(255,255,255,0.05)',
          },
        ]}
        onPress={() => handleQuestionnairePress(questionnaire)}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isCompleted
                ? hexA(themeColor, 0.15)
                : 'rgba(255,255,255,0.04)',
              borderColor: isCompleted
                ? hexA(themeColor, 0.3)
                : 'rgba(255,255,255,0.06)',
            },
          ]}
        >
          <Ionicons
            name={isCompleted ? 'checkmark' : (questionnaire.icon as any)}
            size={22}
            color={isCompleted ? themeColor : '#9898a4'}
          />
        </View>

        <View style={styles.itemDetails}>
          <View style={styles.itemTitleRow}>
            <Text style={styles.itemTitle}>{questionnaire.title}</Text>
            {isCompleted && (
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: hexA(themeColor, 0.15),
                    borderColor: hexA(themeColor, 0.4),
                  },
                ]}
              >
                <Text style={[styles.statusPillText, { color: themeColor }]}>DONE</Text>
              </View>
            )}
          </View>
          <Text style={styles.itemDescription}>{questionnaire.description}</Text>
        </View>

        <View style={styles.itemAction}>
          {isCompleted ? (
            <Ionicons name="chevron-forward" size={18} color="#55555f" />
          ) : (
            <View
              style={[
                styles.startButton,
                {
                  borderColor: hexA(themeColor, 0.4),
                  backgroundColor: hexA(themeColor, 0.08),
                },
              ]}
            >
              <Text style={[styles.startButtonText, { color: themeColor }]}>START</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerLabel}>SETUP</Text>
          <View style={styles.backButtonSpacer} />
        </View>

        {/* Title block */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Profile setup</Text>
          <Text style={styles.subtitle}>
            {allCompleted
              ? 'ALL REQUIRED STEPS COMPLETE'
              : `${completedCount} OF ${totalQuestionnaires} COMPLETE`}
          </Text>
        </View>

        <View style={styles.content}>
          {/* Completion banner */}
          {allCompleted && (
            <View
              style={[
                styles.completionBanner,
                {
                  backgroundColor: hexA(themeColor, 0.06),
                  borderColor: hexA(themeColor, 0.3),
                },
              ]}
            >
              <View
                style={[
                  styles.completionIconWrap,
                  {
                    backgroundColor: hexA(themeColor, 0.15),
                    borderColor: hexA(themeColor, 0.4),
                  },
                ]}
              >
                <Ionicons name="checkmark" size={16} color={themeColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.completionTitle, { color: themeColor }]}>
                  Profile setup complete
                </Text>
                <Text style={styles.completionSubtitle}>READY TO GENERATE MEAL PLANS</Text>
              </View>
            </View>
          )}

          {/* Questionnaire items */}
          {requiredQuestionnaires.map((questionnaire) =>
            renderQuestionnaireCard(questionnaire)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonSpacer: {
    width: 38,
    height: 38,
  },
  headerLabel: {
    color: '#9898a4',
    fontSize: 11,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
  },

  // Title block
  titleBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  title: {
    color: '#f0f0f2',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontFamily: 'Outfit-Bold',
    lineHeight: 30,
  },
  subtitle: {
    color: '#55555f',
    fontSize: 11,
    letterSpacing: 1.3,
    marginTop: 6,
    fontFamily: 'DMMono-Medium',
  },

  // Content
  content: {
    paddingHorizontal: 16,
  },

  // Completion banner
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  completionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
    letterSpacing: -0.2,
  },
  completionSubtitle: {
    color: '#55555f',
    fontSize: 9,
    letterSpacing: 1.3,
    marginTop: 2,
    fontFamily: 'DMMono-Medium',
  },

  // Questionnaire item rows
  setupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
    gap: 4,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f0f0f2',
    letterSpacing: -0.2,
    fontFamily: 'Outfit-SemiBold',
  },
  itemDescription: {
    fontSize: 12,
    color: '#9898a4',
    lineHeight: 16,
    fontFamily: 'Outfit-Regular',
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 8,
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
  },
  itemAction: {
    paddingLeft: 4,
  },
  startButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
  },
  startButtonText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
  },
});