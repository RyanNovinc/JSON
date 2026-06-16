import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { forceOnboardingShow } from './IntentForkModal';
import { OnboardingAnalytics } from '../services/onboardingAnalytics';
import { exampleMealPlan } from './exampleMealPlan';
import { exampleWorkout } from './exampleWorkout';
import { startWorkoutFlow, startNutritionFlow } from '../utils/questionnaireRouting';

/**
 * OnboardingContractScreen — shown when a user chooses to BUILD (a meal plan or
 * a workout program), before the questionnaire.
 *
 * v3 — "poster". A brand-new user hasn't bought in yet, so this is now quick and
 * scannable instead of a wall of text: a FREE pill, a big two-line headline whose
 * payoff word picks up the flow accent, one short benefit line, a row of value
 * icons, and the whole process distilled to a single Pick → AI builds → Eat line.
 * No feature sentences, no numbered stepper. Everything is centred; the Start CTA
 * (+ optional "see a finished plan") is pinned at the bottom.
 *
 * One component, two variants via the `flow` route param:
 *   flow: 'meal'    → green,  Start → N1Goal,        shows the example-plan link
 *   flow: 'workout' → cyan,   Start → Q1PrimaryGoal
 *
 * Navigate to it as:
 *   navigation.navigate('OnboardingContract', { flow: 'meal' });
 */

type Flow = 'meal' | 'workout';

type RouteParams = {
  OnboardingContract: { flow?: Flow };
};

type ValueIcon = { icon: keyof typeof Ionicons.glyphMap; label: string };

interface FlowConfig {
  accent: string;
  ctaText: string;
  pillBg: string;
  pillBorder: string;
  headline: string; // leading part of the headline; may contain \n for the line break
  headlineAccent: string; // trailing payoff word, rendered in the flow accent colour
  sub: string; // may contain \n
  startLabel: string;
  values: ValueIcon[];
  steps: [string, string, string];
  // Whether the "See a finished plan first" link is shown. Meals has a real
  // example (exampleMealPlan); workouts doesn't yet — once you add a sample
  // program, flip this to true and fill in the workout branch of onSeeExample.
  hasExample: boolean;
}

const FLOW: Record<Flow, FlowConfig> = {
  meal: {
    accent: '#22c55e',
    ctaText: '#06320f',
    pillBg: 'rgba(34,197,94,0.10)',
    pillBorder: 'rgba(34,197,94,0.25)',
    headline: 'A week of meals,\n',
    headlineAccent: 'sorted.',
    sub: 'Real food you love. Your macros.\nBuilt by the AI you already use.',
    startLabel: 'Start',
    values: [
      { icon: 'restaurant', label: 'Meals' },
      { icon: 'flame', label: 'Macros' },
      { icon: 'cart', label: 'Grocery' },
      { icon: 'list', label: 'Prep' },
    ],
    steps: ['Pick', 'AI builds', 'Eat'],
    hasExample: true,
  },
  workout: {
    accent: '#22d3ee',
    ctaText: '#06323a',
    pillBg: 'rgba(34,211,238,0.10)',
    pillBorder: 'rgba(34,211,238,0.25)',
    headline: 'A program\nbuilt for ',
    headlineAccent: 'you.',
    sub: 'Tailored to your goal and level.\nBuilt by the AI you already use.',
    startLabel: 'Start',
    values: [
      { icon: 'options', label: 'Tailored' },
      { icon: 'trending-up', label: 'Progress' },
      { icon: 'barbell', label: 'Any kit' },
    ],
    steps: ['Set goals', 'AI builds', 'Train'],
    hasExample: true,
  },
};

