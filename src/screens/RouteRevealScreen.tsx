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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
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
import { sharePlanPdfFor } from '../utils/planPdf';
import { loadPhaseJourney } from '../utils/phaseJourney';
import { ROUTE_OPTIONS } from './RouteScreen';
import { useWeightUnit } from '../contexts/WeightUnitContext';
import type { GoalsProfile } from '../utils/goalsProfile';

type NavProp = StackNavigationProp<RootStackParamList>;

// Four. The first phase card moved to the end of RouteScreen, and the
// requirements now arrive complete rather than two lines then five: the drip
// was a beat spent on suspense the list did not need.
const BEATS = 4;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/** Where every beat's first line starts, as a share of screen height. Fixed so
 *  the text does not hop between taps. */
const CONTENT_TOP = SCREEN_H * 0.2;

const REQUIREMENTS: Array<[string, string]> = [
  ['Eat to your macros most days', 'Not perfectly. Most days.'],
  ['Write the grocery list and prep the food', 'Every week, around whatever your week looks like.'],
  ['Enough hard sets per muscle, every week', 'Too few and nothing moves. Too many and you stall.'],
  ['Rest long enough between sets', 'Short rests cost you sets.'],
  ['Space your sessions to recover', 'Muscle grows between them, not during.'],
  ['Deload before progress stalls', 'Not after.'],
];

/** The same five, answered. Order matches REQUIREMENTS so the shape is already
 *  familiar by the time the ticks appear. */
