// src/screens/RouteRevealScreen.tsx
//
// What the user sees immediately after locking their route.
//
// NO CHROME, DELIBERATELY. There is no back arrow and no close button, because
// a back arrow here offers to undo something the user just confirmed and a
// close offers to abandon a plan they just committed to. That is only
// defensible because RouteScreen asks for confirmation before pushing this
// screen, and the navigator registers it with gestureEnabled false.
//
// TAPPED THROUGH, NOT SCROLLED. The screen has a turn in it: beats 1 to 3
// build the list of everything that has to go right, beat 4 names the feeling
// out loud, and beat 5 shows THE SAME FIVE LINES ticked, each naming what the
// app decides instead. Dumping that on one scrolling page loses the turn,
// because the relief and the intimidation would arrive together.
//
// THE GLOW IS AN SVG RADIAL GRADIENT. An earlier version stacked concentric
// low-opacity Views, which produced visible hard rings: every circle edge is a
// step change in alpha, and the eye finds steps. react-native-svg's
// RadialGradient interpolates properly, which is the only way to get a soft
// falloff without a native blur view. It is also sized wider than the screen
// so its outer edge is off canvas and can never read as an edge.
//
// BEATS ARE TOP ANCHORED, NOT CENTRED. Centring makes each beat's first line
// land at a different height, so tapping through jumps the text around and the
// leftover space collects wherever the current beat happens to be shortest. A
// fixed offset means the eye never has to re-find the start of the sentence.
//
// The duration carries an ESTIMATE tag because estMonths is graded [B] in
// roadmap.ts, and the house rule is that [B] reaches the user as a range with
// an estimate label. On the one screen selling certainty, that tag is what
// keeps it honest.

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../navigation/AppNavigator';
import PhaseLine from '../components/route/PhaseLine';
import { useTheme, NUTRITION_GREEN } from '../contexts/ThemeContext';
import { getCreateImage } from '../assets/createImages';
import { loadGoalsProfile } from '../utils/goalsProfileStorage';
import { deriveRoadmap, type Roadmap } from '../utils/roadmap';
import { startWorkoutFlow, startNutritionFlow } from '../utils/questionnaireRouting';
import type { GoalsProfile } from '../utils/goalsProfile';

type NavProp = StackNavigationProp<RootStackParamList>;

const BEATS = 6;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/** Where every beat's first line starts, as a share of screen height. Fixed so
 *  the text does not hop between taps. */
const CONTENT_TOP = SCREEN_H * 0.2;

const REQUIREMENTS: Array<[string, string]> = [
  ['Eat to your macros most days', 'Not perfectly. Most days.'],
  ['Enough hard sets per muscle, every week', 'Too few and nothing moves. Too many and you stall.'],
  ['Rest long enough between sets', 'Short rests cost you sets.'],
  ['Space your sessions to recover', 'Muscle grows between them, not during.'],
  ['Deload before progress stalls', 'Not after.'],
];

/** The same five, answered. Order matches REQUIREMENTS so the shape is already
 *  familiar by the time the ticks appear. */
const HANDLED: Array<[string, string]> = [
  ['Macros, meal timing and the shopping list', 'Set for this phase'],
  ['Sets and reps per muscle, per week', 'Built into the block'],
  ['Rest timers', 'Running while you lift'],
  ['Your training split', 'Scheduled around your week'],
  ['Deloads', 'Already in the mesocycle'],
];

const PHASE_LABEL: Record<string, string> = {
  trim: 'Trim',
  build: 'Build',
  recomp: 'Recomp',
  reveal: 'The reveal',
};

