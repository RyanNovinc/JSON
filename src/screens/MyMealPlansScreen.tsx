import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutStorage, MealPlan } from '../utils/storage';
import * as Clipboard from 'expo-clipboard';

type MyMealPlansNavigationProp = StackNavigationProp<RootStackParamList, 'MyMealPlans'>;

export default function MyMealPlansScreen() {
  const { themeColor } = useTheme();
  const navigation = useNavigation<MyMealPlansNavigationProp>();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [userMealPlans, setUserMealPlans] = useState<MealPlan[]>([]);

  // Load user meal plans when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadUserMealPlans();
    }, [])
  );

  const loadUserMealPlans = async () => {
    const savedPlans = await WorkoutStorage.loadMealPlans();
    console.log('📱 My Meal Plans loading:', savedPlans.length, 'saved plans');
    setUserMealPlans(savedPlans);
  };

  const handleDeleteMealPlan = (planId: string, planName: string) => {
    Alert.alert(
      'Delete Meal Plan',
      `Are you sure you want to delete "${planName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            console.log('🗑️ Deleting saved meal plan:', planName, 'ID:', planId);
            await WorkoutStorage.removeMealPlan(planId);
            loadUserMealPlans();
            console.log('🗑️ Meal plan deleted from My Collection');
          }
        }
      ]
    );
  };

  const handleCopyMealPlan = async (plan: MealPlan) => {
    const planJson = JSON.stringify(plan.data, null, 2);
    await Clipboard.setStringAsync(planJson);
    
    setCopiedId(plan.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.simpleHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Meal Plans</Text>
          <View style={styles.placeholder} />
        </View>

        {/* User Meal Plans */}
        {userMealPlans.length === 0 ? (
          <View style={styles.emptyStateCenter}>
            <Ionicons name="heart-outline" size={64} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyTitle}>No Favourites Yet</Text>
            <Text style={styles.emptyDescription}>
              Long press a meal plan and add it to favourites to see it here
            </Text>
          </View>
        ) : (
          userMealPlans.map((plan, index) => (
            <View key={plan.id} style={styles.cardContainer}>
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => handleCopyMealPlan(plan)}
              >
                <View style={styles.userMealGradient}>
                  <View style={styles.userMealHeader}>
                    <Text style={styles.userMealTitle}>{plan.name}</Text>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDeleteMealPlan(plan.id, plan.name)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.userMealSubtitle}>Custom meal plan</Text>
                  <View style={styles.userMealDetails}>
                    <Text style={styles.userMealText}>Tap to copy & share</Text>
                  </View>
                </View>
                
                {/* Copied Overlay */}
                {copiedId === plan.id && (
                  <View style={styles.copiedOverlay}>
                    <View style={[styles.copiedGradient, { backgroundColor: themeColor + 'E6' }]}>
                      <View style={styles.copiedContent}>
                        <Ionicons name="checkmark-circle" size={60} color="#ffffff" />
                        <Text style={styles.copiedTitle}>Copied!</Text>
                        <Text style={styles.copiedSubtitle}>{plan.name} is ready to import</Text>
                      </View>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ))
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  simpleHeader: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 44,
    height: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  // User meal plan card styles
  cardContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  card: {
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  userMealGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    borderRadius: 20,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  userMealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userMealTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginRight: 12,
  },
  userMealSubtitle: {
    fontSize: 16,
    color: '#e4e4e7',
    marginBottom: 12,
  },
  userMealDetails: {
    marginTop: 'auto',
  },
  userMealText: {
    fontSize: 14,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  // Empty state styles
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  bottomText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
  },
  // Copied overlay styles
  copiedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    overflow: 'hidden',
  },
  copiedGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  copiedContent: {
    alignItems: 'center',
  },
  copiedTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  copiedSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});