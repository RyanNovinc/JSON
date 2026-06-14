import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { exampleMealPlan } from './exampleMealPlan';

/**
 * ExamplePlanCard — the "Peek at a finished plan" card for the Nutrition tab's
 * empty state (Task 2).
 *
 * Drop this in at the TOP of your Nutrition empty state, where the current
 * "Plan your meals / Get started" hero card sits. Leave the meal shelves below
 * it exactly as they are.
 *
 *   import ExamplePlanCard from '../onboarding/ExamplePlanCard';
 *   ...
 *   {/* empty state, no saved plans *\/}
 *   <ExamplePlanCard />
 *   {/* ...your existing Mains / Around your workout / etc. shelves... *\/}
 *
 * "Open the example" opens the bundled plan through MealPlanPreviewScreen in
 * read-only example mode (isExample), so NOTHING is ever written to the user's
 * plans — open it with 0 plans or 50, restart onboarding, it changes nothing.
 * "Build your own" routes into the meal questionnaire for a calibrated plan.
 *
 * Colour comes from useTheme().themeColor, which is the nutrition green inside
 * the Nutrition tab's NutritionThemeProvider — so it matches the tab
 * automatically, no hardcoded green.
 */
export default function ExamplePlanCard() {
  const navigation = useNavigation<any>();
  const { themeColor } = useTheme();

  const openExample = () => {
    navigation.navigate('MealPlanPreview', {
      plan: exampleMealPlan,
      isExample: true,
    });
  };

  // Calibrated build flow. Swap 'N1Goal' for the onboarding contract screen
  // once that's wired.
  const buildOwn = () => {
    navigation.navigate('N1Goal');
  };

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.card,
          { borderColor: themeColor + '55', backgroundColor: themeColor + '14' },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: themeColor + '22' }]}>
          <Ionicons name="restaurant" size={22} color={themeColor} />
        </View>

        <Text style={[styles.eyebrow, { color: themeColor }]}>EXAMPLE PLAN</Text>
        <Text style={styles.title}>Peek at a finished plan</Text>
        <Text style={styles.subtitle}>
          A real 7-day bulk — every meal, macros, and grocery list.
        </Text>

        <TouchableOpacity
          style={[styles.cta, { backgroundColor: themeColor }]}
          onPress={openExample}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Open the example plan"
        >
          <Text style={styles.ctaText}>Open the example</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.secondary}
        onPress={buildOwn}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Build your own plan"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.secondaryText, { color: themeColor }]}>
          Or build your own — a few questions →
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 18,
    maxWidth: 280,
  },
  cta: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    alignSelf: 'stretch',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0a0a0b',
  },
  secondary: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  secondaryText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
});