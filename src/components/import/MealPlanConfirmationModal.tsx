// src/components/import/MealPlanConfirmationModal.tsx
//
// Full replacement. Same props as before, so no caller changes: it is still
// driven entirely by useMealPlanImport via NutritionPromptReadyScreen.
//
// What changed from the previous version:
//   - a photo hero built from the plan's own meals (ImportHeroMeal)
//   - the stacked summary rows collapsed into one horizontal stat strip
//   - an "inside" chip row naming actual meals, not just counts
//   - the X moved onto the hero, with a labelled "Close" under the CTA, so
//     dismissing is not dependent on spotting an unlabelled icon
//
// AppModal, not a raw Modal: on Android a raw <Modal> is a detached native
// window that does not inherit the app's GestureHandlerRootView, so RNGH
// touchables inside it receive no touches at all.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import AppModal from '../AppModal';
import ImportHeroMeal from './ImportHeroMeal';

interface Props {
  visible: boolean;
  parsedMealPlan: any;
  generationTime: number | null;
  modalScale: Animated.Value;
  modalOpacity: Animated.Value;
  themeColor: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Defensive flatten, same contract as ImportHeroMeal's. */
function flattenMeals(plan: any): any[] {
  const daily = plan?.dailyMeals;
  if (!daily) return [];
  const days: any[] = Array.isArray(daily) ? daily : Object.values(daily);
  return days.flatMap((day: any) => {
    if (Array.isArray(day)) return day;
    if (Array.isArray(day?.meals)) return day.meals;
    return [];
  });
}

function dayCount(plan: any): number {
  const daily = plan?.dailyMeals;
  if (!daily) return 0;
  return Array.isArray(daily) ? daily.length : Object.keys(daily).length;
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
}: Props) {
  const stats = useMemo(() => {
    const meals = flattenMeals(parsedMealPlan);
    const days = dayCount(parsedMealPlan) || 1;

    const totalCalories = meals.reduce(
      (sum: number, m: any) => sum + (Number(m?.calories) || 0),
      0
    );
    const totalProtein = meals.reduce(
      (sum: number, m: any) => sum + (Number(m?.macros?.protein) || 0),
      0
    );

    // Per day, not per plan: a 7 day total reads as a nonsense calorie number.
    return {
      meals,
      days,
      kcalPerDay: Math.round(totalCalories / days),
      proteinPerDay: Math.round(totalProtein / days),
      mealCount: meals.length,
    };
  }, [parsedMealPlan]);

  // Distinct meal names, so a plan that repeats breakfast all week does not fill
  // the chip row with one meal.
  const chips = useMemo(() => {
    const names: string[] = [];
    for (const m of stats.meals) {
      const n = m?.name;
      if (n && !names.includes(n)) names.push(n);
      if (names.length >= 6) break;
    }
    return names;
  }, [stats.meals]);

  const visibleChips = chips.slice(0, 2);
  const extraChips = Math.max(0, chips.length - visibleChips.length);

  const planName = parsedMealPlan?.name || 'Your meal plan';
  const subtitle = [
    stats.days ? `${stats.days} ${stats.days === 1 ? 'day' : 'days'}` : null,
    stats.days ? `${Math.round(stats.mealCount / stats.days)} meals a day` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <AppModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
    >
      <Animated.View style={[styles.overlay, { opacity: modalOpacity }]}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: modalScale }],
              opacity: modalOpacity,
              borderColor: themeColor,
              shadowColor: themeColor,
            },
          ]}
        >
          <View>
            <ImportHeroMeal plan={parsedMealPlan} themeColor={themeColor} />

            <View style={styles.heroOverlay} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onCancel}
                hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                activeOpacity={0.8}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color="#e4e4e7" />
              </TouchableOpacity>

              {generationTime != null && (
                <View style={[styles.timeBadge, { borderColor: themeColor }]}>
                  <Text style={[styles.timeBadgeText, { color: themeColor }]}>
                    Ready in {generationTime.toFixed(1)}s
                  </Text>
                </View>
              )}
            </View>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator>
            <View style={styles.titleBlock}>
              <Text style={[styles.eyebrow, { color: themeColor }]}>MEAL PLAN</Text>
              <Text style={styles.planName}>{planName}</Text>
              {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>

            <View style={styles.statStrip}>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: themeColor }]}>
                  {stats.kcalPerDay.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>kcal / day</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: themeColor }]}>
                  {stats.proteinPerDay}g
                </Text>
                <Text style={styles.statLabel}>protein</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: themeColor }]}>
                  {stats.mealCount}
                </Text>
                <Text style={styles.statLabel}>meals</Text>
              </View>
            </View>

            {visibleChips.length > 0 && (
              <View style={styles.insideBlock}>
                <Text style={styles.insideLabel}>INSIDE</Text>
                <View style={styles.chipRow}>
                  {visibleChips.map((name) => (
                    <View key={name} style={styles.chip}>
                      <Text style={styles.chipText} numberOfLines={1}>
                        {name}
                      </Text>
                    </View>
                  ))}
                  {extraChips > 0 && (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>+{extraChips} more</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.cta, { backgroundColor: themeColor }]}
              onPress={onConfirm}
              activeOpacity={0.9}
            >
              <Text style={styles.ctaText}>Start this plan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onCancel}
              activeOpacity={0.7}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Text style={styles.dismissText}>Not this one? Close</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </AppModal>
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
  card: {
    backgroundColor: '#0a0a0b',
    borderRadius: 20,
    borderWidth: 1,
    width: '90%',
    maxWidth: 420,
    height: '65%',
    alignSelf: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  // Sits over the hero. box-none on the wrapper so only the controls take touches.
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 132,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBadge: {
    backgroundColor: 'rgba(10,10,11,0.7)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Shrinks inside the fixed-height card so the pinned footer stays on screen.
  scroll: {
    flexShrink: 1,
    alignSelf: 'stretch',
  },
  titleBlock: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 6,
  },
  planName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 6,
  },
  statStrip: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: 'rgba(39, 39, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(113, 113, 122, 0.2)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  stat: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(113, 113, 122, 0.2)',
  },
  statValue: {
    fontSize: 19,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10.5,
    color: '#a1a1aa',
    marginTop: 2,
  },
  insideBlock: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  insideLabel: {
    fontSize: 11,
    color: '#52525b',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: '100%',
  },
  chipText: {
    fontSize: 11.5,
    color: '#d4d4d8',
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  cta: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0a0a0b',
  },
  dismissText: {
    fontSize: 12,
    color: '#52525b',
    textAlign: 'center',
    marginTop: 12,
  },
});