const HANDLED: Array<[string, string]> = [
  ['Macros and meal timing', 'Set for this phase'],
  ['Grocery list and meal prep', 'Written for your week'],
  ['Sets and reps per muscle, per week', 'Built into the block'],
  ['Rest timers', 'Running while you lift'],
  ['Your training split', 'Scheduled around your week'],
  ['Deloads', 'Already in the mesocycle'],
];

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

  // One driver per beat, interpolated with a per row offset. Cheaper than an
  // Animated.Value per line, and it keeps everything on the native driver
  // because only opacity and translate are touched.
  const stagger = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    stagger.setValue(0);
    Animated.timing(stagger, {
      toValue: 1,
      duration: 900,
      useNativeDriver: true,
    }).start();
  }, [beat, stagger]);

  /** Fades and lifts item `i` in, starting after `i` steps of the driver. */
  const stepIn = (i: number) => {
    const start = Math.min(0.72, i * 0.11);
    const end = Math.min(1, start + 0.28);
    return {
      opacity: stagger.interpolate({ inputRange: [start, end], outputRange: [0, 1], extrapolate: 'clamp' }),
      transform: [
        {
          translateY: stagger.interpolate({
            inputRange: [start, end],
            outputRange: [12, 0],
            extrapolate: 'clamp',
          }),
        },
      ],
    };
  };

  const { globalUnit } = useWeightUnit();
  const [exporting, setExporting] = useState(false);

  /**
   * The first moment there is anything to export: the plan is locked in, so
   * the file describes something real.
   *
   * Deliberately NOT offered during the questions. There is nothing to put in
   * it until lock-in, and interrupting a ten-beat run to hand someone a
   * document about a plan they have not finished making is the wrong trade.
   */
  const exportPdf = async () => {
    if (!profile || exporting) return;
    setExporting(true);
    try {
      const journey = await loadPhaseJourney();
      const routeName =
        ROUTE_OPTIONS.find((o) => o.id === (profile.routePreference ?? 'balanced'))?.name ??
        'Balanced';
      await sharePlanPdfFor(profile, journey.length, routeName, globalUnit === 'lbs');
    } catch {
      Alert.alert('Could not create the file', 'Try again in a moment.');
    } finally {
      setExporting(false);
    }
  };

  const leave = () => navigation.popToTop();
  const isChooser = beat === BEATS - 1;

  // The chooser gets its OWN opacity rather than sharing `fade`. `fade` is
  // driven with useNativeDriver, which means its JavaScript side value stops
  // updating; when the chooser mounts it reads that stale value, which is 0
  // because fade was zeroed just before the beat changed, and it never sees the
  // animation that already ran on the now unmounted view. Result: a fully
  // transparent screen.
  const chooserFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isChooser) return;
    chooserFade.setValue(0);
    Animated.timing(chooserFade, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [isChooser, chooserFade]);

  return (
    <View style={styles.container}>
      <Glow color={themeColor} />

      {isChooser ? (
        <Animated.View style={[styles.chooser, { opacity: chooserFade, paddingTop: insets.top + 24 }]}>
          {/* SAME SHAPE AS THE CREATE SCREEN, deliberately. Both answer one
              question — workout or food — and two designs for one job is how
              they drift apart and how you end up maintaining both.

              What the reveal adds, and Create does not: a recommendation. A
              returning user opening Create knows what they want; someone who
              has just answered ten questions does not. */}
          <Text style={styles.chooserTitle}>Your plan is{'\n'}locked in.</Text>

          <View style={styles.choices}>
            <TouchableOpacity
              style={styles.choice}
              onPress={() => startWorkoutFlow(navigation)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Start with a workout plan, recommended"
            >
              <View style={styles.choiceBody}>
                <View style={styles.choiceTitleRow}>
                  <Text style={styles.choiceTitle}>A workout plan</Text>
                  <View style={[styles.tag, { borderColor: `${themeColor}4d` }]}>
                    <Text style={[styles.tagText, { color: themeColor }]}>START HERE</Text>
                  </View>
                </View>
                {/* The reason is that it is SHORTER, not that the phase calls
                    for it. A phase-based line would be wrong the moment a Trim
                    user is still recommended the workout plan, and the whole
                    point of recommending the same thing every time is that the
                    justification has to hold every time. */}
                <Text style={styles.choiceHint}>Fewer questions. The meal plan is easy to add after.</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#3f3f46" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.choice}
              onPress={() => startNutritionFlow(navigation)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Start with a meal plan"
            >
              <View style={styles.choiceBody}>
                <Text style={styles.choiceTitle}>A meal plan</Text>
                <Text style={styles.choiceHint}>Or start here instead</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#3f3f46" />
            </TouchableOpacity>
          </View>

          {/* Bordered, not a filled button and not a third row. Loud enough to
              find, quiet enough that downloading a file never looks equivalent
              to building a training plan. */}
          <TouchableOpacity
            style={styles.pdf}
            onPress={exportPdf}
            disabled={exporting}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Save my route as a PDF"
          >
            {exporting ? (
              <ActivityIndicator color="#71717a" size="small" />
            ) : (
              <>
                <Ionicons name="download-outline" size={15} color={themeColor} />
                <Text style={[styles.pdfText, { color: themeColor }]}>Save my route as a PDF</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exit, { marginTop: 'auto', marginBottom: insets.bottom + 12 }]}
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
                <Text style={styles.lead}>To get this phase right,{'\n'}you&rsquo;d need to:</Text>
                {REQUIREMENTS.map(([label, sub], i) => (
                  <Animated.View key={label} style={[styles.row, stepIn(i)]}>
                    <View style={styles.bullet} />
                    <View style={styles.rowBody}>
                      <Text style={styles.rowLabel}>{label}</Text>
                      <Text style={styles.rowSub}>{sub}</Text>
                    </View>
                  </Animated.View>
                ))}
                <Animated.View style={stepIn(REQUIREMENTS.length)}>
                  <Text style={styles.andMore}>And more.</Text>
                </Animated.View>
              </>
            ) : null}

            {beat === 1 ? (
              <>
                <Text style={styles.turn}>
                  That&rsquo;s a lot to hold{'\n'}in your head.
                </Text>
                {/* Held back deliberately: the relief has to arrive after the
                    problem has landed, or the turn is not a turn. */}
                <Animated.View style={stepIn(4)}>
                  <Text style={[styles.turn, styles.turnSoft]}>You won&rsquo;t have to.</Text>
                </Animated.View>
              </>
            ) : null}

            {beat === 2 ? (
              <>
                <Text style={styles.lead}>All of it is decided{'\n'}for you.</Text>
                {HANDLED.map(([label, sub], i) => (
                  <Animated.View key={label} style={[styles.row, stepIn(i)]}>
                    <Ionicons name="checkmark" size={15} color={themeColor} style={styles.tick} />
                    <View style={styles.rowBody}>
                      <Text style={[styles.rowLabel, styles.rowLabelDone]}>{label}</Text>
                      <Text style={styles.rowSub}>{sub}</Text>
                    </View>
                  </Animated.View>
                ))}
                <Animated.View style={stepIn(HANDLED.length)}>
                  <Text style={styles.andMore}>And more.</Text>
                </Animated.View>
                <Animated.View style={stepIn(HANDLED.length + 1)}>
                  <Text style={styles.closer}>You just show up and follow it.</Text>
                </Animated.View>
              </>
            ) : null}
          </Animated.View>

          <Text style={[styles.tapHint, { bottom: insets.bottom + 40 }]}>
            tap anywhere to continue
          </Text>
        </Pressable>
      )}

      {/* Not on the chooser: there is nothing left to progress through, and the
          dots were overlapping the exit button. */}
      {isChooser ? null : (
        <View style={[styles.beatDots, { bottom: insets.bottom + 16 }]} pointerEvents="none">
          {Array.from({ length: BEATS }).map((_, i) => (
            <View key={i} style={[styles.beatDot, i === beat && styles.beatDotOn]} />
          ))}
        </View>
      )}
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

  lead: { fontSize: 22, fontWeight: '700', color: '#ffffff', letterSpacing: -0.5, lineHeight: 30, marginBottom: 24 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3f3f46', marginTop: 8 },
  tick: { marginTop: 2, width: 16 },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, lineHeight: 21, color: '#a1a1aa' },
  rowLabelDone: { color: '#e4e4e7' },
  rowSub: { fontSize: 12, lineHeight: 17, color: '#5b5b62', marginTop: 2 },
  // Sits where a row would, indented to the same text column, so it reads as
  // the list trailing off rather than as a new sentence.
  andMore: { fontSize: 12.5, color: '#4b4b52', marginLeft: 18, marginTop: 2 },
  closer: { fontSize: 15, lineHeight: 22, fontWeight: '500', color: '#6b6b70', marginTop: 20 },

  turn: { fontSize: 34, fontWeight: '700', color: '#ffffff', letterSpacing: -1.2, lineHeight: 42 },
  turnSoft: { color: '#6b6b70' },

  tapHint: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 11.5, color: '#3f3f46', letterSpacing: 0.4 },
  beatDots: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  beatDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#232327' },
  beatDotOn: { width: 12, backgroundColor: '#4b4b52' },

  chooser: { flex: 1, paddingHorizontal: 20 },
  chooserTitle: {
    marginTop: 40,
    fontSize: 38,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -1.1,
    lineHeight: 44,
  },

  // Mirrors CreateChooserScreen's choice rows exactly. If one moves, move both.
  choices: { marginTop: 30 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 19,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#232327',
  },
  choiceBody: { flex: 1 },
  choiceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  choiceTitle: { fontSize: 22, fontWeight: '600', color: '#ffffff', letterSpacing: -0.3 },
  choiceHint: { fontSize: 13, color: '#5b5b62', marginTop: 4 },
  tag: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  tagText: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2 },

  pdf: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f1f23',
    marginTop: 22,
  },
  pdfText: { fontSize: 13.5, fontWeight: '600' },

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