import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Switch,
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
  completedCount?: number;
  totalCount?: number;
}

const groups: GroupCard[] = [
  {
    id: 'requiredSetup',
    title: 'Profile Setup',
    description: 'Required to generate meal plans',
    icon: 'checkmark-circle-outline',
    type: 'required',
    navigationTarget: 'NutritionRequiredSetup',
  },
  {
    id: 'optionalTools',
    title: 'Profile Tools',
    description: 'Optional - Manage your nutrition preferences',
    icon: 'heart-outline',
    type: 'optional',
    navigationTarget: 'NutritionOptionalTools',
  },
];

export default function NutritionDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor, themeColorLight } = useTheme();
  const { customerInfo, purchasePackage } = useRevenueCat();
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

  // Reload data when screen comes into focus
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

  const renderGroupCard = (group: GroupCard, index: number) => {
    let displayDescription = group.description;
    let statusColor = '#71717a';
    let isCompleted = false;
    
    if (group.type === 'required') {
      const completedCount = [
        completionStatus.nutritionGoals,
        completionStatus.budgetCooking,
        completionStatus.sleepOptimization
      ].filter(Boolean).length;
      const totalCount = 3; // We have 3 required questionnaires
      isCompleted = completedCount === totalCount;
      
      if (isCompleted) {
        displayDescription = '';
        statusColor = themeColor;
      } else {
        displayDescription = 'Complete your nutrition profile';
      }
    } else {
      displayDescription = 'Optional - Manage your nutrition preferences';
    }
    
    return (
      <TouchableOpacity
        key={group.id}
        style={[
          styles.card,
          group.type === 'required' ? {
            ...styles.requiredCard,
            borderColor: themeColor
          } : styles.optionalCard,
          isCompleted && group.type === 'required' && {
            ...styles.completedCard,
            borderColor: themeColor,
            backgroundColor: themeColor === '#ec4899' ? '#1f1325' : 
                           themeColor === '#22d3ee' ? '#1e2238' :
                           themeColor === '#10b981' ? '#0f1611' : '#1f1325'
          }
        ]}
        activeOpacity={0.8}
        onPress={() => handleGroupPress(group)}
      >
        {isCompleted && group.type === 'required' && (
          <View style={[styles.completeBadge, { backgroundColor: themeColor }]}>
            <Ionicons name="checkmark" size={16} color="#0a0a0b" />
            <Text style={styles.completeBadgeText}>COMPLETE</Text>
          </View>
        )}
        
        {group.type === 'optional' && (
          <View style={styles.optionalBadge}>
            <Text style={styles.optionalBadgeText}>OPTIONAL</Text>
          </View>
        )}
        
        <View style={styles.cardContent}>
          <View style={styles.cardIcon}>
            <Ionicons 
              name={isCompleted && group.type === 'required' ? "checkmark-circle" : group.icon as any}
              size={48} 
              color={group.type === 'required' ? themeColor : '#71717a'}
            />
          </View>
          
          <Text style={styles.cardTitle}>
            {group.title}
          </Text>
          
          <Text style={[styles.cardDescription, { color: statusColor }]}>
            {displayDescription}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Only count actual questionnaires (exclude favoriteMeals)
  const completedCount = [
    completionStatus.nutritionGoals,
    completionStatus.budgetCooking, 
    completionStatus.sleepOptimization
  ].filter(Boolean).length;

  const totalQuestionnaires = 3; // Only 3 actual questionnaires
  
  // Check if all questionnaires are completed
  const allQuestionnairesCompleted = completedCount === totalQuestionnaires;
  
  const handleGeneratePrompt = () => {
    // COMPREHENSIVE LOGGING - Send this to Claude
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
      ENABLE_NUTRITION_PAYWALL: true, // Should be true
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
    // Navigate to the paywall screen with fade-in animation
    // Pass a flag to force show the paywall regardless of entitlement status
    navigation.navigate('Payment' as any, { forceShowPaywall: true });
  };

  // Check if user has nutrition access
  const userHasNutritionAccess = hasNutritionAccess(customerInfo);
  
  // Debug logging
  console.log('[NutritionDashboard] Debug info:', {
    customerInfo: customerInfo ? 'present' : 'null',
    hasAccess: userHasNutritionAccess,
    entitlements: customerInfo?.entitlements?.active ? Object.keys(customerInfo.entitlements.active) : 'none',
    ENABLE_NUTRITION_PAYWALL: REVENUECAT_CONFIG.debugMode,
  });
  
  // Use actual entitlement check (production ready)
  const actualHasAccess = __DEV__ && forceNoEntitlement ? false : userHasNutritionAccess;
  const shouldShowLocked = !actualHasAccess;

  return (
    <SafeAreaView style={styles.container}>
      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Nutrition Profile</Text>
            {completedCount < totalQuestionnaires && (
              <Text style={styles.headerSubtitle}>
                Complete your profile to generate meal plans
              </Text>
            )}
          </View>
        </View>

        {/* Group Cards */}
        <View style={styles.cardsContainer}>
          {groups.map((group, index) => 
            renderGroupCard(group, index)
          )}
        </View>

        {/* Generate Meal Plan Button - shown when all questionnaires are completed */}
        {allQuestionnairesCompleted && (
          <View style={styles.generatePromptContainer}>
            {!shouldShowLocked ? (
              // User has access - show normal generate button
              <TouchableOpacity 
                style={[styles.generatePromptButton, { backgroundColor: themeColor }]}
                onPress={handleGeneratePrompt}
                activeOpacity={0.8}
              >
                <Ionicons name="rocket" size={28} color="#ffffff" />
                <Text style={styles.generatePromptText}>Generate My Meal Plan</Text>
                <Ionicons name="chevron-forward" size={24} color="#ffffff" />
              </TouchableOpacity>
            ) : (
              // User doesn't have access - show locked generate button
              <TouchableOpacity 
                style={[styles.generatePromptButton, { backgroundColor: themeColor }]}
                onPress={handlePurchase}
                activeOpacity={0.8}
              >
                <Ionicons name="lock-closed" size={28} color="#ffffff" />
                <Text style={styles.generatePromptText}>Generate My Meal Plan</Text>
                <Ionicons name="chevron-forward" size={24} color="#ffffff" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.myMealPlansButton, { borderColor: themeColor }]}
              onPress={() => navigation.navigate('MyMealPlans')}
              activeOpacity={0.8}
            >
              <Ionicons name="heart" size={20} color={themeColor} />
              <Text style={[styles.myMealPlansText, { color: themeColor }]}>My Meal Plans</Text>
              <Ionicons name="chevron-down" size={20} color={themeColor} />
            </TouchableOpacity>
            
            {/* DEV ONLY: Testing button to toggle entitlement view */}
            {__DEV__ && (
              <TouchableOpacity 
                style={[styles.testButton, { 
                  backgroundColor: forceNoEntitlement ? '#ef4444' : '#22d3ee',
                  borderColor: forceNoEntitlement ? '#ef4444' : '#22d3ee'
                }]}
                onPress={() => setForceNoEntitlement(!forceNoEntitlement)}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={forceNoEntitlement ? "lock-closed" : "lock-open"} 
                  size={16} 
                  color="#ffffff" 
                />
                <Text style={styles.testButtonText}>
                  {forceNoEntitlement ? "TESTING: No Entitlement" : "TESTING: Has Entitlement"}
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
    backgroundColor: '#0a0a0b',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  cardsContainer: {
    paddingHorizontal: 20,
    gap: 20,
    flex: 1,
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    padding: 30,
    minHeight: 200,
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  requiredCard: {
    borderWidth: 2,
    backgroundColor: '#18181b',
  },
  optionalCard: {
    borderWidth: 1,
    borderColor: '#3f3f46',
    backgroundColor: '#18181b',
  },
  completedCard: {
    backgroundColor: '#1f1325',
  },
  completeBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  completeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0a0a0b',
    letterSpacing: 0.5,
  },
  optionalBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: '#3f3f46',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  optionalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  cardContent: {
    alignItems: 'center',
  },
  cardIcon: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  generatePromptContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
  },
  generatePromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
  },
  generatePromptText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  myMealPlansButton: {
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    gap: 8,
  },
  myMealPlansText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
    flex: 1,
    textAlign: 'center',
  },
  testButton: {
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});