export default function RouteRevealScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const [profile, setProfile] = useState<GoalsProfile | null>(null);
  const [beat, setBeat] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const rise = useRef(new Animated.Value(0)).current;

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

  const roadmap: Roadmap | null = profile
    ? deriveRoadmap(profile, profile.routePreference ?? 'balanced')
    : null;
  const first = roadmap?.phases[0];
  const phaseName = first ? PHASE_LABEL[first.kind] ?? first.kind : 'Phase 1';
  const months = first?.estMonths;

  const advance = () => {
    if (beat >= BEATS - 1) return;
    Animated.timing(fade, { toValue: 0, duration: 110, useNativeDriver: true }).start(() => {
      setBeat((b) => Math.min(BEATS - 1, b + 1));
      rise.setValue(10);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(rise, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    });
  };

  const leave = () => navigation.popToTop();
  const isChooser = beat === BEATS - 1;

  return (
    <View style={styles.container}>
      <Glow color={themeColor} />

      {isChooser ? (
        <Animated.View style={[styles.chooser, { opacity: fade, paddingTop: insets.top + 24 }]}>
          <Text style={styles.chooserTitle}>Where do you{'\n'}want to start?</Text>
          <Text style={styles.chooserLede}>
            Both get built from the same route. Order is up to you.
          </Text>

          <PlanCard
            id="workout"
            eyebrow="TRAINING"
            title="Start with training"
            accent={themeColor}
            onPress={() => startWorkoutFlow(navigation)}
          />
          <PlanCard
            id="nutrition"
            eyebrow="NUTRITION"
            title="Start with food"
            accent={NUTRITION_GREEN.primary}
            onPress={() => startNutritionFlow(navigation)}
          />

          <TouchableOpacity
            style={[styles.exit, { marginBottom: insets.bottom + 12 }]}
            onPress={leave}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <Text style={styles.exitText}>I&rsquo;ll do this later</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <Pressable style={styles.tapArea} onPress={advance} accessibilityRole="button">
          <Animated.View
            style={[
              styles.beat,
              { paddingTop: CONTENT_TOP, opacity: fade, transform: [{ translateY: rise }] },
            ]}
          >
            {beat === 0 ? (
              <>
                <Text style={styles.eyebrow}>
                  PHASE 1 OF {roadmap ? roadmap.phases.length : '\u2014'}
                </Text>
                {/* No full stop. At this size it read as a brand slide rather
                    than a plan. */}
                <Text style={styles.huge}>{phaseName}</Text>

                {/* What actually changes in this phase, which is the question
                    the card is answering. */}
                {roadmap ? (
                  <View style={styles.fromTo}>
                    <Text style={styles.fromToNum}>
                      {Math.round(profile?.currentBodyFatPct ?? roadmap.band.ceiling + 2)}
                    </Text>
                    <Text style={styles.fromToArrow}>{'\u2192'}</Text>
                    <Text style={[styles.fromToNum, { color: themeColor }]}>
                      {Math.round(roadmap.phases[0].exitBodyFatPct)}
                    </Text>
                    <Text style={styles.fromToUnit}>% body fat</Text>
                  </View>
                ) : null}

                {months ? (
                  <View style={styles.durRow}>
                    <Text style={styles.durValue}>
                      {months[0]} to {months[1]} months
                    </Text>
                    <Text style={styles.durTag}>ESTIMATE</Text>
                  </View>
                ) : null}

                {/* The plan they just locked in, with this phase lit. The wow
                    on this screen should come from seeing their own line, not
                    from bigger type. */}
                {roadmap && profile ? (
                  <View style={styles.phaseLine}>
                    <PhaseLine
                      profile={profile}
                      roadmap={roadmap}
                      phaseIndex={0}
                      color={themeColor}
                    />
                  </View>
                ) : null}
              </>
            ) : null}

            {beat === 1 || beat === 2 ? (
              <>
                <Text style={styles.lead}>To get this phase right,{'\n'}you&rsquo;d need to:</Text>
                {REQUIREMENTS.map(([label, sub], i) => (
                  <View
                    key={label}
                    style={[styles.row, i >= (beat === 1 ? 2 : 5) && styles.rowHidden]}
                  >
                    <View style={styles.bullet} />
                    <View style={styles.rowBody}>
                      <Text style={styles.rowLabel}>{label}</Text>
                      <Text style={styles.rowSub}>{sub}</Text>
                    </View>
                  </View>
                ))}
              </>
            ) : null}

            {beat === 3 ? (
              <Text style={styles.turn}>
                That&rsquo;s a lot to hold{'\n'}in your head.{'\n'}
                <Text style={styles.turnSoft}>You won&rsquo;t have to.</Text>
              </Text>
            ) : null}

            {beat === 4 ? (
              <>
                <Text style={styles.lead}>All of it is decided{'\n'}for you.</Text>
                {HANDLED.map(([label, sub]) => (
                  <View key={label} style={styles.row}>
                    <Ionicons name="checkmark" size={15} color={themeColor} style={styles.tick} />
                    <View style={styles.rowBody}>
                      <Text style={[styles.rowLabel, styles.rowLabelDone]}>{label}</Text>
                      <Text style={styles.rowSub}>{sub}</Text>
                    </View>
                  </View>
                ))}
                <Text style={styles.closer}>You just show up and follow it.</Text>
              </>
            ) : null}
          </Animated.View>

          <Text style={[styles.tapHint, { bottom: insets.bottom + 40 }]}>
            tap anywhere to continue
          </Text>
        </Pressable>
      )}

      <View style={[styles.beatDots, { bottom: insets.bottom + 16 }]} pointerEvents="none">
        {Array.from({ length: BEATS }).map((_, i) => (
          <View key={i} style={[styles.beatDot, i === beat && styles.beatDotOn]} />
        ))}
      </View>
    </View>
  );
}

