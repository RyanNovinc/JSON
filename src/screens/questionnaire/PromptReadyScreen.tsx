// src/screens/questionnaire/PromptReadyScreen.tsx
//
// Final step of the workout questionnaire flow. Shows:
//   1. Initial state: personalized YOUR PROGRAM card, 3-step flow,
//      Claude + ChatGPT cards (equal weight, Claude first because its
//      free tier is more capable for this use case), "Use a different
//      AI" copy-only option, and an "Already have your file? Import it"
//      footer link.
//
//   2. Return state: when the user comes back from an external AI after
//      being away for at least 30 seconds, the screen transforms — a
//      cyan "Welcome back" banner becomes the new hero with a prominent
//      "Import your workout file" button. The AI cards demote to a
//      retry section ("Didn't work? Try a different AI").
//
// On tap of an AI card, an AILaunchSheet slides up confirming the
// clipboard write and requiring an explicit "Open Claude" / "Open
// ChatGPT" tap before launching the URL.
//
// A persistent flag (WorkoutStorage.setAwaitingImport) is set whenever
// the user copies the prompt — this lets CreateChooserScreen show a
// "Continue your setup" banner on cold launch if iOS killed the app
// while the user was in the AI.
//
// v7 update notes:
//   - Subtitle simplified to one sentence (no "file" jargon)
//   - Generous vertical spacing throughout to fix cramped feel
//   - Removed redundant open-outline icon from AI cards
//   - YOUR PROGRAM card slightly more prominent (bigger icon, bigger
//     title, more padding)
//   - 3-step flow icons slightly larger (38px) with cyan "You send"
//     label matching the highlighted icon

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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { WorkoutStorage } from '../../utils/storage';
import { assemblePlanningPrompt } from '../../data/planningPrompt';
import {
  AILaunchSheet,
  AIProvider,
} from '../../components/questionnaire/AILaunchSheet';
import { RootStackParamList } from '../../navigation/AppNavigator';

type NavProp = StackNavigationProp<RootStackParamList, 'PromptReady'>;

// We open web URLs directly rather than trying custom URL schemes.
// Behaviour is driven by each app's verified Apple App Site
// Association (Universal Links) config:
//   - Claude does NOT register claude.ai/new, so this opens Safari.
//     That's fine: the user lands on a logged-in web session and
//     pastes the prompt that's already on their clipboard.
//   - ChatGPT registers chatgpt.com/#native to "start a new
//     conversation in-app", so this opens the native ChatGPT app
//     when installed, and falls back to web (the fragment is
//     harmless) when not.
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

// Minimum time the user must spend in background before we treat the
// return as "back from the AI". 3 seconds filters out instant gesture-based
// things like Control Center / Notification Center pulls but lets real
// app-switch returns through.
const RETURN_THRESHOLD_MS = 3 * 1000;

