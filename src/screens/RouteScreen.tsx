// src/screens/RouteScreen.tsx
//
// The goal intake, as six beats: one question per screen.
//
//   1  What do you weigh right now?      currentWeightKg
//   2  What's your body fat?             currentBodyFatPct, bodyFatSource
//   3  How lean do you want to get?      provisional goalBodyFatPct
//   4  How big do you want to be?        provisional goalWeightKg
//   5  Pick your style                   routePreference
//   6  The summary, and the lock         navigates to RouteReveal
//
// WHY SIX AND NOT THREE. Beat 1 used to ask for weight and body fat together,
// and beat 2 asked for both goal dimensions on one card. Splitting them is not
// cosmetic: goal leanness has to be fixed BEFORE the weight axis means
// anything, which is why the old HOW HEAVY eyebrow had to explain that it had
// silently recomputed itself. Now the two questions are asked in the order
// their dependency runs.
//
// THE COMMITMENT POINT MOVED. Provisional goal values used to be promoted to
// the profile on leaving beat 2. They are now promoted on leaving beat 4,
// which is the same moment in the flow, just two beats later.
//
// LOCKING NAVIGATES. Beat 6 confirms, then pushes RouteReveal, which has no
// back button. The confirmation is what buys the right to remove it.
//
// The instruments, the journey chart and the evidence sheet all live in
// src/components/route/. This file is the orchestration only.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useWeightUnit } from '../contexts/WeightUnitContext';
import { loadGoalsProfile, updateGoalsProfileField } from '../utils/goalsProfileStorage';
import { emptyBodyFatValue, type BodyFatFieldValue } from '../components/BodyFatField';
import RouteBodyFatField from '../components/route/RouteBodyFatField';
import BodyPictogram from '../components/route/BodyPictogram';
import ScaleRuler from '../components/route/ScaleRuler';
import { FrameCurve } from '../components/route/GoalInstruments';
import JourneyChart from '../components/route/JourneyChart';
import EvidenceSheet from '../components/route/EvidenceSheet';
import { recordRoadmapSnapshot } from '../utils/roadmapStorage';
import {
  deriveRoadmap,
  weightAtBodyFat,
  leanMassKg,
  leanAtNormalisedFfmi,
  ffmiLimitsFor,
  FFMI_UNTRAINED,
  type Roadmap,
} from '../utils/roadmap';
import {
  ATTRACTIVE_BF_RANGE,
  ATTRACTIVE_BF_CENTRE,
} from '../utils/attractivenessTargets';
import { frameZoneFor, evidenceTopicFor, type EvidenceTopic } from '../utils/routeZones';
import type { GoalsProfile, RoutePreference, Sex } from '../utils/goalsProfile';

type Nav = StackNavigationProp<RootStackParamList>;
type Beat = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const ROUTE_OPTIONS: Array<{
  id: RoutePreference;
  name: string;
  trade: string;
  feel: (floor: number, ceiling: number, cycles: number) => string;
}> = [
  {
    id: 'lean',
    name: 'Stay lean',
    trade: 'Look your best the whole way, but it takes longer.',
    feel: (f, c, k) =>
      `You hold between ${f} and ${c}% body fat, trimming ${k} times so you always look sharp.`,
  },
  {
    id: 'balanced',
    name: 'Balanced',
    trade: 'Solid pace without drifting far from lean.',
    feel: (f, c, k) =>
      `You live between ${f} and ${c}% body fat. Building most of the time, trimming back ${k} times so it never gets away from you.`,
  },
  {
    id: 'roomy',
    name: 'Grow faster',
    trade: 'Fastest to your goal, but a softer look along the way.',
    feel: (f, c, k) =>
      `Longer stretches of growing between ${f} and ${c}% body fat, with only ${k} trims interrupting.`,
  },
];

/** Semantic tone to colour. Kept here so routeZones stays free of palette. */
// Nothing in the flow is gold any more: the researched band is the theme
// colour, so a second accent for the same idea would read as a third state.
const TONE: Record<string, string> = {
  neutral: '#8e8e93',
  rated: 'theme',
  good: '#34d399',
  caution: '#f0b429',
  stop: '#f87171',
};
/** 'theme' is resolved at render, since the palette is not a constant. */
const toneColour = (tone: string, themeColor: string) =>
  TONE[tone] === 'theme' ? themeColor : TONE[tone];
const TONE_ICON: Record<string, string> = {
  neutral: 'ellipse-outline',
  rated: 'sparkles',
  good: 'checkmark-circle-outline',
  caution: 'alert-circle-outline',
  stop: 'close-circle-outline',
};

/**
 * Fades its children in on mount. Give it a key that changes when the content
 * changes and React remounts it, which is what produces the fade.
 *
 * There is deliberately no exit animation: animating out means holding the old
 * content in the tree while the new one arrives, which either overlaps them or
 * shifts the layout, and shifting the layout is the thing this is here to stop.
 */
function Fade({ children, style }: { children: React.ReactNode; style?: any }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [opacity]);
  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}

// Conversion happens only at the edges. currentWeightKg stays kilograms and
// heightCm stays centimetres no matter what the user is looking at, so nothing
// downstream has to know a unit preference exists.
const LB_PER_KG = 2.2046226218;
const kgToLb = (kg: number) => kg * LB_PER_KG;
const lbToKg = (lb: number) => lb / LB_PER_KG;
const cmToIn = (cm: number) => cm / 2.54;
const inToCm = (inches: number) => inches * 2.54;

