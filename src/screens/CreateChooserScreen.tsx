// src/screens/CreateChooserScreen.tsx
//
// The "What do you want to create?" modal behind the Create (+) button.
//
// It used to offer two peers. It now leads with the ROUTE, because the route
// is not a third thing to fill in — it is the thing the other two are built
// from. Both plan cards read their targets out of it, so offering them as
// equals invited users to build a meal plan and a workout plan that pulled in
// different directions.
//
// Two states:
//   - No route yet: the route is the bright card, both plans sit dimmed
//     beneath it with a line saying why.
//   - Route set: it does NOT disappear. It becomes a summary — current phase,
//     muscle gap, horizon, band, and a miniature of the chart from
//     RouteScreen — and the plan cards light up.
//
// Dimming rather than hiding the plan cards is deliberate: a user needs to see
// what they are working toward, and a screen that grows new options after an
// unrelated action is more confusing than one that shows them greyed.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme, NUTRITION_GREEN } from '../contexts/ThemeContext';
import { getCreateImage } from '../assets/createImages';
import { loadGoalsProfile } from '../utils/goalsProfileStorage';
import { deriveRoadmap, type Roadmap } from '../utils/roadmap';
import { startWorkoutFlow, startNutritionFlow } from '../utils/questionnaireRouting';
import type { GoalsProfile } from '../utils/goalsProfile';

type NavProp = StackNavigationProp<RootStackParamList>;

type CreateOption = {
  id: 'workout' | 'nutrition';
  eyebrow: string;
  title: string;
};

const OPTIONS: CreateOption[] = [
  { id: 'workout', eyebrow: 'WORKOUT', title: 'Custom workout plan' },
  { id: 'nutrition', eyebrow: 'NUTRITION', title: 'Custom meal plan' },
];

const PHASE_NAME: Record<string, string> = {
  recomp: 'Recomp',
  build: 'Build',
  trim: 'Trim',
  reveal: 'The reveal',
};

const PHASE_BLURB: Record<string, (r: Roadmap, weightKg: number) => string> = {
  recomp: (r, w) =>
    `Hold around ${Math.round(w)} kg while body fat drifts toward ${r.band.ceiling}%. Ends on a number, not a date.`,
  build: (r) =>
    `A controlled surplus, growing toward ${r.band.ceiling}% body fat. Ends on a number, not a date.`,
  trim: (r) => `Trim back to ${r.band.floor}% body fat, then build again.`,
  reveal: (r) => `A final trim to ${r.phases[r.phases.length - 1].exitBodyFatPct}%.`,
};

