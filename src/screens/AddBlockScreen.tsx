// src/screens/AddBlockScreen.tsx
//
// Standalone "Add a block" screen. The old flow was the multi-purpose
// ImportRoutine screen running in 'append-block' mode; this screen does ONE
// thing: take a workout file the user already has and append its block(s)
// onto an existing routine.
//
// It's the import half of PromptReadyScreen (the paste-zone "ReturnState"),
// pointed at the append path. The paste-zone / saved-file actions run
// useWorkoutImport in 'append' mode and the confirmation modal shows right
// here. No prompt generation, no AI hand-off, no questionnaire — just the
// file input.
//
// Params:
//   targetWorkoutId  the routine to append onto (required)
//   routineName      shown in the subtitle (optional)

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ImportConfirmationModal from '../components/import/ImportConfirmationModal';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useWorkoutImport } from '../hooks/useWorkoutImport';

type NavProp = StackNavigationProp<RootStackParamList, 'AddBlock'>;
type AddBlockRoute = RouteProp<RootStackParamList, 'AddBlock'>;

export default function AddBlockScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<AddBlockRoute>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const { targetWorkoutId, routineName } = route.params;

  // ---------------------------------------------------------------------------
  // Workout import hook, in APPEND mode. handleAppendBlocks loads the target
  // routine, pushes the pasted file's block(s) into routine.data.blocks, saves
  // through WorkoutStorage, then fires onAppendComplete with the routine id.
  // ---------------------------------------------------------------------------
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
    mode: 'append',
    targetWorkoutId,
    onAppendComplete: () => {
      // The block is saved. Pop back to Blocks — its useFocusEffect reloads
      // routines from storage, sees the block count changed, and refreshes
      // itself via navigation.setParams. Nothing else to do here.
      navigation.goBack();
    },
  });

  // Paste-zone tap -> import from clipboard. The hook reads the clipboard and
  // handles the empty case with its own alert.
  const handlePaste = useCallback(() => {
    importFromClipboard();
  }, [importFromClipboard]);

  const handleImportFile = useCallback(() => {
    importFromFile();
  }, [importFromFile]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <View style={styles.container}>
      {/* Header — just a back affordance; the title below carries the screen. */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleBack}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={18} color="#d4d4d8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Add a block</Text>
          <Text style={styles.subtitle}>
            {routineName
              ? `Paste the file your AI built and it's added to ${routineName}.`
              : `Paste the file your AI built and it's added to your routine.`}
          </Text>
        </View>

        <View style={styles.body}>
          {/* Big tappable paste zone — the hero. Tap anywhere to paste. */}
          <TouchableOpacity
            style={styles.pasteZone}
            onPress={handlePaste}
            activeOpacity={0.85}
          >
            <View style={styles.pasteZoneIcon}>
              <Ionicons name="clipboard-outline" size={28} color={themeColor} />
            </View>
            <Text style={styles.pasteZoneTitle}>Paste your file</Text>
            <Text style={styles.pasteZoneHint}>Tap anywhere here</Text>
          </TouchableOpacity>

          {/* Secondary: saved-file path */}
          <TouchableOpacity
            style={styles.importFileLink}
            onPress={handleImportFile}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
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

  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },

  // Title
  titleBlock: { paddingTop: 44, paddingBottom: 6 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 21,
    marginTop: 10,
  },

  // Body — grows to fill so the paste zone is the hero.
  body: { flex: 1, paddingTop: 26, paddingBottom: 8 },

  // Big tappable paste zone — accent-tinted dashed target, grows to fill.
  pasteZone: {
    flex: 1,
    minHeight: 240,
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

  // Secondary saved-file link
  importFileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 18,
  },
  importFileLinkText: { fontSize: 13, color: '#71717a' },
});