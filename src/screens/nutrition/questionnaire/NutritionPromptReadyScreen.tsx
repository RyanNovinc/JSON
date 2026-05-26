// src/screens/nutrition/questionnaire/NutritionPromptReadyScreen.tsx
//
// Nutrition handoff — a clone of the workout PromptReadyScreen with three
// swaps:
//   1. The prompt is `await assembleMealPlanningPrompt()` (async, reads
//      storage itself) instead of assemblePlanningPrompt(merged).
//   2. The preview card shows a macro/profile recap built from the saved
//      results, not generateProgramSpecs (the meal prompt's machine
//      preamble is not something to surface).
//   3. Import is a navigation to ImportMealPlan (the meal importer has no
//      inline hook like useWorkoutImport), not an in-screen pipeline.
//
// Everything else — copy pill, Open in Claude/ChatGPT rows, "See how it
// works" sheet, return-state rework after coming back from the AI — is
// the same as the workout screen.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  AppState,
  AppStateStatus,
  Linking,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import { WorkoutStorage } from '../../../utils/storage';
import { assembleMealPlanningPrompt } from '../../../data/mealPlanningPrompt';
import { AIProvider } from '../../../components/questionnaire/AILaunchSheet';

type NavProp = StackNavigationProp<any>;

const AI_WEB_URLS: Record<AIProvider, string> = {
  claude: 'https://claude.ai/new',
  chatgpt: 'https://chatgpt.com/#native',
};

async function openAIApp(provider: AIProvider): Promise<void> {
  try {
    await Linking.openURL(AI_WEB_URLS[provider]);
  } catch (err) {
    console.error('Failed to open AI URL', err);
  }
}

const RETURN_THRESHOLD_MS = 3 * 1000;
const MONO_FONT = Platform.select({ ios: 'Courier', default: 'monospace' });

// Build the human-readable recap shown in the preview card from the saved
// results. NOT the machine prompt — the full prompt goes to the clipboard.
function buildNutritionPreview(nutrition: any, budget: any): string {
  const f = nutrition?.formData ?? {};
  const m = nutrition?.macroResults ?? {};
  const b = budget?.formData ?? {};
  const lines: string[] = [];

  const goalLabel =
    f.goal === 'lose_weight'
      ? 'Lose weight'
      : f.goal === 'gain_weight'
      ? 'Gain weight'
      : 'Maintain weight';
  lines.push('GOAL');
  lines.push(f.rate != null ? `${goalLabel} · ${f.rate} kg/week` : goalLabel);
  lines.push('');

  if (m.calories != null) {
    lines.push('DAILY TARGETS');
    lines.push(`${Number(m.calories).toLocaleString()} kcal`);
    lines.push(`Protein ${m.protein}g · Carbs ${m.carbs}g · Fat ${m.fat}g`);
    lines.push('');
  }

  lines.push('PLAN');
  if (b.mealsPerDay != null) lines.push(`${b.mealsPerDay} meals per day`);
  if (b.planDuration != null) lines.push(`${b.planDuration} days`);
  lines.push('');

  if (b.groceryStore || b.country) {
    lines.push('SHOPPING');
    const loc = [b.city, b.country].filter(Boolean).join(', ');
    lines.push([b.groceryStore, loc].filter(Boolean).join(' · '));
  }

  return lines.join('\n').trim();
}

