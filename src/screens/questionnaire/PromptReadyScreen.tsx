// src/screens/questionnaire/PromptReadyScreen.tsx
//
// Final step of the workout questionnaire flow. Design "Direction C":
// the prompt itself is the hero. The app builds a prompt from the
// user's questionnaire answers; the user sends it to an AI THEY already
// use (Claude / ChatGPT), which designs the plan and returns a file
// the user imports back into the app.
//
//   1. Initial state:
//        - "Your prompt is ready." headline
//        - A friendly, human-readable preview of what the prompt asks
//          for (goal / duration / days / equipment) — NOT the raw
//          machine text. Tap the card to copy: the pill flips "Copy" →
//          "Copied". The full technical prompt goes to the clipboard
//          untouched.
//        - "Paste it into an AI you already use" framing line.
//        - "Open in Claude" / "Open in ChatGPT" rows. These are
//          DESTINATIONS, not engines: tapping silently RE-COPIES the
//          prompt (clipboard-freshness guarantee) then launches the AI,
//          so the user is never stranded with an empty clipboard whether
//          or not they tapped the card first.
//        - "Copy again & use any other AI" escape hatch.
//        - "Confused?" — opens a self-contained help sheet explaining
//          the full round trip. Confusion is a one-time event, so the
//          explanation is available-on-demand rather than always-on.
//        - "Already have your file? Import it" footer link.
//
//   2. Return state: when the user comes back from an external AI after
//      being away for at least RETURN_THRESHOLD_MS, the screen reworks —
//      the two import actions ("Paste from clipboard" / "Import saved
//      file") become the hero, and the AI rows demote to a quiet retry
//      section ("Didn't work? Try a different AI").
//
// A persistent flag (WorkoutStorage.setAwaitingImport) is set as soon as
// the prompt is copied — this lets CreateChooserScreen show a "Continue
// your setup" banner on cold launch if iOS killed the app while the user
// was in the AI.
//
// Import is handled INLINE via the useWorkoutImport hook — both the
// clipboard and saved-file paths run the full import pipeline and show
// the confirmation modal on this screen, without navigating to the
// separate ImportRoutine screen.

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
import ImportConfirmationModal from '../../components/import/ImportConfirmationModal';
import { useTheme } from '../../contexts/ThemeContext';
import { WorkoutStorage } from '../../utils/storage';
import { assemblePlanningPrompt } from '../../data/planningPrompt';
import { AIProvider } from '../../components/questionnaire/AILaunchSheet';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useWorkoutImport } from '../../hooks/useWorkoutImport';
import { Analytics } from '../../services/analytics';

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

// Monospace family for the prompt preview. DM Mono isn't bundled, so we
// fall back to the platform default monospace (Courier on iOS).
const MONO_FONT = Platform.select({ ios: 'Courier', default: 'monospace' });

