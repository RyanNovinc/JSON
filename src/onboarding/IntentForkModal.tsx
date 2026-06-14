import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useSafeAreaInsets,
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from '../utils/navigationRef';
import MealCycleHero from './MealCycleHero';

// ============================================================================
// IntentForkModal — first-open "what do you want to do first?" screen.
//
// Self-contained: reads its own gate from AsyncStorage on mount, shows itself
// only on a fresh install, writes the completion + chosen intent on tap, then
// routes via navigationRef. Mounted once at the root (see AppNavigator) so it
// overlays every tab.
//
// Layout (v2.2): a full-bleed, slowly cross-fading 2×2 meal mosaic (MealCycleHero)
// carries ONLY the centred logo as a brand stamp over the scrim — nothing else
// sits on the photos, so the mosaic (a selling point) stays unobscured. Everything
// else lives in the black space below: the headline "Eating big, made easy." (the
// payoff word "easy." picks up the brand cyan to match the json.fit website) sits
// directly above a green "Browse the meals" button, an "or" divider, and two cyan
// "Build…" buttons — headline + buttons read as one connected block — with
// "Skip for now" pinned to the very bottom. Centring of the logo is handled here
// via the heroContent wrapper, so it doesn't depend on how MealCycleHero positions
// its children.
//
// Three paths:
//   meals   -> Nutrition tab      (browse the curated library, zero setup)
//   plan    -> OnboardingContract (how-it-works/value, then the meal questionnaire)
//   workout -> OnboardingContract (how-it-works/value, then the workout questionnaire)
//
// Storage keys (see docs/onboarding-spec.md):
//   @onboarding/completedAt : ISO string — null means "show the fork"
//   @onboarding/intent      : 'meals' | 'plan' | 'workout' | 'skipped'
// Migration: anyone who finished the OLD onboarding has the legacy
// 'onboarding_completed' key, so we write the new key for them silently and
// never show the fork. New installs (neither key) see it.
// ============================================================================

const KEY_COMPLETED = '@onboarding/completedAt';
const KEY_INTENT = '@onboarding/intent';
const LEGACY_KEY = 'onboarding_completed';

type Intent = 'meals' | 'plan' | 'workout' | 'skipped';

// Hero is ~46% of the screen, clamped so it looks right on small and large
// phones alike.
const { height: SCREEN_H } = Dimensions.get('window');
const HERO_H = Math.round(Math.min(Math.max(SCREEN_H * 0.46, 300), 430));

// --- external triggers -------------------------------------------------------

// Re-runs the storage gate (used by ProfileScreen's "Reset onboarding", which
// clears the keys first so the gate then shows the fork).
let triggerOnboardingRecheck: (() => void) | null = null;

export const forceOnboardingRecheck = () => {
  if (triggerOnboardingRecheck) {
    triggerOnboardingRecheck();
  }
};

// Force the fork to show immediately, bypassing the AsyncStorage gate. For
// deliberate in-session re-entry (e.g. the OnboardingContract back button)
// where completedAt may already be persisted, so a gate recheck would
// short-circuit and the fork would never reappear.
let triggerOnboardingShow: (() => void) | null = null;

export const forceOnboardingShow = () => {
  if (triggerOnboardingShow) {
    triggerOnboardingShow();
  }
};

// Palette pulled from the app's existing screens so this matches everything else.
const C = {
  bg: '#0a0a0b',
  text: '#ffffff',
  textMute: '#71717a',
  cyan: '#22d3ee',
  cyanText: '#a5f3fc',
  cyanBorder: 'rgba(34,211,238,0.4)',
  cyanFill: 'rgba(34,211,238,0.06)',
  green: '#22c55e',
  greenText: '#06320f',
  divider: '#27272a',
};

// Works whether navigationRef is createNavigationContainerRef() (has
// .isReady()/.navigate()) or a plain ref (has .current.navigate()).
function navigate(name: string, params?: object) {
  const ref: any = navigationRef as any;
  if (typeof ref?.isReady === 'function') {
    if (ref.isReady()) ref.navigate(name, params);
  } else if (ref?.current) {
    ref.current.navigate(name, params);
  }
}