export default function PromptReadyScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const [prompt, setPrompt] = useState<string>('');
  const [programLabel, setProgramLabel] = useState<string>(
    'Your custom workout'
  );
  const [programMeta, setProgramMeta] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('claude');

  const [hasOpenedAI, setHasOpenedAI] = useState(false);
  const [returnedFromAI, setReturnedFromAI] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const scrollViewRef = useRef<ScrollView>(null);

  // -------------------------------------------------------------------------
  // Load questionnaire data and assemble the prompt + preview card content
  // -------------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const fitnessGoals = await WorkoutStorage.loadFitnessGoalsResults();
        const equipment =
          await WorkoutStorage.loadEquipmentPreferencesResults();
        const merged = { ...(fitnessGoals || {}), ...(equipment || {}) };
        const assembled = assemblePlanningPrompt(merged);
        setPrompt(assembled);
        setProgramLabel(buildProgramLabel(merged));
        setProgramMeta(buildProgramMeta(merged));
      } catch (e) {
        console.error('Failed to load prompt data', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // -------------------------------------------------------------------------
  // AppState listener — detect user returning from external AI
  // -------------------------------------------------------------------------
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appState.current;

      if (next.match(/inactive|background/)) {
        backgroundedAt.current = Date.now();
      }

      if (
        prev.match(/inactive|background/) &&
        next === 'active' &&
        hasOpenedAI
      ) {
        const elapsed = backgroundedAt.current
          ? Date.now() - backgroundedAt.current
          : 0;
        if (elapsed >= RETURN_THRESHOLD_MS) {
          setReturnedFromAI(true);
        }
      }

      appState.current = next;
    });

    return () => sub.remove();
  }, [hasOpenedAI]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleSelectAI = useCallback((provider: AIProvider) => {
    setSelectedProvider(provider);
    setSheetVisible(true);
  }, []);

  const handleConfirmLaunch = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(prompt);
      await WorkoutStorage.setAwaitingImport(true);
      setHasOpenedAI(true);
      setSheetVisible(false);
      // Small delay so the sheet animates out before the URL launches
      setTimeout(() => {
        openAIApp(selectedProvider);
      }, 250);
    } catch (e) {
      console.error('Launch AI failed', e);
      setSheetVisible(false);
    }
  }, [prompt, selectedProvider]);

  const handleCancelSheet = useCallback(() => {
    setSheetVisible(false);
  }, []);

  const handleCopyOnly = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(prompt);
      await WorkoutStorage.setAwaitingImport(true);
      setHasOpenedAI(true);
      Alert.alert(
        'Prompt copied',
        'Open your AI of choice and paste it. Come back here when you have your workout file.',
        [{ text: 'Got it', style: 'default' }]
      );
    } catch (e) {
      console.error('Copy failed', e);
    }
  }, [prompt]);

  // Initial state's "Import it" footer link: don't navigate yet, just
  // transform the screen into the welcome-back state. This consolidates
  // both paths ("I came back from AI" and "I already have my file") into
  // one consistent destination. Also sets the awaitingImport flag so the
  // cold-launch recovery banner kicks in if they leave to grab their file.
  const handleImportFromInitial = useCallback(async () => {
    try {
      await WorkoutStorage.setAwaitingImport(true);
    } catch (e) {
      console.error('setAwaitingImport failed', e);
    }
    setReturnedFromAI(true);
    // Scroll to top so the welcome banner is in view
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  // Welcome-back state's "Import your workout file" button: actual nav
  const handleImport = useCallback(() => {
    navigation.navigate('ImportRoutine', { fromNewFlow: true });
  }, [navigation]);

  const handleClose = useCallback(() => {
    navigation.popToTop();
  }, [navigation]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={themeColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
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
          <ReturnState
            onImport={handleImport}
            onRetryAI={handleSelectAI}
            themeColor={themeColor}
          />
        ) : (
          <InitialState
            programLabel={programLabel}
            programMeta={programMeta}
            themeColor={themeColor}
            onSelectAI={handleSelectAI}
            onImport={handleImportFromInitial}
            onCopyOnly={handleCopyOnly}
          />
        )}
      </ScrollView>

      <AILaunchSheet
        visible={sheetVisible}
        provider={selectedProvider}
        onConfirm={handleConfirmLaunch}
        onCancel={handleCancelSheet}
      />
    </View>
  );
}

// ============================================================================
// Initial state — the screen the user sees first
// ============================================================================
interface InitialStateProps {
  programLabel: string;
  programMeta: string;
  themeColor: string;
  onSelectAI: (provider: AIProvider) => void;
  onImport: () => void;
  onCopyOnly: () => void;
}