export default function PromptReadyScreen() {
  console.log('[PROMPTREADY] render');
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const [prompt, setPrompt] = useState<string>('');
  const [promptPreview, setPromptPreview] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // True once the user has tapped the prompt card to copy. Drives the
  // pill: "Copy" → "Copied".
  const [copied, setCopied] = useState(false);

  const [hasOpenedAI, setHasOpenedAI] = useState(false);
  const [returnedFromAI, setReturnedFromAI] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);

  const backgroundedAt = useRef<number | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const scrollViewRef = useRef<ScrollView>(null);
  // Timer that reverts the pill "Copied" → "Copy" after a moment.
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -------------------------------------------------------------------------
  // Workout Import Hook
  // -------------------------------------------------------------------------
  const {
    parsedProgram,
    accumulatedPrograms,
    showConfirmation,
    showAddMoreMode,
    generationTime,
    modalScale,
    modalOpacity,
    importFromClipboard,
    importFromFile,
    confirmImport,
    cancelConfirmation,
    addMoreFiles,
    backToConfirmation,
  } = useWorkoutImport({
    mode: 'create',
    onImportComplete: (importedProgram) => {
      // Navigate exactly as ImportRoutine's original handleConfirmImport did
      navigation.navigate('Main', {
        screen: 'Workouts',
        params: {
          importedProgram,
          refreshRoutines: true,
        },
      } as any);
    },
  });

  // -------------------------------------------------------------------------
  // Load questionnaire data and assemble the prompt. The clipboard gets
  // the FULL assembled prompt (machine instructions and all). The on-screen
  // preview shows only the user-facing PROFILE — the same profile block the
  // prompt embeds — so the user sees their own answers reflected back, not
  // the "Stop immediately. Respond ONLY…" machine boilerplate.
  //
  // We do NOT copy on load — the prompt card itself is the copy button
  // (tap it → "Copy" flips to "Copied"). The "Open in …" rows still
  // silently re-copy on tap, so nobody can get stranded with an empty
  // clipboard whether or not they tapped the card first.
  // -------------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const fitnessGoals = await WorkoutStorage.loadFitnessGoalsResults();
        const equipment =
          await WorkoutStorage.loadEquipmentPreferencesResults();

        // No completedAt gate. The Q1–Q7 flow saves via saveQuestionnaireAnswers and never
        // stamps completedAt, so gating on it here discarded every answer (merged → {}),
        // which left both the preview AND the copied prompt empty. Mirror
        // NutritionPromptReadyScreen: pass the raw loaded data straight through.
        const merged = { ...(fitnessGoals ?? {}), ...(equipment ?? {}) };
        const assembled = assemblePlanningPrompt(merged);

        setPrompt(assembled);
        setPromptPreview(buildWorkoutPreview(merged));
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
          Analytics.track('returned_from_ai', { prompt_type: 'workout', time_away_ms: elapsed });
          setReturnedFromAI(true);
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }
      }

      appState.current = next;
    });

    return () => sub.remove();
  }, [hasOpenedAI]);

  // -------------------------------------------------------------------------
  // Helper: copy the prompt to the clipboard. Called both when the user
  // taps the prompt card and right before launching an AI (the launch
  // path re-copies to guarantee the clipboard is fresh at hand-off).
  // Flips the pill to "Copied", then reverts to "Copy" after a moment.
  // -------------------------------------------------------------------------
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
      Analytics.track('prompt_copied', { prompt_type: 'workout', prompt_version: '1' });
      await WorkoutStorage.setAwaitingImport(true);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
      return true;
    } catch (e) {
      Alert.alert('Copy failed', (e as Error).message);
      return false;
    }
  }, [prompt]);

  // Clear any pending revert timer on unmount.
  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  // Tap the prompt card to copy. Flips the pill "Copy" → "Copied". Does
  // NOT set hasOpenedAI — tapping the card isn't leaving for the AI yet.
  const handleCopyCard = useCallback(async () => {
    await ensureCopied();
  }, [ensureCopied]);

  // "Open in Claude" / "Open in ChatGPT": silently re-copy, then launch.
  const handleOpenAI = useCallback(
    async (provider: AIProvider) => {
      const ok = await ensureCopied();
      if (!ok) return;
      setHasOpenedAI(true);
      // Small delay lets any press feedback settle before the OS hands
      // off to the other app.
      setTimeout(() => openAIApp(provider), 120);
    },
    [ensureCopied]
  );

  // Footer "Import it": jump straight to the return/import state without
  // leaving the app — for users who already have a file in hand.
  const handleImportFromInitial = useCallback(async () => {
    try {
      await WorkoutStorage.setAwaitingImport(true);
    } catch (e) {
      console.error('setAwaitingImport failed', e);
    }
    setReturnedFromAI(true);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  // Return-state "Paste from clipboard": read clipboard, then import.
  const handlePaste = useCallback(async () => {
    const text = await Clipboard.getStringAsync();
    if (!text) {
      Alert.alert('Clipboard empty', 'Copy your workout file first', [
        { text: 'OK' },
      ]);
      return;
    }
    importFromClipboard();
  }, [importFromClipboard]);

  // Return-state "Import saved file": open the document picker. The hook
  // handles picking, reading and the empty/cancel cases.
  const handleImportFile = useCallback(() => {
    importFromFile();
  }, [importFromFile]);

  const handleClose = useCallback(() => {
    navigation.popToTop();
  }, [navigation]);

  const handleBack = useCallback(() => {
    // If the user is on the "add your file" (return) state, back should
    // take them to the "Your prompt is ready" state — not leave the
    // screen. Only navigate away when already on the prompt-ready state.
    console.log('[PROMPTREADY] handleBack — returnedFromAI =', returnedFromAI);
    if (returnedFromAI) {
      console.log('[PROMPTREADY] handleBack — flipping to prompt-ready state');
      setReturnedFromAI(false);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    console.log('[PROMPTREADY] handleBack — calling navigation.goBack()');
    navigation.goBack();
  }, [navigation, returnedFromAI]);

  const openHelp = useCallback(() => setHelpVisible(true), []);
  const closeHelp = useCallback(() => setHelpVisible(false), []);

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
            onPaste={handlePaste}
            onImportFile={handleImportFile}
            themeColor={themeColor}
          />
        ) : (
          <InitialState
            promptPreview={promptPreview}
            copied={copied}
            themeColor={themeColor}
            onCopy={handleCopyCard}
            onOpenAI={handleOpenAI}
            onHelp={openHelp}
            onImport={handleImportFromInitial}
          />
        )}
      </ScrollView>

      <ImportConfirmationModal
        visible={showConfirmation}
        parsedProgram={parsedProgram}
        accumulatedPrograms={accumulatedPrograms}
        showAddMoreMode={showAddMoreMode}
        generationTime={generationTime}
        modalScale={modalScale}
        modalOpacity={modalOpacity}
        themeColor={themeColor}
        onConfirm={confirmImport}
        onAddMore={addMoreFiles}
        onBackToConfirmation={backToConfirmation}
        onCancel={cancelConfirmation}
        onPasteNext={importFromClipboard}
        onImportNextFile={importFromFile}
      />

      <HelpSheet
        visible={helpVisible}
        themeColor={themeColor}
        onClose={closeHelp}
      />
    </View>
  );
}

