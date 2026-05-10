/**
 * ExerciseHistoryScreen.tsx
 *
 * Lookup-focused history view for a single exercise.
 *
 * Purpose: user opens this screen, sees what they did last time
 * (and previously), picks today's weight, closes.
 *
 * Layout:
 *  - Header: back, exercise name, close
 *  - "LAST SESSION" callout: highlighted recent session at top
 *  - "PAST SESSIONS" list: reverse-chronological, each session shows
 *    date + all sets (weight, reps, RIR)
 *  - Empty state if no history
 *
 * Data shape (HistorySession[]) is presentational — parent supplies it,
 * presumably reading from the same storage system that logs workouts.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Modal,
  Dimensions,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Types ─────────────────────────────────────────────────────────

export interface HistorySet {
  weight: string | number;
  reps: string | number;
  rir?: string | number | null;
}

export interface HistorySession {
  /** ISO date string or any parseable date format */
  date: string;
  /** Optional label like "Push Day" or "Workout A" */
  workoutLabel?: string;
  sets: HistorySet[];
}

export interface ExerciseHistoryScreenProps {
  exerciseName: string;
  sessions: HistorySession[]; // newest first
  onClose: () => void;
  onBack?: () => void;
  themeColor?: string;
  globalUnit?: 'kg' | 'lbs';
}

export interface ExerciseHistoryModalProps extends ExerciseHistoryScreenProps {
  visible: boolean;
}

const DEFAULT_THEME = '#22d3ee';
const SCREEN_HEIGHT = Dimensions.get('window').height;

// ──────────────────────────────────────────────────────────────────
// Modal Component (Bottom Sheet)
// ──────────────────────────────────────────────────────────────────

export function ExerciseHistoryModal({ 
  visible, 
  onClose, 
  ...rest 
}: ExerciseHistoryModalProps) {
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [internalVisible, setInternalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setInternalVisible(true);
      Animated.parallel([
        Animated.timing(slideY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: SCREEN_HEIGHT,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setInternalVisible(false);
      onClose();
    });
  };

  return (
    <Modal
      visible={internalVisible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: backdropOpacity,
          },
        ]}
      />

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideY }] },
        ]}
      >
        <ExerciseHistoryScreen {...rest} onClose={handleClose} />
      </Animated.View>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────────
// Screen Component
// ──────────────────────────────────────────────────────────────────

