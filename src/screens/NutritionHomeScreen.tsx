import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Share,
  Platform,
  Modal,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useAppMode } from '../contexts/AppModeContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';
import { WorkoutStorage, NutritionCompletionStatus, MealPlan } from '../utils/storage';
import { generateUserMealPlanPrompt } from '../data/generateUserMealPrompt';

type NutritionNavigationProp = StackNavigationProp<RootStackParamList, 'NutritionHome'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function MealPlanCard({ plan, onExport, onPress, onLongPress }: { 
  plan: MealPlan; 
  onExport: () => void;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { themeColor } = useTheme();
  
  return (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.8} 
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={800}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>{plan.name}</Text>
          <Text style={styles.cardSubtitle}>
            {plan.duration} days • {plan.macroSplit || `${plan.data?.macro_targets?.protein_pct || 0}P/${plan.data?.macro_targets?.carbs_pct || 0}C/${plan.data?.macro_targets?.fat_pct || 0}F`}
          </Text>
        </View>
        <TouchableOpacity onPress={onExport} style={styles.exportButton}>
          <Ionicons name="share-outline" size={22} color={themeColor} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// No scaling - meal plans are used exactly as designed

export default function NutritionHomeScreen({ route }: any) {
  const navigation = useNavigation<NutritionNavigationProp>();
  const { isPinkTheme, setIsPinkTheme, themeColor, themeColorLight } = useTheme();
  const { appMode, setAppMode, isTrainingMode, isNutritionMode } = useAppMode();
  const { userProfile } = useMealPlanning();
  
  // Meal plans state
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  
  const [shareModal, setShareModal] = useState<{ visible: boolean; plan: MealPlan | null }>({
    visible: false,
    plan: null,
  });
  const [successModal, setSuccessModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ visible: boolean; plan: MealPlan | null }>({
    visible: false,
    plan: null,
  });
  const [preferencesModal, setPreferencesModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [aiPromptCopied, setAiPromptCopied] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Completion status loaded from storage
  const [completionStatus, setCompletionStatus] = useState<NutritionCompletionStatus>({
    nutritionGoals: false,
    budgetCooking: false,
    sleepOptimization: false,
    favoriteMeals: false,
  });

  // Load completion status on component mount and when screen is focused
  const loadMealPlans = async () => {
    const storedMealPlans = await WorkoutStorage.loadMealPlans();
    setMealPlans(storedMealPlans);
  };

  const loadCompletionStatus = async () => {
    try {
      const status = await WorkoutStorage.loadNutritionCompletionStatus();
      setCompletionStatus(status);
    } catch (error) {
      console.error('Failed to load completion status:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMealPlans();
      loadCompletionStatus();
    }, [])
  );

  useEffect(() => {
    if (route?.params?.refresh) {
      loadMealPlans();
    }
  }, [route?.params?.refresh]);

  const handleDeleteRequest = (plan: MealPlan) => {
    setDeleteModal({ visible: true, plan });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.plan) return;
    
    try {
      await WorkoutStorage.removeMealPlan(deleteModal.plan.id);
      await loadMealPlans();
      setDeleteModal({ visible: false, plan: null });
    } catch (error) {
      console.error('Failed to delete meal plan:', error);
    }
  };

  const handleMealPlanNavigation = (plan: MealPlan) => {
    if (!plan.data?.weeks) return;

    console.log('🍽️ Navigating to meal plan (no scaling):', plan.name);

    // For 7-day meal plans (or single week), navigate directly to days
    if (plan.duration <= 7 || plan.data.weeks.length === 1) {
      const week = plan.data.weeks[0];
      navigation.navigate('MealPlanDays' as any, {
        week,
        mealPlanName: plan.name,
        mealPrepSession: plan.data.meal_prep_session,
      });
      return;
    }

    // For multi-week plans, navigate to weeks view
    navigation.navigate('MealPlanWeeks' as any, { mealPlan: plan });
  };

  const handleJumpToToday = (plan: MealPlan) => {
    if (!plan.data?.weeks) return;

    // For 7-day meal plans, just navigate to the days view
    if (plan.duration <= 7 || plan.data.weeks.length === 1) {
      handleMealPlanNavigation(plan);
      return;
    }

    // Use the same start date logic as MealPlanDaysScreen
    const getMealPlanStartDate = () => {
      // This matches the hardcoded date in MealPlanDaysScreen
      const baseDate = new Date('2026-02-05'); // Monday, Feb 5, 2026
      return baseDate;
    };

    const isToday = (dayNumber: number) => {
      const today = new Date();
      const mealPlanStartDate = getMealPlanStartDate();
      
      // Calculate the date for this day
      const dayDate = new Date(mealPlanStartDate);
      dayDate.setDate(mealPlanStartDate.getDate() + (dayNumber - 1));
      
      // Compare just the date parts (ignore time)
      return today.toDateString() === dayDate.toDateString();
    };

    // Find which day is "today"
    let targetWeek = null;
    let targetDay = null;
    let targetWeekNumber = 1;
    
    for (const week of plan.data.weeks) {
      for (const day of week.days) {
        if (isToday(day.day_number)) {
          targetWeek = week;
          targetDay = day;
          targetWeekNumber = week.week_number;
          break;
        }
      }
      if (targetDay) break;
    }
    
    // If we found today's day, navigate directly to it
    if (targetDay && targetWeek) {
      navigation.navigate('MealPlanDay' as any, {
        day: targetDay,
        weekNumber: targetWeekNumber,
        mealPlanName: plan.name
      });
    } else {
      // Fallback: navigate to weeks view
      navigation.navigate('MealPlanWeeks' as any, { mealPlan: plan });
    }
  };

  const handleTrainingTransition = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Switch to training mode and navigate to workout screen
      setAppMode('training');
      navigation.navigate('Main' as any);
      
      // Animate back in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsTransitioning(false);
      });
    });
  };

  const handleExport = (plan: MealPlan) => {
    setShareModal({ visible: true, plan });
  };

  const handleShare = async (action: 'copy' | 'share') => {
    if (!shareModal.plan) return;

    try {
      const mealPlanData = JSON.stringify(shareModal.plan.data, null, 2);
      
      if (action === 'copy') {
        await Clipboard.setStringAsync(mealPlanData);
        setShareModal({ visible: false, plan: null });
        setTimeout(() => {
          setSuccessModal(true);
        }, 100);
      } else {
        await Share.share({
          message: `Check out this meal plan: ${shareModal.plan.name}\n\n${mealPlanData}`,
          title: shareModal.plan.name,
        });
        setShareModal({ visible: false, plan: null });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      setShareModal({ visible: false, plan: null });
    }
  };

  const renderContent = () => {
    if (mealPlans.length === 0) {
      // Check if both critical questionnaires are completed
      const canGenerateAIPrompt = completionStatus.nutritionGoals && completionStatus.budgetCooking;
      
      if (canGenerateAIPrompt) {
        return (
          <View style={styles.emptyState}>
            <Ionicons name="sparkles" size={64} color={themeColor} />
            <Text style={styles.emptyTitle}>Ready to Generate AI Meal Plan</Text>
            <Text style={styles.emptyDescription}>
              You've completed the questionnaires! Generate your personalized AI prompt to create your meal plan.
            </Text>
            <TouchableOpacity
              style={[styles.aiPromptButton, { backgroundColor: themeColor }]}
              onPress={async () => {
                try {
                  const prompt = await generateUserMealPlanPrompt();
                  await Clipboard.setStringAsync(prompt);
                  setAiPromptCopied(true);
                  setTimeout(() => {
                    setAiPromptCopied(false);
                  }, 3000);
                } catch (error) {
                  console.error('Error generating AI prompt:', error);
                  Alert.alert('Error', error.message || 'Failed to generate AI prompt');
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="copy-outline" size={20} color="#0a0a0b" />
              <Text style={styles.aiPromptButtonText}>
                {aiPromptCopied ? 'AI Prompt Copied!' : 'Generate AI Prompt'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.aiPromptHelp}>
              Paste this prompt into ChatGPT or Claude to generate your meal plan
            </Text>
          </View>
        );
      } else {
        return (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={64} color="#3f3f46" />
            <Text style={styles.emptyTitle}>No Meal Plans Yet</Text>
            <Text style={styles.emptyDescription}>
              Complete the questionnaires to generate your first AI-powered meal plan or import a custom JSON meal plan.
            </Text>
            <View style={styles.questionnaireTasks}>
              <TouchableOpacity
                style={[styles.taskButton, completionStatus.nutritionGoals && styles.taskButtonCompleted]}
                onPress={() => navigation.navigate('NutritionQuestionnaire' as any)}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={completionStatus.nutritionGoals ? "checkmark-circle" : "circle-outline"} 
                  size={20} 
                  color={completionStatus.nutritionGoals ? themeColor : "#71717a"} 
                />
                <Text style={[styles.taskButtonText, completionStatus.nutritionGoals && { color: themeColor }]}>
                  Nutrition Goals
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.taskButton, completionStatus.budgetCooking && styles.taskButtonCompleted]}
                onPress={() => navigation.navigate('BudgetCookingQuestionnaire' as any)}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={completionStatus.budgetCooking ? "checkmark-circle" : "circle-outline"} 
                  size={20} 
                  color={completionStatus.budgetCooking ? themeColor : "#71717a"} 
                />
                <Text style={[styles.taskButtonText, completionStatus.budgetCooking && { color: themeColor }]}>
                  Budget & Cooking
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }
    }

    if (mealPlans.length === 1) {
      // Hero layout for single meal plan (matching workout screen)
      const plan = mealPlans[0];
      return (
        <View style={styles.heroContainer}>
          <TouchableOpacity
            style={[styles.heroCard, { borderColor: themeColor, shadowColor: themeColor }]}
            activeOpacity={0.8}
            onPress={() => handleMealPlanNavigation(plan)}
            onLongPress={() => handleDeleteRequest(plan)}
            delayLongPress={800}
          >
            <View style={styles.heroContent}>
              <Text style={[styles.heroTitle, { textShadowColor: themeColorLight }]}>{plan.name}</Text>
              <Text style={styles.heroSubtitle}>
                {plan.duration} days • {plan.macroSplit || `${parseInt(plan.data?.macro_targets?.protein_pct) || 0}P/${parseInt(plan.data?.macro_targets?.carbs_pct) || 0}C/${parseInt(plan.data?.macro_targets?.fat_pct) || 0}F`} planned
              </Text>
              <Text style={[styles.heroDescription, { color: themeColor }]}>
                Tap to view your meal plan
              </Text>
            </View>
            
            <View style={styles.heroActions}>
              <TouchableOpacity
                style={styles.heroActionButton}
                onPress={() => handleExport(plan)}
                activeOpacity={0.7}
              >
                <Ionicons name="share-outline" size={24} color={themeColor} />
                <Text style={[styles.heroActionText, { color: themeColor }]}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroSecondaryButton}
                onPress={() => handleJumpToToday(plan)}
                activeOpacity={0.7}
              >
                <Ionicons name="today-outline" size={18} color="#71717a" />
                <Text style={styles.heroSecondaryText}>Today</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    if (mealPlans.length === 2) {
      // Two plans - split screen vertically
      return (
        <View style={styles.dualVerticalContainer}>
          {mealPlans.map((plan, index) => (
            <View key={plan.id} style={styles.dualVerticalHeroContainer}>
              <TouchableOpacity
                style={[styles.dualVerticalCard, { borderColor: themeColor, shadowColor: themeColor }]}
                activeOpacity={0.8}
                onPress={() => handleMealPlanNavigation(plan)}
                onLongPress={() => handleDeleteRequest(plan)}
                delayLongPress={800}
              >
                <View style={styles.dualVerticalContent}>
                  <Text style={[styles.dualVerticalTitle, { textShadowColor: themeColorLight }]}>{plan.name}</Text>
                  <Text style={styles.dualVerticalSubtitle}>
                    {plan.duration} days • {plan.macroSplit || `${parseInt(plan.data?.macro_targets?.protein_pct) || 0}P/${parseInt(plan.data?.macro_targets?.carbs_pct) || 0}C/${parseInt(plan.data?.macro_targets?.fat_pct) || 0}F`} planned
                  </Text>
                  <Text style={[styles.dualVerticalDescription, { color: themeColor }]}>
                    Tap to view your meal plan
                  </Text>
                  
                  <View style={styles.dualVerticalActions}>
                    <TouchableOpacity
                      style={styles.dualVerticalShareButton}
                      onPress={() => handleExport(plan)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="share-outline" size={24} color={themeColor} />
                      <Text style={[styles.dualVerticalShareText, { color: themeColor }]}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dualVerticalSecondaryButton}
                      onPress={() => handleJumpToToday(plan)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="today-outline" size={16} color="#71717a" />
                      <Text style={styles.dualVerticalSecondaryText}>Today</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      );
    }

    if (mealPlans.length === 3) {
      // Three plans - compact grid layout (matching workout screen)
      return (
        <View style={styles.tripleContainer}>
          {mealPlans.map((plan, index) => (
            <View key={plan.id} style={styles.tripleCardContainer}>
              <TouchableOpacity
                style={[styles.tripleCard, { borderColor: themeColor, shadowColor: themeColor }]}
                activeOpacity={0.8}
                onPress={() => handleMealPlanNavigation(plan)}
                onLongPress={() => handleDeleteRequest(plan)}
                delayLongPress={800}
              >
                <View style={styles.tripleContent}>
                  <Text style={[styles.tripleTitle, { textShadowColor: themeColorLight }]} numberOfLines={2}>
                    {plan.name}
                  </Text>
                  <Text style={styles.tripleSubtitle}>
                    {plan.duration} days • {plan.macroSplit || `${plan.data?.macro_targets?.protein_pct || 0}P/${plan.data?.macro_targets?.carbs_pct || 0}C/${plan.data?.macro_targets?.fat_pct || 0}F`}
                  </Text>
                  <Text style={[styles.tripleDescription, { color: themeColor }]}>
                    Tap to view
                  </Text>
                </View>
                
                <View style={styles.tripleActions}>
                  <TouchableOpacity
                    style={styles.tripleActionButton}
                    onPress={() => handleJumpToToday(plan)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="today-outline" size={20} color={themeColor} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      );
    }

    if (mealPlans.length === 4) {
      // Four plans - vertical stack layout (matching workout screen)
      return (
        <View style={styles.quadContainer}>
          {mealPlans.map((plan, index) => (
            <View key={plan.id} style={styles.quadCardContainer}>
              <TouchableOpacity
                style={[styles.quadCard, { borderColor: themeColor, shadowColor: themeColor }]}
                activeOpacity={0.8}
                onPress={() => handleMealPlanNavigation(plan)}
                onLongPress={() => handleDeleteRequest(plan)}
                delayLongPress={800}
              >
                <View style={styles.quadContent}>
                  <Text style={[styles.quadTitle, { textShadowColor: themeColorLight }]} numberOfLines={2}>
                    {plan.name}
                  </Text>
                  <Text style={styles.quadSubtitle}>
                    {plan.duration} days • {plan.macroSplit || `${plan.data?.macro_targets?.protein_pct || 0}P/${plan.data?.macro_targets?.carbs_pct || 0}C/${plan.data?.macro_targets?.fat_pct || 0}F`}
                  </Text>
                  <Text style={[styles.quadDescription, { color: themeColor }]}>
                    Tap to view
                  </Text>
                </View>
                
                <View style={styles.quadButtonsContainer}>
                  <TouchableOpacity
                    style={styles.quadShareButton}
                    onPress={() => handleExport(plan)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="share-outline" size={18} color={themeColor} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quadShareButton}
                    onPress={() => handleJumpToToday(plan)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="today-outline" size={18} color={themeColor} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      );
    }

    // Multiple plans - scrollable list
    return (
      <FlatList
        data={mealPlans}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.heroListContainer}
        renderItem={({ item: plan }) => (
          <View style={styles.heroContainer}>
            <TouchableOpacity
              style={[styles.heroCard, { borderColor: themeColor, shadowColor: themeColor }]}
              activeOpacity={0.8}
              onPress={() => handleMealPlanNavigation(plan)}
              onLongPress={() => handleDeleteRequest(plan)}
              delayLongPress={800}
            >
              <View style={styles.heroContent}>
                <Text style={[styles.heroTitle, { textShadowColor: themeColorLight }]}>{plan.name}</Text>
                <Text style={styles.heroSubtitle}>
                  {plan.duration} days • {plan.macroSplit || `${parseInt(plan.data?.macro_targets?.protein_pct) || 0}P/${parseInt(plan.data?.macro_targets?.carbs_pct) || 0}C/${parseInt(plan.data?.macro_targets?.fat_pct) || 0}F`} planned
                </Text>
                <Text style={[styles.heroDescription, { color: themeColor }]}>
                  Tap to view your meal plan
                </Text>
              </View>
              
              <View style={styles.heroActions}>
                <TouchableOpacity
                  style={styles.heroSecondaryButton}
                  onPress={() => handleJumpToToday(plan)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="today-outline" size={18} color="#71717a" />
                  <Text style={styles.heroSecondaryText}>Today</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        )}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {renderContent()}
      </Animated.View>

      {/* Calendar Button - Bottom Left */}
      <View style={[styles.calendarButton, { backgroundColor: themeColor }]}>
        <TouchableOpacity
          style={styles.buttonInner}
          onPress={() => navigation.navigate('NutritionDashboard' as any)}
          activeOpacity={0.9}
        >
          <Ionicons name="calendar-outline" size={24} color="#0a0a0b" />
        </TouchableOpacity>
      </View>

      {/* App Mode Toggle - Top Left (Development Only) */}
      {__DEV__ && (
        <View style={styles.devToggleContainer}>
          <TouchableOpacity
            style={[
              styles.modeToggle, 
              isTrainingMode && { backgroundColor: themeColor, borderColor: themeColor }
            ]}
            onPress={handleTrainingTransition}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="barbell" 
              size={18} 
              color={isTrainingMode ? "#0a0a0b" : themeColor} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.modeToggle, 
              isNutritionMode && { backgroundColor: themeColor, borderColor: themeColor }
            ]}
            onPress={() => {}} // Already in nutrition mode
            activeOpacity={0.8}
          >
            <Ionicons 
              name="restaurant" 
              size={18} 
              color={isNutritionMode ? "#0a0a0b" : themeColor} 
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Gender Theme Toggle - Top Right */}
      <TouchableOpacity
        style={[styles.genderToggle, __DEV__ && styles.genderToggleWithDev]}
        onPress={() => setIsPinkTheme(!isPinkTheme)}
        activeOpacity={0.8}
      >
        <Ionicons 
          name={isPinkTheme ? "woman" : "man"} 
          size={24} 
          color={themeColor} 
        />
      </TouchableOpacity>

      {/* Add Meal Plan FAB - Bottom Right */}
      <View style={[styles.fab, { backgroundColor: themeColor }]}>
        <TouchableOpacity
          style={styles.buttonInner}
          onPress={() => navigation.navigate('ImportMealPlan' as any)}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={28} color="#0a0a0b" />
        </TouchableOpacity>
      </View>

      {/* Delete Modal */}
      <Modal
        visible={deleteModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModal({ visible: false, plan: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteContainer}>
            <View style={styles.deleteIconContainer}>
              <Ionicons name="warning" size={32} color="#ef4444" />
            </View>
            
            <Text style={styles.deleteTitle}>Delete Meal Plan?</Text>
            
            <View style={styles.deletePlanInfo}>
              <Text style={styles.deletePlanName} numberOfLines={2}>
                {deleteModal.plan?.name}
              </Text>
              <Text style={styles.deletePlanDetails}>
                {deleteModal.plan?.duration} days • {deleteModal.plan?.macroSplit || `${deleteModal.plan?.data?.macro_targets?.protein_pct || 0}P/${deleteModal.plan?.data?.macro_targets?.carbs_pct || 0}C/${deleteModal.plan?.data?.macro_targets?.fat_pct || 0}F`}
              </Text>
            </View>
            
            <Text style={styles.deleteMessage}>
              This meal plan will be permanently deleted and cannot be recovered.
            </Text>
            
            <View style={styles.deleteButtons}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => setDeleteModal({ visible: false, plan: null })}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={handleDeleteConfirm}
                activeOpacity={0.7}
              >
                <Ionicons name="trash" size={18} color="#ffffff" />
                <Text style={styles.deleteConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Share Modal */}
      <Modal
        visible={shareModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShareModal({ visible: false, plan: null })}
      >
        <View style={styles.newShareOverlay}>
          <TouchableOpacity 
            style={styles.newShareBackdrop}
            activeOpacity={1}
            onPress={() => setShareModal({ visible: false, plan: null })}
          />
          
          <View style={[styles.newShareModal, { borderColor: themeColor }]}>
            {/* Close Button */}
            <View style={styles.newShareHeader}>
              <TouchableOpacity
                style={styles.newShareClose}
                onPress={() => setShareModal({ visible: false, plan: null })}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            {/* Image */}
            <Image 
              source={isPinkTheme ? 
                require('./../../lucid-origin_Two_athletic_women_enjoying_a_healthy_meal_together_in_a_modern_kitchen_one_pass-0.jpg') :
                require('./../../lucid-origin_Two_athletic_men_enjoying_a_healthy_meal_together_in_a_modern_kitchen_one_passin-0.jpg')
              }
              style={styles.newShareImage}
              resizeMode="cover"
            />
            
            {/* Content */}
            <View style={styles.newShareContent}>
              <Text style={[styles.newShareTitle, { color: themeColor }]}>
                {shareModal.plan?.name?.toUpperCase()}
              </Text>
              <Text style={styles.newShareSubtitle}>Share your meal plan</Text>
              
              {/* Action Buttons */}
              <View style={styles.shareActionButtons}>
                <TouchableOpacity
                  style={[styles.shareActionPrimary, { backgroundColor: themeColor }]}
                  onPress={() => handleShare('copy')}
                  activeOpacity={0.9}
                >
                  <View style={styles.shareButtonContent}>
                    <Ionicons name="copy" size={22} color="#0a0a0b" />
                    <View style={styles.shareButtonText}>
                      <Text style={styles.shareButtonTitle}>COPY MEAL PLAN</Text>
                      <Text style={styles.shareButtonSubtitle}>JSON to clipboard</Text>
                    </View>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.shareActionSecondary}
                  onPress={() => handleShare('share')}
                  activeOpacity={0.9}
                >
                  <View style={styles.shareButtonContent}>
                    <Ionicons name="share-social" size={22} color="#22d3ee" />
                    <View style={styles.shareButtonText}>
                      <Text style={[styles.shareButtonTitle, { color: '#ffffff' }]}>SHARE</Text>
                      <Text style={[styles.shareButtonSubtitle, { color: '#a1a1aa' }]}>Send to others</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={successModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>Copied!</Text>
            <Text style={styles.successMessage}>Meal plan JSON copied to clipboard</Text>
            
            <TouchableOpacity
              style={[styles.successButton, { backgroundColor: themeColor }]}
              onPress={() => setSuccessModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  animatedContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 24,
  },
  aiPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
    marginBottom: 16,
  },
  aiPromptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
    marginLeft: 8,
  },
  aiPromptHelp: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  questionnaireTasks: {
    marginTop: 32,
    width: '100%',
  },
  taskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1a1a1b',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  taskButtonCompleted: {
    backgroundColor: 'rgba(116, 222, 151, 0.1)',
    borderColor: 'rgba(116, 222, 151, 0.3)',
  },
  taskButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 12,
  },
  heroContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroListContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  heroCard: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#22d3ee',
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    minHeight: 320,
    justifyContent: 'center',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    shadowColor: '#22d3ee',
  },
  heroContent: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 42,
    textShadowColor: '#22d3ee40',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroDescription: {
    fontSize: 16,
    color: '#22d3ee',
    textAlign: 'center',
    fontWeight: '500',
  },
  heroActions: {
    width: '100%',
    alignItems: 'center',
  },
  heroActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  heroActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22d3ee',
  },
  heroSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 8,
  },
  heroSecondaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#71717a',
  },
  dualVerticalContainer: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 100,
    paddingHorizontal: 16,
    gap: 16,
    justifyContent: 'space-evenly',
  },
  dualVerticalHeroContainer: {
    height: '45%',
    width: '100%',
  },
  dualVerticalCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#22d3ee',
    padding: 32,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22d3ee',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dualVerticalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  dualVerticalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: '#22d3ee',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 2,
  },
  dualVerticalSubtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    marginBottom: 16,
    textAlign: 'center',
  },
  dualVerticalDescription: {
    fontSize: 14,
    color: '#22d3ee',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  dualVerticalActions: {
    alignItems: 'center',
  },
  dualVerticalShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
  },
  dualVerticalShareText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dualVerticalSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
    marginTop: 8,
  },
  dualVerticalSecondaryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717a',
  },
  tripleContainer: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 100,
    paddingHorizontal: 16,
    gap: 12,
    justifyContent: 'space-evenly',
  },
  tripleCardContainer: {
    height: '30%',
    width: '100%',
  },
  tripleCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#22d3ee',
    padding: 20,
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#22d3ee',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tripleContent: {
    flex: 1,
  },
  tripleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 4,
  },
  tripleSubtitle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  tripleDescription: {
    fontSize: 11,
    fontWeight: '500',
  },
  tripleActions: {
    marginLeft: 12,
  },
  tripleActionButton: {
    padding: 8,
  },
  quadContainer: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 100,
    paddingHorizontal: 16,
    gap: 10,
    justifyContent: 'space-evenly',
  },
  quadCardContainer: {
    height: '22%',
    width: '100%',
  },
  quadCard: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#22d3ee',
    padding: 16,
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#22d3ee',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  quadContent: {
    flex: 1,
  },
  quadTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 3,
  },
  quadSubtitle: {
    fontSize: 11,
    color: '#888',
    marginBottom: 3,
  },
  quadDescription: {
    fontSize: 10,
    fontWeight: '500',
  },
  quadButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  quadShareButton: {
    padding: 8,
  },
  floatingImportButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteContainer: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#27272a',
    padding: 28,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  deleteIconContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 50,
    padding: 16,
    marginBottom: 20,
  },
  deleteTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  deletePlanInfo: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  deletePlanName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  deletePlanDetails: {
    fontSize: 13,
    color: '#a1a1aa',
    textAlign: 'center',
  },
  deleteMessage: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  deleteButtons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteCancelButton: {
    flex: 1,
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3f3f46',
    minHeight: 50,
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Card component styles
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  exportButton: {
    padding: 8,
  },
  // Button styles to match HomeScreen
  calendarButton: {
    position: 'absolute',
    left: 16,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#22d3ee',
  },
  buttonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#22d3ee',
  },
  genderToggle: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  // Development mode toggle styles
  devToggleContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    flexDirection: 'row',
    gap: 4,
  },
  modeToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  genderToggleWithDev: {
    right: 16,
  },
  // Share modal styles
  newShareOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  newShareBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  newShareModal: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 2,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  newShareHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 16,
    paddingTop: 16,
    zIndex: 100,
  },
  newShareClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newShareImage: {
    width: '100%',
    height: 180,
  },
  newShareContent: {
    padding: 24,
    alignItems: 'center',
  },
  newShareTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  newShareSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 24,
  },
  shareActionButtons: {
    width: '100%',
    gap: 16,
  },
  shareActionPrimary: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  shareActionSecondary: {
    width: '100%',
    backgroundColor: '#27272a',
    borderWidth: 2,
    borderColor: '#3f3f46',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  shareButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16,
  },
  shareButtonText: {
    flex: 1,
    alignItems: 'flex-start',
  },
  shareButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a0a0b',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  shareButtonSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(10, 10, 11, 0.7)',
    letterSpacing: 0.2,
  },
  successContainer: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 32,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 24,
  },
  successButton: {
    backgroundColor: '#22d3ee',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    minWidth: 80,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
    textAlign: 'center',
  },
});