// ============================================================================
// Initial state — prompt is the hero
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

    {/* Prompt preview — the hero, and the copy button. Shows the real
        prompt text (machine preamble stripped) in mono with a fade, so it
        reads as the actual artifact you're handing off. Tap to copy: the
        pill flips "Copy" → "Copied". The full prompt (preamble included)
        goes to the clipboard untouched. */}
    <TouchableOpacity
      style={styles.promptCard}
      onPress={onCopy}
      activeOpacity={0.8}
    >
      <Text
        style={[styles.promptText, { fontFamily: MONO_FONT }]}
        numberOfLines={7}
      >
        {promptPreview}
      </Text>

      {/* Gradient fade — text dissolves into the card bg so it reads as
          "there's more below", not a hard cut. */}
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
            : {
                backgroundColor: '#18181b',
                borderColor: '#27272a',
              },
        ]}
      >
        <Ionicons
          name={copied ? 'checkmark' : 'copy-outline'}
          size={13}
          color={copied ? themeColor : '#a1a1aa'}
        />
        <Text
          style={[
            styles.copyPillText,
            { color: copied ? themeColor : '#a1a1aa' },
          ]}
        >
          {copied ? 'Copied' : 'Copy'}
        </Text>
      </View>
    </TouchableOpacity>

    {/* Framing line: "an AI you already use" presupposes ownership —
        this is the line that kills the "in-app AI" misconception. */}
    <View style={styles.framingRow}>
      <Ionicons name="arrow-down" size={14} color="#52525b" />
      <Text style={styles.framingText}>
        Paste it into an AI you already use
      </Text>
    </View>

    {/* Open in Claude — destination, not engine. ↗ signals "you leave". */}
    <TouchableOpacity
      style={styles.aiRow}
      onPress={() => onOpenAI('claude')}
      activeOpacity={0.85}
    >
      <View
        style={[styles.aiLogoBox, { backgroundColor: 'rgba(217, 119, 87, 0.2)' }]}
      >
        <Text style={[styles.aiLogoLetter, { color: '#d97757' }]}>C</Text>
      </View>
      <Text style={styles.aiRowText}>Open in Claude</Text>
      <Ionicons name="open-outline" size={19} color={themeColor} />
    </TouchableOpacity>

    {/* Open in ChatGPT — monochrome tile (matches OpenAI's current mark
        direction; the old green is stale post-2025 rebrand). */}
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

    {/* Plain hint, not a button — the prompt card above is the copy
        action now, so this is just a nudge that other AIs work too. */}
    <Text style={styles.otherAIHint}>…or use any other AI you like</Text>

    {/* Footer: "Confused?" (one-time help) above the import escape hatch */}
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
    </View>
  </>
);

// ============================================================================
// Return state — back from the AI; "add your file" is the whole job
// ============================================================================
interface ReturnStateProps {
  onPaste: () => void;
  onImportFile: () => void;
  themeColor: string;
}