export default function NutritionPromptReadyScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const [prompt, setPrompt] = useState<string>('');
  const [promptPreview, setPromptPreview] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [copied, setCopied] = useState(false);
  const [hasOpenedAI, setHasOpenedAI] = useState(false);
  const [returnedFromAI, setReturnedFromAI] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);

  const backgroundedAt = useRef<number | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const scrollViewRef = useRef<ScrollView>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Assemble the prompt + build the preview from the saved results.
  useEffect(() => {
    (async () => {
      try {
        const [nutrition, budget] = await Promise.all([
          WorkoutStorage.loadNutritionResults(),
          WorkoutStorage.loadBudgetCookingResults(),
        ]);
        setPromptPreview(buildNutritionPreview(nutrition, budget));

        try {
          const assembled = await assembleMealPlanningPrompt();
          setPrompt(assembled);
        } catch (promptErr) {
          console.error('assembleMealPlanningPrompt failed', promptErr);
          // Leave prompt empty; ensureCopied guards on this.
        }
      } catch (e) {
        console.error('Failed to load prompt data', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Detect returning from the external AI.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appState.current;
      if (next.match(/inactive|background/)) {
        backgroundedAt.current = Date.now();
      }
      if (prev.match(/inactive|background/) && next === 'active' && hasOpenedAI) {
        const elapsed = backgroundedAt.current
          ? Date.now() - backgroundedAt.current
          : 0;
        if (elapsed >= RETURN_THRESHOLD_MS) {
          setReturnedFromAI(true);
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [hasOpenedAI]);

  const ensureCopied = useCallback(async (): Promise<boolean> => {
    if (!prompt || prompt.length === 0) {
      Alert.alert(
        'One sec',
        'Your prompt is still loading — try again in a moment.'
      );
      return false;
    }
    try {
      await Clipboard.setStringAsync(prompt);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
      return true;
    } catch (e) {
      Alert.alert('Copy failed', (e as Error).message);
      return false;
    }
  }, [prompt]);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  const handleCopyCard = useCallback(async () => {
    await ensureCopied();
  }, [ensureCopied]);

  const handleOpenAI = useCallback(
    async (provider: AIProvider) => {
      const ok = await ensureCopied();
      if (!ok) return;
      setHasOpenedAI(true);
      setTimeout(() => openAIApp(provider), 120);
    },
    [ensureCopied]
  );

  // Import → the meal-plan importer (no inline hook for nutrition).
  const goToImport = useCallback(() => {
    navigation.navigate('ImportMealPlan' as never, {} as never);
  }, [navigation]);

  const handleClose = useCallback(() => navigation.popToTop(), [navigation]);

  const handleBack = useCallback(() => {
    if (returnedFromAI) {
      setReturnedFromAI(false);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    navigation.goBack();
  }, [navigation, returnedFromAI]);

  const openHelp = useCallback(() => setHelpVisible(true), []);
  const closeHelp = useCallback(() => setHelpVisible(false), []);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={themeColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleBack}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={18} color="#d4d4d8" />
        </TouchableOpacity>
        <Text style={styles.headerLabel}>Last step</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleClose}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={18} color="#d4d4d8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {returnedFromAI ? (
          <ReturnState onImport={goToImport} themeColor={themeColor} />
        ) : (
          <InitialState
            promptPreview={promptPreview}
            copied={copied}
            themeColor={themeColor}
            onCopy={handleCopyCard}
            onOpenAI={handleOpenAI}
            onHelp={openHelp}
            onImport={goToImport}
          />
        )}
      </ScrollView>

      <HelpSheet visible={helpVisible} themeColor={themeColor} onClose={closeHelp} />
    </View>
  );
}

// ============================================================================
// Initial state
// ============================================================================
interface InitialStateProps {
  promptPreview: string;
  copied: boolean;
  themeColor: string;
  onCopy: () => void;
  onOpenAI: (provider: AIProvider) => void;
  onHelp: () => void;
  onImport: () => void;
}

const InitialState: React.FC<InitialStateProps> = ({
  promptPreview,
  copied,
  themeColor,
  onCopy,
  onOpenAI,
  onHelp,
  onImport,
}) => (
  <>
    <View style={styles.titleBlock}>
      <Text style={styles.title}>Your prompt is ready.</Text>
    </View>

    <TouchableOpacity style={styles.promptCard} onPress={onCopy} activeOpacity={0.8}>
      <Text style={[styles.promptText, { fontFamily: MONO_FONT }]} numberOfLines={7}>
        {promptPreview}
      </Text>

      <LinearGradient
        colors={['rgba(19,19,22,0)', 'rgba(19,19,22,0.85)', '#131316']}
        locations={[0, 0.55, 1]}
        style={styles.promptFade}
        pointerEvents="none"
      />

      <View
        style={[
          styles.copyPill,
          copied
            ? {
                backgroundColor: hexToRgba(themeColor, 0.12),
                borderColor: hexToRgba(themeColor, 0.3),
              }
            : { backgroundColor: '#18181b', borderColor: '#27272a' },
        ]}
      >
        <Ionicons
          name={copied ? 'checkmark' : 'copy-outline'}
          size={13}
          color={copied ? themeColor : '#a1a1aa'}
        />
        <Text style={[styles.copyPillText, { color: copied ? themeColor : '#a1a1aa' }]}>
          {copied ? 'Copied' : 'Copy'}
        </Text>
      </View>
    </TouchableOpacity>

    <View style={styles.framingRow}>
      <Ionicons name="arrow-down" size={14} color="#52525b" />
      <Text style={styles.framingText}>Paste it into an AI you already use</Text>
    </View>

    <TouchableOpacity
      style={styles.aiRow}
      onPress={() => onOpenAI('claude')}
      activeOpacity={0.85}
    >
      <View style={[styles.aiLogoBox, { backgroundColor: 'rgba(217, 119, 87, 0.2)' }]}>
        <Text style={[styles.aiLogoLetter, { color: '#d97757' }]}>C</Text>
      </View>
      <Text style={styles.aiRowText}>Open in Claude</Text>
      <Ionicons name="open-outline" size={19} color={themeColor} />
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.aiRow}
      onPress={() => onOpenAI('chatgpt')}
      activeOpacity={0.85}
    >
      <View
        style={[
          styles.aiLogoBox,
          { backgroundColor: '#232328', borderWidth: 0.5, borderColor: '#313137' },
        ]}
      >
        <Text style={[styles.aiLogoLetter, { color: '#fafafa' }]}>G</Text>
      </View>
      <Text style={styles.aiRowText}>Open in ChatGPT</Text>
      <Ionicons name="open-outline" size={19} color={themeColor} />
    </TouchableOpacity>

    <Text style={styles.otherAIHint}>…or use any other AI you like</Text>

    <View style={styles.footer}>
      <TouchableOpacity
        style={styles.helpPill}
        onPress={onHelp}
        activeOpacity={0.7}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Ionicons name="help-circle-outline" size={15} color="#a1a1aa" />
        <Text style={styles.helpPillText}>See how it works</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.footerLink} onPress={onImport} activeOpacity={0.7}>
        <Text style={styles.footerLinkText}>Already have your file? </Text>
        <Text style={[styles.footerLinkText, { color: themeColor, fontWeight: '600' }]}>
          Import it
        </Text>
      </TouchableOpacity>
    </View>
  </>
);

// ============================================================================
// Return state — back from the AI
// ============================================================================
interface ReturnStateProps {
  onImport: () => void;
  themeColor: string;
}

const ReturnState: React.FC<ReturnStateProps> = ({ onImport, themeColor }) => (
  <View style={styles.returnRoot}>
    <View style={styles.returnTitleBlock}>
      <Text style={styles.title}>Almost done.</Text>
      <Text style={styles.returnSubtitle}>
        Bring back the meal-plan file your AI gave you.
      </Text>
    </View>

    <View style={styles.returnBody}>
      <TouchableOpacity style={styles.pasteZone} onPress={onImport} activeOpacity={0.85}>
        <View style={styles.pasteZoneIcon}>
          <Ionicons name="download-outline" size={28} color={themeColor} />
        </View>
        <Text style={styles.pasteZoneTitle}>Import your file</Text>
        <Text style={styles.pasteZoneHint}>Paste it or pick the saved file</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ============================================================================
// HelpSheet
// ============================================================================
interface HelpSheetProps {
  visible: boolean;
  themeColor: string;
  onClose: () => void;
}

const HELP_STEPS: { title: string; body: string }[] = [
  {
    title: 'Open your AI & paste',
    body: 'Your prompt is on the clipboard. Open Claude or ChatGPT and paste it into the chat.',
  },
  {
    title: 'Follow what it tells you',
    body: "The AI builds your meal plan and hands back a file. It'll guide you to download or copy it.",
  },
  {
    title: 'Come back & import',
    body: 'Return here, import the file, and your meal plan loads into the app.',
  },
];

const HelpSheet: React.FC<HelpSheetProps> = ({ visible, themeColor, onClose }) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(600)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      translateY.setValue(600);
      backdrop.setValue(0);
    }
  }, [visible, translateY, backdrop]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.sheetBackdrop, { opacity: backdrop }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      <View style={styles.sheetRoot} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheetCard,
            { paddingBottom: insets.bottom + 24, transform: [{ translateY }] },
          ]}
        >
          <View style={styles.sheetGrabber} />
          <Text style={styles.sheetTitle}>How this works</Text>
          <Text style={styles.sheetIntro}>
            JSON.fit builds you a prompt from your answers, but an AI you already
            use designs the actual meal plan. Here&apos;s the round trip:
          </Text>

          {HELP_STEPS.map((step, i) => (
            <View key={step.title} style={styles.sheetStep}>
              <View
                style={[
                  styles.sheetStepNum,
                  {
                    backgroundColor: hexToRgba(themeColor, 0.15),
                    borderColor: hexToRgba(themeColor, 0.35),
                  },
                ]}
              >
                <Text style={[styles.sheetStepNumText, { color: themeColor }]}>
                  {i + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetStepTitle}>{step.title}</Text>
                <Text style={styles.sheetStepBody}>{step.body}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.sheetCta, { backgroundColor: themeColor }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.sheetCtaText}>Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(34, 211, 238, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#18181b',
    borderWidth: 0.5,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLabel: { fontSize: 11, color: '#71717a', letterSpacing: 0.5 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  titleBlock: { paddingTop: 44, paddingBottom: 6 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  promptCard: {
    backgroundColor: '#131316',
    borderWidth: 0.5,
    borderColor: '#27272a',
    borderRadius: 18,
    padding: 18,
    marginTop: 32,
    minHeight: 168,
    overflow: 'hidden',
  },
  promptText: { fontSize: 11, color: '#6b7280', lineHeight: 18 },
  promptFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 96,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  copyPill: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 0.5,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  copyPillText: { fontSize: 12, fontWeight: '600' },
  framingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 28,
    paddingBottom: 8,
  },
  framingText: { fontSize: 13, color: '#d4d4d8' },
  aiRow: {
    backgroundColor: '#18181b',
    borderWidth: 0.5,
    borderColor: '#27272a',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 14,
  },
  aiLogoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiLogoLetter: { fontSize: 21, fontWeight: '600', letterSpacing: -0.5 },
  aiRowText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#ffffff' },
  otherAIHint: {
    fontSize: 13,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 20,
  },
  footer: {
    alignItems: 'center',
    gap: 22,
    paddingTop: 36,
    marginTop: 36,
    borderTopWidth: 0.5,
    borderTopColor: '#18181b',
  },
  helpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderWidth: 0.5,
    borderColor: '#27272a',
    borderRadius: 20,
  },
  helpPillText: { fontSize: 13, color: '#d4d4d8', fontWeight: '500' },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  footerLinkText: { fontSize: 13, color: '#71717a' },
  returnRoot: { flex: 1 },
  returnTitleBlock: { paddingTop: 48, paddingBottom: 6 },
  returnSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 21,
    marginTop: 10,
  },
  returnBody: { flex: 1, paddingTop: 26, paddingBottom: 8 },
  pasteZone: {
    flex: 1,
    minHeight: 220,
    backgroundColor: 'rgba(34, 211, 238, 0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 211, 238, 0.35)',
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasteZoneIcon: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pasteZoneTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
  },
  pasteZoneHint: { fontSize: 12, color: '#71717a', marginTop: 6 },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetCard: {
    backgroundColor: '#131316',
    borderTopWidth: 0.5,
    borderColor: '#27272a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3f3f46',
    marginTop: 8,
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  sheetIntro: {
    fontSize: 13,
    color: '#a1a1aa',
    lineHeight: 19,
    marginBottom: 24,
  },
  sheetStep: { flexDirection: 'row', gap: 14, marginBottom: 20 },
  sheetStepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetStepNumText: { fontSize: 12, fontWeight: '600' },
  sheetStepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  sheetStepBody: { fontSize: 12.5, color: '#a1a1aa', lineHeight: 18 },
  sheetCta: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  sheetCtaText: { fontSize: 15, fontWeight: '700', color: '#0a0a0b' },
});