const InitialState: React.FC<InitialStateProps> = ({
  programLabel,
  programMeta,
  themeColor,
  onSelectAI,
  onImport,
  onCopyOnly,
}) => (
  <>
    <View style={styles.titleBlock}>
      <Text style={styles.title}>Almost there.</Text>
      <Text style={styles.subtitle}>
        An AI you already use will design your workout from your answers.
      </Text>
    </View>

    {/* YOUR PROGRAM personalized card */}
    <View
      style={[
        styles.programCard,
        {
          backgroundColor: 'rgba(34, 211, 238, 0.08)',
          borderColor: 'rgba(34, 211, 238, 0.25)',
        },
      ]}
    >
      <View
        style={[
          styles.programIcon,
          { backgroundColor: 'rgba(34, 211, 238, 0.2)' },
        ]}
      >
        <Ionicons name="barbell-outline" size={18} color={themeColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.programLabel}>YOUR PROGRAM</Text>
        <Text style={styles.programTitle}>{programLabel}</Text>
        {programMeta ? (
          <Text style={styles.programMeta}>{programMeta}</Text>
        ) : null}
      </View>
    </View>

    {/* 3-step flow */}
    <FlowStrip themeColor={themeColor} state="initial" />

    {/* Claude card */}
    <TouchableOpacity
      style={styles.aiCard}
      onPress={() => onSelectAI('claude')}
      activeOpacity={0.85}
    >
      <View
        style={[styles.aiLogoBox, { backgroundColor: 'rgba(217, 119, 87, 0.2)' }]}
      >
        <Text style={[styles.aiLogoLetter, { color: '#d97757' }]}>C</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.aiName}>Claude</Text>
      </View>
      <View style={[styles.aiArrow, { backgroundColor: themeColor }]}>
        <Ionicons name="arrow-forward" size={16} color="#0a0a0b" />
      </View>
    </TouchableOpacity>

    {/* ChatGPT card */}
    <TouchableOpacity
      style={styles.aiCard}
      onPress={() => onSelectAI('chatgpt')}
      activeOpacity={0.85}
    >
      <View
        style={[
          styles.aiLogoBox,
          { backgroundColor: 'rgba(16, 163, 127, 0.15)' },
        ]}
      >
        <Text style={[styles.aiLogoLetter, { color: '#10a37f' }]}>G</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.aiName}>ChatGPT</Text>
      </View>
      <View style={[styles.aiArrow, { backgroundColor: themeColor }]}>
        <Ionicons name="arrow-forward" size={16} color="#0a0a0b" />
      </View>
    </TouchableOpacity>

    {/* Use a different AI — copies to clipboard so user can paste anywhere */}
    <TouchableOpacity
      style={styles.differentAIButton}
      onPress={onCopyOnly}
      activeOpacity={0.7}
    >
      <Ionicons name="ellipsis-horizontal" size={14} color="#a1a1aa" />
      <Text style={styles.differentAIText}>Use a different AI</Text>
    </TouchableOpacity>

    {/* Footer: existing file path */}
    <TouchableOpacity
      style={styles.footerLink}
      onPress={onImport}
      activeOpacity={0.7}
    >
      <Text style={styles.footerLinkText}>Already have your file? </Text>
      <Text
        style={[
          styles.footerLinkText,
          { color: themeColor, fontWeight: '600' },
        ]}
      >
        Import it
      </Text>
    </TouchableOpacity>
  </>
);

// ============================================================================
// Return state — what the user sees when they come back from the AI
// ============================================================================
interface ReturnStateProps {
  onImport: () => void;
  onRetryAI: (provider: AIProvider) => void;
  themeColor: string;
}

