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
import Svg, { Path, Rect, Circle, Text as SvgText } from 'react-native-svg';
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
            {hasRoute && roadmap && profile ? (
              <RouteSummary
                roadmap={roadmap}
                currentBodyFatPct={profile.currentBodyFatPct}
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
            <Text style={styles.lockNoteText}>Unlocks once your route is set</Text>
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
                        name={locked ? 'lock-closed' : 'arrow-forward'}
                        size={locked ? 17 : 20}
                        color={locked ? '#8e8e93' : '#0a0a0b'}
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
      style={[styles.summary, { borderColor: `${themeColor}59` }]}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel="Map your route"
    >
      <View style={styles.inviteRow}>
        <View style={styles.inviteHeadings}>
          <Text style={[styles.summaryEyebrow, { color: themeColor }]}>START HERE</Text>
          <Text style={styles.summaryPhase}>Map your route</Text>
          <Text style={styles.inviteBody}>
            The fastest path from where you are to the physique you want, phase by phase.
          </Text>
        </View>
        <View style={[styles.inviteGo, { backgroundColor: themeColor, shadowColor: themeColor }]}>
          <Ionicons name="arrow-forward" size={20} color="#0a0a0b" />
        </View>
      </View>

      <View style={styles.journey}>
        <JourneyLine color={themeColor} ghost startLabel="You" endLabel="Goal physique" />
      </View>
    </TouchableOpacity>
  );
}

function RouteSummary({
  roadmap,
  currentBodyFatPct,
  themeColor,
  onPress,
}: {
  roadmap: Roadmap;
  currentBodyFatPct?: number;
  themeColor: string;
  onPress: () => void;
}) {
  const current = roadmap.phases[0];
  const last = roadmap.phases[roadmap.phases.length - 1];
  const totalPhases = last.index;

  const startLabel =
    currentBodyFatPct != null ? `You · ${Math.round(currentBodyFatPct)}%` : 'You';
  const endLabel = `Goal · ${last.exitBodyFatPct}%`;

  return (
    <TouchableOpacity
      style={styles.summary}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel="Review or change your route"
    >
      <View style={styles.summaryTop}>
        <View style={styles.inviteHeadings}>
          <Text style={[styles.summaryEyebrow, { color: themeColor }]}>YOUR ROUTE</Text>
          <Text style={styles.summaryPhase}>
            {PHASE_NAME[current.kind] ?? current.kind}
            <Text style={styles.summaryPhaseCount}>  ·  Phase 1 of {totalPhases}</Text>
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#6b6b70" />
      </View>

      <View style={styles.journey}>
        <JourneyLine
          color={themeColor}
          startLabel={startLabel}
          endLabel={endLabel}
        />
      </View>
    </TouchableOpacity>
  );
}

/**
 * The journey as a single line: the operating band as a soft tint, the route
 * curving through it, a marker at YOUR end and the goal ringed at the other.
 * `ghost` renders the dashed grey placeholder for the no-route state — same
 * geometry, so setting the route reads as the card FILLING IN, not the screen
 * rearranging.
 *
 * The marker sits at the start deliberately: the roadmap is re-derived fresh
 * from the current profile, so the user is always at the beginning of the
 * REMAINING journey (same reason the card says phase 1 of N). If a
 * travelled-distance marker is ever wanted, it derives from the BASELINE
 * roadmap snapshot (loadBaselineRoadmapSnapshot) — display is what snapshots
 * are for — never by mutating this fresh view.
 */
function JourneyLine({
  color,
  ghost,
  startLabel,
  endLabel,
}: {
  color: string;
  ghost?: boolean;
  startLabel: string;
  endLabel: string;
}) {
  const stroke = ghost ? '#3f3f46' : color;
  const labelColor = ghost ? '#71717a' : color;
  return (
    <Svg width="100%" height={78} viewBox="0 0 320 78">
      <Rect
        x={0}
        y={20}
        width={320}
        height={24}
        rx={6}
        fill={ghost ? 'rgba(255,255,255,0.04)' : `${color}1a`}
      />
      <Path
        d="M 14 14 C 44 22, 60 38, 84 44 S 120 32, 142 38 S 176 48, 198 40 S 232 32, 252 42 C 276 50, 294 54, 308 56"
        stroke={stroke}
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={ghost ? '1 7' : undefined}
      />
      {ghost ? (
        <Circle cx={14} cy={14} r={4.5} fill="#3f3f46" />
      ) : (
        <>
          <Circle cx={14} cy={14} r={9} fill={`${color}2e`} />
          <Circle cx={14} cy={14} r={4.5} fill={color} />
        </>
      )}
      <Circle
        cx={308}
        cy={56}
        r={3}
        fill="none"
        stroke={ghost ? '#3f3f46' : '#8e8e93'}
        strokeWidth={1.5}
      />
      <SvgText x={28} y={12} fontSize={11} fill={labelColor}>
        {startLabel}
      </SvgText>
      <SvgText x={308} y={74} fontSize={11} fill="#71717a" textAnchor="end">
        {endLabel}
      </SvgText>
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
  inviteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  inviteHeadings: { flex: 1 },
  inviteBody: { fontSize: 13, lineHeight: 19.5, color: '#a1a1aa', marginTop: 4 },
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  summaryEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 6 },
  summaryPhase: {
    fontSize: 21,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  summaryPhaseCount: { fontSize: 13, fontWeight: '400', color: '#8e8e93', letterSpacing: 0 },
  journey: { marginTop: 12 },

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