export default function CreateChooserScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const [profile, setProfile] = useState<GoalsProfile | null>(null);
  const [checked, setChecked] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadGoalsProfile().then((p) => {
        if (cancelled) return;
        setProfile(p);
        setChecked(true);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const roadmap = profile ? deriveRoadmap(profile, profile.routePreference ?? 'balanced') : null;
  const hasRoute = !!roadmap;

  const handleClose = () => navigation.goBack();

  const openRoute = () => {
    if (hasRoute) navigation.navigate('Route', {});
    else navigation.navigate('GoalsIntake', { nextFlow: 'workout' });
  };

  const handleSelect = async (option: CreateOption) => {
    // Locked until there is a route. Tapping sends them to the thing that
    // unlocks it rather than doing nothing, so the card is never a dead end.
    if (!hasRoute) {
      openRoute();
      return;
    }
    if (option.id === 'workout') await startWorkoutFlow(navigation);
    else await startNutritionFlow(navigation);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          activeOpacity={0.7}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={22} color="#d4d4d8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>What do you want{'\n'}to create?</Text>
          <Text style={styles.subtitle}>
            {hasRoute
              ? 'Both plans are built from your route, so they pull the same way.'
              : 'Your route comes first — both plans are built from it.'}
          </Text>
        </View>

        {/* ── The route ──────────────────────────────────────────────────── */}
        {checked ? (
          <>
            <Text style={styles.sectionLabel}>{hasRoute ? 'Your route' : 'Start here'}</Text>
            {hasRoute && roadmap && profile ? (
              <RouteSummary
                roadmap={roadmap}
                weightKg={profile.currentWeightKg}
                themeColor={themeColor}
                onPress={openRoute}
              />
            ) : (
              <RouteInvite themeColor={themeColor} onPress={openRoute} />
            )}
          </>
        ) : null}

        {/* ── The plans ──────────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Your plans</Text>

        {checked && !hasRoute ? (
          <View style={styles.lockNote}>
            <Ionicons name="lock-closed-outline" size={13} color="#71717a" />
            <Text style={styles.lockNoteText}>
              Set your route first — it decides what both plans aim at.
            </Text>
          </View>
        ) : null}

        {OPTIONS.map((option) => {
          const imageSource = getCreateImage(option.id);
          const accent = option.id === 'nutrition' ? NUTRITION_GREEN.primary : themeColor;
          const locked = checked && !hasRoute;
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.card, locked && styles.cardLocked]}
              onPress={() => handleSelect(option)}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={option.title}
              accessibilityState={{ disabled: locked }}
            >
              <View style={styles.cardImageWrap}>
                {imageSource ? (
                  <Image source={imageSource} style={styles.cardImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.cardImage, styles.cardImageFallback]} />
                )}

                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.85)']}
                  style={styles.cardGradient}
                  pointerEvents="none"
                />

                <View style={styles.cardOverlay}>
                  <Text style={styles.cardEyebrow}>{option.eyebrow}</Text>
                  <View style={styles.cardBottomRow}>
                    <Text style={styles.cardTitle}>{option.title}</Text>
                    <View
                      style={[
                        styles.cardArrowButton,
                        locked
                          ? styles.cardArrowLocked
                          : { backgroundColor: accent, shadowColor: accent },
                      ]}
                    >
                      <Ionicons
                        name="arrow-forward"
                        size={20}
                        color={locked ? '#71717a' : '#0a0a0b'}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------

function RouteInvite({ themeColor, onPress }: { themeColor: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.invite, { borderColor: `${themeColor}6b` }]}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={[`${themeColor}29`, `${themeColor}0a`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.inviteTop}>
        <View style={[styles.inviteIcon, { backgroundColor: `${themeColor}24` }]}>
          <Ionicons name="trending-up-outline" size={21} color={themeColor} />
        </View>
        <View style={styles.inviteHeadings}>
          <Text style={[styles.inviteEyebrow, { color: themeColor }]}>YOUR ROUTE</Text>
          <Text style={styles.inviteTitle}>Where are you headed?</Text>
        </View>
      </View>
      <Text style={styles.inviteBody}>
        Four quick questions. We'll tell you whether your goal is reachable for your frame, and
        the phases to get there — before you build anything.
      </Text>
      <View style={styles.inviteFoot}>
        <Text style={styles.inviteMeta}>About 2 minutes · both plans use it</Text>
        <View style={[styles.inviteGo, { backgroundColor: themeColor, shadowColor: themeColor }]}>
          <Ionicons name="arrow-forward" size={20} color="#0a0a0b" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function RouteSummary({
  roadmap,
  weightKg,
  themeColor,
  onPress,
}: {
  roadmap: Roadmap;
  weightKg: number;
  themeColor: string;
  onPress: () => void;
}) {
  const current = roadmap.phases[0];
  const totalPhases = roadmap.phases[roadmap.phases.length - 1].index;
  const blurb = PHASE_BLURB[current.kind]?.(roadmap, weightKg) ?? '';

  return (
    <TouchableOpacity
      style={styles.summary}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel="Review or change your route"
    >
      <View style={styles.summaryTop}>
        <Text style={styles.summaryEyebrow}>YOUR ROUTE</Text>
        <View style={[styles.summaryPill, { backgroundColor: `${themeColor}24` }]}>
          <Text style={[styles.summaryPillText, { color: themeColor }]}>
            Phase 1 of {totalPhases}
          </Text>
        </View>
      </View>

      <Text style={styles.summaryPhase}>{PHASE_NAME[current.kind] ?? current.kind}</Text>
      <Text style={styles.summaryBlurb}>{blurb}</Text>

      <View style={styles.spark}>
        <MiniBand
          floor={roadmap.band.floor}
          ceiling={roadmap.band.ceiling}
          color={themeColor}
        />
      </View>

      <View style={styles.summaryStats}>
        {roadmap.gapKg != null ? (
          <View>
            <Text style={styles.statKey}>Muscle to add</Text>
            <Text style={styles.statVal}>{roadmap.gapKg.toFixed(1)} kg</Text>
          </View>
        ) : null}
        <View>
          <Text style={styles.statKey}>Horizon</Text>
          <Text style={styles.statVal}>
            {roadmap.estYears[0]}–{roadmap.estYears[1]} yr
          </Text>
        </View>
        <View>
          <Text style={styles.statKey}>Band</Text>
          <Text style={styles.statVal}>
            {roadmap.band.floor}–{roadmap.band.ceiling}%
          </Text>
        </View>
      </View>

      <View style={styles.summaryLink}>
        <Ionicons name="create-outline" size={12} color="#71717a" />
        <Text style={styles.summaryLinkText}>Tap to review or change your route</Text>
      </View>
    </TouchableOpacity>
  );
}

/** Miniature of the band chart from RouteScreen — same shape, no axes. */
function MiniBand({
  floor,
  ceiling,
  color,
}: {
  floor: number;
  ceiling: number;
  color: string;
}) {
  const pts = [
    [0, 10], [14, 20], [24, 66], [38, 18], [46, 66],
    [60, 18], [68, 66], [82, 18], [90, 66], [100, 74],
  ];
  const d = pts
    .map(([x, y], i) => `${i ? 'L' : 'M'} ${(x * 2.6 + 4).toFixed(1)} ${(y * 0.36 + 4).toFixed(1)}`)
    .join(' ');
  return (
    <Svg width="100%" height={36} viewBox="0 0 275 36">
      <Rect x={4} y={10} width={267} height={16} rx={2} fill={`${color}1f`} />
      <Path d={d} stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  header: { paddingHorizontal: 20, paddingBottom: 4 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  titleBlock: { paddingTop: 24, paddingBottom: 26 },
  title: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 40,
    marginBottom: 10,
  },
  subtitle: { color: '#a1a1aa', fontSize: 15, lineHeight: 22 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingLeft: 2,
  },
  sectionLabelSpaced: { marginTop: 26 },

  // ── Route invite ──────────────────────────────────────────────────────────
  invite: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
    backgroundColor: '#131316',
  },
  inviteTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  inviteIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteHeadings: { flex: 1 },
  inviteEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  inviteTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
    marginTop: 3,
  },
  inviteBody: { fontSize: 13, lineHeight: 20, color: '#a1a1aa' },
  inviteFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  inviteMeta: { fontSize: 12, color: '#71717a', flex: 1 },
  inviteGo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },

  // ── Route summary ─────────────────────────────────────────────────────────
  summary: {
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: '#71717a' },
  summaryPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 },
  summaryPillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  summaryPhase: {
    fontSize: 19,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  summaryBlurb: { fontSize: 12.5, lineHeight: 19, color: '#71717a' },
  spark: { marginTop: 14, marginBottom: 12 },
  summaryStats: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  statKey: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  statVal: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  summaryLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
  summaryLinkText: { fontSize: 12, color: '#71717a' },

  // ── Lock note ─────────────────────────────────────────────────────────────
  lockNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: -4,
    marginBottom: 14,
    paddingLeft: 2,
  },
  lockNoteText: { fontSize: 12, color: '#71717a', flex: 1 },

  // ── Plan cards ────────────────────────────────────────────────────────────
  card: { borderRadius: 20, overflow: 'hidden', marginBottom: 16, backgroundColor: '#18181b' },
  cardLocked: { opacity: 0.42 },
  cardImageWrap: { height: 220, position: 'relative' },
  cardImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  cardImageFallback: { backgroundColor: '#1f1f23' },
  cardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '80%' },
  cardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  cardEyebrow: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cardArrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  cardArrowLocked: { backgroundColor: '#3f3f46', shadowOpacity: 0 },
});