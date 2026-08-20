// src/components/nutrition/PhaseTargetNote.tsx
//
// One line above the targets saying what the phase means for the scale, and a
// modal behind it answering the question that line provokes.
//
// ── WHY IT IS ONE COMPONENT AND NOT THREE SCREENS ───────────────────────────
//
// The obvious design was a questionnaire step asking how fast the user wants
// to change. That step only makes sense for a CUT:
//
//   CUT     — a real choice. 0.5%/wk and 1%/wk both work and trade time
//             against how hard the diet is.
//   RECOMP  — weight is held by definition, so there is no rate to pick.
//   GAIN    — muscle builds at a rate the body sets and food does not raise
//             it. Helms 2023 randomised 21 trained lifters to maintenance, a
//             5% surplus and a 15% surplus: faster weight gain predicted FAT
//             gain strongly and muscle thickness only weakly. Garthe 2013
//             found a guided surplus produced five times the fat mass with no
//             lean or strength advantage. So "how fast do you want to gain"
//             is not a question, it is an invitation to carry fat a later
//             trim has to remove.
//
// A screen with one option and a Continue button is a tap that decides
// nothing, so the explanation lands HERE instead — on the screen showing the
// numbers it explains. The cut keeps its own step because it has a real
// choice to make.
//
// ── LOADS ITS OWN PROFILE ───────────────────────────────────────────────────
//
// Same pattern as GoalsProfileSummaryCard, and for the same reason: it can
// then be dropped onto any screen that shows targets without that screen
// having to know about phases.

import React, { useCallback, useState } from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { loadGoalsProfile } from '../../utils/goalsProfileStorage';
import { derivePhase } from '../../utils/goalsProfile';
import { leanGainKgPerYear } from '../../utils/roadmap';
import type { GoalsProfile, DerivedPhase } from '../../utils/goalsProfile';

interface Note {
  /** Row label, matching the other rows in the answers table. */
  label: string;
  /** Row value — the short answer, on one line. */
  value: string;
  modalTitle: string;
  modalBody: string;
  source: string;
}

/**
 * [B] Fat that realistically accompanies a kilo of lean gain, at the cautious
 * rate this app prescribes. Same figure the synthetic gain rate uses — if one
 * changes, change both, or the screen and the target disagree.
 */
const FAT_PER_LEAN = 0.2;

function noteFor(profile: GoalsProfile, phase: DerivedPhase): Note | null {
  const weight = profile.currentWeightKg;
  const bf = profile.currentBodyFatPct;

  if (phase === 'recomp' || phase === 'maintain') {
    // Deliberately never the word "maintenance" for the GOAL. The calories sit
    // near maintenance; the goal is the opposite of maintaining, and to
    // someone watching the scale those read as the same thing.
    const favourable =
      profile.trainingState === 'new' ||
      profile.trainingState === 'returning' ||
      (bf != null && bf >= 18);

    return {
      label: 'Weight target',
      value: 'Hold steady — fat down, muscle up',
      modalTitle: 'What decides this',
      modalBody: `Your weight is meant to stay put. Fat comes down and muscle goes up while the scale sits still, so three weeks without movement is the plan working.\n\n${
        favourable
          ? 'This works best for people new to lifting, coming back after a break, or carrying more body fat — which describes you, so it should move well.'
          : 'This works best for people new to lifting, coming back after a break, or carrying more body fat. You are past that stage, so it still works — just slowly. A cut and then a build might get you there sooner.'
      }`,
      source: 'Barakat et al., Strength & Conditioning Journal, 2020',
    };
  }

  if (phase === 'bulk' || phase === 'lean_bulk') {
    const rate = leanGainKgPerYear(profile);
    const leanPerWeek = rate ? (rate[0] + rate[1]) / 2 / 52 : null;
    const totalPerWeek = leanPerWeek != null ? leanPerWeek * (1 + FAT_PER_LEAN) : null;

    return {
      label: 'Weight target',
      value:
        totalPerWeek != null
          ? `Up about ${totalPerWeek.toFixed(2)} kg a week`
          : 'A small surplus, deliberately',
      modalTitle: 'Why not eat more?',
      modalBody:
        'That is the pace your body can turn into muscle, and food does not raise it. When lifters were put on a large surplus instead of a small one, the extra weight was mostly fat — strength and muscle came out much the same.\n\nSo your target is the smallest surplus that still covers the muscle you can build. Eating more would only add fat you would have to trim off later.',
      source: 'Helms et al., Sports Medicine – Open, 2023',
    };
  }

  // A cut answers this on its own screen, where there is a choice to make.
  return null;
}

export default function PhaseTargetNote() {
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const [profile, setProfile] = useState<GoalsProfile | null>(null);
  const [open, setOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadGoalsProfile().then((p) => {
        if (!cancelled) setProfile(p);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (!profile) return null;
  const note = noteFor(profile, derivePhase(profile));
  if (!note) return null;

  return (
    <>
      {/* A ROW, not a card. As a standalone card between Goals & stats and the
          macros it broke the rhythm of the screen — three boxes in a column,
          each a different shape. It belongs in the answers table because that
          is what it is: something about this plan the user can look into.

          The chevron is an info affordance here rather than an edit one. Every
          other row in that table opens a screen to change the answer; this one
          opens an explanation, because there is nothing to change. */}
      <TouchableOpacity
        style={styles.row}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${note.label}. ${note.value}. Tap to find out why.`}
      >
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>{note.label}</Text>
          <Text style={styles.rowValue}>{note.value}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#52525b" />
      </TouchableOpacity>

      {/* FADE, not slide — the scrim and the sheet arrive together, matching
          the confirm sheet on PhasePositionScreen. */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 26 }]}>
          <View style={styles.grab} />
          <Text style={styles.sheetTitle}>{note.modalTitle}</Text>
          <Text style={styles.sheetBody}>{note.modalBody}</Text>
          <Text style={styles.source}>{note.source}</Text>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // COPIED VERBATIM from NutritionSummaryScreen's row styles, not approximated.
  // The first version guessed at them and the row read as a different kind of
  // thing: sentence-case label where the others are uppercase, its own
  // horizontal padding where the others inherit the section's, and a lighter
  // divider. If those styles change, change these — the whole point is that
  // this row is indistinguishable from the ones around it.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
    gap: 12,
  },
  rowText: { flex: 1 },
  rowLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  rowValue: { fontSize: 15, color: '#ffffff', fontWeight: '500', lineHeight: 20 },

  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)' },
  sheet: {
    backgroundColor: '#111114',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  grab: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2f2f35',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff', letterSpacing: -0.3, marginBottom: 10 },
  sheetBody: { fontSize: 14, lineHeight: 21, color: '#8e8e93' },
  source: {
    fontSize: 11,
    lineHeight: 16,
    color: '#4b4b52',
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1c1c20',
  },
});