const ReturnState: React.FC<ReturnStateProps> = ({
  onPaste,
  onImportFile,
  themeColor,
}) => (
  <View style={styles.returnRoot}>
    <View style={styles.returnTitleBlock}>
      <Text style={styles.title}>Almost done.</Text>
      <Text style={styles.returnSubtitle}>
        Add the workout file your AI gave you.
      </Text>
    </View>

    {/* Fills the space between the title and the import line. */}
    <View style={styles.returnBody}>
      {/* Big tappable paste zone — the hero. Grows to fill. Tapping
          anywhere pastes from the clipboard. */}
      <TouchableOpacity
        style={styles.pasteZone}
        onPress={onPaste}
        activeOpacity={0.85}
      >
        <View style={styles.pasteZoneIcon}>
          <Ionicons name="clipboard-outline" size={28} color={themeColor} />
        </View>
        <Text style={styles.pasteZoneTitle}>Paste your file</Text>
        <Text style={styles.pasteZoneHint}>Tap anywhere here</Text>
      </TouchableOpacity>

      {/* Secondary: saved-file path, as a natural-language line */}
      <TouchableOpacity
        style={styles.importFileLink}
        onPress={onImportFile}
        activeOpacity={0.7}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Text style={styles.importFileLinkText}>
          Saved it as a file instead?{' '}
        </Text>
        <Text
          style={[
            styles.importFileLinkText,
            { color: themeColor, fontWeight: '600' },
          ]}
        >
          Import
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ============================================================================
// HelpSheet — "Confused?" walkthrough. The full round trip, on demand.
// Self-contained slide-up bottom sheet (no shared component dependency).
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
    body: "The AI builds your plan and hands back a file. It'll guide you to download or copy it.",
  },
  {
    title: 'Come back & import',
    body: 'Return here, paste or import the file, and your plan loads into the app.',
  },
];

const HelpSheet: React.FC<HelpSheetProps> = ({
  visible,
  themeColor,
  onClose,
}) => {
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
            {
              paddingBottom: insets.bottom + 24,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.sheetGrabber} />

          <Text style={styles.sheetTitle}>How this works</Text>
          <Text style={styles.sheetIntro}>
            JSON.fit builds you a prompt from your answers, but an AI you
            already use designs the actual plan. Here&apos;s the round trip:
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

// ============================================================================
// Helpers — build the program-recap content from questionnaire data
// ============================================================================

// Display version of the prompt preview: a clean, sectioned recap built
// straight from the questionnaire answers — same visual treatment as the
// nutrition screen's buildNutritionPreview, so the card fills with
// CAPS-labelled sections (GOAL / TRAINING / EQUIPMENT / FOCUS / PREFERENCES).
// The full machine prompt still goes to the clipboard untouched.
//
// Keys match the real QuestionnaireData interface in workoutPrompt.ts. Coded
// values are humanized automatically (build_muscle → "Build Muscle"), so we
// don't hardcode every value enum. A section with no data is simply skipped.
function buildWorkoutPreview(data: any): string {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = data?.[k];
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return undefined;
  };

  const humanize = (s: any): string =>
    String(s)
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();

  const lbl = (v: any): string | undefined =>
    v != null && v !== '' ? humanize(v) : undefined;

  // Accepts array | object (map of truthy values) | string → humanized labels.
  const toList = (val: any): string[] => {
    if (val == null || val === '') return [];
    if (Array.isArray(val)) return val.filter(Boolean).map(humanize);
    if (typeof val === 'object')
      return Object.keys(val)
        .filter((k) => val[k])
        .map(humanize);
    return [humanize(val)];
  };

  const lines: string[] = [];
  const section = (header: string, body: string[]) => {
    const filled = body.filter((l) => l && l.trim().length > 0);
    if (filled.length === 0) return;
    if (lines.length > 0) lines.push('');
    lines.push(header, ...filled);
  };

  // GOAL
  const goal = lbl(pick('primaryGoal', 'customPrimaryGoal'));
  const experience = lbl(pick('trainingExperience'));
  // Secondary goals live as the keys of integrationMethods
  // ({ [goalId]: 'integrated' | 'dedicated' }).
  const secondary = toList(pick('integrationMethods'));
  section('GOAL', [
    [goal, experience].filter(Boolean).join(' · '),
    secondary.length ? `Also: ${secondary.join(', ')}` : '',
  ]);

  // TRAINING
  const days = pick('totalTrainingDays', 'gymTrainingDays');
  const duration = pick('programDuration', 'customDuration');
  const durationLabel =
    duration != null && /^\d+$/.test(String(duration))
      ? `${duration}-week program`
      : duration
      ? humanize(duration)
      : '';
  const rest = lbl(pick('sessionStyle'));
  const volume = pick('volumePreference');
  const volumeLabel =
    volume && volume !== 'not_sure' ? `${volume} sets/week` : '';
  section('TRAINING', [
    [days != null ? `${days} days per week` : '', durationLabel]
      .filter(Boolean)
      .join(' · '),
    [rest ? `${rest} rest` : '', volumeLabel].filter(Boolean).join(' · '),
  ]);

  // EQUIPMENT
  const equipment = toList(pick('selectedEquipment'));
  const specific = toList(pick('specificEquipment'));
  section('EQUIPMENT', [
    equipment.length ? equipment.join(', ') : '',
    specific.length ? specific.join(', ') : '',
  ]);

  // FOCUS
  const priority = [
    ...toList(pick('priorityMuscleGroups')),
    ...toList(pick('customMuscleGroup')),
  ];
  const limits = [
    ...toList(pick('movementLimitations')),
    ...toList(pick('customLimitation')),
  ];
  section('FOCUS', [
    priority.length ? `Priority: ${priority.join(', ')}` : '',
    limits.length ? `Working around: ${limits.join(', ')}` : '',
  ]);

  // PREFERENCES
  const style = [
    ...toList(pick('trainingStylePreference')),
    ...toList(pick('customTrainingStyle')),
  ];
  const liked = toList(pick('likedExercises'));
  const disliked = toList(pick('dislikedExercises'));
  const core = pick('includeDirectCore') ? 'Direct core work' : '';
  section('PREFERENCES', [
    style.length ? `Style: ${style.join(', ')}` : '',
    liked.length ? `Include: ${liked.join(', ')}` : '',
    disliked.length ? `Avoid: ${disliked.join(', ')}` : '',
    core,
  ]);

  return lines.join('\n').trim();
}

