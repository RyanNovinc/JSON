/**
 * StaleWorkoutModal — shown when a workout is opened long after it was started
 * and there are logged sets on it (a session with nothing logged is reset
 * silently; there is nothing to ask about).
 *
 * The user picks what the session was:
 *   Save workout  → record the completion with a believable duration
 *                   (start → last logged set, not start → now)
 *   Keep going    → resume with a fresh timer
 *   Discard       → clear it, record nothing
 *
 * Hevy and Strong never auto-end and never silently lose logged sets; this
 * is the same rule with a prompt at the moment it matters.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppModal from './AppModal';
import { formatWorkoutDuration } from '../hooks/useLiveWorkoutDuration';

export interface StaleWorkoutModalProps {
  visible: boolean;
  dayName: string;
  /** e.g. "yesterday at 4:57 PM" */
  startedDescription: string;
  completedSets: number;
  /** Duration that Save will record, in seconds. */
  suggestedDurationSeconds: number;
  themeColor: string;
  onSave: () => void;
  onKeepGoing: () => void;
  onDiscard: () => void;
}

export default function StaleWorkoutModal({
  visible,
  dayName,
  startedDescription,
  completedSets,
  suggestedDurationSeconds,
  themeColor,
  onSave,
  onKeepGoing,
  onDiscard,
}: StaleWorkoutModalProps) {
  const setsLine =
    completedSets === 0
      ? 'You entered some sets but ticked none off.'
      : `You ticked off ${completedSets} ${completedSets === 1 ? 'set' : 'sets'}.`;

  return (
    <AppModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onKeepGoing}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={[styles.iconCircle, { backgroundColor: hexA(themeColor, 0.08), borderColor: hexA(themeColor, 0.3) }]}>
            <Ionicons name="time-outline" size={26} color={themeColor} />
          </View>

          <Text style={styles.headline}>Unfinished workout</Text>
          <Text style={styles.body}>
            {dayName ? `${dayName} was` : 'This workout was'} started {startedDescription}. {setsLine}
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: themeColor }]}
            onPress={onSave}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Save workout</Text>
            <Text style={styles.primarySub}>as {formatWorkoutDuration(suggestedDurationSeconds)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onKeepGoing} activeOpacity={0.7} accessibilityRole="button">
            <Text style={styles.secondaryText}>Keep going</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkBtn} onPress={onDiscard} activeOpacity={0.7} accessibilityRole="button">
            <Text style={styles.linkText}>Discard workout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AppModal>
  );
}

function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0a0a0f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 12,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  headline: {
    color: '#f0f0f2',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.3,
    fontFamily: 'Outfit-SemiBold',
  },
  body: {
    color: '#9898a4',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  primaryBtn: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
  },
  primarySub: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: 11,
    marginTop: 1,
    fontFamily: 'DMMono-Regular',
  },
  secondaryBtn: {
    alignSelf: 'stretch',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  secondaryText: {
    color: '#f0f0f2',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Outfit-Medium',
  },
  linkBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  linkText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Outfit-Medium',
  },
});
