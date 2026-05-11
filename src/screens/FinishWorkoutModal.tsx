/**
 * FinishWorkoutModal.tsx
 *
 * Workout completion modal with celebratory framing.
 *
 * Layout:
 *   - Success icon
 *   - "Workout complete" headline + subline
 *   - Hero card: total volume + comparison ("≈ 3.8 gallons of milk 🥛")
 *   - 2x2 stats grid:
 *       [ SETS    ] [ REPS  ]
 *       [ DURATION ] [ SWAP ]  ← tappable, cycles the comparison above
 *   - Optional PR callout
 *   - Cancel + Finish Workout buttons
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ── Types ─────────────────────────────────────────────────────────

export interface SetData {
  weight: string;
  reps: string;
  completed: boolean;
}

export interface PRInfo {
  exerciseName: string;
  weight: number;
  reps: number;
  estimatedOneRM?: number;
}

export interface FinishWorkoutModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;

  allSetsData: SetData[][];
  durationSeconds: number;
  pr?: PRInfo | null;
  workoutLabel?: string;

  themeColor?: string;
  globalUnit?: 'kg' | 'lbs';
}

const DEFAULT_THEME = '#22d3ee';

// ──────────────────────────────────────────────────────────────────
// Comparison list
// ──────────────────────────────────────────────────────────────────

interface Comparison {
  name: string;
  plural: string;
  weight: number;
  emoji: string;
}

const COMPARISONS: Comparison[] = [
  { name: 'pineapple',     plural: 'pineapples',     weight: 1.5,  emoji: '🍍' },
  { name: 'chicken',       plural: 'chickens',       weight: 2,    emoji: '🐔' },
  { name: 'gallon of milk', plural: 'gallons of milk', weight: 4,  emoji: '🥛' },
  { name: 'cat',           plural: 'cats',           weight: 4.5,  emoji: '🐈' },
  { name: 'bowling ball',  plural: 'bowling balls',  weight: 7,    emoji: '🎳' },
  { name: 'baby',          plural: 'babies',         weight: 7,    emoji: '👶' },
  { name: 'watermelon',    plural: 'watermelons',    weight: 10,   emoji: '🍉' },
  { name: 'car tire',      plural: 'car tires',      weight: 11,   emoji: '🛞' },
  { name: 'corgi',         plural: 'corgis',         weight: 12,   emoji: '🐕' },
  { name: 'gold bar',      plural: 'gold bars',      weight: 12.5, emoji: '🥇' },
  { name: 'microwave',     plural: 'microwaves',     weight: 15,   emoji: '📦' },
  { name: 'small fridge',  plural: 'small fridges',  weight: 50,   emoji: '🧊' },
  { name: 'kangaroo',      plural: 'kangaroos',      weight: 70,   emoji: '🦘' },
  { name: 'washing machine', plural: 'washing machines', weight: 75, emoji: '🧺' },
  { name: 'sumo wrestler', plural: 'sumo wrestlers', weight: 160,  emoji: '🤼' },
  { name: 'motorcycle',    plural: 'motorcycles',    weight: 200,  emoji: '🏍️' },
  { name: 'horse',         plural: 'horses',         weight: 450,  emoji: '🐎' },
  { name: 'grand piano',   plural: 'grand pianos',   weight: 500,  emoji: '🎹' },
  { name: 'small car',     plural: 'small cars',     weight: 1200, emoji: '🚗' },
  { name: 'rhino',         plural: 'rhinos',         weight: 2300, emoji: '🦏' },
  { name: 'elephant',      plural: 'elephants',      weight: 3000, emoji: '🐘' },
  { name: 'killer whale',  plural: 'killer whales',  weight: 5500, emoji: '🐋' },
];

function getMeaningfulComparisons(volumeKg: number): Comparison[] {
  if (volumeKg <= 0) return [];
  return COMPARISONS.filter((c) => {
    const count = volumeKg / c.weight;
    return count >= 0.5 && count <= 9999;
  });
}

function getStartingIndex(comparisons: Comparison[], volumeKg: number): number {
  if (comparisons.length === 0) return 0;

  const sweetSpot = comparisons.findIndex((c) => {
    const count = volumeKg / c.weight;
    return count >= 1 && count <= 10;
  });
  if (sweetSpot !== -1) return sweetSpot;

  let bestIdx = 0;
  let bestDiff = Infinity;
  comparisons.forEach((c, i) => {
    const count = volumeKg / c.weight;
    const diff = Math.abs(count - 5);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  });
  return bestIdx;
}

function formatCount(n: number): string {
  if (n < 10) {
    const s = n.toFixed(1);
    return s.endsWith('.0') ? s.slice(0, -2) : s;
  }
  return Math.round(n).toLocaleString();
}

// ──────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────

export default function FinishWorkoutModal({
  visible,
  onCancel,
  onConfirm,
  allSetsData,
  durationSeconds,
  pr,
  workoutLabel,
  themeColor = DEFAULT_THEME,
  globalUnit = 'kg',
}: FinishWorkoutModalProps) {
  const stats = useMemo(() => {
    let totalVolume = 0;
    let totalReps = 0;
    let completedSets = 0;
    let totalSets = 0;

    allSetsData.forEach((exerciseSets) => {
      exerciseSets.forEach((set) => {
        totalSets += 1;
        if (set.completed && set.weight && set.reps) {
          const w = parseFloat(set.weight);
          const r = parseInt(set.reps, 10);
          if (!isNaN(w) && !isNaN(r)) {
            totalVolume += w * r;
            totalReps += r;
            completedSets += 1;
          }
        }
      });
    });

    return { totalVolume, totalReps, completedSets, totalSets };
  }, [allSetsData]);

  const meaningfulComparisons = useMemo(
    () => getMeaningfulComparisons(stats.totalVolume),
    [stats.totalVolume],
  );

  const initialIndex = useMemo(
    () => getStartingIndex(meaningfulComparisons, stats.totalVolume),
    [meaningfulComparisons, stats.totalVolume],
  );

  const [comparisonIndex, setComparisonIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) setComparisonIndex(initialIndex);
  }, [visible, initialIndex]);

  const currentComparison = meaningfulComparisons[comparisonIndex];
  const currentCount = currentComparison
    ? stats.totalVolume / currentComparison.weight
    : 0;

  const cycleComparison = () => {
    if (meaningfulComparisons.length <= 1) return;
    setComparisonIndex((i) => (i + 1) % meaningfulComparisons.length);
  };

  const durationLabel = useMemo(() => {
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [durationSeconds]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onCancel}
        />

        <View style={styles.sheet}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 4 }}
          >
            {/* Success icon */}
            <View style={styles.iconWrap}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: hexA(themeColor, 0.08),
                    borderColor: hexA(themeColor, 0.3),
                  },
                ]}
              >
                <Ionicons name="checkmark" size={28} color={themeColor} />
              </View>
            </View>

            {/* Headline */}
            <Text style={styles.headline}>Workout complete</Text>
            <Text style={styles.subline}>
              {workoutLabel
                ? `${workoutLabel.toUpperCase()} · ${durationLabel}`
                : durationLabel}
            </Text>

            {/* Hero card — volume + comparison line */}
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: hexA(themeColor, 0.04),
                  borderColor: hexA(themeColor, 0.22),
                },
              ]}
            >
              <Text style={[styles.heroLabel, { color: themeColor }]}>
                TOTAL VOLUME LIFTED
              </Text>
              <Text style={styles.heroValue}>
                {Math.round(stats.totalVolume).toLocaleString()} {globalUnit}
              </Text>

              {currentComparison && (
                <Text style={styles.heroComparison}>
                  ≈{' '}
                  <Text style={styles.heroComparisonHighlight}>
                    {formatCount(currentCount)}{' '}
                    {currentCount >= 2 || currentCount < 1
                      ? currentComparison.plural
                      : currentComparison.name}{' '}
                    {currentComparison.emoji}
                  </Text>
                </Text>
              )}
            </View>

            {/* Stats grid 2x2 */}
            <View style={styles.statsGrid}>
              <StatCard
                label="SETS"
                value={`${stats.completedSets} / ${stats.totalSets}`}
              />
              <StatCard label="REPS" value={String(stats.totalReps)} />
              <StatCard label="DURATION" value={durationLabel} />
              <SwapComparisonCard
                disabled={meaningfulComparisons.length <= 1}
                themeColor={themeColor}
                onPress={cycleComparison}
              />
            </View>

            {/* PR callout */}
            {pr && (
              <View style={styles.prCallout}>
                <View style={styles.prIconWrap}>
                  <Ionicons name="trophy" size={20} color="#f7b220" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prTitle} numberOfLines={1}>
                    New PR · {pr.exerciseName}
                  </Text>
                  <Text style={styles.prMeta}>
                    {pr.weight} {globalUnit} × {pr.reps}
                    {pr.estimatedOneRM
                      ? `  ·  est. 1RM ${Math.round(pr.estimatedOneRM)} ${globalUnit}`
                      : ''}
                  </Text>
                </View>
              </View>
            )}

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: themeColor }]}
                onPress={onConfirm}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmButtonText}>Finish Workout</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBoxOuter}>
      <View style={styles.statBoxInner}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

