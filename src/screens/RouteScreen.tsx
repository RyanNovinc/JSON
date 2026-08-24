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
import { recordWeightEntry } from '../utils/weightHistory';
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
  operatingRangeFor,
  MIN_RANGE_WIDTH_PCT,
} from '../utils/roadmap';
import { leanStopFor } from '../utils/operatingBands';
import { ATTRACTIVE_BF_RANGE, ATTRACTIVE_BF_CENTRE } from '../utils/attractivenessTargets';
import { frameZoneFor, evidenceTopicFor, type EvidenceTopic } from '../utils/routeZones';
import type {
  PhaseOrder,
  GoalsProfile,
  RoutePreference,
  Sex,
} from '../utils/goalsProfile';

type Nav = StackNavigationProp<RootStackParamList>;
// 5 AND 6 ARE DELIBERATE GAPS, 24 Aug 2026.
//
// 6 asked a returning lifter for their previous training peak, which fed the
// regain credit removed from roadmap.ts. 5 asked for trainingState, and existed
// as the gate for 6 — that was its original purpose, and with 6 gone it was
// removed too.
//
// The later beats keep their numbers rather than closing up, because 9 and 10
// are referenced as literals in the write gates in advance(), in helpFor(9),
// and in routeCompletion.ts's resume map. Renumbering would touch every one of
// those, and routeCompletion already records what happened the last time this
// screen's beat order moved without its consumers.
//
// Both are excluded from the union rather than left unused, so a stale
// `startBeat: 5` or `6` from another screen is a compile error instead of a
// beat that renders nothing.
type Beat = 1 | 2 | 3 | 4 | 7 | 8 | 9 | 10;

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
/**
 * WHICH HALF FIRST. This replaced the three band routes on beat 9, 17 Aug 2026.
 *
 * The band routes had stopped meaning anything. Once a build's fat cost came
 * from the prescribed surplus instead of the band width, 'lean' and 'balanced'
 * produced byte-identical plans for every profile tested, and 'roomy' differed
 * only because derivePhase maps it to `bulk` (0.5 fat per kg lean rather than
 * 0.2) — an option Helms 2023 and Garthe 2013 both say buys no extra muscle.
 * Three labels, one real distinction, and that distinction was strictly worse.
 *
 * The order is the choice that survives, and it is an honest one: modelled both
 * ways the totals land within about half a month of each other, so it is a
 * preference like the band width was, not a speed setting. What genuinely
 * differs is the two years in between.
 *
 * `cost` is not softening. Every option here has one and both are stated,
 * because a picker that lists only upsides is not offering a choice.
 */
export const ORDER_OPTIONS: Array<{
  id: PhaseOrder;
  name: string;
  gain: string;
  cost: string;
}> = [
  {
    id: 'cut_first',
    name: 'Get lean first',
    gain: 'Lean in 5 months, and the cut is behind you.',
    cost: 'Not growing until it is done.',
  },
  {
    id: 'build_first',
    name: 'Start growing first',
    gain: 'Growing from day one.',
    cost: 'Soft for most of it, and the cut waits until the end.',
  },
];

/**
 * THE ONE QUESTION BEAT 9 ASKS, 20 Aug 2026.
 *
 * It replaces the cut-first / build-first picker, which asked the user to
 * order two halves of a plan they had not been shown yet. The question people
 * actually have an answer to is whether they mind being soft on the way, and
 * everything else falls out of it: staying lean means a range, and an opening
 * cut if they stand above it today; not staying lean means no range at all,
 * one build and one cut at the end, at any starting body fat.
 *
 * WHY THESE CARRY COPY WHEN THE PICKERS DELIBERATELY DO NOT. The rule on this
 * screen has been "let the graph do the talking" since 18 Aug, and it held
 * while the difference between the options WAS a shape. It is not any more:
 * the difference people are choosing between is how they look for the next two
 * years, and no chart draws a jawline or a shirt. One line each, a gain and a
 * cost in the same breath, so it is a choice rather than a pitch.
 */
export type RouteId = 'lean' | 'bulk' | 'capped';

/**
 * THE ONE QUESTION BEAT 9 ASKS, and the three answers it takes.
 *
 * Two levers make every plan in this app: whether there is a CUT before the
 * building starts, and whether there is a CEILING that interrupts it.
 *
 *   lean    both        cut into the range first, then live in it
 *   bulk    neither     one build, one cut at the end, at any body fat
 *   capped  ceiling     no opening cut, but a first leg run to a chosen peak
 *
 * The fourth corner — cut first, no ceiling — is incoherent: you would get lean
 * and then drift upward forever.
 *
 * ORDER, deliberate: the two plain answers first, then the one that asks for a
 * number. It costs the leanest-to-softest reading of the list and buys a list
 * where the only option with a follow-on screen comes after the two that have
 * none.
 *
 * WHY THESE CARRY COPY WHEN THE PICKERS DELIBERATELY DO NOT. "Let the graph do
 * the talking" held while the difference between the options WAS a shape. It is
 * not any more: what people are choosing between is how they look for the next
 * two years, and no chart draws a jawline or a shirt. One line each, a gain and
 * a cost in the same breath, so it is a choice rather than a pitch.
 */
export const ROUTE_CHOICES: Array<{
  id: RouteId;
  name: string;
  line: (openingCut: boolean) => string;
  gain: string;
  cost: string;
}> = [
  {
    id: 'lean',
    name: 'Stay lean the whole way',
    // Two versions, because someone already inside their range does not lose
    // weight to get into it and the smaller-frame cost is not theirs.
    line: (openingCut) =>
      openingCut
        ? 'More defined and a sharper jawline, but a smaller frame while you get there.'
        : 'More defined the whole way, and never a long stretch of being soft.',
    gain: 'Defined the whole way, and it shows in your face first.',
    cost: 'A smaller frame while you get there, and more cuts to hold it.',
  },
  {
    id: 'bulk',
    name: 'Grow now, cut at the end',
    line: () => 'Bigger sooner and filling out shirts, but softer the whole way.',
    gain: 'Bigger sooner, filling out shirts, nothing interrupting the growing.',
    cost: 'Softer the whole way through, and one long cut at the end.',
  },
  {
    id: 'capped',
    name: 'Grow now, up to a limit',
    // Was "You set how big it gets and how far each cut takes you back", which
    // describes the CONTROLS rather than the experience — the other two say what
    // it is like to live on that route, and this one read like a settings menu.
    line: () => 'Bigger sooner without going past a number you pick, but cutting back each time you get there.',
    gain: 'Bigger sooner, without going past a number you choose.',
    cost: 'Cutting back each time you reach it, and softer than lean the whole way.',
  },
];

/**
 * Cut counts read as words up to the point where a numeral is clearer. The
 * count is not monotonic across the dial — holding a user under the ceiling
 * costs cuts, and once the dial is too close to the ceiling for that to be
 * possible the rail stands down and the count drops back to two — so this is
 * a figure the user watches change, not one they can predict.
 */
