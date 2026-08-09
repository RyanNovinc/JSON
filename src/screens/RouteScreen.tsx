// src/screens/RouteScreen.tsx
//
// The payoff at the end of the intake: what we recommend, how long it takes,
// and whether the goal is even reachable — before the user answers another
// eleven questions.
//
// It is a screen rather than a fifth step of GoalsIntakeScreen because it is
// a RESULT, not a question. It needs to be reachable again later (from Goals
// & Stats, or its own tab entry), and it is where the roadmap snapshot is
// recorded.
//
// Step numbering is unchanged by its existence. The intake still hands off
// with flowStepOffset: 4 and the plan questions still resume at step 5 — this
// screen simply carries no step count of its own, because a result is not a
// step the user has to get through.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { loadGoalsProfile, updateGoalsProfileField } from '../utils/goalsProfileStorage';
import BodyFatField, { emptyBodyFatValue, type BodyFatFieldValue } from '../components/BodyFatField';
import { continueWorkoutFlow, continueNutritionFlow } from '../utils/questionnaireRouting';
import { recordRoadmapSnapshot } from '../utils/roadmapStorage';
import { deriveRoadmap, leanMassKg, type Roadmap } from '../utils/roadmap';
import type { GoalsProfile, RoutePreference } from '../utils/goalsProfile';

type Nav = StackNavigationProp<RootStackParamList>;

const ROUTE_OPTIONS: Array<{
  id: RoutePreference;
  name: string;
  description: string;
}> = [
  {
    id: 'lean',
    name: 'Stay lean throughout',
    description: 'Tight band, frequent short trims. You never get soft, but less time growing.',
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Long enough surpluses to grow, trims short enough to stay comfortable.',
  },
  {
    id: 'roomy',
    name: 'Longer build phases',
    description: 'Fewer, longer surpluses. Most time spent growing, softest in the middle.',
  },
];

/** Mirrors LEANNESS_OPTIONS in GoalsIntakeScreen so a goal edited here lands on
 *  exactly the same values the intake would have stored. */
const LEANNESS = [
  { pct: 10, label: 'Very lean', sub: '~10%' },
  { pct: 13, label: 'Athletic', sub: '12–15%' },
  { pct: 17, label: 'Fit', sub: '16–19%' },
];

const VERDICT_COPY = {
  reachable: {
    title: 'Reachable for your frame',
    body: "This is a body composition drug-free lifters reach. It's a long project, but the target is sound.",
  },
  borderline: {
    title: 'Right at the edge',
    body: "This sits near the upper end of what's been recorded in drug-free lifters. Some people get there, many don't, and that isn't a failure. We'll plan toward it and reassess as you go.",
  },
  beyond: {
    title: 'Above the documented range',
    body: "This is beyond what's typically been recorded in drug-free lifters at your height. Genetics vary and some people exceed the average, but planning years around it would set you up to fall short.",
  },
} as const;

const PHASE_COPY: Record<string, { name: string }> = {
  recomp: { name: 'Recomp' },
  build: { name: 'Build' },
  trim: { name: 'Trim' },
  reveal: { name: 'The reveal' },
};