/** 68 inches reads as 5'8". */
const feetInches = (inches: number) => {
  const whole = Math.round(inches);
  return `${Math.floor(whole / 12)}'${whole % 12}`;
};

/**
 * Sits under the question rather than in a settings row: the moment you are
 * about to set your weight is the moment you notice the unit is wrong. Writes
 * straight to WeightUnitContext, so it changes the whole app.
 */
function UnitToggle({
  metricLabel,
  imperialLabel,
  imperial,
  onChange,
}: {
  metricLabel: string;
  imperialLabel: string;
  imperial: boolean;
  onChange: (next: 'kg' | 'lbs') => void;
}) {
  return (
    <View style={styles.unitRow}>
      <View style={styles.unitToggle}>
        <TouchableOpacity
          style={[styles.unitBtn, !imperial && styles.unitBtnOn]}
          onPress={() => onChange('kg')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ selected: !imperial }}
        >
          <Text style={[styles.unitText, !imperial && styles.unitTextOn]}>{metricLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.unitBtn, imperial && styles.unitBtnOn]}
          onPress={() => onChange('lbs')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ selected: imperial }}
        >
          <Text style={[styles.unitText, imperial && styles.unitTextOn]}>{imperialLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Per beat help, opened from the info button in the top bar. Only beats that
 * genuinely need justifying get one: an info button on every screen trains
 * people to ignore it.
 */
interface BeatHelp {
  title: string;
  body: string;
  /** Rendered small and boxed. Set as prose it reads as another paragraph the
   *  user is meant to absorb, which is most of why these sheets felt long. */
  sources?: string;
}

function helpFor(beat: number, sex?: Sex): BeatHelp | null {
  if (beat === 3) {
    return {
      title: 'Why we ask',
      body:
        'Body fat ranges and muscle limits differ between male and female bodies, so your answer changes the numbers this app works from. It is used for those calculations and nothing else.',
    };
  }
  if (beat === 5) {
    // Two genuinely different findings, not the same one reworded. For men the
    // research produces a peak. For women it does not.
    if (sex === 'female') {
      return {
        title: 'Why nothing is marked',
        body:
          'The male research lands on a clear peak. The research on women does not, so there is no single figure to mark and this app will not invent one.\n\nLeaning out still shows the same way: the body first, and the face after it.\n\nOne finding worth knowing. When female faces were rated, the level judged most attractive was leaner than the level judged healthiest.',
        sources:
          'Wang et al., PLOS ONE, ten populations, DXA measured \u00b7 Coetzee et al. 2011, Body Image \u00b7 de Jager et al. 2018, Frontiers in Psychology',
      };
    }
    return {
      title: 'Why this range',
      body:
        'Lean enough that the muscle you have built actually shows. Shoulders, arms, the taper at the waist. Ratings peak here and fall away on both sides, so going leaner past it stops paying off.\n\nIt shows in your face as well: the jaw and cheekbones come out as the fat over them goes.\n\nWhere that happens for you depends on where you store fat, so this is a range rather than a number.',
      sources:
        'Xia et al. 2025, Personality and Individual Differences, 283 raters, DXA measured \u00b7 Coetzee et al. 2009, Perception \u00b7 de Jager et al. 2018, Frontiers in Psychology \u00b7 Brierley et al. 2016, PLOS ONE',
    };
  }
  return null;
}

/** Range of the goal body fat scale, before the female shift. */
const GOAL_BF_MIN = 8;
const GOAL_BF_MAX = 24;

function goalZoneName(v: number, shift: number): string {
  if (v < 11 + shift) return 'Very lean';
  if (v < 15 + shift) return 'Athletic';
  if (v < 19 + shift) return 'Fit';
  return 'Soft';
}

/** Only the summary draws figures now: the goal beat's before and after pair
 *  was a weaker copy of it. */
const SUMMARY_FIGURE_HEIGHT = 104;

export default function RouteScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'Route'>>();
  const { themeColor } = useTheme();
  const { globalUnit, setGlobalUnit } = useWeightUnit();
  const insets = useSafeAreaInsets();

  const flowStepOffset = route.params?.flowStepOffset ?? 4;

  const [profile, setProfile] = useState<GoalsProfile | null>(null);
  const [preference, setPreference] = useState<RoutePreference>('balanced');
  const [loading, setLoading] = useState(true);
  const [beat, setBeat] = useState<Beat>(1);
  const [bodyFat, setBodyFat] = useState<BodyFatFieldValue>(emptyBodyFatValue());
  const [evidence, setEvidence] = useState<EvidenceTopic | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [estimatorOpen, setEstimatorOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [beat]);

  // Beats cross fade and slide rather than swapping instantly. The old content
  // leaves in the direction of travel and the new content arrives from the
  // opposite side, so forward and back feel different without any chrome
  // saying so.
  const beatFade = useRef(new Animated.Value(1)).current;
  const beatSlide = useRef(new Animated.Value(0)).current;
  const moving = useRef(false);

  const goToBeat = (next: Beat, direction: 1 | -1) => {
    if (moving.current) return;
    moving.current = true;
    Animated.parallel([
      Animated.timing(beatFade, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(beatSlide, { toValue: -14 * direction, duration: 130, useNativeDriver: true }),
    ]).start(() => {
      setBeat(next);
      // Jump to the far side before fading back in, so the new content slides
      // in rather than appearing where the old one left.
      beatSlide.setValue(16 * direction);
      Animated.parallel([
        Animated.timing(beatFade, { toValue: 1, duration: 230, useNativeDriver: true }),
        Animated.timing(beatSlide, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start(() => {
        moving.current = false;
      });
    });
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadGoalsProfile().then((p) => {
        if (cancelled) return;
        setProfile(p);
        if (p?.routePreference) setPreference(p.routePreference);
        setBodyFat(emptyBodyFatValue(p?.currentBodyFatPct));
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const provisionalGoalBf = profile?.goalBodyFatPct ?? ATTRACTIVE_BF_CENTRE;
  const provisionalGoalW = React.useMemo(() => {
    if (!profile) return null;
    if (profile.goalWeightKg != null) return profile.goalWeightKg;
    if (profile.heightCm == null) return profile.currentWeightKg;
    const sexKey = profile.sex === 'female' ? 'female' : 'male';
    const baseW = weightAtBodyFat(
      leanAtNormalisedFfmi(FFMI_UNTRAINED[sexKey], profile.heightCm),
      provisionalGoalBf,
    );
    const okW = weightAtBodyFat(
      leanAtNormalisedFfmi(ffmiLimitsFor(profile.sex).ok, profile.heightCm),
      provisionalGoalBf,
    );
    return Math.round(((baseW + okW) / 2) * 2) / 2;
  }, [profile, provisionalGoalBf]);

  const effProfile: GoalsProfile | null = profile
    ? { ...profile, goalWeightKg: provisionalGoalW ?? undefined, goalBodyFatPct: provisionalGoalBf }
    : null;

  // deriveRoadmap walks the whole phase sequence, and this used to run on every
  // render, which meant every frame of a drag. Keyed on the scalars it actually
  // reads rather than on effProfile, which is a fresh object each render.
  const roadmap: Roadmap | null = React.useMemo(
    () => (effProfile ? deriveRoadmap(effProfile, preference) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      profile?.currentWeightKg,
      profile?.currentBodyFatPct,
      profile?.heightCm,
      profile?.sex,
      provisionalGoalW,
      provisionalGoalBf,
      preference,
    ],
  );

  const patch = async <K extends keyof GoalsProfile>(field: K, value: GoalsProfile[K]) => {
    setProfile((prev) => (prev ? { ...prev, [field]: value } : prev));
    await updateGoalsProfileField(field, value);
  };

  const onWeightDrag = (next: number, committed: boolean) => {
    const kg = globalUnit === 'lbs' ? lbToKg(next) : next;
    setProfile((prev) => (prev ? { ...prev, currentWeightKg: kg } : prev));
    if (committed) updateGoalsProfileField('currentWeightKg', kg);
  };

  const onHeightDrag = (next: number, committed: boolean) => {
    const cm = globalUnit === 'lbs' ? inToCm(next) : next;
    setProfile((prev) => (prev ? { ...prev, heightCm: cm } : prev));
    if (committed) updateGoalsProfileField('heightCm', cm);
  };

  const onBodyFat = (next: BodyFatFieldValue) => {
    setBodyFat(next);
    if (next.bodyFatPct != null) {
      patch('currentBodyFatPct', next.bodyFatPct);
      patch('bodyFatSource', next.source);
    }
  };

  const choose = async (next: RoutePreference) => {
    setPreference(next);
    await updateGoalsProfileField('routePreference', next);
  };

  const back = () => {
    if (beat > 1) goToBeat((beat - 1) as Beat, -1);
    else navigation.goBack();
  };

  const advance = async () => {
    if (beat === 6) {
      // The commitment point: provisional values become the saved goal, so
      // beats 5 and 6 and every downstream consumer read what the user just
      // looked at.
      if (profile?.goalWeightKg == null && provisionalGoalW != null) {
        await patch('goalWeightKg', provisionalGoalW);
      }
      if (profile?.goalBodyFatPct == null) {
        await patch('goalBodyFatPct', provisionalGoalBf);
      }
    }
    if (beat < 8) goToBeat((beat + 1) as Beat, 1);
    else setConfirming(true);
  };

  const lockIn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (profile && roadmap) await recordRoadmapSnapshot(profile, preference, roadmap);
      setConfirming(false);
      navigation.navigate('RouteReveal', { flowStepOffset });
    } finally {
      setBusy(false);
    }
  };

  const saveAndLeave = async () => {
    if (profile && roadmap) await recordRoadmapSnapshot(profile, preference, roadmap);
    navigation.popToTop();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={themeColor} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>
          Add your current weight in Goals and stats and your route appears here.
        </Text>
      </View>
    );
  }

  const currentWeight = profile.currentWeightKg ?? 77;
  const currentHeight = profile.heightCm ?? 175;
  const imperial = globalUnit === 'lbs';
  const currentBf = profile.currentBodyFatPct;
  const goalW = provisionalGoalW ?? currentWeight;
  const goalLean = leanMassKg(goalW, provisionalGoalBf);
  const zone =
    profile.heightCm != null
      ? frameZoneFor(goalLean, profile.heightCm, provisionalGoalBf, profile.sex)
      : null;

  const [yrLo, yrHi] = roadmap?.estYears ?? [0, 0];
  const selected = ROUTE_OPTIONS.find((o) => o.id === preference);
  const inRated =
    profile.sex !== 'female' &&
    provisionalGoalBf >= ATTRACTIVE_BF_RANGE[0] &&
    provisionalGoalBf <= ATTRACTIVE_BF_RANGE[1];
  const belowRated = profile.sex !== 'female' && provisionalGoalBf < ATTRACTIVE_BF_RANGE[0];
  // The researched band is male and unknown sex only, matching the guard the
  // sweet spot marks already use.
  const showRated = profile.sex !== 'female';
  const bfShift = profile.sex === 'female' ? 9 : 0;

  // The beat label already names the field and the chevron already says
  // forward, so a CTA announcing the next question was a second navigation
  // system doing the same job. The last beat keeps real words because there
  // the button is the point.
  // Beat 3 has to be answered: removing the opt out means an unset value
  // would silently apply the male set, which is the exact thing the opt out
  // was doing.
  const ctaBlocked = beat === 3 && profile.sex == null;
  const beatHelp = helpFor(beat, profile.sex);

  const CTA: Record<Beat, string> = {
    1: 'Continue',
    2: 'Continue',
    3: 'Continue',
    4: 'Continue',
    5: 'Continue',
    6: 'Continue',
    7: 'See the whole plan',
    8: 'Lock in my plan',
  };

  const verdictPill = zone ? (
    <TouchableOpacity
      style={[styles.verdict, { backgroundColor: `${toneColour(zone.tone, themeColor)}1a` }]}
      onPress={() => setEvidence(evidenceTopicFor(zone.key))}
      activeOpacity={0.8}
      accessibilityRole="button"
    >
      <Ionicons name={TONE_ICON[zone.tone] as any} size={15} color={toneColour(zone.tone, themeColor)} />
      <Text style={[styles.verdictText, { color: toneColour(zone.tone, themeColor) }]}>
        {zone.label}
        {zone.showYears ? ` \u00b7 ${yrLo} to ${yrHi} yr` : ''}
      </Text>
      <View style={[styles.qmark, { borderColor: toneColour(zone.tone, themeColor) }]}>
        <Text style={[styles.qmarkText, { color: toneColour(zone.tone, themeColor) }]}>?</Text>
      </View>
    </TouchableOpacity>
  ) : null;

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={back}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={20} color="#d4d4d8" />
        </TouchableOpacity>
        {/* The dots take the title's place. "Your route" was the same six
            words on every screen, and the CTA already names where you are. */}
        <View style={styles.dots}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <View
              key={i}
              style={[styles.dot, i === beat && [styles.dotOn, { backgroundColor: themeColor }]]}
            />
          ))}
        </View>

        {/* Balances the back button so the dots stay centred, and carries the
            info button on the beats that have something to explain. No close:
            the back arrow is the way out, and one exit is clearer than two. */}
        {beatHelp ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setHelpOpen(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Why we ask"
          >
            <Ionicons name="information" size={19} color="#d4d4d8" />
          </TouchableOpacity>
        ) : beat === 4 ? (
          /* The estimator lives up here rather than as a segmented control,
             which was spending a third of the screen on a mode the user picks
             once, if at all. */
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setEstimatorOpen(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Help me estimate"
          >
            <Ionicons name="body-outline" size={19} color="#d4d4d8" />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconSpacer} />
        )}
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.beatWrap,
            { opacity: beatFade, transform: [{ translateX: beatSlide }] },
          ]}
        >
        {/* ---------------------------------------------------------------- */}
        {beat === 1 ? (
          <>
            {/* Instrument panel header: the label names the field and the
                number is the subject. Nothing competes with it. */}
            <View style={styles.beat1Body}>
              <Text style={styles.beatLabel}>CURRENT WEIGHT</Text>
              <View style={styles.bigNum}>
                <Text style={styles.bigValue}>
                  {imperial ? Math.round(kgToLb(currentWeight)) : currentWeight.toFixed(1)}
                </Text>
                <Text style={styles.bigUnit}>{imperial ? 'lbs' : 'kg'}</Text>
              </View>

              <ScaleRuler
                value={
                  imperial
                    ? Math.round(kgToLb(currentWeight))
                    : Math.round(currentWeight * 10) / 10
                }
                min={imperial ? 77 : 35}
                max={imperial ? 440 : 200}
                step={imperial ? 1 : 0.1}
                tickStep={imperial ? 1 : 0.5}
                pxPerUnit={imperial ? 6 : 13}
                isMajor={(v) => Math.round(v) % (imperial ? 10 : 5) === 0 && Math.abs(v - Math.round(v)) < 0.01}
                formatLabel={(v) => String(Math.round(v))}
                onChange={onWeightDrag}
                themeColor={themeColor}
              />
              <UnitToggle
                metricLabel="kg"
                imperialLabel="lbs"
                imperial={imperial}
                onChange={setGlobalUnit}
              />
            </View>
          </>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* Height is the number the rest of the flow depends on: beat 5's
            curve cannot be drawn without it, and tape mode dead-ends without
            it. Asking here removes the last way to arrive at the goal beats
            with nothing to show. */}
        {beat === 2 ? (
          <>
            <View style={styles.beat1Body}>
              <Text style={styles.beatLabel}>HEIGHT</Text>
              <View style={styles.bigNum}>
                {imperial ? (
                  <>
                    <Text style={styles.bigValue}>{feetInches(cmToIn(currentHeight))}</Text>
                    <Text style={styles.bigUnit}>&quot;</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.bigValue}>{Math.round(currentHeight)}</Text>
                    <Text style={styles.bigUnit}>cm</Text>
                  </>
                )}
              </View>

              <ScaleRuler
                value={imperial ? Math.round(cmToIn(currentHeight)) : Math.round(currentHeight)}
                min={imperial ? 48 : 120}
                max={imperial ? 86 : 220}
                step={1}
                pxPerUnit={imperial ? 20 : 13}
                isMajor={(v) => Math.round(v) % (imperial ? 6 : 5) === 0}
                formatLabel={(v) => (imperial ? `${feetInches(v)}"` : String(Math.round(v)))}
                onChange={onHeightDrag}
                themeColor={themeColor}
              />
              <UnitToggle
                metricLabel="cm"
                imperialLabel="ft in"
                imperial={imperial}
                onChange={setGlobalUnit}
              />
            </View>
          </>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* Sex has to be answered before body fat: the tiers and the zone
            bands shift nine points, and ffmiLimitsFor returns 21 and 22 for
            female against 24 and 25.5 for male. Every check in the codebase
            reads `sex === 'female' ? ... : ...`, so leaving it unset silently
            hands a woman the male scale. */}
        {beat === 3 ? (
          <>
            <View style={styles.beat1Body}>
              <Text style={styles.beatLabel}>SEX</Text>

              <View style={styles.sexPair}>
                {/* Plain pictograms here, unscaled: this beat asks which
                    reference ranges to use, not what shape you are. */}
                {([
                  ['male', 'Male', 'man'],
                  ['female', 'Female', 'woman'],
                ] as Array<[Sex, string, string]>).map(([value, label, icon]) => {
                  const active = profile.sex === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.sexPick,
                        active && { borderColor: themeColor, backgroundColor: '#102024' },
                      ]}
                      // Deliberately does NOT touch the app theme. Pink stays
                      // something the user picks in Profile, because assigning
                      // a colour by sex is the part people object to.
                      onPress={() => patch('sex', value)}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Ionicons
                        name={icon as any}
                        size={72}
                        color={active ? themeColor : '#52525b'}
                      />
                      <Text style={[styles.sexName, active && styles.sexNameOn]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

            </View>
          </>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {beat === 4 ? (
          <>
            {/* Centred the same way the weight and height beats are, so all
                three read as one instrument panel rather than three layouts. */}
            <View style={styles.beat1Body}>
              <Text style={styles.beatLabel}>CURRENT BODY FAT</Text>
              <RouteBodyFatField
                value={bodyFat}
                onChange={onBodyFat}
                sex={profile.sex}
                heightCm={profile.heightCm}
                themeColor={themeColor}
                estimatorOpen={estimatorOpen}
                onCloseEstimator={() => setEstimatorOpen(false)}
              />
            </View>
          </>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {beat === 5 ? (
          <>
            <View style={styles.beat1Body}>
            <Text style={styles.beatLabel}>TARGET BODY FAT</Text>
            <View style={styles.bigNum}>
              <Text style={styles.bigValue}>{Math.round(provisionalGoalBf)}</Text>
              <Text style={styles.bigUnit}>%</Text>
            </View>
            {/* Same instrument as every other numeric beat. The zones live in
                the tick colours and the researched band is a marked span drawn
                in place, rather than a separate widget with its own gestures. */}
            <ScaleRuler
              value={Math.round(provisionalGoalBf)}
              min={GOAL_BF_MIN + bfShift}
              max={GOAL_BF_MAX + bfShift}
              step={1}
              pxPerUnit={24}
              isMajor={(v) => Math.round(v) % 2 === 0}
              formatLabel={(v) => String(Math.round(v))}
              // Neutral ticks with one coloured band. A full zone ramp meant
              // four colours competing with the one span that actually carries
              // a finding, and it put a blue tick next to a blue needle.
              tickColor={(v, major) =>
                showRated && v >= ATTRACTIVE_BF_RANGE[0] && v <= ATTRACTIVE_BF_RANGE[1]
                  ? themeColor
                  : major
                    ? '#6b6b70'
                    : '#3f3f46'
              }
              rangeLabel={
                showRated
                  ? {
                      from: ATTRACTIVE_BF_RANGE[0],
                      to: ATTRACTIVE_BF_RANGE[1],
                      text: 'MOST ATTRACTIVE',
                      colour: themeColor,
                    }
                  : undefined
              }
              onChange={(pct, persist) => {
                setProfile((prev) => (prev ? { ...prev, goalBodyFatPct: pct } : prev));
                if (persist) updateGoalsProfileField('goalBodyFatPct', pct);
              }}
              themeColor={themeColor}
            />

            {/* Names the zone, the same as the body fat beat does. It used to
                repeat the band's own label back at the user, which is why the
                screen said most attractive twice. */}
            <View style={styles.subSlot}>
              <Text style={styles.bigSub}>{goalZoneName(provisionalGoalBf, bfShift)}</Text>
            </View>

            {/* Fixed height, so crossing a boundary fades the contents rather
                than moving everything above it. */}
            </View>
            <View style={styles.beat3Slot}>
              {belowRated ? (
                <Fade key="lean-warning">
                  <Text style={styles.leanWarn}>
                    Leaner than this rated slightly worse in the same studies, and nothing ties any
                    percentage to facial definition.
                  </Text>
                </Fade>
              ) : !inRated && profile.sex !== 'female' ? (
                <Fade key="snap-button">
                  <TouchableOpacity
                    style={styles.snapBtn}
                    onPress={() => {
                      setProfile((prev) =>
                        prev ? { ...prev, goalBodyFatPct: ATTRACTIVE_BF_CENTRE } : prev,
                      );
                      updateGoalsProfileField('goalBodyFatPct', ATTRACTIVE_BF_CENTRE);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="sparkles" size={14} color={themeColor} />
                    <Text style={[styles.snapBtnText, { color: themeColor }]}>
                      Take me to {ATTRACTIVE_BF_CENTRE}%
                    </Text>
                    <Text style={styles.snapBtnSub}>centre of the rated range</Text>
                  </TouchableOpacity>
                </Fade>
              ) : null}
            </View>
          </>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {beat === 6 ? (
          <>
            <Text style={styles.beatLabel}>TARGET WEIGHT</Text>

            <View style={styles.bigNum}>
              <Text style={styles.bigValue}>{goalW.toFixed(1)}</Text>
              <Text style={styles.bigUnit}>kg</Text>
            </View>
            <Text style={styles.bigSubDim}>
              <Text style={{ color: themeColor, fontWeight: '600' }}>
                {goalLean.toFixed(1)} kg
              </Text>{' '}
              of lean mass at {Math.round(provisionalGoalBf)}%
            </Text>

            <FrameCurve
              profile={effProfile!}
              goalWeightKg={goalW}
              goalBodyFatPct={provisionalGoalBf}
              zoneKey={zone?.key ?? 'ok'}
              themeColor={themeColor}
              onGoalWeight={(w, persist) => {
                setProfile((prev) => (prev ? { ...prev, goalWeightKg: w } : prev));
                if (persist) updateGoalsProfileField('goalWeightKg', w);
              }}
              onLandmarkPress={(topic) => setEvidence(topic)}
            />

            {verdictPill}
          </>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {beat === 7 && roadmap ? (
          <>
            <Text style={styles.beatLabel}>CHOOSE YOUR ROUTE</Text>

            <View style={styles.chartCard}>
              <View style={styles.chartHead}>
                <Text style={styles.eyebrow}>YOUR JOURNEY</Text>
                <Text style={[styles.chartYears, { color: themeColor }]}>
                  {yrLo} to {yrHi} yr
                </Text>
              </View>
              <JourneyChart profile={profile} roadmap={roadmap} color={themeColor} />
            </View>

            {ROUTE_OPTIONS.map((opt) => {
              const active = preference === opt.id;
              const preview = deriveRoadmap(effProfile!, opt.id);
              const trims = preview.phases.find((ph) => ph.kind === 'trim')?.repeats ?? 0;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.routeCard,
                    active && { borderColor: themeColor, backgroundColor: '#14181b' },
                  ]}
                  onPress={() => choose(opt.id)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <View style={styles.routeHead}>
                    <Text style={styles.routeName}>{opt.name}</Text>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={17} color={themeColor} />
                    ) : null}
                  </View>
                  <Text style={styles.routeDesc}>{opt.trade}</Text>
                  {active ? (
                    <Text style={styles.routeFeel}>
                      {opt.feel(preview.band.floor, preview.band.ceiling, trims)}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {beat === 8 && roadmap ? (
          <>
            <Text style={styles.beatLabel}>YOUR PLAN</Text>
            <Text style={styles.titleSm}>This is where you end up.</Text>

            <View style={styles.beforeAfter}>
              <View style={styles.baCol}>
                <Text style={styles.baTag}>TODAY</Text>
                <View style={styles.figureGhostStatic}>
                  <BodyPictogram
                    bodyFatPct={Math.round(currentBf ?? 20)}
                    sex={profile.sex}
                    height={SUMMARY_FIGURE_HEIGHT}
                    color="#52525b"
                    />
                </View>
                <Text style={styles.baNum}>{currentWeight.toFixed(1)} kg</Text>
                {currentBf != null ? (
                  <Text style={styles.baBf}>{Math.round(currentBf)}% body fat</Text>
                ) : null}
              </View>

              <Ionicons name="arrow-forward" size={18} color="#3f3f46" style={styles.baArrow} />

              <View style={styles.baCol}>
                <Text style={[styles.baTag, { color: themeColor }]}>
                  {inRated ? 'MOST ATTRACTIVE' : 'YOUR GOAL'}
                </Text>
                <BodyPictogram
                  bodyFatPct={Math.round(provisionalGoalBf)}
                  sex={profile.sex}
                  height={SUMMARY_FIGURE_HEIGHT}
                  color={themeColor}
                  />
                <Text style={[styles.baNum, styles.baNumGoal]}>{goalW.toFixed(1)} kg</Text>
                <Text style={[styles.baBf, { color: themeColor }]}>
                  {Math.round(provisionalGoalBf)}% body fat
                </Text>
              </View>
            </View>

            <View style={styles.tiles}>
              <View style={styles.tile}>
                <Text style={styles.tileKey}>MUSCLE TO BUILD</Text>
                <Text style={[styles.tileValue, { color: themeColor }]}>
                  {roadmap.gapKg != null ? `${roadmap.gapKg > 0 ? '+' : ''}${roadmap.gapKg.toFixed(1)} kg` : '\u2014'}
                </Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileKey}>HOW LONG</Text>
                <Text style={styles.tileValue}>
                  {yrLo} to {yrHi} yr
                </Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileKey}>YOUR ROUTE</Text>
                <Text style={[styles.tileValue, styles.tileValueSm]}>{selected?.name}</Text>
              </View>
            </View>

            <View style={styles.chartCard}>
              <View style={styles.chartHead}>
                <Text style={styles.eyebrow}>THE PLAN</Text>
                <Text style={[styles.chartYears, { color: themeColor }]}>
                  {roadmap.phases.length} phases
                </Text>
              </View>
              <JourneyChart profile={profile} roadmap={roadmap} color={themeColor} />
            </View>

            {verdictPill}
          </>
        ) : null}
        </Animated.View>
      </ScrollView>

      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.cta}
          onPress={advance}
          activeOpacity={0.6}
          disabled={busy || ctaBlocked}
          accessibilityRole="button"
          accessibilityState={{ disabled: ctaBlocked }}
        >
          <Text style={[styles.ctaText, { color: ctaBlocked ? '#3f3f46' : themeColor }]}>
            {ctaBlocked ? 'Pick one to continue' : CTA[beat]}
          </Text>
          {ctaBlocked ? null : (
            <Ionicons name="chevron-forward" size={16} color={themeColor} />
          )}
        </TouchableOpacity>
        {beat >= 7 ? (
          <TouchableOpacity style={styles.secondary} onPress={saveAndLeave} activeOpacity={0.7}>
            <Text style={styles.secondaryText}>Not now, just save my route</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {zone ? (
        <EvidenceSheet
          visible={evidence != null}
          topic={evidence ?? 'ceiling'}
          zoneKey={zone.key}
          goalWeightKg={goalW}
          goalBodyFatPct={provisionalGoalBf}
          leanTargetKg={goalLean}
          onClose={() => setEvidence(null)}
        />
      ) : null}

      <Modal visible={helpOpen} transparent animationType="fade" onRequestClose={() => setHelpOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setHelpOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.grab} />
          <Text style={styles.sheetTitle}>{beatHelp?.title}</Text>
          <Text style={styles.sheetBody}>{beatHelp?.body}</Text>
          {beatHelp?.sources ? (
            <View style={styles.sheetSources}>
              <Text style={styles.sheetSourcesText}>{beatHelp.sources}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.sheetGhost}
            onPress={() => setHelpOpen(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.sheetGhostText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* The confirm exists so RouteReveal can drop its back and close
          buttons. One question, asked once, at the point where it is honest
          to ask it. */}
      <Modal visible={confirming} transparent animationType="fade" onRequestClose={() => setConfirming(false)}>
        <Pressable style={styles.scrim} onPress={() => setConfirming(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.grab} />
          <Text style={styles.sheetTitle}>Lock in {selected?.name}?</Text>
          <Text style={styles.sheetBody}>
            This saves your goal and builds the phase sequence around it. You can change it later in
            Goals and stats, but the plans get rebuilt when you do.
          </Text>
          {/* The sheet keeps a filled button. This is the commitment, and it
              is the one place on the flow that should feel like one. */}
          <TouchableOpacity
            style={[styles.sheetCta, { backgroundColor: themeColor }]}
            onPress={lockIn}
            activeOpacity={0.85}
            disabled={busy}
          >
            <Text style={styles.sheetCtaText}>Lock it in</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={() => setConfirming(false)} activeOpacity={0.7}>
            <Text style={styles.secondaryText}>Not yet</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: '#71717a', fontSize: 14, textAlign: 'center', lineHeight: 21 },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dots: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  iconSpacer: { width: 36, height: 36 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#27272a' },
  dotOn: { width: 18 },

  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 28 },
  // flexGrow so the beats that centre themselves still can: the animated
  // wrapper sits between the scroll container and them.
  beatWrap: { flexGrow: 1 },

  // Every beat is headed by a field label rather than a spoken question. The
  // one exception is the summary, which keeps a line under its label because a
  // grey label cannot carry the payoff of the whole flow.
  beatLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.6,
    color: '#5b5b62',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  beatSub: { fontSize: 12.5, lineHeight: 18, color: '#4b4b52', textAlign: 'center', marginTop: -8, marginBottom: 12 },

  sexPair: { flexDirection: 'row', gap: 12, marginTop: 14 },
  sexPick: {
    flex: 1,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 18,
    paddingTop: 30,
    paddingBottom: 20,
    alignItems: 'center',
  },
  sexName: { fontSize: 14.5, fontWeight: '600', color: '#8e8e93', marginTop: 18 },
  sexNameOn: { color: '#ffffff' },
  unitRow: { alignItems: 'center', marginTop: 16 },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#111114',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f1f23',
    borderRadius: 10,
    padding: 2,
  },
  unitBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  unitBtnOn: { backgroundColor: '#1e1e22' },
  unitText: { fontSize: 12, fontWeight: '600', color: '#5b5b62' },
  unitTextOn: { color: '#ffffff' },
  beat1Body: { flex: 1, justifyContent: 'center', paddingBottom: 40 },
  titleSm: { fontSize: 25, fontWeight: '600', color: '#ffffff', letterSpacing: -0.4, lineHeight: 31, textAlign: 'center', marginBottom: 12 },
  hint: { fontSize: 11.5, lineHeight: 17, color: '#5b5b62', textAlign: 'center', marginTop: 12 },

  bigNum: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 7, marginTop: 12, marginBottom: 6 },
  bigValue: {
    fontSize: 70,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -2.6,
    lineHeight: 74,
    // Tabular figures: proportional digits make a 1 narrower than a 0, so the
    // number changed width on almost every step of a drag and the centred row
    // shuffled with it.
    fontVariant: ['tabular-nums'],
    // Fixed box, centred text. Tabular figures stop the jitter between values
    // of the same length; this stops the jump when the length itself changes,
    // 99.5 to 100.0 or 78 to 5'8".
    minWidth: 196,
    textAlign: 'center',
  },
  bigUnit: { fontSize: 21, fontWeight: '600', color: '#52525b' },
  bigSub: { fontSize: 13, fontWeight: '600', textAlign: 'center', color: '#6b6b70' },
  subSlot: { height: 21, justifyContent: 'center', marginBottom: 8 },
  // Tall enough for the two line warning, which is the taller of the two
  // things that can live here.
  beat3Slot: { height: 72, justifyContent: 'center' },
  bigSubDim: { fontSize: 13, color: '#6b6b70', textAlign: 'center', marginBottom: 18 },

  figureGhostStatic: { opacity: 0.55 },

  snapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  snapBtnText: { fontSize: 12.5, fontWeight: '600' },
  snapBtnSub: { fontSize: 11.5, color: '#5b5b62' },
  leanWarn: { fontSize: 11.5, lineHeight: 17, color: '#6b6b70', textAlign: 'center' },

  verdict: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 13, marginTop: 18 },
  verdictText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  qmark: { width: 19, height: 19, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', opacity: 0.6 },
  qmarkText: { fontSize: 11, fontWeight: '700' },

  chartCard: {
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  chartHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: '#6b6b70' },
  chartYears: { fontSize: 12.5, fontWeight: '700' },

  routeCard: {
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  routeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeName: { fontSize: 14.5, fontWeight: '600', color: '#ffffff' },
  routeDesc: { fontSize: 12, color: '#71717a', marginTop: 3, lineHeight: 17 },
  routeFeel: {
    fontSize: 12,
    color: '#a1a1aa',
    marginTop: 8,
    lineHeight: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1f2427',
    paddingTop: 8,
  },

  beforeAfter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6, marginTop: 6 },
  baCol: { flex: 1, alignItems: 'center' },
  baTag: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, color: '#4b4b52', marginBottom: 4 },
  baNum: { fontSize: 20, fontWeight: '700', color: '#e4e4e7', marginTop: 8, letterSpacing: -0.4 },
  baNumGoal: { color: '#ffffff' },
  baBf: { fontSize: 11.5, color: '#5b5b62', marginTop: 1 },
  baArrow: { paddingBottom: 44 },

  tiles: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 12 },
  tile: { flex: 1, backgroundColor: '#111114', borderWidth: StyleSheet.hairlineWidth, borderColor: '#1c1c20', borderRadius: 13, paddingVertical: 11, paddingHorizontal: 10 },
  tileKey: { fontSize: 9, fontWeight: '700', letterSpacing: 1.1, color: '#4b4b52' },
  tileValue: { fontSize: 14.5, fontWeight: '700', color: '#e4e4e7', marginTop: 4 },
  tileValueSm: { fontSize: 13 },

  // No divider: it was drawing a box under a screen that has nothing else
  // boxed on it.
  ctaBar: { paddingHorizontal: 20, paddingTop: 8, backgroundColor: '#0a0a0b' },
  // No container either. The row stays 54pt tall so the tap target survives
  // losing the button around it.
  cta: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  ctaText: { fontSize: 15.5, fontWeight: '600' },
  secondary: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  secondaryText: { fontSize: 13, fontWeight: '500', color: '#71717a' },

  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: '#111114',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#2f2f35', alignSelf: 'center', marginBottom: 16 },
  sheetCta: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sheetGhost: { height: 50, borderRadius: 13, backgroundColor: '#1c1c20', alignItems: 'center', justifyContent: 'center' },
  sheetGhostText: { fontSize: 14, fontWeight: '600', color: '#d4d4d8' },
  sheetCtaText: { fontSize: 15, fontWeight: '600', color: '#0a0a0b' },
  sheetTitle: { fontSize: 19, fontWeight: '700', color: '#ffffff', marginBottom: 8, lineHeight: 25 },
  sheetBody: { fontSize: 14, lineHeight: 22, color: '#b4b4b8', marginBottom: 16 },
  sheetSources: {
    backgroundColor: '#0c0c0e',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1c1c20',
    borderRadius: 11,
    padding: 12,
    marginBottom: 18,
  },
  sheetSourcesText: { fontSize: 11, lineHeight: 17, color: '#6b6b70' },
});