const CUT_WORDS: Record<number, string> = {
  0: 'No cuts',
  1: 'One cut',
  2: 'Two cuts',
  3: 'Three cuts',
  4: 'Four cuts',
  5: 'Five cuts',
  6: 'Six cuts',
};

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
    /**
     * RENAMED from "Grow faster" on 17 Aug 2026, because it did not.
     *
     * This route shares the SAME 18% ceiling as balanced — it does not let a
     * user carry more fat. What differs is the floor: balanced cuts back to
     * 12%, this one only to 14%. And what actually makes it quicker is the
     * longer build block between trims, not anything about growth rate.
     *
     * "Grow faster" promised quicker muscle, which the app's own model says is
     * impossible: the gain rate is capped by the FFMI curve and food does not
     * raise it. The name was making a claim two RCTs contradict.
     */
    name: 'Fewest cuts',
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
    /**
     * REWRITTEN 20 Aug 2026, when the beat stopped asking about ORDER and
     * started asking whether the user wants to stay lean at all.
     *
     * The screen carries one line per option now, which is a change from the
     * wordless pickers this sheet used to be the only text for. That line is
     * short on purpose and this is where the rest of it lives: what each
     * choice looks like in the mirror, what it costs, and what nobody knows.
     *
     * SAME LENGTH AS THE VERSION IT REPLACES. It was cut from 258 words to 93
     * on 18 Aug because a user should not have to read an essay to understand
     * two options, and that is still true.
     *
     * "diet" stays banned across this journey, because a bulk is a diet too.
     */
    return {
      title: 'Same finish either way',
      // Stated first because a user assumes a faster option exists. Muscle is
      // capped and the fat to shed is fixed, so both answers land in the same
      // place in about the same time. What differs is the two years between.
      body:
        'Same muscle, same total time either way. What you are choosing is how you look while you get there.',
      groups: [
        {
          title: 'Stay lean the whole way',
          points: [
            'Defined the whole way, and it shows in your face first',
            // Galgani 2025 measured a surplus started fatter depositing more
            // fat per unit of surplus (sedentary men, no exercise prescribed).
            // A fat claim, never a muscle one.
            'A surplus started leaner adds less fat',
            'Cost: a smaller frame while you get there, and more cuts to hold it',
          ],
        },
        {
          title: 'Grow now, cut at the end',
          points: [
            'Bigger sooner, and never smaller than you are today',
            // Was "fall off partway", which assumed quitting. "Stop early"
            // also covers deciding you are big enough.
            'Stop early and you finish bigger, not just leaner',
            'Cost: softer the whole way through, and one long cut at the end',
          ],
        },
        {
          // Its own group ON PURPOSE: the options each state a benefit, so the
          // uncertainty has to be as visible as the claims it qualifies.
          title: 'What is not known',
          points: [
            'No trial has compared the two',
            'Growing lean and growing soft have not been shown to build different amounts of muscle',
            'Reasoned defaults, not proven ones',
          ],
        },
      ],
      sources:
        'Helms 2023 \u00b7 Garthe 2013 \u00b7 Murphy and Koehler 2022 \u00b7 Galgani 2025',
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

/**
 * "GROW NOW, CUT AT THE END", expressed in the fields that exist.
 *
 * The engine has no concept of "no range". It does not need one: a top above
 * where the build would drift to on its own never fires, which is exactly what
 * not having a range means. So the answer is stored as a ceiling nobody could
 * reach rather than as a fourth field, and `lean` is read back off it.
 *
 * TWO THINGS TO WATCH, both outside this file:
 *  1. `operatingRangeFor` has to pass a CHOSEN top through unclamped, which is
 *     what scoping the width and goal rules to chosen tops was for. If a plan
 *     built this way still shows interruptions, that assumption is where to
 *     look first.
 *  2. `roadmap.band` now means the user's range, and JourneyChart draws it as a
 *     shaded rect. A plan carrying this ceiling has a band running to the top
 *     of the frame, so the plan chart for this answer needs the band suppressed
 *     rather than drawn. That is a JourneyChart prop, not a change here.
 */
const NO_CEILING_BF = 99;

/**
 * WHICH STEPS EXIST FOR WHICH ANSWER.
 *
 *   0 the route  ·  1 the first question it opens  ·  2 the second  ·  3 the plan
 *
 * A screen that would have one possible answer is stepped over in BOTH
 * directions rather than shown. Growing now with no limit opens nothing; the
 * lean route opens the range; the capped route opens its peak and then the
 * range, one question per screen.
 */
const STEPS: Record<RouteId, Array<0 | 1 | 2 | 3>> = {
  lean: [0, 1, 3],
  bulk: [0, 3],
  capped: [0, 1, 2, 3],
};
const nextStep = (at: 0 | 1 | 2 | 3, r: RouteId) => {
  const seq = STEPS[r];
  return seq[Math.min(seq.indexOf(at) + 1, seq.length - 1)] ?? 3;
};
const prevStep = (at: 0 | 1 | 2 | 3, r: RouteId) => {
  const seq = STEPS[r];
  return seq[Math.max(seq.indexOf(at) - 1, 0)] ?? 0;
};

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
 * trainingState is required by the type and has to be SOMETHING. Since beat 5
 * was removed on 24 Aug 2026 NO screen asks the question, so this value is what
 * every Route-onboarded user gets, permanently — it is no longer a placeholder
 * waiting to be overwritten.
 *
 * 'consistent' rather than 'new', matching goalsProfileStorage's create path.
 * The two must agree. 'new' is the one state with no entry in
 * STATE_RATE_CAP_FRACTION_OF_HEADROOM, so defaulting to it would run every
 * user's build at the uncapped curve rate.
 */
const SEED_WEIGHT_KG = 77;

function seedProfile(): GoalsProfile {
  return { currentWeightKg: SEED_WEIGHT_KG, trainingState: 'consistent' };
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

/** Matches roadmap.ts's own rounding, so a value this screen writes and a value
 *  the engine resolves cannot disagree by a hundredth of a point. */
const round1 = (n: number) => Math.round(n * 10) / 10;

const SECTIONS: Array<{ label: string; beats: Beat[]; quiet?: boolean }> = [
  { label: 'ABOUT YOU', beats: [1, 2, 3, 4] },
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
  /**
   * THE BEAT 9 ANSWER. True means a range and the cuts that keep them inside
   * it; false means one build and one cut at the end. `phaseOrder` is derived
   * from this rather than asked, because "cut first" is only ever the answer
   * of someone who wants to be lean and is not yet.
   */
  const [routeId, setRouteId] = useState<RouteId>('lean');
  /** The capped route's first answer: the body fat they bulk UP TO. */
  const [bulkTo, setBulkTo] = useState<number | null>(null);
  /** The lit point on the plan chart, and its numbers. Opens on today. */
  const [tapped, setTapped] = useState<{
    i: number;
    month: number;
    bodyFatPct: number;
    weightKg: number;
    when: string;
  } | null>(null);
  /**
   * THE RANGE, both edges. Null means untouched, so `operatingRangeFor`'s
   * default stands and the screen shows what the plan would do anyway.
   */
  const [bottom, setBottom] = useState<number | null>(null);
  const [top, setTop] = useState<number | null>(null);
  /**
   * Beat 9 is THREE screens, not three beats.
   *
   * 0 the range, 1 how you get into it, 2 the plan. Renumbering `Beat` would
   * touch its forty-odd references and every section map with it, for a
   * sequence that is one question split into its parts. `back` and `advance`
   * intercept this before they touch `beat`, so the rest of the flow is
   * unaware of it.
   */
  /**
   * 0 the route, 1 the first question that route opens, 2 the second (capped
   * only), 3 the plan. Steps nobody asked for are stepped over in both
   * directions rather than shown with one answer.
   */
  const [rangeStep, setRangeStep] = useState<0 | 1 | 2 | 3>(0);
  /**
   * A short settle on the number that just changed.
   *
   * The chart already eases over 350ms when the range moves, so without this
   * the figure snapped to its new value while the band it describes was still
   * travelling — two halves of one change moving at different speeds, which
   * reads as a glitch rather than as a control. Scale rather than opacity: the
   * number must stay legible throughout, and a value that fades is a value you
   * cannot read at the moment you are trying to read it.
   */
  const loPulse = useRef(new Animated.Value(1)).current;
  const hiPulse = useRef(new Animated.Value(1)).current;
  const [loading, setLoading] = useState(true);
  /** Unset onboarding gate. Drives the beat 1 intent line and the food door. */
  const [firstRun, setFirstRun] = useState(false);
  const [beat, setBeat] = useState<Beat>(startBeat);
  const [bodyFat, setBodyFat] = useState<BodyFatFieldValue>(emptyBodyFatValue());
  const [evidence, setEvidence] = useState<EvidenceTopic | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  /**
   * The "why is this a range" sheet, opened from the TIME stat.
   *
   * DECLARED HERE WITH THE OTHER HOOKS, not next to the value it explains.
   * The first version sat beside the estYears destructure two hundred lines
   * down, which is after the conditional returns — so on some renders it ran
   * and on others it did not, and React threw "rendered more hooks than during
   * the previous render". Hooks run unconditionally or not at all.
   */
  const [varianceOpen, setVarianceOpen] = useState(false);
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
        if (p?.routePreference) setPreference(p.routePreference);
        // No stored answer means not asked yet, so fall to the arithmetic
        // default rather than assuming a choice the user never made.
        // Read back off the ceiling, since that is where the answer lives.
        // A profile that has never been asked defaults to staying lean.
        // The route is read back off the fields it wrote, so nothing has to be
        // stored twice and an older profile lands somewhere sane.
        if (p) {
          setRouteId(
            (p.ceilingBf ?? 0) >= NO_CEILING_BF
              ? 'bulk'
              : p.bulkToBf != null
                ? 'capped'
                : 'lean',
          );
          setBulkTo(p.bulkToBf ?? null);
        }
        setBottom(p?.preBuildBf ?? null);
        // ── THE SENTINEL IS NOT A CEILING ─────────────────────────────────
        //
        // `ceilingBf` carries NO_CEILING_BF for the no-range route, which is how
        // "no ceiling" is expressed. Loading that into `top` made it the user's
        // CHOSEN top on every other route as well, so their band became 12 to 99
        // and both range-carrying options drew a shaded block covering the whole
        // canvas. Null here means "not chosen", which is what it actually is.
        setTop(p?.ceilingBf != null && p.ceilingBf < NO_CEILING_BF ? p.ceilingBf : null);
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

  /**
   * The profile a plan is built from, for either answer.
   *
   * `phaseOrder: 'cut_first'` on the lean side is not a second question. The
   * engine only opens with a cut when the user is actually above the bottom
   * (`needsCut`), so someone already inside their range gets no opening phase
   * from it — which is why the order does not have to be asked separately.
   */
  const planProfileFor = (r: RouteId): GoalsProfile | null => {
    if (!profile) return null;
    const base: GoalsProfile = {
      ...profile,
      goalWeightKg: provisionalGoalW ?? undefined,
      goalBodyFatPct: provisionalGoalBf,
      // cut_first is not a second question. The engine only opens with a cut
      // when the user is actually ABOVE the bottom (`needsCut`), so someone
      // already inside their range gets no opening phase from it.
      phaseOrder: r === 'lean' ? 'cut_first' : 'build_first',
      preBuildBf: bottom ?? undefined,
      ceilingBf: undefined,
    };

    // Belt and braces on the sentinel trap: even a poisoned `top` cannot reach
    // the engine as a chosen ceiling.
    const chosen = top != null && top < NO_CEILING_BF ? top : null;

    /**
     * ── AN UNCHOSEN TOP DEFAULTS TO THE SUGGESTION, NOT THE OLD BAND ────────
     *
     * The fallback used to be the legacy route ceiling, which for the balanced
     * band is 18. That is wide enough that a build never reaches it, so "stay
     * lean the whole way" drew a single long climb with no cycling — the one
     * option whose entire point is living inside a range showed a user never
     * touching one. It also contradicted the very next screen, which recommends
     * bottom + 3 in so many words.
     *
     * The measured objection to this change was that it re-plans about a
     * quarter of EXISTING profiles onto a tighter band nobody asked for. That
     * held when the range was invisible; it does not now, because every lean
     * user passes through the screen that states this number and offers the
     * link to it. A chosen top still wins over it in every case.
     */
    const suggested =
      chosen == null ? (operatingRangeFor(base, preference)?.suggestedTop ?? null) : null;

    return {
      ...base,
      ceilingBf: r === 'bulk' ? NO_CEILING_BF : (chosen ?? suggested ?? undefined),
      bulkToBf: r === 'capped' ? (bulkTo ?? undefined) : undefined,
    };
  };

  const effProfile: GoalsProfile | null = planProfileFor('lean');
  const planProfile: GoalsProfile | null = planProfileFor(routeId);

  // ── HOOKS LIVE ABOVE THE EARLY RETURNS ──────────────────────────────────
  //
  // These three sat further down beside the values they feed, which reads
  // better and is illegal: this component returns null while the profile is
  // loading, so a hook after that point runs on some renders and not others and
  // React throws "Rendered more hooks than during the previous render". They
  // read `profile?.` rather than the narrowed `currentBf` for the same reason.
  /**
   * Where a build with NO ceiling tops out on its own.
   *
   * Everything about the capped route depends on this number: a peak above it
   * never fires, and the option silently becomes "grow now, cut at the end".
   */
  const driftTopBf = React.useMemo(() => {
    const p = planProfileFor('bulk');
    const rm = p ? deriveRoadmap(p, preference) : null;
    if (!rm) return null;
    return Math.round(
      Math.max(profile?.currentBodyFatPct ?? 0, ...rm.phases.map((ph) => ph.exitBodyFatPct)) * 10,
    ) / 10;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.currentWeightKg, profile?.currentBodyFatPct, provisionalGoalW, provisionalGoalBf, preference]);

  /**
   * NEVER DEFAULT A CONTROL TO A VALUE WHERE IT DOES NOTHING. Four points above
   * today reads like a sensible bulk, and for a user with a small lean gap it
   * sits ABOVE where their build tops out — so the third option would open as a
   * copy of the second, with a number that can never fire.
   */
  const defaultBulkTo = React.useMemo(() => {
    const now = profile?.currentBodyFatPct ?? 20;
    const cap = driftTopBf != null ? driftTopBf - 0.5 : now + 4;
    return Math.max(now + 2, Math.min(now + 4, Math.round(cap * 2) / 2));
  }, [profile?.currentBodyFatPct, driftTopBf]);

  const bulkAt = bulkTo ?? defaultBulkTo;
  /** True while the number they set can never come into play. */
  const bulkInert = driftTopBf != null && bulkAt >= driftTopBf;
  /**
   * The readout opens on TODAY rather than empty. It teaches the interaction by
   * example, costs no words, and where they are standing right now is the first
   * thing anyone wants off this chart.
   */
  React.useEffect(() => {
    if (beat !== 9 || rangeStep !== 3 || tapped != null) return;
    const w = profile?.currentWeightKg;
    const bf = profile?.currentBodyFatPct;
    if (w == null || bf == null) return;
    setTapped({ i: 0, month: 0, bodyFatPct: bf, weightKg: w, when: 'today' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, rangeStep]);


  // deriveRoadmap walks the whole phase sequence, and this used to run on every
  // render, which meant every frame of a drag. Keyed on the scalars it actually
  // reads rather than on effProfile, which is a fresh object each render.
  const roadmap: Roadmap | null = React.useMemo(
    () => (planProfile ? deriveRoadmap(planProfile, preference) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      profile?.currentWeightKg,
      profile?.currentBodyFatPct,
      profile?.heightCm,
      profile?.sex,
      provisionalGoalW,
      provisionalGoalBf,
      preference,
      routeId,
      bulkTo,
      bottom,
      top,
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

  /**
   * Same shape as onWeightDrag: every reported step updates state so the chart
   * and the two figures move under the finger, and only the settle writes. The
   * ruler reports in whole points, so a full drag across the range is at most
   * eight roadmap derivations rather than one per frame.
   */
  /**
   * The beat 9 answer, written the moment it is tapped.
   *
   * Both fields move together on purpose: the ceiling IS the answer, and a
   * phaseOrder left saying cut_first beside a ceiling of 99 would describe a
   * plan nobody chose. Returning to lean restores whatever range they had
   * already set, or the resolved default if they never touched it.
   */
  const chooseRoute = async (next: RouteId) => {
    setRouteId(next);
    await updateGoalsProfileField('phaseOrder', next === 'lean' ? 'cut_first' : 'build_first');
    if (next === 'bulk') {
      // The ceiling IS the answer here, so both fields move together: a
      // phaseOrder saying build_first beside a real ceiling would describe the
      // capped plan rather than this one.
      await updateGoalsProfileField('ceilingBf', NO_CEILING_BF);
      await updateGoalsProfileField('bulkToBf', undefined);
      return;
    }
    const base = planProfileFor('lean');
    const r = base ? operatingRangeFor(base, preference) : null;
    if (r) await updateGoalsProfileField('ceilingBf', top ?? r.top);
    if (next === 'capped') {
      const start = bulkTo ?? defaultBulkTo;
      setBulkTo(start);
      await updateGoalsProfileField('bulkToBf', start);
    } else {
      await updateGoalsProfileField('bulkToBf', undefined);
    }
  };

  const back = () => {
    // In single beat mode there is no previous beat to return to: the user
    // arrived directly at this one.
    if (single || beat <= 1) {
      navigation.goBack();
      return;
    }
    // Beat 9's sub-steps come before the beat itself, and the route question
    // is stepped over in BOTH directions when it does not apply — skipping it
    // forward only would trap someone who reached the plan and pressed back.
    if (beat === 9 && rangeStep > 0) {
      setRangeStep(prevStep(rangeStep, routeId));
      return;
    }
    // 4 -> 7 in both directions: 5 and 6 no longer exist.
    const prev = beat === 7 ? 4 : beat - 1;
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
    // Same silent-choice problem as routePreference above: the range opens on a
    // default, and for users with nothing to cut it is never shown at all.
    // Either way what they leave with has to be recorded.
    //
    // The range is re-derived here rather than read from the render body,
    // because that value is computed after the conditional returns and this
    // closure must not depend on having reached them.
    if (beat === 9 && profile != null && effProfile != null) {
      const r = operatingRangeFor(effProfile, preference);
      // The answer is written whether or not it was tapped, because it opens on
      // a default and accepting a default is still a choice. The ceiling is
      // written unconditionally on the no-range side: leaving a stale one there
      // is the difference between one cut and five.
      await patch('phaseOrder', routeId === 'lean' ? 'cut_first' : 'build_first');
      await patch('bulkToBf', routeId === 'capped' ? (bulkTo ?? defaultBulkTo) : undefined);
      if (routeId === 'bulk') await patch('ceilingBf', NO_CEILING_BF);
      else if (r) {
        if (profile.preBuildBf == null) await patch('preBuildBf', r.bottom);
        if (profile.ceilingBf == null || profile.ceilingBf >= NO_CEILING_BF) {
          await patch('ceilingBf', top ?? r.top);
        }
      }
    }

    // Beat 9's sub-steps advance before the beat does.
    if (beat === 9 && rangeStep < 3) {
      setRangeStep(nextStep(rangeStep, routeId));
      return;
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
      const next = beat === 4 ? 7 : beat + 1;
      goToBeat(next as Beat, 1);
    } else setConfirming(true);
  };

  const lockIn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // ── RECORD THE WEIGH-IN, 19 Aug 2026 ──────────────────────────────────
      //
      // Weight lives in two stores: `GoalsProfile.currentWeightKg`, which every
      // plan is calculated from, and `weight_tracking_history`, the dated series
      // the charts and the phase-transition trend read. This flow only ever
      // wrote the first. So a user who updated their weight here had a profile
      // that had moved and a history that had not — and the trend that decides
      // when a phase ends was computed from a series missing exactly the
      // weigh-ins people take after a while away.
      //
      // ONCE, AT LOCK-IN, NOT PER DRAG COMMIT. The weight beat is a ruler:
      // dragging 78 to 82 commits at every release, and recording each would
      // write five weigh-ins the user never stood on a scale for. The profile
      // write on release stays as it is; only the dated entry is deferred to
      // here, where the number is one the user has settled on.
      //
      // Non-fatal. recordWeightEntry returns a result rather than throwing, and
      // a failed weigh-in must never block someone finishing their plan.
      if (profile?.currentWeightKg != null && profile.currentWeightKg > 0) {
        const rec = await recordWeightEntry({
          weightKg: profile.currentWeightKg,
          unit: globalUnit === 'lbs' ? 'lbs' : 'kg',
          bodyFatPct: profile.currentBodyFatPct,
          bodyFatSource: profile.bodyFatSource,
          origin: 'RouteScreen.lockIn',
        });
        // `'reason' in rec` rather than `!rec.ok`: the result is a discriminated
        // union and narrowing on the boolean does not hold under this repo's
        // compiler settings. The `in` check narrows in every configuration.
        if (!rec.ok) {
          console.error(
            '[RouteScreen] weigh-in not recorded:',
            'reason' in rec ? rec.reason : 'unknown',
          );
        }
      }

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

  // operatingRangeFor is the same function deriveRoadmap resolves the range
  // through, so the screen cannot drift from the plan the way a re-implemented
  // check here would. Null means there is nothing to set: no measured body fat,
  // no goal, nothing to build, or a goal body fat above where they stand.
  const range = effProfile ? operatingRangeFor(effProfile, preference) : null;
  const rangeMatters = range != null;
  const leanStop = leanStopFor(profile.sex);
  /**
   * Whether staying lean starts with a cut. It decides one line of copy on the
   * option and nothing else — the engine makes the same call itself through
   * `needsCut`, so this can neither put an opening phase on a plan nor take
   * one off it.
   */
  /**
   * The peak, in half points. Floored two above where they stand, because a
   * peak at today's body fat is not a bulk, and unbounded above — a number
   * above the drift top is allowed and the screen says it will not fire rather
   * than refusing it.
   */
  const nudgeBulk = (delta: number) => {
    const now = currentBf ?? 0;
    const next = Math.max(now + 2, Math.round((bulkAt + delta) * 2) / 2);
    if (next === bulkAt) return;
    setBulkTo(next);
    void updateGoalsProfileField('bulkToBf', next);
  };

  const routeName = (ROUTE_CHOICES.find((o) => o.id === routeId) ?? ROUTE_CHOICES[0]).name;

  const openingCut =
    range != null && currentBf != null && currentBf > range.bottom + 0.2;
  const noCutNeeded = (roadmap?.gapKg ?? 0) > 0;
  const exits = roadmap?.phases.map((ph) => ph.exitBodyFatPct) ?? [];

  /**
   * The two figures the dial actually decides, read off the plan rather than
   * recomputed. Everything here is derived from `roadmap`, so it cannot say one
   * thing while the chart above it draws another.
   *
   * LOWEST INCLUDES TODAY'S WEIGHT ON PURPOSE. With the dial at the top there
   * is no opening cut, so the smallest number the user ever sees on the scale
   * is the one they are standing on — taking the minimum of the phase exits
   * alone would report the goal weight, which they only reach at the end and
   * after passing well above it.
   */
  const exitWeights =
    roadmap?.phases.map((ph) => ph.exitWeightKg).filter((w): w is number => w != null) ?? [];
  const lowestKg = Math.min(profile.currentWeightKg, ...exitWeights);
  const opener = roadmap?.phases[0];
  const lowestBf =
    opener?.kind === 'trim' ? opener.exitBodyFatPct : (profile.currentBodyFatPct ?? null);
  // Softest is the peak of the PLAN, not of today. A user cutting first is
  // never softer than they are right now, and saying 20% when the plan tops
  // out at 17.6% would report the starting point as a consequence of a choice.
  const softestBf = exits.length ? Math.max(...exits) : null;
  // THE HEAVIEST TIME THEY ARE THAT SOFT, not the first. Where the rail holds a
  // user at the ceiling the plan touches that number several times, at rising
  // weights — 18% at 82.9 kg early and again at 91.5 kg later on the same plan.
  // Taking the first match reported the lighter one, which is the same body fat
  // wearing eight fewer kilos and reads as a smaller consequence than it is.
  // (findLast is avoided deliberately: Hermes does not carry it on every RN
  // version this ships to.)
  const softestKg =
    softestBf == null
      ? null
      : (roadmap?.phases ?? []).reduce<number | null>(
          (best, ph) =>
            ph.exitBodyFatPct === softestBf && ph.exitWeightKg != null
              ? Math.max(best ?? 0, ph.exitWeightKg)
              : best,
          null,
        );
  const cutCount = roadmap?.phases.filter((ph) => ph.kind === 'trim' || ph.kind === 'reveal').length ?? 0;
  const fmtKg = (kg: number) => (imperial ? `${Math.round(kgToLb(kg))} lbs` : `${kg.toFixed(1)} kg`);
  /**
   * Both edges as the user is currently setting them. `range` has already
   * clamped whatever is in state, so these are what the plan is actually built
   * from and what the chart is actually drawing — never the raw state.
   */
  const bandLo = range?.bottom ?? 0;
  const bandHi = range?.top ?? 0;
  const atLeanStop = range != null && bandLo <= range.leanStop;
  const atMinWidth = range != null && bandHi - bandLo <= range.minWidth;

  const pulse = (v: Animated.Value) => {
    v.setValue(0.86);
    Animated.spring(v, {
      toValue: 1,
      friction: 5,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  const nudge = (which: 'lo' | 'hi', by: number) => {
    if (!range) return;
    pulse(which === 'lo' ? loPulse : hiPulse);
    if (which === 'lo') {
      const next = Math.min(
        Math.max(round1(bandLo + by), range.leanStop),
        Math.max(range.leanStop, range.topStop),
      );
      setBottom(next);
      void updateGoalsProfileField('preBuildBf', next);
      // The top follows rather than blocking the bottom: a user pushing the
      // bottom up into the top means to move the range, not to be stopped by it.
      if (bandHi - next < range.minWidth) {
        const t = round1(next + range.minWidth);
        setTop(t);
        void updateGoalsProfileField('ceilingBf', t);
      }
    } else {
      const next = Math.max(round1(bandHi + by), round1(bandLo + range.minWidth));
      setTop(next);
      void updateGoalsProfileField('ceilingBf', next);
    }
  };

  /** Sets BOTH ends, because the suggestion is a range rather than a width. */
  const useSuggested = () => {
    if (!range) return;
    pulse(loPulse);
    pulse(hiPulse);
    setBottom(range.suggestedBottom);
    setTop(range.suggestedTop);
    void updateGoalsProfileField('preBuildBf', range.suggestedBottom);
    void updateGoalsProfileField('ceilingBf', range.suggestedTop);
  };
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
  const ctaBlocked = beat === 2 && profile.sex == null;
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
    7: 'Continue',
    8: 'Continue',
    9: 'See the whole plan',
    10: 'Lock in my plan',
  };

  // Beat 9 is three screens, so its one label cannot serve all of them:
  // "See the whole plan" under a range that has not been turned into a plan yet
  // promises the next tap does something it does not.
  const ctaLabel =
    beat === 9 && rangeMatters && rangeStep < 3 ? 'Continue' : CTA[beat];

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
        {/* BEAT 5 WAS HERE. It asked trainingState with four described options
            (new / consistent / returning / advanced), and it existed as the
            GATE FOR BEAT 6 below: answer "Coming back" and you were asked for
            your previous peak. Beat 6 went with the regain credit on 24 Aug
            2026, and 5 went with it.

            READ THIS BEFORE RESTORING IT, because it has been deleted once
            before and caused a bug. trainingState left the workout
            questionnaire as Q2 (deriveExperienceTier is the shim that replaced
            it) and the questionnaires now read it off the profile. With
            GoalsIntake skipped on a first run, every Route-onboarded user was
            silently defaulting to 'new'.

            THAT DEFAULT IS NOW LOAD-BEARING, not a placeholder. Nothing asks
            the question, so seedProfile's value is what every user gets and it
            drives four things: STATE_RATE_CAP_FRACTION_OF_HEADROOM (the cap
            that sets build duration), derivePhase's newbie-recomp rule, the
            experience tier both prompt builders key off, and the surplus tier
            in phaseCaloricTarget.

            It is 'consistent', matching goalsProfileStorage's create path — the
            two must agree. Not 'new', which is the one state with a null cap
            and would run every build at the uncapped curve rate.

            TWO CONSEQUENCES, recorded rather than discovered later. derivePhase
            rule 1 needs 'new' or 'returning', so the newbie-recomp window never
            fires for a Route-onboarded user. And deriveExperienceTier returns
            'intermediate' for everyone, so both prompt builders get the same
            experience tier regardless of who the lifter is. */}

        {/* ---------------------------------------------------------------- */}
        {/* BEAT 6 WAS HERE. It asked a returning lifter for their peak weight
            and how lean they were at it, the two inputs to splitGap and the
            regain credit. Both were removed on 24 Aug 2026 — see the
            regain-removal note in roadmap.ts.

            The number quoted here for years was the case FOR the feature: on a
            traced profile crediting regain moved the estimate from 2.5-5.3
            years to 1.7-3.4. That is exactly the size of what the removal gives
            back, and it is the reason to be honest about the cost rather than
            to restore it: the multiplier producing that shortening ran the
            effective regain rate to 0.458 kg/week against
            MAX_LEAN_GAIN_KG_PER_WEEK = 0.23, the one constant here graded [A].

            The skip link this beat carried is worth remembering separately. It
            cleared BOTH fields and awaited them in sequence, because
            updateGoalsProfileField is read-modify-write and firing the two
            without awaiting let the second load beat the first save, restoring
            the weight the user had just said they did not remember. Any future
            beat that clears more than one field at once has the same hazard. */}

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
        {/* ── BEAT 9, SCREEN 1 OF 3: STAY LEAN, OR NOT ─────────────────────
            This was asked second, and asked as an ORDER: "you are above that
            today, get in now or later". Wrong question, wrong place. The user
            was made to set a body fat range before anything had told them that
            growing from where they are was allowed, so the range read as a
            rule they had to obey rather than as a setting.

            Asked this way it decides everything after it. Staying lean means
            there is a range, and an opening cut if they stand above it today.
            Not staying lean means there is no range at all: one build, one cut
            at the end, whatever body fat they start from — the same answer at
            20% and at 15%, where the old model quietly gave two different ones
            depending on whether the ceiling happened to sit above or below
            where the user was standing. */}
        {beat === 9 && roadmap && rangeStep === 0 && rangeMatters ? (
          <>
            <View style={styles.beat1Body}>
              <Text style={styles.rangeQ}>Do you want to stay lean while you grow?</Text>
              <Text style={styles.rangeSub}>
                {`You are at ${Math.round(currentBf ?? 0)}% body fat today. Both finish at ${Math.round(provisionalGoalBf)}%.`}
              </Text>

              <View style={styles.edgeRows}>
                {ROUTE_CHOICES.map((opt) => {
                  const on = routeId === opt.id;
                  // Each option previews ITS OWN plan, through the same
                  // function that builds the real one. The miniature is the
                  // shape; the count underneath is what that shape costs.
                  const pp = planProfileFor(opt.id);
                  const preview = pp ? deriveRoadmap(pp, preference) : null;
                  const n =
                    preview?.phases.filter((ph) => ph.kind === 'trim' || ph.kind === 'reveal')
                      .length ?? 0;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={styles.optRow}
                      onPress={() => chooseRoute(opt.id)}
                      activeOpacity={0.85}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${opt.name}. ${opt.gain} ${opt.cost}`}
                    >
                      {preview ? (
                        <View style={styles.optMini}>
                          <JourneyChart
                            profile={profile}
                            roadmap={preview}
                            color={on ? themeColor : '#54545e'}
                            compact
                            // No band on the route that has no range. It is the
                            // one option where a shaded region is a claim about
                            // a question the user was never asked.
                            band={opt.id !== 'bulk'}
                          />
                        </View>
                      ) : null}
                      <View style={styles.optMain}>
                        <Text style={[styles.optName, on && styles.optNameOn]}>{opt.name}</Text>
                        <Text style={styles.optWhy}>{opt.line(openingCut)}</Text>
                        <Text style={styles.optMeta}>{CUT_WORDS[n] ?? `${n} cuts`}</Text>
                      </View>
                      <View style={[styles.optDot, on && { backgroundColor: themeColor }]} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        ) : null}

        {/* ── BEAT 9, SCREEN 2 OF 3: THE RANGE ────────────────────────────
            Only reachable for someone who said they want to stay lean, because
            it is the question that answer opens. Choosing to grow instead is
            not a control being hidden: it removes a question with no meaning
            for a plan that has no ceiling, and the way back to it is the
            answer that removed it, through the row on the plan screen. */}
        {/* ── BEAT 9, THE CAPPED ROUTE'S FIRST QUESTION ────────────────────
            The mirror of the opening cut, and the reason `bulkToBf` exists. It
            is a TARGET, not a region, so the chart draws one solid rule and
            shades nothing — the range screens shade, because a range is a
            region, and the two must not look like the same claim. */}
        {beat === 9 && roadmap && rangeMatters && rangeStep === 1 && routeId === 'capped' ? (
          <>
            <View style={styles.beat1Body}>
              <Text style={styles.rangeQ}>How big do you get before your first cut?</Text>
              <Text style={styles.rangeSub}>
                You grow from where you are today up to this point, then cut back.
              </Text>
              <JourneyChart
                profile={profile}
                roadmap={roadmap}
                color={themeColor}
                bare
                bandOnly
                frame
                targetPct={bulkAt}
              />

              <View style={styles.edgeRows}>
                <View style={styles.edgeRow}>
                  <Text style={styles.edgeKey}>BULK UP TO</Text>
                  <View style={styles.edgeCtl}>
                    <TouchableOpacity
                      style={[styles.stepBtn, bulkAt <= (currentBf ?? 0) + 2 && styles.stepBtnOff]}
                      onPress={() => nudgeBulk(-0.5)}
                      disabled={bulkAt <= (currentBf ?? 0) + 2}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Lower the body fat you bulk up to"
                    >
                      <Text style={styles.stepGlyph}>{'\u2212'}</Text>
                    </TouchableOpacity>
                    <Text style={styles.edgeVal}>{bulkAt}%</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => nudgeBulk(0.5)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Raise the body fat you bulk up to"
                    >
                      <Text style={styles.stepGlyph}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* A limit explains itself only while you are standing on it. Above
                  the drift top the answer does nothing at all, and saying so is
                  better than drawing a plan identical to the option above. */}
              {bulkInert ? (
                <View style={styles.rangeLimitRow}>
                  <View style={styles.rangeLimitDot} />
                  <Text style={styles.rangeLimitText}>
                    {`Your build tops out at ${driftTopBf}%, so anything above that never comes into play.`}
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {beat === 9 &&
        roadmap &&
        rangeMatters &&
        range &&
        rangeStep === (routeId === 'capped' ? 2 : 1) &&
        routeId !== 'bulk' ? (
          <>
            <View style={styles.beat1Body}>
              <Text style={styles.rangeQ}>
                {routeId === 'capped'
                  ? 'Where do you sit after that cut?'
                  : 'Where should your body fat sit while you grow?'}
              </Text>
              {/* THE RECOMMENDATION, STATED UP FRONT. This line used to
                  describe the mechanism ("a build that reaches the top is
                  interrupted for a cut"), which explains the machine to
                  someone who only wants to know what to pick. The suggestion
                  is a convention three points wide, and it says so by being
                  offered rather than defended. */}
              <Text style={styles.rangeSub}>
                {routeId === 'capped'
                  ? `You stay in this range while you finish growing. The last cut is the one that takes you to ${Math.round(provisionalGoalBf)}%.`
                  : `We recommend ${range.suggestedBottom} to ${range.suggestedTop}%.`}
              </Text>
              <JourneyChart
                profile={profile}
                roadmap={roadmap}
                color={themeColor}
                bare
                bandOnly
                frame
                leanStopPct={leanStop}
              />

              {/* Hairline rows rather than cards, and TOP above BOTTOM so they
                  match the chart directly above them. The first pass had them
                  the other way round and the rows argued with the picture. */}
              <View style={styles.edgeRows}>
                {([
                  { key: 'hi' as const, label: 'TOP', v: bandHi, dis: atMinWidth, a: hiPulse },
                  { key: 'lo' as const, label: 'BOTTOM', v: bandLo, dis: atLeanStop, a: loPulse },
                ]).map((row) => (
                  <View key={row.key} style={styles.edgeRow}>
                    <Text style={styles.edgeKey}>{row.label}</Text>
                    <View style={styles.edgeCtl}>
                      <TouchableOpacity
                        style={[styles.stepBtn, row.dis && styles.stepBtnOff]}
                        onPress={() => nudge(row.key, -0.5)}
                        disabled={row.dis}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Lower the ${row.label.toLowerCase()} of your range`}
                      >
                        <Text style={styles.stepGlyph}>{'\u2212'}</Text>
                      </TouchableOpacity>
                      <Animated.Text
                        style={[styles.edgeVal, { transform: [{ scale: row.a }] }]}
                      >
                        {row.v}%
                      </Animated.Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => nudge(row.key, 0.5)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Raise the ${row.label.toLowerCase()} of your range`}
                      >
                        <Text style={styles.stepGlyph}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {/* Each limit explains itself ONLY while someone is standing on
                  it. A screen carrying both warnings permanently teaches
                  people to stop reading them. */}
              {atLeanStop ? (
                <TouchableOpacity
                  style={styles.rangeLimitRow}
                  onPress={() => setEvidence('lean-stop')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <View style={styles.rangeLimitDot} />
                  <Text style={styles.rangeLimitText}>
                    {`${leanStop}% is as lean as this goes. `}
                    <Text style={{ color: themeColor }}>Why?</Text>
                  </Text>
                </TouchableOpacity>
              ) : null}
              {atMinWidth ? (
                <TouchableOpacity
                  style={styles.rangeLimitRow}
                  onPress={() => setEvidence('range-width')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <View style={styles.rangeLimitDot} />
                  <Text style={styles.rangeLimitText}>
                    {`${MIN_RANGE_WIDTH_PCT} points is as narrow as it goes. `}
                    <Text style={{ color: themeColor }}>Why?</Text>
                  </Text>
                </TouchableOpacity>
              ) : null}

              {/* A link, never a mode, and now a restatement of the line at the
                  top rather than an introduction of it. */}
              {bandLo !== range.suggestedBottom || bandHi !== range.suggestedTop ? (
                <TouchableOpacity onPress={useSuggested} activeOpacity={0.7}>
                  <Text style={styles.suggestLink}>
                    {`Use the suggested ${range.suggestedBottom} to ${range.suggestedTop}%`}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        ) : null}

        {/* ── BEAT 9, SCREEN 3 OF 3: THE PLAN ─────────────────────────────
            The summary, unchanged in structure from what it was before the
            range existed: it is the confidence moment, and it now has no
            controls on it at all. The two rows state what was chosen and jump
            back to the screen that owns each. */}
        {beat === 9 && roadmap && (rangeStep === 3 || !rangeMatters) ? (
          <>
            <View style={styles.beat1Body}>
              {/* ── The destination, stated plainly ──────────────────────
                  This is the confidence moment: someone four screens in wants
                  to see where they end up, not decode a line. It OWNS the two
                  weights — the chart below deliberately repeats them at its
                  endpoints because they read as a journey there rather than as
                  a fact, but nothing else on the screen restates them. */}
              <View style={styles.destRow}>
                <View style={styles.destCol}>
                  <Text style={styles.destKey}>TODAY</Text>
                  <Text style={styles.destBig}>
                    {Math.round(profile.currentWeightKg)}
                    <Text style={styles.destUnit}>kg</Text>
                  </Text>
                  <Text style={styles.destSub}>{Math.round(currentBf ?? 0)}% body fat</Text>
                </View>
                <Text style={[styles.destArrow, { color: themeColor }]}>{'\u2192'}</Text>
                <View style={[styles.destCol, styles.destColEnd]}>
                  <Text style={styles.destKey}>GOAL</Text>
                  <Text style={[styles.destBig, { color: themeColor }]}>
                    {Math.round(provisionalGoalW ?? 0)}
                    <Text style={styles.destUnit}>kg</Text>
                  </Text>
                  <Text style={styles.destSub}>{Math.round(provisionalGoalBf)}% body fat</Text>
                </View>
              </View>

              <View style={styles.chartGap} />
              <JourneyChart
                profile={profile}
                roadmap={roadmap}
                color={themeColor}
                bare
                frame
                yearLines
                // A plan with no range carries a fallback ceiling nobody chose,
                // and shading it would show a rule the user never set.
                band={routeId !== 'bulk'}
                onSelectNode={(nd, i) => setTapped(tapped?.i === i ? null : { ...nd, i })}
                selectedNode={tapped?.i ?? null}
                muscleKg={roadmap.gapKg != null && roadmap.gapKg > 0 ? Math.round(roadmap.gapKg) : undefined}
              />
              <View style={styles.chartEnds}>
                <Text style={styles.chartEnd}>TODAY</Text>
                {/* Was `{yrHi} YEARS`, which put the PESSIMISTIC bound where a
                    glance reads it as the answer. The TIME card used to carry
                    the range; with the card gone the axis has to. */}
                <Text style={styles.chartEnd}>
                  {yrLo}&ndash;{yrHi} YR
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setVarianceOpen(true)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Estimated ${yrLo} to ${yrHi} years. Tap to find out why it is a range.`}
              >
                <Text style={[styles.whyRange, { color: themeColor }]}>why the range?</Text>
              </TouchableOpacity>

              {/* ── WHAT YOU WEIGH ALONG THE WAY ────────────────────────────
                  Body fat percent is abstract and the scale is not: someone at
                  82 kg who already feels small reads "a cut" as nothing until it
                  says 78 kg. Every point carries its OWN weight, because lean
                  mass grows across the plan and the same body fat is a different
                  number depending on when you stand on it.

                  A readout rather than a bubble over the point: at four years
                  the boundaries sit about thirty points apart, and a callout
                  covers the neighbours you are comparing against. It opens on
                  today so the tap teaches itself. */}
              <View style={styles.readout}>
                {tapped ? (
                  <>
                    <View style={styles.readCell}>
                      <Text style={styles.readKey}>WEIGHT</Text>
                      <Text style={styles.readVal}>{tapped.weightKg.toFixed(1)} kg</Text>
                    </View>
                    <View style={styles.readCell}>
                      <Text style={styles.readKey}>BODY FAT</Text>
                      <Text style={styles.readVal}>{tapped.bodyFatPct.toFixed(1)}%</Text>
                    </View>
                    <View style={[styles.readCell, { flex: 1.3 }]}>
                      <Text style={styles.readKey}>WHEN</Text>
                      <Text style={styles.readVal}>
                        {tapped.month < 0.5 ? 'Now' : `Month ${Math.round(tapped.month)}`}
                      </Text>
                      <Text style={styles.readSub}>{tapped.when}</Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.readHint}>Tap any point on the line.</Text>
                )}
              </View>

              {/* NO CONTROLS HERE. Each row states a choice and jumps back to
                  the screen that owns it, which is also the revisit path — the
                  choice is never buried behind a settings menu. */}
              {rangeMatters ? (
                <View style={styles.edgeRows}>
                  <TouchableOpacity
                    style={styles.edgeRow}
                    onPress={() => setRangeStep(0)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${routeName}, ${
                      CUT_WORDS[cutCount] ?? `${cutCount} cuts`
                    }. Tap to change.`}
                  >
                    <View>
                      <Text style={styles.edgeKey}>HOW YOU GROW</Text>
                      <Text style={styles.edgeLine}>
                        {`${routeName} \u00b7 ${(
                          CUT_WORDS[cutCount] ?? `${cutCount} cuts`
                        ).toLowerCase()}`}
                      </Text>
                    </View>
                    <Text style={[styles.edgeChange, { color: themeColor }]}>Change</Text>
                  </TouchableOpacity>
                  {/* NO ROW FOR A QUESTION THAT WAS NOT ASKED. Someone who
                      chose to grow now was never shown a range, so there is
                      nothing here to state and nothing to explain about its
                      absence. The way back is the row above. */}
                  {/* NO ROW FOR A QUESTION THAT WAS NOT ASKED. */}
                  {routeId === 'capped' ? (
                    <TouchableOpacity
                      style={styles.edgeRow}
                      onPress={() => setRangeStep(1)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Bulk up to ${bulkAt} percent. Tap to change.`}
                    >
                      <View>
                        <Text style={styles.edgeKey}>BULK UP TO</Text>
                        <Text style={styles.edgeLine}>{`${bulkAt}%`}</Text>
                      </View>
                      <Text style={[styles.edgeChange, { color: themeColor }]}>Change</Text>
                    </TouchableOpacity>
                  ) : null}
                  {routeId !== 'bulk' && range ? (
                    <TouchableOpacity
                      style={styles.edgeRow}
                      onPress={() => setRangeStep(routeId === 'capped' ? 2 : 1)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Your range, ${bandLo} to ${bandHi} percent. Tap to change.`}
                    >
                      <View>
                        <Text style={styles.edgeKey}>
                          {routeId === 'capped' ? 'THEN YOU SIT IN' : 'YOUR RANGE'}
                        </Text>
                        <Text style={styles.edgeLine}>{`${bandLo} to ${bandHi}%`}</Text>
                      </View>
                      <Text style={[styles.edgeChange, { color: themeColor }]}>Change</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                <Text style={[styles.orderNone, styles.orderNoneSpaced]}>
                  {noCutNeeded
                    ? 'You are already leaner than your goal, so there is nothing to cut first. One long build.'
                    : 'You already carry the muscle your goal needs, so this is one stretch of fat loss.'}
                </Text>
              )}
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

              {/* The band-edge attribution ("12% is the lean end of your Stay
                  lean route") used to sit here. Removed 20 Aug at Ryan's
                  request — it was the only small-grey line between the two big
                  numbers and the estimate, and the screen reads cleaner
                  without it. The explanation still lives in helpFor(9). */}

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
            {ctaBlocked ? 'Pick one to continue' : single ? 'Done' : ctaLabel}
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
          leanStopPct={leanStop}
          minWidthPct={MIN_RANGE_WIDTH_PCT}
          onClose={() => setEvidence(null)}
        />
      ) : null}

      {/* WHY THE RANGE.
          
          Two and a half to five years is a wide enough spread that leaving it
          unexplained reads as the app not knowing, rather than as honest
          uncertainty.
          
          What is actually in it: the ±35% band this model carries on the gain
          rate for individual response, widening further when a user's
          self-reported training state disagrees with their FFMI position, plus
          the 0.5–1%/wk range on each trim.
          
          What is NOT in it is adherence, and that is the line worth having.
          Someone who assumes missed sessions land them at the slow end will
          read five years as their worst case when it is not. */}
      <Modal
        visible={varianceOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setVarianceOpen(false)}
      >
        <Pressable style={styles.scrim} onPress={() => setVarianceOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Why the range?</Text>
          </View>
          <ScrollView
            style={styles.sheetScrollArea}
            contentContainerStyle={styles.sheetScrollContent}
            /* bounces LEFT ON, deliberately. Turning it off felt like the
               right call for a contained sheet and was wrong: on iOS the
               rubber-banding IS the smoothness, and without it the scroll
               stops dead at both ends and reads as broken.
               The indicator stays visible too — in a sheet that sometimes
               scrolls and sometimes does not, it is the only thing telling
               the user which one they have got. */
            showsVerticalScrollIndicator
            indicatorStyle="white"
          >
            <Text style={styles.sheetBody}>
              {'People respond differently to the same training. Two lifters running the identical program can build at quite different rates, and there is no way to know which you are until you start — the fast end assumes you respond well, the slow end assumes you do not.'}
            </Text>
            <Text style={styles.sheetBody}>
              {'How fast you trim moves it too. Cutting at the quicker end of what is safe shortens each trim, though it is a smaller part of the total.'}
            </Text>
            {/* Deliberately not the word "genetics". Accurate, but it reads as
                an excuse and invites people to write themselves off before
                they have started. */}
            <Text style={styles.sheetBody}>
              {'Not following the plan is not in this range. Missed sessions and off-plan weeks do not put you at the slow end — they put you outside it. The estimate assumes you train and eat as planned throughout.'}
            </Text>
          </ScrollView>
          <View style={[styles.sheetFooter, { paddingBottom: insets.bottom + 20 }]}>
            <TouchableOpacity
              style={styles.sheetGhost}
              onPress={() => setVarianceOpen(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetGhostText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/**
       * THE RUN-IT SHEET. Both beat 9 pickers live here as of 18 Aug 2026.
       *
       * The preview at the top is the load-bearing part, not decoration. The
       * muscle bracket's POSITION is the only thing that shows WHEN you grow,
       * which is the entire difference between the two orders — and with the
       * pickers off the screen, a user changing one would otherwise have to
       * dismiss the sheet to see what they did. It draws the same roadmap as
       * the chart behind the scrim, from the same memo, so the two cannot
       * disagree.
       *
       * NO COPY IN HERE, decided 18 Aug 2026 after seeing it running. A gain
       * and a cost sentence per picker came to 42 words in a sheet whose whole
       * job is two taps. The `gain`/`cost` strings still reach a screen reader
       * through each button's accessibilityLabel, and helpFor(9) states both
       * costs for both axes in full — that sheet is the long form, this one is
       * the control.
       */}
      <Modal visible={helpOpen} transparent animationType="fade" onRequestClose={() => setHelpOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setHelpOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          {/* SCROLLABLE. This sheet can carry a title, a body, three groups of
              bullets and a sources line — on a small phone the sources and the
              dismiss button fell off the bottom with no way to reach them.
              The grab handle stays outside the scroll so it does not move. */}
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{beatHelp?.title}</Text>
          </View>
          <ScrollView
            style={styles.sheetScrollArea}
            contentContainerStyle={styles.sheetScrollContent}
            /* bounces LEFT ON, deliberately. Turning it off felt like the
               right call for a contained sheet and was wrong: on iOS the
               rubber-banding IS the smoothness, and without it the scroll
               stops dead at both ends and reads as broken.
               The indicator stays visible too — in a sheet that sometimes
               scrolls and sometimes does not, it is the only thing telling
               the user which one they have got. */
            showsVerticalScrollIndicator
            indicatorStyle="white"
          >
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
          </ScrollView>
          <View style={[styles.sheetFooter, { paddingBottom: insets.bottom + 20 }]}>
            <TouchableOpacity
              style={styles.sheetGhost}
              onPress={() => setHelpOpen(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetGhostText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* The confirm exists so RouteReveal can drop its back and close
          buttons. One question, asked once, at the point where it is honest
          to ask it. */}
      <Modal visible={confirming} transparent animationType="fade" onRequestClose={() => setConfirming(false)}>
        <Pressable style={styles.scrim} onPress={() => setConfirming(false)} />
        {/* sheetPad, because styles.sheet no longer carries horizontal padding
            — that moved onto the head/body/footer when the long sheets gained
            a pinned footer, and this short one has none of those parts. It is
            not long enough to need scrolling, so it keeps the simple shape and
            just adds its own inset. */}
        <View style={[styles.sheet, styles.sheetPad, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.grab} />
          {/* Named the BAND route until 17 Aug and the ORDER until 20 Aug.
              With the order collapsed into the dial there is no option name
              left to confirm — the dial is a number, and "Lock in 12%?" asks
              the user to confirm an engine coordinate rather than the plan
              they have been looking at. The plan itself is the thing. */}
          <Text style={styles.sheetTitle}>Lock this plan in?</Text>
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

  /**
   * NOT A CARD as of 18 Aug 2026. It was a filled, bordered, rounded box, and
   * with the chart and two pickers below it the screen carried four boxed
   * surfaces competing to be read first. A hairline underneath does the same
   * separating job and leaves the chart as the only object on the screen.
   */
  destRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#232328',
  },
  destCol: { flex: 1 },
  destColEnd: { alignItems: 'flex-end' },
  destKey: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, color: '#4b4b52', marginBottom: 5 },
  destBig: { fontSize: 24, fontWeight: '700', letterSpacing: -0.6, color: '#e8e8ea' },
  destUnit: { fontSize: 14, fontWeight: '600' },
  destSub: { fontSize: 12, color: '#9a9aa0', marginTop: 3 },
  // Sits with the numbers rather than the labels now that the row is bottom
  // aligned, since flex-end would otherwise drop it onto the body fat line.
  destArrow: { fontSize: 19, paddingBottom: 14 },

  /* The row that replaced both pickers. A filled block rather than a hairline
     one: it is the only tappable thing between the chart and the CTA, and it
     has to read as a control rather than as another line of the chart's
     caption. */


  // Was marginTop 2, which put it hard against the axis label above so the
  // two right-aligned lines read as one block.
  whyRange: { fontSize: 11, textAlign: 'right', marginTop: 8 },
  // The house weights, not the mockup's. Every other beat on this flow states
  // itself in 700 — beatLabel at 11 and bigValue at 70 — so a 300 weight
  // question and a 300 weight value read as a different app two screens later.
  rangeQ: {
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 28,
    color: '#ffffff',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  rangeSub: { fontSize: 13.5, lineHeight: 20, color: '#8e8e93', marginBottom: 22 },
  // Hairline rows, no fills. The Ledger treatment, chosen 20 Aug: a range is
  // one setting with two ends rather than two objects, and beat 9 has already
  // been called messy once for stacking boxed surfaces.
  edgeRows: { marginTop: 22, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#232328' },
  edgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 62,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#232328',
  },
  // Same spec as beatLabel, which every other beat uses for its field name.
  // Left aligned rather than centred because it sits in a row beside a value.
  edgeKey: { fontSize: 11, fontWeight: '700', letterSpacing: 2.6, color: '#5b5b62' },
  edgeCtl: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  edgeVal: {
    fontSize: 30,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.6,
    minWidth: 96,
    textAlign: 'center',
  },
  edgeLine: { fontSize: 14, fontWeight: '600', color: '#e8e8ea', marginTop: 5 },
  edgeChange: { fontSize: 13, fontWeight: '600' },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#232328',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Dimmed rather than removed: a control that disappears at a limit leaves the
  // user wondering where it went, and the note beside it explains the stop.
  stepBtnOff: { opacity: 0.22 },
  stepGlyph: { fontSize: 15, lineHeight: 17, color: '#8e8e93' },
  rangeLimitRow: { flexDirection: 'row', gap: 9, marginTop: 14, alignItems: 'flex-start' },
  rangeLimitDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#d1a44a', marginTop: 6 },
  rangeLimitText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: '#8e8e93' },
  suggestLink: { fontSize: 12.5, color: '#8e8e93', marginTop: 16 },
  /**
   * The tap readout. A row rather than a callout over the point: at four years
   * across the canvas the phase boundaries sit about thirty points apart, and a
   * bubble covers the neighbours the user is comparing against.
   */
  readout: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#232328',
    minHeight: 62,
  },
  readCell: { flex: 1 },
  readKey: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, color: '#4b4b52' },
  readVal: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 6, letterSpacing: -0.3 },
  readSub: { fontSize: 11.5, color: '#8e8e93', marginTop: 3 },
  readHint: { fontSize: 12.5, color: '#4b4b52', paddingTop: 4 },
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    // Was 74, before the options carried a line of copy under the name.
    minHeight: 104,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#232328',
  },
  // 116pt because the miniature has to read as a SHAPE. At the 88 the first
  // pass used, the sawtooth and the single hump were indistinguishable.
  optMini: { width: 116 },
  optMain: { flex: 1 },
  optName: { fontSize: 15, fontWeight: '600', color: '#8e8e93' },
  optNameOn: { color: '#ffffff' },
  optMeta: { fontSize: 10, fontWeight: '700', letterSpacing: 1.3, color: '#4b4b52', marginTop: 8 },
  /**
   * The one line of option copy on this screen, and the exception to the rule
   * that the graph does the talking. The graph can show WHEN the cutting
   * happens; it cannot show a jawline or how a shirt fits, and that is what
   * the user is actually choosing between.
   */
  optWhy: { fontSize: 12.5, lineHeight: 17, color: '#8e8e93', marginTop: 5 },
  optDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent' },
  orderNone: { fontSize: 13, lineHeight: 20, color: '#8e8e93', marginBottom: 4 },
  // Only when it stands in for the summary row on the screen itself. Inside the
  // sheet the same text sits directly under the preview and needs no gap.
  orderNoneSpaced: { marginTop: 26 },

  // Was `chartTitle`, a BODY FAT OVER TIME heading. The chart is now the only
  // thing on the screen it could possibly describe.
  chartGap: { height: 26 },
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
  // A hairline border rather than a button treatment: enough to say this one
  // is tappable, not enough to compete with the route picker above it.
  statTappable: { borderColor: '#2a3a3e' },
  statHint: { fontSize: 9, marginTop: 5, letterSpacing: 0.3 },
  /**
   * flex: 1 with minHeight: 0.
   *
   * The minHeight is the part that is easy to miss — without it a flex child
   * refuses to shrink below its content height, so the ScrollView never
   * actually scrolls and the overflow is simply clipped.
   */
  /**
   * PADDING GOES ON contentContainerStyle, NOT style.
   *
   * A ScrollView's `style` is the viewport; padding there does not inset the
   * scrolling content, which is why the first version had text running to the
   * screen edge. `contentContainerStyle` is the one that wraps the content.
   *
   * flexShrink with minHeight: 0 is what actually lets the scroll engage — a
   * flex child will not shrink below its content height without it, so the
   * overflow gets clipped rather than scrolled.
   */
  sheetPad: { paddingHorizontal: 20 },
  sheetScrollArea: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  sheetScrollContent: { paddingHorizontal: 20, paddingBottom: 10 },
  /**
   * The title sits OUTSIDE the scroll.
   *
   * Scrolling a long sheet used to carry the heading away, leaving the user
   * reading a paragraph mid-sentence with nothing saying what it was about.
   * Pinning it costs one line of height and keeps the sheet legible at any
   * scroll position.
   */
  sheetHead: { flexGrow: 0, flexShrink: 0, paddingHorizontal: 20, paddingBottom: 12 },
  sheetFooter: {
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1c1c20',
  },

  // No divider above the bar: it was drawing a box under a screen that has
  // nothing else boxed on it.
  ctaBar: { paddingHorizontal: 20, paddingTop: 8, backgroundColor: '#0a0a0b' },

  notSure: { marginTop: NOT_SURE_GAP, alignItems: 'center', height: NOT_SURE_LINE },

  // Amber, matching the caution zone and the stale-number marking elsewhere.
  // Not red: an unreachable goal is a thing to know, not an error the user made.

  limitRow: { flexDirection: 'row', gap: 9, marginTop: 24, alignItems: 'flex-start' },  limitDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#f0b429',
    marginTop: 7,
  },
  limitText: { flex: 1, fontSize: 14, lineHeight: 21, color: '#8e8e93' },
  limitLead: { color: '#f0b429', fontWeight: '600' },

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
  /**
   * THE CAP BELONGS HERE, not on the ScrollView inside.
   *
   * The first version put maxHeight on the ScrollView, whose parent is this
   * sheet — and this sheet is sized by its own content, so the percentage
   * resolved against a height that depended on it. The result was a sheet that
   * inflated toward the top of the screen for three short paragraphs, with the
   * dismiss button clipped inside the scroll.
   *
   * Capping the sheet and making it a column fixes both cases: short content
   * hugs, long content stops at 82% and scrolls beneath a pinned footer.
   * paddingHorizontal moves to the body and footer so the scrollbar can sit at
   * the true edge.
   */
  sheet: {
    backgroundColor: '#111114',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    maxHeight: '82%',
    flexDirection: 'column',
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
  durRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22 },
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


  // flexShrink 0 so the handle keeps its height when the body is squeezed.
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#2f2f35', alignSelf: 'center', marginBottom: 16, flexShrink: 0 },
  sheetCta: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sheetGhost: { height: 50, borderRadius: 13, backgroundColor: '#1c1c20', alignItems: 'center', justifyContent: 'center' },
  sheetGhostText: { fontSize: 14, fontWeight: '600', color: '#d4d4d8' },
  sheetCtaText: { fontSize: 15, fontWeight: '600', color: '#0a0a0b' },
  // marginBottom removed — sheetHead owns the spacing now that the title is
  // pinned outside the scroll.
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