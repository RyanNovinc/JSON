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
import ScaleRuler from '../components/route/ScaleRuler';
import LeanGauge from '../components/route/LeanGauge';
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
import { ATTRACTIVE_BF_RANGE, ATTRACTIVE_BF_CENTRE } from '../utils/attractivenessTargets';
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
  if (beat === 7) {
    return {
      title: 'Why it takes this long',
      body:
        'That number is the distance to the finish, and almost nobody sets a finish this far out. You do not wait until the end to see it.\n\nMuscle comes fastest at the start and slows from there, so the first year moves your appearance more than any year after it. Everything past that is the difference between looking like you train and looking like you have trained for years.',
    };
  }
  if (beat === 6) {
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

/**
 * The flow reads as three short conversations rather than one queue of eight.
 * Deliberately uneven: they group by what they are about, not by length, and a
 * two beat section is a feature because it is over almost as soon as it starts.
 */
const SECTIONS: Array<{ label: string; beats: Beat[]; quiet?: boolean }> = [
  { label: 'ABOUT YOU', beats: [1, 2, 3, 4] },
  { label: 'YOUR GOAL', beats: [5, 6] },
  { label: 'HOW YOU GET THERE', beats: [7] },
  // quiet: the summary names itself on the screen, so repeating it in the top
  // bar is the same word twice, thirty points apart.
  { label: 'SUMMARY', beats: [8], quiet: true },
];

const sectionFor = (beat: Beat) => SECTIONS.find((s) => s.beats.includes(beat)) ?? SECTIONS[0];

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

  // The beat label already names the field and the chevron already says
  // forward, so a CTA announcing the next question was a second navigation
  // system doing the same job. The last beat keeps real words because there
  // the button is the point.
  // Beat 3 has to be answered: removing the opt out means an unset value
  // would silently apply the male set, which is the exact thing the opt out
  // was doing.
  const ctaBlocked = beat === 3 && profile.sex == null;
  const beatHelp = helpFor(beat, profile.sex);
  const section = sectionFor(beat);

  // On the goal weight beat the only context that helps is the distance from
  // where they are now. Everything else waits for the leanness beat.
  const weightDeltaKg = goalW - currentWeight;
  const weightDelta =
    Math.abs(weightDeltaKg) < 0.05
      ? 'the same as you weigh now'
      : imperial
        ? `${weightDeltaKg > 0 ? '+' : ''}${(kgToLb(weightDeltaKg)).toFixed(0)} lbs from where you are now`
        : `${weightDeltaKg > 0 ? '+' : ''}${weightDeltaKg.toFixed(1)} kg from where you are now`;

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

  // Only shown when there is something to warn about. Printing "in range for a
  // drug-free lifter" under every ordinary choice is the app congratulating the
  // user on nothing, and it buries the two states that actually matter.
  const verdictWorthShowing = zone != null && (zone.tone === 'caution' || zone.tone === 'stop');

  const verdictLine = verdictWorthShowing && zone ? (
    <TouchableOpacity
      style={styles.verdict}
      onPress={() => setEvidence(evidenceTopicFor(zone.key))}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <Text style={[styles.verdictText, { color: toneColour(zone.tone, themeColor) }]}>
        {zone.label}
      </Text>
      {zone.showYears ? (
        <Text style={styles.verdictYears}>
          {'\u00b7'} {yrLo} to {yrHi} yr
        </Text>
      ) : null}
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
        {/* Only the current section's dots, and the section is named. Eight in
            a row reads as a form; two to four reads as a short errand. */}
        <View style={styles.progress}>
          {section.quiet ? null : (
            <Text style={[styles.progressLabel, { color: themeColor }]}>{section.label}</Text>
          )}
          {/* A lone dot conveys nothing, so single beat sections show only
              their name. */}
          <View style={styles.dots}>
            {section.beats.length < 2
              ? null
              : section.beats.map((b) => (
                <View
                  key={b}
                  style={[
                    styles.dot,
                    b < beat && styles.dotDone,
                    b === beat && [styles.dotOn, { backgroundColor: themeColor }],
                  ]}
                />
              ))}
          </View>
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

      {/* Locked on every beat that fits, because a vertical scroll wrapping
          horizontal drag instruments means a slightly off swipe scrolls the
          page instead of moving the value. Only the route picker and the
          summary have content that can overflow. */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={beat === 8}
      >
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
        {/* Weight first. "I want to be 90 kg" is a thought people have; "I
            want to be 12%" mostly is not. No curve and no verdict here: at this
            point the number does not yet mean a body. */}
        {beat === 5 ? (
          <>
            <View style={styles.beat1Body}>
              <Text style={styles.beatLabel}>GOAL WEIGHT</Text>
              <View style={styles.bigNum}>
                <Text style={styles.bigValue}>
                  {imperial ? Math.round(kgToLb(goalW)) : goalW.toFixed(1)}
                </Text>
                <Text style={styles.bigUnit}>{imperial ? 'lbs' : 'kg'}</Text>
              </View>
              <ScaleRuler
                value={imperial ? Math.round(kgToLb(goalW)) : Math.round(goalW * 10) / 10}
                min={imperial ? 77 : 35}
                max={imperial ? 440 : 200}
                step={imperial ? 1 : 0.5}
                tickStep={imperial ? 1 : 0.5}
                pxPerUnit={imperial ? 6 : 13}
                isMajor={(v) => Math.round(v) % (imperial ? 10 : 5) === 0 && Math.abs(v - Math.round(v)) < 0.01}
                formatLabel={(v) => String(Math.round(v))}
                onChange={(next, persist) => {
                  const kg = imperial ? lbToKg(next) : next;
                  setProfile((prev) => (prev ? { ...prev, goalWeightKg: kg } : prev));
                  if (persist) updateGoalsProfileField('goalWeightKg', kg);
                }}
                themeColor={themeColor}
              />

              {/* Under the scale, matching where the leanness beat puts its
                  read-out. Above the scale it separated the number from the
                  instrument that sets it. */}
              <Text style={styles.weightDelta}>{weightDelta}</Text>
            </View>
          </>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* Leanness second, and this is where the verdict lives now: at a fixed
            weight, leanness is what sets the muscle, so it is the choice that
            decides whether the goal is reachable. */}
        {beat === 6 ? (
          <>
            {/* Flush variant: this beat reserves an empty slot for the snap
                button, and the centring container's bottom padding on top of
                that pushed the visible content above the optical centre. */}
            <View style={[styles.beat1Body, styles.beat1BodyFlush]}>
              <Text style={styles.beatLabel}>GOAL BODY FAT</Text>
              <View style={styles.bigNum}>
                <Text style={styles.bigValue}>{Math.round(provisionalGoalBf)}</Text>
                <Text style={styles.bigUnit}>%</Text>
              </View>
              <LeanGauge
                profile={effProfile!}
                goalWeightKg={goalW}
                goalBodyFatPct={provisionalGoalBf}
                themeColor={themeColor}
                onChange={(pct, persist) => {
                  setProfile((prev) => (prev ? { ...prev, goalBodyFatPct: pct } : prev));
                  if (persist) updateGoalsProfileField('goalBodyFatPct', pct);
                }}
              />

              {/* No verdict text here. The gauge already shades and dashes the
                  region past the ceiling, so a sentence saying it again is the
                  same warning twice. The summary beat still prints it, which is
                  the last look before locking. */}

              {/* Fixed height so the button appearing and disappearing does not
                  move the gauge above it. */}
              <View style={styles.snapSlot}>
                {!inRated && profile.sex !== 'female' ? (
                  <TouchableOpacity
                    style={styles.snapBtn}
                    onPress={() => {
                      setProfile((prev) =>
                        prev ? { ...prev, goalBodyFatPct: ATTRACTIVE_BF_CENTRE } : prev,
                      );
                      updateGoalsProfileField('goalBodyFatPct', ATTRACTIVE_BF_CENTRE);
                    }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.snapBtnText, { color: themeColor }]}>
                      Take me to most aesthetic
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {beat === 7 && roadmap ? (
          <>
            <View style={styles.beat1Body}>
              <Text style={styles.beatLabel}>CHOOSE YOUR ROUTE</Text>

              {/* The picker is a control and the chart is its answer. As three
                  cards it was ragged, because only the selected one carried the
                  paragraph that explained the line. */}
              <View style={styles.routeSeg}>
                {ROUTE_OPTIONS.map((opt) => {
                  const active = preference === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.routeSegBtn, active && styles.routeSegBtnOn]}
                      onPress={() => choose(opt.id)}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.routeSegText, active && styles.routeSegTextOn]}>
                        {opt.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Named. Nothing on this screen used to say what was being
                  plotted, which is why the line read as decoration. */}
              <Text style={styles.chartTitle}>BODY FAT OVER TIME</Text>
              <JourneyChart profile={profile} roadmap={roadmap} color={themeColor} bare />
              <View style={styles.chartEnds}>
                <Text style={styles.chartEnd}>TODAY</Text>
                <Text style={styles.chartEnd}>{yrHi} YEARS</Text>
              </View>

              {/* The three numbers that actually differ between the routes. The
                  sentence said the same things in prose and took four lines to
                  do it. */}
              <View style={styles.stats}>
                <View style={styles.stat}>
                  <Text style={styles.statKey}>TIME</Text>
                  <Text style={[styles.statValue, { color: themeColor }]}>
                    {yrLo} to {yrHi} yr
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statKey}>BODY FAT</Text>
                  <Text style={styles.statValue}>
                    {roadmap.band.floor}&ndash;{roadmap.band.ceiling}%
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statKey}>TRIMS</Text>
                  <Text style={styles.statValue}>
                    {roadmap.phases.find((ph) => ph.kind === 'trim')?.repeats ?? 0}
                  </Text>
                </View>
              </View>
            </View>
          </>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {beat === 8 && roadmap ? (
          <>
            {/* Built in the reveal screens' language rather than the beats':
                left aligned, big type, numbers doing the talking. This is the
                arrival, not another question. */}
            <View style={styles.summaryBody}>
              <Text style={styles.summaryEyebrow}>YOUR PLAN</Text>
              <Text style={styles.summaryTitle}>This is where{'\n'}you end up.</Text>

              <View style={styles.summaryPair}>
                <Text style={styles.summaryFrom}>
                  {imperial ? Math.round(kgToLb(currentWeight)) : currentWeight.toFixed(1)}
                </Text>
                <Text style={styles.summaryArrow}>{'\u2192'}</Text>
                <Text style={[styles.summaryTo, { color: themeColor }]}>
                  {imperial ? Math.round(kgToLb(goalW)) : goalW.toFixed(1)}
                </Text>
                <Text style={styles.summaryUnit}>{imperial ? 'lbs' : 'kg'}</Text>
              </View>

              <View style={styles.summaryPairSm}>
                <Text style={styles.summaryFromSm}>{Math.round(currentBf ?? 20)}</Text>
                <Text style={styles.summaryArrowSm}>{'\u2192'}</Text>
                <Text style={[styles.summaryToSm, { color: themeColor }]}>
                  {Math.round(provisionalGoalBf)}
                </Text>
                <Text style={styles.summaryUnitSm}>% body fat</Text>
              </View>

              {/* The choices they made, in the order they made them. */}
              <Text style={styles.summaryMeta}>
                <Text style={styles.summaryMetaStrong}>{selected?.name}</Text>
                {'  \u00b7  '}
                <Text style={styles.summaryMetaStrong}>
                  {yrLo} to {yrHi} yr
                </Text>
                {'  \u00b7  '}
                <Text style={styles.summaryMetaStrong}>
                  {roadmap.gapKg != null
                    ? `${roadmap.gapKg > 0 ? '+' : ''}${roadmap.gapKg.toFixed(1)} kg`
                    : '\u2014'}
                </Text>
                {' of muscle'}
              </Text>

              <View style={styles.summaryChart}>
                <JourneyChart profile={profile} roadmap={roadmap} color={themeColor} bare strip />
              </View>

              {verdictLine}
            </View>
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

  progress: { flex: 1, alignItems: 'center', gap: 7 },
  progressLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.6 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  dotDone: { backgroundColor: '#3f3f46' },
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
  beat1BodyFlush: { paddingBottom: 0 },

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
  // Tall enough for the two line warning, which is the taller of the two
  // things that can live here.
  weightDelta: { fontSize: 13, color: '#6b6b70', textAlign: 'center', marginTop: 8 },



  verdict: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  snapSlot: { height: 62, justifyContent: 'center' },
  snapBtn: {
    alignSelf: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  snapBtnText: { fontSize: 13, fontWeight: '600' },
  verdictText: { fontSize: 13.5, fontWeight: '600' },
  verdictYears: { fontSize: 13.5, color: '#5b5b62' },
  qmark: { width: 19, height: 19, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', opacity: 0.6 },
  qmarkText: { fontSize: 11, fontWeight: '700' },

  routeSeg: {
    flexDirection: 'row',
    backgroundColor: '#111114',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f1f23',
    borderRadius: 12,
    padding: 3,
    marginBottom: 18,
  },
  routeSegBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  routeSegBtnOn: { backgroundColor: '#1e1e22' },
  routeSegText: { fontSize: 12.5, fontWeight: '600', color: '#6b6b70' },
  routeSegTextOn: { color: '#ffffff' },

  chartTitle: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.6, color: '#4b4b52', marginTop: 26, marginBottom: 8 },
  chartEnds: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  chartEnd: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.1, color: '#3f3f46' },
  stats: { flexDirection: 'row', gap: 8, marginTop: 24 },
  stat: {
    flex: 1,
    backgroundColor: '#0f0f11',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1c1c20',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statKey: { fontSize: 8.5, fontWeight: '700', letterSpacing: 1.1, color: '#4b4b52' },
  statValue: { fontSize: 14.5, fontWeight: '700', color: '#e4e4e7', marginTop: 5 },

  // No divider above the bar: it was drawing a box under a screen that has
  // nothing else boxed on it.
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

  summaryBody: { flex: 1, justifyContent: 'center', paddingBottom: 20 },
  summaryEyebrow: { fontSize: 9.5, fontWeight: '700', letterSpacing: 2, color: '#5b5b62' },
  summaryTitle: { fontSize: 38, fontWeight: '700', color: '#ffffff', letterSpacing: -1.2, lineHeight: 43, marginTop: 10 },
  summaryPair: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 26 },
  summaryFrom: { fontSize: 44, fontWeight: '800', color: '#ffffff', letterSpacing: -2 },
  summaryArrow: { fontSize: 20, color: '#3f3f46' },
  summaryTo: { fontSize: 44, fontWeight: '800', letterSpacing: -2 },
  summaryUnit: { fontSize: 15, fontWeight: '600', color: '#5b5b62' },
  summaryPairSm: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 8 },
  summaryFromSm: { fontSize: 22, fontWeight: '700', color: '#8e8e93' },
  summaryArrowSm: { fontSize: 14, color: '#3f3f46' },
  summaryToSm: { fontSize: 22, fontWeight: '700' },
  summaryUnitSm: { fontSize: 12.5, fontWeight: '600', color: '#5b5b62' },
  summaryMeta: { fontSize: 12.5, color: '#5b5b62', marginTop: 22 },
  summaryMetaStrong: { color: '#c4c4c8', fontWeight: '600' },
  summaryChart: { marginTop: 26, marginHorizontal: -6 },


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