export default function OnboardingContractScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'OnboardingContract'>>();
  const insets = useSafeAreaInsets();

  const flow: Flow = route.params?.flow === 'workout' ? 'workout' : 'meal';
  const cfg = FLOW[flow];

  useEffect(() => {
    OnboardingAnalytics.stepViewed('contract', 2);
  }, []);

  const onStart = async () => {
    OnboardingAnalytics.stepCompleted();
    OnboardingAnalytics.completed();
    if (flow === 'workout') {
      await startWorkoutFlow(navigation, { fromOnboarding: true });
    } else {
      await startNutritionFlow(navigation, { fromOnboarding: true });
    }
  };

  const onBack = () => {
    OnboardingAnalytics.abandoned();
    // Re-show the fork over this screen. We deliberately don't reset/navigate
    // here: the fork is a full-screen modal, so fading it back in over the
    // contract is the natural reverse of how we got here (the fork faded OUT
    // onto the contract going forward). The old version reset to Main first,
    // which animated the Main tab in like a forward push — that was the
    // "wrong way" back motion. The fork's choose() routes to an absolute
    // destination once the user picks or skips.
    forceOnboardingShow();
  };

  const onSeeExample = () => {
    if (flow === 'workout') {
      navigation.navigate('WorkoutPreview', { routine: exampleWorkout, isExample: true });
      return;
    }
    navigation.navigate('MealPlanPreview', {
      plan: exampleMealPlan,
      isExample: true,
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={onBack}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={24} color="#a1a1aa" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Free pill */}
        <View
          style={[
            styles.pill,
            { backgroundColor: cfg.pillBg, borderColor: cfg.pillBorder },
          ]}
        >
          <Ionicons name="flash" size={13} color={cfg.accent} />
          <Text style={[styles.pillText, { color: cfg.accent }]}>
            FREE · NO ACCOUNT
          </Text>
        </View>

        <Text style={styles.title}>
          {cfg.headline}<Text style={{ color: cfg.accent }}>{cfg.headlineAccent}</Text>
        </Text>
        <Text style={styles.sub}>{cfg.sub}</Text>

        {/* Value icons */}
        <View style={styles.values}>
          {cfg.values.map((v, i) => (
            <View key={i} style={styles.value}>
              <Ionicons name={v.icon} size={26} color={cfg.accent} />
              <Text style={styles.valueLabel}>{v.label}</Text>
            </View>
          ))}
        </View>

        {/* Process, in one line */}
        <View style={styles.process}>
          {cfg.steps.map((s, i) => (
            <React.Fragment key={i}>
              <Text style={styles.processText}>{s}</Text>
              {i < cfg.steps.length - 1 && (
                <Ionicons name="arrow-forward" size={12} color="#52525b" />
              )}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>

      {/* Pinned actions */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: cfg.accent }]}
          onPress={onStart}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={cfg.startLabel}
        >
          <Text style={[styles.startText, { color: cfg.ctaText }]}>
            {cfg.startLabel}
          </Text>
        </TouchableOpacity>

        {cfg.hasExample ? (
          <TouchableOpacity
            style={styles.secondary}
            onPress={onSeeExample}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="See a finished plan first"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.secondaryText}>See a finished plan first</Text>
            <Ionicons name="arrow-forward" size={13} color="#8a8a93" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
    alignSelf: 'flex-start',
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
  },

  // Free pill
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },

  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 34,
    textAlign: 'center',
    marginBottom: 16,
  },
  sub: {
    color: '#a1a1aa',
    fontSize: 14.5,
    fontWeight: '500',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 38,
  },

  // Value icons
  values: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 26,
    marginBottom: 36,
  },
  value: {
    alignItems: 'center',
    gap: 9,
  },
  valueLabel: {
    color: '#8a8a93',
    fontSize: 11.5,
    fontWeight: '600',
  },

  // One-line process
  process: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  processText: {
    color: '#71717a',
    fontSize: 12.5,
    fontWeight: '600',
  },

  // Pinned actions
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: '#0a0a0b',
  },
  startBtn: {
    height: 54,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: {
    fontSize: 15.5,
    fontWeight: '700',
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  secondaryText: {
    color: '#8a8a93',
    fontSize: 13,
    fontWeight: '500',
  },
});