function SwapComparisonCard({
  disabled,
  themeColor,
  onPress,
}: {
  disabled: boolean;
  themeColor: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.statBoxOuter}>
      <TouchableOpacity
        style={[
          styles.statBoxInner,
          disabled && { opacity: 0.4 },
        ]}
        onPress={onPress}
        activeOpacity={0.6}
        disabled={disabled}
      >
        <Ionicons name="shuffle" size={24} color={themeColor} />
      </TouchableOpacity>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ──────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '88%',
    backgroundColor: '#0a0a0f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 16,
  },

  iconWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headline: {
    color: '#f0f0f2',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.3,
    fontFamily: 'Outfit-SemiBold',
  },
  subline: {
    color: '#55555f',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 5,
    letterSpacing: 1.2,
    fontFamily: 'DMMono-Regular',
  },

  // Hero card
  heroCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
  },
  heroValue: {
    color: '#f0f0f2',
    fontSize: 32,
    fontWeight: '600',
    marginTop: 6,
    letterSpacing: -0.6,
    fontFamily: 'Outfit-SemiBold',
  },
  heroComparison: {
    color: '#9898a4',
    fontSize: 14,
    marginTop: 10,
  },
  heroComparisonHighlight: {
    color: '#f0f0f2',
    fontWeight: '500',
  },

  // Stats grid 2x2
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    marginHorizontal: -4,
  },
  statBoxOuter: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  statBoxInner: {
    backgroundColor: '#111116',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    color: '#55555f',
    fontSize: 9,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Regular',
    textAlign: 'center',
  },
  statValue: {
    color: '#f0f0f2',
    fontSize: 19,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: -0.3,
    fontFamily: 'Outfit-SemiBold',
    textAlign: 'center',
  },

  // Swap card uses base stat card styling — centered via statBoxInner

  // PR callout
  prCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(247,178,32,0.05)',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(247,178,32,0.25)',
    marginTop: 6,
    marginBottom: 4,
  },
  prIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  prTitle: {
    color: '#f0f0f2',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Outfit-Medium',
  },
  prMeta: {
    color: '#9898a4',
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'DMMono-Regular',
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#9898a4',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Outfit-Medium',
  },
  confirmButton: {
    flex: 1.4,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
  },
});