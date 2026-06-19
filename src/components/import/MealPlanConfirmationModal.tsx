// src/components/import/MealPlanConfirmationModal.tsx
//
// Nutrition twin of ImportConfirmationModal. Same overlay, scale-in card,
// eyebrow + name + stat card + primary button — but meal-plan shaped:
// "Meal plan ready" with Duration / Total meals / Start date, and a single
// "Start meal plan" action. No combined/add-more views (a meal plan is one
// object, unlike workout blocks which accumulate).
//
// Presentational only: all state + handlers come in as props from
// useMealPlanImport, exactly like the workout modal pairs with useWorkoutImport.

import React from 'react';
import { View, Text, StyleSheet, Modal, Animated, ScrollView } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import type { SimplifiedMealPlan } from '../../types/nutrition';

interface MealPlanConfirmationModalProps {
  visible: boolean;
  parsedMealPlan: SimplifiedMealPlan | null;
  generationTime: number | null;
  modalScale: Animated.Value;
  modalOpacity: Animated.Value;
  themeColor: string;
  onConfirm: () => void; // confirmImport — "Start meal plan"
  onCancel: () => void; // cancelConfirmation — dismiss
}

function totalMeals(plan: SimplifiedMealPlan | null): number {
  if (!plan?.dailyMeals) return 0;
  return Object.values(plan.dailyMeals).reduce(
    (total, day: any) => total + (day.meals?.length || 0),
    0
  );
}

function dayCount(plan: SimplifiedMealPlan | null): number {
  if (!plan?.dailyMeals) return 0;
  return Object.keys(plan.dailyMeals).length;
}

function startDateLabel(plan: SimplifiedMealPlan | null): string {
  if (!plan?.startDate) return '—';
  const d = new Date(plan.startDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

export default function MealPlanConfirmationModal({
  visible,
  parsedMealPlan,
  generationTime,
  modalScale,
  modalOpacity,
  themeColor,
  onConfirm,
  onCancel,
}: MealPlanConfirmationModalProps) {
  const days = dayCount(parsedMealPlan);
  const meals = totalMeals(parsedMealPlan);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View style={[styles.overlay, { opacity: modalOpacity }]}>
        <Animated.View
          style={[
            styles.content,
            {
              transform: [{ scale: modalScale }],
              opacity: modalOpacity,
              borderColor: themeColor,
              shadowColor: themeColor,
            },
          ]}
        >
          {/* Top-left close */}
          <View style={styles.navButtonWrapper}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={onCancel}
              activeOpacity={0.8}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons name="close" size={22} color="#71717a" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.confirmBody}
            showsVerticalScrollIndicator={false}
          >
            {/* Badge */}
            <View style={styles.badgeRow}>
              {generationTime != null && (
                <View
                  style={[
                    styles.timeBadge,
                    { backgroundColor: themeColor + '1A', borderColor: themeColor },
                  ]}
                >
                  <Text style={[styles.timeBadgeText, { color: themeColor }]}>
                    Generated in {generationTime.toFixed(2)}s
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.eyebrow}>MEAL PLAN READY</Text>
            <Text style={styles.planName}>
              {parsedMealPlan?.name || 'Your Meal Plan'}
            </Text>

            <View style={styles.statCard}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={[styles.statValue, { color: themeColor }]}>
                  {days} {days === 1 ? 'day' : 'days'}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total meals</Text>
                <Text style={[styles.statValue, { color: themeColor }]}>
                  {meals} {meals === 1 ? 'meal' : 'meals'}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Start date</Text>
                <Text style={[styles.statValue, { color: themeColor }]}>
                  {startDateLabel(parsedMealPlan)}
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: themeColor }]}
                onPress={onConfirm}
                activeOpacity={0.9}
              >
                <Text style={styles.primaryButtonTextLg}>Start meal plan</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  content: {
    backgroundColor: '#0a0a0b',
    borderRadius: 20,
    borderWidth: 1,
    width: '100%',
    maxWidth: 420,
    maxHeight: '82%',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 28,
  },
  navButtonWrapper: { position: 'absolute', top: 16, left: 16, zIndex: 5 },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181b',
    borderWidth: 0.5,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBody: { paddingTop: 24, paddingHorizontal: 24, paddingBottom: 24 },
  badgeRow: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  timeBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  timeBadgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  eyebrow: {
    fontSize: 13,
    color: '#a1a1aa',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  planName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 31,
    marginBottom: 22,
  },
  statCard: {
    backgroundColor: 'rgba(39, 39, 42, 0.4)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(113, 113, 122, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    width: '100%',
    marginBottom: 22,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statDivider: { height: 1, backgroundColor: 'rgba(113, 113, 122, 0.15)' },
  statLabel: { fontSize: 14, color: '#a1a1aa' },
  statValue: { fontSize: 14, fontWeight: '600' },
  actions: { width: '100%' },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  primaryButtonTextLg: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a0a0b',
    letterSpacing: 0.3,
  },
});