const ReturnState: React.FC<ReturnStateProps> = ({
  onImport,
  onRetryAI,
  themeColor,
}) => (
  <>
    {/* Welcome back banner — the new hero */}
    <View style={[styles.welcomeBanner, { backgroundColor: themeColor }]}>
      <View style={styles.welcomeHeader}>
        <View style={styles.welcomeIconBox}>
          <Ionicons name="clipboard-outline" size={20} color="#0a0a0b" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.welcomeTitle}>Welcome back</Text>
          <Text style={styles.welcomeSubtitle}>Got your workout file?</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.welcomeButton}
        onPress={onImport}
        activeOpacity={0.85}
      >
        <Ionicons
          name="cloud-download-outline"
          size={16}
          color={themeColor}
        />
        <Text style={[styles.welcomeButtonText, { color: themeColor }]}>
          Import your workout file
        </Text>
      </TouchableOpacity>
    </View>

    {/* 3-step flow, "Import now" lit up */}
    <FlowStrip themeColor={themeColor} state="returned" />

    {/* Retry section */}
    <Text style={styles.didntWorkLabel}>DIDN'T WORK? TRY A DIFFERENT AI</Text>

    <View style={{ opacity: 0.75 }}>
      <TouchableOpacity
        style={styles.aiCardCompact}
        onPress={() => onRetryAI('claude')}
        activeOpacity={0.85}
      >
        <View
          style={[
            styles.aiLogoBoxSmall,
            { backgroundColor: 'rgba(217, 119, 87, 0.2)' },
          ]}
        >
          <Text style={[styles.aiLogoLetterSmall, { color: '#d97757' }]}>
            C
          </Text>
        </View>
        <Text style={styles.aiNameCompact}>Claude</Text>
        <Ionicons name="arrow-forward" size={14} color="#71717a" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.aiCardCompact}
        onPress={() => onRetryAI('chatgpt')}
        activeOpacity={0.85}
      >
        <View
          style={[
            styles.aiLogoBoxSmall,
            { backgroundColor: 'rgba(16, 163, 127, 0.15)' },
          ]}
        >
          <Text style={[styles.aiLogoLetterSmall, { color: '#10a37f' }]}>
            G
          </Text>
        </View>
        <Text style={styles.aiNameCompact}>ChatGPT</Text>
        <Ionicons name="arrow-forward" size={14} color="#71717a" />
      </TouchableOpacity>
    </View>
  </>
);

// ============================================================================
// FlowStrip — the 3-step "You send / AI designs / You import" visual
// ============================================================================
interface FlowStripProps {
  themeColor: string;
  state: 'initial' | 'returned';
}

const FlowStrip: React.FC<FlowStripProps> = ({ themeColor, state }) => {
  const completed = state === 'returned';

  return (
    <View style={styles.flowStrip}>
      <FlowStep
        icon="paper-plane-outline"
        label={completed ? 'You sent' : 'You send'}
        // In initial state, "You send" is the user's next action — accent it.
        active={!completed}
        done={completed}
        themeColor={themeColor}
      />

      <Ionicons
        name="arrow-forward"
        size={14}
        color="#3f3f46"
        style={{ paddingBottom: 18, opacity: completed ? 0.45 : 1 }}
      />

      <FlowStep
        icon="sparkles-outline"
        label={completed ? 'AI designed' : 'AI designs'}
        active={false}
        done={completed}
        themeColor={themeColor}
      />

      <Ionicons
        name="arrow-forward"
        size={14}
        color={completed ? themeColor : '#3f3f46'}
        style={{ paddingBottom: 18 }}
      />

      <FlowStep
        icon="cloud-download-outline"
        label={completed ? 'Import now' : 'You import'}
        active={completed}
        done={false}
        themeColor={themeColor}
      />
    </View>
  );
};

interface FlowStepProps {
  icon: any;
  label: string;
  active: boolean;
  done: boolean;
  themeColor: string;
}