// Convert a #rrggbb hex to an rgba() string at the given alpha. Lets the
// theme-aware accent drive translucent fills/borders without hardcoding
// the cyan/pink rgb triples.
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    // Fallback to the cyan accent if a non-hex value sneaks in.
    return `rgba(34, 211, 238, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Title — more room above to push the hero down from the header
  titleBlock: {
    paddingTop: 44,
    paddingBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 34,
    letterSpacing: -0.3,
  },

  // Prompt preview card — the hero, and the copy button. Real prompt
  // text (mono) under a bottom fade, with the Copy/Copied pill overlaid
  // bottom-right. Tapping the card copies.
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
  promptText: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 18,
  },
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
  copyPillText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Framing line
  framingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 28,
    paddingBottom: 8,
  },
  framingText: {
    fontSize: 13,
    color: '#d4d4d8',
  },

  // AI rows (initial state)
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
  aiLogoLetter: {
    fontSize: 21,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  aiRowText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },

  // "…or use any other AI" — plain hint, centered, quiet
  otherAIHint: {
    fontSize: 13,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 20,
  },

  // Footer
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
  helpPillText: {
    fontSize: 13,
    color: '#d4d4d8',
    fontWeight: '500',
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  footerLinkText: {
    fontSize: 13,
    color: '#71717a',
  },

  // Return state (B3) — "add your file"
  // Return state (B3, paced as B) — fills the screen vertically
  returnRoot: {
    flex: 1,
  },
  returnTitleBlock: {
    paddingTop: 48,
    paddingBottom: 6,
  },
  returnSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 21,
    marginTop: 10,
  },
  // Grows to fill the space between the title and the bottom padding.
  returnBody: {
    flex: 1,
    paddingTop: 26,
    paddingBottom: 8,
  },
  // Big tappable paste zone — accent-tinted dashed target, grows to fill.
  pasteZone: {
    flex: 1,
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
  pasteZoneHint: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 6,
  },
  // Secondary saved-file link
  importFileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 18,
  },
  importFileLinkText: {
    fontSize: 13,
    color: '#71717a',
  },

  // Help sheet
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
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
  sheetStep: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  sheetStepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetStepNumText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sheetStepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  sheetStepBody: {
    fontSize: 12.5,
    color: '#a1a1aa',
    lineHeight: 18,
  },
  sheetCta: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  sheetCtaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0a0a0b',
  },
});