export default function ExerciseHistoryScreen({
  exerciseName,
  sessions,
  onClose,
  onBack,
  themeColor = DEFAULT_THEME,
  globalUnit = 'kg',
}: ExerciseHistoryScreenProps) {
  const hasHistory = sessions.length > 0;
  const latestSession = sessions[0];
  const pastSessions = sessions.slice(1);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={{ flex: 1 }}>
        {/* ── HEADER ───────────────────────────────────────────── */}
        <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack || onClose}
          style={styles.headerBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>HISTORY</Text>

        {/* Spacer to balance layout */}
        <View style={{ width: 38 }} />
      </View>

      {/* ── BODY ─────────────────────────────────────────────── */}
      {!hasHistory ? (
        <EmptyState themeColor={themeColor} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          {/* ── EXERCISE NAME (scrollable) ──────────────────────── */}
          <View style={styles.subHeader}>
            <Text style={styles.exerciseName} numberOfLines={2}>
              {exerciseName}
            </Text>
          </View>

          {/* Latest session — highlighted */}
          <SectionLabel text="LAST SESSION" />
          <SessionCard
            session={latestSession}
            unit={globalUnit}
            themeColor={themeColor}
            highlighted
          />

          {/* Past sessions */}
          {pastSessions.length > 0 && (
            <>
              <SectionLabel text="PAST SESSIONS" topMargin={24} />
              {pastSessions.map((session, idx) => (
                <SessionCard
                  key={`${session.date}-${idx}`}
                  session={session}
                  unit={globalUnit}
                  themeColor={themeColor}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────

function SectionLabel({
  text,
  topMargin,
}: {
  text: string;
  topMargin?: number;
}) {
  return (
    <Text
      style={[
        styles.sectionLabel,
        topMargin && { marginTop: topMargin },
      ]}
    >
      {text}
    </Text>
  );
}

interface SessionCardProps {
  session: HistorySession;
  unit: string;
  themeColor: string;
  highlighted?: boolean;
}

function SessionCard({ session, unit, themeColor, highlighted }: SessionCardProps) {
  const dateLabel = formatDate(session.date);
  const relativeLabel = formatRelative(session.date);

  return (
    <View
      style={[
        styles.sessionCard,
        highlighted && {
          borderColor: hexA(themeColor, 0.3),
          backgroundColor: hexA(themeColor, 0.04),
        },
      ]}
    >
      {/* Date row */}
      <View style={styles.sessionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sessionDate}>{dateLabel}</Text>
          {!!session.workoutLabel && (
            <Text style={styles.sessionLabel}>{session.workoutLabel}</Text>
          )}
        </View>
        {!!relativeLabel && (
          <Text
            style={[
              styles.sessionRelative,
              highlighted && { color: themeColor },
            ]}
          >
            {relativeLabel}
          </Text>
        )}
      </View>

      {/* Sets table */}
      <View style={styles.setsContainer}>
        {/* Header row */}
        <View style={styles.setsHeader}>
          <Text style={[styles.setsHeaderCell, { width: 36 }]}>SET</Text>
          <Text style={[styles.setsHeaderCell, { flex: 1 }]}>
            {unit.toUpperCase()}
          </Text>
          <Text style={[styles.setsHeaderCell, { flex: 1 }]}>REPS</Text>
          <Text style={[styles.setsHeaderCell, { width: 50, textAlign: 'right' }]}>
            1RM
          </Text>
        </View>

        {/* Set rows */}
        {session.sets.map((set, i) => (
          <View key={i} style={styles.setRow}>
            <Text style={[styles.setCellNum, { width: 36 }]}>{i + 1}</Text>
            <Text style={[styles.setCellValue, { flex: 1 }]}>
              {formatValue(set.weight)}
            </Text>
            <Text style={[styles.setCellValue, { flex: 1 }]}>
              {formatValue(set.reps)}
            </Text>
            <Text
              style={[
                styles.setCellRir,
                { width: 50, textAlign: 'right' },
              ]}
            >
              {set.rir != null && set.rir !== '' ? formatValue(set.rir) : '—'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function EmptyState({ themeColor }: { themeColor: string }) {
  return (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIcon,
          { borderColor: hexA(themeColor, 0.25) },
        ]}
      >
        <Ionicons
          name="time-outline"
          size={36}
          color={hexA(themeColor, 0.6)}
        />
      </View>
      <Text style={styles.emptyTitle}>No history yet</Text>
      <Text style={styles.emptySubtitle}>
        Log this exercise in a workout to start tracking your progress over
        time.
      </Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

function formatValue(v: string | number | null | undefined): string {
  if (v == null || v === '') return '0';
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (isNaN(n)) return String(v);
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

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
  root: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Bottom Sheet ──────────────────────────────
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },

  // ── Header ────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 12,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#9898a4',
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'DMMono-Medium',
    letterSpacing: 1.4,
  },
  subHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  exerciseName: {
    color: '#f0f0f2',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    letterSpacing: -0.4,
    lineHeight: 28,
  },

  // ── Section labels ────────────────────────────
  sectionLabel: {
    color: '#55555f',
    fontSize: 10,
    letterSpacing: 1.6,
    fontFamily: 'DMMono-Medium',
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  // ── Session cards ─────────────────────────────
  sessionCard: {
    backgroundColor: '#0a0a0f',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionDate: {
    color: '#f0f0f2',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
  },
  sessionLabel: {
    color: '#55555f',
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'DMMono-Regular',
    letterSpacing: 0.3,
  },
  sessionRelative: {
    color: '#9898a4',
    fontSize: 11,
    fontFamily: 'DMMono-Medium',
    letterSpacing: 0.3,
  },

  // ── Sets table ────────────────────────────────
  setsContainer: {
    backgroundColor: 'transparent',
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginBottom: 4,
  },
  setsHeaderCell: {
    color: '#55555f',
    fontSize: 9,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Regular',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  setCellNum: {
    color: '#55555f',
    fontSize: 13,
    fontFamily: 'DMMono-Medium',
  },
  setCellValue: {
    color: '#f0f0f2',
    fontSize: 14,
    fontFamily: 'DMMono-Medium',
  },
  setCellRir: {
    color: '#9898a4',
    fontSize: 13,
    fontFamily: 'DMMono-Regular',
  },

  // ── Empty state ───────────────────────────────
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    backgroundColor: '#0a0a0f',
  },
  emptyTitle: {
    color: '#f0f0f2',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#55555f',
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'DMMono-Regular',
    lineHeight: 19,
    letterSpacing: 0.2,
  },
});