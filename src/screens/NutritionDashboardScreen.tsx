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
import { useRevenueCat } from '../contexts/RevenueCatContext';
import { hasNutritionAccess, REVENUECAT_CONFIG } from '../config/revenueCatConfig';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface GroupCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'required' | 'optional';
  navigationTarget?: string;
}

const groups: GroupCard[] = [
  {
    id: 'requiredSetup',
    title: 'Profile Setup',
    description: 'Required to generate meal plans',
    icon: 'restaurant-outline',
    type: 'required',
    navigationTarget: 'NutritionRequiredSetup',
  },
  {
    id: 'optionalTools',
    title: 'Profile Tools',
    description: 'Manage your nutrition preferences',
    icon: 'options-outline',
    type: 'optional',
    navigationTarget: 'NutritionOptionalTools',
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

export default function NutritionDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor } = useTheme();
  const { customerInfo } = useRevenueCat();
  const [completionStatus, setCompletionStatus] = useState<NutritionCompletionStatus>({
    nutritionGoals: false,
    budgetCooking: false,
    sleepOptimization: false,
    fridgePantry: false,
    favoriteMeals: false,
  });

  // DEV ONLY: Toggle entitlement view for testing
  const [forceNoEntitlement, setForceNoEntitlement] = useState(false);

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

  const handleGroupPress = (group: GroupCard) => {
    if (group.navigationTarget) {
      navigation.navigate(group.navigationTarget as any);
    }
  };

  // Only count actual questionnaires (exclude favoriteMeals, fridgePantry)
  const completedCount = [
    completionStatus.nutritionGoals,
    completionStatus.budgetCooking,
    completionStatus.sleepOptimization,
  ].filter(Boolean).length;

  const totalQuestionnaires = 3;
  const allQuestionnairesCompleted = completedCount === totalQuestionnaires;

  // Entitlement check
  const userHasNutritionAccess = hasNutritionAccess(customerInfo);
  const actualHasAccess = __DEV__ && forceNoEntitlement ? false : userHasNutritionAccess;
  const shouldShowLocked = !actualHasAccess;

  const handleGeneratePrompt = () => {
    console.log('🔥 [GENERATE BUTTON CLICKED] Full Debug Report:');
    console.log('==========================================');
    console.log('📱 App State:', {
      timestamp: new Date().toISOString(),
      userHasNutritionAccess,
      shouldShowLocked,
    });
    console.log('🔐 RevenueCat Customer Info:', {
      customerInfo: customerInfo ? 'EXISTS' : 'NULL',
      originalAppUserId: customerInfo?.originalAppUserId || 'MISSING',
      entitlements: customerInfo?.entitlements || 'MISSING',
      activeEntitlements: customerInfo?.entitlements?.active || 'MISSING',
      activeEntitlementKeys: customerInfo?.entitlements?.active ? Object.keys(customerInfo.entitlements.active) : 'MISSING',
      allEntitlements: customerInfo?.entitlements?.all || 'MISSING',
    });
    console.log('⚙️ Config Check:', {
      ENABLE_NUTRITION_PAYWALL: true,
      expectedEntitlement: 'JSON Pro',
      checkingFor: 'nutrition_access entitlement',
    });
    console.log('🧪 Entitlement Logic:', {
      hasNutritionAccessResult: userHasNutritionAccess,
      shouldShowLockedResult: shouldShowLocked,
      logicUsed: '!userHasNutritionAccess',
    });
    console.log('==========================================');

    navigation.navigate('ImportMealPlan', { showStep1New: true });
  };

  const handlePurchase = () => {
    navigation.navigate('Payment' as any, { forceShowPaywall: true });
  };

  const renderGroupCard = (group: GroupCard) => {
    const isRequired = group.type === 'required';
    const isCompleted = isRequired && allQuestionnairesCompleted;

    const cardBorder = isCompleted
      ? hexA(themeColor, 0.5)
      : isRequired
        ? hexA(themeColor, 0.2)
        : 'rgba(255,255,255,0.05)';

    const cardBg = isCompleted
      ? hexA(themeColor, 0.05)
      : '#0a0a0f';

    return (
      <TouchableOpacity
        key={group.id}
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
          },
        ]}
        activeOpacity={0.85}
        onPress={() => handleGroupPress(group)}
      >
        {/* Status pill — top right */}
        {isCompleted ? (
          <View style={[styles.statusPill, { backgroundColor: hexA(themeColor, 0.15), borderColor: hexA(themeColor, 0.4) }]}>
            <Ionicons name="checkmark" size={11} color={themeColor} />
            <Text style={[styles.statusPillText, { color: themeColor }]}>DONE</Text>
          </View>
        ) : isRequired ? (
          <View style={[styles.statusPill, { backgroundColor: 'rgba(247,178,32,0.1)', borderColor: 'rgba(247,178,32,0.3)' }]}>
            <Text style={[styles.statusPillText, { color: '#f7b220' }]}>REQUIRED</Text>
          </View>
        ) : (
          <View style={[styles.statusPill, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }]}>
            <Text style={[styles.statusPillText, { color: '#9898a4' }]}>OPTIONAL</Text>
          </View>
        )}

        {/* Card content (centered) */}
        <View style={styles.cardContent}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isRequired
                  ? hexA(themeColor, 0.12)
                  : 'rgba(255,255,255,0.04)',
                borderColor: isRequired
                  ? hexA(themeColor, 0.3)
                  : 'rgba(255,255,255,0.08)',
              },
            ]}
          >
            <Ionicons
              name={isCompleted ? 'checkmark' : (group.icon as any)}
              size={32}
              color={isRequired ? themeColor : '#9898a4'}
            />
          </View>

          <Text style={styles.cardTitle}>{group.title}</Text>

          <Text style={styles.cardDescription}>
            {isCompleted ? 'Your nutrition profile is ready' : group.description}
          </Text>

          {/* Progress bar (only for incomplete required) */}
          {isRequired && !isCompleted && (
            <View style={styles.progressRow}>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${(completedCount / totalQuestionnaires) * 100}%`,
                      backgroundColor: themeColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {completedCount} / {totalQuestionnaires}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
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

          <Text style={styles.headerLabel}>NUTRITION</Text>
          <View style={styles.backButtonSpacer} />
        </View>

        {/* Title block */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Nutrition profile</Text>
          <Text style={styles.subtitle}>
            {allQuestionnairesCompleted
              ? 'READY TO GENERATE MEAL PLANS'
              : `${completedCount} OF ${totalQuestionnaires} REQUIRED COMPLETE`}
          </Text>
        </View>

        {/* Cards */}
        <View style={styles.cardsContainer}>
          {groups.map((group) => renderGroupCard(group))}
        </View>

        {/* Action buttons when all complete */}
        {allQuestionnairesCompleted && (
          <View style={styles.actionsContainer}>
            {!shouldShowLocked ? (
              <TouchableOpacity
                style={[styles.generatePromptButton, { backgroundColor: themeColor }]}
                onPress={handleGeneratePrompt}
                activeOpacity={0.85}
              >
                <Ionicons name="sparkles" size={18} color="#000" />
                <Text style={styles.generatePromptText}>Generate meal plan</Text>
                <Ionicons name="arrow-forward" size={18} color="#000" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.generatePromptButton, { backgroundColor: themeColor }]}
                onPress={handlePurchase}
                activeOpacity={0.85}
              >
                <Ionicons name="lock-closed" size={18} color="#000" />
                <Text style={styles.generatePromptText}>Generate meal plan</Text>
                <Ionicons name="arrow-forward" size={18} color="#000" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.myMealPlansButton}
              onPress={() => navigation.navigate('MyMealPlans')}
              activeOpacity={0.7}
            >
              <Ionicons name="bookmark-outline" size={17} color="#f0f0f2" />
              <Text style={styles.myMealPlansText}>My meal plans</Text>
              <Ionicons name="chevron-forward" size={17} color="#9898a4" />
            </TouchableOpacity>

            {/* DEV ONLY: Testing button to toggle entitlement view */}
            {__DEV__ && (
              <TouchableOpacity
                style={[
                  styles.testButton,
                  {
                    backgroundColor: forceNoEntitlement ? 'rgba(239,68,68,0.1)' : hexA(themeColor, 0.1),
                    borderColor: forceNoEntitlement ? 'rgba(239,68,68,0.3)' : hexA(themeColor, 0.3),
                  },
                ]}
                onPress={() => setForceNoEntitlement(!forceNoEntitlement)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={forceNoEntitlement ? 'lock-closed' : 'lock-open'}
                  size={13}
                  color={forceNoEntitlement ? '#ef4444' : themeColor}
                />
                <Text
                  style={[
                    styles.testButtonText,
                    { color: forceNoEntitlement ? '#ef4444' : themeColor },
                  ]}
                >
                  {forceNoEntitlement ? 'TESTING: NO ENTITLEMENT' : 'TESTING: HAS ENTITLEMENT'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
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
    paddingBottom: 24,
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

  // Cards — big tile style
  cardsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 32,
    paddingHorizontal: 24,
    minHeight: 200,
    justifyContent: 'center',
    position: 'relative',
  },
  statusPill: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 9,
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
  },
  cardContent: {
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f0f0f2',
    letterSpacing: -0.3,
    fontFamily: 'Outfit-Bold',
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 13,
    color: '#9898a4',
    fontFamily: 'Outfit-Regular',
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    width: '70%',
  },
  progressBarTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: '#55555f',
    letterSpacing: 0.5,
    fontFamily: 'DMMono-Medium',
  },

  // Actions container (when all complete)
  actionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 10,
  },
  generatePromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  generatePromptText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.2,
    fontFamily: 'Outfit-SemiBold',
  },
  myMealPlansButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#0a0a0f',
    gap: 10,
  },
  myMealPlansText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f0f0f2',
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Outfit-Medium',
  },

  // Dev testing button
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  testButtonText: {
    fontSize: 10,
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
  },
});