/** A single radial gradient sitting behind the text block. */
function Glow({ color }: { color: string }) {
  const size = SCREEN_W * 1.9;
  return (
    <View
      style={[
        styles.glow,
        { width: size, height: size, left: (SCREEN_W - size) / 2, top: CONTENT_TOP - size * 0.42 },
      ]}
      pointerEvents="none"
    >
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="revealGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.2} />
            <Stop offset="0.35" stopColor={color} stopOpacity={0.1} />
            <Stop offset="0.68" stopColor={color} stopOpacity={0.032} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#revealGlow)" />
      </Svg>
    </View>
  );
}

function PlanCard({
  id,
  eyebrow,
  title,
  accent,
  onPress,
}: {
  id: 'workout' | 'nutrition';
  eyebrow: string;
  title: string;
  accent: string;
  onPress: () => void;
}) {
  const source = getCreateImage(id);
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.cardImageWrap}>
        {source ? (
          <Image source={source} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.cardImageFallback]} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.cardGradient}
          pointerEvents="none"
        />
        <View style={styles.cardOverlay}>
          <Text style={styles.cardEyebrow}>{eyebrow}</Text>
          <View style={styles.cardBottomRow}>
            <Text style={styles.cardTitle}>{title}</Text>
            <View style={[styles.cardArrow, { backgroundColor: accent, shadowColor: accent }]}>
              <Ionicons name="arrow-forward" size={20} color="#0a0a0b" />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  glow: { position: 'absolute' },

  tapArea: { flex: 1 },
  beat: { flex: 1, paddingHorizontal: 30 },

  eyebrow: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.8, color: '#5b5b62', marginBottom: 14 },
  huge: { fontSize: 40, fontWeight: '700', letterSpacing: -1.2, color: '#ffffff', marginTop: 6, marginBottom: 0 },
  durRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  durValue: { fontSize: 21, fontWeight: '700', color: '#ffffff', letterSpacing: -0.4 },
  fromTo: { flexDirection: 'row', alignItems: 'baseline', gap: 9, marginTop: 18 },
  fromToNum: { fontSize: 44, fontWeight: '800', color: '#ffffff', letterSpacing: -2 },
  fromToArrow: { fontSize: 20, color: '#3f3f46' },
  fromToUnit: { fontSize: 15, fontWeight: '600', color: '#5b5b62' },
  phaseLine: { marginTop: 28, marginHorizontal: -4 },
  durTag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: '#5b5b62',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },

  lead: { fontSize: 22, fontWeight: '700', color: '#ffffff', letterSpacing: -0.5, lineHeight: 30, marginBottom: 24 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  rowHidden: { opacity: 0 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3f3f46', marginTop: 8 },
  tick: { marginTop: 2, width: 16 },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, lineHeight: 21, color: '#a1a1aa' },
  rowLabelDone: { color: '#e4e4e7' },
  rowSub: { fontSize: 12, lineHeight: 17, color: '#5b5b62', marginTop: 2 },
  closer: { fontSize: 15, lineHeight: 22, fontWeight: '500', color: '#6b6b70', marginTop: 20 },

  turn: { fontSize: 34, fontWeight: '700', color: '#ffffff', letterSpacing: -1.2, lineHeight: 42 },
  turnSoft: { color: '#6b6b70' },

  tapHint: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 11.5, color: '#3f3f46', letterSpacing: 0.4 },
  beatDots: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  beatDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#232327' },
  beatDotOn: { width: 12, backgroundColor: '#4b4b52' },

  chooser: { flex: 1, paddingHorizontal: 20 },
  chooserTitle: { fontSize: 27, fontWeight: '700', color: '#ffffff', letterSpacing: -0.6, lineHeight: 33, marginBottom: 6 },
  chooserLede: { fontSize: 13.5, lineHeight: 21, color: '#71717a', marginBottom: 20 },

  card: { borderRadius: 20, overflow: 'hidden', marginBottom: 14, backgroundColor: '#18181b' },
  cardImageWrap: { height: 232, position: 'relative' },
  cardImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  cardImageFallback: { backgroundColor: '#1f1f23' },
  cardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '80%' },
  cardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  cardEyebrow: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginBottom: 6 },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  cardTitle: { flex: 1, color: '#ffffff', fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
  cardArrow: {
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

  exit: {
    height: 52,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f1f23',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  exitText: { fontSize: 13.5, fontWeight: '500', color: '#71717a' },
});