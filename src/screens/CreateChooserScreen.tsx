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
import Svg, {
  Path,
  Rect,
  Circle,
  Defs,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
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
import JourneyChart from '../components/route/JourneyChart';
import { expandPhases, phasesAt, loadPhaseJourney } from '../utils/phaseJourney';
import { startWorkoutFlow, startNutritionFlow } from '../utils/questionnaireRouting';
import { isRouteComplete, firstUnansweredBeat } from '../utils/routeCompletion';
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
  const [completedPhases, setCompletedPhases] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([loadGoalsProfile(), loadPhaseJourney()]).then(([p, journey]) => {
        if (cancelled) return;
        setProfile(p);
        setCompletedPhases(journey.length);
        setChecked(true);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const roadmap = profile ? deriveRoadmap(profile, profile.routePreference ?? 'balanced') : null;
  const routeComplete = isRouteComplete(profile);

  const handleClose = () => navigation.goBack();

  const openRoute = () => {
    if (routeComplete) navigation.navigate('RouteSummary');
    else if (profile) navigation.navigate('Route', { startBeat: firstUnansweredBeat(profile) });
    else navigation.navigate('GoalsIntake', { nextFlow: 'workout' });
  };

  const handleSelect = async (option: CreateOption) => {
    // Locked until the route is finished. Tapping sends them to the thing that
    // unlocks it rather than doing nothing, so the card is never a dead end.
    if (!routeComplete) {
      openRoute();
      return;
    }
    if (option.id === 'workout') await startWorkoutFlow(navigation);
    else await startNutritionFlow(navigation);
  };

  return (
    <View style={styles.container}>
      {/* The glow every other screen in this flow has and this one never did —
          RouteScreen and RouteSummaryScreen both carry it, so Create was the
          odd one out on a flat black background.
          
          Same values as RouteSummaryScreen: 760px, peak alpha 0.13, transparent
          by the edge, anchored off the top left corner. It follows themeColor
          rather than being hardcoded cyan. */}
      <View
        style={[styles.glow, { width: GLOW, height: GLOW, left: -GLOW * 0.24, top: -GLOW * 0.22 }]}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="createGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={themeColor} stopOpacity={0.13} />
              <Stop offset="1" stopColor={themeColor} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#createGlow)" />
        </Svg>
      </View>

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

      {/* No ScrollView. The screen is a question and two answers, with the
          route pinned to the base — everything fits, and a scrollable list of
          two items invites a scroll that does nothing.

          The photographic plan cards are gone. They were the loudest thing on
          a screen whose whole job is one binary choice, and they pushed the
          route below the fold. */}
      <View style={styles.stage}>
        <Text style={styles.title}>What are{'\n'}we making{'\n'}today?</Text>

        <View style={styles.choices}>
          {OPTIONS.map((option) => {
            const locked = checked && !routeComplete;
            return (
              <TouchableOpacity
                key={option.id}
                style={styles.choice}
                onPress={() => handleSelect(option)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={option.title}
                accessibilityState={{ disabled: locked }}
              >
                <View style={styles.choiceBody}>
                  <Text style={[styles.choiceTitle, locked && styles.choiceTitleLocked]}>
                    {option.id === 'workout' ? 'A workout plan' : 'A meal plan'}
                  </Text>
                  {locked ? (
                    <Text style={styles.choiceHint}>Unlocks once your route is set</Text>
                  ) : null}
                </View>
                <Ionicons
                  name={locked ? 'lock-closed-outline' : 'chevron-forward'}
                  size={locked ? 15 : 16}
                  color="#3f3f46"
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
          {checked ? (
            routeComplete && roadmap && profile ? (
              <RouteSummary
                profile={profile}
                roadmap={roadmap}
                completedPhases={completedPhases}
                themeColor={themeColor}
                onPress={openRoute}
              />
            ) : (
              <RouteInvite themeColor={themeColor} onPress={openRoute} />
            )
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------

function RouteInvite({ themeColor, onPress }: { themeColor: string; onPress: () => void }) {
  return (
    // Still bordered, deliberately, where the filled state is not. With no
    // route yet there is nothing to sit in the background — this is the one
    // thing on the screen the user has to do, so it should look like a button
    // rather than like scenery.
    <TouchableOpacity
      style={[styles.invite, { borderColor: `${themeColor}59` }]}
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
  profile,
  roadmap,
  completedPhases,
  themeColor,
  onPress,
}: {
  profile: GoalsProfile;
  roadmap: Roadmap;
  completedPhases: number;
  themeColor: string;
  onPress: () => void;
}) {
  /**
   * The phase the user is STANDING IN. This card derived its TOTAL correctly
   * and then hardcoded the POSITION to 1, so it read "Phase 1 of 10" to
   * everyone — contradicting the route summary, the phase screen and the
   * generation prompts the moment anyone finished a phase.
   */
  const legs = phasesAt(roadmap, completedPhases);
  const current = legs.current ?? roadmap.phases[0];

  // expandPhases, not `last.index`. The two agree only while a reveal exists:
  // roadmap.phases holds DEFINITIONS with a repeats count, and the terminal
  // reveal is conditional — omitted when the band floor already sits below the
  // user's goal body fat. Without it, `last.index` is the collapsed block's
  // index (3) where the route screen, which counts occurrences, says 9.
  const totalPhases = expandPhases(roadmap).length;
  const phaseNo = Math.min(completedPhases, totalPhases - 1) + 1;

  // NO CONTAINER. The card read as a widget bolted to the bottom of the screen;
  // this is meant to be part of the screen — the route is simply there under
  // the question, the way a horizon sits under a skyline.
  //
  // What the card did usefully was announce "tappable". With it gone the
  // chevron carries that alone, which is why it now sits inline with the phase
  // name rather than floating in a corner.
  return (
    <TouchableOpacity
      style={styles.summary}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel="Review or change your route"
    >
      <View style={styles.summaryTop}>
        <Text style={[styles.summaryEyebrow, { color: themeColor }]}>YOUR ROUTE</Text>
        <Text style={styles.summaryMeta}>
          {PHASE_NAME[current.kind] ?? current.kind} · Phase {phaseNo} of {totalPhases}
        </Text>
        <Ionicons name="chevron-forward" size={15} color="#5b5b62" />
      </View>

      {/* The REAL line. This card used to draw JourneyLine, whose path is a
          hardcoded SVG string — the same squiggle for every user, every route
          and every profile, with only the phase name and the two percentages
          coming from the roadmap.
          
          It happened because JourneyLine also renders the dashed placeholder
          for the no-route state, and the docstring says that shared geometry is
          deliberate so setting a route reads as the card filling in. Sound
          intent; the consequence was that the real state was built to match the
          placeholder rather than the other way round.
          
          strip={false} keeps the phase-block bar off a card this small; the
          route screen is where that belongs. */}
      <View style={styles.journey}>
        <JourneyChart profile={profile} roadmap={roadmap} color={themeColor} sparkline />
      </View>

      {/* Three numbers rather than a legend. The chart shows the SHAPE of the
          plan; these say where the user is standing in it, which the line
          cannot at this size. */}
    </TouchableOpacity>
  );
}

/**
 * The journey as a single line: the operating band as a soft tint, the route
 * curving through it, a marker at YOUR end and the goal ringed at the other.
 * GHOST ONLY as of 13 Aug 2026. The filled state now draws the user's actual
 * phases through JourneyChart; this decorative path survives for the no-route
 * placeholder, where there is no roadmap to draw and a suggestive shape is the
 * honest thing to show.
 *
 * Do not reuse it for real data. The `ghost` prop is no longer optional in
 * practice, and the "same geometry either way" property it was written for is
 * gone deliberately — matching a placeholder was what kept the real card from
 * ever showing the real plan.
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

/** Wide enough that the falloff never shows an edge on any phone. */
const GLOW = 760;

const styles = StyleSheet.create({
  glow: { position: 'absolute' },
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
  stage: { flex: 1, paddingHorizontal: 20 },
  choices: { marginTop: 36 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 19,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#232327',
  },
  choiceBody: { flex: 1 },
  choiceTitle: { fontSize: 22, fontWeight: '600', color: '#ffffff', letterSpacing: -0.3 },
  choiceTitleLocked: { color: '#52525b' },
  choiceHint: { fontSize: 13, color: '#5b5b62', marginTop: 4 },

  // Pinned rather than flowed: the route is the base of the screen, and the
  // space above it is deliberate rather than left over.
  footer: { marginTop: 'auto' },


  titleBlock: { paddingTop: 24, paddingBottom: 26 },
  title: {
    color: '#ffffff',
    // Bigger, and pushed down: the question is now the whole top of the
    // screen rather than a header above a list of cards. 40 rather than 74
    // because the route block below has to fit without scrolling.
    marginTop: 40,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.2,
    lineHeight: 46,
    marginBottom: 0,
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
  // No background, no border, no radius. The only padding is vertical, so the
  // chart runs the full width of the screen's gutter like the choice rows above
  // it rather than being inset inside a box.
  summary: { paddingVertical: 4 },
  invite: {
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
    gap: 8,
  },
  summaryMeta: { flex: 1, fontSize: 12.5, color: '#5b5b62', textAlign: 'right' },
  summaryEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8 },
  summaryPhase: {
    fontSize: 21,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  summaryPhaseCount: { fontSize: 13, fontWeight: '400', color: '#8e8e93', letterSpacing: 0 },
  journey: { marginTop: 8, marginHorizontal: -4 },

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