// ---------------------------------------------------------------------------
// Brand mark — the JSON.fit barbell, built from Views (no SVG/image dep).
// Carries a subtle drop shadow so it holds up as a stamp on bright photos,
// even where the hero scrim is lighter.
// ---------------------------------------------------------------------------
function Logo() {
  return (
    <View style={styles.logoRow}>
      <View style={styles.barbell}>
        <View style={styles.plate} />
        <View style={styles.bar} />
        <View style={styles.plate} />
      </View>
      <Text style={styles.logoText}>
        JSON<Text style={{ color: C.cyan }}>.fit</Text>
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// The modal.
// ---------------------------------------------------------------------------
export default function IntentForkModal() {
  const [visible, setVisible] = useState(false);
  const [recheckTrigger, setRecheckTrigger] = useState(0);

  // Wire up the global triggers.
  useEffect(() => {
    triggerOnboardingRecheck = () => {
      setRecheckTrigger((prev) => prev + 1);
    };
    triggerOnboardingShow = () => {
      setVisible(true);
    };
    return () => {
      triggerOnboardingRecheck = null;
      triggerOnboardingShow = null;
    };
  }, []);

  // Gate check on mount and when recheckTrigger changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const completed = await AsyncStorage.getItem(KEY_COMPLETED);
        if (cancelled) return;
        if (completed) return; // already done, new-style

        const legacy = await AsyncStorage.getItem(LEGACY_KEY);
        if (cancelled) return;
        if (legacy) {
          // Existing user who finished the old onboarding — migrate silently,
          // never show the fork.
          await AsyncStorage.multiSet([
            [KEY_COMPLETED, new Date().toISOString()],
            [KEY_INTENT, 'skipped'],
          ]);
          return;
        }

        setVisible(true); // fresh install
      } catch {
        // Fail open — never block the app behind a storage error.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recheckTrigger]);

  const choose = useCallback(async (intent: Intent) => {
    try {
      await AsyncStorage.multiSet([
        [KEY_COMPLETED, new Date().toISOString()],
        [KEY_INTENT, intent],
      ]);
    } catch {
      // ignore — still route + dismiss so the user is never trapped
    }
    // Route FIRST, while the modal is still fully opaque and covering
    // everything, so the destination is mounted before we reveal it. Then
    // dismiss — the fork fades out onto the destination, not the Main tab.
    if (intent === 'meals') navigate('Main', { screen: 'Nutrition' });
    else if (intent === 'plan') navigate('OnboardingContract', { flow: 'meal' });
    else if (intent === 'workout') navigate('OnboardingContract', { flow: 'workout' });
    else navigate('Main');

    setVisible(false);
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={() => choose('skipped')}
    >
      {/*
        A React Native <Modal> renders in a separate native view hierarchy, so
        it does NOT inherit the app's SafeAreaProvider — and this modal is
        mounted at the root, where there's no provider above it anyway. So we
        give the modal its own. initialMetrics avoids a first-frame flash.
      */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ForkBody onChoose={choose} />
      </SafeAreaProvider>
    </Modal>
  );
}

// Inner body — lives inside the modal's own SafeAreaProvider so
// useSafeAreaInsets() resolves.
function ForkBody({ onChoose }: { onChoose: (intent: Intent) => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* The photos carry ONLY the logo now, so the mosaic stays unobscured. */}
      <MealCycleHero height={HERO_H}>
        <View style={styles.heroContent}>
          <Logo />
        </View>
      </MealCycleHero>

      {/*
        Everything below the photos. The headline + buttons form one connected
        block that is vertically centred in this area (equal slack above the
        headline and below the buttons) so the screen reads balanced rather than
        top-heavy; "Skip for now" stays pinned to the very bottom.
      */}
      <View style={[styles.lower, { paddingBottom: insets.bottom + 10 }]}>
        <Text style={styles.h1}>
          Eating big,{'\n'}made <Text style={styles.h1Accent}>easy.</Text>
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.browseBtn}
            onPress={() => onChoose('meals')}
            accessibilityRole="button"
            accessibilityLabel="Browse the meals"
          >
            <Ionicons name="restaurant" size={20} color={C.greenText} />
            <Text style={styles.browseText}>Browse the meals</Text>
          </TouchableOpacity>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.buildBtn}
            onPress={() => onChoose('plan')}
            accessibilityRole="button"
            accessibilityLabel="Build a meal plan"
          >
            <Ionicons name="sparkles" size={19} color={C.cyan} />
            <Text style={styles.buildText}>Build a meal plan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.buildBtn}
            onPress={() => onChoose('workout')}
            accessibilityRole="button"
            accessibilityLabel="Build a workout plan"
          >
            <Ionicons name="barbell" size={19} color={C.cyan} />
            <Text style={styles.buildText}>Build a workout plan</Text>
          </TouchableOpacity>
        </View>

        <Pressable
          onPress={() => onChoose('skipped')}
          style={styles.skip}
          accessibilityRole="button"
          accessibilityLabel="Skip for now"
          hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Logo — the brand stamp, rendered over the hero scrim, centred.
  heroContent: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 9,
  },
  barbell: {
    flexDirection: 'row',
    alignItems: 'center',
    // Subtle lift so the cyan mark stays readable on bright photos.
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  plate: {
    width: 4,
    height: 12,
    borderRadius: 2,
    backgroundColor: C.cyan,
  },
  bar: {
    width: 13,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.cyan,
  },
  logoText: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
    // Keep the wordmark legible if it lands outside the darkest part of the scrim.
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  // Headline — lives below the photos, locked to the buttons as one block. Its
  // 'auto' top margin pairs with skip's 'auto' top margin to centre that block
  // vertically while skip stays at the bottom (the two autos split the slack).
  h1: {
    color: C.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 36,
    textAlign: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  h1Accent: {
    color: C.cyan,
  },

  // Lower action area. The headline+buttons block is centred within it via the
  // paired 'auto' margins on h1 and skip (see h1 above).
  lower: {
    flex: 1,
    paddingHorizontal: 20,
  },
  actions: {
    gap: 11,
  },

  browseBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: C.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  browseText: {
    color: C.greenText,
    fontSize: 16,
    fontWeight: '700',
  },

  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 2,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.divider,
  },
  orText: {
    color: C.textMute,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },

  buildBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.cyanBorder,
    backgroundColor: C.cyanFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  buildText: {
    color: C.cyanText,
    fontSize: 15,
    fontWeight: '700',
  },

  // Pinned to the bottom: this 'auto' top margin and h1's 'auto' top margin
  // share the leftover space equally, which centres the headline+buttons block
  // above while keeping skip itself at the bottom edge.
  skip: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 'auto',
  },
  skipText: {
    color: C.textMute,
    fontSize: 14,
    fontWeight: '500',
  },
});