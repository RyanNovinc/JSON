import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { loadGoalsProfile } from '../utils/goalsProfileStorage';
import { derivePhase } from '../utils/goalsProfile';
import type { GoalsProfile, DerivedPhase, TrainingState } from '../utils/goalsProfile';

/**
 * GoalsProfileSummaryCard — shared between the workout and nutrition plan
 * summaries. Surfaces GoalsProfile's current stats, goal, and derived
 * phase where plans are reviewed, with a single edit affordance into the
 * Goals & Stats screen (the only place these values are actually edited —
 * this card never writes anything itself).
 *
 * Reloads via loadGoalsProfile() on every focus, so it always reflects
 * the freshest saved values (e.g. right after editing weight on the
 * Phase-B "still accurate?" confirm step, or from Goals & Stats itself).
 */

const PHASE_LABELS: Record<DerivedPhase, string> = {
  cut: 'Cut',
  recomp: 'Recomp',
  lean_bulk: 'Lean bulk',
  bulk: 'Bulk',
  maintain: 'Maintain',
};

const TRAINING_STATE_LABELS: Record<TrainingState, string> = {
  new: 'New to training',
  consistent: 'Consistent',
  returning: 'Returning',
  advanced: 'Advanced',
};

function fmtWeight(kg: number): string {
  return `${Math.round(kg * 10) / 10} kg`;
}

export default function GoalsProfileSummaryCard() {
  const navigation = useNavigation<any>();
  const { themeColor } = useTheme();
  const [profile, setProfile] = useState<GoalsProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadGoalsProfile().then((p) => {
        if (!cancelled) setProfile(p);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  // Summary screens are only reachable once a profile exists — but stay
  // defensive rather than crash if this ever renders before one does.
  if (!profile) return null;

  const phase = derivePhase(profile);

  const currentLine = `${fmtWeight(profile.currentWeightKg)}${
    profile.currentBodyFatPct != null ? ` · ${profile.currentBodyFatPct}% BF` : ''
  }`;
  const goalLine =
    profile.goalWeightKg != null
      ? `${fmtWeight(profile.goalWeightKg)}${
          profile.goalBodyFatPct != null ? ` · ${profile.goalBodyFatPct}% BF` : ''
        }`
      : 'Not set';

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: themeColor }]}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('GoalsStats')}
      accessibilityRole="button"
      accessibilityLabel="Edit goals and stats"
    >
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Goals &amp; stats</Text>
        <View style={[styles.phaseBadge, { backgroundColor: `${themeColor}24` }]}>
          <Text style={[styles.phaseBadgeText, { color: themeColor }]}>
            {PHASE_LABELS[phase]}
          </Text>
        </View>
      </View>

      <View style={styles.rows}>
        <View style={styles.rowItem}>
          <Text style={styles.rowLabel}>Training</Text>
          <Text style={styles.rowValue}>
            {TRAINING_STATE_LABELS[profile.trainingState] ?? profile.trainingState}
          </Text>
        </View>
        <View style={styles.rowItem}>
          <Text style={styles.rowLabel}>Current</Text>
          <Text style={styles.rowValue}>{currentLine}</Text>
        </View>
        <View style={styles.rowItem}>
          <Text style={styles.rowLabel}>Goal</Text>
          <Text style={styles.rowValue}>{goalLine}</Text>
        </View>
      </View>

      <View style={styles.editHint}>
        <Ionicons name="create-outline" size={12} color="#71717a" />
        <Text style={styles.editHintText}>Tap to edit</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#131316',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a1a1aa',
    letterSpacing: 0.3,
  },
  phaseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  phaseBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  rows: {
    flexDirection: 'row',
  },
  rowItem: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  editHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 14,
  },
  editHintText: {
    fontSize: 11,
    color: '#71717a',
  },
});