const FlowStep: React.FC<FlowStepProps> = ({
  icon,
  label,
  active,
  done,
  themeColor,
}) => {
  const showIcon = done ? 'checkmark' : icon;
  const iconColor = active ? themeColor : '#71717a';
  const labelColor = active ? themeColor : '#a1a1aa';
  const bgColor = active ? 'rgba(34, 211, 238, 0.18)' : '#18181b';
  const borderColor = active ? themeColor : '#27272a';
  const borderWidth = active ? 1.5 : 0.5;

  return (
    <View style={[styles.flowStep, { opacity: done ? 0.45 : 1 }]}>
      <View
        style={[
          styles.flowStepIconBox,
          {
            backgroundColor: bgColor,
            borderColor,
            borderWidth,
          },
        ]}
      >
        <Ionicons name={showIcon as any} size={16} color={iconColor} />
      </View>
      <Text
        style={[
          styles.flowStepLabel,
          { color: labelColor, fontWeight: active ? '600' : '500' },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

// ============================================================================
// Helpers — build the YOUR PROGRAM card content from questionnaire data
// ============================================================================
function buildProgramLabel(data: any): string {
  const duration = formatDuration(data?.programDuration);
  const goal = formatGoal(data?.primaryGoal);
  if (duration && goal) return `${duration} ${goal} plan`;
  if (goal) return `${goal} plan`;
  if (duration) return `${duration} workout plan`;
  return 'Your custom workout';
}

function buildProgramMeta(data: any): string {
  const days = data?.totalTrainingDays
    ? `${data.totalTrainingDays} days/week`
    : '';
  const equipment = formatEquipment(data?.selectedEquipment);
  return [days, equipment].filter(Boolean).join(' · ');
}

function formatDuration(d?: string): string {
  if (!d) return '';
  const map: Record<string, string> = {
    '4_weeks': '4-week',
    '8_weeks': '8-week',
    '12_weeks': '12-week',
    '6_months': '6-month',
    '1_year': '1-year',
    custom: '',
  };
  return map[d] || '';
}

function formatGoal(g?: string): string {
  if (!g) return '';
  const map: Record<string, string> = {
    build_muscle: 'build muscle',
    burn_fat: 'burn fat',
    gain_strength: 'gain strength',
    body_recomposition: 'body recomp',
    general_fitness: 'general fitness',
  };
  return map[g] || '';
}

function formatEquipment(e?: string[]): string {
  if (!e || e.length === 0) return '';
  const map: Record<string, string> = {
    commercial_gym: 'Commercial gym',
    home_gym: 'Home gym',
    bodyweight: 'Bodyweight',
    basic_equipment: 'Basic equipment',
  };
  return map[e[0]] || '';
}

// ============================================================================
// Styles
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
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
  headerLabel: {
    fontSize: 11,
    color: '#71717a',
    letterSpacing: 0.5,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Title block — generous top padding to breathe from header
  titleBlock: {
    paddingTop: 32,
    paddingBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 34,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 21,
  },

  // YOUR PROGRAM card — slightly more prominent than v6
  programCard: {
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 28,
    marginBottom: 32,
  },
  programIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  programLabel: {
    fontSize: 11,
    color: '#71717a',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 3,
  },
  programTitle: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
    lineHeight: 19,
  },
  programMeta: {
    fontSize: 12,
    color: '#a1a1aa',
    marginTop: 3,
  },

  // 3-step flow — bigger icons, more space
  flowStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 34,
  },
  flowStep: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  flowStepIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowStepLabel: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },

  // AI cards (initial state) — larger and more spaced
  aiCard: {
    backgroundColor: '#18181b',
    borderWidth: 0.5,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  aiLogoBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiLogoLetter: {
    fontSize: 21,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  aiName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 22,
    flex: 1,
  },
  aiArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // "Use a different AI" — more isolated with generous margin
  differentAIButton: {
    backgroundColor: '#0f0f10',
    borderWidth: 0.5,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 22,
    marginBottom: 28,
  },
  differentAIText: {
    fontSize: 13,
    color: '#d4d4d8',
    fontWeight: '500',
  },

  // Footer link
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    marginTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#18181b',
  },
  footerLinkText: {
    fontSize: 13,
    color: '#71717a',
  },

  // Return state — welcome banner
  welcomeBanner: {
    borderRadius: 18,
    padding: 20,
    marginTop: 20,
    marginBottom: 22,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  welcomeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 10, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0a0a0b',
    lineHeight: 22,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: 'rgba(10, 10, 11, 0.7)',
    lineHeight: 18,
    marginTop: 1,
  },
  welcomeButton: {
    backgroundColor: '#0a0a0b',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  welcomeButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Return state — retry section
  didntWorkLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: '#71717a',
    marginBottom: 10,
  },
  aiCardCompact: {
    backgroundColor: '#18181b',
    borderWidth: 0.5,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  aiLogoBoxSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiLogoLetterSmall: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  aiNameCompact: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});