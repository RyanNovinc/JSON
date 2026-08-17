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
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useWeightUnit } from '../contexts/WeightUnitContext';
import { loadGoalsProfile, updateGoalsProfileField } from '../utils/goalsProfileStorage';
import { recordBodyFatReading } from '../utils/bodyFatHistory';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyBodyFatValue, type BodyFatFieldValue } from '../components/BodyFatField';
import RouteBodyFatField from '../components/route/RouteBodyFatField';
import ScaleRuler from '../components/route/ScaleRuler';
import LeanGauge from '../components/route/LeanGauge';
import JourneyChart from '../components/route/JourneyChart';
import PhaseLine from '../components/route/PhaseLine';
import { expandPhases } from '../utils/phaseJourney';
import { phaseIntentFor, phaseEndWeightKg } from '../utils/phaseIntent';
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
import type {
  GoalsProfile,
  PeakLeanness,
  RoutePreference,
  Sex,
  TrainingState,
} from '../utils/goalsProfile';

type Nav = StackNavigationProp<RootStackParamList>;
type Beat = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * The three routes.
 *
 * WHAT A ROUTE MAY CLAIM (13 Aug 2026, after external review).
 *
 * These cards used to promise a SPEED trade: staying lean "takes longer",
 * growing faster is "fastest to your goal". There is no evidence in
 * resistance-trained people that the body fat band you cycle within changes
 * the rate of muscle gain in either direction.
 *
 * The partitioning literature usually cited for it (Forbes 1987, extended by
 * Hall 2007) finds leaner people partition a surplus BETTER — the opposite of
 * the old copy — but its subjects were not lifting, and some were recovering
 * from anorexia or total starvation. Even the analysts who popularised it warn
 * against extrapolating to trained lifters.
 *
 * So a route is an ADHERENCE AND AESTHETICS choice: how lean you stay, and how
 * often you interrupt growing to cut. It is not a speed setting. Copy here that
 * implies one route reaches the goal sooner needs a trial that does not exist.
 */