export default function RouteScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'Route'>>();
  const { themeColor } = useTheme();
  const insets = useSafeAreaInsets();

  const flowStepOffset = route.params?.flowStepOffset ?? 4;

  const [profile, setProfile] = useState<GoalsProfile | null>(null);
  const [preference, setPreference] = useState<RoutePreference>('balanced');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Three beats rather than one scroll. Each answers one question, and the
  // button says what's coming next. It also fixes an ordering problem: on a
  // single screen the user was asked to choose a route while looking at a
  // chart of a route they had not chosen yet.
  const [beat, setBeat] = useState<1 | 2 | 3>(1);

  // The beats share one ScrollView, so without this the next beat inherits the
  // last one's scroll position — beat 1 is long, so beat 2 opened with its
  // heading already off the top of the screen.
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [beat]);

  // The four numbers the whole screen is derived from, editable in place.
  // Returning users otherwise had nowhere to change a goal: the intake is
  // first-run only and Quick check never asks for one.
  const [editing, setEditing] = useState(false);
  const [weightText, setWeightText] = useState('');
  const [goalWeightText, setGoalWeightText] = useState('');
  const [bodyFat, setBodyFat] = useState<BodyFatFieldValue>(emptyBodyFatValue());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadGoalsProfile().then((p) => {
        if (cancelled) return;
        setProfile(p);
        if (p?.routePreference) setPreference(p.routePreference);
        setWeightText(p?.currentWeightKg ? String(Math.round(p.currentWeightKg * 10) / 10) : '');
        setGoalWeightText(p?.goalWeightKg ? String(p.goalWeightKg) : '');
        setBodyFat(emptyBodyFatValue(p?.currentBodyFatPct));
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const roadmap: Roadmap | null = profile ? deriveRoadmap(profile, preference) : null;

  // Writes straight through: local state keeps the verdict live, storage keeps
  // it after they leave. A bad value updates neither.
  const patch = async <K extends keyof GoalsProfile>(field: K, value: GoalsProfile[K]) => {
    setProfile((prev) => (prev ? { ...prev, [field]: value } : prev));
    await updateGoalsProfileField(field, value);
  };

  const onWeight = (t: string) => {
    const clean = t.replace(/[^0-9.]/g, '');
    setWeightText(clean);
    const n = parseFloat(clean);
    if (Number.isFinite(n) && n >= 30 && n <= 300) patch('currentWeightKg', n);
  };

  const onGoalWeight = (t: string) => {
    const clean = t.replace(/[^0-9.]/g, '');
    setGoalWeightText(clean);
    const n = parseFloat(clean);
    if (Number.isFinite(n) && n >= 30 && n <= 300) patch('goalWeightKg', n);
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

  // Recorded on the way out rather than on render, so scrubbing between routes
  // doesn't fill the history with plans the user never acted on.
  const go = async (flow: 'workout' | 'nutrition') => {
    if (busy) return;
    setBusy(true);
    try {
      if (profile && roadmap) {
        await recordRoadmapSnapshot(profile, preference, roadmap);
      }
      if (flow === 'workout') await continueWorkoutFlow(navigation, { flowStepOffset });
      else await continueNutritionFlow(navigation, { flowStepOffset });
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

  if (!roadmap) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>
          Add a goal weight and a leanness target and your route appears here.
        </Text>
      </View>
    );
  }

  const verdict = roadmap.plausibility ? VERDICT_COPY[roadmap.plausibility] : null;
  const ok = roadmap.plausibility === 'reachable';
  const [yrLo, yrHi] = roadmap.estYears;
  const cycles = roadmap.phases.find((p) => p.kind === 'trim')?.repeats ?? 0;

  const ctaLabel =
    beat === 1 ? 'How long will it take?' : beat === 2 ? 'See the plan' : null;

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => (beat > 1 ? setBeat((b) => (b - 1) as 1 | 2) : navigation.goBack())}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={20} color="#d4d4d8" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Your route</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.popToTop()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color="#d4d4d8" />
        </TouchableOpacity>
      </View>

      <View style={styles.dots}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === beat && [styles.dotOn, { backgroundColor: themeColor }],
            ]}
          />
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Beat 1: is it reachable ─────────────────────────────────── */}
        {beat === 1 ? (
          <>
            {verdict ? (
              <View style={[styles.badge, ok ? styles.badgeOk : styles.badgeWarn]}>
                <Ionicons
                  name={ok ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                  size={13}
                  color={ok ? '#34d399' : '#f0b429'}
                />
                <Text style={[styles.badgeText, { color: ok ? '#34d399' : '#f0b429' }]}>
                  {verdict.title}
                </Text>
              </View>
            ) : null}

            <Text style={styles.title}>
              {profile?.goalWeightKg} kg at {profile?.goalBodyFatPct}% is
              {ok ? ' a real target.' : ' a stretch.'}
            </Text>
            <Text style={styles.lede}>{verdict?.body}</Text>

            <View style={styles.bigStats}>
              <View style={styles.bigStat}>
                <Text style={styles.bigKey}>Lean mass you need</Text>
                <Text style={styles.bigVal}>{roadmap.leanTargetKg.toFixed(1)} kg</Text>
              </View>
              {roadmap.gapKg != null ? (
                <View style={styles.bigStat}>
                  <View style={styles.bigKeyWrap}>
                    <Text style={styles.bigKey}>Muscle to add</Text>
                    <Text style={styles.bigSub}>this is the whole project</Text>
                  </View>
                  <Text style={[styles.bigVal, { color: themeColor }]}>
                    {roadmap.gapKg.toFixed(1)} kg
                  </Text>
                </View>
              ) : null}
              {roadmap.ffmi != null ? (
                <View style={styles.bigStat}>
                  <View style={styles.bigKeyWrap}>
                    <Text style={styles.bigKey}>FFMI at the finish</Text>
                    <Text style={styles.bigSub}>natural ceiling is around 25</Text>
                  </View>
                  <Text style={styles.bigVal}>{roadmap.ffmi.toFixed(1)}</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.adjustBtn}
              onPress={() => setEditing((v) => !v)}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Ionicons
                name={editing ? 'chevron-up' : 'create-outline'}
                size={15}
                color="#a1a1aa"
              />
              <Text style={styles.adjustTxt}>
                {editing ? 'Done adjusting' : 'Adjust my numbers'}
              </Text>
            </TouchableOpacity>

            {editing ? (
              <View style={styles.editor}>
                <Text style={styles.editLabel}>Where you are now</Text>
                <View style={styles.editRow}>
                  <Text style={styles.editRowLabel}>Current weight</Text>
                  <TextInput
                    style={styles.editInput}
                    keyboardType="decimal-pad"
                    value={weightText}
                    onChangeText={onWeight}
                    maxLength={5}
                    placeholder="77.3"
                    placeholderTextColor="#3f3f46"
                  />
                  <Text style={styles.editUnit}>kg</Text>
                </View>

                <BodyFatField
                  value={bodyFat}
                  onChange={onBodyFat}
                  sex={profile?.sex}
                  heightCm={profile?.heightCm}
                  weightKg={profile?.currentWeightKg}
                  themeColor={themeColor}
                />

                <Text style={[styles.editLabel, { marginTop: 18 }]}>Where you're going</Text>
                <View style={styles.editRow}>
                  <Text style={styles.editRowLabel}>Goal weight</Text>
                  <TextInput
                    style={styles.editInput}
                    keyboardType="decimal-pad"
                    value={goalWeightText}
                    onChangeText={onGoalWeight}
                    maxLength={5}
                    placeholder="90"
                    placeholderTextColor="#3f3f46"
                  />
                  <Text style={styles.editUnit}>kg</Text>
                </View>

                <View style={styles.leanRow}>
                  {LEANNESS.map((opt) => {
                    const active = profile?.goalBodyFatPct === opt.pct;
                    return (
                      <TouchableOpacity
                        key={opt.pct}
                        style={[
                          styles.leanBtn,
                          active && { borderColor: themeColor, backgroundColor: '#14181b' },
                        ]}
                        onPress={() => patch('goalBodyFatPct', opt.pct)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={[styles.leanLabel, active && { color: themeColor }]}>
                          {opt.label}
                        </Text>
                        <Text style={styles.leanSub}>{opt.sub}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.hint}>
                  Everything above updates as you type. Changing your goal re-plans the route.
                </Text>
              </View>
            ) : null}

            {roadmap.regainKg != null && roadmap.regainKg > 0 ? (
              <View style={styles.fbBox}>
                <Ionicons name="flash-outline" size={16} color={themeColor} />
                <Text style={styles.fbText}>
                  About <Text style={styles.fbStrong}>{roadmap.regainKg.toFixed(1)} kg</Text> of
                  that is muscle you've held before, which comes back in months. The other{' '}
                  <Text style={styles.fbStrong}>{roadmap.novelKg?.toFixed(1)} kg</Text> is new
                  tissue, and that's the part measured in years.
                </Text>
              </View>
            ) : (
              <Text style={styles.hint}>
                Your goal weight is really a muscle goal. The scale follows from it, which is why
                bulking straight to {profile?.goalWeightKg} kg and cutting wouldn't land you there.
              </Text>
            )}
          </>
        ) : null}

        {/* ── Beat 2: how you want to get there ───────────────────────── */}
        {beat === 2 ? (
          <>
            <Text style={styles.title}>How do you want to get there?</Text>
            <Text style={styles.lede}>
              Same destination, same years, different ride. This decides how lean you stay along
              the way, and you can change it any time.
            </Text>

            {ROUTE_OPTIONS.map((opt) => {
              const active = preference === opt.id;
              const preview = profile ? deriveRoadmap(profile, opt.id) : null;
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
                  <View style={[styles.dotRadio, active && { borderColor: themeColor }]}>
                    {active ? (
                      <View style={[styles.dotFill, { backgroundColor: themeColor }]} />
                    ) : null}
                  </View>
                  <View style={styles.routeBody}>
                    <Text style={styles.routeName}>{opt.name}</Text>
                    <Text style={styles.routeDesc}>{opt.description}</Text>
                    {preview ? (
                      <Text style={styles.routeMeta}>
                        Body fat {preview.band.floor}–{preview.band.ceiling}% · roughly{' '}
                        {preview.estYears[0]} to {preview.estYears[1]} years
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}

            <Text style={styles.hint}>
              The finish dates barely differ. You can't buy muscle with calories — only time in a
              surplus, and every route spends most of it there.
            </Text>
          </>
        ) : null}

        {/* ── Beat 3: the plan ────────────────────────────────────────── */}
        {beat === 3 ? (
          <>
            <Text style={styles.title}>Here's the plan.</Text>
            <Text style={styles.lede}>
              Phases end when you hit a body-fat number, not on a date. We re-plan at every
              checkpoint.
            </Text>

            <View style={styles.chartCard}>
              <View style={styles.chartHead}>
                <Text style={styles.chartTitle}>Body fat over time</Text>
                <Text style={styles.chartMeta}>
                  {yrLo} to {yrHi} years
                </Text>
              </View>
              <BandChart
                startBodyFat={profile?.currentBodyFatPct ?? roadmap.band.ceiling + 2}
                goalBodyFat={profile?.goalBodyFatPct ?? roadmap.band.floor}
                floor={roadmap.band.floor}
                ceiling={roadmap.band.ceiling}
                cycles={cycles}
                color={themeColor}
              />
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.swatch, { backgroundColor: themeColor }]} />
                  <Text style={styles.legendText}>Body fat</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.swatchBand,
                      { borderColor: `${themeColor}55`, backgroundColor: `${themeColor}1a` },
                    ]}
                  />
                  <Text style={styles.legendText}>
                    Your band, {roadmap.band.floor}–{roadmap.band.ceiling}%
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.phaseList}>
              {roadmap.phases.map((phase, i) => {
                const first = i === 0;
                return (
                  <View key={`${phase.kind}-${phase.index}`} style={styles.phaseRow}>
                    <View
                      style={[
                        styles.phaseNum,
                        first && {
                          backgroundColor: `${themeColor}24`,
                          borderColor: `${themeColor}66`,
                        },
                      ]}
                    >
                      <Text style={[styles.phaseNumText, first && { color: themeColor }]}>
                        {phase.index}
                      </Text>
                    </View>
                    <View style={styles.phaseBody}>
                      <View style={styles.phaseHead}>
                        <Text style={[styles.phaseName, first && { color: themeColor }]}>
                          {PHASE_COPY[phase.kind]?.name ?? phase.kind}
                          {phase.repeats > 1 ? ` ×${phase.repeats}` : ''}
                        </Text>
                        <View style={styles.phaseTimeWrap}>
                          <Text style={styles.phaseTime}>
                            {phase.estMonths[0]}–{phase.estMonths[1]} months
                          </Text>
                          <Text style={styles.estTag}>EST</Text>
                        </View>
                      </View>
                      <Text style={styles.phaseMeta}>
                        Ends at {phase.exitBodyFatPct}% body fat — a number, not a date.
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.note}>
              <Ionicons name="information-circle-outline" size={15} color="#f0b429" />
              <Text style={styles.noteText}>
                Anything marked <Text style={styles.noteStrong}>EST</Text> comes from planning
                models, not clinical trials, and real rates vary by 30 to 40% between people.
              </Text>
            </View>

            <Text style={styles.sectionLabel}>Ready when you are</Text>

            <TouchableOpacity style={styles.forkBtn} onPress={() => go('workout')} activeOpacity={0.85}>
              <View style={[styles.forkIcon, { backgroundColor: `${themeColor}24` }]}>
                <Ionicons name="barbell-outline" size={20} color={themeColor} />
              </View>
              <View style={styles.forkBody}>
                <Text style={styles.forkName}>Build my workout plan</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#52525b" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.forkBtn} onPress={() => go('nutrition')} activeOpacity={0.85}>
              <View style={[styles.forkIcon, { backgroundColor: 'rgba(52,211,153,.14)' }]}>
                <Ionicons name="restaurant-outline" size={20} color="#34d399" />
              </View>
              <View style={styles.forkBody}>
                <Text style={styles.forkName}>Build my meal plan</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#52525b" />
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 16 }]}>
        {ctaLabel ? (
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: themeColor }]}
            onPress={() => setBeat((b) => (b + 1) as 2 | 3)}
            activeOpacity={0.85}
            disabled={busy}
          >
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.secondary}
          onPress={beat === 1 ? () => setEditing(true) : saveAndLeave}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryText}>
            {beat === 1 ? 'Change my goal' : 'Not now — just save my route'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// The chart. Body fat oscillating inside the chosen band, with lean mass
// climbing underneath — the two together are the whole argument: body fat goes
// nowhere in particular, muscle only goes up.
// ---------------------------------------------------------------------------

function BandChart({
  startBodyFat,
  goalBodyFat,
  floor,
  ceiling,
  cycles,
  color,
}: {
  startBodyFat: number;
  goalBodyFat: number;
  floor: number;
  ceiling: number;
  cycles: number;
  color: string;
}) {
  const X0 = 26, X1 = 310, Y0 = 18, Y1 = 132;
  const hi = Math.max(startBodyFat, ceiling) + 2;
  const lo = Math.min(goalBodyFat, floor) - 2;
  const yOf = (bf: number) => Y0 + ((hi - bf) / (hi - lo)) * (Y1 - Y0);
  const xOf = (t: number) => X0 + t * (X1 - X0);

  const segs: Array<[number, number]> = [[1.6, Math.min(ceiling, startBodyFat)]];
  for (let i = 0; i < cycles; i++) {
    segs.push([0.7, floor]);
    segs.push([1.7, ceiling]);
  }
  segs.push([1.2, goalBodyFat]);
  const total = segs.reduce((a, s) => a + s[0], 0);

  let t = 0;
  let d = `M ${xOf(0)} ${yOf(startBodyFat)}`;
  segs.forEach((s) => {
    t += s[0] / total;
    d += ` L ${xOf(t).toFixed(1)} ${yOf(s[1]).toFixed(1)}`;
  });

  const top = yOf(ceiling);
  const bottom = yOf(floor);

  return (
    <Svg width="100%" height={150} viewBox="0 0 320 150">
      <Rect x={X0} y={top} width={X1 - X0} height={bottom - top} fill={`${color}1a`} />
      <Line x1={X0} x2={X1} y1={top} y2={top} stroke={`${color}55`} strokeWidth={1} strokeDasharray="3 3" />
      <Line x1={X0} x2={X1} y1={bottom} y2={bottom} stroke={`${color}55`} strokeWidth={1} strokeDasharray="3 3" />
      <Line x1={X0} x2={X1} y1={Y1} y2={Y1} stroke="#27272a" strokeWidth={1} />
      <Path d={d} fill="none" stroke={color} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: '#71717a', fontSize: 14, textAlign: 'center', lineHeight: 21 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topTitle: { fontSize: 15, fontWeight: '500', color: '#d4d4d8', letterSpacing: 0.2 },
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
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 14 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#27272a' },
  dotOn: { width: 18 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginTop: 4,
    marginBottom: 16,
  },
  badgeOk: { backgroundColor: 'rgba(52,211,153,.13)', borderColor: '#15372c' },
  badgeWarn: { backgroundColor: '#141310', borderColor: '#33291a' },
  badgeText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  lede: { fontSize: 14, lineHeight: 22, color: '#71717a', marginBottom: 22 },
  bigStats: { gap: 10 },
  bigStat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  bigKeyWrap: { flex: 1 },
  bigKey: { fontSize: 12.5, color: '#a1a1aa', lineHeight: 18 },
  bigSub: { fontSize: 11.5, color: '#52525b', marginTop: 2 },
  bigVal: { fontSize: 24, fontWeight: '700', color: '#ffffff', letterSpacing: -0.5 },
  hint: { fontSize: 12, lineHeight: 19, color: '#52525b', marginTop: 16, paddingHorizontal: 2 },
  adjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#3f3f46',
    marginTop: 14,
  },
  adjustTxt: { fontSize: 13, fontWeight: '600', color: '#a1a1aa' },
  editor: { marginTop: 14 },
  editLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  editRowLabel: { flex: 1, fontSize: 13, color: '#a1a1aa' },
  editInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    padding: 0,
    minWidth: 62,
    textAlign: 'right',
  },
  editUnit: { fontSize: 13, color: '#71717a', fontWeight: '600' },
  leanRow: { flexDirection: 'row', gap: 8 },
  leanBtn: {
    flex: 1,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  leanLabel: { fontSize: 13, fontWeight: '600', color: '#a1a1aa' },
  leanSub: { fontSize: 10.5, color: '#52525b', marginTop: 2 },
  ctaBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#18181b',
    backgroundColor: '#0a0a0b',
  },
  cta: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 15, fontWeight: '600', color: '#0a0a0b' },
  secondary: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  secondaryText: { fontSize: 13, fontWeight: '500', color: '#71717a' },
  dotRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#52525b',
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginTop: 2,
    marginBottom: 10,
  },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 10 },
  cardOk: { backgroundColor: '#131316', borderColor: '#15372c' },
  cardWarn: { backgroundColor: '#141310', borderColor: '#33291a' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardBody: { fontSize: 12.5, lineHeight: 20, color: '#a1a1aa' },
  stats: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  stat: {},
  statKey: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  statVal: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  fbBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: '#101416',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1c3238',
    borderRadius: 12,
    padding: 13,
    marginBottom: 10,
  },
  fbText: { flex: 1, fontSize: 12.5, lineHeight: 19, color: '#a1a1aa' },
  fbStrong: { color: '#ffffff', fontWeight: '600' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#71717a',
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 10,
    paddingLeft: 4,
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#131316',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 14,
    padding: 13,
    marginBottom: 8,
  },
  dotFill: { width: 8, height: 8, borderRadius: 4 },
  routeBody: { flex: 1 },
  routeName: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  routeDesc: { fontSize: 12, lineHeight: 18, color: '#71717a', marginTop: 2 },
  routeMeta: { fontSize: 11, color: '#52525b', marginTop: 5 },
  chartCard: {
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
  },
  chartHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  chartTitle: { fontSize: 12, fontWeight: '600', color: '#a1a1aa' },
  chartMeta: { fontSize: 12, color: '#71717a' },
  legend: { flexDirection: 'row', gap: 14, marginTop: 8, paddingHorizontal: 2, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 2.5, borderRadius: 2 },
  swatchBand: { width: 14, height: 9, borderRadius: 2, borderWidth: 1 },
  legendText: { fontSize: 11, color: '#71717a' },
  phaseList: {
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  phaseRow: {
    flexDirection: 'row',
    gap: 13,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
  },
  phaseNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1c1c20',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  phaseNumText: { fontSize: 11, fontWeight: '700', color: '#71717a' },
  phaseBody: { flex: 1 },
  phaseHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  phaseName: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  phaseTimeWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  phaseTime: { fontSize: 11, color: '#71717a' },
  estTag: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: '#52525b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  phaseMeta: { fontSize: 12.5, lineHeight: 19, color: '#a1a1aa' },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    backgroundColor: '#141310',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#33291a',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18, color: '#d4c7ae' },
  noteStrong: { color: '#f0dcb8', fontWeight: '700' },
  forkSub: { fontSize: 12.5, lineHeight: 19, color: '#71717a', marginTop: -4, marginBottom: 12 },
  forkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 15,
    padding: 15,
    marginBottom: 9,
  },
  forkIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  forkBody: { flex: 1 },
  forkName: { fontSize: 14.5, fontWeight: '600', color: '#ffffff' },
  forkDesc: { fontSize: 12, lineHeight: 17, color: '#71717a', marginTop: 2 },
  later: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  laterText: { fontSize: 13, fontWeight: '500', color: '#71717a' },
});