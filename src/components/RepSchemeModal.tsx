import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export interface Exercise {
  exercise?: string;
  name?: string;
  reps?: string;
  sets?: number;
  reps_weekly?: { [week: string]: string };
  rir_weekly?: { [week: string]: string };
}

interface RepSchemeModalProps {
  visible: boolean;
  onClose: () => void;
  exercise: Exercise;
  exerciseName: string;
  currentWeek: number;
  themeColor: string;
}

export default function RepSchemeModal({
  visible,
  onClose,
  exercise,
  exerciseName,
  currentWeek,
  themeColor,
}: RepSchemeModalProps) {
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [internalVisible, setInternalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const hasWeeklyReps =
    exercise.reps_weekly && Object.keys(exercise.reps_weekly).length > 0;
  const hasWeeklyRIR =
    exercise.rir_weekly && Object.keys(exercise.rir_weekly).length > 0;

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
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.header}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.iconButton}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>

          <Text style={styles.headerLabel}>REP SCHEME</Text>

          <View style={styles.iconButtonSpacer} />
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={2}>
            {exerciseName}
          </Text>
          <Text style={styles.subtitle}>
            WEEK {currentWeek} · {exercise.sets || 3} SET
            {(exercise.sets || 3) !== 1 ? 'S' : ''}
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Target Rep Scheme */}
          <Text style={styles.sectionLabel}>TARGET REPS</Text>

          {hasWeeklyReps ? (
            <View style={styles.weeksGrid}>
              {Object.entries(exercise.reps_weekly!).map(([week, reps]) => {
                const isActive = parseInt(week, 10) === currentWeek;
                return (
                  <WeekBlock
                    key={week}
                    week={week}
                    value={reps.replace(/\s*\(.*?\)/, '')}
                    isActive={isActive}
                    themeColor={themeColor}
                  />
                );
              })}
            </View>
          ) : (
            <View
              style={[
                styles.straightCard,
                {
                  backgroundColor: hexA(themeColor, 0.04),
                  borderColor: hexA(themeColor, 0.22),
                },
              ]}
            >
              <Text style={[styles.straightLabel, { color: themeColor }]}>
                EVERY WEEK
              </Text>
              <Text style={styles.straightValue}>
                {exercise.reps || '8-12'}
              </Text>
              <Text style={styles.straightMeta}>
                × {exercise.sets || 3} sets
              </Text>
            </View>
          )}

          {/* RIR Progression */}
          {hasWeeklyRIR && (
            <>
              <View style={styles.sectionLabelRow}>
                <Text style={styles.sectionLabel}>RIR PROGRESSION</Text>
              </View>

              <View style={styles.weeksGrid}>
                {Object.entries(exercise.rir_weekly!).map(([week, rir]) => {
                  const isActive = parseInt(week, 10) === currentWeek;
                  return (
                    <WeekBlock
                      key={week}
                      week={week}
                      value={String(rir)}
                      isActive={isActive}
                      themeColor={themeColor}
                    />
                  );
                })}
              </View>

              <View style={styles.infoCard}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name="information-circle-outline" size={18} color="#9898a4" />
                </View>
                <Text style={styles.infoText}>
                  <Text style={styles.infoBold}>RIR</Text> = reps in reserve. How many reps you could still do before failure. Lower RIR means you're closer to failure and lifting harder.
                </Text>
              </View>
            </>
          )}
        </ScrollView>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ── Sub-components ────────────────────────────────────────────────

interface WeekBlockProps {
  week: string;
  value: string;
  isActive: boolean;
  themeColor: string;
}

function WeekBlock({ week, value, isActive, themeColor }: WeekBlockProps) {
  return (
    <View style={styles.weekBlockOuter}>
      <View
        style={[
          styles.weekBlockInner,
          isActive && {
            backgroundColor: hexA(themeColor, 0.06),
            borderColor: hexA(themeColor, 0.4),
          },
        ]}
      >
        <View style={styles.weekBlockHeader}>
          <Text style={styles.weekLabel}>WEEK {week}</Text>
          {isActive && (
            <View style={[styles.activeDot, { backgroundColor: themeColor }]} />
          )}
        </View>
        <Text
          style={[
            styles.weekValue,
            isActive && { color: themeColor },
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonSpacer: {
    width: 38,
    height: 38,
  },
  headerLabel: {
    color: '#9898a4',
    fontSize: 11,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
  },

  // Title block
  titleBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  title: {
    color: '#f0f0f2',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontFamily: 'Outfit-Bold',
    lineHeight: 28,
  },
  subtitle: {
    color: '#55555f',
    fontSize: 11,
    letterSpacing: 1.3,
    marginTop: 6,
    fontFamily: 'DMMono-Medium',
  },

  scrollView: {
    flex: 1,
  },

  // Section label
  sectionLabel: {
    color: '#55555f',
    fontSize: 10,
    letterSpacing: 1.6,
    fontFamily: 'DMMono-Medium',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionLabelRow: {
    marginTop: 24,
  },

  // Week blocks grid (2-column)
  weeksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  weekBlockOuter: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  weekBlockInner: {
    backgroundColor: '#0a0a0f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    minHeight: 78,
  },
  weekBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekLabel: {
    color: '#55555f',
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  weekValue: {
    color: '#f0f0f2',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 6,
    letterSpacing: -0.3,
    fontFamily: 'Outfit-SemiBold',
  },

  // Straight (non-weekly) scheme card
  straightCard: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  straightLabel: {
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
  },
  straightValue: {
    color: '#f0f0f2',
    fontSize: 32,
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: -0.6,
    fontFamily: 'Outfit-SemiBold',
  },
  straightMeta: {
    color: '#9898a4',
    fontSize: 13,
    marginTop: 4,
    fontFamily: 'DMMono-Regular',
    letterSpacing: 0.3,
  },

  // Info card (RIR explanation)
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    backgroundColor: '#0a0a0f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  infoIconWrap: {
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    color: '#9898a4',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Outfit-Regular',
  },
  infoBold: {
    color: '#f0f0f2',
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
  },
});