export const ROUTE_OPTIONS: Array<{
  id: RoutePreference;
  name: string;
  trade: string;
  feel: (floor: number, ceiling: number, cycles: number) => string;
}> = [
  {
    id: 'lean',
    name: 'Stay lean',
    trade: 'Never far from your best, at the cost of dieting more often.',
    // Time differences between routes come from trim months, never from a
    // difference in how fast muscle is built. See the note above.
    feel: (f, c, k) =>
      `Short blocks of growing between ${f} and ${c}% body fat, trimming back ${k} times so you always look sharp.`,
  },
  {
    id: 'balanced',
    name: 'Balanced',
    trade: 'Long enough stretches to grow, short enough to stay presentable.',
    feel: (f, c, k) =>
      `You live between ${f} and ${c}% body fat, growing in longer stretches with ${k} trims to keep it from getting away from you.`,
  },
  {
    id: 'roomy',
    name: 'Grow faster',
    trade: 'Fewest interruptions, and a softer look through the middle.',
    feel: (f, c, k) =>
      `Long uninterrupted stretches of growing between ${f} and ${c}% body fat, with only ${k} trims.`,
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
  /** Named blocks with short points. Used where the sheet is comparing things
   *  rather than explaining one: prose makes the reader hold three options in
   *  their head at once. */
  groups?: Array<{ title: string; points: string[] }>;
  /** Rendered small and boxed. Set as prose it reads as another paragraph the
   *  user is meant to absorb, which is most of why these sheets felt long. */
  sources?: string;
}

function helpFor(beat: number, sex?: Sex): BeatHelp | null {
  if (beat === 2) {
    return {
      title: 'Why we ask',
      body:
        'Body fat ranges and muscle limits differ between male and female bodies, so your answer changes the numbers this app works from. It is used for those calculations and nothing else.',
    };
  }
  if (beat === 9) {
    return {
      title: 'The three routes',
      body:
        'Every route builds muscle at the same rate. No study in trained lifters shows that the body fat you cycle within changes how fast you gain. What differs is how often you stop growing to trim back, and trimming is time not spent growing — so a route with more trims can take a little longer overall. That is time spent cutting, not slower muscle gain. All three finish in the same place.',
      groups: [
        {
          title: 'Stay lean',
          points: [
            'Narrowest band, trimmed most often',
            'You look your best the whole way',
            'Most interruptions to growing',
          ],
        },
        {
          title: 'Balanced',
          points: [
            'Middle band, trimmed a few times',
            'Never far from lean, never stuck trimming',
            'A few interruptions',
          ],
        },
        {
          title: 'Grow faster',
          points: [
            'Widest band, fewest interruptions',
            'Softest through the middle',
            'Longest uninterrupted growing',
          ],
        },
      ],
      sources:
        // The band width itself is a preference, not a finding. These sources
        // cover surplus size and lean-mass retention, NOT the effect of the
        // body fat band on gain rate — nothing establishes that.
        'Slater et al. 2019, Frontiers in Nutrition \u00b7 Murphy and Koehler 2022, Scandinavian Journal of Medicine and Science in Sports \u00b7 Helms et al. 2023, Sports Medicine Open',
    };
  }
  if (beat === 8) {
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
/**
 * Counts from zero to the target when `run` flips true. Rendering an Animated
 * value as text is not possible directly, so this drives React state off a
 * frame loop instead.
 */
function useCountUp(target: number, run: boolean, ms = 750): number {
  const [value, setValue] = React.useState(0);
  React.useEffect(() => {
    if (!run) {
      setValue(0);
      return;
    }
    let frame = 0;
    const start = Date.now();
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / ms);
      // Ease out cubic: fast at first, settling rather than stopping dead.
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, run, ms]);
  return Math.round(value);
}

/** Wide enough that the falloff never shows an edge on any phone. */
const GLOW = 760;

// The "Not sure?" link on the body fat beat, split into its two parts so the
// compensating top padding below can be derived rather than guessed. Change
// either and the instrument stays exactly where it is on every other beat.
const NOT_SURE_GAP = 22;

/**
 * The blank profile a fresh install starts from. Only the fields the beats are
 * about to ask for, at the values the instruments already show as defaults, so
 * the first screen renders with a sensible needle position rather than empty.
 *
 * trainingState is required by the type and has to be SOMETHING. 'new' is what
 * goalsProfileStorage's create path already defaults to, so this changes
 * nothing that was not already happening — but it is worth being loud about,
 * because that default drives derivePhase's newbie-recomp rule, the experience
 * tier and the surplus size, and no Route beat asks the question. An
 * experienced lifter onboarded through Route is currently planned for as a
 * beginner.
 */
const SEED_WEIGHT_KG = 77;

function seedProfile(): GoalsProfile {
  return { currentWeightKg: SEED_WEIGHT_KG, trainingState: 'new' };
}
const NOT_SURE_LINE = 20;
const NOT_SURE_BLOCK = NOT_SURE_GAP + NOT_SURE_LINE;

// ── First run ──────────────────────────────────────────────────────────────
//
// The same two keys IntentForkModal wrote. This screen now IS the onboarding,
// so it owns the gate: beat 1 shows the intent line and the food door only
// while the gate is unset, and the food door closes the gate on its way out.
// Without writing both keys, a user who takes the food door is treated as a
// fresh first run on every launch.
const KEY_ONBOARDING_COMPLETED = '@onboarding/completedAt';const KEY_ONBOARDING_INTENT = '@onboarding/intent';


const PHASE_LABEL: Record<string, string> = {
  trim: 'Trim',
  build: 'Build',
  recomp: 'Recomp',
  reveal: 'The reveal',
};

const SECTIONS: Array<{ label: string; beats: Beat[]; quiet?: boolean }> = [
  { label: 'ABOUT YOU', beats: [1, 2, 3, 4, 5, 6] },
  { label: 'YOUR GOAL', beats: [7, 8] },
  { label: 'HOW YOU GET THERE', beats: [9] },
  // quiet: the summary names itself on the screen, so repeating it in the top
  // bar is the same word twice, thirty points apart.
  { label: 'SUMMARY', beats: [10], quiet: true },
];

const sectionFor = (beat: Beat) => SECTIONS.find((s) => s.beats.includes(beat)) ?? SECTIONS[0];

export default function RouteScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'Route'>>();
  const { themeColor } = useTheme();
  const { globalUnit, setGlobalUnit } = useWeightUnit();
  const insets = useSafeAreaInsets();

  const flowStepOffset = route.params?.flowStepOffset ?? 4;

  /**
   * Single beat mode. The summary screen sends the user here to change one
   * value, so the CTA saves and returns rather than walking the seven beats
   * they have already answered.
   */
  const single = route.params?.single === true;
  const startBeat = (route.params?.startBeat ?? 1) as Beat;

  const [profile, setProfile] = useState<GoalsProfile | null>(null);
  const [preference, setPreference] = useState<RoutePreference>('balanced');
  const [loading, setLoading] = useState(true);
  /** Unset onboarding gate. Drives the beat 1 intent line and the food door. */
  const [firstRun, setFirstRun] = useState(false);
  /**
   * Whether trainingState is an ANSWER rather than the seed's placeholder.
   * The field is non-optional on GoalsProfile and seedProfile has to put
   * something in it, so 'new' is indistinguishable from a real choice. A user
   * arriving with a stored profile has answered it before, one way or another.
   */
  const [trainingStateAnswered, setTrainingStateAnswered] = useState(false);
  const [beat, setBeat] = useState<Beat>(startBeat);
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
      // Read once per focus rather than on mount: the gate can be closed by
      // the food door and we never want a stale true to bring the bar back.
      AsyncStorage.getItem(KEY_ONBOARDING_COMPLETED)
        .then((v) => {
          if (!cancelled) setFirstRun(v == null);
        })
        .catch(() => {
          // A missing gate costs a bar, never a value. Default to hiding it,
          // because showing a food door to a returning user is the worse miss.
          if (!cancelled) setFirstRun(false);
        });
      loadGoalsProfile().then((p) => {
        if (cancelled) return;
        // A brand new install has no profile, and this screen IS the intake
        // now. The old behaviour — render "add your weight in Goals and stats"
        // — dates from when Route only ran for users who already had one, and
        // it dead-ends the entire onboarding: the beat handlers all no-op on a
        // null profile, so there is no way to enter the first answer.
        //
        // Seeded in STATE only, never written. Nothing here is the user's
        // answer yet; each beat persists its own value as it is given, and
        // beat 1 commits the weight on Continue whether or not the ruler was
        // touched, the same way beat 6 commits untouched goal defaults.
        setProfile(p ?? seedProfile());
        setTrainingStateAnswered(p != null);
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
      // Also leave a dated reading. Writing only the profile scalar means this
      // screen contributes nothing to the body fat trend, and the trend is what
      // phase transitions are detected from: someone who re-estimates here
      // three times would still never trigger one.
      void recordBodyFatReading(next.bodyFatPct, next.source, 'route');
    }
  };

  const choose = async (next: RoutePreference) => {
    setPreference(next);
    await updateGoalsProfileField('routePreference', next);
  };

  /**
   * Beat 5 (the training peak) exists only for a returning lifter, so it is
   * stepped over in BOTH directions. Skipping forward only would trap anyone
   * who reached beat 6 and pressed back.
   */
  const skipsPeakBeat = profile?.trainingState !== 'returning';

  const back = () => {
    // In single beat mode there is no previous beat to return to: the user
    // arrived directly at this one.
    if (single || beat <= 1) {
      navigation.goBack();
      return;
    }
    const prev = beat === 7 && skipsPeakBeat ? 5 : beat - 1;
    goToBeat(prev as Beat, -1);
  };

  const advance = async () => {
    // Beat 1 commits its weight whether or not the ruler was dragged. On a
    // fresh install the profile is a seed held in state, so without this a
    // user who accepts the shown default has nothing persisted at all and the
    // create path invents its own base value later.
    if (beat === 1 && profile != null) {
      await patch('currentWeightKg', profile.currentWeightKg);
    }
    // Beat 9 commits the route whether or not it was tapped. The picker opens
    // with one already selected, so accepting it is a silent choice — and
    // routeCompletion reads routePreference as the signature that the user
    // reached this beat at all. Without this, everyone who takes the default
    // finishes the flow and is still reported as not having finished it.
    if (beat === 9 && profile != null && profile.routePreference == null) {
      await patch('routePreference', preference);
    }
    if (beat === 8) {
      // The commitment point: provisional values become the saved goal, so
      // beats 7 and 8 and every downstream consumer read what the user just
      // looked at.
      if (profile?.goalWeightKg == null && provisionalGoalW != null) {
        await patch('goalWeightKg', provisionalGoalW);
      }
      if (profile?.goalBodyFatPct == null) {
        await patch('goalBodyFatPct', provisionalGoalBf);
      }
    }
    if (single) {
      // Everything is already written by the time the CTA is tappable: each
      // beat persists its own answer as it changes. So Done is literally just
      // going back.
      navigation.goBack();
      return;
    }
    if (beat < 10) {
      const next = beat === 5 && skipsPeakBeat ? 7 : beat + 1;
      goToBeat(next as Beat, 1);
    } else setConfirming(true);
  };

  const lockIn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (profile && roadmap) await recordRoadmapSnapshot(profile, preference, roadmap);
      // Close the onboarding gate on COMPLETION, not just on the way out.
      // IntentForkModal used to write these when the user picked from the
      // fork. With the fork bypassed, nothing else does, so without this a
      // user who answers every question and locks in is still an unfinished
      // first run and gets dropped back here on the next launch.
      if (firstRun) {
        try {
          await AsyncStorage.multiSet([
            [KEY_ONBOARDING_COMPLETED, new Date().toISOString()],
            [KEY_ONBOARDING_INTENT, 'plan'],
          ]);
        } catch {
          // Never block the lock-in on a storage write.
        }
      }
      setConfirming(false);
      navigation.navigate('RouteReveal', { flowStepOffset });
    } finally {
      setBusy(false);
    }
  };

  // Above the early returns: hooks have to run on every render, and both of
  // these are hooks.
  const onPhaseCard = beat === 10;
  const phaseFrom = useCountUp(Math.round(profile?.currentBodyFatPct ?? 20), onPhaseCard);
  const phaseTo = useCountUp(Math.round(roadmap?.phases[0].exitBodyFatPct ?? 0), onPhaseCard);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={themeColor} />
      </View>
    );
  }

  // No empty state. A null profile used to render "add your current weight in
  // Goals and stats", which is now unreachable: the loader seeds one. Keeping
  // a branch that cannot run would just invite someone to restore the dead end.
  if (!profile) return null;

  const currentWeight = profile.currentWeightKg ?? 77;
  /** Defaults to their current weight: a returning lifter's peak is usually
   *  near it, and starting the ruler somewhere arbitrary costs them a drag. */
  const peakWeight = profile.peakWeightKg ?? currentWeight;
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
  const ctaBlocked =
    (beat === 2 && profile.sex == null) ||
    // Same rule as the sex beat: an unanswered single-choice question must not
    // be walkable past, or the create-path default becomes the answer.
    (beat === 5 && !trainingStateAnswered) ||
    // The skip link below advances on its own, so this only gates the case
    // where the user is still deciding.
    (beat === 6 && profile.peakLeanness == null);
  const beatHelp = helpFor(beat, profile.sex);
  const section = sectionFor(beat);

  /**
   * The very first screen a brand new user sees. Stripped to the instrument:
   * no section label, no progress dots, no back arrow, because there is
   * nothing behind it and nothing yet worth measuring progress against.
   * Everything returns from beat 2 on, and a returning user never sees it.
   */
  const coldOpen = firstRun && beat === 1 && !single;

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
    7: 'Continue',
    8: 'Continue',
    9: 'See the whole plan',
    10: 'Lock in my plan',
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
        {/* On a first run beat 1 IS the first screen in the app, so there is
            nothing behind it and goBack would land nowhere. The spacer keeps
            the dots centred. Returning users are unaffected. */}
        {coldOpen ? (
          <View style={styles.iconSpacer} />
        ) : (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={back}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color="#d4d4d8" />
          </TouchableOpacity>
        )}
        {/* Only the current section's dots, and the section is named. Eight in
            a row reads as a form; two to four reads as a short errand. */}
        <View style={styles.progress}>
          {single || section.quiet || coldOpen ? null : (
            <Text style={[styles.progressLabel, { color: themeColor }]}>{section.label}</Text>
          )}
          {/* A lone dot conveys nothing, so single beat sections show only
              their name. */}
          <View style={styles.dots}>
            {single || section.beats.length < 2 || coldOpen
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
        ) : (
          <View style={styles.iconSpacer} />
        )}
      </View>

      {/* Only on the phase card, which is the one screen in the flow meant to
          feel like an arrival rather than a question. */}
      {beat === 10 ? (
        <View style={[styles.glow, { width: GLOW, height: GLOW, left: -(GLOW - 390) / 2, top: -GLOW * 0.18 }]} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id="beatGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={themeColor} stopOpacity={0.15} />
                <Stop offset="1" stopColor={themeColor} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#beatGlow)" />
          </Svg>
        </View>
      ) : null}

      {/* Locked on every beat that fits, because a vertical scroll wrapping
          horizontal drag instruments means a slightly off swipe scrolls the
          page instead of moving the value. Only the route picker and the
          summary have content that can overflow. */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={beat === 10}
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
        {beat === 4 ? (
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
        {beat === 2 ? (
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
        {/* Asked here because NOTHING else collects it. trainingState left the
            workout questionnaire as Q2 — deriveExperienceTier is the shim that
            replaced it — and the questionnaires now read it off the profile.
            With GoalsIntake skipped on a first run, every Route-onboarded user
            was silently defaulting to 'new', which drives derivePhase's
            newbie-recomp rule, the experience tier both prompt builders key
            off, and the surplus tier in phaseCaloricTarget. */}
        {beat === 5 ? (
          <View style={styles.beat1Body}>
            <Text style={styles.beatLabel}>WHERE YOU ARE WITH TRAINING</Text>

            {/* Described, not levelled. "Intermediate" means something
                different to everyone and people rate themselves badly against
                it; "under a year of consistent training" is answerable without
                judgement. Advanced is described by what it costs rather than as
                a status, because overclaiming buys a slower plan. */}
            <View style={styles.stateList}>
              {([
                ['new', 'New to lifting', 'Under a year of consistent training'],
                ['consistent', 'Training consistently', 'Still adding reps or weight most weeks'],
                ['returning', 'Coming back', 'Trained seriously before, had time off'],
                ['advanced', 'Advanced', 'Progress has slowed to months, not weeks'],
              ] as Array<[TrainingState, string, string]>).map(([value, label, hint]) => {
                const active = profile.trainingState === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.stateCard,
                      active && { borderColor: themeColor, backgroundColor: '#101a1d' },
                    ]}
                    onPress={() => {
                      setTrainingStateAnswered(true);
                      patch('trainingState', value);
                    }}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.stateName, active && { color: themeColor }]}>{label}</Text>
                    <Text style={styles.stateHint}>{hint}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* Conditional: only a returning lifter has a peak to describe. These
            two fields feed splitGap and the regain credit, and on a traced
            profile crediting regain moved the estimate from 2.5-5.3 years to
            1.7-3.4 — the difference between a plan someone starts and one they
            don't. Leanness is three coarse choices because nobody remembers
            their body fat from four years ago. */}
        {beat === 6 ? (
          <View style={styles.beat1Body}>
            <Text style={styles.beatLabel}>WHAT YOU PEAKED AT</Text>
            <View style={styles.bigNum}>
              <Text style={styles.bigValue}>
                {Math.round(imperial ? kgToLb(peakWeight) : peakWeight)}
              </Text>
              <Text style={styles.bigUnit}>{imperial ? 'lbs' : 'kg'}</Text>
            </View>
            <ScaleRuler
              value={imperial ? Math.round(kgToLb(peakWeight)) : Math.round(peakWeight * 10) / 10}
              min={imperial ? 77 : 35}
              max={imperial ? 440 : 200}
              step={imperial ? 1 : 0.5}
              pxPerUnit={imperial ? 6 : 13}
              // The fractional-value guard is not optional at step 0.5:
              // Math.round(69.5) is 70, so without it every multiple of five is
              // major twice and formatLabel prints the same number half a unit
              // apart. Same condition the current-weight beat uses.
              isMajor={(v) =>
                Math.round(v) % (imperial ? 10 : 5) === 0 && Math.abs(v - Math.round(v)) < 0.01
              }
              formatLabel={(v) => String(Math.round(v))}
              onChange={(next) => patch('peakWeightKg', imperial ? lbToKg(next) : next)}
              themeColor={themeColor}
            />

            <Text style={[styles.beatLabel, styles.peakLeanLabel]}>AND HOW YOU LOOKED THERE</Text>
            <View style={styles.leanRow}>
              {([
                ['lean', 'Lean', 'Abs visible'],
                ['average', 'Average', 'Solid, soft'],
                ['soft', 'Soft', 'Carrying it'],
              ] as Array<[PeakLeanness, string, string]>).map(([value, label, hint]) => {
                const active = profile.peakLeanness === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.leanPick,
                      active && { borderColor: themeColor, backgroundColor: '#101a1d' },
                    ]}
                    onPress={() => patch('peakLeanness', value)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.leanName, active && { color: themeColor }]}>{label}</Text>
                    <Text style={styles.leanHint}>{hint}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* A LINK, not a fourth option in the row above. That row answers
                "how did you look"; this answers "do you know". Inline it and
                not knowing reads as a way of having looked.

                Clears BOTH peak fields. A dragged weight with no leanness is
                the half-answer that produces a wrong regain credit, which is
                the external review's specific warning about reconstructing
                prior lean mass from a remembered number. */}
            <TouchableOpacity
              style={styles.notSure}
              onPress={async () => {
                // Clears BOTH fields and moves on. A dragged weight with no
                // leanness is the half-answer that produces a wrong regain
                // credit, and unset fields are already exactly how splitGap
                // reads "no previous peak" — so the estimate degrades to the
                // conservative case rather than resting on a remembered guess.
                //
                // AWAITED IN SEQUENCE, and that is not stylistic.
                // updateGoalsProfileField is read-modify-write: it loads the
                // whole profile, sets one field and saves it back. Firing both
                // without awaiting lets the second load happen before the first
                // save lands, so the second write restores the peak weight the
                // first just cleared. splitGap only bails on a MISSING WEIGHT,
                // so the survivor would produce a regain credit from a number
                // the user just told us they do not remember.
                await patch('peakWeightKg', undefined);
                await patch('peakLeanness', undefined);
                advance();
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
              accessibilityRole="button"
              accessibilityLabel="Do not remember, skip this question"
            >
              <Text style={styles.notSureText}>
                {'Don\u2019t remember? '}
                <Text style={[styles.notSureLink, { color: themeColor }]}>Skip this</Text>
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {beat === 3 ? (
          <>
            {/* Centred the same way the weight and height beats are, so all
                three read as one instrument panel rather than three layouts. */}
            <View style={[styles.beat1Body, styles.beat1BodyNotSure]}>
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
              {/* Under the instrument rather than in the top bar. A body icon
                  in the corner sits where apps put settings and info, so it
                  got scanned past on the one beat where a user genuinely may
                  not know the answer. This lands the offer where the doubt
                  happens, next to the zone label already doing explanatory
                  work. Naming the user's state first is what makes someone
                  realise it is for them; "Estimate" alone names a feature. */}
              <TouchableOpacity
                style={styles.notSure}
                onPress={() => setEstimatorOpen(true)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
                accessibilityRole="button"
                accessibilityLabel="Not sure? Estimate it"
              >
                <Text style={styles.notSureText}>
                  {'Not sure? '}
                  <Text style={[styles.notSureLink, { color: themeColor, borderBottomColor: themeColor }]}>
                    Estimate it
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* Weight first. "I want to be 90 kg" is a thought people have; "I
            want to be 12%" mostly is not. No curve and no verdict here: at this
            point the number does not yet mean a body. */}
        {beat === 7 ? (
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
        {beat === 8 ? (
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
        {beat === 9 && roadmap ? (
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
        {beat === 10 && roadmap ? (
          <>
            {/* The first phase card, moved here from the reveal sequence. This
                is the last thing seen before locking, so it shows what the
                plan actually starts with rather than restating the goals the
                previous beats already set. */}
            <View style={styles.summaryBody}>
              {/* Always 1: this is the lock screen, so by definition nothing
                  has been completed yet. The total counts occurrences rather
                  than definitions, so it matches what the line draws. */}
              <Text style={styles.summaryEyebrow}>
                PHASE 1 OF {expandPhases(roadmap).length}
              </Text>
              <Text style={styles.summaryTitle}>
                {PHASE_LABEL[roadmap.phases[0].kind] ?? roadmap.phases[0].kind}
              </Text>

              <View style={styles.summaryPair}>
                <Text style={styles.summaryFrom}>{phaseFrom}</Text>
                <Text style={styles.summaryArrow}>{'\u2192'}</Text>
                <Text style={[styles.summaryTo, { color: themeColor }]}>{phaseTo}</Text>
                <Text style={styles.summaryUnit}>% body fat</Text>
              </View>

              {/* The exit percentage is a band edge, not something the user
                  typed, and until now nothing said so — which produced the
                  reasonable "where did 14% come from" reaction. Named by the
                  ROUTE LABEL they picked rather than by "band", so it points at
                  a decision they remember making. The reveal exits at their own
                  goal, so it needs no attribution. */}
              {(() => {
                const first = roadmap.phases[0];
                if (first.kind === 'reveal' || first.kind === 'recomp') return null;
                const routeName =
                  ROUTE_OPTIONS.find((o) => o.id === (roadmap.route ?? 'balanced'))?.name ?? '';
                if (!routeName) return null;
                const atFloor = Math.abs(first.exitBodyFatPct - roadmap.band.floor) < 0.5;
                return (
                  <Text style={styles.bandSource}>
                    {`${Math.round(first.exitBodyFatPct)}% is the ${
                      atFloor ? 'lean end' : 'top'
                    } of your ${routeName} route`}
                  </Text>
                );
              })()}

              <View style={styles.durRow}>
                <Text style={styles.durValue}>
                  {roadmap.phases[0].estMonths[0]} to {roadmap.phases[0].estMonths[1]} months
                </Text>
                <Text style={styles.durTag}>ESTIMATE</Text>
              </View>

              {/* What the first phase will actually ask of them. Someone
                  agreeing to a plan should know what it requires, not only
                  where it ends — and a build asking the scale to go UP is the
                  single most surprising thing in this whole flow. */}
              {(() => {
                const first = roadmap.phases[0];
                const intent = phaseIntentFor(first.kind);
                const endKg = phaseEndWeightKg(
                  first.kind,
                  profile.currentWeightKg ?? 0,
                  currentBf,
                  first.exitBodyFatPct,
                );

                /**
                 * "Lose fat, keep the muscle" is right for almost every cut and
                 * is a promise the app cannot keep for this one. When reaching
                 * the goal body fat on current lean mass would still leave the
                 * user above their goal WEIGHT, the difference comes off the
                 * lean side — 11 kg of it on the traced profile — and the
                 * standard copy tells them the opposite.
                 *
                 * Same condition deriveRoadmap already uses to time the phase
                 * on total weight rather than fat alone, so the words and the
                 * clock agree.
                 */
                const leanHeldEndKg =
                  roadmap.leanNowKg != null && profile.goalBodyFatPct != null
                    ? roadmap.leanNowKg / (1 - profile.goalBodyFatPct / 100)
                    : null;
                const shedsLean =
                  first.kind === 'reveal' &&
                  leanHeldEndKg != null &&
                  profile.goalWeightKg != null &&
                  leanHeldEndKg > profile.goalWeightKg;
                const leanOffKg =
                  shedsLean && leanHeldEndKg != null && profile.goalWeightKg != null
                    ? Math.round(leanHeldEndKg - profile.goalWeightKg)
                    : 0;

                const title = shedsLean ? 'A big cut, and some muscle goes too' : intent.title;
                const detail = shedsLean
                  ? `Reaching ${Math.round(profile.goalWeightKg ?? 0)} kg at ${Math.round(
                      first.exitBodyFatPct,
                    )}% means about ${leanOffKg} kg of lean mass comes off alongside the fat. Lifting hard and eating enough protein keeps that as small as it can be.`
                  : intent.detail;

                return (
                  <View style={[styles.intent, { borderLeftColor: themeColor }]}>
                    <Text style={styles.intentKey}>THIS PHASE</Text>
                    <Text style={styles.intentTitle}>{title}</Text>
                    <Text style={styles.intentDetail}>{detail}</Text>
                    {endKg != null ? (
                      <Text style={styles.intentScale}>
                        {'Ends around '}
                        <Text style={styles.intentScaleStrong}>
                          {imperial ? `${Math.round(kgToLb(endKg))} lbs` : `${endKg.toFixed(1)} kg`}
                        </Text>
                        {`, at ${Math.round(first.exitBodyFatPct)}%`}
                      </Text>
                    ) : null}
                  </View>
                );
              })()}

              {/* The one case where the app knows the goal may not be
                  reachable and, until now, said nothing. `plausibility` has
                  been computed on every Roadmap since it was written and read
                  by nothing, so a user past the drug-free ceiling got the same
                  straight-faced multi-year estimate as anyone else.
                  
                  'borderline' deliberately gets nothing: a warning on every
                  ambitious goal is the app congratulating itself on caution,
                  and it buries the case that matters. The estimate stays
                  visible — the user asked for a plan, not a refusal. */}
              {roadmap.plausibility === 'beyond' ? (
                <View style={styles.limitRow}>
                  <View style={styles.limitDot} />
                  <Text style={styles.limitText}>
                    <Text style={styles.limitLead}>Past the drug-free range. </Text>
                    {
                      'The plan still works, but the last stretch may not. A few kilos off your goal weight brings it back in range.'
                    }
                  </Text>
                </View>
              ) : null}

              <View style={styles.summaryChart}>
                <PhaseLine profile={profile} roadmap={roadmap} legIndex={0} color={themeColor} animate />
              </View>
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
            {ctaBlocked ? 'Pick one to continue' : single ? 'Done' : CTA[beat]}
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
          {beatHelp?.groups?.map((g) => (
            <View key={g.title} style={styles.helpGroup}>
              <Text style={[styles.helpGroupTitle, { color: themeColor }]}>{g.title}</Text>
              {g.points.map((pt) => (
                <View key={pt} style={styles.helpPointRow}>
                  <View style={styles.helpDot} />
                  <Text style={styles.helpPoint}>{pt}</Text>
                </View>
              ))}
            </View>
          ))}
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
  // The body fat beat carries the "Not sure?" link below the instrument. In a
  // centred container anything added at the bottom drags the optical centre up
  // by half its height, so the instrument would no longer line up with the
  // weight, height and age beats. Matching the link's exact height as top
  // padding puts it back. Same trick as beat1BodyFlush, opposite direction.
  beat1BodyNotSure: { paddingTop: NOT_SURE_BLOCK },

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

  notSure: { marginTop: NOT_SURE_GAP, alignItems: 'center', height: NOT_SURE_LINE },

  // Amber, matching the caution zone and the stale-number marking elsewhere.
  // Not red: an unreachable goal is a thing to know, not an error the user made.
  bandSource: { fontSize: 13, color: '#5b5b62', marginTop: 9 },

  limitRow: { flexDirection: 'row', gap: 9, marginTop: 24, alignItems: 'flex-start' },  limitDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#f0b429',
    marginTop: 7,
  },
  limitText: { flex: 1, fontSize: 14, lineHeight: 21, color: '#8e8e93' },
  limitLead: { color: '#f0b429', fontWeight: '600' },

  stateList: { gap: 11 },
  stateCard: {
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#131316',
    borderRadius: 16,
    paddingVertical: 17,
    paddingHorizontal: 18,
  },
  stateName: { fontSize: 17, fontWeight: '600', color: '#ffffff' },
  stateHint: { fontSize: 13.5, lineHeight: 19, color: '#71717a', marginTop: 4 },

  peakLeanLabel: { marginTop: 40 },
  leanRow: { flexDirection: 'row', gap: 8 },
  leanPick: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#131316',
    borderRadius: 13,
    paddingVertical: 13,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  leanName: { fontSize: 14.5, fontWeight: '600', color: '#8e8e93' },
  leanHint: { fontSize: 11.5, color: '#5b5b62', marginTop: 3 },

  notSureText: { fontSize: 14.5, lineHeight: NOT_SURE_LINE, fontWeight: '500', color: '#71717a' },
  // Underlined because "Not sure?" on its own reads as a statement about the
  // number rather than an offer. On a screen with no other underlined text,
  // the rule is what says this can be tapped.
  notSureLink: { fontWeight: '600', textDecorationLine: 'underline' },

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
  summaryChart: { marginTop: 26, marginHorizontal: -6 },
  intent: { borderLeftWidth: 2, paddingLeft: 13, marginTop: 22 },
  intentKey: { fontSize: 8, fontWeight: '700', letterSpacing: 1.3, color: '#4b4b52' },
  intentTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff', marginTop: 5 },
  intentDetail: { fontSize: 12.5, lineHeight: 18, color: '#6b6b70', marginTop: 5 },
  intentScale: { fontSize: 12.5, lineHeight: 18, color: '#8e8e93', marginTop: 8 },
  intentScaleStrong: { color: '#e4e4e7', fontWeight: '600' },
  durRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  durValue: { fontSize: 21, fontWeight: '700', color: '#ffffff', letterSpacing: -0.4 },
  durTag: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: '#5b5b62',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2f2f35',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  glow: { position: 'absolute' },


  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#2f2f35', alignSelf: 'center', marginBottom: 16 },
  sheetCta: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sheetGhost: { height: 50, borderRadius: 13, backgroundColor: '#1c1c20', alignItems: 'center', justifyContent: 'center' },
  sheetGhostText: { fontSize: 14, fontWeight: '600', color: '#d4d4d8' },
  sheetCtaText: { fontSize: 15, fontWeight: '600', color: '#0a0a0b' },
  sheetTitle: { fontSize: 19, fontWeight: '700', color: '#ffffff', marginBottom: 8, lineHeight: 25 },
  sheetBody: { fontSize: 14, lineHeight: 22, color: '#b4b4b8', marginBottom: 16 },
  helpGroup: { marginBottom: 16 },
  helpGroupTitle: { fontSize: 13.5, fontWeight: '700', marginBottom: 7 },
  helpPointRow: { flexDirection: 'row', gap: 9, marginBottom: 5 },
  helpDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#3f3f46', marginTop: 8 },
  helpPoint: { flex: 1, fontSize: 13.5, lineHeight: 20, color: '#8e8e93' },
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